import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, KeyboardAvoidingView,
  Platform, StyleSheet, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@hooks/useTheme';
import { screen } from '@theme/spacing';
import { Button, Input, Card } from '@components/ui';
import { authService } from '@api/services/authService';
import { extractErrorMessage } from '@utils/errorHandler';
import type { ProfileScreenProps } from '@navigation/types';

type Props = ProfileScreenProps<'ChangePassword'>;

export default function ChangePasswordScreen() {
  const navigation = useNavigation<Props['navigation']>();
  const { colors, spacing, typography } = useTheme();

  const [form, setForm] = useState({
    current_password: '',
    new_password:     '',
    re_new_password:  '',
  });
  const [errors, setErrors] = useState<Partial<typeof form>>({});
  const [loading, setLoading] = useState(false);

  const set = useCallback(<K extends keyof typeof form>(key: K, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }, []);

  const validate = useCallback((): boolean => {
    const next: Partial<typeof form> = {};
    if (!form.current_password)           {next.current_password = 'رمز عبور فعلی الزامی است';}
    if (!form.new_password)               {next.new_password     = 'رمز عبور جدید الزامی است';}
    if (form.new_password.length < 8)     {next.new_password     = 'حداقل ۸ کاراکتر';}
    if (form.new_password !== form.re_new_password) {
      next.re_new_password = 'رمز عبور یکسان نیست';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [form]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) {return;}
    setLoading(true);
    try {
      await authService.changePassword({
        current_password: form.current_password,
        new_password:     form.new_password,
        re_new_password:  form.re_new_password,
      });
      Alert.alert('موفقیت', 'رمز عبور با موفقیت تغییر کرد.', [
        { text: 'باشه', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('خطا', extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [form, validate, navigation]);

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: screen.gutter,
          paddingTop: screen.top,
          paddingBottom: screen.bottom,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: typography.base, marginBottom: spacing[6], lineHeight: 22 }]}>
          یک رمز عبور قوی با حداقل ۸ کاراکتر، شامل اعداد و نشانه‌ها انتخاب کن.
        </Text>

        <Card style={{ marginBottom: spacing[6] }}>
          <Input
            label="رمز عبور فعلی"
            value={form.current_password}
            onChangeText={(v) => set('current_password', v)}
            isPassword
            error={errors.current_password}
            containerStyle={{ marginBottom: spacing[4] }}
          />
          <Input
            label="رمز عبور جدید"
            value={form.new_password}
            onChangeText={(v) => set('new_password', v)}
            isPassword
            error={errors.new_password}
            containerStyle={{ marginBottom: spacing[4] }}
          />
          <Input
            label="تکرار رمز عبور جدید"
            value={form.re_new_password}
            onChangeText={(v) => set('re_new_password', v)}
            isPassword
            error={errors.re_new_password}
          />
        </Card>

        {/* Password strength hint */}
        {form.new_password.length > 0 && (
          <PasswordStrength password={form.new_password} colors={colors} spacing={spacing} typography={typography} />
        )}

        <Button
          label="تغییر رمز عبور"
          onPress={handleSubmit}
          loading={loading}
          fullWidth
          size="lg"
          style={{ marginTop: spacing[4] }}
        />
        <Button
          label="انصراف"
          onPress={() => navigation.goBack()}
          variant="ghost"
          fullWidth
          style={{ marginTop: spacing[3] }}
        />

        <View style={{ height: spacing[8] }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function PasswordStrength({ password, colors, spacing, typography }: {
  password: string; colors: any; spacing: any; typography: any;
}) {
  const score = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  const labels = ['ضعیف', 'متوسط', 'خوب', 'قوی'];
  const barColors = [colors.error, colors.warning, colors.info, colors.success];

  return (
    <View style={{ marginBottom: spacing[4] }}>
      <View style={{ flexDirection: 'row', gap: 4, marginBottom: spacing[1] }}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              backgroundColor: i < score ? barColors[score - 1] : colors.surfaceSecondary,
            }}
          />
        ))}
      </View>
      <Text style={{ color: score > 0 ? barColors[score - 1] : colors.textDisabled, fontSize: typography.xs, fontWeight: '600' }}>
        {score > 0 ? labels[score - 1] : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex:     { flex: 1 },
  subtitle: {},
});
