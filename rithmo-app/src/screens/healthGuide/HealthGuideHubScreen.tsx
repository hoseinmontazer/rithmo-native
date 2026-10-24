/**
 * HealthGuideHubScreen - the home of the contraception / sexual-health area.
 *
 * Four jobs, kept visibly apart so managing something, recording something and
 * learning about something never look like the same thing:
 *   1. "My method": the user's own state (a method and its reminders, or an
 *      empty state with one clear action). Opens MyContraception.
 *   2. "Tests and vaccines": two separate entries into the one records screen,
 *      each showing the last date the user noted. Dates only, never results.
 *   3. "Urgent help": the time-sensitive safety guidance. If the guide cannot be
 *      loaded (offline, or nothing approved yet) a short bundled version is
 *      shown instead, so urgent guidance never depends on the network or on
 *      review status.
 *   4. "Learn": reviewed articles and the method comparison when approved,
 *      otherwise one honest "under review" card.
 *
 * Reading the guide needs no sign-up, no record and no partner, and is never
 * behind a paywall. The private status lines come from the owner-only
 * queries; they never leave the device and are not sent to analytics.
 */
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@hooks/useTheme';
import { screen } from '@theme/spacing';
import { Button, Card, LoadingState, PressScale, Reveal } from '@components/ui';
import { Illustration } from '@components/illustrations';
import { useGuideIndex } from '@hooks/queries/useHealthGuide';
import {
  useContraceptionReminders, useContraceptionSummary, useSexualHealthChecks,
} from '@hooks/queries/useReproductiveRecords';
import type { HealthStackParamList } from '@navigation/types';
import type { GuideMeta } from '@types/healthGuide.types';
import { SectionTitle, UrgentHelp } from './components';
import { faDateShort } from '@utils/persian';
import {
  AREA_TITLES, CHECK_GROUPS, ESSENTIAL_SAFETY_FALLBACK, HUB_INTRO_FA, HUB_LEARN_SUB_FA, HUB_SECTION_LEARN_FA,
  HUB_SECTION_RECORDS_FA, HUB_SECTION_URGENT_FA, LEARN_EMPTY_TEXT_FA, LEARN_EMPTY_TITLE_FA, METHOD_LABELS,
  NOT_MEDICAL_ADVICE_FA, PRIVACY_NOTE_FA, STATUS_FAILED_FA, STATUS_LOADING_FA,
  checksStatusLine, reminderStatusLine, splitGuide, type CheckKind,
} from './healthGuideLogic';

type Nav = NativeStackNavigationProp<HealthStackParamList>;

function Row({ icon, title, sub, onPress, last }: { icon: string; title: string; sub?: string; onPress: () => void; last?: boolean }) {
  const { colors, spacing, typography } = useTheme();
  return (
    <PressScale
      onPress={onPress}
      scaleTo={0.985}
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
    </PressScale>
  );
}

