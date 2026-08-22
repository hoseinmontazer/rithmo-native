/**
 * EditProfileScreen
 *
 * Editable fields
 *   - first_name, last_name, sex            (personal info)
 *   - preferred_cycle_length  15–60 days    (cycle preferences, female/other only)
 *   - preferred_period_duration  1–15 days
 *
 * Legacy fields (cycle_length, period_duration) are shown read-only when present.
 * API: PATCH /api/user/profile/
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@hooks/useTheme';
import { useProfile, usePatchProfile } from '@hooks/queries/useProfile';
import { Button, Input, Card, LoadingState, StepperInput } from '@components/ui';
import { extractErrorMessage } from '@utils/errorHandler';
import { toFa } from '@utils/persian';
import type { ProfileScreenProps } from '@navigation/types';

type Props = ProfileScreenProps<'EditProfile'>;
type Sex = 'female' | 'male' | 'other';

const SEX_OPTIONS: { value: Sex; label: string; emoji: string }[] = [
  { value: 'female', label: 'زن',   emoji: '♀' },
  { value: 'male',   label: 'مرد',  emoji: '♂' },
  { value: 'other',  label: 'سایر', emoji: '⚧' },
];

// Validation bounds
const CYCLE_MIN = 15;
const CYCLE_MAX = 60;
const PERIOD_MIN = 1;
const PERIOD_MAX = 15;

// ── Section label ──────────────────────────────────────────────────────────────
function SectionLabel({ label }: { label: string }) {
  const { colors, spacing, typography } = useTheme();
  return (
    <Text
      style={{
        color: colors.textSecondary,
        fontSize: typography.xs,
        fontWeight: '700',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        marginBottom: spacing[2],
        marginTop: spacing[1],
      }}
    >
      {label}
    </Text>
  );
}

// ── Read-only info row ─────────────────────────────────────────────────────────
function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  const { colors, spacing, typography } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing[3],
      }}
    >
      <Text style={{ color: colors.textSecondary, fontSize: typography.sm }}>{label}</Text>
      <Text style={{ color: colors.textPrimary, fontSize: typography.sm, fontWeight: '600' }}>
        {value}
      </Text>
    </View>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────
export default function EditProfileScreen() {
  const navigation = useNavigation<Props['navigation']>();
  const { colors, spacing, typography, borderRadius } = useTheme();
  const { data: profile, isLoading } = useProfile();
  const { mutateAsync: patchProfile, isPending } = usePatchProfile();

  const [form, setForm] = useState({
    first_name:                '',
    last_name:                 '',
    sex:                       'female' as Sex,
    preferred_cycle_length:    28,
    preferred_period_duration: 5,
  });

  const [errors, setErrors] = useState<{
    preferred_cycle_length?: string;
    preferred_period_duration?: string;
  }>({});

  // Populate from server on load
  useEffect(() => {
    if (!profile) { return; }
    setForm({
      first_name: profile.first_name ?? '',
      last_name:  profile.last_name  ?? '',
      sex:        profile.sex        ?? 'female',
      // Preferred fields take priority; fall back to legacy for seeding
      preferred_cycle_length:
        profile.preferred_cycle_length    ??
        profile.cycle_length              ??
        28,
      preferred_period_duration:
        profile.preferred_period_duration ??
        profile.period_duration           ??
        5,
    });
  }, [profile]);

  const set = useCallback(
    <K extends keyof typeof form>(key: K, value: typeof form[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    },
    [],
  );

  const validate = useCallback((): boolean => {
    const next: typeof errors = {};
    if (form.sex !== 'male') {
      if (form.preferred_cycle_length < CYCLE_MIN || form.preferred_cycle_length > CYCLE_MAX) {
        next.preferred_cycle_length = `باید بین ${toFa(CYCLE_MIN)} تا ${toFa(CYCLE_MAX)} روز باشد`;
      }
      if (
        form.preferred_period_duration < PERIOD_MIN ||
        form.preferred_period_duration > PERIOD_MAX
      ) {
        next.preferred_period_duration = `باید بین ${toFa(PERIOD_MIN)} تا ${toFa(PERIOD_MAX)} روز باشد`;
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [form]);

  const handleSave = useCallback(async () => {
    if (!validate()) { return; }
    try {
      await patchProfile({
        first_name: form.first_name || undefined,
        last_name:  form.last_name  || undefined,
        sex:        form.sex,
        ...(form.sex !== 'male' && {
          preferred_cycle_length:    form.preferred_cycle_length,
          preferred_period_duration: form.preferred_period_duration,
        }),
      });
      navigation.goBack();
    } catch (err) {
      Alert.alert('خطا', extractErrorMessage(err));
    }
  }, [form, validate, patchProfile, navigation]);

  if (isLoading) { return <LoadingState fullScreen />; }

  const isMale = form.sex === 'male';

  // Legacy analytics values (read-only if present and different from preferred)
  const hasLegacyCycle =
    profile?.cycle_length != null &&
    profile.cycle_length !== form.preferred_cycle_length;
  const hasLegacyPeriod =
    profile?.period_duration != null &&
    profile.period_duration !== form.preferred_period_duration;

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ padding: spacing[5], paddingBottom: spacing[12] }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Personal Info ──────────────────────────────────────────── */}
        <SectionLabel label="اطلاعات شخصی" />
        <Card style={{ marginBottom: spacing[5] }}>
          <Input
            label="نام"
            value={form.first_name}
            onChangeText={(v) => set('first_name', v)}
            placeholder="نام خود را وارد کن"
            leftIconName="account-outline"
            containerStyle={{ marginBottom: spacing[4] }}
          />
          <Input
            label="نام خانوادگی"
            value={form.last_name}
            onChangeText={(v) => set('last_name', v)}
            placeholder="نام خانوادگی خود را وارد کن"
            leftIconName="account-outline"
          />
        </Card>

        {/* ── Sex ────────────────────────────────────────────────────── */}
        <SectionLabel label="جنسیت" />
        <Card style={{ marginBottom: spacing[5] }}>
          <View style={{ flexDirection: 'row', gap: spacing[2] }}>
            {SEX_OPTIONS.map((opt) => {
              const selected = form.sex === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => set('sex', opt.value)}
                  activeOpacity={0.8}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={{
                    flex: 1,
                    alignItems: 'center',
                    paddingVertical: spacing[3],
                    borderRadius: borderRadius.lg,
                    borderWidth: 1.5,
                    borderColor: selected ? colors.primary : colors.border,
                    backgroundColor: selected ? colors.primaryLight : colors.surface,
                  }}
                >
                  <Text style={{ fontSize: 20, marginBottom: 4 }}>{opt.emoji}</Text>
                  <Text
                    style={{
                      color: selected ? colors.primary : colors.textSecondary,
                      fontSize: typography.sm,
                      fontWeight: selected ? '700' : '400',
                    }}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* ── Cycle Preferences — hidden for male ────────────────────── */}
        {!isMale && (
          <>
            <SectionLabel label="ترجیحات چرخه" />
            <Card style={{ marginBottom: spacing[3] }}>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: typography.xs,
                  lineHeight: 18,
                  marginBottom: spacing[4],
                }}
              >
                طول معمولی چرخه و دوره‌ات را مشخص کن. این به شخصی‌سازی پیش‌بینی‌ها کمک می‌کند.
              </Text>

              <StepperInput
                label="طول ترجیحی چرخه"
                value={form.preferred_cycle_length}
                min={CYCLE_MIN}
                max={CYCLE_MAX}
                unit="روز"
                hint={`محدوده‌ی طبیعی: ${toFa(CYCLE_MIN)} تا ${toFa(CYCLE_MAX)} روز`}
                error={errors.preferred_cycle_length}
                onChange={(v) => set('preferred_cycle_length', v)}
              />

              <View style={{ height: spacing[4] }} />

              <StepperInput
                label="مدت ترجیحی دوره"
                value={form.preferred_period_duration}
                min={PERIOD_MIN}
                max={PERIOD_MAX}
                unit="روز"
                hint={`محدوده‌ی طبیعی: ${toFa(PERIOD_MIN)} تا ${toFa(PERIOD_MAX)} روز`}
                error={errors.preferred_period_duration}
                onChange={(v) => set('preferred_period_duration', v)}
              />
            </Card>

            {/* ── Legacy analytics (read-only) — shown when different ── */}
            {(hasLegacyCycle || hasLegacyPeriod) && (
              <>
                <Text
                  style={{
                    color: colors.textTertiary,
                    fontSize: typography.xs,
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: 0.6,
                    marginBottom: spacing[2],
                    marginTop: spacing[2],
                  }}
                >
                  تحلیل‌ها (فقط خواندنی)
                </Text>
                <Card
                  style={{
                    marginBottom: spacing[5],
                    borderStyle: 'dashed',
                    borderColor: colors.border,
                  }}
                >
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: typography.xs,
                      marginBottom: spacing[2],
                      lineHeight: 16,
                    }}
                  >
                    محاسبه‌شده از دوره‌های ثبت‌شده‌ات. قابل ویرایش نیست.
                  </Text>
                  {hasLegacyCycle && (
                    <ReadOnlyRow
                      label="میانگین طول چرخه"
                      value={`${toFa(profile!.cycle_length)} روز`}
                    />
                  )}
                  {hasLegacyPeriod && (
                    <ReadOnlyRow
                      label="میانگین مدت دوره"
                      value={`${toFa(profile!.period_duration)} روز`}
                    />
                  )}
                </Card>
              </>
            )}
          </>
        )}

        <Button
          label="ذخیره تغییرات"
          onPress={handleSave}
          loading={isPending}
          fullWidth
          size="lg"
        />
        <Button
          label="انصراف"
          onPress={() => navigation.goBack()}
          variant="ghost"
          fullWidth
          style={{ marginTop: spacing[3] }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
