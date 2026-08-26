/**
 * TodayInsightCard — "امروز چه چیزی دیده‌ام؟"
 *
 * The single thing the engine noticed, with its confidence stated plainly
 * and its evidence one tap away. Everything shown here comes from the
 * server's insight engine; nothing is derived on the device, so what the
 * user reads matches what notifications and the partner view are working
 * from.
 *
 * Learning Mode is a first-class state, not an empty state. A user the
 * engine does not know yet gets an honest sentence about what is missing,
 * never a hedged pattern claim.
 */
import React, { memo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@hooks/useTheme';
import { toFa } from '@utils/persian';
import { spacing as spacingScale } from '@theme/spacing';
import { track } from '@analytics';
import type { Insight, InsightConfidence } from '@types/intelligence.types';
import { AppIcon } from '@components/ui';
import icons, { type AppIconName } from '@assets/icons';

/**
 * These were emoji, which the design rules forbid outright. They now use the
 * full-colour PNG set in `assets/icons` rather than the theme-tinted
 * illustrated SVGs: the SVGs recolour to the brand, which made every icon on
 * the screen the same green as everything else. Colour is the point here.
 */
const KIND_ICON: Record<string, AppIconName> = {
  deviation: 'healthcare',       // a measured change — heart/pulse
  phase:     'menstruation',     // cycle calendar
  symptom:   'betterHealth',     // physical signal
  coverage:  'userInfoWriting',  // how much has been logged
};

/**
 * Confidence gets a colour, but never a "high/low" framing — the words the
 * server sends ("نشانه‌ی اولیه", "الگوی تثبیت‌شده") already describe how
 * much history is behind the claim, which is the thing the user needs.
 */
function confidenceColor(
  confidence: InsightConfidence,
  colors: ReturnType<typeof useTheme>['colors'],
): { fg: string; bg: string } {
  switch (confidence) {
    case 'established':
      return { fg: colors.success, bg: colors.successBg };
    case 'repeated':
      return { fg: colors.primary, bg: colors.primaryLighter };
    case 'emerging':
      return { fg: colors.textSecondary, bg: colors.borderSubtle };
    default:
      return { fg: colors.textTertiary, bg: colors.borderSubtle };
  }
}

/** Render the evidence block as plain, checkable rows. */
function EvidenceRows({ insight }: { insight: Insight }) {
  const { colors, typography } = useTheme();
  const e = insight.evidence as Record<string, any>;

  const rows: Array<[string, string]> = [];
  if (typeof e.observations === 'number') {
    rows.push(['روزهای ثبت‌شده', toFa(e.observations)]);
  }
  if (typeof e.occurrences === 'number') {
    rows.push(['دفعات ثبت', toFa(e.occurrences)]);
  }
  if (typeof e.cycles === 'number') {
    rows.push(['چرخه‌های بررسی‌شده', toFa(e.cycles)]);
  }
  if (typeof e.recent_observations === 'number') {
    rows.push(['روزهای اخیر', toFa(e.recent_observations)]);
  }
  if (typeof e.baseline_observations === 'number') {
    rows.push(['روزهای مبنا', toFa(e.baseline_observations)]);
  }
  if (Array.isArray(e.cycle_day_range)) {
    rows.push([
      'بازه‌ی روز چرخه',
      `${toFa(e.cycle_day_range[0])} تا ${toFa(e.cycle_day_range[1])}`,
    ]);
  }
  if (insight.window_days) {
    rows.push(['بازه‌ی بررسی', `${toFa(insight.window_days)} روز`]);
  }
  if (insight.times_seen && insight.times_seen > 1) {
    rows.push(['دفعات مشاهده', toFa(insight.times_seen)]);
  }

  if (rows.length === 0) {
    return null;
  }

  return (
    <View style={{ gap: 6, marginTop: 10 }}>
      {rows.map(([label, value]) => (
        <View key={label} style={styles.evidenceRow}>
          <Text style={{ color: colors.textTertiary, fontSize: typography.caption }}>
            {label}
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: typography.caption,
              fontWeight: '700',
            }}
          >
            {value}
          </Text>
        </View>
      ))}
    </View>
  );
}

interface Props {
  insight: Insight | null;
  learningMode: boolean;
  isLoading?: boolean;
  onSeeAll?: () => void;
}

