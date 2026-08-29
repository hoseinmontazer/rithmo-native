/**
 * LearningTimelineScreen — «چیزهایی که درباره‌ی تو یاد گرفته‌ام»
 *
 * M6: answers "what has Rhythmo learned about me over time?", as a
 * presentation layer over the SAME validated intelligence M5 already
 * reads — no new endpoint, no recomputation. Two existing queries only:
 *
 *   useInsights()  → the current, still-true insight list (pattern /
 *                     hypothesis / observation / coverage), each already
 *                     carrying confidence, epistemic_kind, evidence,
 *                     first_seen, times_seen, peak_confidence.
 *   useToday()     → state.baselines.learning[] / learning_progress, the
 *                     same "still learning" signal-level data
 *                     InsightDetailScreen already renders.
 *
 * A deliberately narrow claim about "evolution": InsightRecord is one row
 * per (user, key) — there is no day-by-day confidence log in the schema,
 * only first_seen/times_seen/peak_confidence as summary scalars. So this
 * screen never invents a dated transition history; it says only what
 * those three fields can prove — when an insight was first noticed, how
 * many times it's recurred since, and whether its confidence has ever
 * been higher than it is today.
 *
 * Only PATTERN/HYPOTHESIS/OBSERVATION insights are shown here as "learned"
 * — coverage insights make no claim at all and are represented by the
 * separate "still learning" section instead, never as a fourth kind of
 * knowledge.
 *
 * Ordering is presentation-only, over fields the backend already sends:
 * epistemic strength first (pattern > hypothesis > observation), then
 * confidence tier. Nothing here recomputes confidence, recurrence, or
 * epistemic_kind — see EPISTEMIC_RANK/CONFIDENCE_RANK below, both pure
 * sort keys, not analysis.
 */
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@hooks/useTheme';
import { Card, Reveal } from '@components/ui';
import { useInsights, useToday } from '@hooks/queries/useIntelligence';
import { signalLabel } from '@i18n';
import { toFa, faDate } from '@utils/persian';
import { screen } from '@theme/spacing';
import type { InsightsScreenProps } from '@navigation/types';
import type { EpistemicKind, Insight, InsightConfidence } from '@types/intelligence.types';

type Props = InsightsScreenProps<'LearningTimeline'>;

const EPISTEMIC_RANK: Record<EpistemicKind, number> = { pattern: 2, hypothesis: 1, observation: 0 };
const CONFIDENCE_RANK: Record<InsightConfidence, number> = { established: 3, repeated: 2, emerging: 1, insufficient: 0 };

/** Presentation ordering only — every value sorted on already exists on
 * the insight; nothing here is computed from raw data. */
function orderLearned(insights: Insight[]): Insight[] {
  return insights
    .filter((i) => i.kind !== 'coverage' && i.epistemic_kind !== null)
    .slice()
    .sort((a, b) => {
      const byKind = EPISTEMIC_RANK[b.epistemic_kind as EpistemicKind] - EPISTEMIC_RANK[a.epistemic_kind as EpistemicKind];
      if (byKind !== 0) { return byKind; }
      return CONFIDENCE_RANK[b.confidence] - CONFIDENCE_RANK[a.confidence];
    });
}

function confidenceColor(
  confidence: InsightConfidence,
  colors: ReturnType<typeof useTheme>['colors'],
): { fg: string; bg: string } {
  switch (confidence) {
    case 'established': return { fg: colors.success, bg: colors.successBg };
    case 'repeated':    return { fg: colors.primary, bg: colors.primaryLighter };
    case 'emerging':    return { fg: colors.textSecondary, bg: colors.borderSubtle };
    default:            return { fg: colors.textTertiary, bg: colors.borderSubtle };
  }
}

/**
 * "How this formed" — only what first_seen/times_seen/peak_confidence can
 * truthfully prove. Returns null (renders nothing) when there's nothing
 * beyond "seen once today" worth saying, rather than a hollow sentence.
 */
function evolvedContext(insight: Insight): string | null {
  const parts: string[] = [];
  if (insight.first_seen) {
    parts.push(`اولین‌بار در ${faDate(new Date(insight.first_seen))} دیده شد`);
  }
  if (insight.times_seen && insight.times_seen > 1) {
    parts.push(`از آن زمان ${toFa(insight.times_seen)} بار دیده شده`);
  }
  if (parts.length === 0) { return null; }
  let text = parts.join('؛ ') + '.';
  if (insight.peak_confidence && insight.peak_confidence !== insight.confidence &&
      CONFIDENCE_RANK[insight.peak_confidence] > CONFIDENCE_RANK[insight.confidence]) {
    text += ' پیش‌تر به سطح اطمینان بالاتری هم رسیده بود.';
  }
  return text;
}

