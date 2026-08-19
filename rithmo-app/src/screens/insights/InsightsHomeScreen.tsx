/**
 * InsightsHomeScreen — الگوهای من
 *
 * Premium landing-system redesign.
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
import type { WellnessLog } from '@types/wellness.types';
import type { CycleAnalysis } from '@types/period.types';
import type { InsightsScreenProps } from '@navigation/types';

type Props = InsightsScreenProps<'InsightsHome'>;

// ─────────────────────────────────────────────────────────────────────────────
// MetricDot
// ─────────────────────────────────────────────────────────────────────────────
function MetricDot({ color }: { color: string }) {
  return <View style={[s.metricDot, { backgroundColor: color }]} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// ProgressBar
// ─────────────────────────────────────────────────────────────────────────────
function ProgressBar({
  value,
  max,
  color,
  height = 3,
}: {
  value: number;
  max: number;
  color: string;
  height?: number;
}) {
  const { colors } = useTheme();
  const pct = Math.min(1, value / max);
  return (
    <View
      style={[
        s.progressTrack,
        { height, borderRadius: height, backgroundColor: colors.border },
      ]}
    >
      <View
        style={[
          s.progressFill,
          {
            width: `${pct * 100}%`,
            borderRadius: height,
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Eyebrow
// ─────────────────────────────────────────────────────────────────────────────
function Eyebrow({ label, color }: { label: string; color?: string }) {
  const { colors, typography } = useTheme();
  return (
    <Text
      style={[
        s.eyebrow,
        {
          color: color ?? colors.textTertiary,
          fontSize: typography.xs,
        },
      ]}
    >
      {label}
    </Text>
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
        s.statTile,
        {
          borderRadius: borderRadius.md,
          borderColor: colors.border,
          padding: spacing[4],
          backgroundColor: colors.surface,
        },
      ]}
    >
      <View style={[s.statTileAccentBar, { backgroundColor: accent, marginBottom: spacing[3] }]} />
      <Text style={[s.statTileValue, { color: colors.textPrimary, fontSize: typography['2xl'] }]}>
        {value}
      </Text>
      <Text style={[s.statTileLabel, { color: colors.textSecondary, fontSize: typography.xs }]}>
        {label}
      </Text>
      {sub && (
        <Text style={[s.statTileSub, { color: colors.textTertiary }]}>{sub}</Text>
      )}
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
  emoji,
}: {
  label: string;
  value: number | null;
  max: number;
  color: string;
  emoji: string;
}) {
  const { colors, typography, spacing } = useTheme();
  if (value === null) { return null; }

  return (
    <View style={[s.avgRow, { marginBottom: spacing[4] }]}>
      <View style={s.avgRowHeader}>
        <View style={s.avgRowLeft}>
          <MetricDot color={color} />
          <Text style={[s.avgRowLabelText, { color: colors.textSecondary, fontSize: typography.sm }]}>
            {emoji}  {label}
          </Text>
        </View>
        <Text style={[s.avgRowValue, { color: colors.textPrimary, fontSize: typography.sm }]}>
          {value.toFixed(1)}
          <Text style={[s.avgRowValueMax, { color: colors.textTertiary }]}>
            /{max}
          </Text>
        </Text>
      </View>
      <ProgressBar value={value} max={max} color={color} />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SectionHeading
// ─────────────────────────────────────────────────────────────────────────────
function SectionHeading({ title, sub }: { title: string; sub?: string }) {
  const { colors, typography, spacing } = useTheme();
  return (
    <View style={[s.sectionHeading, { marginBottom: spacing[4] }]}>
      <Text
        style={[
          s.sectionHeadingTitle,
          { color: colors.textPrimary, fontSize: typography.lg },
        ]}
      >
        {title}
      </Text>
      {sub && (
        <Text
          style={[
            s.sectionHeadingSub,
            { color: colors.textSecondary, fontSize: typography.sm },
          ]}
        >
          {sub}
        </Text>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────────────────────────────────────
export default function InsightsHomeScreen() {
  const { colors, spacing, typography, borderRadius } = useTheme();
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

  const avgCycle = (cycleData as CycleAnalysis | undefined)?.average_cycle;
  const regScore = (cycleData as CycleAnalysis | undefined)?.regularity_score;

  return (
    <SafeAreaView style={[s.flex1, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={[s.scrollContent, { paddingHorizontal: spacing[5], paddingBottom: spacing[20] }]}
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
        <View style={[s.heroSection, { paddingTop: spacing[6], marginBottom: spacing[8] }]}>
          <Eyebrow label="ریتمو · الگوهای شخصی" />
          <Text
            style={[
              s.heroTitle,
              { color: colors.textPrimary, fontSize: typography['2xl'] },
            ]}
          >
            الگوهای من
          </Text>
          <Text style={[s.heroSub, { color: colors.textSecondary, fontSize: typography.sm }]}>
            داده‌های واقعی تو — نه میانگین جمعیت
          </Text>

          <View style={[s.statRow, { marginTop: spacing[5], gap: spacing[3] }]}>
            <StatTile label="روز ثبت"   value={String(logCount)}    accent={colors.follicular} />
            <StatTile label="سیکل کامل" value={String(periodCount)} accent={colors.menstrual} />
            {avgCycle != null && (
              <StatTile label="طول سیکل" value={String(Math.round(avgCycle))} sub="روز" accent={colors.luteal} />
            )}
          </View>
        </View>

        {/* ══ PATTERN STATUS CARD ══════════════════════════════════════ */}
        <View style={[s.patternCardWrap, { marginBottom: spacing[8] }]}>
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
          <View style={[s.section, { marginBottom: spacing[8] }]}>
            <SectionHeading
              title="میانگین ۳۰ روز"
              sub="اعداد شخصی تو — نه میانگین جمعیت"
            />

            <View
              style={[
                s.avgCard,
                {
                  backgroundColor: colors.surface,
                  borderRadius: borderRadius.md,
                  borderColor: colors.border,
                  padding: spacing[5],
                },
              ]}
            >
              {/* Rainbow stripe */}
              <View style={[s.rainbowStripe, { marginBottom: spacing[5] }]}>
                {[colors.primary, colors.luteal, colors.ovulationColor, colors.menstrual, colors.follicular].map(
                  (c, i) => (
                    <View key={i} style={[s.rainbowSegment, { backgroundColor: c }]} />
                  ),
                )}
              </View>

              <AvgMetricRow label="خواب"   value={avg.sleep_hours  ?? null} max={10} color={colors.primary}         emoji="😴" />
              <AvgMetricRow label="خلق"    value={avg.mood_level   ?? null} max={5}  color={colors.luteal}          emoji="💆" />
              <AvgMetricRow label="انرژی"  value={avg.energy_level ?? null} max={10} color={colors.ovulationColor}  emoji="⚡" />
              <AvgMetricRow label="درد"    value={avg.pain_level   ?? null} max={10} color={colors.menstrual}       emoji="💊" />
              <AvgMetricRow label="استرس"  value={avg.stress_level ?? null} max={10} color={colors.follicular}      emoji="🧘" />
            </View>
          </View>
        )}

        {/* ══ CYCLE REGULARITY ══════════════════════════════════════════ */}
        {periodCount >= 2 && (
          <View style={[s.section, { marginBottom: spacing[8] }]}>
            <SectionHeading title="انتظام سیکل" sub="بر اساس سیکل‌های ثبت‌شده" />

            <View style={[s.tileRow, { gap: spacing[3] }]}>
              {/* Avg length tile */}
              <View
                style={[
                  s.regularityTile,
                  {
                    backgroundColor: colors.surface,
                    borderRadius: borderRadius.md,
                    borderColor: colors.border,
                    padding: spacing[4],
                  },
                ]}
              >
                <Eyebrow label="متوسط" color={colors.luteal} />
                <Text style={[s.regularityValue, { color: colors.textPrimary, fontSize: typography['2xl'] }]}>
                  {avgCycle ? Math.round(avgCycle) : '—'}
                </Text>
                <Text style={[s.regularityLabel, { color: colors.textSecondary, fontSize: typography.xs }]}>
                  روز / سیکل
                </Text>
              </View>

              {/* Regularity score tile */}
              <View
                style={[
                  s.regularityTile,
                  {
                    backgroundColor: colors.surface,
                    borderRadius: borderRadius.md,
                    borderColor: colors.border,
                    padding: spacing[4],
                  },
                ]}
              >
                <Eyebrow label="انتظام" color={colors.follicular} />
                <Text style={[s.regularityValue, { color: colors.textPrimary, fontSize: typography['2xl'] }]}>
                  {regScore != null ? `${Math.round(regScore * 100)}` : '—'}
                  {regScore != null && (
                    <Text style={[s.regularityPct, { color: colors.textSecondary, fontSize: typography.lg }]}>
                      ٪
                    </Text>
                  )}
                </Text>
                <Text style={[s.regularityLabel, { color: colors.textSecondary, fontSize: typography.xs }]}>
                  امتیاز انتظام
                </Text>
                {regScore != null && (
                  <View style={[s.regBarWrap, { marginTop: spacing[3] }]}>
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
                      height={3}
                    />
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {/* ══ DEEP INSIGHTS CTA ═════════════════════════════════════════ */}
        <TouchableOpacity
          onPress={() => navigation.navigate('DeepInsights')}
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel="Open Deep Insights"
        >
          <View
            style={[
              s.ctaCard,
              {
                backgroundColor: colors.surfaceDark,
                borderRadius: borderRadius.md,
              },
            ]}
          >
            {/* Decorative orbs */}
            <View style={[s.ctaOrbTopRight, { backgroundColor: colors.follicular + '25' }]} />
            <View style={[s.ctaOrbBottomLeft, { backgroundColor: colors.menstrual + '15' }]} />

            {/* Premium badge */}
            <View style={[s.ctaBadgeRow, { marginBottom: spacing[4] }]}>
              <View style={[s.ctaBadge, { backgroundColor: colors.follicular + '30' }]}>
                <Text style={[s.ctaBadgeText, { color: colors.follicular }]}>✦ Premium</Text>
              </View>
            </View>

            <Text style={[s.ctaTitle, { color: colors.textOnDark, fontSize: typography.xl }]}>
              Deep Insights
            </Text>
            <Text style={[s.ctaBody, { marginBottom: spacing[5] }]}>
              ببین خواب، استرس، خلق، و انرژی‌ات چطور با هم در ارتباط‌اند — بر اساس داده‌های خودت.
            </Text>

            <View style={s.ctaFooter}>
              <Text style={[s.ctaFooterLabel, { color: colors.textOnDark, fontSize: typography.sm }]}>
                مشاهده تحلیل عمیق
              </Text>
              <View style={s.ctaArrowCircle}>
                <Icon name="arrow-right" size={18} color={colors.textOnDark} />
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  flex1: { flex: 1 },
  scrollContent: {},

  // MetricDot
  metricDot: { width: 8, height: 8, borderRadius: 4 },

  // ProgressBar
  progressTrack: { overflow: 'hidden' },
  progressFill:  { height: '100%' },

  // Eyebrow
  eyebrow: {
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 6,
  },

  // StatTile
  statTile: {
    flex: 1,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  statTileAccentBar: { width: 28, height: 3, borderRadius: 2 },
  statTileValue:     { fontWeight: '900', letterSpacing: -1, lineHeight: 34 },
  statTileLabel:     { fontWeight: '600', marginTop: 2 },
  statTileSub:       { fontSize: 11, marginTop: 2 },

  // AvgMetricRow
  avgRow:          {},
  avgRowHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  avgRowLeft:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avgRowLabelText: { fontWeight: '500' },
  avgRowValue:     { fontWeight: '800', fontVariant: ['tabular-nums'] },
  avgRowValueMax:  { fontWeight: '500', fontSize: 11 },

  // SectionHeading
  sectionHeading:      {},
  sectionHeadingTitle: { fontWeight: '800', letterSpacing: -0.4 },
  sectionHeadingSub:   { marginTop: 3, lineHeight: 20 },

  // Hero header
  heroSection: {},
  heroTitle:   { fontWeight: '900', letterSpacing: -1, lineHeight: 38, marginBottom: 8 },
  heroSub:     { lineHeight: 20 },
  statRow:     { flexDirection: 'row' },

  // PatternCard wrapper
  patternCardWrap: {},

  // Section wrapper
  section: {},

  // Avg card
  avgCard: {
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
  },
  rainbowStripe:   { flexDirection: 'row', gap: 3 },
  rainbowSegment:  { flex: 1, height: 2, borderRadius: 1 },

  // Regularity
  tileRow:         { flexDirection: 'row' },
  regularityTile:  {
    flex: 1,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  regularityValue: { fontWeight: '900', letterSpacing: -1 },
  regularityPct:   { fontWeight: '700' },
  regularityLabel: { fontWeight: '600', marginTop: 2 },
  regBarWrap:      {},

  // Deep Insights CTA card
  ctaCard: {
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
    padding: 20,
  },
  ctaOrbTopRight: {
    position: 'absolute',
    top: -32,
    right: -32,
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  ctaOrbBottomLeft: {
    position: 'absolute',
    bottom: -20,
    left: -20,
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  ctaBadgeRow:  { flexDirection: 'row', alignItems: 'center' },
  ctaBadge:     { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  ctaBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  ctaTitle: { fontWeight: '900', letterSpacing: -0.5, marginBottom: 8 },
  ctaBody:  { color: '#AAAAAA', fontSize: 14, lineHeight: 20 },
  ctaFooter:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ctaFooterLabel: { fontWeight: '700' },
  ctaArrowCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
