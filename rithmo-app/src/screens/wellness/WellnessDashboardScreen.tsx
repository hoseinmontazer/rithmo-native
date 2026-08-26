/**
 * WellnessDashboardScreen — تاریخچه سلامت
 *
 * Leads with recent history — a 30-day mood/pain trend, the symptoms that
 * actually recur, and personal averages — then the day-by-day log below.
 *
 * F-04 changed what this screen asks for, and what it claims:
 *
 *  * **A bounded window.** It used to request 90 days on every visit and
 *    render 30 days of chart plus six log cards above the fold. It now asks
 *    for `RECENT_WINDOW_DAYS`, and the user widens it deliberately.
 *
 *  * **An honest total.** The header count used to be `logs.length` of the
 *    fetched page. That was only ever correct by accident — it read "۸۴
 *    گزارش" because the 90-day window happened to span this user's whole
 *    history. Narrowing the window would have silently turned it into a
 *    wrong total, which is exactly the kind of number this product must not
 *    invent. The total now comes from `/api/wellness/streaks/`
 *    (`total_logs`), which counts every log the user has, independent of
 *    whatever window is on screen.
 *
 *  * **Labelled windows.** "میانگین خواب" over an unstated period is not a
 *    fact the user can check. Every windowed figure now says its window.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@hooks/useTheme';
import { screen } from '@theme/spacing';
import { useWellnessLogs, useWellnessStreaks } from '@hooks/queries/useWellness';
import {
  Card,
  ErrorState,
  EmptyState,
  Button,
  MoodTimeline,
  Reveal,
} from '@components/ui';
import { symptomLabel } from '@constants/symptoms';
import { symptomIcon, moodIcon, ICON_SIZE } from '@design-system/iconography';
import { SkeletonBlock } from '@components/ui/Skeleton';
import { toFa, faDateShort } from '@utils/persian';
import { computeSymptomTrends, mood5 } from '@utils/insightsEngine';
import type { WellnessLog } from '../../types/wellness.types';
import type { WellnessScreenProps } from '@navigation/types';

type Props = WellnessScreenProps<'WellnessDashboard'>;

/**
 * The window the screen opens on. The trend chart shows 30 days and the
 * averages describe 30 days, so fetching 30 days means the request matches
 * what is actually rendered and claimed.
 */
const RECENT_WINDOW_DAYS = 30;

/** Steps the user can widen the history to, in days. */
const WINDOW_STEPS = [30, 90, 365] as const;
const MAX_WINDOW_DAYS = WINDOW_STEPS[WINDOW_STEPS.length - 1];

// ── local helpers ────────────────────────────────────────────────────────────

