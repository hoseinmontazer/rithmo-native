/**
 * SupportReceiptCard - the owner's one small receipt (Partner 2.0 P3).
 *
 * Not a feed and not a notification: it is one quiet card on Home, present
 * only while a partner's recent, allowlisted gesture exists. Everything on it
 * is optional: react with one tap, tap "later", or ignore it entirely - there
 * is no reminder, no "waiting for you", no counter. After a reaction it says
 * so once and goes away on its own.
 */
import React, { memo, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@hooks/useTheme';
import { Card, PressScale, Reveal } from '@components/ui';
import {
  useDismissSupportReceipt,
  useReactToSupportReceipt,
  useSupportReceipt,
} from '@hooks/queries/useIntelligence';
import { track } from '@analytics';
import {
  RECEIPT_COPY,
  REACTION_OPTIONS,
  REACTION_SENT_FA,
  RECEIPT_LATER_FA,
} from '../supportReceipt';

export const SupportReceiptCard = memo(function SupportReceiptCard() {
  const { colors, spacing, borderRadius, typography } = useTheme();
  const { data: receipt } = useSupportReceipt();
  const { mutate: react, isPending: reacting } = useReactToSupportReceipt();
  const { mutate: dismiss } = useDismissSupportReceipt();
  const [sent, setSent] = useState(false);
  const viewedId = useRef<number | null>(null);

  useEffect(() => {
    if (receipt && viewedId.current !== receipt.id) {
      viewedId.current = receipt.id;
      track('support_receipt_viewed', { kind: receipt.kind });
    }
  }, [receipt]);

  if (!receipt && !sent) { return null; }

  if (sent) {
    return (
      <Reveal distance={4}>
        <Card style={{ padding: 14, marginTop: spacing[4] }}>
          <View style={styles.row}>
            <Icon name="check" size={16} color={colors.textTertiary} />
            <Text style={{ color: colors.textTertiary, fontSize: typography.caption }}>
              {REACTION_SENT_FA}
            </Text>
          </View>
        </Card>
      </Reveal>
    );
  }

  const copy = RECEIPT_COPY[receipt!.kind];
  if (!copy) { return null; }

  return (
    <Reveal distance={4}>
      <Card style={{ padding: 16, marginTop: spacing[4] }}>
        <View style={styles.row}>
          <Icon name="heart-outline" size={18} color={colors.primary} />
          <Text style={{ color: colors.textPrimary, fontSize: typography.bodySmall, fontWeight: '700', flex: 1 }}>
            {copy.title}
          </Text>
        </View>
        <Text style={{ color: colors.textSecondary, fontSize: typography.caption, lineHeight: 19, marginTop: 4 }}>
          {copy.body}
        </Text>

        <View style={[styles.row, { marginTop: spacing[3], flexWrap: 'wrap' }]}>
          {REACTION_OPTIONS.map((opt) => (
            <PressScale
              key={opt.value}
              disabled={reacting}
              onPress={() =>
                react(
                  { id: receipt!.id, reaction: opt.value },
                  {
                    onSuccess: () => {
                      track('support_receipt_reacted', { kind: receipt!.kind, reaction: opt.value });
                      setSent(true);
                    },
                  },
                )
              }
              style={[
                styles.chip,
                { backgroundColor: colors.primaryLighter, borderRadius: borderRadius.pill, opacity: reacting ? 0.6 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={opt.label}
            >
              <Icon name={opt.icon} size={16} color={colors.primaryDark} />
              <Text style={{ color: colors.primaryDark, fontSize: typography.caption, fontWeight: '700' }}>
                {opt.label}
              </Text>
            </PressScale>
          ))}
          <PressScale
            onPress={() => {
              track('support_receipt_dismissed', { kind: receipt!.kind });
              dismiss(receipt!.id);
            }}
            style={styles.later}
            accessibilityRole="button"
            accessibilityLabel={RECEIPT_LATER_FA}
          >
            <Text style={{ color: colors.textTertiary, fontSize: typography.caption }}>{RECEIPT_LATER_FA}</Text>
          </PressScale>
        </View>
      </Card>
    </Reveal>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8 },
  later: { paddingHorizontal: 10, paddingVertical: 8 },
});
