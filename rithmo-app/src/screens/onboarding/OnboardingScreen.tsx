/**
 * OnboardingScreen — 4-step post-registration setup
 *
 * Purpose:
 *   1. Capture user intent (why did they install Rhythmo)
 *   2. Assess cycle regularity self-perception
 *   3. Surface recurring symptoms awareness
 *   4. Log first period start date → creates first Period record
 *      so the user enters the app with cycle context already populated
 *
 * On completion, sets AsyncStorage key 'onboarding_complete' = '1'
 * and navigates to the main app.
 *
 * Design:
 *   - No sliders, no long forms
 *   - One question per screen
 *   - Progress indicator shows which step
 *   - All questions are optional except Step 4 (period date)
 *     — skipping is gracefully handled
 */
import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@hooks/useTheme';
import { useCreatePeriod } from '@hooks/queries/usePeriods';
import { profileService } from '@api/services/profileService';
import { formatDateISO } from '@utils/dateUtils';

const TOTAL_STEPS = 4;
const ONBOARDING_KEY = 'onboarding_complete';

// ── Step option picker ────────────────────────────────────────────────────────

interface OptionItemProps {
  label: string;
  emoji: string;
  selected: boolean;
  onPress: () => void;
  accent: string;
}

function OptionItem({ label, emoji, selected, onPress, accent }: OptionItemProps) {
  const { colors, typography } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.option,
        {
          backgroundColor: selected ? accent + '18' : colors.surface,
          borderColor: selected ? accent : colors.border,
          borderWidth: selected ? 2 : 1,
        },
      ]}
    >
      <Text style={styles.optionEmoji}>{emoji}</Text>
      <Text style={[styles.optionLabel, { color: colors.textPrimary, fontSize: typography.base }]}>
        {label}
      </Text>
      {selected && (
        <View style={[styles.checkDot, { backgroundColor: accent }]}>
          <Icon name="check" size={12} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── Step progress bar ─────────────────────────────────────────────────────────

function ProgressDots({ current, total, accent }: { current: number; total: number; accent: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.dots}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            {
              backgroundColor: i < current ? accent : colors.border,
              width: i < current ? 20 : 8,
            },
          ]}
        />
      ))}
    </View>
  );
}

// ── Step 4: date picker (simple calendar-free approach) ───────────────────────

const DAYS_AGO_OPTIONS = [
  { label: 'امروز',           days: 0 },
  { label: 'دیروز',           days: 1 },
  { label: '۲ روز پیش',       days: 2 },
  { label: '۳ روز پیش',       days: 3 },
  { label: '۵ روز پیش',       days: 5 },
  { label: '۷ روز پیش',       days: 7 },
  { label: '۱۰ روز پیش',      days: 10 },
  { label: '۱۴ روز پیش',      days: 14 },
  { label: 'بیشتر از ۲ هفته', days: 21 },
];

function daysAgoToISO(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return formatDateISO(d);
}

// ── Main screen ───────────────────────────────────────────────────────────────

interface OnboardingScreenProps {
  onComplete: () => void;
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const { colors, spacing, typography } = useTheme();
  const { mutateAsync: createPeriod } = useCreatePeriod();

  const [step, setStep] = useState(1);
  const [intent, setIntent] = useState<string | null>(null);
  const [regularity, setRegularity] = useState<string | null>(null);
  const [hasSymptoms, setHasSymptoms] = useState<string | null>(null);
  const [periodDaysAgo, setPeriodDaysAgo] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;

