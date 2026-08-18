/**
 * CycleContextCard — Home screen's primary status card
 *
 * Answers: "What is happening right now?"
 *
 * Shows cycle day, phase context, and a single interpretation line
 * derived from available data. Uses phase-appropriate accent color.
 * Does NOT expose medical terminology as primary label.
 */
import React, { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '@hooks/useTheme';
import { PhasePill } from '@components/ui';

// ── Phase interpretation map ──────────────────────────────────────────────────
// User-facing language: personal, non-medical, observational.

const PHASE_CONTEXT: Record<string, {
  label: string;      // non-medical user-facing label
  accent: string;     // key in colors
  interpretation: string; // what this phase typically means for the user
}> = {
  menstrual: {
    label: 'روزهای دوره',
    accent: 'menstrual',
    interpretation: 'معمولاً روزهایی برای آرام‌گرفتن',
  },
  follicular: {
    label: 'روزهای اوج',
    accent: 'follicular',
    interpretation: 'انرژی معمولاً در حال افزایش است',
  },
  ovulation: {
    label: 'روزهای اوج',
    accent: 'ovulation',
    interpretation: 'اغلب بهترین روزهای ماه',
  },
  luteal: {
    label: 'روزهای پایانی سیکل',
    accent: 'luteal',
    interpretation: 'ممکن است کمی سخت‌تر باشد',
  },
};

interface CycleContextCardProps {
  isLoading: boolean;
  hasData: boolean;
  hasError: boolean;
  cycleDay: number | null;
  phase: 'menstrual' | 'follicular' | 'ovulation' | 'luteal';
  daysUntilPeriod: number | null;
  isOnPeriod: boolean;
  onPress: () => void;
  onRetry: () => void;
  onStartTracking: () => void;
}

export const CycleContextCard = memo(function CycleContextCard({
  isLoading,
  hasData,
  hasError,
  cycleDay,
  phase,
  daysUntilPeriod,
  isOnPeriod,
  onPress,
  onRetry,
  onStartTracking,
}: CycleContextCardProps) {
  const { colors, spacing, typography } = useTheme();
  const ctx = PHASE_CONTEXT[phase] ?? PHASE_CONTEXT.follicular;
  const accent = (colors as any)[ctx.accent] ?? colors.primary;
  const accentBg = accent + '12';

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.shadowColor }]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  // ── No tracking yet ───────────────────────────────────────────────────────
  if (!hasData || hasError) {
    return (
      <TouchableOpacity
        onPress={hasError ? onRetry : onStartTracking}
        activeOpacity={0.85}
        style={[styles.card, {
          backgroundColor: colors.surface,
          shadowColor: colors.shadowColor,
          borderStyle: 'dashed',
          borderWidth: 1,
          borderColor: colors.border,
        }]}
      >
        <Text style={{ color: colors.textSecondary, fontSize: typography.base, textAlign: 'center', lineHeight: 22 }}>
          {hasError
            ? 'مشکلی پیش آمد. لمس کنید تا دوباره تلاش شود.'
            : 'برای شروع، آخرین دوره‌ات را ثبت کن.'}
        </Text>
        <View style={[styles.ctaBtn, { backgroundColor: colors.primaryLight, marginTop: spacing[3] }]}>
          <Text style={{ color: colors.primary, fontWeight: '700', fontSize: typography.sm }}>
            {hasError ? 'تلاش دوباره' : 'شروع ردیابی'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  // ── Main card ─────────────────────────────────────────────────────────────
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.88}
      style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.shadowColor }]}
    >
      {/* Accent top bar */}
      <View style={[styles.accentBar, { backgroundColor: accent }]} />

      <View style={{ padding: spacing[5] }}>
        {/* Cycle day + phase label row */}
        <View style={styles.topRow}>
          {cycleDay ? (
            <View>
              <Text style={[styles.cycleDayNum, { color: accent, fontSize: typography['4xl'] }]}>
                {cycleDay}
              </Text>
              <Text style={[styles.cycleDayLabel, { color: colors.textTertiary, fontSize: typography.xs }]}>
                روز سیکل
              </Text>
            </View>
          ) : null}

          <View style={{ flex: 1, alignItems: 'flex-end', gap: 6 }}>
            <View style={[styles.phaseBadge, { backgroundColor: accentBg }]}>
              <Text style={[styles.phaseLabel, { color: accent, fontSize: typography.xs }]}>
                {ctx.label}
              </Text>
            </View>
            {daysUntilPeriod != null && !isOnPeriod && (
              <Text style={[styles.daysUntil, { color: colors.textSecondary, fontSize: typography.sm }]}>
                {daysUntilPeriod === 0
                  ? 'دوره احتمالاً امروز شروع می‌شود'
                  : `${daysUntilPeriod} روز تا دوره`}
              </Text>
            )}
            {isOnPeriod && (
              <Text style={[styles.daysUntil, { color: colors.menstrual, fontSize: typography.sm, fontWeight: '700' }]}>
                دوره جاری 🩸
              </Text>
            )}
          </View>
        </View>

        {/* Interpretation line */}
        <View style={[styles.interpretLine, { backgroundColor: accentBg, marginTop: spacing[4] }]}>
          <Text style={[styles.interpretText, { color: accent, fontSize: typography.sm }]}>
            {ctx.interpretation}
          </Text>
        </View>
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  cycleDayNum: {
    fontWeight: '900',
    letterSpacing: -1,
    lineHeight: 42,
  },
  cycleDayLabel: {
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  phaseBadge: {
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  phaseLabel: {
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  daysUntil: {
    fontWeight: '500',
  },
  interpretLine: {
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  interpretText: {
    fontWeight: '600',
    lineHeight: 20,
  },
  ctaBtn: {
    borderRadius: 4,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
});
