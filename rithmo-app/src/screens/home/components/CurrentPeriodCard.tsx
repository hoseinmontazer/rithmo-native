/**
 * CurrentPeriodCard — "what is recorded, and fix it right here".
 *
 * Always shows the LATEST recorded period on Home, so the last period is
 * never hard to find. Emphasis follows its age: in progress (with "ended
 * today" in one tap), just ended (within RECENT_DAYS), or older (calm, same
 * "edit dates" action). Dates are edited in a small sheet, not a separate
 * form. Renders nothing only when no period has been recorded.
 */
import React, { memo, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@hooks/useTheme';
import { Button, Icon } from '@components/ui';
import { PeriodQuickEditSheet } from '@components/cycle/PeriodQuickEditSheet';
import { usePatchPeriod, usePeriods } from '@hooks/queries/usePeriods';
import { useToast } from '../../../context/ToastContext';
import { todayISO } from '@utils/dateUtils';
import { toFa } from '@utils/persian';
import { describePeriodSpan, mapPeriodError, pickCurrentPeriod } from '@utils/periodCalendar';

export const CurrentPeriodCard = memo(function CurrentPeriodCard() {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const navigation = useNavigation<any>();
  const toast = useToast();
  const { data: periods } = usePeriods();
  const patch = usePatchPeriod();
  const [editing, setEditing] = useState(false);

  const today = todayISO();
  const current = useMemo(() => pickCurrentPeriod(periods as any[] | undefined, today), [periods, today]);
  if (!current) {return null;}

  const ongoing = current.state === 'ongoing';

  const endToday = () => {
    patch.mutate(
      { id: current.id, data: { end_date: today } },
      {
        onSuccess: () =>
          toast.success('پایان دوره ثبت شد', 'اگر تاریخش درست نیست، «ویرایش تاریخ‌ها» را بزن.'),
        onError: (err: any) => toast.error('ثبت نشد', mapPeriodError(err).message),
      },
    );
  };

  const title = ongoing
    ? `دوره‌ی جاری · روز ${toFa(current.dayNumber)}`
    : current.state === 'recent'
    ? 'آخرین دوره‌ات تازه تمام شده'
    : 'آخرین دوره‌ی ثبت‌شده';
  const ago =
    current.state === 'past'
      ? `${toFa(current.daysSinceEnd)} روز پیش تمام شد`
      : null;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: borderRadius.xl,
          padding: spacing[4],
          marginTop: spacing[3],
        },
      ]}
    >
      {/* The period itself is the link: tapping the recorded dates opens the
          date editor, so correcting them is where the user already looks. */}
      <TouchableOpacity
        onPress={() => setEditing(true)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${describePeriodSpan({ start: current.start_date, end: current.end_date })}. برای ویرایش تاریخ‌ها لمس کن`}
        style={styles.headerRow}
      >
        {/* Same solid red as a recorded day on the calendar */}
        <View style={[styles.swatch, { backgroundColor: colors.menstrual }]} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.textPrimary, fontSize: typography.base }]}>{title}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: typography.sm, marginTop: 2 }}>
            {describePeriodSpan({ start: current.start_date, end: current.end_date })}
          </Text>
          {ago ? (
            <Text style={{ color: colors.textTertiary, fontSize: typography.xs, marginTop: 2 }}>{ago}</Text>
          ) : null}
        </View>
        <View style={[styles.editHint, { backgroundColor: colors.surfaceSecondary }]}>
          <Icon name="pencil-outline" size={18} color={colors.primary} />
        </View>
      </TouchableOpacity>

      <View style={[styles.actions, { marginTop: spacing[3] }]}>
        {ongoing ? (
          <View style={{ flex: 1 }}>
            <Button
              label="امروز تمام شد"
              onPress={endToday}
              loading={patch.isPending}
              disabled={patch.isPending}
              size="md"
              fullWidth
            />
          </View>
        ) : null}
        <View style={{ flex: 1 }}>
          <Button
            label="ویرایش تاریخ‌ها"
            onPress={() => setEditing(true)}
            variant={ongoing ? 'secondary' : 'primary'}
            size="md"
            fullWidth
          />
        </View>
      </View>

      <PeriodQuickEditSheet
        visible={editing}
        period={current}
        onClose={() => setEditing(false)}
        onOpenFullEdit={(periodId) =>
          navigation.navigate('CycleTab', { screen: 'EditPeriod', params: { periodId } })
        }
      />
    </View>
  );
});

const styles = StyleSheet.create({
  card: { borderWidth: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  swatch: { width: 16, height: 16, borderRadius: 8 },
  editHint: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 12 },
});
