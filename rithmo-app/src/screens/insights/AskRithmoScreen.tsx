/**
 * AskRithmoScreen — «از داده‌های من بپرس» (P0.7)
 *
 * Free for every authenticated user (docs/DECISIONS.md DEC-005 —
 * Progressive Premium Value): a calm question -> answer interaction over
 * the user's own tracked cycle/symptom data and the curated knowledge
 * layer — deliberately NOT a chat: no message bubbles, no history, no
 * floating assistant. Every field rendered here (answer_fa/
 * observations_fa/suggestion_fa/data_sufficiency/disclaimer_fa) is
 * exactly what the backend computed and validated (see
 * ai_gateway/services.py::get_ask_rithmo_answer) — this screen formats
 * them, it never re-derives or restates them more strongly.
 *
 * "unsupported" and "insufficient data" both arrive as a normal,
 * `available: true` answer with an honest answer_fa — they render in the
 * same answer card as a real one, never as an error state. Only a real
 * infrastructure failure (`available: false`, or a network/HTTP error)
 * uses the error/unavailable copy below.
 *
 * `premium_required: true` (only for the four historical/comparative
 * intents) is also a normal answer, not a paywall: `answer_fa` already
 * explains why in context, so the card renders exactly like any other
 * answer, with a compact upgrade CTA appended — never a screen swap.
 */
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@hooks/useTheme';
import { screen } from '@theme/spacing';
import { Card, Badge, ActionChip, ErrorState } from '@components/ui';
import { PremiumGate } from '@components/PremiumGate';
import { useAskRithmo } from '@hooks/queries/useAskRithmo';
import type { AskRithmoDataSufficiency } from '@types/askRithmo.types';

const MAX_QUESTION_LENGTH = 300;

const SUGGESTED_PROMPTS = [
  'چرخه‌هام معمولاً چند روزه‌ان؟',
  'چه الگویی در علائمم پیدا کردی؟',
  'این ماه چه چیزی تغییر کرده؟',
  'دردم در این مدت چه تغییری کرده؟',
];

const DATA_SUFFICIENCY_LABELS_FA: Record<string, string> = {
  low: 'اطمینان کم', medium: 'اطمینان متوسط', high: 'اطمینان بالا',
  insufficient: 'داده کافی نیست', emerging: 'نشانه‌ی اولیه',
  repeated: 'الگوی تکرارشونده', established: 'الگوی تثبیت‌شده',
};

function dataSufficiencyLabel(value: AskRithmoDataSufficiency): string | null {
  if (!value) { return null; }
  return DATA_SUFFICIENCY_LABELS_FA[value] ?? null;
}

