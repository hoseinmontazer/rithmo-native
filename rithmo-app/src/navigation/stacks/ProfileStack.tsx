import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '@navigation/types';
import { useTheme } from '@hooks/useTheme';
import { MessagesStack } from './MessagesStack';

const ProfileScreen        = React.lazy(() => import('@screens/profile/ProfileScreen'));
const EditProfileScreen    = React.lazy(() => import('@screens/profile/EditProfileScreen'));
const PartnerManageScreen  = React.lazy(() => import('@screens/profile/PartnerManageScreen'));
const SettingsScreen       = React.lazy(() => import('@screens/profile/SettingsScreen'));
const ChangePasswordScreen = React.lazy(() => import('@screens/profile/ChangePasswordScreen'));
const DeleteAccountScreen  = React.lazy(() => import('@screens/profile/DeleteAccountScreen'));
const UpgradeScreen        = React.lazy(() => import('@screens/profile/UpgradeScreen'));

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileStack() {
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
      <Stack.Screen name="Profile"         component={ProfileScreen}        options={{ title: 'Profile' }} />
      <Stack.Screen name="EditProfile"     component={EditProfileScreen}    options={{ title: 'Edit Profile' }} />
      <Stack.Screen name="PartnerManage"   component={PartnerManageScreen}  options={{ title: 'Partner' }} />
      <Stack.Screen
        name="PartnerMessages"
        component={MessagesStack as React.ComponentType}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="Settings"        component={SettingsScreen}       options={{ title: 'Settings' }} />
      <Stack.Screen name="ChangePassword"  component={ChangePasswordScreen} options={{ title: 'Change Password' }} />
      <Stack.Screen name="DeleteAccount"   component={DeleteAccountScreen}  options={{ title: 'Delete Account' }} />
      <Stack.Screen
        name="Upgrade"
        component={UpgradeScreen as React.ComponentType}
        options={{ title: 'Go Premium', presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}
