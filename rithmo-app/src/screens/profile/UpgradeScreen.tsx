/**
 * UpgradeScreen — paywall (Persian, toman, honest).
 *
 * No fake-AI claims (mission): premium unlocks deterministic personal
 * analytics computed from the user's own logs — correlations, week
 * comparison, reports/export, partner depth.
 *
 * Three purchase paths, chosen automatically — never user-chosen — by
 * getPaymentProvider() (@services/installationSource) on Android, and by
 * platform everywhere else:
 *   - Bazaar install: Cafe Bazaar's payment rules require subscriptions
 *     to go through Bazaar's own in-app billing, not a checkout link.
 *     "شروع پریمیوم" → Poolakey subscribeProduct() → purchaseToken sent
 *     to POST /api/subscriptions/bazaar/verify/ for server-side check.
 *     The plan cards themselves come from GET /api/subscriptions/plans/
 *     (subscriptions.models.Plan, admin-managed at /ops/plans/), not a
 *     hardcoded list — an admin can add or retire a Bazaar plan without
 *     an app release. DEFAULT_BAZAAR_PLANS (@constants/config) is only
 *     the offline fallback if that fetch fails.
 *   - Android, not Bazaar (a real sideload, or no installer identity at
 *     all — Phase 2's real-device testing found "no installer identity"
 *     never happens for a genuine Bazaar install, so it's safe to treat
 *     the same as a confirmed sideload here): "شروع پریمیوم" →
 *     POST /api/subscriptions/zibal/request/ → open the returned
 *     payment_url in ZibalPaymentScreen's WebView. Activation happens
 *     server-side once Zibal's callback verifies the payment
 *     (subscriptions/views.py zibal_callback) — this screen only starts
 *     the session and later re-fetches status.
 *   - Everywhere else (iOS): "شروع پریمیوم" → POST /api/subscriptions/checkout/
 *     → open the returned Stripe Checkout URL. Endpoint not built yet →
 *     honest Persian fallback (support email). Unaffected by the above —
 *     Stripe still uses the static PLANS list below.
 */
import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { typography } from '@theme/typography';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientSurface } from '@components/ui';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@hooks/useTheme';
import { screen, borderRadius } from '@theme/spacing';
import { useThemeStore } from '@store/themeStore';
import { getBrandGradient } from '@theme/brand';
import { useSubscription, useBazaarPlans, useZibalPlans } from '@hooks/queries/useSubscription';
import { apiClient } from '@api/client';
import { subscriptionService, type BazaarPlan } from '@api/services/subscriptionService';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@api/queryKeys';
import { toFa, faDateYear } from '@utils/persian';
import { getPaymentProvider } from '@services/installationSource';
import { DEFAULT_BAZAAR_PLANS } from '@constants/config';
import {
  subscribeToPlan,
  getSkuDetails,
  restoreBazaarPurchases,
  isBazaarPurchaseCanceled,
  BazaarNotFoundError,
  DisconnectedError,
} from '@services/bazaarBilling';
import {
  planForBazaarSku,
  summarizeBazaarRestore,
  bazaarRestoreMessage,
  type BazaarVerifyOutcome,
} from '@utils/bazaarRestore';
import { planLabel, subscriptionStatusLabel } from '@i18n';
import { track } from '@analytics';
import type { ProfileScreenProps } from '@navigation/types';
import type { TypedAxiosError } from '@types/api.types';

type Props = ProfileScreenProps<'Upgrade'>;

// ── feature lists (honest — no AI claims) ────────────────────────────────────

const PREMIUM_FEATURES = [
  {
    icon:  'chart-bell-curve-cumulative',
    title: 'بینش عمیق',
    sub:   'همبستگی‌های شخصی: ببین خواب، استرس، خلق و انرژی‌ات دقیقاً چه رابطه‌ای با هم دارند.',
  },
  {
    icon:  'calendar-sync',
    title: 'مقایسه هفتگی',
    sub:   'هفته‌ی جاری در برابر هفته‌ی قبل، برای هر شاخص.',
  },
  {
    icon:  'file-chart-outline',
    title: 'گزارش‌های شخصی',
    sub:   'خلاصه‌ی دوره‌ای از الگوهای بدنت، آماده برای مرور.',
  },
  {
    icon:  'file-export-outline',
    title: 'خروجی گرفتن',
    sub:   'داده‌های خودت را به‌صورت منظم دریافت کن.',
  },
  {
    icon:  'account-heart-outline',
    title: 'امکانات پیشرفته شریک',
    sub:   'دید عمیق‌تر بر چرخه‌ی شریکت.',
  },
];

