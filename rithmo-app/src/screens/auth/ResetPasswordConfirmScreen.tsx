import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, KeyboardAvoidingView,
  Platform, StyleSheet, Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '@hooks/useTheme';
import { Button, Input } from '@components/ui';
import { authService } from '@api/services/authService';
import { extractErrorMessage } from '@utils/errorHandler';
import type { AuthScreenProps } from '@navigation/types';

type Props = AuthScreenProps<'ResetPasswordConfirm'>;

export default function ResetPasswordConfirmScreen() {
  const navigation = useNavigation<Props['navigation']>();
  const route = useRoute<Props['route']>();
  const { colors, spacing, typography } = useTheme();

  const [form, setForm] = useState({
    new_password: '',
    re_new_password: '',
  });
  const [errors, setErrors] = useState<Partial<typeof form>>({});
  const [loading, setLoading] = useState(false);

  const set = useCallback(<K extends keyof typeof form>(key: K, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }, []);

  const validate = useCallback((): boolean => {
    const next: Partial<typeof form> = {};
    if (!form.new_password) {next.new_password = 'Password is required';}
    if (form.new_password.length < 8) {next.new_password = 'Minimum 8 characters';}
    if (form.new_password !== form.re_new_password) {
      next.re_new_password = 'Passwords do not match';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [form]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) {return;}
    setLoading(true);
    try {
      const { uid, token } = route.params;
      await authService.resetPasswordConfirm({
        uid,
        token,
        new_password: form.new_password,
        re_new_password: form.re_new_password,
      });
      Alert.alert('Success', 'Password reset successfully!', [
        { text: 'Sign In', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (err) {
      Alert.alert('Error', extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [form, validate, route.params, navigation]);

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: spacing[6], paddingTop: spacing[16] }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={{ fontSize: 48, textAlign: 'center' }}>🔐</Text>

        <Text style={[styles.title, { color: colors.textPrimary, fontSize: typography['2xl'], fontWeight: '700', marginTop: spacing[4], marginBottom: spacing[2] }]}>
          Set New Password
        </Text>

        <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: typography.base, marginBottom: spacing[6] }]}>
          Choose a strong password with at least 8 characters.
        </Text>

        <Input
          label="New Password"
          value={form.new_password}
          onChangeText={(v) => set('new_password', v)}
          isPassword
          error={errors.new_password}
          leftIconName="lock-closed-outline"
          containerStyle={{ marginBottom: spacing[4] }}
        />

        <Input
          label="Confirm Password"
          value={form.re_new_password}
          onChangeText={(v) => set('re_new_password', v)}
          isPassword
          error={errors.re_new_password}
          leftIconName="lock-closed-outline"
          containerStyle={{ marginBottom: spacing[6] }}
        />

        <Button
          label="Reset Password"
          onPress={handleSubmit}
          loading={loading}
          fullWidth
          size="lg"
        />

        <Button
          label="Back to Login"
          onPress={() => navigation.navigate('Login')}
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
  scroll: { flexGrow: 1 },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center' },
});
