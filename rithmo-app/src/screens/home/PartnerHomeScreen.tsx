/**
 * PartnerHomeScreen — the partner's own product, not a copy of hers.
 *
 * The asymmetry this screen exists to express:
 *
 *     She   → understand myself
 *     He    → understand how to support
 *
 * So there is no insight feed here, no baselines, no per-day numbers, no
 * symptom list and no notes. What arrives from the server is already a
 * coarse, consent-filtered support context; this screen renders it and
 * says plainly what it is NOT being told, so the partner never has to
 * guess whether he is seeing everything.
 *
 * The three response states are all legitimate and all rendered as such:
 *   no_partner  → not linked yet
 *   not_shared  → linked, and she has chosen not to share. A respected
 *                 choice, never an error screen.
 *   success     → support context
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@hooks/useTheme';
import { screen } from '@theme/spacing';
import { textRoles } from '@theme/typography';
import { useAuth } from '@hooks/useAuth';
import { useProfile } from '@hooks/queries/useProfile';
import { useUnreadNotifications } from '@hooks/queries/useNotifications';
import { usePartnerToday } from '@hooks/queries/useIntelligence';
import { track } from '@analytics';
import { toFa, faDate } from '@utils/persian';
import { Card, SectionHeading, Reveal, LoadingState, Button, AppIcon } from '@components/ui';
import icons, { type AppIconName } from '@assets/icons';
import type { PartnerTodayPayload } from '@types/intelligence.types';

/**
 * How each theme reads to the partner. Kept as short, non-clinical
 * statements about what may be going on — never a claim about what she is
 * feeling, which he should ask her rather than read here.
 */
const THEME_COPY: Record<string, { icon: AppIconName; title: string; body: string }> = {
  on_period: {
    icon: 'menstruation',
    title: 'این روزها دوره‌اش است',
    body: 'ممکن است انرژی و حوصله‌اش کمتر از معمول باشد.',
  },
  low_energy: {
    icon: 'betterHealth',
    title: 'انرژی‌اش کمتر از حالت معمولش بوده',
    body: 'کارهای اضافه ممکن است این روزها سنگین‌تر باشند.',
  },
  low_mood: {
    icon: 'mentalHealth',
    title: 'حال و هوایش متفاوت از روال خودش بوده',
    body: 'لازم نیست درستش کنی؛ بودن کافی است.',
  },
  pain: {
    icon: 'healthcare',
    title: 'درد بیشتری نسبت به معمول ثبت کرده',
    body: 'بپرس چه چیزی کمکش می‌کند — حدس نزن.',
  },
  poor_sleep: {
    icon: 'wellness',
    title: 'خوابش کمتر از معمول بوده',
    body: 'کم‌خوابی روی همه‌چیز اثر می‌گذارد، از حوصله تا تمرکز.',
  },
  high_stress: {
    icon: 'mentalHealth',
    title: 'فشار بیشتری روی دوشش بوده',
    body: 'برداشتن یک کار از لیستش بیشتر از دلداری کمک می‌کند.',
  },
  steady: {
    icon: 'betterHealth',
    title: 'همه‌چیز طبق روال معمولش است',
    body: 'خبر خاصی نیست — همین حضور معمولت کافی است.',
  },
  unknown: {
    icon: 'search',
    title: 'هنوز چیزی برای گفتن ندارم',
    body: 'وقتی داده‌ی بیشتری ثبت شود، می‌توانم بهتر راهنمایی‌ات کنم.',
  },
};

/**
 * An empty state for the partner experience.
 *
 * `action` matters more than it looks. The not-linked-yet state used to be
 * text only — it told the user that something would appear here once a link
 * existed, but gave them no way to create one, so the partner's entire home
 * screen was a dead end. Linking lives in Profile → مدیریت شریک, which is a
 * different tab; nothing on this screen pointed there.
 */
function StateMessage({
  icon, title, body, action,
}: {
  icon: AppIconName;
  title: string;
  body: string;
  action?: { label: string; onPress: () => void };
}) {
  const { colors, typography } = useTheme();
  return (
    <Card>
      <View style={{ alignItems: 'center', paddingVertical: 8, gap: 8 }}>
        <AppIcon source={icons[icon]} size={44} />
        <Text
          style={{
            color: colors.textPrimary,
            fontSize: typography.body,
            fontWeight: '700',
            textAlign: 'center',
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: typography.bodySmall,
            textAlign: 'center',
            lineHeight: 20,
          }}
        >
          {body}
        </Text>
        {action && (
          <View style={{ alignSelf: 'stretch', marginTop: 8 }}>
            <Button label={action.label} onPress={action.onPress} fullWidth />
          </View>
        )}
      </View>
    </Card>
  );
}

