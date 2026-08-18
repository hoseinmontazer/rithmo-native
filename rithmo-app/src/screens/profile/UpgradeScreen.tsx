/**
 * UpgradeScreen — in-app paywall
 *
 * Shown when a free user taps a gated feature (Deep Insights, AI confidence,
 * AI-personalized push). Also reachable from Profile → Settings.
 *
 * Flow:
 *   1. User sees feature list + monthly / annual plan cards
 *   2. Taps "Start Premium" → opens Stripe Checkout in the system browser
 *      (deep-link back to the app via universal link / custom scheme)
 *   3. Stripe webhook → Subscription.is_active = true → usePremiumStatus
 *      cache invalidated on next app foreground → gated screens unlock
 *
 * The Stripe Checkout URL is built server-side (not here) to keep the
 * secret key off the device. This screen calls GET /api/subscriptions/checkout/
 * which returns a one-time Checkout URL for the authenticated user.
 * That endpoint is intentionally NOT built yet — this screen renders a
 * "Contact support" fallback until it is, so the UI is never a dead end.
 */
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@hooks/useTheme';
import { useSubscription } from '@hooks/queries/useSubscription';
import { apiClient } from '@api/client';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@api/queryKeys';
import type { ProfileScreenProps } from '@navigation/types';

type Props = ProfileScreenProps<'Upgrade'>;

// ── Feature list ──────────────────────────────────────────────────────────────

const PREMIUM_FEATURES = [
  {
    icon:  'brain',
    title: 'AI-powered daily insights',
    sub:   'Model-backed suggestions that improve as you log — not generic tips.',
  },
  {
    icon:  'chart-bell-curve-cumulative',
    title: 'Deep Insights correlations',
    sub:   'See exactly how your sleep, stress, mood, and energy connect.',
  },
  {
    icon:  'bell-ring-outline',
    title: 'Personalised push reminders',
    sub:   'Notifications include your AI tip for the day, not a generic prompt.',
  },
  {
    icon:  'history',
    title: 'Full AI insight history',
    sub:   'Review every past suggestion and the data behind it.',
  },
  {
    icon:  'thumb-up-outline',
    title: 'Feedback loop',
    sub:   'Rate insights to make the model smarter for your own patterns.',
  },
];

const FREE_FEATURES = [
  'Period & cycle tracking',
  'Wellness logging',
  'Basic reminders',
  'Partner linking & chat',
  'Medication tracking',
];

// ── Plan cards ────────────────────────────────────────────────────────────────

interface Plan {
  id:        string;
  label:     string;
  price:     string;
  period:    string;
  badge?:    string;
  savings?:  string;
}

const PLANS: Plan[] = [
  {
    id:      'monthly',
    label:   'Monthly',
    price:   '$4.99',
    period:  '/ month',
  },
  {
    id:      'annual',
    label:   'Annual',
    price:   '$39.99',
    period:  '/ year',
    badge:   'Best value',
    savings: 'Save 33%',
  },
];

// ── helpers ───────────────────────────────────────────────────────────────────

async function fetchCheckoutUrl(planId: string): Promise<string | null> {
  try {
    const res = await apiClient.post<{ url: string }>('/api/subscriptions/checkout/', { plan: planId });
    return res.data?.url ?? null;
  } catch {
    return null;
  }
}

// ── main screen ───────────────────────────────────────────────────────────────

