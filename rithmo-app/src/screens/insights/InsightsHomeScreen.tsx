/**
 * InsightsHomeScreen — الگوی بدن شما
 *
 * The pattern hub. Everything shown here is computed from the user's real
 * logs and periods — no AI, no population averages:
 *
 *   1. Hero — data maturity (logs, OBSERVED cycles, cycle length)
 *   2. Insight cards — the server engine's patterns, each with its evidence
 *   3. 30-day averages — the user's own numbers
 *   4. Cycle regularity — from the backend cycle analysis
 *   5. Deep Insights CTA — premium (correlations, week comparison)
 *
 * The patterns come from `/api/intelligence/insights/`, not from a local
 * engine. Deriving them on the device meant the phone and the server could
 * reach different conclusions about the same user, and it made every rule
 * unavailable to notifications and to the partner experience.
 *
 * Never fabricates insights: in Learning Mode the engine returns a coverage
 * statement about the data, and that is what is shown.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@hooks/useTheme';
import { screen } from '@theme/spacing';
import { usePeriods, useCycleAnalysis } from '@hooks/queries/usePeriods';
import { useWellnessAnalytics } from '@hooks/queries/useWellness';
import { Card, Badge, Reveal } from '@components/ui';
import { toFa } from '@utils/persian';
import { useInsights, useProgress } from '@hooks/queries/useIntelligence';
import { track } from '@analytics';
import { TodayInsightCard } from '../home/components/TodayInsightCard';
import type { CycleAnalysis } from '@types/period.types';
import type { InsightsScreenProps } from '@navigation/types';

type Props = InsightsScreenProps<'InsightsHome'>;

// ─────────────────────────────────────────────────────────────────────────────
// ProgressBar
// ─────────────────────────────────────────────────────────────────────────────
function ProgressBar({
  value,
  max,
  color,
  height = 4,
}: {
  value: number;
  max: number;
  color: string;
  height?: number;
}) {
  const { colors } = useTheme();
  const pct = Math.min(1, Math.max(0, value / max));
  return (
    <View
      style={[
        styles.progressTrack,
        { height, borderRadius: height / 2, backgroundColor: colors.border },
      ]}
    >
      <View
        style={[
          styles.progressFill,
          {
            width: `${pct * 100}%`,
            borderRadius: height / 2,
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StatTile
// ─────────────────────────────────────────────────────────────────────────────
function StatTile({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: string;
}) {
  const { colors, typography, borderRadius, spacing } = useTheme();
  return (
    <View
      style={[
        styles.statTile,
        {
          borderRadius: borderRadius.md,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          padding: spacing[3],
        },
      ]}
    >
      <View style={[styles.statTileAccentDot, { backgroundColor: accent }]} />
      <Text style={[styles.statTileValue, { color: colors.textPrimary, fontSize: typography.xl }]}>
        {value}
        {sub ? (
          <Text style={[styles.statTileSub, { color: colors.textTertiary, fontSize: typography.xs }]}>
            {' '}{sub}
          </Text>
        ) : null}
      </Text>
      <Text style={[styles.statTileLabel, { color: colors.textSecondary, fontSize: typography.xs }]}>
        {label}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AvgMetricRow
// ─────────────────────────────────────────────────────────────────────────────
function AvgMetricRow({
  label,
  value,
  max,
  color,
  iconName,
}: {
  label: string;
  value: number | null;
  max: number;
  color: string;
  iconName: string;
}) {
  const { colors, typography, spacing } = useTheme();
  if (value === null) { return null; }

  return (
    <View style={[styles.avgRow, { marginBottom: spacing[3] }]}>
      <View style={styles.avgRowHeader}>
        <View style={styles.avgRowLeft}>
          <View style={[styles.metricIconWrap, { backgroundColor: color + '15' }]} >
            <Icon name={iconName} size={14} color={color} />
          </View>
          <Text style={[styles.avgRowLabelText, { color: colors.textPrimary, fontSize: typography.sm }]}>
            {label}
          </Text>
        </View>
        <Text style={[styles.avgRowValue, { color: colors.textPrimary, fontSize: typography.sm }]}>
          {toFa(value.toFixed(1))}
          <Text style={[styles.avgRowValueMax, { color: colors.textTertiary, fontSize: typography.xs }]}>
            /{toFa(max)}
          </Text>
        </Text>
      </View>
      <ProgressBar value={value} max={max} color={color} />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────────────────────────────────────
export default function InsightsHomeScreen() {
  const { colors, spacing, typography } = useTheme();
  const navigation = useNavigation<Props['navigation']>();

  const [refreshing, setRefreshing] = useState(false);

  const { data: periodsList, refetch: refetchPeriods } = usePeriods();
  const { data: analytics,   refetch: refetchAnalytics } = useWellnessAnalytics(30);
  const { data: cycleData,   refetch: refetchCycle }   = useCycleAnalysis();
  const { data: insightData, refetch: refetchInsights } = useInsights();
  const { data: progress,    refetch: refetchProgress } = useProgress();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([
      refetchPeriods(),
      refetchAnalytics(),
      refetchCycle(),
      refetchInsights(),
      refetchProgress(),
    ]);
    setRefreshing(false);
  }, [
    refetchPeriods, refetchAnalytics, refetchCycle,
    refetchInsights, refetchProgress,
  ]);

  const periodsArr: any[] = Array.isArray(periodsList) ? (periodsList as any[]) : [];
  const periodCount = periodsArr.length;
  const avg = (analytics as Record<string, number | null> | undefined)?.averages as
    Record<string, number | null> | undefined;

  // average_cycle_length is the current backend key; average_cycle is
  // legacy (never sent by the current API) — keep as fallback only.
  const cd = cycleData as CycleAnalysis | undefined;
  const avgCycle = cd?.average_cycle_length ?? cd?.average_cycle ?? null;
  const regScore = cd?.regularity_score;

  const insights = insightData?.insights ?? [];
  const learningMode = insightData?.learning_mode ?? false;

  // CANONICAL logged-day count.
  //
  // This used to be `logsArr.length` from a full `/api/wellness/` fetch, and
  // rendered «۹ الگوی واقعی از ۰ روز ثبت» — nine patterns from zero days —
  // for an account with 84 logs, on the one screen whose entire job is to
  // prove the product does not claim what it cannot support.
  //
  // `/api/intelligence/progress/` returns `evidence.total_logs`: the exact
  // count the insight engine itself used to derive these patterns. Reading
  // it here makes the two numbers structurally incapable of diverging, and
  // removes an unbounded 46 KB list fetch from this screen.
  //
  // `null` (still loading / unavailable) is deliberately distinct from 0 so
  // the UI can stay silent instead of asserting "0 days".
  const loggedDayCount: number | null = progress?.evidence?.total_logs ?? null;

  useEffect(() => {
    if (!insightData) { return; }
    track('pattern_viewed', {
      insight_count: insightData.insights.length,
      maturity: progress?.maturity,
    });
  }, [insightData, progress?.maturity]);
  // Patterns are counted across OBSERVED cycles (start-to-start gaps the
  // user actually logged), never across predicted ones — a predicted
  // boundary is not a second data point.
  const observedCycles = progress?.evidence.usable_cycles ?? null;

  return (
    <SafeAreaView style={[styles.flex1, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: screen.gutter,
            paddingTop: screen.top,
            paddingBottom: screen.bottomTab,
          },
        ]}
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
        {/* ══ HERO HEADER ══════════════════════════════════════════════ */}
        <View style={[styles.heroSection, { paddingTop: spacing[4], marginBottom: spacing[6] }]}>
          <Text style={[styles.overLine, { color: colors.textTertiary, fontSize: typography.xs }]}>
            ریتمو · الگوهای شخصی
          </Text>
          <Text style={[styles.heroTitle, { color: colors.textPrimary, fontSize: typography['2xl'] }]}>
            الگوی بدن شما
          </Text>
          <Text style={[styles.heroSub, { color: colors.textSecondary, fontSize: typography.sm }]}>
            محاسبه‌شده از داده‌های واقعی خودت — نه میانگین جمعیت
          </Text>

          <View style={[styles.statRow, { marginTop: spacing[4], gap: spacing[2] }]}>
            <StatTile
              label="روز ثبت"
              value={loggedDayCount === null ? '—' : toFa(loggedDayCount)}
              accent={colors.follicular}
            />
            <StatTile
              label="چرخه کامل"
              value={toFa(observedCycles ?? Math.max(periodCount - 1, 0))}
              accent={colors.menstrual}
            />
            {avgCycle != null && (
              <StatTile label="طول چرخه" value={toFa(Math.round(avgCycle))} sub="روز" accent={colors.luteal} />
            )}
          </View>
        </View>

        {/* ══ INSIGHTS ═════════════════════════════════════════════════ */}
        <View style={[styles.section, { marginBottom: spacing[6] }]}>
          <View style={[styles.sectionHeading, { marginBottom: spacing[3] }]}>
            <Text style={[styles.sectionHeadingTitle, { color: colors.textPrimary, fontSize: typography.lg }]}>
              الگوهای بدنت
            </Text>
            <Text style={[styles.sectionHeadingSub, { color: colors.textSecondary, fontSize: typography.xs }]}>
              {learningMode
                ? 'هنوز در حال شناختن الگوی توام'
                : insights.length === 0
                  ? 'فعلاً الگوی قابل‌اتکایی پیدا نشده'
                  : loggedDayCount === null
                    // Never assert a day count we do not have. Silence is
                    // correct; "0 روز ثبت" is a false claim.
                    ? `${toFa(insights.length)} الگوی واقعی از ثبت‌های تو`
                    : `${toFa(insights.length)} الگوی واقعی از ${toFa(loggedDayCount)} روز ثبت`}
            </Text>
          </View>
          <View style={{ gap: 10 }}>
            {insights.length > 0 ? (
              insights.map((ins, i) => (
                <Reveal key={ins.key} delay={i * 60}>
                  {/* Same card as Home, so the evidence behind a claim is
                      always one tap away wherever the claim appears. */}
                  <TodayInsightCard insight={ins} learningMode={learningMode} />
                </Reveal>
              ))
            ) : (
              <Card elevated={false} style={{ padding: spacing[4] }}>
                <Text style={{ color: colors.textSecondary, fontSize: typography.bodySmall, lineHeight: 20 }}>
                  هنوز الگوی قابل‌اعتمادی پیدا نشده. با ثبت روزانه — و تکمیل چند چرخه — الگوهای شخصی‌ات اینجا ظاهر می‌شوند.
                </Text>
              </Card>
            )}
          </View>
        </View>

        {/* ══ 30-DAY AVERAGES ═══════════════════════════════════════════ */}
        {avg && (loggedDayCount ?? 0) >= 5 && (
          <View style={[styles.section, { marginBottom: spacing[6] }]}>
            <View style={[styles.sectionHeading, { marginBottom: spacing[3] }]}>
              <Text style={[styles.sectionHeadingTitle, { color: colors.textPrimary, fontSize: typography.lg }]}>
                میانگین ۳۰ روز
              </Text>
              <Text style={[styles.sectionHeadingSub, { color: colors.textSecondary, fontSize: typography.xs }]}>
                اعداد شخصی تو — نه میانگین جمعیت
              </Text>
            </View>

            <Card elevated={false} style={{ padding: spacing[4] }}>
              <AvgMetricRow label="خواب"   value={avg.sleep_hours  ?? null} max={10} color={colors.primary}         iconName="weather-night" />
              <AvgMetricRow label="خلق"    value={avg.mood_level   ?? null} max={5}  color={colors.luteal}          iconName="emoticon-outline" />
              <AvgMetricRow label="انرژی"  value={avg.energy_level ?? null} max={10} color={colors.ovulation}       iconName="lightning-bolt-outline" />
              <AvgMetricRow label="درد"    value={avg.pain_level   ?? null} max={10} color={colors.menstrual}       iconName="pill" />
              <AvgMetricRow label="استرس"  value={avg.stress_level ?? null} max={10} color={colors.follicular}      iconName="meditation" />
            </Card>
          </View>
        )}

        {/* ══ CYCLE REGULARITY ══════════════════════════════════════════ */}
        {periodCount >= 2 && (
          <View style={[styles.section, { marginBottom: spacing[6] }]}>
            <View style={[styles.sectionHeading, { marginBottom: spacing[3] }]}>
              <Text style={[styles.sectionHeadingTitle, { color: colors.textPrimary, fontSize: typography.lg }]}>
                انتظام چرخه
              </Text>
              <Text style={[styles.sectionHeadingSub, { color: colors.textSecondary, fontSize: typography.xs }]}>
                بر اساس چرخه‌های ثبت‌شده
              </Text>
            </View>

            <View style={[styles.tileRow, { gap: spacing[3] }]}>
              {/* Avg length tile */}
              <Card elevated={false} style={[styles.regularityTile, { padding: spacing[4] }]}>
                <Text style={[styles.overLine, { color: colors.luteal, fontSize: typography.xs, marginBottom: spacing[1] }]}>
                  متوسط
                </Text>
                <Text style={[styles.regularityValue, { color: colors.textPrimary, fontSize: typography['2xl'] }]}>
                  {avgCycle ? toFa(Math.round(avgCycle)) : '—'}
                </Text>
                <Text style={[styles.regularityLabel, { color: colors.textSecondary, fontSize: typography.xs }]}>
                  روز / چرخه
                </Text>
              </Card>

              {/* Regularity score tile */}
              <Card elevated={false} style={[styles.regularityTile, { padding: spacing[4] }]}>
                <Text style={[styles.overLine, { color: colors.follicular, fontSize: typography.xs, marginBottom: spacing[1] }]}>
                  انتظام
                </Text>
                <Text style={[styles.regularityValue, { color: colors.textPrimary, fontSize: typography['2xl'] }]}>
                  {regScore != null ? toFa(Math.round(regScore * 100)) : '—'}
                  {regScore != null && (
                    <Text style={[styles.regularityPct, { color: colors.textSecondary, fontSize: typography.base }]}>
                      ٪
                    </Text>
                  )}
                </Text>
                <Text style={[styles.regularityLabel, { color: colors.textSecondary, fontSize: typography.xs }]}>
                  امتیاز انتظام
                </Text>
                {regScore != null && (
                  <View style={{ marginTop: spacing[2] }}>
                    <ProgressBar
                      value={regScore}
                      max={1}
                      color={
                        regScore > 0.75
                          ? colors.success
                          : regScore > 0.5
                          ? colors.warning
                          : colors.error
                      }
                      height={4}
                    />
                  </View>
                )}
              </Card>
            </View>
          </View>
        )}

        {/* ══ DEEP INSIGHTS CTA (premium, honest copy) ══════════════════ */}
        <TouchableOpacity
          onPress={() => navigation.navigate('DeepInsights')}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="مشاهده بینش عمیق"
        >
          <Card
            elevated={false}
            style={[
              styles.ctaCard,
              {
                backgroundColor: colors.premiumBg,
                borderColor: colors.premiumBorder,
                padding: spacing[4],
              },
            ]}
          >
            <View style={styles.ctaHeaderRow}>
              <Badge label="✦ ویژه پریمیوم" variant="primary" />
              <Icon name="arrow-left" size={18} color={colors.premium} />
            </View>

            <Text style={[styles.ctaTitle, { color: colors.textPrimary, fontSize: typography.lg, marginTop: spacing[2] }]}>
              بینش عمیق
            </Text>
            <Text style={[styles.ctaBody, { color: colors.textSecondary, fontSize: typography.sm, marginTop: spacing[1] }]}>
              ببین خواب، استرس، خلق و انرژی‌ات چطور با هم در ارتباط‌اند — محاسبه‌شده از داده‌های خودت.
            </Text>

            <View style={[styles.ctaFooter, { marginTop: spacing[3] }]}>
              <Text style={[styles.ctaFooterLabel, { color: colors.premium, fontSize: typography.sm }]}>
                مشاهده تحلیل عمیق
              </Text>
            </View>
          </Card>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  flex1: { flex: 1 },
  scrollContent: {},

  overLine: {
    fontWeight: '700',
    marginBottom: 4,
  },

  progressTrack: {
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },

  statTile: {
    flex: 1,
    borderWidth: 1,
  },
  statTileAccentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginBottom: 6,
  },
  statTileValue: {
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  statTileLabel: {
    fontWeight: '500',
    marginTop: 2,
  },
  statTileSub: {
    fontWeight: '500',
  },

  avgRow: {},
  avgRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  avgRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metricIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avgRowLabelText: {
    fontWeight: '600',
  },
  avgRowValue: {
    fontWeight: '700',
  },
  avgRowValueMax: {
    fontWeight: '500',
  },

  sectionHeading: {},
  sectionHeadingTitle: {
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  sectionHeadingSub: {
    marginTop: 2,
    lineHeight: 18,
  },

  heroSection: {},
  heroTitle: {
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  heroSub: {
    lineHeight: 20,
  },
  statRow: {
    flexDirection: 'row',
  },

  patternCardWrap: {},
  section: {},

  tileRow: {
    flexDirection: 'row',
  },
  regularityTile: {
    flex: 1,
  },
  regularityValue: {
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  regularityPct: {
    fontWeight: '600',
  },
  regularityLabel: {
    fontWeight: '500',
    marginTop: 2,
  },

  ctaCard: {
    borderWidth: 1,
  },
  ctaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ctaTitle: {
    fontWeight: '700',
  },
  ctaBody: {
    lineHeight: 20,
  },
  ctaFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ctaFooterLabel: {
    fontWeight: '700',
  },
});
