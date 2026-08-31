import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
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
  { value: 'female', label: 'زن' },
  { value: 'male',   label: 'مرد'   },
  { value: 'other',  label: 'سایر'  },
];

export default function RegisterScreen() {
  const navigation = useNavigation<Props['navigation']>();
  const { colors, spacing, typography, borderRadius } = useTheme();

  const [form, setForm] = useState({
    username: '', email: '', password: '', re_password: '', sex: 'female' as Sex,
  });
  const [errors, setErrors] = useState<Partial<typeof form>>({});
  const [loading, setLoading] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);

  const set = useCallback((key: keyof typeof form, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key]: undefined }));
  }, []);

  const validate = useCallback((): boolean => {
    const next: Partial<typeof form> = {};
    if (!form.username.trim())              {next.username    = 'نام کاربری الزامی است';}
    if (!form.email.trim())                 {next.email       = 'ایمیل الزامی است';}
    if (!form.password)                     {next.password    = 'رمز عبور الزامی است';}
    if (form.password.length < 8)           {next.password    = 'حداقل ۸ کاراکتر';}
    if (form.password !== form.re_password) {next.re_password = 'رمز عبور یکسان نیست';}
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [form]);

  const handleRegister = useCallback(async () => {
    if (!validate()) {return;}
    setRegisterError(null);
    setLoading(true);
    try {
      await authService.register(form);
      setRegistered(true);
    } catch (err) {
      setRegisterError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [form, validate]);

  const CARD_RADIUS = borderRadius['3xl'];

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      // Android's windowSoftInputMode is already `adjustResize`, so the OS
      // shrinks the window when the keyboard opens. Adding behavior="height"
      // on top of that makes KeyboardAvoidingView shrink it a SECOND time,
      // and the two compensations fight as the keyboard animates — which is
      // the visible jumping on this screen. iOS does not resize, so it still
      // needs padding.
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
            ریتمو
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: typography.sm, marginTop: 2 }}>
            حساب کاربری بساز
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
          label="نام کاربری"
          value={form.username}
          onChangeText={v => set('username', v)}
          autoCapitalize="none"
          error={errors.username}
          leftIconName="account-outline"
          containerStyle={{ marginBottom: spacing[4] }}
        />
        <Input
          label="ایمیل"
          value={form.email}
          onChangeText={v => set('email', v)}
          autoCapitalize="none"
          keyboardType="email-address"
          error={errors.email}
          leftIconName="email-outline"
          containerStyle={{ marginBottom: spacing[4] }}
        />
        <Input
          label="رمز عبور"
          value={form.password}
          onChangeText={v => set('password', v)}
          isPassword
          error={errors.password}
          leftIconName="lock-outline"
          containerStyle={{ marginBottom: spacing[4] }}
        />
        <Input
          label="تکرار رمز عبور"
          value={form.re_password}
          onChangeText={v => set('re_password', v)}
          isPassword
          error={errors.re_password}
          leftIconName="lock-outline"
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
          جنسیت
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

        {registered ? (
          <View
            style={[
              styles.successCard,
              { backgroundColor: colors.primaryLighter, borderRadius: borderRadius['2xl'], padding: spacing[4], marginBottom: spacing[4] },
            ]}
          >
            <Icon name="check-circle-outline" size={20} color={colors.primary} />
            <Text style={{ color: colors.textPrimary, fontSize: typography.sm, marginLeft: spacing[2], flex: 1 }}>
              حساب کاربری ساخته شد. برای فعال‌سازی، ایمیلت را بررسی کن.
            </Text>
          </View>
        ) : registerError ? (
          <View
            style={[
              styles.errorCard,
              {
                backgroundColor: colors.clayBg,
                borderColor: colors.clayBorder,
                borderWidth: 1,
                borderRadius: borderRadius.md,
                padding: spacing[3],
                marginBottom: spacing[4],
              },
            ]}
          >
            <Icon name="alert-circle-outline" size={16} color={colors.clay} />
            <Text style={{ color: colors.clay, fontSize: typography.sm, marginLeft: spacing[2], flex: 1 }}>
              {registerError}
            </Text>
          </View>
        ) : null}

        <Button
          label={registered ? 'رفتن به ورود' : 'ساخت حساب کاربری'}
          onPress={registered ? () => navigation.navigate('Login') : handleRegister}
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
            قبلا حساب کاربری داری؟{' '}
            <Text style={{ color: colors.primary, fontWeight: '600' }}>ورود</Text>
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
  appName:    { fontWeight: '700' },
  formCard:   { flex: 1 },
  formScroll: { flexGrow: 1 },
  sexRow:     { flexDirection: 'row' },
  sexOption:  {},
  successCard: { flexDirection: 'row', alignItems: 'center' },
  errorCard:   { flexDirection: 'row', alignItems: 'center' },
});
