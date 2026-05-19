import React, { useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@hooks/useTheme';
import { useWellnessLogs } from '@hooks/queries/useWellness';
import { Card, LoadingState, ErrorState, EmptyState, Badge, TabIcon } from '@components/ui';
import { WellnessMetricSlider } from '@components/wellness/WellnessMetricSlider';
import { formatDate } from '@utils/dateUtils';
import icons from '../../assets/icons';
import type { WellnessLog } from '@types/wellness.types';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { WellnessScreenProps } from '@navigation/types';

type Props = WellnessScreenProps<'WellnessDashboard'>;

export default function WellnessDashboardScreen() {
  const navigation = useNavigation<Props['navigation']>();
  const { colors, spacing, typography } = useTheme();
  const { data: logs, isLoading, isError, error, refetch } = useWellnessLogs();

  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const renderItem = useCallback(({ item }: { item: WellnessLog }) => (
    <Card style={{ marginBottom: spacing[3] }}>
      <View style={styles.logHeader}>
        <Text style={{ color: colors.textPrimary, fontSize: typography.base, fontWeight: '600' }}>
          {formatDate(item.date)}
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('LogWellness', { logId: item.id })}
          accessibilityLabel="Edit wellness log"
        >
          <Text style={{ color: colors.primary, fontSize: typography.sm }}>Edit</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.moodRow, { marginTop: spacing[3], marginBottom: spacing[3] }]}>
        <MoodBadge
          value={item.mood_level}
          colors={colors}
          spacing={spacing}
          typography={typography}
        />

        <Badge
          label={`Sleep ${item.sleep_hours}h`}
          variant="info"
          style={{ marginLeft: spacing[2] }}
          icon="bed-outline"
        />

        <Badge
          label={`Energy ${item.energy_level}/10`}
          variant="success"
          style={{ marginLeft: spacing[2] }}
          icon="battery-high"
        />
      </View>

      <WellnessMetricSlider
        label="Stress"
        value={item.stress_level}
        max={10}
        icon="brain"
        colorOverride={item.stress_level > 6 ? colors.error : colors.warning}
      />

      <WellnessMetricSlider
        label="Mood"
        value={item.mood_level}
        max={5}
        icon="emoticon-outline"
      />

      <WellnessMetricSlider
        label="Energy"
        value={item.energy_level}
        max={10}
        icon="battery-high"
      />

      {item.notes ? (
        <Text style={{ color: colors.textSecondary, fontSize: typography.sm, marginTop: spacing[2], fontStyle: 'italic' }}>
          "{item.notes}"
        </Text>
      ) : null}
    </Card>
  ), [navigation, colors, spacing, typography]);

  const keyExtractor = useCallback((item: WellnessLog) => String(item.id), []);

  if (isLoading) return <LoadingState fullScreen message="Loading wellness logs…" />;
  if (isError)   return <ErrorState fullScreen error={error} onRetry={refetch} />;

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <View style={[styles.hero, { backgroundColor: colors.surface, borderColor: colors.border, margin: spacing[5], marginBottom: spacing[3] }]}>
        <View style={styles.heroCopy}>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>Wellness</Text>
          <Text style={[styles.title, { color: colors.textPrimary, fontSize: typography['2xl'] }]}>
            Daily check-ins
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: typography.sm, fontWeight: '600' }}>
            {logs?.length ?? 0} entries
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('LogWellness', {})}
          accessibilityLabel="Log today's wellness"
          style={[styles.logBtn, { backgroundColor: colors.primaryDark }]}
        >
          <TabIcon source={icons.betterHealth} size={18} color={colors.textOnPrimary} />
          <Text style={{ color: colors.textOnPrimary, fontSize: typography.sm, fontWeight: '800', marginLeft: 6 }}>
            Log
          </Text>
        </TouchableOpacity>
      </View>
      <View style={{ paddingHorizontal: spacing[5], marginBottom: spacing[3] }}>
        <TouchableOpacity
          onPress={() => navigation.navigate('Medications')}
          accessibilityLabel="Open medications"
          style={[styles.logBtn, { backgroundColor: colors.primary }]}
        >
          <Icon name="heart" size={18} color={colors.textOnPrimary} />
          <Text style={{ color: colors.textOnPrimary, fontSize: typography.sm, fontWeight: '800', marginLeft: 6 }}>
            Medications
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={logs}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={{ paddingHorizontal: spacing[5], paddingBottom: spacing[8] }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="💚"
            title="No wellness logs yet"
            description="Start tracking your daily wellness to see patterns over time."
            actionLabel="Log Today"
            onAction={() => navigation.navigate('LogWellness', {})}
          />
        }
        removeClippedSubviews
        maxToRenderPerBatch={8}
        windowSize={5}
        initialNumToRender={6}
      />
    </View>
  );
}

function MoodBadge({ value, colors, spacing, typography }: { value: number; colors: any; spacing: any; typography: any }) {
  const MOODS = ['😢', '😕', '😐', '🙂', '😄'];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceSecondary, borderRadius: 8, paddingHorizontal: spacing[2], paddingVertical: 2 }}>
      <Text style={{ fontSize: 14 }}>{MOODS[Math.min(value - 1, 4)]}</Text>
      <Text style={{ color: colors.textSecondary, fontSize: typography.xs, marginLeft: 4 }}>Mood {value}/5</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex:       { flex: 1 },
  hero:       { borderRadius: 24, borderWidth: 1, padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroCopy:   { flex: 1, marginRight: 14 },
  eyebrow:    { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', marginBottom: 4 },
  title:      { fontWeight: '800', letterSpacing: 0, marginBottom: 5 },
  logBtn:     { flexDirection: 'row', alignItems: 'center', borderRadius: 14, paddingVertical: 11, paddingHorizontal: 14 },
  logHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  moodRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
