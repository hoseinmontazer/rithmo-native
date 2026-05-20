import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, Platform } from 'react-native';
import type { MainTabParamList } from './types';
import { HomeStack }       from './stacks/HomeStack';
import { CycleStack }      from './stacks/CycleStack';
import { WellnessStack }   from './stacks/WellnessStack';
import { MessagesStack }   from './stacks/MessagesStack';
import { PartnerAIStack }  from './stacks/PartnerAIStack';
import { ProfileStack }    from './stacks/ProfileStack';
import { useUnreadMessages, useUnreadNotifications } from '@hooks/queries/useNotifications';
import { useProfile } from '@hooks/queries/useProfile';
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

// ── Navigator ─────────────────────────────────────────────────────────────────

export function MainNavigator() {
  const { data: unreadMsgs }   = useUnreadMessages();
  const { data: unreadNotifs } = useUnreadNotifications();
  const { data: profile }      = useProfile();
  const { colors }             = useTheme();

  const isMale = profile?.sex === 'male';
  const TAB_H  = Platform.OS === 'ios' ? 80 : 64;
  const tabIconColor = colors.primary;

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
        tabBarActiveTintColor:   tabIconColor,
        tabBarInactiveTintColor: tabIconColor,
      }}
    >
      {/* ── Home ─────────────────────────────────────────────────────── */}
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabItem
              source={icons.home}
              label="Home"
              focused={focused}
              color={color}
              badge={unreadNotifs?.count}
            />
          ),
        }}
      />

      {/* ── Cycle — female / other only ──────────────────────────────── */}
      {!isMale && (
        <Tab.Screen
          name="CycleTab"
          component={CycleStack}
          options={{
            tabBarIcon: ({ focused, color }) => (
              <TabItem
                source={icons.menstruation}
                label="Cycle"
                focused={focused}
                color={color}
              />
            ),
          }}
        />
      )}

      {/* ── Wellness ─────────────────────────────────────────────────── */}
      <Tab.Screen
        name="WellnessTab"
        component={WellnessStack}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabItem
              source={icons.wellness}
              label="Wellness"
              focused={focused}
              color={color}
            />
          ),
        }}
      />

      {/* ── Messages (female) / AI (male) ────────────────────────────── */}
      <Tab.Screen
        name="MessagesTab"
        component={isMale ? PartnerAIStack : MessagesStack}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabItem
              source={isMale ? icons.robotWriting : icons.chat}
              label={isMale ? 'AI' : 'Messages'}
              focused={focused}
              color={color}
              badge={isMale ? undefined : unreadMsgs?.count}
            />
          ),
        }}
      />

      {/* ── Profile ──────────────────────────────────────────────────── */}
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStack}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabItem
              source={icons.profile}
              label="Profile"
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
