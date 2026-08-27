import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@hooks/useTheme';
import { Button, Input } from '@components/ui';
import { authService } from '@api/services/authService';
import { extractErrorMessage } from '@utils/errorHandler';
import type { AuthScreenProps } from '@navigation/types';

type Props = AuthScreenProps<'ForgotPassword'>;

export default function ForgotPasswordScreen() {
  const navigation = useNavigation<Props['navigation']>();
  const { colors, spacing, typography, borderRadius } = useTheme();

  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  // Inline, clay-toned — not a native OS dialog. Same reasoning as
  // LoginScreen's error card.
  const [error, setError]     = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!email.trim()) {return;}
    setError(null);
    setLoading(true);
    try {
      await authService.resetPassword({ email: email.trim() });
      setSent(true);
    } catch (err) {
      setError(extractErrorMessage(err));
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
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: colors.primaryLighter, borderRadius: borderRadius.pill, alignSelf: 'center' },
          ]}
        >
          <Icon name="lock-reset" size={28} color={colors.primary} />
        </View>

        <Text style={[styles.title, { color: colors.textPrimary, fontSize: typography['2xl'], fontWeight: '700', marginTop: spacing[4], marginBottom: spacing[2] }]}>
          بازیابی رمز عبور
        </Text>

        {sent ? (
          <View
            style={[
              styles.successBox,
              { backgroundColor: colors.primaryLighter, borderRadius: borderRadius['2xl'], padding: spacing[5], marginTop: spacing[4] },
            ]}
          >
            <View
              style={[
                styles.successIconCircle,
                { backgroundColor: colors.primary, borderRadius: borderRadius.pill, alignSelf: 'center' },
              ]}
            >
              <Icon name="check" size={20} color={colors.textOnPrimary} />
            </View>
            <Text style={{ color: colors.textPrimary, fontSize: typography.base, fontWeight: '600', textAlign: 'center', marginTop: spacing[3] }}>
              ایمیل ارسال شد
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: typography.sm, textAlign: 'center', lineHeight: 20, marginTop: spacing[2] }}>
              صندوق ورودی‌ات را ببین. لینک تا ۱۵ دقیقه اعتبار دارد.
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
              containerStyle={{ marginBottom: error ? spacing[3] : spacing[6] }}
            />

            {error ? (
              <View
                style={[
                  styles.errorCard,
                  {
                    backgroundColor: colors.clayBg,
                    borderColor: colors.clayBorder,
                    borderWidth: 1,
                    borderRadius: borderRadius.md,
                    padding: spacing[3],
                    marginBottom: spacing[6],
                  },
                ]}
              >
                <Icon name="alert-circle-outline" size={16} color={colors.clay} />
                <Text style={{ color: colors.clay, fontSize: typography.sm, marginLeft: spacing[2], flex: 1 }}>
                  {error}
                </Text>
              </View>
            ) : null}

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
  errorCard:  { flexDirection: 'row', alignItems: 'center' },
  iconCircle: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center' },
  successIconCircle: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
