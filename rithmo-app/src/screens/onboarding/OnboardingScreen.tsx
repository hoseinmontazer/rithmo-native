/**
 * OnboardingScreen — role-first post-registration setup
 *
 * Step 1 asks WHO this Rhythmo is for:
 *   - Cycle owner  → classic 4 steps (intent, regularity, symptoms,
 *     first period date → creates the first Period record)
 *   - Partner      → one intro step about the partner experience and
 *     privacy defaults, then straight into the app
 *
 * On completion the screen persists:
 *   - server profile: user_role ('owner'|'partner') + onboarding_completed
 *   - local: AsyncStorage 'onboarding_complete' = '1' and
 *     'onboarding_role' = 'owner'|'partner'
 *
 * Design:
 *   - No sliders, no long forms
 *   - One question per screen
 *   - Progress indicator shows which step
 *   - All questions are optional except Step 4 (period date)
 *     — skipping is gracefully handled
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@hooks/useTheme';
import { useCreatePeriod } from '@hooks/queries/usePeriods';
import { profileService } from '@api/services/profileService';
import { formatDateISO } from '@utils/dateUtils';
import type { UpdateProfileRequest } from '@types/profile.types';
import { ONBOARDING_ROLE_KEY } from '@hooks/useRole';
import { track } from '@analytics';

const ONBOARDING_KEY = 'onboarding_complete';

type OnboardingRole = 'owner' | 'partner';

// ── Step option picker ────────────────────────────────────────────────────────

interface OptionItemProps {
  label: string;
  /** MaterialCommunityIcons name. Was an emoji until F-07 — see below. */
  icon: string;
  selected: boolean;
  onPress: () => void;
  accent: string;
  sub?: string;
}

