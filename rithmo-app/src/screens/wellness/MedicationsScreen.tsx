/**
 * MedicationsScreen — داروها و مکمل‌ها
 *
 * Rhythmo Design System Redesign.
 * A calm, ritual-based medication and supplement tracker.
 * Preserves all underlying OpenFDA search, validation, intake logging (1–5),
 * and mutation hooks.
 */
import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@hooks/useTheme';
import { Card, Badge, Button } from '@components/ui';
import {
  useUserMedications,
  useMedicationLogs,
  useMedicationReminders,
  useDeleteUserMedication,
  useCreateMedicationLog,
  useCreateUserMedication,
  useMedicationDrugSearch,
} from '@hooks/queries/useMedications';
import type { UserMedication, MedicationDrug } from '@types/medication.types';

// ── Helpers & Options ─────────────────────────────────────────────────────────

const FREQUENCY_OPTIONS = [
  { value: 'as_needed', label: 'در صورت نیاز' },
  { value: 'daily', label: 'روزانه' },
  { value: 'twice_daily', label: 'دو بار در روز' },
  { value: 'three_times_daily', label: 'سه بار در روز' },
  { value: 'weekly', label: 'هفتگی' },
];

const UNIT_OPTIONS = [
  { value: 'tablet', label: 'قرص' },
  { value: 'capsule', label: 'کپسول' },
  { value: 'mg', label: 'میلی‌گرم' },
  { value: 'ml', label: 'میلی‌لیتر' },
  { value: 'drop', label: 'قطره' },
  { value: 'unit', label: 'واحد' },
];

