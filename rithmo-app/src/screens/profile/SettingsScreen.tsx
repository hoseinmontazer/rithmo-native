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
import { Card, Divider, LoadingState, AppIcon } from '@components/ui';
import icons from '../../assets/icons';
import type { NotificationPreferences } from '@types/notification.types';

type ThemeMode = 'light' | 'dark' | 'system';

// ── Pref row with PNG icon ────────────────────────────────────────────────────

function PrefRow({
  iconSource,
  label,
  prefKey,
  value,
  onToggle,
  last,
}: {
  iconSource: ReturnType<typeof require>;
  label: string;
  prefKey: keyof NotificationPreferences;
  value: boolean;
  onToggle: (key: keyof NotificationPreferences, v: boolean) => void;
  last?: boolean;
}) {
  const { colors, spacing, typography } = useTheme();
  return (
    <>
      <View style={[styles.prefRow, { paddingVertical: spacing[3] }]}>
        <View style={styles.prefLeft}>
          {/* Icon container — no border */}
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: colors.primaryLighter,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: spacing[3],
            }}
          >
            <AppIcon source={iconSource} size={20} />
          </View>
          <Text style={{ color: colors.textPrimary, fontSize: typography.sm }}>{label}</Text>
        </View>
        <Switch
          value={value}
          onValueChange={(v) => onToggle(prefKey, v)}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.surface}
          accessibilityLabel={label}
        />
      </View>
      {!last && <Divider />}
    </>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

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

  if (isLoading) {return <LoadingState fullScreen />;}

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: colors.background }]}
      contentContainerStyle={{ padding: spacing[5] }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Appearance ───────────────────────────────────────────────── */}
      <Card style={{ marginBottom: spacing[4] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[3] }}>
          <AppIcon source={icons.settings} size={20} />
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: typography.base, fontWeight: '600' }]}>
            Appearance
          </Text>
        </View>
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

      {/* ── Push Notifications ───────────────────────────────────────── */}
      <Card style={{ marginBottom: spacing[4] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[3] }}>
          <AppIcon source={icons.pushNotification} size={20} />
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: typography.base, fontWeight: '600' }]}>
            Push Notifications
          </Text>
        </View>
        <PrefRow
          iconSource={icons.menstruation}
          label="Period Reminder"
          prefKey="push_period_reminder"
          value={prefs?.push_period_reminder ?? false}
          onToggle={togglePref}
        />
        <PrefRow
          iconSource={icons.fertilization}
          label="Ovulation Alert"
          prefKey="push_ovulation"
          value={prefs?.push_ovulation ?? false}
          onToggle={togglePref}
        />
        <PrefRow
          iconSource={icons.chat}
          label="Partner Messages"
          prefKey="push_partner_message"
          value={prefs?.push_partner_message ?? false}
          onToggle={togglePref}
        />
        <PrefRow
          iconSource={icons.wellness}
          label="Wellness Reminder"
          prefKey="push_wellness_reminder"
          value={prefs?.push_wellness_reminder ?? false}
          onToggle={togglePref}
          last
        />
      </Card>

      {/* ── Email Notifications ──────────────────────────────────────── */}
      <Card style={{ marginBottom: spacing[4] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[3] }}>
          <AppIcon source={icons.pushNotification} size={20} />
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: typography.base, fontWeight: '600' }]}>
            Email Notifications
          </Text>
        </View>
        <PrefRow
          iconSource={icons.menstruation}
          label="Period Reminder"
          prefKey="email_period_reminder"
          value={prefs?.email_period_reminder ?? false}
          onToggle={togglePref}
        />
        <PrefRow
          iconSource={icons.fertilization}
          label="Ovulation Alert"
          prefKey="email_ovulation"
          value={prefs?.email_ovulation ?? false}
          onToggle={togglePref}
        />
        <PrefRow
          iconSource={icons.chat}
          label="Partner Messages"
          prefKey="email_partner_message"
          value={prefs?.email_partner_message ?? false}
          onToggle={togglePref}
        />
        <PrefRow
          iconSource={icons.wellness}
          label="Wellness Reminder"
          prefKey="email_wellness_reminder"
          value={prefs?.email_wellness_reminder ?? false}
          onToggle={togglePref}
          last
        />
      </Card>

      {/* ── About ────────────────────────────────────────────────────── */}
      <Card style={{ marginBottom: spacing[4] }}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: typography.base, fontWeight: '600', marginBottom: spacing[3] }]}>
          About
        </Text>
        <InfoRow label="Version" value="1.0.0"         colors={colors} typography={typography} />
        <Divider style={{ marginVertical: spacing[2] }} />
        <InfoRow label="API"     value="api.rithmo.ir" colors={colors} typography={typography} />
        <Divider style={{ marginVertical: spacing[2] }} />
        <InfoRow label="Build"   value="Production"    colors={colors} typography={typography} />
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

const styles = StyleSheet.create({
  flex:         { flex: 1 },
  sectionTitle: {},
  themeRow:     { flexDirection: 'row', marginHorizontal: -4 },
  themeOption:  {},
  prefRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  prefLeft:     { flexDirection: 'row', alignItems: 'center', flex: 1 },
});
