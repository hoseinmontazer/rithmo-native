/**
 * PremiumGate
 *
 * Wrap any section that should be visible only to premium users:
 *
 *   <PremiumGate featureName="Deep Insights">
 *     <DeepInsightsContent />
 *   </PremiumGate>
 *
 * Behaviour:
 *   - While subscription status is loading → renders children (optimistic,
 *     avoids flash of paywall on app start)
 *   - isPremium = true  → renders children normally
 *   - isPremium = false → renders a locked card with an "Unlock" CTA that
 *     navigates to UpgradeScreen as a modal
 *
 * The navigation call uses the common pattern of navigating to
 * 'ProfileTab' → 'Upgrade' so it works from any tab without needing
 * a shared modal navigator.
 */
import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@hooks/useTheme';
import { usePremiumStatus } from '@hooks/queries/useSubscription';

interface PremiumGateProps {
  children:     React.ReactNode;
  featureName?: string;
  /** If true, renders children behind a blur/overlay instead of replacing them */
  overlay?:     boolean;
}

export function PremiumGate({ children, featureName, overlay = false }: PremiumGateProps) {
  const { isPremium, isLoading } = usePremiumStatus();
  const { colors, spacing, typography } = useTheme();
  const navigation = useNavigation();

  const handleUpgrade = useCallback(() => {
    navigation.dispatch(
      CommonActions.navigate({
        name: 'ProfileTab',
        params: {
          screen: 'Upgrade',
          params: { featureName },
        },
      }),
    );
  }, [navigation, featureName]);

  // Loading or premium → show children
  if (isLoading || isPremium) {
    return <>{children}</>;
  }

  // Overlay mode — show children dimmed with a lock banner on top
  if (overlay) {
    return (
      <View style={styles.overlayRoot}>
        <View style={styles.overlayDim} pointerEvents="none">
          {children}
        </View>
        <View style={[styles.overlayBanner, { backgroundColor: colors.surface, borderColor: colors.primary + '40' }]}>
          <Icon name="lock-outline" size={20} color={colors.primary} />
          <Text style={{ color: colors.textPrimary, fontSize: typography.sm, fontWeight: '700', marginHorizontal: spacing[3], flex: 1 }}>
            {featureName ? `${featureName} is Premium` : 'Premium feature'}
          </Text>
          <TouchableOpacity
            onPress={handleUpgrade}
            style={[styles.unlockBtn, { backgroundColor: colors.primary }]}
            accessibilityRole="button"
            accessibilityLabel={`Unlock ${featureName ?? 'premium feature'}`}
          >
            <Text style={{ color: '#fff', fontSize: typography.xs, fontWeight: '800' }}>Unlock</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Default: replace content with a locked card
  return (
    <View style={[styles.lockedCard, { backgroundColor: colors.surface, borderColor: colors.primary + '30' }]}>
      {/* Top accent */}
      <View style={{ height: 3, backgroundColor: colors.primary, borderTopLeftRadius: 16, borderTopRightRadius: 16 }} />

      <View style={{ padding: spacing[5], alignItems: 'center' }}>
        <View style={[styles.lockIcon, { backgroundColor: colors.primaryLighter }]}>
          <Icon name="crown" size={24} color={colors.primary} />
        </View>

        <Text style={{ color: colors.textPrimary, fontSize: typography.base, fontWeight: '800', textAlign: 'center', marginBottom: spacing[2] }}>
          {featureName ? `${featureName}` : 'Premium feature'}
        </Text>

        <Text style={{ color: colors.textSecondary, fontSize: typography.sm, textAlign: 'center', lineHeight: 20, marginBottom: spacing[5] }}>
          This feature is included in the Premium plan — a tracker that gets smarter
          and more personal the more you log.
        </Text>

        <TouchableOpacity
          onPress={handleUpgrade}
          activeOpacity={0.85}
          style={[styles.ctaBtn, { backgroundColor: colors.primary }]}
          accessibilityRole="button"
          accessibilityLabel="Upgrade to Premium"
        >
          <Icon name="crown" size={16} color="#fff" style={{ marginRight: spacing[2] }} />
          <Text style={{ color: '#fff', fontSize: typography.sm, fontWeight: '800' }}>
            Upgrade to Premium
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  lockedCard:   { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginVertical: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  lockIcon:     { width: 52, height: 52, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  ctaBtn:       { borderRadius: 12, paddingVertical: 14, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center' },
  overlayRoot:  { position: 'relative' },
  overlayDim:   { opacity: 0.25 },
  overlayBanner:{ flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, padding: 12, marginTop: 8 },
  unlockBtn:    { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
});
