/**
 * PregnancyStatusScreen — gestational week/day, trimester, estimated due
 * date, and the two actions available from here: log how you feel (routes
 * into the existing QuickLog flow — no parallel logging system) and end
 * pregnancy mode (a plain confirmation, no outcome workflow).
 *
 * Every number here is exactly what the API returned — nothing is
 * recomputed on the client.
 */
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@hooks/useTheme';
import { screen } from '@theme/spacing';
import { Button, Card, ConfirmSheet, Icon, LoadingState } from '@components/ui';
import { useEndPregnancy, usePregnancyStatus } from '@hooks/queries/usePregnancy';
import { toFa, faDateYear } from '@utils/persian';
import { useToast } from '../../context/ToastContext';

const TRIMESTER_LABEL_FA: Record<number, string> = {
  1: 'سه‌ماهه اول',
  2: 'سه‌ماهه دوم',
  3: 'سه‌ماهه سوم',
};

export default function PregnancyStatusScreen() {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const navigation = useNavigation();
  const toast = useToast();
  const { data, isLoading } = usePregnancyStatus();
  const endPregnancy = useEndPregnancy();
  const [confirmEndVisible, setConfirmEndVisible] = useState(false);

  const goToQuickLog = () => {
    navigation.dispatch(
      CommonActions.navigate({ name: 'LogTab', params: { screen: 'QuickLog' } }),
    );
  };

  const handleEndPregnancy = async () => {
    setConfirmEndVisible(false);
    try {
      await endPregnancy.mutateAsync();
      toast.success('پایان بارداری', 'حالت بارداری پایان یافت. تاریخچه چرخه‌ات دست‌نخورده باقی مانده.');
    } catch (err: any) {
      toast.error('خطا', err?.response?.data?.error || 'پایان بارداری با خطا مواجه شد.');
    }
  };

  if (isLoading || !data?.has_active_pregnancy) {
    return <LoadingState fullScreen message="در حال بررسی وضعیت بارداری…" />;
  }

  const week = data.gestational_week ?? 0;
  const day = data.gestational_day ?? 0;
  const trimester = data.trimester ?? 1;

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
              <Icon name="human-pregnant" size={28} color={colors.primary} />
            </View>
            <Text style={{ color: colors.textSecondary, fontSize: typography.bodySmall, marginTop: spacing[3] }}>
              هفته بارداری
            </Text>
            <Text style={{ color: colors.textPrimary, fontSize: typography.display, fontWeight: '800' }}>
              {toFa(week)}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: typography.bodySmall }}>
              {`+ ${toFa(day)} روز`}
            </Text>

            <View style={[styles.badge, { backgroundColor: colors.primary + '14', borderRadius: borderRadius.pill, marginTop: spacing[3] }]}>
              <Text style={{ color: colors.primary, fontSize: typography.label, fontWeight: '700' }}>
                {TRIMESTER_LABEL_FA[trimester] ?? TRIMESTER_LABEL_FA[1]}
              </Text>
            </View>
          </View>
        </Card>

        <Card style={{ padding: spacing[4], marginBottom: spacing[4] }}>
          <View style={styles.row}>
            <Text style={{ color: colors.textSecondary, fontSize: typography.bodySmall }}>
              تاریخ تخمینی زایمان
            </Text>
            <Text style={{ color: colors.textPrimary, fontSize: typography.bodySmall, fontWeight: '700' }}>
              {data.due_date ? faDateYear(data.due_date + 'T00:00:00') : '—'}
            </Text>
          </View>
        </Card>

        <Button
          label="ثبت حال امروز"
          onPress={goToQuickLog}
          size="lg"
          fullWidth
        />

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
          پایان حالت بارداری
        </Text>
      </ScrollView>

      <ConfirmSheet
        visible={confirmEndVisible}
        title="پایان حالت بارداری؟"
        message="تاریخچه چرخه و داده‌های ثبت‌شده‌ات حذف نمی‌شود و پیش‌بینی چرخه دوباره فعال می‌شود."
        confirmLabel="پایان بده"
        cancelLabel="انصراف"
        variant="warning"
        onConfirm={handleEndPregnancy}
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
