import { navTitle } from '@i18n';
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { MessagesStackParamList } from '@navigation/types';
import { useTheme } from '@hooks/useTheme';

const MessagesListScreen  = React.lazy(() => import('@screens/messages/MessagesListScreen'));
const ConversationScreen  = React.lazy(() => import('@screens/messages/ConversationScreen'));

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
      <Stack.Screen name="Conversation"  component={ConversationScreen}  options={({ route }) => ({ title: route.params.partnerName })} />
    </Stack.Navigator>
  );
}
