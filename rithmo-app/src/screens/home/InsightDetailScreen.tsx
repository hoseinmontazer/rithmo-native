/**
 * InsightDetailScreen — «چرا Rhythmo این را می‌گوید؟»
 *
 * A presentation layer over already-validated intelligence, nothing more.
 * The insight arrives via navigation params exactly as TodayView/
 * InsightListView returned it — no recomputation of confidence, recurrence,
 * baseline, phase or epistemic_kind happens here or anywhere on the client.
 * `useToday()` is read only for `state.baselines.learning` (the "what
 * Rhythmo doesn't know yet" section) and reuses the same cached query Home
 * already populated — not a new network call in the common case.
 *
 * The screen's whole job is to keep four things visually distinct and never
 * let one borrow the others' certainty:
 *
 *     what was observed  →  epistemic label  →  evidence  →  what's still unknown
 */
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '@hooks/useTheme';
import { Reveal } from '@components/ui';
import { useToday } from '@hooks/queries/useIntelligence';
import { signalLabel } from '@i18n';
import { toFa } from '@utils/persian';
import { screen } from '@theme/spacing';
import type { HomeScreenProps } from '@navigation/types';
import type { Insight, InsightConfidence } from '@types/intelligence.types';

type Props = HomeScreenProps<'InsightDetail'>;

function confidenceColor(
  confidence: InsightConfidence,
  colors: ReturnType<typeof useTheme>['colors'],
): { fg: string; bg: string } {
  switch (confidence) {
    case 'established':
      return { fg: colors.success, bg: colors.successBg };
    case 'repeated':
      return { fg: colors.primary, bg: colors.primaryLighter };
    case 'emerging':
      return { fg: colors.textSecondary, bg: colors.borderSubtle };
    default:
      return { fg: colors.textTertiary, bg: colors.borderSubtle };
  }
}

/** Section eyebrow — a subordinate label, never competing with the title. */
function SectionLabel({ children }: { children: string }) {
  const { colors, typography } = useTheme();
  return (
    <Text style={{ color: colors.textTertiary, fontSize: typography.overline, fontWeight: '700', marginBottom: 8 }}>
      {children}
    </Text>
  );
}

/**
 * Evidence, in human-readable rows — built only from keys actually present
 * on this insight's evidence. A superset of the rows StoryCard/
 * TodayInsightCard each render on Home, kept local and independent of
 * both so this screen never risks changing their already-verified output.
 */
function evidenceRows(insight: Insight): Array<[string, string]> {
  const e = insight.evidence as Record<string, any>;
  const rows: Array<[string, string]> = [];

  if (typeof e.cycles_matched === 'number' && typeof e.cycles_observed === 'number') {
    rows.push(['دیده‌شده در', `${toFa(e.cycles_matched)} از ${toFa(e.cycles_observed)} چرخه`]);
  }
  if (typeof e.supporting_days === 'number' && typeof e.paired_days === 'number') {
    rows.push(['هم‌زمان دیده‌شده در', `${toFa(e.supporting_days)} از ${toFa(e.paired_days)} روز`]);
  }
  if (typeof e.recent_mean === 'number' && typeof e.window_days === 'number') {
    rows.push([`میانگین ${toFa(e.window_days)} روز اخیر`, toFa(Number(e.recent_mean).toFixed(1))]);
  }
  if (typeof e.baseline_centre === 'number') {
    rows.push(['حالت معمول تو', toFa(Number(e.baseline_centre).toFixed(1))]);
  }
  if (typeof e.phase_mean === 'number' && typeof e.other_mean === 'number') {
    rows.push(['در این فاز', toFa(Number(e.phase_mean).toFixed(1))]);
    rows.push(['در بقیه‌ی چرخه', toFa(Number(e.other_mean).toFixed(1))]);
  }
  if (typeof e.observations === 'number') {
    rows.push(['روزهای ثبت‌شده', toFa(e.observations)]);
  }
  if (typeof e.occurrences === 'number') {
    rows.push(['دفعات ثبت', toFa(e.occurrences)]);
  }
  if (typeof e.cycles === 'number') {
    rows.push(['چرخه‌های بررسی‌شده', toFa(e.cycles)]);
  }
  if (typeof e.recent_observations === 'number') {
    rows.push(['روزهای اخیر', toFa(e.recent_observations)]);
  }
  if (typeof e.baseline_observations === 'number') {
    rows.push(['روزهای مبنا', toFa(e.baseline_observations)]);
  }
  if (Array.isArray(e.cycle_day_range)) {
    rows.push(['بازه‌ی روز چرخه', `${toFa(e.cycle_day_range[0])} تا ${toFa(e.cycle_day_range[1])}`]);
  }
  if (insight.times_seen && insight.times_seen > 1) {
    rows.push(['دفعات مشاهده', toFa(insight.times_seen)]);
  }
  return rows;
}

