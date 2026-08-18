/**
 * DeepInsightsScreen — Premium Deep Insights
 *
 * Consumes the existing, previously-unused useDashboard hooks:
 *   GET /api/dashboard/correlations/  → Pearson correlations between metric pairs
 *   GET /api/dashboard/comparison/    → this week vs last week averages
 *
 * Data-state gating:
 *   - Requires ≥ 14 wellness logs before showing correlations (< 14 shows
 *     an "keep logging" state, matching the app's existing gating pattern)
 *   - Comparison section shows as soon as any this-week or last-week data exists
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
import { useTheme } from '@hooks/useTheme';
import { useDashboardCorrelations, useDashboardComparison } from '@hooks/queries/useDashboard';
import { useWellnessLogs } from '@hooks/queries/useWellness';
import { LoadingState, ErrorState } from '@components/ui';
import { PremiumGate } from '@components/PremiumGate';
import { usePremiumStatus } from '@hooks/queries/useSubscription';

// ── constants ─────────────────────────────────────────────────────────────────

/** Minimum wellness logs needed before correlations are meaningful. */
const MIN_LOGS_FOR_CORRELATIONS = 14;

// ── helpers ───────────────────────────────────────────────────────────────────

function correlationColor(r: number, colors: any): string {
  const abs = Math.abs(r);
  if (abs >= 0.7) { return r > 0 ? colors.success    : colors.menstrual; }
  if (abs >= 0.3) { return r > 0 ? colors.ovulationColor : colors.luteal; }
  return colors.textDisabled;
}

function correlationBar(r: number): number {
  // Maps [-1, 1] → [0, 100] for the visual bar width
  return Math.round(((r + 1) / 2) * 100);
}

function deltaArrow(delta: number | null): string {
  if (delta == null) { return '—'; }
  if (delta > 0.05)  { return '↑'; }
  if (delta < -0.05) { return '↓'; }
  return '→';
}

function deltaColor(metric: string, delta: number | null, colors: any): string {
  if (delta == null) { return colors.textDisabled; }
  // For stress: going up is bad; for sleep/mood/energy: going up is good
  const higherIsBad = metric === 'stress';
  if (Math.abs(delta) <= 0.05) { return colors.textSecondary; }
  const isImprovement = higherIsBad ? delta < 0 : delta > 0;
  return isImprovement ? colors.success : colors.error;
}

