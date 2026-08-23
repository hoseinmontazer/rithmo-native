import React, { useCallback, useState, useMemo, useRef } from 'react';
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
import { usePeriods } from '@hooks/queries/usePeriods';
import { useProfile } from '@hooks/queries/useProfile';
import { Card, Badge, Button, Icon, LoadingState, EmptyState } from '@components/ui';
import { formatDateISO } from '@utils/dateUtils';
import { toFa, faDateShort, faDate, faDateYear } from '@utils/persian';
import type { CycleStackParamList } from '@navigation/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<CycleStackParamList, 'CycleTracker'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const WEEK_DAYS = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];

type ViewMode = 'calendar' | 'list';

/** Returns next period date only if after end_date */
function safeNextPeriod(period: any): string | null {
  const next = period.next_period_start_date;
  const end = period.end_date;
  if (!next) return null;
  if (end && next <= end) return null;
  return next;
}

type DayType = 'period' | 'predicted_period' | 'follicular' | 'ovulation' | 'pms' | 'late' | 'none';

interface DayInfo {
  type: DayType;
  periodId?: number;
  isStart?: boolean;
  isEnd?: boolean;
  isOngoing?: boolean;
  label?: string;
}

/** Build a map of every date → phase info from period list */
function buildCycleDateMap(periods: any[]): Map<string, DayInfo> {
  const map = new Map<string, DayInfo>();

  // Sort ascending by start_date
  const sorted = [...periods].sort((a, b) =>
    a.start_date < b.start_date ? -1 : 1
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    const startDate = new Date(p.start_date + 'T00:00:00');
    const isOngoing = !p.end_date;

    // Red days end at end_date (completed) or predicted_end_date (ongoing)
    let redEnd: Date;
    if (p.end_date) {
      redEnd = new Date(p.end_date + 'T00:00:00');
    } else if (p.predicted_end_date) {
      redEnd = new Date(p.predicted_end_date + 'T00:00:00');
    } else {
      redEnd = new Date();
      redEnd.setHours(0, 0, 0, 0);
    }

    // Next period start: API field → or next period in list
    let nextStart: Date | null = null;
    if (p.next_period_start_date) {
      nextStart = new Date(p.next_period_start_date + 'T00:00:00');
    } else if (sorted[i + 1]) {
      nextStart = new Date(sorted[i + 1].start_date + 'T00:00:00');
    }

    // ── 1. Menstrual (red) ──────────────────────────────────────
    const redEndStr = formatDateISO(redEnd);
    const cRed = new Date(startDate);
    while (cRed <= redEnd) {
      const key = formatDateISO(cRed);
      map.set(key, {
        type: 'period',
        periodId: p.id,
        isStart: key === p.start_date,
        isEnd: key === redEndStr,
        isOngoing,
      });
      cRed.setDate(cRed.getDate() + 1);
    }

    if (!nextStart || nextStart <= redEnd) continue;

    // PMS: 5 days before next period (also serves as the follicular/
    // luteal tiling boundary when there is no ovulation estimate).
    const pmsStart = new Date(nextStart);
    pmsStart.setDate(nextStart.getDate() - 5);

    // ── Ovulation + fertile window ───────────────────────────────────
    // The backend is the single source of truth: each period carries
    // estimated_ovulation_date / fertile_window (null when the backend
    // has no reliable estimate for that cycle, e.g. the cycle gap is
    // outside the 15-60 day plausibility window, or ovulation would
    // land before this period ends).  When the backend says "no
    // reliable estimate", the calendar draws NO ovulation or fertile
    // days for that cycle — it does not recompute one locally.
    let ovStart: Date | null = null;
    let ovEnd: Date | null = null;
    if (p.estimated_ovulation_date) {
      const ovDate = new Date(p.estimated_ovulation_date + 'T00:00:00');
      ovStart = p.fertile_window?.start
        ? new Date(p.fertile_window.start + 'T00:00:00')
        : new Date(ovDate.getTime() - 5 * 86400000);
      ovEnd = p.fertile_window?.end
        ? new Date(p.fertile_window.end + 'T00:00:00')
        : new Date(ovDate.getTime() + 86400000);
    }
    const boundaryOvStart = ovStart ?? pmsStart;
    const boundaryOvEnd = ovEnd ?? pmsStart;

    const dayAfterRed = new Date(redEnd);
    dayAfterRed.setDate(redEnd.getDate() + 1);

    // ── 2. Follicular ────────────────────────────────────────────
    const fCur = new Date(dayAfterRed);
    while (fCur < boundaryOvStart && fCur < nextStart) {
      const key = formatDateISO(fCur);
      if (!map.has(key)) map.set(key, { type: 'follicular', periodId: p.id });
      fCur.setDate(fCur.getDate() + 1);
    }

    // ── 3. Ovulation / Fertile Window (only when the backend has a
    //    reliable estimate — see the contract note above) ──────────
    if (ovStart && ovEnd) {
      const oCur = new Date(ovStart);
      while (oCur <= ovEnd && oCur < nextStart) {
        const key = formatDateISO(oCur);
        if (!map.has(key)) map.set(key, { type: 'ovulation', periodId: p.id });
        oCur.setDate(oCur.getDate() + 1);
      }
    }

    // ── 4. Luteal ────────────────────────────────────────────────
    const lCur = new Date(boundaryOvEnd);
    lCur.setDate(lCur.getDate() + 1);
    while (lCur < pmsStart && lCur < nextStart) {
      const key = formatDateISO(lCur);
      if (!map.has(key)) map.set(key, { type: 'luteal', periodId: p.id });
      lCur.setDate(lCur.getDate() + 1);
    }

    // ── 5. PMS ───────────────────────────────────────────────────
    const pCur = new Date(pmsStart);
    while (pCur < nextStart) {
      const key = formatDateISO(pCur);
      if (!map.has(key)) map.set(key, { type: 'pms', periodId: p.id });
      pCur.setDate(pCur.getDate() + 1);
    }

    // ── 6. Map predicted future period for latest cycle ─────────
    if (i === sorted.length - 1 && p.next_period_start_date) {
      const predDur = p.period_duration ?? 5;
      const predEnd = new Date(nextStart);
      predEnd.setDate(nextStart.getDate() + predDur - 1);

      const predCur = new Date(nextStart);
      while (predCur <= predEnd) {
        const key = formatDateISO(predCur);
        if (!map.has(key)) {
          map.set(key, {
            type: nextStart < today ? 'late' : 'predicted_period',
            label: nextStart < today ? 'دوره با تأخیر' : 'دوره پیش‌بینی‌شده',
          });
        }
        predCur.setDate(predCur.getDate() + 1);
      }
    }
  }

  return map;
}

