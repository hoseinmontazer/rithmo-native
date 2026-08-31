/**
 * PregnancySetupScreen — one question: when did this pregnancy start?
 *
 * Last Menstrual Period (LMP) is the primary path — it's what the user is
 * most likely to know offhand and it's the anchor every other calculation
 * (gestational week/day, trimester, due date) is derived from server-side.
 * A known due date is offered as a secondary, less prominent alternative
 * for the user who already has one from a clinic visit; the backend
 * derives the LMP from it the same way (Naegele's rule, inverted).
 *
 * No other onboarding questions — this is deliberately the only step.
 */
import React, { useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@hooks/useTheme';
import { screen } from '@theme/spacing';
import { Button, Icon } from '@components/ui';
import { useStartPregnancy } from '@hooks/queries/usePregnancy';
import { formatDateISO } from '@utils/dateUtils';
import { faDate } from '@utils/persian';
import { useToast } from '../../context/ToastContext';

type EntryMode = 'last_period_date' | 'due_date';

/** Pregnancy-appropriate date range picker — LMP looks up to ~300 days
 *  back, a known due date up to ~300 days ahead. EditPeriodScreen's own
 *  DatePickerSheet is a private, period-scoped (last-60-days-only)
 *  component, so this is a small adapted sibling, not an import. */
function PregnancyDatePickerSheet({
  visible,
  title,
  mode,
  selected,
  onClose,
  onSelect,
}: {
  visible: boolean;
  title: string;
  mode: EntryMode;
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
      // LMP: today going backward. Due date: today going forward.
      d.setDate(today.getDate() + (mode === 'last_period_date' ? -i : i));
      return d;
    });
  }, [mode]);

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
              {title}
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

export default function PregnancySetupScreen() {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const toast = useToast();
  const startPregnancy = useStartPregnancy();

  const [mode, setMode] = useState<EntryMode>('last_period_date');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  const switchMode = (next: EntryMode) => {
    setMode(next);
    setSelectedDate(null);
  };

  const handleSubmit = async () => {
    if (!selectedDate) { return; }
    try {
      await startPregnancy.mutateAsync({ [mode]: formatDateISO(selectedDate) });
      toast.success('پیگیری بارداری شروع شد', 'وضعیت بارداریت را می‌توانی همینجا ببینی.');
    } catch (err: any) {
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.non_field_errors?.[0] ||
        'ثبت اطلاعات بارداری با خطا مواجه شد.';
      toast.error('خطا در ثبت', message);
    }
  };

  const label = mode === 'last_period_date' ? 'اولین روز آخرین پریود' : 'تاریخ تخمینی زایمان';

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
          بارداریت را ثبت کن
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: typography.bodySmall, lineHeight: 20, marginBottom: spacing[5] }}>
          با یک تاریخ شروع می‌کنیم — هفته و روز بارداری، سه‌ماهه و تاریخ تخمینی زایمان از همین یک تاریخ محاسبه می‌شود.
        </Text>

        <Text style={{ color: colors.textPrimary, fontSize: typography.bodySmall, fontWeight: '700', marginBottom: spacing[2] }}>
          {label}
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
              marginBottom: spacing[4],
            },
          ]}
          accessibilityRole="button"
        >
          <Icon name="calendar-outline" size={20} color={colors.textSecondary} />
          <Text style={{ color: selectedDate ? colors.textPrimary : colors.textTertiary, fontSize: typography.base, marginRight: spacing[2] }}>
            {selectedDate ? faDate(selectedDate, { weekday: false }) : 'انتخاب تاریخ'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => switchMode(mode === 'last_period_date' ? 'due_date' : 'last_period_date')}
          style={{ marginBottom: spacing[6] }}
        >
          <Text style={{ color: colors.primary, fontSize: typography.caption, fontWeight: '600' }}>
            {mode === 'last_period_date'
              ? 'به‌جای آن، تاریخ تخمینی زایمان را می‌دانم'
              : 'به‌جای آن، تاریخ آخرین پریود را می‌دانم'}
          </Text>
        </TouchableOpacity>

        <Button
          label={startPregnancy.isPending ? 'در حال ثبت…' : 'شروع پیگیری'}
          onPress={handleSubmit}
          disabled={!selectedDate || startPregnancy.isPending}
          loading={startPregnancy.isPending}
          size="lg"
          fullWidth
        />
      </ScrollView>

      <PregnancyDatePickerSheet
        visible={showPicker}
        title={label}
        mode={mode}
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
