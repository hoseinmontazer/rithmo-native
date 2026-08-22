/**
 * StoryCard — the one thing Home is about.
 *
 * This is the F-02 merge: what Rithmo noticed and what to do about it are
 * now a single card separated by a divider, not two cards separated by a
 * section heading.
 *
 *     insight  →  evidence  →  «چرا این را می‌بینم؟»
 *     ────────────────────────────────────────────
 *     action   →  why this action  →  feedback
 *
 * Why it matters more than it looks: as two cards of equal weight, the user
 * had to infer that the recommendation came from the observation. That
 * inference is the entire product claim — "this suggestion exists *because*
 * of something in your data" — and leaving it to be inferred is what made
 * the app read as interesting statistics next to generic advice. One card
 * with one divider states the connection instead of implying it.
 *
 * Everything rendered here comes from the server. There are no defaults and
 * no filler: a missing insight, a missing action, or missing evidence each
 * render as absence rather than as invented text.
 */

import React, { memo, useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@hooks/useTheme';
import { toFa } from '@utils/persian';
import { track } from '@analytics';
import { useSubmitActionFeedback } from '@hooks/queries/useIntelligence';
import type { GuidedAction, Helpfulness, Insight } from '@types/intelligence.types';

const CATEGORY_ICON: Record<string, string> = {
  calm: 'weather-windy',
  movement: 'walk',
  comfort: 'hand-heart-outline',
  rest: 'sleep',
  basics: 'cup-water',
  connection: 'account-heart-outline',
  reflection: 'notebook-outline',
  general: 'star-four-points-outline',
};

/**
 * Evidence rows, built only from fields the payload actually contains.
 *
 * Each row is a number the user could check against her own logs — sample
 * size, window, her usual value. This is the difference between "we noticed
 * something" and a claim she can audit.
 */
function EvidenceRows({ insight }: { insight: Insight }) {
  const { colors, typography, spacing } = useTheme();
  const e = insight.evidence as Record<string, any>;

  const rows: Array<[string, string]> = [];

  if (typeof e.recent_mean === 'number' && typeof e.window_days === 'number') {
    rows.push([
      `میانگین ${toFa(e.window_days)} روز اخیر`,
      toFa(Number(e.recent_mean).toFixed(1)),
    ]);
  }
  if (typeof e.baseline_centre === 'number') {
    rows.push(['حالت معمول تو', toFa(Number(e.baseline_centre).toFixed(1))]);
  }
  if (typeof e.phase_mean === 'number' && typeof e.other_mean === 'number') {
    rows.push(['در این فاز', toFa(Number(e.phase_mean).toFixed(1))]);
    rows.push(['در بقیه چرخه', toFa(Number(e.other_mean).toFixed(1))]);
  }
  if (Array.isArray(e.cycle_day_range)) {
    rows.push([
      'بازه روز چرخه',
      `${toFa(e.cycle_day_range[0])} تا ${toFa(e.cycle_day_range[1])}`,
    ]);
  }

  const sampleSize =
    typeof e.baseline_observations === 'number' ? e.baseline_observations
      : typeof e.observations === 'number' ? e.observations
        : typeof e.occurrences === 'number' ? e.occurrences
          : null;
  if (sampleSize !== null) {
    rows.push(['بر پایه‌ی', `${toFa(sampleSize)} روز ثبت‌شده`]);
  }
  if (typeof e.cycles === 'number') {
    rows.push(['چرخه‌های بررسی‌شده', toFa(e.cycles)]);
  }

  if (rows.length === 0) { return null; }

  return (
    <View style={{ gap: spacing[2], marginTop: spacing[3] }}>
      {rows.map(([label, value]) => (
        <View key={label} style={styles.evidenceRow}>
          <Text style={{ color: colors.textTertiary, fontSize: typography.caption }}>
            {label}
          </Text>
          <Text
            style={{ color: colors.textSecondary, fontSize: typography.caption, fontWeight: '700' }}
          >
            {value}
          </Text>
        </View>
      ))}
    </View>
  );
}

interface Props {
  insight: Insight | null;
  action: GuidedAction | null;
  learningMode: boolean;
  /** Only for data-collection actions that have somewhere to go. */
  onOpenAction?: (action: GuidedAction) => void;
}

export const StoryCard = memo(function StoryCard({
  insight,
  action,
  learningMode,
  onOpenAction,
}: Props) {
  const { colors, typography, spacing, borderRadius, shadow } = useTheme();
  const [showEvidence, setShowEvidence] = useState(false);
  const { mutate: submitFeedback, isPending } = useSubmitActionFeedback();

  const feedback = action?.feedback ?? null;
  const isDone = feedback?.status === 'completed';
  const isDismissed = feedback?.status === 'dismissed';

  const toggleEvidence = useCallback(() => {
    setShowEvidence((open) => {
      if (!open && insight) {
        track('insight_explanation_opened', {
          insight_key: insight.key,
          insight_kind: insight.kind,
        });
      }
      return !open;
    });
  }, [insight]);

  const complete = useCallback(() => {
    if (!action || isPending) { return; }
    track('insight_action_completed', {
      intervention: action.intervention,
      slot: action.slot,
    });
    submitFeedback({ actionId: action.id, status: 'completed' });
  }, [action, isPending, submitFeedback]);

  const dismiss = useCallback(() => {
    if (!action || isPending) { return; }
    track('insight_action_dismissed', {
      intervention: action.intervention,
      slot: action.slot,
    });
    submitFeedback({ actionId: action.id, status: 'dismissed' });
  }, [action, isPending, submitFeedback]);

  const rate = useCallback(
    (helpfulness: Helpfulness) => {
      if (!action || isPending) { return; }
      track('insight_action_completed', {
        intervention: action.intervention,
        slot: action.slot,
        helpfulness,
      });
      submitFeedback({ actionId: action.id, status: 'completed', helpfulness });
    },
    [action, isPending, submitFeedback],
  );

  const start = useCallback(() => {
    if (!action) { return; }
    if (onOpenAction) {
      track('insight_action_started', {
        intervention: action.intervention,
        slot: action.slot,
      });
      onOpenAction(action);
    } else {
      complete();
    }
  }, [action, onOpenAction, complete]);

  // Nothing at all — not an error, just a day with no supportable claim.
  if (!insight && !action) {
    return null;
  }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: borderRadius.xl,
          padding: spacing[4],
          ...shadow.sm,
        },
      ]}
    >
      {/* ── The observation ─────────────────────────────────────────── */}
      {insight ? (
        <View accessible accessibilityLabel={`${insight.title_fa}. ${insight.body_fa}`}>
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: typography.title,
              fontWeight: '800',
              lineHeight: 26,
            }}
          >
            {insight.title_fa}
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: typography.bodySmall,
              lineHeight: 21,
              marginTop: spacing[2],
            }}
          >
            {insight.body_fa}
          </Text>
        </View>
      ) : null}

      {/* ── Trust affordance ────────────────────────────────────────── */}
      {insight && insight.kind !== 'coverage' ? (
        <>
          <View style={[styles.metaRow, { marginTop: spacing[3] }]}>
            {!learningMode && insight.confidence_label_fa ? (
              <View
                style={[
                  styles.chip,
                  { backgroundColor: colors.primaryLighter, borderRadius: borderRadius.pill },
                ]}
              >
                <Text
                  style={{ color: colors.primary, fontSize: typography.overline, fontWeight: '700' }}
                >
                  {insight.confidence_label_fa}
                </Text>
              </View>
            ) : <View />}

            <TouchableOpacity
              onPress={toggleEvidence}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityState={{ expanded: showEvidence }}
              accessibilityLabel={showEvidence ? 'بستن توضیح' : 'چرا این را می‌بینم؟'}
              style={styles.whyBtn}
            >
              <Icon
                name={showEvidence ? 'chevron-up' : 'information-outline'}
                size={15}
                color={colors.primary}
              />
              <Text
                style={{ color: colors.primary, fontSize: typography.caption, fontWeight: '700' }}
              >
                {showEvidence ? 'بستن' : 'چرا این را می‌بینم؟'}
              </Text>
            </TouchableOpacity>
          </View>

          {showEvidence ? (
            <View
              style={[
                styles.evidenceBox,
                { backgroundColor: colors.background, borderRadius: borderRadius.md, padding: spacing[3] },
              ]}
            >
              <Text
                style={{ color: colors.textSecondary, fontSize: typography.caption, lineHeight: 18 }}
              >
                این نتیجه فقط از داده‌های ثبت‌شده‌ی خودت محاسبه شده است:
              </Text>
              <EvidenceRows insight={insight} />
              {/* Boundary statement — kept short so it informs without
                  turning a wellness app into a medical disclaimer. */}
              <Text
                style={{
                  color: colors.textTertiary,
                  fontSize: typography.caption,
                  lineHeight: 18,
                  marginTop: spacing[3],
                }}
              >
                این یک الگوست، نه تشخیص پزشکی.
              </Text>
            </View>
          ) : null}
        </>
      ) : null}

      {/* ── The connection ──────────────────────────────────────────── */}
      {insight && action ? (
        <View
          style={[
            styles.divider,
            { backgroundColor: colors.borderSubtle, marginVertical: spacing[4] },
          ]}
        />
      ) : null}

      {/* ── The action ──────────────────────────────────────────────── */}
      {action ? (
        <View>
          <View style={styles.actionHead}>
            <View
              style={[
                styles.actionIcon,
                { backgroundColor: colors.primaryLighter, borderRadius: borderRadius.lg },
              ]}
            >
              <Icon
                name={CATEGORY_ICON[action.category] ?? CATEGORY_ICON.general}
                size={18}
                color={colors.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: colors.textPrimary,
                  fontSize: typography.body,
                  fontWeight: '700',
                  textDecorationLine: isDone ? 'line-through' : 'none',
                }}
              >
                {action.title_fa}
              </Text>
              {action.description_fa ? (
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: typography.bodySmall,
                    lineHeight: 19,
                    marginTop: 3,
                  }}
                >
                  {action.description_fa}
                </Text>
              ) : null}
            </View>
          </View>

          {/* The action's own justification. Separate from the insight's
              evidence because it answers a different question: not "why do
              you believe that" but "why are you suggesting THIS". */}
          {action.reason_fa && !insight ? (
            <Text
              style={{
                color: colors.textTertiary,
                fontSize: typography.caption,
                lineHeight: 18,
                marginTop: spacing[3],
              }}
            >
              {action.reason_fa}
            </Text>
          ) : null}

          {isPending ? (
            <View style={{ marginTop: spacing[4], alignItems: 'center' }}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : isDone ? (
            feedback?.helpfulness === null || feedback?.helpfulness === undefined ? (
              <View style={{ marginTop: spacing[4] }}>
                <Text
                  style={{
                    color: colors.textTertiary,
                    fontSize: typography.caption,
                    marginBottom: spacing[2],
                  }}
                >
                  کمکی کرد؟ (اختیاری)
                </Text>
                <View style={styles.rateRow}>
                  <RateButton label="کمک کرد" icon="thumb-up-outline" onPress={() => rate(1)} />
                  <RateButton label="فرقی نکرد" icon="minus-circle-outline" onPress={() => rate(0)} />
                  <RateButton label="کمک نکرد" icon="thumb-down-outline" onPress={() => rate(-1)} />
                </View>
              </View>
            ) : (
              <Text
                style={{
                  color: colors.success,
                  fontSize: typography.caption,
                  fontWeight: '700',
                  marginTop: spacing[4],
                }}
              >
                ثبت شد — همین به شناخت بهتر کمک می‌کند.
              </Text>
            )
          ) : isDismissed ? (
            <Text
              style={{
                color: colors.textTertiary,
                fontSize: typography.caption,
                marginTop: spacing[4],
              }}
            >
              دیگر این پیشنهاد را به‌زودی نمی‌بینی.
            </Text>
          ) : (
            <View style={[styles.actionRow, { marginTop: spacing[4] }]}>
              <TouchableOpacity
                onPress={start}
                style={[
                  styles.primaryBtn,
                  { backgroundColor: colors.primary, borderRadius: borderRadius.lg },
                ]}
                accessibilityRole="button"
                accessibilityLabel={onOpenAction ? `شروع: ${action.title_fa}` : `انجام دادم: ${action.title_fa}`}
              >
                <Text
                  style={{ color: '#FFFFFF', fontSize: typography.bodySmall, fontWeight: '700' }}
                >
                  {onOpenAction ? 'شروع' : 'انجام دادم'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={dismiss}
                style={[
                  styles.ghostBtn,
                  { borderColor: colors.border, borderRadius: borderRadius.lg },
                ]}
                accessibilityRole="button"
                accessibilityLabel="این پیشنهاد مناسب من نیست"
              >
                <Text
                  style={{
                    color: colors.textSecondary,
                    fontSize: typography.bodySmall,
                    fontWeight: '600',
                  }}
                >
                  مناسب من نیست
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
});

function RateButton({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: string;
  onPress: () => void;
}) {
  const { colors, typography, borderRadius } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.rateBtn, { borderColor: colors.border, borderRadius: borderRadius.lg }]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Icon name={icon} size={15} color={colors.textSecondary} />
      <Text style={{ color: colors.textSecondary, fontSize: typography.caption }}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, overflow: 'hidden' },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  chip: { paddingHorizontal: 10, paddingVertical: 4 },
  whyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  evidenceBox: { marginTop: 10 },
  evidenceRow: { flexDirection: 'row', justifyContent: 'space-between' },
  divider: { height: StyleSheet.hairlineWidth },
  actionHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  actionIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  actionRow: { flexDirection: 'row', gap: 8 },
  primaryBtn: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  ghostBtn: {
    borderWidth: 1,
    minHeight: 48,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateRow: { flexDirection: 'row', gap: 6 },
  rateBtn: {
    flex: 1,
    borderWidth: 1,
    minHeight: 44,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
});
