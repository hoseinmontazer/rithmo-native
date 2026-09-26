import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Card, PressScale } from '@components/ui';
import { useTheme } from '@hooks/useTheme';
import { typography } from '@theme/typography';

interface Props {
  onPress: () => void;
}

/**
 * Today 2.1's one clear primary entry point for the adaptive check-in —
 * deliberately separate from `QuickCheckInWidget` (still routes into the
 * existing QuickLogScreen form, unchanged) and from `CheckInPrompt`
 * (the existing passive yes/no nudge, unchanged — see
 * docs/features/today-2.1-design.md Decision 1). This card never
 * duplicates either; it is the one additional, unambiguous way in.
 *
 * Deliberately stateless/static (no query of its own) — whether today's
 * session is already complete is AdaptiveCheckInScreen's own concern,
 * read fresh from the server the moment it opens. Adding a second
 * session query here just to pre-decide this button's label would be
 * exactly the kind of unnecessary API call the Phase D brief asks to
 * avoid, for a state that is about to be re-fetched a screen later
 * anyway.
 */
export const DailyCheckInCard = memo(function DailyCheckInCard({ onPress }: Props) {
  const { colors, spacing, borderRadius } = useTheme();

  return (
    <PressScale onPress={onPress} accessibilityRole="button" accessibilityLabel="شروع چک‌این روزانه">
      <Card
        style={{ marginTop: spacing[4] }}
        rounded="xl"
      >
        <View style={styles.row}>
          <View style={[styles.iconWrap, { backgroundColor: colors.primaryLighter, borderRadius: borderRadius.pill }]}>
            <Icon name="message-text-outline" size={22} color={colors.primaryDark} />
          </View>
          <View style={styles.textCol}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>چک‌این روزانه</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              یه سؤال کوتاه در مورد امروزت
            </Text>
          </View>
          <Icon name="chevron-left" size={22} color={colors.textTertiary} />
        </View>
      </Card>
    </PressScale>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  textCol: { flex: 1, marginStart: 12 },
  title: { fontSize: typography.body, fontWeight: '700' },
  subtitle: { fontSize: typography.micro, fontWeight: '500', marginTop: 2 },
});