function validateDosage(dosage: string): string {
  const trimmed = dosage.trim();
  if (!trimmed) {
    return 'دوز دارو الزامی است.';
  }
  return '';
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Add Medication Modal ──────────────────────────────────────────────────────

type AddStep = 'search' | 'configure';

interface AddModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function AddMedicationModal({ visible, onClose, onSuccess }: AddModalProps) {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const [step, setStep] = useState<AddStep>('search');
  const [query, setQuery] = useState('');
  const [selectedDrug, setSelectedDrug] = useState<MedicationDrug | null>(null);

  const [customName, setCustomName] = useState('');
  const [dosage, setDosage] = useState('');
  const [unit, setUnit] = useState('tablet');
  const [frequency, setFrequency] = useState('as_needed');
  const [startDate, setStartDate] = useState(todayDateString());
  const [reason, setReason] = useState('');
  const [dosageError, setDosageError] = useState('');

  const { data: searchResults, isFetching: searching } = useMedicationDrugSearch(query);
  const { mutateAsync: createMedication, isPending: submitting } = useCreateUserMedication();

  const reset = useCallback(() => {
    setStep('search');
    setQuery('');
    setSelectedDrug(null);
    setCustomName('');
    setDosage('');
    setUnit('tablet');
    setFrequency('as_needed');
    setStartDate(todayDateString());
    setReason('');
    setDosageError('');
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleSelectDrug = useCallback((drug: MedicationDrug) => {
    setSelectedDrug(drug);
    setStep('configure');
    if (drug.common_dosages?.length) {
      setDosage(String(drug.common_dosages[0]));
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    const err = validateDosage(dosage);
    if (err) {
      setDosageError(err);
      return;
    }
    setDosageError('');
    if (!selectedDrug) {return;}
    try {
      await createMedication({
        medication: selectedDrug.id,
        custom_name: customName.trim() || undefined,
        dosage: dosage.trim(),
        unit,
        frequency,
        start_date: startDate,
        reason: reason.trim() || undefined,
        is_active: true,
      } as any);
      reset();
      onSuccess();
    } catch (err: any) {
      const msg =
        err?.response?.data?.non_field_errors?.[0] ||
        err?.response?.data?.detail ||
        'خطا در افزودن دارو. لطفا مجددا تلاش کنید.';
      Alert.alert('خطا', msg);
    }
  }, [selectedDrug, customName, dosage, unit, frequency, startDate, reason, createMedication, reset, onSuccess]);

  const results: MedicationDrug[] = useMemo(() => searchResults ?? [], [searchResults]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={[styles.modalSheet, { backgroundColor: colors.background, borderRadius: borderRadius.xl }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border, padding: spacing[4] }]}>
              {step === 'configure' ? (
                <TouchableOpacity onPress={() => setStep('search')} accessibilityLabel="بازگشت">
                  <Icon name="arrow-right" size={22} color={colors.textPrimary} />
                </TouchableOpacity>
              ) : (
                <View style={{ width: 22 }} />
              )}
              <Text style={{ color: colors.textPrimary, fontSize: typography.base, fontWeight: '700' }}>
                {step === 'search' ? 'جستجوی داروها و مکمل‌ها' : 'تنظیم مشخصات دارو'}
              </Text>
              <TouchableOpacity onPress={handleClose} accessibilityLabel="بستن">
                <Icon name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Step 1: Search */}
            {step === 'search' && (
              <View style={{ flex: 1 }}>
                <View style={{ padding: spacing[4] }}>
                  <View
                    style={[
                      styles.searchRow,
                      {
                        backgroundColor: colors.surfaceSecondary,
                        borderColor: colors.border,
                        borderRadius: borderRadius.md,
                        paddingHorizontal: spacing[3],
                        paddingVertical: spacing[2],
                      },
                    ]}
                  >
                    <Icon name="magnify" size={20} color={colors.textTertiary} />
                    <TextInput
                      value={query}
                      onChangeText={setQuery}
                      placeholder="نام دارو یا مکمل را وارد کنید..."
                      placeholderTextColor={colors.textTertiary}
                      style={{
                        flex: 1,
                        color: colors.textPrimary,
                        fontSize: typography.sm,
                        marginHorizontal: spacing[2],
                      }}
                      autoFocus
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    {searching && <ActivityIndicator size="small" color={colors.primary} />}
                    {!!query && !searching && (
                      <TouchableOpacity onPress={() => setQuery('')}>
                        <Icon name="close-circle" size={18} color={colors.textTertiary} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {results.length > 0 ? (
                  <FlatList
                    data={results}
                    keyExtractor={(item) => String(item.id)}
                    contentContainerStyle={{ paddingHorizontal: spacing[4], paddingBottom: spacing[6] }}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        onPress={() => handleSelectDrug(item)}
                        activeOpacity={0.75}
                        style={[
                          styles.drugRow,
                          {
                            backgroundColor: colors.surface,
                            borderColor: colors.border,
                            borderRadius: borderRadius.md,
                            padding: spacing[3],
                            marginBottom: spacing[2],
                          },
                        ]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: colors.textPrimary, fontSize: typography.sm, fontWeight: '700' }}>
                            {item.name}
                          </Text>
                          {!!item.generic_name && (
                            <Text style={{ color: colors.textSecondary, fontSize: typography.xs, marginTop: 2 }}>
                              {item.generic_name}
                            </Text>
                          )}
                        </View>
                        <Icon name="chevron-left" size={20} color={colors.textTertiary} />
                      </TouchableOpacity>
                    )}
                    keyboardShouldPersistTaps="handled"
                  />
                ) : query.trim().length > 1 && !searching ? (
                  <View style={{ alignItems: 'center', paddingTop: spacing[8], paddingHorizontal: spacing[6] }}>
                    <Text style={{ color: colors.textSecondary, fontSize: typography.sm, textAlign: 'center' }}>
                      دارویی با نام «{query}» یافت نشد.
                    </Text>
                  </View>
                ) : query.trim().length === 0 ? (
                  <View style={{ alignItems: 'center', paddingTop: spacing[8] }}>
                    <Icon name="pill" size={40} color={colors.textTertiary} />
                    <Text style={{ color: colors.textSecondary, fontSize: typography.sm, marginTop: spacing[2] }}>
                      نام داروی مورد نظرتان را جستجو کنید
                    </Text>
                  </View>
                ) : null}
              </View>
            )}

            {/* Step 2: Configure */}
            {step === 'configure' && selectedDrug && (
              <ScrollView
                contentContainerStyle={{ padding: spacing[4], paddingBottom: spacing[10] }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <View
                  style={[
                    styles.selectedPill,
                    {
                      backgroundColor: colors.primary + '18',
                      borderColor: colors.primary,
                      borderRadius: borderRadius.md,
                      padding: spacing[3],
                      marginBottom: spacing[3],
                    },
                  ]}
                >
                  <Icon name="pill" size={18} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontSize: typography.sm, fontWeight: '700', marginLeft: spacing[2] }}>
                    {selectedDrug.name}
                    {selectedDrug.generic_name ? ` (${selectedDrug.generic_name})` : ''}
                  </Text>
                </View>

                {/* Custom name */}
                <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontSize: typography.xs, marginBottom: spacing[1] }]}>
                  نام دلخواه (اختیاری)
                </Text>
                <TextInput
                  value={customName}
                  onChangeText={setCustomName}
                  placeholder={selectedDrug.name}
                  placeholderTextColor={colors.textTertiary}
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: colors.surfaceSecondary,
                      borderColor: colors.border,
                      borderRadius: borderRadius.md,
                      color: colors.textPrimary,
                      padding: spacing[3],
                      marginBottom: spacing[3],
                    },
                  ]}
                />

                {/* Dosage */}
                <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontSize: typography.xs, marginBottom: spacing[1] }]}>
                  دوز مصرفی *
                </Text>
                <TextInput
                  value={dosage}
                  onChangeText={(t) => {
                    setDosage(t);
                    if (dosageError) {setDosageError(validateDosage(t));}
                  }}
                  onBlur={() => setDosageError(validateDosage(dosage))}
                  placeholder="مثلا 500 یا 1 قرص"
                  placeholderTextColor={colors.textTertiary}
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: colors.surfaceSecondary,
                      borderColor: dosageError ? colors.menstrual : colors.border,
                      borderRadius: borderRadius.md,
                      color: colors.textPrimary,
                      padding: spacing[3],
                      marginBottom: dosageError ? spacing[1] : spacing[3],
                    },
                  ]}
                />
                {!!dosageError && (
                  <Text style={{ color: colors.menstrual, fontSize: typography.xs, marginBottom: spacing[2] }}>
                    {dosageError}
                  </Text>
                )}

                {/* Unit */}
                <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontSize: typography.xs, marginBottom: spacing[2] }]}>
                  واحد
                </Text>
                <View style={[styles.chipsRow, { gap: spacing[2], marginBottom: spacing[3] }]}>
                  {UNIT_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => setUnit(opt.value)}
                      style={[
                        styles.chipOption,
                        {
                          borderRadius: borderRadius.pill,
                          backgroundColor: unit === opt.value ? colors.primary + '18' : colors.surfaceSecondary,
                          borderColor: unit === opt.value ? colors.primary : colors.border,
                          borderWidth: 1,
                          paddingHorizontal: spacing[3],
                          paddingVertical: spacing[1],
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: unit === opt.value ? colors.primary : colors.textSecondary,
                          fontSize: typography.xs,
                          fontWeight: unit === opt.value ? '700' : '500',
                        }}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Frequency */}
                <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontSize: typography.xs, marginBottom: spacing[2] }]}>
                  تکرار مصرف
                </Text>
                <View style={[styles.chipsRow, { gap: spacing[2], marginBottom: spacing[3] }]}>
                  {FREQUENCY_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => setFrequency(opt.value)}
                      style={[
                        styles.chipOption,
                        {
                          borderRadius: borderRadius.pill,
                          backgroundColor: frequency === opt.value ? colors.primary + '18' : colors.surfaceSecondary,
                          borderColor: frequency === opt.value ? colors.primary : colors.border,
                          borderWidth: 1,
                          paddingHorizontal: spacing[3],
                          paddingVertical: spacing[1],
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: frequency === opt.value ? colors.primary : colors.textSecondary,
                          fontSize: typography.xs,
                          fontWeight: frequency === opt.value ? '700' : '500',
                        }}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Reason */}
                <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontSize: typography.xs, marginBottom: spacing[1] }]}>
                  علت مصرف (اختیاری)
                </Text>
                <TextInput
                  value={reason}
                  onChangeText={setReason}
                  placeholder="مثلا تسکین درد، مکمل روزانه"
                  placeholderTextColor={colors.textTertiary}
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: colors.surfaceSecondary,
                      borderColor: colors.border,
                      borderRadius: borderRadius.md,
                      color: colors.textPrimary,
                      padding: spacing[3],
                      marginBottom: spacing[4],
                    },
                  ]}
                />

                <Button
                  label={submitting ? 'در حال افزودن...' : 'افزودن دارو به فهرست'}
                  onPress={handleSubmit}
                  loading={submitting}
                  disabled={submitting}
                  size="lg"
                  fullWidth
                />
              </ScrollView>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Log Effectiveness Modal ───────────────────────────────────────────────────

