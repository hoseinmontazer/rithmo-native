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
import { Button, Icon, AppIcon } from '@components/ui';
import type { CycleStackParamList } from '@navigation/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCreatePeriod, usePatchPeriod } from '@hooks/queries/usePeriods';
import { useToast } from '../../context/ToastContext';
import { formatDateISO } from '@utils/dateUtils';
import icons from '../../assets/icons';

interface ActivePeriodError {
  error: string;
  active_period_id: number;
  start_date: string;
}

type Props = NativeStackScreenProps<CycleStackParamList, 'LogPeriod'>;

// ── Symptom chips ─────────────────────────────────────────────────────────────
const COMMON_SYMPTOMS = ['cramps', 'headache', 'fatigue', 'bloating', 'mood swings', 'backache', 'nausea', 'insomnia'];
const COMMON_MEDS     = ['ibuprofen', 'paracetamol', 'heating pad', 'aspirin', 'naproxen'];

// ── Date picker sheet ─────────────────────────────────────────────────────────
function DateSheet({
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
  const { colors, spacing, typography } = useTheme();
  const [cur, setCur] = useState(selected);
  const today = new Date();

  const dates: Date[] = Array.from({ length: 60 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    return d;
  });

  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const isToday = (d: Date) => d.toDateString() === today.toDateString();
  const isSel   = (d: Date) => d.toDateString() === cur.toDateString();

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            maxHeight: '72%',
          }}
        >
          {/* Handle */}
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
          </View>

          {/* Title row */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: spacing[5],
              paddingVertical: spacing[4],
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: colors.border,
            }}
          >
            <Text style={{ color: colors.textPrimary, fontSize: typography.lg, fontWeight: '700' }}>
              When did it start?
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Dates */}
          <ScrollView showsVerticalScrollIndicator={false}>
            {dates.map((d, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => setCur(d)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: spacing[5],
                  paddingVertical: spacing[4],
                  backgroundColor: isSel(d) ? colors.menstrual + '12' : 'transparent',
                  borderLeftWidth: isSel(d) ? 3 : 0,
                  borderLeftColor: colors.menstrual,
                }}
              >
                <View>
                  <Text
                    style={{
                      color: isSel(d) ? colors.menstrual : colors.textPrimary,
                      fontSize: typography.base,
                      fontWeight: isSel(d) ? '700' : '400',
                    }}
                  >
                    {fmt(d)}
                  </Text>
                  {isToday(d) && (
                    <Text style={{ color: colors.menstrual, fontSize: typography.xs, marginTop: 2, fontWeight: '600' }}>
                      Today
                    </Text>
                  )}
                </View>
                {isSel(d) && <Icon name="check-circle" size={22} color={colors.menstrual} />}
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Confirm */}
          <View style={{ padding: spacing[5], borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }}>
            <Button
              label="Confirm Date"
              onPress={() => { onSelect(cur); onClose(); }}
              size="lg"
              fullWidth
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── End Period Sheet ──────────────────────────────────────────────────────────
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
  onConfirm: (endDate: string) => void;  // end + start new
  onEndOnly: (endDate: string) => void;  // just end, no new period
}) {
  const { colors, spacing, typography } = useTheme();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDate = new Date(activePeriodStartDate);
  startDate.setHours(0, 0, 0, 0);

  // Minimum 3 days after start
  const minEnd = new Date(startDate);
  minEnd.setDate(startDate.getDate() + 3);

  const defaultEnd = today >= minEnd ? today : minEnd;
  const [endDate, setEndDate] = useState(defaultEnd);
  const [listOpen, setListOpen] = useState(false);

  React.useEffect(() => {
    if (visible) {
      const d = today >= minEnd ? new Date(today) : new Date(minEnd);
      setEndDate(d);
      setListOpen(false);
    }
  }, [visible]);

  // Valid dates: minEnd → today (reversed, today first)
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
    d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const fmtFull = (d: Date) =>
    d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const isToday = (d: Date) => d.toDateString() === today.toDateString();
  const isSel   = (d: Date) => d.toDateString() === endDate.toDateString();

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        {/* Backdrop tap closes */}
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={onClose}
        />

        <View
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            maxHeight: '85%',
          }}
        >
          {/* Handle */}
          <View style={{ alignItems: 'center', paddingTop: 12 }}>
            <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
          </View>

          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={{ padding: spacing[5] }}>
              {/* Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3], marginBottom: spacing[4] }}>
                <View
                  style={{
                    width: 48, height: 48, borderRadius: 14,
                    backgroundColor: colors.menstrual + '18',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <AppIcon source={icons.menstruation} size={28} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.textPrimary, fontSize: typography.lg, fontWeight: '800' }}>
                    End Active Period
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: typography.sm, marginTop: 2 }}>
                    Started {startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Text>
                </View>
              </View>

              {/* Info banner */}
              <View
                style={{
                  backgroundColor: colors.primaryLighter,
                  borderRadius: 12, padding: spacing[3],
                  flexDirection: 'row', alignItems: 'flex-start',
                  gap: spacing[2], marginBottom: spacing[5],
                }}
              >
                <Icon name="information-outline" size={18} color={colors.primary} />
                <Text style={{ color: colors.primary, fontSize: typography.xs, flex: 1, lineHeight: 18 }}>
                  End date must be at least 3 days after the start date.
                  {noValidDates
                    ? ' Your period started recently — please wait until ' + fmt(minEnd) + '.'
                    : ' Earliest: ' + fmt(minEnd) + '.'}
                </Text>
              </View>

              {/* END DATE selector */}
              <Text style={{
                color: colors.textSecondary, fontSize: typography.xs,
                fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase',
                marginBottom: spacing[2],
              }}>
                END DATE
              </Text>

              {noValidDates ? (
                /* Period started too recently */
                <View
                  style={{
                    backgroundColor: colors.surfaceSecondary,
                    borderRadius: 14, padding: spacing[4],
                    borderWidth: 1, borderColor: colors.border,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: colors.textSecondary, fontSize: typography.sm, textAlign: 'center' }}>
                    No valid end dates yet.{'\n'}Period must run at least 3 days.
                  </Text>
                </View>
              ) : (
                <>
                  {/* Selected date row — tap to expand list */}
                  <TouchableOpacity
                    onPress={() => setListOpen(o => !o)}
                    activeOpacity={0.8}
                    style={{
                      flexDirection: 'row', alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: colors.surfaceSecondary,
                      borderRadius: 14, padding: spacing[4],
                      borderWidth: 1, borderColor: colors.primary + '60',
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
                      <Icon name="calendar" size={20} color={colors.primary} />
                      <View>
                        <Text style={{ color: colors.textPrimary, fontSize: typography.base, fontWeight: '700' }}>
                          {fmt(endDate)}
                        </Text>
                        {isToday(endDate) && (
                          <Text style={{ color: colors.primary, fontSize: typography.xs, fontWeight: '600', marginTop: 1 }}>
                            Today
                          </Text>
                        )}
                      </View>
                    </View>
                    <Icon
                      name={listOpen ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={colors.textTertiary}
                    />
                  </TouchableOpacity>

                  {/* Inline date list */}
                  {listOpen && (
                    <View
                      style={{
                        backgroundColor: colors.surface,
                        borderRadius: 14, marginTop: spacing[2],
                        borderWidth: 1, borderColor: colors.border,
                        overflow: 'hidden',
                        maxHeight: 220,
                      }}
                    >
                      <ScrollView
                        nestedScrollEnabled
                        showsVerticalScrollIndicator={false}
                      >
                        {validDates.map((d, i) => {
                          const sel     = isSel(d);
                          const todayD  = isToday(d);
                          return (
                            <TouchableOpacity
                              key={i}
                              onPress={() => { setEndDate(d); setListOpen(false); }}
                              activeOpacity={0.75}
                              style={{
                                flexDirection: 'row', alignItems: 'center',
                                justifyContent: 'space-between',
                                paddingHorizontal: spacing[4],
                                paddingVertical: spacing[3],
                                backgroundColor: sel ? colors.primary + '12' : 'transparent',
                                borderLeftWidth: sel ? 3 : 0,
                                borderLeftColor: colors.primary,
                                borderBottomWidth: i < validDates.length - 1 ? StyleSheet.hairlineWidth : 0,
                                borderBottomColor: colors.border,
                              }}
                            >
                              <View>
                                <Text style={{
                                  color: sel ? colors.primary : colors.textPrimary,
                                  fontSize: typography.sm,
                                  fontWeight: sel ? '700' : '400',
                                }}>
                                  {fmtFull(d)}
                                </Text>
                                {todayD && (
                                  <Text style={{ color: colors.primary, fontSize: typography.xs, fontWeight: '600', marginTop: 1 }}>
                                    Today
                                  </Text>
                                )}
                              </View>
                              {sel && <Icon name="check-circle" size={20} color={colors.primary} />}
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}
                </>
              )}

              {/* Buttons */}
              <View style={{ gap: spacing[3], marginTop: spacing[6], paddingBottom: spacing[2] }}>
                {/* End & Start New — only available if valid dates exist */}
                <TouchableOpacity
                  onPress={() => !noValidDates && onConfirm(formatDateISO(endDate))}
                  activeOpacity={noValidDates ? 0.4 : 0.8}
                  style={{
                    height: 52, borderRadius: 14,
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: noValidDates ? colors.primary + '30' : colors.primary,
                    flexDirection: 'row', gap: spacing[2],
                  }}
                >
                  <Icon name="refresh" size={18} color={noValidDates ? colors.primary + '80' : '#fff'} />
                  <Text style={{
                    color: noValidDates ? colors.primary + '80' : '#fff',
                    fontSize: typography.base, fontWeight: '700',
                  }}>
                    End & Start New Period
                  </Text>
                </TouchableOpacity>

                {/* End period only — always available */}
                <TouchableOpacity
                  onPress={() => {
                    // For "end only", if no valid dates yet we use the minimum possible
                    const d = noValidDates ? minEnd : endDate;
                    if (noValidDates) {
                      // Can't end yet — show info
                      return;
                    }
                    onEndOnly(formatDateISO(d));
                  }}
                  activeOpacity={noValidDates ? 0.4 : 0.8}
                  style={{
                    height: 52, borderRadius: 14,
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: colors.surfaceSecondary,
                    borderWidth: 1,
                    borderColor: noValidDates ? colors.border + '60' : colors.border,
                    flexDirection: 'row', gap: spacing[2],
                  }}
                >
                  <Icon
                    name="check-circle-outline"
                    size={18}
                    color={noValidDates ? colors.textTertiary : colors.textPrimary}
                  />
                  <Text style={{
                    color: noValidDates ? colors.textTertiary : colors.textPrimary,
                    fontSize: typography.base, fontWeight: '600',
                  }}>
                    {noValidDates ? 'End Period (not available yet)' : 'Just End This Period'}
                  </Text>
                </TouchableOpacity>

                {/* Cancel */}
                <TouchableOpacity
                  onPress={onClose}
                  activeOpacity={0.8}
                  style={{
                    height: 44, borderRadius: 14,
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: colors.textSecondary, fontSize: typography.sm, fontWeight: '600' }}>
                    Keep Period Active
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function LogPeriodScreen() {
  const navigation = useNavigation<Props['navigation']>();
  const { colors, spacing, typography } = useTheme();

  const [startDate, setStartDate]   = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [symptoms, setSymptoms]     = useState<string[]>([]);
  const [medication, setMedication] = useState<string[]>([]);
  const [symptomsText, setSymptomsText]     = useState('');
  const [medicationText, setMedicationText] = useState('');

  // Active period conflict state
  const [endPeriodSheet, setEndPeriodSheet] = useState<{
    visible: boolean;
    activePeriodId: number;
    activePeriodStartDate: string;
  }>({ visible: false, activePeriodId: 0, activePeriodStartDate: '' });

  const createMutation = useCreatePeriod();
  const patchMutation  = usePatchPeriod();
  const toast   = useToast();

  // Toggle chip helper
  const toggleChip = (list: string[], setList: (v: string[]) => void, val: string) => {
    setList(list.includes(val) ? list.filter(x => x !== val) : [...list, val]);
  };

  // Combine chip selections + free text
  const buildField = (chips: string[], text: string) => {
    const extra = text.trim() ? text.split(',').map(s => s.trim()).filter(Boolean) : [];
    const all   = [...new Set([...chips, ...extra])];
    return all.length ? all.join(',') : undefined;
  };

  const handleSubmit = () => {
    createMutation.mutate(
      {
        start_date: formatDateISO(startDate),
        symptoms:   buildField(symptoms, symptomsText),
        medication: buildField(medication, medicationText),
      },
      {
        onSuccess: () => {
          toast.success('Period Logged', 'Your period has been saved.');
          navigation.goBack();
        },
        onError: (error: any) => {
          const data = error?.response?.data as ActivePeriodError | undefined;
          if (data?.active_period_id) {
            // Show the end period sheet with date picker
            setEndPeriodSheet({
              visible: true,
              activePeriodId: data.active_period_id,
              activePeriodStartDate: data.start_date,
            });
          } else {
            toast.error('Failed to Log', data?.error || 'Please try again.');
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
              symptoms:   buildField(symptoms, symptomsText),
              medication: buildField(medication, medicationText),
            },
            {
              onSuccess: () => {
                toast.success('Period Logged', 'Previous period ended and new one started.');
                navigation.goBack();
              },
              onError: () => toast.error('Error', 'Could not create new period.'),
            },
          );
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.end_date?.[0] || err?.response?.data?.error || 'Could not end active period.';
          toast.error('Error', msg);
        },
      },
    );
  };

  // Just end the active period, don't start a new one
  const handleEndOnly = (endDate: string) => {
    setEndPeriodSheet(s => ({ ...s, visible: false }));
    patchMutation.mutate(
      { id: endPeriodSheet.activePeriodId, data: { end_date: endDate } },
      {
        onSuccess: () => {
          toast.success('Period Ended', 'Your active period has been ended.');
          navigation.goBack();
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.end_date?.[0] || err?.response?.data?.error || 'Could not end active period.';
          toast.error('Error', msg);
        },
      },
    );
  };

  const fmtDate = (d: Date) =>
    d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  const busy = createMutation.isPending || patchMutation.isPending;

  return (
    <View style={{ flex: 1 }}>
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: spacing[10] }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Hero banner ────────────────────────────────────────── */}
          <View
            style={{
              backgroundColor: colors.surface,
              paddingHorizontal: spacing[5],
              paddingTop: spacing[6],
              paddingBottom: spacing[6],
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: colors.border,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[4] }}>
              {/* Period icon — matches home page HubCard style */}
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  backgroundColor: colors.menstrual + '18',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AppIcon source={icons.menstruation} size={32} />
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: colors.textPrimary,
                    fontSize: typography.xl,
                    fontWeight: '800',
                    letterSpacing: -0.3,
                  }}
                >
                  Log Period
                </Text>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: typography.sm,
                    marginTop: spacing[1],
                  }}
                >
                  Track the start of your cycle
                </Text>
              </View>
            </View>

            {/* Accent bar at bottom — matches HubCard top stripe */}
            <View
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 3,
                backgroundColor: colors.menstrual,
              }}
            />
          </View>

          <View style={{ paddingHorizontal: spacing[5], paddingTop: spacing[6] }}>

            {/* ── Start Date ─────────────────────────────────────── */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary, fontSize: typography.xs }]}>
              START DATE
            </Text>
            <TouchableOpacity
              onPress={() => setShowPicker(true)}
              activeOpacity={0.8}
              style={[
                styles.datePicker,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 13,
                    backgroundColor: colors.menstrual + '18',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon name="calendar" size={22} color={colors.menstrual} />
                </View>
                <View>
                  <Text style={{ color: colors.textPrimary, fontSize: typography.base, fontWeight: '700' }}>
                    {fmtDate(startDate)}
                  </Text>
                  <Text style={{ color: colors.textTertiary, fontSize: typography.xs, marginTop: 2 }}>
                    Tap to change
                  </Text>
                </View>
              </View>
              <Icon name="chevron-right" size={20} color={colors.textTertiary} />
            </TouchableOpacity>

            <DateSheet
              visible={showPicker}
              selected={startDate}
              onClose={() => setShowPicker(false)}
              onSelect={setStartDate}
            />

            {/* ── Symptoms ───────────────────────────────────────── */}
            <View style={{ marginTop: spacing[6] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[3] }}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary, fontSize: typography.xs }]}>
                  SYMPTOMS
                </Text>
                <Text style={{ color: colors.textTertiary, fontSize: typography.xs }}>Optional</Text>
              </View>

              {/* Quick chips */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginBottom: spacing[3] }}>
                {COMMON_SYMPTOMS.map(s => {
                  const active = symptoms.includes(s);
                  return (
                    <TouchableOpacity
                      key={s}
                      onPress={() => toggleChip(symptoms, setSymptoms, s)}
                      activeOpacity={0.75}
                      style={{
                        paddingHorizontal: spacing[3],
                        paddingVertical: spacing[2],
                        borderRadius: 20,
                        borderWidth: 1.5,
                        borderColor: active ? colors.menstrual : colors.border,
                        backgroundColor: active ? colors.menstrual + '15' : colors.surface,
                      }}
                    >
                      <Text
                        style={{
                          color: active ? colors.menstrual : colors.textSecondary,
                          fontSize: typography.sm,
                          fontWeight: active ? '700' : '400',
                        }}
                      >
                        {s}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Free text */}
              <TextInput
                style={[
                  styles.textArea,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                    fontSize: typography.sm,
                  },
                ]}
                placeholder="Other symptoms..."
                placeholderTextColor={colors.textTertiary}
                value={symptomsText}
                onChangeText={setSymptomsText}
                multiline
                numberOfLines={2}
              />
            </View>

            {/* ── Medication ─────────────────────────────────────── */}
            <View style={{ marginTop: spacing[6] }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing[3] }}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary, fontSize: typography.xs }]}>
                  MEDICATION
                </Text>
                <Text style={{ color: colors.textTertiary, fontSize: typography.xs }}>Optional</Text>
              </View>

              {/* Quick chips */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginBottom: spacing[3] }}>
                {COMMON_MEDS.map(m => {
                  const active = medication.includes(m);
                  return (
                    <TouchableOpacity
                      key={m}
                      onPress={() => toggleChip(medication, setMedication, m)}
                      activeOpacity={0.75}
                      style={{
                        paddingHorizontal: spacing[3],
                        paddingVertical: spacing[2],
                        borderRadius: 20,
                        borderWidth: 1.5,
                        borderColor: active ? colors.primary : colors.border,
                        backgroundColor: active ? colors.primary + '15' : colors.surface,
                      }}
                    >
                      <Text
                        style={{
                          color: active ? colors.primary : colors.textSecondary,
                          fontSize: typography.sm,
                          fontWeight: active ? '700' : '400',
                        }}
                      >
                        {m}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Free text */}
              <TextInput
                style={[
                  styles.textArea,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                    fontSize: typography.sm,
                  },
                ]}
                placeholder="Other medications..."
                placeholderTextColor={colors.textTertiary}
                value={medicationText}
                onChangeText={setMedicationText}
                multiline
                numberOfLines={2}
              />
            </View>

            {/* ── Actions ────────────────────────────────────────── */}
            <View style={{ marginTop: spacing[8], gap: spacing[3] }}>
              <Button
                label={busy ? 'Saving…' : 'Save Period'}
                onPress={handleSubmit}
                disabled={busy}
                loading={busy}
                size="lg"
                fullWidth
              />
              <Button
                label="Cancel"
                onPress={() => navigation.goBack()}
                variant="ghost"
                size="lg"
                fullWidth
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>

    {/* End active period sheet */}
    <EndPeriodSheet
      visible={endPeriodSheet.visible}
      activePeriodStartDate={endPeriodSheet.activePeriodStartDate}
      onClose={() => setEndPeriodSheet(s => ({ ...s, visible: false }))}
      onConfirm={handleEndAndStartNew}
      onEndOnly={handleEndOnly}
    />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  sectionLabel: {
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  datePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 72,
    textAlignVertical: 'top',
  },
});
