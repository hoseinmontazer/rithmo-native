import { navTitle } from '@i18n';
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { WellnessStackParamList } from '@navigation/types';
import { useTheme } from '@hooks/useTheme';

import QuickLogScreen from '@screens/wellness/QuickLogScreen';
import WellnessDashboardScreen from '@screens/wellness/WellnessDashboardScreen';
import LogWellnessScreen from '@screens/wellness/LogWellnessScreen';
import MedicationsScreen from '@screens/wellness/MedicationsScreen';

const Stack = createNativeStackNavigator<WellnessStackParamList>();

export function WellnessStack() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      initialRouteName="QuickLog"
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.primaryDark,
        headerTitleStyle: { color: colors.textPrimary, fontWeight: '800' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="QuickLog"          component={QuickLogScreen}          options={{ title: navTitle('QuickLog'), headerShown: false }} />
      <Stack.Screen name="WellnessDashboard" component={WellnessDashboardScreen} options={{ title: navTitle('WellnessDashboard') }} />
      <Stack.Screen name="LogWellness"       component={LogWellnessScreen}       options={{ title: navTitle('LogWellness') }} />
      <Stack.Screen name="Medications"       component={MedicationsScreen}       options={{ title: navTitle('Medications') }} />
    </Stack.Navigator>
  );
}
