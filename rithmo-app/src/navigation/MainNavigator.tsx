/**
 * MainNavigator — Bottom tab bar
 *
 * Five destinations, in equal slots: Home | Cycle | Patterns | Health | Profile.
 *
 * "Log" is an ACTION, not a destination. Its route (LogTab) stays registered,
 * because notifications, cold start and several screens navigate to it, but it
 * has no slot in the bar: a slim "log today" row above the bar opens QuickLog
 * from the root of Cycle and Patterns (Home has its own quick-log entry points;
 * see logActionVisibility.ts).
 * "Patterns" is the Insights hub — data-state-aware in Phase 1,
 *   populated with cross-cycle intelligence in Phase 2+.
 */
import React, { useEffect, useState } from 'react';
import { BottomTabBar, createBottomTabNavigator, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, Platform, ActivityIndicator, Keyboard } from 'react-native';
import type { MainTabParamList } from './types';
import { HomeStack }     from './stacks/HomeStack';
import { CycleStack }    from './stacks/CycleStack';
import { WellnessStack } from './stacks/WellnessStack';
import { InsightsStack } from './stacks/InsightsStack';
import { ProfileStack }  from './stacks/ProfileStack';
import { HealthStack }   from './stacks/HealthStack';
import { useUnreadNotifications } from '@hooks/queries/useNotifications';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { TAB_ICON_ART, ICON_SIZE, type TabKey } from '@design-system/iconography';
import { AppIcon, ErrorState, PressScale } from '@components/ui';
import icons from '@assets/icons';
import { textRoles } from '@theme/typography';
import { useTheme } from '@hooks/useTheme';
import { useRole } from '@hooks/useRole';
import { useProfile } from '@hooks/queries/useProfile';
import { useAuthStore } from '@store/authStore';
import { roleGate } from './roleGate';
import { usePushTokenRegistration } from '@hooks/usePushTokenRegistration';
import { onMainNavigatorReady } from './navigationRef';
import { shouldShowLogAction } from './logActionVisibility';

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

      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        style={[styles.tabLabel, { color, fontWeight: focused ? '700' : '400' }]}
      >
        {label}
      </Text>
    </View>
  );
}

// ── Log action (floating, outside the row of destinations) ───────────────────

/** A plain plus: the action is "add today's entry", not a place. */
const LOG_ACTION_ICON = 'plus';
const LOG_ACTION_HEIGHT = 44;

function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setVisible(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  return visible;
}

/**
 * The tab bar, with the Log action in its own row directly above it.
 *
 * It used to float over the content, which covered the end of text lines on a
 * scrolled screen. A row in the bar's own layout takes its height out of the
 * screen area instead, so the scene above simply ends where the row begins and
 * nothing can sit underneath the button.
 */
function MainTabBar(props: BottomTabBarProps) {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const keyboardVisible = useKeyboardVisible();
  const showLog = shouldShowLogAction(props.state as never, keyboardVisible);

  return (
    <View>
      {showLog ? (
        <View
          style={{
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            borderTopWidth: StyleSheet.hairlineWidth,
            paddingHorizontal: spacing[4],
            paddingVertical: spacing[2],
          }}
        >
          <PressScale
            onPress={() => (props.navigation as never as { navigate: (n: string, p: object) => void }).navigate('LogTab', { screen: 'QuickLog' })}
            accessibilityRole="button"
            accessibilityLabel="ثبت سریع امروز"
            scaleTo={0.985}
            style={{
              height: LOG_ACTION_HEIGHT,
              borderRadius: borderRadius.pill,
              backgroundColor: colors.primaryLight,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing[2],
            }}
          >
            <Icon name={LOG_ACTION_ICON} size={22} color={colors.primaryDark} />
            <Text style={{ color: colors.primaryDark, fontSize: typography.bodySmall, fontWeight: '700' }}>ثبت امروز</Text>
          </PressScale>
        </View>
      ) : null}
      <BottomTabBar {...props} />
    </View>
  );
}

// ── Navigator ─────────────────────────────────────────────────────────────────

export function MainNavigator() {
  const { data: unreadNotifs } = useUnreadNotifications();
  const { colors }             = useTheme();
  const { isResolved, isPartner, hasTrustedRole } = useRole();
  const sessionVerified = useAuthStore((s) => s.sessionVerified);
  const revalidateSession = useAuthStore((s) => s.revalidateSession);
  const { error: profileError, refetch: refetchProfile } = useProfile();
  const gate = roleGate({ isResolved, hasTrustedRole, sessionVerified });
  // Registers the device's FCM token with the backend once authenticated —
  // both roles can receive a message, so this runs regardless of isPartner.
  // A no-op until the native Firebase setup exists (see the hook's own
  // docstring); safe to mount unconditionally.
  usePushTokenRegistration();

  // Today 2.1 Phase E: a notification tap that cold-started the app is
  // queued until the tab navigator (and so LogTab) actually exists — which
  // is only once the role gate below has opened. See navigationRef.ts.
  useEffect(() => {
    if (gate === 'open') {
      onMainNavigatorReady();
    }
  }, [gate]);

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

  // Started offline on saved tokens and nothing trustworthy says whether this
  // is an owner or a partner: never guess 'owner' (see roleGate.ts). The
  // session stays; retry asks the server again for the profile (and so the
  // role) and re-checks the session.
  if (gate === 'unknown') {
    return (
      <ErrorState
        error={profileError}
        onRetry={() => {
          refetchProfile();
          revalidateSession().catch(() => { /* stays unverified; retry again */ });
        }}
        fullScreen
      />
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
      tabBar={(props) => <MainTabBar {...props} />}
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

      {/* ── Log: registered for navigation, hidden from the bar ───────
          Notifications, cold start and several screens navigate to LogTab, so
          the route must exist; the action button above opens it instead. */}
      <Tab.Screen
        name="LogTab"
        component={WellnessStack}
        options={{
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
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

      {/* ── Health (Contraception & Sexual Health) ───────────────────────
          Its own area beside Cycle and Insights, for every role: a partner
          keeps their own private records, so it is not in the owner-only
          block above. */}
      <Tab.Screen
        name="HealthTab"
        component={HealthStack}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabItem
              tab="health"
              label="سلامت جنسی"
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
              tab="profile"
              label="پروفایل"
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
    // The slot's own width, not a fixed 56: with the Log button centred the
    // slots are narrower on small phones, and a wider fixed box clipped labels.
    width: '100%',
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
