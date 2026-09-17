/**
 * HealthChangeCard — «تغییرات سلامتی و الگوی درد» (P1.2, Premium)
 *
 * Renders exactly what `/api/intelligence/health-changes/` returns: a
 * curated digest of the same deviation/phase/recurrence/symptom insights
 * the free insight feed already computes (see `useInsights`), framed with
 * this user's own confidence tier. No baseline, deviation, or confidence
 * is computed here — this card only formats values the backend already
 * sent. Calm and descriptive by design: no diagnosis, no population
 * comparison, no fabricated precision, ever.
 */
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@hooks/useTheme';
import { Card, Badge, ErrorState, StoryCardSkeleton, Icon } from '@components/ui';
import { useHealthChanges } from '@hooks/queries/useIntelligence';
import type { Insight, InsightConfidence } from '@types/intelligence.types';

// The backend only ever curates REPEATED/ESTABLISHED confidence into this
// digest (see intelligence.services.health_change_candidates) — 'emerging'
// and 'insufficient' never reach this card, but the map stays total over
// InsightConfidence so a future backend change can't silently render
// `undefined` here.
const CONFIDENCE_VARIANT: Record<InsightConfidence, 'success' | 'info' | 'warning' | 'neutral'> = {
  established: 'success',
  repeated: 'info',
  emerging: 'warning',
  insufficient: 'neutral',
};

function HealthChangeRow({ insight, isLast }: { insight: Insight; isLast: boolean }) {
  const { colors, spacing, typography } = useTheme();

  return (
    <View style={{ marginBottom: isLast ? 0 : spacing[4] }}>
      <View style={styles.rowHeader}>
        <Text
          style={{
            flex: 1,
            color: colors.textPrimary,
            fontSize: typography.bodySmall,
            fontWeight: '600',
            lineHeight: 20,
          }}
        >
          {insight.title_fa}
        </Text>
        <Badge
          label={insight.confidence_label_fa}
          variant={CONFIDENCE_VARIANT[insight.confidence] ?? 'neutral'}
        />
      </View>
      <Text style={{ color: colors.textSecondary, fontSize: typography.caption, marginTop: 4, lineHeight: 18 }}>
        {insight.body_fa}
      </Text>
    </View>
  );
}

function CardHeader() {
  const { colors, spacing, typography, borderRadius } = useTheme();
  return (
    <View style={[styles.header, { marginBottom: spacing[3] }]}>
      <View
        style={[styles.badge, { backgroundColor: colors.infoBg, borderRadius: borderRadius.pill }]}
      >
        <Icon name="chart-timeline-variant" size={12} color={colors.info} />
        <Text style={{ color: colors.info, fontSize: typography.caption, fontWeight: '700' }}>
          تغییرات سلامتی
        </Text>
      </View>
    </View>
  );
}

export const HealthChangeCard = memo(function HealthChangeCard() {
  const { data, isLoading, isError, error, refetch } = useHealthChanges();
  const { colors, spacing, typography } = useTheme();

  if (isError) {
    return (
      <Card style={styles.card}>
        <CardHeader />
        <ErrorState error={error} onRetry={refetch} />
      </Card>
    );
  }

  if (isLoading || !data) {
    return <StoryCardSkeleton />;
  }

  if (data.learning_mode || data.health_changes.length === 0) {
    return (
      <Card style={[styles.card, { padding: spacing[4] }]}>
        <CardHeader />
        <Text style={{ color: colors.textSecondary, fontSize: typography.bodySmall, lineHeight: 20 }}>
          {data.coverage_message_fa ?? 'در حال حاضر تغییر معناداری نسبت به الگوی معمول شما دیده نمی‌شود.'}
        </Text>
      </Card>
    );
  }

  return (
    <Card style={[styles.card, { padding: spacing[4] }]}>
      <CardHeader />
      {data.health_changes.map((insight, i) => (
        <HealthChangeRow
          key={insight.key}
          insight={insight}
          isLast={i === data.health_changes.length - 1}
        />
      ))}
      <Text
        style={{ color: colors.textTertiary, fontSize: typography.micro, lineHeight: 16, marginTop: spacing[3] }}
      >
        {data.disclaimer_fa}
      </Text>
    </Card>
  );
});

const styles = StyleSheet.create({
  card: { borderWidth: 0 },
  header: { flexDirection: 'row' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4 },
  rowHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
});
