/**
 * ProfileScreen — حساب و تنظیمات (Redesigned)
 *
 * Persian-first, luxurious, and cohesive profile experience:
 *  1. Modern user hero with refined avatar, verified handle, and edit shortcut.
 *  2. 3 airy stat tiles (طول چرخه, طول دوره, شرکاء) with soft icons and clean typography.
 *  3. Luxury Premium Banner with crown badge and active status details.
 *  4. Clean grouped cards for pregnancy, partner connection, health tools, and account actions.
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
import { Card, LoadingState, ErrorState, Divider, PressScale } from '@components/ui';
import { PROFILE_ICONS, ICON_SIZE, ACTION_ICONS } from '@design-system/iconography';
import { toFa, faDateShort } from '@utils/persian';
import type { ProfileScreenProps } from '@navigation/types';

type Props = ProfileScreenProps<'Profile'>;

// ── helpers ───────────────────────────────────────────────────────────────────

function initials(first?: string, last?: string, username?: string) {
  if (first && last) { return `${first[0]}${last[0]}`.toUpperCase(); }
  if (first)         { return first[0].toUpperCase(); }
  if (username)      { return username[0].toUpperCase(); }
  return '؟';
}

function sexMeta(sex?: string): { icon: string | null; label: string } {
  if (sex === 'female') { return { icon: 'gender-female', label: 'زن' }; }
  if (sex === 'male')   { return { icon: 'gender-male',   label: 'مرد' }; }
  if (sex === 'other')  { return { icon: 'account-outline', label: 'دیگر' }; }
  return { icon: null, label: '—' };
}

function planLabel(plan?: string | null): string {
  if (plan === 'monthly') { return 'ماهانه'; }
  if (plan === 'annual' || plan === 'yearly') { return 'سالانه'; }
  return plan || 'فعال';
}

// ── sub-components ────────────────────────────────────────────────────────────

function MenuRow({
  icon,
  label,
  sub,
  accentColor,
  onPress,
  danger,
  last,
}: {
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
        style={[styles.menuRow, { paddingVertical: spacing[3] + 2 }]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        {/* Icon tile */}
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: borderRadius.lg,
            backgroundColor: accentColor + '15',
            alignItems: 'center',
            justifyContent: 'center',
            marginEnd: spacing[3],
          }}
        >
          <Icon name={icon} size={20} color={accentColor} />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ color: textColor, fontSize: typography.base, fontWeight: '600' }}>
            {label}
          </Text>
          {sub && (
            <Text style={{ color: colors.textTertiary, fontSize: typography.xs, marginTop: 2, lineHeight: 17 }}>
              {sub}
            </Text>
          )}
        </View>

        <Icon name="chevron-left" size={18} color={colors.textTertiary} />
      </TouchableOpacity>
      {!last && <Divider />}
    </>
  );
}

function StatCard({
  icon,
  label,
  value,
  accentColor,
}: {
  icon: string;
  label: string;
  value: string;
  accentColor: string;
}) {
  const { colors, spacing, typography, borderRadius, shadow } = useTheme();
  return (
    <Card
      rounded="xl"
      style={[
        styles.statCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          padding: spacing[3],
          ...(shadow.xs || {}),
        },
      ]}
    >
      <View style={[styles.statIconWrap, { backgroundColor: accentColor + '14', borderRadius: borderRadius.md }]}>
        <Icon name={icon} size={18} color={accentColor} />
      </View>
      <Text style={[styles.statValue, { color: colors.textPrimary, fontSize: typography.large, fontWeight: '800' }]}>
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: colors.textTertiary, fontSize: typography.micro, marginTop: 2 }]}>
        {label}
      </Text>
    </Card>
  );
}

function SectionHeader({ label, icon }: { label: string; icon: string }) {
  const { colors, spacing, typography } = useTheme();
  return (
    <View style={[styles.sectionHeaderRow, { marginTop: spacing[5], marginBottom: spacing[2] }]}>
      <Icon name={icon} size={16} color={colors.primary} />
      <Text style={{ color: colors.textSecondary, fontSize: typography.caption, fontWeight: '700' }}>
        {label}
      </Text>
    </View>
  );
}

