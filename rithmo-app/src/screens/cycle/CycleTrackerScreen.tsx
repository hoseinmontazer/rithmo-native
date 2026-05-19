import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@hooks/useTheme';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Badge, Icon, Button } from '@components/ui';
import type { CycleStackParamList } from '@navigation/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<CycleStackParamList, 'CycleTracker'>;

interface Period {
  id: number;
  start_date: string;
  end_date: string | null;
  symptoms: string;
  medication: string;
  cycle_length: number;
  period_duration: number;
  created_at: string;
}

interface CycleAnalysis {
  average_cycle_length: number;
  average_period_duration: number;
  next_period_date: string;
  current_phase: string;
  days_until_next_period: number;
  ovulation_date: string | null;
  fertile_window_start: string | null;
  fertile_window_end: string | null;
}

export default function CycleTrackerScreen() {
  const navigation = useNavigation<Props['navigation']>();
  const { colors, spacing, typography, borderRadius } = useTheme();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = React.useState(false);

  // Fetch cycle analysis
  const { data: cycleAnalysis, isLoading: analysisLoading } = useQuery({
    queryKey: ['cycle', 'analysis'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/periods/analysis/');
        return response.json() as Promise<CycleAnalysis>;
      } catch {
        return null;
      }
    },
  });

  // Fetch periods
  const { data: periods, isLoading: periodsLoading, refetch: refetchPeriods } = useQuery({
    queryKey: ['periods'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/periods/');
        return response.json() as Promise<Period[]>;
      } catch {
        return [];
      }
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchPeriods();
    setRefreshing(false);
  }, [refetchPeriods]);

  const cyclePhaseColor = useMemo(() => {
    if (!cycleAnalysis) return colors.primary;
    const phase = cycleAnalysis.current_phase?.toLowerCase() || '';
    if (phase.includes('menstrual')) return '#E74C3C';
    if (phase.includes('follicular')) return '#3498DB';
    if (phase.includes('ovulation')) return '#E67E22';
    if (phase.includes('luteal')) return '#9B59B6';
    return colors.primary;
  }, [cycleAnalysis, colors.primary]);

  const daysUntilPeriod = cycleAnalysis?.days_until_next_period ?? 0;
  const cycleProgress = useMemo(() => {
    if (!cycleAnalysis?.average_cycle_length) return 0;
    return ((cycleAnalysis.average_cycle_length - daysUntilPeriod) / cycleAnalysis.average_cycle_length) * 100;
  }, [cycleAnalysis, daysUntilPeriod]);

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: spacing[10] }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* ── Cycle Overview ──────────────────────────────────────────────── */}
      <View style={{ paddingHorizontal: spacing[5], marginTop: spacing[6] }}>
        <Text style={[{ color: colors.textPrimary, fontSize: typography.lg, fontWeight: '600', marginBottom: spacing[3] }]}>
          Cycle Overview
        </Text>

        {analysisLoading ? (
          <View style={{ alignItems: 'center', paddingVertical: spacing[6] }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : cycleAnalysis ? (
          <Card elevated gradientBorder>
            <View>
              {/* Phase Badge */}
              <View
                style={[
                  {
                    backgroundColor: cyclePhaseColor + '20',
                    borderColor: cyclePhaseColor,
                    borderWidth: 1,
                    borderRadius: borderRadius.full,
                    paddingHorizontal: spacing[3],
                    paddingVertical: spacing[2],
                    alignSelf: 'flex-start',
                  },
                ]}
              >
                <Text style={[{ color: cyclePhaseColor, fontWeight: '700', fontSize: typography.sm }]}>
                  {cycleAnalysis.current_phase}
                </Text>
              </View>

              {/* Days Until Period */}
              <View style={{ marginTop: spacing[4] }}>
                <Text style={[{ color: colors.textSecondary, fontSize: typography.sm }]}>
                  Next period in
                </Text>
                <Text style={[{ color: colors.primary, fontSize: typography['3xl'], fontWeight: '700', marginTop: spacing[1] }]}>
                  {daysUntilPeriod} days
                </Text>
              </View>

              {/* Progress Bar */}
              <View
                style={[
                  {
                    backgroundColor: colors.border,
                    borderRadius: borderRadius.full,
                    marginTop: spacing[4],
                    height: 8,
                    overflow: 'hidden',
                  },
                ]}
              >
                <View
                  style={[
                    {
                      backgroundColor: cyclePhaseColor,
                      width: `${cycleProgress}%`,
                      height: '100%',
                    },
                  ]}
                />
              </View>

              {/* Cycle Info Grid */}
              <View style={{ marginTop: spacing[4], gap: spacing[3] }}>
                <View style={{ flexDirection: 'row', gap: spacing[3] }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[{ color: colors.textTertiary, fontSize: typography.xs }]}>
                      Cycle Length
                    </Text>
                    <Text style={[{ color: colors.textPrimary, fontSize: typography.lg, fontWeight: '700', marginTop: spacing[1] }]}>
                      {cycleAnalysis.average_cycle_length} days
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[{ color: colors.textTertiary, fontSize: typography.xs }]}>
                      Period Duration
                    </Text>
                    <Text style={[{ color: colors.textPrimary, fontSize: typography.lg, fontWeight: '700', marginTop: spacing[1] }]}>
                      {cycleAnalysis.average_period_duration} days
                    </Text>
                  </View>
                </View>

                {/* Fertile Window */}
                {cycleAnalysis.fertile_window_start && (
                  <View style={{ paddingTop: spacing[3], borderTopWidth: 1, borderTopColor: colors.border }}>
                    <Text style={[{ color: colors.textTertiary, fontSize: typography.xs, marginBottom: spacing[2] }]}>
                      Fertile Window
                    </Text>
                    <View style={{ flexDirection: 'row', gap: spacing[3] }}>
                      <View style={{ flex: 1 }}>
                        <Text style={[{ color: colors.textSecondary, fontSize: typography.xs }]}>
                          Start
                        </Text>
                        <Text style={[{ color: colors.textPrimary, fontSize: typography.sm, fontWeight: '600', marginTop: spacing[1] }]}>
                          {new Date(cycleAnalysis.fertile_window_start).toLocaleDateString()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[{ color: colors.textSecondary, fontSize: typography.xs }]}>
                          End
                        </Text>
                        <Text style={[{ color: colors.textPrimary, fontSize: typography.sm, fontWeight: '600', marginTop: spacing[1] }]}>
                          {new Date(cycleAnalysis.fertile_window_end).toLocaleDateString()}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Ovulation Date */}
                {cycleAnalysis.ovulation_date && (
                  <View style={{ paddingTop: spacing[3], borderTopWidth: 1, borderTopColor: colors.border }}>
                    <Text style={[{ color: colors.textTertiary, fontSize: typography.xs }]}>
                      Ovulation Date
                    </Text>
                    <Text style={[{ color: colors.primary, fontSize: typography.base, fontWeight: '600', marginTop: spacing[1] }]}>
                      {new Date(cycleAnalysis.ovulation_date).toLocaleDateString()}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </Card>
        ) : null}
      </View>

      {/* ── Log Period Button ───────────────────────────────────────────── */}
      <View style={{ paddingHorizontal: spacing[5], marginTop: spacing[6] }}>
        <Button
          label="Log New Period"
          onPress={() => navigation.navigate('LogPeriod')}
          size="lg"
          fullWidth
        />
      </View>

      {/* ── Recent Periods ──────────────────────────────────────────────── */}
      <View style={{ paddingHorizontal: spacing[5], marginTop: spacing[6] }}>
        <Text style={[{ color: colors.textPrimary, fontSize: typography.lg, fontWeight: '600', marginBottom: spacing[3] }]}>
          Recent Periods
        </Text>

        {periodsLoading ? (
          <View style={{ alignItems: 'center', paddingVertical: spacing[6] }}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : periods && periods.length > 0 ? (
          periods.slice(0, 5).map((period) => (
            <TouchableOpacity
              key={period.id}
              onPress={() => navigation.navigate('PeriodDetail', { periodId: period.id })}
              style={{ marginBottom: spacing[3] }}
            >
              <Card>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[{ color: colors.textPrimary, fontSize: typography.sm, fontWeight: '600' }]}>
                      {new Date(period.start_date).toLocaleDateString()}
                    </Text>
                    {period.end_date && (
                      <Text style={[{ color: colors.textSecondary, fontSize: typography.xs, marginTop: spacing[1] }]}>
                        to {new Date(period.end_date).toLocaleDateString()}
                      </Text>
                    )}
                    {period.symptoms && (
                      <Text style={[{ color: colors.textTertiary, fontSize: typography.xs, marginTop: spacing[1] }]}>
                        Symptoms: {period.symptoms}
                      </Text>
                    )}
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={[{ color: colors.primary, fontSize: typography.lg, fontWeight: '700' }]}>
                      {period.period_duration}
                    </Text>
                    <Text style={[{ color: colors.textTertiary, fontSize: typography.xs, marginTop: spacing[1] }]}>
                      days
                    </Text>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          ))
        ) : (
          <Card>
            <Text style={[{ color: colors.textSecondary, fontSize: typography.sm, textAlign: 'center' }]}>
              No periods logged yet
            </Text>
          </Card>
        )}
      </View>

      {/* ── Cycle Analysis ──────────────────────────────────────────────── */}
      <View style={{ paddingHorizontal: spacing[5], marginTop: spacing[6], marginBottom: spacing[6] }}>
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
  flex: { flex: 1 },
});
