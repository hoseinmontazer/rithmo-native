import { navTitle } from '@i18n';
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { InsightsStackParamList } from '@navigation/types';
import { useTheme } from '@hooks/useTheme';

import InsightsHomeScreen from '@screens/insights/InsightsHomeScreen';
import DeepInsightsScreen from '@screens/insights/DeepInsightsScreen';
import LearningTimelineScreen from '@screens/insights/LearningTimelineScreen';

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
        options={{ title: navTitle('InsightsHome'), headerShown: false }}
      />
      <Stack.Screen
        name="DeepInsights"
        component={DeepInsightsScreen}
        options={{ title: navTitle('DeepInsights') }}
      />
      <Stack.Screen
        name="LearningTimeline"
        component={LearningTimelineScreen}
        options={{ title: navTitle('LearningTimeline') }}
      />
    </Stack.Navigator>
  );
}
