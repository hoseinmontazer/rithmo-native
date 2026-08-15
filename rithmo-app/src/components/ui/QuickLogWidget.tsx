/**
 * QuickLogWidget — Circular quick-log widget for home screen
 * Features: gradient background, circular progress ring, animated appearance
 */
import React, { memo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ViewStyle,
} from 'react-native';
import { useTheme } from '@hooks/useTheme';
import { CircularProgress } from './CircularProgress';
import { CircularAvatar } from './CircularAvatar';
import { Icon } from './Icon';

interface QuickLogWidgetProps {
  userName?: string;
  userAvatar?: { uri: string } | number;
  currentStreak: number;
  streakGoal?: number;
  hasCompletedCheckIn: boolean;
  onCheckInPress: () => void;
  onAvatarPress?: () => void;
  style?: ViewStyle;
  date?: string;
  notificationCount?: number;
  onNotificationPress?: () => void;
}

export const QuickLogWidget = memo(function QuickLogWidget({
  userName = 'User',
  userAvatar,
  currentStreak,
  streakGoal = 7,
  hasCompletedCheckIn,
  onCheckInPress,
  onAvatarPress,
  style,
  date,
  notificationCount = 0,
  onNotificationPress,
}: QuickLogWidgetProps) {
  const { colors, typography, spacing, shadow } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, scaleAnim]);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(bounceAnim, { toValue: 0.98, duration: 100, useNativeDriver: true }),
      Animated.spring(bounceAnim, { toValue: 1, friction: 3, tension: 40, useNativeDriver: true }),
    ]).start();
    onCheckInPress();
  };

  const streakProgress = (currentStreak / streakGoal) * 100;

  return (
    <Animated.View
      style={[styles.container, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }, style]}
    >
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.95}
        style={[
          styles.widget,
          {
            backgroundColor: colors.surface,
            borderRadius: 24,
            padding: spacing[5],
            ...shadow.lg,
          },
        ]}
      >
        {/* Gradient background overlay */}
        <View
          style={[
            styles.gradientOverlay,
            { backgroundColor: colors.primaryLighter, borderRadius: 24 },
          ]}
        />

        {/* Date and Notification Row */}
        {(date || onNotificationPress) && (
          <View style={styles.topRow}>
            {date && (
              <Text style={[styles.dateText, { color: colors.textSecondary, fontSize: typography.xs }]}>
                {date}
              </Text>
            )}
            {onNotificationPress && (
              <TouchableOpacity
                onPress={onNotificationPress}
                activeOpacity={0.7}
                style={[
                  styles.notificationButton,
                  { backgroundColor: colors.primaryLighter, borderRadius: 12, padding: spacing[2] },
                ]}
              >
                <Icon name="bell-outline" size={20} color={colors.primary} />
                {notificationCount > 0 && (
                  <View
                    style={[
                      styles.notificationBadge,
                      { backgroundColor: colors.menstrual, borderColor: colors.surface },
                    ]}
                  >
                    <Text style={styles.notificationBadgeText}>
                      {Math.min(notificationCount, 9)}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Header with avatar */}
        <View style={styles.header}>
          <CircularAvatar
            source={userAvatar}
            size={48}
            onPress={onAvatarPress}
            showBadge={hasCompletedCheckIn}
            gradientBorder
          />
          <View style={styles.greeting}>
            <Text style={[styles.greetingText, { color: colors.textSecondary, fontSize: typography.xs }]}>
              Welcome back,
            </Text>
            <Text style={[styles.userName, { color: colors.textPrimary, fontSize: typography.md }]}>
              {userName}
            </Text>
          </View>
        </View>

        {/* Streak progress ring */}
        <View style={styles.streakContainer}>
          <CircularProgress
            progress={streakProgress}
            size={140}
            strokeWidth={12}
            colors={[colors.menstrual, colors.ovulationColor, colors.success]}
            backgroundColor={colors.border}
            animationDuration={800}
          >
            <View style={styles.streakContent}>
              <Text style={[styles.streakNumber, { color: colors.primary, fontSize: typography['4xl'] }]}>
                {currentStreak}
              </Text>
              <Text style={[styles.streakLabel, { color: colors.textSecondary, fontSize: typography.xs }]}>
                day streak
              </Text>
            </View>
          </CircularProgress>
        </View>

        {/* Check-in status */}
        <View style={styles.statusContainer}>
          {hasCompletedCheckIn ? (
            <>
              <View
                style={[styles.statusIcon, { backgroundColor: colors.successBg, borderRadius: 20 }]}
              >
                <Icon name="check" size={20} color={colors.success} />
              </View>
              <Text style={[styles.statusText, { color: colors.success, fontSize: typography.sm }]}>
                Check-in complete! Keep it up 🎉
              </Text>
            </>
          ) : (
            <View
              style={[
                styles.ctaButton,
                {
                  backgroundColor: colors.primary,
                  borderRadius: 999,
                  paddingVertical: spacing[3],
                  paddingHorizontal: spacing[6],
                },
              ]}
            >
              <Icon name="heart" size={18} color="#fff" />
              <Text style={[styles.ctaText, { color: '#fff', fontSize: typography.md, marginLeft: spacing[2] }]}>
                Check In Now
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  widget: {
    width: '100%',
    overflow: 'hidden',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.5,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateText: {
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  notificationButton: {
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    marginLeft: 12,
    flex: 1,
  },
  greetingText: {
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  userName: {
    fontWeight: '700',
    marginTop: 2,
  },
  streakContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  streakContent: {
    alignItems: 'center',
  },
  streakNumber: {
    fontWeight: '900',
    letterSpacing: -1,
  },
  streakLabel: {
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  statusContainer: {
    alignItems: 'center',
    marginTop: 12,
  },
  statusIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statusText: {
    fontWeight: '600',
    textAlign: 'center',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontWeight: '700',
  },
});
