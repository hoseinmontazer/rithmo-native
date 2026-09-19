/**
 * PregnancyTimeline — «جدول زمانی بارداری» (P1.3, free — see
 * docs/DECISIONS.md DEC-005)
 *
 * Renders exactly what `/api/intelligence/pregnancy/` returns: a fixed,
 * small product timeline (started → trimester 1/2/3 → estimated due
 * date), each already labelled past/current/upcoming by the backend. No
 * date/week/trimester math happens here — this component only formats
 * values the backend already computed and sent (see
 * `intelligence.services.pregnancy_timeline_payload`'s own docstring for
 * what is and is not calculated). Deliberately a calm vertical stepper,
 * not a chart: five plain rows, no chart library, no animation.
 */
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@hooks/useTheme';
import { faDateYear } from '@utils/persian';
import type { PregnancyTimelineMilestone } from '@types/pregnancyTimeline.types';

interface Props {
  timeline: PregnancyTimelineMilestone[];
}

function StateDot({ state, color, borderColor }: { state: string; color: string; borderColor: string }) {
  const filled = state !== 'upcoming';
  return (
    <View
      style={[
        styles.dot,
        filled
          ? { backgroundColor: color, borderColor: color }
          : { backgroundColor: 'transparent', borderColor },
      ]}
    />
  );
}

export const PregnancyTimeline = memo(function PregnancyTimeline({ timeline }: Props) {
  const { colors, spacing, typography } = useTheme();

  if (timeline.length === 0) {
    return null;
  }

  return (
    <View accessibilityLabel="جدول زمانی بارداری">
      {timeline.map((milestone, i) => {
        const isLast = i === timeline.length - 1;
        const isCurrent = milestone.state === 'current';
        const isUpcoming = milestone.state === 'upcoming';
        const dotColor = isUpcoming ? colors.border : colors.primary;

        return (
          <View key={milestone.key} style={styles.row}>
            <View style={styles.connectorCol}>
              <StateDot state={milestone.state} color={dotColor} borderColor={colors.border} />
              {!isLast ? (
                <View
                  style={[
                    styles.line,
                    { backgroundColor: isUpcoming ? colors.borderSubtle : colors.primaryLight },
                  ]}
                />
              ) : null}
            </View>

            <View style={{ paddingBottom: isLast ? 0 : spacing[4], flex: 1 }}>
              <Text
                style={{
                  color: isUpcoming ? colors.textSecondary : colors.textPrimary,
                  fontSize: typography.bodySmall,
                  fontWeight: isCurrent ? '700' : '500',
                }}
              >
                {milestone.label_fa}
                {isCurrent ? ' · اکنون' : ''}
              </Text>
              {milestone.date ? (
                <Text
                  style={{
                    color: colors.textTertiary,
                    fontSize: typography.caption,
                    marginTop: 2,
                  }}
                >
                  {faDateYear(`${milestone.date}T00:00:00`)}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  connectorCol: { alignItems: 'center', width: 12 },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  line: { width: 2, flex: 1, marginTop: 4, minHeight: 20 },
});
