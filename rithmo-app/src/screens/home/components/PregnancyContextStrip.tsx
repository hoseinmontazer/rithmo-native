/**
 * PregnancyContextStrip — the Home "where am I" strip for a user with an
 * active pregnancy, replacing CycleContextStrip (sibling component, same
 * flat/no-advice/plain-language visual language — see that file's header
 * for why the strip stays flat and free of generic advice copy).
 *
 * Cycle history is untouched underneath; this is purely a display swap
 * driven by usePregnancyStatus(), the same way HomeStack already swaps
 * HomeScreen/PartnerHomeScreen based on role.
 */
import React, { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@hooks/useTheme';
import { toFa } from '@utils/persian';
import type { PregnancyStatus } from '@types/pregnancy.types';

const TRIMESTER_LABEL_FA: Record<number, string> = {
  1: 'سه‌ماهه اول',
  2: 'سه‌ماهه دوم',
  3: 'سه‌ماهه سوم',
};

interface Props {
  pregnancy: PregnancyStatus;
  onPress: () => void;
}

export const PregnancyContextStrip = memo(function PregnancyContextStrip({ pregnancy, onPress }: Props) {
  const { colors, typography, spacing } = useTheme();

  const week = pregnancy.gestational_week ?? 0;
  const day = pregnancy.gestational_day ?? 0;
  const trimester = pregnancy.trimester ?? 1;

  const weekLabel = `هفته ${toFa(week)} + ${toFa(day)} روز`;
  const trimesterLabel = TRIMESTER_LABEL_FA[trimester] ?? TRIMESTER_LABEL_FA[1];

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.row, { paddingVertical: spacing[3] }]}
      accessibilityRole="button"
      accessibilityLabel={`${weekLabel}، ${trimesterLabel}. برای جزئیات بارداری ضربه بزن`}
    >
      <View style={styles.left}>
        <Icon name="human-pregnant" size={16} color={colors.primary} />
        <Text
          style={{ color: colors.textPrimary, fontSize: typography.bodySmall, fontWeight: '700' }}
          numberOfLines={1}
        >
          {`${weekLabel} · ${trimesterLabel}`}
        </Text>
      </View>

      <Icon name="chevron-left" size={16} color={colors.textTertiary} />
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
});
