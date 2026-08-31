/**
 * CycleChangeCard — «این چرخه چه فرقی داشت؟»
 *
 * The Premium "what changed" surface: a personal comparison of this cycle
 * against the user's own baseline (never a population average), narrated
 * by the same backend-owned AI pipeline as DailyReflectionCard — see
 * ai_gateway/cycle_change_context.py for the data boundary (only
 * `state.baselines.deviations`, already computed for every deviation
 * Insight elsewhere in the app — no new statistic invented for this
 * screen).
 *
 * Same "absence, never an error" philosophy as DailyReflectionCard:
 * renders nothing at all while loading or when no review is available
 * (Learning Mode, AI down, invalid output) — useCycleChangeReview()
 * already collapses every one of those into the same state, so this
 * component never needs to know why. Meant to be wrapped in
 * <PremiumGate> by the caller, so a free user sees the upsell card
 * instead of this component at all.
 *
 * `evidenceNote`, when provided, is a real, already-fetched count from
 * the SAME screen (see WeeklyReviewCard.tsx's docstring for the full
 * rationale) — never a new fetch, never invented.
 */
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@hooks/useTheme';
import { Card, Icon } from '@components/ui';
import { useCycleChangeReview } from '@hooks/queries/useCycleChangeReview';

interface Props {
  evidenceNote?: string | null;
}

export const CycleChangeCard = memo(function CycleChangeCard({ evidenceNote }: Props) {
  const { review } = useCycleChangeReview();
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
          <Icon name="calendar-sync-outline" size={12} color={colors.info} />
          <Text style={{ color: colors.info, fontSize: typography.caption, fontWeight: '700' }}>
            این چرخه چه فرقی داشت؟
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
