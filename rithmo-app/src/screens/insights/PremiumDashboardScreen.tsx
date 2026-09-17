/**
 * PremiumDashboardScreen — پنل هوش سلامت شخصی (Premium)
 *
 * Minimal Premium home hosting Fertile Window Intelligence (P1.1).
 * Renders exactly what FertileWindowCard needs — nothing here computes
 * anything; the card's own docstring documents its backend data boundary.
 *
 * Free users never reach this screen — reached from a single CTA on
 * InsightsHomeScreen, gated the same way DeepInsightsScreen already is.
 */
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@hooks/useTheme';
import { screen } from '@theme/spacing';
import { PremiumGate } from '@components/PremiumGate';
import { usePremiumStatus } from '@hooks/queries/useSubscription';
import { LoadingState } from '@components/ui';
import { FertileWindowCard } from './components/FertileWindowCard';

export default function PremiumDashboardScreen() {
  const { colors, spacing, typography } = useTheme();
  const { isPremium, isLoading: premiumLoading } = usePremiumStatus();

  // While subscription status loads, avoid a paywall flash.
  if (premiumLoading) {
    return <LoadingState fullScreen message="در حال بارگذاری…" />;
  }

  // Free user — paywall only, same as DeepInsightsScreen.
  if (!isPremium) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['left', 'right', 'bottom']}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: screen.gutter, paddingTop: screen.top, paddingBottom: screen.bottom }}>
          <PremiumGate featureName="پنل هوش سلامت شخصی" />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['left', 'right', 'bottom']}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: screen.gutter, paddingTop: screen.top, paddingBottom: screen.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ───────────────────────────────────────────────────── */}
        <View style={{ marginTop: spacing[3], marginBottom: spacing[5] }}>
          <Text style={[styles.heroTitle, { color: colors.textPrimary, fontSize: typography.xl }]}>
            پنل هوش سلامت شخصی
          </Text>
        </View>

        {/* ── Fertile window (P1.1) ─────────────────────────────────── */}
        <View style={{ marginBottom: spacing[4] }}>
          <FertileWindowCard />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  heroTitle: { fontWeight: '800' },
});
