import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { WellnessStackParamList } from '@navigation/types';
import { useTheme } from '@hooks/useTheme';

const WellnessDashboardScreen = React.lazy(() => import('@screens/wellness/WellnessDashboardScreen'));
const LogWellnessScreen       = React.lazy(() => import('@screens/wellness/LogWellnessScreen'));
const MedicationsScreen       = React.lazy(() => import('@screens/wellness/MedicationsScreen'));

const Stack = createNativeStackNavigator<WellnessStackParamList>();

export function WellnessStack() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      initialRouteName="WellnessDashboard"
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.primaryDark,
        headerTitleStyle: { color: colors.textPrimary, fontWeight: '800' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="WellnessDashboard" component={WellnessDashboardScreen} options={{ title: 'Wellness' }} />
      <Stack.Screen name="Medications"       component={MedicationsScreen}       options={{ title: 'Medications' }} />
      <Stack.Screen name="LogWellness"       component={LogWellnessScreen}       options={{ title: 'Log Today' }} />
    </Stack.Navigator>
  );
}
