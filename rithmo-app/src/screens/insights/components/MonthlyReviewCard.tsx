/**
 * MonthlyReviewCard — «مرور ماهانه» (P0.6, free/Premium split — see
 * docs/DECISIONS.md DEC-005)
 *
 * The facts first, always: cycle length vs. this user's own average,
 * the most common symptom in the cycle that just closed, and the biggest
 * change from baseline are free for every user. The established pattern
 * and next-cycle expectations (reusing the same ForecastCard evidence,
 * not a second prediction) require Premium — `premium_required`/
 * `premium_teaser_fa` render a contextual CTA in their place instead.
 * Every number here is `useMonthlyReview()`'s deterministic payload —
 * nothing is computed in this component.
 *
 * The AI synthesis (`useMonthlyReviewNarrative`) is strictly secondary:
 * a short paragraph appended below the facts, rendered only when
 * available, and never a substitute for them — the facts render on their
 * own even when the narrative is unavailable.
 */
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@hooks/useTheme';
import { Card, Badge, Divider, ErrorState, StoryCardSkeleton, Icon } from '@components/ui';
import { PremiumGate } from '@components/PremiumGate';
import { useMonthlyReview } from '@hooks/queries/useIntelligence';
import { useMonthlyReviewNarrative } from '@hooks/queries/useMonthlyReviewNarrative';
import { faDateShort, toFa } from '@utils/persian';

function CardHeader() {
  const { colors, spacing, typography, borderRadius } = useTheme();
  return (
    <View style={[styles.header, { marginBottom: spacing[3] }]}>
      <View
        style={[styles.badge, { backgroundColor: colors.infoBg, borderRadius: borderRadius.pill }]}
      >
        <Icon name="calendar-month-outline" size={12} color={colors.info} />
        <Text style={{ color: colors.info, fontSize: typography.caption, fontWeight: '700' }}>
          مرور ماهانه
        </Text>
      </View>
    </View>
  );
}

function FactRow({ label, value }: { label: string; value: string }) {
  const { colors, typography, spacing } = useTheme();
  return (
    <View style={[styles.factRow, { marginBottom: spacing[2] }]}>
      <Text style={{ color: colors.textSecondary, fontSize: typography.caption }}>
        {label}
      </Text>
      <Text style={{ color: colors.textPrimary, fontSize: typography.caption, fontWeight: '700' }}>
        {value}
      </Text>
    </View>
  );
}

export const MonthlyReviewCard = memo(function MonthlyReviewCard() {
  const { data, isLoading, isError, error, refetch } = useMonthlyReview();
  const { review: narrative } = useMonthlyReviewNarrative();
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

  if (data.learning_mode || !data.cycle) {
    return (
      <Card style={[styles.card, { padding: spacing[4] }]}>
        <CardHeader />
        <Text style={{ color: colors.textSecondary, fontSize: typography.bodySmall, lineHeight: 20 }}>
          {data.coverage_message_fa ?? 'هنوز چرخه‌ای کامل نشده تا مرور ماهانه‌ات را بسازم.'}
        </Text>
      </Card>
    );
  }

  const topSymptom = data.most_common_symptoms[0];
  const topChange = data.biggest_changes[0];
  const topPattern = data.patterns[0];
  const nextPeriod = data.next_cycle_expectations.predicted_next_period;
  const topForecast = data.next_cycle_expectations.symptom_forecasts[0];

  return (
    <Card style={[styles.card, { padding: spacing[4] }]}>
      <CardHeader />

      <FactRow
        label="طول آخرین چرخه"
        value={
          data.cycle.average_cycle_length != null
            ? `${toFa(data.cycle.length)} روز (معمول تو: ${toFa(Math.round(data.cycle.average_cycle_length))} روز)`
            : `${toFa(data.cycle.length)} روز`
        }
      />

      {topSymptom && (
        <FactRow
          label="پرتکرارترین علامت"
          value={`${topSymptom.label_fa} — ${toFa(topSymptom.days_logged)} روز`}
        />
      )}

      {topChange && (
        <FactRow
          label="بزرگ‌ترین تفاوت با حالت معمول"
          value={`${topChange.signal} ${topChange.direction}`}
        />
      )}

      {topPattern && (
        <View style={{ marginBottom: spacing[2] }}>
          <View style={styles.factRow}>
            <Text style={{ color: colors.textSecondary, fontSize: typography.caption }}>
              الگوی تکرارشونده
            </Text>
            <Badge label={topPattern.confidence_label_fa} variant="info" />
          </View>
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: typography.caption,
              fontWeight: '600',
              marginTop: 2,
              lineHeight: 18,
            }}
          >
            {topPattern.title_fa}
          </Text>
        </View>
      )}

      {(nextPeriod || topForecast) && (
        <>
          <Divider style={{ marginVertical: spacing[3] }} />
          <Text
            style={{
              color: colors.textTertiary,
              fontSize: typography.overline,
              fontWeight: '700',
              marginBottom: spacing[1],
            }}
          >
            انتظار چرخه‌ی بعدی
          </Text>
          {nextPeriod && (
            <FactRow label="شروع تخمینی دوره‌ی بعدی" value={faDateShort(nextPeriod)} />
          )}
          {topForecast && (
            <Text style={{ color: colors.textSecondary, fontSize: typography.caption, lineHeight: 18 }}>
              {topForecast.label_fa}
            </Text>
          )}
        </>
      )}

      {/* Real patterns/forecast exist (premium_required only turns true
          when they do — never for a zero-data user) but this user isn't
          Premium — a true fact plus a contextual invitation, placed
          exactly where the deeper section would otherwise render. */}
      {data.premium_required && (
        <>
          <Divider style={{ marginVertical: spacing[3] }} />
          <Text style={{ color: colors.textSecondary, fontSize: typography.caption, lineHeight: 18, marginBottom: spacing[2] }}>
            {data.premium_teaser_fa}
          </Text>
          <PremiumGate overlay featureName="تحلیل چند چرخه" />
        </>
      )}

      {data.still_learning.length > 0 && (
        <Text
          style={{
            color: colors.textTertiary,
            fontSize: typography.micro,
            lineHeight: 16,
            marginTop: spacing[2],
          }}
        >
          هنوز برای {data.still_learning.join('، ')} داده‌ی کافی نیست.
        </Text>
      )}

      {narrative && (
        <>
          <Divider style={{ marginVertical: spacing[3] }} />
          <Text
            style={{ color: colors.textSecondary, fontSize: typography.caption, lineHeight: 20 }}
          >
            {narrative.summary}
          </Text>
          {narrative.limitations.map((lim, i) => (
            <Text
              key={i}
              style={{ color: colors.textTertiary, fontSize: typography.micro, lineHeight: 16, marginTop: 4 }}
            >
              {lim}
            </Text>
          ))}
        </>
      )}
    </Card>
  );
});

const styles = StyleSheet.create({
  card: { borderWidth: 0 },
  header: { flexDirection: 'row' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4 },
  factRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
