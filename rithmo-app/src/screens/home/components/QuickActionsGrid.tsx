/**
 * QuickActionsGrid — Elegant horizontal scroll of action cards
 *
 * Uses custom PNG assets (AppIcon) where available,
 * falls back to MaterialCommunityIcons (Icon) otherwise.
 *
 * Scroll hint: last card peeks at the edge so users know it scrolls.
 */
import React, { memo, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  ImageSourcePropType,
} from 'react-native';
import { useTheme } from '@hooks/useTheme';
import { Icon, AppIcon } from '@components/ui';
import icons from '../../../assets/icons';

const { width: W } = Dimensions.get('window');

// Show ~3.4 cards — the partial 4th card signals scrollability
const CARD_GAP   = 10;
const SIDE_PAD   = 20;
const CARD_WIDTH = (W - SIDE_PAD * 2 - CARD_GAP * 3) / 3.4;
const ICON_SIZE  = CARD_WIDTH * 0.52;

// ── types ─────────────────────────────────────────────────────────────────────

interface Action {
  id: string;
  vectorIcon?: string;
  pngIcon?: ImageSourcePropType;
  label: string;
  iconColor: string;
  completed?: boolean;
  onPress: () => void;
}

// ── single card ───────────────────────────────────────────────────────────────

const ActionCard = memo(function ActionCard({ action }: { action: Action }) {
  const { colors, typography } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scaleAnim, {
      toValue: 0.92,
      useNativeDriver: true,
      speed: 30,
      bounciness: 0,
    }).start();

  const onPressOut = () =>
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 8,
    }).start();

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={action.onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={1}
        style={[styles.card, { width: CARD_WIDTH }]}
      >
        {/* Icon */}
        <View style={styles.iconWrap}>
          {action.pngIcon ? (
            <AppIcon source={action.pngIcon} size={ICON_SIZE} />
          ) : (
            <Icon name={action.vectorIcon!} size={ICON_SIZE} color={action.iconColor} />
          )}
        </View>

        {/* Completion badge */}
        {action.completed && (
          <View style={[styles.completedDot, { backgroundColor: colors.success }]}>
            <Icon name="check" size={9} color="#fff" />
          </View>
        )}

        {/* Label — tight gap below icon */}
        <Text
          style={[
            styles.label,
            { color: colors.textSecondary, fontSize: typography.xs },
          ]}
          numberOfLines={2}
        >
          {action.label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

// ── main component ────────────────────────────────────────────────────────────

interface QuickActionsGridProps {
  isMale: boolean;
  hasCompletedCheckIn: boolean;
  onLogWellness: () => void;
  onLogPeriod: () => void;
  onMoodComplete?: () => void;
}

export const QuickActionsGrid = memo(function QuickActionsGrid({
  isMale,
  hasCompletedCheckIn,
  onLogWellness,
  onLogPeriod,
  onMoodComplete,
}: QuickActionsGridProps) {
  const { colors, typography } = useTheme();

  const actions: Action[] = useMemo(() => {
    const base: Action[] = [
      {
        id: 'mood',
        pngIcon: icons.mentalHealth,
        label: 'Log Mood',
        iconColor: colors.luteal,
        completed: hasCompletedCheckIn,
        onPress: () => {
          onLogWellness();
          if (!hasCompletedCheckIn) onMoodComplete?.();
        },
      },
      {
        id: 'energy',
        pngIcon: icons.betterHealth,
        label: 'Log Energy',
        iconColor: colors.ovulationColor,
        onPress: onLogWellness,
      },
      {
        id: 'sleep',
        pngIcon: icons.wellness,
        label: 'Log Sleep',
        iconColor: colors.primary,
        onPress: onLogWellness,
      },
      {
        id: 'meds',
        pngIcon: icons.drugsAlt,
        label: 'Medications',
        iconColor: colors.follicular,
        onPress: onLogWellness,
      },
    ];

    if (!isMale) {
      base.push({
        id: 'period',
        pngIcon: icons.menstruation,
        label: 'Log Period',
        iconColor: colors.menstrual,
        onPress: onLogPeriod,
      });
    }

    return base;
  }, [colors, hasCompletedCheckIn, isMale, onLogWellness, onLogPeriod, onMoodComplete]);

  return (
    <View>
      {/* Header row: title + scroll hint text */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary, fontSize: typography.lg }]}>
          Quick Actions
        </Text>
        <Text style={[styles.hint, { color: colors.textSecondary, fontSize: typography.xs }]}>
          scroll →
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { gap: CARD_GAP, paddingRight: SIDE_PAD }]}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + CARD_GAP}
        snapToAlignment="start"
      >
        {actions.map(action => (
          <ActionCard key={action.id} action={action} />
        ))}
      </ScrollView>
    </View>
  );
});

// ── styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  hint: {
    fontWeight: '500',
    opacity: 0.5,
  },
  scroll: {
    // no left padding — aligns flush with section padding from HomeScreen
  },
  card: {
    alignItems: 'center',
    gap: 8,           // tight, consistent gap between icon and label
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedDot: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  label: {
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.1,
    lineHeight: 15,
  },
});
