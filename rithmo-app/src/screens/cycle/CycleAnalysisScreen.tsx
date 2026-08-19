import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@hooks/useTheme';
import {
  useCycleAnalysis,
  useCycleInsights,
  useSymptomPatterns,
  usePeriods,
} from '@hooks/queries/usePeriods';
import { useProfile } from '@hooks/queries/useProfile';
import { Card, LoadingState, ErrorState, Badge, Icon, Button } from '@components/ui';
import { formatDate } from '@utils/dateUtils';
import type { CycleScreenProps } from '@navigation/types';

export default function CycleAnalysisScreen() {
  const navigation = useNavigation<CycleScreenProps<'CycleAnalysis'>['navigation']>();
  const { colors, spacing, typography, borderRadius } = useTheme();

  // Profile data
  const { data: profile } = useProfile();
  const isMale = profile?.sex === 'male';
  const hasPartner = (profile?.partners?.length ?? 0) > 0;
  const isMaleWithPartner = isMale && hasPartner;

  // Cycle analysis query
  const {
    data: analysis,
    isLoading: aLoading,
    isError: aError,
    error: aErr,
    refetch: refetchA,
  } = useCycleAnalysis({
    role: isMaleWithPartner ? 'partner' : undefined,
    enabled: true,
  });

  // Periods list
  const { data: periods, refetch: refetchPeriods } = usePeriods(
    isMaleWithPartner ? 'partner' : undefined,
  );

  // Insights & Patterns
  const { data: insights, isLoading: iLoading, refetch: refetchI } = useCycleInsights();
  const { data: patterns } = useSymptomPatterns();

  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchA(), refetchI(), refetchPeriods()]);
    setRefreshing(false);
  }, [refetchA, refetchI, refetchPeriods]);

  if (aLoading || iLoading) {
    return <LoadingState fullScreen message="Analyzing cycle data…" />;
  }
  if (aError) {
    return <ErrorState fullScreen error={aErr} onRetry={refetchA} />;
  }

  const apiData = (analysis as any)?.data || analysis;
  const viewType = (analysis as any)?.view_type || 'self';
  const trackingMode = (apiData as any)?.tracking_mode;
  const isPartnerView =
    viewType === 'partner_tracking' || trackingMode === 'partner' || isMaleWithPartner;

  const partnerInfo = (apiData as any)?.partner_info;
  const supportTips = (apiData as any)?.support_tips || [];

  const currentStatus = isPartnerView ? null : (apiData as any)?.current_status;
  const currentPhase = isPartnerView ? partnerInfo?.current_phase : currentStatus?.phase;
  const phaseDescription = currentStatus?.phase_description;
  const cycleDay = currentStatus?.cycle_day;
  const avgCycle = isPartnerView
    ? partnerInfo?.average_cycle_length ?? null
    : (apiData as any)?.average_cycle_length ?? null;
  const nextPeriodDate = isPartnerView
    ? partnerInfo?.next_period_date
    : (apiData as any)?.next_predicted_date;
  const daysUntilNext = isPartnerView
    ? partnerInfo?.days_until_period
    : currentStatus?.days_until_next_period;
  const isOnPeriod = isPartnerView
    ? partnerInfo?.is_on_period
    : currentStatus?.is_on_period;

  const regularityScore = isPartnerView
    ? partnerInfo?.cycle_regularity
    : (apiData as any)?.regularity_score || 0;
  const cycleVariations = (apiData as any)?.cycle_lengths || [];
  const predictionReliability = (apiData as any)?.prediction_confidence;
  const predictionConfidenceLabel = (apiData as any)?.prediction_confidence_label;
  // Numeric confidence in [0,1] from the unified backend engine — guard so
  // a malformed value can never render "NaN%".
  const confidencePct =
    typeof predictionReliability === 'number' && Number.isFinite(predictionReliability)
      ? Math.round(predictionReliability * 100)
      : null;

  const avgVariation =
    cycleVariations.length > 0
      ? Math.round(
          cycleVariations.reduce((sum: number, v: number) => sum + Math.abs(v), 0) /
            cycleVariations.length,
        )
      : 0;

  const hasData = Boolean(apiData || insights || patterns || periods);

  // Determine semantic color for current phase.  Covers every phase the
  // backend can send — no silent follicular fallback for late/overdue.
  const normalizedPhase = (currentPhase ?? '').toLowerCase();
  const phaseColor = normalizedPhase.includes('menstrual')
    ? colors.menstrual
    : normalizedPhase.includes('ovulat')
    ? colors.ovulation
    : normalizedPhase.includes('luteal') || normalizedPhase.includes('pms')
    ? colors.luteal
    : normalizedPhase === 'late' || normalizedPhase === 'overdue'
    ? colors.warning
    : normalizedPhase === 'expected'
    ? colors.info
    : normalizedPhase === 'unknown'
    ? colors.textTertiary
    : colors.follicular;

  // Human phase labels — never "{rawPhase} Phase" for non-standard phases.
  const PHASE_LABELS: Record<string, string> = {
    menstrual: 'Menstrual',
    follicular: 'Follicular',
    ovulation: 'Ovulation',
    luteal: 'Luteal',
    expected: 'Expected',
    late: 'Late',
    overdue: 'Overdue',
    unknown: 'No data',
  };
  const phaseLabel = PHASE_LABELS[normalizedPhase] || currentPhase || '';

  // Regularity arc geometry
  const circleSize = 100;
  const strokeWidth = 8;
  const radius = (circleSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const scorePercent = Math.min(Math.max(regularityScore ?? 0, 0), 100);
  const strokeDashoffset = circumference - (circumference * scorePercent) / 100;

  const regularityColor =
    scorePercent >= 70
      ? colors.success
      : scorePercent >= 40
      ? colors.warning
      : colors.menstrual;

  const regularityLabel =
    scorePercent >= 70
      ? 'Very Regular'
      : scorePercent >= 40
      ? 'Moderately Regular'
      : 'Irregular';

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: colors.background }]}
      contentContainerStyle={{
        paddingHorizontal: spacing[4],
        paddingTop: spacing[4],
        paddingBottom: spacing[10],
      }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* ── Partner View Context Banner ────────────────────────────── */}
      {isPartnerView && (
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
            Viewing {partnerInfo?.name || 'Partner'}'s Cycle Analytics
          </Text>
        </View>
      )}

      {/* ── Quick Action Row ───────────────────────────────────────── */}
      <View style={[styles.quickActionsRow, { marginBottom: spacing[4] }]}>
        {!isMale && (
          <View style={{ flex: 1 }}>
            <Button
              label="Log Period"
              onPress={() => navigation.navigate('LogPeriod')}
              size="md"
              fullWidth
            />
          </View>
        )}

        <View style={{ flex: isMale ? 1 : 1 }}>
          <Button
            label="Cycle Calendar"
            onPress={() => navigation.navigate('CycleTracker')}
            variant="outline"
            size="md"
            fullWidth
          />
        </View>
      </View>

      {/* ── Current Cycle Overview ─────────────────────────────────── */}
      {currentPhase && (
        <Card elevated={false} style={{ marginBottom: spacing[4], padding: spacing[4] }}>
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={[styles.sectionOverline, { color: colors.textTertiary, fontSize: typography.xs }]}>
                CURRENT STATUS
              </Text>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: typography.lg }]}>
                {phaseLabel}
              </Text>
            </View>
            <View
              style={[
                styles.phaseBadge,
                { backgroundColor: phaseColor + '18', borderColor: phaseColor, borderRadius: borderRadius.pill },
              ]}
            >
              <View style={[styles.phaseDot, { backgroundColor: phaseColor }]} />
              <Text style={[styles.phaseBadgeText, { color: phaseColor, fontSize: typography.xs }]}>
                {isOnPeriod ? 'On Period' : currentPhase}
              </Text>
            </View>
          </View>

          {phaseDescription ? (
            <Text
              style={[
                styles.phaseDescription,
                { color: colors.textSecondary, fontSize: typography.sm, marginVertical: spacing[3] },
              ]}
            >
              {phaseDescription}
            </Text>
          ) : null}

          {/* Metric Grid */}
          <View style={[styles.statsGrid, { marginTop: spacing[2] }]}>
            {cycleDay !== undefined && cycleDay !== null && (
              <StatTile
                label="Cycle Day"
                value={`Day ${cycleDay}`}
                colors={colors}
                spacing={spacing}
                typography={typography}
                borderRadius={borderRadius}
              />
            )}
            <StatTile
              label="Avg Cycle"
              value={avgCycle != null ? `${avgCycle} days` : '—'}
              colors={colors}
              spacing={spacing}
              typography={typography}
              borderRadius={borderRadius}
            />
            {nextPeriodDate ? (
              <StatTile
                label="Next Period"
                value={formatDate(nextPeriodDate)}
                colors={colors}
                spacing={spacing}
                typography={typography}
                borderRadius={borderRadius}
              />
            ) : null}
            {daysUntilNext !== undefined && daysUntilNext !== null ? (
              <StatTile
                label="Days Away"
                value={daysUntilNext === 0 ? 'Today' : `${daysUntilNext}d`}
                colors={colors}
                spacing={spacing}
                typography={typography}
                borderRadius={borderRadius}
              />
            ) : null}
          </View>
        </Card>
      )}

      {/* ── Cycle Regularity ────────────────────────────────────────── */}
      {apiData && (
        <Card elevated={false} style={{ marginBottom: spacing[4], padding: spacing[4] }}>
          <Text style={[styles.sectionOverline, { color: colors.textTertiary, fontSize: typography.xs, marginBottom: spacing[1] }]}>
            PATTERNS & PREDICTABILITY
          </Text>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: typography.lg, marginBottom: spacing[4] }]}>
            Cycle Regularity
          </Text>

          {regularityScore !== null && regularityScore > 0 ? (
            <View>
              <View style={styles.regularityScoreRow}>
                {/* SVG Progress Circle */}
                <View style={styles.svgCircleWrapper}>
                  <Svg width={circleSize} height={circleSize}>
                    {/* Background Track */}
                    <Circle
                      cx={circleSize / 2}
                      cy={circleSize / 2}
                      r={radius}
                      stroke={colors.surfaceSecondary}
                      strokeWidth={strokeWidth}
                      fill="none"
                    />
                    {/* Active Score Track */}
                    <Circle
                      cx={circleSize / 2}
                      cy={circleSize / 2}
                      r={radius}
                      stroke={regularityColor}
                      strokeWidth={strokeWidth}
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                      fill="none"
                      transform={`rotate(-90 ${circleSize / 2} ${circleSize / 2})`}
                    />
                  </Svg>
                  <View style={styles.scoreTextOverlay}>
                    <Text style={[styles.scoreValue, { color: colors.textPrimary, fontSize: typography.xl }]}>
                      {scorePercent}
                    </Text>
                    <Text style={[styles.scorePercentSign, { color: colors.textTertiary, fontSize: typography.xs }]}>
                      %
                    </Text>
                  </View>
                </View>

                {/* Score Summary Info */}
                <View style={[styles.scoreSummaryContent, { marginLeft: spacing[4] }]}>
                  <Text style={[styles.scoreStatusTitle, { color: regularityColor, fontSize: typography.base }]}>
                    {regularityLabel}
                  </Text>
                  <Text style={[styles.scoreSubtext, { color: colors.textSecondary, fontSize: typography.xs, marginTop: spacing[1] }]}>
                    {avgVariation > 0
                      ? `Cycle varies by about ±${avgVariation} days.`
                      : 'High predictability across recorded cycles.'}
                  </Text>
                  {(confidencePct != null || predictionConfidenceLabel) && (
                    <Text style={[styles.confidenceBadgeText, { color: colors.textTertiary, fontSize: typography.xs, marginTop: spacing[1] }]}>
                      Prediction confidence: {confidencePct != null ? `${confidencePct}%` : '—'}{predictionConfidenceLabel ? ` (${predictionConfidenceLabel})` : ''}
                    </Text>
                  )}
                </View>
              </View>

              {/* Stats row */}
              <View style={[styles.statsGrid, { marginTop: spacing[4] }]}>
                <StatTile
                  label="Average Variation"
                  value={avgVariation > 0 ? `±${avgVariation} days` : 'Consistent'}
                  colors={colors}
                  spacing={spacing}
                  typography={typography}
                  borderRadius={borderRadius}
                />
                <StatTile
                  label="Confidence Level"
                  value={confidencePct != null ? `${confidencePct}%` : (predictionConfidenceLabel ?? '—')}
                  colors={colors}
                  spacing={spacing}
                  typography={typography}
                  borderRadius={borderRadius}
                />
              </View>
            </View>
          ) : (
            <View style={[styles.emptyRegularityBox, { backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius.md, padding: spacing[4] }]}>
              <Text style={[styles.emptyRegularityText, { color: colors.textSecondary, fontSize: typography.sm }]}>
                Not enough cycle history yet to compute regularity score. Keep logging periods to reveal patterns.
              </Text>
            </View>
          )}
        </Card>
      )}

      {/* ── Recent Periods (Summary) ─────────────────────────────────── */}
      {periods && Array.isArray(periods) && periods.length > 0 && (
        <Card elevated={false} style={{ marginBottom: spacing[4], padding: spacing[4] }}>
          <View style={[styles.cardHeaderRow, { marginBottom: spacing[3] }]}>
            <View>
              <Text style={[styles.sectionOverline, { color: colors.textTertiary, fontSize: typography.xs }]}>
                RECORDED DATA
              </Text>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: typography.lg }]}>
                Recent Cycles
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('CycleTracker')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.viewAllText, { color: colors.primary, fontSize: typography.sm }]}>
                View All
              </Text>
            </TouchableOpacity>
          </View>

          {periods.slice(0, 3).map((period: any, i: number) => {
            const isOngoing = !period.end_date;
            return (
              <View
                key={period.id || i}
                style={[
                  styles.recentPeriodRow,
                  {
                    borderBottomColor: colors.border,
                    borderBottomWidth: i < Math.min(periods.length, 3) - 1 ? StyleSheet.hairlineWidth : 0,
                    paddingVertical: spacing[3],
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <View style={styles.periodRowHeader}>
                    {isOngoing && <Badge label="Active" variant="success" style={{ marginRight: spacing[2] }} />}
                    <Text style={[styles.periodDateLabel, { color: colors.textPrimary, fontSize: typography.sm }]}>
                      {formatDate(period.start_date)}
                      {period.end_date ? ` → ${formatDate(period.end_date)}` : ' → ongoing'}
                    </Text>
                  </View>
                  {period.symptoms ? (
                    <Text style={[styles.periodSymptomsSub, { color: colors.textTertiary, fontSize: typography.xs, marginTop: 2 }]} numberOfLines={1}>
                      Symptoms: {period.symptoms}
                    </Text>
                  ) : null}
                </View>

                {period.period_duration > 0 ? (
                  <View style={[styles.durationBadgeMini, { backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius.sm }]}>
                    <Text style={[styles.durationBadgeText, { color: colors.textPrimary, fontSize: typography.xs }]}>
                      {period.period_duration}d
                    </Text>
                  </View>
                ) : null}
              </View>
            );
          })}
        </Card>
      )}

      {/* ── AI Period Observations & Insights ──────────────────────── */}
      {insights && (insights as any).insights && (insights as any).insights.length > 0 && (
        <Card elevated={false} style={{ marginBottom: spacing[4], padding: spacing[4] }}>
          <Text style={[styles.sectionOverline, { color: colors.textTertiary, fontSize: typography.xs, marginBottom: spacing[1] }]}>
            INTELLIGENCE
          </Text>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: typography.lg, marginBottom: spacing[3] }]}>
            Pattern Observations
          </Text>

          {(insights as any).insights.map((insight: string, i: number) => (
            <View
              key={i}
              style={[
                styles.insightCallout,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderRadius: borderRadius.md,
                  borderColor: colors.border,
                  padding: spacing[3],
                  marginBottom: spacing[2],
                },
              ]}
            >
              <Text style={[styles.insightCalloutText, { color: colors.textPrimary, fontSize: typography.sm }]}>
                {insight}
              </Text>
            </View>
          ))}
        </Card>
      )}

      {/* ── Partner Support Tips (for Partner View) ─────────────────── */}
      {isPartnerView && supportTips && supportTips.length > 0 && (
        <Card elevated={false} style={{ marginBottom: spacing[4], padding: spacing[4] }}>
          <Text style={[styles.sectionOverline, { color: colors.textTertiary, fontSize: typography.xs, marginBottom: spacing[1] }]}>
            PARTNER GUIDANCE
          </Text>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: typography.lg, marginBottom: spacing[3] }]}>
            Support Suggestions
          </Text>

          {supportTips.map((tip: string, i: number) => (
            <View
              key={i}
              style={[
                styles.supportTipCard,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderRadius: borderRadius.md,
                  padding: spacing[3],
                  marginBottom: spacing[2],
                },
              ]}
            >
              <Text style={[styles.supportTipText, { color: colors.textPrimary, fontSize: typography.sm }]}>
                {tip}
              </Text>
            </View>
          ))}
        </Card>
      )}

      {/* ── Symptom Patterns ───────────────────────────────────────── */}
      {patterns && (patterns as any).patterns && (patterns as any).patterns.length > 0 && (
        <Card elevated={false} style={{ marginBottom: spacing[4], padding: spacing[4] }}>
          <Text style={[styles.sectionOverline, { color: colors.textTertiary, fontSize: typography.xs, marginBottom: spacing[1] }]}>
            SYMPTOM CORRELATION
          </Text>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: typography.lg, marginBottom: spacing[3] }]}>
            Symptom Frequency
          </Text>

          {(patterns as any).patterns.map((p: any) => (
            <View
              key={p.symptom}
              style={[styles.symptomPatternRow, { paddingVertical: spacing[2] }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.symptomName, { color: colors.textPrimary, fontSize: typography.sm }]}>
                  {p.symptom}
                </Text>
                <Text style={[styles.symptomPhaseContext, { color: colors.textTertiary, fontSize: typography.xs }]}>
                  Most common in {p.most_common_phase} phase
                </Text>
              </View>
              <Badge label={`${p.frequency}×`} variant="neutral" />
            </View>
          ))}
        </Card>
      )}

      {/* ── Empty State ────────────────────────────────────────────── */}
      {!hasData && (
        <Card elevated={false} style={{ padding: spacing[6], alignItems: 'center' }}>
          <Text style={[styles.emptyStateText, { color: colors.textSecondary, fontSize: typography.base }]}>
            No cycle analysis available yet.{'\n'}Log your first period to reveal insights.
          </Text>
        </Card>
      )}
    </ScrollView>
  );
}

