/**
 * CheckInPrompt — Home's proactive check-in.
 *
 * Renders nothing when there's no eligible check-in today (the common
 * case), or once it's been answered/dismissed — the backend's own
 * eligibility rules (missing_data / deviation_confirm, at most one per
 * day, a 7-day cooldown per reason) already decide whether asking is
 * worth it; this component only renders whatever it's handed and routes
 * the answer into the existing product, per the "check-in is an entry
 * point, not a parallel product" rule.
 *
 * `missing_data`'s "log" answer opens the existing full logger — the same
 * route Home's "ثبت کامل روز" CTA uses, so "answer" and "log more" are one
 * route, not a new flow.
 * `deviation_confirm` has no natural navigation of its own; both answers
 * just record a real yes/no against an established pattern, which is
 * already useful signal on its own.
 * `partner_support` (Partner Mode's own check-in, same component reused
 * rather than a second one) has no navigation either — `onAnswered` lets
 * the caller log a `PartnerAction` alongside the answer, which is Partner
 * Mode's own job, not this component's.
 */
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@hooks/useTheme';
import { Card, PressScale, Reveal } from '@components/ui';
import { useRespondToCheckIn, useDismissCheckIn } from '@hooks/queries/useIntelligence';
import type { CheckIn } from '@types/intelligence.types';

interface Props {
  checkIn: CheckIn | null | undefined;
  onGoFullLog?: () => void;
  onAnswered?: (value: string) => void;
}

export const CheckInPrompt = memo(function CheckInPrompt({ checkIn, onGoFullLog, onAnswered }: Props) {
  const { colors, spacing, borderRadius, typography } = useTheme();
  const { mutate: respond, isPending } = useRespondToCheckIn();
  const { mutate: dismiss, isPending: isDismissing } = useDismissCheckIn();

  if (!checkIn) {
    return null;
  }

  const answer = (value: string) => {
    if (isPending) { return; }
    respond(
      { checkinId: checkIn.id, value },
      {
        onSuccess: () => {
          if (checkIn.kind === 'missing_data' && value === 'log') {
            onGoFullLog?.();
          }
          onAnswered?.(value);
        },
      },
    );
  };

  return (
    <Reveal>
      <Card rounded="3xl" style={{ backgroundColor: colors.primaryLighter, borderColor: colors.primaryLight, padding: spacing[5] }}>
        {checkIn.state === 'shown' ? (
          <>
            <Text style={{ color: colors.primaryDark, fontSize: typography.bodySmall, fontWeight: '700', lineHeight: 22, textAlign: 'center' }}>
              {checkIn.question_fa}
            </Text>
            <View style={[styles.row, { marginTop: spacing[4], justifyContent: 'center' }]}>
              {checkIn.options.map((opt) => (
                <PressScale
                  key={opt.value}
                  onPress={() => answer(opt.value)}
                  disabled={isPending}
                  style={[
                    styles.optionBtn,
                    { backgroundColor: colors.surface, borderColor: colors.primaryLight, borderWidth: 1, borderRadius: borderRadius.pill, opacity: isPending ? 0.6 : 1 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={opt.label_fa}
                >
                  <Text style={{ color: colors.primaryDark, fontSize: typography.caption, fontWeight: '700' }}>
                    {opt.label_fa}
                  </Text>
                </PressScale>
              ))}
              <PressScale
                onPress={() => !isDismissing && dismiss(checkIn.id)}
                disabled={isDismissing}
                style={styles.dismissBtn}
                accessibilityRole="button"
                accessibilityLabel="بستن"
              >
                <Text style={{ color: colors.primary, fontSize: typography.caption, fontWeight: '600' }}>
                  بستن
                </Text>
              </PressScale>
            </View>
          </>
        ) : (
          <Text style={{ color: colors.primary, fontSize: typography.caption, textAlign: 'center' }}>
            {checkIn.state === 'answered' ? 'ممنون — این در تحلیل بعدی لحاظ می‌شه.' : 'باشه، دیگه نمی‌پرسیم.'}
          </Text>
        )}
      </Card>
    </Reveal>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  optionBtn: { paddingHorizontal: 16, paddingVertical: 8 },
  dismissBtn: { paddingHorizontal: 8, paddingVertical: 8 },
});
