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
  const { colors, typography, borderRadius, shadow } = useTheme();

  // ── Not yet logged ────────────────────────────────────────────────────────
  if (!isLoading && !log) {
    return (
      <TouchableOpacity
        onPress={onLogPress}
        activeOpacity={0.8}
        style={[
          styles.ctaCard,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: borderRadius.large,
            ...shadow.xs,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel="ثبت وضعیت امروز"
      >
        <View style={[styles.ctaIconBadge, { backgroundColor: colors.surfaceSubtle, borderRadius: borderRadius.medium }]}>
          <Text style={{ fontSize: 20 }}>✏️</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.ctaTitle, { color: colors.textPrimary, fontSize: typography.body }]}>
            ثبت وضعیت امروز
          </Text>
          <Text style={[styles.ctaSub, { color: colors.textSecondary, fontSize: typography.bodySmall }]}>
            حال و انرژی امروزت رو ثبت کن
          </Text>
        </View>
        <View style={[styles.logBtn, { backgroundColor: colors.primary, borderRadius: borderRadius.small }]}>
          <Text style={{ color: colors.textOnPrimary, fontSize: typography.label, fontWeight: '700' }}>
            ثبت
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
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: borderRadius.large,
          ...shadow.xs,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel="ویرایش ثبت امروز"
    >
      <View style={styles.row}>
        {/* Mood */}
        <View style={styles.metricItem}>
          <Text style={styles.metricEmoji}>{MOOD_EMOJI[moodKey] ?? '😐'}</Text>
          <Text style={[styles.metricLabel, { color: colors.textTertiary, fontSize: typography.label }]}>خلق</Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

        {/* Energy */}
        <View style={styles.metricItem}>
          <Text style={styles.metricEmoji}>{ENERGY_EMOJI[energyKey] ?? '😌'}</Text>
          <Text style={[styles.metricLabel, { color: colors.textTertiary, fontSize: typography.label }]}>انرژی</Text>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

        {/* Pain */}
        <View style={styles.metricItem}>
          <Text style={styles.metricEmoji}>{PAIN_EMOJI[painKey] ?? '✅'}</Text>
          <Text style={[styles.metricLabel, { color: colors.textTertiary, fontSize: typography.label }]}>درد</Text>
        </View>

        {/* Edit hint */}
        <View style={[styles.editHint, { backgroundColor: colors.surfaceSubtle, borderColor: colors.borderSubtle, borderRadius: borderRadius.small }]}>
          <Text style={{ color: colors.textSecondary, fontSize: typography.caption, fontWeight: '600' }}>ویرایش</Text>
        </View>
      </View>

      {log.notes ? (
        <Text
          style={[styles.notes, { color: colors.textSecondary, fontSize: typography.bodySmall }]}
          numberOfLines={2}
        >
          «{log.notes}»
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
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  ctaIconBadge: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaTitle: {
    fontWeight: '700',
  },
  ctaSub: {
    marginTop: 2,
  },
  logBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  card: {
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
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
  metricEmoji: {
    fontSize: 24,
  },
  metricLabel: {
    fontWeight: '600',
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 32,
    marginHorizontal: 4,
  },
  editHint: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginHorizontal: 4,
  },
  notes: {
    marginTop: 10,
    fontStyle: 'italic',
    lineHeight: 18,
  },
});

