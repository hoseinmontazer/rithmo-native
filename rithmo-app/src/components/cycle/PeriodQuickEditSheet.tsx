/**
 * PeriodQuickEditSheet — correct a recorded period in one small sheet.
 *
 * The single place to fix the dates of a period: opened from the Home period
 * card, the calendar's day panel and the full edit form, so correcting a
 * mistake is one tap and a direct date choice, not a trip to a separate form.
 * It edits only the two dates (start, end / "still ongoing"); symptoms and
 * medication stay in the full EditPeriod screen, linked from here.
 *
 *  - Each date row shows the CURRENT value; tapping it opens a month grid
 *    right under it (direct selection, one field open at a time).
 *  - The review line always states the span saving will produce.
 *  - Nothing is sent until "ذخیره"; "انصراف" (or tapping outside) discards.
 *  - Client checks (validatePeriodDraft) block impossible ranges and future
 *    dates; the backend stays authoritative and its errors return as plain
 *    Persian (mapPeriodError), with the draft kept so a retry loses nothing.
 *  - Layout: only the date area scrolls; the review and the buttons stay
 *    pinned, so the sheet remains usable on short screens.
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@hooks/useTheme';
import { Button, Icon } from '@components/ui';
import { usePatchPeriod } from '@hooks/queries/usePeriods';
import { useToast } from '../../context/ToastContext';
import { todayISO } from '@utils/dateUtils';
import { faDate, faDateShort, faWeekday } from '@utils/persian';
import { JalaliDatePicker } from './JalaliDatePicker';
import {
  buildPeriodPatch,
  describePeriodSpan,
  hasPeriodChanges,
  mapPeriodError,
  periodDraftFromRecord,
  validatePeriodDraft,
  type PeriodDraft,
  type PeriodErrorInfo,
} from '@utils/periodCalendar';

export interface QuickEditPeriod {
  id: number;
  start_date: string;
  end_date: string | null;
  symptoms?: string | null;
  medication?: string | null;
}

interface Props {
  visible: boolean;
  period: QuickEditPeriod | null;
  onClose: () => void;
  /** Optional: open the full form (symptoms, medication, delete). */
  onOpenFullEdit?: (periodId: number) => void;
}

type Field = 'start' | 'end';

