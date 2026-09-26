/**
 * AdaptiveCheckInScreen — Today 2.1's one-question-at-a-time adaptive
 * check-in (Phase D).
 *
 * HARD ARCHITECTURAL BOUNDARY: this screen never decides what the next
 * question is, never runs branching logic, and never constructs a
 * question locally. It only (1) asks the server for the current
 * question via GET .../checkin-session/today/, (2) renders exactly that
 * question, (3) submits the answer via POST .../checkin-session/answer/,
 * and (4) renders whatever question (or completed state) the server
 * returns next. All "if mood is bad, ask about pain"-style logic lives
 * in intelligence.domain.checkin_engine (Phase A) — see
 * docs/features/today-2.1-design.md.
 *
 * The one client-side decision this screen DOES make is purely a
 * rendering one — which input control paints a given question id (a
 * single-select pill list, the symptom chips, the context tags, a sleep
 * stepper, or free text). See checkinQuestionRenderers.ts for why that
 * mapping exists and why it is NOT a form of duplicated domain logic.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@hooks/useTheme';
import { screen } from '@theme/spacing';
import { Button, ErrorState, LoadingState, StepperInput } from '@components/ui';
import { extractErrorMessage } from '@utils/errorHandler';
import { toFa } from '@utils/persian';
import {
  isStaleQuestionError,
  useCheckInSessionToday,
  useReconcileCheckInSession,
  useSubmitCheckInAnswer,
} from '@hooks/queries/useCheckInSession';
import { renderModeForQuestion } from './checkinQuestionRenderers';
import { SYMPTOMS } from '@constants/symptoms';
import { CONTEXT_TAGS } from '@constants/contextTags';
import type { CheckInQuestion, CheckInQuestionOption } from '@types/checkinSession.types';

export default function AdaptiveCheckInScreen() {
  const navigation = useNavigation();
  const { colors, spacing, typography, borderRadius } = useTheme();

  const { data: session, isLoading, isError, error, refetch } = useCheckInSessionToday();
  const submitAnswer = useSubmitCheckInAnswer();
  const reconcile = useReconcileCheckInSession();

  const currentQuestionId = session?.question?.id ?? null;

  // Local draft state for the CURRENT question only. Reset every time the
  // server's current question id changes — i.e. after a successful
  // transition. This is transient UI state, never a second copy of
  // server truth (design §14).
  const [singleSelection, setSingleSelection] = useState<string | null>(null);
  const [multiSelection, setMultiSelection] = useState<string[]>([]);
  const [sleepHours, setSleepHours] = useState(7);
  const [freeText, setFreeText] = useState('');
  const [contextNote, setContextNote] = useState('');

  useEffect(() => {
    setSingleSelection(null);
    setMultiSelection([]);
    setSleepHours(7);
    setFreeText('');
    setContextNote('');
  }, [currentQuestionId]);

  const goBack = useCallback(() => {
    // Answers already persisted progressively on the server — leaving
    // does not lose or abandon anything (design §11/§13). No confirm
    // dialog, no invented "abandon" action.
    navigation.goBack();
  }, [navigation]);

  const submitting = submitAnswer.isPending;

  const handleErrorAfterSubmit = useCallback(
    (err: unknown) => {
      if (isStaleQuestionError(err)) {
        // The server's current question no longer matches what this
        // screen showed — reconcile silently rather than trap the user
        // in a stale-question error loop (design §17/task §12).
        reconcile();
      }
    },
    [reconcile],
  );

  const submitOptionAnswer = useCallback(
    (question: CheckInQuestion, optionIds: string[], rawText?: string) => {
      if (submitting) { return; } // duplicate-tap guard
      submitAnswer.mutate(
        { question_id: question.id, option_ids: optionIds, raw_text: rawText },
        { onError: handleErrorAfterSubmit },
      );
    },
    [submitting, submitAnswer, handleErrorAfterSubmit],
  );

  const submitSkip = useCallback(
    (question: CheckInQuestion) => {
      if (submitting) { return; }
      submitAnswer.mutate(
        { question_id: question.id, skip: true },
        { onError: handleErrorAfterSubmit },
      );
    },
    [submitting, submitAnswer, handleErrorAfterSubmit],
  );

  const toggleMultiSelection = useCallback((code: string) => {
    setMultiSelection((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  }, []);

  // ── Initial loading ──────────────────────────────────────────────────
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
        <LoadingState message="در حال آماده‌سازی..." fullScreen />
      </SafeAreaView>
    );
  }

  // ── Initial load failure ─────────────────────────────────────────────
  if (isError || !session) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
        <ErrorState error={error} onRetry={refetch} fullScreen />
      </SafeAreaView>
    );
  }

  // ── Completed ────────────────────────────────────────────────────────
  if (session.completed || !session.question) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
        <View style={styles.completedWrap}>
          <View style={[styles.completedIconWrap, { backgroundColor: colors.primary + '18' }]}>
            <Icon name="check" size={36} color={colors.primary} />
          </View>
          <Text style={[styles.completedTitle, { color: colors.textPrimary, fontSize: typography.xl, marginTop: spacing[3] }]}>
            ثبت شد
          </Text>
          <Text style={[styles.completedMessage, { color: colors.textSecondary, fontSize: typography.bodySmall, marginTop: spacing[2] }]}>
            مرسی که امروزت رو ثبت کردی.
          </Text>
          <Button
            label="برگشت به امروز"
            onPress={goBack}
            variant="primary"
            size="lg"
            fullWidth
            style={{ marginTop: spacing[6] }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const question = session.question;
  const renderMode = renderModeForQuestion(question.id);
  const submitError = submitAnswer.isError && !isStaleQuestionError(submitAnswer.error) ? submitAnswer.error : null;

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: screen.gutter,
            paddingTop: screen.top,
            paddingBottom: screen.bottom,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Header: honest question count + close ─────────────────
              Deliberately NOT a progress bar — that would imply a fixed
              six-question questionnaire (design §7 of the task brief),
              which is exactly the false impression this UI must avoid. */}
          <View style={[styles.header, { marginBottom: spacing[6] }]}>
            <Text style={[styles.questionNumber, { color: colors.textTertiary, fontSize: typography.xs }]}>
              سؤال {toFa(session.question_number)}
            </Text>
            <TouchableOpacity
              onPress={goBack}
              style={[
                styles.closeBtn,
                { backgroundColor: colors.surfaceSecondary, borderColor: colors.border, borderRadius: borderRadius.md },
              ]}
              accessibilityRole="button"
              accessibilityLabel="بستن"
            >
              <Icon name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.questionText, { color: colors.textPrimary, fontSize: typography['2xl'] }]}>
            {question.text_fa}
          </Text>

          <View style={{ marginTop: spacing[6] }}>
            {renderMode === 'single_select' && (
              <SingleSelectOptions
                options={question.options}
                disabled={submitting}
                onSelect={(id) => {
                  setSingleSelection(id);
                  submitOptionAnswer(question, [id]);
                }}
              />
            )}

            {renderMode === 'multi_select_symptom' && (
              <>
                <View style={[styles.chipWrap, { gap: spacing[2] }]}>
                  {SYMPTOMS.map((sym) => {
                    const active = multiSelection.includes(sym.code);
                    return (
                      <TouchableOpacity
                        key={sym.code}
                        onPress={() => toggleMultiSelection(sym.code)}
                        disabled={submitting}
                        activeOpacity={0.7}
                        style={[
                          styles.chip,
                          {
                            borderRadius: borderRadius.pill,
                            backgroundColor: active ? colors.primary + '18' : colors.surfaceSecondary,
                            borderColor: active ? colors.primary : colors.border,
                            borderWidth: active ? 1.5 : 1,
                            opacity: submitting ? 0.5 : 1,
                          },
                        ]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active, disabled: submitting }}
                        accessibilityLabel={sym.label}
                      >
                        <Text
                          style={{
                            color: active ? colors.primary : colors.textSecondary,
                            fontSize: typography.xs,
                            fontWeight: active ? '700' : '500',
                          }}
                        >
                          {sym.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Button
                  label="ثبت"
                  onPress={() => submitOptionAnswer(question, multiSelection)}
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={submitting}
                  disabled={submitting || multiSelection.length === 0}
                  style={{ marginTop: spacing[5] }}
                />
              </>
            )}

            {renderMode === 'single_select_context' && (
              <>
                <View style={[styles.chipWrap, { gap: spacing[2] }]}>
                  {CONTEXT_TAGS.map((tag) => {
                    const active = singleSelection === tag.code;
                    return (
                      <TouchableOpacity
                        key={tag.code}
                        onPress={() => setSingleSelection(tag.code)}
                        disabled={submitting}
                        activeOpacity={0.7}
                        style={[
                          styles.chip,
                          {
                            borderRadius: borderRadius.pill,
                            backgroundColor: active ? colors.primary + '18' : colors.surfaceSecondary,
                            borderColor: active ? colors.primary : colors.border,
                            borderWidth: active ? 1.5 : 1,
                            opacity: submitting ? 0.5 : 1,
                          },
                        ]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active, disabled: submitting }}
                        accessibilityLabel={tag.label}
                      >
                        <Text
                          style={{
                            color: active ? colors.primary : colors.textSecondary,
                            fontSize: typography.xs,
                            fontWeight: active ? '700' : '500',
                          }}
                        >
                          {tag.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TextInput
                  style={[
                    styles.textArea,
                    {
                      backgroundColor: colors.surfaceSecondary,
                      borderColor: colors.border,
                      borderRadius: borderRadius.md,
                      color: colors.textPrimary,
                      fontSize: typography.sm,
                      marginTop: spacing[3],
                    },
                  ]}
                  placeholder="توضیح کوتاه (اختیاری)"
                  placeholderTextColor={colors.textTertiary}
                  value={contextNote}
                  onChangeText={setContextNote}
                  editable={!submitting}
                  multiline
                  maxLength={500}
                />
                <Button
                  label="ثبت"
                  onPress={() => singleSelection && submitOptionAnswer(question, [singleSelection], contextNote || undefined)}
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={submitting}
                  disabled={submitting || !singleSelection}
                  style={{ marginTop: spacing[4] }}
                />
              </>
            )}

            {renderMode === 'numeric_sleep' && (
              <>
                <StepperInput
                  label="ساعت خواب"
                  value={sleepHours}
                  min={0}
                  max={16}
                  unit="ساعت"
                  onChange={setSleepHours}
                />
                <Button
                  label="ثبت"
                  onPress={() => submitOptionAnswer(question, [String(sleepHours)])}
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={submitting}
                  disabled={submitting}
                  style={{ marginTop: spacing[5] }}
                />
              </>
            )}

            {renderMode === 'free_text' && (
              <>
                <TextInput
                  style={[
                    styles.textArea,
                    {
                      backgroundColor: colors.surfaceSecondary,
                      borderColor: colors.border,
                      borderRadius: borderRadius.md,
                      color: colors.textPrimary,
                      fontSize: typography.sm,
                    },
                  ]}
                  placeholder="چیز دیگه‌ای هست که دوست داری ثبت کنی؟"
                  placeholderTextColor={colors.textTertiary}
                  value={freeText}
                  onChangeText={setFreeText}
                  editable={!submitting}
                  multiline
                  maxLength={500}
                />
                <Button
                  label="ثبت"
                  onPress={() => submitOptionAnswer(question, [freeText])}
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={submitting}
                  disabled={submitting || freeText.trim().length === 0}
                  style={{ marginTop: spacing[4] }}
                />
              </>
            )}
          </View>

          {question.can_skip && (
            <TouchableOpacity
              onPress={() => submitSkip(question)}
              disabled={submitting}
              style={[styles.skipBtn, { marginTop: spacing[6], opacity: submitting ? 0.5 : 1 }]}
              accessibilityRole="button"
              accessibilityLabel="فعلاً رد می‌کنم"
            >
              <Text style={{ color: colors.textTertiary, fontSize: typography.sm, fontWeight: '600' }}>
                فعلاً رد می‌کنم
              </Text>
            </TouchableOpacity>
          )}

          {submitError && (
            <Text
              style={{
                color: colors.error, fontSize: typography.xs, textAlign: 'center',
                marginTop: spacing[3],
              }}
            >
              {extractErrorMessage(submitError)}
            </Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** The generic renderer for the 9 of 13 question ids whose real options
 * the server already sends — see checkinQuestionRenderers.ts. Tapping an
 * option submits immediately; there is no separate "confirm" step for a
 * single choice. */
function SingleSelectOptions({
  options,
  disabled,
  onSelect,
}: {
  options: CheckInQuestionOption[];
  disabled: boolean;
  onSelect: (id: string) => void;
}) {
  const { colors, spacing, typography, borderRadius } = useTheme();
  return (
    <View style={{ gap: spacing[3] }}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt.id}
          onPress={() => onSelect(opt.id)}
          disabled={disabled}
          activeOpacity={0.75}
          style={[
            styles.optionRow,
            {
              backgroundColor: colors.surfaceSecondary,
              borderColor: colors.border,
              borderRadius: borderRadius.lg,
              opacity: disabled ? 0.5 : 1,
              minHeight: 48,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={opt.label_fa}
          accessibilityState={{ disabled }}
        >
          <Text style={{ color: colors.textPrimary, fontSize: typography.base, fontWeight: '600' }}>
            {opt.label_fa}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  questionNumber: { fontWeight: '600' },
  closeBtn: {
    width: 36,
    height: 36,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionText: { fontWeight: '800', lineHeight: 34 },
  optionRow: {
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { paddingHorizontal: 14, paddingVertical: 8 },
  textArea: { padding: 12, minHeight: 60, textAlignVertical: 'top' },
  skipBtn: { alignSelf: 'center', padding: 8 },
  completedWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  completedIconWrap: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  completedTitle: { fontWeight: '800' },
  completedMessage: { textAlign: 'center' },
});