function LearnedCard({ insight, onPress }: { insight: Insight; onPress: (i: Insight) => void }) {
  const { colors, typography, spacing, borderRadius } = useTheme();
  const tone = confidenceColor(insight.confidence, colors);
  const context = evolvedContext(insight);

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={() => onPress(insight)} accessibilityRole="button">
      <Card
        elevated={false}
        rounded="2xl"
        style={{ padding: spacing[4], borderColor: colors.border, borderWidth: 1 }}
      >
        <Text style={{ color: colors.textPrimary, fontSize: typography.body, fontWeight: '700', lineHeight: 23 }}>
          {insight.title_fa}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: typography.bodySmall, lineHeight: 20, marginTop: spacing[2] }}>
          {insight.body_fa}
        </Text>
        <View style={[styles.chipRow, { marginTop: spacing[3] }]}>
          {insight.epistemic_kind ? (
            <View style={[styles.epistemicChip, { borderColor: colors.borderSubtle, borderRadius: borderRadius.pill }]}>
              <Text style={{ color: colors.textTertiary, fontSize: typography.overline, fontWeight: '600' }}>
                {insight.epistemic_kind_label_fa}
              </Text>
            </View>
          ) : null}
          {insight.confidence_label_fa ? (
            <View style={[styles.confidenceChip, { backgroundColor: tone.bg, borderRadius: borderRadius.pill }]}>
              <Text style={{ color: tone.fg, fontSize: typography.overline, fontWeight: '700' }}>
                {insight.confidence_label_fa}
              </Text>
            </View>
          ) : null}
        </View>
        {context ? (
          <Text style={{ color: colors.textTertiary, fontSize: typography.caption, lineHeight: 18, marginTop: spacing[2] }}>
            {context}
          </Text>
        ) : null}
      </Card>
    </TouchableOpacity>
  );
}

export default function LearningTimelineScreen() {
  const navigation = useNavigation<Props['navigation']>();
  const { colors, typography, spacing } = useTheme();

  const { data: insightData, isLoading: insightsLoading } = useInsights();
  const { data: today, isLoading: todayLoading } = useToday();

  const learned = useMemo(() => orderLearned(insightData?.insights ?? []), [insightData]);
  const learning = today?.state.baselines.learning ?? [];
  const learningProgress = today?.state.baselines.learning_progress ?? {};

  const goToDetail = (insight: Insight) => navigation.navigate('HomeTab' as any, { screen: 'InsightDetail', params: { insight } } as any);

  const isLoading = insightsLoading || todayLoading;
  const isEmpty = !isLoading && learned.length === 0 && learning.length === 0;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: screen.gutter, paddingTop: screen.top, paddingBottom: screen.bottom }}
        showsVerticalScrollIndicator={false}
      >
        <Reveal>
          {isEmpty ? (
            <View style={{ paddingTop: spacing[6] }}>
              <Text style={{ color: colors.textPrimary, fontSize: typography.title, fontWeight: '800', lineHeight: 28 }}>
                هنوز چیز زیادی درباره‌ی الگوهای تو نمی‌دانم
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: typography.body, lineHeight: 24, marginTop: spacing[3] }}>
                هرچه بیشتر ثبت کنی، تصویر دقیق‌تری از الگوهای شخصی‌ات شکل می‌گیرد.
              </Text>
            </View>
          ) : (
            <>
              {learned.length > 0 ? (
                <View style={{ marginBottom: spacing[6] }}>
                  <Text style={{ color: colors.textPrimary, fontSize: typography.title, fontWeight: '800', lineHeight: 28 }}>
                    چیزهایی که درباره‌ی تو یاد گرفته‌ام
                  </Text>
                  <View style={{ gap: spacing[3], marginTop: spacing[4] }}>
                    {learned.map((ins, i) => (
                      <Reveal key={ins.key} delay={i * 60}>
                        <LearnedCard insight={ins} onPress={goToDetail} />
                      </Reveal>
                    ))}
                  </View>
                </View>
              ) : null}

              {learning.length > 0 ? (
                <View>
                  <Text style={{ color: colors.textPrimary, fontSize: typography.lg, fontWeight: '700' }}>
                    هنوز در حال یادگیری
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: typography.bodySmall, lineHeight: 20, marginTop: spacing[1] }}>
                    برای شناختن این‌ها به داده‌ی بیشتری نیاز دارم:
                  </Text>
                  <View style={{ gap: spacing[1], marginTop: spacing[3] }}>
                    {learning.map((signal) => {
                      const progress = learningProgress[signal];
                      return (
                        <Text key={signal} style={{ color: colors.textTertiary, fontSize: typography.caption, lineHeight: 18 }}>
                          {progress
                            ? `· ${signalLabel(signal)} — ${toFa(progress.observations)} از ${toFa(progress.required)} روز`
                            : `· ${signalLabel(signal)}`}
                        </Text>
                      );
                    })}
                  </View>
                </View>
              ) : null}
            </>
          )}
        </Reveal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  epistemicChip: { paddingHorizontal: 10, paddingVertical: 4, borderWidth: StyleSheet.hairlineWidth },
  confidenceChip: { paddingHorizontal: 10, paddingVertical: 4 },
});
