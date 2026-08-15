/**
 * WellnessRing — Premium circular wellness score display
 * Features: multi-ring design, gradient glow, animated particles, premium UI
 */
import React, { memo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Stop,
  RadialGradient,
  G,
  Path,
  Ellipse,
} from 'react-native-svg';
import { useTheme } from '@hooks/useTheme';

interface WellnessRingProps {
  score: number;
  size?: number;
  showLabel?: boolean;
}

// Premium gradient colors for each score range
const SCORE_THEMES = {
  low: {
    primary: '#f43f5e',
    secondary: '#fb7185',
    glow: '#f43f5e44',
    bg: '#fff1f2',
  },
  mid: {
    primary: '#22c55e',
    secondary: '#6FCF97',
    glow: '#22c55e44',
    bg: '#f0fdf4',
  },
  high: {
    primary: '#8b5cf6',
    secondary: '#a855f7',
    glow: '#8b5cf644',
    bg: '#faf5ff',
  },
  premium: {
    primary: '#f59e0b',
    secondary: '#fbbf24',
    glow: '#f59e0b44',
    bg: '#fffbeb',
  },
};

export const WellnessRing = memo(function WellnessRing({
  score,
  size = 140,
  showLabel = true,
}: WellnessRingProps) {
  const { colors, typography } = useTheme();
  const animatedProgress = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Wellness score is 0-10, convert to 0-1 for progress
  const targetProgress = Math.min(Math.max(score / 10, 0), 1);
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Get theme based on score
  const getTheme = () => {
    if (score >= 8) return SCORE_THEMES.premium;
    if (score >= 6) return SCORE_THEMES.high;
    if (score >= 4) return SCORE_THEMES.mid;
    return SCORE_THEMES.low;
  };

  const theme = getTheme();

  // Get score color for text
  const getScoreColor = () => {
    if (score >= 8) return colors.luteal;
    if (score >= 6) return colors.ovulation;
    if (score >= 4) return colors.follicular;
    return colors.menstrual;
  };

  const scoreColor = getScoreColor();

  // Animate progress on mount
  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: targetProgress,
      duration: 1500,
      easing: Easing.out(Easing.elastic(1.2)),
      useNativeDriver: false,
    }).start();
  }, [targetProgress, animatedProgress]);

  // Pulse animation
  useEffect(() => {
    if (score > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }
  }, [score, pulseAnim]);

  // Slow rotation for ambient effect
  useEffect(() => {
    if (score > 0) {
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 15000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ).start();
    }
  }, [score, rotateAnim]);

  // Animated stroke dash offset
  const strokeDashoffset = animatedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  // Rotation interpolation
  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Glow effect background */}
      <View
        style={[
          styles.glowBg,
          {
            width: size + 20,
            height: size + 20,
            borderRadius: (size + 20) / 2,
            backgroundColor: theme.glow,
          },
        ]}
      />

      {/* Outer decorative ring */}
      <Animated.View
        style={[
          styles.decorativeRing,
          {
            width: size + 8,
            height: size + 8,
            borderRadius: (size + 8) / 2,
            transform: [{ rotate }],
          },
        ]}
      >
        <Svg width={size + 8} height={size + 8}>
          <Circle
            cx={(size + 8) / 2}
            cy={(size + 8) / 2}
            r={(size + 8 - 2) / 2}
            stroke={theme.primary + '22'}
            strokeWidth={2}
            fill="transparent"
            strokeDasharray={8}
            strokeLinecap="round"
          />
        </Svg>
      </Animated.View>

      {/* Main SVG ring */}
      <Animated.View
        style={[
          styles.ringWrapper,
          {
            transform: [{ scale: pulseAnim }],
          },
        ]}
      >
        <Svg width={size} height={size}>
          <Defs>
            <LinearGradient id="wellnessGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={theme.primary} />
              <Stop offset="100%" stopColor={theme.secondary} />
            </LinearGradient>
            <RadialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={theme.primary} stopOpacity="0.1" />
              <Stop offset="100%" stopColor={theme.primary} stopOpacity="0" />
            </RadialGradient>
          </Defs>

          {/* Background track with subtle pattern */}
          <G>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={colors.border}
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeLinecap="round"
            />
            {/* Decorative dots on track */}
            {Array.from({ length: 12 }).map((_, i) => {
              const angle = (i * 30 * Math.PI) / 180;
              const dotRadius = radius - 2;
              const x = size / 2 + dotRadius * Math.cos(angle);
              const y = size / 2 + dotRadius * Math.sin(angle);
              return (
                <Circle key={i} cx={x} cy={y} r={1.5} fill={colors.border} opacity={0.3} />
              );
            })}
          </G>

          {/* Progress circle with gradient */}
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="url(#wellnessGrad)"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
          />

          {/* Center glow */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius - strokeWidth}
            fill="url(#centerGlow)"
          />

          {/* Sparkle at progress end */}
          {score > 0 && (
            <ProgressSparkle
              size={size}
              progress={targetProgress}
              radius={radius}
              color={theme.secondary}
            />
          )}
        </Svg>
      </Animated.View>

      {/* Center content with premium styling */}
      <View style={styles.centerContent}>
        <Text
          style={[
            styles.scoreText,
            {
              color: scoreColor,
              fontSize: typography['3xl'] || 36,
              fontWeight: '800',
              letterSpacing: -1,
            },
          ]}
        >
          {score.toFixed(1)}
        </Text>
        {showLabel && (
          <Text
            style={[
              styles.labelText,
              {
                color: colors.textSecondary,
                fontSize: typography.xs,
                fontWeight: '600',
                letterSpacing: 1,
                marginTop: 4,
              },
            ]}
          >
            WELLNESS
          </Text>
        )}
      </View>
    </View>
  );
});

// Animated circle component
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Sparkle at the end of progress arc
function ProgressSparkle({
  size,
  progress,
  radius,
  color,
}: {
  size: number;
  progress: number;
  radius: number;
  color: string;
}) {
  const center = size / 2;
  const angle = progress * 360 - 90;
  const sparkleRadius = radius + strokeWidth / 2;
  const x = center + sparkleRadius * Math.cos((angle * Math.PI) / 180);
  const y = center + sparkleRadius * Math.sin((angle * Math.PI) / 180);

  return (
    <G>
      {/* Glow halo */}
      <Ellipse
        cx={x}
        cy={y}
        rx={6}
        ry={6}
        fill={color}
        opacity={0.3}
      />
      {/* Main sparkle */}
      <Path
        d={`M ${x} ${y - 6} L ${x} ${y - 10} M ${x} ${y + 6} L ${x} ${y + 10} M ${x - 6} ${y} L ${x - 10} ${y} M ${x + 6} ${y} L ${x + 10} ${y}`}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Circle cx={x} cy={y} r={3} fill={color} />
    </G>
  );
}

const strokeWidth = 12;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  glowBg: {
    position: 'absolute',
    opacity: 0.3,
  },
  decorativeRing: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringWrapper: {
    position: 'absolute',
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    lineHeight: 42,
  },
  labelText: {},
});
