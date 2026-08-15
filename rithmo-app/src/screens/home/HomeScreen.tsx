/**
 * HomeScreen — Rithmo AI Wellness Companion
 *
 * Pure orchestrator: fetches data, computes derived state,
 * and composes home-specific components.
 */
import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@hooks/useTheme';
import { useAuth } from '@hooks/useAuth';
import { useCycleAnalysis, useLatestOvulation, usePeriods } from '@hooks/queries/usePeriods';
import { useUnreadNotifications, useUnreadMessages } from '@hooks/queries/useNotifications';
import { useAISuggestion } from '@hooks/queries/useAI';
import { useUserMedications } from '@hooks/queries/useMedications';
import { useTodayWellnessLog, useWellnessStreaks, useWellnessAnalytics } from '@hooks/queries/useWellness';
import { CelebrationAnimation } from '@components/ui';
import { useProfile } from '@hooks/queries/useProfile';
import type { HomeScreenProps } from '@navigation/types';
import {
  WellnessWidget,
  QuickActionsGrid,
  StreakCards,
  CycleCard,
  QuickLogStrip,
  AIInsightCard,
  TodayWellness,
  HealthHub,
} from './components';

type Props = HomeScreenProps<'Home'>;

const normalisePhase = (raw?: string): 'menstrual' | 'follicular' | 'ovulation' | 'luteal' => {
  const s = (raw ?? '').toLowerCase();
  if (s.includes('menstrual') || s.includes('period')) { return 'menstrual'; }
  if (s.includes('ovulat')) { return 'ovulation'; }
  if (s.includes('luteal')) { return 'luteal'; }
  return 'follicular';
}

