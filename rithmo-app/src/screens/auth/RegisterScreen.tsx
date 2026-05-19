import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@hooks/useTheme';
import { Button, Input } from '@components/ui';
import { authService } from '@api/services/authService';
import { extractErrorMessage } from '@utils/errorHandler';
import type { AuthScreenProps } from '@navigation/types';

type Props = AuthScreenProps<'Register'>;
type Sex = 'female' | 'male' | 'other';

const { height: SCREEN_H } = Dimensions.get('window');
const HERO_H = SCREEN_H * 0.22;

const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: 'female', label: 'Female' },
  { value: 'male',   label: 'Male'   },
  { value: 'other',  label: 'Other'  },
];

export default function RegisterScreen() {
  const navigation = useNavigation<Props['navigation']>();
  const { colors, spacing, typography, borderRadius } = useTheme();

  const [form, setForm] = useState({
    username: '', email: '', password: '', re_password: '', sex: 'female' as Sex,
  });
  const [errors, setErrors] = useState<Partial<typeof form>>({});
  const [loading, setLoading] = useState(false);

  const set = useCallback((key: keyof typeof form, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key]: undefined }));
  }, []);

  const validate = useCallback((): boolean => {
    const next: Partial<typeof form> = {};
    if (!form.username.trim())              next.username    = 'Username is required';
    if (!form.email.trim())                 next.email       = 'Email is required';
    if (!form.password)                     next.password    = 'Password is required';
    if (form.password.length < 8)           next.password    = 'Minimum 8 characters';
    if (form.password !== form.re_password) next.re_password = 'Passwords do not match';
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [form]);

  const handleRegister = useCallback(async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await authService.register(form);
      Alert.alert(
        'Account Created',
        'Check your email to activate your account.',
        [{ text: 'Sign In', onPress: () => navigation.navigate('Login') }],
      );
    } catch (err) {
      Alert.alert('Registration Failed', extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [form, validate, navigation]);

  const CARD_RADIUS = borderRadius['3xl'];

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* ── Mini hero ─────────────────────────────────────────────── */}
      <View
        style={[
          styles.hero,
          { height: HERO_H, backgroundColor: colors.primaryLighter },
        ]}
      >
        <View style={[styles.ring, { width: 260, height: 260, borderColor: colors.primary + '16' }]} />
        <View style={[styles.ring, { width: 160, height: 160, borderColor: colors.primary + '28' }]} />
        <View style={styles.brandBlock}>
          <Text style={[styles.appName, { color: colors.primary, fontSize: typography['2xl'] }]}>
            Rithmo
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: typography.sm, marginTop: 2 }}>
            Create your account
          </Text>
        </View>
      </View>

      {/* ── Form card ─────────────────────────────────────────────── */}
      <ScrollView
        style={[
          styles.formCard,
          {
            backgroundColor: colors.surface,
            borderTopLeftRadius: CARD_RADIUS,
            borderTopRightRadius: CARD_RADIUS,
            marginTop: -CARD_RADIUS,
          },
        ]}
        contentContainerStyle={[
          styles.formScroll,
          {
            paddingHorizontal: spacing[6],
            paddingTop: spacing[7],
            paddingBottom: spacing[12],
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Input
          label="Username"
          value={form.username}
          onChangeText={v => set('username', v)}
          autoCapitalize="none"
          error={errors.username}
          leftIconName="person-outline"
          containerStyle={{ marginBottom: spacing[4] }}
        />
        <Input
          label="Email"
          value={form.email}
          onChangeText={v => set('email', v)}
          autoCapitalize="none"
          keyboardType="email-address"
          error={errors.email}
          leftIconName="mail-outline"
          containerStyle={{ marginBottom: spacing[4] }}
        />
        <Input
          label="Password"
          value={form.password}
          onChangeText={v => set('password', v)}
          isPassword
          error={errors.password}
          leftIconName="lock-closed-outline"
          containerStyle={{ marginBottom: spacing[4] }}
        />
        <Input
          label="Confirm Password"
          value={form.re_password}
          onChangeText={v => set('re_password', v)}
          isPassword
          error={errors.re_password}
          leftIconName="lock-closed-outline"
          containerStyle={{ marginBottom: spacing[5] }}
        />

        {/* Sex selector — pill toggle row */}
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: typography.sm,
            fontWeight: '500',
            marginBottom: spacing[3],
          }}
        >
          Sex
        </Text>
        <View style={[styles.sexRow, { marginBottom: spacing[7] }]}>
          {SEX_OPTIONS.map(opt => {
            const active = form.sex === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => set('sex', opt.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                style={[
                  styles.sexOption,
                  {
                    borderRadius: 999,
                    paddingVertical: spacing[2] + 2,
                    paddingHorizontal: spacing[5],
                    borderWidth: 1.5,
                    borderColor: active ? colors.primary : colors.border,
                    backgroundColor: active ? colors.primaryLight : colors.surface,
                    marginRight: spacing[2],
                  },
                ]}
              >
                <Text
                  style={{
                    color: active ? colors.primary : colors.textSecondary,
                    fontWeight: '600',
                    fontSize: typography.sm,
                  }}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Button
          label="Create Account"
          onPress={handleRegister}
          loading={loading}
          fullWidth
          size="lg"
        />

        <TouchableOpacity
          onPress={() => navigation.navigate('Login')}
          style={{ alignSelf: 'center', marginTop: spacing[5] }}
          accessibilityRole="button"
        >
          <Text style={{ color: colors.textSecondary, fontSize: typography.sm }}>
            Already have an account?{' '}
            <Text style={{ color: colors.primary, fontWeight: '600' }}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex:       { flex: 1 },
  hero:       { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  ring:       { position: 'absolute', borderWidth: 1, borderRadius: 999 },
  brandBlock: { alignItems: 'center', zIndex: 1 },
  appName:    { fontWeight: '700', letterSpacing: -0.5 },
  formCard:   { flex: 1 },
  formScroll: { flexGrow: 1 },
  sexRow:     { flexDirection: 'row' },
  sexOption:  {},
});
