/**
 * ProfileScreen — حساب و تنظیمات
 *
 * Persian-first profile (mission: no English headers, Persian numerals,
 * consistent terminology). The premium row is a clear "premium moment"
 * with gold styling; honest copy — premium unlocks deterministic personal
 * analytics, not "AI".
 */
import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useRole } from '@hooks/useRole';
import { useTheme } from '@hooks/useTheme';
import { screen } from '@theme/spacing';
import { useAuth } from '@hooks/useAuth';
import { useProfile } from '@hooks/queries/useProfile';
import { useSubscription } from '@hooks/queries/useSubscription';
import { usePregnancyStatus } from '@hooks/queries/usePregnancy';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LoadingState, ErrorState, Divider, GradientSurface, PressScale } from '@components/ui';
import { useThemeStore } from '@store/themeStore';
import { getBrandGradient } from '@theme/brand';
import { PROFILE_ICONS, ICON_SIZE, ACTION_ICONS } from '@design-system/iconography';
import { toFa, faDateShort } from '@utils/persian';
import type { ProfileScreenProps } from '@navigation/types';

type Props = ProfileScreenProps<'Profile'>;

// ── helpers ───────────────────────────────────────────────────────────────────

function initials(first?: string, last?: string, username?: string) {
  if (first && last) {return `${first[0]}${last[0]}`.toUpperCase();}
  if (first)         {return first[0].toUpperCase();}
  if (username)      {return username[0].toUpperCase();}
  return '?';
}

/**
 * The gender badge as an icon plus a word, instead of an emoji plus a word.
 *
 * It read `🌸 زن` / `🌿 مرد` / `🌈 دیگر` until F-07. Three different emoji
 * metaphors (a flower, a herb, a rainbow) for one attribute is not a visual
 * language, and none of them took the badge's own colour. The Persian word
 * carries the meaning either way; the icon is now the app's own.
 */
function sexMeta(sex?: string): { icon: string | null; label: string } {
  if (sex === 'female') {return { icon: 'gender-female', label: 'زن' };}
  if (sex === 'male')   {return { icon: 'gender-male',   label: 'مرد' };}
  if (sex === 'other')  {return { icon: 'account-outline', label: 'دیگر' };}
  return { icon: null, label: '—' };
}

function planLabel(plan?: string | null): string {
  if (plan === 'monthly') {return 'ماهانه';}
  if (plan === 'annual' || plan === 'yearly') {return 'سالانه';}
  return plan || 'فعال';
}

// ── sub-components ────────────────────────────────────────────────────────────

/** Menu row with PNG icon — no border on the icon container */
function MenuRow({
  icon,
  label,
  sub,
  accentColor,
  onPress,
  danger,
  last,
}: {
  /** MaterialCommunityIcons name — see design-system/iconography. */
  icon: string;
  label: string;
  sub?: string;
  accentColor: string;
  onPress: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const textColor = danger ? colors.error : colors.textPrimary;

  return (
    <>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.72}
        style={[styles.menuRow, { paddingVertical: spacing[4] }]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        {/* Icon container — no border */}
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: borderRadius.md,
            backgroundColor: accentColor + '18',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: spacing[3],
          }}
        >
          <Icon name={icon} size={ICON_SIZE.lg} color={accentColor} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ color: textColor, fontSize: typography.base, fontWeight: '600' }}>
            {label}
          </Text>
          {sub && (
            <Text style={{ color: colors.textSecondary, fontSize: typography.xs, marginTop: 2, lineHeight: 16 }}>
              {sub}
            </Text>
          )}
        </View>

        {/*
          Was the literal character ›. Two problems on an RTL screen: it is a
          bidi-mirrored glyph, so its box and direction depend on the surrounding
          paragraph rather than on the layout, which let it collide with the
          right-aligned label; and it pointed the wrong way for RTL forward
          navigation. A vector chevron has a fixed box and one direction.
        */}
        <Icon name="chevron-left" size={ICON_SIZE.md} color={colors.textTertiary} />
      </TouchableOpacity>
      {!last && <Divider />}
    </>
  );
}

