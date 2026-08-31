import { navTitle } from '@i18n';
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ProfileStackParamList } from '@navigation/types';
import { useTheme } from '@hooks/useTheme';
import { MessagesStack } from './MessagesStack';

import ProfileScreen from '@screens/profile/ProfileScreen';
import EditProfileScreen from '@screens/profile/EditProfileScreen';
import PartnerManageScreen from '@screens/profile/PartnerManageScreen';
import SettingsScreen from '@screens/profile/SettingsScreen';
import ChangePasswordScreen from '@screens/profile/ChangePasswordScreen';
import DeleteAccountScreen from '@screens/profile/DeleteAccountScreen';
import UpgradeScreen from '@screens/profile/UpgradeScreen';
import SupportScreen from '@screens/support/SupportScreen';
import PregnancyScreen from '@screens/pregnancy/PregnancyScreen';

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
      <Stack.Screen name="Profile"         component={ProfileScreen}        options={{ headerShown: false }} />
      <Stack.Screen name="EditProfile"     component={EditProfileScreen}    options={{ title: navTitle('EditProfile') }} />
      <Stack.Screen name="PartnerManage"   component={PartnerManageScreen}  options={{ title: navTitle('PartnerManage') }} />
      <Stack.Screen
        name="PartnerMessages"
        component={MessagesStack as React.ComponentType}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="Settings"        component={SettingsScreen}       options={{ title: navTitle('Settings') }} />
      <Stack.Screen name="ChangePassword"  component={ChangePasswordScreen} options={{ title: navTitle('ChangePassword') }} />
      <Stack.Screen name="DeleteAccount"   component={DeleteAccountScreen}  options={{ title: navTitle('DeleteAccount') }} />
      <Stack.Screen name="Support"         component={SupportScreen}       options={{ title: navTitle('Support') }} />
      <Stack.Screen name="Pregnancy"       component={PregnancyScreen as React.ComponentType} options={{ title: navTitle('Pregnancy') }} />
      <Stack.Screen
        name="Upgrade"
        component={UpgradeScreen as React.ComponentType}
        options={{ title: navTitle('Upgrade'), presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}
