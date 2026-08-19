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
  _analysis: CycleAnalysis | null | undefined,
): string {
  if (!logs.length) {
    return 'ریتمو داده‌ای برای الگوسازی ندارد.';
  }

  // Find logs with pain > 3 to see if pain clusters in a phase
  const logsWithHighPain = logs.filter(l => l.pain_level >= 6);
  const logsWithLowEnergy = logs.filter(l => l.energy_level <= 3);

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
    <View style={[styles.progressTrack, { backgroundColor: colors.borderSubtle }]}>
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
  const { colors, spacing, typography, borderRadius, shadow } = useTheme();

  // ── Empty state ───────────────────────────────────────────────────────────
  if (dataState === 'empty') {
    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: borderRadius.large,
            padding: spacing[4],
            ...shadow.xs,
          },
        ]}
      >
        <View style={styles.iconRow}>
          <View style={[styles.iconBg, { backgroundColor: colors.surfaceSubtle, borderRadius: borderRadius.small }]}>
            <Icon name="chart-timeline-variant" size={20} color={colors.primary} />
          </View>
          <Text style={[styles.cardTitle, { color: colors.textPrimary, fontSize: typography.body }]}>
            الگوی من
          </Text>
        </View>
        <Text style={[styles.bodyText, { color: colors.textSecondary, fontSize: typography.bodySmall }]}>
          وقتی چند روز ثبت کنی، ریتمو شروع می‌کند به دیدن الگوهای شخصی‌ات.
        </Text>
        <View style={{ marginTop: spacing[3] }}>
          <Text style={[styles.progressLabel, { color: colors.textTertiary, fontSize: typography.label }]}>
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
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: borderRadius.large,
            padding: spacing[4],
            ...shadow.xs,
          },
        ]}
      >
        <View style={styles.iconRow}>
          <View style={[styles.iconBg, { backgroundColor: colors.surfaceSubtle, borderRadius: borderRadius.small }]}>
            <Icon name="chart-timeline-variant" size={20} color={colors.primary} />
          </View>
          <Text style={[styles.cardTitle, { color: colors.textPrimary, fontSize: typography.body }]}>
            داریم الگو را می‌سازیم
          </Text>
        </View>
        <Text style={[styles.bodyText, { color: colors.textSecondary, fontSize: typography.bodySmall }]}>
          {logCount} روز ثبت شده است. وقتی اولین دوره‌ات کامل شود، اولین الگو قابل مشاهده می‌شود.
        </Text>
        {periodCount === 0 && (
          <View style={{ marginTop: spacing[3] }}>
            <Text style={[styles.progressLabel, { color: colors.textTertiary, fontSize: typography.label }]}>
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
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: borderRadius.large,
            ...shadow.xs,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel="اولین الگو، مشاهده جزئیات"
      >
        {/* Accent bar */}
        <View style={[styles.accentBar, { backgroundColor: colors.follicular }]} />
        <View style={{ padding: spacing[4] }}>
          <View style={styles.iconRow}>
            <View style={[styles.iconBg, { backgroundColor: colors.follicularBg, borderRadius: borderRadius.small }]}>
              <Icon name="chart-line" size={20} color={colors.follicular} />
            </View>
            <Text style={[styles.cardTitle, { color: colors.textPrimary, fontSize: typography.body }]}>
              اولین الگو
            </Text>
          </View>
          <Text style={[styles.bodyText, { color: colors.textSecondary, fontSize: typography.bodySmall }]}>
            {obs}
          </Text>
          <View style={[styles.confidenceBadge, { backgroundColor: colors.follicularBg, borderColor: colors.follicularBorder, borderRadius: borderRadius.small }]}>
            <Text style={{ color: colors.follicular, fontSize: typography.caption, fontWeight: '600' }}>
              اطمینان پایین · اطلاعات بیشتر لازم است
            </Text>
          </View>
          <Text style={[styles.seeMore, { color: colors.primary, fontSize: typography.bodySmall }]}>
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
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: borderRadius.large,
          ...shadow.xs,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel="الگوهای چند سیکله"
    >
      <View style={[styles.accentBar, { backgroundColor: colors.primary }]} />
      <View style={{ padding: spacing[4] }}>
        <View style={styles.iconRow}>
          <View style={[styles.iconBg, { backgroundColor: colors.surfaceSubtle, borderRadius: borderRadius.small }]}>
            <Icon name="chart-areaspline" size={20} color={colors.primary} />
          </View>
          <Text style={[styles.cardTitle, { color: colors.textPrimary, fontSize: typography.body }]}>
            الگوهای چند سیکله
          </Text>
          <View style={[styles.comingSoonBadge, { backgroundColor: colors.lutealBg, borderColor: colors.lutealBorder, borderRadius: borderRadius.small }]}>
            <Text style={{ color: colors.luteal, fontSize: typography.label, fontWeight: '700' }}>
              به‌زودی
            </Text>
          </View>
        </View>
        <Text style={[styles.bodyText, { color: colors.textSecondary, fontSize: typography.bodySmall }]}>
          {periodCount} سیکل ثبت شده. به‌زودی الگوهای تکرارشونده در سیکل‌های مختلف قابل مشاهده می‌شوند.
        </Text>
        <Text style={[styles.seeMore, { color: colors.primary, fontSize: typography.bodySmall }]}>
          مشاهده جزئیات ›
        </Text>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  accentBar: {
    height: 3,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  iconBg: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontWeight: '700',
    flex: 1,
  },
  bodyText: {
    lineHeight: 20,
  },
  progressLabel: {
    fontWeight: '600',
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
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 10,
  },
  seeMore: {
    marginTop: 10,
    fontWeight: '600',
  },
  comingSoonBadge: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginHorizontal: 4,
  },
});

