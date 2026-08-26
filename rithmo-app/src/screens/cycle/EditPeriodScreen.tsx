import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@hooks/useTheme';
import { screen } from '@theme/spacing';
import { Button, Icon, LoadingState, ErrorState } from '@components/ui';
import { usePeriod, usePatchPeriod } from '@hooks/queries/usePeriods';
import { useToast } from '../../context/ToastContext';
import { formatDateISO } from '@utils/dateUtils';
import { faDate } from '@utils/persian';
import type { CycleScreenProps } from '@navigation/types';

type Props = CycleScreenProps<'EditPeriod'>;

const COMMON_SYMPTOMS = [
  'cramps',
  'headache',
  'fatigue',
  'bloating',
  'mood swings',
  'backache',
  'nausea',
  'insomnia',
];

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

const COMMON_MEDS = [
  'ibuprofen',
  'paracetamol',
  'heating pad',
  'aspirin',
  'naproxen',
];

const MED_LABELS: Record<string, string> = {
  ibuprofen: 'ایبوپروفن',
  paracetamol: 'استامینوفن',
  'heating pad': 'کیسه آب گرم',
  aspirin: 'آسپرین',
  naproxen: 'ناپروکسن',
};

// ── Date Picker Sheet ─────────────────────────────────────────────────────────
function DatePickerSheet({
  visible,
  title,
  selected,
  minDate,
  onClose,
  onSelect,
}: {
  visible: boolean;
  title: string;
  selected: Date | null;
  minDate?: Date;
  onClose: () => void;
  onSelect: (d: Date) => void;
}) {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const today = new Date();
  const [cur, setCur] = useState<Date>(selected ?? today);

  useEffect(() => {
    if (visible) {
      setCur(selected ?? new Date());
    }
  }, [visible, selected]);

  const dates: Date[] = Array.from({ length: 60 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    return d;
  });

  const validDates = minDate
    ? dates.filter(d => d >= minDate)
    : dates;

  const fmt = (d: Date) =>
    faDate(d, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  const isToday = (d: Date) => d.toDateString() === today.toDateString();
  const isSel = (d: Date) => d.toDateString() === cur.toDateString();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} />
        <View style={[styles.modalSheet, { backgroundColor: colors.surface, borderRadius: borderRadius.xl }]}>
          {/* Handle */}
          <View style={styles.modalHandleWrapper}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
          </View>

          {/* Title */}
          <View style={[styles.modalHeaderRow, { borderBottomColor: colors.border, padding: spacing[4] }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary, fontSize: typography.base }]}>
              {title}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* List */}
          <ScrollView style={styles.dateListScroll} showsVerticalScrollIndicator={false}>
            {validDates.map((d, i) => {
              const sel = isSel(d);
              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => setCur(d)}
                  style={[
                    styles.dateOptionRow,
                    {
                      paddingHorizontal: spacing[4],
                      paddingVertical: spacing[3],
                      backgroundColor: sel ? colors.menstrual + '12' : 'transparent',
                      borderLeftWidth: sel ? 3 : 0,
                      borderLeftColor: colors.menstrual,
                    },
                  ]}
                >
                  <View>
                    <Text
                      style={[
                        styles.dateOptionText,
                        {
                          color: sel ? colors.menstrual : colors.textPrimary,
                          fontSize: typography.sm,
                          fontWeight: sel ? '700' : '400',
                        },
                      ]}
                    >
                      {fmt(d)}
                    </Text>
                    {isToday(d) && (
                      <Text style={[styles.todayTagText, { color: colors.menstrual, fontSize: typography.xs }]}>
                        امروز
                      </Text>
                    )}
                  </View>
                  {sel && <Icon name="check-circle" size={20} color={colors.menstrual} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Action */}
          <View style={[styles.modalActionFooter, { borderTopColor: colors.border, padding: spacing[4] }]}>
            <Button
              label="انتخاب این تاریخ"
              onPress={() => {
                onSelect(cur);
                onClose();
              }}
              size="md"
              fullWidth
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function EditPeriodScreen() {
  const navigation = useNavigation<Props['navigation']>();
  const route = useRoute<Props['route']>();
  const { colors, spacing, typography, borderRadius } = useTheme();
  const { periodId } = route.params;

  const { data: period, isLoading, isError, error, refetch } = usePeriod(periodId);
  const patchMutation = usePatchPeriod();
  const toast = useToast();

  // Form state
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [medication, setMedication] = useState<string[]>([]);
  const [symptomsText, setSymptomsText] = useState('');
  const [medicationText, setMedicationText] = useState('');

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Pre-fill form when period is loaded
  useEffect(() => {
    if (!period) return;
    setStartDate(new Date(period.start_date));
    setEndDate(period.end_date ? new Date(period.end_date) : null);

    const symsFromAPI = period.symptoms
      ? period.symptoms.split(',').map((s: string) => s.trim()).filter(Boolean)
      : [];
    const medsFromAPI = period.medication
      ? period.medication.split(',').map((m: string) => m.trim()).filter(Boolean)
      : [];

    const knownSyms = symsFromAPI.filter((s: string) => COMMON_SYMPTOMS.includes(s));
    const extraSyms = symsFromAPI.filter((s: string) => !COMMON_SYMPTOMS.includes(s));
    const knownMeds = medsFromAPI.filter((m: string) => COMMON_MEDS.includes(m));
    const extraMeds = medsFromAPI.filter((m: string) => !COMMON_MEDS.includes(m));

    setSymptoms(knownSyms);
    setMedication(knownMeds);
    setSymptomsText(extraSyms.join(', '));
    setMedicationText(extraMeds.join(', '));
  }, [period]);

  const toggleChip = (list: string[], setList: (v: string[]) => void, val: string) =>
    setList(list.includes(val) ? list.filter(x => x !== val) : [...list, val]);

  const buildField = (chips: string[], text: string) => {
    const extra = text.trim() ? text.split(',').map(s => s.trim()).filter(Boolean) : [];
    const all = [...new Set([...chips, ...extra])];
    return all.length ? all.join(',') : '';
  };

  const fmtDate = (d: Date) =>
    faDate(d, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  const handleSave = () => {
    if (!startDate) return;

    if (endDate) {
      // End date is inclusive: it may equal the start date (1-day period),
      // but must not be before it — mirrors the backend contract.
      if (endDate < startDate) {
        toast.warning('تاریخ نامعتبر', 'تاریخ پایان باید بعد از تاریخ شروع یا مساوی آن باشد.');
        return;
      }
    }

    patchMutation.mutate(
      {
        id: periodId,
        data: {
          start_date: formatDateISO(startDate),
          end_date: endDate ? formatDateISO(endDate) : undefined,
          symptoms: buildField(symptoms, symptomsText) || undefined,
          medication: buildField(medication, medicationText) || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success('به‌روزرسانی دوره', 'تغییراتت ذخیره شد.');
          navigation.goBack();
        },
        onError: (err: any) => {
          const msg =
            err?.response?.data?.end_date?.[0] ||
            err?.response?.data?.start_date?.[0] ||
            err?.response?.data?.detail ||
            'به‌روزرسانی ثبت دوره ناموفق بود.';
          toast.error('خطا در به‌روزرسانی', msg);
        },
      },
    );
  };

  if (isLoading) return <LoadingState fullScreen message="در حال بارگذاری ثبت دوره…" />;
  if (isError) return <ErrorState fullScreen error={error} onRetry={refetch} />;
  if (!period || !startDate) return null;

  const busy = patchMutation.isPending;
  const isOngoing = !endDate;

  // Earliest allowable end date = the start date itself (1-day periods
  // are valid; end_date is inclusive).
  const minEndDay = new Date(startDate);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
          paddingHorizontal: screen.gutter,
          paddingTop: screen.top,
          paddingBottom: screen.bottom,
        }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Introduction */}
          <View style={{ marginBottom: spacing[4] }}>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary, fontSize: typography.sm }]}>
              تاریخ‌ها، علائم و داروهای این دوره را ویرایش کن.
            </Text>
          </View>

          {/* ── 1. Start Date ──────────────────────────────────────── */}
          <View style={{ marginBottom: spacing[4] }}>
            <Text style={[styles.fieldSectionLabel, { color: colors.textTertiary, fontSize: typography.xs, marginBottom: spacing[2] }]}>
              تاریخ شروع
            </Text>
            <TouchableOpacity
              onPress={() => setShowStartPicker(true)}
              activeOpacity={0.8}
              style={[
                styles.dateCard,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                  borderRadius: borderRadius.md,
                  padding: spacing[3],
                },
              ]}
            >
              <View style={styles.dateCardLeft}>
                <Icon name="calendar" size={20} color={colors.menstrual} />
                <View>
                  <Text style={[styles.dateValueText, { color: colors.textPrimary, fontSize: typography.base }]}>
                    {startDate ? fmtDate(startDate) : 'انتخاب تاریخ'}
                  </Text>
                  <Text style={[styles.dateSubtext, { color: colors.textTertiary, fontSize: typography.xs }]}>
                    برای تغییر، لمس کن
                  </Text>
                </View>
              </View>
              <Icon name="chevron-right" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>

          {/* ── 2. End Date ────────────────────────────────────────── */}
          <View style={{ marginBottom: spacing[5] }}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.fieldSectionLabel, { color: colors.textTertiary, fontSize: typography.xs }]}>
                تاریخ پایان
              </Text>
              {isOngoing && (
                <Text style={[styles.optionalTag, { color: colors.textTertiary, fontSize: typography.xs }]}>
                  دوره در جریان
                </Text>
              )}
            </View>

            <TouchableOpacity
              onPress={() => setShowEndPicker(true)}
              activeOpacity={0.8}
              style={[
                styles.dateCard,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                  borderRadius: borderRadius.md,
                  padding: spacing[3],
                },
              ]}
            >
              <View style={styles.dateCardLeft}>
                <Icon name="calendar-check" size={20} color={endDate ? colors.primary : colors.textTertiary} />
                <View>
                  <Text
                    style={[
                      styles.dateValueText,
                      {
                        color: endDate ? colors.textPrimary : colors.textTertiary,
                        fontSize: typography.base,
                        fontWeight: endDate ? '700' : '400',
                      },
                    ]}
                  >
                    {endDate ? fmtDate(endDate) : 'هنوز به پایان نرسیده (در جریان)'}
                  </Text>
                  <Text style={[styles.dateSubtext, { color: colors.textTertiary, fontSize: typography.xs }]}>
                    زودترین تاریخ مجاز: {fmtDate(minEndDay)}
                  </Text>
                </View>
              </View>

              <View style={styles.dateActionRight}>
                {endDate && (
                  <TouchableOpacity
                    onPress={() => setEndDate(null)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{ marginRight: spacing[1] }}
                  >
                    <Icon name="close-circle-outline" size={18} color={colors.textTertiary} />
                  </TouchableOpacity>
                )}
                <Icon name="chevron-right" size={18} color={colors.textTertiary} />
              </View>
            </TouchableOpacity>
          </View>

          {/* ── 3. Symptoms ────────────────────────────────────────── */}
          <View style={{ marginBottom: spacing[5] }}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.fieldSectionLabel, { color: colors.textTertiary, fontSize: typography.xs }]}>
                علائم
              </Text>
              <Text style={[styles.optionalTag, { color: colors.textTertiary, fontSize: typography.xs }]}>
                اختیاری
              </Text>
            </View>

            <View style={styles.chipsWrap}>
              {COMMON_SYMPTOMS.map(s => {
                const active = symptoms.includes(s);
                return (
                  <TouchableOpacity
                    key={s}
                    onPress={() => toggleChip(symptoms, setSymptoms, s)}
                    activeOpacity={0.75}
                    style={[
                      styles.chipItem,
                      {
                        backgroundColor: active ? colors.menstrual + '18' : colors.surfaceSecondary,
                        borderColor: active ? colors.menstrual : colors.border,
                        borderRadius: borderRadius.pill,
                        paddingHorizontal: spacing[3],
                        paddingVertical: spacing[2],
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color: active ? colors.menstrual : colors.textSecondary,
                          fontSize: typography.xs,
                          fontWeight: active ? '700' : '500',
                          textTransform: 'capitalize',
                        },
                      ]}
                    >
                      {SYMPTOM_LABELS[s] ?? s}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TextInput
              style={[
                styles.textInputArea,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                  borderRadius: borderRadius.md,
                  color: colors.textPrimary,
                  fontSize: typography.sm,
                  padding: spacing[3],
                  marginTop: spacing[2],
                },
              ]}
              placeholder="سایر علائم…"
              placeholderTextColor={colors.textTertiary}
              value={symptomsText}
              onChangeText={setSymptomsText}
              multiline
              numberOfLines={2}
            />
          </View>

          {/* ── 4. Medication ──────────────────────────────────────── */}
          <View style={{ marginBottom: spacing[6] }}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.fieldSectionLabel, { color: colors.textTertiary, fontSize: typography.xs }]}>
                دارو
              </Text>
              <Text style={[styles.optionalTag, { color: colors.textTertiary, fontSize: typography.xs }]}>
                اختیاری
              </Text>
            </View>

            <View style={styles.chipsWrap}>
              {COMMON_MEDS.map(m => {
                const active = medication.includes(m);
                return (
                  <TouchableOpacity
                    key={m}
                    onPress={() => toggleChip(medication, setMedication, m)}
                    activeOpacity={0.75}
                    style={[
                      styles.chipItem,
                      {
                        backgroundColor: active ? colors.primary + '18' : colors.surfaceSecondary,
                        borderColor: active ? colors.primary : colors.border,
                        borderRadius: borderRadius.pill,
                        paddingHorizontal: spacing[3],
                        paddingVertical: spacing[2],
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color: active ? colors.primary : colors.textSecondary,
                          fontSize: typography.xs,
                          fontWeight: active ? '700' : '500',
                          textTransform: 'capitalize',
                        },
                      ]}
                    >
                      {MED_LABELS[m] ?? m}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TextInput
              style={[
                styles.textInputArea,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                  borderRadius: borderRadius.md,
                  color: colors.textPrimary,
                  fontSize: typography.sm,
                  padding: spacing[3],
                  marginTop: spacing[2],
                },
              ]}
              placeholder="سایر داروها…"
              placeholderTextColor={colors.textTertiary}
              value={medicationText}
              onChangeText={setMedicationText}
              multiline
              numberOfLines={2}
            />
          </View>

          {/* ── Actions ────────────────────────────────────────────── */}
          <View style={{ gap: spacing[2] }}>
            <Button
              label={busy ? 'در حال ذخیره…' : 'ذخیره تغییرات'}
              onPress={handleSave}
              disabled={busy}
              loading={busy}
              size="lg"
              fullWidth
            />
            <Button
              label="انصراف"
              onPress={() => navigation.goBack()}
              variant="ghost"
              size="md"
              fullWidth
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Start Date Picker */}
      <DatePickerSheet
        visible={showStartPicker}
        title="ویرایش تاریخ شروع"
        selected={startDate}
        onClose={() => setShowStartPicker(false)}
        onSelect={d => {
          setStartDate(d);
          setEndDate(null);
        }}
      />

      {/* End Date Picker */}
      <DatePickerSheet
        visible={showEndPicker}
        title="ویرایش تاریخ پایان"
        selected={endDate}
        minDate={minEndDay}
        onClose={() => setShowEndPicker(false)}
        onSelect={setEndDate}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerTitle: {
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    lineHeight: 18,
  },
  fieldSectionLabel: {
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  optionalTag: {
    fontWeight: '500',
  },
  dateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  dateCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateValueText: {
    fontWeight: '600',
  },
  dateSubtext: {
    marginTop: 1,
  },
  dateActionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chipItem: {
    borderWidth: 1,
  },
  chipText: {},
  textInputArea: {
    borderWidth: 1,
    minHeight: 64,
    textAlignVertical: 'top',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '75%',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  modalHandleWrapper: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    fontWeight: '700',
  },
  dateListScroll: {
    maxHeight: 320,
  },
  dateOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateOptionText: {},
  todayTagText: {
    fontWeight: '600',
    marginTop: 1,
  },
  modalActionFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
