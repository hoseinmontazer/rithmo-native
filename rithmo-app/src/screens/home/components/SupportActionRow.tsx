/**
 * SupportActionRow — Partner Mode's own, always-available interaction.
 *
 * Unlike CheckInPrompt (eligibility-gated, tied to a specific reason),
 * this never depends on anything the owner shared — it's the "no shared
 * data ≠ no useful experience" floor: a partner with zero context still
 * has something real to do here, every time.
 *
 * Each action has its own contract (ACTION_CONTRACTS below) — tapping
 * never just logs and says "ثبت شد": it shows real, per-action guidance,
 * and for "message" it links to the actual existing owner↔partner chat
 * (`PartnerMessages` → `Conversation`, already built — see ProfileScreen's
 * own note on that route). Nothing here auto-sends anything or claims a
 * message was delivered; the action is "I intend to reach out", and
 * "give space" explicitly has NO owner-visible effect at all — selecting
 * it must never trigger anything the owner can see, which is the whole
 * point of the action.
 *
 * `suggestedAction`, when set (a real theme exists — see
 * intelligence/partner.py's own "no context = no fake suggestion" rule),
 * highlights one of the four buttons rather than replacing them; the
 * other three remain equally available.
 *
 * Multiple actions may be logged in one visit — tapping one shows its
 * guidance without disabling the row, since "sent a message" and "gave
 * space" are not mutually exclusive choices.
 */
import React, { memo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@hooks/useTheme';
import { Card, PressScale, Reveal } from '@components/ui';
import { useLogPartnerAction } from '@hooks/queries/useIntelligence';

interface ActionContract {
  value: string;
  label: string;
  /** Shown immediately after tapping — the real "what happens now",
   * never a generic "ثبت شد". */
  guidance_fa: string;
  /** Only "message" has one today — a real navigation, not a promise
   * the app can't keep. */
  ctaLabel?: string;
}

const ACTIONS: ActionContract[] = [
  {
    value: 'message',
    label: 'یه پیام کوتاه بفرست',
    guidance_fa: 'یک پیام کوتاه و بدون انتظار پاسخ خاص، معمولاً شروع خوبی است.',
    ctaLabel: 'شروع گفتگو',
  },
  {
    value: 'checked_in',
    label: 'یادآوری کن کنارشی',
    guidance_fa: 'لازم نیست چیزی را حل کنی — گاهی فقط حضور داشتن کافی است.',
  },
  {
    value: 'time_together',
    label: 'براش وقت بذار',
    guidance_fa: 'حتی یک زمان کوتاه برای کنار هم بودن می‌تواند ارزشمند باشد.',
  },
  {
    value: 'gave_space',
    label: 'بهش فضا بده',
    guidance_fa: 'گاهی بهترین همراهی این است که بدون فشار یا انتظار پاسخ، کمی فضا بدهی.',
  },
];

interface Props {
  title?: string;
  /** A PartnerAction value to highlight, or null/undefined for none —
   * never fabricated client-side, only ever what the backend derived
   * from a real shared theme. */
  suggestedAction?: string | null;
}

export const SupportActionRow = memo(function SupportActionRow({
  title = 'امروز دوست داری چطور حمایتش کنی؟',
  suggestedAction,
}: Props) {
  const { colors, spacing, borderRadius, typography } = useTheme();
  const navigation = useNavigation<any>();
  const { mutate: logAction, isPending } = useLogPartnerAction();
  const [active, setActive] = useState<ActionContract | null>(null);

  const act = (contract: ActionContract) => {
    if (isPending) { return; }
    logAction(contract.value, { onSuccess: () => setActive(contract) });
  };

  const openChat = () => {
    // Same cross-tab hop PartnerHomeScreen already uses for PartnerManage —
    // PartnerMessages resolves the single linked conversation on its own,
    // no partnerId to pass. This opens the compose surface; it does not
    // send anything on its own.
    navigation.navigate('ProfileTab' as never, { screen: 'PartnerMessages' } as never);
  };

  return (
    <Card style={{ padding: 16, marginBottom: spacing[5] }}>
      <Text style={{ color: colors.textPrimary, fontSize: typography.bodySmall, fontWeight: '600' }}>
        {title}
      </Text>

      {suggestedAction && (
        <>
          <Text style={{ color: colors.textSecondary, fontSize: typography.caption, marginTop: spacing[2] }}>
            امروز شاید «{ACTIONS.find((a) => a.value === suggestedAction)?.label}» شروع خوبی باشد.
          </Text>
          {/* Deliberately generic — never names the specific signal or
           * theme behind the suggestion. That specificity is exactly what
           * `intelligence/partner.py` is built to keep off this screen;
           * this line explains that a real, consented basis exists
           * without reconstructing what it is. */}
          <Text style={{ color: colors.textTertiary, fontSize: typography.overline, marginTop: spacing[1] }}>
            این پیشنهاد بر اساس الگوهای کلی و اطلاعاتی است که برای اشتراک‌گذاری اجازه داده شده‌اند.
          </Text>
        </>
      )}

      <View style={[styles.row, { marginTop: spacing[3] }]}>
        {ACTIONS.map((a) => {
          const isSuggested = a.value === suggestedAction;
          return (
            <PressScale
              key={a.value}
              onPress={() => act(a)}
              disabled={isPending}
              style={[
                styles.actionBtn,
                {
                  backgroundColor: isSuggested ? colors.primary : colors.primaryLighter,
                  borderRadius: borderRadius.pill,
                  opacity: isPending ? 0.6 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={a.label}
            >
              <Text
                style={{
                  color: isSuggested ? colors.textOnPrimary : colors.primaryDark,
                  fontSize: typography.caption,
                  fontWeight: '700',
                }}
              >
                {a.label}
              </Text>
            </PressScale>
          );
        })}
      </View>

      {active && (
        <Reveal distance={6}>
          <View style={[styles.guidanceBox, { borderTopColor: colors.borderSubtle, marginTop: spacing[3], paddingTop: spacing[3] }]}>
            <Text style={{ color: colors.textSecondary, fontSize: typography.caption, lineHeight: 19 }}>
              {active.guidance_fa}
            </Text>
            {active.ctaLabel && (
              <PressScale
                onPress={openChat}
                style={[styles.ctaBtn, { backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius.md, marginTop: spacing[2] }]}
                accessibilityRole="button"
                accessibilityLabel={active.ctaLabel}
              >
                <Text style={{ color: colors.textPrimary, fontSize: typography.caption, fontWeight: '700' }}>
                  {active.ctaLabel}
                </Text>
              </PressScale>
            )}
          </View>
        </Reveal>
      )}
    </Card>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionBtn: { paddingHorizontal: 14, paddingVertical: 8 },
  guidanceBox: { borderTopWidth: StyleSheet.hairlineWidth },
  ctaBtn: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8 },
});
