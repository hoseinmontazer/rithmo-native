/**
 * HealthGuideHubScreen - the home of the contraception / sexual-health area.
 *
 * Everything educational and every safety card is available with no sign-up,
 * no record and no partner, and never behind a paywall. The time-sensitive
 * cards come first. If the guide cannot be loaded (offline, or nothing has been
 * approved yet) a short bundled version of the three safety cards is shown
 * instead, so urgent guidance never depends on the network or on review status.
 */
import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@hooks/useTheme';
import { screen } from '@theme/spacing';
import { Button, Card, LoadingState } from '@components/ui';
import { useGuideIndex } from '@hooks/queries/useHealthGuide';
import type { ProfileStackParamList } from '@navigation/types';
import type { GuideMeta } from '@types/healthGuide.types';
import { Callout, SectionTitle } from './components';
import {
  AREA_TITLES, ESSENTIAL_SAFETY_FALLBACK, HUB_INTRO_FA, NOT_MEDICAL_ADVICE_FA, NO_CONTENT_YET_FA,
  PRIVACY_NOTE_FA, splitGuide,
} from './healthGuideLogic';

type Nav = NativeStackNavigationProp<ProfileStackParamList>;

function Row({ icon, title, sub, onPress, last }: { icon: string; title: string; sub?: string; onPress: () => void; last?: boolean }) {
  const { colors, spacing, typography } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.72}
      accessibilityRole="button"
      accessibilityLabel={sub ? `${title}. ${sub}` : title}
      style={{
        flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingVertical: spacing[3], gap: spacing[3],
        borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.border,
      }}
    >
      <Icon name={icon} size={22} color={colors.primary} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.textPrimary, fontSize: typography.base, fontWeight: '600' }}>{title}</Text>
        {sub ? <Text style={{ color: colors.textTertiary, fontSize: typography.xs, marginTop: 2, lineHeight: 17 }}>{sub}</Text> : null}
      </View>
      <Icon name="chevron-left" size={22} color={colors.textTertiary} />
    </TouchableOpacity>
  );
}

export default function HealthGuideHubScreen() {
  const navigation = useNavigation<Nav>();
  const { colors, spacing, typography } = useTheme();
  const { data, isLoading, isError, refetch } = useGuideIndex();

  const articles: GuideMeta[] = data?.articles ?? [];
  const { essential, byArea, comparison } = splitGuide(articles);
  const open = (slug: string) => navigation.navigate('GuideArticle', { slug });
  const showFallback = !isLoading && essential.length === 0;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingHorizontal: screen.gutter, paddingTop: screen.top, paddingBottom: screen.bottomTab }}
      showsVerticalScrollIndicator={false}
      testID="health-guide-hub"
    >
      <Text style={{ color: colors.textSecondary, fontSize: typography.bodySmall, lineHeight: 22 }}>{HUB_INTRO_FA}</Text>
      <Text style={{ color: colors.textTertiary, fontSize: typography.caption, lineHeight: 20, marginTop: spacing[2] }}>{NOT_MEDICAL_ADVICE_FA}</Text>

      <SectionTitle>اگر موضوع فوری است</SectionTitle>
      {isLoading ? <LoadingState /> : null}
      {essential.map((a) => (
        <TouchableOpacity
          key={a.slug}
          onPress={() => open(a.slug)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`${a.title_fa}. ${a.summary_fa}`}
          style={{ marginBottom: spacing[2] }}
        >
          <Callout tone="safety" text={`${a.title_fa}. ${a.summary_fa}`} />
        </TouchableOpacity>
      ))}
      {showFallback ? (
        <>
          {ESSENTIAL_SAFETY_FALLBACK.map((c) => (
            <Callout key={c.slug} tone="safety" text={`${c.title}. ${c.text}`} />
          ))}
          <Text style={{ color: colors.textTertiary, fontSize: typography.caption, lineHeight: 20, marginTop: spacing[1] }}>
            {isError ? 'راهنما بارگذاری نشد.' : NO_CONTENT_YET_FA}
          </Text>
          {isError ? <Button label="تلاش دوباره" onPress={() => refetch()} variant="outline" size="md" style={{ marginTop: spacing[2] }} /> : null}
        </>
      ) : null}

      <SectionTitle>ثبت‌های شخصی من</SectionTitle>
      <Card style={{ paddingHorizontal: spacing[4] }}>
        <Row icon="shield-check-outline" title="روش پیشگیری من" sub="اختیاری؛ روش، سابقه و یادآور" onPress={() => navigation.navigate('MyContraception')} />
        <Row icon="clipboard-text-outline" title="آزمایش‌ها و واکسن‌ها" sub="فقط تاریخ، بدون نتیجه" onPress={() => navigation.navigate('HealthChecks')} last />
      </Card>
      <View style={{ flexDirection: 'row', gap: spacing[2], marginTop: spacing[2] }}>
        <Icon name="lock-outline" size={16} color={colors.textTertiary} />
        <Text style={{ flex: 1, color: colors.textTertiary, fontSize: typography.caption, lineHeight: 20 }}>{PRIVACY_NOTE_FA}</Text>
      </View>

      {comparison ? (
        <>
          <SectionTitle>مقایسه</SectionTitle>
          <Card style={{ paddingHorizontal: spacing[4] }}>
            <Row icon="table" title={comparison.title_fa} sub={comparison.summary_fa} onPress={() => navigation.navigate('MethodCompare')} last />
          </Card>
        </>
      ) : null}

      {(['contraception', 'sexual_health'] as const).map((area) => {
        const list = byArea(area);
        if (!list.length) { return null; }
        return (
          <View key={area}>
            <SectionTitle>{AREA_TITLES[area]}</SectionTitle>
            <Card style={{ paddingHorizontal: spacing[4] }}>
              {list.map((a, i) => (
                <Row key={a.slug} icon="book-open-variant" title={a.title_fa} sub={a.summary_fa} onPress={() => open(a.slug)} last={i === list.length - 1} />
              ))}
            </Card>
          </View>
        );
      })}

    </ScrollView>
  );
}
