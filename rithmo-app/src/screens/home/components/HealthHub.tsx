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

      {/* Featured — Wellness Dashboard (Purple) */}
      <TouchableOpacity
        onPress={onWellnessDashboard}
        activeOpacity={0.85}
        style={[styles.featuredCard, {
          backgroundColor: palette.accentPurple, // Full bleed color
          shadowColor: colors.shadowColor,
          marginBottom: CARD_GAP,
        }]}
      >
        <View style={{ padding: spacing[5] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: spacing[3] }]}>
                <AppIcon source={icons.wellness} size={32} />
              </View>
              <Text style={{ color: '#FFFFFF', fontSize: typography.xl, fontWeight: '800', marginBottom: spacing[2] }}>
                Wellness Dashboard
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: typography.sm, lineHeight: 20 }}>
                Track mood, sleep, energy, and stress patterns
              </Text>
            </View>
            <Icon name="chevron-right" size={24} color="#FFFFFF" />
          </View>
        </View>
      </TouchableOpacity>

      {/* Row 1 */}
      <View style={[styles.row, { gap: CARD_GAP, marginBottom: CARD_GAP }]}>
        {/* Cycle Tracker / Analytics (Pink) */}
        <TouchableOpacity
          onPress={onCycleTracker}
          activeOpacity={0.85}
          style={[styles.gridCard, { backgroundColor: palette.accentPink, shadowColor: colors.shadowColor }]}
        >
          <View style={{ padding: spacing[4] }}>
            <View style={[styles.smallIconBox, {
              backgroundColor: 'rgba(255,255,255,0.2)',
              marginBottom: spacing[3],
            }]}>
              <AppIcon source={isCycleUser ? icons.menstruation : icons.search} size={26} />
            </View>
            <Text style={{ color: '#FFFFFF', fontSize: typography.base, fontWeight: '700', marginBottom: spacing[1] }} numberOfLines={1}>
              {isCycleUser ? 'Cycle Tracker' : 'Analytics'}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: typography.xs, lineHeight: 16 }} numberOfLines={2}>
              {isCycleUser ? 'Cycle analytics & insights' : 'Wellness patterns'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Medications (Blue) */}
        <TouchableOpacity
          onPress={onMedications}
          activeOpacity={0.85}
          style={[styles.gridCard, { backgroundColor: palette.accentBlue, shadowColor: colors.shadowColor }]}
        >
          <View style={{ padding: spacing[4] }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={[styles.smallIconBox, { backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: spacing[3] }]}>
                <AppIcon source={icons.healthcare} size={26} />
              </View>
              {activeMeds > 0 && (
                <View style={[styles.badge, { backgroundColor: '#FFFFFF' }]}>
                  <Text style={[styles.badgeText, { color: palette.accentBlue }]}>{activeMeds > 99 ? '99+' : activeMeds}</Text>
                </View>
              )}
            </View>
            <Text style={{ color: '#FFFFFF', fontSize: typography.base, fontWeight: '700', marginBottom: spacing[1] }} numberOfLines={1}>
              Medications
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: typography.xs, lineHeight: 16 }} numberOfLines={2}>
              Track meds & reminders
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Row 2 */}
      <View style={[styles.row, { gap: CARD_GAP }]}>
        {/* AI Insights (Orange) */}
        <TouchableOpacity
          onPress={onAISuggestions}
          activeOpacity={0.85}
          style={[styles.gridCard, { backgroundColor: palette.accentOrange, shadowColor: colors.shadowColor }]}
        >
          <View style={{ padding: spacing[4] }}>
            <View style={[styles.smallIconBox, { backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: spacing[3] }]}>
              <AppIcon source={icons.robotWriting} size={26} />
            </View>
            <Text style={{ color: '#FFFFFF', fontSize: typography.base, fontWeight: '700', marginBottom: spacing[1] }} numberOfLines={1}>
              AI Insights
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: typography.xs, lineHeight: 16 }} numberOfLines={2}>
              Personalized tips
            </Text>
          </View>
        </TouchableOpacity>

        {/* Partner Messages (Green - Dark Text) */}
        <TouchableOpacity
          onPress={onMessages}
          activeOpacity={0.85}
          style={[styles.gridCard, { backgroundColor: palette.accentGreen, shadowColor: colors.shadowColor }]}
        >
          <View style={{ padding: spacing[4] }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={[styles.smallIconBox, { backgroundColor: 'rgba(8,8,8,0.1)', marginBottom: spacing[3] }]}>
                <AppIcon source={icons.chat} size={26} />
              </View>
              {msgCount > 0 && (
                <View style={[styles.badge, { backgroundColor: '#080808' }]}>
                  <Text style={[styles.badgeText, { color: palette.accentGreen }]}>{msgCount > 99 ? '99+' : msgCount}</Text>
                </View>
              )}
            </View>
            <Text style={{ color: '#080808', fontSize: typography.base, fontWeight: '700', marginBottom: spacing[1] }} numberOfLines={1}>
              Partner
            </Text>
            <Text style={{ color: 'rgba(8,8,8,0.85)', fontSize: typography.xs, lineHeight: 16 }} numberOfLines={2}>
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
    borderRadius: 8,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 13 },
    shadowOpacity: 0.08,
    shadowRadius: 13,
    elevation: 6,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
  },
  gridCard: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 13 },
    shadowOpacity: 0.08,
    shadowRadius: 13,
    elevation: 6,
  },
  smallIconBox: {
    width: 48,
    height: 48,
    borderRadius: 4,
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
