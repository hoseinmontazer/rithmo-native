/**
 * CycleRing — SVG-free circular progress ring built with View transforms.
 * Shows the user's current day in their cycle as a colored arc.
 */
import React, { memo, useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { useTheme } from '@hooks/useTheme';
import type { CyclePhase } from '@types/period.types';

interface CycleRingProps {
  currentDay: number;   // e.g. 18
  cycleLength: number;  // e.g. 28
  phase: CyclePhase;
  daysUntilNext: number;
}

const PHASE_COLORS: Record<CyclePhase, string> = {
  menstrual:  '#f43f5e',
  follicular: '#22c55e',
  ovulation:  '#8b5cf6',
  luteal:     '#f59e0b',
};

const PHASE_LABELS: Record<CyclePhase, string> = {
  menstrual:  'Menstrual',
  follicular: 'Follicular',
  ovulation:  'Ovulation',
  luteal:     'Luteal',
};

const SIZE   = 200;
const STROKE = 14;
const RADIUS = (SIZE - STROKE) / 2;
const CENTER = SIZE / 2;

/**
 * Draws a single arc segment using two rotated half-circles (the classic CSS trick).
 * pct: 0–1 fill fraction.
 */
function ArcFill({ pct, color }: { pct: number; color: string }) {
  // We render two half-disc clips to form an arc up to 100%
  const deg = pct * 360;

  // First half: 0–180°
  const firstHalfDeg  = Math.min(deg, 180);
  // Second half: 180–360°
  const secondHalfDeg = Math.max(deg - 180, 0);

  return (
    <View style={[StyleSheet.absoluteFill, styles.arcContainer]}>
      {/* Right half */}
      <View style={[styles.halfCircleContainer, styles.rightHalf]}>
        <View
          style={[
            styles.halfCircle,
            {
              borderColor: color,
              transform: [{ rotate: `${firstHalfDeg}deg` }],
            },
          ]}
        />
      </View>
      {/* Left half — only visible when > 180° */}
      {deg > 180 && (
        <View style={[styles.halfCircleContainer, styles.leftHalf]}>
          <View
            style={[
              styles.halfCircle,
              {
                borderColor: color,
                transform: [{ rotate: `${secondHalfDeg}deg` }],
              },
            ]}
          />
        </View>
      )}
    </View>
  );
}

export const CycleRing = memo(function CycleRing({
  currentDay, cycleLength, phase, daysUntilNext,
}: CycleRingProps) {
  const { colors, typography } = useTheme();
  const phaseColor = PHASE_COLORS[phase];
  const pct = Math.min(currentDay / cycleLength, 1);

  // Fade-in on mount
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, [fadeAnim]);

  return (
    <Animated.View style={[styles.wrapper, { opacity: fadeAnim }]}>
      <View style={[styles.ring, { width: SIZE, height: SIZE }]}>
        {/* Track (background circle) */}
        <View style={[
          styles.track,
          {
            width: SIZE,
            height: SIZE,
            borderRadius: SIZE / 2,
            borderWidth: STROKE,
            borderColor: phaseColor + '22',
          },
        ]} />

        {/* Filled arc */}
        <ArcFill pct={pct} color={phaseColor} />

        {/* Center content */}
        <View style={styles.center}>
          <Text style={[styles.dayNum, { color: colors.textPrimary, fontSize: typography['4xl'] }]}>
            {currentDay}
          </Text>
          <Text style={[styles.dayLabel, { color: colors.textSecondary, fontSize: typography.xs }]}>
            of {cycleLength} days
          </Text>
        </View>
      </View>

      {/* Phase pill */}
      <View style={[styles.phasePill, { backgroundColor: phaseColor + '18', borderColor: phaseColor + '44' }]}>
        <View style={[styles.phaseDot, { backgroundColor: phaseColor }]} />
        <Text style={[styles.phaseText, { color: phaseColor, fontSize: typography.sm }]}>
          {PHASE_LABELS[phase]} Phase
        </Text>
      </View>

      {/* Countdown */}
      <View style={styles.countdown}>
        <Text style={[styles.countdownNum, { color: colors.textPrimary, fontSize: typography['3xl'] }]}>
          {daysUntilNext}
        </Text>
        <Text style={[styles.countdownLabel, { color: colors.textSecondary, fontSize: typography.xs }]}>
          days until next period
        </Text>
      </View>
    </Animated.View>
  );
});

const HALF = SIZE / 2;

const styles = StyleSheet.create({
  wrapper:       { alignItems: 'center', paddingVertical: 8 },
  ring:          { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  track:         { position: 'absolute' },
  arcContainer:  { width: SIZE, height: SIZE },

  // Half-circle clip technique
  halfCircleContainer: {
    position: 'absolute',
    width: HALF,
    height: SIZE,
    overflow: 'hidden',
  },
  rightHalf: { right: 0 },
  leftHalf:  { left: 0 },
  halfCircle: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: STROKE,
    borderColor: 'transparent',
  },

  center:         { alignItems: 'center' },
  dayNum:         { fontWeight: '700', letterSpacing: -1 },
  dayLabel:       { marginTop: 2 },

  phasePill:      {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 16, paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 999, borderWidth: 1,
  },
  phaseDot:       { width: 7, height: 7, borderRadius: 999, marginRight: 6 },
  phaseText:      { fontWeight: '600' },

  countdown:      { alignItems: 'center', marginTop: 12 },
  countdownNum:   { fontWeight: '700', letterSpacing: -1 },
  countdownLabel: { marginTop: 2 },
});
