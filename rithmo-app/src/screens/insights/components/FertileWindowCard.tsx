/**
 * FertileWindowCard — «بازه‌ی باروری» (P1.1, Premium)
 *
 * Renders exactly what `/api/intelligence/fertile-window/` returns: the
 * existing PredictionService estimate (dates, confidence), framed with
 * this user's own data_sufficiency and an optional backend-owned
 * reliability note. No date, confidence, or probability is computed here
 * — `faDateShort` only formats values the backend already sent. Calm and
 * informational by design: no conception-probability language, no
 * fertility guarantee, ever.
 */
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@hooks/useTheme';
import { Card, Badge, ErrorState, StoryCardSkeleton, Icon } from '@components/ui';
import { useFertileWindow } from '@hooks/queries/useIntelligence';
import { faDateShort } from '@utils/persian';
import type { FertilityConfidence } from '@types/fertileWindow.types';

const CONFIDENCE_LABEL_FA: Record<FertilityConfidence, string> = {
  high: 'اطمینان بالا',
  medium: 'اطمینان متوسط',
  low: 'اطمینان کم',
};

const CONFIDENCE_VARIANT: Record<FertilityConfidence, 'success' | 'info' | 'warning'> = {
  high: 'success',
  medium: 'info',
  low: 'warning',
};

function CardHeader() {
  const { colors, spacing, typography, borderRadius } = useTheme();
  return (
    <View style={[styles.header, { marginBottom: spacing[3] }]}>
      <View
        style={[styles.badge, { backgroundColor: colors.infoBg, borderRadius: borderRadius.pill }]}
      >
        <Icon name="flower-outline" size={12} color={colors.info} />
        <Text style={{ color: colors.info, fontSize: typography.caption, fontWeight: '700' }}>
          بازه‌ی باروری
        </Text>
      </View>
    </View>
  );
}

export const FertileWindowCard = memo(function FertileWindowCard() {
  const { data, isLoading, isError, error, refetch } = useFertileWindow();
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

  if (data.basis === 'insufficient_data' || !data.fertile_window_start || !data.fertile_window_end) {
    return (
      <Card style={[styles.card, { padding: spacing[4] }]}>
        <CardHeader />
        <Text style={{ color: colors.textSecondary, fontSize: typography.bodySmall, lineHeight: 20 }}>
          {data.reliability_note_fa ?? 'هنوز داده‌ی کافی برای تخمین بازه‌ی باروری وجود ندارد.'}
        </Text>
      </Card>
    );
  }

  return (
    <Card style={[styles.card, { padding: spacing[4] }]}>
      <View style={styles.rowHeader}>
        <CardHeader />
        {data.confidence && (
          <Badge
            label={CONFIDENCE_LABEL_FA[data.confidence]}
            variant={CONFIDENCE_VARIANT[data.confidence]}
          />
        )}
      </View>

      <Text style={{ color: colors.textPrimary, fontSize: typography.bodySmall, fontWeight: '600', lineHeight: 20 }}>
        {faDateShort(data.fertile_window_start)} تا {faDateShort(data.fertile_window_end)}
      </Text>
      {data.estimated_ovulation_day && (
        <Text style={{ color: colors.textSecondary, fontSize: typography.caption, marginTop: 4 }}>
          روز تخمینی تخمک‌گذاری: {faDateShort(data.estimated_ovulation_day)}
        </Text>
      )}

      {data.reliability_note_fa && (
        <Text
          style={{ color: colors.textTertiary, fontSize: typography.micro, lineHeight: 16, marginTop: spacing[3] }}
        >
          {data.reliability_note_fa}
        </Text>
      )}

      <Text
        style={{ color: colors.textTertiary, fontSize: typography.micro, lineHeight: 16, marginTop: spacing[2] }}
      >
        {data.disclaimer_fa}
      </Text>
    </Card>
  );
});

const styles = StyleSheet.create({
  card: { borderWidth: 0 },
  header: { flexDirection: 'row' },
  rowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4 },
});
