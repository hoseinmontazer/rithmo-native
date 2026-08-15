/**
 * AIInsightCard — Home screen AI suggestion preview card
 */
import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@hooks/useTheme';
import { AppIcon } from '@components/ui';
import icons from '../../../assets/icons';

interface AIInsightCardProps {
  label?: string;
  text: string;
  onPress: () => void;
  onSeeAll: () => void;
}

export const AIInsightCard = memo(function AIInsightCard({
  label,
  text,
  onPress,
  onSeeAll,
}: AIInsightCardProps) {
  const { colors, spacing, typography } = useTheme();

  return (
    <View>
      {/* Section header */}
      <View style={[styles.header, { marginBottom: spacing[3] }]}>
        <Text style={{ color: colors.textPrimary, fontSize: typography.lg, fontWeight: '800', letterSpacing: -0.3 }}>
          AI Insight
        </Text>
        <TouchableOpacity onPress={onSeeAll} activeOpacity={0.7}>
          <Text style={{ color: colors.primary, fontSize: typography.sm, fontWeight: '600' }}>See all</Text>
        </TouchableOpacity>
      </View>

      {/* Card */}
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        style={[styles.card, {
          backgroundColor: colors.surface,
          shadowColor: colors.shadowColor,
        }]}
      >
        <View style={{ height: 3, backgroundColor: colors.luteal }} />
        <View style={[styles.body, { padding: spacing[4], gap: spacing[3] }]}>
          <View style={{
            width: 42, height: 42, borderRadius: 13,
            backgroundColor: colors.luteal + '18',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <AppIcon source={icons.robotWriting} size={22} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{
              color: colors.textSecondary, fontSize: typography.xs,
              fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase',
              marginBottom: spacing[1],
            }}>
              {label ?? 'Daily Recommendation'}
            </Text>
            <Text style={{
              color: colors.textPrimary, fontSize: typography.base,
              lineHeight: 22, fontWeight: '500',
            }} numberOfLines={4}>
              {text}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
});
