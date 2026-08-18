/**
 * TodayStateCard — Shows today's logged snapshot
 *
 * Compact 3-icon row: Mood / Energy / Pain
 * If not logged today, renders the Log CTA instead.
 */
import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@hooks/useTheme';
import type { WellnessLog } from '@types/wellness.types';

// Map from numeric value to emoji label

const MOOD_EMOJI: Record<number, string> = {
  1: '😞', 2: '😕', 3: '😐', 4: '🙂', 5: '😊',
};
const ENERGY_EMOJI: Record<number, string> = {
  1: '😴', 2: '🥱', 3: '😌', 4: '🙂', 5: '⚡',
};
const PAIN_EMOJI: Record<number, string> = {
  0: '✅', 1: '🟡', 2: '🟠', 3: '🔴', 4: '💢', 5: '💢',
};

interface TodayStateCardProps {
  log: WellnessLog | null | undefined;
  isLoading: boolean;
  onLogPress: () => void;
}

export const TodayStateCard = memo(function TodayStateCard({
  log, isLoading, onLogPress,
}: TodayStateCardProps) {
  const { colors, spacing, typography } = useTheme();

  // ── Not yet logged ────────────────────────────────────────────────────────
  if (!isLoading && !log) {
    return (
      <TouchableOpacity
        onPress={onLogPress}
        activeOpacity={0.85}
        style={[styles.ctaCard, {
          backgroundColor: colors.surfaceSecondary,
          borderColor: colors.border,
        }]}
        accessibilityLabel="ثبت امروز"
      >
        <Text style={{ fontSize: 22, marginBottom: 2 }}>✏️</Text>
        <View>
          <Text style={[styles.ctaTitle, { color: colors.primary, fontSize: typography.base }]}>
            ثبت امروز
          </Text>
          <Text style={[styles.ctaSub, { color: colors.textSecondary, fontSize: typography.sm }]}>
            هنوز چیزی ثبت نکردی
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  if (isLoading || !log) { return null; }

  // Map backend 1–10 energy/pain to 1–5 / 0–4 for emoji lookup
  const moodKey   = Math.min(5, Math.max(1, Math.round(log.mood_level))) as keyof typeof MOOD_EMOJI;
  const energyKey = Math.min(5, Math.max(1, Math.round((log.energy_level / 2)))) as keyof typeof ENERGY_EMOJI;
  const painKey   = Math.min(4, Math.max(0, Math.round(log.pain_level / 2.5))) as keyof typeof PAIN_EMOJI;

  // ── Logged today ──────────────────────────────────────────────────────────
  return (
    <TouchableOpacity
      onPress={onLogPress}
      activeOpacity={0.88}
      style={[styles.card, { backgroundColor: colors.surface, shadowColor: colors.shadowColor }]}
      accessibilityLabel="ویرایش ثبت امروز"
    >
      <View style={styles.row}>
        {/* Mood */}
        <View style={styles.metricItem}>
          <Text style={styles.metricEmoji}>{MOOD_EMOJI[moodKey] ?? '😐'}</Text>
          <Text style={[styles.metricLabel, { color: colors.textTertiary, fontSize: typography.xs }]}>خلق</Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Energy */}
        <View style={styles.metricItem}>
          <Text style={styles.metricEmoji}>{ENERGY_EMOJI[energyKey] ?? '😌'}</Text>
          <Text style={[styles.metricLabel, { color: colors.textTertiary, fontSize: typography.xs }]}>انرژی</Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Pain */}
        <View style={styles.metricItem}>
          <Text style={styles.metricEmoji}>{PAIN_EMOJI[painKey] ?? '✅'}</Text>
          <Text style={[styles.metricLabel, { color: colors.textTertiary, fontSize: typography.xs }]}>درد</Text>
        </View>

        {/* Edit hint */}
        <View style={[styles.editHint, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={{ color: colors.textTertiary, fontSize: typography.xs }}>ویرایش</Text>
        </View>
      </View>

      {log.notes ? (
        <Text
          style={[styles.notes, { color: colors.textSecondary, fontSize: typography.sm }]}
          numberOfLines={2}
        >
          "{log.notes}"
        </Text>
      ) : null}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  ctaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  ctaTitle: { fontWeight: '700' },
  ctaSub: { marginTop: 2 },

  card: {
    borderRadius: 8,
    paddingHorizontal: 18,
    paddingVertical: 14,
    shadowOffset: { width: 0, height: 13 },
    shadowOpacity: 0.08,
    shadowRadius: 13,
    elevation: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  metricEmoji: { fontSize: 28 },
  metricLabel: {
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 36,
    marginHorizontal: 4,
  },
  editHint: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  notes: {
    marginTop: 10,
    fontStyle: 'italic',
    lineHeight: 18,
    opacity: 0.8,
  },
});