function SharingSummary({ sharing }: { sharing: PartnerTodayPayload['sharing'] }) {
  const { colors, typography, borderRadius } = useTheme();

  const rows: Array<[string, boolean]> = [
    ['وضعیت چرخه', sharing.period_status],
    ['پیش‌بینی دوره بعد', sharing.upcoming_period],
    ['حال عمومی', sharing.wellbeing],
    ['خلق', sharing.mood],
  ];

  return (
    <Card>
      <Text
        style={{
          color: colors.textPrimary,
          fontSize: typography.bodySmall,
          fontWeight: '700',
          marginBottom: 10,
        }}
      >
        او چه چیزی را با تو به اشتراک گذاشته
      </Text>
      <View style={{ gap: 8 }}>
        {rows.map(([label, on]) => (
          <View key={label} style={styles.sharingRow}>
            <Text style={{ color: colors.textSecondary, fontSize: typography.bodySmall }}>
              {label}
            </Text>
            <View
              style={[
                styles.sharingChip,
                {
                  backgroundColor: on ? colors.successBg : colors.borderSubtle,
                  borderRadius: borderRadius.pill,
                },
              ]}
            >
              <Text
                style={{
                  color: on ? colors.success : colors.textTertiary,
                  fontSize: typography.overline,
                  fontWeight: '700',
                }}
              >
                {on ? 'به اشتراک گذاشته' : 'خصوصی'}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}

export default function PartnerHomeScreen() {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  // Partner linking lives in the Profile tab, so this is a cross-tab jump —
  // the same shape HomeScreen uses to reach QuickLog.
  const goToPartnerManage = useCallback(() => {
    navigation.navigate('ProfileTab' as never, { screen: 'PartnerManage' } as never);
  }, [navigation]);
  const { data: profile } = useProfile();
  /**
   * The partner had no way to READ a notification.
   *
   * `Notifications` is registered in HomeStack — the same stack that renders
   * this screen — but only the owner's Home rendered an affordance for it, so
   * for a partner the route was registered and unreachable. The messaging
   * endpoint creates a Notification row for the receiver on every message, so
   * a partner was accruing notifications with nowhere to see them.
   */
  const { data: unreadNotifs } = useUnreadNotifications();
  const unreadCount: number = (unreadNotifs as any)?.count ?? 0;
  const goToNotifications = useCallback(
    () => navigation.navigate('Notifications' as never),
    [navigation],
  );
  /*
   * Greet the partner by name, not by login handle.
   *
   * This read `user.username` directly, so a partner was greeted
   * «سلام، f05_partner» while the owner's Home correctly says «سلام، الهام».
   * Same precedence as HomeScreen: the profile's first name, falling back to
   * the username only when no name has been set.
   */
  const partnerName = profile?.first_name || user?.username || '';
  const { data, isLoading, refetch } = usePartnerToday();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch().catch(() => undefined);
    setRefreshing(false);
  }, [refetch]);

  // Whether a partner is linked and whether anything is shared — never any
  // of her data. `theme` is the coarse support bucket the server already
  // authorises this partner to see.
  useEffect(() => {
    if (!data) { return; }
    track('partner_home_viewed', {
      has_partner: data.status !== 'no_partner',
      is_shared: data.status === 'success',
    });
    if (data.status === 'success' && data.data.themes[0]) {
      track('partner_support_action_viewed', { theme: data.data.themes[0] });
    }
  }, [data]);

  const dateStr = faDate(new Date());

  const body = (() => {
    if (isLoading) {
      return <LoadingState />;
    }

    if (!data || data.status === 'no_partner') {
      return (
        <StateMessage
          icon="collaborate"
          title="هنوز به کسی وصل نیستی"
          body="برای اینکه بتوانی همراهش باشی، اول باید ارتباط برقرار شود. از اینجا می‌توانی شروع کنی."
          action={{ label: 'برقراری ارتباط', onPress: goToPartnerManage }}
        />
      );
    }

    if (data.status === 'not_shared') {
      return (
        <StateMessage
          icon="secure"
          title="او فعلاً چیزی به اشتراک نگذاشته"
          body="این انتخاب اوست و کاملاً محترم است. هر وقت بخواهد، می‌تواند تغییرش دهد."
        />
      );
    }

    const payload = data.data;
    const primaryTheme = payload.themes[0] ?? 'unknown';
    const copy = THEME_COPY[primaryTheme] ?? THEME_COPY.unknown;

    return (
      <>
        {/* ── What may be going on ─────────────────────────────────── */}
        <SectionHeading title="امروز" />
        <View style={{ marginBottom: spacing[5] }}>
          <Reveal>
            <Card>
              <View style={styles.themeRow}>
                <View
                  style={[
                    styles.themeIcon,
                    // Neutral, not primaryLighter: this plate holds
                    // full-colour artwork, and a green tint behind it made
                    // the icon's own colours read as a clash.
                    { backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius.lg },
                  ]}
                >
                  <AppIcon source={icons[copy.icon]} size={28} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: colors.textPrimary,
                      fontSize: typography.body,
                      fontWeight: '700',
                    }}
                  >
                    {copy.title}
                  </Text>
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: typography.bodySmall,
                      marginTop: 4,
                      lineHeight: 20,
                    }}
                  >
                    {copy.body}
                  </Text>
                </View>
              </View>

              {payload.cycle?.phase_label_fa || payload.cycle?.days_until_next_period != null ? (
                <View
                  style={[
                    styles.cycleStrip,
                    { borderTopColor: colors.borderSubtle },
                  ]}
                >
                  {payload.cycle?.phase_label_fa ? (
                    <Text style={{ color: colors.textTertiary, fontSize: typography.caption }}>
                      فاز: {payload.cycle.phase_label_fa}
                    </Text>
                  ) : null}
                  {payload.cycle?.days_until_next_period != null ? (
                    <Text style={{ color: colors.textTertiary, fontSize: typography.caption }}>
                      دوره بعد: حدود {toFa(payload.cycle.days_until_next_period)} روز دیگر
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </Card>
          </Reveal>
        </View>

        {/* ── How to support ───────────────────────────────────────── */}
        {payload.suggestions.length > 0 && (
          <>
            <SectionHeading title="چطور می‌توانی همراهش باشی" />
            <View style={{ marginBottom: spacing[5] }}>
              <Reveal delay={100}>
                <Card>
                  <View style={{ gap: 12 }}>
                    {payload.suggestions.map((suggestion) => (
                      <View key={suggestion} style={styles.suggestionRow}>
                        <Icon
                          name="circle-small"
                          size={20}
                          color={colors.primary}
                          style={{ marginTop: 1 }}
                        />
                        <Text
                          style={{
                            color: colors.textSecondary,
                            fontSize: typography.bodySmall,
                            flex: 1,
                            lineHeight: 21,
                          }}
                        >
                          {suggestion}
                        </Text>
                      </View>
                    ))}
                  </View>
                </Card>
              </Reveal>
            </View>
          </>
        )}

        {/* ── Privacy: say what is NOT shared ──────────────────────── */}
        <SectionHeading title="حریم خصوصی" />
        <View style={{ marginBottom: spacing[4] }}>
          <Reveal delay={160}>
            <SharingSummary sharing={payload.sharing} />
          </Reveal>
        </View>

        <Text
          style={{
            color: colors.textTertiary,
            fontSize: typography.caption,
            lineHeight: 19,
            textAlign: 'center',
            paddingHorizontal: spacing[2],
          }}
        >
          {payload.disclaimer_fa}
        </Text>
      </>
    );
  })();

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors.background }]}
      edges={['top', 'left', 'right']}
    >
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: screen.gutter,
          paddingTop: screen.top,
          paddingBottom: screen.bottomTab,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Deliberately NOT the owner's gradient hero. The partner gets a
            different product, not a filtered copy of hers (see HomeStack), so
            this header stays on the canvas and reads quieter. What it shares
            with Home is the type system, not the surface. */}
        <View style={{ paddingTop: spacing[4], paddingBottom: spacing[5] }}>
          <View style={styles.headRow}>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: colors.textTertiary,
                  fontSize: textRoles.caption.fontSize,
                  lineHeight: textRoles.caption.lineHeight,
                }}
              >
                {dateStr}
              </Text>
            </View>
            {/* Quiet, on the canvas — the owner's bell sits translucent on a
                gradient hero, which this screen deliberately does not have.
                Same affordance, this screen's own surface treatment. */}
            <TouchableOpacity
              onPress={goToNotifications}
              accessibilityRole="button"
              accessibilityLabel={
                unreadCount > 0 ? `اعلان‌ها، ${unreadCount} خوانده‌نشده` : 'اعلان‌ها'
              }
              style={[
                styles.bell,
                { backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius.md },
              ]}
            >
              <Icon name="bell-outline" size={20} color={colors.textSecondary} />
              {unreadCount > 0 && (
                <View style={[styles.bellDot, { backgroundColor: colors.menstrual, borderColor: colors.background }]} />
              )}
            </TouchableOpacity>
          </View>
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: textRoles.screenTitle.fontSize,
              fontWeight: textRoles.screenTitle.fontWeight,
              lineHeight: textRoles.screenTitle.lineHeight,
              marginTop: 4,
            }}
          >
            {partnerName ? `سلام، ${partnerName}` : 'سلام'}
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: textRoles.bodyCompact.fontSize,
              lineHeight: textRoles.bodyCompact.lineHeight,
              marginTop: 4,
            }}
          >
            امروز چطور می‌توانی همراهش باشی
          </Text>
        </View>

        {body}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  themeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  themeIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cycleStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  suggestionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  headRow: { flexDirection: 'row', alignItems: 'flex-start' },
  bell: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  bellDot: {
    position: 'absolute', top: 6, right: 6,
    width: 10, height: 10, borderRadius: 5, borderWidth: 2,
  },
  sharingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sharingChip: { paddingHorizontal: 10, paddingVertical: 4 },
});
