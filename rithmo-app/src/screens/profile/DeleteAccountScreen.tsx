import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, KeyboardAvoidingView,
  Platform, StyleSheet, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@hooks/useTheme';
import { screen } from '@theme/spacing';
import { useAuth } from '@hooks/useAuth';
import { Button, Input, Card } from '@components/ui';
import { authService } from '@api/services/authService';
import { extractErrorMessage } from '@utils/errorHandler';
import type { ProfileScreenProps } from '@navigation/types';

type Props = ProfileScreenProps<'DeleteAccount'>;

export default function DeleteAccountScreen() {
  const navigation = useNavigation<Props['navigation']>();
  const { colors, spacing, typography } = useTheme();
  const { logout } = useAuth();

  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDelete = useCallback(async () => {
    if (!password.trim()) {
      Alert.alert('خطا', 'لطفا رمز عبور خود را وارد کن');
      return;
    }

    Alert.alert(
      'حذف حساب کاربری',
      'مطمئن هستی؟ این عمل قابل بازگشت نیست و تمام داده‌هایت برای همیشه حذف می‌شوند.',
      [
        { text: 'انصراف', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await authService.deleteAccount(password);
              Alert.alert('حساب حذف شد', 'حساب کاربری شما حذف شد.', [
                { text: 'باشه', onPress: logout },
              ]);
            } catch (err) {
              Alert.alert('خطا', extractErrorMessage(err));
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  }, [password, logout]);

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
        <View style={[styles.warningBox, { backgroundColor: colors.error + '18', borderRadius: 16, padding: spacing[5], marginBottom: spacing[6] }]}>
          <Text style={{ fontSize: typography.giant, textAlign: 'center', marginBottom: spacing[3] }}>⚠️</Text>
          <Text style={[styles.warningTitle, { color: colors.error, fontSize: typography.lg, fontWeight: '700', textAlign: 'center', marginBottom: spacing[2] }]}>
            عملیات دائمی
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: typography.sm, textAlign: 'center', lineHeight: 20 }}>
            حذف حساب کاربری باعث حذف دائمی تمام داده‌های شما می‌شود، از جمله:
          </Text>
          <View style={{ marginTop: spacing[3] }}>
            {[
              'تاریخچه‌ی پیگیری دوره‌ها',
              'ثبت‌های سلامت',
              'داروها',
              'پیوند با شریک',
              'پیشنهادهای هوشمند',
              'تمام اطلاعات شخصی',
            ].map((item) => (
              <Text key={item} style={{ color: colors.textSecondary, fontSize: typography.sm, marginTop: spacing[1] }}>
                • {item}
              </Text>
            ))}
          </View>
        </View>

        <Card style={{ marginBottom: spacing[6] }}>
          <Text style={{ color: colors.textPrimary, fontSize: typography.base, fontWeight: '600', marginBottom: spacing[3] }}>
            تأیید حذف
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: typography.sm, marginBottom: spacing[4], lineHeight: 20 }}>
            برای تأیید حذف حساب، رمز عبور خود را وارد کن.
          </Text>
          <Input
            label="رمز عبور"
            value={password}
            onChangeText={setPassword}
            isPassword
            leftIconName="lock-outline"
          />
        </Card>

        <Button
          label="حذف حساب من"
          onPress={handleDelete}
          loading={loading}
          variant="danger"
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

        <View style={{ height: spacing[8] }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  warningBox: {},
  warningTitle: {},
});
