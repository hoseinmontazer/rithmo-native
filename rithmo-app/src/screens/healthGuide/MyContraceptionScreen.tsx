/**
 * MyContraceptionScreen - the user's own, optional, PRIVATE record.
 *
 * Not required for anything: the whole guide works without it. The screen shows
 * what the user recorded (current methods, history), the reminders they set
 * themselves, and server notices (a pregnancy pauses reminders; trying to
 * conceive and a method are both recorded; a hormonal method and cycle
 * estimates). It never says that a record, a reminder or the calendar prevents
 * pregnancy, never suggests an interval or dose, and shows nothing to anyone
 * else. The comparison of the user's own cycle lengths around a method is the
 * only Premium part, and it states that it does not explain any change.
 */
import React, { useState } from 'react';
import { ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@hooks/useTheme';
import { screen } from '@theme/spacing';
import { Badge, Button, Card, ErrorState, LoadingState } from '@components/ui';
import { JalaliDatePicker } from '@components/cycle/JalaliDatePicker';
import { addDays, todayISO } from '@utils/dateUtils';
import { faDateShort, toFa } from '@utils/persian';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';
import { usePremiumStatus } from '@hooks/queries/useSubscription';
import {
  useContraceptionReminders, useContraceptionSummary, useCreateRecord, useCreateReminder, useDeleteRecord,
  useDeleteReminder, useUpdateRecord, useUpdateReminder,
} from '@hooks/queries/useReproductiveRecords';
import type { ProfileStackParamList } from '@navigation/types';
import type { ContraceptionRecord, MethodCode, ReminderKind } from '@types/reproductiveRecords.types';
import { Callout, Choice, FormSheet, SectionTitle } from './components';
import {
  METHOD_CODES, METHOD_LABELS, NOT_CONTRACEPTION_FA, PRIVACY_NOTE_FA, REMINDER_NOTE_FA, TRACKING_NOT_PREVENTION_FA,
  describeReminder, deviceUtcOffsetMinutes, errorMessageFor, formatTime, parseTime, parseWhole,
} from './healthGuideLogic';

type Nav = NativeStackNavigationProp<ProfileStackParamList>;
const KIND_LABELS: Record<ReminderKind, string> = { daily: 'هر روز', every_n_days: 'هر چند روز', once: 'یک‌بار' };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const { colors, spacing, typography } = useTheme();
  return (
    <View style={{ marginTop: spacing[4] }}>
      <Text style={{ color: colors.textPrimary, fontSize: typography.bodySmall, fontWeight: '700', marginBottom: spacing[2] }}>{label}</Text>
      {children}
    </View>
  );
}

function NumberBox({ value, onChange, label, width = 80 }: { value: string; onChange: (t: string) => void; label: string; width?: number }) {
  const { colors, spacing, typography, borderRadius } = useTheme();
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      keyboardType="number-pad"
      maxLength={4}
      accessibilityLabel={label}
      placeholder="۰"
      placeholderTextColor={colors.textTertiary}
      style={{
        width, minHeight: 48, textAlign: 'center', color: colors.textPrimary, fontSize: typography.base,
        borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, backgroundColor: colors.surface, paddingHorizontal: spacing[2],
      }}
    />
  );
}

