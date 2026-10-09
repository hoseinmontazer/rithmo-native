/**
 * PartnerGuideScreen - one section of the Partner Guide (راهنمای همراهی).
 *
 * Static, reviewed content (partnerGuideContent.ts). It reads nothing about the
 * owner and calls no endpoint of its own: it renders the same for a partner
 * with no link, no shared data, or a brand-new pair.
 *
 * The only things that reach beyond the screen are deliberately the existing,
 * already-governed paths:
 *   - a conversation starter opens the REAL conversation as an editable draft
 *     (same route and `prefill` param Partner 2.0 P2's "message" action uses).
 *     Opening it sends nothing; the partner sends, or doesn't, with the normal
 *     send button.
 *   - the `help` section ends with the existing SupportActionRow, unchanged:
 *     same actions, same server-side authorization, same owner-receipt rules.
 *   Viewing this guide records nothing, notifies no one and creates no receipt.
 */
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@hooks/useTheme';
import { screen } from '@theme/spacing';
import { useProfile } from '@hooks/queries/useProfile';
import { Card } from '@components/ui';
import type { HomeScreenProps } from '@navigation/types';
import { SupportActionRow } from './components/SupportActionRow';
import { resolveChatTarget } from './supportActions';
import { draftRoute } from './partnerGuideNav';
import {
  GUIDE_FOOTER_FA,
  HELP_AVOID,
  HELP_INTRO_FA,
  HELP_OPTIONS,
  HELP_RECORD_TITLE_FA,
  SECTION_META,
  TALK_GROUPS,
  UNDERSTAND_CARDS,
  isGuideSection,
  type GuideCard,
  type PartnerGuideSection,
} from './partnerGuideContent';

type Props = HomeScreenProps<'PartnerGuide'>;

