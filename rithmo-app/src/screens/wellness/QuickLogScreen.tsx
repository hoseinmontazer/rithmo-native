/**
 * QuickLogScreen — ثبت امروز
 *
 * Rhythmo Design System Redesign.
 * A calm, frictionless, ~15-second daily wellness check-in.
 * Preserves all underlying payload fields, scales, and observation logic.
 */
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@hooks/useTheme';
import {
  useCreateOrUpdateWellnessLog,
  useWellnessLog,
  useTodayWellnessLog,
  useWellnessLogs,
} from '@hooks/queries/useWellness';
import { usePeriods, useCycleAnalysis } from '@hooks/queries/usePeriods';
import { Button, Card, Badge } from '@components/ui';
import { extractErrorMessage } from '@utils/errorHandler';
import type { WellnessScreenProps } from '@navigation/types';

type Props = WellnessScreenProps<'QuickLog'>;

// ── Rating option sets ────────────────────────────────────────────────────────

interface RatingOption {
  value: number;
  label: string;
  shortLabel: string;
  iconName?: string;
}

const MOOD_OPTIONS: RatingOption[] = [
  { value: 1, label: 'خیلی بد', shortLabel: '۱', iconName: 'emoticon-cry-outline' },
  { value: 2, label: 'بد', shortLabel: '۲', iconName: 'emoticon-sad-outline' },
  { value: 3, label: 'معمولی', shortLabel: '۳', iconName: 'emoticon-neutral-outline' },
  { value: 4, label: 'خوب', shortLabel: '۴', iconName: 'emoticon-happy-outline' },
  { value: 5, label: 'عالی', shortLabel: '۵', iconName: 'emoticon-excited-outline' },
];

const ENERGY_OPTIONS: RatingOption[] = [
  { value: 1, label: 'بی‌حال', shortLabel: '۱', iconName: 'battery-10' },
  { value: 2, label: 'کم', shortLabel: '۲', iconName: 'battery-30' },
  { value: 3, label: 'متوسط', shortLabel: '۳', iconName: 'battery-50' },
  { value: 4, label: 'خوب', shortLabel: '۴', iconName: 'battery-80' },
  { value: 5, label: 'پرانرژی', shortLabel: '۵', iconName: 'lightning-bolt' },
];

const PAIN_OPTIONS: RatingOption[] = [
  { value: 0, label: 'بدون درد', shortLabel: '۰', iconName: 'check' },
  { value: 1, label: 'کم', shortLabel: '۱', iconName: 'circle-small' },
  { value: 2, label: 'متوسط', shortLabel: '۲', iconName: 'circle-medium' },
  { value: 3, label: 'زیاد', shortLabel: '۳', iconName: 'alert-circle-outline' },
  { value: 4, label: 'خیلی زیاد', shortLabel: '۴', iconName: 'alert-octagon-outline' },
];

const SLEEP_OPTIONS = [4, 5, 6, 7, 8, 9, 10];

const COMMON_SYMPTOMS = [
  'سردرد',
  'گرفتگی',
  'خستگی',
  'نفخ',
  'استرس',
  'بی‌خوابی',
  'حساسیت پستان',
  'کمردرد',
];

// ── Rating Segmented Picker ───────────────────────────────────────────────────

interface RatingPickerProps {
  label: string;
  options: RatingOption[];
  value: number;
  onChange: (v: number) => void;
  accentColor: string;
}

