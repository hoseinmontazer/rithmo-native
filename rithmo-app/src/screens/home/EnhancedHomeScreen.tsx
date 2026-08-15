/**
 * EnhancedHomeScreen — Rithmo with Circular UI/UX Features
 * Features: QuickLogWidget, CircularActionGrid, CelebrationAnimation
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@hooks/useTheme';
import { useAuth } from '@hooks/useAuth';
import { useCycleAnalysis } from '@hooks/queries/usePeriods';
import { useUserMedications } from '@hooks/queries/useMedications';
import { useTodayWellnessLog, useWellnessStreaks, useWellnessAnalytics } from '@hooks/queries/useWellness';
import { useUnreadNotifications } from '@hooks/queries/useNotifications';
import {
  QuickLogWidget,
  CircularActionGrid,
  CelebrationAnimation,
  WellnessRing,
  CircularProgress,
  type QuickAction,
} from '@components/ui';
import { useProfile } from '@hooks/queries/useProfile';
import type { HomeScreenProps } from '@navigation/types';

type Props = HomeScreenProps<'Home'>;

const HOME_WELLNESS_ANALYTICS_DAYS = 7;

export default function EnhancedHomeScreen() {
  const navigation = useNavigation<Props['navigation']>();
  const { colors, spacing, typography } = useTheme();
  const { user } = useAuth();

  // State
  const [refreshing, setRefreshing] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationData, setCelebrationData] = useState({
    title: '',
    message: '',
    type: 'success' as 'success' | 'milestone',
  });

  // Data queries
  const { data: profile, isLoading: profileLoading, refetch: refetchProfile } = useProfile();
  const { data: cycleData, refetch: refetchCycle } = useCycleAnalysis({
    enabled: profile?.sex !== 'male',
  });
  const { data: medications } = useUserMedications();
  const { data: todayWellness } = useTodayWellnessLog();
  const { data: streaks } = useWellnessStreaks();
  const { data: wellnessAnalytics, refetch: refetchWellnessAnalytics } = useWellnessAnalytics(
    HOME_WELLNESS_ANALYTICS_DAYS,
  );
  const { data: unreadNotifs } = useUnreadNotifications();

  // Computed values
  const hasCompletedCheckIn = Boolean(todayWellness);
  const currentStreak = streaks?.current_streak ?? 0;
  const longestStreak = streaks?.longest_streak ?? 0;
  const wellnessScore = wellnessAnalytics?.averages?.wellness_score ?? 0;
  const activeMeds = (medications ?? []).filter((m: any) => m.is_active).length;
  const notifCount = unreadNotifs?.count ?? 0;

  const todayDate = useMemo(() => {
    const today = new Date();
    return today.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, []);

  // Check for milestone achievements
  React.useEffect(() => {
    if (currentStreak > 0 && [7, 14, 30, 60, 90].includes(currentStreak)) {
      setCelebrationData({
        title: `${currentStreak} Day Streak! 🎉`,
        message: 'Amazing consistency! Keep up the great work.',
        type: 'milestone',
      });
      setShowCelebration(true);
    }
  }, [currentStreak]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchProfile(),
        refetchWellnessAnalytics(),
        refetchCycle(),
      ]);
    } catch (error) {
      console.error('Refresh error:', error);
    }
    setRefreshing(false);
  }, [refetchCycle, refetchProfile, refetchWellnessAnalytics]);

  const goTo = useCallback(
    (tab: string, screen: string) => {
      try {
        navigation.getParent()?.navigate(tab as any, { screen });
      } catch (error) {
        console.error('Navigation error:', error);
      }
    },
    [navigation],
  );

  // Quick actions configuration
  const quickActions: QuickAction[] = useMemo(() => {
    const actions: QuickAction[] = [
      {
        id: 'mood',
        icon: 'emoticon-happy-outline',
        label: 'Log Mood',
        colors: [colors.luteal, colors.violet500],
        completed: hasCompletedCheckIn,
        onPress: () => {
          goTo('WellnessTab', 'LogWellness');
          if (!hasCompletedCheckIn) {
            setCelebrationData({
              title: 'Check-in Complete!',
              message: 'Great job staying on track today.',
              type: 'success',
            });
            setShowCelebration(true);
          }
        },
      },
      {
        id: 'energy',
        icon: 'lightning-bolt-outline',
        label: 'Log Energy',
        colors: [colors.ovulationColor, colors.amber500],
        onPress: () => goTo('WellnessTab', 'LogWellness'),
      },
      {
        id: 'sleep',
        icon: 'sleep',
        label: 'Log Sleep',
        colors: [colors.primary, colors.accent],
        onPress: () => goTo('WellnessTab', 'LogWellness'),
      },
    ];

    // Add period tracking for non-male users
    if (profile?.sex !== 'male') {
      actions.push({
        id: 'period',
        icon: 'calendar-heart',
        label: 'Log Period',
        colors: [colors.menstrual, colors.rose500],
        onPress: () => goTo('CycleTab', 'LogPeriod'),
      });
    }

    return actions;
  }, [colors, hasCompletedCheckIn, profile, goTo]);

  // Handle check-in press
  const handleCheckInPress = () => {
    goTo('WellnessTab', 'LogWellness');
  };

  const handleAvatarPress = () => {
    goTo('ProfileTab', 'Profile');
  };

  if (profileLoading && !profile && !refreshing) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background, flex: 1, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.textSecondary, marginTop: spacing[4], fontSize: typography.sm }}>
          Loading your dashboard...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: spacing[12] }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Quick Log Widget */}
        <View style={{ paddingHorizontal: spacing[5], paddingTop: spacing[6], marginBottom: spacing[6] }}>
          <QuickLogWidget
            userName={user?.first_name || profile?.first_name || user?.username}
            currentStreak={currentStreak}
            streakGoal={7}
            hasCompletedCheckIn={hasCompletedCheckIn}
            onCheckInPress={handleCheckInPress}
            onAvatarPress={handleAvatarPress}
            date={todayDate}
            notificationCount={notifCount}
            onNotificationPress={() => navigation.navigate('Notifications' as any)}
          />
        </View>

        {/* Circular Quick Actions */}
        <View style={{ paddingHorizontal: spacing[5], marginBottom: spacing[6] }}>
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: typography.lg,
              fontWeight: '800',
              marginBottom: spacing[4],
            }}
          >
            Quick Actions
          </Text>
          <CircularActionGrid actions={quickActions} showLabels={false} />
        </View>

        {/* Wellness Score Section */}
        <View
          style={{
            backgroundColor: colors.surface,
            marginHorizontal: spacing[5],
            borderRadius: 24,
            padding: spacing[5],
            marginBottom: spacing[6],
            shadowColor: colors.shadowColor,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.06,
            shadowRadius: 12,
            elevation: 3,
          }}
        >
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: typography.xs,
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: 0.6,
              marginBottom: spacing[4],
              textAlign: 'center',
            }}
          >
            Wellness Score
          </Text>
          <View style={{ alignItems: 'center' }}>
            <WellnessRing score={wellnessScore} size={160} />
          </View>
        </View>

        {/* Streak Stats */}
        <View style={{ paddingHorizontal: spacing[5], marginBottom: spacing[6] }}>
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: typography.lg,
              fontWeight: '800',
              marginBottom: spacing[4],
            }}
          >
            Your Progress
          </Text>
          <View style={{ flexDirection: 'row', gap: spacing[3] }}>
            {/* Current Streak */}
            <View
              style={{
                flex: 1,
                backgroundColor: colors.surface,
                borderRadius: 20,
                padding: spacing[4],
                alignItems: 'center',
                shadowColor: colors.shadowColor,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <CircularProgress
                progress={(currentStreak / 30) * 100}
                size={80}
                strokeWidth={8}
                colors={[colors.primary, colors.accent, colors.success]}
              >
                <Text
                  style={{
                    color: colors.primary,
                    fontSize: typography['2xl'],
                    fontWeight: '800',
                  }}
                >
                  {currentStreak}
                </Text>
              </CircularProgress>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: typography.xs,
                  fontWeight: '600',
                  marginTop: spacing[2],
                  textTransform: 'uppercase',
                }}
              >
                Current Streak
              </Text>
            </View>

            {/* Longest Streak */}
            <View
              style={{
                flex: 1,
                backgroundColor: colors.surface,
                borderRadius: 20,
                padding: spacing[4],
                alignItems: 'center',
                shadowColor: colors.shadowColor,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <CircularProgress
                progress={100}
                size={80}
                strokeWidth={8}
                colors={[colors.luteal, colors.violet500, colors.violet600]}
              >
                <Text
                  style={{
                    color: colors.luteal,
                    fontSize: typography['2xl'],
                    fontWeight: '800',
                  }}
                >
                  {longestStreak}
                </Text>
              </CircularProgress>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: typography.xs,
                  fontWeight: '600',
                  marginTop: spacing[2],
                  textTransform: 'uppercase',
                }}
              >
                Best Streak
              </Text>
            </View>
          </View>
        </View>

        {/* Active Medications */}
        {activeMeds > 0 && (
          <View
            style={{
              backgroundColor: colors.surface,
              marginHorizontal: spacing[5],
              borderRadius: 20,
              padding: spacing[5],
              marginBottom: spacing[6],
              shadowColor: colors.shadowColor,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 8,
              elevation: 2,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: typography.xs,
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    marginBottom: spacing[1],
                  }}
                >
                  Active Medications
                </Text>
                <Text
                  style={{
                    color: colors.textPrimary,
                    fontSize: typography['3xl'],
                    fontWeight: '800',
                  }}
                >
                  {activeMeds}
                </Text>
              </View>
              <CircularProgress
                progress={(activeMeds / 10) * 100}
                size={60}
                strokeWidth={6}
                colors={[colors.info, colors.blue500, colors.blue400]}
              />
            </View>
          </View>
        )}
      </ScrollView>

      {/* Celebration Animation */}
      <CelebrationAnimation
        visible={showCelebration}
        onDismiss={() => setShowCelebration(false)}
        title={celebrationData.title}
        message={celebrationData.message}
        type={celebrationData.type}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
});
