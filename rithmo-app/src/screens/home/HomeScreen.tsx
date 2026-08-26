/**
 * HomeScreen — one story, not a stack of cards.
 *
 * Four sections, in descending weight:
 *
 *   CONTEXT   flat strip     — where am I
 *   STORY     elevated card  — what was noticed, why, and what to do
 *   SECONDARY collapsed rows — optional, subordinate
 *   ACCRUAL   quiet card     — what is known, what is nearly known
 *
 * What changed and why (F-02):
 *
 * - **Insight and action are one card.** They were two cards of equal
 *   weight, so the user had to infer that the recommendation came from the
 *   observation — and that inference is the whole product claim. See
 *   StoryCard.
 * - **Context is a strip, not a card.** Home opened with two elevated
 *   elements competing to be the headline, the first of which carried
 *   generic wellness advice true of everyone.
 * - **Secondary actions collapsed.** Three identical cards put six CTAs on
 *   one screen; nothing was primary because everything looked primary.
 * - **The quick-action row is gone.** «ثبت امروز» duplicated the reflection
 *   action 200px below it, and both went to QuickLog — which is also the
 *   centre tab. Three routes to one screen.
 * - **Accrual added.** The loop broke at feedback: logging produced no
 *   visible consequence. The evidence ledger is the answer to "why log
 *   again", and every number in it is real.
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
import type { GuidedAction } from '@types/intelligence.types';
import { getBrandGradient } from '@theme/brand';
import { textRoles } from '@theme/typography';
import { spacing as spacingScale, screen } from '@theme/spacing';
import { toFa, faDate } from '@utils/persian';
import {
  GradientSurface,
  ErrorState,
  ContextSkeleton,
  StoryCardSkeleton,
  AccrualSkeleton,
  Reveal,
} from '@components/ui';
import { track } from '@analytics';
import { CycleContextStrip } from './components/CycleContextStrip';
import { PregnancyContextStrip } from './components/PregnancyContextStrip';
import { StoryCard } from './components/StoryCard';
import { SecondaryActions } from './components/SecondaryActions';
import { AccrualLedger } from './components/AccrualLedger';

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
  const { colors, spacing, borderRadius, isDark } = useTheme();
  const { user } = useAuth();
  const gradient = getBrandGradient(isDark);

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
  const goToCycle = useCallback(() => navigation.navigate('CycleTab' as any), [navigation]);
  const goToInsights = useCallback(() => navigation.navigate('InsightsTab' as any), [navigation]);
  const goToNotifications = useCallback(() => navigation.navigate('Notifications'), [navigation]);
  const goToLogPeriod = useCallback(() => {
    navigation.navigate('CycleTab' as any, { screen: 'LogPeriod' } as any);
  }, [navigation]);
  const goToPregnancy = useCallback(() => {
    navigation.navigate('ProfileTab' as any, { screen: 'Pregnancy' } as any);
  }, [navigation]);

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
        {/* ── Header ────────────────────────────────────────────────── */}
        <GradientSurface
          colors={[gradient.heroFrom, gradient.heroTo]}
          borderRadius={borderRadius['2xl']}
          style={styles.hero}
        >
          <View style={styles.heroTopRow}>
            {/* The hero gradient is dark in BOTH themes, so its foreground is
                `textOnDark` at a reduced opacity rather than an rgba literal —
                the literal was theme-blind and sat outside the palette. */}
            <Text
              style={{
                color: colors.textOnDark,
                opacity: 0.75,
                fontSize: textRoles.caption.fontSize,
                fontWeight: '600',
              }}
            >
              {dateStr}
            </Text>
            <TouchableOpacity
              onPress={goToNotifications}
              style={[styles.bellBtn, { borderRadius: borderRadius.lg }]}
              accessibilityRole="button"
              accessibilityLabel={`اعلان‌ها${unreadCount > 0 ? `، ${toFa(unreadCount)} خوانده‌نشده` : ''}`}
            >
              <Icon name="bell-outline" size={20} color={colors.textOnDark} />
              {unreadCount > 0 ? (
                <View
                  style={[
                    styles.unreadDot,
                    { backgroundColor: colors.menstrual, borderColor: gradient.heroTo },
                  ]}
                />
              ) : null}
            </TouchableOpacity>
          </View>
          {/* Text alone. It carried a 🌸 emoji, then an icon in its place;
              neither earned the space beside someone's own name. */}
          <Text
            style={[
              styles.greeting,
              {
                color: colors.textOnDark,
                fontSize: textRoles.screenTitle.fontSize,
                lineHeight: textRoles.screenTitle.lineHeight,
              },
            ]}
          >
            {userName ? `سلام، ${userName}` : 'سلام'}
          </Text>
          <Text
            style={{
              color: colors.textOnDark,
              opacity: 0.75,
              fontSize: textRoles.bodyCompact.fontSize,
              lineHeight: textRoles.bodyCompact.lineHeight,
              marginTop: 4,
            }}
          >
            {learningMode ? 'هنوز در حال شناختن الگوی توام' : 'امروز چه چیزی مهم است'}
          </Text>
        </GradientSurface>

        {/* ── 1. Context — flat strip ───────────────────────────────── */}
        <View
          style={[
            styles.contextWrap,
            { borderBottomColor: colors.borderSubtle, marginBottom: spacing[4] },
          ]}
        >
          {todayLoading ? (
            <ContextSkeleton />
          ) : pregnancy?.has_active_pregnancy ? (
            <PregnancyContextStrip pregnancy={pregnancy} onPress={goToPregnancy} />
          ) : (
            <CycleContextStrip
              cycle={state?.cycle}
              onPress={goToCycle}
              onStartTracking={goToLogPeriod}
            />
          )}
        </View>

        {/* ── 2. The story ──────────────────────────────────────────── */}
        {todayLoading ? (
          <StoryCardSkeleton />
        ) : todayError ? (
          /* Section-scoped failure: the header, context and everything
             below stay on screen. A single failed query must not blank
             the whole of Home. */
          <View
            style={[
              styles.errorWrap,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: borderRadius.xl,
              },
            ]}
          >
            <ErrorState error={'مشکلی در بارگذاری پیش آمد'} onRetry={refetchToday} />
          </View>
        ) : (
          <Reveal>
            <StoryCard
              insight={today?.primary_insight ?? null}
              action={primaryAction}
              learningMode={learningMode}
              onOpenAction={primaryAction ? actionOpener(primaryAction) : undefined}
            />
          </Reveal>
        )}

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
  // Was a hardcoded 20 while every other card on this screen used
  // spacing[4] (16) and TodayInsightCard used 14. All three blocks share the
  // scroll view's horizontal padding, so their OUTER edges lined up while
  // their text did not: in RTL the greeting sat 20px from the right edge and
  // the card headings below it sat 16 and 14, so nothing shared a right
  // margin down the page. One token for card interiors fixes the whole column.
  hero: { padding: spacingScale[4], overflow: 'hidden' },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  bellBtn: {
    width: 42,
    height: 42,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
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
  // A hairline under the strip separates context from the story without
  // making it a second card.
  contextWrap: { borderBottomWidth: StyleSheet.hairlineWidth, marginTop: 4 },
  errorWrap: { borderWidth: 1, overflow: 'hidden' },
  ledgerAffordance: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 8,
  },
});
