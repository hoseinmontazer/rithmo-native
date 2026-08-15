import React, { useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@hooks/useTheme';
import { useCycleAnalysis, useCycleInsights, useSymptomPatterns, usePeriods } from '@hooks/queries/usePeriods';
import { useProfile } from '@hooks/queries/useProfile';
import { Card, LoadingState, ErrorState, Badge, Icon } from '@components/ui';
import { formatDate } from '@utils/dateUtils';
import type { CycleScreenProps } from '@navigation/types';

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

const MOOD_EMOJI: Record<string, string> = {
  happy: '😊',
  sad: '😢',
  anxious: '😰',
  calm: '😌',
  energetic: '⚡',
  tired: '😴',
  irritable: '😤',
  neutral: '😐',
};

// Helper function to get phase-specific recommendations
function getPhaseRecommendation(phase: string): string {
  const recommendations: Record<string, string> = {
    Menstrual: 'Focus on rest and self-care. Stay hydrated, use heat therapy for cramps, and prioritize gentle movement like yoga or walking.',
    Follicular: 'Your energy is rising! This is a great time for new projects, intense workouts, and social activities. Take advantage of your increased motivation.',
    Ovulation: 'Peak energy and confidence! Perfect for important meetings, challenging workouts, and social events. Your communication skills are at their best.',
    Luteal: 'Energy may start to decline. Focus on completing projects, gentle exercise, and stress management. Prioritize self-care and adequate sleep.',
  };
  return recommendations[phase] || 'Track your symptoms to get personalized recommendations.';
}

// Helper function to get smart recommendations based on cycle status
function getSmartRecommendations(
  phase: string | undefined,
  isOnPeriod: boolean | undefined,
  isFertileWindow: boolean | undefined
): Array<{ icon: string; title: string; description: string; color: string }> {
  const recommendations = [];

  if (isOnPeriod) {
    recommendations.push({
      icon: '💧',
      title: 'Stay Hydrated',
      description: 'Drink plenty of water to help reduce bloating and ease cramps during your period.',
      color: '#4A90E2',
    });
    recommendations.push({
      icon: '🧘‍♀️',
      title: 'Gentle Movement',
      description: 'Light yoga or stretching can help relieve menstrual discomfort and improve mood.',
      color: '#9B59B6',
    });
    recommendations.push({
      icon: '🌡️',
      title: 'Heat Therapy',
      description: 'Apply a heating pad to your lower abdomen to help ease cramps and muscle tension.',
      color: '#E74C3C',
    });
  } else if (isFertileWindow) {
    recommendations.push({
      icon: '🎯',
      title: 'Peak Fertility',
      description: 'You\'re in your fertile window. If trying to conceive, this is the optimal time.',
      color: '#27AE60',
    });
    recommendations.push({
      icon: '💪',
      title: 'High Energy',
      description: 'Take advantage of increased energy levels for challenging workouts or important tasks.',
      color: '#F39C12',
    });
    recommendations.push({
      icon: '🗣️',
      title: 'Communication Peak',
      description: 'Your communication skills are enhanced. Great time for presentations or important conversations.',
      color: '#3498DB',
    });
  } else if (phase === 'Follicular') {
    recommendations.push({
      icon: '🚀',
      title: 'New Beginnings',
      description: 'Rising energy makes this ideal for starting new projects or learning new skills.',
      color: '#1ABC9C',
    });
    recommendations.push({
      icon: '🏃‍♀️',
      title: 'Intense Workouts',
      description: 'Your body can handle more intense exercise. Try HIIT or strength training.',
      color: '#E67E22',
    });
    recommendations.push({
      icon: '👥',
      title: 'Social Time',
      description: 'Increased sociability makes this a great time for networking and social activities.',
      color: '#9B59B6',
    });
  } else if (phase === 'Luteal') {
    recommendations.push({
      icon: '😴',
      title: 'Prioritize Sleep',
      description: 'Your body needs more rest. Aim for 7-9 hours of quality sleep each night.',
      color: '#5DADE2',
    });
    recommendations.push({
      icon: '🥗',
      title: 'Balanced Nutrition',
      description: 'Focus on complex carbs and protein to stabilize mood and energy levels.',
      color: '#52BE80',
    });
    recommendations.push({
      icon: '🧘',
      title: 'Stress Management',
      description: 'Practice mindfulness, meditation, or gentle yoga to manage PMS symptoms.',
      color: '#AF7AC5',
    });
  } else {
    // Default recommendations
    recommendations.push({
      icon: '📊',
      title: 'Track Symptoms',
      description: 'Log your daily symptoms to help our AI provide more personalized insights.',
      color: '#3498DB',
    });
    recommendations.push({
      icon: '💪',
      title: 'Stay Active',
      description: 'Regular exercise helps regulate your cycle and improve overall wellbeing.',
      color: '#E67E22',
    });
    recommendations.push({
      icon: '🥗',
      title: 'Healthy Diet',
      description: 'Maintain a balanced diet rich in nutrients to support hormonal health.',
      color: '#27AE60',
    });
  }

  return recommendations;
}

export default function CycleAnalysisScreen() {
  const navigation = useNavigation<CycleScreenProps<'CycleAnalysis'>['navigation']>();
  const { colors, spacing, typography, borderRadius } = useTheme();

  // Get user profile to determine if male/female
  const { data: profile } = useProfile();
  const isMale = profile?.sex === 'male';
  const hasPartner = (profile?.partners?.length ?? 0) > 0;
  const isMaleWithPartner = isMale && hasPartner;

  // Fetch cycle analysis - use partner role for male users with partners
  const { data: analysis, isLoading: aLoading, isError: aError, error: aErr, refetch: refetchA } = useCycleAnalysis({
    role: isMaleWithPartner ? 'partner' : undefined,
    enabled: true,
  });

  // Fetch period history - use partner role for male users with partners
  const { data: periods, refetch: refetchPeriods } = usePeriods(isMaleWithPartner ? 'partner' : undefined);

  const { data: insights, isLoading: iLoading, refetch: refetchI } = useCycleInsights();
  const { data: patterns, isLoading: pLoading, refetch: refetchP } = useSymptomPatterns();

  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchA(), refetchI(), refetchP(), refetchPeriods()]);
    setRefreshing(false);
  }, [refetchA, refetchI, refetchP, refetchPeriods]);

  if (aLoading || iLoading || pLoading) {return <LoadingState fullScreen message="Analysing cycle data…" />;}
  if (aError) {return <ErrorState fullScreen error={aErr} onRetry={refetchA} />;}

  // Extract data from API response matching the structure you provided
  const apiData = (analysis as any)?.data || analysis;
  const viewType = (analysis as any)?.view_type || 'self';
  const trackingMode = (apiData as any)?.tracking_mode;
  const isPartnerView = viewType === 'partner_tracking' || trackingMode === 'partner' || isMaleWithPartner;

  // For partner view, use partner_info structure
  const partnerInfo = (apiData as any)?.partner_info;
  const supportTips = (apiData as any)?.support_tips || [];

  // Get data from either partner_info or current_status
  const currentStatus = isPartnerView ? null : (apiData as any)?.current_status;
  const currentPhase = isPartnerView ? partnerInfo?.current_phase : currentStatus?.phase;
  const phaseDescription = currentStatus?.phase_description;
  const cycleDay = currentStatus?.cycle_day;
  const avgCycle = isPartnerView
    ? (partnerInfo?.average_cycle_length || 28)
    // Backend key is average_cycle_length, not average_cycle — this
    // always fell through to the hardcoded 28 fallback before.
    : ((apiData as any)?.average_cycle_length || 28);
  const nextPeriodDate = isPartnerView
    ? partnerInfo?.next_period_date
    : (apiData as any)?.next_predicted_date;
  const daysUntilNext = isPartnerView
    ? partnerInfo?.days_until_period
    : currentStatus?.days_until_next_period;
  const isOnPeriod = isPartnerView ? partnerInfo?.is_on_period : currentStatus?.is_on_period;
  const isFertileWindow = currentStatus?.is_fertile_window;

  // Regularity data (only for self view). Backend keys are cycle_lengths
  // and prediction_confidence — this used to read cycle_variations /
  // prediction_reliability, neither of which the API returns.
  const regularityScore = isPartnerView ? partnerInfo?.cycle_regularity : ((apiData as any)?.regularity_score || 0);
  const cycleVariations = (apiData as any)?.cycle_lengths || [];
  const predictionReliability = (apiData as any)?.prediction_confidence;

  // Calculate average variation from cycle_variations array
  const avgVariation = cycleVariations.length > 0
    ? Math.round(cycleVariations.reduce((sum: number, v: number) => sum + Math.abs(v), 0) / cycleVariations.length)
    : 0;

  // Check if we have any data to display
  const hasData = apiData || insights || patterns || periods;

  // Phase accent color
  const phaseAccent = currentPhase ? ({
    Menstrual:  colors.menstrual,
    Follicular: colors.follicular,
    Ovulation:  colors.ovulation,
    Luteal:     colors.luteal,
    menstrual:  colors.menstrual,
    follicular: colors.follicular,
    ovulation:  colors.ovulation,
    luteal:     colors.luteal,
  } as any)[currentPhase] || colors.primary : colors.primary;

  // Mock data for mood distribution (in real app, this would come from wellness API)
  const moodDistribution = [
    { mood: 'happy', count: 12, percentage: 35 },
    { mood: 'calm', count: 10, percentage: 29 },
    { mood: 'tired', count: 8, percentage: 24 },
    { mood: 'irritable', count: 4, percentage: 12 },
  ];

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: colors.background }]}
      contentContainerStyle={{ padding: spacing[5] }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* ── Quick Actions ─────────────────────────────────────────── */}
      <View style={{ flexDirection: 'row', gap: spacing[3], marginBottom: spacing[5] }}>
        {/* Log Period — female only */}
        {!isMale && (
          <TouchableOpacity
            onPress={() => navigation.navigate('LogPeriod')}
            activeOpacity={0.8}
            style={{
              flex: 1,
              backgroundColor: colors.menstrual,
              borderRadius: borderRadius.xl,
              padding: spacing[4],
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing[2],
              shadowColor: colors.shadowColor,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            <Icon name="plus-circle" size={20} color="#fff" />
            <Text style={{ color: '#fff', fontSize: typography.sm, fontWeight: '700' }}>
              Log Period
            </Text>
          </TouchableOpacity>
        )}

        {/* View History — all users */}
        <TouchableOpacity
          onPress={() => navigation.navigate('CycleTracker')}
          activeOpacity={0.8}
          style={{
            flex: 1,
            backgroundColor: colors.surface,
            borderRadius: borderRadius.xl,
            padding: spacing[4],
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing[2],
            borderWidth: 1,
            borderColor: colors.border,
            shadowColor: colors.shadowColor,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <Icon name="calendar-outline" size={20} color={colors.primary} />
          <Text style={{ color: colors.primary, fontSize: typography.sm, fontWeight: '700' }}>
            View History
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Last Recorded Cycle (female users) ───────────────────── */}
      {!isMale && periods && Array.isArray(periods) && periods.length > 0 && (() => {
        const last = (periods as any[])[0];
        return (
          <Card elevated style={{ marginBottom: spacing[5] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[3] }}>
              <Text style={{ fontSize: 20 }}>🩸</Text>
              <Text style={{ color: colors.textPrimary, fontSize: typography.base, fontWeight: '700' }}>
                Last Recorded Cycle
              </Text>
            </View>
            <View style={styles.statsGrid}>
              <View style={{
                backgroundColor: colors.surfaceSecondary,
                borderRadius: borderRadius.lg,
                padding: spacing[3],
                width: '47%',
                marginBottom: spacing[3],
              }}>
                <Text style={{ color: colors.textPrimary, fontSize: typography.base, fontWeight: '700' }}>
                  {formatDate(last.start_date)}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: typography.xs, marginTop: 2 }}>
                  Start date
                </Text>
              </View>
              {last.period_duration > 0 && (
                <View style={{
                  backgroundColor: colors.surfaceSecondary,
                  borderRadius: borderRadius.lg,
                  padding: spacing[3],
                  width: '47%',
                  marginBottom: spacing[3],
                }}>
                  <Text style={{ color: colors.textPrimary, fontSize: typography.base, fontWeight: '700' }}>
                    {last.period_duration} days
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: typography.xs, marginTop: 2 }}>
                    Duration
                  </Text>
                </View>
              )}
              {last.next_period_start_date && (
                <View style={{
                  backgroundColor: colors.primaryLighter,
                  borderRadius: borderRadius.lg,
                  padding: spacing[3],
                  width: '47%',
                  marginBottom: spacing[3],
                }}>
                  <Text style={{ color: colors.primary, fontSize: typography.base, fontWeight: '700' }}>
                    {formatDate(last.next_period_start_date)}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: typography.xs, marginTop: 2 }}>
                    Next predicted
                  </Text>
                </View>
              )}
              {last.cycle_length && (
                <View style={{
                  backgroundColor: colors.surfaceSecondary,
                  borderRadius: borderRadius.lg,
                  padding: spacing[3],
                  width: '47%',
                  marginBottom: spacing[3],
                }}>
                  <Text style={{ color: colors.textPrimary, fontSize: typography.base, fontWeight: '700' }}>
                    {last.cycle_length} days
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: typography.xs, marginTop: 2 }}>
                    Cycle length
                  </Text>
                </View>
              )}
            </View>
            {last.symptoms ? (
              <Text style={{ color: colors.textSecondary, fontSize: typography.xs, marginTop: spacing[1] }}>
                🩺 Symptoms: {last.symptoms}
              </Text>
            ) : null}
            {last.medication ? (
              <Text style={{ color: colors.textSecondary, fontSize: typography.xs, marginTop: 4 }}>
                💊 Medication: {last.medication}
              </Text>
            ) : null}
          </Card>
        );
      })()}

      {/* ── View Type Indicator (for partner view) ─────────────────── */}
      {isPartnerView && partnerInfo && (
        <Card style={{ marginBottom: spacing[4], backgroundColor: colors.primaryLighter }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
            <Icon name="account-heart-outline" size={20} color={colors.primary} />
            <Text style={{ color: colors.primary, fontSize: typography.sm, fontWeight: '600' }}>
              Viewing {partnerInfo.name || 'Partner'}'s Cycle
            </Text>
          </View>
        </Card>
      )}

      {/* ── Cycle Overview ──────────────────────────────────────────── */}
      {currentPhase && (
        <Card elevated style={{ marginBottom: spacing[4] }}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: typography.xl, fontWeight: '800', marginBottom: spacing[4] }]}>
            📊  Cycle Overview
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

          {isPartnerView && isOnPeriod && (
            <View style={{
              backgroundColor: colors.menstrual + '15',
              padding: spacing[3],
              borderRadius: borderRadius.lg,
              marginBottom: spacing[4],
              borderLeftWidth: 3,
              borderLeftColor: colors.menstrual,
            }}>
              <Text style={{ color: colors.menstrual, fontSize: typography.sm, fontWeight: '600' }}>
                🩸 Currently on period
              </Text>
            </View>
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

      {/* ── Period History (for partner view) ──────────────────────── */}
      {isPartnerView && periods && Array.isArray(periods) && periods.length > 0 && (
        <Card elevated style={{ marginBottom: spacing[4] }}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: typography.xl, fontWeight: '800', marginBottom: spacing[4] }]}>
            📅  Recent Periods
          </Text>
          {periods.slice(0, 3).map((period: any) => (
            <View
              key={period.id}
              style={{
                backgroundColor: colors.surfaceSecondary,
                padding: spacing[3],
                borderRadius: borderRadius.lg,
                marginBottom: spacing[3],
                borderLeftWidth: 3,
                borderLeftColor: colors.menstrual,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[2] }}>
                <Text style={{ color: colors.textPrimary, fontSize: typography.sm, fontWeight: '600' }}>
                  {formatDate(period.start_date)}
                </Text>
                <Badge label={`${period.period_duration}d`} variant="neutral" />
              </View>
              {period.end_date && (
                <Text style={{ color: colors.textSecondary, fontSize: typography.xs }}>
                  Ended: {formatDate(period.end_date)}
                </Text>
              )}
              {period.next_period_start_date && (
                <Text style={{ color: colors.textSecondary, fontSize: typography.xs, marginTop: 2 }}>
                  Next predicted: {formatDate(period.next_period_start_date)}
                </Text>
              )}
            </View>
          ))}
        </Card>
      )}

      {/* ── Regularity ──────────────────────────────────────────────── */}
      {apiData && (
        <Card elevated style={{ marginBottom: spacing[4] }}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: typography.xl, fontWeight: '800', marginBottom: spacing[4] }]}>
            📈  Cycle Regularity
          </Text>

          {regularityScore !== null && regularityScore > 0 ? (
            <>
              {/* Regularity Score */}
              <View style={{ alignItems: 'center', marginBottom: spacing[5] }}>
                <View
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: 60,
                    borderWidth: 10,
                    borderColor: colors.primary + '20',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}
                >
                  {/* Progress arc */}
                  <View
                    style={{
                      position: 'absolute',
                      width: 120,
                      height: 120,
                      borderRadius: 60,
                      borderWidth: 10,
                      borderColor: regularityScore >= 70 ? colors.primary : regularityScore >= 40 ? colors.ovulationColor : colors.menstrual,
                      borderTopColor: 'transparent',
                      borderRightColor: regularityScore > 25 ? (regularityScore >= 70 ? colors.primary : regularityScore >= 40 ? colors.ovulationColor : colors.menstrual) : 'transparent',
                      borderBottomColor: regularityScore > 50 ? (regularityScore >= 70 ? colors.primary : regularityScore >= 40 ? colors.ovulationColor : colors.menstrual) : 'transparent',
                      borderLeftColor: regularityScore > 75 ? (regularityScore >= 70 ? colors.primary : regularityScore >= 40 ? colors.ovulationColor : colors.menstrual) : 'transparent',
                      transform: [{ rotate: '-90deg' }],
                    }}
                  />
                  <Text
                    style={{
                      color: colors.textPrimary,
                      fontSize: 32,
                      fontWeight: '800',
                    }}
                  >
                    {regularityScore}
                  </Text>
                </View>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: typography.sm,
                    marginTop: spacing[3],
                  }}
                >
                  {regularityScore >= 70 ? 'Very Regular' : regularityScore >= 40 ? 'Moderately Regular' : 'Irregular'}
                </Text>
              </View>

              {/* Regularity Stats */}
              <View style={styles.statsGrid}>
                <StatBox
                  label="Avg Variation"
                  value={avgVariation > 0 ? `±${avgVariation}d` : 'N/A'}
                  colors={colors}
                  spacing={spacing}
                  typography={typography}
                  borderRadius={borderRadius}
                />
                <StatBox
                  label="Reliability"
                  value={predictionReliability ? `${Math.round(predictionReliability * 100)}%` : 'N/A'}
                  colors={colors}
                  spacing={spacing}
                  typography={typography}
                  borderRadius={borderRadius}
                />
              </View>

              {avgVariation > 0 && (
                <Text style={{ color: colors.textSecondary, fontSize: typography.xs, marginTop: spacing[3], lineHeight: 18 }}>
                  Your cycle length varies by about {avgVariation} days. This is {avgVariation <= 3 ? 'very consistent' : avgVariation <= 7 ? 'normal' : 'somewhat variable'}.
                </Text>
              )}
            </>
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: spacing[4] }}>
              <Text style={{ color: colors.textSecondary, fontSize: typography.sm, textAlign: 'center', lineHeight: 20 }}>
                Not enough data yet to calculate regularity.{'\n'}Keep logging your periods to see patterns.
              </Text>
            </View>
          )}
        </Card>
      )}

      {/* ── Recent Common Mood Distribution ─────────────────────────── */}
      {moodDistribution.length > 0 && (
        <Card elevated style={{ marginBottom: spacing[4] }}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: typography.xl, fontWeight: '800', marginBottom: spacing[4] }]}>
            😊  Mood Distribution
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: typography.sm, marginBottom: spacing[4] }}>
            Your most common moods over the last 30 days
          </Text>

          {moodDistribution.map((item, index) => (
            <View key={item.mood} style={{ marginBottom: spacing[3] }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[2] }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
                  <Text style={{ fontSize: 20 }}>{MOOD_EMOJI[item.mood] || '😐'}</Text>
                  <Text style={{ color: colors.textPrimary, fontSize: typography.sm, fontWeight: '600', textTransform: 'capitalize' }}>
                    {item.mood}
                  </Text>
                </View>
                <Text style={{ color: colors.textSecondary, fontSize: typography.sm }}>
                  {item.count} days ({item.percentage}%)
                </Text>
              </View>
              {/* Progress bar */}
              <View
                style={{
                  height: 8,
                  backgroundColor: colors.surfaceSecondary,
                  borderRadius: 4,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    height: '100%',
                    width: `${item.percentage}%`,
                    backgroundColor: index === 0 ? colors.primary : index === 1 ? colors.follicular : index === 2 ? colors.ovulationColor : colors.luteal,
                    borderRadius: 4,
                  }}
                />
              </View>
            </View>
          ))}
        </Card>
      )}

      {/* ── AI Period Insights ──────────────────────────────────────── */}
      {insights && (insights as any).insights && (insights as any).insights.length > 0 && (
        <Card elevated style={{ marginBottom: spacing[4] }}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: typography.xl, fontWeight: '800', marginBottom: spacing[4] }]}>
            🤖  AI Period Insights
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: typography.sm, marginBottom: spacing[4] }}>
            Personalized insights based on cycle patterns
          </Text>
          {(insights as any).insights.map((insight: string, i: number) => (
            <View
              key={i}
              style={[
                styles.insightRow,
                {
                  marginBottom: spacing[3],
                  backgroundColor: colors.surfaceSecondary,
                  padding: spacing[3],
                  borderRadius: borderRadius.lg,
                  borderLeftWidth: 3,
                  borderLeftColor: colors.primary,
                },
              ]}
            >
              <Text style={{ color: colors.primary, marginRight: spacing[2], fontSize: 16 }}>💡</Text>
              <Text style={{ color: colors.textPrimary, fontSize: typography.sm, lineHeight: 20, flex: 1 }}>
                {insight}
              </Text>
            </View>
          ))}
        </Card>
      )}

      {/* ── Support Tips (for male users viewing partner) ──────────── */}
      {isPartnerView && supportTips && supportTips.length > 0 && (
        <Card elevated style={{ marginBottom: spacing[4] }}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: typography.xl, fontWeight: '800', marginBottom: spacing[4] }]}>
            💝  Support Tips
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: typography.sm, marginBottom: spacing[4] }}>
            Ways to support your partner during their cycle
          </Text>
          {supportTips.map((tip: string, i: number) => (
            <View
              key={i}
              style={{
                marginBottom: spacing[3],
                backgroundColor: colors.primaryLighter,
                padding: spacing[3],
                borderRadius: borderRadius.lg,
                borderLeftWidth: 3,
                borderLeftColor: colors.primary,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <Text style={{ color: colors.primary, marginRight: spacing[2], fontSize: 16 }}>💙</Text>
                <Text style={{ color: colors.textPrimary, fontSize: typography.sm, lineHeight: 20, flex: 1 }}>
                  {tip}
                </Text>
              </View>
            </View>
          ))}
        </Card>
      )}

      {/* ── AI-Powered Smart Recommendations ────────────────────────── */}
      <Card elevated style={{ marginBottom: spacing[4] }}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: typography.xl, fontWeight: '800', marginBottom: spacing[4] }]}>
          🤖  AI-Powered Insights
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: typography.sm, marginBottom: spacing[4] }}>
          Smart recommendations tailored to your current cycle phase
        </Text>

        {/* Recommendations based on current phase */}
        {currentPhase && (
          <View>
            {/* Phase-specific recommendation */}
            <View
              style={{
                backgroundColor: phaseAccent + '15',
                padding: spacing[4],
                borderRadius: borderRadius.lg,
                marginBottom: spacing[3],
                borderLeftWidth: 4,
                borderLeftColor: phaseAccent,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing[2] }}>
                <Text style={{ fontSize: 24, marginRight: spacing[2] }}>
                  {PHASE_EMOJI[currentPhase] || '•'}
                </Text>
                <Text style={{ color: colors.textPrimary, fontSize: typography.base, fontWeight: '700' }}>
                  {currentPhase} Phase Tips
                </Text>
              </View>
              <Text style={{ color: colors.textPrimary, fontSize: typography.sm, lineHeight: 20 }}>
                {getPhaseRecommendation(currentPhase)}
              </Text>
            </View>

            {/* General wellness recommendations */}
            <View
              style={{
                backgroundColor: colors.surfaceSecondary,
                padding: spacing[4],
                borderRadius: borderRadius.lg,
                marginBottom: spacing[3],
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing[3] }}>
                <Text style={{ fontSize: 20, marginRight: spacing[2] }}>🎯</Text>
                <Text style={{ color: colors.textPrimary, fontSize: typography.base, fontWeight: '700' }}>
                  Personalized Recommendations
                </Text>
              </View>

              {getSmartRecommendations(currentPhase, isOnPeriod, isFertileWindow).map((rec, index) => (
                <View
                  key={index}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    marginBottom: spacing[2],
                    paddingBottom: index < 2 ? spacing[2] : 0,
                    borderBottomWidth: index < 2 ? StyleSheet.hairlineWidth : 0,
                    borderBottomColor: colors.border,
                  }}
                >
                  <Text style={{ color: rec.color, marginRight: spacing[2], fontSize: 16 }}>
                    {rec.icon}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.textPrimary, fontSize: typography.sm, fontWeight: '600', marginBottom: 2 }}>
                      {rec.title}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: typography.xs, lineHeight: 18 }}>
                      {rec.description}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Cycle prediction confidence */}
            {predictionReliability !== null && predictionReliability > 0 && (
              <View
                style={{
                  backgroundColor: colors.primaryLighter,
                  padding: spacing[3],
                  borderRadius: borderRadius.lg,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 18, marginRight: spacing[2] }}>📊</Text>
                <Text style={{ color: colors.primary, fontSize: typography.xs, flex: 1 }}>
                  Our AI predictions are <Text style={{ fontWeight: '700' }}>{Math.round(predictionReliability * 100)}% confident</Text> based on your cycle history
                </Text>
              </View>
            )}
          </View>
        )}
      </Card>

      {/* Symptom patterns */}
      {patterns && (patterns as any).patterns && (patterns as any).patterns.length > 0 && (
        <Card style={{ marginBottom: spacing[4] }}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: typography.base, fontWeight: '600', marginBottom: spacing[3] }]}>
            📊  Symptom Patterns
          </Text>
          {(patterns as any).patterns.map((p: any) => (
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
  flex:          { flex: 1 },
  sectionTitle:  {},
  statsGrid:     { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  row:           { flexDirection: 'row', alignItems: 'center' },
  dateChip:      {},
  insightRow:    { flexDirection: 'row', alignItems: 'flex-start' },
  patternRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  patternLeft:   { flex: 1 },
});
