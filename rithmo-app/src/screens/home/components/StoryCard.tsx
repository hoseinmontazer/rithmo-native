/**
 * StoryCard — the primary insight & guided action card on Home.
 *
 * Merges what Rithmo noticed with what to do about it in a single cohesive,
 * elegant card with clear Persian RTL typography, evidence exploration, and
 * responsive action controls.
 */
import React, { memo, useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { AppIcon, Card, PressScale, Divider } from '@components/ui';
import icons, { type AppIconName } from '@assets/icons';
import { useTheme } from '@hooks/useTheme';
import { toFa } from '@utils/persian';
import { track } from '@analytics';
import { useSubmitActionFeedback, useSetInsightAccuracy } from '@hooks/queries/useIntelligence';
import type { GeneralPhaseContext, GuidedAction, Helpfulness, Insight, NoticingPayload } from '@types/intelligence.types';

const CATEGORY_ICON: Record<string, AppIconName> = {
  calm:       'mentalHealth',
  movement:   'betterHealth',
  comfort:    'healthcare',
  rest:       'wellness',
  basics:     'healthcare',
  connection: 'collaborate',
  reflection: 'edit',
  general:    'wellness',
};

function EvidenceRows({ insight }: { insight: Insight }) {
  const { colors, typography, spacing, borderRadius } = useTheme();
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
  if (typeof e.cycles_matched === 'number' && typeof e.cycles_observed === 'number') {
    rows.push(['دیده‌شده در', `${toFa(e.cycles_matched)} از ${toFa(e.cycles_observed)} چرخه`]);
  }
  if (typeof e.supporting_days === 'number' && typeof e.paired_days === 'number') {
    rows.push(['هم‌زمان دیده‌شده در', `${toFa(e.supporting_days)} از ${toFa(e.paired_days)} روز`]);
  }

  if (rows.length === 0) { return null; }

  return (
    <View style={[styles.evidenceWrap, { backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius.lg, padding: spacing[3], marginTop: spacing[3] }]}>
      {rows.map(([label, value], index) => (
        <View key={label} style={[styles.evidenceRow, index > 0 && { marginTop: spacing[2] }]}>
          <Text style={{ color: colors.textTertiary, fontSize: typography.caption }}>
            {label}
          </Text>
          <Text style={{ color: colors.textPrimary, fontSize: typography.caption, fontWeight: '700' }}>
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
  generalContext?: GeneralPhaseContext | null;
  noticing?: NoticingPayload | null;
  onOpenAction?: (action: GuidedAction) => void;
  onOpenDetail?: (insight: Insight) => void;
}

export const StoryCard = memo(function StoryCard({
  insight,
  action,
  learningMode,
  generalContext,
  noticing,
  onOpenAction,
  onOpenDetail,
}: Props) {
  const { colors, typography, spacing, borderRadius, shadow } = useTheme();
  const [showEvidence, setShowEvidence] = useState(false);
  const { mutate: submitFeedback, isPending } = useSubmitActionFeedback();
  const { mutate: setAccuracy, isPending: isAccuracyPending } = useSetInsightAccuracy();

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

  if (!insight && !action && !noticing) {
    return null;
  }

  return (
    <Card
      rounded="3xl"
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.primaryLight,
          borderWidth: 1,
          padding: spacing[5],
          ...(shadow.sm || {}),
        },
      ]}
    >
      {/* ── Header Badge Row ────────────────────────────────────────── */}
      <View style={styles.badgeRow}>
        <View
          style={[
            styles.topicBadge,
            {
              backgroundColor: colors.primaryLighter,
              borderColor: colors.primaryLight,
              borderRadius: borderRadius.pill,
            },
          ]}
        >
          <Icon name="lightbulb-outline" size={13} color={colors.primaryDark} />
          <Text style={{ color: colors.primaryDark, fontSize: typography.micro, fontWeight: '700' }}>
            {action ? 'پیشنهاد هوشمند' : 'بینش و تحلیل'}
          </Text>
        </View>

        {insight && (
          <PressScale
            onPress={toggleEvidence}
            style={[
              styles.whyBtn,
              {
                backgroundColor: colors.surfaceSecondary,
                borderColor: colors.border,
                borderRadius: borderRadius.pill,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={showEvidence ? 'بستن توضیح' : 'چرا این را می‌بینم؟'}
          >
            <Icon
              name={showEvidence ? 'chevron-up' : 'information-outline'}
              size={13}
              color={colors.textSecondary}
            />
            <Text style={{ color: colors.textSecondary, fontSize: typography.micro, fontWeight: '600' }}>
              {showEvidence ? 'بستن' : 'چرا این را می‌بینم؟'}
            </Text>
          </PressScale>
        )}
      </View>

      {/* ── Observation: noticing or insight ────────────────────────── */}
      {noticing ? (
        <View style={{ marginTop: spacing[3] }}>
          <Text
            style={[
              styles.headlineText,
              {
                color: colors.textPrimary,
                fontSize: typography.large,
                fontWeight: '800',
                lineHeight: 28,
              },
            ]}
          >
            {noticing.headline_fa}
          </Text>
        </View>
      ) : insight ? (
        <PressScale
          onPress={() => onOpenDetail?.(insight)}
          disabled={!onOpenDetail}
          style={{ marginTop: spacing[3] }}
        >
          <Text
            style={[
              styles.headlineText,
              {
                color: colors.textPrimary,
                fontSize: typography.large,
                fontWeight: '800',
                lineHeight: 28,
              },
            ]}
          >
            {insight.title_fa}
          </Text>
          {insight.body_fa ? (
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: typography.bodySmall,
                lineHeight: 22,
                marginTop: spacing[2],
              }}
            >
              {insight.body_fa}
            </Text>
          ) : null}
        </PressScale>
      ) : null}

      {/* ── General context fallback ─────────────────────────────────── */}
      {!noticing && learningMode && generalContext ? (
        <View
          style={[
            styles.generalContextBox,
            { backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius.lg, padding: spacing[3], marginTop: spacing[3] },
          ]}
        >
          <Text style={{ color: colors.textPrimary, fontSize: typography.caption, fontWeight: '700' }}>
            درباره‌ی این مرحله از چرخه
          </Text>
          {generalContext.general_context_fa.map((line, i) => (
            <Text
              key={i}
              style={{ color: colors.textSecondary, fontSize: typography.caption, lineHeight: 20, marginTop: spacing[1] }}
            >
              {`• ${line}`}
            </Text>
          ))}
        </View>
      ) : null}

      {/* ── Evidence expansion ───────────────────────────────────────── */}
      {showEvidence && insight ? (
        <View style={{ marginTop: spacing[3] }}>
          <EvidenceRows insight={insight} />
          <Text
            style={{
              color: colors.textTertiary,
              fontSize: typography.micro,
              lineHeight: 18,
              marginTop: spacing[2],
            }}
          >
            این یک الگوست، نه تشخیص پزشکی.
          </Text>

          {/* Accuracy Question */}
          {insight.accurate == null ? (
            <View style={[styles.accuracyRow, { marginTop: spacing[3] }]}>
              <Text style={{ color: colors.textSecondary, fontSize: typography.caption, fontWeight: '600' }}>
                این الگو به تجربه‌ات می‌خوره؟
              </Text>
              <View style={styles.accuracyBtnRow}>
                <PressScale
                  onPress={() => setAccuracy({ key: insight.key, accurate: true })}
                  disabled={isAccuracyPending}
                  style={[
                    styles.accuracyBtn,
                    { backgroundColor: colors.primaryLighter, borderColor: colors.primaryLight, borderRadius: borderRadius.pill },
                  ]}
                  accessibilityRole="button"
                >
                  <Text style={{ color: colors.primaryDark, fontSize: typography.caption, fontWeight: '700' }}>
                    آره
                  </Text>
                </PressScale>
                <PressScale
                  onPress={() => setAccuracy({ key: insight.key, accurate: false })}
                  disabled={isAccuracyPending}
                  style={[
                    styles.accuracyBtn,
                    { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderRadius: borderRadius.pill },
                  ]}
                  accessibilityRole="button"
                >
                  <Text style={{ color: colors.textSecondary, fontSize: typography.caption, fontWeight: '700' }}>
                    نه
                  </Text>
                </PressScale>
              </View>
            </View>
          ) : (
            <Text style={{ color: colors.textTertiary, fontSize: typography.micro, marginTop: spacing[2] }}>
              {insight.accurate ? 'ممنون — این به بهتر شدن تحلیل‌ها کمک می‌کند.' : 'متوجه شدیم، ممنون از بازخوردت.'}
            </Text>
          )}
        </View>
      ) : null}

      {/* ── Action Section ──────────────────────────────────────────── */}
      {action && (
        <>
          {(insight || noticing) && <Divider style={{ marginVertical: spacing[4] }} />}

          <View style={styles.actionHead}>
            <View
              style={[
                styles.actionIconWrap,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                  borderRadius: borderRadius.xl,
                },
              ]}
            >
              <AppIcon
                source={icons[CATEGORY_ICON[action.category] ?? CATEGORY_ICON.general]}
                size={28}
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
                    lineHeight: 20,
                    marginTop: 3,
                  }}
                >
                  {action.description_fa}
                </Text>
              ) : null}
            </View>
          </View>

          {isPending ? (
            <View style={{ marginTop: spacing[4], alignItems: 'center' }}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : isDone ? (
            feedback?.helpfulness == null ? (
              <View style={{ marginTop: spacing[4] }}>
                <Text style={{ color: colors.textTertiary, fontSize: typography.caption, marginBottom: spacing[2] }}>
                  کمکی کرد؟ (اختیاری)
                </Text>
                <View style={styles.rateRow}>
                  <RateButton label="کمک کرد" icon="thumb-up-outline" onPress={() => rate(1)} />
                  <RateButton label="فرقی نکرد" icon="minus-circle-outline" onPress={() => rate(0)} />
                  <RateButton label="کمک نکرد" icon="thumb-down-outline" onPress={() => rate(-1)} />
                </View>
              </View>
            ) : (
              <Text style={{ color: colors.success, fontSize: typography.caption, fontWeight: '700', marginTop: spacing[3] }}>
                ثبت شد — ممنون از همراهی شما.
              </Text>
            )
          ) : isDismissed ? (
            <Text style={{ color: colors.textTertiary, fontSize: typography.caption, marginTop: spacing[3] }}>
              دیگر این پیشنهاد را به‌زودی نمی‌بینی.
            </Text>
          ) : (
            <View style={[styles.actionBtnRow, { marginTop: spacing[4] }]}>
              <PressScale
                onPress={start}
                style={[
                  styles.primaryActionBtn,
                  {
                    backgroundColor: colors.primary,
                    borderRadius: borderRadius.lg,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={onOpenAction ? `شروع: ${action.title_fa}` : `انجام دادم: ${action.title_fa}`}
              >
                <Icon name={onOpenAction ? 'arrow-left' : 'check'} size={18} color={colors.textOnPrimary} />
                <Text style={{ color: colors.textOnPrimary, fontSize: typography.bodySmall, fontWeight: '700' }}>
                  {onOpenAction ? 'شروع' : 'انجام دادم'}
                </Text>
              </PressScale>

              <PressScale
                onPress={dismiss}
                style={[
                  styles.ghostActionBtn,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.border,
                    borderRadius: borderRadius.lg,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="این پیشنهاد مناسب من نیست"
              >
                <Text style={{ color: colors.textSecondary, fontSize: typography.caption, fontWeight: '600' }}>
                  مناسب من نیست
                </Text>
              </PressScale>
            </View>
          )}
        </>
      )}
    </Card>
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
    <PressScale
      onPress={onPress}
      style={[
        styles.rateBtn,
        {
          backgroundColor: colors.surfaceSecondary,
          borderColor: colors.border,
          borderRadius: borderRadius.md,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Icon name={icon} size={15} color={colors.textSecondary} />
      <Text style={{ color: colors.textSecondary, fontSize: typography.micro, fontWeight: '600' }}>
        {label}
      </Text>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
  },
  whyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
  },
  headlineText: {},
  generalContextBox: {},
  evidenceWrap: {},
  evidenceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  accuracyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  accuracyBtnRow: { flexDirection: 'row', gap: 6 },
  accuracyBtn: { paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1 },
  actionHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  actionIconWrap: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    flexShrink: 0,
  },
  actionBtnRow: { flexDirection: 'row', gap: 8 },
  primaryActionBtn: {
    flex: 1,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
  },
  ghostActionBtn: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  rateRow: { flexDirection: 'row', gap: 6 },
  rateBtn: {
    flex: 1,
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderWidth: 1,
  },
});

