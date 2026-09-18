/**
 * TTCStatusScreen — status, cycles-trying count, cycle summary, the
 * existing fertile-window card, and the two actions available from
 * here: pause and end. Every number here is exactly what the API
 * returned — nothing is recomputed on the client.
 *
 * Fertility data is rendered via the existing `FertileWindowCard`
 * (its own hook, its own request) rather than by reading the nested
 * `fertile_window` field on the TTC payload, so there is only ever one
 * fertile-window UI in the app.
 */
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@hooks/useTheme';
import { screen } from '@theme/spacing';
import { Button, Card, ConfirmSheet, Icon, LoadingState } from '@components/ui';
import { useEndTTC, usePauseTTC, useStartTTC, useTTCStatus } from '@hooks/queries/useTTC';
import { FertileWindowCard } from '@screens/insights/components/FertileWindowCard';
import { confidenceLabel } from '@i18n';
import { toFa, faDateYear } from '@utils/persian';
import { useToast } from '../../context/ToastContext';

export default function TTCStatusScreen() {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const toast = useToast();
  const { data, isLoading } = useTTCStatus();
  const resumeTTC = useStartTTC();
  const pauseTTC = usePauseTTC();
  const endTTC = useEndTTC();
  const [confirmEndVisible, setConfirmEndVisible] = useState(false);

  const handlePause = async () => {
    try {
      await pauseTTC.mutateAsync();
      toast.success('متوقف شد', 'حالت تلاش برای بارداری موقتاً متوقف شد.');
    } catch (err: any) {
      toast.error('خطا', err?.response?.data?.message || 'این عملیات با خطا مواجه شد.');
    }
  };

  const handleResume = async () => {
    try {
      await resumeTTC.mutateAsync();
      toast.success('ادامه یافت', 'حالت تلاش برای بارداری دوباره فعال شد.');
    } catch (err: any) {
      toast.error('خطا', err?.response?.data?.message || 'این عملیات با خطا مواجه شد.');
    }
  };

  const handleEnd = async () => {
    setConfirmEndVisible(false);
    try {
      await endTTC.mutateAsync();
      toast.success('پایان یافت', 'حالت تلاش برای بارداری پایان یافت. تاریخچه چرخه‌ات دست‌نخورده باقی مانده.');
    } catch (err: any) {
      toast.error('خطا', err?.response?.data?.message || 'پایان دادن با خطا مواجه شد.');
    }
  };

  if (isLoading || !data || data.status === 'not_trying') {
    return <LoadingState fullScreen message="در حال بررسی وضعیت…" />;
  }

  const isPaused = data.status === 'paused';

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: screen.gutter,
          paddingTop: screen.top,
          paddingBottom: screen.bottom,
        }}
      >
        <Card style={{ padding: spacing[5], marginBottom: spacing[4] }}>
          <View style={styles.centerCol}>
            <View style={[styles.iconWrap, { backgroundColor: colors.surfaceSubtle, borderRadius: borderRadius.md }]}>
              <Icon name="heart-plus-outline" size={28} color={colors.primary} />
            </View>
            <Text style={{ color: colors.textSecondary, fontSize: typography.bodySmall, marginTop: spacing[3] }}>
              چرخه‌های تلاش
            </Text>
            <Text style={{ color: colors.textPrimary, fontSize: typography.display, fontWeight: '800' }}>
              {toFa(data.cycles_trying)}
            </Text>

            <View
              style={[
                styles.badge,
                {
                  backgroundColor: isPaused ? colors.surfaceSecondary : colors.primary + '14',
                  borderRadius: borderRadius.pill,
                  marginTop: spacing[3],
                },
              ]}
            >
              <Text style={{ color: isPaused ? colors.textSecondary : colors.primary, fontSize: typography.label, fontWeight: '700' }}>
                {isPaused ? 'متوقف‌شده' : 'در حال تلاش'}
              </Text>
            </View>
          </View>
        </Card>

        {data.started_at ? (
          <Card style={{ padding: spacing[4], marginBottom: spacing[4] }}>
            <View style={styles.row}>
              <Text style={{ color: colors.textSecondary, fontSize: typography.bodySmall }}>
                تاریخ شروع
              </Text>
              <Text style={{ color: colors.textPrimary, fontSize: typography.bodySmall, fontWeight: '700' }}>
                {faDateYear(data.started_at + 'T00:00:00')}
              </Text>
            </View>
          </Card>
        ) : null}

        {data.cycle_summary ? (
          <Card style={{ padding: spacing[4], marginBottom: spacing[4] }}>
            <Text style={{ color: colors.textPrimary, fontSize: typography.bodySmall, fontWeight: '700', marginBottom: spacing[3] }}>
              خلاصه چرخه
            </Text>
            <View style={[styles.row, { marginBottom: spacing[2] }]}>
              <Text style={{ color: colors.textSecondary, fontSize: typography.bodySmall }}>
                میانگین طول چرخه
              </Text>
              <Text style={{ color: colors.textPrimary, fontSize: typography.bodySmall, fontWeight: '700' }}>
                {data.cycle_summary.average_cycle_length != null
                  ? `${toFa(data.cycle_summary.average_cycle_length)} روز`
                  : '—'}
              </Text>
            </View>
            {data.cycle_summary.confidence_label ? (
              <View style={styles.row}>
                <Text style={{ color: colors.textSecondary, fontSize: typography.bodySmall }}>
                  اطمینان پیش‌بینی
                </Text>
                <Text style={{ color: colors.textPrimary, fontSize: typography.bodySmall, fontWeight: '700' }}>
                  {confidenceLabel(data.cycle_summary.confidence_label)}
                </Text>
              </View>
            ) : null}
          </Card>
        ) : null}

        <FertileWindowCard />

        {data.disclaimer_fa ? (
          <Text
            style={{
              color: colors.textTertiary,
              fontSize: typography.caption,
              lineHeight: 18,
              marginTop: spacing[4],
              marginBottom: spacing[5],
            }}
          >
            {data.disclaimer_fa}
          </Text>
        ) : null}

        {isPaused ? (
          <Button
            label={resumeTTC.isPending ? 'در حال ادامه…' : 'ادامه تلاش'}
            onPress={handleResume}
            loading={resumeTTC.isPending}
            size="lg"
            fullWidth
          />
        ) : (
          <Button
            label={pauseTTC.isPending ? 'در حال توقف…' : 'توقف موقت'}
            onPress={handlePause}
            loading={pauseTTC.isPending}
            variant="secondary"
            size="lg"
            fullWidth
          />
        )}

        <Text
          onPress={() => setConfirmEndVisible(true)}
          style={{
            color: colors.textTertiary,
            fontSize: typography.caption,
            textAlign: 'center',
            marginTop: spacing[6],
            textDecorationLine: 'underline',
          }}
        >
          پایان تلاش برای بارداری
        </Text>
      </ScrollView>

      <ConfirmSheet
        visible={confirmEndVisible}
        title="پایان تلاش برای بارداری؟"
        message="تاریخچه چرخه و داده‌های ثبت‌شده‌ات حذف نمی‌شود."
        confirmLabel="پایان بده"
        cancelLabel="انصراف"
        variant="warning"
        onConfirm={handleEnd}
        onCancel={() => setConfirmEndVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centerCol: { alignItems: 'center' },
  iconWrap: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  badge: { paddingHorizontal: 14, paddingVertical: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