export default function HomeScreen() {
  const navigation = useNavigation<Props['navigation']>();
  const { colors, spacing, typography } = useTheme();
  const { user, partnerId } = useAuth();

  // ── profile ───────────────────────────────────────────────────────────────
  const { data: profile, isLoading: profileLoading, refetch: refetchProfile } = useProfile();

  const isCycleUser = useMemo(() => {
    if (!profile) { return undefined; }
    return profile.sex !== 'male';
  }, [profile]);

  const isMale = profile?.sex === 'male' || user?.sex === 'male';
  const hasPartner = (profile?.partners?.length ?? 0) > 0 || Boolean(partnerId);
  const isMaleWithPartner = isMale && hasPartner;
  const shouldFetchOwnCycle = profile !== undefined && isCycleUser === true;
  // Always fetch for male users — API returns partner data if linked, empty if not
  const shouldFetchPartnerCycle = profile !== undefined && isMale;

  // ── data queries ──────────────────────────────────────────────────────────
  const {
    data: cycleData,
    isLoading: cycleLoading,
    refetch: refetchCycle,
    isError: cycleError,
    error: cycleErrorObj,
  } = useCycleAnalysis({
    role: isMale ? 'partner' : undefined,
    enabled: shouldFetchOwnCycle || shouldFetchPartnerCycle,
  });

  const { data: ovulation }     = useLatestOvulation({ enabled: shouldFetchOwnCycle });
  // Raw period list — used as fallback for the cycle brief pill
  const { data: periodsList }   = usePeriods(isMale ? 'partner' : undefined);
  const { data: unreadNotifs }  = useUnreadNotifications();
  const { data: unreadMsgs }    = useUnreadMessages();
  const { data: aiSuggestion }  = useAISuggestion();
  const { data: medications }   = useUserMedications();
  const { data: todayWellness } = useTodayWellnessLog();
  const { data: streaks }       = useWellnessStreaks();
  const { data: wellnessAnalytics } = useWellnessAnalytics(7);

  // ── local state ───────────────────────────────────────────────────────────
  const [refreshing, setRefreshing] = React.useState(false);
  const [showCelebration, setShowCelebration] = React.useState(false);
  const [celebrationData, setCelebrationData] = React.useState({
    title: '', message: '', type: 'success' as 'success' | 'milestone',
  });

  // ── derived: date ─────────────────────────────────────────────────────────
  const todayDate = useMemo(() => new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  }), []);

  // ── derived: cycle ────────────────────────────────────────────────────────
  // useCycleAnalysis already unwraps { status, data, view_type } → returns data directly
  // For male users: cycleData = { gender, tracking_mode, partner_info, support_tips }
  // For female users: cycleData = { current_status, average_cycle, regularity_score, ... }
  const apiData = cycleData ?? null;
  const partnerInfo = (apiData as any)?.partner_info ?? null;

  // isPartnerView = male user AND the API returned partner_info
  const isPartnerView = isMale && Boolean(partnerInfo);

  const partnerDisplayName =
    partnerInfo?.name ??
    profile?.partners?.[0]?.username ??
    'Partner';

  const currentStatus = isPartnerView ? null : ((apiData as any)?.current_status ?? null);

  const phase = isPartnerView
    ? normalisePhase(partnerInfo?.current_phase)
    : normalisePhase(currentStatus?.phase ?? (apiData as any)?.current_phase ?? '');

  const phaseAccent = ({
    menstrual: colors.menstrual,
    follicular: colors.follicular,
    ovulation: colors.ovulation,
    luteal: colors.luteal,
  } as const)[phase] ?? colors.primary;

  const daysUntilPeriod = isPartnerView
    ? (partnerInfo?.days_until_period ?? 0)
    : (currentStatus?.days_until_next_period ?? 0);

  const avgCycleLength = isPartnerView
    ? (partnerInfo?.average_cycle_length ?? 28)
    : ((apiData as any)?.average_cycle ?? currentStatus?.cycle_length ?? 28);

  const ovulationDay = ovulation?.ovulation_date
    ? new Date(ovulation.ovulation_date).getDate() : null;

  const cycleDataNotFound = cycleError && (cycleErrorObj as any)?.response?.status === 404;
  const cycleActualError  = cycleError && !cycleDataNotFound;

  // For partner view: has data if partner_info exists with at least a phase or days
  const hasPartnerCycleData = Boolean(
    partnerInfo &&
    (partnerInfo.current_phase || partnerInfo.days_until_period != null),
  );
  // For own cycle: has data if current_status exists
  const hasCycleData = Boolean(
    !cycleLoading &&
    !cycleError &&
    (isPartnerView ? hasPartnerCycleData : Boolean(currentStatus)),
  );

  // ── derived: cycle brief for WellnessWidget ──────────────────────────────
  // Uses multiple data sources with fallbacks so the pill shows reliably.
  const cycleBrief = useMemo(() => {
    const latestPeriod = Array.isArray(periodsList) && periodsList.length > 0
      ? (periodsList as any[])[0]
      : null;

    // ── Female / own cycle ──────────────────────────────────────────────────
    if (!isMale) {
      // Best case: full cycle analysis with current_status
      if (!cycleError && currentStatus) {
        return {
          name: '',
          phase,
          daysUntilPeriod: currentStatus.days_until_next_period ?? null,
          isOnPeriod: Boolean(currentStatus.is_on_period),
          isOwn: true,
        };
      }
      // Fallback: derive days from next_predicted_date or latest period record
      const nextDate =
        (apiData as any)?.next_predicted_date ??
        latestPeriod?.next_period_start_date ??
        null;
      const daysFromDate = nextDate
        ? Math.round((new Date(nextDate).getTime() - Date.now()) / 86_400_000)
        : null;
      if (nextDate || latestPeriod) {
        return {
          name: '',
          phase: phase || 'follicular',
          daysUntilPeriod: daysFromDate != null && daysFromDate >= 0 ? daysFromDate : null,
          isOnPeriod: false,
          isOwn: true,
        };
      }
      return null;
    }

    // ── Male / partner cycle ────────────────────────────────────────────────
    if (isMale) {
      // Best case: partner_info from cycle_analysis has phase
      if (!cycleError && partnerInfo?.current_phase) {
        return {
          name: partnerInfo.name ?? (apiData as any)?.partner_name ?? partnerDisplayName,
          phase: normalisePhase(partnerInfo.current_phase),
          daysUntilPeriod: partnerInfo.days_until_period ?? null,
          isOnPeriod: Boolean(partnerInfo.is_on_period),
          isOwn: false,
        };
      }
      // Fallback: use latest partner period record for name + next date
      const pName =
        latestPeriod?.partner_name ??
        (apiData as any)?.partner_name ??
        (latestPeriod ? partnerDisplayName : null);
      const pNext = latestPeriod?.next_period_start_date ?? null;
      const pDays = pNext
        ? Math.round((new Date(pNext).getTime() - Date.now()) / 86_400_000)
        : null;
      if (pName && latestPeriod) {
        return {
          name: pName,
          phase: phase || 'follicular',
          daysUntilPeriod: pDays != null && pDays >= 0 ? pDays : null,
          isOnPeriod: false,
          isOwn: false,
        };
      }
      return null;
    }

    return null;
  }, [
    isMale, cycleError, currentStatus, apiData,
    partnerInfo, partnerDisplayName, phase, periodsList,
  ]);
  const activeMeds  = (medications ?? []).filter((m: any) => m.is_active).length;
  const notifCount  = unreadNotifs?.count ?? 0;
  const msgCount    = unreadMsgs?.count ?? 0;

  // ── derived: wellness ─────────────────────────────────────────────────────
  const hasCompletedCheckIn = Boolean(todayWellness);
  const currentStreak       = streaks?.current_streak ?? 0;
  const longestStreak       = streaks?.longest_streak ?? 0;

  React.useEffect(() => {
    if (currentStreak > 0 && [7, 14, 30, 60, 90].includes(currentStreak)) {
      setCelebrationData({
        title: `${currentStreak} Day Streak! 🎉`,
        message: 'Amazing consistency! Keep up the great work.',
        type: 'milestone',
      });
      setShowCelebration(true);
    }
  }, [currentStreak]);

  // ── navigation ────────────────────────────────────────────────────────────
  const goTo = useCallback((tab: string, screen: string) => {
    try { navigation.getParent()?.navigate(tab as any, { screen }); }
    catch (e) { console.error('Navigation error:', e); }
  }, [navigation]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchProfile(),
        ...(shouldFetchOwnCycle || shouldFetchPartnerCycle ? [refetchCycle()] : []),
      ]);
    } catch (e) { console.error('Refresh error:', e); }
    setRefreshing(false);
  }, [refetchCycle, refetchProfile, shouldFetchOwnCycle, shouldFetchPartnerCycle]);

  // ── loading guard ─────────────────────────────────────────────────────────
  if (profileLoading && !profile && !refreshing) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.textSecondary, marginTop: spacing[4], fontSize: typography.sm }}>
          Loading your dashboard...
        </Text>
      </View>
    );
  }

  // Show cycle section for: female users (own cycle) OR male users with a partner
  const showCycleContent = isCycleUser === true || isMaleWithPartner;

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: spacing[12], flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Wellness Widget */}
        <View style={[styles.section, { paddingTop: spacing[4] }]}>
          <WellnessWidget
            userName={user?.first_name || profile?.first_name || user?.username}
            currentStreak={currentStreak}
            hasCompletedCheckIn={hasCompletedCheckIn}
            date={todayDate}
            notificationCount={notifCount}
            onCheckInPress={() => goTo('WellnessTab', 'LogWellness')}
            onAvatarPress={() => goTo('ProfileTab', 'Profile')}
            onNotificationPress={() => navigation.navigate('Notifications')}
            cycleBrief={cycleBrief}
            onCycleBriefPress={() => goTo('CycleTab', 'CycleAnalysis')}
          />
        </View>

        {/* Streak Progress */}
        <View style={styles.section}>
          <StreakCards
            currentStreak={currentStreak}
            longestStreak={longestStreak}
            weeklyScore={wellnessAnalytics?.averages?.wellness_score ?? null}
          />
        </View>

        {/* Cycle Card */}
        {showCycleContent && (
          <View style={styles.section}>
            <CycleCard
              isLoading={cycleLoading && !cycleData}
              hasError={cycleActualError}
              hasData={hasCycleData}
              isPartnerView={Boolean(isPartnerView)}
              partnerName={partnerDisplayName}
              phase={phase}
              phaseAccent={phaseAccent}
              daysUntilPeriod={daysUntilPeriod}
              avgCycleLength={avgCycleLength}
              ovulationDay={ovulationDay}
              isMale={isMale}
              isMaleWithPartner={isMaleWithPartner}
              onPress={() => goTo('CycleTab', 'CycleAnalysis')}
              onRetry={onRefresh}
              onSetupPartner={() => goTo('ProfileTab', 'PartnerManage')}
              onStartTracking={() => goTo('CycleTab', 'LogPeriod')}
            />
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <QuickActionsGrid
            isMale={isMale}
            hasCompletedCheckIn={hasCompletedCheckIn}
            onLogWellness={() => goTo('WellnessTab', 'LogWellness')}
            onLogPeriod={() => goTo('CycleTab', 'LogPeriod')}
            onMoodComplete={() => {
              setCelebrationData({ title: 'Check-in Complete!', message: 'Great job staying on track today.', type: 'success' });
              setShowCelebration(true);
            }}
          />
        </View>

        {/* Quick Log Strip */}
        <View style={styles.section}>
          <QuickLogStrip
            showCycleContent={showCycleContent}
            onLogPeriod={() => goTo('CycleTab', 'LogPeriod')}
            onLogWellness={() => goTo('WellnessTab', 'LogWellness')}
            onMedications={() => goTo('WellnessTab', 'Medications')}
            onAnalytics={() => goTo('CycleTab', 'CycleAnalysis')}
            onMessages={() => goTo('MessagesTab', 'MessagesList')}
          />
        </View>

        {/* AI Insight */}
        {aiSuggestion && (
          <View style={styles.section}>
            <AIInsightCard
              label={aiSuggestion.label}
              text={aiSuggestion.response_text}
              onPress={() => navigation.navigate('AISuggestions')}
              onSeeAll={() => navigation.navigate('AISuggestions')}
            />
          </View>
        )}

        {/* Today's Wellness */}
        <View style={styles.section}>
          <TodayWellness
            moodLevel={todayWellness?.mood_level}
            wellnessScore={todayWellness?.wellness_score}
            currentStreak={currentStreak}
            totalLogs={streaks?.total_logs ?? 0}
            onLogWellness={() => goTo('WellnessTab', 'LogWellness')}
            onWellnessDashboard={() => goTo('WellnessTab', 'WellnessDashboard')}
            onSeeAll={() => goTo('WellnessTab', 'LogWellness')}
          />
        </View>

        {/* Health Hub */}
        <View style={styles.section}>
          <HealthHub
            isCycleUser={isCycleUser}
            activeMeds={activeMeds}
            msgCount={msgCount}
            onWellnessDashboard={() => goTo('WellnessTab', 'WellnessDashboard')}
            onCycleTracker={() => goTo('CycleTab', 'CycleAnalysis')}
            onMedications={() => goTo('WellnessTab', 'Medications')}
            onAISuggestions={() => navigation.navigate('AISuggestions')}
            onMessages={() => goTo('MessagesTab', 'MessagesList')}
          />
        </View>

      </ScrollView>

      <CelebrationAnimation
        visible={showCelebration}
        onDismiss={() => setShowCelebration(false)}
        title={celebrationData.title}
        message={celebrationData.message}
        type={celebrationData.type}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
});
