/**
 * KnowledgeDetailScreen — "بیشتر بدانم", deliberately still short.
 *
 * Fetches its own detail via useKnowledgeDetail(itemId) — unlike
 * InsightDetailScreen, the body/evidence fields aren't already
 * client-side (the Home card only carries the summary). "منبع علمی"
 * opens source_url in the external browser — no in-app WebView/article
 * reader, so this can never become a long-read experience.
 */
import React, { useEffect } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@hooks/useTheme';
import { Card, Icon } from '@components/ui';
import { useKnowledgeDetail } from '@hooks/queries/useKnowledgeDetail';
import { useSaveKnowledgeItem, useDismissKnowledgeItem } from '@hooks/queries/useKnowledgeActions';
import { track } from '@analytics';
import { screen } from '@theme/spacing';
import type { HomeScreenProps } from '@navigation/types';

type Props = HomeScreenProps<'KnowledgeDetail'>;

const CLAIM_STRENGTH_LABEL: Record<string, string> = {
  established_guidance: 'توصیه‌ی رسمی/بالینی',
  association: 'ارتباط آماری در تحقیقات',
  possibility: 'یافته‌ی اولیه/محدود',
};

export default function KnowledgeDetailScreen({ route }: Props) {
  const { itemId } = route.params;
  const { colors, spacing, typography, borderRadius } = useTheme();
  const { data: item, isLoading } = useKnowledgeDetail(itemId);
  const saveMutation = useSaveKnowledgeItem();
  const dismissMutation = useDismissKnowledgeItem();

  useEffect(() => {
    if (!item) { return; }
    track('knowledge_source_open', { item_id: item.id, category: item.category });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.info} />
        </View>
      </SafeAreaView>
    );
  }

  if (!item) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['bottom']}>
        <View style={styles.centered}>
          <Icon name="book-open-page-variant-outline" size={32} color={colors.textTertiary} />
          <Text style={{ color: colors.textPrimary, fontSize: typography.base, fontWeight: '700', marginTop: 12 }}>
            این مورد در دسترس نیست
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleOpenSource = () => {
    track('knowledge_source_open', { item_id: item.id, category: item.category });
    Linking.openURL(item.source_url);
  };

  const handleSave = () => saveMutation.mutate(item.id, {
    onSuccess: () => track('knowledge_save', { item_id: item.id, category: item.category }),
  });

  const handleDismiss = () => dismissMutation.mutate(item.id, {
    onSuccess: () => track('knowledge_dismiss', { item_id: item.id, category: item.category }),
  });

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: screen.gutter, paddingTop: screen.top, paddingBottom: screen.bottom }}>
        <Card rounded="2xl" style={{ padding: spacing[5], backgroundColor: colors.surface, borderColor: colors.border }}>
          <Text style={{ color: colors.textPrimary, fontSize: typography.lg, fontWeight: '800', lineHeight: 28 }}>
            {item.title_fa}
          </Text>

          {item.locked ? (
            <View style={{ marginTop: spacing[4] }}>
              <Text style={{ color: colors.textSecondary, fontSize: typography.bodySmall, lineHeight: 22 }}>
                {item.short_summary_fa}
              </Text>
              <Text style={{ color: colors.textTertiary, fontSize: typography.caption, marginTop: spacing[3] }}>
                برای دیدن جزئیات کامل و تاریخچه‌ی بیشتر، پریمیوم را فعال کن.
              </Text>
            </View>
          ) : (
            <>
              <Text style={{ color: colors.textPrimary, fontSize: typography.bodySmall, lineHeight: 24, marginTop: spacing[4] }}>
                {item.body_fa}
              </Text>

              {item.personalized_reason_fa ? (
                <View
                  style={{
                    backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius.md,
                    padding: spacing[3], marginTop: spacing[4],
                  }}
                >
                  <Text style={{ color: colors.textPrimary, fontSize: typography.caption, fontWeight: '600', marginBottom: 2 }}>
                    چرا ممکنه برای تو مهم باشه؟
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: typography.caption, lineHeight: 18 }}>
                    {item.personalized_reason_fa}
                  </Text>
                </View>
              ) : null}

              {item.claim_strength ? (
                <Text style={{ color: colors.textTertiary, fontSize: typography.micro, marginTop: spacing[3] }}>
                  سطح قطعیت: {CLAIM_STRENGTH_LABEL[item.claim_strength] ?? item.claim_strength}
                </Text>
              ) : null}
            </>
          )}

          <Text
            onPress={handleOpenSource}
            accessibilityRole="button"
            accessibilityLabel="مشاهده منبع علمی"
            style={{ color: colors.info, fontSize: typography.caption, fontWeight: '700', marginTop: spacing[4] }}
          >
            منبع علمی · {item.source_name} ›
          </Text>
        </Card>

        <View style={[styles.actionsRow, { marginTop: spacing[4] }]}>
          <Text
            onPress={handleSave}
            accessibilityRole="button"
            style={{ color: item.saved ? colors.success : colors.textSecondary, fontSize: typography.caption, fontWeight: '700' }}
          >
            {item.saved ? 'ذخیره شد' : 'ذخیره کن'}
          </Text>
          <Text
            onPress={handleDismiss}
            accessibilityRole="button"
            style={{ color: colors.textTertiary, fontSize: typography.caption, fontWeight: '700' }}
          >
            نمایش نده
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  actionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
});
