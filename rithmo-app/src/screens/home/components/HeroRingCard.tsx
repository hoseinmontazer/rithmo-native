/**
 * HeroRingCard — Home's headline "where am I" element.
 *
 * Replaces the dark greeting banner + CycleContextStrip/PregnancyContextStrip
 * pairing with one card: a progress ring (cycle day, or gestational week
 * during pregnancy) beside a plain-language status line. Same honesty rules
 * CycleContextStrip already enforced — carried here, not relaxed, because the
 * ring makes it easier to imply a number that isn't real:
 *
 *   - No cycle data yet -> no ring, one line + a "log a period" CTA.
 *   - Cycle known but no prediction yet -> the ring shows the day count with
 *     an empty arc rather than guessing a cycle length to divide by.
 *   - Prediction known -> the arc is cycle_day / (cycle_day +
 *     days_until_next_period), i.e. derived from the same two numbers the
 *     line below it states in words, never a separate assumed constant.
 *   - Pregnant -> gestational_week / 40, the standard full-term denominator.
 *
 * Reacts to the day strip's shared selection (`selectedDateStore`):
 *   - Selection === today -> unchanged, driven by the backend's today-only
 *     `/intelligence/today/` context (richer and more accurate than
 *     anything computed here — never replaced).
 *   - Selection !== today -> day number and phase are computed client-side
 *     from the raw periods list (`cycleDayForDate` / `buildCycleDateMap`,
 *     the same functions the Cycle calendar itself uses), because the
 *     backend's today-only context has nothing to say about another day.
 *     Pregnancy is not date-scrubbable this way: a gestational week is
 *     inherently "as of now", not a property of an arbitrary past day, so
 *     the pregnant hero always shows the current week regardless of the
 *     strip's selection (matching the design spec's own pregnancy section,
 *     which only changes the strip's color-coding, not the hero).
 */
