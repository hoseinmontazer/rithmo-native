/**
 * DeepInsightsScreen — بینش عمیق (premium)
 *
 * Persian-first, honest analytics:
 *   - Week-over-week comparison
 *   - Personal correlations (Pearson r)
 *
 * Data strategy: the /api/dashboard/* endpoints are the intended server
 * source. Until they exist, the screen computes the SAME statistics
 * locally from the user's wellness logs (deterministic Pearson + means),
 * so the premium screen is never a dead end. No AI, no faking.
 */
import React, { useCallback, useMemo, useState } from 'react';
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
import { screen } from '@theme/spacing';
import { useDashboardCorrelations, useDashboardComparison } from '@hooks/queries/useDashboard';
import { useWellnessLogs } from '@hooks/queries/useWellness';
import { LoadingState, Card, Badge } from '@components/ui';
import { PremiumGate } from '@components/PremiumGate';
import { usePremiumStatus } from '@hooks/queries/useSubscription';
import { computeCorrelations, computeWeekComparison, correlationSentence } from '@utils/insightsEngine';
import { toFa } from '@utils/persian';

// ── constants ─────────────────────────────────────────────────────────────────

/** Minimum wellness logs needed before correlations are meaningful. */
const MIN_LOGS_FOR_CORRELATIONS = 14;

// ── normalized row types ──────────────────────────────────────────────────────

interface CorrRow {
  title: string;
  r: number;
  n: number | null;
  sentence: string;
}

interface CompareRow {
  label: string;
  thisWeek: number | null;
  lastWeek: number | null;
  delta: number | null;
  unit: string;
  higherIsBetter: boolean;
}

// ── helpers ───────────────────────────────────────────────────────────────────

function correlationColor(r: number, colors: ReturnType<typeof useTheme>['colors']): string {
  const abs = Math.abs(r);
  if (abs >= 0.7) { return r > 0 ? colors.success : colors.menstrual; }
  if (abs >= 0.3) { return r > 0 ? colors.ovulation : colors.luteal; }
  return colors.textTertiary;
}

function deltaBadge(delta: number | null, higherIsBetter: boolean) {
  if (delta == null || Math.abs(delta) <= 0.05) {
    return { variant: 'neutral' as const, text: '→' };
  }
  const up = delta > 0;
  const improved = higherIsBetter ? up : !up;
  return {
    variant: improved ? ('success' as const) : ('error' as const),
    text: `${up ? '↑' : '↓'} ${toFa(Math.abs(delta).toFixed(1))}`,
  };
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

function CorrelationRow({ row, isLast }: { row: CorrRow; isLast: boolean }) {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const barPct = Math.round(((row.r + 1) / 2) * 100);
  const barColor = correlationColor(row.r, colors);

  return (
    <View style={[styles.correlationItem, { marginBottom: isLast ? 0 : spacing[4] }]}>
      <View style={[styles.rowBetween, { marginBottom: spacing[2] }]}>
        <Text style={[styles.relationshipLabel, { color: colors.textPrimary, fontSize: typography.sm }]}>
          {row.title}
        </Text>
        <Text style={[styles.correlationValue, { color: barColor, fontSize: typography.base }]}>
          {toFa(row.r.toFixed(2))}
        </Text>
      </View>

      <View style={[styles.barTrack, { backgroundColor: colors.border, borderRadius: borderRadius.sm }]}>
        <View style={[styles.midMarker, { backgroundColor: colors.textTertiary }]} />
        <View
          style={[
            styles.barFill,
            {
              backgroundColor: barColor,
              width: `${Math.abs(barPct - 50)}%`,
              left: row.r >= 0 ? '50%' : `${barPct}%`,
              borderRadius: borderRadius.sm,
            },
          ]}
        />
      </View>

      <Text style={[styles.interpretationText, { color: colors.textSecondary, fontSize: typography.xs, marginTop: spacing[1] }]}>
        {row.sentence}
        {row.n != null ? ` (بر پایه ${toFa(row.n)} ثبت)` : ''}
      </Text>
    </View>
  );
}

function ComparisonMetric({ row, isLast }: { row: CompareRow; isLast: boolean }) {
  const { colors, spacing, typography } = useTheme();
  const badgeInfo = deltaBadge(row.delta, row.higherIsBetter);
  const fmt = (v: number | null) => (v == null ? '—' : toFa(v.toFixed(1)));

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
        {row.label}
      </Text>
      <View style={styles.metricValuesGroup}>
        <View style={styles.valCol}>
          <Text style={[styles.valColHeader, { color: colors.textTertiary, fontSize: typography.xs }]}>
            هفته قبل
          </Text>
          <Text style={[styles.valText, { color: colors.textSecondary, fontSize: typography.sm }]}>
            {fmt(row.lastWeek)}
          </Text>
        </View>
        <View style={styles.valCol}>
          <Text style={[styles.valColHeader, { color: colors.textTertiary, fontSize: typography.xs }]}>
            این هفته
          </Text>
          <Text style={[styles.valText, { color: colors.textPrimary, fontSize: typography.sm, fontWeight: '700' }]}>
            {fmt(row.thisWeek)}
          </Text>
        </View>
        <View style={styles.deltaCol}>
          <Badge label={badgeInfo.text} variant={badgeInfo.variant} />
        </View>
      </View>
    </View>
  );
}

