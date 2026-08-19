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

// ── Phase interpretation map ──────────────────────────────────────────────────
// User-facing language: personal, non-medical, observational.
// Keys cover every phase the backend can send (see CyclePhase).  'unknown'
// is the deliberate fallback — the card never invents a follicular phase.

const PHASE_CONTEXT: Record<string, {
  label: string;          // non-medical user-facing label
  accent: string;         // key in colors
  interpretation: string; // what this phase typically means for the user
}> = {
  menstrual: {
    label: 'روزهای دوره',
    accent: 'menstrual',
    interpretation: 'معمولا‌ً روزهایی برای استراحت و آرامش',
  },
  follicular: {
    label: 'فاز فولیکولار',
    accent: 'follicular',
    interpretation: 'انرژی و تمرکز در حال افزایش است',
  },
  ovulation: {
    label: 'پنجره باروری و تخمک‌گذاری',
    accent: 'ovulation',
    interpretation: 'اوج انرژی و بهترین روزهای سیکل',
  },
  luteal: {
    label: 'فاز لوتئال',
    accent: 'luteal',
    interpretation: 'روزهای پایانی سیکل و افت تدریجی انرژی',
  },
  expected: {
    label: 'شروع دوره نزدیک است',
    accent: 'info',
    interpretation: 'دوره شما در روزهای خیلی نزدیک پیش‌بینی شده است',
  },
  late: {
    label: 'دوره دیر شده',
    accent: 'warning',
    interpretation: 'چند روز از تاریخ پیش‌بینی شروع دوره گذشته است',
  },
  overdue: {
    label: 'دوره با تأخیر زیاد',
    accent: 'menstrual',
    interpretation: 'چند روز از تاریخ پیش‌بینی شروع دوره گذشته است',
  },
  unknown: {
    label: 'وضعیت سیکل',
    accent: 'info',
    interpretation: 'هنوز داده‌ای برای تحلیل ثبت نشده است',
  },
};

interface CycleContextCardProps {
  isLoading: boolean;
  hasData: boolean;
  hasError: boolean;
  cycleDay: number | null;
  phase: string;
  daysUntilPeriod: number | null;
  daysOverdue: number | null;
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
  daysOverdue,
  isOnPeriod,
  onPress,
  onRetry,
  onStartTracking,
}: CycleContextCardProps) {
  const { colors, spacing, typography, borderRadius, shadow } = useTheme();
  // 'unknown' fallback — never invent a follicular phase for missing data.
  const ctx = PHASE_CONTEXT[phase] ?? PHASE_CONTEXT.unknown;
  const accent = (colors as any)[ctx.accent] ?? colors.primary;
  const accentBg = (colors as any)[`${ctx.accent}Bg`] ?? (accent + '15');
  const accentBorder = (colors as any)[`${ctx.accent}Border`] ?? (accent + '40');

  // Late/overdue: the interpretation line carries the overdue count.
  let interpretation = ctx.interpretation;
  if ((phase === 'late' || phase === 'overdue') && daysOverdue != null) {
    interpretation = `${daysOverdue} روز از تاریخ پیش‌بینی شروع دوره گذشته است`;
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: borderRadius.large,
            padding: spacing[6],
          },
        ]}
      >
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  // ── No tracking yet ───────────────────────────────────────────────────────
  if (!hasData || hasError) {
    return (
      <TouchableOpacity
        onPress={hasError ? onRetry : onStartTracking}
        activeOpacity={0.8}
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: borderRadius.large,
            borderStyle: 'dashed',
            padding: spacing[5],
            alignItems: 'center',
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={hasError ? 'تلاش دوباره' : 'شروع ردیابی'}
      >
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: typography.body,
            textAlign: 'center',
            lineHeight: 22,
          }}
        >
          {hasError
            ? 'مشکلی در بارگذاری اطلاعات پیش آمد. لمس کنید تا دوباره تلاش شود.'
            : 'برای شروع، آخرین دوره‌ات را ثبت کن.'}
        </Text>
        <View
          style={[
            styles.ctaBtn,
            {
              backgroundColor: colors.surfaceSubtle,
              borderColor: colors.borderSubtle,
              borderRadius: borderRadius.medium,
              marginTop: spacing[3],
            },
          ]}
        >
          <Text style={{ color: colors.primary, fontWeight: '700', fontSize: typography.label }}>
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
      accessibilityLabel={`روز ${cycleDay ?? ''} سیکل، ${ctx.label}`}
    >
      {/* Accent top bar */}
      <View style={[styles.accentBar, { backgroundColor: accent }]} />

      <View style={{ padding: spacing[4] }}>
        {/* Cycle day + phase label row */}
        <View style={styles.topRow}>
          {cycleDay ? (
            <View>
              <Text style={[styles.cycleDayNum, { color: colors.textPrimary, fontSize: typography.display }]}>
                {cycleDay}
              </Text>
              <Text style={[styles.cycleDayLabel, { color: colors.textTertiary, fontSize: typography.label }]}>
                روز سیکل
              </Text>
            </View>
          ) : null}

          <View style={[styles.phaseRightCol, !cycleDay && styles.phaseRightColSolo]}>
            <View
              style={[
                styles.phaseBadge,
                {
                  backgroundColor: accentBg,
                  borderColor: accentBorder,
                  borderRadius: borderRadius.pill,
                },
              ]}
            >
              <View style={[styles.phaseDot, { backgroundColor: accent }]} />
              <Text style={[styles.phaseLabel, { color: accent, fontSize: typography.caption }]}>
                {ctx.label}
              </Text>
            </View>

            {(phase === 'late' || phase === 'overdue') ? (
              <Text style={[styles.daysUntil, { color: accent, fontSize: typography.bodySmall, fontWeight: '700' }]}>
                {daysOverdue != null
                  ? `${daysOverdue} روز از پیش‌بینی گذشته است`
                  : 'دوره از تاریخ پیش‌بینی گذشته است'}
              </Text>
            ) : daysUntilPeriod != null && !isOnPeriod ? (
              <Text style={[styles.daysUntil, { color: colors.textSecondary, fontSize: typography.bodySmall }]}>
                {daysUntilPeriod === 0
                  ? 'دوره احتمالا‌ً امروز شروع می‌شود'
                  : `${daysUntilPeriod} روز تا دوره بعدی`}
              </Text>
            ) : null}

            {isOnPeriod && (
              <Text style={[styles.daysUntil, { color: colors.menstrual, fontSize: typography.bodySmall, fontWeight: '700' }]}>
                دوره جاری 🩸
              </Text>
            )}
          </View>
        </View>

        {/* Interpretation line */}
        <View
          style={[
            styles.interpretLine,
            {
              backgroundColor: accentBg,
              borderColor: accentBorder,
              borderRadius: borderRadius.medium,
              marginTop: spacing[3],
            },
          ]}
        >
          <Text style={[styles.interpretText, { color: accent, fontSize: typography.bodySmall }]}>
            {interpretation}
          </Text>
        </View>
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  phaseRightCol: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 6,
  },
  phaseRightColSolo: {
    alignItems: 'flex-start',
  },
  cycleDayNum: {
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 36,
  },
  cycleDayLabel: {
    fontWeight: '600',
    marginTop: 2,
  },
  phaseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  phaseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 4,
  },
  phaseLabel: {
    fontWeight: '600',
  },
  daysUntil: {
    fontWeight: '500',
  },
  interpretLine: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  interpretText: {
    fontWeight: '600',
    lineHeight: 18,
  },
  ctaBtn: {
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
});