export default function PartnerGuideScreen({ route }: Props) {
  const { colors, spacing, borderRadius, typography } = useTheme();
  const navigation = useNavigation<any>();
  const { data: profile } = useProfile();

  const requested = route.params?.section;
  const section: PartnerGuideSection = isGuideSection(requested) ? requested : 'understand';
  const meta = SECTION_META[section];

  // Only a linked partner has a conversation to open. Without one the starters
  // are still readable on their own.
  const chatTarget = resolveChatTarget(profile?.partners as any);

  const openDraft = (text: string) => {
    if (!chatTarget) { return; }
    const [tab, params] = draftRoute(chatTarget, text);
    navigation.navigate(tab as never, params as never);
  };

  const bullet = (text: string, tone: 'point' | 'avoid', key: string) => (
    <View key={key} style={styles.bulletRow}>
      <Icon
        name={tone === 'avoid' ? 'close-circle-outline' : 'circle-small'}
        size={tone === 'avoid' ? 16 : 20}
        color={tone === 'avoid' ? colors.textTertiary : colors.primary}
        style={{ marginTop: tone === 'avoid' ? 3 : 1 }}
      />
      <Text
        style={{
          flex: 1,
          color: colors.textSecondary,
          fontSize: typography.bodySmall,
          lineHeight: 22,
        }}
      >
        {text}
      </Text>
    </View>
  );

  const cardView = (c: GuideCard) => (
    <Card key={c.id} style={{ padding: 16, marginBottom: spacing[4] }}>
      <Text style={{ color: colors.textPrimary, fontSize: typography.body, fontWeight: '700', lineHeight: 24 }}>
        {c.title}
      </Text>
      {c.body.map((line, i) => (
        <Text
          key={i}
          style={{ color: colors.textSecondary, fontSize: typography.bodySmall, lineHeight: 22, marginTop: 8 }}
        >
          {line}
        </Text>
      ))}
      {c.points && c.points.length > 0 ? (
        <View style={{ marginTop: 10, gap: 6 }}>{c.points.map((p, i) => bullet(p, 'point', `p${i}`))}</View>
      ) : null}
      {c.avoid && c.avoid.length > 0 ? (
        <View style={{ marginTop: 12 }}>
          {c.body.length > 0 || (c.points?.length ?? 0) > 0 ? (
            <Text style={{ color: colors.textTertiary, fontSize: typography.caption, fontWeight: '700' }}>
              حواست باشه
            </Text>
          ) : null}
          <View style={{ marginTop: 6, gap: 6 }}>{c.avoid.map((a, i) => bullet(a, 'avoid', `a${i}`))}</View>
        </View>
      ) : null}
    </Card>
  );

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingHorizontal: screen.gutter,
        paddingTop: screen.top,
        paddingBottom: screen.bottomTab,
      }}
      showsVerticalScrollIndicator={false}
      testID={`partner-guide-${section}`}
    >
      {/* The navigation header already says which section this is; the body
          only adds the one-line purpose, so the title is not shown twice. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing[5] }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: borderRadius.md,
            backgroundColor: colors.surfaceSecondary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={meta.icon} size={22} color={colors.primary} />
        </View>
        <Text
          style={{
            flex: 1,
            color: colors.textSecondary,
            fontSize: typography.bodySmall,
            lineHeight: 21,
          }}
        >
          {meta.subtitle}
        </Text>
      </View>

      {section === 'understand' && UNDERSTAND_CARDS.map(cardView)}

      {section === 'talk' && (
        <>
          {!chatTarget ? (
            <Text
              style={{
                color: colors.textTertiary,
                fontSize: typography.caption,
                lineHeight: 19,
                marginBottom: spacing[4],
              }}
            >
              برای فرستادن پیام، اول باید به او وصل شوی. تا آن موقع می‌توانی این نمونه‌ها را فقط بخوانی.
            </Text>
          ) : null}
          {TALK_GROUPS.map((g) => (
            <Card key={g.id} style={{ padding: 16, marginBottom: spacing[4] }}>
              <Text style={{ color: colors.textPrimary, fontSize: typography.body, fontWeight: '700', lineHeight: 24 }}>
                {g.situation}
              </Text>
              {g.starters.map((s, i) => (
                <View
                  key={i}
                  style={{
                    marginTop: 10,
                    padding: 12,
                    borderRadius: borderRadius.md,
                    backgroundColor: colors.surfaceSecondary,
                  }}
                >
                  <Text style={{ color: colors.textPrimary, fontSize: typography.bodySmall, lineHeight: 22 }}>
                    {`«${s}»`}
                  </Text>
                  {chatTarget ? (
                    <TouchableOpacity
                      onPress={() => openDraft(s)}
                      accessibilityRole="button"
                      accessibilityLabel={`باز کردن این جمله به‌عنوان پیش‌نویس پیام: ${s}`}
                      style={{ alignSelf: 'flex-start', marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}
                    >
                      <Icon name="message-text-outline" size={16} color={colors.primary} />
                      <Text style={{ color: colors.primary, fontSize: typography.caption, fontWeight: '700' }}>
                        باز کردن در پیام‌ها
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))}
              {g.note ? (
                <Text
                  style={{ color: colors.textTertiary, fontSize: typography.caption, lineHeight: 19, marginTop: 10 }}
                >
                  {g.note}
                </Text>
              ) : null}
            </Card>
          ))}
          <Text style={{ color: colors.textTertiary, fontSize: typography.caption, lineHeight: 19 }}>
            این‌ها نمونه‌اند؛ هیچ پیامی خودکار فرستاده نمی‌شود و پیش‌نویس را می‌توانی تغییر بدهی.
          </Text>
        </>
      )}

      {section === 'help' && (
        <>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: typography.bodySmall,
              lineHeight: 22,
              marginBottom: spacing[4],
            }}
          >
            {HELP_INTRO_FA}
          </Text>
          {HELP_OPTIONS.map((o) => (
            <Card key={o.id} style={{ padding: 16, marginBottom: spacing[4] }}>
              <Text style={{ color: colors.textPrimary, fontSize: typography.body, fontWeight: '700', lineHeight: 24 }}>
                {o.title}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: typography.bodySmall, lineHeight: 22, marginTop: 8 }}>
                {o.body}
              </Text>
              <View style={{ marginTop: 10 }}>{bullet(o.ifNo, 'point', 'ifno')}</View>
            </Card>
          ))}
          {cardView(HELP_AVOID)}
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: typography.bodySmall,
              fontWeight: '700',
              marginTop: spacing[2],
              marginBottom: spacing[3],
            }}
          >
            {HELP_RECORD_TITLE_FA}
          </Text>
          {/* The existing Support Action primitive, unchanged: same actions,
              same server-side authorization and owner-receipt rules. */}
          <SupportActionRow />
        </>
      )}

      <Text
        style={{
          color: colors.textTertiary,
          fontSize: typography.caption,
          lineHeight: 19,
          textAlign: 'center',
          marginTop: spacing[5],
          paddingHorizontal: spacing[2],
        }}
      >
        {GUIDE_FOOTER_FA}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
});
