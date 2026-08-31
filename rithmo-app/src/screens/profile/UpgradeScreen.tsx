/**
 * UpgradeScreen — paywall (Persian, toman, honest).
 *
 * No fake-AI claims (mission): premium unlocks deterministic personal
 * analytics computed from the user's own logs — correlations, week
 * comparison, reports/export, partner depth.
 *
 * Flow unchanged:
 *   1. Feature list + monthly/annual plan cards
 *   2. "شروع پریمیوم" → POST /api/subscriptions/checkout/ → open URL
 *   3. Endpoint not built yet → honest Persian fallback (support email)
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
import { useSubscription } from '@hooks/queries/useSubscription';
import { apiClient } from '@api/client';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@api/queryKeys';
import { toFa, faDateYear } from '@utils/persian';
import { planLabel, subscriptionStatusLabel } from '@i18n';
import { track } from '@analytics';
import type { ProfileScreenProps } from '@navigation/types';

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
    id:      'annual',
    label:   'سالانه',
    price:   toFa(3000000, { grouped: true }),
    period:  'تومان / سال',
    badge:   'بهترین ارزش',
    savings: '۲ ماه رایگان',
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
  const isDark = useThemeStore((s) => s.isDark);
  // getBrandGradient() returns a FLAT object ({heroFrom, heroTo, goldFrom,
  // goldTo}). Reading `.gold` yielded undefined, and `gold.from` below threw
  // «Cannot read property 'from' of undefined» — the red screen that made the
  // only subscription entry point unusable. Destructure the real fields.
  const { goldFrom, goldTo } = getBrandGradient(isDark);
  const navigation    = useNavigation<Props['navigation']>();
  const queryClient   = useQueryClient();
  const { data: sub, isLoading: subLoading, isError: subError, refetch: refetchSub } = useSubscription();

  const [selectedPlan, setSelectedPlan] = useState<string>('annual');
  const [loading,      setLoading]      = useState(false);

  const featureName = (navigation.getState().routes.slice(-1)[0]?.params as { featureName?: string } | undefined)?.featureName;

  useEffect(() => {
    if (subLoading) { return; }
    track('subscription_viewed', {
      is_active: Boolean(sub?.is_active),
      feature_name: featureName,
    });
  }, [subLoading, sub?.is_active, featureName]);

  const handleUpgrade = useCallback(async () => {
    track('subscription_action_started', { plan: selectedPlan });
    setLoading(true);
    try {
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
  }, [selectedPlan, queryClient]);

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
            onPress={handleUpgrade}
            disabled={loading}
            activeOpacity={0.85}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
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
  ctaBtn:         { paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
});

function spacing24(): number { return 24; }
