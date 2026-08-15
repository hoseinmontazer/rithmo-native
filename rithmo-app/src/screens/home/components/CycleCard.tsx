/**
 * CycleCard — Home screen cycle information section
 * Handles loading / error / no-data / data states.
 * Adapts for own cycle (female) or partner cycle (male with partner).
 */
import React, { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useTheme } from '@hooks/useTheme';
import { Icon, PhasePill } from '@components/ui';

type Phase = 'menstrual' | 'follicular' | 'ovulation' | 'luteal';

interface CycleCardProps {
  isLoading: boolean;
  hasError: boolean;
  hasData: boolean;
  isPartnerView: boolean;
  partnerName?: string;
  phase: Phase;
  phaseAccent: string;
  daysUntilPeriod: number;
  avgCycleLength: number;
  ovulationDay: number | null;
  isMale: boolean;
  isMaleWithPartner: boolean;
  onPress: () => void;
  onRetry: () => void;
  onSetupPartner: () => void;
  onStartTracking: () => void;
}

export const CycleCard = memo(function CycleCard({
  isLoading,
  hasError,
  hasData,
  isPartnerView,
  partnerName,
  phase,
  phaseAccent,
  daysUntilPeriod,
  avgCycleLength,
  ovulationDay,
  isMale,
  isMaleWithPartner,
  onPress,
  onRetry,
  onSetupPartner,
  onStartTracking,
}: CycleCardProps) {
  const { colors, spacing, typography } = useTheme();

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderRadius: 20,
            padding: spacing[5],
            alignItems: 'center',
            shadowColor: colors.shadowColor,
          },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (hasError) {
    return (
      <TouchableOpacity
        onPress={onRetry}
        activeOpacity={0.85}
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderRadius: 20,
            padding: spacing[5],
            alignItems: 'center',
            shadowColor: colors.shadowColor,
          },
        ]}
      >
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            backgroundColor: colors.menstrualBg,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: spacing[3],
          }}
        >
          <Icon name="alert-circle-outline" size={28} color={colors.menstrual} />
        </View>
        <Text
          style={{
            color: colors.textPrimary,
            fontSize: typography.base,
            fontWeight: '700',
            marginBottom: spacing[1],
            textAlign: 'center',
          }}
        >
          Unable to load cycle data
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: typography.sm, textAlign: 'center' }}>
          Tap to retry
        </Text>
      </TouchableOpacity>
    );
  }

  // ── Has data ─────────────────────────────────────────────────────────────
  if (hasData) {
    const dayInCycle = avgCycleLength - daysUntilPeriod;
    const progress = dayInCycle / avgCycleLength;

    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        style={[
          styles.card,
          {
            backgroundColor: colors.surface,
            borderRadius: 20,
            overflow: 'hidden',
            shadowColor: colors.shadowColor,
          },
        ]}
      >
        {/* Top accent stripe */}
        <View style={{ height: 3, backgroundColor: phaseAccent }} />

        <View style={{ padding: spacing[5] }}>
          {/* Header row */}
          <View style={styles.headerRow}>
            <View>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: typography.xs,
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: 0.6,
                  marginBottom: spacing[2],
                }}
              >
                {isPartnerView ? `${partnerName || 'Partner'}'s Cycle` : 'Cycle Status'}
              </Text>
              <PhasePill phase={phase} />
            </View>

            {/* Mini cycle ring */}
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                borderWidth: 6,
                borderColor: phaseAccent + '30',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View
                style={{
                  position: 'absolute',
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  borderWidth: 6,
                  borderColor: phaseAccent,
                  borderTopColor: 'transparent',
                  borderRightColor: progress > 0.25 ? phaseAccent : 'transparent',
                  borderBottomColor: progress > 0.5 ? phaseAccent : 'transparent',
                  borderLeftColor: progress > 0.75 ? phaseAccent : 'transparent',
                  transform: [{ rotate: '-90deg' }],
                }}
              />
              <Text style={{ color: phaseAccent, fontSize: typography.xl, fontWeight: '800' }}>
                {dayInCycle}
              </Text>
            </View>
          </View>

          {/* Stats row */}
          <View
            style={[
              styles.statsRow,
              {
                paddingTop: spacing[4],
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: colors.border,
              },
            ]}
          >
            <View>
              <Text style={{ color: colors.textSecondary, fontSize: typography.xs, marginBottom: spacing[1] }}>
                Days to period
              </Text>
              <Text style={{ color: colors.textPrimary, fontSize: typography.lg, fontWeight: '700' }}>
                {daysUntilPeriod} days
              </Text>
            </View>
            <View>
              <Text style={{ color: colors.textSecondary, fontSize: typography.xs, marginBottom: spacing[1] }}>
                Ovulation day
              </Text>
              <Text style={{ color: colors.textPrimary, fontSize: typography.lg, fontWeight: '700' }}>
                Day {ovulationDay ?? '—'}
              </Text>
            </View>
            <View>
              <Text style={{ color: colors.textSecondary, fontSize: typography.xs, marginBottom: spacing[1] }}>
                Avg cycle
              </Text>
              <Text style={{ color: colors.textPrimary, fontSize: typography.lg, fontWeight: '700' }}>
                {avgCycleLength} days
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // ── No data — onboarding prompt ──────────────────────────────────────────
  const isMaleNoPartner = isMale && !isMaleWithPartner;
  return (
    <TouchableOpacity
      onPress={isMale ? onSetupPartner : onStartTracking}
      activeOpacity={0.85}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: colors.border,
          borderStyle: 'dashed',
          padding: spacing[5],
          alignItems: 'center',
          shadowColor: colors.shadowColor,
        },
      ]}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 18,
          backgroundColor: colors.primaryLighter,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing[4],
        }}
      >
        <Icon
          name={isMale ? 'account-heart-outline' : 'calendar-plus'}
          size={32}
          color={colors.primary}
        />
      </View>
      <Text
        style={{
          color: colors.textPrimary,
          fontSize: typography.lg,
          fontWeight: '700',
          marginBottom: spacing[2],
          textAlign: 'center',
        }}
      >
        {isMaleNoPartner
          ? 'Stay in Sync with Your Partner'
          : isMaleWithPartner
            ? `${partnerName || 'Partner'}'s Cycle`
            : 'Start Tracking Your Cycle'}
      </Text>
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: typography.sm,
          textAlign: 'center',
          lineHeight: 20,
        }}
      >
        {isMaleNoPartner
          ? 'Connect with your partner to see their cycle phase, upcoming period, and how to best support them.'
          : isMaleWithPartner
            ? `Your partner hasn't logged their cycle yet — remind them to start so you can stay in sync.`
            : 'Log your first period to get personalized cycle predictions, phase insights, and health tips.'}
      </Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    width: '100%',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