function FieldRow({
  label,
  value,
  open,
  invalid,
  onPress,
}: {
  label: string;
  value: string;
  open: boolean;
  invalid: boolean;
  onPress: () => void;
}) {
  const { colors, spacing, typography, borderRadius } = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${faDate(value, { weekday: true, year: true })}. برای تغییر لمس کن`}
      accessibilityState={{ expanded: open }}
      style={[
        styles.fieldRow,
        {
          backgroundColor: colors.surfaceSecondary,
          borderRadius: borderRadius.lg,
          paddingHorizontal: spacing[4],
          borderWidth: 1.5,
          borderColor: invalid ? colors.error : open ? colors.primary : 'transparent',
        },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.textTertiary, fontSize: typography.xs }}>{label}</Text>
        <Text style={{ color: colors.textPrimary, fontSize: typography.base, fontWeight: '700' }}>
          {faDateShort(value)}
          <Text style={{ color: colors.textSecondary, fontWeight: '400' }}>{`  ${faWeekday(value)}`}</Text>
        </Text>
      </View>
      <Icon name={open ? 'chevron-up' : 'calendar'} size={20} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

export function PeriodQuickEditSheet({ visible, period, onClose, onOpenFullEdit }: Props) {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const toast = useToast();
  const patch = usePatchPeriod();

  const original = useMemo<PeriodDraft | null>(
    () => (period ? periodDraftFromRecord(period) : null),
    [period],
  );
  const [draft, setDraft] = useState<PeriodDraft | null>(original);
  const [error, setError] = useState<PeriodErrorInfo | null>(null);
  const [openField, setOpenField] = useState<Field | null>(null);

  // A fresh draft every time the sheet opens on a period.
  useEffect(() => {
    if (visible && original) {
      setDraft(original);
      setError(null);
      setOpenField(null);
      patch.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, period?.id]);

  if (!period || !original || !draft) {return null;}

  const today = todayISO();
  const check = validatePeriodDraft(draft, today);
  const changed = hasPeriodChanges(original, draft);
  const busy = patch.isPending;
  const ongoing = draft.end === null;
  // On a short screen an open month grid needs the whole sheet: hide what is
  // not needed while it is open (the open row shows the value being chosen).
  const tight = windowHeight < 760;
  const hideExtras = tight && openField !== null;

  const setStart = (iso: string) => {
    setError(null);
    // Moving the start past the end carries the end with it, so a whole period
    // can be shifted later without a dead end; the review line shows the result.
    setDraft((d) => (d ? { ...d, start: iso, end: d.end && d.end < iso ? iso : d.end } : d));
    setOpenField(null);
  };
  const setEnd = (iso: string) => {
    setError(null);
    setDraft((d) => (d ? { ...d, end: iso } : d));
    setOpenField(null);
  };
  const setOngoing = (on: boolean) => {
    setError(null);
    setOpenField(null);
    setDraft((d) => (d ? { ...d, end: on ? null : d.end ?? (d.start > today ? d.start : today) } : d));
  };

  const save = () => {
    if (!check.ok || !changed || busy) {return;}
    patch.mutate(
      { id: period.id, data: buildPeriodPatch(original, draft) },
      {
        onSuccess: () => {
          toast.success('دوره اصلاح شد', describePeriodSpan(draft));
          onClose();
        },
        onError: (err: any) => setError(mapPeriodError(err)),
      },
    );
  };

  const message = error?.message ?? (!check.ok ? check.message : null);
  const saveLabel = busy ? 'در حال ذخیره…' : error?.retryable ? 'تلاش دوباره' : 'ذخیره';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={busy ? undefined : onClose}
          accessibilityRole="button"
          accessibilityLabel="بستن بدون ذخیره"
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderTopLeftRadius: borderRadius.xl,
              borderTopRightRadius: borderRadius.xl,
              maxHeight: windowHeight * 0.92,
              paddingBottom: spacing[4] + insets.bottom,
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <ScrollView
            style={{ flexGrow: 0, flexShrink: 1 }}
            contentContainerStyle={{ paddingHorizontal: spacing[4] }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.title, { color: colors.textPrimary, fontSize: typography.large }]}>
              ویرایش تاریخ‌های دوره
            </Text>
            {!tight ? (
              <Text style={{ color: colors.textSecondary, fontSize: typography.sm, marginBottom: spacing[3] }}>
                روی هر تاریخ بزن و روز درست را از تقویم انتخاب کن.
              </Text>
            ) : null}

            <FieldRow
              label="شروع"
              value={draft.start}
              open={openField === 'start'}
              invalid={!check.ok && check.field === 'start'}
              onPress={() => setOpenField(openField === 'start' ? null : 'start')}
            />
            {openField === 'start' ? (
              <View style={{ paddingVertical: spacing[2] }}>
                <JalaliDatePicker value={draft.start} max={today} onSelect={setStart} />
              </View>
            ) : null}

            <View style={{ height: spacing[2] }} />

            {hideExtras && openField === 'start' ? null : ongoing ? (
              <View
                style={[
                  styles.fieldRow,
                  { backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius.lg, paddingHorizontal: spacing[4] },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.textTertiary, fontSize: typography.xs }}>پایان</Text>
                  <Text style={{ color: colors.textPrimary, fontSize: typography.base, fontWeight: '700' }}>
                    هنوز در جریان است
                  </Text>
                </View>
              </View>
            ) : (
              <>
                <FieldRow
                  label="پایان"
                  value={draft.end as string}
                  open={openField === 'end'}
                  invalid={!check.ok && check.field === 'end'}
                  onPress={() => setOpenField(openField === 'end' ? null : 'end')}
                />
                {openField === 'end' ? (
                  <View style={{ paddingVertical: spacing[2] }}>
                    <JalaliDatePicker value={draft.end as string} min={draft.start} max={today} onSelect={setEnd} />
                  </View>
                ) : null}
              </>
            )}

            {hideExtras ? null : <View style={[styles.switchRow, { marginTop: spacing[2] }]}>
              <Text style={{ color: colors.textPrimary, fontSize: typography.sm, flex: 1 }}>
                دوره‌ام هنوز تمام نشده
              </Text>
              <Switch
                value={ongoing}
                onValueChange={setOngoing}
                accessibilityLabel="دوره‌ام هنوز تمام نشده"
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={ongoing ? colors.primary : colors.surface}
              />
            </View>}
          </ScrollView>

          {/* Pinned: what saving will do, and the buttons */}
          <View style={{ paddingHorizontal: spacing[4] }}>
            {hideExtras ? null : <View
              accessibilityLiveRegion="polite"
              style={[
                styles.review,
                {
                  backgroundColor: message ? colors.errorBg : colors.primaryLighter,
                  borderRadius: borderRadius.md,
                  padding: spacing[3],
                  marginTop: spacing[2],
                },
              ]}
            >
              <Icon
                name={message ? 'alert-circle-outline' : 'check-circle-outline'}
                size={18}
                color={message ? colors.error : colors.primaryDark}
              />
              <Text
                style={{
                  flex: 1,
                  color: message ? colors.error : colors.primaryDark,
                  fontSize: typography.sm,
                  lineHeight: 22,
                }}
              >
                {message ?? (changed ? `بعد از ذخیره: ${describePeriodSpan(draft)}` : `الان ثبت‌شده: ${describePeriodSpan(draft)}`)}
              </Text>
            </View>}

            <View style={[styles.actions, { marginTop: spacing[3] }]}>
              <View style={{ flex: 1 }}>
                <Button
                  label={saveLabel}
                  onPress={save}
                  disabled={!check.ok || !changed || busy}
                  loading={busy}
                  fullWidth
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button label="انصراف" onPress={onClose} variant="secondary" disabled={busy} fullWidth />
              </View>
            </View>

            {onOpenFullEdit ? (
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  onOpenFullEdit(period.id);
                }}
                accessibilityRole="button"
                style={styles.fullEditLink}
              >
                <Text style={{ color: colors.primary, fontSize: typography.sm, fontWeight: '600' }}>
                  علائم، داروها یا حذف این دوره
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { width: '100%' },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginVertical: 12 },
  title: { fontWeight: '700', marginBottom: 4 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', minHeight: 64, paddingVertical: 8 },
  switchRow: { flexDirection: 'row', alignItems: 'center', minHeight: 48 },
  review: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  actions: { flexDirection: 'row', gap: 12 },
  fullEditLink: { alignItems: 'center', justifyContent: 'center', minHeight: 44, marginTop: 4 },
});
