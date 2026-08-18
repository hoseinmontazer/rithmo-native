/**
 * PatternCard — Data-state-aware pattern / intelligence surface
 *
 * DataState rules:
 *   empty    (<3 logs, 0 periods) → explain what will happen
 *   building (≥3 logs, 0 periods) → show building progress
 *   one_cycle (1 period, ≥5 logs) → deterministic first-cycle observation
 *   multi_cycle (2+ periods)       → "coming soon" for cross-cycle patterns
 *
 * Never fabricates insights. Every string is data-conditional.
 */
import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@hooks/useTheme';
import type { WellnessLog } from '@types/wellness.types';
import type { CycleAnalysis } from '@types/period.types';

export type DataState = 'empty' | 'building' | 'one_cycle' | 'multi_cycle';

export function deriveDataState(periodCount: number, logCount: number): DataState {
  if (periodCount === 0 && logCount < 3) { return 'empty'; }
  if (periodCount === 0 || logCount < 5)  { return 'building'; }
  if (periodCount === 1)                  { return 'one_cycle'; }
  return 'multi_cycle';
}

// ── Simple deterministic first-cycle observation ──────────────────────────────
// Real data only. No AI, no LLM, no hallucinations.

function buildFirstCycleObservation(
  logs: WellnessLog[],
  analysis: CycleAnalysis | null | undefined,
): string {
  if (!logs.length) {
    return 'ریتمو داده‌ای برای الگوسازی ندارد.';
  }

  // Find logs with pain > 3 to see if pain clusters in a phase
  const logsWithHighPain = logs.filter(l => l.pain_level >= 6);
  const logsWithLowEnergy = logs.filter(l => l.energy_level <= 3);
  const avgMood = logs.reduce((s, l) => s + l.mood_level, 0) / logs.length;

  // Average pain on period days vs non-period days requires phase tagging
  // — without that data in Phase 1, we give simpler, still-real observations.
  const observations: string[] = [];

  if (logsWithHighPain.length > 0) {
    const painRate = Math.round((logsWithHighPain.length / logs.length) * 100);
    observations.push(`در ${painRate}٪ روزهای ثبت‌شده، درد بالا گزارش شد.`);
  }

  if (logsWithLowEnergy.length > 0) {
    const lowRate = Math.round((logsWithLowEnergy.length / logs.length) * 100);
    observations.push(`در ${lowRate}٪ روزها، انرژی پایین بود.`);
  }

  if (observations.length === 0) {
    return 'اولین سیکل کامل شد. با ثبت بیشتر، الگوهای دقیق‌تر پیدا می‌شوند.';
  }

  return observations[0];
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ count, target, color }: { count: number; target: number; color: string }) {
  const { colors } = useTheme();
  const pct = Math.min(1, count / target);
  return (
    <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
      <View style={[styles.progressFill, { width: `${pct * 100}%`, backgroundColor: color }]} />
    </View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface PatternCardProps {
  dataState: DataState;
  logCount: number;
  periodCount: number;
  logs: WellnessLog[];
  cycleAnalysis: CycleAnalysis | null | undefined;
  onInsightsPress: () => void;
}

export const PatternCard = memo(function PatternCard({
  dataState,
  logCount,
  periodCount,
  logs,
  cycleAnalysis,
  onInsightsPress,
}: PatternCardProps) {
  const { colors, spacing, typography } = useTheme();

  // ── Empty state ───────────────────────────────────────────────────────────
  if (dataState === 'empty') {
    return (
      <View style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.shadowColor }]}>
        <View style={styles.iconRow}>
          <View style={[styles.iconBg, { backgroundColor: colors.primaryLight }]}>
            <Icon name="chart-timeline-variant" size={22} color={colors.primary} />
          </View>
          <Text style={[styles.cardTitle, { color: colors.textPrimary, fontSize: typography.base }]}>
            الگوی من
          </Text>
        </View>
        <Text style={[styles.bodyText, { color: colors.textSecondary, fontSize: typography.sm }]}>
          وقتی چند روز ثبت کنی، ریتمو شروع می‌کند به دیدن الگوهای شخصی‌ات.
        </Text>
        <View style={{ marginTop: spacing[3] }}>
          <Text style={[styles.progressLabel, { color: colors.textTertiary, fontSize: typography.xs }]}>
            {logCount} از ۳ ثبت اولیه
          </Text>
          <ProgressBar count={logCount} target={3} color={colors.primary} />
        </View>
      </View>
    );
  }

  // ── Building state ────────────────────────────────────────────────────────
  if (dataState === 'building') {
    return (
      <View style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.shadowColor }]}>
        <View style={styles.iconRow}>
          <View style={[styles.iconBg, { backgroundColor: colors.primaryLight }]}>
            <Icon name="chart-timeline-variant" size={22} color={colors.primary} />
          </View>
          <Text style={[styles.cardTitle, { color: colors.textPrimary, fontSize: typography.base }]}>
            داریم الگو را می‌سازیم
          </Text>
        </View>
        <Text style={[styles.bodyText, { color: colors.textSecondary, fontSize: typography.sm }]}>
          {logCount} روز ثبت شده است. وقتی اولین دوره‌ات کامل شود، اولین الگو قابل مشاهده می‌شود.
        </Text>
        {periodCount === 0 && (
          <View style={{ marginTop: spacing[3] }}>
            <Text style={[styles.progressLabel, { color: colors.textTertiary, fontSize: typography.xs }]}>
              منتظر دوره اول
            </Text>
            <ProgressBar count={0} target={1} color={colors.primary} />
          </View>
        )}
      </View>
    );
  }

  // ── One cycle — real deterministic observation ─────────────────────────────
  if (dataState === 'one_cycle') {
    const obs = buildFirstCycleObservation(logs, cycleAnalysis);
    return (
      <TouchableOpacity
        onPress={onInsightsPress}
        activeOpacity={0.88}
        style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.shadowColor }]}
      >
        {/* Accent bar */}
        <View style={[styles.accentBar, { backgroundColor: colors.follicular }]} />
        <View style={{ padding: spacing[4] }}>
          <View style={styles.iconRow}>
            <View style={[styles.iconBg, { backgroundColor: colors.follicular + '20' }]}>
              <Icon name="chart-line" size={22} color={colors.follicular} />
            </View>
            <Text style={[styles.cardTitle, { color: colors.textPrimary, fontSize: typography.base }]}>
              اولین الگو
            </Text>
          </View>
          <Text style={[styles.bodyText, { color: colors.textSecondary, fontSize: typography.sm }]}>
            {obs}
          </Text>
          <View style={[styles.confidenceBadge, { backgroundColor: colors.follicular + '15' }]}>
            <Text style={{ color: colors.follicular, fontSize: typography.xs, fontWeight: '700' }}>
              اطمینان پایین · اطلاعات بیشتر لازم است
            </Text>
          </View>
          <Text style={[styles.seeMore, { color: colors.primary, fontSize: typography.sm }]}>
            مشاهده الگوها ›
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  // ── Multi-cycle — Phase 2 placeholder ─────────────────────────────────────
  return (
    <TouchableOpacity
      onPress={onInsightsPress}
      activeOpacity={0.88}
      style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.shadowColor }]}
    >
      <View style={[styles.accentBar, { backgroundColor: colors.primary }]} />
      <View style={{ padding: spacing[4] }}>
        <View style={styles.iconRow}>
          <View style={[styles.iconBg, { backgroundColor: colors.primaryLight }]}>
            <Icon name="chart-areaspline" size={22} color={colors.primary} />
          </View>
          <Text style={[styles.cardTitle, { color: colors.textPrimary, fontSize: typography.base }]}>
            الگوهای چند سیکله
          </Text>
          <View style={[styles.comingSoonBadge, { backgroundColor: colors.luteal + '20' }]}>
            <Text style={{ color: colors.luteal, fontSize: 9, fontWeight: '800', textTransform: 'uppercase' }}>
              به‌زودی
            </Text>
          </View>
        </View>
        <Text style={[styles.bodyText, { color: colors.textSecondary, fontSize: typography.sm }]}>
          {periodCount} سیکل ثبت شده. به‌زودی الگوهای تکرارشونده در سیکل‌های مختلف قابل مشاهده می‌شوند.
        </Text>
        <Text style={[styles.seeMore, { color: colors.primary, fontSize: typography.sm }]}>
          مشاهده جزئیات ›
        </Text>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 8,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 13 },
    shadowOpacity: 0.08,
    shadowRadius: 13,
    elevation: 6,
  },
  accentBar: { height: 4 },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontWeight: '700',
    flex: 1,
  },
  bodyText: {
    lineHeight: 22,
  },
  progressLabel: {
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  confidenceBadge: {
    alignSelf: 'flex-start',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 10,
  },
  seeMore: {
    marginTop: 10,
    fontWeight: '600',
  },
  comingSoonBadge: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 4,
  },
});
