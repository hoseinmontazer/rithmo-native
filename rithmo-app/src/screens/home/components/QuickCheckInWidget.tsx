import React, { memo } from 'react';
import { Image, ImageSourcePropType, StyleSheet, View, Text } from 'react-native';
import { Scale } from 'lucide-react-native';
import icons from '@assets/icons';
import { PressScale } from '@components/ui';
import { useTheme } from '@hooks/useTheme';
import { typography } from '@theme/typography';

interface CheckInItem {
  id: string;
  label: string;
  /** Artwork. Weight has none: see `ICON_WEIGHT` below. */
  icon?: ImageSourcePropType;
  screen: string;
}

const ITEMS: CheckInItem[] = [
  { id: 'mood', label: 'حالت', icon: icons.quickMood, screen: 'Mood' },
  { id: 'energy', label: 'انرژی', icon: icons.quickEnergy, screen: 'Energy' },
  { id: 'water', label: 'آب', icon: icons.quickWater, screen: 'Water' },
  { id: 'symptoms', label: 'نشانه‌ها', icon: icons.quickSymptoms, screen: 'Symptoms' },
  // Neutral scale glyph (lucide, already a dependency). The supplied weight
  // artwork carried a red down-arrow, which reads as a weight-LOSS goal; the
  // check-in only records a number, so it must not imply a direction.
  { id: 'weight', label: 'وزن', screen: 'Weight' },
];

interface Props {
  onPressItem: (screen: string) => void;
}

export const QuickCheckInWidget = memo(function QuickCheckInWidget({ onPressItem }: Props) {
  const { colors, spacing } = useTheme();

  return (
    <View style={[styles.container, { marginTop: spacing[5] }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        ثبت سریع
      </Text>
      
      <View style={styles.grid}>
        {ITEMS.map((item) => (
          <View key={item.id} style={styles.itemContainer}>
            <PressScale
              onPress={() => onPressItem(item.screen)}
              style={[
                styles.iconWrap,
                { backgroundColor: colors.primaryLighter, borderColor: colors.primaryLight }
              ]}
              accessibilityRole="button"
              accessibilityLabel={`ثبت ${item.label}`}
            >
              {/* Decorative: the label below and the button label name it. */}
              {item.icon ? (
                <Image
                  source={item.icon}
                  style={styles.iconImage}
                  resizeMode="contain"
                  accessibilityIgnoresInvertColors
                  importantForAccessibility="no"
                />
              ) : (
                <Scale size={28} color={colors.primaryDark} strokeWidth={2.25} />
              )}
            </PressScale>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {item.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  iconImage: {
    width: 34,
    height: 34,
  },
  container: {
    paddingVertical: 4,
  },
  title: {
    fontSize: typography.bodySmall,
    fontWeight: '700',
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemContainer: {
    alignItems: 'center',
    width: 60,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: typography.micro,
    fontWeight: '600',
    textAlign: 'center',
  },
});
