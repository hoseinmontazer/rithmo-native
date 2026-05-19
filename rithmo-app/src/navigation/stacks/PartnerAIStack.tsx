/**
 * PartnerAIStack — shown in the MessagesTab for male / partner users.
 * Primary screen: AI Suggestions (wellness companion).
 * Secondary: Partner management (invite / link / messages).
 */
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { MessagesStackParamList } from '@navigation/types';
import { useTheme } from '@hooks/useTheme';

const AISuggestionsScreen = React.lazy(() => import('@screens/ai/AISuggestionsScreen'));
const ConversationScreen  = React.lazy(() => import('@screens/messages/ConversationScreen'));

const Stack = createNativeStackNavigator<MessagesStackParamList>();

export function PartnerAIStack() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle:      { backgroundColor: colors.background },
        headerTintColor:  colors.primaryDark,
        headerTitleStyle: { color: colors.textPrimary, fontWeight: '800' },
        headerShadowVisible: false,
        contentStyle:     { backgroundColor: colors.background },
      }}
    >
      {/* AI Suggestions is the primary "Partner" tab screen for males */}
      <Stack.Screen
        name="MessagesList"
        component={AISuggestionsScreen as React.ComponentType}
        options={{ title: 'AI Insights' }}
      />
      <Stack.Screen
        name="Conversation"
        component={ConversationScreen}
        options={({ route }) => ({ title: route.params.partnerName })}
      />
    </Stack.Navigator>
  );
}
