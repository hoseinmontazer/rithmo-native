import React, { useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '@hooks/useTheme';
import { usePeriod, useDeletePeriod } from '@hooks/queries/usePeriods';
import { Button, Card, Badge, LoadingState, ErrorState } from '@components/ui';
import { formatDate, daysBetween } from '@utils/dateUtils';
import { extractErrorMessage } from '@utils/errorHandler';
import type { CycleScreenProps } from '@navigation/types';

type Props = CycleScreenProps<'PeriodDetail'>;

export default function PeriodDetailScreen() {
  const navigation = useNavigation<Props['navigation']>();
  const route      = useRoute<Props['route']>();
  const { colors, spacing, typography } = useTheme();

  const { periodId } = route.params;
  const { data: period, isLoading, isError, error, refetch } = usePeriod(periodId);
  const { mutateAsync: deletePeriod, isPending: deleting } = useDeletePeriod();

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete Period',
      'Are you sure you want to delete this period entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePeriod(periodId);
              navigation.goBack();
            } catch (err) {
              Alert.alert('Error', extractErrorMessage(err));
            }
          },
        },
      ],
    );
  }, [deletePeriod, periodId, navigation]);

  if (isLoading) return <LoadingState fullScreen />;
  if (isError)   return <ErrorState fullScreen error={error} onRetry={refetch} />;
  if (!period)   return null;

  const duration = period.end_date ? daysBetween(period.start_date, period.end_date) : null;
  const symptoms = period.symptoms ? period.symptoms.split(',').map((s) => s.trim()).filter(Boolean) : [];
  const meds     = period.medication ? period.medication.split(',').map((m) => m.trim()).filter(Boolean) : [];

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: colors.background }]}
      contentContainerStyle={{ padding: spacing[5] }}
      showsVerticalScrollIndicator={false}
    >
      {/* Date range card */}
      <Card elevated style={{ marginBottom: spacing[4] }}>
        <View style={styles.dateRow}>
          <View>
            <Text style={[styles.dateLabel, { color: colors.textSecondary, fontSize: typography.xs }]}>START DATE</Text>
            <Text style={[styles.dateValue, { color: colors.textPrimary, fontSize: typography.xl, fontWeight: '700' }]}>
              {formatDate(period.start_date)}
            </Text>
          </View>
          {period.end_date && (
            <>
              <Text style={{ color: colors.textSecondary, fontSize: typography.xl, marginHorizontal: spacing[3] }}>→</Text>
              <View>
                <Text style={[styles.dateLabel, { color: colors.textSecondary, fontSize: typography.xs }]}>END DATE</Text>
                <Text style={[styles.dateValue, { color: colors.textPrimary, fontSize: typography.xl, fontWeight: '700' }]}>
                  {formatDate(period.end_date)}
                </Text>
              </View>
            </>
          )}
        </View>

        {duration !== null && (
          <View style={[styles.durationBadge, { marginTop: spacing[3] }]}>
            <Badge label={`${duration} days`} variant="primary" />
          </View>
        )}
      </Card>

      {/* Symptoms */}
      {symptoms.length > 0 && (
        <Card style={{ marginBottom: spacing[4] }}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: typography.base, fontWeight: '600', marginBottom: spacing[3] }]}>
            😣 Symptoms
          </Text>
          <View style={styles.chipRow}>
            {symptoms.map((s) => (
              <Badge key={s} label={s} variant="error" style={{ marginRight: spacing[2], marginBottom: spacing[2] }} />
            ))}
          </View>
        </Card>
      )}

      {/* Medications */}
      {meds.length > 0 && (
        <Card style={{ marginBottom: spacing[4] }}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: typography.base, fontWeight: '600', marginBottom: spacing[3] }]}>
            💊 Medications
          </Text>
          <View style={styles.chipRow}>
            {meds.map((m) => (
              <Badge key={m} label={m} variant="info" style={{ marginRight: spacing[2], marginBottom: spacing[2] }} />
            ))}
          </View>
        </Card>
      )}

      {/* Cycle info */}
      <Card style={{ marginBottom: spacing[6] }}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: typography.base, fontWeight: '600', marginBottom: spacing[3] }]}>
          📊 Cycle Info
        </Text>
        <View style={styles.infoRow}>
          <Text style={{ color: colors.textSecondary, fontSize: typography.sm }}>Cycle Length</Text>
          <Text style={{ color: colors.textPrimary, fontSize: typography.sm, fontWeight: '600' }}>{period.cycle_length} days</Text>
        </View>
        <View style={[styles.infoRow, { marginTop: spacing[2] }]}>
          <Text style={{ color: colors.textSecondary, fontSize: typography.sm }}>Period Duration</Text>
          <Text style={{ color: colors.textPrimary, fontSize: typography.sm, fontWeight: '600' }}>{period.period_duration} days</Text>
        </View>
      </Card>

      <Button
        label="Delete Period"
        onPress={handleDelete}
        variant="danger"
        loading={deleting}
        fullWidth
      />
      <View style={{ height: spacing[8] }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex:          { flex: 1 },
  dateRow:       { flexDirection: 'row', alignItems: 'center' },
  dateLabel:     { letterSpacing: 0.5 },
  dateValue:     {},
  durationBadge: {},
  sectionTitle:  {},
  chipRow:       { flexDirection: 'row', flexWrap: 'wrap' },
  infoRow:       { flexDirection: 'row', justifyContent: 'space-between' },
});