/** Stat pill with PNG icon — no border on icon */
function StatPill({
  icon,
  label,
  value,
  accent,
}: {
  /** MaterialCommunityIcons name — see design-system/iconography. */
  icon: string;
  label: string;
  value: string;
  accent: string;
}) {
  const { colors, spacing, typography, borderRadius } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: accent + '12',
        borderRadius: borderRadius.lg,
        paddingVertical: spacing[3],
        paddingHorizontal: spacing[2],
        alignItems: 'center',
        gap: 2,
      }}
    >
      <Icon name={icon} size={ICON_SIZE.tab} color={accent} />
      <Text style={{ color: accent, fontSize: typography.lg, fontWeight: '800' }}>
        {value}
      </Text>
      <Text style={{ color: colors.textSecondary, fontSize: typography.xs }}>
        {label}
      </Text>
    </View>
  );
}

/** Section header */
function SectionHeader({ label }: { label: string }) {
  const { colors, spacing, typography } = useTheme();
  return (
    <Text
      style={{
        color: colors.textSecondary,
        fontSize: typography.xs,
        fontWeight: '700',
        letterSpacing: 0.8,
        marginBottom: spacing[2],
        marginTop: spacing[5],
        paddingHorizontal: spacing[5],
      }}
    >
      {label}
    </Text>
  );
}

/** Card container */
function MenuCard({ children }: { children: React.ReactNode }) {
  const { colors, spacing, borderRadius } = useTheme();
  return (
    <View
      style={{
        marginHorizontal: spacing[5],
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        overflow: 'hidden',
        paddingHorizontal: spacing[4],
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
      }}
    >
      {children}
    </View>
  );
}

