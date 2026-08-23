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
import { View, Text, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import type { MainTabParamList } from './types';
import { HomeStack }     from './stacks/HomeStack';
import { CycleStack }    from './stacks/CycleStack';
import { WellnessStack } from './stacks/WellnessStack';
import { InsightsStack } from './stacks/InsightsStack';
import { ProfileStack }  from './stacks/ProfileStack';
import { useUnreadNotifications } from '@hooks/queries/useNotifications';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { TAB_ICONS, TAB_ICONS_ACTIVE, ICON_SIZE, type TabKey } from '@design-system/iconography';
import { useTheme } from '@hooks/useTheme';
import { useRole } from '@hooks/useRole';

const Tab = createBottomTabNavigator<MainTabParamList>();

// ── Tab item ──────────────────────────────────────────────────────────────────

interface TabItemProps {
  /** Semantic destination, not a drawing. See design-system/iconography. */
  tab: TabKey;
  label: string;
  focused: boolean;
  color: string;
  badge?: number;
}

function TabItem({ tab, label, focused, color, badge }: TabItemProps) {
  const { colors } = useTheme();
  // Weight carries selection as well as colour — tint alone was the only
  // state cue before, and tint alone is not a sufficient one.
  const glyph = focused ? TAB_ICONS_ACTIVE[tab] : TAB_ICONS[tab];

  return (
    <View style={styles.tabItem}>
      <View style={styles.iconWrap}>
        <Icon name={glyph} size={ICON_SIZE.tab} color={color} />

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

function LogTabIcon({ focused }: { focused: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.logTabWrap, { backgroundColor: focused ? colors.primary : colors.primaryLight }]}>
      <Icon
        name={focused ? TAB_ICONS_ACTIVE.log : TAB_ICONS.log}
        size={26}
        color={focused ? colors.textOnPrimary : colors.primary}
      />
    </View>
  );
}

// ── Navigator ─────────────────────────────────────────────────────────────────

export function MainNavigator() {
  const { data: unreadNotifs } = useUnreadNotifications();
  const { colors }             = useTheme();
  const { isResolved, isPartner } = useRole();

  // Do not mount the tab navigator until the role is known.
  //
  // React Navigation keeps a screen mounted once it has rendered, so a
  // first render under the default 'owner' assumption permanently handed a
  // linked partner the owner's application. Waiting here is the only place
  // the decision can be made once and correctly.
  if (!isResolved) {
    return (
      <View style={[styles.roleGate, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const TAB_H      = Platform.OS === 'ios' ? 80 : 64;

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
        tabBarActiveTintColor:   colors.primary,
        // Was identical to the active colour, so a selected tab looked the
        // same as an unselected one apart from the label weight.
        tabBarInactiveTintColor: colors.textTertiary,
      }}
    >
      {/* ── Home ──────────────────────────────────────────────────────── */}
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabItem
              tab="home"
              label="خانه"
              focused={focused}
              color={color}
              badge={unreadNotifs?.count}
            />
          ),
        }}
      />

      {/* ── Owner-only tabs ───────────────────────────────────────────
          A partner has no cycle of their own and must never be offered
          "log your period" or the owner's pattern feed. These are omitted
          rather than hidden, so there is no route for them to reach. */}
      {!isPartner && (
        <>
      <Tab.Screen
        name="CycleTab"
        component={CycleStack}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabItem
              tab="cycle"
              label="چرخه"
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
          tabBarIcon: ({ focused }) => <LogTabIcon focused={focused} />,
        }}
      />

      {/* ── Patterns / Insights ───────────────────────────────────────── */}
      <Tab.Screen
        name="InsightsTab"
        component={InsightsStack}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabItem
              tab="patterns"
              label="الگوها"
              focused={focused}
              color={color}
            />
          ),
        }}
      />

        </>
      )}

      {/* ── Profile ───────────────────────────────────────────────────── */}
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStack}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabItem
              tab="profile"
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
  roleGate: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
