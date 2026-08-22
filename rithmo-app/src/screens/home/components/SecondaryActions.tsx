/**
 * SecondaryActions — everything that is not the headline.
 *
 * These were previously full-width cards identical to the primary one, each
 * with its own «چرا این پیشنهاد؟» and its own pair of buttons. Three such
 * cards put six CTAs on one screen and destroyed the hierarchy: nothing was
 * the main thing because everything looked like the main thing.
 *
 * Here they are collapsed rows. Tapping one expands its reason and its
 * controls, so the affordances are still reachable — but only one action is
 * asking for a decision at a time.
 */

import React, { memo, useCallback, useState } from 'react';
import { LayoutAnimation, Platform, StyleSheet, Text, TouchableOpacity, UIManager, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@hooks/useTheme';
import { track } from '@analytics';
import { useSubmitActionFeedback } from '@hooks/queries/useIntelligence';
import type { GuidedAction } from '@types/intelligence.types';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const SLOT_LABEL: Record<string, string> = {
  supporting: 'اگر توان داشتی',
  reflection: 'یک لحظه با خودت',
};

interface RowProps {
  action: GuidedAction;
  expanded: boolean;
  onToggle: () => void;
  onOpen?: (action: GuidedAction) => void;
}

const ActionRow = memo(function ActionRow({ action, expanded, onToggle, onOpen }: RowProps) {
  const { colors, typography, spacing, borderRadius } = useTheme();
  const { mutate: submitFeedback, isPending } = useSubmitActionFeedback();

  const done = action.feedback?.status === 'completed';
  const dismissed = action.feedback?.status === 'dismissed';

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

  const start = useCallback(() => {
    if (onOpen) {
      track('insight_action_started', {
        intervention: action.intervention,
        slot: action.slot,
      });
      onOpen(action);
    } else {
      complete();
    }
  }, [action, onOpen, complete]);

  return (
    <View>
      <TouchableOpacity
        onPress={onToggle}
        activeOpacity={0.7}
        style={[styles.row, { paddingVertical: spacing[3] }]}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${SLOT_LABEL[action.slot] ?? ''}: ${action.title_fa}`}
      >
        <View style={styles.rowLeft}>
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: typography.bodySmall,
              fontWeight: '600',
              textDecorationLine: done ? 'line-through' : 'none',
            }}
            numberOfLines={1}
          >
            {action.title_fa}
          </Text>
          {dismissed ? (
            <Text style={{ color: colors.textTertiary, fontSize: typography.overline }}>
              رد شد
            </Text>
          ) : null}
        </View>
        <Icon
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textTertiary}
        />
      </TouchableOpacity>

      {expanded ? (
        <View style={{ paddingBottom: spacing[3] }}>
          {action.description_fa ? (
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: typography.caption,
                lineHeight: 19,
              }}
            >
              {action.description_fa}
            </Text>
          ) : null}
          {action.reason_fa ? (
            <Text
              style={{
                color: colors.textTertiary,
                fontSize: typography.caption,
                lineHeight: 18,
                marginTop: spacing[2],
              }}
            >
              {action.reason_fa}
            </Text>
          ) : null}

          {!done && !dismissed ? (
            <View style={[styles.controls, { marginTop: spacing[3] }]}>
              <TouchableOpacity
                onPress={start}
                style={[
                  styles.smallBtn,
                  { backgroundColor: colors.primaryLighter, borderRadius: borderRadius.md },
                ]}
                accessibilityRole="button"
                accessibilityLabel={onOpen ? `شروع: ${action.title_fa}` : `انجام دادم: ${action.title_fa}`}
              >
                <Text
                  style={{ color: colors.primary, fontSize: typography.caption, fontWeight: '700' }}
                >
                  {onOpen ? 'شروع' : 'انجام دادم'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={dismiss}
                style={[
                  styles.smallBtn,
                  { borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`مناسب من نیست: ${action.title_fa}`}
              >
                <Text style={{ color: colors.textSecondary, fontSize: typography.caption }}>
                  مناسب من نیست
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
});

interface Props {
  actions: GuidedAction[];
  onOpenAction?: (action: GuidedAction) => ((action: GuidedAction) => void) | undefined;
}

export const SecondaryActions = memo(function SecondaryActions({ actions, onOpenAction }: Props) {
  const { colors, spacing, borderRadius } = useTheme();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const toggle = useCallback((id: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    // Only one open at a time — the point of this section is that it does
    // not compete with the story above it.
    setExpandedId((current) => (current === id ? null : id));
  }, []);

  if (actions.length === 0) { return null; }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.borderSubtle,
          borderRadius: borderRadius.lg,
          paddingHorizontal: spacing[4],
        },
      ]}
    >
      {actions.map((action, i) => (
        <View
          key={action.id}
          style={
            i < actions.length - 1
              ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.borderSubtle }
              : undefined
          }
        >
          <ActionRow
            action={action}
            expanded={expandedId === action.id}
            onToggle={() => toggle(action.id)}
            onOpen={onOpenAction?.(action)}
          />
        </View>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 48 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  controls: { flexDirection: 'row', gap: 8 },
  smallBtn: { minHeight: 40, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
});