const FREE_FEATURES = [
  'ردیابی دوره و چرخه',
  'ثبت روزانه‌ی وضعیت',
  'یادآورهای پایه',
  'اتصال شریک و گفتگو',
  'ردیابی داروها',
];

// ── plans (toman) ─────────────────────────────────────────────────────────────

interface Plan {
  id:      string;
  label:   string;
  price:   string;
  period:  string;
  badge?:  string;
  savings?: string;
}

const PLANS: Plan[] = [
  {
    id:     'monthly',
    label:  'ماهانه',
    price:  toFa(300000, { grouped: true }),
    period: 'تومان / ماه',
  },
  {
    id:     'quarterly',
    label:  'سه‌ماهه',
    // Used only on the non-Bazaar (Stripe) path — a Bazaar install
    // renders displayPlans instead, sourced from the live plan catalog.
    // No discount or "most popular" claim here since neither is
    // confirmed; this is exactly 3x the monthly price, no badge.
    price:  toFa(900000, { grouped: true }),
    period: 'تومان / ۳ ماه',
  },
];

// Zibal plans — monthly/annual only, matching the two prices actually
// configured server-side (ZIBAL_PRICE_MONTHLY_RIAL / ZIBAL_PRICE_ANNUAL_RIAL).
// The real amount comes from GET /api/subscriptions/zibal/plans/
// (useZibalPlans below) — never invented here. Converted Rial → Toman
// (÷10) to match this screen's existing Toman display convention.
const ZIBAL_PLAN_IDS = ['monthly', 'annual'] as const;
const ZIBAL_PLAN_LABEL: Record<string, string> = { monthly: 'ماهانه', annual: 'سالانه' };
const ZIBAL_PERIOD_LABEL: Record<string, string> = { monthly: 'تومان / ماه', annual: 'تومان / سال' };

// ── helpers ───────────────────────────────────────────────────────────────────

async function fetchCheckoutUrl(planId: string): Promise<string | null> {
  try {
    const res = await apiClient.post<{ url: string }>('/api/subscriptions/checkout/', { plan: planId });
    return res.data?.url ?? null;
  } catch {
    return null;
  }
}

// Known plan slugs only — an admin-added plan we have no specific
// wording for (e.g. a new "half_year" SKU) falls back to a generic
// per-period phrase rather than guessing a duration.
const BAZAAR_PERIOD_LABEL: Record<string, string> = {
  monthly:   'در ماه',
  quarterly: 'در ۳ ماه',
};
const BAZAAR_PERIOD_LABEL_FALLBACK = 'برای این طرح';

// Copied once, at module load, into a mutable BazaarPlan[] — never inside
// the component. A copy made per-render would be a new array reference
// every time, and it feeds a useEffect dependency below that talks to
// Cafe Bazaar; a reference that changes every render re-fires that effect
// every render, reopening the Bazaar connection in a loop.
const DEFAULT_BAZAAR_PLANS_STABLE: BazaarPlan[] = [...DEFAULT_BAZAAR_PLANS];

// ── main screen ───────────────────────────────────────────────────────────────

