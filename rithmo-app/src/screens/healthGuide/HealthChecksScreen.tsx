/**
 * HealthChecksScreen - dates of sexual-health checks and vaccines the user
 * chooses to note. Deliberately minimal: a type and a date (plus an optional
 * "next time" date to remember), never a result and never free text. Nothing is
 * sent or scheduled from it, and the app concludes nothing from these dates.
 */
import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@hooks/useTheme';
import { screen } from '@theme/spacing';
import { Button, Card, ErrorState, LoadingState } from '@components/ui';
import { JalaliDatePicker } from '@components/cycle/JalaliDatePicker';
import { addDays, todayISO } from '@utils/dateUtils';
import { faDateShort } from '@utils/persian';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';
import { useCreateCheck, useDeleteCheck, useSexualHealthChecks } from '@hooks/queries/useReproductiveRecords';
import type { CheckType } from '@types/reproductiveRecords.types';
import { Choice, FormSheet, SectionTitle } from './components';
import { CHECKS_NOTE_FA, CHECK_LABELS, CHECK_TYPES, PRIVACY_NOTE_FA, SEXUAL_SYMPTOMS_NOTE_FA, errorMessageFor } from './healthGuideLogic';

export default function HealthChecksScreen() {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const toast = useToast();
  const confirm = useConfirm();
  const { data, isLoading, isError, error, refetch } = useSexualHealthChecks();
  const create = useCreateCheck();
  const remove = useDeleteCheck();

  const today = todayISO();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<CheckType | null>(null);
  const [doneOn, setDoneOn] = useState(today);
  const [hasNext, setHasNext] = useState(false);
  const [nextDue, setNextDue] = useState(addDays(today, 30));
  const [formError, setFormError] = useState<string | null>(null);

  if (isLoading) { return <LoadingState fullScreen />; }
  if (isError || !data) { return <ErrorState error={error} onRetry={refetch} fullScreen />; }

  const reset = () => { setType(null); setDoneOn(today); setHasNext(false); setNextDue(addDays(today, 30)); setFormError(null); };

  const save = async () => {
    if (!type) { setFormError('یک مورد را انتخاب کن.'); return; }
    setFormError(null);
    try {
      await create.mutateAsync({ check_type: type, done_on: doneOn, next_due: hasNext ? nextDue : null });
      setOpen(false); reset();
      toast.info('ثبت شد', 'فقط تاریخ برای خودت ذخیره شد.');
    } catch (e) { setFormError(errorMessageFor(e)); }
  };

  const del = async (id: number) => {
    const ok = await confirm({ title: 'این ثبت حذف شود؟', confirmLabel: 'حذف', cancelLabel: 'انصراف', variant: 'danger' });
    if (!ok) { return; }
    try { await remove.mutateAsync(id); } catch (e) { toast.error('انجام نشد', errorMessageFor(e)); }
  };

  return (
    <>
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={{ paddingHorizontal: screen.gutter, paddingTop: screen.top, paddingBottom: screen.bottomTab }}
        showsVerticalScrollIndicator={false}
        testID="health-checks"
      >
        <View style={{ flexDirection: 'row', gap: spacing[2] }}>
          <Icon name="lock-outline" size={16} color={colors.textTertiary} />
          <Text style={{ flex: 1, color: colors.textTertiary, fontSize: typography.caption, lineHeight: 20 }}>{PRIVACY_NOTE_FA}</Text>
        </View>
        <Text style={{ color: colors.textSecondary, fontSize: typography.bodySmall, lineHeight: 22, marginTop: spacing[3] }}>{CHECKS_NOTE_FA}</Text>

        <SectionTitle>ثبت‌های من</SectionTitle>
        <Card style={{ paddingHorizontal: spacing[4] }}>
          {data.length === 0 ? (
            <Text style={{ color: colors.textSecondary, fontSize: typography.bodySmall, lineHeight: 22, paddingVertical: spacing[4] }}>هنوز چیزی ثبت نکرده‌ای. این بخش اختیاری است.</Text>
          ) : data.map((c, i) => (
            <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing[3], borderBottomWidth: i === data.length - 1 ? 0 : 1, borderBottomColor: colors.border }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.textPrimary, fontSize: typography.bodySmall, fontWeight: '700' }}>{CHECK_LABELS[c.check_type]}</Text>
                <Text style={{ color: colors.textTertiary, fontSize: typography.caption, marginTop: 2 }}>
                  {`انجام‌شده: ${faDateShort(c.done_on)}${c.next_due ? `   نوبت بعدی که یادداشت کرده‌ای: ${faDateShort(c.next_due)}` : ''}`}
                </Text>
              </View>
              <TouchableOpacity onPress={() => del(c.id)} accessibilityRole="button" accessibilityLabel={`حذف ${CHECK_LABELS[c.check_type]}`} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="delete-outline" size={22} color={colors.error} />
              </TouchableOpacity>
            </View>
          ))}
        </Card>
        <Button label="ثبت یک مورد" onPress={() => { reset(); setOpen(true); }} variant="outline" size="md" fullWidth style={{ marginTop: spacing[3] }} />

        <View style={{ marginTop: spacing[6], padding: spacing[4], borderRadius: borderRadius.md, backgroundColor: colors.surfaceSecondary }}>
          <Text style={{ color: colors.textSecondary, fontSize: typography.caption, lineHeight: 20 }}>{SEXUAL_SYMPTOMS_NOTE_FA}</Text>
        </View>
      </ScrollView>

      <FormSheet visible={open} title="ثبت یک مورد" onClose={() => setOpen(false)}>
        <Text style={{ color: colors.textPrimary, fontSize: typography.bodySmall, fontWeight: '700', marginBottom: spacing[2] }}>چه چیزی؟</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
          {CHECK_TYPES.map((t) => <Choice key={t} label={CHECK_LABELS[t]} active={type === t} onPress={() => setType(t)} />)}
        </View>
        <Text style={{ color: colors.textPrimary, fontSize: typography.bodySmall, fontWeight: '700', marginTop: spacing[4], marginBottom: spacing[2] }}>چه تاریخی انجام شد؟</Text>
        <JalaliDatePicker value={doneOn} max={today} onSelect={setDoneOn} />
        <Text style={{ color: colors.textPrimary, fontSize: typography.bodySmall, fontWeight: '700', marginTop: spacing[4], marginBottom: spacing[2] }}>تاریخی برای بار بعد یادداشت کنم؟</Text>
        <View style={{ flexDirection: 'row', gap: spacing[2] }}>
          <Choice label="نه" active={!hasNext} onPress={() => setHasNext(false)} />
          <Choice label="بله" active={hasNext} onPress={() => setHasNext(true)} />
        </View>
        {hasNext ? (
          <View style={{ marginTop: spacing[3] }}>
            <JalaliDatePicker value={nextDue <= doneOn ? addDays(doneOn, 1) : nextDue} min={addDays(doneOn, 1)} max={addDays(today, 3650)} onSelect={setNextDue} />
            <Text style={{ color: colors.textTertiary, fontSize: typography.caption, lineHeight: 20, marginTop: spacing[2] }}>فقط یادداشت است؛ اعلانی از آن ساخته نمی‌شود.</Text>
          </View>
        ) : null}
        {formError ? <Text accessibilityRole="alert" style={{ color: colors.error, fontSize: typography.bodySmall, marginTop: spacing[3] }}>{formError}</Text> : null}
        <Button label="ذخیره" onPress={save} loading={create.isPending} disabled={create.isPending} size="lg" fullWidth style={{ marginTop: spacing[5] }} />
      </FormSheet>
    </>
  );
}
