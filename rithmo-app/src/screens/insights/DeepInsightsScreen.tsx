/**
 * DeepInsightsScreen — Premium Deep Insights
 *
 * Rhythmo Design System Redesign.
 * Consumes existing dashboard query hooks:
 *   GET /api/dashboard/correlations/  → Pearson correlations between metric pairs
 *   GET /api/dashboard/comparison/    → this week vs last week averages
 *
 * Data-state gating:
 *   - Requires ≥ 14 wellness logs before showing correlations (< 14 shows
 *     clean insufficient-data progress state)
 *   - Comparison section renders when this-week or last-week data exists
 */
import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@hooks/useTheme';
import { useDashboardCorrelations, useDashboardComparison } from '@hooks/queries/useDashboard';
import { useWellnessLogs } from '@hooks/queries/useWellness';
import { LoadingState, ErrorState, Card, Badge } from '@components/ui';
import { PremiumGate } from '@components/PremiumGate';
import { usePremiumStatus } from '@hooks/queries/useSubscription';

// ── constants ─────────────────────────────────────────────────────────────────

/** Minimum wellness logs needed before correlations are meaningful. */
const MIN_LOGS_FOR_CORRELATIONS = 14;

// ── helpers ───────────────────────────────────────────────────────────────────

function correlationColor(r: number, colors: ReturnType<typeof useTheme>['colors']): string {
  const abs = Math.abs(r);
  if (abs >= 0.7) { return r > 0 ? colors.success : colors.menstrual; }
  if (abs >= 0.3) { return r > 0 ? colors.ovulation : colors.luteal; }
  return colors.textTertiary;
}

function correlationBar(r: number): number {
  // Maps [-1, 1] → [0, 100] for visual bar position
  return Math.round(((r + 1) / 2) * 100);
}

function deltaBadgeVariant(
  metric: string,
  delta: number | null,
): { variant: 'success' | 'error' | 'neutral'; text: string } {
  if (delta == null) {
    return { variant: 'neutral', text: '—' };
  }
  const higherIsBad = metric === 'stress';
  const sign = delta > 0 ? '+' : '';
  const arrow = delta > 0.05 ? '↑' : delta < -0.05 ? '↓' : '→';
  const text = `${sign}${delta.toFixed(1)} ${arrow}`;

  if (Math.abs(delta) <= 0.05) {
    return { variant: 'neutral', text };
  }
  const isImprovement = higherIsBad ? delta < 0 : delta > 0;
  return { variant: isImprovement ? 'success' : 'error', text };
}

// ── sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  const { colors, typography, spacing } = useTheme();
  return (
    <View style={{ marginBottom: spacing[3] }}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: typography.lg }]}>
        {title}
      </Text>
      {sub ? (
        <Text style={[styles.sectionSub, { color: colors.textSecondary, fontSize: typography.xs }]}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

interface CorrelationRowProps {
  relationship: string;
  correlation: number;
  interpretation: string;
}

function CorrelationRow({ relationship, correlation, interpretation }: CorrelationRowProps) {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const barPct = correlationBar(correlation);
  const barColor = correlationColor(correlation, colors);

  return (
    <View style={[styles.correlationItem, { marginBottom: spacing[4] }]}>
      {/* Label + value */}
      <View style={[styles.rowBetween, { marginBottom: spacing[2] }]}>
        <Text style={[styles.relationshipLabel, { color: colors.textPrimary, fontSize: typography.sm }]}>
          {relationship}
        </Text>
        <Text style={[styles.correlationValue, { color: barColor, fontSize: typography.base }]}>
          {correlation > 0 ? '+' : ''}{correlation.toFixed(2)}
        </Text>
      </View>

      {/* Bar track with center 0.0 marker */}
      <View style={[styles.barTrack, { backgroundColor: colors.border, borderRadius: borderRadius.sm }]}>
        <View style={[styles.midMarker, { backgroundColor: colors.textTertiary }]} />
        <View
          style={[
            styles.barFill,
            {
              backgroundColor: barColor,
              width: `${Math.abs(barPct - 50)}%`,
              left: correlation >= 0 ? '50%' : `${barPct}%`,
              borderRadius: borderRadius.sm,
            },
          ]}
        />
      </View>

      <Text style={[styles.interpretationText, { color: colors.textSecondary, fontSize: typography.xs, marginTop: spacing[1] }]}>
        {interpretation}
      </Text>
    </View>
  );
}

interface ComparisonMetricProps {
  label: string;
  thisWeek: number | null;
  lastWeek: number | null;
  metric: string;
  isLast?: boolean;
}

function ComparisonMetric({ label, thisWeek, lastWeek, metric, isLast }: ComparisonMetricProps) {
  const { colors, spacing, typography } = useTheme();
  const delta = thisWeek != null && lastWeek != null ? thisWeek - lastWeek : null;
  const badgeInfo = deltaBadgeVariant(metric, delta);

  return (
    <View
      style={[
        styles.comparisonRow,
        {
          paddingVertical: spacing[3],
          borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <Text style={[styles.metricName, { color: colors.textPrimary, fontSize: typography.sm }]}>
        {label}
      </Text>
      <View style={styles.metricValuesGroup}>
        <View style={styles.valCol}>
          <Text style={[styles.valColHeader, { color: colors.textTertiary, fontSize: typography.xs }]}>
            Last Wk
          </Text>
          <Text style={[styles.valText, { color: colors.textSecondary, fontSize: typography.sm }]}>
            {lastWeek != null ? lastWeek.toFixed(1) : '—'}
          </Text>
        </View>
        <View style={styles.valCol}>
          <Text style={[styles.valColHeader, { color: colors.textTertiary, fontSize: typography.xs }]}>
            This Wk
          </Text>
          <Text style={[styles.valText, { color: colors.textPrimary, fontSize: typography.sm }]}>
            {thisWeek != null ? thisWeek.toFixed(1) : '—'}
          </Text>
        </View>
        <View style={styles.deltaCol}>
          <Badge label={badgeInfo.text} variant={badgeInfo.variant} />
        </View>
      </View>
    </View>
  );
}

// ── Not enough data state ─────────────────────────────────────────────────────

function InsufficientDataCard({ logCount }: { logCount: number }) {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const needed = MIN_LOGS_FOR_CORRELATIONS - logCount;
  const pct = Math.min(1, Math.max(0, logCount / MIN_LOGS_FOR_CORRELATIONS));

  return (
    <Card elevated={false} style={{ padding: spacing[4] }}>
      <View style={[styles.row, { marginBottom: spacing[3] }]}>
        <View style={[styles.iconBubble, { backgroundColor: colors.primary + '18', borderRadius: borderRadius.md }]}>
          <Icon name="chart-timeline-variant" size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1, marginLeft: spacing[3] }}>
          <Text style={[styles.insufficientTitle, { color: colors.textPrimary, fontSize: typography.base, marginBottom: 2 }]}>
            {needed} more days to go
          </Text>
          <Text style={[styles.insufficientSub, { color: colors.textSecondary, fontSize: typography.xs }]}>
            Log wellness data for {MIN_LOGS_FOR_CORRELATIONS} days to reveal personal correlations between sleep, stress, mood, and energy.
          </Text>
        </View>
      </View>

      <View style={[styles.progressTrack, { backgroundColor: colors.border, height: 6, borderRadius: 3 }]}>
        <View style={[styles.progressFill, { width: `${pct * 100}%`, backgroundColor: colors.primary, borderRadius: 3 }]} />
      </View>
      <Text style={[styles.progressSub, { color: colors.textTertiary, fontSize: typography.xs, marginTop: spacing[2] }]}>
        {logCount} / {MIN_LOGS_FOR_CORRELATIONS} days logged
      </Text>
    </Card>
  );
}

// ── main screen ───────────────────────────────────────────────────────────────

export default function DeepInsightsScreen() {
  const { colors, spacing, typography } = useTheme();
  const [refreshing, setRefreshing] = React.useState(false);
  const { isPremium, isLoading: premiumLoading } = usePremiumStatus();

  const {
    data: correlationsData,
    isLoading: corrLoading,
    isError: corrError,
    error: corrErr,
    refetch: refetchCorr,
  } = useDashboardCorrelations();

  const {
    data: comparisonData,
    isLoading: compLoading,
    refetch: refetchComp,
  } = useDashboardComparison();

  const { data: allLogs } = useWellnessLogs();
  const logCount = Array.isArray(allLogs) ? (allLogs as any[]).length : 0;
  const hasEnoughData = logCount >= MIN_LOGS_FOR_CORRELATIONS;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([refetchCorr(), refetchComp()]);
    setRefreshing(false);
  }, [refetchCorr, refetchComp]);

  // While premium status is loading, show loading state to avoid flash of paywall
  if (premiumLoading) {
    return <LoadingState fullScreen message="Loading…" />;
  }

  // Free user — show paywall in place of the screen content
  if (!isPremium) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['left', 'right', 'bottom']}>
        <ScrollView contentContainerStyle={{ padding: spacing[4], paddingBottom: spacing[20] }}>
          <PremiumGate featureName="Deep Insights" />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (corrLoading || compLoading) {
    return <LoadingState fullScreen message="Crunching your patterns…" />;
  }

  if (corrError) {
    return <ErrorState fullScreen error={corrErr} onRetry={refetchCorr} />;
  }

  const correlations: any[] = correlationsData?.correlations ?? [];
  const thisWeekAvg = comparisonData?.this_week?.averages ?? {};
  const lastWeekAvg = comparisonData?.last_week?.averages ?? {};
  const thisWeekPeriod = comparisonData?.this_week?.period ?? '';
  const lastWeekPeriod = comparisonData?.last_week?.period ?? '';

  const hasComparisonData =
    thisWeekAvg.stress != null ||
    thisWeekAvg.sleep  != null ||
    thisWeekAvg.mood   != null ||
    thisWeekAvg.energy != null;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['left', 'right', 'bottom']}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing[4], paddingBottom: spacing[20] }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* ── Hero header ──────────────────────────────────────────────── */}
        <Card
          elevated={false}
          style={[
            styles.heroCard,
            {
              backgroundColor: colors.surfaceSecondary,
              marginBottom: spacing[5],
              marginTop: spacing[3],
              padding: spacing[4],
            },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Badge label="✦ Premium" variant="primary" />
            <Text style={[styles.heroTitle, { color: colors.textPrimary, fontSize: typography.xl, marginTop: spacing[2] }]}>
              Deep Insights
            </Text>
            <Text style={[styles.heroSub, { color: colors.textSecondary, fontSize: typography.xs, marginTop: 2 }]}>
              {logCount} days of logged wellness data
            </Text>
          </View>
          <View style={[styles.heroIconCircle, { backgroundColor: colors.primary + '18' }]}>
            <Icon name="chart-bell-curve-cumulative" size={24} color={colors.primary} />
          </View>
        </Card>

        {/* ── Week-over-week comparison ─────────────────────────────────── */}
        {hasComparisonData && (
          <View style={{ marginBottom: spacing[5] }}>
            <SectionHeader
              title="This week vs last week"
              sub={`${lastWeekPeriod}  →  ${thisWeekPeriod}`}
            />
            <Card elevated={false} style={{ paddingHorizontal: spacing[4], paddingVertical: spacing[2] }}>
              <ComparisonMetric
                label="Stress"
                thisWeek={thisWeekAvg.stress}
                lastWeek={lastWeekAvg.stress}
                metric="stress"
              />
              <ComparisonMetric
                label="Sleep (hrs)"
                thisWeek={thisWeekAvg.sleep}
                lastWeek={lastWeekAvg.sleep}
                metric="sleep"
              />
              <ComparisonMetric
                label="Mood"
                thisWeek={thisWeekAvg.mood}
                lastWeek={lastWeekAvg.mood}
                metric="mood"
              />
              <ComparisonMetric
                label="Energy"
                thisWeek={thisWeekAvg.energy}
                lastWeek={lastWeekAvg.energy}
                metric="energy"
                isLast
              />
            </Card>
          </View>
        )}

        {/* ── Correlations ─────────────────────────────────────────────── */}
        <View style={{ marginBottom: spacing[5] }}>
          <SectionHeader
            title="Personal Correlations"
            sub="Pearson r — calculated across your recorded logs"
          />

          {!hasEnoughData ? (
            <InsufficientDataCard logCount={logCount} />
          ) : correlations.length === 0 ? (
            <Card elevated={false} style={{ alignItems: 'center', paddingVertical: spacing[6] }}>
              <Text style={{ color: colors.textSecondary, fontSize: typography.sm, textAlign: 'center' }}>
                No significant correlations identified yet. Keep logging to reveal patterns.
              </Text>
            </Card>
          ) : (
            <Card elevated={false} style={{ padding: spacing[4] }}>
              {correlations.map((c, i) => (
                <CorrelationRow
                  key={i}
                  relationship={c.relationship}
                  correlation={c.correlation}
                  interpretation={c.interpretation}
                />
              ))}
            </Card>
          )}
        </View>

        {/* ── Scientific explainer ──────────────────────────────────────── */}
        {hasEnoughData && correlations.length > 0 && (
          <Card
            elevated={false}
            style={[
              styles.explainerCard,
              {
                backgroundColor: colors.surfaceSecondary,
                padding: spacing[4],
              },
            ]}
          >
            <View style={[styles.row, { alignItems: 'flex-start', gap: spacing[2] }]}>
              <Icon name="information-outline" size={18} color={colors.primary} style={{ marginTop: 2 }} />
              <Text style={{ flex: 1, color: colors.textSecondary, fontSize: typography.xs, lineHeight: 18 }}>
                <Text style={{ fontWeight: '700', color: colors.textPrimary }}>r closer to +1</Text> indicates both metrics trend upward together.{' '}
                <Text style={{ fontWeight: '700', color: colors.textPrimary }}>r closer to −1</Text> indicates an inverse relationship.{' '}
                <Text style={{ fontWeight: '700', color: colors.textPrimary }}>r near 0</Text> indicates no strong correlation.
                These figures represent correlations in your personal logs and do not imply causation.
              </Text>
            </View>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroTitle: {
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  heroSub: {
    fontWeight: '500',
  },
  heroIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionTitle: {
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  sectionSub: {
    marginTop: 2,
    lineHeight: 16,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  correlationItem: {},
  relationshipLabel: {
    fontWeight: '600',
  },
  correlationValue: {
    fontWeight: '800',
  },
  barTrack: {
    height: 6,
    overflow: 'visible',
    position: 'relative',
  },
  barFill: {
    height: '100%',
    position: 'absolute',
    top: 0,
  },
  midMarker: {
    position: 'absolute',
    top: -2,
    left: '50%',
    width: 2,
    height: 10,
    borderRadius: 1,
  },
  interpretationText: {
    lineHeight: 16,
  },

  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricName: {
    flex: 1,
    fontWeight: '600',
  },
  metricValuesGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  valCol: {
    alignItems: 'center',
    minWidth: 44,
  },
  valColHeader: {
    fontWeight: '500',
    marginBottom: 2,
  },
  valText: {
    fontWeight: '700',
  },
  deltaCol: {
    minWidth: 56,
    alignItems: 'flex-end',
  },

  iconBubble: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insufficientTitle: {
    fontWeight: '700',
  },
  insufficientSub: {
    lineHeight: 16,
  },
  progressTrack: {
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  progressSub: {
    fontWeight: '500',
  },

  explainerCard: {},
});
