import React, { useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@hooks/useTheme';
import { screen } from '@theme/spacing';
import { Button, Icon } from '@components/ui';
import type { CycleStackParamList } from '@navigation/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCreatePeriod, usePatchPeriod } from '@hooks/queries/usePeriods';
import { useToast } from '../../context/ToastContext';
import { formatDateISO } from '@utils/dateUtils';
import { faDate, faDateShort } from '@utils/persian';

interface ActivePeriodError {
  error: string;
  active_period_id: number;
  start_date: string;
}

type Props = NativeStackScreenProps<CycleStackParamList, 'LogPeriod'>;

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

const COMMON_MEDS = [
  'ibuprofen',
  'paracetamol',
  'heating pad',
  'aspirin',
  'naproxen',
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

const MED_LABELS: Record<string, string> = {
  ibuprofen: 'ایبوپروفن',
  paracetamol: 'استامینوفن',
  'heating pad': 'کیسه آب گرم',
  aspirin: 'آسپرین',
  naproxen: 'ناپروکسن',
};

// ── Custom Date Picker Sheet ──────────────────────────────────────────────────
function CustomDatePickerSheet({
  visible,
  selected,
  onClose,
  onSelect,
}: {
  visible: boolean;
  selected: Date;
  onClose: () => void;
  onSelect: (d: Date) => void;
}) {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const [cur, setCur] = useState(selected);
  const today = new Date();

  const dates: Date[] = Array.from({ length: 45 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    return d;
  });

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
              انتخاب تاریخ شروع
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* List */}
          <ScrollView style={styles.dateListScroll} showsVerticalScrollIndicator={false}>
            {dates.map((d, i) => {
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

// ── End Active Period Sheet ──────────────────────────────────────────────────
function EndPeriodSheet({
  visible,
  activePeriodStartDate,
  onClose,
  onConfirm,
  onEndOnly,
}: {
  visible: boolean;
  activePeriodStartDate: string;
  onClose: () => void;
  onConfirm: (endDate: string) => void;
  onEndOnly: (endDate: string) => void;
}) {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(activePeriodStartDate || today);
  startDate.setHours(0, 0, 0, 0);

  // Minimum end date: the start date itself (a 1-day period is valid —
  // end_date is inclusive, so start == end means one day of bleeding).
  const minEnd = new Date(startDate);

  const defaultEnd = today >= minEnd ? today : minEnd;
  const [endDate, setEndDate] = useState(defaultEnd);

  React.useEffect(() => {
    if (visible) {
      const t = new Date();
      t.setHours(0, 0, 0, 0);
      const s = new Date(activePeriodStartDate || t);
      s.setHours(0, 0, 0, 0);
      const m = new Date(s);
      setEndDate(t >= m ? new Date(t) : new Date(m));
    }
  }, [visible, activePeriodStartDate]);

  const validDates: Date[] = [];
  if (today >= minEnd) {
    const c = new Date(minEnd);
    while (c <= today) {
      validDates.push(new Date(c));
      c.setDate(c.getDate() + 1);
    }
    validDates.reverse();
  }

  const noValidDates = validDates.length === 0;

  const fmt = (d: Date) =>
    faDate(d, { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} />
        <View style={[styles.endPeriodSheet, { backgroundColor: colors.surface, borderRadius: borderRadius.xl }]}>
          {/* Header */}
          <View style={[styles.endPeriodHeader, { padding: spacing[4], borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.modalTitle, { color: colors.textPrimary, fontSize: typography.base }]}>
                دوره‌ی قبلی هنوز فعال است
              </Text>
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary, fontSize: typography.xs, marginTop: 2 }]}>
                شروع: {faDateShort(startDate)}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={{ padding: spacing[4] }}>
            {/* Context Note */}
            <View style={[styles.endPeriodNote, { backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius.md, padding: spacing[3], marginBottom: spacing[4] }]}>
              <Icon name="information-outline" size={16} color={colors.primary} />
              <Text style={[styles.endPeriodNoteText, { color: colors.textSecondary, fontSize: typography.xs }]}>
                {noValidDates
                  ? `دوره اخیرا شروع شده. زودترین تاریخ پایان مجاز: ${faDateShort(minEnd)}.`
                  : `لطفا تاریخ پایان دوره‌ی قبلی را مشخص کن (حداقل ۱ روز).`}
              </Text>
            </View>

            {/* Date choices */}
            {!noValidDates && (
              <View style={{ marginBottom: spacing[4] }}>
                <Text style={[styles.fieldSectionLabel, { color: colors.textTertiary, fontSize: typography.xs, marginBottom: spacing[2] }]}>
                  END DATE
                </Text>
                <View style={styles.quickDatesRow}>
                  {validDates.slice(0, 3).map((d, i) => {
                    const isSel = d.toDateString() === endDate.toDateString();
                    return (
                      <TouchableOpacity
                        key={i}
                        onPress={() => setEndDate(d)}
                        style={[
                          styles.datePillBtn,
                          {
                            backgroundColor: isSel ? colors.menstrual + '18' : colors.surfaceSecondary,
                            borderColor: isSel ? colors.menstrual : colors.border,
                            borderRadius: borderRadius.md,
                            padding: spacing[2],
                          },
                        ]}
                      >
                        <Text style={[styles.datePillText, { color: isSel ? colors.menstrual : colors.textPrimary, fontSize: typography.xs, fontWeight: isSel ? '700' : '400' }]}>
                          {fmt(d)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Actions */}
            <View style={{ gap: spacing[2] }}>
              <Button
                label={noValidDates ? 'ادامه‌ی دوره‌ی فعال' : 'پایان و شروع دوره‌ی جدید'}
                onPress={() => {
                  if (noValidDates) {
                    onClose();
                  } else {
                    onConfirm(formatDateISO(endDate));
                  }
                }}
                size="md"
                fullWidth
              />

              {!noValidDates && (
                <Button
                  label="فقط پایان دوره‌ی قبل"
                  onPress={() => onEndOnly(formatDateISO(endDate))}
                  variant="outline"
                  size="md"
                  fullWidth
                />
              )}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function LogPeriodScreen() {
  const navigation = useNavigation<Props['navigation']>();
  const { colors, spacing, typography, borderRadius } = useTheme();

  const [startDate, setStartDate] = useState(new Date());
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [medication, setMedication] = useState<string[]>([]);
  const [symptomsText, setSymptomsText] = useState('');
  const [medicationText, setMedicationText] = useState('');

  // Active period conflict state
  const [endPeriodSheet, setEndPeriodSheet] = useState<{
    visible: boolean;
    activePeriodId: number;
    activePeriodStartDate: string;
  }>({ visible: false, activePeriodId: 0, activePeriodStartDate: '' });

  const createMutation = useCreatePeriod();
  const patchMutation = usePatchPeriod();
  const toast = useToast();

  const toggleChip = (list: string[], setList: (v: string[]) => void, val: string) => {
    setList(list.includes(val) ? list.filter(x => x !== val) : [...list, val]);
  };

  const buildField = (chips: string[], text: string) => {
    const extra = text.trim() ? text.split(',').map(s => s.trim()).filter(Boolean) : [];
    const all = [...new Set([...chips, ...extra])];
    return all.length ? all.join(',') : undefined;
  };

  const handleSubmit = () => {
    createMutation.mutate(
      {
        start_date: formatDateISO(startDate),
        symptoms: buildField(symptoms, symptomsText),
        medication: buildField(medication, medicationText),
      },
      {
        onSuccess: () => {
          toast.success('ثبت دوره', 'ثبت چرخه‌ات انجام شد.');
          navigation.goBack();
        },
        onError: (error: any) => {
          const data = error?.response?.data as ActivePeriodError | undefined;
          if (data?.active_period_id) {
            setEndPeriodSheet({
              visible: true,
              activePeriodId: data.active_period_id,
              activePeriodStartDate: data.start_date,
            });
          } else {
            toast.error('ثبت ناموفق بود', data?.error || 'لطفا ورودی‌ها را بررسی کن.');
          }
        },
      },
    );
  };

  const handleEndAndStartNew = (endDate: string) => {
    setEndPeriodSheet(s => ({ ...s, visible: false }));
    patchMutation.mutate(
      { id: endPeriodSheet.activePeriodId, data: { end_date: endDate } },
      {
        onSuccess: () => {
          createMutation.mutate(
            {
              start_date: formatDateISO(startDate),
              symptoms: buildField(symptoms, symptomsText),
              medication: buildField(medication, medicationText),
            },
            {
              onSuccess: () => {
                toast.success('ثبت دوره', 'دوره‌ی قبل پایان یافت و دوره‌ی جدید ثبت شد.');
                navigation.goBack();
              },
              onError: () => toast.error('خطا', 'نمی‌توان دوره‌ی جدید ساخت.'),
            },
          );
        },
        onError: (err: any) => {
          const msg =
            err?.response?.data?.end_date?.[0] ||
            err?.response?.data?.error ||
            'نمی‌توان دوره‌ی فعال را پایان داد.';
          toast.error('خطا', msg);
        },
      },
    );
  };

  const handleEndOnly = (endDate: string) => {
    setEndPeriodSheet(s => ({ ...s, visible: false }));
    patchMutation.mutate(
      { id: endPeriodSheet.activePeriodId, data: { end_date: endDate } },
      {
        onSuccess: () => {
          toast.success('پایان دوره', 'دوره‌ی فعال با موفقیت بسته شد.');
          navigation.goBack();
        },
        onError: (err: any) => {
          const msg =
            err?.response?.data?.end_date?.[0] ||
            err?.response?.data?.error ||
            'نمی‌توان دوره‌ی فعال را پایان داد.';
          toast.error('خطا', msg);
        },
      },
    );
  };

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(today.getDate() - 2);

  const isToday = startDate.toDateString() === today.toDateString();
  const isYesterday = startDate.toDateString() === yesterday.toDateString();
  const isTwoDaysAgo = startDate.toDateString() === twoDaysAgo.toDateString();
  const isCustom = !isToday && !isYesterday && !isTwoDaysAgo;

  const busy = createMutation.isPending || patchMutation.isPending;

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
              تاریخ شروع دوره‌ی قاعدگیت را ثبت کن.
            </Text>
          </View>

          {/* ── 1. Start Date Selector ─────────────────────────────── */}
          <View style={{ marginBottom: spacing[5] }}>
            <Text style={[styles.fieldSectionLabel, { color: colors.textTertiary, fontSize: typography.xs, marginBottom: spacing[2] }]}>
              START DATE
            </Text>

            {/* Quick Relative Pills */}
            <View style={styles.quickDatesRow}>
              <TouchableOpacity
                onPress={() => setStartDate(today)}
                style={[
                  styles.quickDateTab,
                  {
                    backgroundColor: isToday ? colors.menstrual + '18' : colors.surfaceSecondary,
                    borderColor: isToday ? colors.menstrual : colors.border,
                    borderRadius: borderRadius.md,
                    padding: spacing[3],
                  },
                ]}
              >
                <Text style={[styles.quickDateLabel, { color: isToday ? colors.menstrual : colors.textPrimary, fontSize: typography.sm, fontWeight: isToday ? '700' : '500' }]}>
                  امروز
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setStartDate(yesterday)}
                style={[
                  styles.quickDateTab,
                  {
                    backgroundColor: isYesterday ? colors.menstrual + '18' : colors.surfaceSecondary,
                    borderColor: isYesterday ? colors.menstrual : colors.border,
                    borderRadius: borderRadius.md,
                    padding: spacing[3],
                  },
                ]}
              >
                <Text style={[styles.quickDateLabel, { color: isYesterday ? colors.menstrual : colors.textPrimary, fontSize: typography.sm, fontWeight: isYesterday ? '700' : '500' }]}>
                  دیروز
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setStartDate(twoDaysAgo)}
                style={[
                  styles.quickDateTab,
                  {
                    backgroundColor: isTwoDaysAgo ? colors.menstrual + '18' : colors.surfaceSecondary,
                    borderColor: isTwoDaysAgo ? colors.menstrual : colors.border,
                    borderRadius: borderRadius.md,
                    padding: spacing[3],
                  },
                ]}
              >
                <Text style={[styles.quickDateLabel, { color: isTwoDaysAgo ? colors.menstrual : colors.textPrimary, fontSize: typography.sm, fontWeight: isTwoDaysAgo ? '700' : '500' }]}>
                  ۲ روز پیش
                </Text>
              </TouchableOpacity>
            </View>

            {/* Custom Date Trigger Row */}
            <TouchableOpacity
              onPress={() => setShowCustomPicker(true)}
              activeOpacity={0.8}
              style={[
                styles.customDateTrigger,
                {
                  backgroundColor: isCustom ? colors.menstrual + '12' : colors.surfaceSecondary,
                  borderColor: isCustom ? colors.menstrual : colors.border,
                  borderRadius: borderRadius.md,
                  padding: spacing[3],
                  marginTop: spacing[2],
                },
              ]}
            >
              <View style={styles.customDateLeft}>
                <Icon name="calendar-range" size={18} color={isCustom ? colors.menstrual : colors.textSecondary} />
                <Text style={[styles.customDateLabel, { color: isCustom ? colors.menstrual : colors.textPrimary, fontSize: typography.sm, fontWeight: isCustom ? '700' : '500' }]}>
                  {isCustom
                    ? faDate(startDate, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
                    : 'انتخاب تاریخ دیگر…'}
                </Text>
              </View>
              <Icon name="chevron-right" size={18} color={colors.textTertiary} />
            </TouchableOpacity>

            <CustomDatePickerSheet
              visible={showCustomPicker}
              selected={startDate}
              onClose={() => setShowCustomPicker(false)}
              onSelect={setStartDate}
            />
          </View>

          {/* ── 2. Symptoms Selection ─────────────────────────────── */}
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
              placeholder="سایر علائم (مثلا خستگی، تهوع)…"
              placeholderTextColor={colors.textTertiary}
              value={symptomsText}
              onChangeText={setSymptomsText}
              multiline
              numberOfLines={2}
            />
          </View>

          {/* ── 3. Medication Selection ───────────────────────────── */}
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
              placeholder="سایر داروهای مصرف‌شده…"
              placeholderTextColor={colors.textTertiary}
              value={medicationText}
              onChangeText={setMedicationText}
              multiline
              numberOfLines={2}
            />
          </View>

          {/* ── Submit & Cancel Actions ───────────────────────────── */}
          <View style={{ gap: spacing[2] }}>
            <Button
              label={busy ? 'در حال ذخیره…' : 'ذخیره‌ی ثبت دوره'}
              onPress={handleSubmit}
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

      {/* End Period Sheet */}
      <EndPeriodSheet
        visible={endPeriodSheet.visible}
        activePeriodStartDate={endPeriodSheet.activePeriodStartDate}
        onClose={() => setEndPeriodSheet(s => ({ ...s, visible: false }))}
        onConfirm={handleEndAndStartNew}
        onEndOnly={handleEndOnly}
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
  quickDatesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickDateTab: {
    flex: 1,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickDateLabel: {},
  customDateTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  customDateLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customDateLabel: {},
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
  modalSubtitle: {
    fontWeight: '500',
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
  endPeriodSheet: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  endPeriodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  endPeriodNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  endPeriodNoteText: {
    flex: 1,
    lineHeight: 16,
  },
  datePillBtn: {
    flex: 1,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePillText: {
    textAlign: 'center',
  },
});
