/**
 * MainNavigator — Bottom tab bar
 *
 * Tabs: Home | Cycle | Log | Patterns | Profile
 *
 * "Log" opens the QuickLog screen directly.
 * "Patterns" is the Insights hub — data-state-aware in Phase 1,
 *   populated with cross-cycle intelligence in Phase 2+.
 */
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, Platform } from 'react-native';
import type { MainTabParamList } from './types';
import { HomeStack }     from './stacks/HomeStack';
import { CycleStack }    from './stacks/CycleStack';
import { WellnessStack } from './stacks/WellnessStack';
import { InsightsStack } from './stacks/InsightsStack';
import { ProfileStack }  from './stacks/ProfileStack';
import { useUnreadNotifications } from '@hooks/queries/useNotifications';
import { usePushTokenRegistration } from '@hooks/usePushTokenRegistration';
import { TabIcon } from '@components/ui';
import { useTheme } from '@hooks/useTheme';
import icons from '../assets/icons';

const Tab = createBottomTabNavigator<MainTabParamList>();

// ── Tab item ──────────────────────────────────────────────────────────────────

interface TabItemProps {
  source: ReturnType<typeof require>;
  label: string;
  focused: boolean;
  color: string;
  badge?: number;
}

function TabItem({ source, label, focused, color, badge }: TabItemProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.tabItem}>
      <View style={styles.iconWrap}>
        <TabIcon source={source} size={24} color={color} />

        {/* Unread badge */}
        {badge !== undefined && badge > 0 && (
          <View
            style={[
              styles.badgeDot,
              { backgroundColor: colors.menstrual, borderColor: colors.surface },
            ]}
          >
            {badge < 10 && (
              <Text style={styles.badgeText}>{badge}</Text>
            )}
          </View>
        )}
      </View>

      <Text style={[styles.tabLabel, { color, fontWeight: focused ? '700' : '400' }]}>
        {label}
      </Text>
    </View>
  );
}

// ── Log tab centre button ─────────────────────────────────────────────────────

function LogTabIcon({ focused, color }: { focused: boolean; color: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.logTabWrap, { backgroundColor: focused ? colors.primary : colors.primaryLight }]}>
      <TabIcon source={icons.wellness} size={22} color={focused ? '#fff' : colors.primary} />
    </View>
  );
}

// ── Navigator ─────────────────────────────────────────────────────────────────

export function MainNavigator() {
  const { data: unreadNotifs } = useUnreadNotifications();
  // Register / refresh FCM push token whenever the authenticated session starts.
  // The hook is a no-op until @react-native-firebase/messaging is installed.
  usePushTokenRegistration();
  const { colors }             = useTheme();

  const TAB_H      = Platform.OS === 'ios' ? 80 : 64;
  const tabColor   = colors.primary;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown:          false,
        tabBarShowLabel:      false,
        tabBarStyle: {
          backgroundColor:  colors.surface,
          borderTopColor:   colors.border,
          borderTopWidth:   StyleSheet.hairlineWidth,
          height:           TAB_H,
          paddingBottom:    Platform.OS === 'ios' ? 24 : 6,
          paddingTop:       6,
          shadowColor:      colors.shadowColor,
          shadowOffset:     { width: 0, height: -2 },
          shadowOpacity:    0.06,
          shadowRadius:     12,
          elevation:        16,
        },
        tabBarActiveTintColor:   tabColor,
        tabBarInactiveTintColor: tabColor,
      }}
    >
      {/* ── Home ──────────────────────────────────────────────────────── */}
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabItem
              source={icons.home}
              label="خانه"
              focused={focused}
              color={color}
              badge={unreadNotifs?.count}
            />
          ),
        }}
      />

      {/* ── Cycle ─────────────────────────────────────────────────────── */}
      <Tab.Screen
        name="CycleTab"
        component={CycleStack}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabItem
              source={icons.search}
              label="سیکل"
              focused={focused}
              color={color}
            />
          ),
        }}
      />

      {/* ── Log (centre action) ───────────────────────────────────────── */}
      <Tab.Screen
        name="LogTab"
        component={WellnessStack}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('LogTab', { screen: 'QuickLog' });
          },
        })}
        options={{
          tabBarIcon: ({ focused }) => <LogTabIcon focused={focused} color="" />,
        }}
      />

      {/* ── Patterns / Insights ───────────────────────────────────────── */}
      <Tab.Screen
        name="InsightsTab"
        component={InsightsStack}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabItem
              source={icons.search}
              label="الگوها"
              focused={focused}
              color={color}
            />
          ),
        }}
      />

      {/* ── Profile ───────────────────────────────────────────────────── */}
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStack}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabItem
              source={icons.profile}
              label="من"
              focused={focused}
              color={color}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// ── styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
    gap: 3,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 30,
    position: 'relative',
  },
  logTabWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  badgeDot: {
    position: 'absolute',
    top: -2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 11,
  },
  tabLabel: {
    fontSize: 10,
    letterSpacing: 0.1,
  },
});
