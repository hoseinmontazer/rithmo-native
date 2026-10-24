/**
 * ReproductiveGoalScreen - the optional "what do you want from this app" choice.
 *
 * Reached only from Profile (owner accounts). Never shown automatically, never
 * part of onboarding, never blocking: an existing user who never opens it keeps
 * an unset goal forever. The saved value is shown only from the server's own
 * response, and the goal is sent to no analytics, log, partner or AI path.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@hooks/useTheme';
import { screen } from '@theme/spacing';
import { Card, ErrorState, LoadingState } from '@components/ui';
import { track } from '@analytics';
import {
  useRemoveReproductiveGoal,
  useReproductiveGoal,
  useSetReproductiveGoal,
} from '@hooks/queries/useReproductiveGoal';
import type { ReproductiveGoal } from '@types/reproductiveGoal.types';
import {
  GOAL_ERROR_FA,
  GOAL_ESTIMATE_NOTE_FA,
  GOAL_INTRO_FA,
  GOAL_NO_CHANGE_FA,
  GOAL_OPTIONS,
  GOAL_REMOVE_LABEL_FA,
  classifyGoalError,
  goalNoteFor,
  goalState,
  type GoalErrorKind,
} from './reproductiveGoalLogic';

export default function ReproductiveGoalScreen() {
  const { colors, spacing, borderRadius, typography } = useTheme();
  const { data, isLoading, isError, error, refetch } = useReproductiveGoal();
  const setGoal = useSetReproductiveGoal();
  const removeGoal = useRemoveReproductiveGoal();
  const [failure, setFailure] = useState<GoalErrorKind | null>(null);
  const [pending, setPending] = useState<ReproductiveGoal | 'remove' | null>(null);

  // One "viewed" per mount, however many times the query refetches.
  const viewed = useRef(false);
  useEffect(() => {
    if (!viewed.current) {
      viewed.current = true;
      track('goal_prompt_viewed');
    }
  }, []);

  const busy = pending !== null;
  const saved = data?.goal ?? null;
  const state = goalState(data);

  const choose = useCallback(
    async (goal: ReproductiveGoal) => {
      if (busy || goal === saved) { return; }
      setFailure(null);
      setPending(goal);
      try {
        await setGoal.mutateAsync(goal);
        track('goal_set'); // only after the server confirmed
      } catch (e) {
        setFailure(classifyGoalError(e));
      } finally {
        setPending(null);
      }
    },
    [busy, saved, setGoal],
  );

  const remove = useCallback(async () => {
    if (busy || saved == null) { return; }
    setFailure(null);
    setPending('remove');
    try {
      await removeGoal.mutateAsync();
      track('goal_removed');
    } catch (e) {
      setFailure(classifyGoalError(e));
    } finally {
      setPending(null);
    }
  }, [busy, saved, removeGoal]);

  if (isLoading) { return <LoadingState fullScreen />; }

  // 403 = this account type has no goal. Explain once; no retry, no loop.
  const loadKind = isError ? classifyGoalError(error) : null;
  if (loadKind === 'unsupported') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, padding: screen.gutter, paddingTop: screen.top }}>
        <Text style={{ color: colors.textSecondary, fontSize: typography.bodySmall, lineHeight: 22 }}>
          {GOAL_ERROR_FA.unsupported}
        </Text>
      </View>
    );
  }
  if (isError) {
    return <ErrorState error={error} onRetry={refetch} fullScreen />;
  }

  const note = goalNoteFor(saved);

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingHorizontal: screen.gutter,
        paddingTop: screen.top,
        paddingBottom: screen.bottomTab,
      }}
      showsVerticalScrollIndicator={false}
      testID="reproductive-goal-screen"
    >
      <Text style={{ color: colors.textSecondary, fontSize: typography.bodySmall, lineHeight: 22 }}>
        {GOAL_INTRO_FA}
      </Text>

      <Card style={{ marginTop: spacing[4], paddingHorizontal: spacing[4] }}>
        {GOAL_OPTIONS.map((o, i) => {
          const active = saved === o.value;
          const isPending = pending === o.value;
          return (
            <TouchableOpacity
              key={o.value}
              onPress={() => choose(o.value)}
              disabled={busy}
              activeOpacity={0.72}
              accessibilityRole="radio"
              accessibilityState={{ selected: active, disabled: busy, busy: isPending }}
              accessibilityLabel={`${o.label}. ${o.hint}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                minHeight: 56,
                paddingVertical: spacing[3],
                borderBottomWidth: i === GOAL_OPTIONS.length - 1 ? 0 : 1,
                borderBottomColor: colors.border,
                gap: spacing[3],
                opacity: busy && !isPending ? 0.6 : 1,
              }}
            >
              <Icon name={o.icon} size={22} color={active ? colors.primary : colors.textTertiary} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textPrimary, fontSize: typography.base, fontWeight: '600' }}>
                  {o.label}
                </Text>
                <Text style={{ color: colors.textTertiary, fontSize: typography.xs, marginTop: 2, lineHeight: 17 }}>
                  {o.hint}
                </Text>
              </View>
              <Icon
                name={active ? 'radiobox-marked' : 'radiobox-blank'}
                size={22}
                color={active ? colors.primary : colors.border}
              />
            </TouchableOpacity>
          );
        })}
      </Card>

      {failure ? (
        <Text
          accessibilityRole="alert"
          style={{ color: colors.error, fontSize: typography.bodySmall, lineHeight: 21, marginTop: spacing[3] }}
        >
          {GOAL_ERROR_FA[failure]}
        </Text>
      ) : null}

      {state !== 'unset' ? (
        <TouchableOpacity
          onPress={remove}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel={GOAL_REMOVE_LABEL_FA}
          style={{ minHeight: 48, justifyContent: 'center', marginTop: spacing[2] }}
        >
          <Text style={{ color: colors.primary, fontSize: typography.bodySmall, fontWeight: '600' }}>
            {pending === 'remove' ? 'در حال برداشتن…' : GOAL_REMOVE_LABEL_FA}
          </Text>
        </TouchableOpacity>
      ) : null}

      <View
        style={{
          marginTop: spacing[4],
          padding: spacing[4],
          borderRadius: borderRadius.md,
          backgroundColor: colors.surfaceSecondary,
          gap: spacing[2],
        }}
      >
        <Text style={{ color: colors.textSecondary, fontSize: typography.caption, lineHeight: 20 }}>
          {GOAL_NO_CHANGE_FA}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: typography.caption, lineHeight: 20 }}>
          {GOAL_ESTIMATE_NOTE_FA}
        </Text>
        {note ? (
          <Text style={{ color: colors.textSecondary, fontSize: typography.caption, lineHeight: 20 }}>{note}</Text>
        ) : null}
      </View>
    </ScrollView>
  );
}
