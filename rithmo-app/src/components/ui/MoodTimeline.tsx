/**
 * MoodTimeline — visual history strip: mood dots + pain bars over the
 * last N days. Pure React Native Views (no chart dependency).
 *
 * Layout is RTL-aware: the oldest day renders first (rightmost), so the
 * timeline reads old→new in Persian reading direction. Missing days show
 * an empty ring instead of a dot (honesty: no data = no dot).
 */
import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@hooks/useTheme';
import type { WellnessLog } from '@types/wellness.types';
import { formatDateISO, addDays } from '@utils/dateUtils';
import { toFa } from '@utils/persian';
import { mood5 } from '@utils/insightsEngine';

interface MoodTimelineProps {
  logs: WellnessLog[];
  /** Window length in days (default 14). */
  days?: number;
  /** Show the pain mini-bars under the dots. */
  showPain?: boolean;
  /** Show day-number labels under some dots. */
  showLabels?: boolean;
  /** Height of the pain-bar area in px. */
  barHeight?: number;
}

export const MoodTimeline = memo(function MoodTimeline({
  logs,
  days = 14,
  showPain = true,
  showLabels = true,
  barHeight = 30,
}: MoodTimelineProps) {
  const { colors, typography } = useTheme();

  const byDate = new Map<string, WellnessLog>();
  for (const l of logs) { byDate.set(l.date, l); }

  const today = formatDateISO(new Date());
  const start = addDays(today, -(days - 1));
  const dates: string[] = [];
  for (let d = start; d <= today; d = addDays(d, 1)) { dates.push(d); }

  const moodColor = (level: number): string => {
    switch (level) {
      case 5:
      case 4: return colors.success;
      case 3: return colors.textTertiary;
      case 2: return colors.warning;
      default: return colors.error;
    }
  };

  const painColor = (pain: number): string => {
    if (pain >= 6) { return colors.error; }
    if (pain >= 3) { return colors.warning; }
    return colors.success;
  };

  return (
    <View accessibilityLabel="نمودار خلق و حال روزهای اخیر">
      <View style={styles.row}>
        {dates.map((d, i) => {
          const log = byDate.get(d);
          const m = log ? mood5(log.mood_level) : null;
          const pain = log?.pain_level ?? 0;
          const dayNum = new Date(d).getDate();
          const showLabel = showLabels && (i % 3 === 0 || i === dates.length - 1);

          return (
            <View key={d} style={styles.col}>
              <View style={[styles.barArea, { height: barHeight }]}>
                {showPain && pain > 0 ? (
                  <View
                    style={[
                      styles.painBar,
                      {
                        height: Math.max(3, (pain / 10) * barHeight),
                        backgroundColor: painColor(pain),
                      },
                    ]}
                  />
                ) : null}
              </View>
              <View style={styles.dotWrap}>
                {m !== null ? (
                  <View
                    style={{
                      width: 4 + m * 2,
                      height: 4 + m * 2,
                      borderRadius: 2 + m,
                      backgroundColor: moodColor(m),
                    }}
                    accessibilityLabel={`روز ${toFa(dayNum)}: خلق ${m} از ۵`}
                  />
                ) : (
                  <View
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: 2.5,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  />
                )}
              </View>
              <Text
                style={[styles.label, { color: colors.textTertiary, fontSize: typography.overline }]}
                numberOfLines={1}
              >
                {showLabel ? toFa(dayNum) : ''}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'stretch' },
  col: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  barArea: { width: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  painBar: { width: 5, borderRadius: 2.5 },
  dotWrap: { alignItems: 'center', justifyContent: 'center', height: 18, marginTop: 4 },
  label: { height: 14, marginTop: 2 },
});
