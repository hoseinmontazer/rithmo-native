import React, { memo } from 'react';
import { Image, ImageSourcePropType, StyleSheet, View, Text } from 'react-native';
import icons from '@assets/icons';
import { PressScale } from '@components/ui';
import { useTheme } from '@hooks/useTheme';
import { typography } from '@theme/typography';
import type { QuickLogFocus } from '../../wellness/quickLogFocus';

interface CheckInItem {
  /** The QuickLog section this chip opens. */
  focus: QuickLogFocus;
  label: string;
  icon: ImageSourcePropType;
}

// Only what QuickLog can actually record. Water and Weight were removed: the
// form has no such input, so those chips opened a screen that could not log them.
const ITEMS: CheckInItem[] = [
  { focus: 'mood', label: 'حالت', icon: icons.quickMood },
  { focus: 'energy', label: 'انرژی', icon: icons.quickEnergy },
  { focus: 'symptoms', label: 'نشانه‌ها', icon: icons.quickSymptoms },
];

interface Props {
  onPressItem: (focus: QuickLogFocus) => void;
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
          <View key={item.focus} style={styles.itemContainer}>
            <PressScale
              onPress={() => onPressItem(item.focus)}
              style={[
                styles.iconWrap,
                { backgroundColor: colors.primaryLighter, borderColor: colors.primaryLight }
              ]}
              accessibilityRole="button"
              accessibilityLabel={`ثبت ${item.label}`}
            >
              {/* Decorative: the label below and the button label name it. */}
              <Image
                source={item.icon}
                style={styles.iconImage}
                resizeMode="contain"
                accessibilityIgnoresInvertColors
                importantForAccessibility="no"
              />
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
    justifyContent: 'space-around',
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
