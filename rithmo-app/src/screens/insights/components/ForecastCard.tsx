/**
 * ForecastCard — «پیش‌بینی شخصی» (P0.5, free/Premium split — see
 * docs/DECISIONS.md DEC-005)
 *
 * Renders exactly what `/api/intelligence/forecast/` returns: a projected
 * symptom window (dates when available, cycle-day range otherwise), an
 * explicit "happening now" flag, and the backend's own uncertainty note —
 * never a client-side guess, never a stronger claim than the backend made.
 * No date/statistic is computed here; `faDateShort`/`toFa` only format
 * values the backend already sent.
 *
 * `forecasts` is empty in TWO different, non-interchangeable cases: no
 * pattern has cleared the REPEATED bar yet (`coverage_message_fa` is
 * set), or real pattern(s) exist but this user isn't Premium
 * (`premium_required: true`, `forecast_count > 0`, `premium_teaser_fa`
 * set). Collapsing these would either lie to a free user with real
 * patterns ("nothing found yet") or invite a Premium upsell with
 * nothing behind it — both explicitly wrong per the product principle.
 */
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@hooks/useTheme';
import { Card, Badge, ErrorState, StoryCardSkeleton, Icon } from '@components/ui';
import { PremiumGate } from '@components/PremiumGate';
import { useForecast } from '@hooks/queries/useIntelligence';
import { faDateShort, toFa } from '@utils/persian';
import type { SymptomForecast } from '@types/forecast.types';

function ForecastRow({ forecast, isLast }: { forecast: SymptomForecast; isLast: boolean }) {
  const { colors, spacing, typography } = useTheme();
  const dateLabel =
    forecast.window_start_date && forecast.window_end_date
      ? `${faDateShort(forecast.window_start_date)} تا ${faDateShort(forecast.window_end_date)}`
      : `روز ${toFa(forecast.cycle_day_range[0])} تا ${toFa(forecast.cycle_day_range[1])} چرخه`;

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
          {forecast.label_fa}
        </Text>
        {forecast.happening_now && <Badge label="همین روزها" variant="primary" />}
      </View>
      <Text style={{ color: colors.textSecondary, fontSize: typography.caption, marginTop: 4 }}>
        بازه‌ی محتمل: {dateLabel}
      </Text>
      <Text
        style={{ color: colors.textTertiary, fontSize: typography.micro, lineHeight: 16, marginTop: 4 }}
      >
        {forecast.uncertainty_note_fa}
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
        <Icon name="calendar-clock-outline" size={12} color={colors.info} />
        <Text style={{ color: colors.info, fontSize: typography.caption, fontWeight: '700' }}>
          پیش‌بینی شخصی
        </Text>
      </View>
    </View>
  );
}

export const ForecastCard = memo(function ForecastCard() {
  const { data, isLoading, isError, error, refetch } = useForecast();
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

  if (data.learning_mode || (data.forecasts.length === 0 && !data.premium_required)) {
    return (
      <Card style={[styles.card, { padding: spacing[4] }]}>
        <CardHeader />
        <Text style={{ color: colors.textSecondary, fontSize: typography.bodySmall, lineHeight: 20 }}>
          {data.coverage_message_fa ?? 'هنوز الگوی به‌اندازه‌ی کافی تکرارشونده‌ای برای پیش‌بینی وجود ندارد.'}
        </Text>
      </Card>
    );
  }

  // Real pattern(s) exist (forecast_count > 0) but this user isn't
  // Premium — a true personalized fact plus a contextual invitation,
  // never an empty teaser.
  if (data.forecasts.length === 0 && data.premium_required) {
    return (
      <Card style={[styles.card, { padding: spacing[4] }]}>
        <CardHeader />
        <Text style={{ color: colors.textSecondary, fontSize: typography.bodySmall, lineHeight: 20, marginBottom: spacing[3] }}>
          {data.premium_teaser_fa}
        </Text>
        <PremiumGate overlay featureName="پیش‌بینی شخصی" />
      </Card>
    );
  }

  return (
    <Card style={[styles.card, { padding: spacing[4] }]}>
      <CardHeader />
      {data.forecasts.map((f, i) => (
        <ForecastRow key={f.key} forecast={f} isLast={i === data.forecasts.length - 1} />
      ))}
    </Card>
  );
});

const styles = StyleSheet.create({
  card: { borderWidth: 0 },
  header: { flexDirection: 'row' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4 },
  rowHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
});
