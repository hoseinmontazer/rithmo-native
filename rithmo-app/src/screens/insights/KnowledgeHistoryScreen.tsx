/**
 * KnowledgeHistoryScreen — «امروز / این هفته / ذخیره‌شده‌ها»
 *
 * A personal knowledge timeline, not an article database — same
 * section-grouped structural shape as LearningTimelineScreen, but backed
 * by a real endpoint (GET /api/knowledge/history/) since these are
 * server-curated content items with per-user interaction state, not
 * per-user-computed insights derivable from data already on the client.
 *
 * When the backend reports truncated (a free user's window is shorter
 * than premium's), a single upsell line renders at the bottom — the
 * endpoint itself never refuses, so this is presentation only.
 */
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CommonActions } from '@react-navigation/native';
import { useTheme } from '@hooks/useTheme';
import { Card, LoadingState, EmptyState } from '@components/ui';
import { useKnowledgeHistory } from '@hooks/queries/useKnowledgeHistory';
import { screen } from '@theme/spacing';
import type { KnowledgeItemSummary } from '@api/services/knowledgeService';
import type { InsightsScreenProps } from '@navigation/types';

type Props = InsightsScreenProps<'KnowledgeHistory'>;

export default function KnowledgeHistoryScreen({ navigation }: Props) {
  const { colors, spacing, typography } = useTheme();
  const { data, isLoading } = useKnowledgeHistory();

  const goToDetail = (itemId: number) => {
    navigation.dispatch(
      CommonActions.navigate({ name: 'HomeTab', params: { screen: 'KnowledgeDetail', params: { itemId } } }),
    );
  };

  const goToUpgrade = () => {
    navigation.dispatch(
      CommonActions.navigate({ name: 'ProfileTab', params: { screen: 'Upgrade', params: { featureName: 'دانستنی‌ها' } } }),
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['bottom']}>
        <LoadingState />
      </SafeAreaView>
    );
  }

  const hasAny = Boolean(data && (data.today.length || data.this_week.length || data.saved.length));

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: screen.gutter, paddingTop: screen.top, paddingBottom: screen.bottom }}>
        {!hasAny ? (
          <EmptyState
            title="هنوز دانستنی‌ای برای نشان دادن نیست"
            description="به‌محض آماده شدن، اولین دانستنی اینجا نشان داده می‌شود."
          />
        ) : (
          <>
            <Section title="امروز" items={data!.today} colors={colors} spacing={spacing} typography={typography} onPress={goToDetail} />
            <Section title="این هفته" items={data!.this_week} colors={colors} spacing={spacing} typography={typography} onPress={goToDetail} />
            <Section title="ذخیره‌شده‌ها" items={data!.saved} colors={colors} spacing={spacing} typography={typography} onPress={goToDetail} />

            {data?.truncated ? (
              <TouchableOpacity onPress={goToUpgrade} activeOpacity={0.8} style={{ marginTop: spacing[4] }}>
                <Card rounded="lg" style={{ padding: spacing[4], backgroundColor: colors.premiumBg, borderColor: colors.premiumBorder }}>
                  <Text style={{ color: colors.premium, fontSize: typography.caption, fontWeight: '700', textAlign: 'center' }}>
                    با پریمیوم، تاریخچه‌ی کامل‌تری از دانستنی‌ها را ببین.
                  </Text>
                </Card>
              </TouchableOpacity>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, items, colors, spacing, typography, onPress }: {
  title: string;
  items: KnowledgeItemSummary[];
  colors: any;
  spacing: any;
  typography: any;
  onPress: (itemId: number) => void;
}) {
  if (items.length === 0) { return null; }
  return (
    <View style={{ marginBottom: spacing[5] }}>
      <Text style={[styles.sectionLabel, { color: colors.textSecondary, fontSize: typography.xs }]}>{title}</Text>
      {items.map((item) => (
        <TouchableOpacity key={item.id} onPress={() => onPress(item.id)} activeOpacity={0.8} style={{ marginBottom: spacing[2] }}>
          <Card rounded="lg" style={{ padding: spacing[4], backgroundColor: colors.surface, borderColor: colors.border }}>
            <Text style={{ color: colors.textPrimary, fontSize: typography.bodySmall, fontWeight: '700' }}>
              {item.title_fa}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: typography.caption, marginTop: 4 }} numberOfLines={2}>
              {item.short_summary_fa}
            </Text>
            <Text style={{ color: colors.textTertiary, fontSize: typography.micro, marginTop: 6 }}>
              {item.source_name}
            </Text>
          </Card>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  sectionLabel: { fontWeight: '800', letterSpacing: 0.4, marginBottom: 10 },
});
