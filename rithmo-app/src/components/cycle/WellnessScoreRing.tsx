/**
 * WellnessScoreRing — today's wellness score (0–100) as a calm ring.
 *
 * Subtle by design: one animated draw on mount (900ms), no loops, no
 * particles. The color band communicates state at a glance:
 *   ≥70 good (success) · 40–69 fair (warning) · <40 needs care (error)
 */
import React, { memo, useEffect, useRef } from 'react';
import { View, Text, Animated, Easing, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@hooks/useTheme';
import { toFa } from '@utils/persian';

interface WellnessScoreRingProps {
  /** 0–100 (backend wellness_score scale). */
  score: number;
  size?: number;
  /** Label under the ring, e.g. "سلامت امروز". */
  label?: string;
  showLabel?: boolean;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export const WellnessScoreRing = memo(function WellnessScoreRing({
  score,
  size = 96,
  label,
  showLabel = true,
}: WellnessScoreRingProps) {
  const { colors, typography } = useTheme();

  const clamped = Math.max(0, Math.min(100, score));
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: clamped / 100,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [clamped, progress]);

  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashoffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  const band = clamped >= 70 ? 'good' : clamped >= 40 ? 'fair' : 'low';
  const bandColor =
    band === 'good' ? colors.success : band === 'fair' ? colors.warning : colors.error;

  return (
    <View
      style={{ width: size, alignItems: 'center' }}
      accessibilityLabel={label ? `${label} ${toFa(Math.round(clamped))} از ۱۰۰` : `${toFa(Math.round(clamped))} از ۱۰۰`}
    >
      <View style={{ width: size, height: size, position: 'relative' }}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.border}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={bandColor}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashoffset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View style={styles.center}>
          <Text
            style={{
              color: bandColor,
              fontSize: Math.round(size * 0.22),
              fontWeight: '800',
              lineHeight: Math.round(size * 0.28),
            }}
          >
            {toFa(Math.round(clamped))}
            <Text style={{ fontSize: Math.round(size * 0.11), fontWeight: '600' }}>٪</Text>
          </Text>
        </View>
      </View>
      {showLabel && label ? (
        <Text
          style={[styles.label, { color: colors.textSecondary, fontSize: typography.caption, fontWeight: '600' }]}
        >
          {label}
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  label: { marginTop: 6 },
});
