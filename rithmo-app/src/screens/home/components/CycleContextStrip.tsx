/**
 * CycleContextStrip — «کجای چرخه‌ام هستم؟» and nothing else.
 *
 * Replaces CycleContextCard on Home. Three things changed, all deliberate:
 *
 * 1. **Flat, not elevated.** It was a full card with the same weight as the
 *    insight below it, so Home opened with two things competing to be the
 *    headline. Context is orientation; the insight is the story. A strip
 *    reads as "where you are" without claiming to be the point.
 *
 * 2. **No advice.** The card carried «روزهای دوره‌ای — استراحت، مایعات گرم و
 *    مراقبت از خودت» — generic wellness copy that is true of everyone and
 *    therefore says nothing about *her*. Context answers "where am I", not
 *    "what should I do"; the recommendation below is derived from her own
 *    data and is the only place guidance belongs.
 *
 * 3. **Plain-language phase.** «فولیکولار» is a transliterated clinical term
 *    most users do not know. The everyday wording leads; the clinical name
 *    is still available on the Cycle screen for anyone who wants it.
 *
 * Data comes from `/api/intelligence/today/`, which Home already fetches —
 * this removed a duplicate `/api/analytics/cycle/` request rather than
 * adding one.
 */

import React, { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@hooks/useTheme';
import { toFa } from '@utils/persian';
import { phasePlainLabel } from '@i18n';
import type { CycleContextPayload } from '@types/intelligence.types';

interface Props {
  cycle?: CycleContextPayload | null;
  onPress: () => void;
  /** Shown when the user has no cycle data at all. */
  onStartTracking: () => void;
}

export const CycleContextStrip = memo(function CycleContextStrip({
  cycle,
  onPress,
  onStartTracking,
}: Props) {
  const { colors, typography, spacing } = useTheme();

  // No cycle yet: one honest line and one action. Never an invented phase.
  if (!cycle || !cycle.is_known) {
    return (
      <TouchableOpacity
        onPress={onStartTracking}
        activeOpacity={0.7}
        style={[styles.row, { paddingVertical: spacing[3] }]}
        accessibilityRole="button"
        accessibilityLabel="ثبت اولین دوره برای شروع دنبال‌کردن چرخه"
      >
        <Text style={{ color: colors.textSecondary, fontSize: typography.bodySmall }}>
          هنوز چرخه‌ای ثبت نشده
        </Text>
        <View style={styles.linkRow}>
          <Text style={{ color: colors.primary, fontSize: typography.bodySmall, fontWeight: '700' }}>
            ثبت دوره
          </Text>
          <Icon name="chevron-left" size={16} color={colors.primary} />
        </View>
      </TouchableOpacity>
    );
  }

  const dayLabel =
    typeof cycle.cycle_day === 'number' && cycle.cycle_day > 0
      ? `روز ${toFa(cycle.cycle_day)} چرخه`
      : null;

  // Everyday wording, derived from the phase used for grouping. Falls back
  // to the served phase so a lifecycle state (late / overdue) still reads.
  const phaseText = phasePlainLabel(cycle.pattern_phase || cycle.phase);

  // Only shown when there is a real prediction. A missing one is silence,
  // never a guess.
  const daysLeft =
    typeof cycle.days_until_next_period === 'number' && cycle.days_until_next_period > 0
      ? `${toFa(cycle.days_until_next_period)} روز تا دوره بعد`
      : null;

  const a11y = [dayLabel, phaseText, daysLeft].filter(Boolean).join('، ');

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.row, { paddingVertical: spacing[3] }]}
      accessibilityRole="button"
      accessibilityLabel={`${a11y}. برای جزئیات چرخه ضربه بزن`}
    >
      <View style={styles.left}>
        <View
          style={[
            styles.dot,
            { backgroundColor: cycle.is_on_period ? colors.menstrual : colors.primary },
          ]}
        />
        <Text
          style={{ color: colors.textPrimary, fontSize: typography.bodySmall, fontWeight: '700' }}
          numberOfLines={1}
        >
          {dayLabel ? `${dayLabel} · ${phaseText}` : phaseText}
        </Text>
      </View>

      <View style={styles.linkRow}>
        {daysLeft ? (
          <Text
            style={{ color: colors.textTertiary, fontSize: typography.caption }}
            numberOfLines={1}
          >
            {daysLeft}
          </Text>
        ) : null}
        <Icon name="chevron-left" size={16} color={colors.textTertiary} />
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  // No background, no border, no shadow — this is a strip, not a card.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 0 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
