/**
 * TodayRecordedCard - what the user already told Rithmo today, in plain words.
 *
 * One quiet, compact card: a short "today" label, the dimensions that were
 * actually recorded (mood, energy, sleep, pain, stress, symptoms count), and -
 * only when the backend computed a real difference from yesterday - one
 * sentence about it. Renders nothing when nothing was recorded, so it can
 * never show a value the user did not give. No chart, no score, no streak.
 */
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@hooks/useTheme';
import { Card } from '@components/ui';
import { buildTodayRecorded, continuityLine } from '../todayRecorded';
import type { ContinuityPayload } from '../../../types/intelligence.types';

interface Props {
  values: Record<string, number> | null | undefined;
  symptoms: string[] | null | undefined;
  continuity?: ContinuityPayload | null;
}

export const TodayRecordedCard = memo(function TodayRecordedCard({ values, symptoms, continuity }: Props) {
  const { colors, spacing, typography } = useTheme();
  const items = buildTodayRecorded(values, symptoms);
  if (items.length === 0) { return null; }

  const line = continuityLine(continuity);
  const summary = items.map((i) => `${i.label}: ${i.value}`).join('، ');

  return (
    <View
      accessible
      accessibilityLabel={`ثبت امروز. ${summary}.${line ? ` ${line}` : ''}`}
    >
    <Card elevated={false} rounded="xl" style={{ marginTop: spacing[3], padding: spacing[3] }}>
      <Text style={{ color: colors.textTertiary, fontSize: typography.micro, fontWeight: '600' }}>
        امروز ثبت کردی
      </Text>
      <View style={styles.row}>
        {items.map((item) => (
          <Text
            key={item.key}
            style={{ color: colors.textPrimary, fontSize: typography.bodySmall, marginTop: spacing[1] }}
          >
            <Text style={{ color: colors.textSecondary }}>{`${item.label}: `}</Text>
            {item.value}
          </Text>
        ))}
      </View>
      {line ? (
        <Text
          style={{ color: colors.textSecondary, fontSize: typography.caption, marginTop: spacing[2], lineHeight: 20 }}
        >
          {line}
        </Text>
      ) : null}
    </Card>
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16 },
});
