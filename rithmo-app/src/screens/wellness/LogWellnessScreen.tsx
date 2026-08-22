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
import { toFa } from '@utils/persian';
import { useTheme } from '@hooks/useTheme';
import { useCreateOrUpdateWellnessLog, useWellnessLog } from '@hooks/queries/useWellness';
import { Button, Input, Card } from '@components/ui';
import { extractErrorMessage } from '@utils/errorHandler';
import type { WellnessScreenProps } from '@navigation/types';

type Props = WellnessScreenProps<'LogWellness'>;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

// ── Slider metric component ───────────────────────────────────────────────────

interface SliderMetricProps {
  icon: string;
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  iconColor: string;
  unit?: string;
  step?: number;
}

function SliderMetric({
  icon,
  label,
  value,
  min,
  max,
  onChange,
  iconColor,
  unit,
  step = 1,
}: SliderMetricProps) {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const [trackWidth, setTrackWidth] = useState(0);

  const handleTouch = (event: any) => {
    if (trackWidth === 0) {return;}
    const locationX = event.nativeEvent.locationX;
    const percentage = Math.max(0, Math.min(1, locationX / trackWidth));
    const rawValue = min + percentage * (max - min);
    const newValue = Math.round(rawValue / step) * step;
    onChange(Math.max(min, Math.min(max, newValue)));
  };

  const handleDecrement = () => {
    onChange(Math.max(min, value - step));
  };

  const handleIncrement = () => {
    onChange(Math.min(max, value + step));
  };

  const percentage = max > min ? ((value - min) / (max - min)) * 100 : 0;

  return (
    <View style={{ marginBottom: spacing[4] }}>
      <View style={styles.metricHeaderRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <View style={[styles.metricIconWrap, { backgroundColor: iconColor + '18', borderRadius: borderRadius.sm }]}>
            <Icon name={icon} size={18} color={iconColor} />
          </View>
          <Text style={[styles.metricLabelText, { color: colors.textPrimary, fontSize: typography.sm, marginLeft: spacing[2] }]}>
            {label}
          </Text>
        </View>

        {/* Value badge + quick stepper */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <TouchableOpacity
            onPress={handleDecrement}
            disabled={value <= min}
            style={[
              styles.stepBtn,
              {
                backgroundColor: colors.surfaceSecondary,
                borderColor: colors.border,
                borderRadius: borderRadius.sm,
                opacity: value <= min ? 0.3 : 1,
              },
            ]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="minus" size={14} color={colors.textSecondary} />
          </TouchableOpacity>

          <View style={[styles.metricValueBadge, { backgroundColor: iconColor + '18', borderRadius: borderRadius.md }]}>
            {/* Persian digits: this badge is the number the user reads for
                every metric on the form, and it was rendering Latin. */}
            <Text style={[styles.metricValueText, { color: iconColor, fontSize: typography.sm }]}>
              {toFa(value)}{unit ? ` ${unit}` : ''}
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleIncrement}
            disabled={value >= max}
            style={[
              styles.stepBtn,
              {
                backgroundColor: colors.surfaceSecondary,
                borderColor: colors.border,
                borderRadius: borderRadius.sm,
                opacity: value >= max ? 0.3 : 1,
              },
            ]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="plus" size={14} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Interactive slider track */}
      <View
        style={[styles.sliderTrack, { backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius.pill }]}
        onStartShouldSetResponder={() => true}
        onResponderGrant={handleTouch}
        onResponderMove={handleTouch}
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
      >
        <View
          style={[
            styles.sliderFill,
            {
              width: `${percentage}%`,
              backgroundColor: iconColor,
              borderRadius: borderRadius.pill,
            },
          ]}
        />
        <View
          style={[
            styles.sliderThumb,
            {
              left: `${percentage}%`,
              backgroundColor: iconColor,
              borderRadius: borderRadius.pill,
              borderColor: colors.surface,
            },
          ]}
        />
      </View>

      <View style={styles.rangeLabelsRow}>
        <Text style={[styles.rangeLabelText, { color: colors.textTertiary, fontSize: typography.xs }]}>
          {min}
        </Text>
        <Text style={[styles.rangeLabelText, { color: colors.textTertiary, fontSize: typography.xs }]}>
          {max}
        </Text>
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function LogWellnessScreen() {
  const navigation = useNavigation<Props['navigation']>();
  const route = useRoute<Props['route']>();
  const { colors, spacing, typography, borderRadius } = useTheme();

  const logId = route.params?.logId;
  const { data: existing } = useWellnessLog(logId ?? 0);
  const { mutateAsync: saveLog, isPending } = useCreateOrUpdateWellnessLog();

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
    }
  }, [existing]);

  const set = useCallback(<K extends keyof typeof form>(key: K, value: typeof form[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    try {
      await saveLog(form);
      navigation.goBack();
    } catch (err) {
      Alert.alert('خطا', extractErrorMessage(err));
    }
  }, [form, saveLog, navigation]);

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: spacing[4], paddingBottom: spacing[12] }}
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
          <Card elevated={false} style={{ marginBottom: spacing[4], padding: spacing[4] }}>
            <View style={styles.sectionHeader}>
              <Icon name="brain" size={20} color={colors.luteal} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: typography.base, marginLeft: spacing[2] }]}>
                سلامت روان و خلق
              </Text>
            </View>

            <View style={{ marginTop: spacing[3] }}>
              <SliderMetric
                icon="emoticon-outline"
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
                iconColor="#E76F51"
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
          <Card elevated={false} style={{ marginBottom: spacing[4], padding: spacing[4] }}>
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
                iconColor="#2A9D8F"
                unit="دقیقه"
              />
              <SliderMetric
                icon="food-apple-outline"
                label="کیفیت تغذیه"
                value={form.nutrition_quality}
                min={1}
                max={5}
                onChange={(v) => set('nutrition_quality', Math.round(v))}
                iconColor="#6A994E"
              />
            </View>
          </Card>

          {/* ── Section 3: Lifestyle & Sleep ─────────────────────────── */}
          <Card elevated={false} style={{ marginBottom: spacing[4], padding: spacing[4] }}>
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
                iconColor="#8B4513"
                unit="فنجان"
              />
              <SliderMetric
                icon="glass-cocktail"
                label="مصرف الکل"
                value={form.alcohol_intake}
                min={0}
                max={10}
                onChange={(v) => set('alcohol_intake', Math.round(v))}
                iconColor="#C77DFF"
                unit="واحد"
              />
              <SliderMetric
                icon="smoking"
                label="مصرف دخانیات"
                value={form.smoking}
                min={0}
                max={20}
                onChange={(v) => set('smoking', Math.round(v))}
                iconColor="#6C757D"
                unit="نخ"
              />
            </View>
          </Card>

          {/* ── Section 4: Notes ─────────────────────────────────────── */}
          <Card elevated={false} style={{ marginBottom: spacing[4], padding: spacing[4] }}>
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
    letterSpacing: -0.5,
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

  metricHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricIconWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabelText: {
    fontWeight: '600',
  },
  metricValueBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 44,
    alignItems: 'center',
  },
  metricValueText: {
    fontWeight: '700',
  },
  stepBtn: {
    width: 26,
    height: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sliderTrack: {
    height: 6,
    width: '100%',
    position: 'relative',
    marginVertical: 6,
  },
  sliderFill: {
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
  },
  sliderThumb: {
    width: 18,
    height: 18,
    position: 'absolute',
    top: -6,
    borderWidth: 2,
    marginLeft: -9,
  },
  rangeLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rangeLabelText: {
    fontWeight: '500',
  },
});
