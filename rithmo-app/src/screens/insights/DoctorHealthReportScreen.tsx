/**
 * DoctorHealthReportScreen — «گزارش سلامت من» (P0.8, free/Premium split —
 * see docs/DECISIONS.md DEC-005)
 *
 * A calm, professional conversation-prep document, not a diagnosis and
 * not an AI entertainment screen. Every field rendered here is exactly
 * what `/api/intelligence/doctor-report/` computed
 * (intelligence/services.py::doctor_report_payload) — this screen
 * formats it, it never recomputes a statistic or upgrades a confidence
 * word. The three report categories stay visually separate on purpose:
 *
 *   OBSERVATION          — cycle/symptom/pain/changes, from this user's
 *                           own tracked data. cycle_summary is free for
 *                           every user; symptom_patterns/pain_summary/
 *                           recent_changes require Premium.
 *   MEDICAL INFORMATION   — already-approved knowledge content, visually
 *                           distinguished (different background) so it is
 *                           never mistaken for a personal finding.
 *                           Premium.
 *   FOLLOW-UP             — discussion prompts, rendered as plain
 *                           sentences, never phrased as a diagnosis.
 *                           Premium.
 *
 * report_period/tracking_coverage/data_sufficiency/cycle_summary render
 * for every user; the screen used to whole-screen-gate on isPremium,
 * which hid this free layer entirely. Premium unlocks the rest, with a
 * contextual CTA (`premium_teaser_fa`) where that content would render.
 *
 * The optional AI summary (useDoctorReportNarrative) is additive only
 * and stays fully Premium-gated (not part of this pass): the
 * deterministic sections above render fully whether or not it is
 * available — AI unavailability never removes the report.
 */
import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@hooks/useTheme';
import { screen } from '@theme/spacing';
import { PremiumGate } from '@components/PremiumGate';
import { Card, Badge, Divider, ErrorState, StoryCardSkeleton } from '@components/ui';
import { useDoctorReport } from '@hooks/queries/useIntelligence';
import { useDoctorReportNarrative } from '@hooks/queries/useDoctorReportNarrative';
import { faDateShort, toFa } from '@utils/persian';
import type {
  DoctorReportPayload,
  DoctorReportSymptomPattern,
} from '@types/doctorReport.types';
import type { MonthlyReviewChange } from '@types/monthlyReview.types';

const REMINDER_FA =
  'این گزارش بر اساس اطلاعات ثبت‌شده‌ی شماست و جایگزین ارزیابی پزشکی نیست.';

function SectionTitle({ children }: { children: React.ReactNode }) {
  const { colors, typography, spacing } = useTheme();
  return (
    <Text
      style={{
        color: colors.textPrimary, fontSize: typography.lg, fontWeight: '700',
        marginBottom: spacing[2],
      }}
    >
      {children}
    </Text>
  );
}

function FactRow({ label, value }: { label: string; value: string }) {
  const { colors, typography, spacing } = useTheme();
  return (
    <View style={[styles.factRow, { marginBottom: spacing[2] }]}>
      <Text style={{ color: colors.textSecondary, fontSize: typography.caption }}>
        {label}
      </Text>
      <Text style={{ color: colors.textPrimary, fontSize: typography.caption, fontWeight: '700' }}>
        {value}
      </Text>
    </View>
  );
}

function EmptySectionNote({ text }: { text: string }) {
  const { colors, typography } = useTheme();
  return (
    <Text style={{ color: colors.textTertiary, fontSize: typography.caption, lineHeight: 18 }}>
      {text}
    </Text>
  );
}

function CycleSummaryBlock({ cycle }: { cycle: DoctorReportPayload['observation']['cycle_summary'] }) {
  if (!cycle) {
    return <EmptySectionNote text="هنوز چرخه‌ی کاملی برای خلاصه‌ی چرخه ثبت نشده." />;
  }
  return (
    <>
      <FactRow label="میانگین طول چرخه" value={`${toFa(Math.round(cycle.average_cycle_length))} روز`} />
      {cycle.recent_cycle_lengths.length > 0 && (
        <FactRow
          label="چرخه‌های اخیر"
          value={cycle.recent_cycle_lengths.map((n) => toFa(n)).join('، ')}
        />
      )}
      {cycle.regularity_score != null && (
        <FactRow label="امتیاز انتظام" value={`${toFa(Math.round(cycle.regularity_score))}٪`} />
      )}
    </>
  );
}

