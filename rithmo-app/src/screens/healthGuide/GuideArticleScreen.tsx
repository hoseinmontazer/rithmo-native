/**
 * GuideArticleScreen - one reviewed article. Renders the server's blocks as
 * given, with its sources and review date; says so when a review is overdue.
 * A 404 (unknown, or not approved yet) shows the "being reviewed" message and
 * the bundled safety text for the three time-sensitive topics.
 */
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useTheme } from '@hooks/useTheme';
import { screen } from '@theme/spacing';
import { ErrorState, LoadingState } from '@components/ui';
import { useGuideArticle } from '@hooks/queries/useHealthGuide';
import type { ProfileStackParamList } from '@navigation/types';
import { BlockView, Callout, SourceList } from './components';
import { ESSENTIAL_SAFETY_FALLBACK, NOT_MEDICAL_ADVICE_FA, NO_CONTENT_YET_FA, isNotFound, reviewLine } from './healthGuideLogic';

export default function GuideArticleScreen() {
  const { params } = useRoute<RouteProp<ProfileStackParamList, 'GuideArticle'>>();
  const { colors, spacing, typography } = useTheme();
  const { data, isLoading, isError, error, refetch } = useGuideArticle(params.slug);

  if (isLoading) { return <LoadingState fullScreen />; }

  if (isError && isNotFound(error)) {
    const fallback = ESSENTIAL_SAFETY_FALLBACK.find((c) => c.slug === params.slug);
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, padding: screen.gutter, paddingTop: screen.top }}>
        {fallback ? <Callout tone="safety" text={`${fallback.title}. ${fallback.text}`} /> : null}
        <Text style={{ color: colors.textSecondary, fontSize: typography.bodySmall, lineHeight: 22, marginTop: spacing[3] }}>{NO_CONTENT_YET_FA}</Text>
      </View>
    );
  }
  if (isError || !data) {
    return <ErrorState error={error} onRetry={refetch} fullScreen />;
  }

  const review = reviewLine(data);
  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingHorizontal: screen.gutter, paddingTop: screen.top, paddingBottom: screen.bottomTab }}
      showsVerticalScrollIndicator={false}
      testID="guide-article"
    >
      <Text accessibilityRole="header" style={{ color: colors.textPrimary, fontSize: typography.title, fontWeight: '800', lineHeight: 34 }}>{data.title_fa}</Text>
      <Text style={{ color: colors.textSecondary, fontSize: typography.bodySmall, lineHeight: 22, marginTop: spacing[2] }}>{data.summary_fa}</Text>
      <View style={{ marginTop: spacing[3] }}>
        {data.body.map((b, i) => <BlockView key={i} block={b} />)}
      </View>
      <SourceList sources={data.sources} />
      {review ? <Text style={{ color: colors.textTertiary, fontSize: typography.caption, lineHeight: 20, marginTop: spacing[4] }}>{review}</Text> : null}
      <Text style={{ color: colors.textTertiary, fontSize: typography.caption, lineHeight: 20, marginTop: spacing[2] }}>{NOT_MEDICAL_ADVICE_FA}</Text>
    </ScrollView>
  );
}
