/**
 * TodayFeedbackBlock - the one explicit-trigger "بازخورد هوشمند" interaction
 * (Today 2.0, Layer B), shared by every surface that offers it (the Quick Log
 * saved state and the adaptive check-in completion). It never fires on its
 * own: the user chooses to tap. All quota / premium handling lives here so no
 * second copy exists.
 */
import React from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '@hooks/useTheme';
import { useTodayFeedback } from '@hooks/queries/useTodayFeedback';
import { useToday } from '@hooks/queries/useIntelligence';
import { TodayRecordedCard } from '../screens/home/components/TodayRecordedCard';
import { buildTodayRecorded } from '../screens/home/todayRecorded';
import { PremiumGate } from '@components/PremiumGate';
import { Badge, Button, Card } from '@components/ui';
import { toFa } from '@utils/persian';

export function TodayFeedbackBlock({ marginTop }: { marginTop?: number }) {
  const { colors, spacing, typography } = useTheme();
  const {
    requestFeedback, isLoading: isFeedbackLoading, isQuotaExhausted,
    available: feedbackAvailable, feedback, quota: feedbackQuota, isError: feedbackFailed, fallback: feedbackFallback,
  } = useTodayFeedback();
  // Deterministic fallback source: the same backend facts Home shows.
  const { data: today } = useToday();

  return (
<View style={{ width: '100%', marginTop: marginTop ?? spacing[4] }}>
      {!feedback && !isQuotaExhausted && (
        <Button
          label={isFeedbackLoading ? 'در حال آماده‌سازی...' : 'دریافت بازخورد هوشمند'}
          onPress={() => requestFeedback()}
          loading={isFeedbackLoading}
          disabled={isFeedbackLoading}
          variant="secondary"
          fullWidth
        />
      )}

      {isQuotaExhausted && (
        <PremiumGate
          overlay
          featureName="بازخورد نامحدود"
          message="سقف بازخورد رایگان این هفته پر شده — با پرمیوم نامحدود دریافت کن."
        />
      )}

      {feedback && !isFeedbackLoading && (
        <Card elevated={false} rounded="2xl" style={{ padding: spacing[4], marginTop: spacing[3], width: '100%' }}>
          <Text style={{ color: colors.textPrimary, fontSize: typography.bodySmall, fontWeight: '600', lineHeight: 22 }}>
            {feedback.summary}
          </Text>
          {feedback.observations.map((obs, i) => (
            <Text key={i} style={{ color: colors.textSecondary, fontSize: typography.caption, lineHeight: 20, marginTop: spacing[1] }}>
              {`· ${obs}`}
            </Text>
          ))}
          {feedback.suggestion ? (
            <Text style={{ color: colors.textPrimary, fontSize: typography.bodySmall, fontWeight: '600', marginTop: spacing[3] }}>
              {feedback.suggestion}
            </Text>
          ) : null}
          {feedback.limitations.map((lim, i) => (
            <Text key={i} style={{ color: colors.textTertiary, fontSize: typography.micro, lineHeight: 16, marginTop: i === 0 ? spacing[3] : 2 }}>
              {lim}
            </Text>
          ))}
          {!feedbackQuota?.is_premium && typeof feedbackQuota?.remaining === 'number' && (
            <Badge
              label={`${toFa(feedbackQuota.remaining)} بازخورد رایگان باقی‌مانده این هفته`}
              variant="neutral"
              style={{ marginTop: spacing[3], alignSelf: 'flex-start' }}
            />
          )}
        </Card>
      )}

      {(feedbackAvailable === false || feedbackFailed) && !isFeedbackLoading && !isQuotaExhausted && (
        // No AI text (provider down, timeout, or its answer failed our checks):
        // never an error and never a fake insight - just what was recorded.
        <View style={{ marginTop: spacing[2] }}>
          {buildTodayRecorded(today?.state?.today_values, today?.state?.today_symptoms).length > 0 ? (
            <Text style={{ color: colors.textSecondary, fontSize: typography.bodySmall, textAlign: 'center' }}>
              ثبت‌های امروزت ذخیره شد.
            </Text>
          ) : null}
          <TodayRecordedCard
            values={today?.state?.today_values}
            symptoms={today?.state?.today_symptoms}
            continuity={feedbackFallback?.observations?.length ? null : today?.continuity}
          />
          {(feedbackFallback?.observations ?? []).map((line, i) => (
            <Text key={i} style={{ color: colors.textSecondary, fontSize: typography.caption, lineHeight: 20, marginTop: spacing[2], textAlign: 'center' }}>
              {line}
            </Text>
          ))}
          {feedbackFallback?.suggestion ? (
            <Text style={{ color: colors.textPrimary, fontSize: typography.bodySmall, lineHeight: 22, marginTop: spacing[3], textAlign: 'center' }}>
              {feedbackFallback.suggestion}
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );
}
