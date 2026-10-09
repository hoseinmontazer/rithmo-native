/**
 * SupportActionRow - Partner Mode's own, always-available interaction.
 *
 * Unlike CheckInPrompt (eligibility-gated, tied to a specific reason),
 * this never depends on anything the owner shared - it's the "no shared
 * data = no useful experience" floor: a partner with zero context still
 * has something real to do here, every time.
 *
 * Partner 2.0 P2 - what a tap means: the partner CHOSE an action and the
 * server RECORDED that choice against their link. Contracts and the submit
 * logic live in supportActions.ts. So:
 *   - success ("ثبت شد") appears only after the server confirmed;
 *   - a failure shows an honest error with retry and leaves no local
 *     success state behind;
 *   - a repeated tap while a request is in flight does nothing, and the
 *     server folds an identical tap seconds later into the same record;
 *   - "message" records the intention and then offers the real
 *     conversation, with an editable draft. Nothing is sent for the user,
 *     and no message is claimed to exist;
 *   - nothing here is shown to the owner (that is a later phase).
 *
 * `suggestedAction`, when set (a real theme exists - see
 * intelligence/partner.py's own "no context = no fake suggestion" rule),
 * highlights one of the four buttons rather than replacing them; the
 * other three remain equally available.
 */
import React, { memo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@hooks/useTheme';
import { Card, PressScale, Reveal } from '@components/ui';
import { useLogPartnerAction } from '@hooks/queries/useIntelligence';
import { useProfile } from '@hooks/queries/useProfile';
import { track } from '@analytics';
import { ACTION_VISIBILITY_NOTE_FA } from '../supportReceipt';
import {
  SUPPORT_ACTIONS,
  MESSAGE_PREFILL_FA,
  RECORDED_LABEL_FA,
  FAILED_LABEL_FA,
  RETRY_LABEL_FA,
  resolveChatTarget,
  runSupportAction,
  type ActionContract,
} from '../supportActions';

const ACTIONS = SUPPORT_ACTIONS;

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
  const { data: profile } = useProfile();
  // Set only AFTER the server recorded the choice; never optimistic.
  const [active, setActive] = useState<ActionContract | null>(null);
  const [failed, setFailed] = useState<ActionContract | null>(null);

  const act = (contract: ActionContract) => {
    setFailed(null);
    runSupportAction({
      pending: isPending,
      contract,
      log: (action, cb) => logAction(action, cb),
      track: (event, props) => track(event as any, props as any),
      onRecorded: (c) => { setFailed(null); setActive(c); },
      onFailed: (c) => { setActive(null); setFailed(c); },
    });
  };

  const openChat = () => {
    // Straight into the real conversation with an editable draft. Opening it
    // sends nothing; the partner sends (or doesn't) with the normal send
    // button. `initial: false` keeps the inbox underneath for "back".
    const target = resolveChatTarget(profile?.partners as any);
    if (target) {
      navigation.navigate(
        'ProfileTab' as never,
        {
          screen: 'PartnerMessages',
          params: {
            screen: 'Conversation',
            params: { ...target, prefill: MESSAGE_PREFILL_FA },
            initial: false,
          },
        } as never,
      );
      return;
    }
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

      {failed && (
        <View style={[styles.guidanceBox, { borderTopColor: colors.borderSubtle, marginTop: spacing[3], paddingTop: spacing[3] }]}>
          <Text style={{ color: colors.error, fontSize: typography.caption, lineHeight: 19 }}>
            {FAILED_LABEL_FA}
          </Text>
          <PressScale
            onPress={() => act(failed)}
            disabled={isPending}
            style={[styles.ctaBtn, { backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius.md, marginTop: spacing[2] }]}
            accessibilityRole="button"
            accessibilityLabel={RETRY_LABEL_FA}
          >
            <Text style={{ color: colors.textPrimary, fontSize: typography.caption, fontWeight: '700' }}>
              {RETRY_LABEL_FA}
            </Text>
          </PressScale>
        </View>
      )}

      {active && (
        <Reveal distance={6}>
          <View style={[styles.guidanceBox, { borderTopColor: colors.borderSubtle, marginTop: spacing[3], paddingTop: spacing[3] }]}>
            <View style={styles.recordedRow}>
              <Icon name="check" size={14} color={colors.textTertiary} />
              <Text style={{ color: colors.textTertiary, fontSize: typography.caption }}>
                {RECORDED_LABEL_FA}
              </Text>
            </View>
            <Text style={{ color: colors.textSecondary, fontSize: typography.caption, lineHeight: 19, marginTop: 4 }}>
              {active.guidance_fa}
            </Text>
            {/* Honest about who can see what: some gestures give her a small,
                optional note; "give space" is private; a message goes only
                when you send it. */}
            <Text style={{ color: colors.textTertiary, fontSize: typography.caption, lineHeight: 18, marginTop: 4 }}>
              {ACTION_VISIBILITY_NOTE_FA[active.value]}
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
  recordedRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
