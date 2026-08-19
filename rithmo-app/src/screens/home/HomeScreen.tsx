/**
 * HomeScreen — Rhythmo
 *
 * Product intent: cycle-pattern intelligence, not a dashboard of widgets.
 *
 * Hierarchy:
 *   1. Header (name, date, notification)
 *   2. CycleContextCard — What is my cycle doing right now?
 *   3. TodayStateCard   — What did I feel today?
 *   4. PatternCard      — What patterns has Rhythmo noticed? (data-state-aware)
 *   5. Upcoming         — Next predicted event
 *
 * No gamification (streaks removed).
 * No generic AI suggestions on home screen.
 * No QuickActionsGrid duplicating the nav bar.
 */
import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@hooks/useTheme';
import { useAuth } from '@hooks/useAuth';
import {
  useCycleAnalysis,
  usePeriods,
} from '@hooks/queries/usePeriods';
import { useUnreadNotifications } from '@hooks/queries/useNotifications';
import {
  useTodayWellnessLog,
  useWellnessLogs,
} from '@hooks/queries/useWellness';
import { useProfile } from '@hooks/queries/useProfile';
import type { HomeScreenProps } from '@navigation/types';
import { CycleContextCard }  from './components/CycleContextCard';
import { TodayStateCard }    from './components/TodayStateCard';
import { PatternCard, deriveDataState } from './components/PatternCard';
import type { WellnessLog } from '@types/wellness.types';
import type { CycleAnalysis } from '@types/period.types';

type Props = HomeScreenProps<'Home'>;

const normalisePhase = (
  raw?: string,
): 'menstrual' | 'follicular' | 'ovulation' | 'luteal' => {
  const s = (raw ?? '').toLowerCase();
  if (s.includes('menstrual') || s.includes('period')) { return 'menstrual'; }
  if (s.includes('ovulat'))                             { return 'ovulation'; }
  if (s.includes('luteal'))                             { return 'luteal'; }
  return 'follicular';
};

// ── Upcoming section ──────────────────────────────────────────────────────────

