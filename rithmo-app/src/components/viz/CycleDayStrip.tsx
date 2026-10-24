/**
 * CycleDayStrip - how far through the user's AVERAGE cycle today is.
 *
 * Only two recorded numbers go in: today's cycle day and the average cycle
 * length. It does not mark ovulation, a fertile window or a period date, and
 * it says so in words ("by your average"): the bar is where today sits, not a
 * prediction. The fill grows once on mount (not at all under reduced motion).
 */
import React, { memo, useEffect, useRef } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import { useTheme } from '@hooks/useTheme';
import { useReducedMotion } from '@hooks/useReducedMotion';
import { stripFraction, stripLabel } from './cycleDayStripLogic';

interface Props {
  day: number;
  /** Average cycle length in days. */
  length: number;
  color: string;
}

export const CycleDayStrip = memo(function CycleDayStrip({ day, length, color }: Props) {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const reduced = useReducedMotion();
  const frac = stripFraction(day, length);
  const p = useRef(new Animated.Value(reduced ? frac : 0)).current;

  useEffect(() => {
    if (reduced) { p.setValue(frac); return undefined; }
    const anim = Animated.timing(p, { toValue: frac, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: false });
    anim.start();
    return () => anim.stop();
  }, [frac, reduced, p]);

  if (frac === 0) { return null; }
  const width = p.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={stripLabel(day, length)}
      accessibilityValue={{ min: 0, max: length, now: Math.min(day, length) }}
      style={{ marginTop: spacing[3] }}
    >
      <View style={{ height: 10, borderRadius: borderRadius.pill, backgroundColor: colors.surfaceSecondary, overflow: 'hidden' }}>
        <Animated.View style={{ width, height: 10, borderRadius: borderRadius.pill, backgroundColor: color }} />
      </View>
      <Text style={{ color: colors.textTertiary, fontSize: typography.caption, marginTop: spacing[2] }}>{stripLabel(day, length)}</Text>
    </View>
  );
});