export default function MyContraceptionScreen() {
  const navigation = useNavigation<Nav>();
  const { colors, spacing, typography, borderRadius } = useTheme();
  const toast = useToast();
  const confirm = useConfirm();
  const { isPremiumFree } = usePremiumStatus();
  const summary = useContraceptionSummary();
  const remindersQ = useContraceptionReminders();
  const createRecord = useCreateRecord();
  const updateRecord = useUpdateRecord();
  const deleteRecord = useDeleteRecord();
  const createReminder = useCreateReminder();
  const updateReminder = useUpdateReminder();
  const deleteReminder = useDeleteReminder();

  const today = todayISO();
  // method sheet
  const [methodOpen, setMethodOpen] = useState(false);
  const [method, setMethod] = useState<MethodCode | null>(null);
  const [startedOn, setStartedOn] = useState(today);
  const [ended, setEnded] = useState(false);
  const [stoppedOn, setStoppedOn] = useState(today);
  const [methodError, setMethodError] = useState<string | null>(null);
  // reminder sheet
  const [remOpen, setRemOpen] = useState(false);
  const [kind, setKind] = useState<ReminderKind>('daily');
  const [hour, setHour] = useState('');
  const [minute, setMinute] = useState('');
  const [interval, setIntervalText] = useState('');
  const [anchor, setAnchor] = useState(today);
  const [linkId, setLinkId] = useState<number | null>(null);
  const [remError, setRemError] = useState<string | null>(null);

  if (summary.isLoading || remindersQ.isLoading) { return <LoadingState fullScreen />; }
  // The reminder list must never fall back to "no reminders" when it simply
  // failed to load, so both queries gate the screen and retry together.
  if (!summary.data || !remindersQ.data) {
    return (
      <ErrorState
        error={summary.error ?? remindersQ.error}
        onRetry={() => { summary.refetch(); remindersQ.refetch(); }}
        fullScreen
      />
    );
  }
  const s = summary.data;
  const reminders = remindersQ.data;

  const resetMethod = () => { setMethod(null); setStartedOn(today); setEnded(false); setStoppedOn(today); setMethodError(null); };
  const resetReminder = () => { setKind('daily'); setHour(''); setMinute(''); setIntervalText(''); setAnchor(today); setLinkId(null); setRemError(null); };

  const saveMethod = async () => {
    if (!method) { setMethodError('یک روش را انتخاب کن.'); return; }
    setMethodError(null);
    try {
      await createRecord.mutateAsync({ method, started_on: startedOn, stopped_on: ended ? stoppedOn : null });
      setMethodOpen(false); resetMethod();
      toast.info('ثبت شد', 'فقط برای خودت ذخیره شد.');
    } catch (e) { setMethodError(errorMessageFor(e)); }
  };

  const stopMethod = async (r: ContraceptionRecord) => {
    const ok = await confirm({
      title: 'این روش را متوقف کردی؟',
      message: 'تاریخ پایان امروز ثبت می‌شود و یادآورهای این روش خاموش می‌شود. می‌توانی بعداً آن را دوباره روشن کنی.',
      confirmLabel: 'متوقف شد', cancelLabel: 'انصراف', variant: 'info',
    });
    if (!ok) { return; }
    try { await updateRecord.mutateAsync({ id: r.id, stopped_on: today }); } catch (e) { toast.error('انجام نشد', errorMessageFor(e)); }
  };

  const removeRecord = async (r: ContraceptionRecord) => {
    const ok = await confirm({
      title: 'این ثبت حذف شود؟', message: 'ثبت و یادآورهای وابسته به آن برای همیشه پاک می‌شود.',
      confirmLabel: 'حذف', cancelLabel: 'انصراف', variant: 'danger',
    });
    if (!ok) { return; }
    try { await deleteRecord.mutateAsync(r.id); } catch (e) { toast.error('انجام نشد', errorMessageFor(e)); }
  };

  const saveReminder = async () => {
    const t = parseTime(`${parseWhole(hour) ?? ''}:${String(parseWhole(minute) ?? '').padStart(2, '0')}`);
    if (!t) { setRemError('ساعت و دقیقه را درست وارد کن (ساعت ۰ تا ۲۳، دقیقه ۰ تا ۵۹).'); return; }
    const days = parseWhole(interval);
    if (kind === 'every_n_days' && (days === null || days < 1 || days > 365)) { setRemError('فاصله‌ی روزها باید بین ۱ تا ۳۶۵ باشد.'); return; }
    setRemError(null);
    try {
      await createReminder.mutateAsync({
        kind, time_local: formatTime(t.h, t.m), utc_offset_minutes: deviceUtcOffsetMinutes(),
        interval_days: kind === 'every_n_days' ? days : null,
        anchor_date: kind === 'daily' ? null : anchor, record_id: linkId,
      });
      setRemOpen(false); resetReminder();
      toast.info('یادآور ساخته شد', 'متن اعلان همیشه کلی است و چیزی از روشت نمی‌گوید.');
    } catch (e) { setRemError(errorMessageFor(e)); }
  };

  const removeReminder = async (id: number) => {
    const ok = await confirm({ title: 'این یادآور حذف شود؟', confirmLabel: 'حذف', cancelLabel: 'انصراف', variant: 'danger' });
    if (!ok) { return; }
    try { await deleteReminder.mutateAsync(id); } catch (e) { toast.error('انجام نشد', errorMessageFor(e)); }
  };

  const RecordRow = ({ r, last }: { r: ContraceptionRecord; last: boolean }) => (
    <View style={{ paddingVertical: spacing[3], borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.border }}>
      <Text style={{ color: colors.textPrimary, fontSize: typography.base, fontWeight: '700' }}>{METHOD_LABELS[r.method]}</Text>
      <Text style={{ color: colors.textTertiary, fontSize: typography.caption, marginTop: 2 }}>
        {r.stopped_on ? `از ${faDateShort(r.started_on)} تا ${faDateShort(r.stopped_on)}` : `از ${faDateShort(r.started_on)}`}
      </Text>
      <View style={{ flexDirection: 'row', gap: spacing[4], marginTop: spacing[1] }}>
        {r.is_active ? (
          <TouchableOpacity onPress={() => stopMethod(r)} accessibilityRole="button" accessibilityLabel={`متوقف کردن ${METHOD_LABELS[r.method]}`} style={{ minHeight: 44, justifyContent: 'center' }}>
            <Text style={{ color: colors.primary, fontSize: typography.bodySmall, fontWeight: '600' }}>متوقف کردم</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity onPress={() => removeRecord(r)} accessibilityRole="button" accessibilityLabel={`حذف ${METHOD_LABELS[r.method]}`} style={{ minHeight: 44, justifyContent: 'center' }}>
          <Text style={{ color: colors.error, fontSize: typography.bodySmall, fontWeight: '600' }}>حذف</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <>
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={{ paddingHorizontal: screen.gutter, paddingTop: screen.top, paddingBottom: screen.bottomTab }}
        showsVerticalScrollIndicator={false}
        testID="my-contraception"
      >
        <View style={{ flexDirection: 'row', gap: spacing[2] }}>
          <Icon name="lock-outline" size={16} color={colors.textTertiary} />
          <Text style={{ flex: 1, color: colors.textTertiary, fontSize: typography.caption, lineHeight: 20 }}>{PRIVACY_NOTE_FA}</Text>
        </View>

        {s.notices.map((n) => <Callout key={n.code} tone="info" text={n.text_fa} />)}

        <SectionTitle>روش‌های فعلی</SectionTitle>
        <Card style={{ paddingHorizontal: spacing[4] }}>
          {s.active_methods.length === 0 ? (
            <Text style={{ color: colors.textSecondary, fontSize: typography.bodySmall, lineHeight: 22, paddingVertical: spacing[4] }}>
              هنوز روشی ثبت نکرده‌ای. ثبت اختیاری است و برای دیدن راهنما لازم نیست.
            </Text>
          ) : s.active_methods.map((r, i) => <RecordRow key={r.id} r={r} last={i === s.active_methods.length - 1} />)}
        </Card>
        <Button label="ثبت یک روش" onPress={() => { resetMethod(); setMethodOpen(true); }} variant="outline" size="md" fullWidth style={{ marginTop: spacing[3] }} />

        <SectionTitle>یادآورها</SectionTitle>
        <Card style={{ paddingHorizontal: spacing[4] }}>
          {reminders.length === 0 ? (
            <Text style={{ color: colors.textSecondary, fontSize: typography.bodySmall, lineHeight: 22, paddingVertical: spacing[4] }}>
              یادآوری نساخته‌ای. اعلان‌ها همیشه کلی‌اند و چیزی از روشت روی صفحه‌ی قفل نمی‌آید.
            </Text>
          ) : reminders.map((r, i) => (
            <View key={r.id} style={{ paddingVertical: spacing[3], borderBottomWidth: i === reminders.length - 1 ? 0 : 1, borderBottomColor: colors.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.textPrimary, fontSize: typography.bodySmall, fontWeight: '600' }}>{describeReminder(r)}</Text>
                  {r.paused ? <Badge label="به‌خاطر بارداری متوقف است" variant="neutral" style={{ marginTop: spacing[1], alignSelf: 'flex-start' }} /> : null}
                </View>
                <Switch
                  value={r.is_active}
                  onValueChange={(v) => updateReminder.mutate({ id: r.id, is_active: v }, { onError: (e) => toast.error('انجام نشد', errorMessageFor(e)) })}
                  accessibilityLabel={`فعال بودن یادآور: ${describeReminder(r)}`}
                />
                <TouchableOpacity onPress={() => removeReminder(r.id)} accessibilityRole="button" accessibilityLabel="حذف یادآور" style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="delete-outline" size={22} color={colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </Card>
        <Button label="ساختن یادآور" onPress={() => { resetReminder(); setRemOpen(true); }} variant="outline" size="md" fullWidth style={{ marginTop: spacing[3] }} />
        <Text style={{ color: colors.textTertiary, fontSize: typography.caption, lineHeight: 20, marginTop: spacing[2] }}>{REMINDER_NOTE_FA}</Text>

        {s.history.length > 0 ? (
          <>
            <SectionTitle>سابقه</SectionTitle>
            <Card style={{ paddingHorizontal: spacing[4] }}>
              {s.history.map((r, i) => <RecordRow key={r.id} r={r} last={i === s.history.length - 1} />)}
            </Card>
          </>
        ) : null}

        {s.longitudinal ? (
          <>
            <SectionTitle>طول چرخه‌هایت پیش از و پس از یک روش</SectionTitle>
            <Card style={{ padding: spacing[4] }}>
              {s.longitudinal.records.map((row) => (
                <View key={row.record_id} style={{ marginBottom: spacing[3] }}>
                  <Text style={{ color: colors.textPrimary, fontSize: typography.bodySmall, fontWeight: '700' }}>
                    {`${METHOD_LABELS[row.method]}، از ${faDateShort(row.started_on)}`}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: typography.caption, lineHeight: 21, marginTop: 2 }}>
                    {`پیش از: ${toFa(row.cycles_before.count)} چرخه${row.cycles_before.average_length != null ? `، میانگین ${toFa(row.cycles_before.average_length)} روز` : ''}`}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: typography.caption, lineHeight: 21 }}>
                    {`پس از: ${toFa(row.cycles_after.count)} چرخه${row.cycles_after.average_length != null ? `، میانگین ${toFa(row.cycles_after.average_length)} روز` : ''}`}
                  </Text>
                </View>
              ))}
              <Text style={{ color: colors.textTertiary, fontSize: typography.caption, lineHeight: 20 }}>{s.longitudinal.note_fa}</Text>
            </Card>
          </>
        ) : s.premium_required && !isPremiumFree ? (
          <>
            <SectionTitle>طول چرخه‌هایت پیش از و پس از یک روش</SectionTitle>
            <Card style={{ padding: spacing[4] }}>
              <Text style={{ color: colors.textSecondary, fontSize: typography.bodySmall, lineHeight: 22 }}>{s.premium_teaser_fa}</Text>
              <Button label="دیدن پرمیوم" onPress={() => navigation.navigate('Upgrade', { featureName: 'مقایسه‌ی چرخه‌ها' })} variant="outline" size="md" style={{ marginTop: spacing[3], alignSelf: 'flex-start' }} />
            </Card>
          </>
        ) : null}

        <View style={{ marginTop: spacing[6], padding: spacing[4], borderRadius: borderRadius.md, backgroundColor: colors.surfaceSecondary, gap: spacing[2] }}>
          <Text style={{ color: colors.textSecondary, fontSize: typography.caption, lineHeight: 20 }}>{TRACKING_NOT_PREVENTION_FA}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: typography.caption, lineHeight: 20 }}>{NOT_CONTRACEPTION_FA}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: typography.caption, lineHeight: 20 }}>{s.disclaimer_fa}</Text>
        </View>
      </ScrollView>

      <FormSheet visible={methodOpen} title="ثبت یک روش" onClose={() => setMethodOpen(false)}>
        <Field label="کدام روش؟">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
            {METHOD_CODES.map((c) => <Choice key={c} label={METHOD_LABELS[c]} active={method === c} onPress={() => setMethod(c)} />)}
          </View>
        </Field>
        <Field label="از چه تاریخی؟">
          <JalaliDatePicker value={startedOn} max={today} onSelect={setStartedOn} />
        </Field>
        <Field label="هنوز استفاده می‌کنی؟">
          <View style={{ flexDirection: 'row', gap: spacing[2] }}>
            <Choice label="بله" active={!ended} onPress={() => setEnded(false)} />
            <Choice label="نه، متوقف شده" active={ended} onPress={() => setEnded(true)} />
          </View>
        </Field>
        {ended ? (
          <Field label="تا چه تاریخی؟">
            <JalaliDatePicker value={stoppedOn < startedOn ? startedOn : stoppedOn} min={startedOn} max={today} onSelect={setStoppedOn} />
          </Field>
        ) : null}
        {methodError ? <Text accessibilityRole="alert" style={{ color: colors.error, fontSize: typography.bodySmall, marginTop: spacing[3] }}>{methodError}</Text> : null}
        <Button label="ذخیره" onPress={saveMethod} loading={createRecord.isPending} disabled={createRecord.isPending} size="lg" fullWidth style={{ marginTop: spacing[5] }} />
      </FormSheet>

      <FormSheet visible={remOpen} title="ساختن یادآور" onClose={() => setRemOpen(false)}>
        <Text style={{ color: colors.textSecondary, fontSize: typography.caption, lineHeight: 20 }}>{REMINDER_NOTE_FA}</Text>
        <Field label="هر چند وقت؟">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
            {(Object.keys(KIND_LABELS) as ReminderKind[]).map((k) => <Choice key={k} label={KIND_LABELS[k]} active={kind === k} onPress={() => setKind(k)} />)}
          </View>
        </Field>
        <Field label="ساعت (به وقت دستگاهت)">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
            <NumberBox value={hour} onChange={setHour} label="ساعت" width={72} />
            <Text style={{ color: colors.textPrimary, fontSize: typography.base }}>:</Text>
            <NumberBox value={minute} onChange={setMinute} label="دقیقه" width={72} />
          </View>
        </Field>
        {kind === 'every_n_days' ? (
          <Field label="هر چند روز یک‌بار؟ (طبق دستور بسته یا پزشک)">
            <NumberBox value={interval} onChange={setIntervalText} label="فاصله‌ی روزها" />
          </Field>
        ) : null}
        {kind !== 'daily' ? (
          <Field label={kind === 'once' ? 'در چه تاریخی؟' : 'از چه تاریخی شروع شود؟'}>
            <JalaliDatePicker value={anchor} min={kind === 'once' ? today : addDays(today, -365)} max={addDays(today, 365)} onSelect={setAnchor} />
          </Field>
        ) : null}
        {s.active_methods.length > 0 ? (
          <Field label="برای کدام روش؟ (اختیاری)">
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
              <Choice label="بدون ارتباط با روش" active={linkId === null} onPress={() => setLinkId(null)} />
              {s.active_methods.map((r) => <Choice key={r.id} label={METHOD_LABELS[r.method]} active={linkId === r.id} onPress={() => setLinkId(r.id)} />)}
            </View>
          </Field>
        ) : null}
        {remError ? <Text accessibilityRole="alert" style={{ color: colors.error, fontSize: typography.bodySmall, marginTop: spacing[3] }}>{remError}</Text> : null}
        <Button label="ذخیره" onPress={saveReminder} loading={createReminder.isPending} disabled={createReminder.isPending} size="lg" fullWidth style={{ marginTop: spacing[5] }} />
      </FormSheet>
    </>
  );
}
