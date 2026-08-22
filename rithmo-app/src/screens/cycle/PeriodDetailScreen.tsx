import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '@hooks/useTheme';
import { usePeriod } from '@hooks/queries/usePeriods';
import { Button, Card, Badge, LoadingState, ErrorState } from '@components/ui';
import { daysBetween } from '@utils/dateUtils';
import { toFa, faDate } from '@utils/persian';
import type { CycleScreenProps } from '@navigation/types';

type Props = CycleScreenProps<'PeriodDetail'>;

const SYMPTOM_LABELS: Record<string, string> = {
  cramps: 'گرفتگی',
  headache: 'سردرد',
  fatigue: 'خستگی',
  bloating: 'نفخ',
  'mood swings': 'نوسان خلق',
  backache: 'درد کمر',
  nausea: 'تهوع',
  insomnia: 'بی‌خوابی',
};

const MED_LABELS: Record<string, string> = {
  ibuprofen: 'ایبوپروفن',
  paracetamol: 'استامینوفن',
  'heating pad': 'کیسه آب گرم',
  aspirin: 'آسپرین',
  naproxen: 'ناپروکسن',
};

/** Returns next period date only if it's meaningfully after end_date */
function safeNextPeriod(period: any): string | null {
  const next = period.next_period_start_date;
  const end  = period.end_date;
  if (!next) return null;
  // next_period_start_date equals or predates end_date → invalid, skip
  if (end && next <= end) return null;
  return next;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  const { colors, spacing, typography } = useTheme();
  return (
    <View style={[styles.infoRow, { paddingVertical: spacing[3], borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
      <Text style={{ color: colors.textSecondary, fontSize: typography.sm }}>{label}</Text>
      <Text style={{ color: colors.textPrimary, fontSize: typography.sm, fontWeight: '600' }}>{value}</Text>
    </View>
  );
}

export default function PeriodDetailScreen() {
  const navigation = useNavigation<Props['navigation']>();
  const route      = useRoute<Props['route']>();
  const { colors, spacing, typography } = useTheme();

  const { periodId } = route.params;
  const { data: period, isLoading, isError, error, refetch } = usePeriod(periodId);

  if (isLoading) { return <LoadingState fullScreen />; }
  if (isError)   { return <ErrorState fullScreen error={error} onRetry={refetch} />; }
  if (!period)   { return null; }

  const duration   = period.end_date ? daysBetween(period.start_date, period.end_date) : null;
  const nextPeriod = safeNextPeriod(period);
  const isOngoing  = !period.end_date;

  const symptoms = period.symptoms
    ? period.symptoms.split(',').map((s: string) => s.trim()).filter(Boolean)
    : [];
  const meds = period.medication
    ? period.medication.split(',').map((m: string) => m.trim()).filter(Boolean)
    : [];

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: colors.background }]}
      contentContainerStyle={{ padding: spacing[5], paddingBottom: spacing[12] }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Status banner for ongoing period ──────────────────────── */}
      {isOngoing && (
        <View
          style={{
            backgroundColor: ((colors as any).ovulationColor || colors.primary) + '15',
            borderRadius: 14,
            padding: spacing[3],
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing[2],
            marginBottom: spacing[4],
            borderWidth: 1,
            borderColor: ((colors as any).ovulationColor || colors.primary) + '30',
          }}
        >
          <View
            style={{
              width: 8, height: 8, borderRadius: 4,
              backgroundColor: (colors as any).ovulationColor || colors.primary,
            }}
          />
          <Text style={{
            color: (colors as any).ovulationColor || colors.primary,
            fontSize: typography.sm,
            fontWeight: '700',
          }}>
            در حال حاضر فعال — دوره در جریان است
          </Text>
        </View>
      )}

      {/* ── Date range card ───────────────────────────────────────── */}
      <Card elevated style={{ marginBottom: spacing[4], overflow: 'hidden' }}>
        <View style={{ height: 3, backgroundColor: colors.menstrual, marginTop: -spacing[3], marginHorizontal: -spacing[4], marginBottom: spacing[4] }} />

        <View style={styles.dateRow}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.textSecondary, fontSize: typography.xs, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: spacing[1] }}>
              تاریخ شروع
            </Text>
            <Text style={{ color: colors.textPrimary, fontSize: typography.xl, fontWeight: '800' }}>
              {faDate(period.start_date)}
            </Text>
          </View>

          <Text style={{ color: colors.border, fontSize: typography['2xl'], marginHorizontal: spacing[3] }}>→</Text>

          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={{ color: colors.textSecondary, fontSize: typography.xs, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: spacing[1] }}>
              تاریخ پایان
            </Text>
            {period.end_date ? (
              <Text style={{ color: colors.textPrimary, fontSize: typography.xl, fontWeight: '800' }}>
                {faDate(period.end_date)}
              </Text>
            ) : (
              <Text style={{ color: (colors as any).ovulationColor || colors.primary, fontSize: typography.base, fontWeight: '700' }}>
                در جریان
              </Text>
            )}
          </View>
        </View>

        {/* Duration badge */}
        {duration !== null && (
          <View style={{ flexDirection: 'row', marginTop: spacing[3] }}>
            <Badge label={`${toFa(duration)} روز`} variant="primary" />
          </View>
        )}
      </Card>

      {/* ── Cycle info ────────────────────────────────────────────── */}
      <Card style={{ marginBottom: spacing[4] }}>
        <Text style={{ color: colors.textPrimary, fontSize: typography.base, fontWeight: '700', marginBottom: spacing[1] }}>
          اطلاعات چرخه
        </Text>

        {period.cycle_length && (
          <InfoRow label="طول چرخه" value={`${toFa(period.cycle_length)} روز`} />
        )}
        {period.period_duration && (
          <InfoRow label="مدت دوره" value={`${toFa(period.period_duration)} روز`} />
        )}
        {period.predicted_end_date && (
          <InfoRow label="پایان پیش‌بینی‌شده" value={faDate(period.predicted_end_date)} />
        )}
        {/* Only show next period if it's a valid date after end_date */}
        {nextPeriod && (
          <InfoRow label="دوره‌ی بعدی" value={faDate(nextPeriod)} />
        )}
        {!period.cycle_length && !period.period_duration && !nextPeriod && (
          <Text style={{ color: colors.textSecondary, fontSize: typography.sm, paddingVertical: spacing[2] }}>
            اطلاعات چرخه پس از پایان دوره نمایش داده می‌شود.
          </Text>
        )}
      </Card>

      {/* ── Symptoms ──────────────────────────────────────────────── */}
      {symptoms.length > 0 && (
        <Card style={{ marginBottom: spacing[4] }}>
          <Text style={{ color: colors.textPrimary, fontSize: typography.base, fontWeight: '700', marginBottom: spacing[3] }}>
            علائم
          </Text>
          <View style={styles.chipRow}>
            {symptoms.map((s: string) => (
              <Badge key={s} label={SYMPTOM_LABELS[s] ?? s} variant="error" style={{ marginRight: spacing[2], marginBottom: spacing[2] }} />
            ))}
          </View>
        </Card>
      )}

      {/* ── Medications ───────────────────────────────────────────── */}
      {meds.length > 0 && (
        <Card style={{ marginBottom: spacing[6] }}>
          <Text style={{ color: colors.textPrimary, fontSize: typography.base, fontWeight: '700', marginBottom: spacing[3] }}>
            دارو
          </Text>
          <View style={styles.chipRow}>
            {meds.map((m: string) => (
              <Badge key={m} label={MED_LABELS[m] ?? m} variant="info" style={{ marginRight: spacing[2], marginBottom: spacing[2] }} />
            ))}
          </View>
        </Card>
      )}

      {/* ── Actions — view/edit only, NO delete ───────────────────── */}
      <View style={{ gap: spacing[3] }}>
        <Button
          label="ویرایش دوره"
          onPress={() => navigation.navigate('EditPeriod', { periodId })}
          size="lg"
          fullWidth
        />
        <Button
          label="بازگشت به تاریخچه"
          onPress={() => navigation.goBack()}
          variant="outline"
          size="lg"
          fullWidth
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex:     { flex: 1 },
  dateRow:  { flexDirection: 'row', alignItems: 'center' },
  chipRow:  { flexDirection: 'row', flexWrap: 'wrap' },
  infoRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
