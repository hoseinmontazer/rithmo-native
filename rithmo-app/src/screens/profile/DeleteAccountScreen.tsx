import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, KeyboardAvoidingView,
  Platform, StyleSheet, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@hooks/useTheme';
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
      Alert.alert('Error', 'Please enter your password');
      return;
    }

    Alert.alert(
      'Delete Account',
      'Are you absolutely sure? This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await authService.deleteAccount(password);
              Alert.alert('Account Deleted', 'Your account has been deleted.', [
                { text: 'OK', onPress: logout },
              ]);
            } catch (err) {
              Alert.alert('Error', extractErrorMessage(err));
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
        contentContainerStyle={{ padding: spacing[5] }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.warningBox, { backgroundColor: colors.error + '18', borderRadius: 16, padding: spacing[5], marginBottom: spacing[6] }]}>
          <Text style={{ fontSize: 48, textAlign: 'center', marginBottom: spacing[3] }}>⚠️</Text>
          <Text style={[styles.warningTitle, { color: colors.error, fontSize: typography.lg, fontWeight: '700', textAlign: 'center', marginBottom: spacing[2] }]}>
            Permanent Action
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: typography.sm, textAlign: 'center', lineHeight: 20 }}>
            Deleting your account will permanently remove all your data including:
          </Text>
          <View style={{ marginTop: spacing[3] }}>
            {[
              'Period tracking history',
              'Wellness logs',
              'Medications',
              'Partner connections',
              'AI suggestions',
              'All personal information',
            ].map((item) => (
              <Text key={item} style={{ color: colors.textSecondary, fontSize: typography.sm, marginTop: spacing[1] }}>
                • {item}
              </Text>
            ))}
          </View>
        </View>

        <Card style={{ marginBottom: spacing[6] }}>
          <Text style={{ color: colors.textPrimary, fontSize: typography.base, fontWeight: '600', marginBottom: spacing[3] }}>
            Confirm Deletion
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: typography.sm, marginBottom: spacing[4], lineHeight: 20 }}>
            Enter your password to confirm account deletion.
          </Text>
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            isPassword
            leftIconName="lock-closed-outline"
          />
        </Card>

        <Button
          label="Delete My Account"
          onPress={handleDelete}
          loading={loading}
          variant="danger"
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