// ── main screen ───────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const navigation = useNavigation<Props['navigation']>();
  const { colors, spacing, typography, borderRadius } = useTheme();
  const { user, logout } = useAuth();
  const { data: profile, isLoading, isError, error, refetch } = useProfile();
  const { data: premium } = useSubscription();
  const { data: pregnancy } = usePregnancyStatus();
  const isDark = useThemeStore((s) => s.isDark);
  const { premiumGreenFrom, premiumGreenTo } = getBrandGradient(isDark);
  // Hoisted above the early returns below — hooks must run in the same
  // order on every render.
  const { isPartner } = useRole();

  const handleLogout = useCallback(() => {
    Alert.alert('خروج از حساب', 'آیا مطمئنی می‌خواهی خارج شوی؟', [
      { text: 'انصراف', style: 'cancel' },
      { text: 'خروج', style: 'destructive', onPress: logout },
    ]);
  }, [logout]);

  if (isLoading) {return <LoadingState fullScreen />;}
  if (isError)   {return <ErrorState fullScreen error={error} onRetry={refetch} />;}

  const hasPartner  = (profile?.partners?.length ?? 0) > 0;
  /*
   * Owner-only surfaces are gated on ROLE, not on sex.
   *
   * These blocks used to test `sex === 'male'`, which conflated two
   * different things. A partner is any gender — the product says so
   * explicitly — so a female partner was shown the cycle-length and
   * period-length stat pills and the «ثبت و تاریخچه» rows, none of which
   * describe her. Worse, those rows navigate into `LogTab`, a tab that
   * MainNavigator does not register for partners at all, so the only thing
   * they could do was fail.
   *
   * `sex === 'male'` is kept as an additional guard purely so a male owner
   * (an account that predates the role field) is not shown cycle stats it
   * has no data for.
   */
  const isMale      = profile?.sex === 'male';
  const isCycleOwner = !isPartner && !isMale;
  const displayName = profile?.first_name && profile?.last_name
    ? `${profile.first_name} ${profile.last_name}`
    : profile?.first_name || user?.username || 'کاربر';

  const cycleValue  = profile?.preferred_cycle_length ?? profile?.cycle_length ?? 28;
  const periodValue = profile?.preferred_period_duration ?? profile?.period_duration ?? 5;

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: colors.background }]}
      contentContainerStyle={{
          paddingHorizontal: screen.gutter,
          paddingTop: screen.top,
          paddingBottom: screen.bottomTab,
        }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <View
        style={{
          backgroundColor: colors.surface,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
          paddingHorizontal: spacing[5],
          paddingTop: spacing[6],
          paddingBottom: spacing[6],
          alignItems: 'center',
        }}
      >
        {/* Avatar */}
        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: borderRadius.pill,
            backgroundColor: colors.primaryDark,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: spacing[3],
            shadowColor: colors.primaryDark,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.28,
            shadowRadius: 16,
            elevation: 8,
          }}
        >
          <Text style={{ color: colors.textOnPrimary, fontSize: typography['2xl'], fontWeight: '900' }}>
            {initials(profile?.first_name, profile?.last_name, user?.username)}
          </Text>
        </View>

        <Text style={{ color: colors.textPrimary, fontSize: typography['2xl'], fontWeight: '800', letterSpacing: -0.5, marginBottom: 3 }}>
          {displayName}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: typography.sm }}>
          {profile?.email ?? user?.email}
        </Text>
        <Text style={{ color: colors.textTertiary, fontSize: typography.xs, marginTop: 2 }}>
          @{profile?.username ?? user?.username}
        </Text>

        {/* Sex badge */}
        <View
          style={{
            marginTop: spacing[3],
            backgroundColor: colors.primaryLighter,
            borderRadius: borderRadius.xl,
            paddingHorizontal: spacing[4],
            paddingVertical: spacing[1],
            // Row + gap rather than a directional margin: the layout is RTL,
            // and `gap` is side-agnostic where `marginLeft` would not be.
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          }}
        >
          {sexMeta(profile?.sex).icon ? (
            <Icon
              name={sexMeta(profile?.sex).icon as string}
              size={ICON_SIZE.xs}
              color={colors.primary}
            />
          ) : null}
          <Text style={{ color: colors.primary, fontSize: typography.xs, fontWeight: '700' }}>
            {sexMeta(profile?.sex).label}
          </Text>
        </View>

        {/* Stats row (fa numerals) */}
        <View style={{ flexDirection: 'row', gap: spacing[3], marginTop: spacing[5], width: '100%' }}>
          {isCycleOwner && (
            <StatPill
              key="cycle"
              icon={PROFILE_ICONS.cycleLength}
              label={profile?.preferred_cycle_length != null ? 'طول چرخه' : 'میانگین چرخه'}
              value={`${toFa(cycleValue)} روز`}
              accent={colors.menstrual}
            />
          )}
          {isCycleOwner && (
            <StatPill
              key="period"
              icon={PROFILE_ICONS.periodLength}
              label={profile?.preferred_period_duration != null ? 'طول دوره' : 'میانگین دوره'}
              value={`${toFa(periodValue)} روز`}
              accent={colors.luteal}
            />
          )}
          <StatPill
            key="partners"
            icon={PROFILE_ICONS.partners}
            label="شرکاء"
            value={toFa(profile?.partners?.length ?? 0)}
            accent={colors.primary}
          />
        </View>
      </View>

      {/* ── Premium (gold moment) — its own gradient card, not a menu row,
          matching the "Rhythmo App" mockup's premium card treatment. Placed
          right after the hero, same as the mockup, rather than buried in
          the section stack. ─────────────────────────────────────────── */}
      <PressScale
        onPress={() => navigation.navigate('Upgrade', {})}
        accessibilityRole="button"
        accessibilityLabel={premium?.is_active ? 'مدیریت اشتراک پریمیوم' : 'ارتقاء به پریمیوم'}
        style={{ marginHorizontal: spacing[5] }}
      >
        <GradientSurface colors={[premiumGreenFrom, premiumGreenTo]} borderRadius={borderRadius['2xl']} style={{ padding: spacing[5] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[3] }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textOnDark, fontSize: typography.base, fontWeight: '800' }}>
                ریتمو پریمیوم
              </Text>
              <Text style={{ color: colors.textOnDark, opacity: 0.85, fontSize: typography.xs, marginTop: spacing[1], lineHeight: 18 }}>
                {premium?.is_active
                  ? (premium.current_period_end
                      ? `طرح ${planLabel(premium.plan)} · فعال تا ${faDateShort(premium.current_period_end)}`
                      : `طرح ${planLabel(premium.plan)} · فعال`)
                  : 'بازتاب روزانه، حالت بارداری و الگوهای بلندمدت.'}
              </Text>
            </View>
            <View
              style={{
                paddingHorizontal: spacing[4],
                paddingVertical: spacing[2],
                borderRadius: borderRadius.pill,
                backgroundColor: 'rgba(255,255,255,0.18)',
                minHeight: 40,
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: colors.textOnDark, fontSize: typography.sm, fontWeight: '700' }}>
                {premium?.is_active ? 'مدیریت' : 'فعال‌سازی'}
              </Text>
            </View>
          </View>
        </GradientSurface>
      </PressScale>

      {/* ── Pregnancy (premium) — a real toggle switch, matching the mockup's
          treatment, but it opens the real Pregnancy flow rather than firing
          an instant on/off: turning it on needs a starting date to compute
          the week from, which a bare toggle has no way to collect, and
          turning it off is a real deactivation the setup/status screen
          already handles correctly. The switch shows the true current
          state; it just doesn't pretend one tap is the whole action. ───── */}
      <SectionHeader label="بارداری" />
      <MenuCard>
        <TouchableOpacity
          onPress={() => navigation.navigate('Pregnancy')}
          activeOpacity={0.72}
          style={[styles.menuRow, { paddingVertical: spacing[4] }]}
          accessibilityRole="button"
          accessibilityLabel={pregnancy?.has_active_pregnancy
            ? `حالت بارداری روشن است، هفتهٔ ${toFa(pregnancy.gestational_week ?? 0)}`
            : 'حالت بارداری خاموش است'}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.textPrimary, fontSize: typography.base, fontWeight: '600' }}>
              حالت بارداری
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: typography.xs, marginTop: 2, lineHeight: 16 }}>
              {pregnancy?.has_active_pregnancy
                ? `روشن — هفتهٔ ${toFa(pregnancy.gestational_week ?? 0)}`
                : 'خاموش — پیش‌بینی چرخه فعال است'}
            </Text>
          </View>
          <View
            style={{
              width: 58,
              height: 32,
              borderRadius: borderRadius.pill,
              backgroundColor: pregnancy?.has_active_pregnancy ? colors.primary : colors.border,
              padding: 3,
              flexDirection: 'row',
              justifyContent: pregnancy?.has_active_pregnancy ? 'flex-start' : 'flex-end',
            }}
          >
            <View
              style={{
                width: 26,
                height: 26,
                borderRadius: borderRadius.pill,
                backgroundColor: colors.surface,
                shadowColor: colors.shadowColor,
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.18,
                shadowRadius: 4,
                elevation: 2,
              }}
            />
          </View>
        </TouchableOpacity>
      </MenuCard>

      {/* ── Partner ────────────────────────────────────────────────────── */}
      <SectionHeader label="شریک" />
      <MenuCard>
        {hasPartner ? (
          <>
            {profile!.partners!.map((p, i) => (
              <React.Fragment key={p.partner_user_id ?? p.username}>
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing[3] }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: borderRadius.pill,
                      backgroundColor: colors.follicular + '20',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: spacing[3],
                    }}
                  >
                    <Icon name={PROFILE_ICONS.partnerManage} size={ICON_SIZE.lg} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: typography.base }}>
                      {p.username}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: typography.xs }}>
                      {p.email}
                    </Text>
                  </View>
                  <View style={{ backgroundColor: colors.success + '18', borderRadius: borderRadius.sm, paddingHorizontal: spacing[2], paddingVertical: 3 }}>
                    <Text style={{ color: colors.success, fontSize: typography.overline, fontWeight: '800' }}>ارتباط فعال</Text>
                  </View>
                </View>
                {i < profile!.partners!.length - 1 && <Divider />}
              </React.Fragment>
            ))}
            <Divider />
            {/* Chat was reachable only through Profile → مدیریت شریک → باز
                کردن پیام‌ها, i.e. three levels deep behind a screen about
                unlinking. The conversation screen and its send mutation were
                fully built; they were simply almost impossible to find. This
                is a second route to the SAME destination — no new screen. */}
            <MenuRow
              icon={ACTION_ICONS.messages}
              label="پیام‌ها"
              sub="گفتگو با شریکت"
              accentColor={colors.follicular}
              onPress={() => navigation.navigate('PartnerMessages' as never)}
            />
            <Divider />
            <MenuRow
              icon={PROFILE_ICONS.partnerManage}
              label="مدیریت شریک"
              sub="قطع یا به‌روزرسانی ارتباط شریک"
              accentColor={colors.primary}
              onPress={() => navigation.navigate('PartnerManage')}
              last
            />
          </>
        ) : (
          <MenuRow
            icon={PROFILE_ICONS.partnerManage}
            label="اتصال شریک"
            sub="دعوت شریک برای اتصال به ریتمو"
            accentColor={colors.primary}
            onPress={() => navigation.navigate('PartnerManage')}
            last
          />
        )}
      </MenuCard>

      {/* ── Settings — one dense list, not five separate section+card
          blocks. Every real destination from the old Account / Logging &
          history / Support / Session sections is still one tap away; they
          just no longer each carry their own header and card, which was
          the actual source of the "messy" read against the mockup's single
          compact settings list. ─────────────────────────────────────── */}
      <SectionHeader label="تنظیمات" />
      <MenuCard>
        {isCycleOwner && (
          <>
            <MenuRow
              icon={PROFILE_ICONS.history}
              label="تاریخچه سلامت"
              sub="گزارش‌های روزانه‌ات، روز به روز"
              accentColor={colors.primary}
              onPress={() => navigation.navigate('LogTab' as never, { screen: 'WellnessDashboard' } as never)}
            />
            <MenuRow
              icon={PROFILE_ICONS.medications}
              label="داروها و مکمل‌ها"
              sub="یادآور و سابقه‌ی مصرف"
              accentColor={colors.luteal}
              onPress={() => navigation.navigate('LogTab' as never, { screen: 'Medications' } as never)}
            />
          </>
        )}
        <MenuRow
          icon={PROFILE_ICONS.editProfile}
          label="ویرایش پروفایل"
          sub="نام، جنسیت، تنظیمات چرخه"
          accentColor={colors.primary}
          onPress={() => navigation.navigate('EditProfile')}
        />
        <MenuRow
          icon={PROFILE_ICONS.password}
          label="تغییر رمز عبور"
          sub="به‌روزرسانی رمز ورودت"
          accentColor={colors.ovulationColor}
          onPress={() => navigation.navigate('ChangePassword')}
        />
        <MenuRow
          icon={PROFILE_ICONS.settings}
          label="تنظیمات"
          sub="اعلان‌ها، ظاهر برنامه و ترجیحات"
          accentColor={colors.follicular}
          onPress={() => navigation.navigate('Settings')}
        />
        <MenuRow
          icon={PROFILE_ICONS.support}
          label="کمک و پشتیبانی"
          sub="صورتحساب، حریم خصوصی و مسائل شریک — سریع جواب می‌دهیم"
          accentColor={colors.warning}
          onPress={() => navigation.navigate('Support')}
        />
        <MenuRow
          icon={PROFILE_ICONS.logout}
          label="خروج"
          sub="به‌زودی دوباره می‌بینمت"
          accentColor={colors.warning}
          danger
          onPress={handleLogout}
        />
        <MenuRow
          icon={PROFILE_ICONS.deleteAccount}
          label="حذف حساب"
          sub="حذف دائمی تمام داده‌های تو"
          accentColor={colors.error}
          danger
          onPress={() => navigation.navigate('DeleteAccount')}
          last
        />
      </MenuCard>

      <Text
        style={{
          color: colors.textTertiary,
          fontSize: typography.xs,
          textAlign: 'center',
          marginTop: spacing[4],
          marginHorizontal: spacing[6],
        }}
      >
        داده‌های تو روی دستگاه خودت رمزگذاری می‌شوند.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex:    { flex: 1 },
  menuRow: { flexDirection: 'row', alignItems: 'center' },
});
