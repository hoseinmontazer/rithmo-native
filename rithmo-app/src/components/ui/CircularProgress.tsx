/**
 * CircularProgress — Smooth animated circular progress ring
 *
 * Animations:
 *  • Ring draws in from 0 on mount with elastic easing
 *  • Re-animates smoothly whenever progress value changes
 *  • Subtle scale pulse when progress reaches 100%
 *  • useNativeDriver where possible, JS driver for SVG stroke
 */
import React, { memo, useEffect, useRef } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop, G } from 'react-native-svg';
import { useTheme } from '@hooks/useTheme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CircularProgressProps {
  progress: number;          // 0–100
  size?: number;
  strokeWidth?: number;
  colors?: string[];
  backgroundColor?: string;
  children?: React.ReactNode;
  animationDuration?: number;
}

export const CircularProgress = memo(function CircularProgress({
  progress,
  size = 120,
  strokeWidth = 12,
  colors: colorsProp,
  backgroundColor: backgroundColorProp,
  children,
  animationDuration = 1000,
}: CircularProgressProps) {
  const { colors: theme } = useTheme();

  // The ramp used to default to Tailwind literals (`#f43f5e`, `#fbbf24`,
  // `#22c55e`) and a flat `#f0f0f0` track — off-palette, and theme-blind: the
  // pale track stayed near-white on a dark screen. The defaults now come from
  // the app's own semantic colours, so the ring reads as low → middling →
  // good in whatever theme and brand it is drawn in.
  const colors = colorsProp ?? [theme.error, theme.warning, theme.success];
  const backgroundColor = backgroundColorProp ?? theme.surfaceSubtle;

  const radius       = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center       = size / 2;
  const clamped      = Math.min(Math.max(progress, 0), 100);

  // ── animated values ───────────────────────────────────────────────────────
  const ringAnim  = useRef(new Animated.Value(0)).current;   // 0→clamped (SVG, JS driver)
  const scaleAnim = useRef(new Animated.Value(1)).current;   // pulse (native driver)
  const prevProgress = useRef(0);

  // ── ring animation ────────────────────────────────────────────────────────
  useEffect(() => {
    // Elastic ease-out: fast start, slight overshoot, smooth settle
    Animated.timing(ringAnim, {
      toValue: clamped,
      duration: animationDuration,
      easing: Easing.out(Easing.elastic(1.1)),
      useNativeDriver: false,   // SVG props can't use native driver
    }).start(() => {
      // Pulse when complete
      if (clamped >= 100) {
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.06,
            duration: 180,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 4,
            tension: 80,
            useNativeDriver: true,
          }),
        ]).start();
      }
    });

    prevProgress.current = clamped;
  }, [clamped, animationDuration, ringAnim, scaleAnim]);

  // ── stroke dash offset ────────────────────────────────────────────────────
  const strokeDashoffset = ringAnim.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  // ── gradient colors based on progress ────────────────────────────────────
  const gradientColors =
    clamped < 34 ? [colors[0], colors[0]] :
    clamped < 67 ? [colors[0], colors[1]] :
                   [colors[1], colors[2]];

  return (
    <Animated.View
      style={[
        styles.container,
        { width: size, height: size },
        { transform: [{ scale: scaleAnim }] },
      ]}
    >
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id={`grad-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%"   stopColor={gradientColors[0]} stopOpacity="1" />
            <Stop offset="100%" stopColor={gradientColors[1]} stopOpacity="1" />
          </LinearGradient>
        </Defs>

        {/* Track */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Animated progress arc */}
        <G rotation="-90" origin={`${center}, ${center}`}>
          <AnimatedCircle
            cx={center}
            cy={center}
            r={radius}
            stroke={`url(#grad-${size})`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
          />
        </G>
      </Svg>

      {/* Center content */}
      {children && (
        <View style={styles.centerContent}>
          {children}
        </View>
      )}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
