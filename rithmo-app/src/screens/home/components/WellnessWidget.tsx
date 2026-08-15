/**
 * WellnessWidget — Home screen top section
 * Shows the greeting/streak card + a compact cycle brief pill below it.
 *
 * Cycle brief:
 *  - Female user  → "Your cycle · Follicular phase · 14 days"
 *  - Male partner → "Zara's cycle · Period in progress 🩸"
 *  - Hidden when no cycle data is available
 */
import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { QuickLogWidget } from '@components/ui';
import { useTheme } from '@hooks/useTheme';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CycleBrief {
  /** Partner name — ignored when isOwn=true */
  name: string;
  /** Normalised phase key: 'menstrual' | 'follicular' | 'ovulation' | 'luteal' */
  phase: string;
  /** Days until next period, null if unknown */
  daysUntilPeriod: number | null;
  /** True while user / partner is actively on period */
  isOnPeriod?: boolean;
  /** True = this is the signed-in user's own cycle (female view) */
  isOwn?: boolean;
}

interface WellnessWidgetProps {
  userName?: string;
  currentStreak: number;
  hasCompletedCheckIn: boolean;
  date: string;
  notificationCount: number;
  onCheckInPress: () => void;
  onAvatarPress: () => void;
  onNotificationPress: () => void;
  cycleBrief?: CycleBrief | null;
  onCycleBriefPress?: () => void;
}

// ── Phase config ──────────────────────────────────────────────────────────────

const PHASE: Record<string, { emoji: string; label: string; color: string }> = {
  menstrual:  { emoji: '🩸', label: 'Period',     color: '#f43f5e' },
  follicular: { emoji: '🌱', label: 'Follicular', color: '#22c55e' },
  ovulation:  { emoji: '✨', label: 'Ovulation',  color: '#8b5cf6' },
  luteal:     { emoji: '🌙', label: 'Luteal',     color: '#f59e0b' },
};

// ── Component ─────────────────────────────────────────────────────────────────

export const WellnessWidget = memo(function WellnessWidget({
  userName,
  currentStreak,
  hasCompletedCheckIn,
  date,
  notificationCount,
  onCheckInPress,
  onAvatarPress,
  onNotificationPress,
  cycleBrief,
  onCycleBriefPress,
}: WellnessWidgetProps) {
  const { colors, spacing, typography } = useTheme();

  const meta = cycleBrief
    ? (PHASE[cycleBrief.phase?.toLowerCase?.()] ?? PHASE.follicular)
    : null;

  return (
    <View style={styles.wrapper}>
      {/* ── Main greeting / streak card ──────────────────────────── */}
      <QuickLogWidget
        userName={userName}
        currentStreak={currentStreak}
        streakGoal={7}
        hasCompletedCheckIn={hasCompletedCheckIn}
        onCheckInPress={onCheckInPress}
        onAvatarPress={onAvatarPress}
        date={date}
        notificationCount={notificationCount}
        onNotificationPress={onNotificationPress}
      />

      {/* ── Cycle brief pill ─────────────────────────────────────── */}
      {cycleBrief && meta && (
        <TouchableOpacity
          onPress={onCycleBriefPress}
          activeOpacity={onCycleBriefPress ? 0.75 : 1}
          style={[
            styles.pill,
            {
              backgroundColor: meta.color + '18',
              borderColor: meta.color + '45',
              marginTop: spacing[3],
            },
          ]}
          accessible
          accessibilityRole="button"
          accessibilityLabel={
            cycleBrief.isOwn
              ? `Your cycle: ${meta.label} phase`
              : `${cycleBrief.name}'s cycle: ${meta.label} phase`
          }
        >
          {/* Left: emoji + text */}
          <View style={styles.pillLeft}>
            <Text style={styles.pillEmoji}>{meta.emoji}</Text>
            <View>
              <Text
                style={[
                  styles.pillOwner,
                  { color: colors.textSecondary, fontSize: typography.xs },
                ]}
              >
                {cycleBrief.isOwn ? 'Your cycle' : `${cycleBrief.name}'s cycle`}
              </Text>
              <Text
                style={[
                  styles.pillPhase,
                  { color: meta.color, fontSize: typography.sm },
                ]}
              >
                {cycleBrief.isOnPeriod
                  ? cycleBrief.isOwn
                    ? 'Period in progress'
                    : 'Currently on period'
                  : `${meta.label} phase`}
              </Text>
            </View>
          </View>

          {/* Right: days badge OR period icon */}
          {cycleBrief.isOnPeriod ? (
            <View style={[styles.badge, { backgroundColor: meta.color + '22' }]}>
              <Text style={{ fontSize: 15 }}>🩸</Text>
            </View>
          ) : cycleBrief.daysUntilPeriod != null ? (
            <View style={[styles.badge, { backgroundColor: meta.color + '22' }]}>
              <Text style={[styles.badgeNum, { color: meta.color, fontSize: typography.lg }]}>
                {cycleBrief.daysUntilPeriod}
              </Text>
              <Text style={[styles.badgeSub, { color: colors.textSecondary }]}>
                days
              </Text>
            </View>
          ) : null}
        </TouchableOpacity>
      )}
    </View>
  );
});

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: { width: '100%' },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  pillLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pillEmoji: { fontSize: 20, marginRight: 10 },
  pillOwner: { fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 1 },
  pillPhase: { fontWeight: '700' },

  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 46,
  },
  badgeNum: { fontWeight: '800', lineHeight: 20 },
  badgeSub: { fontSize: 9, fontWeight: '600' },
});
