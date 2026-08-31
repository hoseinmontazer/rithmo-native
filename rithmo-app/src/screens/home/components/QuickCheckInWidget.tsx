import React, { memo } from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { Smile, Zap, Droplets, Activity, Scale } from 'lucide-react-native';
import { PressScale } from '@components/ui';
import { useTheme } from '@hooks/useTheme';
import { typography } from '@theme/typography';

interface CheckInItem {
  id: string;
  label: string;
  icon: React.ElementType;
  screen: string;
}

const ITEMS = [
  { id: 'mood', label: 'حالت', icon: Smile, screen: 'Mood' },
  { id: 'energy', label: 'انرژی', icon: Zap, screen: 'Energy' },
  { id: 'water', label: 'آب', icon: Droplets, screen: 'Water' },
  { id: 'symptoms', label: 'نشانه‌ها', icon: Activity, screen: 'Symptoms' },
  { id: 'weight', label: 'وزن', icon: Scale, screen: 'Weight' },
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
              <item.icon size={26} color={colors.primaryDark} strokeWidth={2.25} />
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
