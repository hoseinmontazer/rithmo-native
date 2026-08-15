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
import { Button, Icon, AppIcon, LoadingState, ErrorState } from '@components/ui';
import { usePeriod, usePatchPeriod } from '@hooks/queries/usePeriods';
import { useToast } from '../../context/ToastContext';
import { formatDateISO } from '@utils/dateUtils';
import type { CycleScreenProps } from '@navigation/types';
import icons from '../../assets/icons';

type Props = CycleScreenProps<'EditPeriod'>;

const COMMON_SYMPTOMS = ['cramps', 'headache', 'fatigue', 'bloating', 'mood swings', 'backache', 'nausea', 'insomnia'];
const COMMON_MEDS     = ['ibuprofen', 'paracetamol', 'heating pad', 'aspirin', 'naproxen'];

// ── Date picker sheet (reused pattern from LogPeriodScreen) ───────────────────
function DateSheet({
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
  const { colors, spacing, typography } = useTheme();
  const today = new Date();
  const [cur, setCur] = useState<Date>(selected ?? today);

  useEffect(() => { if (visible) setCur(selected ?? today); }, [visible]);

  const dates: Date[] = Array.from({ length: 90 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    return d;
  });

  const validDates = minDate
    ? dates.filter(d => d >= minDate)
    : dates;

  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const isToday = (d: Date) => d.toDateString() === today.toDateString();
  const isSel   = (d: Date) => d.toDateString() === cur.toDateString();

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '72%' }}>
          {/* Handle */}
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
          </View>

          {/* Title */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[5], paddingVertical: spacing[4], borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}>
            <Text style={{ color: colors.textPrimary, fontSize: typography.lg, fontWeight: '700' }}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {validDates.map((d, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => setCur(d)}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing[5], paddingVertical: spacing[4], backgroundColor: isSel(d) ? colors.menstrual + '12' : 'transparent', borderLeftWidth: isSel(d) ? 3 : 0, borderLeftColor: colors.menstrual }}
              >
                <View>
                  <Text style={{ color: isSel(d) ? colors.menstrual : colors.textPrimary, fontSize: typography.base, fontWeight: isSel(d) ? '700' : '400' }}>
                    {fmt(d)}
                  </Text>
                  {isToday(d) && <Text style={{ color: colors.menstrual, fontSize: typography.xs, fontWeight: '600', marginTop: 2 }}>Today</Text>}
                </View>
                {isSel(d) && <Icon name="check-circle" size={22} color={colors.menstrual} />}
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={{ padding: spacing[5], borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }}>
            <Button label="Confirm Date" onPress={() => { onSelect(cur); onClose(); }} size="lg" fullWidth />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function EditPeriodScreen() {
  const navigation = useNavigation<Props['navigation']>();
  const route      = useRoute<Props['route']>();
  const { colors, spacing, typography } = useTheme();
  const { periodId } = route.params;

  const { data: period, isLoading, isError, error, refetch } = usePeriod(periodId);
  const patchMutation = usePatchPeriod();
  const toast = useToast();

  // Form state — initialized from API data
  const [startDate,   setStartDate]   = useState<Date | null>(null);
  const [endDate,     setEndDate]     = useState<Date | null>(null);
  const [symptoms,    setSymptoms]    = useState<string[]>([]);
  const [medication,  setMedication]  = useState<string[]>([]);
  const [symptomsText,   setSymptomsText]   = useState('');
  const [medicationText, setMedicationText] = useState('');

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker,   setShowEndPicker]   = useState(false);

  // Pre-fill form when period loads
  useEffect(() => {
    if (!period) return;
    setStartDate(new Date(period.start_date));
    setEndDate(period.end_date ? new Date(period.end_date) : null);

    // Split symptoms/meds into chips vs free text
    const symsFromAPI  = period.symptoms  ? period.symptoms.split(',').map(s => s.trim()).filter(Boolean)  : [];
    const medsFromAPI  = period.medication ? period.medication.split(',').map(m => m.trim()).filter(Boolean) : [];

    const knownSyms = symsFromAPI.filter(s => COMMON_SYMPTOMS.includes(s));
    const extraSyms = symsFromAPI.filter(s => !COMMON_SYMPTOMS.includes(s));
    const knownMeds = medsFromAPI.filter(m => COMMON_MEDS.includes(m));
    const extraMeds = medsFromAPI.filter(m => !COMMON_MEDS.includes(m));

    setSymptoms(knownSyms);
    setMedication(knownMeds);
    setSymptomsText(extraSyms.join(', '));
    setMedicationText(extraMeds.join(', '));
  }, [period]);

  const toggleChip = (list: string[], setList: (v: string[]) => void, val: string) =>
    setList(list.includes(val) ? list.filter(x => x !== val) : [...list, val]);

  const buildField = (chips: string[], text: string) => {
    const extra = text.trim() ? text.split(',').map(s => s.trim()).filter(Boolean) : [];
    const all   = [...new Set([...chips, ...extra])];
    return all.length ? all.join(',') : '';
  };

  const fmtDate = (d: Date) =>
    d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  const handleSave = () => {
    if (!startDate) return;

    // Validate end date is at least 3 days after start (if provided)
    if (endDate) {
      const minEnd = new Date(startDate);
      minEnd.setDate(startDate.getDate() + 3);
      if (endDate < minEnd) {
        toast.warning('Invalid Date', 'End date must be at least 3 days after the start date.');
        return;
      }
    }

    patchMutation.mutate(
      {
        id: periodId,
        data: {
          start_date: formatDateISO(startDate),
          end_date:   endDate ? formatDateISO(endDate) : undefined,
          symptoms:   buildField(symptoms, symptomsText) || undefined,
          medication: buildField(medication, medicationText) || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success('Period Updated', 'Your changes have been saved.');
          navigation.goBack();
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.end_date?.[0]
            || err?.response?.data?.start_date?.[0]
            || err?.response?.data?.detail
            || 'Failed to update period. Please try again.';
          toast.error('Update Failed', msg);
        },
      },
    );
  };

  if (isLoading) return <LoadingState fullScreen message="Loading period…" />;
  if (isError)   return <ErrorState fullScreen error={error} onRetry={refetch} />;
  if (!period || !startDate) return null;

  const busy = patchMutation.isPending;
  const isOngoing = !period.end_date;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: spacing[10] }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Hero ───────────────────────────────────────────── */}
          <View
            style={{
              backgroundColor: colors.surface,
              paddingHorizontal: spacing[5],
              paddingTop: spacing[6],
              paddingBottom: spacing[6],
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: colors.border,
              position: 'relative',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[4] }}>
              <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: colors.menstrual + '18', alignItems: 'center', justifyContent: 'center' }}>
                <AppIcon source={icons.menstruation} size={32} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textPrimary, fontSize: typography.xl, fontWeight: '800', letterSpacing: -0.3 }}>
                  Edit Period
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: typography.sm, marginTop: spacing[1] }}>
                  {isOngoing ? 'Ongoing period' : `${fmtDate(new Date(period.start_date))}`}
                </Text>
              </View>
            </View>
            {/* Accent bar */}
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, backgroundColor: colors.menstrual }} />
          </View>

          <View style={{ paddingHorizontal: spacing[5], paddingTop: spacing[6] }}>

            {/* ── Start Date ─────────────────────────────────── */}
            <Text style={styles.sectionLabel}>START DATE</Text>
            <TouchableOpacity
              onPress={() => setShowStartPicker(true)}
              activeOpacity={0.8}
              style={[styles.datePicker, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
                <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: colors.menstrual + '18', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="calendar" size={22} color={colors.menstrual} />
                </View>
                <View>
                  <Text style={{ color: colors.textPrimary, fontSize: typography.base, fontWeight: '700' }}>
                    {startDate ? fmtDate(startDate) : 'Select date'}
                  </Text>
                  <Text style={{ color: colors.textTertiary, fontSize: typography.xs, marginTop: 2 }}>Tap to change</Text>
                </View>
              </View>
              <Icon name="chevron-right" size={20} color={colors.textTertiary} />
            </TouchableOpacity>

            {/* ── End Date (optional for ongoing) ────────────── */}
            <View style={{ marginTop: spacing[5] }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={styles.sectionLabel}>END DATE</Text>
                {isOngoing && <Text style={{ color: colors.textTertiary, fontSize: typography.xs }}>Optional</Text>}
              </View>

              <TouchableOpacity
                onPress={() => setShowEndPicker(true)}
                activeOpacity={0.8}
                style={[
                  styles.datePicker,
                  {
                    backgroundColor: colors.surface,
                    borderColor: endDate ? colors.border : colors.border,
                  },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
                  <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="calendar-check-outline" size={22} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={{ color: endDate ? colors.textPrimary : colors.textTertiary, fontSize: typography.base, fontWeight: endDate ? '700' : '400' }}>
                      {endDate ? fmtDate(endDate) : 'Not ended yet'}
                    </Text>
                    {startDate && (
                      <Text style={{ color: colors.textTertiary, fontSize: typography.xs, marginTop: 2 }}>
                        Min: {(() => { const m = new Date(startDate); m.setDate(startDate.getDate() + 3); return fmtDate(m); })()}
                      </Text>
                    )}
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
                  {endDate && (
                    <TouchableOpacity
                      onPress={() => setEndDate(null)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Icon name="close-circle-outline" size={20} color={colors.textTertiary} />
                    </TouchableOpacity>
                  )}
                  <Icon name="chevron-right" size={20} color={colors.textTertiary} />
                </View>
              </TouchableOpacity>
            </View>

            {/* ── Symptoms ───────────────────────────────────── */}
            <View style={{ marginTop: spacing[6] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text style={styles.sectionLabel}>SYMPTOMS</Text>
                <Text style={{ color: colors.textTertiary, fontSize: typography.xs }}>Optional</Text>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginBottom: spacing[3] }}>
                {COMMON_SYMPTOMS.map(s => {
                  const active = symptoms.includes(s);
                  return (
                    <TouchableOpacity
                      key={s}
                      onPress={() => toggleChip(symptoms, setSymptoms, s)}
                      activeOpacity={0.75}
                      style={{ paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: 20, borderWidth: 1.5, borderColor: active ? colors.menstrual : colors.border, backgroundColor: active ? colors.menstrual + '15' : colors.surface }}
                    >
                      <Text style={{ color: active ? colors.menstrual : colors.textSecondary, fontSize: typography.sm, fontWeight: active ? '700' : '400' }}>
                        {s}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TextInput
                style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary, fontSize: typography.sm }]}
                placeholder="Other symptoms..."
                placeholderTextColor={colors.textTertiary}
                value={symptomsText}
                onChangeText={setSymptomsText}
                multiline
                numberOfLines={2}
              />
            </View>

            {/* ── Medication ─────────────────────────────────── */}
            <View style={{ marginTop: spacing[6] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text style={styles.sectionLabel}>MEDICATION</Text>
                <Text style={{ color: colors.textTertiary, fontSize: typography.xs }}>Optional</Text>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginBottom: spacing[3] }}>
                {COMMON_MEDS.map(m => {
                  const active = medication.includes(m);
                  return (
                    <TouchableOpacity
                      key={m}
                      onPress={() => toggleChip(medication, setMedication, m)}
                      activeOpacity={0.75}
                      style={{ paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: 20, borderWidth: 1.5, borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary + '15' : colors.surface }}
                    >
                      <Text style={{ color: active ? colors.primary : colors.textSecondary, fontSize: typography.sm, fontWeight: active ? '700' : '400' }}>
                        {m}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TextInput
                style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary, fontSize: typography.sm }]}
                placeholder="Other medications..."
                placeholderTextColor={colors.textTertiary}
                value={medicationText}
                onChangeText={setMedicationText}
                multiline
                numberOfLines={2}
              />
            </View>

            {/* ── Actions ────────────────────────────────────── */}
            <View style={{ marginTop: spacing[8], gap: spacing[3] }}>
              <Button label={busy ? 'Saving…' : 'Save Changes'} onPress={handleSave} disabled={busy} loading={busy} size="lg" fullWidth />
              <Button label="Cancel" onPress={() => navigation.goBack()} variant="ghost" size="lg" fullWidth />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Start date picker ──────────────────────────────── */}
      <DateSheet
        visible={showStartPicker}
        title="Start Date"
        selected={startDate}
        onClose={() => setShowStartPicker(false)}
        onSelect={(d) => { setStartDate(d); setEndDate(null); /* reset end when start changes */ }}
      />

      {/* ── End date picker ────────────────────────────────── */}
      <DateSheet
        visible={showEndPicker}
        title="End Date"
        selected={endDate}
        minDate={startDate ? (() => { const m = new Date(startDate); m.setDate(startDate.getDate() + 3); return m; })() : undefined}
        onClose={() => setShowEndPicker(false)}
        onSelect={setEndDate}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  sectionLabel: {
    color: '#888',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  datePicker: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14,
  },
  textArea: {
    borderWidth: 1, borderRadius: 14, paddingHorizontal: 14,
    paddingVertical: 12, minHeight: 72, textAlignVertical: 'top',
  },
});
