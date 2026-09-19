/**
 * PremiumDashboardScreen — پنل هوش سلامت شخصی
 *
 * The consolidated Personal Health Intelligence home: what's happening
 * today, what changed, the strongest pattern, what's expected next, and
 * the monthly synthesis — one screen, not a grid of feature icons. Every
 * section reuses an existing card/hook or a new one built the same way —
 * nothing here computes anything; each card's own docstring documents its
 * backend data boundary.
 *
 * Free/Premium split (docs/DECISIONS.md DEC-005): this screen itself is
 * free now — it used to whole-screen-gate on isPremium, which would have
 * hidden ForecastCard/MonthlyReviewCard's own free content (they now
 * self-gate only their deeper sections internally) along with everything
 * else. TodayInsightCard/ForecastCard/MonthlyReviewCard render for every
 * user. CycleChangeCard/FertileWindowCard/HealthChangeCard remain
 * genuinely Premium-only (not part of this pass — see DEC-005's
 * documented reasons) and are individually wrapped in PremiumGate below,
 * since they'd otherwise either show a stuck loading skeleton
 * (FertileWindowCard/HealthChangeCard's queries are still fully disabled
 * for a free user) or silently render nothing (CycleChangeCard, whose own
 * docstring already says it expects the caller to wrap it).
 * DailyReflectionCard is deliberately left unwrapped — by its own design
 * it renders nothing at all when unavailable, never even an upsell, and
 * that stays true for a free user here too.
 */
import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@hooks/useTheme';
import { screen } from '@theme/spacing';
import { PremiumGate } from '@components/PremiumGate';
import { Card, StoryCardSkeleton } from '@components/ui';
import { useInsights, useProgress } from '@hooks/queries/useIntelligence';
import { toFa } from '@utils/persian';
import { DailyReflectionCard } from '../home/components/DailyReflectionCard';
import { TodayInsightCard } from '../home/components/TodayInsightCard';
import { CycleChangeCard } from './components/CycleChangeCard';
import { ForecastCard } from './components/ForecastCard';
import { FertileWindowCard } from './components/FertileWindowCard';
import { HealthChangeCard } from './components/HealthChangeCard';
import { MonthlyReviewCard } from './components/MonthlyReviewCard';
import type { Insight } from '@types/intelligence.types';
import type { InsightsScreenProps } from '@navigation/types';

type Props = InsightsScreenProps<'PremiumDashboard'>;

