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
  ImageSourcePropType,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@hooks/useTheme';
import { useAuth } from '@hooks/useAuth';
import { useCycleAnalysis, useLatestOvulation } from '@hooks/queries/usePeriods';
import { useUnreadNotifications, useUnreadMessages } from '@hooks/queries/useNotifications';
import { useAISuggestion } from '@hooks/queries/useAI';
import { useUserMedications } from '@hooks/queries/useMedications';
import { useTodayWellnessLog, useWellnessStreaks } from '@hooks/queries/useWellness';
import { CycleRing, PhasePill, Icon, AppIcon } from '@components/ui';
import { useProfile } from '@hooks/queries/useProfile';
import icons from '../../assets/icons';
import type { HomeScreenProps } from '@navigation/types';

type Props = HomeScreenProps<'Home'>;

const { width: W } = Dimensions.get('window');
const CARD_GAP = 12;
const HALF_CARD = (W - 40 - CARD_GAP) / 2;

// ── helpers ──────────────────────────────────────────────────────────────────

function normalisePhase(raw?: string): 'menstrual' | 'follicular' | 'ovulation' | 'luteal' {
  const s = (raw ?? '').toLowerCase();
  if (s.includes('menstrual') || s.includes('period')) return 'menstrual';
  if (s.includes('ovulat')) return 'ovulation';
  if (s.includes('luteal')) return 'luteal';
  return 'follicular';
}

// ── sub-components ────────────────────────────────────────────────────────────

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

