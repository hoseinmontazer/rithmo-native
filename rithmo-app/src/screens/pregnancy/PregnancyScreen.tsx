/**
 * PregnancyScreen — the single "Pregnancy" stack route.
 *
 * Flow (per spec): Profile → Pregnancy → premium gate if required →
 * setup if no active pregnancy → status if active. All four steps are
 * handled by this one route: PremiumGate covers the paywall step, and the
 * pregnancy-status query decides which of the other two content screens to
 * show — no extra navigation hop, so there's nothing to flash mid-load.
 */
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@hooks/useTheme';
import { PremiumGate } from '@components/PremiumGate';
import { LoadingState } from '@components/ui';
import { usePregnancyStatus } from '@hooks/queries/usePregnancy';
import PregnancySetupScreen from './PregnancySetupScreen';
import PregnancyStatusScreen from './PregnancyStatusScreen';

function PregnancyGatedContent() {
  const { data, isLoading } = usePregnancyStatus();

  if (isLoading) {
    return <LoadingState fullScreen message="در حال بررسی وضعیت بارداری…" />;
  }

  return data?.has_active_pregnancy ? <PregnancyStatusScreen /> : <PregnancySetupScreen />;
}

export default function PregnancyScreen() {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
      <PremiumGate featureName="بارداری">
        <PregnancyGatedContent />
      </PremiumGate>
    </SafeAreaView>
  );
}
