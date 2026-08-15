/**
 * HealthHub — Home screen health tools grid
 * Featured wellness dashboard card + 2×2 grid of tool cards.
 */
import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '@hooks/useTheme';
import { Icon, AppIcon } from '@components/ui';
import icons from '../../../assets/icons';

const { width: W } = Dimensions.get('window');
const CARD_GAP = 12;

interface HealthHubProps {
  isCycleUser: boolean | undefined;
  activeMeds: number;
  msgCount: number;
  onWellnessDashboard: () => void;
  onCycleTracker: () => void;
  onMedications: () => void;
  onAISuggestions: () => void;
  onMessages: () => void;
}

export const HealthHub = memo(function HealthHub({
  isCycleUser,
  activeMeds,
  msgCount,
  onWellnessDashboard,
  onCycleTracker,
  onMedications,
  onAISuggestions,
  onMessages,
}: HealthHubProps) {
  const { colors, spacing, typography } = useTheme();

  return (
    <View>
      {/* Section title */}
      <View style={{ marginBottom: spacing[4] }}>
        <Text style={{ color: colors.textPrimary, fontSize: typography.xl, fontWeight: '800', letterSpacing: -0.3, marginBottom: spacing[1] }}>
          Health Hub
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: typography.xs }}>
          Your wellness tools in one place
        </Text>
      </View>

      {/* Featured — Wellness Dashboard */}
      <TouchableOpacity
        onPress={onWellnessDashboard}
        activeOpacity={0.85}
        style={[styles.featuredCard, {
          backgroundColor: colors.surface,
          shadowColor: colors.shadowColor,
          marginBottom: CARD_GAP,
        }]}
      >
        <View style={{ height: 4, backgroundColor: colors.luteal }} />
        <View style={{ padding: spacing[5] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <View style={[styles.iconBox, { backgroundColor: colors.luteal + '18', marginBottom: spacing[3] }]}>
                <AppIcon source={icons.wellness} size={32} />
              </View>
              <Text style={{ color: colors.textPrimary, fontSize: typography.xl, fontWeight: '800', marginBottom: spacing[2] }}>
                Wellness Dashboard
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: typography.sm, lineHeight: 20 }}>
                Track mood, sleep, energy, and stress patterns
              </Text>
            </View>
            <Icon name="chevron-right" size={24} color={colors.textSecondary} />
          </View>
        </View>
      </TouchableOpacity>

      {/* Row 1 */}
      <View style={[styles.row, { gap: CARD_GAP, marginBottom: CARD_GAP }]}>
        {/* Cycle Tracker / Analytics */}
        <TouchableOpacity
          onPress={onCycleTracker}
          activeOpacity={0.85}
          style={[styles.gridCard, { backgroundColor: colors.surface, shadowColor: colors.shadowColor }]}
        >
          <View style={{ height: 3, backgroundColor: isCycleUser ? colors.menstrual : colors.ovulationColor }} />
          <View style={{ padding: spacing[4] }}>
            <View style={[styles.smallIconBox, {
              backgroundColor: (isCycleUser ? colors.menstrual : colors.ovulationColor) + '18',
              marginBottom: spacing[3],
            }]}>
              <AppIcon source={isCycleUser ? icons.menstruation : icons.search} size={26} />
            </View>
            <Text style={{ color: colors.textPrimary, fontSize: typography.base, fontWeight: '700', marginBottom: spacing[1] }} numberOfLines={1}>
              {isCycleUser ? 'Cycle Tracker' : 'Analytics'}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: typography.xs, lineHeight: 16 }} numberOfLines={2}>
              {isCycleUser ? 'Cycle analytics & insights' : 'Wellness patterns'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Medications */}
        <TouchableOpacity
          onPress={onMedications}
          activeOpacity={0.85}
          style={[styles.gridCard, { backgroundColor: colors.surface, shadowColor: colors.shadowColor }]}
        >
          <View style={{ height: 3, backgroundColor: colors.primary }} />
          <View style={{ padding: spacing[4] }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={[styles.smallIconBox, { backgroundColor: colors.primary + '18', marginBottom: spacing[3] }]}>
                <AppIcon source={icons.healthcare} size={26} />
              </View>
              {activeMeds > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.badgeText}>{activeMeds > 99 ? '99+' : activeMeds}</Text>
                </View>
              )}
            </View>
            <Text style={{ color: colors.textPrimary, fontSize: typography.base, fontWeight: '700', marginBottom: spacing[1] }} numberOfLines={1}>
              Medications
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: typography.xs, lineHeight: 16 }} numberOfLines={2}>
              Track meds & reminders
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Row 2 */}
      <View style={[styles.row, { gap: CARD_GAP }]}>
        {/* AI Insights */}
        <TouchableOpacity
          onPress={onAISuggestions}
          activeOpacity={0.85}
          style={[styles.gridCard, { backgroundColor: colors.surface, shadowColor: colors.shadowColor }]}
        >
          <View style={{ height: 3, backgroundColor: colors.luteal }} />
          <View style={{ padding: spacing[4] }}>
            <View style={[styles.smallIconBox, { backgroundColor: colors.luteal + '18', marginBottom: spacing[3] }]}>
              <AppIcon source={icons.robotWriting} size={26} />
            </View>
            <Text style={{ color: colors.textPrimary, fontSize: typography.base, fontWeight: '700', marginBottom: spacing[1] }} numberOfLines={1}>
              AI Insights
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: typography.xs, lineHeight: 16 }} numberOfLines={2}>
              Personalized tips
            </Text>
          </View>
        </TouchableOpacity>

        {/* Partner Messages */}
        <TouchableOpacity
          onPress={onMessages}
          activeOpacity={0.85}
          style={[styles.gridCard, { backgroundColor: colors.surface, shadowColor: colors.shadowColor }]}
        >
          <View style={{ height: 3, backgroundColor: colors.follicular }} />
          <View style={{ padding: spacing[4] }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={[styles.smallIconBox, { backgroundColor: colors.follicular + '18', marginBottom: spacing[3] }]}>
                <AppIcon source={icons.chat} size={26} />
              </View>
              {msgCount > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.follicular }]}>
                  <Text style={styles.badgeText}>{msgCount > 99 ? '99+' : msgCount}</Text>
                </View>
              )}
            </View>
            <Text style={{ color: colors.textPrimary, fontSize: typography.base, fontWeight: '700', marginBottom: spacing[1] }} numberOfLines={1}>
              Partner
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: typography.xs, lineHeight: 16 }} numberOfLines={2}>
              Messages & insights
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  featuredCard: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
  },
  gridCard: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  smallIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
});
