/**
 * QuickLogStrip — Horizontal scrollable quick-log chips
 */
import React, { memo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@hooks/useTheme';
import { Icon } from '@components/ui';

interface QuickLogStripProps {
  showCycleContent: boolean;
  onLogPeriod: () => void;
  onLogWellness: () => void;
  onMedications: () => void;
  onAnalytics: () => void;
  onMessages: () => void;
}

function Chip({ icon, label, color, onPress }: { icon: string; label: string; color: string; onPress: () => void }) {
  const { spacing, typography } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.chip, {
        backgroundColor: color + '14',
        borderRadius: 14,
        paddingHorizontal: spacing[3],
        paddingVertical: spacing[2],
        gap: spacing[2],
      }]}
    >
      <Icon name={icon} size={16} color={color} />
      <Text style={{ color, fontSize: typography.xs, fontWeight: '700', letterSpacing: 0.2 }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export const QuickLogStrip = memo(function QuickLogStrip({
  showCycleContent,
  onLogPeriod,
  onLogWellness,
  onMedications,
  onAnalytics,
  onMessages,
}: QuickLogStripProps) {
  const { colors, spacing, typography } = useTheme();

  return (
    <View>
      <View style={[styles.header, { marginBottom: spacing[3] }]}>
        <Text style={{ color: colors.textPrimary, fontSize: typography.lg, fontWeight: '800', letterSpacing: -0.3 }}>
          Quick Log
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing[2] }}
      >
        {showCycleContent && (
          <Chip icon="plus-circle-outline" label="Log Period" color={colors.menstrual} onPress={onLogPeriod} />
        )}
        <Chip icon="heart-outline"    label="Wellness"   color={colors.luteal}         onPress={onLogWellness} />
        <Chip icon="pill"             label="Medication" color={colors.primary}         onPress={onMedications} />
        <Chip icon="chart-line"       label="Analytics"  color={colors.ovulationColor}  onPress={onAnalytics} />
        <Chip icon="message-outline"  label="Messages"   color={colors.follicular}      onPress={onMessages} />
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