export const TodayInsightCard = memo(function TodayInsightCard({
  insight,
  learningMode,
  isLoading,
  onSeeAll,
}: Props) {
  const { colors, typography, borderRadius, shadow } = useTheme();
  const [showEvidence, setShowEvidence] = useState(false);

  const cardStyle = [
    styles.card,
    {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: borderRadius.xl,
      ...shadow.xs,
    },
  ];

  if (isLoading) {
    return (
      <View style={cardStyle}>
        <Text style={{ color: colors.textTertiary, fontSize: typography.bodySmall }}>
          در حال بررسی داده‌هایت…
        </Text>
      </View>
    );
  }

  if (!insight) {
    // Not an error and not a gap to fill: there is genuinely nothing
    // supportable to say today.
    return (
      <View style={cardStyle}>
        <Text
          style={{
            color: colors.textPrimary,
            fontSize: typography.body,
            fontWeight: '700',
          }}
        >
          امروز چیز تازه‌ای ندیده‌ام
        </Text>
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: typography.bodySmall,
            marginTop: 6,
            lineHeight: 20,
          }}
        >
          داده‌هایت در محدوده‌ی معمول خودت است. همین هم یک خبر است.
        </Text>
      </View>
    );
  }

  const tone = confidenceColor(insight.confidence, colors);
  const iconName = KIND_ICON[insight.kind] ?? 'wellness';

  return (
    <View style={cardStyle}>
      <View style={styles.headRow}>
        <View
          style={[
            styles.iconBg,
            { backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius.lg },
          ]}
        >
          <AppIcon source={icons[iconName]} size={24} />
        </View>
        <Text
          style={[
            styles.title,
            { color: colors.textPrimary, fontSize: typography.body },
          ]}
        >
          {insight.title_fa}
        </Text>
      </View>

      <Text
        style={{
          color: colors.textSecondary,
          fontSize: typography.bodySmall,
          lineHeight: 21,
        }}
      >
        {insight.body_fa}
      </Text>

      <View style={styles.footRow}>
        {!learningMode && (
          <View
            style={[
              styles.confidenceChip,
              { backgroundColor: tone.bg, borderRadius: borderRadius.pill },
            ]}
          >
            <Text
              style={{ color: tone.fg, fontSize: typography.overline, fontWeight: '700' }}
            >
              {insight.confidence_label_fa}
            </Text>
          </View>
        )}

        {insight.kind !== 'coverage' && (
          <TouchableOpacity
            onPress={() => {
              setShowEvidence((v) => {
                if (!v) {
                  track('insight_explanation_opened', {
                    insight_key: insight.key,
                    insight_kind: insight.kind,
                  });
                }
                return !v;
              });
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={showEvidence ? 'بستن شواهد' : 'چرا این را می‌بینم؟'}
            style={styles.whyBtn}
          >
            <Icon
              name={showEvidence ? 'chevron-up' : 'information-outline'}
              size={15}
              color={colors.primary}
            />
            <Text
              style={{
                color: colors.primary,
                fontSize: typography.caption,
                fontWeight: '700',
              }}
            >
              {showEvidence ? 'بستن' : 'چرا این را می‌بینم؟'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {showEvidence && (
        <View
          style={[
            styles.evidenceBox,
            { borderTopColor: colors.borderSubtle, borderRadius: borderRadius.md },
          ]}
        >
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: typography.caption,
              lineHeight: 18,
            }}
          >
            این نتیجه فقط از داده‌های ثبت‌شده‌ی خودت محاسبه شده است:
          </Text>
          <EvidenceRows insight={insight} />
        </View>
      )}

      {onSeeAll && insight.kind !== 'coverage' && (
        <TouchableOpacity
          onPress={onSeeAll}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="مشاهده همه الگوها"
          style={{ alignItems: 'center', marginTop: 12 }}
        >
          <Text
            style={{
              color: colors.primary,
              fontSize: typography.bodySmall,
              fontWeight: '700',
            }}
          >
            مشاهده همه الگوها
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  // 14 was off the 4px scale entirely and disagreed with the hero (20) and
  // the other Home cards (16), so the three blocks' text never shared a
  // right margin in RTL. One card-interior token for all of them.
  card: { borderWidth: 1, padding: spacingScale[4], overflow: 'hidden' },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  iconBg: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  title: { fontWeight: '700', flex: 1 },
  footRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 8,
  },
  confidenceChip: { paddingHorizontal: 10, paddingVertical: 4 },
  whyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  evidenceBox: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  evidenceRow: { flexDirection: 'row', justifyContent: 'space-between' },
});
