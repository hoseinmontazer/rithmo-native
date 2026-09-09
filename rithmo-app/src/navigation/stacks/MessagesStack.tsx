import { navTitle } from '@i18n';
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { MessagesStackParamList } from '@navigation/types';
import { useTheme } from '@hooks/useTheme';

import MessagesListScreen from '@screens/messages/MessagesListScreen';
import ConversationScreen from '@screens/messages/ConversationScreen';

const Stack = createNativeStackNavigator<MessagesStackParamList>();

export function MessagesStack() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.primaryDark,
        headerTitleStyle: { color: colors.textPrimary, fontWeight: '800' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="MessagesList"  component={MessagesListScreen}  options={{ title: navTitle('MessagesList') }} />
      <Stack.Screen
        name="Conversation"
        component={ConversationScreen}
        options={({ route }) => ({
          title: route.params.partnerName,
          // App.tsx calls enableFreeze(true) globally, which makes every
          // screen default to freezeOnBlur: true — react-native-screens
          // suspends a blurred screen via an internal view-clipping
          // mechanism (the native code path behind removeClippedSubviews).
          // Popping this screen back to MessagesList used to reliably crash
          // Fabric right there — "Cannot remove child at index N ...
          // IndexOutOfBoundsException" inside
          // ReactViewGroup.removeViewWithSubviewClippingEnabled — leaving a
          // blank white screen until the app was force-restarted. The real
          // fix was upgrading react-native-screens (3.34.0 → 3.37.0), which
          // resolved it outright; this override is kept as a low-cost extra
          // margin on the one screen that actually hit the bug.
          freezeOnBlur: false,
        })}
      />
    </Stack.Navigator>
  );
}