// ── Sub-component: Stat Tile ───────────────────────────────────────────
function StatTile({
  label,
  value,
  colors,
  spacing,
  typography,
  borderRadius,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useTheme>['colors'];
  spacing: ReturnType<typeof useTheme>['spacing'];
  typography: ReturnType<typeof useTheme>['typography'];
  borderRadius: ReturnType<typeof useTheme>['borderRadius'];
}) {
  return (
    <View
      style={[
        styles.statTile,
        {
          backgroundColor: colors.surfaceSecondary,
          borderRadius: borderRadius.md,
          padding: spacing[3],
        },
      ]}
    >
      <Text style={[styles.statValue, { color: colors.textPrimary, fontSize: typography.base }]}>
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: colors.textTertiary, fontSize: typography.xs, marginTop: 2 }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  partnerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
  },
  partnerBannerText: {
    fontWeight: '600',
  },
  quickActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sectionOverline: {
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  sectionTitle: {
    fontWeight: '700',
    marginTop: 2,
  },
  phaseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
  },
  phaseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  phaseBadgeText: {
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  phaseDescription: {
    lineHeight: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statTile: {
    flexBasis: '48%',
    flexGrow: 1,
  },
  statValue: {
    fontWeight: '700',
  },
  statLabel: {
    fontWeight: '500',
  },
  regularityScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  svgCircleWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreTextOverlay: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreValue: {
    fontWeight: '800',
  },
  scorePercentSign: {
    fontWeight: '600',
    marginLeft: 1,
  },
  scoreSummaryContent: {
    flex: 1,
  },
  scoreStatusTitle: {
    fontWeight: '700',
  },
  scoreSubtext: {
    lineHeight: 16,
  },
  confidenceBadgeText: {
    fontWeight: '500',
  },
  emptyRegularityBox: {
    alignItems: 'center',
  },
  emptyRegularityText: {
    textAlign: 'center',
    lineHeight: 20,
  },
  viewAllText: {
    fontWeight: '600',
  },
  recentPeriodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  periodRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  periodDateLabel: {
    fontWeight: '600',
  },
  periodSymptomsSub: {
    fontWeight: '400',
  },
  durationBadgeMini: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  durationBadgeText: {
    fontWeight: '700',
  },
  insightCallout: {
    borderWidth: 1,
  },
  insightCalloutText: {
    lineHeight: 20,
  },
  supportTipCard: {},
  supportTipText: {
    lineHeight: 20,
  },
  symptomPatternRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  symptomName: {
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  symptomPhaseContext: {
    marginTop: 1,
  },
  emptyStateText: {
    textAlign: 'center',
    lineHeight: 22,
  },
});
