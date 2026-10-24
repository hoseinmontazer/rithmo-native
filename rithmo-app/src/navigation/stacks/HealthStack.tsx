import { navTitle } from '@i18n';
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { HealthStackParamList } from '@navigation/types';
import { useTheme } from '@hooks/useTheme';

import HealthGuideHubScreen from '@screens/healthGuide/HealthGuideHubScreen';
import GuideArticleScreen from '@screens/healthGuide/GuideArticleScreen';
import MethodCompareScreen from '@screens/healthGuide/MethodCompareScreen';
import MyContraceptionScreen from '@screens/healthGuide/MyContraceptionScreen';
import HealthChecksScreen from '@screens/healthGuide/HealthChecksScreen';

const Stack = createNativeStackNavigator<HealthStackParamList>();

/** Contraception & Sexual Health: one stack, mounted as the Health tab for every role. */
export function HealthStack() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      initialRouteName="HealthGuide"
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.primaryDark,
        headerTitleStyle: { color: colors.textPrimary, fontWeight: '800' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="HealthGuide"     component={HealthGuideHubScreen}  options={{ title: navTitle('HealthGuide') }} />
      <Stack.Screen name="GuideArticle"    component={GuideArticleScreen as React.ComponentType} options={{ title: navTitle('GuideArticle') }} />
      <Stack.Screen name="MethodCompare"   component={MethodCompareScreen}   options={{ title: navTitle('MethodCompare') }} />
      <Stack.Screen name="MyContraception" component={MyContraceptionScreen} options={{ title: navTitle('MyContraception') }} />
      <Stack.Screen name="HealthChecks"    component={HealthChecksScreen}    options={{ title: navTitle('HealthChecks') }} />
    </Stack.Navigator>
  );
}