// ── main screen ───────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const navigation = useNavigation<Props['navigation']>();
  const { colors, spacing, typography, borderRadius, shadow } = useTheme();
  const { user, logout } = useAuth();
  const { data: profile, isLoading, isError, error, refetch } = useProfile();
  const { data: premium } = useSubscription();
  const { data: pregnancy } = usePregnancyStatus();
  const { isPartner } = useRole();

  const handleLogout = useCallback(() => {
    Alert.alert('خروج از حساب', 'آیا مطمئنی می‌خواهی خارج شوی؟', [
      { text: 'انصراف', style: 'cancel' },
      { text: 'خروج', style: 'destructive', onPress: logout },
    ]);
  }, [logout]);

  if (isLoading) { return <LoadingState fullScreen />; }
  if (isError)   { return <ErrorState fullScreen error={error} onRetry={refetch} />; }

  const hasPartner = (profile?.partners?.length ?? 0) > 0;
  const isMale = profile?.sex === 'male';
  const isCycleOwner = !isPartner && !isMale;
  const displayName = profile?.first_name && profile?.last_name
    ? `${profile.first_name} ${profile.last_name}`
    : profile?.first_name || user?.username || 'کاربر ریتمو';
  const email = profile?.email ?? user?.email;
  const username = profile?.username ?? user?.username;

  const cycleValue = profile?.preferred_cycle_length ?? profile?.cycle_length ?? 28;
  const periodValue = profile?.preferred_period_duration ?? profile?.period_duration ?? 5;
  const sex = sexMeta(profile?.sex);

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: colors.background }]}
      contentContainerStyle={{
        paddingTop: screen.top + spacing[6],
        paddingHorizontal: screen.gutter,
        paddingBottom: screen.bottomTab,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── 1. User Profile Hero Card ─────────────────────────────────── */}
      <Card
        rounded="2xl"
        style={[
          styles.heroCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            padding: spacing[5],
            ...(shadow.xs || {}),
          },
        ]}
      >
        <View style={styles.heroRow}>
          {/* Avatar Ring */}
          <View
            style={[
              styles.avatarRing,
              {
                backgroundColor: colors.primaryLighter,
                borderColor: colors.primary,
                borderRadius: borderRadius.pill,
              },
            ]}
          >
            <Text style={[styles.avatarText, { color: colors.primaryDark, fontSize: typography['2xl'], fontWeight: '800' }]}>
              {initials(profile?.first_name, profile?.last_name, user?.username)}
            </Text>
          </View>

          {/* Identity details */}
          <View style={styles.heroDetails}>
            <Text numberOfLines={1} style={[styles.userName, { color: colors.textPrimary, fontSize: typography.heading, fontWeight: '800' }]}>
              {displayName}
            </Text>
            {email ? (
              <Text numberOfLines={1} style={[styles.userEmail, { color: colors.textTertiary, fontSize: typography.xs, marginTop: 2 }]}>
                {email}
              </Text>
            ) : null}

            {/* Tags row */}
            <View style={[styles.tagsRow, { marginTop: spacing[2] }]}>
              {sex.icon ? (
                <View
                  style={[
                    styles.tagBadge,
                    {
                      backgroundColor: colors.surfaceSecondary,
                      borderColor: colors.border,
                      borderRadius: borderRadius.pill,
                    },
                  ]}
                >
                  <Icon name={sex.icon} size={13} color={colors.textSecondary} />
                  <Text style={{ color: colors.textSecondary, fontSize: typography.micro, fontWeight: '700' }}>
                    {sex.label}
                  </Text>
                </View>
              ) : null}

              {username ? (
                <View
                  style={[
                    styles.tagBadge,
                    {
                      backgroundColor: colors.surfaceSecondary,
                      borderColor: colors.border,
                      borderRadius: borderRadius.pill,
                    },
                  ]}
                >
                  <Text style={{ color: colors.textSecondary, fontSize: typography.micro, fontWeight: '700' }}>
                    @{username}
                  </Text>
                </View>
              ) : null}

              {pregnancy?.has_active_pregnancy ? (
                <View
                  style={[
                    styles.tagBadge,
                    {
                      backgroundColor: colors.primaryLighter,
                      borderColor: colors.primaryLight,
                      borderRadius: borderRadius.pill,
                    },
                  ]}
                >
                  <Icon name="human-pregnant" size={13} color={colors.primaryDark} />
                  <Text style={{ color: colors.primaryDark, fontSize: typography.micro, fontWeight: '700' }}>
                    هفتهٔ {toFa(pregnancy.gestational_week ?? 0)}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Quick Edit Profile Button */}
          <TouchableOpacity
            onPress={() => navigation.navigate('EditProfile')}
            activeOpacity={0.72}
            style={[
              styles.editBtn,
              {
                backgroundColor: colors.surfaceSecondary,
                borderColor: colors.border,
                borderRadius: borderRadius.pill,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="ویرایش پروفایل"
          >
            <Icon name={PROFILE_ICONS.editProfile} size={18} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </Card>

      {/* ── 2. Stat Metric Cards (3 side-by-side) ────────────────────────── */}
      <View style={[styles.statsRow, { marginTop: spacing[3] }]}>
        {isCycleOwner && (
          <StatCard
            icon={PROFILE_ICONS.cycleLength}
            label={profile?.preferred_cycle_length != null ? 'طول چرخه' : 'میانگین چرخه'}
            value={`${toFa(cycleValue)} روز`}
            accentColor={colors.primary}
          />
        )}
        {isCycleOwner && (
          <StatCard
            icon={PROFILE_ICONS.periodLength}
            label={profile?.preferred_period_duration != null ? 'طول دوره' : 'میانگین دوره'}
            value={`${toFa(periodValue)} روز`}
            accentColor={colors.follicular}
          />
        )}
        <StatCard
          icon={PROFILE_ICONS.partners}
          label="شرکاء"
          value={`${toFa(profile?.partners?.length ?? 0)} نفر`}
          accentColor={colors.luteal}
        />
      </View>

      {/* ── 3. Luxury Premium Banner ──────────────────────────────────── */}
      <PressScale
        onPress={() => navigation.navigate('Upgrade', {})}
        accessibilityRole="button"
        accessibilityLabel={premium?.is_active ? 'مدیریت اشتراک پریمیوم' : 'ارتقاء به پریمیوم'}
        style={{ marginTop: spacing[4] }}
      >
        <Card
          rounded="2xl"
          style={[
            styles.premiumCard,
            {
              backgroundColor: colors.primaryDark,
              borderColor: 'rgba(255,215,0,0.35)',
              padding: spacing[4],
              ...(shadow.sm || {}),
            },
          ]}
        >
          <View style={styles.premiumInner}>
            <View style={[styles.crownWrap, { borderRadius: borderRadius.pill }]}>
              <Icon name={PROFILE_ICONS.premium} size={22} color="#FFD700" />
            </View>

            <View style={styles.premiumTextCol}>
              <View style={styles.premiumTitleRow}>
                <Text style={{ color: '#FFFFFF', fontSize: typography.medium, fontWeight: '800' }}>
                  ریتمو پریمیوم
                </Text>
                {premium?.is_active && (
                  <View style={styles.activePill}>
                    <Text style={{ color: '#FFD700', fontSize: typography.micro, fontWeight: '800' }}>
                      فعال
                    </Text>
                  </View>
                )}
              </View>
              <Text style={{ color: 'rgba(255,255,255,0.82)', fontSize: typography.xs, marginTop: 3, lineHeight: 18 }}>
                {premium?.is_active
                  ? (premium.current_period_end
                      ? `طرح ${planLabel(premium.plan)} · معتبر تا ${faDateShort(premium.current_period_end)}`
                      : `طرح ${planLabel(premium.plan)}`)
                  : 'بازتاب روزانه، حالت بارداری و تحلیل‌های پیشرفته'}
              </Text>
            </View>

            <View
              style={[
                styles.manageBtn,
                {
                  backgroundColor: 'rgba(255,255,255,0.18)',
                  borderColor: 'rgba(255,255,255,0.3)',
                  borderRadius: borderRadius.pill,
                },
              ]}
            >
              <Text style={{ color: '#FFFFFF', fontSize: typography.caption, fontWeight: '700' }}>
                {premium?.is_active ? 'مدیریت' : 'فعال‌سازی'}
              </Text>
            </View>
          </View>
        </Card>
      </PressScale>

      {/* ── 4. Pregnancy Mode ─────────────────────────────────────────── */}
      {isCycleOwner && (
        <>
          <SectionHeader label="بارداری" icon={PROFILE_ICONS.pregnancy} />
          <Card rounded="2xl" style={{ backgroundColor: colors.surface, borderColor: colors.border, paddingHorizontal: spacing[4] }}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Pregnancy')}
              activeOpacity={0.72}
              style={[styles.menuRow, { paddingVertical: spacing[3] + 2 }]}
              accessibilityRole="button"
              accessibilityLabel={pregnancy?.has_active_pregnancy
                ? `حالت بارداری روشن است، هفتهٔ ${toFa(pregnancy.gestational_week ?? 0)}`
                : 'حالت بارداری خاموش است'}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textPrimary, fontSize: typography.base, fontWeight: '600' }}>
                  حالت بارداری
                </Text>
                <Text style={{ color: colors.textTertiary, fontSize: typography.xs, marginTop: 2, lineHeight: 17 }}>
                  {pregnancy?.has_active_pregnancy
                    ? `روشن — هفتهٔ ${toFa(pregnancy.gestational_week ?? 0)}`
                    : 'خاموش — پیش‌بینی چرخه فعال است'}
                </Text>
              </View>
              <View
                style={{
                  width: 50,
                  height: 28,
                  borderRadius: borderRadius.pill,
                  backgroundColor: pregnancy?.has_active_pregnancy ? colors.primary : colors.surfaceSecondary,
                  borderColor: colors.border,
                  borderWidth: 1,
                  padding: 2,
                  flexDirection: 'row',
                  justifyContent: pregnancy?.has_active_pregnancy ? 'flex-start' : 'flex-end',
                }}
              >
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: borderRadius.pill,
                    backgroundColor: pregnancy?.has_active_pregnancy ? '#FFFFFF' : colors.textTertiary,
                  }}
                />
              </View>
            </TouchableOpacity>
          </Card>
        </>
      )}

      {/* ── 5. Partner Section ────────────────────────────────────────── */}
      <SectionHeader label="شریک" icon={PROFILE_ICONS.partners} />
      <Card rounded="2xl" style={{ backgroundColor: colors.surface, borderColor: colors.border, paddingHorizontal: spacing[4] }}>
        {hasPartner ? (
          <>
            {profile!.partners!.map((p, i) => (
              <React.Fragment key={p.partner_user_id ?? p.username}>
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing[3] }}>
                  <View
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: borderRadius.pill,
                      backgroundColor: colors.follicular + '20',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginEnd: spacing[3],
                    }}
                  >
                    <Icon name={PROFILE_ICONS.partners} size={20} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: typography.base }}>
                      {p.username}
                    </Text>
                    <Text style={{ color: colors.textTertiary, fontSize: typography.xs, marginTop: 2 }}>
                      {p.email}
                    </Text>
                  </View>
                  <View style={{ backgroundColor: colors.success + '18', borderRadius: borderRadius.pill, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <Text style={{ color: colors.success, fontSize: typography.micro, fontWeight: '800' }}>ارتباط فعال</Text>
                  </View>
                </View>
                {i < profile!.partners!.length - 1 && <Divider />}
              </React.Fragment>
            ))}
            <Divider />
            <MenuRow
              icon={ACTION_ICONS.messages}
              label="پیام‌ها"
              sub="گفتگو و تبادل نظر با شریک"
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
      </Card>

      {/* ── 6. برنامه و سلامت ───────────────────────────────────────── */}
      <SectionHeader label="برنامه و سلامت" icon={PROFILE_ICONS.settings} />
      <Card rounded="2xl" style={{ backgroundColor: colors.surface, borderColor: colors.border, paddingHorizontal: spacing[4] }}>
        {isCycleOwner && (
          <>
            <MenuRow
              icon={PROFILE_ICONS.history}
              label="تاریخچه سلامت"
              sub="گزارش‌های روزانه و ثبت علائم"
              accentColor={colors.primary}
              onPress={() => navigation.navigate('LogTab' as never, { screen: 'WellnessDashboard' } as never)}
            />
            <MenuRow
              icon={PROFILE_ICONS.medications}
              label="داروها و مکمل‌ها"
              sub="یادآور و سابقه مصرف"
              accentColor={colors.luteal}
              onPress={() => navigation.navigate('LogTab' as never, { screen: 'Medications' } as never)}
            />
          </>
        )}
        <MenuRow
          icon={PROFILE_ICONS.settings}
          label="تنظیمات"
          sub="اعلان‌ها، تم برنامه و ترجیحات"
          accentColor={colors.follicular}
          onPress={() => navigation.navigate('Settings')}
        />
        <MenuRow
          icon={PROFILE_ICONS.support}
          label="کمک و پشتیبانی"
          sub="حریم خصوصی، راهنما و ارتباط با پشتیبانی"
          accentColor={colors.warning}
          onPress={() => navigation.navigate('Support')}
          last
        />
      </Card>

      {/* ── 7. حساب و امنیت ─────────────────────────────────────────── */}
      <SectionHeader label="حساب" icon={PROFILE_ICONS.logout} />
      <Card rounded="2xl" style={{ backgroundColor: colors.surface, borderColor: colors.border, paddingHorizontal: spacing[4] }}>
        <MenuRow
          icon={PROFILE_ICONS.password}
          label="تغییر رمز عبور"
          sub="به‌روزرسانی رمز عبور ورود"
          accentColor={colors.primary}
          onPress={() => navigation.navigate('ChangePassword')}
        />
        <MenuRow
          icon={PROFILE_ICONS.logout}
          label="خروج از حساب"
          sub="خروج موقت از برنامه"
          accentColor={colors.warning}
          danger
          onPress={handleLogout}
        />
        <MenuRow
          icon={PROFILE_ICONS.deleteAccount}
          label="حذف حساب کاربری"
          sub="حذف دائمی تمام اطلاعات و داده‌ها"
          accentColor={colors.error}
          danger
          onPress={() => navigation.navigate('DeleteAccount')}
          last
        />
      </Card>

      {/* Privacy note */}
      <View style={[styles.privacyRow, { marginTop: spacing[5], marginBottom: spacing[2] }]}>
        <Icon name="shield-lock-outline" size={14} color={colors.textTertiary} />
        <Text style={{ color: colors.textTertiary, fontSize: typography.micro }}>
          داده‌های سلامتی شما با رمزنگاری ایمن محافظت می‌شوند.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  heroCard: { overflow: 'hidden' },
  heroRow: { flexDirection: 'row', alignItems: 'center' },
  avatarRing: {
    width: 68,
    height: 68,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: 14,
  },
  avatarText: { lineHeight: 36 },
  heroDetails: { flex: 1 },
  userName: {},
  userEmail: {},
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  editBtn: {
    width: 40,
    height: 40,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginStart: 8,
  },
  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
  },
  statIconWrap: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statValue: {},
  statLabel: {},
  premiumCard: { borderWidth: 1, overflow: 'hidden' },
  premiumInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  crownWrap: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(255,215,0,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumTextCol: { flex: 1 },
  premiumTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activePill: {
    backgroundColor: 'rgba(255,215,0,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  manageBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
  },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  menuRow: { flexDirection: 'row', alignItems: 'center' },
  privacyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
});

