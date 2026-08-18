/**
 * InsightsHomeScreen — الگوهای من
 *
 * The Patterns tab. Data-state aware:
 *   - If insufficient data: explains what will be shown here
 *   - If one cycle: surfaces deterministic first-cycle notes
 *   - If multi-cycle: future home for cross-cycle intelligence (Phase 2)
 *
 * This screen should make users want to log more — not out of streak anxiety,
 * but because they genuinely want to see their patterns complete.
 */
import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@hooks/useTheme';
import { usePeriods, useCycleAnalysis } from '@hooks/queries/usePeriods';
import { useWellnessLogs, useWellnessAnalytics } from '@hooks/queries/useWellness';
import { deriveDataState, PatternCard } from '../home/components/PatternCard';
import type { WellnessLog } from '@types/wellness.types';
import type { CycleAnalysis } from '@types/period.types';

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  const { colors, typography, spacing } = useTheme();
  return (
    <View style={{ marginBottom: spacing[3] }}>
      <Text style={{ color: colors.textPrimary, fontSize: typography.lg, fontWeight: '800', letterSpacing: -0.3 }}>
        {title}
      </Text>
      {sub && (
        <Text style={{ color: colors.textSecondary, fontSize: typography.sm, marginTop: 2 }}>
          {sub}
        </Text>
      )}
    </View>
  );
}

// ── Wellness average card ─────────────────────────────────────────────────────

function AvgMetricRow({ label, value, max, color }: { label: string; value: number | null; max: number; color: string }) {
  const { colors, typography } = useTheme();
  if (value === null) { return null; }
  const pct = Math.min(1, value / max);
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ color: colors.textSecondary, fontSize: typography.sm, fontWeight: '500' }}>{label}</Text>
        <Text style={{ color: colors.textPrimary, fontSize: typography.sm, fontWeight: '700' }}>
          {value.toFixed(1)}
        </Text>
      </View>
      <View style={[styles.bar, { backgroundColor: colors.border }]}>
        <View style={[styles.barFill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function InsightsHomeScreen() {
  const { colors, spacing, typography } = useTheme();
  const navigation = useNavigation();

  const [refreshing, setRefreshing] = React.useState(false);

  const { data: periodsList, refetch: refetchPeriods } = usePeriods();
  const { data: allLogs,     refetch: refetchLogs }    = useWellnessLogs();
  const { data: analytics,   refetch: refetchAnalytics } = useWellnessAnalytics(30);
  const { data: cycleData,   refetch: refetchCycle }   = useCycleAnalysis();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([refetchPeriods(), refetchLogs(), refetchAnalytics(), refetchCycle()]);
    setRefreshing(false);
  }, [refetchPeriods, refetchLogs, refetchAnalytics, refetchCycle]);

  const periodCount = Array.isArray(periodsList) ? (periodsList as any[]).length : 0;
  const logCount    = Array.isArray(allLogs)     ? (allLogs     as any[]).length : 0;
  const dataState   = deriveDataState(periodCount, logCount);

  const avg = (analytics as any)?.averages;

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing[5], paddingBottom: spacing[20] }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* ── Header ───────────────────────────────────────────────────── */}
        <View style={[styles.header, { paddingTop: spacing[4], marginBottom: spacing[6] }]}>
          <Text style={[styles.screenTitle, { color: colors.textPrimary, fontSize: typography['2xl'] }]}>
            الگوهای من
          </Text>
          <Text style={[{ color: colors.textSecondary, fontSize: typography.sm }]}>
            {logCount} روز ثبت · {periodCount} سیکل
          </Text>
        </View>

        {/* ── Pattern status card ───────────────────────────────────────── */}
        <View style={{ marginBottom: spacing[6] }}>
          <PatternCard
            dataState={dataState}
            logCount={logCount}
            periodCount={periodCount}
            logs={(Array.isArray(allLogs) ? allLogs : []) as WellnessLog[]}
            cycleAnalysis={cycleData as CycleAnalysis | null}
            onInsightsPress={() => {}}
          />
        </View>

        {/* ── 30-day averages section ───────────────────────────────────── */}
        {avg && logCount >= 5 && (
          <View style={{ marginBottom: spacing[6] }}>
            <SectionHeader
              title="میانگین ۳۰ روز"
              sub="اعداد شخصی تو — نه میانگین جمعیت"
            />
            <View style={[styles.avgCard, { backgroundColor: colors.surface, shadowColor: colors.shadowColor }]}>
              <AvgMetricRow label="خواب (ساعت)"  value={avg.sleep_hours}      max={10} color={colors.primary} />
              <AvgMetricRow label="خلق (۱–۵)"   value={avg.mood_level}       max={5}  color={colors.luteal} />
              <AvgMetricRow label="انرژی (۱–۱۰)" value={avg.energy_level}     max={10} color={colors.ovulationColor} />
              <AvgMetricRow label="درد (۰–۱۰)"  value={avg.pain_level}       max={10} color={colors.menstrual} />
              <AvgMetricRow label="استرس (۰–۱۰)" value={avg.stress_level}    max={10} color={colors.follicular} />
            </View>
          </View>
        )}

        {/* ── Cycle regularity ─────────────────────────────────────────── */}
        {periodCount >= 2 && (
          <View style={{ marginBottom: spacing[6] }}>
            <SectionHeader
              title="انتظام سیکل"
              sub="بر اساس سیکل‌های ثبت‌شده"
            />
            <View style={[styles.avgCard, { backgroundColor: colors.surface, shadowColor: colors.shadowColor }]}>
              <View style={styles.regRow}>
                <Text style={{ color: colors.textSecondary, fontSize: typography.sm, fontWeight: '500' }}>
                  طول متوسط سیکل
                </Text>
                <Text style={{ color: colors.textPrimary, fontSize: typography.lg, fontWeight: '800' }}>
                  {(cycleData as CycleAnalysis | undefined)?.average_cycle
                    ? `${Math.round((cycleData as CycleAnalysis).average_cycle!)} روز`
                    : '—'}
                </Text>
              </View>
              <View style={[styles.regRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
                <Text style={{ color: colors.textSecondary, fontSize: typography.sm, fontWeight: '500' }}>
                  امتیاز انتظام
                </Text>
                <Text style={{ color: colors.textPrimary, fontSize: typography.lg, fontWeight: '800' }}>
                  {(cycleData as CycleAnalysis | undefined)?.regularity_score != null
                    ? `${Math.round((cycleData as CycleAnalysis).regularity_score! * 100)}٪`
                    : '—'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ── Phase 2 teaser ───────────────────────────────────────────── */}
        <View style={[styles.teaserCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Icon name="clock-time-four-outline" size={20} color={colors.textTertiary} style={{ marginBottom: 8 }} />
          <Text style={{ color: colors.textSecondary, fontSize: typography.sm, lineHeight: 20, textAlign: 'center' }}>
            وقتی چند سیکل کامل شود، الگوهای تکرارشونده — مثل تغییر خلق در روز خاصی از سیکل — اینجا نمایش داده می‌شوند.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {},
  screenTitle: {
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  avgCard: {
    borderRadius: 8,
    padding: 18,
    shadowOffset: { width: 0, height: 13 },
    shadowOpacity: 0.08,
    shadowRadius: 13,
    elevation: 6,
  },
  bar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
  },
  regRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  teaserCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    padding: 18,
    alignItems: 'center',
    marginBottom: 20,
  },
});
