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
import { Button, Input, Card, LoadingState } from '@components/ui';
import { extractErrorMessage } from '@utils/errorHandler';
import type { ProfileScreenProps } from '@navigation/types';

type Props = ProfileScreenProps<'EditProfile'>;
type Sex = 'female' | 'male' | 'other';

const SEX_OPTIONS: { value: Sex; label: string; emoji: string }[] = [
  { value: 'female', label: 'Female', emoji: '♀' },
  { value: 'male',   label: 'Male',   emoji: '♂' },
  { value: 'other',  label: 'Other',  emoji: '⚧' },
];

export default function EditProfileScreen() {
  const navigation = useNavigation<Props['navigation']>();
  const { colors, spacing, typography, borderRadius } = useTheme();
  const { data: profile, isLoading } = useProfile();
  const { mutateAsync: patchProfile, isPending } = usePatchProfile();

  const [form, setForm] = useState({
    first_name:      '',
    last_name:       '',
    sex:             'female' as Sex,
    cycle_length:    '28',
    period_duration: '5',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});

  useEffect(() => {
    if (profile) {
      setForm({
        first_name:      profile.first_name      ?? '',
        last_name:       profile.last_name        ?? '',
        sex:             profile.sex              ?? 'female',
        cycle_length:    String(profile.cycle_length    ?? 28),
        period_duration: String(profile.period_duration ?? 5),
      });
    }
  }, [profile]);

  const set = useCallback(<K extends keyof typeof form>(key: K, value: typeof form[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }, []);

  const validate = useCallback((): boolean => {
    const next: Partial<Record<keyof typeof form, string>> = {};

    const cl = parseInt(form.cycle_length, 10);
    const pd = parseInt(form.period_duration, 10);

    if (form.sex !== 'male') {
      if (isNaN(cl) || cl < 21 || cl > 45) {
        next.cycle_length = 'Cycle length must be between 21 and 45 days';
      }
      if (isNaN(pd) || pd < 1 || pd > 10) {
        next.period_duration = 'Period duration must be between 1 and 10 days';
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }, [form]);

  const handleSave = useCallback(async () => {
    if (!validate()) return;

    try {
      await patchProfile({
        first_name:      form.first_name || undefined,
        last_name:       form.last_name  || undefined,
        sex:             form.sex,
        ...(form.sex !== 'male' && {
          cycle_length:    parseInt(form.cycle_length, 10),
          period_duration: parseInt(form.period_duration, 10),
        }),
      });
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', extractErrorMessage(err));
    }
  }, [form, validate, patchProfile, navigation]);

  if (isLoading) return <LoadingState fullScreen />;

  const isMale = form.sex === 'male';

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
        {/* ── Personal Info ─────────────────────────────────────────────── */}
        <SectionLabel label="Personal Info" colors={colors} spacing={spacing} typography={typography} />
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: 16,
              padding: spacing[4],
              marginBottom: spacing[5],
            },
          ]}
        >
          <Input
            label="First Name"
            value={form.first_name}
            onChangeText={(v) => set('first_name', v)}
            placeholder="Enter first name"
            containerStyle={{ marginBottom: spacing[3] }}
          />
          <Input
            label="Last Name"
            value={form.last_name}
            onChangeText={(v) => set('last_name', v)}
            placeholder="Enter last name"
          />
        </View>

        {/* ── Sex ───────────────────────────────────────────────────────── */}
        <SectionLabel label="Sex" colors={colors} spacing={spacing} typography={typography} />
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: 16,
              padding: spacing[4],
              marginBottom: spacing[5],
            },
          ]}
        >
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
        </View>

        {/* ── Cycle Settings — hidden for male ──────────────────────────── */}
        {!isMale && (
          <>
            <SectionLabel label="Cycle Settings" colors={colors} spacing={spacing} typography={typography} />
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: 16,
                  padding: spacing[4],
                  marginBottom: spacing[5],
                },
              ]}
            >
              <Input
                label="Cycle Length (days)"
                value={form.cycle_length}
                onChangeText={(v) => set('cycle_length', v)}
                keyboardType="numeric"
                placeholder="21–45"
                error={errors.cycle_length}
                containerStyle={{ marginBottom: spacing[3] }}
              />
              <Input
                label="Period Duration (days)"
                value={form.period_duration}
                onChangeText={(v) => set('period_duration', v)}
                keyboardType="numeric"
                placeholder="1–10"
                error={errors.period_duration}
              />
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: typography.xs,
                  marginTop: spacing[2],
                  lineHeight: 16,
                }}
              >
                Typical cycle: 21–35 days · Typical period: 2–7 days
              </Text>
            </View>
          </>
        )}

        <Button
          label="Save Changes"
          onPress={handleSave}
          loading={isPending}
          fullWidth
          size="lg"
        />
        <Button
          label="Cancel"
          onPress={() => navigation.goBack()}
          variant="ghost"
          fullWidth
          style={{ marginTop: spacing[3] }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SectionLabel({
  label,
  colors,
  spacing,
  typography,
}: {
  label: string;
  colors: any;
  spacing: any;
  typography: any;
}) {
  return (
    <Text
      style={{
        color: colors.textSecondary,
        fontSize: typography.xs,
        fontWeight: '700',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        marginBottom: spacing[2],
      }}
    >
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: {
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
});