function UpcomingRow({
  label,
  date,
  accent,
}: { label: string; date: string | null; accent: string }) {
  const { colors, typography } = useTheme();
  if (!date) { return null; }
  return (
    <View style={[styles.upcomingRow, { backgroundColor: colors.surface }]}>
      <View style={[styles.upcomingDot, { backgroundColor: accent }]} />
      <Text style={[styles.upcomingLabel, { color: colors.textSecondary, fontSize: typography.bodySmall }]}>
        {label}
      </Text>
      <Text style={[styles.upcomingDate, { color: colors.textPrimary, fontSize: typography.bodySmall }]}>
        {date}
      </Text>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const navigation = useNavigation<Props['navigation']>();
  const { colors, spacing, typography, borderRadius } = useTheme();
  const { user } = useAuth();

  // ── Profile ───────────────────────────────────────────────────────────────
  const { data: profile, refetch: refetchProfile } = useProfile();
  const isMale = profile?.sex === 'male' || user?.sex === 'male';
  const shouldFetchCycle = profile !== undefined;

  // ── Data queries ──────────────────────────────────────────────────────────
  const {
    data: cycleData,
    isLoading: cycleLoading,
    refetch: refetchCycle,
    isError: cycleError,
  } = useCycleAnalysis({
    role: isMale ? 'partner' : undefined,
    enabled: shouldFetchCycle,
  });

  const { data: periodsList,    refetch: refetchPeriods }  = usePeriods(isMale ? 'partner' : undefined);
  const { data: unreadNotifs }                             = useUnreadNotifications();
  const { data: todayWellness,  refetch: refetchToday }    = useTodayWellnessLog();
  const { data: allLogs,        refetch: refetchLogs }     = useWellnessLogs();

  // ── Refresh ───────────────────────────────────────────────────────────────
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([
      refetchProfile(),
      refetchCycle(),
      refetchPeriods(),
      refetchToday(),
      refetchLogs(),
    ]);
    setRefreshing(false);
  }, [refetchProfile, refetchCycle, refetchPeriods, refetchToday, refetchLogs]);

  // ── Derived: cycle status ─────────────────────────────────────────────────
  const cycleStatus = (cycleData as CycleAnalysis | undefined)?.current_status;

  const phase = normalisePhase(cycleStatus?.phase);
  const cycleDay: number | null = cycleStatus?.cycle_day ?? null;
  const daysUntilPeriod: number | null = cycleStatus?.days_until_next_period ?? null;
  const isOnPeriod: boolean = cycleStatus?.is_on_period ?? false;
  const hasCycleData = Boolean(cycleData);

  // ── Derived: data state for PatternCard ───────────────────────────────────
  const periodCount = Array.isArray(periodsList) ? (periodsList as any[]).length : 0;
  const logCount    = Array.isArray(allLogs)     ? (allLogs     as any[]).length : 0;
  const dataState   = deriveDataState(periodCount, logCount);

  // ── Derived: next predicted period date ───────────────────────────────────
  const nextPeriodDate: string | null = useMemo(() => {
    const raw = (cycleData as any)?.next_predicted_date;
    if (!raw) { return null; }
    try {
      return new Date(raw).toLocaleDateString('fa-IR', { month: 'long', day: 'numeric' });
    } catch { return null; }
  }, [cycleData]);

  // ── Navigation handlers ───────────────────────────────────────────────────
  const goToQuickLog = useCallback(() => {
    navigation.navigate('LogTab' as any, { screen: 'QuickLog' } as any);
  }, [navigation]);

  const goToCycle = useCallback(() => {
    navigation.navigate('CycleTab' as any);
  }, [navigation]);

  const goToInsights = useCallback(() => {
    navigation.navigate('InsightsTab' as any);
  }, [navigation]);

  const goToNotifications = useCallback(() => {
    navigation.navigate('Notifications');
  }, [navigation]);

  const goToLogPeriod = useCallback(() => {
    navigation.navigate('CycleTab' as any, { screen: 'LogPeriod' } as any);
  }, [navigation]);

  // ── Header date ───────────────────────────────────────────────────────────
  const dateStr = useMemo(() =>
    new Date().toLocaleDateString('fa-IR', {
      weekday: 'long', month: 'long', day: 'numeric',
    }),
  []);

  const userName = profile?.first_name || user?.username || '';
  const unreadCount: number = (unreadNotifs as any)?.count ?? 0;

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing[4], paddingBottom: spacing[20] }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <View style={[styles.header, { paddingTop: spacing[3], marginBottom: spacing[5] }]}>
          <View>
            <Text style={[styles.dateText, { color: colors.textTertiary, fontSize: typography.caption }]}>
              {dateStr}
            </Text>
            {userName ? (
              <Text style={[styles.greeting, { color: colors.textPrimary, fontSize: typography.heading }]}>
                سلام، {userName}
              </Text>
            ) : (
              <Text style={[styles.greeting, { color: colors.textPrimary, fontSize: typography.heading }]}>
                ریتمو
              </Text>
            )}
          </View>

          {/* Notification bell */}
          <TouchableOpacity
            onPress={goToNotifications}
            style={[styles.bellBtn, {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: borderRadius.medium,
            }]}
            accessibilityLabel={`اعلان‌ها${unreadCount > 0 ? `, ${unreadCount} خوانده‌نشده` : ''}`}
          >
            <Icon name="bell-outline" size={20} color={colors.textSecondary} />
            {unreadCount > 0 && (
              <View style={[styles.unreadDot, { backgroundColor: colors.menstrual }]} />
            )}
          </TouchableOpacity>
        </View>

        {/* ── Section label ────────────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { color: colors.textTertiary, fontSize: typography.label, marginBottom: spacing[2] }]}>
          وضعیت سیکل
        </Text>

        {/* ── 1. Cycle Context Card ────────────────────────────────────── */}
        <View style={{ marginBottom: spacing[4] }}>
          <CycleContextCard
            isLoading={cycleLoading}
            hasData={hasCycleData}
            hasError={cycleError}
            cycleDay={cycleDay}
            phase={phase}
            daysUntilPeriod={daysUntilPeriod}
            isOnPeriod={isOnPeriod}
            onPress={goToCycle}
            onRetry={refetchCycle}
            onStartTracking={goToLogPeriod}
          />
        </View>

        {/* ── Section label ────────────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { color: colors.textTertiary, fontSize: typography.label, marginBottom: spacing[2] }]}>
          امروز
        </Text>

        {/* ── 2. Today's State Card ─────────────────────────────────────── */}
        <View style={{ marginBottom: spacing[4] }}>
          <TodayStateCard
            log={todayWellness as WellnessLog | null}
            isLoading={false}
            onLogPress={goToQuickLog}
          />
        </View>

        {/* ── Section label ────────────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { color: colors.textTertiary, fontSize: typography.label, marginBottom: spacing[2] }]}>
          الگوهای من
        </Text>

        {/* ── 3. Pattern Card ───────────────────────────────────────────── */}
        <View style={{ marginBottom: spacing[4] }}>
          <PatternCard
            dataState={dataState}
            logCount={logCount}
            periodCount={periodCount}
            logs={(Array.isArray(allLogs) ? allLogs : []) as WellnessLog[]}
            cycleAnalysis={cycleData as CycleAnalysis | null}
            onInsightsPress={goToInsights}
          />
        </View>

        {/* ── 4. Upcoming ───────────────────────────────────────────────── */}
        {nextPeriodDate && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textTertiary, fontSize: typography.label, marginBottom: spacing[2] }]}>
              پیش‌بینی
            </Text>
            <View style={[styles.upcomingCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: borderRadius.large, marginBottom: spacing[6] }]}>
              <UpcomingRow
                label="دوره بعدی"
                date={nextPeriodDate}
                accent={colors.menstrual}
              />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  dateText: { marginBottom: 2 },
  greeting: { fontWeight: '700', letterSpacing: -0.4 },
  bellBtn: {
    width: 44,
    height: 44,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  unreadDot: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  sectionLabel: {
    fontWeight: '600',
  },
  upcomingCard: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  upcomingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  upcomingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  upcomingLabel: { flex: 1, fontWeight: '500' },
  upcomingDate: { fontWeight: '600' },
});