/** The user's own method: current state first, one clear next action. */
function MethodHero({ onOpen, onAdd }: { onOpen: () => void; onAdd: () => void }) {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const summary = useContraceptionSummary();
  const reminders = useContraceptionReminders();
  const loading = summary.isLoading || reminders.isLoading;
  const failed = !loading && (!summary.data || !reminders.data);
  const active = summary.data?.active_methods ?? [];
  const current = active[0];

  const icon = (
    <View style={{ width: 44, height: 44, borderRadius: borderRadius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryLight }}>
      <Icon name="shield-check-outline" size={24} color={colors.primary} />
    </View>
  );

  if (loading || failed) {
    return (
      <PressScale onPress={onOpen} scaleTo={0.985} accessibilityRole="button" accessibilityLabel="روش پیشگیری من">
        <Card style={{ padding: spacing[4] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
            {icon}
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textPrimary, fontSize: typography.base, fontWeight: '700' }}>روش پیشگیری من</Text>
              <Text style={{ color: colors.textTertiary, fontSize: typography.bodySmall, marginTop: 2 }}>{loading ? STATUS_LOADING_FA : STATUS_FAILED_FA}</Text>
            </View>
            <Icon name="chevron-left" size={22} color={colors.textTertiary} />
          </View>
        </Card>
      </PressScale>
    );
  }

  if (!current) {
    return (
      <View testID="hub-method">
      <Card style={{ padding: spacing[4] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
          {icon}
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.textPrimary, fontSize: typography.base, fontWeight: '700' }}>روش پیشگیری من</Text>
            <Text style={{ color: colors.textTertiary, fontSize: typography.bodySmall, marginTop: 2, lineHeight: 20 }}>هنوز روشی ثبت نکرده‌ای</Text>
          </View>
        </View>
        <Button label="ثبت روش" onPress={onAdd} size="md" fullWidth style={{ marginTop: spacing[4] }} />
      </Card>
      </View>
    );
  }

  const more = active.length > 1 ? ` و ${active.length - 1} روش دیگر` : '';
  return (
    <PressScale
      onPress={onOpen}
      scaleTo={0.985}
      accessibilityRole="button"
      accessibilityLabel={`${METHOD_LABELS[current.method]}${more}. ${reminderStatusLine(reminders.data ?? [])}. مدیریت روش و یادآورها`}
    >
      <Card style={{ padding: spacing[4] }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
          {icon}
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.textPrimary, fontSize: typography.base, fontWeight: '700' }}>{`${METHOD_LABELS[current.method]}${more}`}</Text>
            <Text style={{ color: colors.textTertiary, fontSize: typography.bodySmall, marginTop: 2 }}>{`از ${faDateShort(current.started_on)}`}</Text>
          </View>
        </View>
        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing[3] }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
          <Icon name="bell-outline" size={18} color={colors.textTertiary} />
          <Text style={{ flex: 1, color: colors.textSecondary, fontSize: typography.bodySmall }}>{reminderStatusLine(reminders.data ?? [])}</Text>
          <Text style={{ color: colors.primary, fontSize: typography.bodySmall, fontWeight: '700' }}>مدیریت</Text>
          <Icon name="chevron-left" size={20} color={colors.primary} />
        </View>
      </Card>
    </PressScale>
  );
}

