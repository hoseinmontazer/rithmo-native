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
  children?:    React.ReactNode;
  featureName?: string;
  /** If true, renders children behind a blur/overlay instead of replacing them */
  overlay?:     boolean;
}

export function PremiumGate({ children, featureName, overlay = false }: PremiumGateProps) {
  const { isPremium, isLoading } = usePremiumStatus();
  const { colors, spacing, typography, borderRadius } = useTheme();
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

  // Loading or premium → show children (nothing to render if used as standalone upsell)
  if (isLoading || isPremium) {
    return children ? <>{children}</> : null;
  }

  // Overlay mode — show children dimmed with a lock banner on top
  if (overlay && children) {
    return (
      <View style={styles.overlayRoot}>
        <View style={styles.overlayDim} pointerEvents="none">
          {children}
        </View>
        <View
          style={[
            styles.overlayBanner,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: borderRadius.medium,
            },
          ]}
        >
          <Icon name="lock-outline" size={18} color={colors.textPrimary} />
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: typography.bodySmall,
              fontWeight: '600',
              marginHorizontal: spacing[3],
              flex: 1,
            }}
          >
            {featureName ? `${featureName} ویژه‌ی پرمیوم است` : 'امکان پرمیوم'}
          </Text>
          <TouchableOpacity
            onPress={handleUpgrade}
            style={[
              styles.unlockBtn,
              { backgroundColor: colors.primary, borderRadius: borderRadius.small },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`باز کردن ${featureName ?? 'امکان پرمیوم'}`}
          >
            <Text style={{ color: colors.textOnPrimary, fontSize: typography.label, fontWeight: '700' }}>
              باز کردن
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Default: replace content with a locked card
  return (
    <View
      style={[
        styles.lockedCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: borderRadius.large,
        },
      ]}
    >
      <View style={{ padding: spacing[5], alignItems: 'center' }}>
        <View style={[styles.lockIcon, { backgroundColor: colors.surfaceSubtle, borderRadius: borderRadius.medium }]}>
          <Icon name="crown-outline" size={24} color={colors.primary} />
        </View>

        <Text
          style={{
            color: colors.textPrimary,
            fontSize: typography.title,
            fontWeight: '700',
            textAlign: 'center',
            marginBottom: spacing[2],
          }}
        >
          {featureName ? `${featureName}` : 'امکان پرمیوم'}
        </Text>

        <Text
          style={{
            color: colors.textSecondary,
            fontSize: typography.bodySmall,
            textAlign: 'center',
            lineHeight: 20,
            marginBottom: spacing[4],
          }}
        >
          این امکان در طرح پرمیوم گنجانده شده — همراه سلامتی شخصی که با ثبت‌های بیشتر، عمیق‌تر می‌شود.
        </Text>

        <TouchableOpacity
          onPress={handleUpgrade}
          activeOpacity={0.8}
          style={[
            styles.ctaBtn,
            {
              backgroundColor: colors.primary,
              borderRadius: borderRadius.medium,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel="ارتقا به پرمیوم"
        >
          <Icon name="crown" size={16} color={colors.textOnPrimary} style={{ marginHorizontal: 4 }} />
          <Text style={{ color: colors.textOnPrimary, fontSize: typography.button, fontWeight: '700' }}>
            ارتقا به پرمیوم
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  lockedCard:   { borderWidth: 1, overflow: 'hidden', marginVertical: 8 },
  lockIcon:     { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  ctaBtn:       { paddingVertical: 12, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  overlayRoot:  { position: 'relative' },
  overlayDim:   { opacity: 0.25 },
  overlayBanner:{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, padding: 12, marginTop: 8 },
  unlockBtn:    { paddingHorizontal: 12, paddingVertical: 6 },
});