function RatingPicker({ label, options, value, onChange, accentColor }: RatingPickerProps) {
  const { colors, typography, spacing, borderRadius } = useTheme();
  const selected = options.find(o => o.value === value);

  return (
    <View style={{ marginBottom: spacing[4] }}>
      <View style={styles.pickerHeader}>
        <Text style={[styles.pickerLabel, { color: colors.textPrimary, fontSize: typography.sm }]}>
          {label}
        </Text>
        {selected && (
          <Badge label={selected.label} variant="neutral" />
        )}
      </View>

      <View style={[styles.optionsRow, { gap: spacing[2] }]}>
        {options.map(opt => {
          const isSelected = opt.value === value;
          return (
            <TouchableOpacity
              key={opt.value}
              onPress={() => onChange(opt.value)}
              activeOpacity={0.75}
              style={[
                styles.ratingOptionBtn,
                {
                  borderRadius: borderRadius.md,
                  backgroundColor: isSelected ? accentColor + '18' : colors.surfaceSecondary,
                  borderColor: isSelected ? accentColor : colors.border,
                  borderWidth: isSelected ? 1.5 : 1,
                  paddingVertical: spacing[2],
                },
              ]}
              accessibilityLabel={`${label}: ${opt.label}`}
            >
              {opt.iconName && (
                <Icon
                  name={opt.iconName}
                  size={20}
                  color={isSelected ? accentColor : colors.textTertiary}
                />
              )}
              <Text
                style={[
                  styles.ratingValueText,
                  {
                    color: isSelected ? accentColor : colors.textSecondary,
                    fontSize: typography.xs,
                    fontWeight: isSelected ? '700' : '500',
                    marginTop: 2,
                  },
                ]}
              >
                {opt.shortLabel}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ── Post-log observation ──────────────────────────────────────────────────────

type DataState = 'empty' | 'building' | 'one_cycle' | 'multi_cycle';

function deriveDataState(periodCount: number, logCount: number): DataState {
  if (periodCount === 0 && logCount < 3) { return 'empty'; }
  if (logCount < 5 || periodCount === 0) { return 'building'; }
  if (periodCount === 1) { return 'one_cycle'; }
  return 'multi_cycle';
}

function buildPostLogObservation(
  dataState: DataState,
  todayMood: number,
  todayEnergy: number,
  avgMood: number | null,
  avgEnergy: number | null,
): string | null {
  if (dataState === 'empty') {
    return 'ثبت شد. ریتمو شروع می‌کنه به شناخت تو.';
  }
  if (dataState === 'building') {
    return 'ثبت شد. داریم الگو را می‌سازیم.';
  }

  const observations: string[] = [];

  if (avgMood !== null && avgEnergy !== null) {
    const moodDiff = todayMood - avgMood;
    const energyDiff = todayEnergy - avgEnergy;

    if (moodDiff <= -1.5 && energyDiff <= -1.5) {
      observations.push('امروز خلق و انرژی‌ات پایین‌تر از میانگین شخصی‌ات بود.');
    } else if (moodDiff >= 1.5 && energyDiff >= 1.5) {
      observations.push('امروز خلق و انرژی‌ات بالاتر از میانگین شخصی‌ات بود.');
    } else if (energyDiff <= -1.5) {
      observations.push('امروز انرژی‌ات پایین‌تر از میانگین اخیرت بود.');
    } else if (moodDiff <= -1.5) {
      observations.push('امروز خلقت پایین‌تر از میانگین اخیرت بود.');
    }
  }

  if (observations.length === 0) {
    return 'ثبت شد.';
  }

  return `ثبت شد.\n${observations[0]}`;
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function QuickLogScreen() {
  const navigation = useNavigation<Props['navigation']>();
  const route = useRoute<Props['route']>();
  const { colors, spacing, typography, borderRadius } = useTheme();

  const logId = route.params?.logId;

  const { data: existing } = useWellnessLog(logId ?? 0);
  const { data: todayLog } = useTodayWellnessLog();
  const { data: allLogs } = useWellnessLogs();
  const { data: periods } = usePeriods();
  const { data: cycleAnalysis } = useCycleAnalysis();
  const { mutateAsync: saveLog, isPending } = useCreateOrUpdateWellnessLog();

  const prefillSource = logId ? existing : (todayLog ?? existing);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [mood, setMood] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [pain, setPain] = useState(0);
  const [sleep, setSleep] = useState(7);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [expanded, setExpanded] = useState(false);

  // ── Post-save observation state ─────────────────────────────────────────────
  const [observation, setObservation] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Pre-fill from existing log
  useEffect(() => {
    if (prefillSource) {
      setMood(Math.min(5, Math.max(1, Math.round(prefillSource.mood_level || 3))));
      setEnergy(Math.min(5, Math.max(1, Math.round((prefillSource.energy_level || 5) / 2))));
      setPain(Math.min(4, Math.max(0, Math.round((prefillSource.pain_level || 0) / 2.5))));
      setSleep(Math.round(prefillSource.sleep_hours || 7));
      setNotes(prefillSource.notes || '');
      if (prefillSource.symptoms) {
        const list = prefillSource.symptoms.split(',').map(s => s.trim()).filter(Boolean);
        setSelectedSymptoms(list);
      }
    }
  }, [prefillSource]);

  // ── Derived data-state ──────────────────────────────────────────────────────
  const periodCount = Array.isArray(periods) ? (periods as unknown[]).length : 0;
  const logCount = Array.isArray(allLogs) ? (allLogs as unknown[]).length : 0;
  const dataState = deriveDataState(periodCount, logCount);

  const personalAvgMood = logCount >= 5
    ? (allLogs as any[]).slice(0, 30).reduce((s: number, l: any) => s + (l.mood_level || 3), 0)
      / Math.min(30, logCount)
    : null;
  const personalAvgEnergy = logCount >= 5
    ? (allLogs as any[]).slice(0, 30).reduce((s: number, l: any) => s + ((l.energy_level || 5) / 2), 0)
      / Math.min(30, logCount)
    : null;

  const cycleDay: number | null = (cycleAnalysis as any)?.current_status?.cycle_day ?? null;

  const toggleSymptom = useCallback((sym: string) => {
    setSelectedSymptoms(prev =>
      prev.includes(sym) ? prev.filter(s => s !== sym) : [...prev, sym]
    );
  }, []);

  // ── Save handler ────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    try {
      await saveLog({
        mood_level: mood,
        energy_level: energy * 2,
        pain_level: Math.round(pain * 2.5),
        sleep_hours: sleep,
        symptoms: selectedSymptoms.join(','),
        notes,
        stress_level: 5,
        anxiety_level: 3,
        focus_level: 5,
        exercise_minutes: 0,
        nutrition_quality: 3,
        caffeine_intake: 0,
        alcohol_intake: 0,
        smoking: 0,
      });

      const obs = buildPostLogObservation(
        dataState,
        mood,
        energy,
        personalAvgMood,
        personalAvgEnergy,
      );
      setObservation(obs);
      setSaved(true);

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }).start();

      setTimeout(() => {
        if (navigation.canGoBack()) {
          navigation.goBack();
        }
      }, 1600);
    } catch (err) {
      Alert.alert('خطا', extractErrorMessage(err));
    }
  }, [
    mood, energy, pain, sleep, selectedSymptoms, notes,
    saveLog, dataState, personalAvgMood, personalAvgEnergy,
    fadeAnim, navigation,
  ]);

  // ── Saved state UI ──────────────────────────────────────────────────────────
  if (saved) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
        <View style={styles.savedContainer}>
          <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
            <View style={[styles.savedIconCircle, { backgroundColor: colors.primary + '18' }]}>
              <Icon name="check" size={36} color={colors.primary} />
            </View>
            <Text style={[styles.savedTitle, { color: colors.textPrimary, fontSize: typography.xl, marginTop: spacing[3] }]}>
              ثبت شد
            </Text>
            {observation && (
              <Text style={[styles.savedObs, { color: colors.textSecondary, fontSize: typography.sm, marginTop: spacing[2] }]}>
                {observation}
              </Text>
            )}
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  // ── Date header ─────────────────────────────────────────────────────────────
  const today = new Date();
  const dateStr = today.toLocaleDateString('fa-IR', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const cycleContext = cycleDay ? `روز ${cycleDay} سیکل` : null;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: spacing[4], paddingBottom: spacing[12] }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Header ──────────────────────────────────────────────── */}
          <View style={[styles.header, { paddingTop: spacing[3], marginBottom: spacing[4] }]}>
            <View>
              <Text style={[styles.dateText, { color: colors.textTertiary, fontSize: typography.xs }]}>
                {dateStr}
              </Text>
              <Text style={[styles.title, { color: colors.textPrimary, fontSize: typography['2xl'] }]}>
                ثبت امروز
              </Text>
              {cycleContext && (
                <Text style={[styles.cyclePill, { color: colors.primary, fontSize: typography.xs }]}>
                  {cycleContext}
                </Text>
              )}
            </View>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={[
                styles.closeBtn,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                  borderRadius: borderRadius.md,
                },
              ]}
              accessibilityLabel="بستن"
            >
              <Icon name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* ── Core rating pickers ──────────────────────────────────── */}
          <Card elevated={false} style={{ padding: spacing[4], marginBottom: spacing[4] }}>
            <RatingPicker
              label="خلق"
              options={MOOD_OPTIONS}
              value={mood}
              onChange={setMood}
              accentColor={colors.luteal}
            />

            <RatingPicker
              label="انرژی"
              options={ENERGY_OPTIONS}
              value={energy}
              onChange={setEnergy}
              accentColor={colors.ovulation}
            />

            <RatingPicker
              label="درد"
              options={PAIN_OPTIONS}
              value={pain}
              onChange={setPain}
              accentColor={colors.menstrual}
            />
          </Card>

          {/* ── Quick Symptom Chips ───────────────────────────────────── */}
          <View style={{ marginBottom: spacing[4] }}>
            <Text style={[styles.sectionSubtitle, { color: colors.textPrimary, fontSize: typography.sm, marginBottom: spacing[2] }]}>
              علائم شایع امروز
            </Text>
            <View style={[styles.chipWrap, { gap: spacing[2] }]}>
              {COMMON_SYMPTOMS.map(sym => {
                const active = selectedSymptoms.includes(sym);
                return (
                  <TouchableOpacity
                    key={sym}
                    onPress={() => toggleSymptom(sym)}
                    activeOpacity={0.7}
                    style={[
                      styles.symptomChip,
                      {
                        borderRadius: borderRadius.pill,
                        backgroundColor: active ? colors.primary + '18' : colors.surfaceSecondary,
                        borderColor: active ? colors.primary : colors.border,
                        borderWidth: 1,
                        paddingHorizontal: spacing[3],
                        paddingVertical: spacing[1],
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.symptomChipText,
                        {
                          color: active ? colors.primary : colors.textSecondary,
                          fontSize: typography.xs,
                          fontWeight: active ? '700' : '500',
                        },
                      ]}
                    >
                      {sym}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Expandable Details ────────────────────────────────────── */}
          <TouchableOpacity
            onPress={() => setExpanded(v => !v)}
            style={[
              styles.expandToggleRow,
              {
                borderColor: colors.border,
                borderRadius: borderRadius.md,
                backgroundColor: colors.surfaceSecondary,
                padding: spacing[3],
                marginBottom: spacing[4],
              },
            ]}
            activeOpacity={0.75}
          >
            <Text style={[styles.expandToggleText, { color: colors.textSecondary, fontSize: typography.xs }]}>
              {expanded ? 'بستن جزئیات خواب و یادداشت' : 'افزودن جزئیات خواب / یادداشت شخصی'}
            </Text>
            <Icon
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          {expanded && (
            <Card elevated={false} style={{ padding: spacing[4], marginBottom: spacing[4] }}>
              <Text style={[styles.pickerLabel, { color: colors.textPrimary, fontSize: typography.sm, marginBottom: spacing[2] }]}>
                خواب دیشب (ساعت)
              </Text>
              <View style={[styles.optionsRow, { gap: spacing[2], marginBottom: spacing[4] }]}>
                {SLEEP_OPTIONS.map(h => {
                  const sel = h === sleep;
                  return (
                    <TouchableOpacity
                      key={h}
                      onPress={() => setSleep(h)}
                      style={[
                        styles.sleepOptionBtn,
                        {
                          borderRadius: borderRadius.md,
                          backgroundColor: sel ? colors.primary + '18' : colors.surfaceSecondary,
                          borderColor: sel ? colors.primary : colors.border,
                          borderWidth: sel ? 1.5 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.sleepOptionText,
                          {
                            color: sel ? colors.primary : colors.textSecondary,
                            fontSize: typography.xs,
                            fontWeight: sel ? '700' : '500',
                          },
                        ]}
                      >
                        {h}س
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.pickerLabel, { color: colors.textPrimary, fontSize: typography.sm, marginBottom: spacing[2] }]}>
                یادداشت شخصی
              </Text>
              <TextInput
                style={[
                  styles.notesInputArea,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.border,
                    borderRadius: borderRadius.md,
                    color: colors.textPrimary,
                    fontSize: typography.sm,
                    padding: spacing[3],
                  },
                ]}
                placeholder="یادداشت در مورد روزت..."
                placeholderTextColor={colors.textTertiary}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </Card>
          )}

          {/* ── Save Button ───────────────────────────────────────────── */}
          <Button
            label={isPending ? 'در حال ذخیره...' : 'ثبت گزارش امروز'}
            onPress={handleSave}
            loading={isPending}
            disabled={isPending}
            size="lg"
            fullWidth
          />
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  dateText: {
    fontWeight: '500',
    marginBottom: 2,
  },
  title: {
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  cyclePill: {
    marginTop: 2,
    fontWeight: '700',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pickerLabel: {
    fontWeight: '700',
  },
  optionsRow: {
    flexDirection: 'row',
  },
  ratingOptionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  ratingValueText: {
    textAlign: 'center',
  },

  sectionSubtitle: {
    fontWeight: '700',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  symptomChip: {
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  symptomChipText: {
    textAlign: 'center',
  },

  expandToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  expandToggleText: {
    fontWeight: '600',
  },

  sleepOptionBtn: {
    flex: 1,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sleepOptionText: {
    textAlign: 'center',
  },

  notesInputArea: {
    borderWidth: 1,
    minHeight: 70,
  },

  // Saved state
  savedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  savedIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedTitle: {
    fontWeight: '800',
  },
  savedObs: {
    textAlign: 'center',
    lineHeight: 20,
  },
});
