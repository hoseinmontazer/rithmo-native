import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@hooks/useTheme';
import { Badge } from '@components/ui/Badge';
import { formatDate, daysBetween } from '@utils/dateUtils';
import { toFa } from '@utils/persian';
import type { Period } from '@types/period.types';

interface PeriodListItemProps {
  period: Period;
  onPress: (period: Period) => void;
}

export const PeriodListItem = memo(function PeriodListItem({ period, onPress }: PeriodListItemProps) {
  const { colors, spacing, borderRadius, typography } = useTheme();

  const duration = period.end_date
    ? daysBetween(period.start_date, period.end_date)
    : null;

  const symptoms = period.symptoms
    ? period.symptoms.split(',').slice(0, 3)
    : [];

  return (
    <TouchableOpacity
      onPress={() => onPress(period)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Period starting ${formatDate(period.start_date)}`}
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderRadius: borderRadius.xl,
          padding: spacing[4],
          marginBottom: spacing[3],
          borderWidth: 1,
          borderColor: colors.border,
        },
      ]}
    >
      {/* Header row */}
      <View style={styles.row}>
        <View style={styles.dateBlock}>
          <Text style={[styles.dateText, { color: colors.textPrimary, fontSize: typography.base, fontWeight: '600' }]}>
            {formatDate(period.start_date)}
          </Text>
          {period.end_date && (
            <Text style={[styles.endDate, { color: colors.textSecondary, fontSize: typography.sm, marginTop: 2 }]}>
              → {formatDate(period.end_date)}
            </Text>
          )}
        </View>

        {duration !== null ? (
          <Badge label={`${toFa(duration)} روز`} variant="primary" />
        ) : (
          <Badge label="در جریان" variant="warning" />
        )}
      </View>

      {/* Symptoms */}
      {symptoms.length > 0 && (
        <View style={[styles.symptomsRow, { marginTop: spacing[3] }]}>
          {symptoms.map((s) => (
            <Badge
              key={s}
              label={s.trim()}
              variant="neutral"
              style={{ marginRight: spacing[1] }}
            />
          ))}
          {period.symptoms.split(',').length > 3 && (
            <Badge
              label={`+${period.symptoms.split(',').length - 3}`}
              variant="neutral"
            />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container:    {},
  row:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  dateBlock:    { flex: 1 },
  dateText:     {},
  endDate:      {},
  symptomsRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
});
