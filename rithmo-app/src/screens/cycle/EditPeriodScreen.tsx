import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@hooks/useTheme';
import { screen } from '@theme/spacing';
import { Button, Icon, LoadingState, ErrorState } from '@components/ui';
import { ConfirmSheet } from '@components/ui/ConfirmSheet';
import { PeriodQuickEditSheet } from '@components/cycle/PeriodQuickEditSheet';
import { usePeriod, usePatchPeriod, useDeletePeriod } from '@hooks/queries/usePeriods';
import { useToast } from '../../context/ToastContext';
import {
  buildPeriodPatch,
  describePeriodSpan,
  mapPeriodError,
  periodDraftFromRecord,
  type PeriodErrorInfo,
} from '@utils/periodCalendar';
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

const normalizeList = (v: string | null | undefined) =>
  (v ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
    .join(',');

// ── Main Screen ───────────────────────────────────────────────────────────────
// Dates are corrected in PeriodQuickEditSheet (one place, direct date choice).
// This form keeps what the sheet does not: symptoms, medication and delete.
export default function EditPeriodScreen() {
  const navigation = useNavigation<Props['navigation']>();
  const route = useRoute<Props['route']>();
  const { colors, spacing, typography, borderRadius } = useTheme();
  const { periodId } = route.params;

  const { data: period, isLoading, isError, error, refetch } = usePeriod(periodId);
  const patchMutation = usePatchPeriod();
  const deleteMutation = useDeletePeriod();
  const toast = useToast();

  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [medication, setMedication] = useState<string[]>([]);
  const [symptomsText, setSymptomsText] = useState('');
  const [medicationText, setMedicationText] = useState('');

  const [datesOpen, setDatesOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [saveError, setSaveError] = useState<PeriodErrorInfo | null>(null);
  const pendingNav = useRef<any>(null);
  const allowLeave = useRef(false);

  // Fill the form ONCE per period. Re-filling on every refresh would wipe
  // unsaved symptom edits the moment the dates sheet saves and the record
  // is refetched.
  useEffect(() => {
    if (!period) return;
    const symsFromAPI = period.symptoms
      ? period.symptoms.split(',').map((x: string) => x.trim()).filter(Boolean)
      : [];
    const medsFromAPI = period.medication
      ? period.medication.split(',').map((m: string) => m.trim()).filter(Boolean)
      : [];

    setSymptoms(symsFromAPI.filter((x: string) => COMMON_SYMPTOMS.includes(x)));
    setMedication(medsFromAPI.filter((m: string) => COMMON_MEDS.includes(m)));
    setSymptomsText(symsFromAPI.filter((x: string) => !COMMON_SYMPTOMS.includes(x)).join(', '));
    setMedicationText(medsFromAPI.filter((m: string) => !COMMON_MEDS.includes(m)).join(', '));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period?.id]);

  const toggleChip = (list: string[], setList: (v: string[]) => void, val: string) => {
    setSaveError(null);
    setList(list.includes(val) ? list.filter((x) => x !== val) : [...list, val]);
  };

  const buildField = (chips: string[], text: string) => {
    const extra = text.trim() ? text.split(',').map((x) => x.trim()).filter(Boolean) : [];
    return [...new Set([...chips, ...extra])].join(',');
  };

  const original = useMemo(() => (period ? periodDraftFromRecord(period) : null), [period]);
  // Same items in a different order is not a change.
  const canon = (v: string) => normalizeList(v).split(',').filter(Boolean).sort().join(',');
  const draft = useMemo(() => {
    if (!original) return null;
    const sym = buildField(symptoms, symptomsText);
    const med = buildField(medication, medicationText);
    return {
      ...original,
      symptoms: canon(sym) === canon(original.symptoms) ? original.symptoms : sym,
      medication: canon(med) === canon(original.medication) ? original.medication : med,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [original, symptoms, symptomsText, medication, medicationText]);
  const patch = useMemo(
    () => (original && draft ? buildPeriodPatch(original, draft) : {}),
    [original, draft],
  );
  const dirty = Object.keys(patch).length > 0;
  const busy = patchMutation.isPending || deleteMutation.isPending;

  // Leaving with unsaved symptom/medication edits asks first.
  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e: any) => {
      if (allowLeave.current || !dirty || busy) return;
      e.preventDefault();
      pendingNav.current = e.data.action;
      setConfirmDiscard(true);
    });
    return unsub;
  }, [navigation, dirty, busy]);

  const leave = useCallback(() => {
    allowLeave.current = true;
    navigation.goBack();
  }, [navigation]);

  const handleSave = () => {
    if (!dirty || busy) return;
    setSaveError(null);
    patchMutation.mutate(
      { id: periodId, data: patch },
      {
        onSuccess: () => {
          toast.success('ذخیره شد', 'علائم و داروهای این دوره به‌روز شد.');
          leave();
        },
        onError: (err: any) => setSaveError(mapPeriodError(err)),
      },
    );
  };

  const handleDelete = () => {
    setConfirmDelete(false);
    deleteMutation.mutate(periodId, {
      onSuccess: () => {
        toast.success('دوره حذف شد', 'پیش‌بینی‌ها دوباره بر پایه‌ی دوره‌های باقی‌مانده حساب می‌شوند.');
        leave();
      },
      onError: (err: any) => toast.error('حذف نشد', mapPeriodError(err).message),
    });
  };

  if (isLoading) return <LoadingState fullScreen message="در حال بارگذاری ثبت دوره…" />;
  if (isError) return <ErrorState fullScreen error={error} onRetry={refetch} />;
  if (!period || !original) return null;

  const span = describePeriodSpan({ start: period.start_date, end: period.end_date ?? null });

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
          {/* ── Dates: shown, edited in the quick sheet ─────────────── */}
          <View
            style={[
              styles.dateCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: borderRadius.lg,
                padding: spacing[4],
                marginBottom: spacing[5],
              },
            ]}
          >
            <View style={styles.dateCardLeft}>
              <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: colors.menstrual }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textTertiary, fontSize: typography.xs }}>تاریخ‌های ثبت‌شده</Text>
                <Text
                  style={[styles.dateValueText, { color: colors.textPrimary, fontSize: typography.base }]}
                  accessibilityLabel={`تاریخ‌های ثبت‌شده: ${span}`}
                >
                  {span}
                </Text>
              </View>
            </View>
            <View style={{ marginTop: spacing[3] }}>
              <Button label="ویرایش تاریخ‌ها" onPress={() => setDatesOpen(true)} variant="secondary" size="md" fullWidth />
            </View>
          </View>

          {/* ── Symptoms ────────────────────────────────────────────── */}
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
              {COMMON_SYMPTOMS.map((sym) => {
                const active = symptoms.includes(sym);
                return (
                  <TouchableOpacity
                    key={sym}
                    onPress={() => toggleChip(symptoms, setSymptoms, sym)}
                    activeOpacity={0.75}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: active }}
                    accessibilityLabel={SYMPTOM_LABELS[sym] ?? sym}
                    style={[
                      styles.chipItem,
                      {
                        backgroundColor: active ? colors.menstrual + '18' : colors.surfaceSecondary,
                        borderColor: active ? colors.menstrual : colors.border,
                        borderRadius: borderRadius.pill,
                        paddingHorizontal: spacing[3],
                        paddingVertical: spacing[2],
                        minHeight: 40,
                        justifyContent: 'center',
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
                        },
                      ]}
                    >
                      {SYMPTOM_LABELS[sym] ?? sym}
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
              onChangeText={(t) => {
                setSaveError(null);
                setSymptomsText(t);
              }}
              multiline
              numberOfLines={2}
              accessibilityLabel="سایر علائم"
            />
          </View>

          {/* ── Medication ──────────────────────────────────────────── */}
          <View style={{ marginBottom: spacing[5] }}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.fieldSectionLabel, { color: colors.textTertiary, fontSize: typography.xs }]}>
                دارو
              </Text>
              <Text style={[styles.optionalTag, { color: colors.textTertiary, fontSize: typography.xs }]}>
                اختیاری
              </Text>
            </View>

            <View style={styles.chipsWrap}>
              {COMMON_MEDS.map((med) => {
                const active = medication.includes(med);
                return (
                  <TouchableOpacity
                    key={med}
                    onPress={() => toggleChip(medication, setMedication, med)}
                    activeOpacity={0.75}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: active }}
                    accessibilityLabel={MED_LABELS[med] ?? med}
                    style={[
                      styles.chipItem,
                      {
                        backgroundColor: active ? colors.primary + '18' : colors.surfaceSecondary,
                        borderColor: active ? colors.primary : colors.border,
                        borderRadius: borderRadius.pill,
                        paddingHorizontal: spacing[3],
                        paddingVertical: spacing[2],
                        minHeight: 40,
                        justifyContent: 'center',
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
                        },
                      ]}
                    >
                      {MED_LABELS[med] ?? med}
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
              onChangeText={(t) => {
                setSaveError(null);
                setMedicationText(t);
              }}
              multiline
              numberOfLines={2}
              accessibilityLabel="سایر داروها"
            />
          </View>

          {saveError ? (
            <View
              accessibilityLiveRegion="polite"
              style={{
                backgroundColor: colors.errorBg,
                borderRadius: borderRadius.md,
                padding: spacing[3],
                marginBottom: spacing[3],
              }}
            >
              <Text style={{ color: colors.error, fontSize: typography.sm, lineHeight: 22 }}>{saveError.message}</Text>
            </View>
          ) : null}

          {/* ── Actions ─────────────────────────────────────────────── */}
          <View style={{ gap: spacing[2] }}>
            <Button
              label={patchMutation.isPending ? 'در حال ذخیره…' : saveError?.retryable ? 'تلاش دوباره' : 'ذخیره علائم و داروها'}
              onPress={handleSave}
              disabled={!dirty || busy}
              loading={patchMutation.isPending}
              size="lg"
              fullWidth
            />
            <Button label="بازگشت" onPress={() => navigation.goBack()} variant="ghost" size="md" fullWidth />
          </View>

          {/* Deliberately last, quiet, and separate from the date correction above */}
          <View style={[styles.deleteZone, { borderTopColor: colors.border, marginTop: spacing[6], paddingTop: spacing[4] }]}>
            <Text style={{ color: colors.textSecondary, fontSize: typography.sm, lineHeight: 22 }}>
              این دوره را اشتباهی ثبت کرده‌ای؟ اگر فقط تاریخش غلط است، بالا «ویرایش تاریخ‌ها» را بزن. حذف، کل این دوره را از تاریخچه‌ات برمی‌دارد.
            </Text>
            <TouchableOpacity
              onPress={() => setConfirmDelete(true)}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="حذف این دوره"
              style={styles.deleteBtn}
            >
              <Icon name="trash-can-outline" size={18} color={colors.error} />
              <Text style={{ color: colors.error, fontSize: typography.sm, fontWeight: '700' }}>حذف این دوره</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <PeriodQuickEditSheet visible={datesOpen} period={period} onClose={() => setDatesOpen(false)} />

      <ConfirmSheet
        visible={confirmDelete}
        variant="danger"
        title="این دوره حذف شود؟"
        message={`دوره‌ی ${span} از تاریخچه‌ات پاک می‌شود و برنگشتنی است. پیش‌بینی‌ها بر پایه‌ی بقیه‌ی دوره‌هایت دوباره حساب می‌شوند.`}
        confirmLabel="حذف دوره"
        cancelLabel="نگه‌دار"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />

      <ConfirmSheet
        visible={confirmDiscard}
        variant="warning"
        title="تغییرات ذخیره نشده‌اند"
        message="اگر بیرون بروی، تغییرات علائم و داروها از بین می‌رود."
        confirmLabel="بیرون برو"
        cancelLabel="ادامه‌ی ویرایش"
        onConfirm={() => {
          setConfirmDiscard(false);
          allowLeave.current = true;
          if (pendingNav.current) navigation.dispatch(pendingNav.current);
        }}
        onCancel={() => setConfirmDiscard(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerTitle: {
    fontWeight: '700',
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
  deleteZone: {
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
  },
});