import React, { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@hooks/useTheme';
import { textRoles } from '@theme/typography';
import { toFa, faDateShort } from '@utils/persian';
import { todayISO } from '@utils/dateUtils';
import { phasePlainLabel, phaseDescription } from '@i18n';
import { GradientSurface, PressScale } from '@components/ui';
import { CircularProgress } from '@components/ui/CircularProgress';
import { usePeriods } from '@hooks/queries/usePeriods';
import { useSelectedDateStore } from '@store/selectedDateStore';
import { buildCycleDateMap, cycleDayForDate, type DayType } from '@utils/cycleDayMap';
import type { CycleContextPayload } from '@types/intelligence.types';
import type { PregnancyStatus } from '@types/pregnancy.types';

const TRIMESTER_LABEL_FA: Record<number, string> = {
  1: 'سه‌ماهه اول',
  2: 'سه‌ماهه دوم',
  3: 'سه‌ماهه سوم',
};

const PHASE_TAG_FA: Partial<Record<DayType, string>> = {
  period: 'پریود',
  follicular: 'فاز فولیکولی',
  ovulation: 'پنجرهٔ باروری',
  luteal: 'فاز لوتئال',
  pms: 'فاز لوتئال',
  predicted_period: 'پریود پیش‌بینی‌شده',
  late: 'پریود پیش‌بینی‌شده',
};

interface Props {
  cycle?: CycleContextPayload | null;
  pregnancy?: PregnancyStatus | null;
  onPress: () => void;
  onStartTracking: () => void;
}

export const HeroRingCard = memo(function HeroRingCard({
  cycle,
  pregnancy,
  onPress,
  onStartTracking,
}: Props) {
  const { colors, spacing, borderRadius, typography } = useTheme();
  const { data: periods } = usePeriods();
  const selectedDate = useSelectedDateStore((s) => s.selectedDate);

  const isPregnant = Boolean(pregnancy?.has_active_pregnancy);
  const today = todayISO();
  const isToday = selectedDate === today;

  // ── No cycle data at all — same honest empty state CycleContextStrip used. ─
  if (!isPregnant && (!cycle || !cycle.is_known)) {
    return (
      <TouchableOpacity
        onPress={onStartTracking}
        activeOpacity={0.85}
        style={[
          styles.emptyCard,
          { backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius['2xl'], padding: spacing[5] },
        ]}
        accessibilityRole="button"
        accessibilityLabel="ثبت اولین دوره برای شروع دنبال‌کردن چرخه"
      >
        <Text style={{ color: colors.textPrimary, fontSize: typography.body, fontWeight: '700' }}>
          هنوز چرخه‌ای ثبت نشده
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: typography.bodySmall, marginTop: spacing[1] }}>
          یک دوره ثبت کن تا بتوانم روزهای چرخه‌ات را نشان بدهم.
        </Text>
        <View style={[styles.linkRow, { marginTop: spacing[3] }]}>
          <Text style={{ color: colors.primary, fontSize: typography.bodySmall, fontWeight: '700' }}>
            ثبت دوره
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  let ringProgress = 0;
  let big = '';
  let bigLabel = '';
  let tag = '';
  let title = '';
  let sub = '';

  if (isPregnant && pregnancy) {
    const week = pregnancy.gestational_week ?? 0;
    const trimester = pregnancy.trimester ?? 1;
    ringProgress = Math.min(100, Math.max(0, (week / 40) * 100));
    big = toFa(week);
    bigLabel = 'هفته';
    tag = 'بارداری';
    title = `هفته ${toFa(week)} — ${TRIMESTER_LABEL_FA[trimester] ?? TRIMESTER_LABEL_FA[1]}`;
    sub = 'ثبت روزانه مثل قبل ادامه دارد؛ پیش‌بینی چرخه موقتاً متوقف است.';
  } else if (isToday && cycle) {
    const day = cycle.cycle_day ?? 0;
    const daysUntil = cycle.days_until_next_period;
    const knownTotal = typeof daysUntil === 'number' && daysUntil > 0 ? day + daysUntil : null;
    ringProgress = knownTotal ? Math.min(100, Math.max(0, (day / knownTotal) * 100)) : 0;
    big = day > 0 ? toFa(day) : '—';
    bigLabel = 'روز چرخه';
    tag = cycle.is_on_period
      ? 'در حال قاعدگی'
      : cycle.is_fertile_window
        ? 'پنجرهٔ باروری'
        : phasePlainLabel(cycle.pattern_phase || cycle.phase);
    // A real sentence, not the tag repeated as the headline — phaseDescription
    // already exists for exactly this (CycleAnalysisScreen uses it too), so
    // this reuses it rather than re-deriving phase copy a second time.
    title = phaseDescription(cycle.pattern_phase || cycle.phase, cycle.cycle_day, cycle.days_until_next_period);
    sub = knownTotal
      ? `${toFa(daysUntil as number)} روز تا دورهٔ بعد.`
      : 'هنوز برای پیش‌بینی طول چرخه، داده‌ی کافی نیست.';
  } else {
    // A day other than today, selected on the day strip — computed
    // client-side from the raw periods list, same functions the Cycle
    // calendar uses, so this can never disagree with that screen.
    const periodsArr = (periods as any[]) ?? [];
    const cycleMap = buildCycleDateMap(periodsArr);
    const dayType = cycleMap.get(selectedDate)?.type;
    const day = cycleDayForDate(selectedDate, periodsArr);
    const avgCycleLen = typeof cycle?.usable_cycles === 'number' && cycle.usable_cycles > 0
      ? cycle.days_until_next_period != null && cycle.cycle_day != null
        ? cycle.cycle_day + cycle.days_until_next_period
        : null
      : null;

    ringProgress = day != null && avgCycleLen ? Math.min(100, Math.max(0, (day / avgCycleLen) * 100)) : 0;
    big = day != null ? toFa(day) : '—';
    bigLabel = 'روز چرخه';
    tag = (dayType && PHASE_TAG_FA[dayType]) || 'بدون داده';
    title = `${faDateShort(selectedDate)} — ${tag}`;
    sub = dayType
      ? `این روز در فاز «${tag}» چرخه‌ات بوده است.`
      : 'برای این روز داده‌ای ثبت نشده است.';
  }

  const a11y = [tag, title, sub].filter(Boolean).join('، ');

  return (
    <PressScale onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y}>
      <GradientSurface
        colors={[colors.surface, colors.primaryLighter]}
        borderRadius={borderRadius['2xl']}
        style={[styles.card, { padding: spacing[5] }]}
      >
        <View style={styles.row}>
          <CircularProgress
            progress={ringProgress}
            size={104}
            strokeWidth={8}
            colors={[colors.primary, colors.primary]}
            backgroundColor={colors.primaryLight}
          >
            <Text style={{ color: colors.textPrimary, fontSize: 27, fontWeight: '700' }}>{big}</Text>
            <Text style={{ color: colors.primaryDark, fontSize: 10.5, marginTop: 2 }}>{bigLabel}</Text>
          </CircularProgress>

          <View style={styles.textCol}>
            <View style={[styles.tagPill, { backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: borderRadius.pill }]}>
              <Text style={{ color: colors.primaryDark, fontSize: 11, fontWeight: '600' }}>{tag}</Text>
            </View>
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: textRoles.cardTitle.fontSize,
                fontWeight: '600',
                marginTop: spacing[2],
              }}
              numberOfLines={2}
            >
              {title}
            </Text>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: typography.bodySmall,
                lineHeight: 20,
                marginTop: spacing[1],
              }}
              numberOfLines={2}
            >
              {sub}
            </Text>
          </View>
        </View>
      </GradientSurface>
    </PressScale>
  );
});

const styles = StyleSheet.create({
  card: { overflow: 'hidden' },
  emptyCard: {},
  row: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  textCol: { flex: 1 },
  tagPill: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
