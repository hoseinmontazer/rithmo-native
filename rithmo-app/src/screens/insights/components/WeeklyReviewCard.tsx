/**
 * WeeklyReviewCard — «مرور این هفته»
 *
 * Same backend-owned AI pipeline and "absence, never an error" contract
 * as CycleChangeCard/DailyReflectionCard — see
 * ai_gateway/weekly_review_context.py for the data boundary (this week's
 * deviations, the top of the already-ranked insight list, and which
 * signals are still short of a baseline — no new statistic invented for
 * this card).
 *
 * `evidenceNote`, when provided, is a real, already-fetched count from
 * the SAME screen (InsightsHomeScreen's own `useProgress()` data) —
 * never a new fetch, never invented — printed once above the AI text so
 * the reader can see this synthesis is grounded in the same numbers the
 * free patterns list above it already shows (the DATA → PATTERN →
 * EVIDENCE → AI chain made visible, not asserted).
 */
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@hooks/useTheme';
import { Card, Icon } from '@components/ui';
import { useWeeklyReview } from '@hooks/queries/useWeeklyReview';

interface Props {
  evidenceNote?: string | null;
}

export const WeeklyReviewCard = memo(function WeeklyReviewCard({ evidenceNote }: Props) {
  const { review } = useWeeklyReview();
  const { colors, spacing, typography, borderRadius } = useTheme();

  if (!review) {
    return null;
  }

  return (
    <Card style={[styles.card, { padding: spacing[4], marginBottom: spacing[4] }]}>
      <View style={styles.header}>
        <View
          style={[
            styles.badge,
            { backgroundColor: colors.infoBg, borderRadius: borderRadius.pill },
          ]}
        >
          <Icon name="calendar-week-begin" size={12} color={colors.info} />
          <Text style={{ color: colors.info, fontSize: typography.caption, fontWeight: '700' }}>
            مرور این هفته
          </Text>
        </View>
      </View>

      {evidenceNote ? (
        <Text
          style={{ color: colors.textTertiary, fontSize: typography.caption, lineHeight: 18, marginTop: spacing[2] }}
        >
          {evidenceNote}
        </Text>
      ) : null}

      <Text
        style={{ color: colors.textPrimary, fontSize: typography.bodySmall, lineHeight: 22, marginTop: spacing[2] }}
      >
        {review.summary}
      </Text>

      {review.observations.map((obs, i) => (
        <Text
          key={i}
          style={{ color: colors.textSecondary, fontSize: typography.caption, lineHeight: 20, marginTop: spacing[1] }}
        >
          {`· ${obs}`}
        </Text>
      ))}

      {review.suggestion ? (
        <Text
          style={{
            color: colors.textPrimary,
            fontSize: typography.bodySmall,
            fontWeight: '600',
            marginTop: spacing[3],
          }}
        >
          {review.suggestion}
        </Text>
      ) : null}

      {review.limitations.map((lim, i) => (
        <Text
          key={i}
          style={{ color: colors.textTertiary, fontSize: typography.caption, lineHeight: 18, marginTop: spacing[2] }}
        >
          {lim}
        </Text>
      ))}
    </Card>
  );
});

const styles = StyleSheet.create({
  card: { borderWidth: 0 },
  header: { flexDirection: 'row' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4 },
});