function InsufficientDataCard({ logCount }: { logCount: number }) {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const needed = MIN_LOGS_FOR_CORRELATIONS - logCount;
  const pct = Math.min(1, Math.max(0, logCount / MIN_LOGS_FOR_CORRELATIONS));

  return (
    <Card elevated={false} rounded="2xl" style={{ padding: spacing[4] }}>
      <View style={[styles.row, { marginBottom: spacing[3] }]}>
        <View style={[styles.iconBubble, { backgroundColor: colors.primary + '18', borderRadius: borderRadius.md }]}>
          <Icon name="chart-timeline-variant" size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1, marginLeft: spacing[3] }}>
          <Text style={[styles.insufficientTitle, { color: colors.textPrimary, fontSize: typography.base, marginBottom: 2 }]}>
            {toFa(needed)} روز تا نمایش الگوها
          </Text>
          <Text style={[styles.insufficientSub, { color: colors.textSecondary, fontSize: typography.xs }]}>
            برای دیدن همبستگی‌های شخصی، {toFa(MIN_LOGS_FOR_CORRELATIONS)} روز داده‌ی سلامت ثبت کن — خواب، استرس، خلق و انرژی.
          </Text>
        </View>
      </View>

      <View style={[styles.progressTrack, { backgroundColor: colors.border, height: 6, borderRadius: 3 }]}>
        <View style={[styles.progressFill, { width: `${pct * 100}%`, backgroundColor: colors.primary, borderRadius: 3 }]} />
      </View>
      <Text style={[styles.progressSub, { color: colors.textTertiary, fontSize: typography.xs, marginTop: spacing[2] }]}>
        {toFa(logCount)} / {toFa(MIN_LOGS_FOR_CORRELATIONS)} روز ثبت‌شده
      </Text>
    </Card>
  );
}

// ── main screen ───────────────────────────────────────────────────────────────

