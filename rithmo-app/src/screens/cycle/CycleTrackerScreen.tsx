import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Dimensions,
  PanResponder,
  Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@hooks/useTheme';
import {
  toJalali,
  fromJalali,
  jalaliMonthLength,
  jalaliWeekColumn,
  JALALI_MONTHS,
  JALALI_GRID_WEEKDAYS,
} from '@utils/jalali';
import { screen } from '@theme/spacing';
import { usePeriods } from '@hooks/queries/usePeriods';
import { useProfile } from '@hooks/queries/useProfile';
import { useReducedMotion } from '@hooks/useReducedMotion';
import { Card, Badge, Button, Icon, LoadingState, EmptyState } from '@components/ui';
import { PeriodQuickEditSheet } from '@components/cycle/PeriodQuickEditSheet';
import { formatDateISO } from '@utils/dateUtils';
import { toFa, faDateShort, faDate } from '@utils/persian';
import { buildCycleDateMap } from '@utils/cycleDayMap';
import {
  calendarCellA11yLabel,
  describeCalendarDay,
  describePeriodSpan,
  type PeriodDayDescription,
} from '@utils/periodCalendar';
import { useSelectedDateStore } from '@store/selectedDateStore';
import type { CycleStackParamList } from '@navigation/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<CycleStackParamList, 'CycleTracker'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// The Iranian week begins on شنبه. This used to start on یکشنبه while the
// grid offset by `Date.getDay()` (Sunday-first), so every column was shifted.
const WEEK_DAYS = JALALI_GRID_WEEKDAYS;

type ViewMode = 'calendar' | 'list';

/** Returns next period date only if after end_date */
function safeNextPeriod(period: any): string | null {
  const next = period.next_period_start_date;
  const end = period.end_date;
  if (!next) return null;
  if (end && next <= end) return null;
  return next;
}

