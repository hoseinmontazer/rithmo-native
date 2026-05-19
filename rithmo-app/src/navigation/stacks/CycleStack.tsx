import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { CycleStackParamList } from '@navigation/types';
import { useTheme } from '@hooks/useTheme';

const CycleTrackerScreen  = React.lazy(() => import('@screens/cycle/CycleTrackerScreen'));
const PeriodDetailScreen  = React.lazy(() => import('@screens/cycle/PeriodDetailScreen'));
const LogPeriodScreen     = React.lazy(() => import('@screens/cycle/LogPeriodScreen'));
const CycleAnalysisScreen = React.lazy(() => import('@screens/cycle/CycleAnalysisScreen'));
const OvulationScreen     = React.lazy(() => import('@screens/cycle/OvulationScreen'));

const Stack = createNativeStackNavigator<CycleStackParamList>();

export function CycleStack() {
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
      <Stack.Screen name="CycleTracker"    component={CycleTrackerScreen}  options={{ title: 'Cycle Tracker' }} />
      <Stack.Screen name="PeriodDetail"    component={PeriodDetailScreen}  options={{ title: 'Period Details' }} />
      <Stack.Screen name="LogPeriod"       component={LogPeriodScreen}     options={{ title: 'Log Period' }} />
      <Stack.Screen name="CycleAnalysis"   component={CycleAnalysisScreen} options={{ title: 'Cycle Analysis' }} />
      <Stack.Screen name="OvulationDetail" component={OvulationScreen}     options={{ title: 'Ovulation' }} />
    </Stack.Navigator>
  );
}