// ── Calendar component ────────────────────────────────────────────────────────
function CycleCalendar({
  periods,
  onDayPress,
}: {
  periods: any[];
  isMaleWithPartner: boolean;
  onDayPress: (dateStr: string, periodId: number | null) => void;
}) {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const today = new Date();

  const [displayYear, setDisplayYear] = useState(today.getFullYear());
  const [displayMonth, setDisplayMonth] = useState(today.getMonth());

  // Keep refs in sync for PanResponder
  const displayMonthRef = useRef(today.getMonth());
  const displayYearRef = useRef(today.getFullYear());

  // Animation values for smooth slide transition
  const slideAnim = useRef(new Animated.Value(0)).current;
  const isAnimating = useRef(false);

  const periodMap = useMemo(() => buildCycleDateMap(periods), [periods]);

  // Allow navigating up to 3 months forward into future
  const isFutureMonth = (() => {
    const maxFuture = new Date(today.getFullYear(), today.getMonth() + 3, 1);
    const current = new Date(displayYear, displayMonth, 1);
    return current >= maxFuture;
  })();

  const goToMonth = useCallback((direction: 'prev' | 'next') => {
    if (isAnimating.current) return;
    const now = new Date();
    const currentMonth = displayMonthRef.current;
    const currentYear = displayYearRef.current;
    if (direction === 'next') {
      const maxFuture = new Date(now.getFullYear(), now.getMonth() + 3, 1);
      const nextMonthDate = new Date(currentYear, currentMonth + 1, 1);
      if (nextMonthDate > maxFuture) return;
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
      if (direction === 'prev') {
        if (newMonth === 0) { newMonth = 11; newYear -= 1; }
        else newMonth -= 1;
      } else {
        if (newMonth === 11) { newMonth = 0; newYear += 1; }
        else newMonth += 1;
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
    const firstDay = new Date(displayYear, displayMonth, 1);
    const lastDay = new Date(displayYear, displayMonth + 1, 0);
    const startOffset = firstDay.getDay();

    const days: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(displayYear, displayMonth, d));
    }
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [displayYear, displayMonth]);

  // Jalali, via the canonical formatter. `toLocaleDateString('fa-IR')` does
  // not convert calendars on Hermes — see utils/jalali.ts.
  const monthLabel = faDateYear(new Date(displayYear, displayMonth, 1))
    .split(' ').slice(1).join(' ');

  const isToday = (d: Date) => d.toDateString() === today.toDateString();
  const isFuture = (d: Date) => d > today;

  return (
    <Card elevated={false} style={{ marginBottom: spacing[4], padding: spacing[4] }}>
      {/* Month navigation */}
      <View style={styles.monthHeader}>
        <TouchableOpacity
          onPress={() => goToMonth('prev')}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
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
          <View key={rowIdx} style={styles.weekRow}>
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

              const isPeriod = dayType === 'period';
              const isPredPeriod = dayType === 'predicted_period';
              const isLate = dayType === 'late';
              const isOvulation = dayType === 'ovulation';
              const isPms = dayType === 'pms';
              const isFollic = dayType === 'follicular';

              // Semantic phase colors from design tokens
              const phaseDotColor = isPeriod
                ? colors.menstrual
                : isOvulation
                ? colors.ovulation
                : isPms
                ? colors.luteal
                : isFollic
                ? colors.follicular
                : 'transparent';

              return (
                <TouchableOpacity
                  key={dateStr}
                  onPress={() => !future && onDayPress(dateStr, entry?.periodId ?? null)}
                  activeOpacity={future ? 1 : 0.75}
                  style={styles.dayCol}
                >
                  {/* Period strip background */}
                  {isPeriod && (
                    <View
                      style={[
                        styles.periodStrip,
                        {
                          backgroundColor: colors.menstrual + '18',
                          borderTopLeftRadius: isStart ? 16 : 0,
                          borderBottomLeftRadius: isStart ? 16 : 0,
                          borderTopRightRadius: isEnd ? 16 : 0,
                          borderBottomRightRadius: isEnd ? 16 : 0,
                        },
                      ]}
                    />
                  )}

                  {/* Predicted period strip */}
                  {isPredPeriod && (
                    <View
                      style={[
                        styles.periodStrip,
                        {
                          backgroundColor: colors.menstrual + '0A',
                          borderWidth: 1,
                          borderColor: colors.menstrual + '30',
                          borderStyle: 'dashed',
                          borderRadius: 16,
                        },
                      ]}
                    />
                  )}

                  {/* Day cell circle */}
                  <View
                    style={[
                      styles.dayCircle,
                      {
                        backgroundColor: todayDay
                          ? colors.primary
                          : isPeriod
                          ? colors.menstrual + '22'
                          : 'transparent',
                        borderColor: isOvulation
                          ? colors.ovulation
                          : isLate
                          ? colors.warning
                          : 'transparent',
                        borderWidth: isOvulation || isLate ? 1.5 : 0,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayNumber,
                        {
                          fontSize: typography.sm,
                          color: todayDay
                            // Today's cell is filled with colors.primary.
                            ? colors.textOnPrimary
                            : isPeriod
                            ? colors.menstrual
                            : isPredPeriod
                            ? colors.menstrual
                            : isLate
                            ? colors.warning
                            : isOvulation
                            ? colors.ovulation
                            : isPms
                            ? colors.luteal
                            : future
                            ? colors.textDisabled
                            : colors.textPrimary,
                          fontWeight: (todayDay || isPeriod || isOvulation || isPms || isLate) ? '700' : '400',
                        },
                      ]}
                    >
                      {toFa(day.getDate())}
                    </Text>
                  </View>

                  {/* Phase dot for non-period active days */}
                  {!isPeriod && !todayDay && (isOvulation || isPms || isFollic) && (
                    <View
                      style={[
                        styles.phaseIndicatorDot,
                        { backgroundColor: phaseDotColor },
                      ]}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </Animated.View>

      {/* Legend */}
      <View style={[styles.legendContainer, { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth, marginTop: spacing[3], paddingTop: spacing[3] }]}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.menstrual }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary, fontSize: typography.xs }]}>دوره</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.follicular }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary, fontSize: typography.xs }]}>فولیکولار</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.ovulation }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary, fontSize: typography.xs }]}>تخمک‌گذاری</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.luteal }]} />
          <Text style={[styles.legendText, { color: colors.textSecondary, fontSize: typography.xs }]}>لوتئال</Text>
        </View>
      </View>
    </Card>
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
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

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

  const selectedDayType = useMemo(() => {
    if (!selectedDate) return null;
    return cycleMap.get(selectedDate)?.type ?? null;
  }, [selectedDate, cycleMap]);

  const handleDayPress = useCallback((dateStr: string, _periodId: number | null) => {
    setSelectedDate(prev => prev === dateStr ? null : dateStr);
  }, []);

  if (isLoading && !refreshing) {
    return <LoadingState fullScreen message="Loading cycle history…" />;
  }

  const partnerName =
    (periods as any)?.[0]?.partner_name ??
    profile?.partners?.[0]?.username ??
    'Partner';

  const periodList = (periods as any[]) ?? [];

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingHorizontal: spacing[4], paddingTop: spacing[4], paddingBottom: spacing[10] }}
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
            Viewing {partnerName}'s Cycle History
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
              Calendar
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
              List
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
                onDayPress={handleDayPress}
              />

              {/* Selected Day Inspection Card */}
              {selectedDate && (selectedPeriod || selectedDayType) && (
                <Card elevated={false} style={{ marginBottom: spacing[4], padding: spacing[4] }}>
                  <View style={styles.selectedHeaderRow}>
                    <View>
                      <Text style={[styles.selectedDateLabel, { color: colors.textSecondary, fontSize: typography.xs }]}>
                        {faDate(selectedDate, { weekday: 'long', month: 'long', day: 'numeric' })}
                      </Text>
                      <Text style={[styles.selectedPhaseTitle, { color: colors.textPrimary, fontSize: typography.base }]}>
                        {selectedDayType === 'period'
                          ? 'روزهای دوره'
                          : selectedDayType === 'ovulation'
                          ? 'پنجره‌ی تخمک‌گذاری / باروری'
                          : selectedDayType === 'pms'
                          ? 'لوتئال / پیش از دوره'
                          : selectedDayType === 'follicular'
                          ? 'فولیکولار'
                          : 'روز ثبت‌شده'}
                      </Text>
                    </View>

                    {selectedPeriod && !isMaleWithPartner && (
                      <TouchableOpacity
                        onPress={() => navigation.navigate('EditPeriod', { periodId: selectedPeriod.id })}
                        activeOpacity={0.75}
                        style={[styles.iconEditBtn, { backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius.md }]}
                      >
                        <Icon name="pencil-outline" size={18} color={colors.primary} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {selectedPeriod && (
                    <View style={[styles.selectedPeriodContent, { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth, marginTop: spacing[3], paddingTop: spacing[3] }]}>
                      <View style={styles.rowBetween}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.periodDateSpan, { color: colors.textPrimary, fontSize: typography.sm }]}>
                            {faDateShort(selectedPeriod.start_date)}
                            {selectedPeriod.end_date ? ` → ${faDateShort(selectedPeriod.end_date)}` : ' → در جریان'}
                          </Text>
                          {selectedPeriod.symptoms ? (
                            <View style={styles.tagWrap}>
                              {selectedPeriod.symptoms.split(',').map((s: string) => (
                                <View key={s} style={[styles.symptomTag, { backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius.sm }]}>
                                  <Text style={[styles.symptomTagText, { color: colors.textSecondary, fontSize: typography.xs }]}>
                                    {s.trim()}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          ) : null}
                        </View>

                        {selectedPeriod.period_duration > 0 && (
                          <View style={styles.durationPill}>
                            <Text style={[styles.durationValue, { color: colors.menstrual, fontSize: typography.lg }]}>
                              {selectedPeriod.period_duration}
                            </Text>
                            <Text style={[styles.durationUnit, { color: colors.textTertiary, fontSize: typography.xs }]}>
                              days
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  )}
                </Card>
              )}

              {selectedDate && !selectedPeriod && !selectedDayType && (
                <View style={[styles.emptySelectedDay, { backgroundColor: colors.surface, borderRadius: borderRadius.lg, borderColor: colors.border, padding: spacing[4] }]}>
                  <Text style={[styles.emptySelectedText, { color: colors.textSecondary, fontSize: typography.sm }]}>
                    برای {faDateShort(selectedDate)} فعالیت چرخه‌ای ثبت نشده است.
                  </Text>
                </View>
              )}
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
            {isMaleWithPartner ? `${partnerName}'s Cycles` : 'Cycle History'}
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
    letterSpacing: -0.2,
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