// ── Calendar component ────────────────────────────────────────────────────────
function CycleCalendar({
  periods,
  selectedDate,
  onDayPress,
  getScrollInner,
  onRevealRow,
}: {
  periods: any[];
  isMaleWithPartner: boolean;
  selectedDate: string | null;
  onDayPress: (dateStr: string, periodId: number | null) => void;
  /** The ScrollView's inner view, to measure a row against. */
  getScrollInner: () => any;
  /** Called with the selected week row's y (in scroll content) so the screen can keep it above the docked panel. */
  onRevealRow: (y: number) => void;
}) {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const today = new Date();
  const todayStr = formatDateISO(today);
  const reduceMotion = useReducedMotion();
  const reduceMotionRef = useRef(false);
  reduceMotionRef.current = reduceMotion;

  // The calendar's cursor is a JALALI (year, month) — months 1-12.
  //
  // It used to be a Gregorian (year, month 0-11), so the grid was a Gregorian
  // month labelled with whichever Jalali month contained its 1st. Storage is
  // untouched: every cell is still a real `Date` and still keys into the day
  // map through `formatDateISO`, so no API contract changes here.
  const todayJ = toJalali(today);
  const [displayYear, setDisplayYear] = useState(todayJ.jy);
  const [displayMonth, setDisplayMonth] = useState(todayJ.jm);

  // Keep refs in sync for PanResponder
  const displayMonthRef = useRef(todayJ.jm);
  const displayYearRef = useRef(todayJ.jy);

  // Animation values for smooth slide transition
  const slideAnim = useRef(new Animated.Value(0)).current;
  const isAnimating = useRef(false);

  const periodMap = useMemo(() => buildCycleDateMap(periods), [periods]);

  // Allow navigating up to 3 months forward into future
  // Three Jalali months ahead, compared as an absolute month ordinal so the
  // year rollover (Esfand → Farvardin) needs no special case.
  const monthOrdinal = (jy: number, jm: number) => jy * 12 + (jm - 1);
  const isFutureMonth =
    monthOrdinal(displayYear, displayMonth) >= monthOrdinal(todayJ.jy, todayJ.jm) + 3;

  const goToMonth = useCallback((direction: 'prev' | 'next') => {
    if (isAnimating.current) return;
    const now = new Date();
    const currentMonth = displayMonthRef.current;
    const currentYear = displayYearRef.current;
    if (direction === 'next') {
      const nowJ = toJalali(now);
      const ord = (jy: number, jm: number) => jy * 12 + (jm - 1);
      if (ord(currentYear, currentMonth) + 1 > ord(nowJ.jy, nowJ.jm) + 3) { return; }
    }
    // Reduced motion: change the month immediately, no slide.
    if (reduceMotionRef.current) {
      let m = currentMonth;
      let y = currentYear;
      if (direction === 'prev') {
        if (m === 1) { m = 12; y -= 1; } else { m -= 1; }
      } else if (m === 12) { m = 1; y += 1; } else { m += 1; }
      displayMonthRef.current = m;
      displayYearRef.current = y;
      setDisplayMonth(m);
      setDisplayYear(y);
      return;
    }
    isAnimating.current = true;

    const outTo = direction === 'prev' ? SCREEN_WIDTH : -SCREEN_WIDTH;

    Animated.timing(slideAnim, {
      toValue: outTo,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      let newMonth = currentMonth;
      let newYear = currentYear;
      // Jalali months are 1-12, so the rollover bounds are 1 and 12 — not
      // 0 and 11 as they were when this cursor was Gregorian.
      if (direction === 'prev') {
        if (newMonth === 1) { newMonth = 12; newYear -= 1; }
        else { newMonth -= 1; }
      } else {
        if (newMonth === 12) { newMonth = 1; newYear += 1; }
        else { newMonth += 1; }
      }
      displayMonthRef.current = newMonth;
      displayYearRef.current = newYear;
      setDisplayMonth(newMonth);
      setDisplayYear(newYear);

      slideAnim.setValue(-outTo);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        isAnimating.current = false;
      });
    });
  }, [slideAnim]);

  const goToMonthRef = useRef(goToMonth);
  goToMonthRef.current = goToMonth;

  // PanResponder for horizontal swipe
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 12 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.5,
      onPanResponderRelease: (_, gs) => {
        if (gs.dx < -40) goToMonthRef.current('next');
        else if (gs.dx > 40) goToMonthRef.current('prev');
      },
    })
  ).current;

  // Build calendar grid
  const calendarDays = useMemo(() => {
    // Built in JALALI space: the month's real length, and a Saturday-first
    // leading offset. Each cell is still a Gregorian `Date`, produced by
    // `fromJalali`, so everything downstream — the day map, `formatDateISO`,
    // the API — is unchanged.
    const length = jalaliMonthLength(displayYear, displayMonth);
    const first = fromJalali(displayYear, displayMonth, 1);
    const startOffset = jalaliWeekColumn(first);

    const days: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) { days.push(null); }
    for (let d = 1; d <= length; d++) {
      days.push(fromJalali(displayYear, displayMonth, d));
    }
    while (days.length % 7 !== 0) { days.push(null); }
    return days;
  }, [displayYear, displayMonth]);

  // Keep the selected day's week visible above the docked day panel: measure
  // its row against the scroll content and let the screen scroll to it.
  const rowRefs = useRef<(View | null)[]>([]);
  useEffect(() => {
    if (!selectedDate) { return; }
    const idx = calendarDays.findIndex((d) => d && formatDateISO(d) === selectedDate);
    if (idx < 0) { return; }
    const row = rowRefs.current[Math.floor(idx / 7)];
    const inner = getScrollInner();
    if (!row || !inner) { return; }
    const t = setTimeout(() => {
      try {
        row.measureLayout(inner, (_x: number, y: number) => onRevealRow(y), () => {});
      } catch { /* measuring is best-effort */ }
    }, 60);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, calendarDays]);

  // The cursor IS Jalali now, so the label is read straight off it rather than
  // formatted from a Gregorian date and then string-sliced. That slicing was
  // how the grid came to be titled with the Jalali month containing the
  // Gregorian 1st, instead of the month it actually drew.
  const monthLabel = `${JALALI_MONTHS[displayMonth]} ${toFa(displayYear)}`;

  const isToday = (d: Date) => d.toDateString() === today.toDateString();
  const isFuture = (d: Date) => d > today;

  return (
    <Card elevated={false} style={{ marginBottom: spacing[4], padding: spacing[4] }}>
      {/* Month navigation */}
      <View style={styles.monthHeader}>
        <TouchableOpacity
          onPress={() => goToMonth('prev')}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="ماه قبلی"
          style={[styles.monthNavBtn, { backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius.md }]}
        >
          <Icon name="chevron-right" size={20} color={colors.textPrimary} />
        </TouchableOpacity>

        <Text style={[styles.monthTitle, { color: colors.textPrimary, fontSize: typography.base }]}>
          {monthLabel}
        </Text>

        <TouchableOpacity
          onPress={() => goToMonth('next')}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="ماه بعدی"
          disabled={isFutureMonth}
          style={[
            styles.monthNavBtn,
            { backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius.md, opacity: isFutureMonth ? 0.3 : 1 },
          ]}
        >
          <Icon name="chevron-left" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Week day headers */}
      <View style={styles.weekHeaderRow}>
        {WEEK_DAYS.map(d => (
          <View key={d} style={styles.dayCol}>
            <Text style={[styles.weekDayText, { color: colors.textTertiary, fontSize: typography.xs }]}>
              {d}
            </Text>
          </View>
        ))}
      </View>

      {/* Swipeable day grid */}
      <Animated.View
        style={{ transform: [{ translateX: slideAnim }] }}
        {...panResponder.panHandlers}
      >
        {Array.from({ length: calendarDays.length / 7 }, (_, rowIdx) => (
          <View key={rowIdx} style={styles.weekRow} ref={(r) => { rowRefs.current[rowIdx] = r; }}>
            {calendarDays.slice(rowIdx * 7, rowIdx * 7 + 7).map((day, colIdx) => {
              const idx = rowIdx * 7 + colIdx;
              if (!day) {
                return <View key={`empty-${idx}`} style={styles.dayCol} />;
              }

              const dateStr = formatDateISO(day);
              const entry = periodMap.get(dateStr);
              const dayType = entry?.type ?? 'none';
              const isStart = entry?.isStart ?? false;
              const isEnd = entry?.isEnd ?? false;
              const todayDay = isToday(day);
              const future = isFuture(day);
              const selected = selectedDate === dateStr;

              const isPeriod = dayType === 'period';
              const isPredPeriod = dayType === 'predicted_period';
              const isLate = dayType === 'late';
              const isOvulation = dayType === 'ovulation';
              const isPms = dayType === 'pms';
              const isFollic = dayType === 'follicular';

              // ── Visual language (one cue per meaning) ──────────────────
              //  recorded period  → SOLID red circle, light-on-red number
              //                     (+ a soft band joining the logged days)
              //  predicted period → DASHED red ring, no fill, dark number
              //  late             → DASHED amber ring
              //  fertile window   → soft tint, no ring (never louder than a period)
              //  today            → short bar under the number
              //  selected         → solid dark ring AROUND the cell, so the
              //                     day's own fill stays visible
              // Shape (filled vs dashed ring) carries the recorded/predicted
              // difference, so it survives colour-blindness and greyscale.
              const phaseDotColor = isOvulation
                ? colors.ovulation
                : isPms
                ? colors.luteal
                : isFollic
                ? colors.follicular
                : 'transparent';

              const desc = describeCalendarDay(dateStr, todayStr, entry);
              const a11yLabel = calendarCellA11yLabel(
                faDate(day, { weekday: true, year: false }),
                desc,
                { isToday: todayDay, isSelected: selected },
              );

              const numberColor = isPeriod
                ? colors.textOnPrimary
                : isLate
                ? colors.textPrimary
                : future
                // A future day with a phase or prediction carries meaning, so
                // it stays readable; only truly empty future days recede.
                ? (dayType === 'none' ? colors.textDisabled : colors.textSecondary)
                : colors.textPrimary;

              return (
                <TouchableOpacity
                  key={dateStr}
                  onPress={() => onDayPress(dateStr, entry?.periodId ?? null)}
                  activeOpacity={0.75}
                  style={styles.dayCol}
                  accessibilityRole="button"
                  accessibilityLabel={a11yLabel}
                  accessibilityState={{ selected }}
                >
                  {/* Soft band joining the logged days of one period.
                      Logical (start/end) radii: the grid is RTL, so the
                      period's first day is on the RIGHT edge. */}
                  {isPeriod && (
                    <View
                      style={[
                        styles.periodStrip,
                        {
                          backgroundColor: colors.menstrual + '1F',
                          borderTopStartRadius: isStart ? 16 : 0,
                          borderBottomStartRadius: isStart ? 16 : 0,
                          borderTopEndRadius: isEnd ? 16 : 0,
                          borderBottomEndRadius: isEnd ? 16 : 0,
                        },
                      ]}
                    />
                  )}

                  {/* Selection ring, drawn outside the circle */}
                  {selected && (
                    <View
                      pointerEvents="none"
                      style={[styles.selectionRing, { borderColor: colors.textPrimary }]}
                    />
                  )}

                  {/* Day cell circle */}
                  <View
                    style={[
                      styles.dayCircle,
                      isPeriod && { backgroundColor: colors.menstrual },
                      isOvulation && { backgroundColor: colors.ovulation + '26' },
                      isPredPeriod && {
                        borderWidth: 2,
                        borderStyle: 'dashed',
                        borderColor: colors.menstrual,
                      },
                      // Late is a different SHAPE, not just a different hue:
                      // a solid ring plus a "!" badge, so it never reads as a
                      // prediction (dashed red) in greyscale or colour-blindness.
                      isLate && {
                        borderWidth: 2,
                        borderStyle: 'solid',
                        borderColor: colors.warning,
                        backgroundColor: colors.warning + '14',
                      },
                    ]}
                  >
                    {isLate && (
                      <View style={[styles.lateBadge, { backgroundColor: colors.warning, borderColor: colors.surface }]}>
                        <Text style={[styles.lateBadgeText, { color: colors.textOnPrimary }]}>!</Text>
                      </View>
                    )}
                    <Text
                      style={[
                        styles.dayNumber,
                        {
                          fontSize: typography.sm,
                          color: numberColor,
                          fontWeight:
                            todayDay || selected || isPeriod || isPredPeriod || isLate ? '700' : '500',
                        },
                      ]}
                    >
                      {toFa(toJalali(day).jd)}
                    </Text>
                  </View>

                  {/* Today marker: a short bar, so a period fill is never replaced */}
                  {todayDay && (
                    <View style={[styles.todayBar, { backgroundColor: colors.primary }]} />
                  )}

                  {/* Phase dot for estimated phases */}
                  {!isPeriod && !todayDay && (isOvulation || isPms || isFollic) && (
                    <View style={[styles.phaseIndicatorDot, { backgroundColor: phaseDotColor }]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </Animated.View>

      {/* Legend — every swatch is drawn exactly like the cell it explains */}
      <View
        accessible
        accessibilityLabel="راهنما: دایره‌ی توپر قرمز یعنی دوره‌ی ثبت‌شده، حلقه‌ی خط‌چین قرمز یعنی دوره‌ی پیش‌بینی‌شده، حلقه‌ی توپر نارنجی با علامت تعجب یعنی دیرکرد، زمینه‌ی کم‌رنگ بنفش یعنی بازه‌ی باروری تخمینی"
        style={[styles.legendContainer, { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth, marginTop: spacing[3], paddingTop: spacing[3] }]}
      >
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: colors.menstrual }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary, fontSize: typography.xs }]}>دوره‌ی ثبت‌شده</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { borderWidth: 2, borderStyle: 'dashed', borderColor: colors.menstrual }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary, fontSize: typography.xs }]}>دوره‌ی پیش‌بینی‌شده</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { borderWidth: 2, borderStyle: 'solid', borderColor: colors.warning, backgroundColor: colors.warning + '14' }]}>
            <View style={[styles.lateBadgeMini, { backgroundColor: colors.warning, borderColor: colors.surface }]}>
              <Text style={[styles.lateBadgeMiniText, { color: colors.textOnPrimary }]}>!</Text>
            </View>
          </View>
          <Text style={[styles.legendText, { color: colors.textSecondary, fontSize: typography.xs }]}>دیرکرد دوره</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: colors.ovulation + '26' }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary, fontSize: typography.xs }]}>بازه‌ی باروری (تخمینی)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBar, { backgroundColor: colors.primary }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary, fontSize: typography.xs }]}>امروز</Text>
        </View>
      </View>
    </Card>
  );
}