interface LogModalProps {
  target: UserMedication | null;
  onClose: () => void;
  onSubmit: (score: number) => void;
  loading: boolean;
}

function LogEffectivenessModal({ target, onClose, onSubmit, loading }: LogModalProps) {
  const { colors, spacing, typography, borderRadius } = useTheme();

  return (
    <Modal visible={target !== null} animationType="fade" transparent onRequestClose={onClose}>
      <View style={[styles.modalOverlay, { padding: spacing[4] }]}>
        <View style={[styles.alertModalCard, { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing[4] }]}>
          <Text style={{ color: colors.textPrimary, fontSize: typography.base, fontWeight: '700', marginBottom: spacing[1] }}>
            ثبت مصرف و میزان اثربخشی
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: typography.sm, marginBottom: spacing[4] }}>
            {target?.custom_name || (target as any)?.medication_name} · {target?.dosage}
          </Text>

          <Text style={{ color: colors.textSecondary, fontSize: typography.xs, marginBottom: spacing[2], fontWeight: '600' }}>
            میزان اثربخشی (۱ کمترین تا ۵ بیشترین):
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing[2], marginBottom: spacing[4] }}>
            {[1, 2, 3, 4, 5].map((score) => (
              <TouchableOpacity
                key={score}
                onPress={() => onSubmit(score)}
                disabled={loading}
                style={[
                  styles.scoreBtn,
                  {
                    backgroundColor: colors.primary + '18',
                    borderColor: colors.primary,
                    borderRadius: borderRadius.md,
                    paddingVertical: spacing[2],
                    opacity: loading ? 0.6 : 1,
                  },
                ]}
                accessibilityLabel={`اثربخشی ${score} از ۵`}
              >
                <Text style={{ color: colors.primary, fontWeight: '800', fontSize: typography.base }}>
                  {score}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Button label="انصراف" variant="ghost" onPress={onClose} fullWidth />
        </View>
      </View>
    </Modal>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function MedicationsScreen() {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [logTarget, setLogTarget] = useState<UserMedication | null>(null);

  const { data: medications, isLoading: medLoading, refetch: refetchMeds } = useUserMedications();
  const { data: logs, isLoading: logsLoading } = useMedicationLogs();
  const { data: reminders } = useMedicationReminders();
  const { mutateAsync: deleteMed, isPending: deleting } = useDeleteUserMedication();
  const { mutateAsync: createLog, isPending: logging } = useCreateMedicationLog();

  const activeMeds = useMemo(() => (medications ?? []).filter((m) => m.is_active), [medications]);
  const inactiveMeds = useMemo(() => (medications ?? []).filter((m) => !m.is_active), [medications]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchMeds();
    setRefreshing(false);
  }, [refetchMeds]);

  const handleDelete = useCallback((id: number, name: string) => {
    Alert.alert(
      'حذف دارو',
      `آیا از حذف «${name}» اطمینان داری؟`,
      [
        { text: 'انصراف', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMed(id);
            } catch {
              Alert.alert('خطا', 'خطا در حذف دارو.');
            }
          },
        },
      ],
    );
  }, [deleteMed]);

  const submitLog = useCallback(async (score: number) => {
    if (!logTarget) {return;}
    try {
      await createLog({
        user_medication: logTarget.id,
        date_taken: new Date().toISOString(),
        dosage_taken: logTarget.dosage,
        effectiveness: score,
        side_effects_experienced: '',
        notes: '',
      });
      setLogTarget(null);
    } catch {
      Alert.alert('خطا', 'خطا در ثبت مصرف دارو.');
    }
  }, [logTarget, createLog]);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing[4], paddingBottom: spacing[12] }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Header */}
        <View style={[styles.headerRow, { paddingTop: spacing[2], marginBottom: spacing[4] }]}>
          <View>
            <Text style={[styles.overline, { color: colors.textTertiary, fontSize: typography.xs }]}>
              ریتمو · سلامت و داروها
            </Text>
            <Text style={[styles.screenTitle, { color: colors.textPrimary, fontSize: typography['2xl'] }]}>
              داروها و مکمل‌ها
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: typography.sm }]}>
              {activeMeds.length} داروی فعال
            </Text>
          </View>
          <Button
            label="افزودن دارو"
            size="sm"
            variant="primary"
            onPress={() => setShowAddModal(true)}
            icon={<Icon name="plus" size={16} color="#fff" />}
          />
        </View>

        {/* Section 1: Active Medications */}
        <Text style={[styles.sectionHeading, { color: colors.textPrimary, fontSize: typography.sm, marginBottom: spacing[2] }]}>
          داروهای فعال
        </Text>
        {medLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing[4] }} />
        ) : activeMeds.length === 0 ? (
          <Card elevated={false} style={{ padding: spacing[6], alignItems: 'center', marginBottom: spacing[4] }}>
            <Icon name="pill-off" size={32} color={colors.textTertiary} />
            <Text style={{ color: colors.textSecondary, fontSize: typography.sm, marginTop: spacing[2], textAlign: 'center' }}>
              هنوز دارویی ثبت نشده است.{'\n'}برای افزودن، دکمه افزودن دارو را بزنید.
            </Text>
          </Card>
        ) : (
          activeMeds.map((med) => {
            const medName = med.custom_name || (med as any).medication_name || 'دارو';
            return (
              <Card key={med.id} elevated={false} style={{ marginBottom: spacing[3], padding: spacing[4] }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing[2] }}>
                  <View style={{ flex: 1, paddingRight: spacing[2] }}>
                    <Text style={{ color: colors.textPrimary, fontSize: typography.base, fontWeight: '700' }}>
                      {medName}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: typography.xs, marginTop: 2 }}>
                      {med.dosage} · {med.frequency}
                    </Text>
                    {!!(med as any).reason && (
                      <Text style={{ color: colors.textTertiary, fontSize: typography.xs, marginTop: 2 }}>
                        {(med as any).reason}
                      </Text>
                    )}
                  </View>
                  <Badge label="فعال" variant="success" />
                </View>

                {/* Interaction warning */}
                {(med as any).potential_interactions?.length > 0 && (
                  <View
                    style={{
                      backgroundColor: colors.menstrual + '18',
                      borderRadius: borderRadius.sm,
                      padding: spacing[2],
                      marginBottom: spacing[2],
                    }}
                  >
                    <Text style={{ color: colors.menstrual, fontSize: typography.xs, fontWeight: '700' }}>
                      ⚠ احتمال تداخل دارویی با {(med as any).potential_interactions[0].with_medication}
                    </Text>
                  </View>
                )}

                <View style={{ flexDirection: 'row', gap: spacing[2], marginTop: spacing[2] }}>
                  <Button
                    label={logging && logTarget?.id === med.id ? 'در حال ثبت...' : 'ثبت مصرف امروز'}
                    variant="secondary"
                    size="sm"
                    onPress={() => setLogTarget(med)}
                    style={{ flex: 1 }}
                  />
                  <Button
                    label="حذف"
                    variant="ghost"
                    size="sm"
                    onPress={() => handleDelete(med.id, medName)}
                    disabled={deleting}
                  />
                </View>
              </Card>
            );
          })
        )}

        {/* Section 2: Recent Intake Logs */}
        <Text style={[styles.sectionHeading, { color: colors.textPrimary, fontSize: typography.sm, marginTop: spacing[4], marginBottom: spacing[2] }]}>
          آخرین مصرف‌های ثبت‌شده
        </Text>
        {logsLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing[3] }} />
        ) : (logs ?? []).length === 0 ? (
          <Card elevated={false} style={{ padding: spacing[3], alignItems: 'center', marginBottom: spacing[3] }}>
            <Text style={{ color: colors.textSecondary, fontSize: typography.xs }}>
              هنوز مصرف دارویی ثبت نشده است.
            </Text>
          </Card>
        ) : (
          (logs ?? []).slice(0, 4).map((log) => (
            <Card key={log.id} elevated={false} style={{ marginBottom: spacing[2], padding: spacing[3] }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ color: colors.textPrimary, fontSize: typography.sm, fontWeight: '600' }}>
                    {new Date(log.date_taken).toLocaleDateString('fa-IR')}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: typography.xs, marginTop: 2 }}>
                    دوز: {log.dosage_taken}
                  </Text>
                </View>
                {log.effectiveness && (
                  <Badge label={`اثربخشی: ${log.effectiveness}/5`} variant="neutral" />
                )}
              </View>
            </Card>
          ))
        )}

        {/* Section 3: Reminders */}
        <Text style={[styles.sectionHeading, { color: colors.textPrimary, fontSize: typography.sm, marginTop: spacing[4], marginBottom: spacing[2] }]}>
          یادآورهای فعال
        </Text>
        {(reminders ?? []).length === 0 ? (
          <Card elevated={false} style={{ padding: spacing[3], alignItems: 'center', marginBottom: spacing[3] }}>
            <Text style={{ color: colors.textSecondary, fontSize: typography.xs }}>
              یادآوری تنظیم نشده است.
            </Text>
          </Card>
        ) : (
          (reminders ?? []).map((r) => (
            <Card key={r.id} elevated={false} style={{ marginBottom: spacing[2], padding: spacing[3] }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={{ color: colors.textPrimary, fontSize: typography.sm, fontWeight: '600' }}>
                    ساعت {r.reminder_time}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: typography.xs, marginTop: 2 }}>
                    {r.days_of_week.length} روز در هفته
                  </Text>
                </View>
                <Badge label={r.is_active ? 'فعال' : 'غیرفعال'} variant={r.is_active ? 'success' : 'neutral'} />
              </View>
            </Card>
          ))
        )}

        {/* Section 4: Inactive medications */}
        {inactiveMeds.length > 0 && (
          <>
            <Text style={[styles.sectionHeading, { color: colors.textPrimary, fontSize: typography.sm, marginTop: spacing[4], marginBottom: spacing[2] }]}>
              داروهای غیرفعال
            </Text>
            {inactiveMeds.map((med) => {
              const medName = med.custom_name || (med as any).medication_name || 'دارو';
              return (
                <Card key={med.id} elevated={false} style={{ marginBottom: spacing[2], padding: spacing[3], opacity: 0.6 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: colors.textPrimary, fontSize: typography.sm, fontWeight: '600' }}>
                      {medName}
                    </Text>
                    <Button
                      label="حذف"
                      variant="ghost"
                      size="sm"
                      onPress={() => handleDelete(med.id, medName)}
                      disabled={deleting}
                    />
                  </View>
                </Card>
              );
            })}
          </>
        )}
      </ScrollView>

      {/* Modals */}
      <AddMedicationModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          setShowAddModal(false);
          Alert.alert('ثبت شد', 'دارو با موفقیت اضافه شد.');
        }}
      />

      <LogEffectivenessModal
        target={logTarget}
        onClose={() => setLogTarget(null)}
        onSubmit={submitLog}
        loading={logging}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  overline: {
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  screenTitle: {
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontWeight: '500',
    marginTop: 2,
  },
  sectionHeading: {
    fontWeight: '700',
  },
  modalSheet: {
    flex: 1,
    marginTop: 80,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  drugRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  selectedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  fieldLabel: {
    fontWeight: '700',
  },
  textInput: {
    borderWidth: 1,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chipOption: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
  },
  alertModalCard: {},
  scoreBtn: {
    flex: 1,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