function SymptomPatternsBlock({ patterns }: { patterns: DoctorReportSymptomPattern[] }) {
  const { colors, typography, spacing } = useTheme();
  if (patterns.length === 0) {
    return <EmptySectionNote text="هنوز علامتی با الگوی به‌اندازه‌ی کافی تکرارشونده ثبت نشده." />;
  }
  return (
    <View style={{ gap: spacing[2] }}>
      {patterns.map((p, i) => (
        <View key={`${p.symptom}-${i}`}>
          <View style={styles.factRow}>
            <Text style={{ color: colors.textPrimary, fontSize: typography.caption, fontWeight: '600' }}>
              {p.symptom_label_fa ?? p.symptom}
            </Text>
            <Badge label={p.confidence_label_fa} variant="info" />
          </View>
          {p.cycle_day_range && (
            <Text style={{ color: colors.textSecondary, fontSize: typography.caption, marginTop: 2 }}>
              معمولاً بین روز {toFa(p.cycle_day_range[0])} تا {toFa(p.cycle_day_range[1])} چرخه
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}

function PainBlock({ pain }: { pain: DoctorReportPayload['observation']['pain_summary'] }) {
  if (!pain || pain.status === 'no_data') {
    return <EmptySectionNote text="هنوز داده‌ی کافی از درد ثبت‌شده وجود ندارد." />;
  }
  if (pain.status === 'stable') {
    return <EmptySectionNote text="درد ثبت‌شده‌ی اخیر نسبت به حالت معمول تفاوت محسوسی نداشته." />;
  }
  const { colors, typography } = useTheme();
  return (
    <Text style={{ color: colors.textPrimary, fontSize: typography.caption, lineHeight: 20 }}>
      درد ثبت‌شده‌ی اخیر نسبت به حالت معمول {pain.direction === 'above' ? 'بالاتر' : 'پایین‌تر'} بوده است.
    </Text>
  );
}

function ChangesBlock({ changes }: { changes: MonthlyReviewChange[] }) {
  const { spacing } = useTheme();
  if (changes.length === 0) {
    return <EmptySectionNote text="در بازه‌ی اخیر تغییر محسوسی نسبت به حالت معمول ثبت نشده." />;
  }
  return (
    <View style={{ gap: spacing[1] }}>
      {changes.map((c, i) => (
        <FactRow key={`${c.signal}-${i}`} label={c.signal} value={c.direction} />
      ))}
    </View>
  );
}

export default function DoctorHealthReportScreen() {
  const { colors, spacing, typography } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, isError, error, refetch } = useDoctorReport();
  const { review: narrative } = useDoctorReportNarrative();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['left', 'right', 'bottom']}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: screen.gutter, paddingTop: screen.top, paddingBottom: screen.bottom }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <Text style={[styles.title, { color: colors.textPrimary, fontSize: typography.xl, marginTop: spacing[3] }]}>
          گزارش سلامت من
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: typography.xs, marginTop: 4, marginBottom: spacing[4], lineHeight: 18 }}>
          خلاصه‌ای از داده‌های ثبت‌شده‌ات، آماده برای مطرح‌کردن در ویزیت پزشکی.
        </Text>

        {isError && !isLoading && <ErrorState error={error} onRetry={refetch} />}

        {isLoading && !data && <StoryCardSkeleton />}

        {data && (
          <>
            {/* ── بازه گزارش ─────────────────────────────────────────── */}
            <Card elevated={false} rounded="2xl" style={{ padding: spacing[4], marginBottom: spacing[4] }}>
              <SectionTitle>بازه گزارش</SectionTitle>
              <FactRow
                label="از"
                value={data.report_period.start ? faDateShort(data.report_period.start) : '—'}
              />
              <FactRow label="تا" value={faDateShort(data.report_period.end)} />
              <FactRow label="روزهای ثبت‌شده" value={toFa(data.tracking_coverage.total_logs)} />
            </Card>

            {data.coverage_message_fa && (
              <Card elevated={false} rounded="2xl" style={{ padding: spacing[4], marginBottom: spacing[4] }}>
                <Text style={{ color: colors.textSecondary, fontSize: typography.bodySmall, lineHeight: 20 }}>
                  {data.coverage_message_fa}
                </Text>
              </Card>
            )}

            {/* ── خلاصه (AI narrative, optional) ─────────────────────── */}
            {narrative && (
              <Card elevated={false} rounded="2xl" style={{ padding: spacing[4], marginBottom: spacing[4] }}>
                <SectionTitle>خلاصه</SectionTitle>
                <Text style={{ color: colors.textPrimary, fontSize: typography.bodySmall, lineHeight: 22 }}>
                  {narrative.summary}
                </Text>
                {narrative.suggestion ? (
                  <Text style={{ color: colors.textSecondary, fontSize: typography.caption, lineHeight: 20, marginTop: spacing[2] }}>
                    {narrative.suggestion}
                  </Text>
                ) : null}
              </Card>
            )}

            {/* ── مشاهدات ثبت‌شده (OBSERVATION) ─────────────────────────
                خلاصه‌ی چرخه is free for every user (DEC-005); the rest
                of this section requires Premium. */}
            <Card elevated={false} rounded="2xl" style={{ padding: spacing[4], marginBottom: spacing[4] }}>
              <SectionTitle>مشاهدات ثبت‌شده</SectionTitle>

              <Text style={{ color: colors.textTertiary, fontSize: typography.overline, fontWeight: '700', marginBottom: spacing[1] }}>
                خلاصه‌ی چرخه
              </Text>
              <CycleSummaryBlock cycle={data.observation.cycle_summary} />

              {/* premium_required alone can be true even in pure Learning
                  Mode (nothing behind Premium there either — see
                  coverage_message_fa above); premium_teaser_fa is only
                  ever set once there's something real to tease, so it's
                  the actual gate for showing this CTA at all. */}
              {data.premium_required && data.premium_teaser_fa ? (
                <>
                  <Divider style={{ marginVertical: spacing[3] }} />
                  <Text style={{ color: colors.textSecondary, fontSize: typography.caption, lineHeight: 18, marginBottom: spacing[2] }}>
                    {data.premium_teaser_fa}
                  </Text>
                  <PremiumGate overlay featureName="مشاهدات تکمیلی" />
                </>
              ) : !data.premium_required ? (
                <>
                  <Divider style={{ marginVertical: spacing[3] }} />
                  <Text style={{ color: colors.textTertiary, fontSize: typography.overline, fontWeight: '700', marginBottom: spacing[1] }}>
                    علائم تکرارشونده
                  </Text>
                  <SymptomPatternsBlock patterns={data.observation.symptom_patterns} />

                  <Divider style={{ marginVertical: spacing[3] }} />
                  <Text style={{ color: colors.textTertiary, fontSize: typography.overline, fontWeight: '700', marginBottom: spacing[1] }}>
                    درد
                  </Text>
                  <PainBlock pain={data.observation.pain_summary} />

                  <Divider style={{ marginVertical: spacing[3] }} />
                  <Text style={{ color: colors.textTertiary, fontSize: typography.overline, fontWeight: '700', marginBottom: spacing[1] }}>
                    تغییرات اخیر
                  </Text>
                  <ChangesBlock changes={data.observation.recent_changes} />
                </>
              ) : null /* Premium-gated with nothing real behind it yet
                          (still in Learning Mode) — coverage_message_fa's
                          own card above already says so honestly; no
                          premature upsell here. */}
            </Card>

            {/* ── اطلاعات سلامت (MEDICAL INFORMATION) — Premium ────────
                Visually distinct background — never mistaken for a
                personal finding. Not shown at all for a free user
                (data.premium_required already covers it above; no
                second, redundant CTA here). */}
            {!data.premium_required && data.medical_information.length > 0 && (
              <Card
                elevated={false}
                rounded="2xl"
                style={{ padding: spacing[4], marginBottom: spacing[4], backgroundColor: colors.infoBg }}
              >
                <SectionTitle>اطلاعات سلامت</SectionTitle>
                <View style={{ gap: spacing[3] }}>
                  {data.medical_information.map((item, i) => (
                    <View key={i}>
                      <Text style={{ color: colors.textPrimary, fontSize: typography.bodySmall, fontWeight: '600' }}>
                        {item.title_fa}
                      </Text>
                      <Text style={{ color: colors.textSecondary, fontSize: typography.caption, lineHeight: 20, marginTop: 2 }}>
                        {item.short_summary_fa}
                      </Text>
                    </View>
                  ))}
                </View>
              </Card>
            )}

            {/* ── موضوعاتی برای مطرح کردن با پزشک (FOLLOW-UP) — Premium
                Not shown at all for a free user, same reasoning as
                MEDICAL INFORMATION above. */}
            {!data.premium_required && (
              <Card elevated={false} rounded="2xl" style={{ padding: spacing[4], marginBottom: spacing[4] }}>
                <SectionTitle>موضوعاتی برای مطرح کردن با پزشک</SectionTitle>
                {data.follow_up.length === 0 ? (
                  <EmptySectionNote text="فعلاً موضوع خاصی که نیاز به مطرح‌کردن داشته باشد شناسایی نشده." />
                ) : (
                  <View style={{ gap: spacing[2] }}>
                    {data.follow_up.map((topic, i) => (
                      <Text key={i} style={{ color: colors.textPrimary, fontSize: typography.caption, lineHeight: 20 }}>
                        {`· ${topic}`}
                      </Text>
                    ))}
                  </View>
                )}
              </Card>
            )}

            {/* ── یادآوری ─────────────────────────────────────────────── */}
            <Text style={{ color: colors.textTertiary, fontSize: typography.micro, lineHeight: 16, textAlign: 'center' }}>
              {REMINDER_FA}
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  title: { fontWeight: '800' },
  factRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
