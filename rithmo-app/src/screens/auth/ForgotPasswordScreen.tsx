import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@hooks/useTheme';
import { Button, Input } from '@components/ui';
import { authService } from '@api/services/authService';
import { extractErrorMessage } from '@utils/errorHandler';
import type { AuthScreenProps } from '@navigation/types';

type Props = AuthScreenProps<'ForgotPassword'>;

export default function ForgotPasswordScreen() {
  const navigation = useNavigation<Props['navigation']>();
  const { colors, spacing, typography } = useTheme();

  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!email.trim()) {return;}
    setLoading(true);
    try {
      await authService.resetPassword({ email: email.trim() });
      setSent(true);
    } catch (err) {
      Alert.alert('خطا', extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [email]);

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: spacing[6], paddingTop: spacing[16] }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={{ fontSize: 48, textAlign: 'center' }}>🔑</Text>

        <Text style={[styles.title, { color: colors.textPrimary, fontSize: typography['2xl'], fontWeight: '700', marginTop: spacing[4], marginBottom: spacing[2] }]}>
          بازیابی رمز عبور
        </Text>

        {sent ? (
          <View style={[styles.successBox, { backgroundColor: colors.success + '18', borderRadius: 12, padding: spacing[5], marginTop: spacing[4] }]}>
            <Text style={{ color: colors.success, fontSize: typography.base, textAlign: 'center', lineHeight: 22 }}>
              ✅  برای لینک بازیابی رمز عبور، ایمیلت را بررسی کن.
            </Text>
            <Button label="بازگشت به ورود" onPress={() => navigation.navigate('Login')} variant="outline" fullWidth style={{ marginTop: spacing[5] }} />
          </View>
        ) : (
          <>
            <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: typography.base, marginBottom: spacing[6] }]}>
              ایمیل خود را وارد کن تا لینک بازیابی برایت بفرستیم.
            </Text>

            <Input
              label="ایمیل"
              placeholder="your@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
              containerStyle={{ marginBottom: spacing[6] }}
            />

            <Button label="ارسال لینک بازیابی" onPress={handleSubmit} loading={loading} fullWidth size="lg" />
            <Button label="بازگشت به ورود" onPress={() => navigation.goBack()} variant="ghost" fullWidth style={{ marginTop: spacing[3] }} />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex:       { flex: 1 },
  scroll:     { flexGrow: 1 },
  title:      { textAlign: 'center' },
  subtitle:   { textAlign: 'center' },
  successBox: {},
});