  const goToNextStep = useCallback(() => {
    // Fade out
    Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setStep(s => s + 1);
      // Fade in
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    });
  }, [fadeAnim]);

  const handleComplete = useCallback(async () => {
    setSaving(true);
    try {
      // 1. Persist onboarding preferences to UserProfile
      const profileUpdates: Record<string, string> = {};
      if (intent) profileUpdates.onboarding_intent = intent;
      if (regularity) profileUpdates.onboarding_regularity = regularity;
      if (hasSymptoms) profileUpdates.onboarding_symptoms = hasSymptoms;
      if (Object.keys(profileUpdates).length > 0) {
        try {
          await profileService.patchProfile(profileUpdates);
        } catch {
          // Non-blocking: ensure onboarding completes even if offline/patch fails
        }
      }

      // 2. Create the first period record if user specified when it started
      if (periodDaysAgo !== null) {
        const startDate = daysAgoToISO(periodDaysAgo);
        await createPeriod({ start_date: startDate });
      }
      await AsyncStorage.setItem(ONBOARDING_KEY, '1');
      onComplete();
    } catch (err) {
      // Period creation may fail if period already exists — that's fine
      await AsyncStorage.setItem(ONBOARDING_KEY, '1');
      onComplete();
    } finally {
      setSaving(false);
    }
  }, [intent, regularity, hasSymptoms, periodDaysAgo, createPeriod, onComplete]);

  const handleSkip = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, '1');
    onComplete();
  }, [onComplete]);

  const accent = colors.primary;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* Progress + Skip */}
      <View style={[styles.topBar, { paddingHorizontal: spacing[5], paddingTop: spacing[4] }]}>
        <ProgressDots current={step} total={TOTAL_STEPS} accent={accent} />
        <TouchableOpacity onPress={handleSkip}>
          <Text style={{ color: colors.textSecondary, fontSize: typography.sm, fontWeight: '500' }}>
            رد کردن
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing[5], paddingTop: spacing[8], paddingBottom: spacing[10] }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={{ opacity: fadeAnim }}>

          {/* ── Step 1: Intent ─────────────────────────────────────────── */}
          {step === 1 && (
            <View>
              <Text style={[styles.stepQ, { color: colors.textPrimary, fontSize: typography['2xl'] }]}>
                چرا ریتمو را نصب کردی؟
              </Text>
              <Text style={[styles.stepSub, { color: colors.textSecondary, fontSize: typography.base }]}>
                این کمک می‌کند تجربه‌ات شخصی‌تر بشه.
              </Text>
              <View style={{ gap: 10, marginTop: spacing[6] }}>
                {[
                  { value: 'understand_cycle', emoji: '🔍', label: 'بهتر بشناسم چرخه خودم را' },
                  { value: 'track_symptoms', emoji: '📊', label: 'علائم تکراری‌ام را دنبال کنم' },
                  { value: 'predict_period',  emoji: '📅', label: 'دوره بعدی‌ام را پیش‌بینی کنم' },
                  { value: 'mood_energy',     emoji: '⚡', label: 'خلق و انرژی‌ام را بفهمم' },
                  { value: 'curiosity',       emoji: '🌱', label: 'فقط کنجکاوم' },
                ].map(opt => (
                  <OptionItem
                    key={opt.value}
                    label={opt.label}
                    emoji={opt.emoji}
                    selected={intent === opt.value}
                    onPress={() => setIntent(opt.value)}
                    accent={accent}
                  />
                ))}
              </View>
            </View>
          )}

          {/* ── Step 2: Regularity ───────────────────────────────────────── */}
          {step === 2 && (
            <View>
              <Text style={[styles.stepQ, { color: colors.textPrimary, fontSize: typography['2xl'] }]}>
                سیکل ماهانه‌ات معمولاً چقدر منظم است؟
              </Text>
              <Text style={[styles.stepSub, { color: colors.textSecondary, fontSize: typography.base }]}>
                بر اساس تجربه خودت پاسخ بده.
              </Text>
              <View style={{ gap: 10, marginTop: spacing[6] }}>
                {[
                  { value: 'very_regular',   emoji: '🟢', label: 'خیلی منظم — تقریباً همیشه ۲۸ روز' },
                  { value: 'mostly_regular', emoji: '🟡', label: 'نسبتاً منظم — چند روز تفاوت دارد' },
                  { value: 'irregular',      emoji: '🟠', label: 'نامنظم — خیلی متغیر است' },
                  { value: 'unknown',        emoji: '❓', label: 'نمی‌دانم' },
                ].map(opt => (
                  <OptionItem
                    key={opt.value}
                    label={opt.label}
                    emoji={opt.emoji}
                    selected={regularity === opt.value}
                    onPress={() => setRegularity(opt.value)}
                    accent={accent}
                  />
                ))}
              </View>
            </View>
          )}

          {/* ── Step 3: Symptoms ─────────────────────────────────────────── */}
          {step === 3 && (
            <View>
              <Text style={[styles.stepQ, { color: colors.textPrimary, fontSize: typography['2xl'] }]}>
                هر ماه علائم یا احساسات تکراری داری؟
              </Text>
              <Text style={[styles.stepSub, { color: colors.textSecondary, fontSize: typography.base }]}>
                مثل خستگی، تحریک‌پذیری، یا درد خاص.
              </Text>
              <View style={{ gap: 10, marginTop: spacing[6] }}>
                {[
                  { value: 'yes_noticeable',  emoji: '📌', label: 'بله — قابل توجه است' },
                  { value: 'yes_subtle',      emoji: '🔅', label: 'بله — ولی خیلی مشخص نیست' },
                  { value: 'no',              emoji: '✨', label: 'نه، معمولاً یکنواخت است' },
                  { value: 'not_sure',        emoji: '🤔', label: 'مطمئن نیستم' },
                ].map(opt => (
                  <OptionItem
                    key={opt.value}
                    label={opt.label}
                    emoji={opt.emoji}
                    selected={hasSymptoms === opt.value}
                    onPress={() => setHasSymptoms(opt.value)}
                    accent={accent}
                  />
                ))}
              </View>
            </View>
          )}

          {/* ── Step 4: Last period date ──────────────────────────────────── */}
          {step === 4 && (
            <View>
              <Text style={[styles.stepQ, { color: colors.textPrimary, fontSize: typography['2xl'] }]}>
                آخرین دوره‌ات چه وقت شروع شد؟
              </Text>
              <Text style={[styles.stepSub, { color: colors.textSecondary, fontSize: typography.base }]}>
                ریتمو از اینجا شروع می‌کند به محاسبه سیکل.
              </Text>
              <View style={{ gap: 8, marginTop: spacing[6] }}>
                {DAYS_AGO_OPTIONS.map(opt => (
                  <OptionItem
                    key={opt.days}
                    label={opt.label}
                    emoji={opt.days === 0 ? '📍' : '📅'}
                    selected={periodDaysAgo === opt.days}
                    onPress={() => setPeriodDaysAgo(opt.days)}
                    accent={accent}
                  />
                ))}
              </View>
              <TouchableOpacity
                onPress={() => { setPeriodDaysAgo(null); handleComplete(); }}
                style={{ marginTop: 12, paddingVertical: 10, alignItems: 'center' }}
              >
                <Text style={{ color: colors.textTertiary, fontSize: typography.sm }}>
                  رد کردن این مرحله
                </Text>
              </TouchableOpacity>
            </View>
          )}

        </Animated.View>
      </ScrollView>

      {/* ── Bottom CTA ──────────────────────────────────────────────────── */}
      <View style={[styles.bottomBar, { paddingHorizontal: spacing[5], paddingBottom: spacing[8] }]}>
        {step < TOTAL_STEPS ? (
          <TouchableOpacity
            onPress={goToNextStep}
            style={[styles.nextBtn, { backgroundColor: accent }]}
            activeOpacity={0.87}
          >
            <Text style={[styles.nextBtnText, { color: '#fff', fontSize: typography.base }]}>
              ادامه
            </Text>
            <Icon name="arrow-left" size={18} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleComplete}
            disabled={saving}
            style={[styles.nextBtn, { backgroundColor: accent, opacity: saving ? 0.6 : 1 }]}
            activeOpacity={0.87}
          >
            <Text style={[styles.nextBtnText, { color: '#fff', fontSize: typography.base }]}>
              {saving ? 'در حال ذخیره...' : 'شروع ریتمو'}
            </Text>
            {!saving && <Icon name="check" size={18} color="#fff" />}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  dot: {
    height: 4,
    borderRadius: 2,
    transition: 'width 0.2s',
  },
  stepQ: {
    fontWeight: '900',
    letterSpacing: -0.5,
    lineHeight: 36,
    marginBottom: 8,
  },
  stepSub: {
    lineHeight: 22,
    opacity: 0.7,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  optionEmoji: { fontSize: 24 },
  optionLabel: {
    flex: 1,
    fontWeight: '500',
    lineHeight: 22,
  },
  checkDot: {
    width: 20,
    height: 20,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    paddingTop: 12,
  },
  nextBtn: {
    borderRadius: 4,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  nextBtnText: {
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