export default function UpgradeScreen() {
  const { colors, spacing, typography } = useTheme();
  const navigation    = useNavigation<Props['navigation']>();
  const queryClient   = useQueryClient();
  const { data: sub } = useSubscription();

  const [selectedPlan, setSelectedPlan] = useState<string>('annual');
  const [loading,      setLoading]      = useState(false);

  // If the user already has an active subscription, go back
  if (sub?.is_active) {
    navigation.goBack();
    return null;
  }

  const featureName = (navigation.getState().routes.slice(-1)[0]?.params as any)?.featureName;

  const handleUpgrade = useCallback(async () => {
    setLoading(true);
    try {
      const url = await fetchCheckoutUrl(selectedPlan);
      if (url) {
        // Invalidate subscription cache on return so the gate re-checks
        await Linking.openURL(url);
        queryClient.invalidateQueries({ queryKey: queryKeys.subscription.status() });
      } else {
        // Checkout endpoint not yet built — graceful fallback
        Alert.alert(
          'Coming soon',
          'Online checkout is being set up. In the meantime, email us at support@rithmo.ir to activate your plan.',
          [{ text: 'OK' }],
        );
      }
    } catch {
      Alert.alert('Error', 'Could not open checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedPlan, queryClient]);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={{ padding: spacing[5], paddingBottom: spacing[16] }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ──────────────────────────────────────────────────── */}
        <View style={[styles.hero, { backgroundColor: colors.primaryLighter, borderColor: colors.primary + '30' }]}>
          <View style={[styles.heroIcon, { backgroundColor: colors.primary }]}>
            <Icon name="crown" size={28} color="#fff" />
          </View>
          <Text style={[styles.heroTitle, { color: colors.textPrimary, fontSize: typography['2xl'] }]}>
            {featureName
              ? `Unlock ${featureName}`
              : 'Upgrade to Premium'}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: typography.sm, textAlign: 'center', lineHeight: 20 }}>
            The tracker that gets smarter the more you use it.
          </Text>
        </View>

        {/* ── Premium features ──────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary, fontSize: typography.xs }]}>
          WHAT YOU GET
        </Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {PREMIUM_FEATURES.map((f, i) => (
            <View
              key={f.icon}
              style={[
                styles.featureRow,
                i < PREMIUM_FEATURES.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
              ]}
            >
              <View style={[styles.featureIconBubble, { backgroundColor: colors.primaryLighter }]}>
                <Icon name={f.icon} size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: spacing[3] }}>
                <Text style={{ color: colors.textPrimary, fontSize: typography.sm, fontWeight: '700', marginBottom: 2 }}>
                  {f.title}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: typography.xs, lineHeight: 17 }}>
                  {f.sub}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Free tier reminder ────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary, fontSize: typography.xs }]}>
          ALWAYS FREE
        </Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {FREE_FEATURES.map((f) => (
            <View key={f} style={[styles.freeRow]}>
              <Icon name="check-circle-outline" size={16} color={colors.success} />
              <Text style={{ color: colors.textSecondary, fontSize: typography.sm, marginLeft: spacing[2] }}>
                {f}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Plan selector ─────────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary, fontSize: typography.xs }]}>
          CHOOSE A PLAN
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing[3], marginBottom: spacing[5] }}>
          {PLANS.map((plan) => {
            const selected = selectedPlan === plan.id;
            return (
              <TouchableOpacity
                key={plan.id}
                onPress={() => setSelectedPlan(plan.id)}
                activeOpacity={0.8}
                style={[
                  styles.planCard,
                  {
                    flex: 1,
                    backgroundColor: selected ? colors.primary : colors.surface,
                    borderColor:     selected ? colors.primary : colors.border,
                  },
                ]}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={`${plan.label} plan, ${plan.price} ${plan.period}`}
              >
                {plan.badge && (
                  <View style={[styles.planBadge, { backgroundColor: selected ? '#fff' : colors.primary }]}>
                    <Text style={{ color: selected ? colors.primary : '#fff', fontSize: 10, fontWeight: '800' }}>
                      {plan.badge}
                    </Text>
                  </View>
                )}
                <Text style={{ color: selected ? '#fff' : colors.textPrimary, fontSize: typography.sm, fontWeight: '700', marginBottom: 4 }}>
                  {plan.label}
                </Text>
                <Text style={{ color: selected ? '#fff' : colors.primary, fontSize: typography['2xl'], fontWeight: '900' }}>
                  {plan.price}
                </Text>
                <Text style={{ color: selected ? 'rgba(255,255,255,0.8)' : colors.textSecondary, fontSize: typography.xs }}>
                  {plan.period}
                </Text>
                {plan.savings && (
                  <Text style={{ color: selected ? 'rgba(255,255,255,0.9)' : colors.success, fontSize: typography.xs, fontWeight: '700', marginTop: 4 }}>
                    {plan.savings}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── CTA ───────────────────────────────────────────────────── */}
        <TouchableOpacity
          onPress={handleUpgrade}
          disabled={loading}
          activeOpacity={0.85}
          style={[styles.ctaBtn, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="Start Premium subscription"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Icon name="crown" size={18} color="#fff" style={{ marginRight: spacing[2] }} />
              <Text style={{ color: '#fff', fontSize: typography.base, fontWeight: '800' }}>
                Start Premium
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* ── Legal ─────────────────────────────────────────────────── */}
        <Text style={{ color: colors.textDisabled, fontSize: typography.xs, textAlign: 'center', marginTop: spacing[4], lineHeight: 18 }}>
          Cancel any time. Billed via Stripe.{'\n'}
          By subscribing you agree to our{' '}
          <Text
            style={{ color: colors.primary, textDecorationLine: 'underline' }}
            onPress={() => Linking.openURL('https://rithmo.ir/terms')}
          >
            Terms of Service
          </Text>
          {' '}and{' '}
          <Text
            style={{ color: colors.primary, textDecorationLine: 'underline' }}
            onPress={() => Linking.openURL('https://rithmo.ir/privacy')}
          >
            Privacy Policy
          </Text>
          .
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:            { flex: 1 },
  hero:            { borderRadius: 20, borderWidth: 1, padding: 24, alignItems: 'center', marginBottom: 24, gap: 12 },
  heroIcon:        { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  heroTitle:       { fontWeight: '900', letterSpacing: -0.5, textAlign: 'center' },
  sectionLabel:    { fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10, marginTop: 20 },
  card:            { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 4 },
  featureRow:      { flexDirection: 'row', alignItems: 'flex-start', padding: 14 },
  featureIconBubble: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  freeRow:         { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14 },
  planCard:        { borderRadius: 16, borderWidth: 2, padding: 16, alignItems: 'center', position: 'relative', minHeight: 120, justifyContent: 'center' },
  planBadge:       { position: 'absolute', top: -10, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  ctaBtn:          { borderRadius: 16, paddingVertical: 18, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
});