export default function HealthGuideHubScreen() {
  const navigation = useNavigation<Nav>();
  const { colors, spacing, typography, borderRadius } = useTheme();
  const { data, isLoading, isError, refetch } = useGuideIndex();
  const checks = useSexualHealthChecks();

  const articles: GuideMeta[] = data?.articles ?? [];
  const { essential, byArea, comparison } = splitGuide(articles);
  const open = (slug: string) => navigation.navigate('GuideArticle', { slug });
  const showFallback = !isLoading && essential.length === 0;
  const hasLearn = Boolean(comparison) || byArea('contraception').length > 0 || byArea('sexual_health').length > 0;

  const checkSub = (kind: CheckKind): string => {
    if (checks.isLoading) { return STATUS_LOADING_FA; }
    if (!checks.data) { return STATUS_FAILED_FA; }
    return checksStatusLine(checks.data, kind);
  };

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingHorizontal: screen.gutter, paddingTop: screen.top, paddingBottom: screen.bottomTab }}
      showsVerticalScrollIndicator={false}
      testID="health-guide-hub"
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
        <Text style={{ flex: 1, color: colors.textSecondary, fontSize: typography.bodySmall, lineHeight: 22 }}>{HUB_INTRO_FA}</Text>
        <Illustration variant="care" size={64} />
      </View>

      <View style={{ height: spacing[5] }} />
      <Reveal delay={0}>
      <MethodHero
        onOpen={() => navigation.navigate('MyContraception')}
        onAdd={() => navigation.navigate('MyContraception', { intent: 'add_method' })}
      />
      </Reveal>

      <Reveal delay={70}>
      <SectionTitle>{HUB_SECTION_RECORDS_FA}</SectionTitle>
      <Card noPadding style={{ paddingHorizontal: spacing[4] }}>
        <Row
          icon="test-tube"
          title={CHECK_GROUPS.tests.title}
          sub={checkSub('tests')}
          onPress={() => navigation.navigate('HealthChecks', { kind: 'tests' })}
        />
        <Row
          icon="needle"
          title={CHECK_GROUPS.vaccines.title}
          sub={checkSub('vaccines')}
          onPress={() => navigation.navigate('HealthChecks', { kind: 'vaccines' })}
          last
        />
      </Card>
      <View style={{ flexDirection: 'row', gap: spacing[2], marginTop: spacing[2] }}>
        <Icon name="lock-outline" size={16} color={colors.textTertiary} />
        <Text style={{ flex: 1, color: colors.textTertiary, fontSize: typography.caption, lineHeight: 20 }}>{PRIVACY_NOTE_FA}</Text>
      </View>
      </Reveal>

      <Reveal delay={140}>
      <SectionTitle>{HUB_SECTION_URGENT_FA}</SectionTitle>
      {isLoading ? <LoadingState /> : null}
      {essential.length > 0 ? (
        <UrgentHelp items={essential.map((a) => ({ key: a.slug, title: a.title_fa, text: a.summary_fa, onPress: () => open(a.slug) }))} />
      ) : null}
      {showFallback ? (
        <UrgentHelp items={ESSENTIAL_SAFETY_FALLBACK.map((c) => ({ key: c.slug, title: c.title, text: c.text }))} />
      ) : null}
      </Reveal>

      <SectionTitle>{HUB_SECTION_LEARN_FA}</SectionTitle>
      <Text style={{ color: colors.textTertiary, fontSize: typography.caption, lineHeight: 20, marginTop: -spacing[2], marginBottom: spacing[3] }}>{HUB_LEARN_SUB_FA}</Text>
      {isError ? (
        <Card style={{ padding: spacing[4] }}>
          <Text style={{ color: colors.textSecondary, fontSize: typography.bodySmall, lineHeight: 22 }}>راهنما بارگذاری نشد.</Text>
          <Button label="تلاش دوباره" onPress={() => refetch()} variant="outline" size="md" style={{ marginTop: spacing[3] }} />
        </Card>
      ) : null}
      {!isError && !isLoading && !hasLearn ? (
        <View style={{ flexDirection: 'row', gap: spacing[3], padding: spacing[4], borderRadius: borderRadius.md, backgroundColor: colors.surfaceSecondary }}>
          <Illustration variant="learn" size={56} still />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.textPrimary, fontSize: typography.bodySmall, fontWeight: '700' }}>{LEARN_EMPTY_TITLE_FA}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: typography.caption, lineHeight: 20, marginTop: 2 }}>{LEARN_EMPTY_TEXT_FA}</Text>
          </View>
        </View>
      ) : null}
      {comparison || byArea('contraception').length > 0 ? (
        <View style={{ marginBottom: spacing[3] }}>
          <Text style={{ color: colors.textTertiary, fontSize: typography.caption, fontWeight: '700', marginBottom: spacing[1] }}>{AREA_TITLES.contraception}</Text>
          <Card noPadding style={{ paddingHorizontal: spacing[4] }}>
            {comparison ? (
              <Row icon="table" title={comparison.title_fa} sub={comparison.summary_fa} onPress={() => navigation.navigate('MethodCompare')} last={byArea('contraception').length === 0} />
            ) : null}
            {byArea('contraception').map((a, i, arr) => (
              <Row key={a.slug} icon="book-open-variant" title={a.title_fa} sub={a.summary_fa} onPress={() => open(a.slug)} last={i === arr.length - 1} />
            ))}
          </Card>
        </View>
      ) : null}
      {byArea('sexual_health').length > 0 ? (
        <View style={{ marginBottom: spacing[3] }}>
          <Text style={{ color: colors.textTertiary, fontSize: typography.caption, fontWeight: '700', marginBottom: spacing[1] }}>{AREA_TITLES.sexual_health}</Text>
          <Card noPadding style={{ paddingHorizontal: spacing[4] }}>
            {byArea('sexual_health').map((a, i, arr) => (
              <Row key={a.slug} icon="book-open-variant" title={a.title_fa} sub={a.summary_fa} onPress={() => open(a.slug)} last={i === arr.length - 1} />
            ))}
          </Card>
        </View>
      ) : null}

      <Text style={{ color: colors.textTertiary, fontSize: typography.caption, lineHeight: 20, marginTop: spacing[4] }}>{NOT_MEDICAL_ADVICE_FA}</Text>
    </ScrollView>
  );
}
