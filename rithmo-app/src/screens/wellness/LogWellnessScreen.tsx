/**
 * LogWellnessScreen — ثبت کامل وضعیت سلامت
 *
 * Rhythmo Design System Redesign.
 * Full 13-metric comprehensive logging form organized into calm, logical sections.
 * Preserves all backend fields, scales, clamping, and pre-filling logic.
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@hooks/useTheme';
import { screen } from '@theme/spacing';
import { useCreateOrUpdateWellnessLog, useUpdateWellnessLog, useWellnessLog } from '@hooks/queries/useWellness';
import {
  useContextEntriesForDate,
  useCreateContextEntry,
  useDeleteContextEntry,
} from '@hooks/queries/useContextEntries';
import { Button, Input, Card, SliderMetric } from '@components/ui';
import { extractErrorMessage } from '@utils/errorHandler';
import { todayISO } from '@utils/dateUtils';
import { SYMPTOMS, parseSymptomCodes } from '@constants/symptoms';
import { CONTEXT_TAGS } from '@constants/contextTags';
import { symptomIcon, ICON_SIZE } from '@design-system/iconography';
import type { WellnessScreenProps } from '@navigation/types';
import type { ContextTag } from '@types/contextEntry.types';

type Props = WellnessScreenProps<'LogWellness'>;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

// ── Main screen ───────────────────────────────────────────────────────────────

export default function LogWellnessScreen() {
  const navigation = useNavigation<Props['navigation']>();
  const route = useRoute<Props['route']>();
  const { colors, spacing, typography, borderRadius } = useTheme();

  const logId = route.params?.logId;
  const { data: existing } = useWellnessLog(logId ?? 0);
  const { mutateAsync: saveLog, isPending: isCreating } = useCreateOrUpdateWellnessLog();
  const { mutateAsync: updateLog, isPending: isUpdating } = useUpdateWellnessLog();
  const isPending = isCreating || isUpdating;

  const [form, setForm] = useState({
    stress_level: 5,
    sleep_hours: 7,
    mood_level: 3,
    energy_level: 5,
    pain_level: 0,
    exercise_minutes: 0,
    nutrition_quality: 3,
    caffeine_intake: 1,
    alcohol_intake: 0,
    smoking: 0,
    anxiety_level: 3,
    focus_level: 5,
    notes: '',
  });

  // Closing the historical-edit gap: this was the only screen that could
  // edit a past day, and it had no symptom UI at all — a day's symptoms,
  // once logged via QuickLog, could never be edited. Reuses SymptomEntry
  // exactly as QuickLogScreen does; no new storage.
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);

  const logDate = existing?.date ?? todayISO();

  useEffect(() => {
    if (existing) {
      setForm({
        stress_level: clamp(existing.stress_level ?? 5, 1, 10),
        sleep_hours: clamp(existing.sleep_hours ?? 7, 0, 12),
        mood_level: clamp(existing.mood_level ?? 3, 1, 5),
        energy_level: clamp(existing.energy_level ?? 5, 1, 10),
        pain_level: clamp(existing.pain_level ?? 0, 0, 10),
        exercise_minutes: clamp(existing.exercise_minutes ?? 0, 0, 180),
        nutrition_quality: clamp(existing.nutrition_quality ?? 3, 1, 5),
        caffeine_intake: clamp(existing.caffeine_intake ?? 0, 0, 10),
        alcohol_intake: clamp(existing.alcohol_intake ?? 0, 0, 10),
        smoking: clamp(existing.smoking ?? 0, 0, 20),
        anxiety_level: clamp(existing.anxiety_level ?? 3, 1, 10),
        focus_level: clamp(existing.focus_level ?? 5, 1, 10),
        notes: existing.notes ?? '',
      });
      const codes = existing.symptom_codes?.length
        ? existing.symptom_codes
        : parseSymptomCodes(existing.symptoms);
      setSelectedSymptoms(codes);
    }
  }, [existing]);

  const set = useCallback(<K extends keyof typeof form>(key: K, value: typeof form[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const toggleSymptom = useCallback((code: string) => {
    setSelectedSymptoms(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  }, []);

  const handleSave = useCallback(async () => {
    try {
      // Editing an existing (possibly historical) log goes through the
      // update-by-id endpoint — the create/upsert-by-date endpoint this
      // screen used to always call deliberately rejects any date more
      // than a day old (see WellnessLogView.create()), so saving a past
      // day's edits through it silently wrote a brand-new log for TODAY
      // instead of updating the day being edited. Only a fresh "new
      // report" (no logId) still goes through the create path, which is
      // always for today.
      if (logId) {
        await updateLog({ id: logId, data: { ...form, symptoms: selectedSymptoms.join(',') } });
      } else {
        await saveLog({ ...form, symptoms: selectedSymptoms.join(',') });
      }
      navigation.goBack();
    } catch (err) {
      Alert.alert('خطا', extractErrorMessage(err));
    }
  }, [form, selectedSymptoms, logId, saveLog, updateLog, navigation]);

  // ── Today 2.0: context entries for this exact day ────────────────────
  const { data: contextEntries } = useContextEntriesForDate(logDate);
  const { mutateAsync: createContextEntry } = useCreateContextEntry();
  const { mutateAsync: deleteContextEntry } = useDeleteContextEntry();
  const [addingTag, setAddingTag] = useState<ContextTag | null>(null);

  const handleAddContextTag = useCallback(async (tag: ContextTag) => {
    setAddingTag(tag);
    try {
      await createContextEntry({ date: logDate, tag });
    } catch (err) {
      Alert.alert('خطا', extractErrorMessage(err));
    } finally {
      setAddingTag(null);
    }
  }, [createContextEntry, logDate]);

  const handleRemoveContextEntry = useCallback(async (id: number) => {
    try {
      await deleteContextEntry(id);
    } catch (err) {
      Alert.alert('خطا', extractErrorMessage(err));
    }
  }, [deleteContextEntry]);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{
          paddingHorizontal: screen.gutter,
          paddingTop: screen.top,
          paddingBottom: screen.bottom,
        }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header ──────────────────────────────────────────────── */}
          <View style={[styles.headerSection, { paddingTop: spacing[2], marginBottom: spacing[4] }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.overline, { color: colors.textTertiary, fontSize: typography.xs }]}>
                ریتمو · ثبت کامل
              </Text>
              <Text style={[styles.pageTitle, { color: colors.textPrimary, fontSize: typography['2xl'] }]}>
                {logId ? 'ویرایش گزارش سلامت' : 'ثبت کامل وضعیت امروز'}
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: typography.sm }]}>
                تنظیم دقیق ابعاد سلامت، انرژی و سبک زندگی
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={[
                styles.closeBtn,
                {
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border,
                  borderRadius: borderRadius.md,
                },
              ]}
              accessibilityLabel="بستن"
            >
              <Icon name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* ── Section 1: Mental Wellness ───────────────────────────── */}
          <Card elevated={false} rounded="2xl" style={{ marginBottom: spacing[4], padding: spacing[4] }}>
            <View style={styles.sectionHeader}>
              <Icon name="brain" size={20} color={colors.luteal} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: typography.base, marginLeft: spacing[2] }]}>
                سلامت روان و خلق
              </Text>
            </View>

            <View style={{ marginTop: spacing[3] }}>
              <SliderMetric
                icon="emoticon-outline"
                /* Metric accents come from the theme, never from literals.
                   Six of these were hardcoded hex, so they did not follow the
                   light/dark theme at all: #8B4513 measured 2.47:1 on the dark
                   surface and #C77DFF 2.69:1 on the light one, both under the
                   3:1 minimum for a meaningful non-text mark. The tokens below
                   keep the same hue families and clear 3:1 in both themes. */
                label="میزان خلق"
                value={form.mood_level}
                min={1}
                max={5}
                onChange={(v) => set('mood_level', Math.round(v))}
                iconColor={colors.luteal}
              />
              <SliderMetric
                icon="meditation"
                label="سطح استرس"
                value={form.stress_level}
                min={1}
                max={10}
                onChange={(v) => set('stress_level', Math.round(v))}
                iconColor={colors.menstrual}
              />
              <SliderMetric
                icon="heart-pulse"
                label="سطح اضطراب"
                value={form.anxiety_level}
                min={1}
                max={10}
                onChange={(v) => set('anxiety_level', Math.round(v))}
                iconColor={colors.error}
              />
              <SliderMetric
                icon="target"
                label="میزان تمرکز"
                value={form.focus_level}
                min={1}
                max={10}
                onChange={(v) => set('focus_level', Math.round(v))}
                iconColor={colors.primary}
              />
            </View>
          </Card>

          {/* ── Section 2: Physical Health ───────────────────────────── */}
          <Card elevated={false} rounded="2xl" style={{ marginBottom: spacing[4], padding: spacing[4] }}>
            <View style={styles.sectionHeader}>
              <Icon name="arm-flex" size={20} color={colors.ovulation} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: typography.base, marginLeft: spacing[2] }]}>
                وضعیت جسمانی
              </Text>
            </View>

            <View style={{ marginTop: spacing[3] }}>
              <SliderMetric
                icon="lightning-bolt-outline"
                label="سطح انرژی"
                value={form.energy_level}
                min={1}
                max={10}
                onChange={(v) => set('energy_level', Math.round(v))}
                iconColor={colors.ovulation}
              />
              <SliderMetric
                icon="bandage"
                label="میزان درد"
                value={form.pain_level}
                min={0}
                max={10}
                onChange={(v) => set('pain_level', Math.round(v))}
                iconColor={colors.menstrual}
              />
              <SliderMetric
                icon="run"
                label="فعالیت بدنی"
                value={form.exercise_minutes}
                min={0}
                max={180}
                step={5}
                onChange={(v) => set('exercise_minutes', Math.round(v))}
                iconColor={colors.follicular}
                unit="دقیقه"
              />
              <SliderMetric
                icon="food-apple-outline"
                label="کیفیت تغذیه"
                value={form.nutrition_quality}
                min={1}
                max={5}
                onChange={(v) => set('nutrition_quality', Math.round(v))}
                iconColor={colors.success}
              />
            </View>
          </Card>

          {/* ── Section 3: Lifestyle & Sleep ─────────────────────────── */}
          <Card elevated={false} rounded="2xl" style={{ marginBottom: spacing[4], padding: spacing[4] }}>
            <View style={styles.sectionHeader}>
              <Icon name="weather-night" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: typography.base, marginLeft: spacing[2] }]}>
                خواب و سبک زندگی
              </Text>
            </View>

            <View style={{ marginTop: spacing[3] }}>
              <SliderMetric
                icon="sleep"
                label="مدت خواب"
                value={form.sleep_hours}
                min={0}
                max={12}
                step={0.5}
                onChange={(v) => set('sleep_hours', Math.round(v * 2) / 2)}
                iconColor={colors.primary}
                unit="ساعت"
              />
              <SliderMetric
                icon="coffee-outline"
                label="مصرف کافئین"
                value={form.caffeine_intake}
                min={0}
                max={10}
                onChange={(v) => set('caffeine_intake', Math.round(v))}
                iconColor={colors.premium}
                unit="فنجان"
              />
              <SliderMetric
                icon="glass-cocktail"
                label="مصرف الکل"
                value={form.alcohol_intake}
                min={0}
                max={10}
                onChange={(v) => set('alcohol_intake', Math.round(v))}
                iconColor={colors.accent}
                unit="واحد"
              />
              <SliderMetric
                icon="smoking"
                label="مصرف دخانیات"
                value={form.smoking}
                min={0}
                max={20}
                onChange={(v) => set('smoking', Math.round(v))}
                iconColor={colors.textSecondary}
                unit="نخ"
              />
            </View>
          </Card>

          {/* ── Symptoms (closes the historical symptom-edit gap) ────── */}
          <Card elevated={false} rounded="2xl" style={{ marginBottom: spacing[4], padding: spacing[4] }}>
            <View style={styles.sectionHeader}>
              <Icon name="pulse" size={20} color={colors.menstrual} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: typography.base, marginLeft: spacing[2] }]}>
                علائم
              </Text>
            </View>
            <View style={[styles.chipWrap, { gap: spacing[2], marginTop: spacing[3] }]}>
              {SYMPTOMS.map(sym => {
                const active = selectedSymptoms.includes(sym.code);
                return (
                  <TouchableOpacity
                    key={sym.code}
                    onPress={() => toggleSymptom(sym.code)}
                    activeOpacity={0.7}
                    style={[
                      styles.chip,
                      {
                        borderRadius: borderRadius.pill,
                        backgroundColor: active ? colors.primary + '18' : colors.surfaceSecondary,
                        borderColor: active ? colors.primary : colors.border,
                        borderWidth: active ? 1.5 : 1,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={sym.label}
                  >
                    <Icon
                      name={symptomIcon(sym.code)}
                      size={ICON_SIZE.xs}
                      color={active ? colors.primary : colors.textSecondary}
                    />
                    <Text style={{ color: active ? colors.primary : colors.textSecondary, fontSize: typography.xs, fontWeight: active ? '700' : '500', marginEnd: 6 }}>
                      {sym.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>

          {/* ── Today 2.0: context entries for this day ─────────────── */}
          <Card elevated={false} rounded="2xl" style={{ marginBottom: spacing[4], padding: spacing[4] }}>
            <View style={styles.sectionHeader}>
              <Icon name="calendar-alert" size={20} color={colors.accent} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: typography.base, marginLeft: spacing[2] }]}>
                امروز چیز متفاوتی بود؟
              </Text>
            </View>

            {Boolean(contextEntries?.length) && (
              <View style={[styles.chipWrap, { gap: spacing[2], marginTop: spacing[3] }]}>
                {contextEntries!.map(entry => {
                  const label = CONTEXT_TAGS.find(t => t.code === entry.tag)?.label ?? entry.tag;
                  return (
                    <View
                      key={entry.id}
                      style={[
                        styles.chip,
                        {
                          borderRadius: borderRadius.pill,
                          backgroundColor: colors.primary + '18',
                          borderColor: colors.primary,
                          borderWidth: 1.5,
                        },
                      ]}
                    >
                      <Text style={{ color: colors.primary, fontSize: typography.xs, fontWeight: '700', marginEnd: 6 }}>
                        {label}
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleRemoveContextEntry(entry.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel={`حذف ${label}`}
                      >
                        <Icon name="close" size={14} color={colors.primary} />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}

            <Text style={[styles.subtitle, { color: colors.textTertiary, fontSize: typography.xs, marginTop: spacing[3], marginBottom: spacing[1] }]}>
              افزودن مورد جدید
            </Text>
            <View style={[styles.chipWrap, { gap: spacing[2] }]}>
              {CONTEXT_TAGS.map(ctx => (
                <TouchableOpacity
                  key={ctx.code}
                  onPress={() => handleAddContextTag(ctx.code)}
                  disabled={addingTag === ctx.code}
                  activeOpacity={0.7}
                  style={[
                    styles.chip,
                    {
                      borderRadius: borderRadius.pill,
                      backgroundColor: colors.surfaceSecondary,
                      borderColor: colors.border,
                      borderWidth: 1,
                      opacity: addingTag === ctx.code ? 0.5 : 1,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={ctx.label}
                >
                  <Icon name="plus" size={ICON_SIZE.xs} color={colors.textSecondary} />
                  <Text style={{ color: colors.textSecondary, fontSize: typography.xs, fontWeight: '500', marginEnd: 6 }}>
                    {ctx.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>

          {/* ── Section 4: Notes ─────────────────────────────────────── */}
          <Card elevated={false} rounded="2xl" style={{ marginBottom: spacing[4], padding: spacing[4] }}>
            <View style={styles.sectionHeader}>
              <Icon name="note-text-outline" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: typography.base, marginLeft: spacing[2] }]}>
                یادداشت شخصی
              </Text>
            </View>
            <Input
              placeholder="هر نکته‌ای در مورد احساسات یا علائم امروزت..."
              value={form.notes}
              onChangeText={(v) => set('notes', v)}
              multiline
              numberOfLines={3}
              style={{ minHeight: 80, textAlignVertical: 'top', marginTop: spacing[3] }}
            />
          </Card>

          {/* ── Action Buttons ────────────────────────────────────────── */}
          <Button
            label={isPending ? 'در حال ذخیره...' : 'ذخیره گزارش سلامت'}
            onPress={handleSave}
            loading={isPending}
            disabled={isPending}
            fullWidth
            size="lg"
          />
          <Button
            label="انصراف"
            onPress={() => navigation.goBack()}
            variant="ghost"
            fullWidth
            style={{ marginTop: spacing[2] }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

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
  pageTitle: {
    fontWeight: '800',
  },
  subtitle: {
    fontWeight: '500',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontWeight: '700',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
});
