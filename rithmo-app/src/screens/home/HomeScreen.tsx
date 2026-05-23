/**
 * HomeScreen — Rithmo AI Wellness Companion
 *
 * Premium dashboard: adapts to user sex.
 * Female / other → cycle ring hero + cycle stats
 * Male / partner  → general wellness hero (no cycle content)
 */
import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@hooks/useTheme';
import { useAuth } from '@hooks/useAuth';
import { useCycleAnalysis, useLatestOvulation } from '@hooks/queries/usePeriods';
import { useUnreadNotifications, useUnreadMessages } from '@hooks/queries/useNotifications';
import { useAISuggestion } from '@hooks/queries/useAI';
import { useUserMedications } from '@hooks/queries/useMedications';
import { useTodayWellnessLog, useWellnessStreaks, useWellnessAnalytics } from '@hooks/queries/useWellness';
import { PhasePill, Icon, AppIcon } from '@components/ui';
import { useProfile } from '@hooks/queries/useProfile';
import icons from '../../assets/icons';
import type { HomeScreenProps } from '@navigation/types';

type Props = HomeScreenProps<'Home'>;

const { width: W } = Dimensions.get('window');
const CARD_GAP = 12;
const HALF_CARD = (W - 40 - CARD_GAP) / 2;
const HOME_WELLNESS_ANALYTICS_DAYS = 7;

// ── helpers ──────────────────────────────────────────────────────────────────

function normalisePhase(raw?: string): 'menstrual' | 'follicular' | 'ovulation' | 'luteal' {
  const s = (raw ?? '').toLowerCase();
  if (s.includes('menstrual') || s.includes('period')) return 'menstrual';
  if (s.includes('ovulat')) return 'ovulation';
  if (s.includes('luteal')) return 'luteal';
  return 'follicular';
}

// ── sub-components ────────────────────────────────────────────────────────────

/** Single column in the home wellness hero stats row */
function HeroStatCell({
  value,
  label,
  color,
}: {
  value: string | number;
  label: string;
  color: string;
}) {
  const { colors, typography } = useTheme();
  return (
    <View style={styles.heroStatCell}>
      <Text
        style={{
          color,
          fontSize: typography.xl,
          fontWeight: '800',
          letterSpacing: -0.5,
        }}
        numberOfLines={1}
      >
        {value}
      </Text>
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: typography.xs,
          marginTop: 2,
          textAlign: 'center',
        }}
        numberOfLines={2}
      >
        {label}
      </Text>
    </View>
  );
}

function HeroStatDivider() {
  const { colors } = useTheme();
  return <View style={[styles.heroStatDivider, { backgroundColor: colors.border }]} />;
}

/** Frosted-glass style stat tile */
function StatTile({
  label,
  value,
  sub,
  accent,
  onPress,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: string;
  onPress?: () => void;
}) {
  const { colors, spacing, typography } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.82}
      style={[
        styles.statTile,
        {
          width: HALF_CARD,
          backgroundColor: colors.surface,
          borderRadius: 20,
          padding: spacing[4],
          shadowColor: colors.shadowColor,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          elevation: 3,
        },
      ]}
    >
      {/* accent dot */}
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: accent,
          marginBottom: spacing[3],
        }}
      />
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: typography.xs,
          fontWeight: '600',
          letterSpacing: 0.6,
          textTransform: 'uppercase',
          marginBottom: spacing[1],
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: colors.textPrimary,
          fontSize: typography['2xl'],
          fontWeight: '800',
          letterSpacing: -0.5,
        }}
      >
        {value}
      </Text>
      {sub ? (
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: typography.xs,
            marginTop: spacing[1],
          }}
        >
          {sub}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

