/**
 * MedicationsScreen
 *
 * Fully migrated onto the useMedications hook layer — no bare useQuery/
 * useMutation calls remain. The "Coming soon" Add Medication stub has been
 * replaced with a real 3-step modal:
 *   1. Search the catalog (GET /api/medications/drugs/search/)
 *   2. Configure (custom name, dosage, unit, frequency, start date, reason)
 *   3. POST /api/medications/my-medications/
 *
 * Client-side dosage validation mirrors the backend's number+unit pattern
 * for immediate feedback instead of a round-trip 400.
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
import { useTheme } from '@hooks/useTheme';
import { Card, Badge, Button } from '@components/ui';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
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

// ── helpers ───────────────────────────────────────────────────────────────────

const FREQUENCY_OPTIONS = [
  { value: 'as_needed',          label: 'As Needed'          },
  { value: 'daily',              label: 'Daily'              },
  { value: 'twice_daily',        label: 'Twice Daily'        },
  { value: 'three_times_daily',  label: 'Three Times Daily'  },
  { value: 'weekly',             label: 'Weekly'             },
];

const UNIT_OPTIONS = [
  { value: 'tablet',  label: 'Tablet'  },
  { value: 'capsule', label: 'Capsule' },
  { value: 'mg',      label: 'mg'      },
  { value: 'ml',      label: 'ml'      },
  { value: 'drop',    label: 'Drop'    },
  { value: 'unit',    label: 'Unit'    },
];

/** Returns an error string or '' when the dosage is valid. */
function validateDosage(dosage: string): string {
  const trimmed = dosage.trim();
  if (!trimmed) { return 'Dosage is required.'; }
  // Accept formats like "500", "500mg", "10 ml", "2 tablets", "0.5"
  if (!/^\d+(\.\d+)?(\s?[a-zA-Z]+)?$/.test(trimmed)) {
    return 'Enter a number, optionally followed by a unit (e.g. 500mg, 10 ml).';
  }
  return '';
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Add Medication modal (3-step) ─────────────────────────────────────────────

type AddStep = 'search' | 'configure';

interface AddModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function AddMedicationModal({ visible, onClose, onSuccess }: AddModalProps) {
  const { colors, spacing, typography } = useTheme();
  const [step, setStep]               = useState<AddStep>('search');
  const [query, setQuery]             = useState('');
  const [selectedDrug, setSelectedDrug] = useState<MedicationDrug | null>(null);

  // Configure step state
  const [customName, setCustomName]   = useState('');
  const [dosage, setDosage]           = useState('');
  const [unit, setUnit]               = useState('tablet');
  const [frequency, setFrequency]     = useState('as_needed');
  const [startDate, setStartDate]     = useState(todayDateString());
  const [reason, setReason]           = useState('');
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
    // Pre-fill dosage hint from the drug catalog if available
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
    if (!selectedDrug) { return; }
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
        'Failed to add medication. Please try again.';
      Alert.alert('Error', msg);
    }
  }, [selectedDrug, customName, dosage, unit, frequency, startDate, reason, createMedication, reset, onSuccess]);

  const results: MedicationDrug[] = useMemo(() => searchResults ?? [], [searchResults]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View style={[styles.modalSheet, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              {step === 'configure' ? (
                <TouchableOpacity onPress={() => setStep('search')} accessibilityLabel="Back">
                  <Icon name="arrow-left" size={22} color={colors.textPrimary} />
                </TouchableOpacity>
              ) : (
                <View style={{ width: 22 }} />
              )}
              <Text style={{ color: colors.textPrimary, fontSize: typography.lg, fontWeight: '700' }}>
                {step === 'search' ? 'Search Medications' : 'Configure Medication'}
              </Text>
              <TouchableOpacity onPress={handleClose} accessibilityLabel="Close">
                <Icon name="close" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {/* ── Step 1: Search ──────────────────────────────────────── */}
            {step === 'search' && (
              <View style={{ flex: 1 }}>
                {/* Search input */}
                <View style={{ padding: spacing[4] }}>
                  <View style={[styles.searchRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Icon name="magnify" size={20} color={colors.textDisabled} />
                    <TextInput
                      value={query}
                      onChangeText={setQuery}
                      placeholder="Type a medication name…"
                      placeholderTextColor={colors.textDisabled}
                      style={{ flex: 1, color: colors.textPrimary, fontSize: typography.base, marginLeft: spacing[2] }}
                      autoFocus
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    {searching && <ActivityIndicator size="small" color={colors.primary} />}
                    {!!query && !searching && (
                      <TouchableOpacity onPress={() => setQuery('')}>
                        <Icon name="close-circle" size={18} color={colors.textDisabled} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* Results */}
                {results.length > 0 ? (
                  <FlatList
                    data={results}
                    keyExtractor={(item) => String(item.id)}
                    contentContainerStyle={{ paddingHorizontal: spacing[4], paddingBottom: spacing[6] }}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        onPress={() => handleSelectDrug(item)}
                        activeOpacity={0.75}
                        style={[styles.drugRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
                        accessibilityRole="button"
                        accessibilityLabel={`Select ${item.name}`}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: colors.textPrimary, fontSize: typography.base, fontWeight: '600' }}>
                            {item.name}
                          </Text>
                          {!!item.generic_name && (
                            <Text style={{ color: colors.textSecondary, fontSize: typography.sm, marginTop: 2 }}>
                              {item.generic_name}
                            </Text>
                          )}
                          {!item.is_active && (
                            <Text style={{ color: colors.warning, fontSize: typography.xs, marginTop: 2 }}>
                              Pending review
                            </Text>
                          )}
                        </View>
                        <Icon name="chevron-right" size={20} color={colors.textDisabled} />
                      </TouchableOpacity>
                    )}
                    keyboardShouldPersistTaps="handled"
                  />
                ) : query.trim().length > 1 && !searching ? (
                  <View style={{ alignItems: 'center', paddingTop: spacing[8] }}>
                    <Text style={{ color: colors.textSecondary, fontSize: typography.sm, textAlign: 'center', paddingHorizontal: spacing[6] }}>
                      No results for "{query}". Try a different name, generic drug name, or brand.
                    </Text>
                  </View>
                ) : query.trim().length === 0 ? (
                  <View style={{ alignItems: 'center', paddingTop: spacing[10] }}>
                    <Icon name="pill" size={48} color={colors.textDisabled} />
                    <Text style={{ color: colors.textSecondary, fontSize: typography.sm, marginTop: spacing[3], textAlign: 'center' }}>
                      Search the medication catalog or enter a custom name
                    </Text>
                  </View>
                ) : null}
              </View>
            )}

            {/* ── Step 2: Configure ───────────────────────────────────── */}
            {step === 'configure' && selectedDrug && (
              <ScrollView
                contentContainerStyle={{ padding: spacing[4], paddingBottom: spacing[10] }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Selected drug pill */}
                <View style={[styles.selectedPill, { backgroundColor: colors.primaryLighter, borderColor: colors.primary + '40' }]}>
                  <Icon name="pill" size={16} color={colors.primary} />
                  <Text style={{ color: colors.primary, fontSize: typography.sm, fontWeight: '700', marginLeft: spacing[2] }}>
                    {selectedDrug.name}
                    {selectedDrug.generic_name ? ` · ${selectedDrug.generic_name}` : ''}
                  </Text>
                </View>

                {/* Custom name */}
                <FieldLabel label="Custom name (optional)" />
                <TextInput
                  value={customName}
                  onChangeText={setCustomName}
                  placeholder={selectedDrug.name}
                  placeholderTextColor={colors.textDisabled}
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                />

                {/* Dosage */}
                <FieldLabel label="Dosage *" />
                <TextInput
                  value={dosage}
                  onChangeText={(t) => { setDosage(t); if (dosageError) { setDosageError(validateDosage(t)); } }}
                  onBlur={() => setDosageError(validateDosage(dosage))}
                  placeholder="e.g. 500mg, 10 ml, 2 tablets"
                  placeholderTextColor={colors.textDisabled}
                  keyboardType="default"
                  style={[
                    styles.input,
                    { backgroundColor: colors.surface, borderColor: dosageError ? colors.error : colors.border, color: colors.textPrimary },
                  ]}
                />
                {!!dosageError && (
                  <Text style={{ color: colors.error, fontSize: typography.xs, marginTop: spacing[1], marginBottom: spacing[2] }}>
                    {dosageError}
                  </Text>
                )}

                {/* Unit */}
                <FieldLabel label="Unit" />
                <ChipRow
                  options={UNIT_OPTIONS}
                  selected={unit}
                  onSelect={setUnit}
                  colors={colors}
                  spacing={spacing}
                  typography={typography}
                />

                {/* Frequency */}
                <FieldLabel label="Frequency" />
                <ChipRow
                  options={FREQUENCY_OPTIONS}
                  selected={frequency}
                  onSelect={setFrequency}
                  colors={colors}
                  spacing={spacing}
                  typography={typography}
                />

                {/* Start date */}
                <FieldLabel label="Start date" />
                <TextInput
                  value={startDate}
                  onChangeText={setStartDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.textDisabled}
                  keyboardType="numbers-and-punctuation"
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                />

                {/* Reason */}
                <FieldLabel label="Reason (optional)" />
                <TextInput
                  value={reason}
                  onChangeText={setReason}
                  placeholder="e.g. pain relief, hormonal balance"
                  placeholderTextColor={colors.textDisabled}
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                />

                {/* Submit */}
                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={submitting}
                  activeOpacity={0.85}
                  style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: submitting ? 0.6 : 1, marginTop: spacing[4] }]}
                  accessibilityRole="button"
                  accessibilityLabel="Add medication"
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={{ color: '#fff', fontSize: typography.base, fontWeight: '700' }}>
                      Add Medication
                    </Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function FieldLabel({ label }: { label: string }) {
  const { colors, spacing, typography } = useTheme();
  return (
    <Text style={{ color: colors.textSecondary, fontSize: typography.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: spacing[2], marginTop: spacing[4] }}>
      {label}
    </Text>
  );
}

function ChipRow({
  options, selected, onSelect, colors, spacing, typography,
}: {
  options: { value: string; label: string }[];
  selected: string;
  onSelect: (v: string) => void;
  colors: any; spacing: any; typography: any;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          onPress={() => onSelect(opt.value)}
          style={{
            paddingHorizontal: spacing[3],
            paddingVertical: spacing[2],
            borderRadius: 20,
            borderWidth: 1,
            backgroundColor: selected === opt.value ? colors.primary : colors.surface,
            borderColor: selected === opt.value ? colors.primary : colors.border,
          }}
          accessibilityRole="radio"
          accessibilityState={{ checked: selected === opt.value }}
        >
          <Text style={{ color: selected === opt.value ? '#fff' : colors.textSecondary, fontSize: typography.sm, fontWeight: '600' }}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── Log effectiveness modal ───────────────────────────────────────────────────

interface LogModalProps {
  target: UserMedication | null;
  onClose: () => void;
  onSubmit: (score: number) => void;
  loading: boolean;
}

function LogEffectivenessModal({ target, onClose, onSubmit, loading }: LogModalProps) {
  const { colors, spacing, typography } = useTheme();
  return (
    <Modal visible={target !== null} animationType="fade" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: spacing[5] }}>
        <View style={{ backgroundColor: colors.surface, borderRadius: 20, padding: spacing[5] }}>
          <Text style={{ color: colors.textPrimary, fontSize: typography.lg, fontWeight: '700', marginBottom: spacing[1] }}>
            How well did it work?
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: typography.sm, marginBottom: spacing[4] }}>
            {target?.custom_name || (target as any)?.medication_name} · {target?.dosage}
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing[2], marginBottom: spacing[4] }}>
            {[1, 2, 3, 4, 5].map((score) => (
              <TouchableOpacity
                key={score}
                onPress={() => onSubmit(score)}
                disabled={loading}
                style={{
                  flex: 1, paddingVertical: spacing[3], borderRadius: 12,
                  backgroundColor: colors.primaryLighter, alignItems: 'center',
                  opacity: loading ? 0.6 : 1,
                }}
                accessibilityLabel={`Effectiveness ${score} out of 5`}
              >
                <Text style={{ color: colors.primary, fontWeight: '800', fontSize: typography.base }}>{score}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Button label="Cancel" variant="ghost" onPress={onClose} fullWidth />
        </View>
      </View>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function MedicationsScreen() {
  const { colors, spacing, typography } = useTheme();
  const [refreshing, setRefreshing]     = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [logTarget, setLogTarget]       = useState<UserMedication | null>(null);

  // ── data from hook layer ─────────────────────────────────────────────
  const { data: medications, isLoading: medLoading, refetch: refetchMeds } = useUserMedications();
  const { data: logs,        isLoading: logsLoading                       } = useMedicationLogs();
  const { data: reminders,   isLoading: remindersLoading                  } = useMedicationReminders();
  const { mutateAsync: deleteMed,  isPending: deleting  } = useDeleteUserMedication();
  const { mutateAsync: createLog,  isPending: logging   } = useCreateMedicationLog();

  const activeMeds  = useMemo(() => (medications ?? []).filter((m) => m.is_active),  [medications]);
  const inactiveMeds = useMemo(() => (medications ?? []).filter((m) => !m.is_active), [medications]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchMeds();
    setRefreshing(false);
  }, [refetchMeds]);

  const handleDelete = useCallback((id: number, name: string) => {
    Alert.alert(
      'Remove Medication',
      `Remove "${name}" from your list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteMed(id);
            } catch {
              Alert.alert('Error', 'Could not remove medication. Please try again.');
            }
          },
        },
      ],
    );
  }, [deleteMed]);

  const submitLog = useCallback(async (score: number) => {
    if (!logTarget) { return; }
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
      Alert.alert('Error', 'Could not log medication. Please try again.');
    }
  }, [logTarget, createLog]);

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]} edges={['left', 'right', 'bottom']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing[12] }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* ── Header ────────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: spacing[5], marginTop: spacing[5], marginBottom: spacing[4] }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ color: colors.textPrimary, fontSize: typography['2xl'], fontWeight: '900', letterSpacing: -0.5 }}>
                Medications
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: typography.sm }}>
                {activeMeds.length} active
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowAddModal(true)}
              style={{ backgroundColor: colors.primary, borderRadius: 14, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
              accessibilityRole="button"
              accessibilityLabel="Add medication"
            >
              <Icon name="plus" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Active medications ─────────────────────────────────────── */}
        <SectionLabel label="Active" colors={colors} spacing={spacing} typography={typography} />
        <View style={{ paddingHorizontal: spacing[5] }}>
          {medLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing[6] }} />
          ) : activeMeds.length === 0 ? (
            <TouchableOpacity
              onPress={() => setShowAddModal(true)}
              style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              accessibilityRole="button"
            >
              <Icon name="pill-off" size={32} color={colors.textDisabled} />
              <Text style={{ color: colors.textSecondary, fontSize: typography.sm, marginTop: spacing[3], textAlign: 'center' }}>
                No medications yet.{'\n'}Tap + to add one.
              </Text>
            </TouchableOpacity>
          ) : (
            activeMeds.map((med) => (
              <MedicationCard
                key={med.id}
                med={med}
                onLog={() => setLogTarget(med)}
                onDelete={() => handleDelete(med.id, (med as any).medication_name || med.custom_name || 'this medication')}
                deleting={deleting}
                logging={logging && logTarget?.id === med.id}
                colors={colors}
                spacing={spacing}
                typography={typography}
              />
            ))
          )}
        </View>

        {/* ── Recent logs ────────────────────────────────────────────── */}
        <SectionLabel label="Recent logs" colors={colors} spacing={spacing} typography={typography} />
        <View style={{ paddingHorizontal: spacing[5] }}>
          {logsLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing[4] }} />
          ) : (logs ?? []).length === 0 ? (
            <Card><Text style={{ color: colors.textSecondary, fontSize: typography.sm, textAlign: 'center' }}>No logs yet</Text></Card>
          ) : (
            (logs ?? []).slice(0, 5).map((log) => (
              <Card key={log.id} style={{ marginBottom: spacing[3] }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <Text style={{ color: colors.textPrimary, fontSize: typography.sm, fontWeight: '600' }}>
                      {new Date(log.date_taken).toLocaleDateString()}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: typography.xs, marginTop: 2 }}>
                      {log.dosage_taken}
                    </Text>
                    {!!log.side_effects_experienced && (
                      <Text style={{ color: colors.textTertiary, fontSize: typography.xs, marginTop: 2 }}>
                        Side effects: {log.side_effects_experienced}
                      </Text>
                    )}
                  </View>
                  {log.effectiveness && (
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ color: colors.primary, fontSize: typography.xl, fontWeight: '800' }}>
                        {log.effectiveness}
                      </Text>
                      <Text style={{ color: colors.textTertiary, fontSize: 10 }}>/ 5</Text>
                    </View>
                  )}
                </View>
              </Card>
            ))
          )}
        </View>

        {/* ── Reminders ──────────────────────────────────────────────── */}
        <SectionLabel label="Reminders" colors={colors} spacing={spacing} typography={typography} />
        <View style={{ paddingHorizontal: spacing[5] }}>
          {remindersLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing[4] }} />
          ) : (reminders ?? []).length === 0 ? (
            <Card>
              <Text style={{ color: colors.textSecondary, fontSize: typography.sm, textAlign: 'center' }}>
                No reminders set
              </Text>
            </Card>
          ) : (
            (reminders ?? []).map((r) => (
              <Card key={r.id} style={{ marginBottom: spacing[3] }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <Text style={{ color: colors.textPrimary, fontSize: typography.sm, fontWeight: '600' }}>{r.reminder_time}</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: typography.xs, marginTop: 2 }}>{r.days_of_week.length} days/week</Text>
                  </View>
                  <Badge label={r.is_active ? 'Active' : 'Off'} variant={r.is_active ? 'success' : 'default'} />
                </View>
              </Card>
            ))
          )}
        </View>

        {/* ── Inactive medications ───────────────────────────────────── */}
        {inactiveMeds.length > 0 && (
          <>
            <SectionLabel label="Inactive" colors={colors} spacing={spacing} typography={typography} />
            <View style={{ paddingHorizontal: spacing[5] }}>
              {inactiveMeds.map((med) => (
                <MedicationCard
                  key={med.id}
                  med={med}
                  inactive
                  onDelete={() => handleDelete(med.id, (med as any).medication_name || med.custom_name || 'this medication')}
                  deleting={deleting}
                  colors={colors}
                  spacing={spacing}
                  typography={typography}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* ── Modals ──────────────────────────────────────────────────── */}
      <AddMedicationModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          setShowAddModal(false);
          Alert.alert('Added!', 'Medication added to your list.');
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

// ── Reusable sub-components ───────────────────────────────────────────────────

function SectionLabel({ label, colors, spacing, typography }: { label: string; colors: any; spacing: any; typography: any }) {
  return (
    <Text style={{ color: colors.textSecondary, fontSize: typography.xs, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: spacing[5], marginTop: spacing[5], marginBottom: spacing[2] }}>
      {label}
    </Text>
  );
}

function MedicationCard({
  med, inactive, onLog, onDelete, deleting, logging, colors, spacing, typography,
}: {
  med: UserMedication;
  inactive?: boolean;
  onLog?: () => void;
  onDelete: () => void;
  deleting: boolean;
  logging?: boolean;
  colors: any; spacing: any; typography: any;
}) {
  const medName = med.custom_name || (med as any).medication_name || '—';
  return (
    <Card style={{ marginBottom: spacing[3], opacity: inactive ? 0.6 : 1 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing[3] }}>
        <View style={{ flex: 1, paddingRight: spacing[2] }}>
          <Text style={{ color: colors.textPrimary, fontSize: typography.base, fontWeight: '700' }}>{medName}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: typography.sm, marginTop: 2 }}>
            {med.dosage} · {med.frequency?.replace(/_/g, ' ')}
          </Text>
          {!!(med as any).reason && (
            <Text style={{ color: colors.textTertiary, fontSize: typography.xs, marginTop: 2 }}>
              {(med as any).reason}
            </Text>
          )}
        </View>
        <Badge label={inactive ? 'Inactive' : 'Active'} variant={inactive ? 'default' : 'success'} />
      </View>

      {/* Interaction warning */}
      {(med as any).potential_interactions?.length > 0 && (
        <View style={{ backgroundColor: colors.warningBg ?? colors.luteal + '20', borderRadius: 10, padding: spacing[3], marginBottom: spacing[3] }}>
          <Text style={{ color: colors.textPrimary, fontSize: typography.xs, fontWeight: '700', marginBottom: 2 }}>
            ⚠ Possible interaction with {(med as any).potential_interactions[0].with_medication}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: typography.xs }}>
            {(med as any).potential_interactions[0].description}
          </Text>
        </View>
      )}

      {!inactive && (
        <View style={{ flexDirection: 'row', gap: spacing[2] }}>
          <TouchableOpacity
            onPress={onLog}
            disabled={logging}
            style={{ flex: 1, backgroundColor: colors.primaryLighter, borderRadius: 10, paddingVertical: spacing[2], alignItems: 'center', opacity: logging ? 0.6 : 1 }}
            accessibilityRole="button"
            accessibilityLabel={`Log ${medName} taken`}
          >
            <Text style={{ color: colors.primary, fontSize: typography.sm, fontWeight: '600' }}>
              {logging ? 'Logging…' : 'Log Taken'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onDelete}
            disabled={deleting}
            style={{ flex: 1, backgroundColor: colors.border, borderRadius: 10, paddingVertical: spacing[2], alignItems: 'center', opacity: deleting ? 0.6 : 1 }}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${medName}`}
          >
            <Text style={{ color: colors.textSecondary, fontSize: typography.sm, fontWeight: '600' }}>Remove</Text>
          </TouchableOpacity>
        </View>
      )}

      {inactive && (
        <TouchableOpacity
          onPress={onDelete}
          disabled={deleting}
          style={{ backgroundColor: colors.border, borderRadius: 10, paddingVertical: spacing[2], alignItems: 'center', opacity: deleting ? 0.6 : 1 }}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${medName}`}
        >
          <Text style={{ color: colors.textSecondary, fontSize: typography.sm, fontWeight: '600' }}>Remove</Text>
        </TouchableOpacity>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex:         { flex: 1 },
  modalSheet:   { flex: 1, marginTop: 60, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  modalHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  searchRow:    { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  drugRow:      { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 10 },
  selectedPill: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8, alignSelf: 'flex-start' },
  input:        { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  submitBtn:    { borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  emptyCard:    { borderRadius: 16, borderWidth: 1, padding: 32, alignItems: 'center', marginBottom: 12 },
});
