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
import { TAB_ICON_ART, TAB_ICONS, TAB_ICONS_ACTIVE, ICON_SIZE, type TabKey } from '@design-system/iconography';
import { AppIcon } from '@components/ui';
import icons from '@assets/icons';
import { textRoles } from '@theme/typography';
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

/**
 * Opacity for an unselected tab.
 *
 * The icons are full-colour artwork now, so selection can no longer be shown
 * by changing the icon's hue — tinting a colour PNG collapses it into a
 * silhouette. Dimming keeps the artwork intact while still reading clearly as
 * "not the current tab", and the label's colour and weight carry the state
 * too, so it is never colour alone.
 */
const TAB_INACTIVE_OPACITY = 0.5;

function TabItem({ tab, label, focused, color, badge }: TabItemProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.tabItem}>
      <View style={styles.iconWrap}>
        <View style={{ opacity: focused ? 1 : TAB_INACTIVE_OPACITY }}>
          <AppIcon source={icons[TAB_ICON_ART[tab]]} size={ICON_SIZE.tab} />
        </View>

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
      // Android hardware back walks back through the tabs the user actually
      // visited, in reverse order, and exits the app once there is no history
      // left (i.e. sitting on the initial Home tab).
      //
      // The default for bottom tabs is 'firstRoute', which ignores history
      // entirely: from any tab, back jumped straight to Home, so the screen
      // the user came from was unreachable and two presses always closed the
      // app. 'history' is the Android-idiomatic behaviour and the one users
      // expect from the system back gesture.
      //
      // Screens *inside* a tab's stack are unaffected — the native stack
      // handles back first and pops its own screens; the tab navigator only
      // sees the press once a stack is at its root.
      backBehavior="history"
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
    // Was a literal 9 — the smallest text in the product and two steps below
    // anything on the type ladder. `micro` (11) is the ladder's floor.
    fontSize: textRoles.tabLabel.fontSize,
    fontWeight: '800',
    lineHeight: 13,
  },
  tabLabel: {
    // Was a literal 10, the smallest text in the product and outside the type
    // ladder entirely, so the global size bump could not reach it.
    fontSize: textRoles.tabLabel.fontSize,
    letterSpacing: 0.1,
  },
});
