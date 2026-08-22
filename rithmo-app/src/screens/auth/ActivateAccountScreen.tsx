import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '@hooks/useTheme';
import { Button } from '@components/ui';
import { authService } from '@api/services/authService';
import { extractErrorMessage } from '@utils/errorHandler';
import type { AuthScreenProps } from '@navigation/types';

type Props = AuthScreenProps<'ActivateAccount'>;

export default function ActivateAccountScreen() {
  const navigation = useNavigation<Props['navigation']>();
  const route      = useRoute<Props['route']>();
  const { colors, spacing, typography } = useTheme();

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const { uid, token } = route.params;
    authService.activate({ uid, token })
      .then(() => setStatus('success'))
      .catch((err) => {
        setErrorMsg(extractErrorMessage(err));
        setStatus('error');
      });
  }, [route.params]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, padding: spacing[6] }]}>
      {status === 'loading' && (
        <>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.text, { color: colors.textSecondary, fontSize: typography.base, marginTop: spacing[4] }]}>
            در حال فعال‌سازی حساب…
          </Text>
        </>
      )}

      {status === 'success' && (
        <>
          <Text style={{ fontSize: 64 }}>🎉</Text>
          <Text style={[styles.title, { color: colors.textPrimary, fontSize: typography['2xl'], fontWeight: '700', marginTop: spacing[4] }]}>
            حساب فعال شد!
          </Text>
          <Text style={[styles.text, { color: colors.textSecondary, fontSize: typography.base, marginTop: spacing[2] }]}>
            حسابت آماده است. وارد شو تا شروع کنی.
          </Text>
          <Button label="ورود" onPress={() => navigation.navigate('Login')} fullWidth size="lg" style={{ marginTop: spacing[8] }} />
        </>
      )}

      {status === 'error' && (
        <>
          <Text style={{ fontSize: 64 }}>❌</Text>
          <Text style={[styles.title, { color: colors.textPrimary, fontSize: typography['2xl'], fontWeight: '700', marginTop: spacing[4] }]}>
            فعال‌سازی ناموفق بود
          </Text>
          <Text style={[styles.text, { color: colors.textSecondary, fontSize: typography.base, marginTop: spacing[2] }]}>
            {errorMsg}
          </Text>
          <Button label="بازگشت به ورود" onPress={() => navigation.navigate('Login')} variant="outline" fullWidth style={{ marginTop: spacing[8] }} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title:     { textAlign: 'center' },
  text:      { textAlign: 'center', lineHeight: 22 },
});
