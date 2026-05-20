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
import { useTheme } from '@hooks/useTheme';
import { useAuth } from '@hooks/useAuth';
import { useProfile } from '@hooks/queries/useProfile';
import { LoadingState, ErrorState, Divider, AppIcon } from '@components/ui';
import icons from '../../assets/icons';
import type { ProfileScreenProps } from '@navigation/types';

type Props = ProfileScreenProps<'Profile'>;

// ── helpers ───────────────────────────────────────────────────────────────────

function initials(first?: string, last?: string, username?: string) {
  if (first && last) return `${first[0]}${last[0]}`.toUpperCase();
  if (first)         return first[0].toUpperCase();
  if (username)      return username[0].toUpperCase();
  return '?';
}

function sexLabel(sex?: string) {
  if (sex === 'female') return '🌸 Female';
  if (sex === 'male')   return '🌿 Male';
  if (sex === 'other')  return '🌈 Other';
  return '—';
}

// ── sub-components ────────────────────────────────────────────────────────────

/** Menu row with PNG icon — no border on the icon container */
function MenuRow({
  iconSource,
  label,
  sub,
  accentColor,
  onPress,
  danger,
  last,
}: {
  iconSource: ReturnType<typeof require>;
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
          <AppIcon source={iconSource} size={26} />
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

        <Text style={{ color: colors.textTertiary, fontSize: 18, fontWeight: '300' }}>›</Text>
      </TouchableOpacity>
      {!last && <Divider />}
    </>
  );
}

/** Stat pill with PNG icon — no border on icon */
function StatPill({
  iconSource,
  label,
  value,
  accent,
}: {
  iconSource: ReturnType<typeof require>;
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
      <AppIcon source={iconSource} size={24} />
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
        textTransform: 'uppercase',
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

  const handleLogout = useCallback(() => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  }, [logout]);

  if (isLoading) return <LoadingState fullScreen />;
  if (isError)   return <ErrorState fullScreen error={error} onRetry={refetch} />;

  const hasPartner  = (profile?.partners?.length ?? 0) > 0;
  const isMale      = profile?.sex === 'male';
  const displayName = profile?.first_name && profile?.last_name
    ? `${profile.first_name} ${profile.last_name}`
    : profile?.first_name || user?.username || 'User';

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: spacing[12] }}
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
          <Text style={{ color: '#fff', fontSize: typography['2xl'], fontWeight: '900' }}>
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
          }}
        >
          <Text style={{ color: colors.primary, fontSize: typography.xs, fontWeight: '700' }}>
            {sexLabel(profile?.sex)}
          </Text>
        </View>

        {/* Stats row */}
        <View style={{ flexDirection: 'row', gap: spacing[3], marginTop: spacing[5], width: '100%' }}>
          {!isMale && (
            <>
              <StatPill
                iconSource={icons.menstruation}
                label="Cycle"
                value={`${profile?.cycle_length ?? 28}d`}
                accent={colors.menstrual}
              />
              <StatPill
                iconSource={icons.fertilization}
                label="Period"
                value={`${profile?.period_duration ?? 5}d`}
                accent={colors.luteal}
              />
            </>
          )}
          <StatPill
            iconSource={icons.collaborate}
            label="Partners"
            value={String(profile?.partners?.length ?? 0)}
            accent={colors.primary}
          />
        </View>
      </View>

      {/* ── Partner ────────────────────────────────────────────────────── */}
      <SectionHeader label="Partner" />
      <MenuCard>
        {hasPartner ? (
          <>
            {profile!.partners!.map((p, i) => (
              <React.Fragment key={p.id}>
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
                    <AppIcon source={icons.collaborate} size={26} />
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
                    <Text style={{ color: colors.success, fontSize: 10, fontWeight: '800' }}>LINKED</Text>
                  </View>
                </View>
                {i < profile!.partners!.length - 1 && <Divider />}
              </React.Fragment>
            ))}
            <Divider />
            <MenuRow
              iconSource={icons.collaborate}
              label="Manage Partner"
              sub="Unlink or update partner connection"
              accentColor={colors.primary}
              onPress={() => navigation.navigate('PartnerManage')}
              last
            />
          </>
        ) : (
          <MenuRow
            iconSource={icons.collaborate}
            label="Link a Partner"
            sub="Invite your partner to connect"
            accentColor={colors.primary}
            onPress={() => navigation.navigate('PartnerManage')}
            last
          />
        )}
      </MenuCard>

      {/* ── Account ────────────────────────────────────────────────────── */}
      <SectionHeader label="Account" />
      <MenuCard>
        <MenuRow
          iconSource={icons.userInfoWriting}
          label="Edit Profile"
          sub="Name, sex, cycle settings"
          accentColor={colors.primary}
          onPress={() => navigation.navigate('EditProfile')}
        />
        <MenuRow
          iconSource={icons.secure}
          label="Change Password"
          sub="Update your login password"
          accentColor={colors.ovulationColor}
          onPress={() => navigation.navigate('ChangePassword')}
        />
        <MenuRow
          iconSource={icons.settings}
          label="Settings"
          sub="Notifications, theme, preferences"
          accentColor={colors.follicular}
          onPress={() => navigation.navigate('Settings')}
          last
        />
      </MenuCard>

      {/* ── Session ────────────────────────────────────────────────────── */}
      <SectionHeader label="Session" />
      <MenuCard>
        <MenuRow
          iconSource={icons.logout}
          label="Sign Out"
          sub="See you soon"
          accentColor={colors.warning}
          danger
          onPress={handleLogout}
        />
        <MenuRow
          iconSource={icons.delete}
          label="Delete Account"
          sub="Permanently remove all your data"
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
