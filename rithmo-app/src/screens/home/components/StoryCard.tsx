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
import { AppIcon } from '@components/ui';
import icons, { type AppIconName } from '@assets/icons';
import { useTheme } from '@hooks/useTheme';
import { toFa } from '@utils/persian';
import { track } from '@analytics';
import { useSubmitActionFeedback, useSetInsightAccuracy } from '@hooks/queries/useIntelligence';
import type { GuidedAction, Helpfulness, Insight } from '@types/intelligence.types';

/**
 * The guided action's category, as a full-colour icon.
 *
 * These were monoline glyphs tinted `colors.primary`, so the one icon on the
 * Home screen was the same green as the header, the button and the links —
 * nothing on the screen carried a second colour. The PNG set in
 * `assets/icons` is flat-colour artwork, which is what gives this card a
 * focal point.
 *
 * `rest` and `basics` have no matching artwork in the set yet and fall back
 * to the nearest concept; see the note in the project TODO.
 */
const CATEGORY_ICON: Record<string, AppIconName> = {
  calm:       'mentalHealth',      // mind / settling
  movement:   'betterHealth',      // heart with muscles
  comfort:    'healthcare',        // heart held in a hand
  rest:       'wellness',          // NO sleep icon in the set — placeholder
  basics:     'healthcare',        // NO water/hydration icon — placeholder
  connection: 'collaborate',       // two hands, puzzle pieces
  reflection: 'edit',              // pencil — writing something down
  general:    'wellness',
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
  const { colors, typography, spacing, borderRadius } = useTheme();
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
          // 16, and no shadow. This card is the screen's headline but it does
          // not float: the redesign carries surfaces on a hairline border, and
          // reserves elevation for sheets and toasts. A shadow here also made
          // it read as a different material from every other card on Home.
          borderRadius: borderRadius.lg,
          padding: spacing[4],
        },
      ]}
    >
      {/* Coloured top edge — see the note in AccrualLedger for why this is a
          bled child rather than `borderTopColor`. Brand green, not the
          generic `accent` (violet) token: violet has no meaning anywhere
          else in the app's redesigned palette (AccrualLedger's amber
          specifically signals "evidence still being gathered"; this card
          has no such distinct semantic, so it takes the same primary the
          rest of Home's headline elements use). */}
      <View
        style={{
          height: 3,
          backgroundColor: colors.primary,
          marginTop: -spacing[4],
          marginHorizontal: -spacing[4],
          marginBottom: spacing[4],
        }}
      />
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

              {/* One real question, one real answer — not a running poll.
                  `accurate` starts null (never asked); once the user
                  answers, the server has a verdict and this stops asking. */}
              {insight.accurate == null ? (
                <View style={[styles.accuracyRow, { marginTop: spacing[3] }]}>
                  <Text
                    style={{ color: colors.textSecondary, fontSize: typography.caption, fontWeight: '600' }}
                  >
                    این الگو به تجربه‌ات می‌خوره؟
                  </Text>
                  <View style={styles.accuracyBtnRow}>
                    <TouchableOpacity
                      onPress={() => setAccuracy({ key: insight.key, accurate: true })}
                      disabled={isAccuracyPending}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityRole="button"
                      accessibilityLabel="آره، درست است"
                      style={[
                        styles.accuracyBtn,
                        { backgroundColor: colors.primaryLighter, borderRadius: borderRadius.pill },
                      ]}
                    >
                      <Text style={{ color: colors.primaryDark, fontSize: typography.caption, fontWeight: '700' }}>
                        آره
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setAccuracy({ key: insight.key, accurate: false })}
                      disabled={isAccuracyPending}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityRole="button"
                      accessibilityLabel="نه، درست نیست"
                      style={[
                        styles.accuracyBtn,
                        { backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius.pill },
                      ]}
                    >
                      <Text style={{ color: colors.textSecondary, fontSize: typography.caption, fontWeight: '700' }}>
                        نه
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <Text
                  style={{ color: colors.textTertiary, fontSize: typography.caption, marginTop: spacing[3] }}
                >
                  {insight.accurate ? 'ممنون — این به بهتر شدن پیشنهادها کمک می‌کند.' : 'متوجه شدیم، ممنون از بازخوردت.'}
                </Text>
              )}
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
                { backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius.lg },
              ]}
            >
              <AppIcon
                source={icons[CATEGORY_ICON[action.category] ?? CATEGORY_ICON.general]}
                size={24}
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
                  /* colors.textOnPrimary, not a literal white: the dark theme's
                     primary is a light mint (#6FD3A6), where white text measures
                     1.82:1. The token is #0B1F16 there and measures 9.45:1. In
                     light mode the token IS white, which is why the literal
                     looked correct and the failure only appeared in dark mode. */
                  style={{ color: colors.textOnPrimary, fontSize: typography.bodySmall, fontWeight: '700' }}
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
  accuracyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  accuracyBtnRow: { flexDirection: 'row', gap: 8 },
  accuracyBtn: { paddingHorizontal: 14, paddingVertical: 6 },
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
