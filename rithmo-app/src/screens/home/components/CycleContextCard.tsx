/**
 * CycleContextCard — Home's hero status card.
 *
 * Answers: "چه اتفاقی در بدنم در حال وقوع است؟" (what's happening in my
 * body right now?)
 *
 * The backend is the source of truth for FACTS (phase, cycle day, dates,
 * confidence). All user-facing text is localized Persian from
 * utils/phaseCopy, all numerals are Persian digits. 'unknown' is the
 * deliberate no-data state — this card never invents a phase.
 */
import React, { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@hooks/useTheme';
import { toFa, faDateShort } from '@utils/persian';
import { PHASE_COPY, CONFIDENCE_PERSIAN } from '@utils/phaseCopy';
import type { CyclePhase } from '@types/period.types';

const PHASE_ACCENT_KEY: Record<CyclePhase, string> = {
  menstrual: 'menstrual',
  follicular: 'follicular',
  ovulation: 'ovulation',
  luteal: 'luteal',
  expected: 'info',
  late: 'warning',
  overdue: 'warning',
  unknown: 'primary',
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
  isFertileWindow?: boolean;
  predictedNextPeriod?: string | null;
  confidenceLabel?: string | null;
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
  isFertileWindow = false,
  predictedNextPeriod = null,
  confidenceLabel = null,
  onPress,
  onRetry,
  onStartTracking,
}: CycleContextCardProps) {
  const { colors, typography, borderRadius, shadow } = useTheme();

  const phaseNorm = (Object.keys(PHASE_COPY) as CyclePhase[]).includes(phase as CyclePhase)
    ? (phase as CyclePhase)
    : 'unknown';
  const ctx = PHASE_COPY[phaseNorm];
  const accentKey = PHASE_ACCENT_KEY[phaseNorm];
  const accent = (colors as any)[accentKey] ?? colors.primary;
  const accentBg = (colors as any)[`${accentKey}Bg`] ?? `${accent}1A`;
  const accentBorder = (colors as any)[`${accentKey}Border`] ?? `${accent}4D`;

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: borderRadius.xl,
            padding: 28,
            ...shadow.sm,
          },
        ]}
      >
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  // ── Error / no tracking yet (warm, action-oriented) ───────────────────────
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
            borderRadius: borderRadius.xl,
            borderStyle: 'dashed',
            borderWidth: 1.5,
            padding: 24,
            alignItems: 'center',
            ...shadow.xs,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={hasError ? 'تلاش دوباره' : 'ثبت اولین دوره'}
      >
        <Text style={{ fontSize: 30 }}>{hasError ? '🌙' : '🌱'}</Text>
        <Text
          style={[styles.noDataTitle, { color: colors.textPrimary, fontSize: typography.body }]}
        >
          {hasError ? 'مشکلی در بارگذاری پیش آمد' : 'هنوز داده‌ای از چرخه‌ات نداریم'}
        </Text>
        <Text
          style={[
            styles.noDataBody,
            { color: colors.textSecondary, fontSize: typography.bodySmall, lineHeight: 20 },
          ]}
        >
          {hasError
            ? 'لحظه‌ای صبر کن و دوباره تلاش کن.'
            : 'با ثبت اولین دوره، ریتمو شروع به شناختن چرخه‌ات می‌کند.'}
        </Text>
        <View
          style={[
            styles.ctaBtn,
            { backgroundColor: colors.primary, borderRadius: borderRadius.md },
          ]}
        >
          <Text style={{ color: colors.textOnPrimary, fontWeight: '700', fontSize: typography.label }}>
            {hasError ? 'تلاش دوباره' : 'ثبت اولین دوره'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  // ── Interpretation line (phase-specific, late/overdue carry the count) ───
  let interpretation = ctx.description;
  if (phaseNorm === 'late' && daysOverdue != null) {
    interpretation = `دوره ${toFa(daysOverdue)} روز دیرتر از پیش‌بینی شروع شده است.`;
  } else if (phaseNorm === 'overdue' && daysOverdue != null) {
    interpretation = `دوره هنوز شروع نشده — ${toFa(daysOverdue)} روز از پیش‌بینی گذشته است.`;
  }

  // ── Main hero card ────────────────────────────────────────────────────────
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.88}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: borderRadius.xl,
          ...shadow.sm,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`روز ${cycleDay ? toFa(cycleDay) : ''} چرخه، ${ctx.name}`}
    >
      <View style={{ padding: 18 }}>
        {/* Cycle day + phase pill */}
        <View style={styles.topRow}>
          <View style={styles.dayBlock}>
            {cycleDay ? (
              <Text
                style={[styles.dayNum, { color: colors.textPrimary, fontSize: typography['3xl'] || 40 }]}
              >
                {toFa(cycleDay)}
              </Text>
            ) : (
              <Text style={{ fontSize: 38, lineHeight: 48 }}>{ctx.emoji}</Text>
            )}
            <Text style={[styles.dayLabel, { color: colors.textTertiary, fontSize: typography.label }]}>
              {cycleDay ? 'روز چرخه' : 'وضعیت چرخه'}
            </Text>
          </View>

          <View style={styles.phaseCol}>
            <View
              style={[
                styles.phasePill,
                { backgroundColor: accentBg, borderColor: accentBorder },
              ]}
            >
              <Text style={styles.phaseEmoji}>{ctx.emoji}</Text>
              <Text style={[styles.phaseName, { color: accent, fontSize: typography.caption }]}>
                {ctx.name}
              </Text>
            </View>
            {isFertileWindow && (
              <View
                style={[
                  styles.phasePill,
                  {
                    backgroundColor: colors.ovulationBg,
                    borderColor: colors.ovulationBorder,
                    marginTop: 6,
                  },
                ]}
              >
                <Text style={[styles.phaseName, { color: colors.ovulation, fontSize: typography.overline }]}>
                  ✦ پنجره‌ی باروری
                </Text>
              </View>
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
              borderRadius: borderRadius.md,
              marginTop: 14,
            },
          ]}
        >
          <Text style={[styles.interpretText, { color: accent, fontSize: typography.bodySmall, lineHeight: 20 }]}>
            {interpretation}
          </Text>
        </View>

        {/* Days-until / predicted / confidence row */}
        <View style={styles.bottomRow}>
          {isOnPeriod ? (
            <View style={[styles.infoChip, { backgroundColor: colors.menstrualBg }]}>
              <Text style={{ color: colors.menstrual, fontSize: typography.caption, fontWeight: '700' }}>
                🩸 در روزهای دوره
              </Text>
            </View>
          ) : (phaseNorm === 'late' || phaseNorm === 'overdue') ? (
            <View style={[styles.infoChip, { backgroundColor: accentBg }]}>
              <Text style={{ color: accent, fontSize: typography.caption, fontWeight: '700' }}>
                ⏳ از تاریخ پیش‌بینی گذشته
              </Text>
            </View>
          ) : daysUntilPeriod != null ? (
            <View style={[styles.infoChip, { backgroundColor: colors.surfaceSecondary }]}>
              <Text style={{ color: colors.textSecondary, fontSize: typography.caption, fontWeight: '600' }}>
                {daysUntilPeriod === 0
                  ? 'دوره احتمالا امروز شروع می‌شود'
                  : `${toFa(daysUntilPeriod)} روز تا دوره بعدی`}
              </Text>
            </View>
          ) : null}

          {predictedNextPeriod && !isOnPeriod && (
            <View style={[styles.infoChip, { backgroundColor: colors.surfaceSecondary }]}>
              <Text style={{ color: colors.textSecondary, fontSize: typography.caption, fontWeight: '600' }}>
                📅 {faDateShort(predictedNextPeriod)}
              </Text>
            </View>
          )}

          {confidenceLabel && CONFIDENCE_PERSIAN[confidenceLabel] ? (
            <View style={[styles.infoChip, { backgroundColor: colors.surfaceSecondary, flexDirection: 'row', alignItems: 'center', gap: 4 }]}>
              <Icon name="shield-check-outline" size={13} color={colors.textTertiary} />
              <Text style={{ color: colors.textTertiary, fontSize: typography.caption, fontWeight: '600' }}>
                دقت: {CONFIDENCE_PERSIAN[confidenceLabel]}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: { borderWidth: 1, overflow: 'hidden' },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  dayBlock: { justifyContent: 'center' },
  dayNum: { fontWeight: '800', letterSpacing: -1, lineHeight: 48 },
  dayLabel: { fontWeight: '600', marginTop: 2 },
  phaseCol: { alignItems: 'flex-end', gap: 6 },
  phasePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9999,
    borderWidth: 1,
    alignSelf: 'flex-end',
  },
  phaseEmoji: { fontSize: 14 },
  phaseName: { fontWeight: '700' },
  interpretLine: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  interpretText: { fontWeight: '600' },
  bottomRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  infoChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
    flexDirection: 'row',
    alignItems: 'center',
  },
  noDataTitle: { fontWeight: '700', marginTop: 10, textAlign: 'center' },
  noDataBody: { textAlign: 'center', marginTop: 6 },
  ctaBtn: {
    marginTop: 14,
    paddingHorizontal: 22,
    paddingVertical: 10,
    alignItems: 'center',
  },
});
