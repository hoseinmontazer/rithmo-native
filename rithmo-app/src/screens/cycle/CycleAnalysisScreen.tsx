import React, { useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
} from 'react-native';
import { useTheme } from '@hooks/useTheme';
import { useCycleAnalysis, useCycleInsights, useSymptomPatterns } from '@hooks/queries/usePeriods';
import { Card, LoadingState, ErrorState, Badge } from '@components/ui';
import { formatDate } from '@utils/dateUtils';

const PHASE_EMOJI: Record<string, string> = {
  menstrual: '🩸',
  follicular: '🌱',
  ovulation: '🥚',
  luteal: '🌙',
  Menstrual: '🩸',
  Follicular: '🌱',
  Ovulation: '🥚',
  Luteal: '🌙',
};

export default function CycleAnalysisScreen() {
  const { colors, spacing, typography, borderRadius } = useTheme();

  const { data: analysis, isLoading: aLoading, isError: aError, error: aErr, refetch: refetchA } = useCycleAnalysis();
  const { data: insights, isLoading: iLoading, refetch: refetchI } = useCycleInsights();
  const { data: patterns, isLoading: pLoading, refetch: refetchP } = useSymptomPatterns();

  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchA(), refetchI(), refetchP()]);
    setRefreshing(false);
  }, [refetchA, refetchI, refetchP]);

  if (aLoading || iLoading || pLoading) return <LoadingState fullScreen message="Analysing your cycle…" />;
  if (aError) return <ErrorState fullScreen error={aErr} onRetry={refetchA} />;

  // Handle both old and new API response formats
  const currentPhase = analysis?.current_status?.phase || analysis?.current_phase;
  const phaseDescription = analysis?.current_status?.phase_description;
  const cycleDay = analysis?.current_status?.cycle_day;
  const avgCycle = analysis?.average_cycle || analysis?.average_cycle_length;
  const nextPeriodDate = analysis?.next_predicted_date || analysis?.next_period_date;
  const daysUntilNext = analysis?.current_status?.days_until_next_period ?? analysis?.days_until_next_period;
  const isOnPeriod = analysis?.current_status?.is_on_period;
  const isFertileWindow = analysis?.current_status?.is_fertile_window;

  // Check if we have any data to display
  const hasData = analysis || insights || patterns;

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: colors.background }]}
      contentContainerStyle={{ padding: spacing[5] }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* Current phase */}
      {currentPhase && (
        <Card elevated style={{ marginBottom: spacing[4] }}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary, fontSize: typography.lg, fontWeight: '700', marginBottom: spacing[4] }]}>
            {PHASE_EMOJI[currentPhase] || '•'}  Current Phase
          </Text>
          <Badge
            label={currentPhase}
            variant="primary"
            style={{ marginBottom: spacing[4] }}
          />

          {phaseDescription && (
            <Text style={{ color: colors.textSecondary, fontSize: typography.sm, marginBottom: spacing[4], lineHeight: 20 }}>
              {phaseDescription}
            </Text>
          )}

          <View style={styles.statsGrid}>
            {cycleDay !== undefined && cycleDay !== null && (
              <StatBox label="Cycle Day" value={`Day ${cycleDay}`} colors={colors} spacing={spacing} typography={typography} borderRadius={borderRadius} />
            )}
            {avgCycle && (
              <StatBox label="Avg Cycle" value={`${avgCycle}d`} colors={colors} spacing={spacing} typography={typography} borderRadius={borderRadius} />
            )}
            {nextPeriodDate && (
              <StatBox label="Next Period" value={formatDate(nextPeriodDate)} colors={colors} spacing={spacing} typography={typography} borderRadius={borderRadius} />
            )}
            {daysUntilNext !== undefined && daysUntilNext !== null && (
              <StatBox label="Days Away" value={String(daysUntilNext)} colors={colors} spacing={spacing} typography={typography} borderRadius={borderRadius} />
            )}
          </View>
        </Card>
      )}

      {/* Fertile window */}
      {(analysis?.fertile_window_start || analysis?.current_status?.is_fertile_window) && (
        <Card style={{ marginBottom: spacing[4] }}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary, fontSize: typography.base, fontWeight: '600', marginBottom: spacing[3] }]}>
            ✨  Fertile Window
          </Text>
          {analysis.fertile_window_start && analysis.fertile_window_end ? (
            <>
              <View style={styles.row}>
                <View style={[styles.dateChip, { backgroundColor: colors.primaryLight, borderRadius: borderRadius.lg, padding: spacing[3] }]}>
                  <Text style={{ color: colors.primary, fontSize: typography.sm, fontWeight: '600' }}>
                    {formatDate(analysis.fertile_window_start)}
                  </Text>
                </View>
                <Text style={{ color: colors.textSecondary, marginHorizontal: spacing[3] }}>→</Text>
                <View style={[styles.dateChip, { backgroundColor: colors.primaryLight, borderRadius: borderRadius.lg, padding: spacing[3] }]}>
                  <Text style={{ color: colors.primary, fontSize: typography.sm, fontWeight: '600' }}>
                    {formatDate(analysis.fertile_window_end)}
                  </Text>
                </View>
              </View>
              {analysis.ovulation_date && (
                <Text style={{ color: colors.textSecondary, fontSize: typography.sm, marginTop: spacing[3] }}>
                  Ovulation predicted: {formatDate(analysis.ovulation_date)}
                </Text>
              )}
            </>
          ) : (
            <Text style={{ color: colors.textSecondary, fontSize: typography.sm }}>
              {analysis.current_status?.is_fertile_window 
                ? 'You are currently in your fertile window' 
                : 'Not currently in fertile window'}
            </Text>
          )}
        </Card>
      )}

      {/* Insights */}
      {insights && insights.insights && insights.insights.length > 0 && (
        <Card style={{ marginBottom: spacing[4] }}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary, fontSize: typography.base, fontWeight: '600', marginBottom: spacing[3] }]}>
            💡  Insights
          </Text>
          {insights.insights.map((insight, i) => (
            <View key={i} style={[styles.insightRow, { marginBottom: spacing[2] }]}>
              <Text style={{ color: colors.primary, marginRight: spacing[2] }}>•</Text>
              <Text style={{ color: colors.textPrimary, fontSize: typography.sm, lineHeight: 20, flex: 1 }}>
                {insight}
              </Text>
            </View>
          ))}
        </Card>
      )}

      {/* Symptom patterns */}
      {patterns && patterns.patterns && patterns.patterns.length > 0 && (
        <Card style={{ marginBottom: spacing[4] }}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary, fontSize: typography.base, fontWeight: '600', marginBottom: spacing[3] }]}>
            📊  Symptom Patterns
          </Text>
          {patterns.patterns.map((p) => (
            <View key={p.symptom} style={[styles.patternRow, { marginBottom: spacing[3] }]}>
              <View style={styles.patternLeft}>
                <Text style={{ color: colors.textPrimary, fontSize: typography.sm, fontWeight: '500', textTransform: 'capitalize' }}>
                  {p.symptom}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: typography.xs, marginTop: 2 }}>
                  Most common in {p.most_common_phase} phase
                </Text>
              </View>
              <Badge label={`${p.frequency}×`} variant="neutral" />
            </View>
          ))}
        </Card>
      )}

      {/* Empty state */}
      {!hasData && (
        <Card style={{ padding: spacing[6], alignItems: 'center' }}>
          <Text style={{ color: colors.textSecondary, fontSize: typography.base, textAlign: 'center' }}>
            No cycle data available yet.{'\n'}Log your first period to see analysis.
          </Text>
        </Card>
      )}

      <View style={{ height: spacing[8] }} />
    </ScrollView>
  );
}

// ── Local sub-component ───────────────────────────────────────────────────────
function StatBox({ label, value, colors, spacing, typography, borderRadius }: {
  label: string; value: string;
  colors: ReturnType<typeof useTheme>['colors'];
  spacing: ReturnType<typeof useTheme>['spacing'];
  typography: ReturnType<typeof useTheme>['typography'];
  borderRadius: ReturnType<typeof useTheme>['borderRadius'];
}) {
  return (
    <View style={[{
      backgroundColor: colors.surfaceSecondary,
      borderRadius: borderRadius.lg,
      padding: spacing[3],
      width: '47%',
      marginBottom: spacing[3],
      alignItems: 'center',
    }]}>
      <Text style={{ color: colors.textPrimary, fontSize: typography.lg, fontWeight: '700' }}>{value}</Text>
      <Text style={{ color: colors.textSecondary, fontSize: typography.xs, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex:        { flex: 1 },
  cardTitle:   {},
  statsGrid:   { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  row:         { flexDirection: 'row', alignItems: 'center' },
  dateChip:    {},
  insightRow:  { flexDirection: 'row' },
  patternRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  patternLeft: { flex: 1 },
});
