/**
 * StreakCards — Home screen "Your Progress" section
 *
 * Left card  → 7-day wellness score (0–10)
 * Right card → best / longest streak
 *
 * Numbers count up in sync with the ring animation.
 */
import React, { memo, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { useTheme } from '@hooks/useTheme';
import { CircularProgress } from '@components/ui';

// ── animated counter ──────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 1000, decimals = 0) {
  const [display, setDisplay] = useState(0);
  const animRef = useRef(new Animated.Value(0));

  useEffect(() => {
    animRef.current.setValue(0);
    const listener = animRef.current.addListener(({ value }) => {
      setDisplay(decimals > 0
        ? Math.round(value * 10 ** decimals) / 10 ** decimals
        : Math.round(value),
      );
    });

    Animated.timing(animRef.current, {
      toValue: target,
      duration,
      easing: Easing.out(Easing.elastic(1.1)),
      useNativeDriver: false,
    }).start();

    return () => animRef.current.removeListener(listener);
  }, [target, duration, decimals]);

  return display;
}

// ── main component ────────────────────────────────────────────────────────────

interface StreakCardsProps {
  currentStreak: number;
  longestStreak: number;
  /** 7-day average wellness score 0–10, null if no data yet */
  weeklyScore: number | null;
}

export const StreakCards = memo(function StreakCards({
  currentStreak,
  longestStreak,
  weeklyScore,
}: StreakCardsProps) {
  const { colors, spacing, typography } = useTheme();

  // score is 0–100 directly from API (e.g. 74.4)
  const scoreProgress  = weeklyScore ?? 0;
  const scoreDisplay   = useCountUp(weeklyScore ?? 0, 1000, 1);
  const longestDisplay = useCountUp(longestStreak, 1200);

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.textPrimary, fontSize: typography.lg, marginBottom: spacing[4] }]}>
        Your Progress
      </Text>

      <View style={[styles.row, { gap: spacing[3] }]}>

        {/* 7-day Wellness Score */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: 20, padding: spacing[4], shadowColor: colors.shadowColor }]}>
          <CircularProgress
            progress={scoreProgress}
            size={80}
            strokeWidth={8}
            colors={[colors.menstrual, colors.ovulationColor, colors.success]}
            animationDuration={1000}
          >
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: colors.primary, fontSize: typography.base, fontWeight: '800', lineHeight: 20 }}>
                {weeklyScore != null ? scoreDisplay.toFixed(1) : '—'}
              </Text>
              {weeklyScore != null && (
                <Text style={{ color: colors.textSecondary, fontSize: 8, fontWeight: '600', opacity: 0.7 }}>
                  /100
                </Text>
              )}
            </View>
          </CircularProgress>
          <Text style={[styles.label, { color: colors.textSecondary, fontSize: typography.xs, marginTop: spacing[2] }]}>
            7-Day Score
          </Text>
          <Text style={[styles.sublabel, { color: colors.textSecondary, fontSize: 9 }]}>
            streak: {currentStreak}d
          </Text>
        </View>

        {/* Best Streak */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: 20, padding: spacing[4], shadowColor: colors.shadowColor }]}>
          <CircularProgress
            progress={100}
            size={80}
            strokeWidth={8}
            colors={[colors.luteal, colors.violet500, colors.violet600]}
            animationDuration={1200}
          >
            <Text style={{ color: colors.luteal, fontSize: typography['2xl'], fontWeight: '800' }}>
              {longestDisplay}
            </Text>
          </CircularProgress>
          <Text style={[styles.label, { color: colors.textSecondary, fontSize: typography.xs, marginTop: spacing[2] }]}>
            Best Streak
          </Text>
          <Text style={[styles.sublabel, { color: colors.textSecondary, fontSize: 9 }]}>
            days
          </Text>
        </View>

      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { width: '100%' },
  title: { fontWeight: '800', letterSpacing: -0.3 },
  row: { flexDirection: 'row' },
  card: {
    flex: 1,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  label: {
    fontWeight: '700',
    textTransform: 'uppercase',
    textAlign: 'center',
    letterSpacing: 0.4,
  },
  sublabel: {
    marginTop: 2,
    textAlign: 'center',
    opacity: 0.6,
    fontWeight: '500',
  },
});
