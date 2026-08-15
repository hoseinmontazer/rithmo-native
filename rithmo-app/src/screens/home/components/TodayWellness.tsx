/**
 * TodayWellness — Home screen today's wellness snapshot (mood + streak tiles)
 */
import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '@hooks/useTheme';

const { width: W } = Dimensions.get('window');
const CARD_GAP = 12;
const HALF_CARD = (W - 40 - CARD_GAP) / 2;

interface TodayWellnessProps {
  moodLevel?: number | null;
  wellnessScore?: number | null;
  currentStreak: number;
  totalLogs: number;
  onLogWellness: () => void;
  onWellnessDashboard: () => void;
  onSeeAll: () => void;
}

function StatTile({
  label, value, sub, accent, onPress,
}: {
  label: string; value: string; sub?: string; accent: string; onPress?: () => void;
}) {
  const { colors, spacing, typography } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.82}
      style={[styles.tile, {
        width: HALF_CARD,
        backgroundColor: colors.surface,
        borderRadius: 20,
        padding: spacing[4],
        shadowColor: colors.shadowColor,
      }]}
    >
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: accent, marginBottom: spacing[3] }} />
      <Text style={{ color: colors.textSecondary, fontSize: typography.xs, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: spacing[1] }}>
        {label}
      </Text>
      <Text style={{ color: colors.textPrimary, fontSize: typography['2xl'], fontWeight: '800', letterSpacing: -0.5 }}>
        {value}
      </Text>
      {sub ? (
        <Text style={{ color: colors.textSecondary, fontSize: typography.xs, marginTop: spacing[1] }}>{sub}</Text>
      ) : null}
    </TouchableOpacity>
  );
}

export const TodayWellness = memo(function TodayWellness({
  moodLevel,
  wellnessScore,
  currentStreak,
  totalLogs,
  onLogWellness,
  onWellnessDashboard,
  onSeeAll,
}: TodayWellnessProps) {
  const { colors, spacing, typography } = useTheme();

  return (
    <View>
      {/* Section header */}
      <View style={[styles.header, { marginBottom: spacing[3] }]}>
        <Text style={{ color: colors.textPrimary, fontSize: typography.lg, fontWeight: '800', letterSpacing: -0.3 }}>
          Today's Wellness
        </Text>
        <TouchableOpacity onPress={onSeeAll} activeOpacity={0.7}>
          <Text style={{ color: colors.primary, fontSize: typography.sm, fontWeight: '600' }}>See all</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.row, { gap: CARD_GAP }]}>
        <StatTile
          label="Mood"
          value={moodLevel ? `${moodLevel}/10` : '—'}
          sub={moodLevel != null ? `score ${wellnessScore ?? '—'}` : 'tap to log'}
          accent={colors.luteal}
          onPress={onLogWellness}
        />
        <StatTile
          label="Streak"
          value={currentStreak ? `${currentStreak}d` : '0d'}
          sub={`${totalLogs} total logs`}
          accent={colors.primary}
          onPress={onWellnessDashboard}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
  },
  tile: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
});