function OptionItem({ label, icon, selected, onPress, accent, sub }: OptionItemProps) {
  const { colors, typography, borderRadius } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.option,
        {
          backgroundColor: selected ? colors.primaryLighter : colors.surface,
          borderColor: selected ? accent : colors.border,
          borderWidth: selected ? 2 : 1,
          borderRadius: borderRadius.xl,
        },
      ]}
    >
      {/* Onboarding is the first screen a new user sees, and every option
          here was an emoji — drawn by the handset's emoji font, immune to the
          theme, and inconsistent with the icon family used everywhere else. */}
      <Icon
        name={icon}
        size={24}
        color={selected ? accent : colors.textSecondary}
        style={styles.optionIcon}
      />
      <View style={{ flex: 1 }}>
        <Text style={[styles.optionLabel, { color: colors.textPrimary, fontSize: typography.base }]}>
          {label}
        </Text>
        {sub ? (
          <Text style={[styles.optionSub, { color: colors.textSecondary, fontSize: typography.sm }]}>
            {sub}
          </Text>
        ) : null}
      </View>
      {selected && (
        <View style={[styles.checkDot, { backgroundColor: accent, borderRadius: borderRadius.pill }]}>
          <Icon name="check" size={12} color={colors.textOnPrimary} />
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

// ── Period date options ───────────────────────────────────────────────────────

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
  const { colors, spacing, typography, borderRadius } = useTheme();
  const { mutateAsync: createPeriod } = useCreatePeriod();

  const [role, setRole] = useState<OnboardingRole | null>(null);

  useEffect(() => { track('onboarding_started'); }, []);
  const [step, setStep] = useState(1);
  const [intent, setIntent] = useState<string | null>(null);
  const [regularity, setRegularity] = useState<string | null>(null);
  const [hasSymptoms, setHasSymptoms] = useState<string | null>(null);
  const [periodDaysAgo, setPeriodDaysAgo] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;

  const totalSteps = role === 'partner' ? 2 : 5;

  const goToNextStep = useCallback(() => {
    // Fade out
    Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setStep(s => s + 1);
      // Fade in
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    });
  }, [fadeAnim]);

  const finish = useCallback(async (finalRole: OnboardingRole, createFirstPeriod: boolean, periodAgo: number | null) => {
    setSaving(true);
    try {
      // 1. Persist role + onboarding preferences to UserProfile.
      const profileUpdates: UpdateProfileRequest = {
        user_role: finalRole,
        onboarding_completed: true,
      };
      if (finalRole === 'owner') {
        if (intent) profileUpdates.onboarding_intent = intent;
        if (regularity) profileUpdates.onboarding_regularity = regularity;
        if (hasSymptoms) profileUpdates.onboarding_symptoms = hasSymptoms;
      }
      try {
        await profileService.patchProfile(profileUpdates);
      } catch {
        // Non-blocking: ensure onboarding completes even if the patch fails.
      }

      // 2. Create the first period record (owners only).
      if (createFirstPeriod && periodAgo !== null) {
        const startDate = daysAgoToISO(periodAgo);
        await createPeriod({ start_date: startDate });
      }
      await AsyncStorage.multiSet([
        [ONBOARDING_KEY, '1'],
        [ONBOARDING_ROLE_KEY, finalRole],
      ]);
      track('onboarding_completed', { role: finalRole });
      onComplete();
    } catch (err) {
      // Period creation may fail if a period already exists — that's fine.
      await AsyncStorage.multiSet([
        [ONBOARDING_KEY, '1'],
        [ONBOARDING_ROLE_KEY, finalRole],
      ]);
      onComplete();
    } finally {
      setSaving(false);
    }
  }, [intent, regularity, hasSymptoms, createPeriod, onComplete]);

  const handleComplete = useCallback(() => {
    if (role === 'partner') {
      // Partner path: no cycle data of their own is created.
      finish('partner', false, null);
    } else {
      finish('owner', true, periodDaysAgo);
    }
  }, [role, periodDaysAgo, finish]);

  const handleSkip = useCallback(async () => {
    // Skipping keeps the user on the default (owner) experience.
    await AsyncStorage.multiSet([
      [ONBOARDING_KEY, '1'],
      [ONBOARDING_ROLE_KEY, 'owner'],
    ]);
    onComplete();
  }, [onComplete]);

  const accent = colors.primary;
  const ctaLabel = role === 'partner' && step === 2 ? 'شروع ریتمو' : 'ادامه';

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* Progress + Skip */}
      <View style={[styles.topBar, { paddingHorizontal: spacing[5], paddingTop: spacing[4] }]}>
        <ProgressDots current={step} total={totalSteps} accent={accent} />
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

          {/* ── Step 1: Role (who is this for?) ─────────────────────────── */}
          {step === 1 && (
            <View>
              <Text style={[styles.stepQ, { color: colors.textPrimary, fontSize: typography['2xl'] }]}>
                ریتمو برای چه کسی است؟
              </Text>
              <Text style={[styles.stepSub, { color: colors.textSecondary, fontSize: typography.base }]}>
                با این انتخاب، تجربه‌ات را می‌سازیم.
              </Text>
              <View style={{ gap: 10, marginTop: spacing[6] }}>
                <OptionItem
                  label="خودم — چرخه‌ی خودم را ردیابی می‌کنم"
                  sub="ثبت دوره، پیش‌بینی و درک بدنم"
                  icon="human-female"
                  selected={role === 'owner'}
                  onPress={() => { setRole('owner'); setStep(2); }}
                  accent={accent}
                />
                <OptionItem
                  label="شریکم — می‌خواهم چرخه‌ی شریکم را دنبال کنم"
                  sub="دنبال‌کردن چرخه‌ی شریکت، فقط با اجازه‌ی خودش"
                  icon="account-multiple-outline"
                  selected={role === 'partner'}
                  onPress={() => { setRole('partner'); setStep(2); }}
                  accent={accent}
                />
              </View>
            </View>
          )}

          {/* ── Partner intro (partner path, step 2) ────────────────────── */}
          {step === 2 && role === 'partner' && (
            <View>
              <Text style={[styles.stepQ, { color: colors.textPrimary, fontSize: typography['2xl'] }]}>
                تجربه‌ی شریک در ریتمو
              </Text>
              <Text style={[styles.stepSub, { color: colors.textSecondary, fontSize: typography.base }]}>
                تو فقط آن‌چه شریکت برای اشتراک‌گذاری فعال کرده می‌بیند. کنترل همیشه دست خودش است.
              </Text>
              <View style={{ gap: 10, marginTop: spacing[6] }}>
                <OptionItem label="وضعیت دوره — فقط اگر شریکت فعال کند" icon="calendar-outline" selected={false} onPress={() => {}} accent={accent} />
                <OptionItem label="پیش‌بینی‌ها — اختیاری، طبق تنظیمات شریکت" icon="chart-timeline-variant" selected={false} onPress={() => {}} accent={accent} />
                <OptionItem label="داده‌های حساس بدون اجازه نمایش داده نمی‌شوند" icon="shield-lock-outline" selected={false} onPress={() => {}} accent={accent} />
              </View>
              <Text style={[styles.stepSub, { color: colors.textTertiary, fontSize: typography.sm, marginTop: spacing[5] }]}>
                بعداً می‌توانی شریکت را دعوت کنی و لینک بسازی.
              </Text>
            </View>
          )}

          {/* ── Owner step 2: Intent ─────────────────────────────────────── */}
          {step === 2 && role === 'owner' && (
            <View>
              <Text style={[styles.stepQ, { color: colors.textPrimary, fontSize: typography['2xl'] }]}>
                چرا ریتمو را نصب کردی؟
              </Text>
              <Text style={[styles.stepSub, { color: colors.textSecondary, fontSize: typography.base }]}>
                این کمک می‌کند تجربه‌ات شخصی‌تر بشه.
              </Text>
              <View style={{ gap: 10, marginTop: spacing[6] }}>
                {[
                  { value: 'understand_cycle', icon: 'magnify', label: 'بهتر بشناسم چرخه خودم را' },
                  { value: 'track_symptoms', icon: 'chart-box-outline', label: 'علائم تکراری‌ام را دنبال کنم' },
                  { value: 'predict_period',  icon: 'calendar-outline', label: 'دوره بعدی‌ام را پیش‌بینی کنم' },
                  { value: 'mood_energy',     icon: 'lightning-bolt-outline', label: 'خلق و انرژی‌ام را بفهمم' },
                  { value: 'curiosity',       icon: 'sprout-outline', label: 'فقط کنجکاوم' },
                ].map(opt => (
                  <OptionItem
                    key={opt.value}
                    label={opt.label}
                    icon={opt.icon}
                    selected={intent === opt.value}
                    onPress={() => setIntent(opt.value)}
                    accent={accent}
                  />
                ))}
              </View>
            </View>
          )}

          {/* ── Owner step 3: Regularity ─────────────────────────────────── */}
          {step === 3 && role === 'owner' && (
            <View>
              <Text style={[styles.stepQ, { color: colors.textPrimary, fontSize: typography['2xl'] }]}>
                چرخه‌ی ماهانه‌ات معمولا‌ چقدر منظم است؟
              </Text>
              <Text style={[styles.stepSub, { color: colors.textSecondary, fontSize: typography.base }]}>
                بر اساس تجربه خودت پاسخ بده.
              </Text>
              <View style={{ gap: 10, marginTop: spacing[6] }}>
                {[
                  { value: 'very_regular',   icon: 'check-circle-outline', label: 'خیلی منظم — تقریبا‌ همیشه ۲۸ روز' },
                  { value: 'mostly_regular', icon: 'circle-half-full', label: 'نسبتا‌ منظم — چند روز تفاوت دارد' },
                  { value: 'irregular',      icon: 'chart-timeline-variant', label: 'نامنظم — خیلی متغیر است' },
                  { value: 'unknown',        icon: 'help-circle-outline', label: 'نمی‌دانم' },
                ].map(opt => (
                  <OptionItem
                    key={opt.value}
                    label={opt.label}
                    icon={opt.icon}
                    selected={regularity === opt.value}
                    onPress={() => setRegularity(opt.value)}
                    accent={accent}
                  />
                ))}
              </View>
            </View>
          )}

          {/* ── Owner step 4: Symptoms ───────────────────────────────────── */}
          {step === 4 && role === 'owner' && (
            <View>
              <Text style={[styles.stepQ, { color: colors.textPrimary, fontSize: typography['2xl'] }]}>
                هر ماه علائم یا احساسات تکراری داری؟
              </Text>
              <Text style={[styles.stepSub, { color: colors.textSecondary, fontSize: typography.base }]}>
                مثل خستگی، تحریک‌پذیری، یا درد خاص.
              </Text>
              <View style={{ gap: 10, marginTop: spacing[6] }}>
                {[
                  { value: 'yes_noticeable',  icon: 'chart-line-variant', label: 'بله — قابل توجه است' },
                  { value: 'yes_subtle',      icon: 'chart-line', label: 'بله — ولی خیلی مشخص نیست' },
                  { value: 'no',              icon: 'equal', label: 'نه، معمولا‌ یکنواخت است' },
                  { value: 'not_sure',        icon: 'help-circle-outline', label: 'مطمئن نیستم' },
                ].map(opt => (
                  <OptionItem
                    key={opt.value}
                    label={opt.label}
                    icon={opt.icon}
                    selected={hasSymptoms === opt.value}
                    onPress={() => setHasSymptoms(opt.value)}
                    accent={accent}
                  />
                ))}
              </View>
            </View>
          )}

          {/* ── Owner step 5: Last period date ───────────────────────────── */}
          {step === 5 && role === 'owner' && (
            <View>
              <Text style={[styles.stepQ, { color: colors.textPrimary, fontSize: typography['2xl'] }]}>
                آخرین دوره‌ات چه وقت شروع شد؟
              </Text>
              <Text style={[styles.stepSub, { color: colors.textSecondary, fontSize: typography.base }]}>
                ریتمو از اینجا شروع می‌کند به محاسبه‌ی چرخه‌ات.
              </Text>
              <View style={{ gap: 8, marginTop: spacing[6] }}>
                {DAYS_AGO_OPTIONS.map(opt => (
                  <OptionItem
                    key={opt.days}
                    label={opt.label}
                    icon={opt.days === 0 ? 'calendar-today' : 'calendar-outline'}
                    selected={periodDaysAgo === opt.days}
                    onPress={() => setPeriodDaysAgo(opt.days)}
                    accent={accent}
                  />
                ))}
              </View>
              <TouchableOpacity
                onPress={() => { setPeriodDaysAgo(null); finish('owner', true, null); }}
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
        {step < totalSteps ? (
          <TouchableOpacity
            onPress={goToNextStep}
            disabled={step === 1 && role === null}
            style={[styles.nextBtn, { backgroundColor: accent, borderRadius: borderRadius.xl, opacity: step === 1 && role === null ? 0.45 : 1 }]}
            activeOpacity={0.87}
          >
            <Text style={[styles.nextBtnText, { color: colors.textOnPrimary, fontSize: typography.base }]}>
              ادامه
            </Text>
            <Icon name="arrow-left" size={18} color={colors.textOnPrimary} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleComplete}
            disabled={saving}
            style={[styles.nextBtn, { backgroundColor: accent, borderRadius: borderRadius.xl, opacity: saving ? 0.6 : 1 }]}
            activeOpacity={0.87}
          >
            <Text style={[styles.nextBtnText, { color: colors.textOnPrimary, fontSize: typography.base }]}>
              {saving ? 'در حال ذخیره...' : ctaLabel}
            </Text>
            {!saving && <Icon name="check" size={18} color={colors.textOnPrimary} />}
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
    // Corner radius comes from the theme (borderRadius.xl) inline — the
    // scale lives in one place, theme/spacing.ts, per the design-system
    // contract test that pins it there.
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  optionIcon: { width: 24, textAlign: 'center' },
  optionLabel: {
    flex: 1,
    fontWeight: '500',
    lineHeight: 22,
  },
  optionSub: {
    lineHeight: 18,
    marginTop: 2,
  },
  checkDot: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    paddingTop: 12,
  },
  nextBtn: {
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
