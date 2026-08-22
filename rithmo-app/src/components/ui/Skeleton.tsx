/**
 * Skeleton — placeholder blocks that approximate the final layout.
 *
 * Home used to show the plain sentence «در حال بررسی داده‌هایت…» in the slot
 * where the primary insight would land. On a real connection that is the
 * first thing a new user reads, and it says nothing about what is coming —
 * then the text is replaced by a card of a completely different height, so
 * the page jumps.
 *
 * These shapes are sized to match what replaces them, so the layout settles
 * once rather than twice.
 *
 * Uses the existing token set only — no new visual language. The pulse is a
 * plain opacity loop on the RN `Animated` API the project already relies on
 * (there is no reanimated dependency), and it respects the reduce-motion
 * setting because a breathing placeholder is exactly the kind of ambient
 * animation that setting exists to suppress.
 */

import React, { memo, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '@hooks/useTheme';

interface SkeletonBlockProps {
  width?: number | string;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}

/** One shimmering block. */
export const SkeletonBlock = memo(function SkeletonBlock({
  width = '100%',
  height = 14,
  radius = 6,
  style,
}: SkeletonBlockProps) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.45)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => { if (alive) { setReduceMotion(enabled); } })
      .catch(() => { /* default to animating */ });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(0.6);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.85, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, reduceMotion]);

  return (
    <Animated.View
      style={[
        {
          width: width as ViewStyle['width'],
          height,
          borderRadius: radius,
          backgroundColor: colors.borderSubtle,
          opacity,
        },
        style,
      ]}
    />
  );
});

/**
 * The Home context strip while loading — a single flat row, matching the
 * real strip's height so nothing shifts when it resolves.
 */
export const ContextSkeleton = memo(function ContextSkeleton() {
  const { spacing } = useTheme();
  return (
    <View
      style={[styles.contextRow, { paddingVertical: spacing[3] }]}
      accessibilityRole="progressbar"
      accessibilityLabel="در حال بارگذاری وضعیت چرخه"
    >
      <SkeletonBlock width={110} height={16} />
      <SkeletonBlock width={70} height={16} />
    </View>
  );
});

/**
 * The primary story card while loading. Deliberately card-shaped: this slot
 * resolves into the tallest element on the screen, so a text placeholder
 * here is what caused the page to jump.
 */
export const StoryCardSkeleton = memo(function StoryCardSkeleton() {
  const { colors, spacing, borderRadius, shadow } = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: borderRadius.xl,
          padding: spacing[4],
          ...shadow.sm,
        },
      ]}
      accessibilityRole="progressbar"
      accessibilityLabel="در حال بررسی الگوهای تو"
    >
      <SkeletonBlock width="80%" height={18} />
      <View style={{ height: spacing[3] }} />
      <SkeletonBlock width="100%" height={12} />
      <View style={{ height: spacing[2] }} />
      <SkeletonBlock width="65%" height={12} />
      <View style={{ height: spacing[4] }} />
      <SkeletonBlock width="100%" height={StyleSheet.hairlineWidth} radius={0} />
      <View style={{ height: spacing[4] }} />
      <SkeletonBlock width="55%" height={16} />
      <View style={{ height: spacing[2] }} />
      <SkeletonBlock width="85%" height={12} />
      <View style={{ height: spacing[4] }} />
      <View style={styles.buttonRow}>
        <SkeletonBlock width="58%" height={44} radius={borderRadius.lg} />
        <SkeletonBlock width="38%" height={44} radius={borderRadius.lg} />
      </View>
    </View>
  );
});

/** The accrual ledger while loading. */
export const AccrualSkeleton = memo(function AccrualSkeleton() {
  const { colors, spacing, borderRadius } = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.borderSubtle,
          borderRadius: borderRadius.lg,
          padding: spacing[4],
        },
      ]}
      accessibilityRole="progressbar"
      accessibilityLabel="در حال بارگذاری پیشرفت"
    >
      <View style={styles.statRow}>
        <SkeletonBlock width={64} height={30} />
        <SkeletonBlock width={64} height={30} />
        <SkeletonBlock width={64} height={30} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: { borderWidth: 1, overflow: 'hidden' },
  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statRow: { flexDirection: 'row', justifyContent: 'space-between' },
});
