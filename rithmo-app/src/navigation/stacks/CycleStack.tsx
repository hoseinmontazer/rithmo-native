import { navTitle } from '@i18n';
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { CycleStackParamList } from '@navigation/types';
import { useTheme } from '@hooks/useTheme';

import CycleTrackerScreen from '@screens/cycle/CycleTrackerScreen';
import EditPeriodScreen from '@screens/cycle/EditPeriodScreen';
import LogPeriodScreen from '@screens/cycle/LogPeriodScreen';
import CycleAnalysisScreen from '@screens/cycle/CycleAnalysisScreen';

const Stack = createNativeStackNavigator<CycleStackParamList>();

export function CycleStack() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      initialRouteName="CycleAnalysis"
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.primaryDark,
        headerTitleStyle: { color: colors.textPrimary, fontWeight: '800' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="CycleAnalysis"   component={CycleAnalysisScreen} options={{ title: navTitle('CycleAnalysis') }} />
      <Stack.Screen name="CycleTracker"    component={CycleTrackerScreen}  options={{ title: navTitle('CycleTracker') }} />
      <Stack.Screen name="EditPeriod"      component={EditPeriodScreen}    options={{ title: navTitle('EditPeriod') }} />
      <Stack.Screen name="LogPeriod"       component={LogPeriodScreen}     options={{ title: navTitle('LogPeriod') }} />
    </Stack.Navigator>
  );
}
