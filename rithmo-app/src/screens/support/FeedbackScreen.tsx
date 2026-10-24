/**
 * FeedbackScreen - optional in-app product feedback (no Premium required).
 *
 * Topic (required) + text (optional, <= 1000) + a SEPARATE contact permission
 * that is unchecked by default. Success is shown only after the server answers
 * 2xx; every failure keeps what the user typed. The user's reproductive goal is
 * not read or sent, and neither the topic nor the text goes to analytics.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@hooks/useTheme';
import { screen } from '@theme/spacing';
import { Button } from '@components/ui';
import { track } from '@analytics';
import { useSubmitFeedback } from '@hooks/queries/useSupport';
import { toFa } from '@utils/persian';
import {
  FEEDBACK_CONTACT_HINT_FA,
  FEEDBACK_CONTACT_LABEL_FA,
  FEEDBACK_ERROR_FA,
  FEEDBACK_INTRO_FA,
  FEEDBACK_PRIVACY_FA,
  FEEDBACK_TEXT_MAX,
  FEEDBACK_TOPICS,
  INITIAL_FEEDBACK,
  classifyFeedbackError,
  successMessage,
  validateFeedback,
  type FeedbackErrorKind,
  type FeedbackFormValues,
} from './feedbackLogic';

export default function FeedbackScreen() {
  const { colors, spacing, borderRadius, typography } = useTheme();
  const navigation = useNavigation<any>();
  const submit = useSubmitFeedback();

  const [form, setForm] = useState<FeedbackFormValues>(INITIAL_FEEDBACK);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [failure, setFailure] = useState<FeedbackErrorKind | null>(null);
  const [done, setDone] = useState<string | null>(null);
  // Synchronous guard: state updates are async, so two quick taps could both
  // pass a `submit.isPending` check before the first renders.
  const inFlight = useRef(false);

  const opened = useRef(false);
  useEffect(() => {
    if (!opened.current) {
      opened.current = true;
      track('feedback_opened');
    }
  }, []);

  const onSend = useCallback(async () => {
    if (inFlight.current) { return; }
    const v = validateFeedback(form);
    if (!v.ok) {
      setFieldError(v.message);
      return;
    }
    setFieldError(null);
    setFailure(null);
    inFlight.current = true;
    try {
      const res = await submit.mutateAsync(v.request);
      track('feedback_submitted'); // only after a confirmed 2xx
      setDone(successMessage(res));
    } catch (e) {
      setFailure(classifyFeedbackError(e));
    } finally {
      inFlight.current = false;
    }
  }, [form, submit]);

  const sending = submit.isPending;

  if (done) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, padding: screen.gutter, paddingTop: screen.top }}>
        <View style={{ alignItems: 'center', gap: spacing[3], marginTop: spacing[8] }}>
          <Icon name="check-circle-outline" size={44} color={colors.success} />
          <Text
            accessibilityRole="alert"
            style={{ color: colors.textPrimary, fontSize: typography.body, fontWeight: '700', textAlign: 'center' }}
          >
            {done}
          </Text>
        </View>
        <View style={{ marginTop: spacing[6] }}>
          <Button label="بازگشت" onPress={() => navigation.goBack()} fullWidth />
        </View>
      </View>
    );
  }

  const left = FEEDBACK_TEXT_MAX - form.text.length;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: screen.gutter,
          paddingTop: screen.top,
          paddingBottom: screen.bottomTab,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        testID="feedback-screen"
      >
        <Text style={{ color: colors.textSecondary, fontSize: typography.bodySmall, lineHeight: 22 }}>
          {FEEDBACK_INTRO_FA}
        </Text>

        <Text style={{ color: colors.textPrimary, fontSize: typography.base, fontWeight: '700', marginTop: spacing[5] }}>
          موضوع
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], marginTop: spacing[2] }}>
          {FEEDBACK_TOPICS.map((t) => {
            const active = form.topic === t.value;
            return (
              <TouchableOpacity
                key={t.value}
                onPress={() => { setForm((f) => ({ ...f, topic: t.value })); setFieldError(null); }}
                disabled={sending}
                accessibilityRole="radio"
                accessibilityState={{ selected: active, disabled: sending }}
                accessibilityLabel={t.label}
                style={{
                  minHeight: 44,
                  paddingHorizontal: spacing[4],
                  justifyContent: 'center',
                  borderRadius: borderRadius.pill,
                  borderWidth: 1,
                  borderColor: active ? colors.primary : colors.border,
                  backgroundColor: active ? colors.primary : colors.surface,
                }}
              >
                <Text
                  style={{
                    color: active ? colors.textOnPrimary : colors.textPrimary,
                    fontSize: typography.bodySmall,
                    fontWeight: '600',
                  }}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={{ color: colors.textPrimary, fontSize: typography.base, fontWeight: '700', marginTop: spacing[5] }}>
          پیام (اختیاری)
        </Text>
        <TextInput
          value={form.text}
          onChangeText={(text) => setForm((f) => ({ ...f, text }))}
          editable={!sending}
          multiline
          maxLength={FEEDBACK_TEXT_MAX}
          textAlign="right"
          textAlignVertical="top"
          accessibilityLabel="پیام"
          placeholder="هر چه دوست داری بنویس"
          placeholderTextColor={colors.textTertiary}
          style={{
            marginTop: spacing[2],
            minHeight: 120,
            padding: spacing[3],
            borderRadius: borderRadius.md,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            color: colors.textPrimary,
            fontSize: typography.body,
          }}
        />
        <Text
          style={{ color: left < 50 ? colors.warning : colors.textTertiary, fontSize: typography.caption, marginTop: 4 }}
          accessibilityLabel={`${toFa(left)} نویسهٔ باقی‌مانده`}
        >
          {toFa(form.text.length)} / {toFa(FEEDBACK_TEXT_MAX)}
        </Text>

        <TouchableOpacity
          onPress={() => setForm((f) => ({ ...f, contactOk: !f.contactOk }))}
          disabled={sending}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: form.contactOk, disabled: sending }}
          accessibilityLabel={FEEDBACK_CONTACT_LABEL_FA}
          style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3], minHeight: 48, marginTop: spacing[4] }}
        >
          <Icon
            name={form.contactOk ? 'checkbox-marked' : 'checkbox-blank-outline'}
            size={24}
            color={form.contactOk ? colors.primary : colors.textTertiary}
          />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.textPrimary, fontSize: typography.bodySmall, fontWeight: '600', lineHeight: 21 }}>
              {FEEDBACK_CONTACT_LABEL_FA}
            </Text>
            <Text style={{ color: colors.textTertiary, fontSize: typography.caption, lineHeight: 19, marginTop: 2 }}>
              {FEEDBACK_CONTACT_HINT_FA}
            </Text>
          </View>
        </TouchableOpacity>

        <Text style={{ color: colors.textTertiary, fontSize: typography.caption, lineHeight: 19, marginTop: spacing[3] }}>
          {FEEDBACK_PRIVACY_FA}
        </Text>

        {fieldError || failure ? (
          <Text
            accessibilityRole="alert"
            style={{ color: colors.error, fontSize: typography.bodySmall, lineHeight: 21, marginTop: spacing[3] }}
          >
            {fieldError ?? FEEDBACK_ERROR_FA[failure as FeedbackErrorKind]}
          </Text>
        ) : null}

        <View style={{ marginTop: spacing[4] }}>
          <Button label="ارسال" onPress={onSend} loading={sending} disabled={sending} fullWidth />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
