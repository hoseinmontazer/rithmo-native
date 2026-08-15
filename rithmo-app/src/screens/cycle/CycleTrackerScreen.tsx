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
import { formatDate, formatDateISO } from '@utils/dateUtils';
import type { CycleStackParamList } from '@navigation/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<CycleStackParamList, 'CycleTracker'>;

const { width: W } = Dimensions.get('window');
const CALENDAR_PADDING = 32; // padding[4] * 2 = 16*2
const CALENDAR_WIDTH = W - 40 - CALENDAR_PADDING; // screen - horizontal margins - inner padding
const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type ViewMode = 'calendar' | 'list';

/** Returns next period date only if after end_date */
function safeNextPeriod(period: any): string | null {
  const next = period.next_period_start_date;
  const end  = period.end_date;
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
      redEnd = new Date(); redEnd.setHours(0,0,0,0);
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

    // Cycle length from start → nextStart
    const cycleLen = p.cycle_length ??
      Math.round((nextStart.getTime() - startDate.getTime()) / 86400000);

    // Period duration
    const periodDays = Math.round((redEnd.getTime() - startDate.getTime()) / 86400000) + 1;

    // Ovulation day: cycle_length - 14 days from start (standard luteal = 14d)
    const ovDayFromStart = Math.max(cycleLen - 14, periodDays + 1);
    const ovulationDate = new Date(startDate);
    ovulationDate.setDate(startDate.getDate() + ovDayFromStart - 1);

    // Fertile window: 5 days before ovulation through 1 day after
    const ovStart = new Date(ovulationDate);
    ovStart.setDate(ovulationDate.getDate() - 5);
    const ovEnd = new Date(ovulationDate);
    ovEnd.setDate(ovulationDate.getDate() + 1);

    // PMS: 5 days before next period
    const pmsStart = new Date(nextStart);
    pmsStart.setDate(nextStart.getDate() - 5);

    const dayAfterRed = new Date(redEnd);
    dayAfterRed.setDate(redEnd.getDate() + 1);

    // ── 2. Follicular ────────────────────────────────────────────
    const fCur = new Date(dayAfterRed);
    while (fCur < ovStart && fCur < nextStart) {
      const key = formatDateISO(fCur);
      if (!map.has(key)) map.set(key, { type: 'follicular', periodId: p.id });
      fCur.setDate(fCur.getDate() + 1);
    }

    // ── 3. Ovulation / Fertile Window ────────────────────────────
    const oCur = new Date(ovStart);
    while (oCur <= ovEnd && oCur < nextStart) {
      const key = formatDateISO(oCur);
      if (!map.has(key)) map.set(key, { type: 'ovulation', periodId: p.id });
      oCur.setDate(oCur.getDate() + 1);
    }

    // ── 4. Luteal ────────────────────────────────────────────────
    const lCur = new Date(ovEnd); lCur.setDate(lCur.getDate() + 1);
    while (lCur < pmsStart && lCur < nextStart) {
      const key = formatDateISO(lCur);
      if (!map.has(key)) map.set(key, { type: 'follicular', periodId: p.id });
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
            label: nextStart < today ? 'Overdue Period' : 'Predicted Period',
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
  isMaleWithPartner,
  onDayPress,
}: {
  periods: any[];
  isMaleWithPartner: boolean;
  onDayPress: (dateStr: string, periodId: number | null) => void;
}) {
  const { colors, spacing, typography } = useTheme();
  const today  = new Date();

  const [displayYear,  setDisplayYear]  = useState(today.getFullYear());
  const [displayMonth, setDisplayMonth] = useState(today.getMonth());

  // Keep refs in sync so PanResponder always sees latest values
  const displayMonthRef = useRef(today.getMonth());
  const displayYearRef  = useRef(today.getFullYear());

  // Animation values for slide transition
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
    const currentMonth = displayMonthRef.current;
    const currentYear  = displayYearRef.current;
    if (direction === 'next') {
      const maxFuture = new Date(today.getFullYear(), today.getMonth() + 3, 1);
      const nextMonthDate = new Date(currentYear, currentMonth + 1, 1);
      if (nextMonthDate > maxFuture) return;
    }
    isAnimating.current = true;

    const outTo = direction === 'prev' ? W : -W;

    Animated.timing(slideAnim, {
      toValue: outTo,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      // Compute new month/year
      let newMonth = currentMonth;
      let newYear  = currentYear;
      if (direction === 'prev') {
        if (newMonth === 0) { newMonth = 11; newYear -= 1; }
        else newMonth -= 1;
      } else {
        if (newMonth === 11) { newMonth = 0; newYear += 1; }
        else newMonth += 1;
      }
      displayMonthRef.current = newMonth;
      displayYearRef.current  = newYear;
      setDisplayMonth(newMonth);
      setDisplayYear(newYear);

      // Slide in from opposite side
      slideAnim.setValue(-outTo);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start(() => {
        isAnimating.current = false;
      });
    });
  }, [slideAnim]);

  const goToMonthRef = useRef(goToMonth);
  goToMonthRef.current = goToMonth;

  // PanResponder for swipe — uses goToMonth which reads from refs
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 10 && Math.abs(gs.dx) > Math.abs(gs.dy) * 1.5,
      onPanResponderRelease: (_, gs) => {
        if (gs.dx < -40)      goToMonthRef.current('next');
        else if (gs.dx > 40)  goToMonthRef.current('prev');
      },
    })
  ).current;

  // Build calendar grid
  const calendarDays = useMemo(() => {
    const firstDay   = new Date(displayYear, displayMonth, 1);
    const lastDay    = new Date(displayYear, displayMonth + 1, 0);
    const startOffset = firstDay.getDay();

    const days: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(displayYear, displayMonth, d));
    }
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [displayYear, displayMonth]);

  const monthLabel = new Date(displayYear, displayMonth, 1)
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const isToday  = (d: Date) => d.toDateString() === today.toDateString();
  const isFuture = (d: Date) => d > today;

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
        marginBottom: spacing[4],
      }}
    >
      {/* Accent bar */}
      <View style={{ height: 3, backgroundColor: colors.menstrual }} />

      <View style={{ padding: spacing[4] }}>
        {/* Month navigation */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[4] }}>
          <TouchableOpacity
            onPress={() => goToMonth('prev')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="chevron-left" size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          <Text style={{ color: colors.textPrimary, fontSize: typography.base, fontWeight: '800' }}>
            {monthLabel}
          </Text>

          <TouchableOpacity
            onPress={() => goToMonth('next')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            disabled={isFutureMonth}
          >
            <Icon name="chevron-right" size={24} color={isFutureMonth ? colors.border : colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Week day headers */}
        <View style={{ flexDirection: 'row', marginBottom: spacing[2] }}>
          {WEEK_DAYS.map(d => (
            <View key={d} style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '700' }}>{d}</Text>
            </View>
          ))}
        </View>

        {/* Swipeable day grid */}
        <Animated.View
          style={{ transform: [{ translateX: slideAnim }] }}
          {...panResponder.panHandlers}
        >
          {/* Render weeks row by row so flex works correctly */}
          {Array.from({ length: calendarDays.length / 7 }, (_, rowIdx) => (
            <View key={rowIdx} style={{ flexDirection: 'row' }}>
              {calendarDays.slice(rowIdx * 7, rowIdx * 7 + 7).map((day, colIdx) => {
                const idx = rowIdx * 7 + colIdx;
                if (!day) {
                  return <View key={`empty-${idx}`} style={{ flex: 1, height: 44 }} />;
                }

                const dateStr   = formatDateISO(day);
                const entry     = periodMap.get(dateStr);
                const dayType   = entry?.type ?? 'none';
                const hasMark   = dayType !== 'none';
                const isStart   = entry?.isStart  ?? false;
                const isEnd     = entry?.isEnd    ?? false;
                const ongoing   = entry?.isOngoing ?? false;
                const todayDay  = isToday(day);
                const future    = isFuture(day);

                // Phase colors
                const phaseColor = dayType === 'period'
                  ? (ongoing ? (colors as any).ovulationColor || '#F59E0B' : colors.menstrual)
                  : dayType === 'ovulation'
                  ? (colors as any).ovulationColor || '#F59E0B'
                  : dayType === 'pms'
                  ? (colors as any).luteal || '#A855F7'
                  : dayType === 'follicular'
                  ? colors.primary + '80'
                  : 'transparent';

                const isPeriod     = dayType === 'period';
                const isPredPeriod = dayType === 'predicted_period';
                const isLate       = dayType === 'late';
                const isOvulation  = dayType === 'ovulation';
                const isPms        = dayType === 'pms';
                const isFollic     = dayType === 'follicular';

                return (
                  <TouchableOpacity
                    key={dateStr}
                    onPress={() => !future && onDayPress(dateStr, entry?.periodId ?? null)}
                    activeOpacity={future ? 1 : 0.75}
                    style={{ flex: 1, height: 44, alignItems: 'center', justifyContent: 'center' }}
                  >
                    {/* Period strip background */}
                    {isPeriod && (
                      <View
                        style={{
                          position: 'absolute',
                          top: 5, bottom: 5,
                          left:  isStart ? 4 : 0,
                          right: isEnd   ? 4 : 0,
                          backgroundColor: phaseColor + '35',
                          borderTopLeftRadius:     isStart ? 18 : 0,
                          borderBottomLeftRadius:  isStart ? 18 : 0,
                          borderTopRightRadius:    isEnd   ? 18 : 0,
                          borderBottomRightRadius: isEnd   ? 18 : 0,
                        }}
                      />
                    )}

                    {/* Phase dot for non-period days */}
                    {(isOvulation || isPms || isFollic) && (
                      <View
                        style={{
                          position: 'absolute',
                          bottom: 4,
                          width: 5, height: 5, borderRadius: 2.5,
                          backgroundColor: phaseColor,
                        }}
                      />
                    )}

                    {/* Day circle */}
                    <View
                      style={{
                        width: 30, height: 30, borderRadius: 15,
                        alignItems: 'center', justifyContent: 'center',
                        backgroundColor: todayDay
                          ? colors.primary
                          : isPeriod
                          ? phaseColor + '20'
                          : isPredPeriod
                          ? colors.menstrual + '12'
                          : isLate
                          ? '#F59E0B18'
                          : 'transparent',
                        borderWidth: isOvulation ? 1.5 : isPredPeriod || isLate ? 1.5 : 0,
                        borderColor: isOvulation
                          ? phaseColor
                          : isPredPeriod
                          ? colors.menstrual
                          : isLate
                          ? '#F59E0B'
                          : 'transparent',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: typography.sm,
                          fontWeight: (isPeriod || isPredPeriod || isLate || isOvulation || isPms || todayDay) ? '800' : '400',
                          color: todayDay
                            ? '#fff'
                            : isPeriod
                            ? phaseColor
                            : isPredPeriod
                            ? colors.menstrual
                            : isLate
                            ? '#F59E0B'
                            : isOvulation
                            ? (colors as any).ovulationColor || '#F59E0B'
                            : isPms
                            ? (colors as any).luteal || '#A855F7'
                            : future
                            ? colors.border
                            : colors.textPrimary,
                        }}
                      >
                        {day.getDate()}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </Animated.View>

        {/* Swipe hint */}
        <Text style={{ color: colors.textTertiary, fontSize: 10, textAlign: 'center', marginTop: spacing[3] }}>
          Swipe left or right to change months
        </Text>

        {/* Legend */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3], marginTop: spacing[2], justifyContent: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1] }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.menstrual }} />
            <Text style={{ color: colors.textSecondary, fontSize: 10 }}>Period</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1] }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary + '80' }} />
            <Text style={{ color: colors.textSecondary, fontSize: 10 }}>Follicular</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1] }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: (colors as any).ovulationColor || '#F59E0B' }} />
            <Text style={{ color: colors.textSecondary, fontSize: 10 }}>Fertile window</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1] }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: (colors as any).luteal || '#A855F7' }} />
            <Text style={{ color: colors.textSecondary, fontSize: 10 }}>PMS</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1] }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }} />
            <Text style={{ color: colors.textSecondary, fontSize: 10 }}>Today</Text>
          </View>
        </View>
      </View>
    </View>
  );
}


