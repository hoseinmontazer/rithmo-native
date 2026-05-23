import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '@navigation/types';
import { useTheme } from '@hooks/useTheme';
import HomeScreen from '@screens/home/HomeScreen';
import NotificationsScreen from '@screens/notifications/NotificationsScreen';
import AISuggestionsScreen from '@screens/ai/AISuggestionsScreen';

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
        contentStyle: { flex: 1, backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: 'Notifications' }}
      />
      <Stack.Screen
        name="AISuggestions"
        component={AISuggestionsScreen}
        options={{ title: 'AI Insights' }}
      />
    </Stack.Navigator>
  );
}
