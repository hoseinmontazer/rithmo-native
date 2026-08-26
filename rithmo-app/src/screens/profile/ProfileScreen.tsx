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
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LoadingState, ErrorState, Divider } from '@components/ui';
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
  const { colors, spacing, typography } = useTheme();
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
            borderRadius: 13,
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
  const { colors, spacing, typography } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: accent + '12',
        borderRadius: 16,
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
  const { colors, spacing } = useTheme();
  return (
    <View
      style={{
        marginHorizontal: spacing[5],
        backgroundColor: colors.surface,
        borderRadius: 20,
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
  const { colors, spacing, typography } = useTheme();
  const { user, logout } = useAuth();
  const { data: profile, isLoading, isError, error, refetch } = useProfile();
  const { data: premium } = useSubscription();
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
            borderRadius: 48,
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
            borderRadius: 20,
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
                      borderRadius: 22,
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
                  <View style={{ backgroundColor: colors.success + '18', borderRadius: 8, paddingHorizontal: spacing[2], paddingVertical: 3 }}>
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

      {/* ── Account ────────────────────────────────────────────────────── */}
      {/* ── Logging & history ──────────────────────────────────────────
          These two screens have working, tested backends but no way in.
          WellnessDashboard lost its entry when F-02 removed Home's
          «روزهای اخیر» strip; Medications never had one. Restored as rows
          on the existing account hub rather than as a new navigation
          paradigm — one discoverable entry each, nothing more. */}
      {isCycleOwner && (
        <>
          <SectionHeader label="ثبت و تاریخچه" />
          <MenuCard>
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
              last
            />
          </MenuCard>
        </>
      )}

      <SectionHeader label="حساب" />
      <MenuCard>
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
          last
        />
      </MenuCard>

      {/* ── Premium (gold moment) ─────────────────────────────────────── */}
      <SectionHeader label="اشتراک" />
      <MenuCard>
        {premium && premium.is_active ? (
          <MenuRow
            icon={PROFILE_ICONS.premium}
            label={`پریمیوم — ${planLabel(premium.plan)}`}
            sub={premium.current_period_end
              ? `فعال تا ${faDateShort(premium.current_period_end)}`
              : 'فعال'}
            accentColor={colors.premium}
            onPress={() => navigation.navigate('Upgrade', {})}
            last
          />
        ) : (
          <View style={{ paddingVertical: spacing[3] }}>
            {/* The WHOLE card is the target.
                It used to be a plain View with only the small «ارتقاء»
                label wrapped in a Touchable — a ~40x16pt hit area, far
                under the 48dp minimum. Tapping the obvious place (the
                card) did nothing, so the only route to subscribing was
                effectively unreachable. */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => navigation.navigate('Upgrade', {})}
              accessibilityRole="button"
              accessibilityLabel="ارتقاء به پریمیوم"
              style={{
                backgroundColor: colors.premiumBg,
                borderColor: colors.premiumBorder,
                borderWidth: 1,
                borderRadius: 16,
                padding: spacing[4],
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 13,
                  backgroundColor: colors.premium + '22',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: spacing[3],
                }}
              >
                <Icon name={PROFILE_ICONS.premium} size={ICON_SIZE.lg} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textPrimary, fontSize: typography.base, fontWeight: '700' }}>
                  اشتراک پریمیوم
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: typography.xs, marginTop: 2, lineHeight: 16 }}>
                  بینش عمیق، همبستگی‌ها و مقایسه هفتگی — همه از داده‌های خودت محاسبه‌شده
                </Text>
              </View>
              {/* Affordance only — the card itself carries the press. */}
              <Text style={{ color: colors.premium, fontSize: typography.xs, fontWeight: '800' }}>
                ارتقاء
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </MenuCard>

      {/* ── Support ───────────────────────────────────────────────────── */}
      <SectionHeader label="پشتیبانی" />
      <MenuCard>
        <MenuRow
          icon={PROFILE_ICONS.support}
          label="کمک و پشتیبانی"
          sub="صورتحساب، حریم خصوصی و مسائل شریک — سریع جواب می‌دهیم"
          accentColor={colors.warning}
          onPress={() => navigation.navigate('Support')}
          last
        />
      </MenuCard>

      {/* ── Session ────────────────────────────────────────────────────── */}
      <SectionHeader label="جلسه" />
      <MenuCard>
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex:    { flex: 1 },
  menuRow: { flexDirection: 'row', alignItems: 'center' },
});
