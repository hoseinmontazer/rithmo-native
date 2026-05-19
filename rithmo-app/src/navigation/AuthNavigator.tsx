import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AuthStackParamList } from './types';
import { useTheme } from '@hooks/useTheme';

// Lazy-loaded auth screens
const LoginScreen        = React.lazy(() => import('@screens/auth/LoginScreen'));
const RegisterScreen     = React.lazy(() => import('@screens/auth/RegisterScreen'));
const ForgotPasswordScreen = React.lazy(() => import('@screens/auth/ForgotPasswordScreen'));
const ResetPasswordConfirmScreen = React.lazy(() => import('@screens/auth/ResetPasswordConfirmScreen'));
const ActivateAccountScreen = React.lazy(() => import('@screens/auth/ActivateAccountScreen'));

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
      <Stack.Screen name="Login"           component={LoginScreen as React.ComponentType} />
      <Stack.Screen name="Register"        component={RegisterScreen as React.ComponentType} />
      <Stack.Screen name="ForgotPassword"  component={ForgotPasswordScreen as React.ComponentType} />
      <Stack.Screen name="ResetPasswordConfirm" component={ResetPasswordConfirmScreen as React.ComponentType} />
      <Stack.Screen name="ActivateAccount" component={ActivateAccountScreen as React.ComponentType} />
    </Stack.Navigator>
  );
}
