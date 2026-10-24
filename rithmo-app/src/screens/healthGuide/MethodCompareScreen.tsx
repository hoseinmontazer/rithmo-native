/**
 * MethodCompareScreen - the reviewed comparison table. The numbers are the
 * server's (typical and perfect use, pregnancies per 100 in the first year, from
 * the cited source). The app never turns them into "X% effective" and never
 * says a method protects "completely".
 */
import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@hooks/useTheme';
import { screen } from '@theme/spacing';
import { Badge, Card, ErrorState, LoadingState } from '@components/ui';
import { useMethodComparison } from '@hooks/queries/useHealthGuide';
import type { MethodInfo } from '@types/healthGuide.types';
import { BlockView, SourceList } from './components';
import { NOT_CONTRACEPTION_FA, NOT_MEDICAL_ADVICE_FA, NO_CONTENT_YET_FA, isNotFound, perHundred, reviewLine } from './healthGuideLogic';

function Bullets({ title, items }: { title: string; items: string[] }) {
  const { colors, spacing, typography } = useTheme();
  if (!items.length) { return null; }
  return (
    <View style={{ marginTop: spacing[3] }}>
      <Text style={{ color: colors.textPrimary, fontSize: typography.caption, fontWeight: '700' }}>{title}</Text>
      {items.map((t, i) => (
        <Text key={i} style={{ color: colors.textSecondary, fontSize: typography.caption, lineHeight: 21, marginTop: 2 }}>{`• ${t}`}</Text>
      ))}
    </View>
  );
}

function MethodCard({ m }: { m: MethodInfo }) {
  const { colors, spacing, typography } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <Card style={{ marginBottom: spacing[3], padding: spacing[4] }}>
      <TouchableOpacity
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${m.name_fa}. معمول ${perHundred(m.typical_use_per_100)}، کامل ${perHundred(m.perfect_use_per_100)}`}
        style={{ minHeight: 44 }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
          <Text style={{ flex: 1, color: colors.textPrimary, fontSize: typography.base, fontWeight: '800' }}>{m.name_fa}</Text>
          <Icon name={open ? 'chevron-up' : 'chevron-down'} size={22} color={colors.textTertiary} />
        </View>
        <Text style={{ color: colors.textSecondary, fontSize: typography.caption, lineHeight: 21, marginTop: spacing[1] }}>
          {`معمول: ${perHundred(m.typical_use_per_100)}   کامل: ${perHundred(m.perfect_use_per_100)}`}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1], marginTop: spacing[2] }}>
          {m.reduces_sti_risk ? <Badge label="خطر بسیاری از عفونت‌های جنسی را کم می‌کند" variant="success" /> : null}
          {m.provider_needed ? <Badge label="با کادر درمان" variant="neutral" /> : null}
        </View>
      </TouchableOpacity>
      {open ? (
        <View>
          <Text style={{ color: colors.textSecondary, fontSize: typography.caption, lineHeight: 21, marginTop: spacing[3] }}>{m.how_used_fa}</Text>
          {m.note_fa ? <Text style={{ color: colors.textTertiary, fontSize: typography.caption, lineHeight: 20, marginTop: spacing[1] }}>{m.note_fa}</Text> : null}
          <Bullets title="مزیت‌ها" items={m.benefits_fa} />
          <Bullets title="محدودیت‌ها" items={m.limitations_fa} />
          <Bullets title="عوارض احتمالی" items={m.side_effects_fa} />
          <Bullets title="نکته‌های احتیاط" items={m.cautions_fa} />
        </View>
      ) : null}
    </Card>
  );
}

export default function MethodCompareScreen() {
  const { colors, spacing, typography } = useTheme();
  const { data, isLoading, isError, error, refetch } = useMethodComparison();

  if (isLoading) { return <LoadingState fullScreen />; }
  if (isError && isNotFound(error)) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, padding: screen.gutter, paddingTop: screen.top }}>
        <Text style={{ color: colors.textSecondary, fontSize: typography.bodySmall, lineHeight: 22 }}>{NO_CONTENT_YET_FA}</Text>
      </View>
    );
  }
  if (isError || !data) { return <ErrorState error={error} onRetry={refetch} fullScreen />; }

  const methods = data.data.methods ?? [];
  const review = reviewLine(data);
  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingHorizontal: screen.gutter, paddingTop: screen.top, paddingBottom: screen.bottomTab }}
      showsVerticalScrollIndicator={false}
      testID="method-compare"
    >
      {data.body.map((b, i) => <BlockView key={i} block={b} />)}
      <View style={{ height: spacing[3] }} />
      {methods.map((m) => <MethodCard key={m.code} m={m} />)}
      {data.data.footnote_fa ? <Text style={{ color: colors.textTertiary, fontSize: typography.caption, lineHeight: 20 }}>{data.data.footnote_fa}</Text> : null}
      <Text style={{ color: colors.textSecondary, fontSize: typography.caption, lineHeight: 20, marginTop: spacing[2] }}>{NOT_CONTRACEPTION_FA}</Text>
      <SourceList sources={data.sources} />
      {review ? <Text style={{ color: colors.textTertiary, fontSize: typography.caption, lineHeight: 20, marginTop: spacing[4] }}>{review}</Text> : null}
      <Text style={{ color: colors.textTertiary, fontSize: typography.caption, lineHeight: 20, marginTop: spacing[2] }}>{NOT_MEDICAL_ADVICE_FA}</Text>
    </ScrollView>
  );
}
