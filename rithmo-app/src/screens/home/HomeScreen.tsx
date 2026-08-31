/**
 * HomeScreen — one story, not a stack of cards.
 *
 * Sections, in descending weight:
 *
 *   HERO      solid circle    — where am I (cycle day / gestational week)
 *   REFLECTION premium card   — today's AI reflection (renders nothing if unavailable)
 *   STORY     elevated card   — what was noticed, why, and what to do
 *   SECONDARY collapsed rows — optional, subordinate
 *   ACCRUAL   quiet card     — what is known, what is nearly known
 *
 * The one-tap mood quick-pick that used to live here moved into QuickLogScreen
 * itself, which already had its own (richer, illustrated) mood picker as the
 * first step of the full log — keeping a second, plainer one on Home was a
 * duplicate control for the same write. "ثبت کامل روز" is the one route into
 * logging now, matching F-02's original lesson (don't give two routes to one
 * screen) more completely than the quick-pick card did.
 *
 * Retuned to the "Rhythmo App" design mockup (warm/green palette — see
 * theme/colors.ts).
 *
 * Context (cycle day / phase / prediction) is no longer a separate flat
 * strip — it is now the hero ring card's content (see HeroRingCard), so
 * there is exactly one headline element, not two competing for it.
 *
 * Data: ONE query. `/api/intelligence/today/` already carries cycle context,
 * insight, actions, evidence and baselines, so the separate
 * `/api/analytics/cycle/` and `/api/wellness/` calls this screen used to
 * make were removed rather than added to.
 */

import React, { useCallback, useMemo, useEffect, useRef, useState } from 'react';
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
import { useUnreadNotifications } from '@hooks/queries/useNotifications';
import { useProfile } from '@hooks/queries/useProfile';
import { useToday } from '@hooks/queries/useIntelligence';
import { usePregnancyStatus } from '@hooks/queries/usePregnancy';
import type { HomeScreenProps } from '@navigation/types';
import type { GuidedAction, Insight } from '@types/intelligence.types';
import { textRoles } from '@theme/typography';
import { screen } from '@theme/spacing';
import { toFa, faDate } from '@utils/persian';
import {
  ErrorState,
  ContextSkeleton,
  StoryCardSkeleton,
  AccrualSkeleton,
  Reveal,
} from '@components/ui';
import { track } from '@analytics';
import { StoryCard } from './components/StoryCard';
import { CheckInPrompt } from './components/CheckInPrompt';
import { SecondaryActions } from './components/SecondaryActions';
import { AccrualLedger } from './components/AccrualLedger';
import { DailyReflectionCard } from './components/DailyReflectionCard';
import { HeroRingCard } from './components/HeroRingCard';
import { QuickCheckInWidget } from './components/QuickCheckInWidget';

type Props = HomeScreenProps<'Home'>;