// ── sub-components ────────────────────────────────────────────────────────────

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  const { colors, typography, spacing } = useTheme();
  return (
    <View style={{ marginBottom: spacing[4] }}>
      <Text style={{ color: colors.textPrimary, fontSize: typography.lg, fontWeight: '800', letterSpacing: -0.3 }}>
        {title}
      </Text>
      {sub ? (
        <Text style={{ color: colors.textSecondary, fontSize: typography.sm, marginTop: 2, lineHeight: 18 }}>
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
  const { colors, spacing, typography } = useTheme();
  const barPct  = correlationBar(correlation);
  const barColor = correlationColor(correlation, colors);

  return (
    <View style={{ marginBottom: spacing[5] }}>
      {/* Label + value */}
      <View style={[styles.row, { marginBottom: spacing[2] }]}>
        <Text style={{ flex: 1, color: colors.textPrimary, fontSize: typography.sm, fontWeight: '600' }}>
          {relationship}
        </Text>
        <Text style={{ color: barColor, fontSize: typography.base, fontWeight: '800' }}>
          {correlation > 0 ? '+' : ''}{correlation.toFixed(2)}
        </Text>
      </View>

      {/* Bar track */}
      <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
        {/* Neutral midpoint marker */}
        <View style={[styles.midMarker, { backgroundColor: colors.textDisabled }]} />
        {/* Filled bar — anchors at 50% (zero) and extends left or right */}
        <View
          style={[
            styles.barFill,
            {
              backgroundColor: barColor + 'AA',
              width: `${Math.abs(barPct - 50)}%`,
              left: correlation >= 0 ? '50%' : `${barPct}%`,
            },
          ]}
        />
      </View>

      <Text style={{ color: colors.textSecondary, fontSize: typography.xs, marginTop: spacing[1] }}>
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
}

function ComparisonMetric({ label, thisWeek, lastWeek, metric }: ComparisonMetricProps) {
  const { colors, spacing, typography } = useTheme();
  const delta  = thisWeek != null && lastWeek != null ? thisWeek - lastWeek : null;
  const arrow  = deltaArrow(delta);
  const dColor = deltaColor(metric, delta, colors);

  return (
    <View style={[styles.row, { paddingVertical: spacing[3], borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
      <Text style={{ flex: 1, color: colors.textSecondary, fontSize: typography.sm, fontWeight: '500' }}>
        {label}
      </Text>
      <View style={[styles.row, { gap: spacing[3] }]}>
        <View style={{ alignItems: 'center', minWidth: 40 }}>
          <Text style={{ color: colors.textDisabled, fontSize: typography.xs, marginBottom: 2 }}>Last</Text>
          <Text style={{ color: colors.textPrimary, fontSize: typography.sm, fontWeight: '700' }}>
            {lastWeek != null ? lastWeek.toFixed(1) : '—'}
          </Text>
        </View>
        <View style={{ alignItems: 'center', minWidth: 40 }}>
          <Text style={{ color: colors.textDisabled, fontSize: typography.xs, marginBottom: 2 }}>This</Text>
          <Text style={{ color: colors.textPrimary, fontSize: typography.sm, fontWeight: '700' }}>
            {thisWeek != null ? thisWeek.toFixed(1) : '—'}
          </Text>
        </View>
        <View style={{ alignItems: 'center', minWidth: 28 }}>
          <Text style={{ color: colors.textDisabled, fontSize: typography.xs, marginBottom: 2 }}>Δ</Text>
          <Text style={{ color: dColor, fontSize: typography.base, fontWeight: '800' }}>{arrow}</Text>
        </View>
      </View>
    </View>
  );
}

// ── Not enough data state ─────────────────────────────────────────────────────

function InsufficientDataCard({ logCount }: { logCount: number }) {
  const { colors, spacing, typography } = useTheme();
  const needed = MIN_LOGS_FOR_CORRELATIONS - logCount;
  const pct    = Math.min(1, logCount / MIN_LOGS_FOR_CORRELATIONS);

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.row, { marginBottom: spacing[4] }]}>
        <View style={[styles.iconBubble, { backgroundColor: colors.primaryLighter }]}>
          <Icon name="chart-timeline-variant" size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1, marginLeft: spacing[3] }}>
          <Text style={{ color: colors.textPrimary, fontSize: typography.base, fontWeight: '700', marginBottom: 3 }}>
            {needed} more days to go
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: typography.sm, lineHeight: 18 }}>
            Log wellness data for {MIN_LOGS_FOR_CORRELATIONS} days to reveal how your
            sleep, stress, mood, and energy are connected.
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={[styles.barTrack, { backgroundColor: colors.border, height: 6, borderRadius: 3 }]}>
        <View style={[styles.progressFill, { width: `${pct * 100}%`, backgroundColor: colors.primary }]} />
      </View>
      <Text style={{ color: colors.textSecondary, fontSize: typography.xs, marginTop: spacing[2] }}>
        {logCount} / {MIN_LOGS_FOR_CORRELATIONS} days logged
      </Text>
    </View>
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
        <ScrollView contentContainerStyle={{ padding: spacing[5], paddingBottom: spacing[20] }}>
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
        contentContainerStyle={{ paddingHorizontal: spacing[5], paddingBottom: spacing[20] }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* ── Hero header ──────────────────────────────────────────────── */}
        <View style={[styles.hero, { backgroundColor: colors.surface, borderColor: colors.border, marginBottom: spacing[6], marginTop: spacing[4] }]}>
          <View>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>Premium</Text>
            <Text style={[styles.heroTitle, { color: colors.textPrimary, fontSize: typography['2xl'] }]}>
              Deep Insights
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: typography.sm }}>
              {logCount} days of data · last 30 days
            </Text>
          </View>
          <View style={[styles.iconBubble, { backgroundColor: colors.primaryLighter, width: 52, height: 52 }]}>
            <Icon name="chart-bell-curve-cumulative" size={26} color={colors.primaryDark} />
          </View>
        </View>

        {/* ── Week-over-week comparison ─────────────────────────────────── */}
        {hasComparisonData && (
          <View style={{ marginBottom: spacing[6] }}>
            <SectionHeader
              title="This week vs last week"
              sub={`${lastWeekPeriod}  →  ${thisWeekPeriod}`}
            />
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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
              />
            </View>
          </View>
        )}

        {/* ── Correlations ─────────────────────────────────────────────── */}
        <View style={{ marginBottom: spacing[6] }}>
          <SectionHeader
            title="Your personal correlations"
            sub="Pearson r — based on your last 30 days of data"
          />

          {!hasEnoughData ? (
            <InsufficientDataCard logCount={logCount} />
          ) : correlations.length === 0 ? (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, alignItems: 'center', paddingVertical: spacing[8] }]}>
              <Text style={{ color: colors.textSecondary, fontSize: typography.sm, textAlign: 'center' }}>
                No correlations found yet. Keep logging!
              </Text>
            </View>
          ) : (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {correlations.map((c, i) => (
                <CorrelationRow
                  key={i}
                  relationship={c.relationship}
                  correlation={c.correlation}
                  interpretation={c.interpretation}
                />
              ))}
            </View>
          )}
        </View>

        {/* ── What this means ───────────────────────────────────────────── */}
        {hasEnoughData && correlations.length > 0 && (
          <View style={[styles.explainerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Icon name="information-outline" size={18} color={colors.textTertiary} style={{ marginBottom: spacing[2] }} />
            <Text style={{ color: colors.textSecondary, fontSize: typography.xs, lineHeight: 18, textAlign: 'center' }}>
              <Text style={{ fontWeight: '700' }}>r closer to +1</Text> means both metrics tend to rise together.{' '}
              <Text style={{ fontWeight: '700' }}>r closer to −1</Text> means one rises as the other falls.{' '}
              <Text style={{ fontWeight: '700' }}>r near 0</Text> means no reliable relationship in your data.
              These are correlations in your personal logs — they do not imply causation.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:          { flex: 1 },
  hero:          { borderRadius: 20, borderWidth: 1, padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroTitle:     { fontWeight: '900', letterSpacing: -0.5, marginBottom: 4 },
  eyebrow:       { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  card:          { borderRadius: 16, borderWidth: 1, padding: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  explainerCard: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 16, alignItems: 'center' },
  iconBubble:    { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  row:           { flexDirection: 'row', alignItems: 'center' },
  barTrack:      { height: 4, borderRadius: 2, overflow: 'visible', position: 'relative' },
  barFill:       { height: '100%', position: 'absolute', top: 0, borderRadius: 2 },
  midMarker:     { position: 'absolute', top: -2, left: '50%', width: 1, height: 8, borderRadius: 0.5 },
  progressFill:  { height: '100%', borderRadius: 3 },
});
