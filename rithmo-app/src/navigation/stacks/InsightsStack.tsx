import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { InsightsStackParamList } from '@navigation/types';
import { useTheme } from '@hooks/useTheme';

const InsightsHomeScreen = React.lazy(() => import('@screens/insights/InsightsHomeScreen'));

const Stack = createNativeStackNavigator<InsightsStackParamList>();

export function InsightsStack() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      initialRouteName="InsightsHome"
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.primaryDark,
        headerTitleStyle: { color: colors.textPrimary, fontWeight: '800' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="InsightsHome"
        component={InsightsHomeScreen}
        options={{ title: 'الگوهای من', headerShown: false }}
      />
    </Stack.Navigator>
  );
}