export default function DeepInsightsScreen() {
  const { colors, spacing, typography } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const { isPremium, isLoading: premiumLoading } = usePremiumStatus();

  const {
    data: correlationsData,
    isError: corrError,
    refetch: refetchCorr,
  } = useDashboardCorrelations();

  const {
    data: comparisonData,
    isError: compError,
    refetch: refetchComp,
  } = useDashboardComparison();

  const { data: allLogs } = useWellnessLogs({ days: 90 }) /* correlations and week-over-week are computed over a recent window */;
  const logs = useMemo(
    () => (Array.isArray(allLogs) ? (allLogs as any[]) : []),
    [allLogs],
  );
  const logCount = logs.length;
  const hasEnoughData = logCount >= MIN_LOGS_FOR_CORRELATIONS;

  // ── correlations: server-first, local deterministic fallback ─────────────
  const correlationRows: CorrRow[] = useMemo(() => {
    const serverCorrs: any[] = !corrError ? (correlationsData?.correlations ?? []) : [];
    if (serverCorrs.length > 0) {
      return serverCorrs.map((c) => ({
        title: String(c.relationship ?? ''),
        r: Number(c.correlation ?? 0),
        n: null,
        sentence: String(c.interpretation ?? ''),
      }));
    }
    if (!hasEnoughData) { return []; }
    return computeCorrelations(logs).map((c) => ({
      title: `${c.aLabel} × ${c.bLabel}`,
      r: c.r,
      n: c.n,
      sentence: correlationSentence(c),
    }));
  }, [correlationsData, corrError, hasEnoughData, logs]);

  // ── week comparison: server-first, local deterministic fallback ─────────
  const comparisonRows: CompareRow[] = useMemo(() => {
    const server = !compError ? comparisonData : null;
    if (server?.this_week?.averages) {
      const t = server.this_week.averages;
      const l = server.last_week?.averages ?? {};
      const map: [string, number | null, number | null, string, boolean][] = [
        ['استرس',   t.stress  ?? null, l.stress  ?? null, '', false],
        ['خواب',   t.sleep   ?? null, l.sleep   ?? null, 'ساعت', true],
        ['خلق',    t.mood    ?? null, l.mood    ?? null, '', true],
        ['انرژی',   t.energy  ?? null, l.energy  ?? null, '', true],
      ];
      return map.map(([label, thisWeek, lastWeek, unit, higherIsBetter]) => ({
        label, thisWeek, lastWeek,
        delta: thisWeek != null && lastWeek != null ? thisWeek - lastWeek : null,
        unit, higherIsBetter,
      }));
    }
    return computeWeekComparison(logs).map((it) => ({
      label: it.label,
      thisWeek: it.thisWeek,
      lastWeek: it.lastWeek,
      delta: it.delta,
      unit: it.unit,
      higherIsBetter: it.higherIsBetter,
    }));
  }, [comparisonData, compError, logs]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([refetchCorr(), refetchComp()]);
    setRefreshing(false);
  }, [refetchCorr, refetchComp]);

  // While premium status loads, avoid a paywall flash
  if (premiumLoading) {
    return <LoadingState fullScreen message="در حال بارگذاری…" />;
  }

  // Free user — paywall
  if (!isPremium) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['left', 'right', 'bottom']}>
        <ScrollView contentContainerStyle={{
          paddingHorizontal: screen.gutter,
          paddingTop: screen.top,
          paddingBottom: screen.bottom,
        }}>
          <PremiumGate featureName="بینش عمیق" />
        </ScrollView>
      </SafeAreaView>
    );
  }

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
        <Card
          elevated={false}
          rounded="2xl"
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
            <Badge label="✦ پریمیوم" variant="primary" />
            <Text style={[styles.heroTitle, { color: colors.textPrimary, fontSize: typography.xl, marginTop: spacing[2] }]}>
              بینش عمیق
            </Text>
            <Text style={[styles.heroSub, { color: colors.textSecondary, fontSize: typography.xs, marginTop: 2 }]}>
              {toFa(logCount)} روز داده‌ی ثبت‌شده از سلامتت
            </Text>
          </View>
          <View style={[styles.heroIconCircle, { backgroundColor: colors.primary + '18' }]}>
            <Icon name="chart-bell-curve-cumulative" size={24} color={colors.primary} />
          </View>
        </Card>

        {/* ── Week-over-week ─────────────────────────────────────────── */}
        {comparisonRows.some((r) => r.thisWeek != null || r.lastWeek != null) && (
          <View style={{ marginBottom: spacing[5] }}>
            <SectionHeader
              title="این هفته در برابر هفته‌ی قبل"
              sub="میانگین هفت روز اخیر با هفته‌ی قبل مقایسه شده"
            />
            <Card elevated={false} rounded="2xl" style={{ paddingHorizontal: spacing[4], paddingVertical: spacing[2] }}>
              {comparisonRows.map((row, i) => (
                <ComparisonMetric key={row.label} row={row} isLast={i === comparisonRows.length - 1} />
              ))}
            </Card>
          </View>
        )}

        {/* ── Correlations ───────────────────────────────────────────── */}
        <View style={{ marginBottom: spacing[5] }}>
          <SectionHeader
            title="همبستگی‌های شخصی"
            sub="همبستگی پییرسون — محاسبه‌شده از ثبت‌های خودت"
          />

          {!hasEnoughData ? (
            <InsufficientDataCard logCount={logCount} />
          ) : correlationRows.length === 0 ? (
            <Card elevated={false} rounded="2xl" style={{ alignItems: 'center', paddingVertical: spacing[6] }}>
              <Text style={{ color: colors.textSecondary, fontSize: typography.sm, textAlign: 'center', lineHeight: 20 }}>
                هنوز همبستگی معناداری پیدا نشده. ادامه بده ثبت کنی تا الگوها ظاهر شوند.
              </Text>
            </Card>
          ) : (
            <Card elevated={false} rounded="2xl" style={{ padding: spacing[4] }}>
              {correlationRows.map((row, i) => (
                <CorrelationRow key={`${row.title}-${i}`} row={row} isLast={i === correlationRows.length - 1} />
              ))}
            </Card>
          )}
        </View>

        {/* ── Honest explainer ───────────────────────────────────────── */}
        {hasEnoughData && correlationRows.length > 0 && (
          <Card
            elevated={false}
            rounded="2xl"
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
                <Text style={{ fontWeight: '700', color: colors.textPrimary }}>r نزدیک +۱</Text> یعنی هر دو شاخص با هم بالا می‌روند؛{' '}
                <Text style={{ fontWeight: '700', color: colors.textPrimary }}>r نزدیک −۱</Text> یعنی رابطه‌ی معکوس؛{' '}
                <Text style={{ fontWeight: '700', color: colors.textPrimary }}>r نزدیک ۰</Text> یعنی ارتباط قوی نداریم.
                این اعداد همبستگیِ داده‌های شخصی تو هستند و به‌تنهایی به معنای علّیت نیستند.
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
  heroTitle: { fontWeight: '800' },
  heroSub:   { fontWeight: '500' },
  heroIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { fontWeight: '700' },
  sectionSub:   { marginTop: 2, lineHeight: 16 },
  row:          { flexDirection: 'row', alignItems: 'center' },
  rowBetween:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  correlationItem: {},
  relationshipLabel: { fontWeight: '600' },
  correlationValue:  { fontWeight: '800' },
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
  interpretationText: { lineHeight: 16 },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricName:        { flex: 1, fontWeight: '600' },
  metricValuesGroup: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  valCol:            { alignItems: 'center' },
  valColHeader:      { marginBottom: 2 },
  valText:           { fontWeight: '600' },
  deltaCol:          { alignItems: 'center', justifyContent: 'center', minWidth: 44 },
  iconBubble: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insufficientTitle: { fontWeight: '700' },
  insufficientSub:   { lineHeight: 16 },
  progressTrack:     { overflow: 'hidden' },
  progressFill:      { height: '100%' },
  progressSub:       { textAlign: 'center' },
  explainerCard:     {},
});
