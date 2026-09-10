/**
 * KnowledgeCard — "یک چیز جدید برای دانستن", the Living Health Knowledge
 * Layer's one small, secondary card on Home. Below StoryCard/
 * CheckInPrompt, above SecondaryActions — the personal cycle/insight
 * story stays the primary thing on Home; this is explicitly secondary.
 *
 * Unlike DailyReflectionCard, this renders for EVERY authenticated user,
 * not just premium — free vs. premium quantity/personalization/detail
 * depth is decided entirely server-side (knowledge/views.py). Renders
 * null only when there is genuinely no content yet (a fresh pipeline
 * with nothing approved), never for entitlement reasons.
 *
 * Deliberately shows at most ONE item here even when the backend
 * entitles a premium user to more per day — "one useful thing to know
 * today," not a list. The rest are reachable from KnowledgeHistoryScreen.
 */
import React, { memo, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@hooks/useTheme';
import { Card, Icon } from '@components/ui';
import { useKnowledgeToday } from '@hooks/queries/useKnowledgeToday';
import { track } from '@analytics';

interface Props {
  onOpenDetail: (itemId: number) => void;
}

export const KnowledgeCard = memo(function KnowledgeCard({ onOpenDetail }: Props) {
  const { data } = useKnowledgeToday();
  const { colors, spacing, typography, borderRadius } = useTheme();
  const item = data?.items?.[0];

  useEffect(() => {
    if (!item) { return; }
    track('knowledge_impression', {
      item_id: item.id,
      category: item.category,
      is_personalized: Boolean(item.personalized_reason_fa),
      is_premium_item: item.is_premium_item,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  if (!item) {
    return null;
  }

  const handleOpen = () => {
    track('knowledge_open', { item_id: item.id, category: item.category });
    onOpenDetail(item.id);
  };

  return (
    <Card
      rounded="2xl"
      style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface, padding: spacing[5] }]}
    >
      <View style={styles.header}>
        <View
          style={[
            styles.badge,
            { backgroundColor: colors.infoBg, borderColor: colors.infoBorder, borderWidth: 1, borderRadius: borderRadius.pill },
          ]}
        >
          <Icon name="lightbulb-on-outline" size={14} color={colors.info} />
          <Text style={{ color: colors.info, fontSize: typography.caption, fontWeight: '700' }}>
            یک چیز جدید برای دانستن
          </Text>
        </View>
      </View>

      <Text style={{ color: colors.textPrimary, fontSize: typography.bodySmall, lineHeight: 22, fontWeight: '700', marginTop: spacing[3] }}>
        {item.title_fa}
      </Text>
      <Text style={{ color: colors.textSecondary, fontSize: typography.caption, lineHeight: 20, marginTop: spacing[1] }}>
        {item.short_summary_fa}
      </Text>

      {item.personalized_reason_fa ? (
        <View
          style={[
            styles.personalizedBox,
            { backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius.md, padding: spacing[3], marginTop: spacing[3] },
          ]}
        >
          <Text style={{ color: colors.textPrimary, fontSize: typography.caption, fontWeight: '600', marginBottom: 2 }}>
            چرا ممکنه برای تو مهم باشه؟
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: typography.caption, lineHeight: 18 }}>
            {item.personalized_reason_fa}
          </Text>
        </View>
      ) : null}

      <View style={[styles.footer, { marginTop: spacing[3] }]}>
        <Text style={{ color: colors.textTertiary, fontSize: typography.micro }}>
          منبع علمی · {item.source_name}
        </Text>
        <Text
          onPress={handleOpen}
          accessibilityRole="button"
          accessibilityLabel="بیشتر بدانم"
          style={{ color: colors.info, fontSize: typography.caption, fontWeight: '700' }}
        >
          بیشتر بدانم ›
        </Text>
      </View>
    </Card>
  );
});

const styles = StyleSheet.create({
  card: { overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4 },
  personalizedBox: {},
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
