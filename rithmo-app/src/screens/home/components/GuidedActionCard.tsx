/**
 * GuidedActionCard — "امروز چه کاری؟"
 *
 * One recommendation, its reason, and the two taps that close the loop.
 *
 * Three things this card must always do, because they are what separates
 * guided action from a generic task list:
 *
 *   1. **Show the reason.** ``reason_fa`` comes from the user's own data
 *      and is frozen server-side at the moment the action was issued, so
 *      the justification she reads is the one her feedback attaches to.
 *
 *   2. **Accept "not relevant".** Dismissal is a real answer, and the
 *      server honours it with a cooldown. A card that can only be
 *      completed teaches the user to ignore it.
 *
 *   3. **Ask whether it helped — and accept silence.** "Didn't say" and
 *      "made no difference" are different evidence; the engine will not
 *      count one as the other, so the UI must not force a rating.
 */
import React, { memo, useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@hooks/useTheme';
import { toFa } from '@utils/persian';
import { useSubmitActionFeedback } from '@hooks/queries/useIntelligence';
import { track } from '@analytics';
import type { GuidedAction, Helpfulness } from '@types/intelligence.types';

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

const SLOT_LABEL: Record<string, string> = {
  primary: 'تمرکز امروز',
  supporting: 'اگر توان داشتی',
  reflection: 'یک لحظه با خودت',
};

interface Props {
  action: GuidedAction;
  /** Optional: navigate somewhere the action can actually be performed. */
  onOpen?: (action: GuidedAction) => void;
}

export const GuidedActionCard = memo(function GuidedActionCard({ action, onOpen }: Props) {
  const { colors, typography, borderRadius, shadow } = useTheme();
  const [showReason, setShowReason] = useState(false);
  const { mutate: submitFeedback, isPending } = useSubmitActionFeedback();

  const feedback = action.feedback;
  const isDone = feedback?.status === 'completed';
  const isDismissed = feedback?.status === 'dismissed';

  const complete = useCallback(() => {
    if (isPending) { return; }
    track('insight_action_completed', {
      intervention: action.intervention,
      slot: action.slot,
    });
    submitFeedback({ actionId: action.id, status: 'completed' });
  }, [action.id, action.intervention, action.slot, isPending, submitFeedback]);

  const dismiss = useCallback(() => {
    if (isPending) { return; }
    track('insight_action_dismissed', {
      intervention: action.intervention,
      slot: action.slot,
    });
    submitFeedback({ actionId: action.id, status: 'dismissed' });
  }, [action.id, action.intervention, action.slot, isPending, submitFeedback]);

  const rate = useCallback(
    (helpfulness: Helpfulness) => {
      if (isPending) { return; }
      track('insight_action_completed', {
        intervention: action.intervention,
        slot: action.slot,
        helpfulness,
      });
      submitFeedback({ actionId: action.id, status: 'completed', helpfulness });
    },
    [action.id, action.intervention, action.slot, isPending, submitFeedback],
  );

  const isPrimary = action.slot === 'primary';
  const accent = isPrimary ? colors.primary : colors.textSecondary;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: isPrimary ? colors.primaryLight : colors.border,
          borderRadius: borderRadius.xl,
          opacity: isDismissed ? 0.55 : 1,
          ...shadow.xs,
        },
      ]}
    >
      <Text
        style={{
          color: accent,
          fontSize: typography.overline,
          fontWeight: '800',
          letterSpacing: 0.3,
          marginBottom: 8,
        }}
      >
        {SLOT_LABEL[action.slot] ?? ''}
      </Text>

      <View style={styles.headRow}>
        <View
          style={[
            styles.iconBg,
            {
              backgroundColor: isPrimary ? colors.primaryLighter : colors.borderSubtle,
              borderRadius: borderRadius.lg,
            },
          ]}
        >
          <Icon
            name={CATEGORY_ICON[action.category] ?? CATEGORY_ICON.general}
            size={18}
            color={isPrimary ? colors.primary : colors.textSecondary}
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
                marginTop: 3,
                lineHeight: 19,
              }}
            >
              {action.description_fa}
            </Text>
          ) : null}
        </View>

        {action.minutes ? (
          <View
            style={[
              styles.minutesChip,
              { backgroundColor: colors.borderSubtle, borderRadius: borderRadius.full ?? 999 },
            ]}
          >
            <Text
              style={{
                color: colors.textTertiary,
                fontSize: typography.overline,
                fontWeight: '700',
              }}
            >
              {toFa(action.minutes)}′
            </Text>
          </View>
        ) : null}
      </View>

      {/* ── Why this? ─────────────────────────────────────────────────── */}
      <TouchableOpacity
        onPress={() => setShowReason((v) => !v)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel={showReason ? 'بستن دلیل' : 'چرا این پیشنهاد؟'}
        style={styles.whyBtn}
      >
        <Icon
          name={showReason ? 'chevron-up' : 'help-circle-outline'}
          size={15}
          color={colors.primary}
        />
        <Text
          style={{ color: colors.primary, fontSize: typography.caption, fontWeight: '700' }}
        >
          {showReason ? 'بستن' : 'چرا این پیشنهاد؟'}
        </Text>
      </TouchableOpacity>

      {showReason && (
        <View
          style={[
            styles.reasonBox,
            { backgroundColor: colors.background, borderRadius: borderRadius.md },
          ]}
        >
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: typography.bodySmall,
              lineHeight: 20,
            }}
          >
            {action.reason_fa}
          </Text>
        </View>
      )}

      {/* ── Actions / feedback ────────────────────────────────────────── */}
      {isPending ? (
        <View style={{ marginTop: 12, alignItems: 'center' }}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : isDone ? (
        feedback?.helpfulness === null || feedback?.helpfulness === undefined ? (
          <View style={{ marginTop: 12 }}>
            <Text
              style={{
                color: colors.textTertiary,
                fontSize: typography.caption,
                marginBottom: 8,
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
              marginTop: 12,
            }}
          >
            ثبت شد — ممنون، همین به شناخت بهتر کمک می‌کند.
          </Text>
        )
      ) : isDismissed ? (
        <Text
          style={{ color: colors.textTertiary, fontSize: typography.caption, marginTop: 12 }}
        >
          دیگر این پیشنهاد را به‌زودی نمی‌بینی.
        </Text>
      ) : (
        <View style={styles.actionRow}>
          <TouchableOpacity
            onPress={() => {
              if (onOpen) {
                track('insight_action_started', {
                  intervention: action.intervention,
                  slot: action.slot,
                });
                onOpen(action);
              } else {
                complete();
              }
            }}
            style={[
              styles.primaryBtn,
              { backgroundColor: colors.primary, borderRadius: borderRadius.lg },
            ]}
            accessibilityRole="button"
            accessibilityLabel={action.title_fa}
          >
            <Text style={{ color: '#FFFFFF', fontSize: typography.bodySmall, fontWeight: '700' }}>
              {onOpen ? 'شروع' : 'انجام دادم'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={dismiss}
            style={[
              styles.ghostBtn,
              { borderColor: colors.border, borderRadius: borderRadius.lg },
            ]}
            accessibilityRole="button"
            accessibilityLabel="مناسب من نیست"
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
      style={[
        styles.rateBtn,
        { borderColor: colors.border, borderRadius: borderRadius.lg },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Icon name={icon} size={15} color={colors.textSecondary} />
      <Text style={{ color: colors.textSecondary, fontSize: typography.caption }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, padding: 14, overflow: 'hidden' },
  headRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  iconBg: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  minutesChip: { paddingHorizontal: 8, paddingVertical: 3, flexShrink: 0 },
  whyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12 },
  reasonBox: { marginTop: 8, padding: 10 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  primaryBtn: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostBtn: {
    borderWidth: 1,
    paddingVertical: 11,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateRow: { flexDirection: 'row', gap: 6 },
  rateBtn: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
});
