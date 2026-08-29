import { navTitle } from '@i18n';
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '@navigation/types';
import { useTheme } from '@hooks/useTheme';
import HomeScreen from '@screens/home/HomeScreen';
import PartnerHomeScreen from '@screens/home/PartnerHomeScreen';
import InsightDetailScreen from '@screens/home/InsightDetailScreen';
import { useRole } from '@hooks/useRole';
import NotificationsScreen from '@screens/notifications/NotificationsScreen';

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeStack() {
  const { colors } = useTheme();
  // The partner gets a different product, not a filtered copy of hers —
  // support context and suggestions instead of her own tracking surface.
  // This is presentation only; the data boundary is enforced server-side
  // by /api/intelligence/partner/today/ and PartnerShareSettings.
  const { isPartner } = useRole();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.primaryDark,
        headerTitleStyle: { color: colors.textPrimary, fontWeight: '800' },
        headerShadowVisible: false,
        contentStyle: { flex: 1, backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="Home"
        component={isPartner ? PartnerHomeScreen : HomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: navTitle('Notifications') }}
      />
      {/* Owner-only by construction — see the HomeStackParamList comment.
          isPartner's screen above (PartnerHomeScreen) has no button or tap
          target that navigates here, so a partner-role user has no route
          to it even though it is technically registered on this stack. */}
      <Stack.Screen
        name="InsightDetail"
        component={InsightDetailScreen}
        options={{ title: 'چیزی که درباره تو یاد گرفته‌ام' }}
      />
    </Stack.Navigator>
  );
}
