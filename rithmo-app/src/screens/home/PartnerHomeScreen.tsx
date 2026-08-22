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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@hooks/useTheme';
import { useAuth } from '@hooks/useAuth';
import { useProfile } from '@hooks/queries/useProfile';
import { usePartnerToday } from '@hooks/queries/useIntelligence';
import { track } from '@analytics';
import { toFa, faDate } from '@utils/persian';
import { Card, SectionHeading, Reveal, LoadingState } from '@components/ui';
import type { PartnerTodayPayload } from '@types/intelligence.types';

/**
 * How each theme reads to the partner. Kept as short, non-clinical
 * statements about what may be going on — never a claim about what she is
 * feeling, which he should ask her rather than read here.
 */
const THEME_COPY: Record<string, { emoji: string; title: string; body: string }> = {
  on_period: {
    emoji: '🌙',
    title: 'این روزها دوره‌اش است',
    body: 'ممکن است انرژی و حوصله‌اش کمتر از معمول باشد.',
  },
  low_energy: {
    emoji: '🔋',
    title: 'انرژی‌اش کمتر از حالت معمولش بوده',
    body: 'کارهای اضافه ممکن است این روزها سنگین‌تر باشند.',
  },
  low_mood: {
    emoji: '🫂',
    title: 'حال و هوایش متفاوت از روال خودش بوده',
    body: 'لازم نیست درستش کنی؛ بودن کافی است.',
  },
  pain: {
    emoji: '🌡️',
    title: 'درد بیشتری نسبت به معمول ثبت کرده',
    body: 'بپرس چه چیزی کمکش می‌کند — حدس نزن.',
  },
  poor_sleep: {
    emoji: '😴',
    title: 'خوابش کمتر از معمول بوده',
    body: 'کم‌خوابی روی همه‌چیز اثر می‌گذارد، از حوصله تا تمرکز.',
  },
  high_stress: {
    emoji: '🌀',
    title: 'فشار بیشتری روی دوشش بوده',
    body: 'برداشتن یک کار از لیستش بیشتر از دلداری کمک می‌کند.',
  },
  steady: {
    emoji: '🌤️',
    title: 'همه‌چیز طبق روال معمولش است',
    body: 'خبر خاصی نیست — همین حضور معمولت کافی است.',
  },
  unknown: {
    emoji: '🌱',
    title: 'هنوز چیزی برای گفتن ندارم',
    body: 'وقتی داده‌ی بیشتری ثبت شود، می‌توانم بهتر راهنمایی‌ات کنم.',
  },
};

function StateMessage({ emoji, title, body }: { emoji: string; title: string; body: string }) {
  const { colors, typography } = useTheme();
  return (
    <Card>
      <View style={{ alignItems: 'center', paddingVertical: 8, gap: 8 }}>
        <Text style={{ fontSize: 34 }}>{emoji}</Text>
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
                  borderRadius: borderRadius.full,
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
  const { user } = useAuth();
  const { data: profile } = useProfile();
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
          emoji="🔗"
          title="هنوز به کسی وصل نیستی"
          body="وقتی او دعوتش را بفرستد و ارتباط برقرار شود، اینجا می‌بینی چطور می‌توانی همراهش باشی."
        />
      );
    }

    if (data.status === 'not_shared') {
      return (
        <StateMessage
          emoji="🔒"
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
                    { backgroundColor: colors.primaryLighter, borderRadius: borderRadius.lg },
                  ]}
                >
                  <Text style={{ fontSize: 20 }}>{copy.emoji}</Text>
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
          paddingHorizontal: spacing[4],
          paddingBottom: spacing[20],
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
        <View style={{ paddingTop: spacing[4], paddingBottom: spacing[4] }}>
          <Text style={{ color: colors.textTertiary, fontSize: typography.caption }}>
            {dateStr}
          </Text>
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: typography.heading,
              fontWeight: '800',
              marginTop: 4,
            }}
          >
            {partnerName ? `سلام، ${partnerName}` : 'سلام'}
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: typography.bodySmall,
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
  sharingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sharingChip: { paddingHorizontal: 10, paddingVertical: 4 },
});