/** Hub module card — full-width or half-width */
function HubCard({
  icon,
  pngSource,
  title,
  description,
  accent,
  badge,
  half,
  onPress,
}: {
  icon?: string;
  pngSource?: ImageSourcePropType;
  title: string;
  description: string;
  accent: string;
  badge?: number;
  half?: boolean;
  onPress: () => void;
}) {
  const { colors, spacing, typography } = useTheme();
  const w = half ? HALF_CARD : W - 40;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.82}
      style={[
        {
          width: w,
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
      {/* top accent stripe */}
      <View style={{ height: 3, backgroundColor: accent }} />

      <View style={{ padding: spacing[4] }}>
        {/* icon + badge row */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: spacing[3],
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 13,
              backgroundColor: accent + '18',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {pngSource ? (
              <AppIcon source={pngSource} size={26} />
            ) : icon ? (
              <Icon name={icon} size={22} color={accent} />
            ) : null}
          </View>

          {badge !== undefined && badge > 0 && (
            <View
              style={{
                backgroundColor: accent,
                borderRadius: 10,
                minWidth: 22,
                height: 22,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 6,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>
                {badge > 99 ? '99+' : badge}
              </Text>
            </View>
          )}
        </View>

        <Text
          style={{
            color: colors.textPrimary,
            fontSize: half ? typography.base : typography.lg,
            fontWeight: '700',
            marginBottom: spacing[1],
          }}
          numberOfLines={1}
        >
          {title}
        </Text>
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: typography.xs,
            lineHeight: 17,
          }}
          numberOfLines={2}
        >
          {description}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ── main screen ───────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const navigation = useNavigation<Props['navigation']>();
  const { colors, spacing, typography } = useTheme();
  const { user } = useAuth();

  const { data: cycleData, isLoading: cycleLoading, refetch: refetchCycle, isError: cycleError, error: cycleErrorObj } = useCycleAnalysis();
  const { data: ovulation } = useLatestOvulation();
  const { data: unreadNotifs } = useUnreadNotifications();
  const { data: unreadMsgs } = useUnreadMessages();
  const { data: aiSuggestion } = useAISuggestion();
  const { data: medications } = useUserMedications();
  const { data: todayWellness } = useTodayWellnessLog();
  const { data: streaks } = useWellnessStreaks();
  const { data: profile, isLoading: profileLoading, isError: profileError, refetch: refetchProfile, error: profileErrorObj } = useProfile();

  const [refreshing, setRefreshing] = React.useState(false);

  // Debug logging
  React.useEffect(() => {
    if (profileError) {
      console.error('Profile loading error:', profileErrorObj);
    }
    if (cycleError) {
      // Only log non-404 errors (404 means no cycle data, which is normal)
      const status = (cycleErrorObj as any)?.response?.status;
      if (status !== 404) {
        console.error('Cycle loading error:', cycleErrorObj);
      }
    }
  }, [profileError, cycleError, profileErrorObj, cycleErrorObj]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchCycle(), refetchProfile()]);
    } catch (error) {
      console.error('Refresh error:', error);
    }
    setRefreshing(false);
  }, [refetchCycle, refetchProfile]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 5)  return 'Good night';
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const phase = normalisePhase(cycleData?.current_phase);

  const phaseAccent = {
    menstrual:  colors.menstrual,
    follicular: colors.follicular,
    ovulation:  colors.ovulation,
    luteal:     colors.luteal,
  }[phase];

  const activeMeds = (medications ?? []).filter((m: any) => m.is_active).length;
  const notifCount = unreadNotifs?.count ?? 0;
  const msgCount   = unreadMsgs?.count ?? 0;

  // Safe data access with fallbacks
  const daysUntilPeriod = cycleData?.days_until_next_period ?? 0;
  const avgCycleLength = cycleData?.average_cycle_length ?? 28;
  const ovulationDay = ovulation?.ovulation_date
    ? new Date(ovulation.ovulation_date).getDate()
    : null;

  // Whether this user tracks their own cycle — use profile.sex (from /api/user/profile/)
  // which is the authoritative source. Falls back to cycle view while profile loads.
  // If profile fails to load, default to showing cycle content (safer default)
  const isCycleUser = profileError ? true : profile?.sex !== 'male';
  
  // Whether cycle data exists yet
  // 404 error means no data (normal), other errors are actual errors
  const cycleDataNotFound = cycleError && (cycleErrorObj as any)?.response?.status === 404;
  const cycleActualError = cycleError && !cycleDataNotFound;
  const hasCycleData = !cycleLoading && !!cycleData && !cycleError;

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

  // Show loading state only on initial load (not on refresh)
  // Only show loading if we're actually loading and have no cached data
  const isInitialLoading = profileLoading && !profile && !profileError && !refreshing;

  // Don't block rendering - let the screen show with loading indicators for individual sections
  // This ensures the header and navigation always work
  
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

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: spacing[12] }}
      showsVerticalScrollIndicator={false}
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
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: typography.sm,
              fontWeight: '500',
              marginBottom: 2,
            }}
          >
            {greeting} ✦
          </Text>
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: typography['2xl'],
              fontWeight: '800',
              letterSpacing: -0.5,
            }}
          >
            {user?.first_name || profile?.first_name || user?.username || 'Welcome'}
          </Text>
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

      {/* ── Hero Section — adapts to user type ─────────────────────────── */}
      {isCycleUser ? (
        /* ── Cycle Ring Hero (female / other) ─────────────────────────── */
        <View
          style={[
            styles.heroSection,
            {
              backgroundColor: colors.surface,
              paddingHorizontal: spacing[5],
              paddingTop: spacing[6],
              paddingBottom: spacing[6],
              marginBottom: spacing[2],
            },
          ]}
        >
          {cycleLoading && !cycleData ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ height: 200 }} />
          ) : cycleActualError ? (
            /* ── Cycle data error (not 404) — show retry option ─────────── */
            <View
              style={{
                borderRadius: 20,
                borderWidth: 1,
                borderColor: colors.border,
                padding: spacing[6],
                alignItems: 'center',
              }}
            >
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 20,
                  backgroundColor: colors.menstrualBg,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: spacing[4],
                }}
              >
                <Icon name="alert-circle-outline" size={36} color={colors.menstrual} />
              </View>

              <Text
                style={{
                  color: colors.textPrimary,
                  fontSize: typography.lg,
                  fontWeight: '800',
                  letterSpacing: -0.3,
                  marginBottom: spacing[2],
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
                  lineHeight: 20,
                  marginBottom: spacing[5],
                }}
              >
                Pull down to refresh or check your connection
              </Text>
            </View>
          ) : hasCycleData ? (
            <>
              {/* Phase pill */}
              <View style={{ alignItems: 'center', marginBottom: spacing[5] }}>
                <PhasePill phase={phase} />
              </View>

              {/* Ring */}
              <View style={{ alignItems: 'center', marginBottom: spacing[5] }}>
                <CycleRing
                  currentDay={avgCycleLength - daysUntilPeriod}
                  totalDays={avgCycleLength}
                  phase={phase}
                  size={200}
                />
              </View>

              {/* Three-stat row */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-around',
                  paddingTop: spacing[4],
                  borderTopWidth: StyleSheet.hairlineWidth,
                  borderTopColor: colors.border,
                }}
              >
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ color: phaseAccent, fontSize: typography['2xl'], fontWeight: '800' }}>
                    {daysUntilPeriod}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: typography.xs, marginTop: 2 }}>
                    days to period
                  </Text>
                </View>

                <View style={{ width: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />

                <View style={{ alignItems: 'center' }}>
                  <Text style={{ color: colors.ovulationColor, fontSize: typography['2xl'], fontWeight: '800' }}>
                    {ovulationDay ?? '—'}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: typography.xs, marginTop: 2 }}>
                    ovulation day
                  </Text>
                </View>

                <View style={{ width: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />

                <View style={{ alignItems: 'center' }}>
                  <Text style={{ color: colors.primary, fontSize: typography['2xl'], fontWeight: '800' }}>
                    {avgCycleLength}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: typography.xs, marginTop: 2 }}>
                    avg cycle
                  </Text>
                </View>
              </View>
            </>
          ) : (
            /* ── No cycle data yet — clean onboarding prompt ─────────── */
            <View
              style={{
                borderRadius: 20,
                borderWidth: 1,
                borderColor: colors.border,
                borderStyle: 'dashed',
                padding: spacing[6],
                alignItems: 'center',
              }}
            >
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 20,
                  backgroundColor: colors.menstrualBg,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: spacing[4],
                }}
              >
                <AppIcon source={icons.menstruation} size={36} />
              </View>

              <Text
                style={{
                  color: colors.textPrimary,
                  fontSize: typography.lg,
                  fontWeight: '800',
                  letterSpacing: -0.3,
                  marginBottom: spacing[2],
                  textAlign: 'center',
                }}
              >
                Start tracking your cycle
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: typography.sm,
                  textAlign: 'center',
                  lineHeight: 20,
                  marginBottom: spacing[5],
                }}
              >
                Log your first period to unlock cycle predictions, ovulation tracking, and AI insights.
              </Text>

              <TouchableOpacity
                onPress={() => goTo('CycleTab', 'LogPeriod')}
                activeOpacity={0.85}
                style={{
                  backgroundColor: colors.menstrual,
                  borderRadius: 14,
                  paddingHorizontal: spacing[6],
                  paddingVertical: spacing[3],
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing[2],
                }}
              >
                <Icon name="plus-circle-outline" size={18} color="#fff" />
                <Text style={{ color: '#fff', fontSize: typography.base, fontWeight: '700' }}>
                  Log First Period
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : (
        /* ── General Wellness Hero (male / partner) ────────────────────── */
        <View
          style={[
            {
              backgroundColor: colors.surface,
              paddingHorizontal: spacing[5],
              paddingTop: spacing[6],
              paddingBottom: spacing[6],
              marginBottom: spacing[2],
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: colors.border,
            },
          ]}
        >
          {/* Wellness score ring placeholder */}
          <View style={{ alignItems: 'center', marginBottom: spacing[5] }}>
            <View
              style={{
                width: 160,
                height: 160,
                borderRadius: 80,
                borderWidth: 10,
                borderColor: colors.primary + '30',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View
                style={{
                  position: 'absolute',
                  width: 160,
                  height: 160,
                  borderRadius: 80,
                  borderWidth: 10,
                  borderColor: colors.primary,
                  borderTopColor: 'transparent',
                  borderRightColor: colors.primary,
                  borderBottomColor: colors.primary,
                  borderLeftColor: 'transparent',
                  transform: [{ rotate: '-45deg' }],
                }}
              />
              <Text style={{ fontSize: 36 }}>🌿</Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: typography.xs,
                  fontWeight: '600',
                  marginTop: 4,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}
              >
                Wellness
              </Text>
            </View>
          </View>

          {/* Two-stat row */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-around',
              paddingTop: spacing[4],
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: colors.border,
            }}
          >
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: colors.primary, fontSize: typography['2xl'], fontWeight: '800' }}>
                {todayWellness?.mood_level ?? '—'}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: typography.xs, marginTop: 2 }}>
                mood today
              </Text>
            </View>

            <View style={{ width: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />

            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: colors.primary, fontSize: typography['2xl'], fontWeight: '800' }}>
                {streaks?.current_streak ?? 0}d
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: typography.xs, marginTop: 2 }}>
                wellness streak
              </Text>
            </View>

            <View style={{ width: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />

            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: colors.primary, fontSize: typography['2xl'], fontWeight: '800' }}>
                {activeMeds}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: typography.xs, marginTop: 2 }}>
                active meds
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* ── Quick Log Strip ─────────────────────────────────────────────── */}
      <View style={{ paddingHorizontal: spacing[5], marginBottom: spacing[6] }}>
        <SectionHeader title="Quick Log" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing[2] }}
        >
          {isCycleUser && (
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
        <SectionHeader title="Health Hub" />

        {/* Row 1 — half cards */}
        <View style={{ flexDirection: 'row', gap: CARD_GAP, marginBottom: CARD_GAP }}>
          {isCycleUser ? (
            <HubCard
              pngSource={icons.menstruation}
              title="Cycle Tracker"
              description="View your full cycle history and predictions"
              accent={colors.menstrual}
              half
              onPress={() => goTo('CycleTab', 'CycleTracker')}
            />
          ) : (
            <HubCard
              pngSource={icons.search}
              title="Analytics"
              description="Wellness patterns and health correlations"
              accent={colors.ovulationColor}
              half
              onPress={() => goTo('CycleTab', 'CycleAnalysis')}
            />
          )}
          <HubCard
            pngSource={icons.healthcare}
            title="Medications"
            description="Track active meds and reminders"
            accent={colors.primary}
            badge={activeMeds}
            half
            onPress={() => goTo('WellnessTab', 'Medications')}
          />
        </View>

        {/* Row 2 — full-width wellness */}
        <View style={{ marginBottom: CARD_GAP }}>
          <HubCard
            pngSource={icons.wellness}
            title="Wellness Dashboard"
            description="Mood, sleep, energy, stress — all in one place"
            accent={colors.luteal}
            onPress={() => goTo('WellnessTab', 'WellnessDashboard')}
          />
        </View>

        {/* Row 3 — half cards */}
        <View style={{ flexDirection: 'row', gap: CARD_GAP, marginBottom: CARD_GAP }}>
          <HubCard
            pngSource={icons.search}
            title="Analytics"
            description="Cycle patterns and health correlations"
            accent={colors.ovulationColor}
            half
            onPress={() => goTo('CycleTab', 'CycleAnalysis')}
          />
          <HubCard
            pngSource={icons.chat}
            title="Partner"
            description="Messages and shared insights"
            accent={colors.follicular}
            badge={msgCount}
            half
            onPress={() => goTo('MessagesTab', 'MessagesList')}
          />
        </View>

        {/* Row 4 — full-width AI */}
        <HubCard
          pngSource={icons.robotWriting}
          title="AI Suggestions"
          description="Personalised health insights powered by your data"
          accent={colors.luteal}
          onPress={() => navigation.navigate('AISuggestions')}
        />
      </View>
    </ScrollView>
  );
}

// ── styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
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
  heroSection: {},
  aiCard: {},
  statTile: {},
  quickChip: {},
});
