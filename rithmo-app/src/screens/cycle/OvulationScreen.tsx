import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '@hooks/useTheme';
import { useLatestOvulation } from '@hooks/queries/usePeriods';
import { Card, LoadingState, ErrorState, Badge } from '@components/ui';
import { daysBetween, todayISO } from '@utils/dateUtils';
import { toFa, faDate } from '@utils/persian';

export default function OvulationScreen() {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const { data, isLoading, isError, error, refetch } = useLatestOvulation();

  if (isLoading) {return <LoadingState fullScreen message="در حال بارگذاری داده‌های تخمک‌گذاری…" />;}
  if (isError)   {return <ErrorState fullScreen error={error} onRetry={refetch} />;}
  if (!data)     {return null;}

  const today = todayISO();
  const daysToOvulation = daysBetween(today, data.ovulation_date);
  const isInFertileWindow = today >= data.fertile_window_start && today <= data.fertile_window_end;
  // Confidence contract: a number in [0, 1] + a separate label.  The bar
  // and the % only render when the value is a real finite number — a bad
  // payload can never produce a "NaN%" on screen.
  const confidencePct =
    typeof data.confidence === 'number' && Number.isFinite(data.confidence)
      ? Math.round(data.confidence * 100)
      : null;

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: colors.background }]}
      contentContainerStyle={{ padding: spacing[5] }}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero card */}
      <Card elevated style={{ marginBottom: spacing[4], alignItems: 'center' }}>
        <Text style={{ fontSize: 56 }}>✨</Text>
        <Text style={[styles.heroTitle, { color: colors.textPrimary, fontSize: typography['2xl'], fontWeight: '700', marginTop: spacing[3] }]}>
          پیش‌بینی تخمک‌گذاری
        </Text>

        {isInFertileWindow ? (
          <Badge label="🌟 پنجره‌ی باروری فعال است" variant="success" style={{ marginTop: spacing[3] }} />
        ) : (
          <Badge
            label={daysToOvulation > 0 ? `هنوز ${toFa(daysToOvulation)} روز تا تخمک‌گذاری` : 'تاریخ تخمک‌گذاری گذشته'}
            variant={daysToOvulation > 0 ? 'primary' : 'neutral'}
            style={{ marginTop: spacing[3] }}
          />
        )}

        <Text style={[styles.ovDate, { color: colors.primary, fontSize: typography.xl, fontWeight: '700', marginTop: spacing[4] }]}>
          {faDate(data.ovulation_date)}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: typography.sm, marginTop: 2 }}>
          تاریخ پیش‌بینی‌شده‌ی تخمک‌گذاری
        </Text>

        {/* Confidence bar */}
        <View style={[styles.confidenceRow, { marginTop: spacing[5], width: '100%' }]}>
          <Text style={{ color: colors.textSecondary, fontSize: typography.sm }}>میزان اطمینان</Text>
          <Text style={{ color: colors.textPrimary, fontSize: typography.sm, fontWeight: '600' }}>
            {confidencePct != null ? `${toFa(confidencePct)}٪` : (data.confidence_label ?? '—')}
          </Text>
        </View>
        <View style={[styles.track, { backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius.full, height: 8, marginTop: spacing[1] }]}>
          <View style={[styles.fill, { width: confidencePct != null ? `${confidencePct}%` : '0%', backgroundColor: colors.success, borderRadius: borderRadius.full, height: 8 }]} />
        </View>
      </Card>

      {/* Fertile window */}
      <Card style={{ marginBottom: spacing[4] }}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: typography.base, fontWeight: '600', marginBottom: spacing[4] }]}>
          🗓  پنجره‌ی باروری
        </Text>

        <View style={styles.windowRow}>
          <WindowDate label="آغاز پنجره" date={data.fertile_window_start} colors={colors} spacing={spacing} typography={typography} borderRadius={borderRadius} />
          <Text style={{ color: colors.textSecondary, fontSize: typography.xl, marginHorizontal: spacing[3] }}>→</Text>
          <WindowDate label="پایان پنجره" date={data.fertile_window_end} colors={colors} spacing={spacing} typography={typography} borderRadius={borderRadius} />
        </View>

        <Text style={{ color: colors.textSecondary, fontSize: typography.sm, marginTop: spacing[4], lineHeight: 20 }}>
          پنجره‌ی باروری شما {toFa(daysBetween(data.fertile_window_start, data.fertile_window_end))} روز طول می‌کشد.
          بیشترین احتمال بارداری در ۱ تا ۲ روز قبل از تخمک‌گذاری و در روز تخمک‌گذاری است.
        </Text>
      </Card>

      {/* Tips */}
      <Card>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: typography.base, fontWeight: '600', marginBottom: spacing[3] }]}>
          💡  نکات
        </Text>
        {TIPS.map((tip, i) => (
          <View key={i} style={[styles.tipRow, { marginBottom: spacing[2] }]}>
            <Text style={{ color: colors.primary, marginRight: spacing[2] }}>•</Text>
            <Text style={{ color: colors.textPrimary, fontSize: typography.sm, lineHeight: 20, flex: 1 }}>{tip}</Text>
          </View>
        ))}
      </Card>

      <View style={{ height: spacing[8] }} />
    </ScrollView>
  );
}

function WindowDate({ label, date, colors, spacing, typography, borderRadius }: {
  label: string; date: string;
  colors: any; spacing: any; typography: any; borderRadius: any;
}) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ color: colors.textSecondary, fontSize: typography.xs, marginBottom: spacing[1] }}>{label}</Text>
      <View style={{ backgroundColor: colors.primaryLight, borderRadius: borderRadius.lg, padding: spacing[3] }}>
        <Text style={{ color: colors.primary, fontSize: typography.sm, fontWeight: '700' }}>{faDate(date)}</Text>
      </View>
    </View>
  );
}

const TIPS = [
  'هر صبح دمای پایه‌ی بدن را ثبت کن تا پیش‌بینی‌ها دقیق‌تر شوند.',
  'تغییرات ترشحات دهانه‌ی رحم (شفاف و کشسان) نشان‌دهنده‌ی اوج باروری هستند.',
  'کیت‌های پیش‌بینی تخمک‌گذاری می‌توانند پنجره‌ی باروری را تأیید کنند.',
  'استرس و بیماری می‌توانند زمان تخمک‌گذاری را جابه‌جا کنند.',
];

const styles = StyleSheet.create({
  flex:           { flex: 1 },
  heroTitle:      { textAlign: 'center' },
  ovDate:         { textAlign: 'center' },
  confidenceRow:  { flexDirection: 'row', justifyContent: 'space-between' },
  track:          { width: '100%', overflow: 'hidden' },
  fill:           {},
  sectionTitle:   {},
  windowRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  tipRow:         { flexDirection: 'row' },
});