export default function PremiumDashboardScreen() {
  const { colors, spacing, typography } = useTheme();
  const navigation = useNavigation<Props['navigation']>();
  const [refreshing, setRefreshing] = useState(false);

  const { data: insightData, isLoading: insightsLoading, refetch: refetchInsights } = useInsights();
  const { data: progress, refetch: refetchProgress } = useProgress();

  // Cross-tab, same pattern InsightsHomeScreen already uses for
  // InsightDetail (it lives on HomeStack, owner-only there).
  const goToInsightDetail = useCallback(
    (insight: Insight) =>
      navigation.navigate('HomeTab' as any, { screen: 'InsightDetail', params: { insight } } as any),
    [navigation],
  );
  const goToAllPatterns = useCallback(() => navigation.navigate('InsightsHome'), [navigation]);
  const goToAskRithmo = useCallback(() => navigation.navigate('AskRithmo'), [navigation]);
  const goToDoctorReport = useCallback(() => navigation.navigate('DoctorHealthReport'), [navigation]);
  const goToDeepInsights = useCallback(() => navigation.navigate('DeepInsights'), [navigation]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([refetchInsights(), refetchProgress()]);
    setRefreshing(false);
  }, [refetchInsights, refetchProgress]);

  // A real, already-fetched grounding line for the AI cards below — same
  // construction as InsightsHomeScreen's aiEvidenceNote, never a new fetch.
  const loggedDayCount: number | null = progress?.evidence?.total_logs ?? null;
  const observedCycles: number | null = progress?.evidence.usable_cycles ?? null;
  const evidenceNote =
    loggedDayCount !== null && observedCycles !== null
      ? `بر اساس ${toFa(loggedDayCount)} روز ثبت و ${toFa(observedCycles)} چرخه‌ی کامل`
      : null;

  const topPattern = (insightData?.insights ?? []).find((i) => i.kind !== 'coverage') ?? null;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['left', 'right', 'bottom']}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: screen.gutter, paddingTop: screen.top, paddingBottom: screen.bottom }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* ── Hero ───────────────────────────────────────────────────── */}
        <View style={{ marginTop: spacing[3], marginBottom: spacing[5] }}>
          <Text style={[styles.heroTitle, { color: colors.textPrimary, fontSize: typography.xl }]}>
            پنل هوش سلامت شخصی
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: typography.xs, marginTop: 4, lineHeight: 18 }}>
            چه چیزی تغییر کرده، چه الگویی شناخته شده، و چه چیزی احتمالاً پیش رو داری — همه از داده‌های خودت.
          </Text>
        </View>

        {/* ── Today ──────────────────────────────────────────────────── */}
        <View style={{ marginBottom: spacing[4] }}>
          <DailyReflectionCard />
        </View>

        {/* ── What changed (Premium) — same wrapping convention already
               used for this exact card in InsightsHomeScreen.tsx ─────── */}
        <View style={{ marginBottom: spacing[4] }}>
          <PremiumGate featureName="این چرخه چه فرقی داشت؟">
            <CycleChangeCard evidenceNote={evidenceNote} />
          </PremiumGate>
        </View>

        {/* ── Strongest pattern ──────────────────────────────────────── */}
        {insightsLoading ? (
          <View style={{ marginBottom: spacing[4] }}>
            <StoryCardSkeleton />
          </View>
        ) : topPattern ? (
          <View style={{ marginBottom: spacing[4] }}>
            <TodayInsightCard
              insight={topPattern}
              learningMode={insightData?.learning_mode ?? false}
              onOpenDetail={goToInsightDetail}
              onSeeAll={goToAllPatterns}
            />
          </View>
        ) : null}

        {/* ── Forecast ───────────────────────────────────────────────── */}
        <View style={{ marginBottom: spacing[4] }}>
          <ForecastCard />
        </View>

        {/* ── Fertile window (P1.1, Premium) — wrapped rather than left
               bare: its query stays fully disabled for a free user, so
               without this the card's own isLoading||!data check would
               show a stuck loading skeleton forever instead of a gate. */}
        <View style={{ marginBottom: spacing[4] }}>
          <PremiumGate featureName="بازه‌ی باروری">
            <FertileWindowCard />
          </PremiumGate>
        </View>

        {/* ── Health change + pain/PMS (P1.2, Premium) — same reason as
               Fertile Window above. */}
        <View style={{ marginBottom: spacing[4] }}>
          <PremiumGate featureName="تغییرات سلامتی و الگوی درد">
            <HealthChangeCard />
          </PremiumGate>
        </View>

        {/* ── Monthly review ─────────────────────────────────────────── */}
        <View style={{ marginBottom: spacing[4] }}>
          <MonthlyReviewCard />
        </View>

        {/* ── Ask Rithmo CTA (P0.7) ──────────────────────────────────── */}
        <TouchableOpacity
          onPress={goToAskRithmo}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="از داده‌های من بپرس"
          style={{ marginBottom: spacing[4] }}
        >
          <Card elevated={false} rounded="2xl" style={[styles.ctaCard, { padding: spacing[4] }]}>
            <View style={styles.ctaHeaderRow}>
              <Text style={{ color: colors.textPrimary, fontSize: typography.lg, fontWeight: '700' }}>
                از داده‌های من بپرس
              </Text>
              <Icon name="arrow-left" size={18} color={colors.primary} />
            </View>
            <Text style={{ color: colors.textSecondary, fontSize: typography.sm, marginTop: spacing[1] }}>
              سؤالت را درباره چرخه، علائم و الگوهای ثبت‌شده‌ات بپرس.
            </Text>
          </Card>
        </TouchableOpacity>

        {/* ── Doctor Health Report CTA (P0.8) ─────────────────────────── */}
        <TouchableOpacity
          onPress={goToDoctorReport}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="گزارش سلامت من"
          style={{ marginBottom: spacing[5] }}
        >
          <Card elevated={false} rounded="2xl" style={[styles.ctaCard, { padding: spacing[4] }]}>
            <View style={styles.ctaHeaderRow}>
              <Text style={{ color: colors.textPrimary, fontSize: typography.lg, fontWeight: '700' }}>
                گزارش سلامت من
              </Text>
              <Icon name="arrow-left" size={18} color={colors.primary} />
            </View>
            <Text style={{ color: colors.textSecondary, fontSize: typography.sm, marginTop: spacing[1] }}>
              خلاصه‌ای برای مطرح‌کردن با پزشک، آماده از داده‌های ثبت‌شده‌ات.
            </Text>
          </Card>
        </TouchableOpacity>

        {/* ── Deeper intelligence CTA ────────────────────────────────── */}
        <TouchableOpacity onPress={goToDeepInsights} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="مشاهده بینش عمیق">
          <Card
            elevated={false}
            rounded="2xl"
            style={[
              styles.ctaCard,
              { backgroundColor: colors.premiumBg, borderColor: colors.premiumBorder, padding: spacing[4] },
            ]}
          >
            <View style={styles.ctaHeaderRow}>
              <Text style={{ color: colors.textPrimary, fontSize: typography.lg, fontWeight: '700' }}>
                بینش عمیق‌تر
              </Text>
              <Icon name="arrow-left" size={18} color={colors.premium} />
            </View>
            <Text style={{ color: colors.textSecondary, fontSize: typography.sm, marginTop: spacing[1] }}>
              همبستگی خواب، استرس، خلق و انرژی‌ات را ببین — محاسبه‌شده از داده‌های خودت.
            </Text>
          </Card>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  heroTitle: { fontWeight: '800' },
  ctaCard: { borderWidth: 1 },
  ctaHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
