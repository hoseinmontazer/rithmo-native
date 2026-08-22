/**
 * QuickLogScreen — ثبت امروز
 *
 * A beautiful one-minute check-in (mission: "How do you feel today?").
 * Flow: mood (big emoji) → energy → pain → sleep → symptoms → notes → save
 * → completion celebration with an honest personal observation.
 *
 * Preserves ALL payload fields, scales, prefill, and observation logic.
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
  useWellnessAnalytics,
  useWellnessStreaks,
} from '@hooks/queries/useWellness';
import { usePeriods, useCycleAnalysis } from '@hooks/queries/usePeriods';
import { Button, Card, Badge, CelebrationAnimation } from '@components/ui';
import { extractErrorMessage } from '@utils/errorHandler';
import { toFa, faDate } from '@utils/persian';
import { track } from '@analytics';
import { MOODS } from '@utils/insightsEngine';
import { QUICK_SYMPTOMS, parseSymptomCodes } from '@constants/symptoms';
import { symptomIcon, ICON_SIZE } from '@design-system/iconography';
import type { WellnessScreenProps } from '@navigation/types';

type Props = WellnessScreenProps<'QuickLog'>;

// ── Rating option sets (energy / pain — mood now uses the shared MOODS) ─────

interface RatingOption {
  value: number;
  label: string;
  shortLabel: string;
  iconName?: string;
}

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

// Canonical codes + Persian labels, shared with the server's vocabulary.
// This screen used to hold its own private list of raw Persian display
// strings; the server now stores stable codes, so "سردرد" logged here and
// "headache" logged from the period screen count as the SAME symptom in
// the pattern engine instead of two unrelated ones.
const COMMON_SYMPTOMS = QUICK_SYMPTOMS;

/** Window the "your usual" baseline describes. */
const BASELINE_WINDOW_DAYS = 30;

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
    return 'ریتمو شروع می‌کنه به شناخت تو.';
  }
  if (dataState === 'building') {
    return 'داریم الگو را می‌سازیم — چند روز دیگر صبر کن.';
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
    return 'امروز هم ثبت شد. 🌸';
  }

  return observations[0];
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function QuickLogScreen() {
  const navigation = useNavigation<Props['navigation']>();
  const route = useRoute<Props['route']>();
  const { colors, spacing, typography, borderRadius } = useTheme();

  const logId = route.params?.logId;

  const { data: existing } = useWellnessLog(logId ?? 0);
  const { data: todayLog } = useTodayWellnessLog();
  /*
   * Personal baselines for the "today vs your usual" line.
   *
   * This used to fetch the last 30 full log rows — 15 827 bytes — and reduce
   * them client-side to two averages and a count. `/api/wellness/analytics/`
   * computes exactly those averages in SQL and answers in 907 bytes, and
   * `/api/wellness/streaks/` carries the honest lifetime total in 114 bytes.
   * Same numbers, ~94% less transferred, and no metric maths duplicated
   * between the client and the server.
   *
   * One deliberate semantic change: the baseline is now the last 30 *days*
   * rather than the last 30 *entries*. For a daily logger they are the same
   * window; for a sparse logger "your usual" should mean recent life, not a
   * span that might reach back a year. `useWellnessAnalytics` already maps
   * the endpoint's 404-on-no-data to `null`.
   */
  const { data: analytics } = useWellnessAnalytics(BASELINE_WINDOW_DAYS);
  const { data: streaks } = useWellnessStreaks();
  const { data: periods } = usePeriods();
  const { data: cycleAnalysis } = useCycleAnalysis();
  const { mutateAsync: saveLog, isPending } = useCreateOrUpdateWellnessLog();

  const prefillSource = logId ? existing : (todayLog ?? existing);

  // Behavioural only: whether this is an edit, never what is being logged.
  useEffect(() => {
    track('daily_log_opened', { is_edit: Boolean(logId) });
  }, [logId]);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [mood, setMood] = useState(3);
  const [energy, setEnergy] = useState(3);
  const [pain, setPain] = useState(0);
  const [sleep, setSleep] = useState(7);
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

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
      // Prefer the server's canonical code list; fall back to parsing the
      // comma string (which older builds and older rows still send).
      const codes = prefillSource.symptom_codes?.length
        ? prefillSource.symptom_codes
        : parseSymptomCodes(prefillSource.symptoms);
      if (codes.length) {
        setSelectedSymptoms(codes);
      }
    }
  }, [prefillSource]);

  // ── Derived data-state ──────────────────────────────────────────────────────
  const periodCount = Array.isArray(periods) ? (periods as unknown[]).length : 0;

  /** Every log the user has, not just those inside the baseline window. */
  const logCount = typeof streaks?.total_logs === 'number' ? streaks.total_logs : 0;
  const dataState = deriveDataState(periodCount, logCount);

  /*
   * The comparison is only shown once there is enough of a baseline to be
   * worth comparing against — the same >= 5 threshold as before, but now
   * counted over the logs the averages were actually computed from, so the
   * sentence and its evidence describe the same set of days.
   */
  const baselineCount = analytics?.period?.logs_count ?? 0;
  const hasBaseline = baselineCount >= 5;

  const personalAvgMood = hasBaseline && typeof analytics?.averages?.mood_level === 'number'
    ? analytics.averages.mood_level
    : null;
  // The picker works on a 1-5 scale; the stored metric is 0-10.
  const personalAvgEnergy = hasBaseline && typeof analytics?.averages?.energy_level === 'number'
    ? analytics.averages.energy_level / 2
    : null;

  const cycleDay: number | null = (cycleAnalysis as any)?.current_status?.cycle_day ?? null;

  const toggleSymptom = useCallback((sym: string) => {
    setSelectedSymptoms(prev =>
      prev.includes(sym) ? prev.filter(s => s !== sym) : [...prev, sym]
    );
  }, []);

  const goBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  }, [navigation]);

  // ── Save handler ────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    try {
      // Only send fields the user actually entered. The server applies model
      // defaults for the rest (audit 2026-08-20, H1 — no fabricated values).
      await saveLog({
        mood_level: mood,
        energy_level: energy * 2,
        pain_level: Math.round(pain * 2.5),
        sleep_hours: sleep,
        symptoms: selectedSymptoms.join(','),
        notes,
      });

      // COUNT of fields and a boolean for symptoms — never the values.
      // The whole point of the contract is that telemetry can answer "did
      // she finish the log" without knowing anything about her body.
      track('daily_log_submitted', {
        field_count: 4 + (notes ? 1 : 0),
        had_symptoms: selectedSymptoms.length > 0,
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
        goBack();
      }, 2200);
    } catch (err) {
      Alert.alert('خطا', extractErrorMessage(err));
    }
  }, [
    mood, energy, pain, sleep, selectedSymptoms, notes,
    saveLog, dataState, personalAvgMood, personalAvgEnergy,
    fadeAnim, goBack,
  ]);

  // ── Saved state UI (with completion celebration) ────────────────────────────
  if (saved) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
        <CelebrationAnimation
          visible={saved}
          onDismiss={goBack}
          title="ثبت شد 🌸"
          message={observation ?? undefined}
          type="success"
        />
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
            <TouchableOpacity
              onPress={goBack}
              style={{
                alignItems: 'center',
                borderWidth: 1,
                backgroundColor: colors.surfaceSecondary,
                borderColor: colors.border,
                borderRadius: borderRadius.md,
                marginTop: spacing[4],
                paddingHorizontal: spacing[5],
                paddingVertical: spacing[2],
              }}
              accessibilityLabel="بستن"
            >
              <Text style={{ color: colors.textPrimary, fontSize: typography.sm, fontWeight: '600' }}>
                بستن
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  // ── Date header ─────────────────────────────────────────────────────────────
  const dateStr = faDate(new Date());

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
              <Text style={[styles.subTitle, { color: colors.textSecondary, fontSize: typography.bodySmall, marginTop: 2 }]}>
                فقط یک دقیقه — امروز چطور احساس می‌کنی؟
              </Text>
              {cycleDay != null && (
                <View
                  style={[
                    styles.cycleChip,
                    {
                      backgroundColor: colors.primaryLighter,
                      borderColor: colors.primaryLight,
                      borderRadius: borderRadius.pill,
                    },
                  ]}
                >
                  <Text style={{ color: colors.primary, fontSize: typography.xs, fontWeight: '700' }}>
                    روز {toFa(cycleDay)} چرخه
                  </Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              onPress={goBack}
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

          {/* ── Mood: big emoji row ─────────────────────────────────── */}
          <Card elevated={false} style={{ padding: spacing[4], marginBottom: spacing[4] }}>
            <Text style={[styles.pickerLabel, { color: colors.textPrimary, fontSize: typography.sm, marginBottom: spacing[3] }]}>
              خلق
            </Text>
            <View style={[styles.moodRow, { gap: spacing[2] }]}>
              {MOODS.map((m) => {
                const isSelected = m.level === mood;
                return (
                  <TouchableOpacity
                    key={m.level}
                    onPress={() => setMood(m.level)}
                    activeOpacity={0.75}
                    style={[
                      styles.moodBtn,
                      {
                        borderRadius: borderRadius.lg,
                        backgroundColor: isSelected ? colors.primaryLighter : colors.surfaceSecondary,
                        borderColor: isSelected ? colors.primary : colors.borderSubtle,
                        borderWidth: isSelected ? 1.5 : 1,
                        transform: [{ scale: isSelected ? 1.04 : 1 }],
                      },
                    ]}
                    accessibilityLabel={`خلق: ${m.label}`}
                    accessibilityState={{ selected: isSelected }}
                  >
                    <Text
                      style={{
                        fontSize: isSelected ? 30 : 26,
                        opacity: isSelected ? 1 : 0.75,
                      }}
                    >
                      {m.emoji}
                    </Text>
                    <Text
                      style={[
                        styles.moodLabel,
                        {
                          color: isSelected ? colors.primary : colors.textTertiary,
                          fontSize: typography.overline,
                          fontWeight: isSelected ? '700' : '500',
                        },
                      ]}
                    >
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>

          {/* ── Energy + Pain ───────────────────────────────────────── */}
          <Card elevated={false} style={{ padding: spacing[4], marginBottom: spacing[4] }}>
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

          {/* ── Sleep (promoted — core field, not hidden) ───────────── */}
          <View style={{ marginBottom: spacing[4] }}>
            <Text style={[styles.sectionSubtitle, { color: colors.textPrimary, fontSize: typography.sm, marginBottom: spacing[2] }]}>
              خواب دیشب (ساعت)
            </Text>
            <View style={[styles.chipWrap, { gap: spacing[2] }]}>
              {SLEEP_OPTIONS.map(h => {
                const sel = h === sleep;
                return (
                  <TouchableOpacity
                    key={h}
                    onPress={() => setSleep(h)}
                    activeOpacity={0.7}
                    style={[
                      styles.sleepChip,
                      {
                        borderRadius: borderRadius.pill,
                        backgroundColor: sel ? colors.primary + '18' : colors.surfaceSecondary,
                        borderColor: sel ? colors.primary : colors.border,
                        borderWidth: sel ? 1.5 : 1,
                      },
                    ]}
                    accessibilityLabel={`خواب ${toFa(h)} ساعت`}
                    accessibilityState={{ selected: sel }}
                  >
                    <Text
                      style={[
                        styles.sleepChipText,
                        {
                          color: sel ? colors.primary : colors.textSecondary,
                          fontSize: typography.xs,
                          fontWeight: sel ? '700' : '500',
                        },
                      ]}
                    >
                      {toFa(h)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Symptom chips (with emoji) ──────────────────────────── */}
          <View style={{ marginBottom: spacing[4] }}>
            <Text style={[styles.sectionSubtitle, { color: colors.textPrimary, fontSize: typography.sm, marginBottom: spacing[2] }]}>
              علائم شایع امروز
            </Text>
            <View style={[styles.chipWrap, { gap: spacing[2] }]}>
              {COMMON_SYMPTOMS.map(sym => {
                const active = selectedSymptoms.includes(sym.code);
                return (
                  <TouchableOpacity
                    key={sym.code}
                    onPress={() => toggleSymptom(sym.code)}
                    activeOpacity={0.7}
                    style={[
                      styles.symptomChip,
                      {
                        borderRadius: borderRadius.pill,
                        backgroundColor: active ? colors.primary + '18' : colors.surfaceSecondary,
                        borderColor: active ? colors.primary : colors.border,
                        borderWidth: active ? 1.5 : 1,
                        paddingHorizontal: spacing[3],
                        paddingVertical: spacing[1],
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={sym.label}
                  >
                    {/*
                      Icon + label, never icon alone. Selection is carried by
                      border weight, background and font weight as well as
                      colour, so the state does not depend on colour vision.
                    */}
                    <Icon
                      name={symptomIcon(sym.code)}
                      size={ICON_SIZE.xs}
                      color={active ? colors.primary : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.symptomChipText,
                        {
                          color: active ? colors.primary : colors.textSecondary,
                          fontSize: typography.xs,
                          fontWeight: active ? '700' : '500',
                          marginRight: 6,
                        },
                      ]}
                    >
                      {sym.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Notes (optional, compact) ───────────────────────────── */}
          <View style={{ marginBottom: spacing[4] }}>
            <Text style={[styles.sectionSubtitle, { color: colors.textPrimary, fontSize: typography.sm, marginBottom: spacing[2] }]}>
              یادداشت <Text style={{ color: colors.textTertiary }}>(اختیاری)</Text>
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
          </View>

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
  subTitle: {
    marginTop: 4,
    lineHeight: 18,
  },
  cycleChip: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
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

  moodRow: {
    flexDirection: 'row',
  },
  moodBtn: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    borderWidth: 1,
  },
  moodLabel: {
    textAlign: 'center',
  },

  sectionSubtitle: {
    fontWeight: '700',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  sleepChip: {
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  sleepChipText: {
    textAlign: 'center',
  },
  symptomChip: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  symptomChipText: {
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