export default function UpgradeScreen() {
  const { colors, spacing, typography } = useTheme();
  const isDark = useThemeStore((s) => s.isDark);
  // getBrandGradient() returns a FLAT object ({heroFrom, heroTo, goldFrom,
  // goldTo}). Reading `.gold` yielded undefined, and `gold.from` below threw
  // «Cannot read property 'from' of undefined» — the red screen that made the
  // only subscription entry point unusable. Destructure the real fields.
  const { goldFrom, goldTo } = getBrandGradient(isDark);
  const navigation    = useNavigation<Props['navigation']>();
  const queryClient   = useQueryClient();
  const { data: sub, isLoading: subLoading, isError: subError, refetch: refetchSub } = useSubscription();

  const [selectedPlan, setSelectedPlan] = useState<string>('quarterly');
  const [loading,      setLoading]      = useState(false);
  const [restoring,       setRestoring]       = useState(false);
  // Resolved once on mount, never user-chosen. 'bazaar' | 'zibal' on
  // Android (via getPaymentProvider(), see @services/installationSource —
  // 'unknown' folds into 'zibal': Phase 2's real-device testing found no
  // installer identity never happens for a genuine Bazaar install, so
  // it's only ever a real sideload here); 'stripe' on every other
  // platform (iOS). null until resolved — nothing renders a purchase
  // path before then.
  const [paymentProvider, setPaymentProvider] = useState<'bazaar' | 'zibal' | 'stripe' | null>(null);
  const isBazaar = paymentProvider === 'bazaar';
  const isZibal  = paymentProvider === 'zibal';
  const [bazaarPricesBySku, setBazaarPricesBySku] = useState<Record<string, string>>({});

  const featureName = (navigation.getState().routes.slice(-1)[0]?.params as { featureName?: string } | undefined)?.featureName;

  // Admin-managed plan catalog (subscriptions.models.Plan, /ops/plans/) —
  // falls back to the two originally-shipped plans if the fetch hasn't
  // resolved yet or fails, so a network hiccup never leaves the paywall
  // with nothing to sell.
  const plansQuery = useBazaarPlans(isBazaar);
  const bazaarPlanList: BazaarPlan[] = plansQuery.data && plansQuery.data.length > 0
    ? plansQuery.data
    : DEFAULT_BAZAAR_PLANS_STABLE;

  // The Zibal prices actually configured server-side right now — never a
  // fabricated Toman figure while this is loading or if a plan has no
  // price configured (see useZibalPlans).
  const zibalPlansQuery = useZibalPlans(isZibal);
  const zibalRialByPlan: Record<string, number> = Object.fromEntries(
    (zibalPlansQuery.data ?? []).map((p) => [p.plan, p.amount_rial]),
  );

  // What the plan-selector cards actually render. On a Bazaar install
  // this is built fresh from bazaarPlanList + live Bazaar pricing —
  // never a fabricated price for a plan we don't have one for yet. On
  // Zibal, from zibalRialByPlan the same way. Stripe (iOS) keeps the
  // static Toman-priced PLANS below, unchanged.
  const displayPlans: Plan[] = isBazaar
    ? bazaarPlanList.map((p) => {
        const price = bazaarPricesBySku[p.sku];
        return {
          id:     p.plan,
          label:  p.label_fa || planLabel(p.plan) || p.plan,
          price:  price ?? '…',
          period: price ? (BAZAAR_PERIOD_LABEL[p.plan] ?? BAZAAR_PERIOD_LABEL_FALLBACK) : '',
        };
      })
    : isZibal
      ? ZIBAL_PLAN_IDS.map((id) => {
          const rial = zibalRialByPlan[id];
          const toman = rial != null ? Math.round(rial / 10) : null;
          return {
            id,
            label:  ZIBAL_PLAN_LABEL[id],
            price:  toman != null ? toFa(toman, { grouped: true }) : '…',
            period: toman != null ? ZIBAL_PERIOD_LABEL[id] : '',
          };
        })
      : PLANS;

  useEffect(() => {
    if (subLoading) { return; }
    track('subscription_viewed', {
      is_active: Boolean(sub?.is_active),
      feature_name: featureName,
    });
  }, [subLoading, sub?.is_active, featureName]);

  useEffect(() => {
    let cancelled = false;
    if (Platform.OS !== 'android') {
      setPaymentProvider('stripe');
      return;
    }
    getPaymentProvider().then((provider) => {
      if (cancelled) { return; }
      setPaymentProvider(provider === 'bazaar' ? 'bazaar' : 'zibal');
    });
    return () => { cancelled = true; };
  }, []);

  // Cafe Bazaar's payment rules require the price shown here to match
  // what Bazaar's own client shows — so on a Bazaar install, prefer the
  // real SKU price over any hardcoded figure. Re-fetches whenever the
  // plan catalog changes (e.g. an admin just added a plan).
  useEffect(() => {
    if (!isBazaar) { return; }
    let cancelled = false;
    getSkuDetails(bazaarPlanList.map((p) => p.sku))
      .then((skus) => {
        if (cancelled) { return; }
        setBazaarPricesBySku(Object.fromEntries(skus.map((s) => [s.sku, s.price])));
      })
      .catch(() => { /* keep whatever prices we already had, if any */ });
    return () => { cancelled = true; };
  }, [isBazaar, bazaarPlanList]);

  // Once the real catalog loads, make sure the pre-selected plan still
  // exists in it (an admin could remove "quarterly" entirely).
  useEffect(() => {
    if (!bazaarPlanList.some((p) => p.plan === selectedPlan) && bazaarPlanList.length > 0) {
      setSelectedPlan(bazaarPlanList[0].plan);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bazaarPlanList]);

  // Zibal only prices 'monthly'/'annual' — the default 'quarterly'
  // selection (Stripe/Bazaar's) isn't valid there.
  useEffect(() => {
    if (isZibal && !(ZIBAL_PLAN_IDS as readonly string[]).includes(selectedPlan)) {
      setSelectedPlan('monthly');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isZibal]);

  const handleBazaarUpgrade = useCallback(async (planId: string) => {
    const plan = bazaarPlanList.find((p) => p.plan === planId);
    if (!plan) { return; } // shouldn't happen — selectedPlan is kept in sync with bazaarPlanList above
    try {
      const purchase = await subscribeToPlan(plan.sku);
      await subscriptionService.verifyBazaarPurchase({
        plan:           planId,
        product_id:     purchase.productId,
        purchase_token: purchase.purchaseToken,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.subscription.status() });
    } catch (error) {
      if (isBazaarPurchaseCanceled(error)) {
        return; // user backed out of Bazaar's payment sheet — not a failure
      }
      if (error instanceof BazaarNotFoundError) {
        Alert.alert(
          'برنامه‌ی بازار لازم است',
          'برای خرید اشتراک، برنامه‌ی کافه‌بازار باید روی گوشی‌ات نصب باشد.',
        );
        return;
      }
      Alert.alert('خطا', 'پرداخت از طریق بازار انجام نشد. دوباره تلاش کن.');
    }
  }, [queryClient, bazaarPlanList]);

  // Cafe Bazaar has no webhooks and no client-trusted purchase state — a
  // reinstall, device change, or a purchase whose verifyBazaarPurchase()
  // call never reached our backend (app killed mid-flow) all look the
  // same from here: the backend simply doesn't know about a purchase
  // Bazaar itself still has on record. This asks Bazaar what it has for
  // the current device's Bazaar account and re-submits each one through
  // the same verify endpoint used for a fresh purchase — no second trust
  // path, and the backend's ownership check keeps this safe if a token
  // turns out to belong to a different Rithmo account.
  const handleRestoreBazaarPurchases = useCallback(async () => {
    if (sub?.is_active) {
      Alert.alert('پریمیوم فعال است', 'اشتراک شما همین الان هم فعال است.');
      return;
    }

    track('subscription_restore_started', {});
    setRestoring(true);
    try {
      const purchases = await restoreBazaarPurchases();
      const outcomes: BazaarVerifyOutcome[] = [];
      for (const purchase of purchases) {
        try {
          await subscriptionService.verifyBazaarPurchase({
            plan:           planForBazaarSku(bazaarPlanList, purchase.productId) ?? 'monthly',
            product_id:     purchase.productId,
            purchase_token: purchase.purchaseToken,
          });
          outcomes.push({ ok: true });
        } catch (verifyError) {
          const axiosError = verifyError as TypedAxiosError;
          outcomes.push({
            ok:           false,
            status:       axiosError?.response?.status,
            networkError: !axiosError?.response,
          });
        }
      }

      const result = summarizeBazaarRestore(outcomes);
      if (result.kind === 'restored') {
        queryClient.invalidateQueries({ queryKey: queryKeys.subscription.status() });
        track('subscription_restored', {});
      } else {
        track('subscription_restore_failed', { reason: result.kind });
      }
      Alert.alert(
        result.kind === 'restored' ? 'بازیابی شد' : 'بازیابی خرید',
        bazaarRestoreMessage(result),
      );
    } catch (error) {
      if (error instanceof BazaarNotFoundError) {
        Alert.alert(
          'برنامه‌ی بازار لازم است',
          'برای بازیابی خرید، برنامه‌ی کافه‌بازار باید روی گوشی‌ات نصب باشد.',
        );
      } else if (error instanceof DisconnectedError) {
        Alert.alert('خطا', 'امکان اتصال به کافه‌بازار نبود. دوباره تلاش کن.');
      } else {
        Alert.alert('خطا', 'بازیابی خرید انجام نشد. دوباره تلاش کن.');
      }
      track('subscription_restore_failed', { reason: 'poolakey_error' });
    } finally {
      setRestoring(false);
    }
  }, [sub?.is_active, queryClient, bazaarPlanList]);

  // Starts a Zibal payment session and opens it in ZibalPaymentScreen's
  // WebView. Activation is entirely server-side (see subscriptions/
  // views.py zibal_callback) — this only requests the session and
  // navigates; ZibalPaymentScreen re-fetches subscription status once
  // the WebView reaches our callback URL.
  const handleZibalUpgrade = useCallback(async (planId: string) => {
    if (planId !== 'monthly' && planId !== 'annual') { return; } // shouldn't happen — kept in sync above
    const res = await subscriptionService.requestZibalPayment({ plan: planId });
    navigation.navigate('ZibalPayment', { paymentUrl: res.data.payment_url });
  }, [navigation]);

  const handleUpgrade = useCallback(async () => {
    track('subscription_action_started', { plan: selectedPlan });
    setLoading(true);
    try {
      if (isBazaar) {
        await handleBazaarUpgrade(selectedPlan);
        return;
      }
      if (isZibal) {
        await handleZibalUpgrade(selectedPlan);
        return;
      }
      const url = await fetchCheckoutUrl(selectedPlan);
      if (url) {
        await Linking.openURL(url);
        queryClient.invalidateQueries({ queryKey: queryKeys.subscription.status() });
      } else {
        // Checkout endpoint not built yet — honest fallback
        Alert.alert(
          'به‌زودی',
          'پرداخت آنلاین در حال راه‌اندازی است. برای فعال‌سازی طرح، با پشتیبانی در ارتباط باش: support@rithmo.ir',
          [{ text: 'باشه' }],
        );
      }
    } catch {
      Alert.alert('خطا', 'نمی‌توانستیم صفحه‌ی پرداخت را باز کنیم. دوباره تلاش کن.');
    } finally {
      setLoading(false);
    }
  }, [selectedPlan, queryClient, isBazaar, isZibal, handleBazaarUpgrade, handleZibalUpgrade]);

  // ── State branches ───────────────────────────────────────────────────────
  // All hooks are declared above this point. The previous implementation
  // early-returned on `sub?.is_active` BEFORE `useCallback`, so the moment a
  // subscription became active React rendered fewer hooks than the previous
  // pass and threw. It also called navigation.goBack() during render (a side
  // effect in the render phase) and left an already-paying user with no way
  // to see what they had paid for.

  if (subLoading) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.premium} />
          <Text style={{ color: colors.textSecondary, fontSize: typography.sm, marginTop: spacing[3] }}>
            در حال بررسی اشتراک…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (subError) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['bottom']}>
        <View style={styles.centered}>
          <Icon name="wifi-off" size={32} color={colors.textTertiary} />
          <Text style={{ color: colors.textPrimary, fontSize: typography.base, fontWeight: '700', marginTop: spacing[3] }}>
            وضعیت اشتراکت را نتوانستیم بخوانیم
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: typography.sm, marginTop: spacing[2], textAlign: 'center' }}>
            اتصالت را بررسی کن و دوباره تلاش کن.
          </Text>
          <TouchableOpacity
            onPress={() => refetchSub()}
            style={[styles.retryBtn, { backgroundColor: colors.primary }]}
            accessibilityRole="button"
            accessibilityLabel="تلاش دوباره"
          >
            {/* On colors.primary — must use the paired foreground token. */}
            <Text style={{ color: colors.textOnPrimary, fontWeight: '700', fontSize: typography.sm }}>تلاش دوباره</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Already premium — show what they have instead of bouncing them out.
  if (sub?.is_active) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ScrollView contentContainerStyle={{
          paddingHorizontal: screen.gutter,
          paddingTop: screen.top,
          paddingBottom: screen.bottom,
        }}>
          <GradientSurface colors={[goldFrom, goldTo]} borderRadius={borderRadius.xl} style={styles.hero}>
            <View style={[styles.heroIcon, { backgroundColor: 'rgba(255,255,255,0.22)' }]}>
              <Icon name="crown" size={28} color="#FFF8EC" />
            </View>
            <Text style={[styles.heroTitle, { color: '#FFF8EC', fontSize: typography.xl }]}>
              پریمیوم فعال است
            </Text>
            <Text style={styles.heroSub}>
              {planLabel(sub.plan) ? `طرح ${planLabel(sub.plan)}` : 'اشتراک شما فعال است'}
              {' · '}
              {subscriptionStatusLabel(sub.status)}
            </Text>
          </GradientSurface>

          {sub.current_period_end ? (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: spacing[4] }]}>
              <View style={styles.freeRow}>
                <Icon name="calendar-check" size={16} color={colors.success} />
                <Text style={{ color: colors.textSecondary, fontSize: typography.sm, marginLeft: spacing[2] }}>
                  اعتبار تا {faDateYear(sub.current_period_end)}
                </Text>
              </View>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={{ padding: spacing[5], paddingBottom: spacing[16] }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero (gold) ─────────────────────────────────────────── */}
        <GradientSurface
          colors={[goldFrom, goldTo]}
          borderRadius={borderRadius.xl}
          style={styles.hero}
        >
          <View style={[styles.heroIcon, { backgroundColor: 'rgba(255,255,255,0.22)' }]}>
            <Icon name="crown" size={28} color="#FFF8EC" />
          </View>
          <Text style={[styles.heroTitle, { color: '#FFF8EC', fontSize: typography.xl }]}>
            {featureName ? `باز کردن «${featureName}»` : 'ریتمو پریمیوم'}
          </Text>
          <Text style={styles.heroSub}>
            با هر ثبت، ریتمو بهتر می‌شناسدت. پریمیوم تحلیل‌های عمیق‌تری می‌سازد — از داده‌های خودت، صادقانه و شخصی.
          </Text>
        </GradientSurface>

        {/* ── Premium features ────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary, fontSize: typography.xs }]}>
          چه چیزی باز می‌شود؟
        </Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.premiumBorder }]}>
          {PREMIUM_FEATURES.map((f, i) => (
            <View
              key={f.icon}
              style={[
                styles.featureRow,
                i < PREMIUM_FEATURES.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
              ]}
            >
              <View style={[styles.featureIconBubble, { backgroundColor: colors.premiumBg }]}>
                <Icon name={f.icon} size={18} color={colors.premium} />
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

        {/* ── Always free ─────────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary, fontSize: typography.xs }]}>
          همیشه رایگان
        </Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {FREE_FEATURES.map((f) => (
            <View key={f} style={styles.freeRow}>
              <Icon name="check-circle-outline" size={16} color={colors.success} />
              <Text style={{ color: colors.textSecondary, fontSize: typography.sm, marginLeft: spacing[2] }}>
                {f}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Plan selector ───────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary, fontSize: typography.xs }]}>
          انتخاب طرح
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing[3], marginBottom: spacing[5] }}>
          {displayPlans.map((plan) => {
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
                    backgroundColor: selected ? colors.premiumBg : colors.surface,
                    borderColor:     selected ? colors.premium : colors.border,
                  },
                ]}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={`طرح ${plan.label}: ${plan.price} ${plan.period}`}
              >
                {plan.badge && (
                  <View style={[styles.planBadge, { backgroundColor: colors.premium }]}>
                    <Text style={{ color: '#FFF8EC', fontSize: typography.micro, fontWeight: '800' }}>
                      {plan.badge}
                    </Text>
                  </View>
                )}
                <Text style={{ color: colors.textPrimary, fontSize: typography.sm, fontWeight: '700', marginBottom: 4 }}>
                  {plan.label}
                </Text>
                <Text style={{ color: colors.premium, fontSize: typography.lg, fontWeight: '900' }}>
                  {plan.price}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: typography.xs }}>
                  {plan.period}
                </Text>
                {plan.savings && (
                  <Text style={{ color: colors.success, fontSize: typography.xs, fontWeight: '700', marginTop: 4 }}>
                    {plan.savings}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── CTA (gold) ──────────────────────────────────────────── */}
        <GradientSurface
          colors={[goldFrom, goldTo]}
          diagonal={false}
          borderRadius={borderRadius.lg}
          style={[styles.ctaBtn, { opacity: loading ? 0.7 : 1 }]}
        >
          <TouchableOpacity
            // onPressIn, not onPress — this button sits inside a ScrollView,
            // and even a couple of pixels of finger drift during a quick tap
            // (near-universal on real touchscreens, absent from a scripted
            // zero-movement tap) makes the ScrollView steal the touch as a
            // scroll attempt before a normal release-based onPress ever
            // fires, so a fast tap silently did nothing and only a
            // held-still touch worked. onPressIn fires the moment the touch
            // is granted, before any such drift gets a chance to steal it.
            onPressIn={handleUpgrade}
            disabled={loading}
            activeOpacity={0.85}
            style={{
              width: '100%',
              paddingVertical: 18,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            accessibilityRole="button"
            accessibilityLabel="شروع پریمیوم"
          >
            {loading ? (
              <ActivityIndicator color="#FFF8EC" />
            ) : (
              <>
                <Icon name="crown" size={18} color="#FFF8EC" style={{ marginRight: spacing[2] }} />
                <Text style={{ color: '#FFF8EC', fontSize: typography.base, fontWeight: '800' }}>
                  شروع پریمیوم
                </Text>
              </>
            )}
          </TouchableOpacity>
        </GradientSurface>

        {/* ── Restore purchase (Bazaar installs only) ─────────────── */}
        {isBazaar && (
          <TouchableOpacity
            onPressIn={handleRestoreBazaarPurchases}
            disabled={restoring}
            activeOpacity={0.7}
            style={{ marginTop: spacing[4], alignItems: 'center', paddingVertical: spacing[2] }}
            accessibilityRole="button"
            accessibilityLabel="بازیابی خرید"
          >
            {restoring ? (
              <ActivityIndicator color={colors.textSecondary} size="small" />
            ) : (
              <Text style={{ color: colors.textSecondary, fontSize: typography.sm, fontWeight: '700', textDecorationLine: 'underline' }}>
                بازیابی خرید
              </Text>
            )}
          </TouchableOpacity>
        )}

        {/* ── Legal ───────────────────────────────────────────────── */}
        <Text style={{ color: colors.textDisabled, fontSize: typography.xs, textAlign: 'center', marginTop: spacing[4], lineHeight: 18 }}>
          هر زمان که خواستی لغو کن.{'\n'}
          با اشتراک‌گذاری، با{' '}
          <Text
            style={{ color: colors.premium, textDecorationLine: 'underline' }}
            onPress={() => Linking.openURL('https://rithmo.ir/terms')}
          >
            شرایط استفاده
          </Text>
          {' '}و{' '}
          <Text
            style={{ color: colors.premium, textDecorationLine: 'underline' }}
            onPress={() => Linking.openURL('https://rithmo.ir/privacy')}
          >
            حریم خصوصی
          </Text>
          {' '}موافقت می‌کنی.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  retryBtn: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 11, borderRadius: borderRadius.md },
  root:           { flex: 1 },
  hero:           { padding: 24, alignItems: 'center', marginBottom: spacing24(), gap: 10 },
  heroIcon:       { width: 56, height: 56, borderRadius: borderRadius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  heroTitle:      { fontWeight: '900', textAlign: 'center' },
  heroSub:        { color: 'rgba(255,248,236,0.85)', fontSize: typography.tiny, textAlign: 'center', lineHeight: 20 },
  sectionLabel:   { fontWeight: '800', letterSpacing: 0.4, marginBottom: 10, marginTop: 20 },
  card:           { borderRadius: borderRadius.lg, borderWidth: 1, overflow: 'hidden', marginBottom: 4 },
  featureRow:     { flexDirection: 'row', alignItems: 'flex-start', padding: 14 },
  featureIconBubble: { width: 36, height: 36, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  freeRow:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14 },
  planCard:       { borderRadius: borderRadius.lg, borderWidth: 2, padding: 16, alignItems: 'center', position: 'relative', minHeight: 120, justifyContent: 'center' },
  planBadge:      { position: 'absolute', top: -10, paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.sm },
  // No padding here — it lives on the TouchableOpacity inside instead, so
  // the padded area is part of the tappable region rather than dead space
  // around a smaller hit target (see the CTA button below).
  ctaBtn:         { alignItems: 'center', justifyContent: 'center' },
});

function spacing24(): number { return 24; }
