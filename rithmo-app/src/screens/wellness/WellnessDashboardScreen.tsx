/**
 * WellnessDashboardScreen — تاریخچه سلامت
 *
 * Rhythmo Design System Redesign.
 * A calm editorial history of daily check-ins, streaks, and metric summaries.
 */
import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@hooks/useTheme';
import { useWellnessLogs } from '@hooks/queries/useWellness';
import { Card, LoadingState, ErrorState, EmptyState, Badge, Button } from '@components/ui';
import { formatDate } from '@utils/dateUtils';
import type { WellnessLog } from '../../types/wellness.types';
import type { WellnessScreenProps } from '@navigation/types';

type Props = WellnessScreenProps<'WellnessDashboard'>;

export default function WellnessDashboardScreen() {
  const navigation = useNavigation<Props['navigation']>();
  const { colors, spacing, typography, borderRadius } = useTheme();
  const { data: logs, isLoading, isError, error, refetch } = useWellnessLogs();

  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const renderItem = useCallback(({ item }: { item: WellnessLog }) => (
    <Card elevated={false} style={{ marginBottom: spacing[3], padding: spacing[4] }}>
      <View style={styles.logHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={[styles.dateDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.logDateText, { color: colors.textPrimary, fontSize: typography.base }]}>
            {formatDate(item.date)}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('LogWellness', { logId: item.id })}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={[styles.editBtn, { backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius.sm }]}
          accessibilityLabel="ویرایش گزارش سلامت"
        >
          <Icon name="pencil-outline" size={14} color={colors.textSecondary} />
          <Text style={{ color: colors.textSecondary, fontSize: typography.xs, marginLeft: 4, fontWeight: '600' }}>
            ویرایش
          </Text>
        </TouchableOpacity>
      </View>

      {/* Metric chips row */}
      <View style={[styles.chipsRow, { gap: spacing[2], marginVertical: spacing[3] }]}>
        <View style={[styles.metricChip, { backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius.md }]}>
          <Icon name="weather-night" size={14} color={colors.primary} />
          <Text style={[styles.metricChipText, { color: colors.textPrimary, fontSize: typography.xs }]}>
            {item.sleep_hours}س خواب
          </Text>
        </View>

        <View style={[styles.metricChip, { backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius.md }]}>
          <Icon name="emoticon-outline" size={14} color={colors.luteal} />
          <Text style={[styles.metricChipText, { color: colors.textPrimary, fontSize: typography.xs }]}>
            خلق {item.mood_level}/5
          </Text>
        </View>

        <View style={[styles.metricChip, { backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius.md }]}>
          <Icon name="lightning-bolt-outline" size={14} color={colors.ovulation} />
          <Text style={[styles.metricChipText, { color: colors.textPrimary, fontSize: typography.xs }]}>
            انرژی {item.energy_level}/10
          </Text>
        </View>

        {item.stress_level != null && item.stress_level > 0 && (
          <View style={[styles.metricChip, { backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius.md }]}>
            <Icon name="meditation" size={14} color={colors.menstrual} />
            <Text style={[styles.metricChipText, { color: colors.textPrimary, fontSize: typography.xs }]}>
              استرس {item.stress_level}/10
            </Text>
          </View>
        )}
      </View>

      {/* Optional symptoms list */}
      {item.symptoms ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: spacing[2] }}>
          {item.symptoms.split(',').map((sym, idx) => (
            <Badge key={idx} label={sym.trim()} variant="neutral" />
          ))}
        </View>
      ) : null}

      {/* Optional notes */}
      {item.notes ? (
        <Text style={[styles.notesText, { color: colors.textSecondary, fontSize: typography.xs, marginTop: spacing[1] }]}>
          «{item.notes}»
        </Text>
      ) : null}
    </Card>
  ), [navigation, colors, spacing, typography, borderRadius]);

  const keyExtractor = useCallback((item: WellnessLog) => String(item.id), []);

  if (isLoading) {
    return <LoadingState fullScreen message="در حال بارگذاری گزارش‌های سلامت..." />;
  }
  if (isError) {
    return <ErrorState fullScreen error={error} onRetry={refetch} />;
  }

  const logCount = logs?.length ?? 0;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <View style={[styles.headerSection, { paddingHorizontal: spacing[4], paddingTop: spacing[2], marginBottom: spacing[3] }]}>
        <View>
          <Text style={[styles.overline, { color: colors.textTertiary, fontSize: typography.xs }]}>
            ریتمو · تاریخچه سلامت
          </Text>
          <Text style={[styles.screenTitle, { color: colors.textPrimary, fontSize: typography['2xl'] }]}>
            گزارش‌های روزانه
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: typography.sm }]}>
            {logCount > 0 ? `${logCount} گزارش ثبت‌شده` : 'هنوز گزارشی ثبت نشده است'}
          </Text>
        </View>
      </View>

      {/* ── Quick Action Shortcuts ──────────────────────────────────── */}
      <View style={[styles.actionsRow, { paddingHorizontal: spacing[4], gap: spacing[2], marginBottom: spacing[3] }]}>
        <Button
          label="ثبت گزارش جدید"
          variant="primary"
          size="sm"
          onPress={() => navigation.navigate('LogWellness', {})}
          icon={<Icon name="plus" size={16} color="#fff" />}
          style={{ flex: 1 }}
        />
        <Button
          label="داروها و مکمل‌ها"
          variant="secondary"
          size="sm"
          onPress={() => navigation.navigate('Medications')}
          icon={<Icon name="pill" size={16} color={colors.textPrimary} />}
          style={{ flex: 1 }}
        />
      </View>

      {/* ── Logs List ───────────────────────────────────────────────── */}
      <FlatList
        data={logs}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={{ paddingHorizontal: spacing[4], paddingBottom: spacing[12] }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            title="هنوز گزارشی ثبت نشده"
            description="با ثبت اولین وضعیت روزانه، الگوها و روندهای سلامتت شکل می‌گیرند."
            actionLabel="ثبت وضعیت امروز"
            onAction={() => navigation.navigate('LogWellness', {})}
          />
        }
        removeClippedSubviews
        maxToRenderPerBatch={8}
        windowSize={5}
        initialNumToRender={6}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  overline: {
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  screenTitle: {
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontWeight: '500',
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  logDateText: {
    fontWeight: '700',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metricChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  metricChipText: {
    fontWeight: '600',
  },
  notesText: {
    lineHeight: 18,
  },
});
