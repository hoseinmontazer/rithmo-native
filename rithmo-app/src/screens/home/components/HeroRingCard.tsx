/**
 * HeroRingCard — Home's headline "where am I" element.
 *
 * Replaces the dark greeting banner + CycleContextStrip/PregnancyContextStrip
 * pairing with one card: a solid circle stating the day count (cycle day, or
 * gestational week during pregnancy) beside a plain-language status line. A
 * flat count, not a fraction of a total — there is no arc/progress math to
 * misrepresent, so the same honesty rule CycleContextStrip enforced still
 * holds by construction:
 *
 *   - No cycle data yet -> no circle, one line + a "log a period" CTA.
 *   - Cycle known but no prediction yet -> the circle shows the day count on
 *     its own; the line below says a prediction isn't available yet, rather
 *     than guessing a cycle length to imply one.
 *   - Prediction known -> the line below states days-until-next-period in
 *     words, from the same number the day count itself is drawn from.
 *   - Pregnant -> the circle shows the gestational week.
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
import { StyleSheet, Text, TouchableOpacity, View, Animated, Easing } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '@hooks/useTheme';
import { textRoles } from '@theme/typography';
import { toFa, faDateShort } from '@utils/persian';
import { todayISO } from '@utils/dateUtils';
import { phasePlainLabel, phaseDescription } from '@i18n';
import { Card, PressScale } from '@components/ui';
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

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const FancyCircle = memo(function FancyCircle({ progressPct, themeColor, gradientColors, size = 150, big, bigLabel }: any) {
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const { colors, typography } = useTheme();
  
  const animatedProgress = React.useRef(new Animated.Value(0)).current;
  const pulseAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: progressPct,
      duration: 1200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    Animated.loop(
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true, // View transform/opacity supports native driver
      })
    ).start();
  }, [progressPct, animatedProgress, pulseAnim]);

  const strokeDashoffset = animatedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0]
  });

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.15]
  });

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0.6, 0.4, 0]
  });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Ripple/Pulse Effect behind the ring */}
      <Animated.View style={{
        position: 'absolute',
        width: size,
        height: size,
        transform: [{ scale: pulseScale }],
        opacity: pulseOpacity,
      }}>
        <Svg width={size} height={size}>
          <Circle
            stroke={gradientColors ? gradientColors[1] : themeColor}
            fill="none"
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
          />
        </Svg>
      </Animated.View>

      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={gradientColors ? gradientColors[0] : themeColor} stopOpacity="1" />
            <Stop offset="100%" stopColor={gradientColors ? gradientColors[1] : themeColor} stopOpacity={gradientColors ? "1" : "0.4"} />
          </LinearGradient>
        </Defs>
        <Circle
          stroke={colors.borderSubtle}
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        <AnimatedCircle
          stroke="url(#grad)"
          fill="none"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
          <Text style={{ color: themeColor, fontSize: 48, fontWeight: '800' }}>{big}</Text>
        <Text style={{ color: colors.textSecondary, fontSize: typography.bodySmall, fontWeight: '600', marginTop: 4 }}>{bigLabel}</Text>
      </View>
    </View>
  );
});

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
          {
            backgroundColor: colors.surfaceSecondary,
            borderColor: colors.border,
            borderRadius: borderRadius['2xl'],
            padding: spacing[5],
          },
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

  let big = '';
  let bigLabel = '';
  let tag = '';
  let title = '';
  let sub = '';

  if (isPregnant && pregnancy) {
    const week = pregnancy.gestational_week ?? 0;
    const trimester = pregnancy.trimester ?? 1;
    big = toFa(week);
    bigLabel = 'هفته';
    tag = 'بارداری';
    title = `هفته ${toFa(week)} — ${TRIMESTER_LABEL_FA[trimester] ?? TRIMESTER_LABEL_FA[1]}`;
    sub = 'ثبت روزانه مثل قبل ادامه دارد؛ پیش‌بینی چرخه موقتاً متوقف است.';
  } else if (isToday && cycle) {
    const day = cycle.cycle_day ?? 0;
    const daysUntil = cycle.days_until_next_period;
    const knownTotal = typeof daysUntil === 'number' && daysUntil > 0 ? day + daysUntil : null;
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
    big = day != null ? toFa(day) : '—';
    bigLabel = 'روز چرخه';
    tag = (dayType && PHASE_TAG_FA[dayType]) || 'بدون داده';
    title = `${faDateShort(selectedDate)} — ${tag}`;
    sub = dayType
      ? `این روز در فاز «${tag}» چرخه‌ات بوده است.`
      : 'برای این روز داده‌ای ثبت نشده است.';
  }

  let progressPct = 0;
  if (isPregnant && pregnancy) {
    const week = pregnancy.gestational_week ?? 0;
    progressPct = week / 40;
  } else if (isToday && cycle) {
    const day = cycle.cycle_day ?? 0;
    const daysUntil = cycle.days_until_next_period;
    const knownTotal = typeof daysUntil === 'number' && daysUntil > 0 ? day + daysUntil : 28;
    progressPct = day > 0 ? day / knownTotal : 0;
  } else {
    const periodsArr = (periods as any[]) ?? [];
    const day = cycleDayForDate(selectedDate, periodsArr);
    progressPct = day != null ? day / 28 : 0;
  }
  progressPct = Math.min(1, Math.max(0, progressPct));

  let themeColor = colors.primary;
  let gradientColors = ['#0E5F72', '#89C6CD'];

  if (isPregnant) {
    themeColor = colors.primary;
  } else if (cycle?.is_on_period) {
    themeColor = colors.menstrual;
    gradientColors = [colors.menstrual, '#F06284']; // Matching vibrant tone
  } else if (cycle?.is_fertile_window) {
    themeColor = colors.ovulation;
    gradientColors = [colors.ovulation, '#B893E3'];
  } else if (cycle?.pattern_phase === 'luteal' || cycle?.phase === 'luteal') {
    themeColor = colors.luteal;
    gradientColors = [colors.luteal, '#EDB563'];
  } else {
    themeColor = colors.follicular;
  }

  const a11y = [tag, title, sub].filter(Boolean).join('، ');

  return (
    <PressScale onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y}>
      <Card
        rounded="2xl"
        elevated
        style={[
          styles.card,
          {
            padding: spacing[5],
            backgroundColor: colors.surface,
          },
        ]}
      >
        <View style={{ alignItems: 'center', marginVertical: spacing[4] }}>
          <FancyCircle progressPct={progressPct} themeColor={themeColor} gradientColors={gradientColors} size={150} big={big} bigLabel={bigLabel} />
        </View>

        <View style={{ alignItems: 'center', marginBottom: spacing[4] }}>
          <View
            style={[
              styles.tagPill,
              {
                backgroundColor: colors.surfaceSecondary,
                borderColor: colors.borderSubtle,
                borderWidth: 1,
                borderRadius: borderRadius.pill,
              },
            ]}
          >
            <Text style={{ color: themeColor, fontSize: typography.bodySmall, fontWeight: '700' }}>{tag}</Text>
          </View>
        </View>

        <Text
          style={{
            color: colors.textPrimary,
            fontSize: textRoles.cardTitle.fontSize,
            fontWeight: '700',
            textAlign: 'center',
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
            textAlign: 'center',
          }}
          numberOfLines={2}
        >
          {sub}
        </Text>
      </Card>
    </PressScale>
  );
});

const styles = StyleSheet.create({
  card: { overflow: 'hidden' },
  emptyCard: { borderWidth: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  tagPill: { paddingHorizontal: 12, paddingVertical: 6 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
