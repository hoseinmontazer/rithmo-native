/**
 * TTCScreen — the single "TTC" stack route (P1.4.1).
 *
 * Flow (per spec): Profile → TTC → premium gate if required → setup if
 * not trying → status if trying/paused. All steps are handled by this
 * one route, mirroring PregnancyScreen: PremiumGate covers the paywall
 * step, and the TTC-status query decides which of the other two content
 * screens to show — no extra navigation hop.
 */
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@hooks/useTheme';
import { PremiumGate } from '@components/PremiumGate';
import { LoadingState } from '@components/ui';
import { useTTCStatus } from '@hooks/queries/useTTC';
import TTCSetupScreen from './TTCSetupScreen';
import TTCStatusScreen from './TTCStatusScreen';

function TTCGatedContent() {
  const { data, isLoading } = useTTCStatus();

  if (isLoading) {
    return <LoadingState fullScreen message="در حال بررسی وضعیت…" />;
  }

  return data && data.status !== 'not_trying' ? <TTCStatusScreen /> : <TTCSetupScreen />;
}

export default function TTCScreen() {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
      <PremiumGate featureName="تلاش برای بارداری">
        <TTCGatedContent />
      </PremiumGate>
    </SafeAreaView>
  );
}