/** A quiet section label. Deliberately lighter than any card title. */
function SectionLabel({ children }: { children: string }) {
  const { colors, spacing } = useTheme();
  // The `label` role, not a heading: this names a subordinate group and must
  // not compete with the story card above it.
  return (
    <Text
      style={{
        color: colors.textTertiary,
        fontSize: textRoles.label.fontSize,
        fontWeight: textRoles.label.fontWeight,
        lineHeight: textRoles.label.lineHeight,
        marginBottom: spacing[2],
      }}
    >
      {children}
    </Text>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation<Props['navigation']>();
  const { colors, spacing, borderRadius } = useTheme();
  const { user } = useAuth();

  const { data: profile, refetch: refetchProfile } = useProfile();
  const shouldFetch = profile !== undefined;

  const {
    data: today,
    isLoading: todayLoading,
    isError: todayError,
    refetch: refetchToday,
  } = useToday(shouldFetch);

  const { data: unreadNotifs } = useUnreadNotifications();
  const { data: pregnancy } = usePregnancyStatus();

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([refetchProfile(), refetchToday()]);
    setRefreshing(false);
  }, [refetchProfile, refetchToday]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const state = today?.state ?? null;
  const learningMode = today?.learning_mode ?? false;

  const { primaryAction, secondaryActions } = useMemo(() => {
    const actions: GuidedAction[] = today?.actions ?? [];
    return {
      primaryAction: actions.find((a) => a.slot === 'primary') ?? null,
      // Everything that is not the headline, in a stable order.
      secondaryActions: actions.filter((a) => a.slot !== 'primary'),
    };
  }, [today?.actions]);

  // ── Analytics ─────────────────────────────────────────────────────────────
  const reportedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!today) { return; }
    const key = `${today.state.today}:${today.actions.length}`;
    if (reportedRef.current === key) { return; }
    reportedRef.current = key;
    track('home_viewed', {
      learning_mode: today.learning_mode,
      has_primary_insight: Boolean(today.primary_insight),
      action_count: today.actions.length,
    });
    if (today.primary_insight) {
      track('insight_viewed', {
        insight_key: today.primary_insight.key,
        insight_kind: today.primary_insight.kind,
        confidence: today.primary_insight.confidence,
      });
    }
  }, [today]);

  // ── Navigation ────────────────────────────────────────────────────────────
  const goToQuickLog = useCallback(() => {
    navigation.navigate('LogTab' as any, { screen: 'QuickLog' } as any);
  }, [navigation]);
  const goToQuickLogCategory = useCallback((category: string) => {
    navigation.navigate('LogTab' as any, { screen: 'QuickLog', params: { initialCategory: category } } as any);
  }, [navigation]);
  const goToCycle = useCallback(() => navigation.navigate('CycleTab' as any), [navigation]);
  const goToInsights = useCallback(() => navigation.navigate('InsightsTab' as any), [navigation]);
  const goToNotifications = useCallback(() => navigation.navigate('Notifications'), [navigation]);
  const goToLogPeriod = useCallback(() => {
    navigation.navigate('CycleTab' as any, { screen: 'LogPeriod' } as any);
  }, [navigation]);
  const goToPregnancy = useCallback(() => {
    navigation.navigate('ProfileTab' as any, { screen: 'Pregnancy' } as any);
  }, [navigation]);
  const goToInsightDetail = useCallback(
    (insight: Insight) => navigation.navigate('InsightDetail', { insight }),
    [navigation],
  );

  /**
   * Only data-collection actions have somewhere to go; the rest are done in
   * the world, so their card records completion directly rather than
   * pretending to open something.
   */
  const openAction = useCallback((action: GuidedAction) => {
    if (action.intervention === 'log_today') { goToQuickLog(); return; }
    if (action.intervention === 'log_period') { goToLogPeriod(); return; }
  }, [goToQuickLog, goToLogPeriod]);

  const actionOpener = useCallback(
    (action: GuidedAction) =>
      action.intervention === 'log_today' || action.intervention === 'log_period'
        ? openAction
        : undefined,
    [openAction],
  );

  // ── Header ────────────────────────────────────────────────────────────────
  const dateStr = useMemo(() => faDate(new Date()), []);
  const userName = profile?.first_name || user?.username || '';
  const unreadCount: number = (unreadNotifs as any)?.count ?? 0;

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <ScrollView
        // `SafeAreaView edges={['top',…]}` only clears the status-bar inset —
        // it adds no breathing room — so with no paddingTop the hero card butted
        // straight against the status bar. The top now matches the horizontal
        // inset, so the content sits in an even frame.
        contentContainerStyle={{
          paddingHorizontal: screen.gutter,
          paddingTop: screen.top,
          paddingBottom: screen.bottomTab,
        }}
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
        {/* ── Header — plain, no dark banner ─────────────────────────── */}
        <View style={styles.headerRow}>
          <View style={styles.headerTextCol}>
            <Text
              style={[
                styles.greeting,
                { color: colors.textPrimary, fontSize: textRoles.screenTitle.fontSize, lineHeight: textRoles.screenTitle.lineHeight },
              ]}
            >
              {userName ? `سلام، ${userName}` : 'سلام'}
            </Text>
            <Text
              style={{
                color: colors.textTertiary,
                fontSize: textRoles.bodyCompact.fontSize,
                lineHeight: textRoles.bodyCompact.lineHeight,
                marginTop: 3,
              }}
            >
              {dateStr}
            </Text>
          </View>
          <TouchableOpacity
            onPress={goToNotifications}
            style={[styles.bellBtn, { backgroundColor: colors.primaryLighter, borderRadius: borderRadius.pill }]}
            accessibilityRole="button"
            accessibilityLabel={`اعلان‌ها${unreadCount > 0 ? `، ${toFa(unreadCount)} خوانده‌نشده` : ''}`}
          >
            <Icon name="bell-outline" size={20} color={colors.primaryDark} />
            {unreadCount > 0 ? (
              <View
                style={[
                  styles.unreadDot,
                  { backgroundColor: colors.menstrual, borderColor: colors.primaryLighter },
                ]}
              />
            ) : null}
          </TouchableOpacity>
        </View>

        {/* ── 1. Hero — cycle/pregnancy ring, the SELECTED day's fact ─── */}
        {todayLoading ? (
          <ContextSkeleton />
        ) : (
          <View style={{ marginTop: spacing[4] }}>
            <HeroRingCard
              cycle={state?.cycle}
              pregnancy={pregnancy}
              onPress={pregnancy?.has_active_pregnancy ? goToPregnancy : goToCycle}
              onStartTracking={goToLogPeriod}
            />
            {(!pregnancy?.has_active_pregnancy || (cycle && cycle.is_known)) && (
              <QuickCheckInWidget onPressItem={goToQuickLogCategory} />
            )}
          </View>
        )}

        {/* Smallest possible Premium AI surface — renders nothing at all
            when not premium/available, so it never affects free users or
            the AI-unavailable case. See DailyReflectionCard's header. */}
        <View style={{ marginTop: spacing[4] }}>
          <DailyReflectionCard />
        </View>

        {/* ── 2. The story — insight + the action it produced ─────────── */}
        {todayLoading ? (
          <View style={{ marginTop: spacing[4] }}>
            <StoryCardSkeleton />
          </View>
        ) : todayError ? (
          /* Section-scoped failure: the header, hero and everything below
             stay on screen. A single failed query must not blank all of
             Home. */
          <View
            style={[
              styles.errorWrap,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: borderRadius.xl,
                marginTop: spacing[4],
              },
            ]}
          >
            <ErrorState error={'مشکلی در بارگذاری پیش آمد'} onRetry={refetchToday} />
          </View>
        ) : (
          <Reveal style={{ marginTop: spacing[4] }}>
            <StoryCard
              insight={today?.primary_insight ?? null}
              action={primaryAction}
              learningMode={learningMode}
              generalContext={today?.general_context ?? null}
              noticing={today?.noticing ?? null}
              onOpenAction={primaryAction ? actionOpener(primaryAction) : undefined}
              onOpenDetail={goToInsightDetail}
            />
          </Reveal>
        )}

        {/* ── Proactive check-in — at most one per day, only when the
            backend's own eligibility rules found a real reason to ask. */}
        {!todayLoading && !todayError && today?.check_in ? (
          <View style={{ marginTop: spacing[4] }}>
            <CheckInPrompt checkIn={today.check_in} onGoFullLog={goToQuickLog} />
          </View>
        ) : null}

        {/* ── 3. Secondary actions — subordinate rows ───────────────── */}
        {!todayLoading && secondaryActions.length > 0 ? (
          <Reveal delay={60}>
            <View style={{ marginTop: spacing[6] }}>
              <SectionLabel>اگر خواستی</SectionLabel>
              <SecondaryActions actions={secondaryActions} onOpenAction={actionOpener} />
            </View>
          </Reveal>
        ) : null}

        {/* ── 4. Accrual — the reason to come back ──────────────────── */}
        {/* Staggered at 120ms so the column arrives in reading order rather
            than snapping in as one block. `Reveal` fires once on mount and
            honours reduced motion, so this costs nothing on a device that
            has asked for less movement. */}
        <Reveal delay={120} style={{ marginTop: spacing[6] }}>
          {todayLoading ? (
            <AccrualSkeleton />
          ) : state ? (
            <TouchableOpacity
              onPress={goToInsights}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="مشاهده همه الگوها"
            >
              <AccrualLedger state={state} />
              {/* The whole card has always navigated to Insights, but nothing
                  said so. The chevron points LEFT because forward is left in a
                  right-to-left layout, and React Native does not mirror icons. */}
              <View style={styles.ledgerAffordance}>
                <Text
                  style={{
                    color: colors.primary,
                    fontSize: textRoles.label.fontSize,
                    fontWeight: textRoles.label.fontWeight,
                  }}
                >
                  مشاهده همه الگوها
                </Text>
                <Icon name="chevron-left" size={16} color={colors.primary} />
              </View>
            </TouchableOpacity>
          ) : null}
        </Reveal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerTextCol: { flex: 1 },
  bellBtn: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  unreadDot: {
    position: 'absolute',
    top: 8,
    // `end`, not `right`. React Native does NOT swap left/right under
    // `I18nManager.forceRTL`; only start/end are logical, so `right` pinned
    // this dot to the physical right and it sat on the wrong side of the bell.
    end: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  // 700, not 800: `screenTitle` in the type scale. No negative tracking —
  // Persian letterforms join, and tightening them damages the joins.
  greeting: { fontWeight: '700' },
  errorWrap: { borderWidth: 1, overflow: 'hidden' },
  ledgerAffordance: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 8,
  },
});
