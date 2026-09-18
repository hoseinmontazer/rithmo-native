/**
 * TTCSetupScreen — one question: when did you start trying to conceive?
 *
 * Modeled on PregnancySetupScreen's single-date-question shape, but with
 * only one date to pick (no LMP/due-date branching — TTC has no date
 * math of its own; see intelligence/services.py's ttc_status_payload()).
 * The date defaults to today and only looks backward, since "when did
 * you start trying" cannot be in the future.
 */
import React, { useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@hooks/useTheme';
import { screen } from '@theme/spacing';
import { Button, Icon } from '@components/ui';
import { useStartTTC } from '@hooks/queries/useTTC';
import { formatDateISO } from '@utils/dateUtils';
import { faDate } from '@utils/persian';
import { useToast } from '../../context/ToastContext';

function TTCDatePickerSheet({
  visible,
  selected,
  onClose,
  onSelect,
}: {
  visible: boolean;
  selected: Date | null;
  onClose: () => void;
  onSelect: (d: Date) => void;
}) {
  const { colors, spacing, typography, borderRadius } = useTheme();

  const dates: Date[] = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const count = 300;
    return Array.from({ length: count }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      return d;
    });
  }, []);

  const fmt = (d: Date) => faDate(d, { weekday: false });
  const isSel = (d: Date) => !!selected && d.toDateString() === selected.toDateString();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} accessibilityRole="button" accessibilityLabel="بستن" />
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderRadius: borderRadius.xl }]}>
          <View style={styles.handleWrap}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>
          <View style={[styles.headerRow, { borderBottomColor: colors.border, padding: spacing[4] }]}>
            <Text style={{ color: colors.textPrimary, fontSize: typography.base, fontWeight: '700' }}>
              از چه تاریخی تلاش می‌کنی؟
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel="بستن">
              <Icon name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false}>
            {dates.map((d, i) => {
              const sel = isSel(d);
              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => onSelect(d)}
                  style={[
                    styles.optionRow,
                    {
                      paddingHorizontal: spacing[4],
                      paddingVertical: spacing[3],
                      backgroundColor: sel ? colors.primary + '12' : 'transparent',
                      borderLeftWidth: sel ? 3 : 0,
                      borderLeftColor: colors.primary,
                    },
                  ]}
                >
                  <Text style={{ color: sel ? colors.primary : colors.textPrimary, fontWeight: sel ? '700' : '400' }}>
                    {fmt(d)}
                  </Text>
                  {sel ? <Icon name="check" size={18} color={colors.primary} /> : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function TTCSetupScreen() {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const toast = useToast();
  const startTTC = useStartTTC();

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  const handleSubmit = async () => {
    if (!selectedDate) { return; }
    try {
      await startTTC.mutateAsync(formatDateISO(selectedDate));
      toast.success('تلاش برای بارداری شروع شد', 'وضعیتت را می‌توانی همینجا ببینی.');
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'ثبت اطلاعات با خطا مواجه شد.';
      toast.error('خطا در ثبت', message);
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: screen.gutter,
          paddingTop: screen.top,
          paddingBottom: screen.bottom,
        }}
      >
        <Text style={{ color: colors.textPrimary, fontSize: typography.title, fontWeight: '800', marginBottom: spacing[2] }}>
          تلاش برای بارداری را شروع کن
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: typography.bodySmall, lineHeight: 20, marginBottom: spacing[5] }}>
          با ثبت تاریخ شروع، بازه‌ی باروری و خلاصه‌ی چرخه‌ات را در یک جا می‌بینی — بدون هیچ محاسبه یا تخمین جدیدی.
        </Text>

        <Text style={{ color: colors.textPrimary, fontSize: typography.bodySmall, fontWeight: '700', marginBottom: spacing[2] }}>
          از چه تاریخی تلاش می‌کنی؟
        </Text>
        <TouchableOpacity
          onPress={() => setShowPicker(true)}
          style={[
            styles.dateField,
            {
              borderColor: colors.border,
              borderRadius: borderRadius.md,
              backgroundColor: colors.surface,
              padding: spacing[4],
              marginBottom: spacing[6],
            },
          ]}
          accessibilityRole="button"
        >
          <Icon name="calendar-outline" size={20} color={colors.textSecondary} />
          <Text style={{ color: selectedDate ? colors.textPrimary : colors.textTertiary, fontSize: typography.base, marginRight: spacing[2] }}>
            {selectedDate ? faDate(selectedDate, { weekday: false }) : 'انتخاب تاریخ'}
          </Text>
        </TouchableOpacity>

        <Button
          label={startTTC.isPending ? 'در حال ثبت…' : 'شروع تلاش برای بارداری'}
          onPress={handleSubmit}
          disabled={!selectedDate || startTTC.isPending}
          loading={startTTC.isPending}
          size="lg"
          fullWidth
        />
      </ScrollView>

      <TTCDatePickerSheet
        visible={showPicker}
        selected={selectedDate}
        onClose={() => setShowPicker(false)}
        onSelect={(d) => {
          setSelectedDate(d);
          setShowPicker(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  dateField: { flexDirection: 'row-reverse', alignItems: 'center', borderWidth: 1, gap: 8 },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { maxHeight: '75%' },
  handleWrap: { alignItems: 'center', paddingTop: 8 },
  handle: { width: 36, height: 4, borderRadius: 2 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1 },
  listScroll: { paddingVertical: 4 },
  optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
