import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AuthStackParamList } from './types';
import { useTheme } from '@hooks/useTheme';

// Auth screens
import LoginScreen from '@screens/auth/LoginScreen';
import RegisterScreen from '@screens/auth/RegisterScreen';
import ForgotPasswordScreen from '@screens/auth/ForgotPasswordScreen';
import ResetPasswordConfirmScreen from '@screens/auth/ResetPasswordConfirmScreen';
import ActivateAccountScreen from '@screens/auth/ActivateAccountScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Login"           component={LoginScreen} />
      <Stack.Screen name="Register"        component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword"  component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPasswordConfirm" component={ResetPasswordConfirmScreen} />
      <Stack.Screen name="ActivateAccount" component={ActivateAccountScreen} />
    </Stack.Navigator>
  );
}