/** Quick-log action chip */
function QuickChip({
  icon,
  label,
  color,
  onPress,
}: {
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
}) {
  const { spacing, typography } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.quickChip,
        {
          backgroundColor: color + '14',
          borderRadius: 14,
          paddingHorizontal: spacing[3],
          paddingVertical: spacing[2],
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing[2],
        },
      ]}
    >
      <Icon name={icon} size={16} color={color} />
      <Text
        style={{
          color,
          fontSize: typography.xs,
          fontWeight: '700',
          letterSpacing: 0.2,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/** Section header */
function SectionHeader({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) {
  const { colors, spacing, typography } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing[3],
      }}
    >
      <Text
        style={{
          color: colors.textPrimary,
          fontSize: typography.lg,
          fontWeight: '800',
          letterSpacing: -0.3,
        }}
      >
        {title}
      </Text>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll} activeOpacity={0.7}>
          <Text
            style={{
              color: colors.primary,
              fontSize: typography.sm,
              fontWeight: '600',
            }}
          >
            See all
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── main screen ───────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const navigation = useNavigation<Props['navigation']>();
  const { colors, spacing, typography } = useTheme();
  const { user } = useAuth();

  // Load profile first to determine user type
  const { data: profile, isLoading: profileLoading, refetch: refetchProfile } = useProfile();
  
  // Determine if this user tracks their cycle (female/other) or not (male)
  // Only determine after profile is loaded to avoid flickering
  const isCycleUser = React.useMemo(() => {
    if (!profile) {
      // While profile is loading, return undefined to show loading state
      return undefined;
    }
    return profile.sex !== 'male';
  }, [profile]);
  
  // Check if male user has a partner
  const hasPartner = (profile?.partners?.length ?? 0) > 0;
  const isMaleWithPartner = profile?.sex === 'male' && hasPartner;
  
  // Fetch own cycle data for female/other users
  const shouldFetchOwnCycle = profile !== undefined && isCycleUser === true;
  
  // Fetch partner cycle data for male users with partners
  const shouldFetchPartnerCycle = profile !== undefined && isMaleWithPartner;
  
  const { data: cycleData, isLoading: cycleLoading, refetch: refetchCycle, isError: cycleError, error: cycleErrorObj } = useCycleAnalysis({
    role: shouldFetchPartnerCycle ? 'partner' : undefined,
    enabled: shouldFetchOwnCycle || shouldFetchPartnerCycle,
  });
  const { data: ovulation } = useLatestOvulation({
    enabled: shouldFetchOwnCycle, // Only fetch ovulation for own cycle
  });
  
  const { data: unreadNotifs } = useUnreadNotifications();
  const { data: unreadMsgs } = useUnreadMessages();
  const { data: aiSuggestion } = useAISuggestion();
  const { data: medications } = useUserMedications();
  const { data: todayWellness } = useTodayWellnessLog();
  const { data: streaks } = useWellnessStreaks();
  const { data: wellnessAnalytics, refetch: refetchWellnessAnalytics } = useWellnessAnalytics(
    HOME_WELLNESS_ANALYTICS_DAYS,
  );

  const [refreshing, setRefreshing] = React.useState(false);

  const todayDate = useMemo(() => {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return today.toLocaleDateString('en-US', options);
  }, []);

  // Safe data access with fallbacks - handle API response structure
  // For male users with partners, cycleData will contain partner_info
  // For female users, cycleData will contain their own cycle data
  const apiData = ((cycleData as any)?.data || cycleData) ?? null;
  
  // Handle partner data structure for male users
  const partnerInfo = (apiData as any)?.partner_info;
  const isPartnerView = isMaleWithPartner && partnerInfo;
  
  // Get current status from either own data or partner data
  const currentStatus = isPartnerView ? null : ((apiData as any)?.current_status ?? null);
  const phase = isPartnerView 
    ? normalisePhase(partnerInfo?.current_phase)
    : normalisePhase(currentStatus?.phase ?? (apiData as any)?.current_phase ?? '');

  const phaseAccent = phase ? {
    menstrual:  colors.menstrual,
    follicular: colors.follicular,
    ovulation:  colors.ovulation,
    luteal:     colors.luteal,
  }[phase] : colors.primary;

  const activeMeds = (medications ?? []).filter((m: any) => m.is_active).length;
  const notifCount = unreadNotifs?.count ?? 0;
  const msgCount   = unreadMsgs?.count ?? 0;

  const wellnessAverages = wellnessAnalytics?.averages;
  const wellnessScore = wellnessAverages?.wellness_score;
  const weeklyWellnessDisplay =
    wellnessScore != null && wellnessScore > 0
      ? Math.round(wellnessScore * 10) / 10
      : null;

  // Safe data access with fallbacks - only access if cycle data exists
  const daysUntilPeriod = isPartnerView 
    ? (partnerInfo?.days_until_period ?? 0)
    : (currentStatus?.days_until_next_period ?? 0);
  const avgCycleLength = isPartnerView
    ? (partnerInfo?.average_cycle_length ?? 28)
    : ((apiData as any)?.average_cycle ?? currentStatus?.cycle_length ?? 28);
  const ovulationDay = ovulation?.ovulation_date
    ? new Date(ovulation.ovulation_date).getDate()
    : null;

  // Whether cycle data exists yet
  // 404 error means no data (normal), other errors are actual errors
  const cycleDataNotFound = cycleError && (cycleErrorObj as any)?.response?.status === 404;
  const cycleActualError = cycleError && !cycleDataNotFound;
  // For female users: check if we have cycle data
  // For male users with partner: check if we have partner data
  const hasCycleData = Boolean(
    !cycleLoading && 
    (isPartnerView ? partnerInfo : (apiData && currentStatus)) && 
    !cycleError
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchProfile(),
        refetchWellnessAnalytics(),
        ...(shouldFetchOwnCycle || shouldFetchPartnerCycle ? [refetchCycle()] : []),
      ]);
    } catch (error) {
      console.error('Refresh error:', error);
    }
    setRefreshing(false);
  }, [refetchCycle, refetchProfile, refetchWellnessAnalytics, shouldFetchOwnCycle, shouldFetchPartnerCycle]);

  const goTo = useCallback(
    (tab: string, screen: string) => {
      try {
        navigation.getParent()?.navigate(tab as any, { screen });
      } catch (error) {
        console.error('Navigation error:', error);
      }
    },
    [navigation],
  );

  // Show loading state while profile is loading (not on refresh)
  const isInitialLoading = profileLoading && !profile && !refreshing;

  if (isInitialLoading) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, flex: 1, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.textSecondary, marginTop: spacing[4], fontSize: typography.sm }}>
          Loading your dashboard...
        </Text>
      </View>
    );
  }

  // Show same content for all users
  // Female users: show their own cycle
  // Male users with partner: show partner's cycle
  const showCycleContent = isCycleUser === true || isMaleWithPartner;

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: spacing[12], flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface,
            paddingHorizontal: spacing[5],
            paddingTop: spacing[6],
            paddingBottom: spacing[5],
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={{ flex: 1 }}>
          {/* Name at the top */}
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: typography['3xl'],
              fontWeight: '800',
              letterSpacing: -0.5,
              marginBottom: spacing[2],
            }}
          >
            {user?.first_name || profile?.first_name || user?.username || 'Welcome'}
          </Text>
          
          {/* Today's date */}
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: typography.sm,
              fontWeight: '500',
              marginBottom: spacing[3],
            }}
          >
            {todayDate}
          </Text>

          {/* Cycle info (if woman and has data, or male with partner) */}
          {showCycleContent && hasCycleData && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
              <PhasePill phase={phase} />
              <Text
                style={{
                  color: colors.textPrimary,
                  fontSize: typography.sm,
                  fontWeight: '600',
                }}
              >
                {isPartnerView && partnerInfo?.name ? `${partnerInfo.name}: ` : ''}
                {daysUntilPeriod} days to period
              </Text>
            </View>
          )}
        </View>

        {/* notification bell */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Notifications')}
          activeOpacity={0.75}
          style={[
            styles.bellBtn,
            {
              backgroundColor: colors.primaryLighter,
              borderRadius: 14,
              padding: spacing[3],
            },
          ]}
        >
          <Icon name="bell-outline" size={22} color={colors.primary} />
          {notifCount > 0 && (
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: colors.menstrual,
                  borderColor: colors.surface,
                },
              ]}
            >
              <Text style={styles.badgeText}>{Math.min(notifCount, 9)}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Hero Section — 7-day wellness stats ─────────────────────────── */}
      <View
        style={{
          backgroundColor: colors.surface,
          paddingHorizontal: spacing[5],
          paddingTop: spacing[5],
          paddingBottom: spacing[5],
          marginBottom: spacing[2],
        }}
      >
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: typography.xs,
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: 0.6,
            marginBottom: spacing[4],
          }}
        >
          7-day wellness
        </Text>
        <View style={styles.heroStatRow}>
          <HeroStatCell
            value={weeklyWellnessDisplay ?? '—'}
            label="wellness score"
            color={colors.primary}
          />
          <HeroStatDivider />
          <HeroStatCell
            value={wellnessAverages?.mood_level ?? '—'}
            label="avg mood"
            color={colors.luteal}
          />
          <HeroStatDivider />
          <HeroStatCell
            value={`${streaks?.current_streak ?? 0}d`}
            label="wellness streak"
            color={colors.primary}
          />
          <HeroStatDivider />
          <HeroStatCell
            value={wellnessAverages?.energy_level ?? '—'}
            label="avg energy"
            color={colors.ovulationColor}
          />
        </View>
      </View>

      {/* ── Cycle Information Card (if applicable) ─────────────────────── */}
      {showCycleContent && (
        <View style={{ paddingHorizontal: spacing[5], marginBottom: spacing[6] }}>
          {cycleLoading && !cycleData ? (
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 20,
                padding: spacing[5],
                alignItems: 'center',
                shadowColor: colors.shadowColor,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.06,
                shadowRadius: 12,
                elevation: 3,
              }}
            >
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : cycleActualError ? (
            /* ── Cycle data error (not 404) — show retry option ─────────── */
            <TouchableOpacity
              onPress={onRefresh}
              activeOpacity={0.85}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 20,
                padding: spacing[5],
                alignItems: 'center',
                shadowColor: colors.shadowColor,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.06,
                shadowRadius: 12,
                elevation: 3,
              }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  backgroundColor: colors.menstrualBg,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: spacing[3],
                }}
              >
                <Icon name="alert-circle-outline" size={28} color={colors.menstrual} />
              </View>
              <Text
                style={{
                  color: colors.textPrimary,
                  fontSize: typography.base,
                  fontWeight: '700',
                  marginBottom: spacing[1],
                  textAlign: 'center',
                }}
              >
                Unable to load cycle data
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: typography.sm,
                  textAlign: 'center',
                }}
              >
                Tap to retry
              </Text>
            </TouchableOpacity>
          ) : hasCycleData ? (
            /* ── Cycle data available — show in card format ─────────── */
            <TouchableOpacity
              onPress={() => goTo('CycleTab', 'CycleAnalysis')}
              activeOpacity={0.85}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 20,
                overflow: 'hidden',
                shadowColor: colors.shadowColor,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.06,
                shadowRadius: 12,
                elevation: 3,
              }}
            >
              {/* Top accent stripe */}
              <View style={{ height: 3, backgroundColor: phaseAccent }} />
              
              <View style={{ padding: spacing[5] }}>
                {/* Header with phase pill */}
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: spacing[4],
                  }}
                >
                  <View>
                    <Text
                      style={{
                        color: colors.textSecondary,
                        fontSize: typography.xs,
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: 0.6,
                        marginBottom: spacing[2],
                      }}
                    >
                      {isPartnerView ? `${partnerInfo?.name || 'Partner'}'s Cycle` : 'Cycle Status'}
                    </Text>
                    <PhasePill phase={phase} />
                  </View>
                  
                  <View
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 40,
                      borderWidth: 6,
                      borderColor: phaseAccent + '30',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                    }}
                  >
                    {/* Mini progress ring */}
                    <View
                      style={{
                        position: 'absolute',
                        width: 80,
                        height: 80,
                        borderRadius: 40,
                        borderWidth: 6,
                        borderColor: phaseAccent,
                        borderTopColor: 'transparent',
                        borderRightColor: (avgCycleLength - daysUntilPeriod) / avgCycleLength > 0.25 ? phaseAccent : 'transparent',
                        borderBottomColor: (avgCycleLength - daysUntilPeriod) / avgCycleLength > 0.5 ? phaseAccent : 'transparent',
                        borderLeftColor: (avgCycleLength - daysUntilPeriod) / avgCycleLength > 0.75 ? phaseAccent : 'transparent',
                        transform: [{ rotate: '-90deg' }],
                      }}
                    />
                    <Text
                      style={{
                        color: phaseAccent,
                        fontSize: typography.xl,
                        fontWeight: '800',
                      }}
                    >
                      {avgCycleLength - daysUntilPeriod}
                    </Text>
                  </View>
                </View>

                {/* Cycle stats */}
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    paddingTop: spacing[4],
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: colors.border,
                  }}
                >
                  <View>
                    <Text
                      style={{
                        color: colors.textSecondary,
                        fontSize: typography.xs,
                        marginBottom: spacing[1],
                      }}
                    >
                      Days to period
                    </Text>
                    <Text
                      style={{
                        color: colors.textPrimary,
                        fontSize: typography.lg,
                        fontWeight: '700',
                      }}
                    >
                      {daysUntilPeriod} days
                    </Text>
                  </View>

                  <View>
                    <Text
                      style={{
                        color: colors.textSecondary,
                        fontSize: typography.xs,
                        marginBottom: spacing[1],
                      }}
                    >
                      Ovulation day
                    </Text>
                    <Text
                      style={{
                        color: colors.textPrimary,
                        fontSize: typography.lg,
                        fontWeight: '700',
                      }}
                    >
                      Day {ovulationDay ?? '—'}
                    </Text>
                  </View>

                  <View>
                    <Text
                      style={{
                        color: colors.textSecondary,
                        fontSize: typography.xs,
                        marginBottom: spacing[1],
                      }}
                    >
                      Avg cycle
                    </Text>
                    <Text
                      style={{
                        color: colors.textPrimary,
                        fontSize: typography.lg,
                        fontWeight: '700',
                      }}
                    >
                      {avgCycleLength} days
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ) : (
            /* ── No cycle data yet — onboarding prompt ─────────── */
            <TouchableOpacity
              onPress={() => isMaleWithPartner ? goTo('ProfileTab', 'PartnerManage') : goTo('CycleTab', 'LogPeriod')}
              activeOpacity={0.85}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: colors.border,
                borderStyle: 'dashed',
                padding: spacing[5],
                alignItems: 'center',
                shadowColor: colors.shadowColor,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.06,
                shadowRadius: 12,
                elevation: 3,
              }}
            >
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 18,
                  backgroundColor: colors.primaryLighter,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: spacing[4],
                }}
              >
                <Icon 
                  name={isMaleWithPartner ? "account-heart-outline" : "calendar-plus"} 
                  size={32} 
                  color={colors.primary} 
                />
              </View>
              <Text
                style={{
                  color: colors.textPrimary,
                  fontSize: typography.lg,
                  fontWeight: '700',
                  marginBottom: spacing[2],
                  textAlign: 'center',
                }}
              >
                {isMaleWithPartner ? 'Partner Cycle Tracking' : 'Start Tracking Your Cycle'}
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: typography.sm,
                  textAlign: 'center',
                  lineHeight: 20,
                }}
              >
                {isMaleWithPartner 
                  ? 'Your partner hasn\'t logged their cycle yet. Encourage them to start tracking!'
                  : 'Log your first period to unlock personalized insights and predictions.'
                }
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── Quick Log Strip ─────────────────────────────────────────────── */}
      <View style={{ paddingHorizontal: spacing[5], marginBottom: spacing[6] }}>
        <SectionHeader title="Quick Log" />
        <ScrollView
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing[2] }}
        >
          {showCycleContent && (
            <QuickChip
              icon="plus-circle-outline"
              label="Log Period"
              color={colors.menstrual}
              onPress={() => goTo('CycleTab', 'LogPeriod')}
            />
          )}
          <QuickChip
            icon="heart-outline"
            label="Wellness"
            color={colors.luteal}
            onPress={() => goTo('WellnessTab', 'LogWellness')}
          />
          <QuickChip
            icon="pill"
            label="Medication"
            color={colors.primary}
            onPress={() => goTo('WellnessTab', 'Medications')}
          />
          <QuickChip
            icon="chart-line"
            label="Analytics"
            color={colors.ovulationColor}
            onPress={() => goTo('CycleTab', 'CycleAnalysis')}
          />
          <QuickChip
            icon="message-outline"
            label="Messages"
            color={colors.follicular}
            onPress={() => goTo('MessagesTab', 'MessagesList')}
          />
        </ScrollView>
      </View>

      {/* ── AI Wellness Insight ─────────────────────────────────────────── */}
      {aiSuggestion && (
        <View style={{ paddingHorizontal: spacing[5], marginBottom: spacing[6] }}>
          <SectionHeader
            title="AI Insight"
            onSeeAll={() => navigation.navigate('AISuggestions')}
          />
          <TouchableOpacity
            onPress={() => navigation.navigate('AISuggestions')}
            activeOpacity={0.85}
            style={[
              styles.aiCard,
              {
                backgroundColor: colors.surface,
                borderRadius: 20,
                overflow: 'hidden',
                shadowColor: colors.shadowColor,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.06,
                shadowRadius: 12,
                elevation: 3,
              },
            ]}
          >
            {/* gradient-like top bar */}
            <View
              style={{
                height: 3,
                backgroundColor: colors.luteal,
              }}
            />
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                padding: spacing[4],
                gap: spacing[3],
              }}
            >
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 13,
                  backgroundColor: colors.luteal + '18',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <AppIcon source={icons.robotWriting} size={22} />
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: typography.xs,
                    fontWeight: '700',
                    letterSpacing: 0.6,
                    textTransform: 'uppercase',
                    marginBottom: spacing[1],
                  }}
                >
                  {aiSuggestion.label ?? 'Daily Recommendation'}
                </Text>
                <Text
                  style={{
                    color: colors.textPrimary,
                    fontSize: typography.base,
                    lineHeight: 22,
                    fontWeight: '500',
                  }}
                  numberOfLines={4}
                >
                  {aiSuggestion.response_text}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Today's Wellness Snapshot ───────────────────────────────────── */}
      <View style={{ paddingHorizontal: spacing[5], marginBottom: spacing[6] }}>
        <SectionHeader
          title="Today's Wellness"
          onSeeAll={() => goTo('WellnessTab', 'LogWellness')}
        />
        <View style={{ flexDirection: 'row', gap: CARD_GAP }}>
          <StatTile
            label="Mood"
            value={todayWellness?.mood_level ? `${todayWellness.mood_level}/10` : '—'}
            sub={todayWellness ? `score ${todayWellness.wellness_score ?? '—'}` : 'tap to log'}
            accent={colors.luteal}
            onPress={() => goTo('WellnessTab', 'LogWellness')}
          />
          <StatTile
            label="Streak"
            value={streaks?.current_streak ? `${streaks.current_streak}d` : '0d'}
            sub={`${streaks?.total_logs ?? 0} total logs`}
            accent={colors.primary}
            onPress={() => goTo('WellnessTab', 'WellnessDashboard')}
          />
        </View>
      </View>

      {/* ── Health Hub ──────────────────────────────────────────────────── */}
      <View style={{ paddingHorizontal: spacing[5], marginBottom: spacing[6] }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[4] }}>
          <View>
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: typography.xl,
                fontWeight: '800',
                letterSpacing: -0.3,
                marginBottom: spacing[1],
              }}
            >
              Health Hub
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: typography.xs }}>
              Your wellness tools in one place
            </Text>
          </View>
        </View>

        {/* Featured Card - Wellness Dashboard */}
        <TouchableOpacity
          onPress={() => goTo('WellnessTab', 'WellnessDashboard')}
          activeOpacity={0.85}
          style={{
            backgroundColor: colors.surface,
            borderRadius: 24,
            overflow: 'hidden',
            marginBottom: CARD_GAP,
            shadowColor: colors.shadowColor,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.08,
            shadowRadius: 16,
            elevation: 4,
          }}
        >
          {/* Gradient-like top accent */}
          <View
            style={{
              height: 4,
              backgroundColor: (colors as any).luteal || colors.primary,
            }}
          />
          
          <View style={{ padding: spacing[5] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    backgroundColor: ((colors as any).luteal || colors.primary) + '18',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: spacing[3],
                  }}
                >
                  <AppIcon source={icons.wellness} size={32} />
                </View>
                <Text
                  style={{
                    color: colors.textPrimary,
                    fontSize: typography.xl,
                    fontWeight: '800',
                    marginBottom: spacing[2],
                  }}
                >
                  Wellness Dashboard
                </Text>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: typography.sm,
                    lineHeight: 20,
                  }}
                >
                  Track mood, sleep, energy, and stress patterns
                </Text>
              </View>
              <Icon name="chevron-right" size={24} color={colors.textSecondary} />
            </View>
          </View>
        </TouchableOpacity>

        {/* Grid Layout - 2x2 */}
        <View style={{ flexDirection: 'row', gap: CARD_GAP, marginBottom: CARD_GAP }}>
          {/* Cycle Tracker / Analytics */}
          <TouchableOpacity
            onPress={() => goTo('CycleTab', 'CycleAnalysis')}
            activeOpacity={0.85}
            style={{
              flex: 1,
              backgroundColor: colors.surface,
              borderRadius: 20,
              overflow: 'hidden',
              shadowColor: colors.shadowColor,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.06,
              shadowRadius: 12,
              elevation: 3,
            }}
          >
            <View
              style={{
                height: 3,
                backgroundColor: isCycleUser ? colors.menstrual : (colors as any).ovulationColor || colors.primary,
              }}
            />
            <View style={{ padding: spacing[4] }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  backgroundColor: (isCycleUser ? colors.menstrual : (colors as any).ovulationColor || colors.primary) + '18',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: spacing[3],
                }}
              >
                <AppIcon source={isCycleUser ? icons.menstruation : icons.search} size={26} />
              </View>
              <Text
                style={{
                  color: colors.textPrimary,
                  fontSize: typography.base,
                  fontWeight: '700',
                  marginBottom: spacing[1],
                }}
                numberOfLines={1}
              >
                {isCycleUser ? 'Cycle Tracker' : 'Analytics'}
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: typography.xs,
                  lineHeight: 16,
                }}
                numberOfLines={2}
              >
                {isCycleUser ? 'Cycle analytics & insights' : 'Wellness patterns'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Medications */}
          <TouchableOpacity
            onPress={() => goTo('WellnessTab', 'Medications')}
            activeOpacity={0.85}
            style={{
              flex: 1,
              backgroundColor: colors.surface,
              borderRadius: 20,
              overflow: 'hidden',
              shadowColor: colors.shadowColor,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.06,
              shadowRadius: 12,
              elevation: 3,
            }}
          >
            <View style={{ height: 3, backgroundColor: colors.primary }} />
            <View style={{ padding: spacing[4] }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    backgroundColor: colors.primary + '18',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: spacing[3],
                  }}
                >
                  <AppIcon source={icons.healthcare} size={26} />
                </View>
                {activeMeds > 0 && (
                  <View
                    style={{
                      backgroundColor: colors.primary,
                      borderRadius: 12,
                      minWidth: 24,
                      height: 24,
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingHorizontal: 6,
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>
                      {activeMeds > 99 ? '99+' : activeMeds}
                    </Text>
                  </View>
                )}
              </View>
              <Text
                style={{
                  color: colors.textPrimary,
                  fontSize: typography.base,
                  fontWeight: '700',
                  marginBottom: spacing[1],
                }}
                numberOfLines={1}
              >
                Medications
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: typography.xs,
                  lineHeight: 16,
                }}
                numberOfLines={2}
              >
                Track meds & reminders
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Second Row */}
        <View style={{ flexDirection: 'row', gap: CARD_GAP, marginBottom: CARD_GAP }}>
          {/* AI Suggestions */}
          <TouchableOpacity
            onPress={() => navigation.navigate('AISuggestions')}
            activeOpacity={0.85}
            style={{
              flex: 1,
              backgroundColor: colors.surface,
              borderRadius: 20,
              overflow: 'hidden',
              shadowColor: colors.shadowColor,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.06,
              shadowRadius: 12,
              elevation: 3,
            }}
          >
            <View
              style={{
                height: 3,
                backgroundColor: (colors as any).luteal || colors.primary,
              }}
            />
            <View style={{ padding: spacing[4] }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  backgroundColor: ((colors as any).luteal || colors.primary) + '18',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: spacing[3],
                }}
              >
                <AppIcon source={icons.robotWriting} size={26} />
              </View>
              <Text
                style={{
                  color: colors.textPrimary,
                  fontSize: typography.base,
                  fontWeight: '700',
                  marginBottom: spacing[1],
                }}
                numberOfLines={1}
              >
                AI Insights
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: typography.xs,
                  lineHeight: 16,
                }}
                numberOfLines={2}
              >
                Personalized tips
              </Text>
            </View>
          </TouchableOpacity>

          {/* Partner Messages */}
          <TouchableOpacity
            onPress={() => goTo('MessagesTab', 'MessagesList')}
            activeOpacity={0.85}
            style={{
              flex: 1,
              backgroundColor: colors.surface,
              borderRadius: 20,
              overflow: 'hidden',
              shadowColor: colors.shadowColor,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.06,
              shadowRadius: 12,
              elevation: 3,
            }}
          >
            <View
              style={{
                height: 3,
                backgroundColor: (colors as any).follicular || colors.primary,
              }}
            />
            <View style={{ padding: spacing[4] }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    backgroundColor: ((colors as any).follicular || colors.primary) + '18',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: spacing[3],
                  }}
                >
                  <AppIcon source={icons.chat} size={26} />
                </View>
                {msgCount > 0 && (
                  <View
                    style={{
                      backgroundColor: (colors as any).follicular || colors.primary,
                      borderRadius: 12,
                      minWidth: 24,
                      height: 24,
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingHorizontal: 6,
                    }}
                  >
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>
                      {msgCount > 99 ? '99+' : msgCount}
                    </Text>
                  </View>
                )}
              </View>
              <Text
                style={{
                  color: colors.textPrimary,
                  fontSize: typography.base,
                  fontWeight: '700',
                  marginBottom: spacing[1],
                }}
                numberOfLines={1}
              >
                Partner
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: typography.xs,
                  lineHeight: 16,
                }}
                numberOfLines={2}
              >
                Messages & insights
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bellBtn: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  heroStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroStatCell: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  heroStatDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    marginVertical: 4,
  },
  aiCard: {},
  statTile: {},
  quickChip: {},
});
