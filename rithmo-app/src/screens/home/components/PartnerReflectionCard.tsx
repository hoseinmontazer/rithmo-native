/**
 * PartnerReflectionCard — Partner Home's own small Premium AI surface.
 *
 * Same rule as the owner's DailyReflectionCard: renders nothing at all
 * while loading or unavailable — "unavailable" reads as absence, never a
 * scary error. usePartnerReflection() already collapses every failure
 * mode (premium gate, no shared context, AI provider down, invalid
 * output) into the same "nothing to show" state.
 *
 * Every string here is exactly what the backend returned — third-person,
 * support-oriented, built only from build_partner_view()'s already-
 * filtered context (see ai_gateway/partner_context.py). This card does
 * not decide what's safe to say; it only renders what already passed
 * that boundary.
 */
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@hooks/useTheme';
import { Card, Icon } from '@components/ui';
import { usePartnerReflection } from '@hooks/queries/usePartnerReflection';

export const PartnerReflectionCard = memo(function PartnerReflectionCard() {
  const { reflection } = usePartnerReflection();
  const { colors, spacing, typography, borderRadius } = useTheme();

  if (!reflection) {
    return null;
  }

  return (
    <Card style={[styles.card, { padding: spacing[4], marginBottom: spacing[5] }]}>
      <View style={styles.header}>
        <View
          style={[
            styles.badge,
            { backgroundColor: colors.premiumBg, borderRadius: borderRadius.pill },
          ]}
        >
          <Icon name="creation" size={12} color={colors.premium} />
          <Text style={{ color: colors.premium, fontSize: typography.caption, fontWeight: '700' }}>
            راهنمای هوشمند
          </Text>
        </View>
      </View>

      <Text
        style={{ color: colors.textPrimary, fontSize: typography.bodySmall, lineHeight: 22, marginTop: spacing[2] }}
      >
        {reflection.summary}
      </Text>

      {reflection.observations.map((obs, i) => (
        <Text
          key={i}
          style={{ color: colors.textSecondary, fontSize: typography.caption, lineHeight: 20, marginTop: spacing[1] }}
        >
          {`· ${obs}`}
        </Text>
      ))}

      {reflection.suggestion ? (
        <Text
          style={{
            color: colors.textPrimary,
            fontSize: typography.bodySmall,
            fontWeight: '600',
            marginTop: spacing[3],
          }}
        >
          {reflection.suggestion}
        </Text>
      ) : null}

      {reflection.limitations.map((lim, i) => (
        <Text
          key={i}
          style={{ color: colors.textTertiary, fontSize: typography.caption, lineHeight: 18, marginTop: spacing[2] }}
        >
          {lim}
        </Text>
      ))}
    </Card>
  );
});

const styles = StyleSheet.create({
  card: { borderWidth: 0 },
  header: { flexDirection: 'row' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4 },
});