function mean(nums: number[]): number | null {
  if (nums.length === 0) { return null; }
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

// ── Symptom trend bar ────────────────────────────────────────────────────────

function SymptomTrendBar({
  name,
  count,
  pct,
  icon,
}: {
  name: string;
  count: number;
  pct: number;
  /** MaterialCommunityIcons glyph for this symptom — see iconography. */
  icon: string;
}) {
  const { colors, typography, spacing } = useTheme();
  return (
    <View style={{ marginBottom: spacing[2] }}>
      <View style={styles.trendHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Icon name={icon} size={ICON_SIZE.xs} color={colors.textSecondary} />
          <Text style={[styles.trendName, { color: colors.textPrimary, fontSize: typography.xs }]}>
            {name}
          </Text>
        </View>
        <Text style={[styles.trendCount, { color: colors.textTertiary, fontSize: typography.xs }]}>
          {toFa(count)} بار · {toFa(Math.round(pct * 100))}٪
        </Text>
      </View>
      <View style={[styles.trendTrack, { backgroundColor: colors.surfaceSecondary, borderRadius: 3 }]}>
        <View
          style={[
            styles.trendFill,
            {
              width: `${Math.max(4, pct * 100)}%`,
              borderRadius: 3,
              backgroundColor: colors.primary,
            },
          ]}
        />
      </View>
    </View>
  );
}

// ── Main screen ──────────────────────────────────────────────────────────────

export default function WellnessDashboardScreen() {
  const navigation = useNavigation<Props['navigation']>();
  const { colors, spacing, typography, borderRadius } = useTheme();
  // The window the screen opens on, and the steps the user can widen it to.
  // 30 days matches what the trend chart and the averages describe, so the
  // request and the claims on screen are the same period.
  const [windowDays, setWindowDays] = useState<number>(RECENT_WINDOW_DAYS);

  const { data: logs, isLoading, isFetching, isError, error, refetch } =
    useWellnessLogs({ days: windowDays });

  // The true number of logs, independent of the window on screen. Tiny
  // response (114 B) from an endpoint that already existed.
  const { data: streaks } = useWellnessStreaks();

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // Memoised: the `[]` fallback produced a new array identity on every
  // render, so the symptom-trend and average useMemos below recomputed over
  // the whole window each time instead of only when the data changed.
  const logsArr: WellnessLog[] = useMemo(
    () => (Array.isArray(logs) ? (logs as unknown as WellnessLog[]) : []),
    [logs],
  );

  /** How many logs are on screen right now. */
  const windowCount = logsArr.length;

  /**
   * Every log the user has ever written.
   *
   * Falls back to the window count only while streaks is still loading, and
   * is never used to claim a total larger than what we know.
   */
  const totalLogs: number = typeof streaks?.total_logs === 'number'
    ? streaks.total_logs
    : windowCount;

  /** True when the window is provably hiding older logs. */
  const hasOlder = totalLogs > windowCount && windowDays < MAX_WINDOW_DAYS;

  const symptomTrends = useMemo(
    () => computeSymptomTrends(logsArr, 5),
    [logsArr],
  );

  const avgSleep = useMemo(() => mean(logsArr.map(l => l.sleep_hours).filter(s => s > 0)), [logsArr]);
  const avgMood = useMemo(
    () => mean(logsArr.map(l => mood5(l.mood_level)).filter((m): m is number => m !== null)),
    [logsArr],
  );
  const avgEnergy = useMemo(() => mean(logsArr.map(l => l.energy_level).filter(e => e > 0)), [logsArr]);

  const renderItem = useCallback(({ item }: { item: WellnessLog }) => (
    <Card elevated={false} style={{ marginBottom: spacing[3], padding: spacing[4] }}>
      <View style={styles.logHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={[styles.dateDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.logDateText, { color: colors.textPrimary, fontSize: typography.base }]}>
            {faDateShort(item.date)}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('LogWellness', { logId: item.id })}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={[styles.editBtn, { backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius.sm }]}
          accessibilityLabel="ویرایش گزارش سلامت"
        >
          <Icon name="pencil-outline" size={14} color={colors.textSecondary} />
          <Text style={{ color: colors.textSecondary, fontSize: typography.xs, marginLeft: 4, fontWeight: '600' }}>
            ویرایش
          </Text>
        </TouchableOpacity>
      </View>

      {/* Metric chips row (fa numerals) */}
      <View style={[styles.chipsRow, { gap: spacing[2], marginVertical: spacing[3] }]}>
        {item.sleep_hours > 0 && (
          <View style={[styles.metricChip, { backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius.md }]}>
            <Icon name="weather-night" size={14} color={colors.primary} />
            <Text style={[styles.metricChipText, { color: colors.textPrimary, fontSize: typography.xs }]}>
              {toFa(item.sleep_hours)} ساعت خواب
            </Text>
          </View>
        )}

        <View style={[styles.metricChip, { backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius.md }]}>
          <Icon name="emoticon-outline" size={14} color={colors.luteal} />
          <Text style={[styles.metricChipText, { color: colors.textPrimary, fontSize: typography.xs }]}>
            خلق {toFa(mood5(item.mood_level) ?? 3)}/۵
          </Text>
        </View>

        <View style={[styles.metricChip, { backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius.md }]}>
          <Icon name="lightning-bolt-outline" size={14} color={colors.ovulation} />
          <Text style={[styles.metricChipText, { color: colors.textPrimary, fontSize: typography.xs }]}>
            انرژی {toFa(item.energy_level)}/۱۰
          </Text>
        </View>

        {item.pain_level != null && item.pain_level > 0 && (
          <View style={[styles.metricChip, { backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius.md }]}>
            <Icon name="pill" size={14} color={colors.menstrual} />
            <Text style={[styles.metricChipText, { color: colors.textPrimary, fontSize: typography.xs }]}>
              درد {toFa(item.pain_level)}/۱۰
            </Text>
          </View>
        )}
      </View>

      {/* Optional symptoms list. The API stores canonical codes, so the
          Persian label is resolved for display rather than showing the
          raw code the pattern engine groups by. */}
      {(item.symptom_codes?.length ?? 0) > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: spacing[2] }}>
          {item.symptom_codes!.map((code) => (
            <View
              key={code}
              style={[styles.symptomChip, { backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius.pill }]}
            >
              <Icon name={symptomIcon(code)} size={ICON_SIZE.xs} color={colors.textSecondary} />
              <Text style={{ color: colors.textSecondary, fontSize: typography.xs, marginRight: 4 }}>
                {symptomLabel(code)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Optional notes */}
      {item.notes ? (
        <Text style={[styles.notesText, { color: colors.textSecondary, fontSize: typography.xs, marginTop: spacing[1] }]}>
          «{item.notes}»
        </Text>
      ) : null}
    </Card>
  ), [navigation, colors, spacing, typography, borderRadius]);

  const keyExtractor = useCallback((item: WellnessLog) => String(item.id), []);

  // ── List header: visual history (mood graph + symptom trends + averages) ──
  const listHeader = (
    <View>
      {/* Quick Action Shortcuts */}
      <View style={[styles.actionsRow, { gap: spacing[2], marginBottom: spacing[4] }]}>
        <Button
          label="ثبت گزارش جدید"
          variant="primary"
          size="sm"
          onPress={() => navigation.navigate('LogWellness', {})}
          icon={<Icon name="plus" size={16} color={colors.textOnPrimary} />}
          style={{ flex: 1 }}
        />
        <Button
          label="تقویم چرخه"
          variant="secondary"
          size="sm"
          onPress={() => (navigation as unknown as { navigate: (name: string) => void }).navigate('CycleTab')}
          icon={<Icon name="calendar-month" size={16} color={colors.textPrimary} />}
          style={{ flex: 1 }}
        />
      </View>

      {windowCount >= 2 && (
        <>
          <Reveal>
            <View style={[styles.section, { marginBottom: spacing[5] }]}>
              <View style={[styles.sectionHeading, { marginBottom: spacing[2] }]}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: typography.lg }]}>
                  روند {toFa(Math.min(windowDays, RECENT_WINDOW_DAYS))} روز اخیر
                </Text>
                <Text style={[styles.sectionSub, { color: colors.textTertiary, fontSize: typography.xs }]}>
                  دایره: خلق · خط: درد
                </Text>
              </View>
              <Card elevated={false} style={{ padding: spacing[4] }}>
                <MoodTimeline logs={logsArr} days={30} showPain />
              </Card>
            </View>
          </Reveal>

          {symptomTrends.length > 0 && (
            <Reveal delay={80}>
              <View style={[styles.section, { marginBottom: spacing[5] }]}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: typography.lg, marginBottom: spacing[3] }]}>
                  رایج‌ترین علائم — {toFa(windowDays)} روز اخیر
                </Text>
                <Card elevated={false} style={{ padding: spacing[4] }}>
                  {symptomTrends.map(t => (
                    <SymptomTrendBar
                      key={t.name}
                      name={symptomLabel(t.name)}
                      icon={symptomIcon(t.name)}
                      count={t.count}
                      pct={t.pct}
                    />
                  ))}
                </Card>
              </View>
            </Reveal>
          )}

          {(avgSleep !== null || avgMood !== null || avgEnergy !== null) && (
            <Reveal delay={160}>
              <View style={[styles.tileRow, { gap: spacing[2], marginBottom: spacing[5] }]}>
                {avgSleep !== null && (
                  <Card elevated={false} style={{ flex: 1, padding: 12 }}>
                    <Text style={[styles.avgValue, { color: colors.textPrimary, fontSize: typography.xl }]}>
                      {toFa(avgSleep.toFixed(1))}
                    </Text>
                    <Text style={[styles.avgLabel, { color: colors.textSecondary, fontSize: typography.xs }]}>
                      میانگین خواب (ساعت) · {toFa(windowDays)} روز
                    </Text>
                  </Card>
                )}
                {avgMood !== null && (
                  <Card elevated={false} style={{ flex: 1, padding: 12 }}>
                    <View style={styles.avgValueRow}>
                      <Icon
                        name={moodIcon(mood5(avgMood) ?? 3)}
                        size={ICON_SIZE.sm}
                        color={colors.textPrimary}
                      />
                      <Text style={[styles.avgValue, { color: colors.textPrimary, fontSize: typography.xl }]}>
                        {toFa(avgMood.toFixed(1))}
                      </Text>
                    </View>
                    <Text style={[styles.avgLabel, { color: colors.textSecondary, fontSize: typography.xs }]}>
                      میانگین خلق · {toFa(windowDays)} روز
                    </Text>
                  </Card>
                )}
                {avgEnergy !== null && (
                  <Card elevated={false} style={{ flex: 1, padding: 12 }}>
                    <Text style={[styles.avgValue, { color: colors.textPrimary, fontSize: typography.xl }]}>
                      {toFa(avgEnergy.toFixed(1))}
                    </Text>
                    <Text style={[styles.avgLabel, { color: colors.textSecondary, fontSize: typography.xs }]}>
                      میانگین انرژی · {toFa(windowDays)} روز
                    </Text>
                  </Card>
                )}
              </View>
            </Reveal>
          )}
        </>
      )}
    </View>
  );

  /*
   * The header is real content, not chrome: the screen title and the honest
   * total come from a separate, tiny query. Blanking the whole screen behind
   * a centred spinner threw that away and made the wait feel longer than it
   * was. The skeleton keeps the page's shape so nothing jumps when the data
   * lands, and reuses the F-02 primitive rather than introducing a second
   * loading language.
   */
  const renderHeader = () => (
    <View style={[styles.headerSection, { paddingHorizontal: spacing[4], paddingTop: spacing[2], marginBottom: spacing[3] }]}>
      <View>
        <Text style={[styles.overline, { color: colors.textTertiary, fontSize: typography.xs }]}>
          ریتمو · تاریخچه سلامت
        </Text>
        <Text style={[styles.screenTitle, { color: colors.textPrimary, fontSize: typography['2xl'] }]}>
          گزارش‌های روزانه
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: typography.sm }]}>
          {totalLogs > 0
            ? `${toFa(totalLogs)} گزارش ثبت‌شده`
            : 'هنوز گزارشی ثبت نشده است'}
        </Text>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
        {renderHeader()}
        <View style={{ paddingHorizontal: spacing[4] }}>
          <SkeletonBlock height={40} radius={12} style={{ marginBottom: 16 }} />
          <SkeletonBlock height={150} radius={16} style={{ marginBottom: 20 }} />
          <SkeletonBlock height={110} radius={16} style={{ marginBottom: 20 }} />
          <SkeletonBlock height={78} radius={16} style={{ marginBottom: 12 }} />
          <SkeletonBlock height={78} radius={16} />
        </View>
      </SafeAreaView>
    );
  }
  if (isError) {
    /*
     * A failed history fetch is not a reason to blank the screen. The title,
     * the honest total (a separate query that may well have succeeded) and
     * "log a new entry" all remain useful and actionable when the list is
     * unavailable — logging today does not depend on reading the past.
     */
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
        {renderHeader()}
        <View style={{ paddingHorizontal: spacing[4] }}>
          <Button
            label="ثبت گزارش جدید"
            variant="primary"
            size="sm"
            onPress={() => navigation.navigate('LogWellness', {})}
            icon={<Icon name="plus" size={16} color={colors.textOnPrimary} />}
            style={{ marginBottom: spacing[4] }}
          />
          <ErrorState error={error} onRetry={refetch} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <View style={[styles.headerSection, { paddingHorizontal: spacing[4], paddingTop: spacing[2], marginBottom: spacing[3] }]}>
        <View>
          <Text style={[styles.overline, { color: colors.textTertiary, fontSize: typography.xs }]}>
            ریتمو · تاریخچه سلامت
          </Text>
          <Text style={[styles.screenTitle, { color: colors.textPrimary, fontSize: typography['2xl'] }]}>
            گزارش‌های روزانه
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: typography.sm }]}>
            {totalLogs > 0
              ? `${toFa(totalLogs)} گزارش ثبت‌شده`
              : 'هنوز گزارشی ثبت نشده است'}
          </Text>
        </View>
      </View>

      <FlatList
        data={logsArr}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={listHeader}
        contentContainerStyle={{
          paddingHorizontal: screen.gutter,
          paddingTop: screen.top,
          paddingBottom: screen.bottomTab,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListFooterComponent={
          /*
           * Progressive disclosure for older history.
           *
           * No pagination envelope and no invented metadata: the button only
           * appears when we can *prove* older logs exist — `total_logs` from
           * the server exceeds what the current window returned — and it
           * widens the same bounded query the screen already uses. The label
           * states the real numbers so the user always knows what is on
           * screen versus what exists.
           */
          windowCount > 0 && hasOlder ? (
            <View style={{ marginTop: spacing[2] }}>
              <Text
                style={{
                  color: colors.textTertiary,
                  fontSize: typography.xs,
                  textAlign: 'center',
                  marginBottom: spacing[2],
                }}
              >
                {`${toFa(windowCount)} از ${toFa(totalLogs)} گزارش نمایش داده شده`}
              </Text>
              <Button
                label={isFetching ? 'در حال بارگذاری…' : 'نمایش تاریخچه‌ی قدیمی‌تر'}
                variant="secondary"
                size="sm"
                disabled={isFetching}
                onPress={() => {
                  const next = WINDOW_STEPS.find(d => d > windowDays) ?? MAX_WINDOW_DAYS;
                  setWindowDays(next);
                }}
              />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            title="هنوز گزارشی ثبت نشده"
            description="با ثبت اولین وضعیت روزانه، الگوها و روندهای سلامتت شکل می‌گیرند."
            actionLabel="ثبت وضعیت امروز"
            onAction={() => navigation.navigate('LogWellness', {})}
          />
        }
        removeClippedSubviews
        maxToRenderPerBatch={8}
        windowSize={5}
        initialNumToRender={6}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  overline: {
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  screenTitle: {
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontWeight: '500',
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
  },
  section: {},
  sectionHeading: {},
  symptomChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  sectionTitle: {
    fontWeight: '700',
  },
  sectionSub: {
    marginTop: 2,
  },
  tileRow: {
    flexDirection: 'row',
  },
  avgValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  avgValue: {
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  avgLabel: {
    fontWeight: '500',
    marginTop: 2,
  },
  trendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  trendName: {
    fontWeight: '600',
  },
  trendCount: {
    fontWeight: '500',
  },
  trendTrack: {
    height: 6,
    overflow: 'hidden',
  },
  trendFill: {
    height: '100%',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  logDateText: {
    fontWeight: '700',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metricChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  metricChipText: {
    fontWeight: '600',
  },
  notesText: {
    lineHeight: 18,
  },
});
