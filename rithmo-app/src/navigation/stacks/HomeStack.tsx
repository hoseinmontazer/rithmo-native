import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '@navigation/types';
import { useTheme } from '@hooks/useTheme';

const HomeScreen         = React.lazy(() => import('@screens/home/HomeScreen'));
const NotificationsScreen = React.lazy(() => import('@screens/notifications/NotificationsScreen'));
const AISuggestionsScreen = React.lazy(() => import('@screens/ai/AISuggestionsScreen'));

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeStack() {
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
      <Stack.Screen name="Home"          component={HomeScreen}          options={{ title: 'Rithmo' }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
      <Stack.Screen name="AISuggestions" component={AISuggestionsScreen} options={{ title: 'AI Insights' }} />
    </Stack.Navigator>
  );
}