// ── Docked day panel ─────────────────────────────────────────────────────────
// Room the scroll content keeps free under the docked panel.
const PANEL_CLEARANCE = 300;
// Space kept above the selected week when it is scrolled into view.
const REVEAL_MARGIN = 160;

/** The chip swatch repeats the calendar cell's own language. */
function StatusSwatch({ status }: { status: PeriodDayDescription['status'] }) {
  const { colors } = useTheme();
  const base = { width: 14, height: 14, borderRadius: 7 } as const;
  if (status === 'recorded') return <View style={[base, { backgroundColor: colors.menstrual }]} />;
  if (status === 'predicted') {
    return <View style={[base, { borderWidth: 2, borderStyle: 'dashed', borderColor: colors.menstrual }]} />;
  }
  if (status === 'late') {
    return (
      <View style={[base, { borderWidth: 2, borderStyle: 'solid', borderColor: colors.warning, backgroundColor: colors.warning + '14' }]}>
        <View style={[styles.lateBadgeMini, { backgroundColor: colors.warning, borderColor: colors.surface }]}>
          <Text style={[styles.lateBadgeMiniText, { color: colors.textOnPrimary }]}>!</Text>
        </View>
      </View>
    );
  }
  return <View style={[base, { borderWidth: 1.5, borderColor: colors.textTertiary }]} />;
}

