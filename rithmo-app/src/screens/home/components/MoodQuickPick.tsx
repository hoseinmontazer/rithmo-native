/**
 * MoodQuickPick — Home's "امروز چطوری؟" row.
 *
 * Read-only summary + shortcut, not an inline input. Home showed both an
 * editable mood/energy picker AND a route to the full logger — the same
 * "two ways to do one thing" problem F-02 already removed once elsewhere.
 * This shows what's already logged today (if anything) and a single
 * button into `QuickLogScreen`/the full form for everything else —  no
 * write happens from this component at all.
 *
 * `writeTarget` is kept from the earlier interactive version's contract
 * so `HomeScreen` doesn't need to change: `'other'` (a past day selected on
 * the strip) never shows today's data here — the direct-write path this
 * used to have only ever targeted today, and a past day has nothing of
 * today's to summarize either — so it always renders the shortcut prompt.
 */
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@hooks/useTheme';
import { PressScale } from '@components/ui';
import { toFa } from '@utils/persian';
import { useTodayWellnessLog } from '@hooks/queries/useWellness';

const MOOD_LABELS_FA: Record<number, string> = {
  5: 'خوب',
  4: 'آرام',
  3: 'خسته',
  2: 'بی‌قرار',
  1: 'دلگیر',
};

interface Props {
  onGoFullLog: () => void;
  title?: string;
  writeTarget?: 'today' | 'other';
}

export const MoodQuickPick = memo(function MoodQuickPick({
  onGoFullLog,
  title = 'امروز چطوری؟',
  writeTarget = 'today',
}: Props) {
  const { colors, spacing, borderRadius, typography } = useTheme();
  const { data: todayLog } = useTodayWellnessLog();

  const hasMood = writeTarget === 'today' && todayLog?.mood_level != null;
  const hasEnergy = writeTarget === 'today' && todayLog?.energy_level != null;
  const hasAny = hasMood || hasEnergy;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: borderRadius['2xl'], padding: spacing[5] }]}>
      <Text style={{ color: colors.textPrimary, fontSize: typography.bodySmall, fontWeight: '700' }}>
        {title}
      </Text>

      {hasAny ? (
        <View style={[styles.summaryRow, { marginTop: spacing[3] }]}>
          {hasMood && (
            <View
              style={[
                styles.chip,
                { backgroundColor: colors.primaryLighter, borderRadius: borderRadius.pill },
              ]}
            >
              <Text style={{ color: colors.primaryDark, fontSize: typography.caption, fontWeight: '600' }}>
                {MOOD_LABELS_FA[todayLog!.mood_level] ?? toFa(todayLog!.mood_level)}
              </Text>
            </View>
          )}
          {hasEnergy && (
            <View
              style={[
                styles.chip,
                { backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius.pill },
              ]}
            >
              <Text style={{ color: colors.textSecondary, fontSize: typography.caption, fontWeight: '600' }}>
                انرژی {toFa(todayLog!.energy_level)}
              </Text>
            </View>
          )}
        </View>
      ) : (
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: typography.bodySmall,
            marginTop: spacing[2],
          }}
        >
          هنوز امروز رو ثبت نکردی.
        </Text>
      )}

      <PressScale
        onPress={onGoFullLog}
        style={[styles.fullLogBtn, { backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius.lg, marginTop: spacing[4] }]}
        accessibilityRole="button"
        accessibilityLabel={hasAny ? 'ویرایش ثبت امروز' : 'ثبت امروز — خلق، انرژی، خواب و علائم'}
      >
        <Text style={{ color: colors.textPrimary, fontSize: typography.bodySmall, fontWeight: '500' }}>
          {hasAny ? 'ویرایش' : 'ثبت امروز'}
        </Text>
      </PressScale>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {},
  summaryRow: { flexDirection: 'row', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6 },
  fullLogBtn: { minHeight: 46, alignItems: 'center', justifyContent: 'center' },
});
