import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, KeyboardAvoidingView,
  Platform, StyleSheet, Alert, TouchableOpacity,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '@hooks/useTheme';
import { useCreateOrUpdateWellnessLog, useWellnessLog } from '@hooks/queries/useWellness';
import { Button, Input, Card } from '@components/ui';
import { extractErrorMessage } from '@utils/errorHandler';
import type { WellnessScreenProps } from '@navigation/types';

type Props = WellnessScreenProps<'LogWellness'>;

// Reusable numeric stepper for 1-N scales
function Stepper({ label, value, min, max, onChange, emoji }: {
  label: string; value: number; min: number; max: number;
  onChange: (v: number) => void; emoji?: string;
}) {
  const { colors, spacing, typography, borderRadius } = useTheme();
  return (
    <View style={[styles.stepperRow, { marginBottom: spacing[4] }]}>
      <Text style={{ color: colors.textPrimary, fontSize: typography.sm, fontWeight: '500', flex: 1 }}>
        {emoji ? `${emoji}  ` : ''}{label}
      </Text>
      <View style={styles.stepperControls}>
        <TouchableOpacity
          onPress={() => onChange(Math.max(min, value - 1))}
          style={[styles.stepBtn, { backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius.md }]}
          accessibilityLabel={`Decrease ${label}`}
        >
          <Text style={{ color: colors.textPrimary, fontSize: typography.lg, fontWeight: '700' }}>−</Text>
        </TouchableOpacity>
        <Text style={{ color: colors.textPrimary, fontSize: typography.base, fontWeight: '700', minWidth: 36, textAlign: 'center' }}>
          {value}/{max}
        </Text>
        <TouchableOpacity
          onPress={() => onChange(Math.min(max, value + 1))}
          style={[styles.stepBtn, { backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius.md }]}
          accessibilityLabel={`Increase ${label}`}
        >
          <Text style={{ color: colors.textPrimary, fontSize: typography.lg, fontWeight: '700' }}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function LogWellnessScreen() {
  const navigation = useNavigation<Props['navigation']>();
  const route      = useRoute<Props['route']>();
  const { colors, spacing, typography } = useTheme();

  const logId = route.params?.logId;
  const { data: existing } = useWellnessLog(logId ?? 0);
  const { mutateAsync: saveLog, isPending } = useCreateOrUpdateWellnessLog();

  const [form, setForm] = useState({
    stress_level:      5,
    sleep_hours:       7,
    mood_level:        3,
    energy_level:      5,
    pain_level:        0,
    exercise_minutes:  0,
    nutrition_quality: 3,
    caffeine_intake:   1,
    alcohol_intake:    0,
    smoking:           0,
    anxiety_level:     3,
    focus_level:       5,
    notes:             '',
  });

  // Pre-fill if editing
  useEffect(() => {
    if (existing) {
      setForm({
        stress_level:      existing.stress_level,
        sleep_hours:       existing.sleep_hours,
        mood_level:        existing.mood_level,
        energy_level:      existing.energy_level,
        pain_level:        existing.pain_level,
        exercise_minutes:  existing.exercise_minutes,
        nutrition_quality: existing.nutrition_quality,
        caffeine_intake:   existing.caffeine_intake,
        alcohol_intake:    existing.alcohol_intake,
        smoking:           existing.smoking,
        anxiety_level:     existing.anxiety_level,
        focus_level:       existing.focus_level,
        notes:             existing.notes,
      });
    }
  }, [existing]);

  const set = useCallback(<K extends keyof typeof form>(key: K, value: typeof form[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    try {
      await saveLog(form);
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', extractErrorMessage(err));
    }
  }, [form, saveLog, navigation]);

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ padding: spacing[5] }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.pageTitle, { color: colors.textPrimary, fontSize: typography.xl, fontWeight: '700', marginBottom: spacing[5] }]}>
          {logId ? 'Edit Wellness Log' : "How are you today?"}
        </Text>

        {/* Mental */}
        <Card style={{ marginBottom: spacing[4] }}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: typography.base, fontWeight: '600', marginBottom: spacing[3] }]}>
            🧠  Mental
          </Text>
          <Stepper label="Stress Level"  value={form.stress_level}  min={1} max={10} onChange={(v) => set('stress_level', v)}  emoji="😰" />
          <Stepper label="Mood"          value={form.mood_level}    min={1} max={5}  onChange={(v) => set('mood_level', v)}    emoji="😊" />
          <Stepper label="Anxiety Level" value={form.anxiety_level} min={1} max={10} onChange={(v) => set('anxiety_level', v)} emoji="😟" />
          <Stepper label="Focus Level"   value={form.focus_level}   min={1} max={10} onChange={(v) => set('focus_level', v)}   emoji="🎯" />
        </Card>

        {/* Physical */}
        <Card style={{ marginBottom: spacing[4] }}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: typography.base, fontWeight: '600', marginBottom: spacing[3] }]}>
            💪  Physical
          </Text>
          <Stepper label="Energy Level"      value={form.energy_level}      min={1} max={10} onChange={(v) => set('energy_level', v)}      emoji="⚡" />
          <Stepper label="Pain Level"        value={form.pain_level}        min={0} max={10} onChange={(v) => set('pain_level', v)}        emoji="🤕" />
          <Stepper label="Exercise (min)"    value={form.exercise_minutes}  min={0} max={180} onChange={(v) => set('exercise_minutes', v)} emoji="🏃" />
          <Stepper label="Nutrition Quality" value={form.nutrition_quality} min={1} max={5}  onChange={(v) => set('nutrition_quality', v)} emoji="🥗" />
        </Card>

        {/* Lifestyle */}
        <Card style={{ marginBottom: spacing[4] }}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: typography.base, fontWeight: '600', marginBottom: spacing[3] }]}>
            🌙  Lifestyle
          </Text>
          <Stepper label="Sleep (hours)"    value={form.sleep_hours}     min={0} max={12} onChange={(v) => set('sleep_hours', v)}     emoji="😴" />
          <Stepper label="Caffeine (cups)"  value={form.caffeine_intake} min={0} max={10} onChange={(v) => set('caffeine_intake', v)} emoji="☕" />
          <Stepper label="Alcohol (units)"  value={form.alcohol_intake}  min={0} max={10} onChange={(v) => set('alcohol_intake', v)}  emoji="🍷" />
          <Stepper label="Smoking"          value={form.smoking}         min={0} max={20} onChange={(v) => set('smoking', v)}         emoji="🚬" />
        </Card>

        {/* Notes */}
        <Card style={{ marginBottom: spacing[6] }}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, fontSize: typography.base, fontWeight: '600', marginBottom: spacing[3] }]}>
            📝  Notes
          </Text>
          <Input
            placeholder="How are you feeling today? Any observations…"
            value={form.notes}
            onChangeText={(v) => set('notes', v)}
            multiline
            numberOfLines={4}
            style={{ minHeight: 80, textAlignVertical: 'top' }}
          />
        </Card>

        <Button label="Save Log" onPress={handleSave} loading={isPending} fullWidth size="lg" />
        <Button label="Cancel"   onPress={() => navigation.goBack()} variant="ghost" fullWidth style={{ marginTop: spacing[3] }} />

        <View style={{ height: spacing[8] }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex:         { flex: 1 },
  pageTitle:    {},
  sectionTitle: {},
  stepperRow:   { flexDirection: 'row', alignItems: 'center' },
  stepperControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn:      { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
});
