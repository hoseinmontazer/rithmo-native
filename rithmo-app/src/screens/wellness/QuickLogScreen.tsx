/**
 * QuickLogScreen — ثبت امروز
 *
 * Core experience: 3 emoji-pickers (Mood, Energy, Pain) + optional expander.
 * Target time: 15–20 seconds to complete core fields.
 *
 * After save, shows a contextual observation if data exists.
 * Never fabricates an insight when there is insufficient evidence.
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
import { extractErrorMessage } from '@utils/errorHandler';
import type { WellnessScreenProps } from '@navigation/types';

type Props = WellnessScreenProps<'QuickLog'>;

// ── Emoji option set ──────────────────────────────────────────────────────────

const MOOD_OPTIONS = [
  { value: 1, emoji: '😞', label: 'خیلی بد' },
  { value: 2, emoji: '😕', label: 'بد' },
  { value: 3, emoji: '😐', label: 'معمولی' },
  { value: 4, emoji: '🙂', label: 'خوب' },
  { value: 5, emoji: '😊', label: 'عالی' },
];

const ENERGY_OPTIONS = [
  { value: 1, emoji: '😴', label: 'بی‌حال' },
  { value: 2, emoji: '🥱', label: 'کم' },
  { value: 3, emoji: '😌', label: 'متوسط' },
  { value: 4, emoji: '🙂', label: 'خوب' },
  { value: 5, emoji: '⚡', label: 'پرانرژی' },
];

const PAIN_OPTIONS = [
  { value: 0, emoji: '✅', label: 'بدون درد' },
  { value: 1, emoji: '🟡', label: 'کم' },
  { value: 2, emoji: '🟠', label: 'متوسط' },
  { value: 3, emoji: '🔴', label: 'زیاد' },
  { value: 4, emoji: '💢', label: 'خیلی زیاد' },
];

// ── Emoji picker ──────────────────────────────────────────────────────────────

interface EmojiPickerProps {
  label: string;
  options: typeof MOOD_OPTIONS;
  value: number;
  onChange: (v: number) => void;
  accentColor: string;
}

function EmojiPicker({ label, options, value, onChange, accentColor }: EmojiPickerProps) {
  const { colors, typography, spacing } = useTheme();
  const selected = options.find(o => o.value === value);

  return (
    <View style={{ marginBottom: spacing[6] }}>
      <View style={styles.pickerHeader}>
        <Text style={[styles.pickerLabel, { color: colors.textSecondary, fontSize: typography.sm }]}>
          {label}
        </Text>
        {selected && (
          <Text style={[styles.pickerSelected, { color: accentColor, fontSize: typography.sm }]}>
            {selected.label}
          </Text>
        )}
      </View>
      <View style={styles.emojiRow}>
        {options.map(opt => {
          const isSelected = opt.value === value;
          return (
            <TouchableOpacity
              key={opt.value}
              onPress={() => onChange(opt.value)}
              activeOpacity={0.7}
              style={[
                styles.emojiBtn,
                {
                  backgroundColor: isSelected ? accentColor + '20' : colors.surface,
                  borderColor: isSelected ? accentColor : colors.border,
                  borderWidth: isSelected ? 2 : 1,
                },
              ]}
              accessibilityLabel={`${label}: ${opt.label}`}
            >
              <Text style={styles.emoji}>{opt.emoji}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ── Post-log observation ──────────────────────────────────────────────────────
// Deterministic engine — never invents insight from insufficient data.

type DataState = 'empty' | 'building' | 'one_cycle' | 'multi_cycle';

function deriveDataState(periodCount: number, logCount: number): DataState {
  if (periodCount === 0 && logCount < 3) { return 'empty'; }
  if (logCount < 5 || periodCount === 0)  { return 'building'; }
  if (periodCount === 1)                  { return 'one_cycle'; }
  return 'multi_cycle';
}

function buildPostLogObservation(
  dataState: DataState,
  todayMood: number,
  todayEnergy: number,
  avgMood: number | null,
  avgEnergy: number | null,
  cycleDay: number | null,
): string | null {
  if (dataState === 'empty') {
    return 'ثبت شد. ریتمو شروع می‌کنه به شناخت تو.';
  }
  if (dataState === 'building') {
    return 'ثبت شد. داریم الگو را می‌سازیم.';
  }

  // One cycle or more: can surface real observations
  const observations: string[] = [];

  if (avgMood !== null && avgEnergy !== null) {
    const moodDiff  = todayMood   - avgMood;
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

// ── Sleep stepper ─────────────────────────────────────────────────────────────

const SLEEP_OPTIONS = [4, 5, 6, 7, 8, 9, 10];

function SleepStepper({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const { colors, typography, spacing } = useTheme();
  return (
    <View style={{ marginBottom: spacing[5] }}>
      <Text style={[styles.pickerLabel, { color: colors.textSecondary, fontSize: typography.sm, marginBottom: spacing[2] }]}>
        خواب (ساعت)
      </Text>
      <View style={styles.emojiRow}>
        {SLEEP_OPTIONS.map(h => {
          const sel = h === value;
          return (
            <TouchableOpacity
              key={h}
              onPress={() => onChange(h)}
              style={[
                styles.sleepBtn,
                {
                  backgroundColor: sel ? colors.primary + '20' : colors.surface,
                  borderColor: sel ? colors.primary : colors.border,
                  borderWidth: sel ? 2 : 1,
                },
              ]}
            >
              <Text style={{ fontSize: typography.sm, color: sel ? colors.primary : colors.textSecondary, fontWeight: sel ? '700' : '400' }}>
                {h}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function QuickLogScreen() {
  const navigation = useNavigation<Props['navigation']>();
  const route      = useRoute<Props['route']>();
  const { colors, spacing, typography } = useTheme();

  const logId = route.params?.logId;

  const { data: existing }      = useWellnessLog(logId ?? 0);
  const { data: todayLog }      = useTodayWellnessLog();
  const { data: allLogs }       = useWellnessLogs();
  const { data: periods }       = usePeriods();
  const { data: cycleAnalysis } = useCycleAnalysis();
  const { mutateAsync: saveLog, isPending } = useCreateOrUpdateWellnessLog();

  // Use today's existing log if no logId provided
  const prefillSource = logId ? existing : (todayLog ?? existing);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [mood,    setMood]    = useState(3);
  const [energy,  setEnergy]  = useState(3);
  const [pain,    setPain]    = useState(0);
  const [sleep,   setSleep]   = useState(7);
  const [notes,   setNotes]   = useState('');
  const [expanded, setExpanded] = useState(false);

  // ── Post-save observation state ─────────────────────────────────────────────
  const [observation, setObservation] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Pre-fill from existing log
  useEffect(() => {
    if (prefillSource) {
      setMood(Math.min(5, Math.max(1, Math.round(prefillSource.mood_level || 3))));
      // energy_level is 1–10 in backend; map to 1–5 for display
      setEnergy(Math.min(5, Math.max(1, Math.round((prefillSource.energy_level || 5) / 2))));
      // pain_level 0–10 → 0–4 for display
      setPain(Math.min(4, Math.max(0, Math.round((prefillSource.pain_level || 0) / 2.5))));
      setSleep(Math.round(prefillSource.sleep_hours || 7));
      setNotes(prefillSource.notes || '');
    }
  }, [prefillSource]);

  // ── Derived data-state ──────────────────────────────────────────────────────
  const periodCount = Array.isArray(periods) ? (periods as any[]).length : 0;
  const logCount    = Array.isArray(allLogs)  ? (allLogs  as any[]).length : 0;
  const dataState   = deriveDataState(periodCount, logCount);

  // Personal averages from all logs (last 30 days)
  const personalAvgMood = logCount >= 5
    ? (allLogs as any[]).slice(0, 30).reduce((s: number, l: any) => s + (l.mood_level || 3), 0)
      / Math.min(30, logCount)
    : null;
  const personalAvgEnergy = logCount >= 5
    ? (allLogs as any[]).slice(0, 30).reduce((s: number, l: any) => s + ((l.energy_level || 5) / 2), 0)
      / Math.min(30, logCount)
    : null;

  const cycleDay: number | null = (cycleAnalysis as any)?.current_status?.cycle_day ?? null;

  // ── Save handler ────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    try {
      await saveLog({
        mood_level:        mood,
        energy_level:      energy * 2,          // scale 1–5 → 2–10 for backend
        pain_level:        Math.round(pain * 2.5), // scale 0–4 → 0–10
        sleep_hours:       sleep,
        notes,
        // Pass through defaults for other fields the backend requires
        stress_level:      5,
        anxiety_level:     3,
        focus_level:       5,
        exercise_minutes:  0,
        nutrition_quality: 3,
        caffeine_intake:   0,
        alcohol_intake:    0,
        smoking:           0,
      });

      const obs = buildPostLogObservation(
        dataState,
        mood,
        energy,
        personalAvgMood,
        personalAvgEnergy,
        cycleDay,
      );
      setObservation(obs);
      setSaved(true);

      // Fade in observation
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 400, useNativeDriver: true,
      }).start();

      // Navigate back after 1.8s
      setTimeout(() => {
        if (navigation.canGoBack()) {
          navigation.goBack();
        }
      }, 1800);

    } catch (err) {
      Alert.alert('خطا', extractErrorMessage(err));
    }
  }, [
    mood, energy, pain, sleep, notes,
    saveLog, dataState, personalAvgMood, personalAvgEnergy, cycleDay,
    fadeAnim, navigation,
  ]);

  // ── Saved state UI ──────────────────────────────────────────────────────────
  if (saved) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
        <View style={styles.savedContainer}>
          <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
            <View style={[styles.savedIcon, { backgroundColor: colors.primaryLight }]}>
              <Icon name="check-circle" size={48} color={colors.primary} />
            </View>
            <Text style={[styles.savedTitle, { color: colors.textPrimary, fontSize: typography.xl }]}>
              ثبت شد
            </Text>
            {observation && (
              <Text style={[styles.savedObs, { color: colors.textSecondary, fontSize: typography.base }]}>
                {observation}
              </Text>
            )}
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  // ── Today's date header ─────────────────────────────────────────────────────
  const today = new Date();
  const dateStr = today.toLocaleDateString('fa-IR', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  const cycleContext = cycleDay
    ? `روز ${cycleDay} سیکل`
    : null;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: spacing[5], paddingBottom: spacing[12] }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Header ──────────────────────────────────────────────── */}
          <View style={[styles.header, { paddingTop: spacing[4], marginBottom: spacing[6] }]}>
            <View>
              <Text style={[styles.dateText, { color: colors.textTertiary, fontSize: typography.sm }]}>
                {dateStr}
              </Text>
              <Text style={[styles.title, { color: colors.textPrimary, fontSize: typography['2xl'] }]}>
                ثبت امروز
              </Text>
              {cycleContext && (
                <Text style={[styles.cyclePill, { color: colors.primary, fontSize: typography.sm }]}>
                  {cycleContext}
                </Text>
              )}
            </View>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={[styles.closeBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              accessibilityLabel="بستن"
            >
              <Icon name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* ── Context note ─────────────────────────────────────────── */}
          <Text style={[styles.contextNote, { color: colors.textTertiary, fontSize: typography.sm, marginBottom: spacing[6] }]}>
            این ثبت به ریتمو کمک می‌کند الگوی شخصی تو را دقیق‌تر کند.
          </Text>

          {/* ── Core fields ──────────────────────────────────────────── */}
          <EmojiPicker
            label="خلق"
            options={MOOD_OPTIONS}
            value={mood}
            onChange={setMood}
            accentColor={colors.luteal}
          />

          <EmojiPicker
            label="انرژی"
            options={ENERGY_OPTIONS}
            value={energy}
            onChange={setEnergy}
            accentColor={colors.ovulationColor}
          />

          <EmojiPicker
            label="درد"
            options={PAIN_OPTIONS}
            value={pain}
            onChange={setPain}
            accentColor={colors.menstrual}
          />

          {/* ── Expand / Collapse ─────────────────────────────────────── */}
          <TouchableOpacity
            onPress={() => setExpanded(v => !v)}
            style={[styles.expandBtn, { borderColor: colors.border }]}
            activeOpacity={0.7}
          >
            <Icon
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.textSecondary}
            />
            <Text style={{ color: colors.textSecondary, fontSize: typography.sm, marginLeft: 6 }}>
              {expanded ? 'بستن جزئیات' : 'افزودن خواب / یادداشت'}
            </Text>
          </TouchableOpacity>

          {/* ── Optional expanded fields ──────────────────────────────── */}
          {expanded && (
            <View style={{ marginTop: spacing[4] }}>
              <SleepStepper value={sleep} onChange={setSleep} />

              <Text style={[styles.pickerLabel, { color: colors.textSecondary, fontSize: typography.sm, marginBottom: 8 }]}>
                یادداشت
              </Text>
              <TextInput
                style={[
                  styles.notesInput,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.textPrimary,
                    fontSize: typography.base,
                  },
                ]}
                placeholder="هر چیزی که می‌خوای یادداشت کنی..."
                placeholderTextColor={colors.textTertiary}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          )}

          {/* ── Save button ───────────────────────────────────────────── */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={isPending}
            style={[
              styles.saveBtn,
              {
                backgroundColor: colors.primary,
                opacity: isPending ? 0.6 : 1,
                marginTop: spacing[6],
              },
            ]}
            activeOpacity={0.85}
          >
            {isPending ? (
              <Text style={[styles.saveBtnText, { color: '#fff', fontSize: typography.base }]}>
                در حال ذخیره...
              </Text>
            ) : (
              <Text style={[styles.saveBtnText, { color: '#fff', fontSize: typography.base }]}>
                ذخیره
              </Text>
            )}
          </TouchableOpacity>
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
  dateText: { opacity: 0.6, marginBottom: 2 },
  title: { fontWeight: '800', letterSpacing: -0.5 },
  cyclePill: { marginTop: 4, fontWeight: '600' },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },

  contextNote: {
    lineHeight: 20,
    opacity: 0.7,
  },

  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  pickerLabel: {
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pickerSelected: { fontWeight: '700' },

  emojiRow: {
    flexDirection: 'row',
    gap: 8,
  },
  emojiBtn: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    maxHeight: 60,
  },
  emoji: { fontSize: 26 },

  sleepBtn: {
    flex: 1,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },

  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: 10,
    marginTop: 4,
  },

  notesInput: {
    borderWidth: 1,
    borderRadius: 4,
    padding: 12,
    minHeight: 80,
    marginBottom: 8,
  },

  saveBtn: {
    borderRadius: 4,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Saved state
  savedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  savedIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  savedTitle: { fontWeight: '800', letterSpacing: -0.5, marginBottom: 12, textAlign: 'center' },
  savedObs: { lineHeight: 24, textAlign: 'center', opacity: 0.75 },
});
