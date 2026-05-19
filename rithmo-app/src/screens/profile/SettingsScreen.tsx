import React, { useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch,
} from 'react-native';
import { useTheme } from '@hooks/useTheme';
import { useThemeStore } from '@store/themeStore';
import {
  useNotificationPreferences,
  useSaveNotificationPreferences,
} from '@hooks/queries/useNotifications';
import { Card, Divider, LoadingState } from '@components/ui';
import type { NotificationPreferences } from '@types/notification.types';

type ThemeMode = 'light' | 'dark' | 'system';

export default function SettingsScreen() {
  const { colors, spacing, typography } = useTheme();
  const { mode, setMode } = useThemeStore();
  const { data: prefs, isLoading } = useNotificationPreferences();
  const { mutate: savePrefs } = useSaveNotificationPreferences();

  const togglePref = useCallback(
    (key: keyof NotificationPreferences, value: boolean) => {
      savePrefs({ [key]: value });
    },
    [savePrefs],
  );

  const THEME_OPTIONS: { label: string; value: ThemeMode; emoji: string }[] = [
    { label: 'Light',  value: 'light',  emoji: '☀️' },
    { label: 'Dark',   value: 'dark',   emoji: '🌙' },
    { label: 'System', value: 'system', emoji: '📱' },
  ];

  if (isLoading) return <LoadingState fullScreen />;

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: colors.background }]}
      contentContainerStyle={{ padding: spacing[5] }}
      showsVerticalScrollIndicator={false}
    >
      {/* Appearance */}
      <Card style={{ marginBottom: spacing[4] }}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: typography.base, fontWeight: '600', marginBottom: spacing[3] }]}>
          🎨  Appearance
        </Text>
        <View style={styles.themeRow}>
          {THEME_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              onPress={() => setMode(opt.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: mode === opt.value }}
              style={[
                styles.themeOption,
                {
                  borderRadius: 12,
                  padding: spacing[3],
                  borderWidth: 1.5,
                  borderColor: mode === opt.value ? colors.primary : colors.border,
                  backgroundColor: mode === opt.value ? colors.primaryLight : colors.surface,
                  flex: 1,
                  marginHorizontal: spacing[1],
                  alignItems: 'center',
                },
              ]}
            >
              <Text style={{ fontSize: 20 }}>{opt.emoji}</Text>
              <Text style={{
                color: mode === opt.value ? colors.primary : colors.textSecondary,
                fontSize: typography.xs,
                fontWeight: '600',
                marginTop: spacing[1],
              }}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {/* Push notifications */}
      <Card style={{ marginBottom: spacing[4] }}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: typography.base, fontWeight: '600', marginBottom: spacing[3] }]}>
          🔔  Push Notifications
        </Text>
        {PUSH_PREFS.map((item, i) => (
          <React.Fragment key={item.key}>
            <View style={[styles.prefRow, { paddingVertical: spacing[3] }]}>
              <View style={styles.prefLeft}>
                <Text style={{ fontSize: 16, marginRight: spacing[2] }}>{item.emoji}</Text>
                <Text style={{ color: colors.textPrimary, fontSize: typography.sm }}>{item.label}</Text>
              </View>
              <Switch
                value={prefs?.[item.key as keyof NotificationPreferences] as boolean ?? false}
                onValueChange={(v) => togglePref(item.key as keyof NotificationPreferences, v)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.surface}
                accessibilityLabel={item.label}
              />
            </View>
            {i < PUSH_PREFS.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </Card>

      {/* Email notifications */}
      <Card style={{ marginBottom: spacing[4] }}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: typography.base, fontWeight: '600', marginBottom: spacing[3] }]}>
          📧  Email Notifications
        </Text>
        {EMAIL_PREFS.map((item, i) => (
          <React.Fragment key={item.key}>
            <View style={[styles.prefRow, { paddingVertical: spacing[3] }]}>
              <View style={styles.prefLeft}>
                <Text style={{ fontSize: 16, marginRight: spacing[2] }}>{item.emoji}</Text>
                <Text style={{ color: colors.textPrimary, fontSize: typography.sm }}>{item.label}</Text>
              </View>
              <Switch
                value={prefs?.[item.key as keyof NotificationPreferences] as boolean ?? false}
                onValueChange={(v) => togglePref(item.key as keyof NotificationPreferences, v)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.surface}
                accessibilityLabel={item.label}
              />
            </View>
            {i < EMAIL_PREFS.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </Card>

      {/* App info */}
      <Card style={{ marginBottom: spacing[4] }}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: typography.base, fontWeight: '600', marginBottom: spacing[3] }]}>
          ℹ️  About
        </Text>
        <InfoRow label="Version"    value="1.0.0"              colors={colors} typography={typography} />
        <Divider style={{ marginVertical: spacing[2] }} />
        <InfoRow label="API"        value="api.rithmo.ir"      colors={colors} typography={typography} />
        <Divider style={{ marginVertical: spacing[2] }} />
        <InfoRow label="Build"      value="Production"         colors={colors} typography={typography} />
      </Card>

      <View style={{ height: spacing[8] }} />
    </ScrollView>
  );
}

function InfoRow({ label, value, colors, typography }: {
  label: string; value: string; colors: any; typography: any;
}) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ color: colors.textSecondary, fontSize: typography.sm }}>{label}</Text>
      <Text style={{ color: colors.textPrimary, fontSize: typography.sm, fontWeight: '500' }}>{value}</Text>
    </View>
  );
}

const PUSH_PREFS = [
  { key: 'push_period_reminder', label: 'Period Reminder',  emoji: '•' },
  { key: 'push_ovulation',       label: 'Ovulation Alert',  emoji: '✨' },
  { key: 'push_partner_message', label: 'Partner Messages', emoji: '💬' },
  { key: 'push_wellness_reminder', label: 'Wellness Reminder', emoji: '💚' },
];

const EMAIL_PREFS = [
  { key: 'email_period_reminder', label: 'Period Reminder',  emoji: '•' },
  { key: 'email_ovulation',       label: 'Ovulation Alert',  emoji: '✨' },
  { key: 'email_partner_message', label: 'Partner Messages', emoji: '💬' },
  { key: 'email_wellness_reminder', label: 'Wellness Reminder', emoji: '💚' },
];

const styles = StyleSheet.create({
  flex:         { flex: 1 },
  sectionTitle: {},
  themeRow:     { flexDirection: 'row', marginHorizontal: -4 },
  themeOption:  {},
  prefRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  prefLeft:     { flexDirection: 'row', alignItems: 'center', flex: 1 },
});
