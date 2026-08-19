/**
 * InsightsHomeScreen — الگوهای من
 *
 * Rhythmo Design System Redesign.
 * Calm, modern, editorial, typography-first intelligence hub.
 * Data-state aware — never fabricates insights.
 */
import React, { useCallback } from 'react';
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
import { usePeriods, useCycleAnalysis } from '@hooks/queries/usePeriods';
import { useWellnessLogs, useWellnessAnalytics } from '@hooks/queries/useWellness';
import { deriveDataState, PatternCard } from '../home/components/PatternCard';
import { Card, Badge } from '@components/ui';
import type { WellnessLog } from '@types/wellness.types';
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
// SectionHeading
// ─────────────────────────────────────────────────────────────────────────────
function SectionHeading({ title, sub }: { title: string; sub?: string }) {
  const { colors, typography, spacing } = useTheme();
  return (
    <View style={[styles.sectionHeading, { marginBottom: spacing[3] }]}>
      <Text
        style={[
          styles.sectionHeadingTitle,
          { color: colors.textPrimary, fontSize: typography.lg },
        ]}
      >
        {title}
      </Text>
      {sub ? (
        <Text
          style={[
            styles.sectionHeadingSub,
            { color: colors.textSecondary, fontSize: typography.xs },
          ]}
        >
          {sub}
        </Text>
      ) : null}
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
          <View style={[styles.metricIconWrap, { backgroundColor: color + '15' }]}>
            <Icon name={iconName} size={14} color={color} />
          </View>
          <Text style={[styles.avgRowLabelText, { color: colors.textPrimary, fontSize: typography.sm }]}>
            {label}
          </Text>
        </View>
        <Text style={[styles.avgRowValue, { color: colors.textPrimary, fontSize: typography.sm }]}>
          {value.toFixed(1)}
          <Text style={[styles.avgRowValueMax, { color: colors.textTertiary, fontSize: typography.xs }]}>
            /{max}
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

  const [refreshing, setRefreshing] = React.useState(false);

  const { data: periodsList, refetch: refetchPeriods } = usePeriods();
  const { data: allLogs,     refetch: refetchLogs }    = useWellnessLogs();
  const { data: analytics,   refetch: refetchAnalytics } = useWellnessAnalytics(30);
  const { data: cycleData,   refetch: refetchCycle }   = useCycleAnalysis();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([
      refetchPeriods(),
      refetchLogs(),
      refetchAnalytics(),
      refetchCycle(),
    ]);
    setRefreshing(false);
  }, [refetchPeriods, refetchLogs, refetchAnalytics, refetchCycle]);

  const periodCount = Array.isArray(periodsList) ? (periodsList as unknown[]).length : 0;
  const logCount    = Array.isArray(allLogs)     ? (allLogs     as unknown[]).length : 0;
  const dataState   = deriveDataState(periodCount, logCount);
  const avg         = (analytics as Record<string, number | null> | undefined)?.averages as
    Record<string, number | null> | undefined;

  // average_cycle_length is the current backend key; average_cycle is
  // legacy (never sent by the current API) — keep as fallback only.
  const cd = cycleData as CycleAnalysis | undefined;
  const avgCycle = cd?.average_cycle_length ?? cd?.average_cycle ?? null;
  const regScore = cd?.regularity_score;

  return (
    <SafeAreaView style={[styles.flex1, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: spacing[4], paddingBottom: spacing[20] }]}
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
          <Text
            style={[
              styles.overLine,
              { color: colors.textTertiary, fontSize: typography.xs },
            ]}
          >
            ریتمو · الگوهای شخصی
          </Text>
          <Text
            style={[
              styles.heroTitle,
              { color: colors.textPrimary, fontSize: typography['2xl'] },
            ]}
          >
            الگوهای من
          </Text>
          <Text style={[styles.heroSub, { color: colors.textSecondary, fontSize: typography.sm }]}>
            داده‌های واقعی تو — نه میانگین جمعیت
          </Text>

          <View style={[styles.statRow, { marginTop: spacing[4], gap: spacing[2] }]}>
            <StatTile label="روز ثبت"   value={String(logCount)}    accent={colors.follicular} />
            <StatTile label="سیکل کامل" value={String(periodCount)} accent={colors.menstrual} />
            {avgCycle != null && (
              <StatTile label="طول سیکل" value={String(Math.round(avgCycle))} sub="روز" accent={colors.luteal} />
            )}
          </View>
        </View>

        {/* ══ PATTERN STATUS CARD ══════════════════════════════════════ */}
        <View style={[styles.patternCardWrap, { marginBottom: spacing[6] }]}>
          <PatternCard
            dataState={dataState}
            logCount={logCount}
            periodCount={periodCount}
            logs={(Array.isArray(allLogs) ? allLogs : []) as WellnessLog[]}
            cycleAnalysis={cycleData as CycleAnalysis | null}
            onInsightsPress={() => {}}
          />
        </View>

        {/* ══ 30-DAY AVERAGES ═══════════════════════════════════════════ */}
        {avg && logCount >= 5 && (
          <View style={[styles.section, { marginBottom: spacing[6] }]}>
            <SectionHeading
              title="میانگین ۳۰ روز"
              sub="اعداد شخصی تو — نه میانگین جمعیت"
            />

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
            <SectionHeading title="انتظام سیکل" sub="بر اساس سیکل‌های ثبت‌شده" />

            <View style={[styles.tileRow, { gap: spacing[3] }]}>
              {/* Avg length tile */}
              <Card elevated={false} style={[styles.regularityTile, { padding: spacing[4] }]}>
                <Text style={[styles.overLine, { color: colors.luteal, fontSize: typography.xs, marginBottom: spacing[1] }]}>
                  متوسط
                </Text>
                <Text style={[styles.regularityValue, { color: colors.textPrimary, fontSize: typography['2xl'] }]}>
                  {avgCycle ? Math.round(avgCycle) : '—'}
                </Text>
                <Text style={[styles.regularityLabel, { color: colors.textSecondary, fontSize: typography.xs }]}>
                  روز / سیکل
                </Text>
              </Card>

              {/* Regularity score tile */}
              <Card elevated={false} style={[styles.regularityTile, { padding: spacing[4] }]}>
                <Text style={[styles.overLine, { color: colors.follicular, fontSize: typography.xs, marginBottom: spacing[1] }]}>
                  انتظام
                </Text>
                <Text style={[styles.regularityValue, { color: colors.textPrimary, fontSize: typography['2xl'] }]}>
                  {regScore != null ? `${Math.round(regScore * 100)}` : '—'}
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

        {/* ══ DEEP INSIGHTS CTA ═════════════════════════════════════════ */}
        <TouchableOpacity
          onPress={() => navigation.navigate('DeepInsights')}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Open Deep Insights"
        >
          <Card
            elevated={false}
            style={[
              styles.ctaCard,
              {
                backgroundColor: colors.surfaceSecondary,
                borderColor: colors.primary + '30',
                padding: spacing[4],
              },
            ]}
          >
            <View style={styles.ctaHeaderRow}>
              <Badge label="✦ Premium" variant="primary" />
              <Icon name="arrow-left" size={18} color={colors.primary} />
            </View>

            <Text style={[styles.ctaTitle, { color: colors.textPrimary, fontSize: typography.lg, marginTop: spacing[2] }]}>
              Deep Insights
            </Text>
            <Text style={[styles.ctaBody, { color: colors.textSecondary, fontSize: typography.sm, marginTop: spacing[1] }]}>
              ببین خواب، استرس، خلق و انرژی‌ات چطور با هم در ارتباط‌اند — بر اساس داده‌های خودت.
            </Text>

            <View style={[styles.ctaFooter, { marginTop: spacing[3] }]}>
              <Text style={[styles.ctaFooterLabel, { color: colors.primary, fontSize: typography.sm }]}>
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
    letterSpacing: 0.6,
    textTransform: 'uppercase',
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