function DayPanel({
  dateStr,
  desc,
  period,
  readOnly,
  onClose,
  onEdit,
  onLog,
}: {
  dateStr: string;
  desc: PeriodDayDescription;
  period: any | null;
  readOnly: boolean;
  onClose: () => void;
  onEdit: () => void;
  onLog: () => void;
}) {
  const { colors, spacing, typography, borderRadius, shadow } = useTheme();
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[
        styles.dayPanel,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: borderRadius.xl,
          padding: spacing[4],
          bottom: screen.bottomTab - 12,
          ...(shadow.md || {}),
        },
      ]}
    >
      <View style={styles.dayPanelHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.selectedDateLabel, { color: colors.textSecondary, fontSize: typography.xs }]}>
            {faDate(dateStr, { weekday: true, year: true })}
          </Text>
          <View style={styles.dayPanelTitleRow}>
            <StatusSwatch status={desc.status} />
            <Text style={[styles.selectedPhaseTitle, { color: colors.textPrimary, fontSize: typography.base }]}>
              {desc.title}
            </Text>
            <View style={[styles.statusChip, { backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius.sm }]}>
              <Text style={{ color: colors.textSecondary, fontSize: typography.xs, fontWeight: '600' }}>
                {desc.statusLabel}
              </Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          onPress={onClose}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          accessibilityRole="button"
          accessibilityLabel="بستن جزئیات روز"
          style={styles.dayPanelClose}
        >
          <Icon name="close" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.dayPanelDetail, { color: colors.textSecondary, fontSize: typography.sm, marginTop: spacing[2] }]}>
        {desc.detail}
      </Text>

      {desc.status === 'recorded' && period ? (
        <Text style={[styles.periodDateSpan, { color: colors.textPrimary, fontSize: typography.sm, marginTop: spacing[2] }]}>
          {describePeriodSpan({ start: period.start_date, end: period.end_date ?? null })}
        </Text>
      ) : null}

      {!readOnly && (desc.canEditPeriod || desc.canLogFromHere) ? (
        <View style={{ marginTop: spacing[3] }}>
          {desc.canEditPeriod ? (
            <Button label="ویرایش تاریخ‌های این دوره" onPress={onEdit} size="md" fullWidth />
          ) : (
            <Button
              label={desc.status === 'unrecorded' ? 'ثبت شروع دوره از این روز' : 'دوره‌ام از این روز شروع شد'}
              onPress={onLog}
              size="md"
              fullWidth
            />
          )}
        </View>
      ) : null}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function CycleTrackerScreen() {
  const navigation = useNavigation<Props['navigation']>();
  const { colors, spacing, typography, borderRadius } = useTheme();

  const { data: profile } = useProfile();
  const isMale = profile?.sex === 'male';
  const hasPartner = (profile?.partners?.length ?? 0) > 0;
  const isMaleWithPartner = isMale && hasPartner;

  const { data: periods, isLoading, refetch } = usePeriods(
    isMaleWithPartner ? 'partner' : undefined,
  );

  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  // Shared with Home's day strip — one selection, not two independent
  // pickers. Seeded from the shared store so arriving here after picking a
  // day on Home opens with that same day already selected.
  const sharedSelectedDate = useSelectedDateStore((s) => s.selectedDate);
  const setSharedSelectedDate = useSelectedDateStore((s) => s.setSelectedDate);
  const [selectedDate, setSelectedDate] = useState<string | null>(sharedSelectedDate);
  // The recorded period being corrected in the quick-edit sheet.
  const [quickEditId, setQuickEditId] = useState<number | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const reduceMotionMain = useReducedMotion();
  const revealRow = useCallback((y: number) => {
    scrollRef.current?.scrollTo({ y: Math.max(0, y - REVEAL_MARGIN), animated: !reduceMotionMain });
  }, [reduceMotionMain]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Full cycle date map
  const cycleMap = useMemo(() => buildCycleDateMap((periods as any[]) ?? []), [periods]);

  // Find period for selected date
  const selectedPeriod = useMemo(() => {
    if (!selectedDate || !periods) return null;
    const entry = cycleMap.get(selectedDate);
    if (!entry?.periodId) return null;
    return (periods as any[]).find((p) => p.id === entry.periodId) ?? null;
  }, [selectedDate, periods, cycleMap]);

  const handleDayPress = useCallback((dateStr: string, _periodId: number | null) => {
    setSelectedDate(prev => {
      const next = prev === dateStr ? null : dateStr;
      // Deselecting locally (tap-to-toggle-off) doesn't clear the shared
      // selection — Home's day strip always has SOME day selected, so
      // there is nothing honest to hand it back to but the last real pick.
      if (next) { setSharedSelectedDate(next); }
      return next;
    });
  }, [setSharedSelectedDate]);

  if (isLoading && !refreshing) {
    return <LoadingState fullScreen message="در حال بارگذاری تاریخچه‌ی چرخه…" />;
  }

  const partnerName =
    (periods as any)?.[0]?.partner_name ??
    profile?.partners?.[0]?.username ??
    'Partner';

  const periodList = (periods as any[]) ?? [];

  const panelVisible = viewMode === 'calendar' && periodList.length > 0 && !!selectedDate;
  const todayStr = formatDateISO(new Date());
  const selectedDesc = selectedDate
    ? describeCalendarDay(selectedDate, todayStr, cycleMap.get(selectedDate))
    : null;

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
    <ScrollView
      ref={scrollRef}
      style={[styles.flex, { backgroundColor: colors.background }]}
      contentContainerStyle={{
          paddingHorizontal: screen.gutter,
          paddingTop: screen.top,
          // Leave room so the docked day panel never hides the last week.
          paddingBottom: screen.bottomTab + (panelVisible ? PANEL_CLEARANCE : 0),
        }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* Partner Context Banner */}
      {isMaleWithPartner && (
        <View
          style={[
            styles.partnerBanner,
            {
              backgroundColor: colors.surfaceSecondary,
              borderRadius: borderRadius.lg,
              borderColor: colors.border,
              padding: spacing[3],
              marginBottom: spacing[4],
            },
          ]}
        >
          <Icon name="account-heart-outline" size={18} color={colors.primary} />
          <Text style={[styles.partnerBannerText, { color: colors.textPrimary, fontSize: typography.sm }]}>
            در حال مشاهده‌ی تاریخچه‌ی چرخه‌ی {partnerName}
          </Text>
        </View>
      )}

      {/* Top Action & View Switcher Bar */}
      <View style={[styles.topActionBar, { marginBottom: spacing[4] }]}>
        {!isMale && (
          <View style={{ flex: 1 }}>
            <Button
              label="ثبت دوره"
              onPress={() => navigation.navigate('LogPeriod')}
              size="md"
              fullWidth
            />
          </View>
        )}

        {/* View Mode Segmented Switch */}
        <View
          style={[
            styles.segmentedContainer,
            {
              backgroundColor: colors.surfaceSecondary,
              borderRadius: borderRadius.md,
              borderColor: colors.border,
              padding: 3,
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => setViewMode('calendar')}
            activeOpacity={0.8}
            style={[
              styles.segmentTab,
              {
                backgroundColor: viewMode === 'calendar' ? colors.surface : 'transparent',
                borderRadius: borderRadius.sm,
              },
            ]}
          >
            <Icon
              name="calendar-month-outline"
              size={18}
              color={viewMode === 'calendar' ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.segmentTabText,
                {
                  fontSize: typography.xs,
                  fontWeight: viewMode === 'calendar' ? '700' : '400',
                  color: viewMode === 'calendar' ? colors.primary : colors.textSecondary,
                },
              ]}
            >
              تقویم
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setViewMode('list')}
            activeOpacity={0.8}
            style={[
              styles.segmentTab,
              {
                backgroundColor: viewMode === 'list' ? colors.surface : 'transparent',
                borderRadius: borderRadius.sm,
              },
            ]}
          >
            <Icon
              name="format-list-bulleted"
              size={18}
              color={viewMode === 'list' ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[
                styles.segmentTabText,
                {
                  fontSize: typography.xs,
                  fontWeight: viewMode === 'list' ? '700' : '400',
                  color: viewMode === 'list' ? colors.primary : colors.textSecondary,
                },
              ]}
            >
              لیست
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Calendar Mode ───────────────────────────────────────────── */}
      {viewMode === 'calendar' && (
        <View>
          {periodList.length > 0 ? (
            <>
              <CycleCalendar
                periods={periodList}
                isMaleWithPartner={isMaleWithPartner}
                selectedDate={selectedDate}
                onDayPress={handleDayPress}
                getScrollInner={() => (scrollRef.current as any)?.getInnerViewRef?.()}
                onRevealRow={revealRow}
              />

            </>
          ) : (
            <EmptyState
              icon="calendar-blank-outline"
              title={isMaleWithPartner ? 'هنوز دورهای ثبت نشده' : 'هنوز چرخه‌ای ثبت نشده'}
              description={
                isMaleWithPartner
                  ? 'شریکت هنوز دورهای ثبت نکرده است.'
                  : 'برای شروع پیگیری چرخه‌ات، دورهی اولت را ثبت کن.'
              }
              actionLabel={isMale ? undefined : 'ثبت دوره'}
              onAction={isMale ? undefined : () => navigation.navigate('LogPeriod')}
            />
          )}
        </View>
      )}

      {/* ── List Mode ───────────────────────────────────────────────── */}
      {viewMode === 'list' && (
        <View>
          <Text style={[styles.listHeaderTitle, { color: colors.textPrimary, fontSize: typography.lg, marginBottom: spacing[3] }]}>
            {isMaleWithPartner ? `چرخه‌های ${partnerName}` : 'تاریخچه‌ی چرخه'}
          </Text>

          {periodList.length > 0 ? (
            periodList.map((period: any) => {
              const nextPeriod = safeNextPeriod(period);
              const isOngoing = !period.end_date;

              return (
                <Card
                  key={period.id}
                  elevated={false}
                  style={{ marginBottom: spacing[3], padding: spacing[4] }}
                >
                  <View style={styles.rowBetween}>
                    <View style={{ flex: 1, marginRight: spacing[3] }}>
                      <View style={styles.cardHeaderRow}>
                        {isOngoing && (
                          <Badge label="فعال" variant="success" style={{ marginRight: spacing[2] }} />
                        )}
                        <Text style={[styles.cycleRangeText, { color: colors.textPrimary, fontSize: typography.base }]}>
                          {faDateShort(period.start_date)}
                          {period.end_date ? ` → ${faDateShort(period.end_date)}` : ' → در جریان'}
                        </Text>
                      </View>

                      {nextPeriod && (
                        <Text style={[styles.nextPredictedText, { color: colors.textSecondary, fontSize: typography.xs, marginTop: spacing[1] }]}>
                          پیش‌بینی دوره بعدی: {faDateShort(nextPeriod)}
                        </Text>
                      )}

                      {period.symptoms ? (
                        <View style={[styles.tagWrap, { marginTop: spacing[2] }]}>
                          {period.symptoms.split(',').map((s: string) => (
                            <View key={s} style={[styles.symptomTag, { backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius.sm }]}>
                              <Text style={[styles.symptomTagText, { color: colors.textSecondary, fontSize: typography.xs }]}>
                                {s.trim()}
                              </Text>
                            </View>
                          ))}
                        </View>
                      ) : null}

                      {period.medication ? (
                        <Text style={[styles.medicationText, { color: colors.textTertiary, fontSize: typography.xs, marginTop: spacing[1] }]}>
                          دارو: {period.medication}
                        </Text>
                      ) : null}
                    </View>

                    <View style={styles.actionCol}>
                      {period.period_duration > 0 ? (
                        <View style={styles.durationPill}>
                          <Text style={[styles.durationValue, { color: colors.menstrual, fontSize: typography.xl }]}>
                            {toFa(period.period_duration)}
                          </Text>
                          <Text style={[styles.durationUnit, { color: colors.textTertiary, fontSize: typography.xs }]}>
                            روز
                          </Text>
                        </View>
                      ) : (
                        <Badge label="در جریان" variant="neutral" />
                      )}

                      {!isMaleWithPartner && (
                        <TouchableOpacity
                          onPress={() => navigation.navigate('EditPeriod', { periodId: period.id })}
                          activeOpacity={0.75}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          accessibilityRole="button"
                          accessibilityLabel="ویرایش دوره"
                          style={[styles.iconEditBtn, { backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius.md, marginTop: spacing[2] }]}
                        >
                          <Icon name="pencil-outline" size={17} color={colors.primary} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </Card>
              );
            })
          ) : (
            <EmptyState
              icon="calendar-blank-outline"
              title={isMaleWithPartner ? 'هنوز دورهای ثبت نشده' : 'هنوز چرخه‌ای ثبت نشده'}
              description={
                isMaleWithPartner
                  ? 'شریکت هنوز دورهای ثبت نکرده است.'
                  : 'برای شروع پیگیری چرخه‌ات، دورهی اولت را ثبت کن.'
              }
              actionLabel={isMale ? undefined : 'ثبت دوره'}
              onAction={isMale ? undefined : () => navigation.navigate('LogPeriod')}
            />
          )}
        </View>
      )}

      {/* Detailed Analysis Navigation Button */}
      <View style={{ marginTop: spacing[4] }}>
        <Button
          label="مشاهده تحلیل جامع"
          onPress={() => navigation.navigate('CycleAnalysis')}
          variant="outline"
          size="lg"
          fullWidth
        />
      </View>
    </ScrollView>

    {panelVisible && selectedDate && selectedDesc ? (
      <View pointerEvents="box-none" style={styles.dayPanelHost}>
        <DayPanel
          dateStr={selectedDate}
          desc={selectedDesc}
          period={selectedPeriod && selectedDesc.status === 'recorded' ? selectedPeriod : null}
          readOnly={isMaleWithPartner}
          onClose={() => setSelectedDate(null)}
          onEdit={() => selectedDesc.periodId != null && setQuickEditId(selectedDesc.periodId)}
          onLog={() => navigation.navigate('LogPeriod', { startDate: selectedDate })}
        />
      </View>
    ) : null}

    <PeriodQuickEditSheet
      visible={quickEditId != null}
      period={periodList.find((p: any) => p.id === quickEditId) ?? null}
      onClose={() => setQuickEditId(null)}
      onOpenFullEdit={(periodId) => navigation.navigate('EditPeriod', { periodId })}
    />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  monthNavBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    fontWeight: '700',
  },
  weekHeaderRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayCol: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDayText: {
    fontWeight: '600',
    textAlign: 'center',
  },
  weekRow: {
    flexDirection: 'row',
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumber: {
    textAlign: 'center',
  },
  periodStrip: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    left: 0,
    right: 0,
  },
  dayPanelHost: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    paddingHorizontal: screen.gutter,
  },
  dayPanel: {
    position: 'absolute',
    start: screen.gutter,
    end: screen.gutter,
    borderWidth: 1,
  },
  dayPanelHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  dayPanelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  dayPanelClose: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -8,
    marginEnd: -8,
  },
  dayPanelDetail: {
    lineHeight: 22,
  },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  selectionRing: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
  },
  lateBadge: {
    position: 'absolute',
    top: -5,
    end: -5,
    width: 15,
    height: 15,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lateBadgeText: { fontSize: 10, lineHeight: 12, fontWeight: '800' },
  lateBadgeMini: {
    position: 'absolute',
    top: -5,
    end: -5,
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lateBadgeMiniText: { fontSize: 8, lineHeight: 10, fontWeight: '800' },
  todayBar: {
    position: 'absolute',
    bottom: 2,
    width: 14,
    height: 3,
    borderRadius: 2,
  },
  phaseIndicatorDot: {
    position: 'absolute',
    bottom: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 4,
  },
  legendSwatch: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  legendBar: {
    width: 14,
    height: 3,
    borderRadius: 2,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontWeight: '500',
  },
  partnerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
  },
  partnerBannerText: {
    fontWeight: '600',
  },
  topActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  segmentedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  segmentTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  segmentTabText: {},
  selectedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  selectedDateLabel: {
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  selectedPhaseTitle: {
    fontWeight: '700',
  },
  selectedPeriodContent: {},
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  periodDateSpan: {
    fontWeight: '600',
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  symptomTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  symptomTagText: {
    fontWeight: '500',
  },
  durationPill: {
    alignItems: 'center',
    minWidth: 40,
  },
  durationValue: {
    fontWeight: '800',
    lineHeight: 24,
  },
  durationUnit: {
    fontWeight: '500',
  },
  iconEditBtn: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySelectedDay: {
    borderWidth: 1,
    alignItems: 'center',
  },
  emptySelectedText: {
    textAlign: 'center',
  },
  listHeaderTitle: {
    fontWeight: '700',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  cycleRangeText: {
    fontWeight: '700',
  },
  nextPredictedText: {},
  medicationText: {},
  actionCol: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