// ── Main screen ───────────────────────────────────────────────────────────────
export default function CycleTrackerScreen() {
  const navigation = useNavigation<Props['navigation']>();
  const { colors, spacing, typography, borderRadius } = useTheme();

  const { data: profile } = useProfile();
  const isMale            = profile?.sex === 'male';
  const hasPartner        = (profile?.partners?.length ?? 0) > 0;
  const isMaleWithPartner = isMale && hasPartner;

  const { data: periods, isLoading, refetch } = usePeriods(
    isMaleWithPartner ? 'partner' : undefined,
  );

  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode]     = useState<ViewMode>('calendar');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Build the full cycle map for selected period detail
  const cycleMap = useMemo(() => buildCycleDateMap((periods as any[]) ?? []), [periods]);

  // Find period for selected date (check period OR phases)
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

  const handleDayPress = useCallback((dateStr: string, periodId: number | null) => {
    setSelectedDate(prev => prev === dateStr ? null : dateStr);
  }, []);

  if (isLoading && !refreshing) {
    return <LoadingState fullScreen message="Loading period history…" />;
  }

  const partnerName =
    (periods as any)?.[0]?.partner_name ??
    profile?.partners?.[0]?.username ??
    'Partner';

  const periodList = (periods as any[]) ?? [];

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: spacing[10] }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <View style={{ paddingHorizontal: spacing[5], paddingTop: spacing[5], paddingBottom: spacing[4] }}>
        {/* Partner banner */}
        {isMaleWithPartner && (
          <View
            style={{
              flexDirection: 'row', alignItems: 'center', gap: spacing[2],
              backgroundColor: colors.primaryLighter, padding: spacing[3],
              borderRadius: borderRadius.lg, marginBottom: spacing[4],
            }}
          >
            <Text style={{ color: colors.primary, fontSize: typography.sm, fontWeight: '600' }}>
              {partnerName}'s Period History
            </Text>
          </View>
        )}

        {/* Log button + view toggle row */}
        <View style={{ flexDirection: 'row', gap: spacing[3], alignItems: 'center' }}>
          {!isMale && (
            <View style={{ flex: 1 }}>
              <Button
                label="Log New Period"
                onPress={() => navigation.navigate('LogPeriod')}
                size="md"
                fullWidth
              />
            </View>
          )}

          {/* View mode toggle */}
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: colors.surfaceSecondary,
              borderRadius: 12,
              padding: 3,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <TouchableOpacity
              onPress={() => setViewMode('calendar')}
              activeOpacity={0.8}
              style={{
                paddingHorizontal: spacing[3], paddingVertical: spacing[2],
                borderRadius: 10,
                backgroundColor: viewMode === 'calendar' ? colors.surface : 'transparent',
                shadowColor: viewMode === 'calendar' ? colors.shadowColor : 'transparent',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: viewMode === 'calendar' ? 2 : 0,
                flexDirection: 'row', alignItems: 'center', gap: spacing[1],
              }}
            >
              <Icon name="calendar-month-outline" size={18} color={viewMode === 'calendar' ? colors.primary : colors.textSecondary} />
              <Text style={{ fontSize: typography.xs, fontWeight: viewMode === 'calendar' ? '700' : '400', color: viewMode === 'calendar' ? colors.primary : colors.textSecondary }}>
                Calendar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setViewMode('list')}
              activeOpacity={0.8}
              style={{
                paddingHorizontal: spacing[3], paddingVertical: spacing[2],
                borderRadius: 10,
                backgroundColor: viewMode === 'list' ? colors.surface : 'transparent',
                shadowColor: viewMode === 'list' ? colors.shadowColor : 'transparent',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: viewMode === 'list' ? 2 : 0,
                flexDirection: 'row', alignItems: 'center', gap: spacing[1],
              }}
            >
              <Icon name="format-list-bulleted" size={18} color={viewMode === 'list' ? colors.primary : colors.textSecondary} />
              <Text style={{ fontSize: typography.xs, fontWeight: viewMode === 'list' ? '700' : '400', color: viewMode === 'list' ? colors.primary : colors.textSecondary }}>
                List
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ── Calendar View ───────────────────────────────────────────── */}
      {viewMode === 'calendar' && (
        <View style={{ paddingHorizontal: spacing[5] }}>
          {periodList.length > 0 ? (
            <>
              <CycleCalendar
                periods={periodList}
                isMaleWithPartner={isMaleWithPartner}
                onDayPress={handleDayPress}
              />

              {/* Selected day detail card */}
              {selectedDate && (selectedPeriod || selectedDayType) && (
                <TouchableOpacity
                  onPress={() =>
                    selectedPeriod && !isMaleWithPartner &&
                    navigation.navigate('PeriodDetail', { periodId: selectedPeriod.id })
                  }
                  activeOpacity={selectedPeriod && !isMaleWithPartner ? 0.82 : 1}
                >
                  <Card style={{ marginBottom: spacing[3], overflow: 'hidden' }}>
                    {/* Phase color accent */}
                    <View style={{
                      height: 3,
                      backgroundColor:
                        selectedDayType === 'period' ? colors.menstrual
                        : selectedDayType === 'ovulation' ? (colors as any).ovulationColor || '#F59E0B'
                        : selectedDayType === 'pms' ? (colors as any).luteal || '#A855F7'
                        : colors.primary + '80',
                      marginTop: -spacing[3], marginHorizontal: -spacing[4], marginBottom: spacing[3],
                    }} />

                    <Text style={{ color: colors.textSecondary, fontSize: typography.xs, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: spacing[2] }}>
                      {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </Text>

                    {/* Phase label */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[2] }}>
                      <View style={{
                        paddingHorizontal: spacing[3], paddingVertical: 3,
                        borderRadius: 20,
                        backgroundColor:
                          selectedDayType === 'period' ? colors.menstrual + '20'
                          : selectedDayType === 'ovulation' ? ((colors as any).ovulationColor || '#F59E0B') + '20'
                          : selectedDayType === 'pms' ? ((colors as any).luteal || '#A855F7') + '20'
                          : colors.primary + '15',
                      }}>
                        <Text style={{
                          fontSize: typography.xs, fontWeight: '700',
                          color:
                            selectedDayType === 'period' ? colors.menstrual
                            : selectedDayType === 'ovulation' ? (colors as any).ovulationColor || '#F59E0B'
                            : selectedDayType === 'pms' ? (colors as any).luteal || '#A855F7'
                            : colors.primary,
                        }}>
                          {selectedDayType === 'period' ? 'Menstrual phase'
                           : selectedDayType === 'ovulation' ? 'Fertile window'
                           : selectedDayType === 'pms' ? 'PMS / Luteal phase'
                           : 'Follicular phase'}
                        </Text>
                      </View>
                    </View>

                    {selectedPeriod && (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View>
                          <Text style={{ color: colors.textPrimary, fontSize: typography.sm, fontWeight: '700' }}>
                            {formatDate(selectedPeriod.start_date)}
                            {selectedPeriod.end_date ? ` → ${formatDate(selectedPeriod.end_date)}` : ' → ongoing'}
                          </Text>
                          {selectedPeriod.symptoms ? (
                            <Text style={{ color: colors.textTertiary, fontSize: typography.xs, marginTop: spacing[1] }} numberOfLines={1}>
                              {selectedPeriod.symptoms}
                            </Text>
                          ) : null}
                        </View>
                        <View style={{ flexDirection: 'row', gap: spacing[2], alignItems: 'center' }}>
                          {selectedPeriod.period_duration > 0 && (
                            <View style={{ alignItems: 'center' }}>
                              <Text style={{ color: colors.menstrual, fontSize: typography.xl, fontWeight: '800' }}>{selectedPeriod.period_duration}</Text>
                              <Text style={{ color: colors.textTertiary, fontSize: typography.xs }}>days</Text>
                            </View>
                          )}
                          {!isMaleWithPartner && (
                            <TouchableOpacity
                              onPress={() => navigation.navigate('EditPeriod', { periodId: selectedPeriod.id })}
                              activeOpacity={0.75}
                              style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <Icon name="pencil-outline" size={17} color={colors.primary} />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    )}
                  </Card>
                </TouchableOpacity>
              )}

              {selectedDate && !selectedPeriod && (
                <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: spacing[4], marginBottom: spacing[3], borderWidth: 1, borderColor: colors.border }}>
                  <Text style={{ color: colors.textSecondary, fontSize: typography.sm, textAlign: 'center' }}>
                    No period recorded for {new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Text>
                </View>
              )}
            </>
          ) : (
            <EmptyState
              icon="📅"
              title={isMaleWithPartner ? 'No periods logged yet' : 'No cycles recorded yet'}
              description={
                isMaleWithPartner
                  ? "Your partner hasn't logged any periods yet."
                  : 'Log your first period to start tracking your cycle.'
              }
              actionLabel={isMale ? undefined : 'Log Period'}
              onAction={isMale ? undefined : () => navigation.navigate('LogPeriod')}
            />
          )}
        </View>
      )}

      {/* ── List View ───────────────────────────────────────────────── */}
      {viewMode === 'list' && (
        <View style={{ paddingHorizontal: spacing[5] }}>
          <Text style={{ color: colors.textPrimary, fontSize: typography.lg, fontWeight: '700', marginBottom: spacing[4] }}>
            {isMaleWithPartner ? `${partnerName}'s Cycles` : 'Your Cycle History'}
          </Text>

          {periodList.length > 0 ? (
            periodList.map((period: any) => {
              const nextPeriod = safeNextPeriod(period);
              const isOngoing  = !period.end_date;

              return (
                <TouchableOpacity
                  key={period.id}
                  onPress={() =>
                    !isMaleWithPartner &&
                    navigation.navigate('PeriodDetail', { periodId: period.id })
                  }
                  activeOpacity={isMaleWithPartner ? 1 : 0.75}
                  style={{ marginBottom: spacing[3] }}
                >
                  <Card>
                    <View style={{ height: 3, backgroundColor: isOngoing ? (colors as any).ovulationColor || colors.primary : colors.menstrual, borderTopLeftRadius: 12, borderTopRightRadius: 12, marginTop: -spacing[3], marginHorizontal: -spacing[4], marginBottom: spacing[3] }} />

                    <View style={styles.rowBetween}>
                      <View style={{ flex: 1 }}>
                        {isOngoing && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1], marginBottom: spacing[2] }}>
                            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: (colors as any).ovulationColor || colors.primary }} />
                            <Text style={{ color: (colors as any).ovulationColor || colors.primary, fontSize: typography.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                              Active
                            </Text>
                          </View>
                        )}

                        <Text style={{ color: colors.textPrimary, fontSize: typography.sm, fontWeight: '700', marginBottom: spacing[1] }}>
                          {formatDate(period.start_date)}
                          {period.end_date ? ` → ${formatDate(period.end_date)}` : ' → ongoing'}
                        </Text>

                        {nextPeriod && (
                          <Text style={{ color: colors.textSecondary, fontSize: typography.xs, marginBottom: spacing[1] }}>
                            Next predicted: {formatDate(nextPeriod)}
                          </Text>
                        )}

                        {period.symptoms ? (
                          <Text style={{ color: colors.textTertiary, fontSize: typography.xs, marginTop: 2 }} numberOfLines={1}>
                            Symptoms: {period.symptoms}
                          </Text>
                        ) : null}

                        {period.medication ? (
                          <Text style={{ color: colors.textTertiary, fontSize: typography.xs, marginTop: 2 }} numberOfLines={1}>
                            Medication: {period.medication}
                          </Text>
                        ) : null}
                      </View>

                      <View style={{ alignItems: 'center', marginLeft: spacing[3], gap: spacing[2] }}>
                        {period.period_duration > 0 ? (
                          <>
                            <Text style={{ color: colors.menstrual, fontSize: typography.xl, fontWeight: '800' }}>{period.period_duration}</Text>
                            <Text style={{ color: colors.textTertiary, fontSize: typography.xs }}>days</Text>
                          </>
                        ) : (
                          <Badge label="ongoing" variant="neutral" />
                        )}

                        {!isMaleWithPartner && (
                          <TouchableOpacity
                            onPress={() => navigation.navigate('EditPeriod', { periodId: period.id })}
                            activeOpacity={0.75}
                            style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <Icon name="pencil-outline" size={17} color={colors.primary} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </Card>
                </TouchableOpacity>
              );
            })
          ) : (
            <EmptyState
              icon="📅"
              title={isMaleWithPartner ? 'No periods logged yet' : 'No cycles recorded yet'}
              description={
                isMaleWithPartner
                  ? "Your partner hasn't logged any periods yet."
                  : 'Log your first period to start tracking your cycle.'
              }
              actionLabel={isMale ? undefined : 'Log Period'}
              onAction={isMale ? undefined : () => navigation.navigate('LogPeriod')}
            />
          )}
        </View>
      )}

      {/* ── Analysis link ────────────────────────────────────────────── */}
      <View style={{ paddingHorizontal: spacing[5], marginTop: spacing[5] }}>
        <Button
          label="View Detailed Analysis"
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
  flex:       { flex: 1 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
});
