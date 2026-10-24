/**
 * HealthChecksScreen - dates of sexual-health checks and vaccines the user
 * chooses to note. Deliberately minimal: a type and a date (plus an optional
 * "next time" date to remember), never a result and never free text. Nothing is
 * sent or scheduled from it, and the app concludes nothing from these dates.
 *
 * The top is a short list of the four kinds with the last date noted for each
 * (or "not recorded") and one tap to add that kind; below it is the history.
 * It never says what is "due" or "overdue": that would be advice the app has
 * no reviewed basis to give.
 */
import React, { useLayoutEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HealthStackParamList } from '@navigation/types';
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
import {
  CHECKS_NOTE_FA, CHECK_GROUPS, CHECK_LABELS, CHECK_NOT_RECORDED_FA, PRIVACY_NOTE_FA, SEXUAL_SYMPTOMS_NOTE_FA, errorMessageFor, lastDoneByType,
} from './healthGuideLogic';

export default function HealthChecksScreen() {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<HealthStackParamList>>();
  const kind = useRoute<RouteProp<HealthStackParamList, 'HealthChecks'>>().params?.kind;
  // One screen, two entries: the hub opens it for tests or for vaccines.
  const groups = (kind ? [kind] : (['tests', 'vaccines'] as const)).map((k) => CHECK_GROUPS[k]);
  const scopeTypes = groups.flatMap((g) => g.types);
  useLayoutEffect(() => {
    navigation.setOptions({ title: kind ? CHECK_GROUPS[kind].title : 'آزمایش‌ها و واکسن‌ها' });
  }, [navigation, kind]);
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
  const history = data.filter((c) => scopeTypes.includes(c.check_type));
  const last = lastDoneByType(data);
  const openFor = (t: CheckType) => { reset(); setType(t); setOpen(true); };

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

        {groups.map((g) => (
          <View key={g.title}>
        {/* Opened for one kind, the header already names it. */}
        {kind ? <View style={{ height: spacing[4] }} /> : <SectionTitle>{g.title}</SectionTitle>}
        <Card noPadding style={{ paddingHorizontal: spacing[4] }}>
          {g.types.map((t, i) => {
            const l = last[t];
            return (
              <View key={t} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing[3], gap: spacing[3], borderBottomWidth: i === g.types.length - 1 ? 0 : 1, borderBottomColor: colors.border }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.textPrimary, fontSize: typography.bodySmall, fontWeight: '700' }}>{CHECK_LABELS[t]}</Text>
                  <Text style={{ color: l ? colors.textSecondary : colors.textTertiary, fontSize: typography.caption, marginTop: 2 }}>
                    {l ? faDateShort(l.done_on) : CHECK_NOT_RECORDED_FA}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => openFor(t)}
                  accessibilityRole="button"
                  accessibilityLabel={`${l ? 'ثبت دوباره' : 'ثبت'} ${CHECK_LABELS[t]}`}
                  style={{ minHeight: 44, minWidth: 64, paddingHorizontal: spacing[3], alignItems: 'center', justifyContent: 'center', borderRadius: borderRadius.md, backgroundColor: colors.primaryLight }}
                >
                  <Text style={{ color: colors.primaryDark, fontSize: typography.bodySmall, fontWeight: '700' }}>{l ? 'ثبت دوباره' : 'ثبت'}</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </Card>
          </View>
        ))}

        <SectionTitle>سابقه</SectionTitle>
        <Card noPadding style={{ paddingHorizontal: spacing[4] }}>
          {history.length === 0 ? (
            <Text style={{ color: colors.textSecondary, fontSize: typography.bodySmall, lineHeight: 22, paddingVertical: spacing[4] }}>هنوز چیزی ثبت نکرده‌ای. این بخش اختیاری است.</Text>
          ) : [...history].sort((a, b) => (a.done_on < b.done_on ? 1 : -1)).map((c, i) => (
            <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing[3], borderBottomWidth: i === history.length - 1 ? 0 : 1, borderBottomColor: colors.border }}>
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

        <View style={{ marginTop: spacing[6], padding: spacing[4], borderRadius: borderRadius.md, backgroundColor: colors.surfaceSecondary }}>
          <Text style={{ color: colors.textSecondary, fontSize: typography.caption, lineHeight: 20 }}>{SEXUAL_SYMPTOMS_NOTE_FA}</Text>
        </View>
      </ScrollView>

      <FormSheet visible={open} title="ثبت یک مورد" onClose={() => setOpen(false)}>
        <Text style={{ color: colors.textPrimary, fontSize: typography.bodySmall, fontWeight: '700', marginBottom: spacing[2] }}>چه چیزی؟</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
          {scopeTypes.map((t) => <Choice key={t} label={CHECK_LABELS[t]} active={type === t} onPress={() => setType(t)} />)}
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
