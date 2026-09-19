/**
 * PregnancyScreen — the single "Pregnancy" stack route.
 *
 * Free for every authenticated user (see docs/DECISIONS.md DEC-005 —
 * Progressive Premium Value: pregnancy status/tracking has no deeper
 * "premium" layer to withhold, so the backend gate was removed rather
 * than split; this screen used to wrap its content in PremiumGate,
 * which is now stale). The pregnancy-status query decides which of the
 * two content screens to show — no extra navigation hop, so there's
 * nothing to flash mid-load.
 */
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@hooks/useTheme';
import { LoadingState } from '@components/ui';
import { usePregnancyStatus } from '@hooks/queries/usePregnancy';
import PregnancySetupScreen from './PregnancySetupScreen';
import PregnancyStatusScreen from './PregnancyStatusScreen';

export default function PregnancyScreen() {
  const { colors } = useTheme();
  const { data, isLoading } = usePregnancyStatus();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
      {isLoading ? (
        <LoadingState fullScreen message="در حال بررسی وضعیت بارداری…" />
      ) : data?.has_active_pregnancy ? (
        <PregnancyStatusScreen />
      ) : (
        <PregnancySetupScreen />
      )}
    </SafeAreaView>
  );
}