export default function InsightDetailScreen() {
  useNavigation<Props['navigation']>();
  const route = useRoute<Props['route']>();
  const { insight } = route.params;
  const { colors, typography, spacing, borderRadius } = useTheme();
  // Cached from Home's own load in the common case — this screen adds no
  // new network call there. If opened without Home having loaded first
  // (e.g. a cold deep-link), React Query simply fetches it once.
  const { data: today } = useToday();

  const isCoverage = insight.kind === 'coverage';
  const tone = confidenceColor(insight.confidence, colors);
  const rows = evidenceRows(insight);
  const learning = today?.state.baselines.learning ?? [];
  const learningProgress = today?.state.baselines.learning_progress ?? {};
  const usableCycles = today?.state.cycle.usable_cycles;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: screen.gutter,
          paddingTop: screen.top,
          paddingBottom: screen.bottom,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Reveal>
          {/* ── 2. Insight identity ─────────────────────────────────── */}
          <Text
            style={{ color: colors.textPrimary, fontSize: typography.title, fontWeight: '800', lineHeight: 30 }}
          >
            {insight.title_fa}
          </Text>

          <View style={[styles.chipRow, { marginTop: spacing[3] }]}>
            {insight.epistemic_kind ? (
              <View style={[styles.epistemicChip, { borderColor: colors.borderSubtle, borderRadius: borderRadius.pill }]}>
                <Text style={{ color: colors.textTertiary, fontSize: typography.caption, fontWeight: '700' }}>
                  {insight.epistemic_kind_label_fa}
                </Text>
              </View>
            ) : null}
            {!isCoverage && insight.confidence_label_fa ? (
              <View style={[styles.confidenceChip, { backgroundColor: tone.bg, borderRadius: borderRadius.pill }]}>
                <Text style={{ color: tone.fg, fontSize: typography.caption, fontWeight: '700' }}>
                  {insight.confidence_label_fa}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Evidence is limited — said plainly, not implied by a bare label. */}
          {insight.epistemic_kind === 'hypothesis' ? (
            <Text style={{ color: colors.textTertiary, fontSize: typography.caption, lineHeight: 18, marginTop: spacing[2] }}>
              شواهد هنوز محدود است — این یک نشانه‌ی اولیه است، نه یک الگوی تثبیت‌شده.
            </Text>
          ) : null}

          {/* ── 4. Explanation ──────────────────────────────────────── */}
          <View style={{ marginTop: spacing[5] }}>
            <SectionLabel>{isCoverage ? 'وضعیت' : 'چه چیزی دیده شده'}</SectionLabel>
            <Text style={{ color: colors.textSecondary, fontSize: typography.body, lineHeight: 24 }}>
              {insight.body_fa}
            </Text>
          </View>

          {/* ── 3. Evidence ──────────────────────────────────────────── */}
          {!isCoverage && rows.length > 0 ? (
            <View
              style={[
                styles.card,
                { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: borderRadius.lg, padding: spacing[4], marginTop: spacing[5] },
              ]}
            >
              <SectionLabel>شواهد</SectionLabel>
              <View style={{ gap: spacing[2] }}>
                {rows.map(([label, value]) => (
                  <View key={label} style={styles.evidenceRow}>
                    <Text style={{ color: colors.textTertiary, fontSize: typography.caption }}>{label}</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: typography.caption, fontWeight: '700' }}>
                      {value}
                    </Text>
                  </View>
                ))}
                {typeof usableCycles === 'number' && usableCycles > 0 && insight.kind === 'recurrence' ? (
                  <View style={styles.evidenceRow}>
                    <Text style={{ color: colors.textTertiary, fontSize: typography.caption }}>چرخه‌های قابل‌استفاده</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: typography.caption, fontWeight: '700' }}>
                      {toFa(usableCycles)}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={{ color: colors.textTertiary, fontSize: typography.caption, lineHeight: 18, marginTop: spacing[3] }}>
                این یک الگوست، نه تشخیص پزشکی.
              </Text>
            </View>
          ) : null}

          {/* ── 5. What Rhythmo does not know yet ───────────────────── */}
          {learning.length > 0 ? (
            <View style={{ marginTop: spacing[5] }}>
              <SectionLabel>هنوز مطمئن نیستم</SectionLabel>
              <Text style={{ color: colors.textSecondary, fontSize: typography.bodySmall, lineHeight: 21 }}>
                برای اینکه ببینم این‌ها هم به الگوی قابل اطمینانی می‌رسند، به داده‌ی بیشتری نیاز دارم:
              </Text>
              <View style={{ gap: spacing[1], marginTop: spacing[2] }}>
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
        </Reveal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  card: { borderWidth: 1 },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  epistemicChip: { paddingHorizontal: 10, paddingVertical: 4, borderWidth: StyleSheet.hairlineWidth },
  confidenceChip: { paddingHorizontal: 10, paddingVertical: 4 },
  evidenceRow: { flexDirection: 'row', justifyContent: 'space-between' },
});