export default function AskRithmoScreen() {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const [question, setQuestion] = useState('');
  const [askedQuestion, setAskedQuestion] = useState<string | null>(null);
  const { ask, isLoading, isError, error, response, reset } = useAskRithmo();

  const submit = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) { return; }
      setAskedQuestion(trimmed);
      setQuestion('');
      ask(trimmed);
    },
    [ask, isLoading],
  );

  const handleSend = useCallback(() => submit(question), [submit, question]);

  const handleChip = useCallback(
    (prompt: string) => {
      reset();
      submit(prompt);
    },
    [reset, submit],
  );

  const answer = response?.available ? response : null;
  const unavailable = response != null && !response.available;
  const sufficiencyLabel = answer ? dataSufficiencyLabel(answer.data_sufficiency) : null;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['left', 'right', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex1} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: screen.gutter,
            paddingTop: screen.top,
            paddingBottom: spacing[4],
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.title, { color: colors.textPrimary, fontSize: typography.xl }]}>
            از داده‌های من بپرس
          </Text>
          <Text
            style={{
              color: colors.textSecondary, fontSize: typography.sm,
              marginTop: 4, marginBottom: spacing[4], lineHeight: 20,
            }}
          >
            درباره چرخه، علائم و الگوهای ثبت‌شده‌ات از من بپرس.
          </Text>

          <View style={[styles.chipRow, { marginBottom: spacing[4] }]}>
            {SUGGESTED_PROMPTS.map((prompt) => (
              <ActionChip
                key={prompt}
                label={prompt}
                onPress={() => handleChip(prompt)}
                style={styles.chip}
              />
            ))}
          </View>

          {askedQuestion && (
            <Text
              style={{
                color: colors.textTertiary, fontSize: typography.caption,
                marginBottom: spacing[2], textAlign: 'right',
              }}
            >
              {askedQuestion}
            </Text>
          )}

          {isLoading && (
            <Card elevated={false} rounded="2xl" style={{ padding: spacing[4], marginBottom: spacing[4] }}>
              <Text style={{ color: colors.textSecondary, fontSize: typography.bodySmall }}>
                در حال بررسی داده‌هایت…
              </Text>
            </Card>
          )}

          {isError && !isLoading && (
            <ErrorState error={error} onRetry={() => askedQuestion && submit(askedQuestion)} />
          )}

          {unavailable && !isLoading && (
            <Card elevated={false} rounded="2xl" style={{ padding: spacing[4], marginBottom: spacing[4] }}>
              <Text style={{ color: colors.textSecondary, fontSize: typography.bodySmall, lineHeight: 20 }}>
                نتوانستم الان پاسخی بدهم. کمی بعد دوباره تلاش کن.
              </Text>
            </Card>
          )}

          {answer && !isLoading && (
            <Card elevated={false} rounded="2xl" style={{ padding: spacing[4], marginBottom: spacing[4] }}>
              {sufficiencyLabel && (
                <View style={{ marginBottom: spacing[2], alignItems: 'flex-start' }}>
                  <Badge label={sufficiencyLabel} variant="info" />
                </View>
              )}

              <Text
                style={{
                  color: colors.textPrimary, fontSize: typography.bodySmall,
                  lineHeight: 22, fontWeight: '600',
                }}
              >
                {answer.answer_fa}
              </Text>

              {answer.observations_fa.map((obs, i) => (
                <Text
                  key={i}
                  style={{
                    color: colors.textSecondary, fontSize: typography.caption,
                    lineHeight: 20, marginTop: spacing[1],
                  }}
                >
                  {`· ${obs}`}
                </Text>
              ))}

              {answer.suggestion_fa ? (
                <Text
                  style={{
                    color: colors.textPrimary, fontSize: typography.bodySmall,
                    fontWeight: '600', marginTop: spacing[3],
                  }}
                >
                  {answer.suggestion_fa}
                </Text>
              ) : null}

              {answer.disclaimer_fa ? (
                <Text
                  style={{
                    color: colors.textTertiary, fontSize: typography.micro,
                    lineHeight: 16, marginTop: spacing[3],
                  }}
                >
                  {answer.disclaimer_fa}
                </Text>
              ) : null}

              {/* answer_fa already explains why this needs Premium (see
                  ai_gateway/ask_rithmo_context.py's _PREMIUM_INTENT_LABELS_FA) —
                  this is just the actionable next step, not a restated
                  explanation. */}
              {answer.premium_required ? (
                <View style={{ marginTop: spacing[3] }}>
                  <PremiumGate overlay featureName="تحلیل عمیق‌تر" />
                </View>
              ) : null}
            </Card>
          )}
        </ScrollView>

        <View
          style={[
            styles.inputBar,
            {
              borderTopColor: colors.border,
              backgroundColor: colors.background,
              paddingHorizontal: screen.gutter,
              paddingVertical: spacing[3],
            },
          ]}
        >
          <TextInput
            value={question}
            onChangeText={setQuestion}
            placeholder="سؤال خودت را بپرس…"
            placeholderTextColor={colors.textTertiary}
            style={[
              styles.textInput,
              {
                color: colors.textPrimary,
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: borderRadius.lg,
              },
            ]}
            multiline
            maxLength={MAX_QUESTION_LENGTH}
            editable={!isLoading}
            accessibilityLabel="سؤال خودت را بپرس"
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={isLoading || !question.trim()}
            accessibilityRole="button"
            accessibilityLabel="ارسال"
            style={[
              styles.sendBtn,
              {
                backgroundColor: isLoading || !question.trim() ? colors.borderSubtle : colors.primary,
                borderRadius: borderRadius.lg,
              },
            ]}
          >
            <Text style={{ color: colors.textOnPrimary, fontWeight: '700', fontSize: typography.bodySmall }}>
              ارسال
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex1: { flex: 1 },
  title: { fontWeight: '800' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {},
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxHeight: 100,
  },
  sendBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
