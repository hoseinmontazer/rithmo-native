import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, KeyboardAvoidingView,
  Platform, StyleSheet, Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@hooks/useTheme';
import { useCreateOrUpdateWellnessLog, useWellnessLog } from '@hooks/queries/useWellness';
import { Button, Input, Card } from '@components/ui';
import { extractErrorMessage } from '@utils/errorHandler';
import type { WellnessScreenProps } from '@navigation/types';

type Props = WellnessScreenProps<'LogWellness'>;

// Custom draggable slider using PanResponder
function CustomSlider({ 
  value, 
  min, 
  max, 
  onChange, 
  color,
  step = 1
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  color: string;
  step?: number;
}) {
  const { colors, borderRadius } = useTheme();
  const [sliderWidth, setSliderWidth] = useState(0);

  const handleLayout = (event: any) => {
    setSliderWidth(event.nativeEvent.layout.width);
  };

  const handleTouch = (event: any) => {
    if (sliderWidth === 0) return;
    
    const locationX = event.nativeEvent.locationX;
    const percentage = Math.max(0, Math.min(1, locationX / sliderWidth));
    const rawValue = min + percentage * (max - min);
    const newValue = Math.round(rawValue / step) * step;
    
    // Clamp to min/max
    const clampedValue = Math.max(min, Math.min(max, newValue));
    onChange(clampedValue);
  };

  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <View 
      style={[styles.sliderTrack, { backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius.full }]}
      onStartShouldSetResponder={() => true}
      onResponderGrant={handleTouch}
      onResponderMove={handleTouch}
      onLayout={handleLayout}
    >
      <View 
        style={[
          styles.sliderFill, 
          { 
            width: `${percentage}%`, 
            backgroundColor: color,
            borderRadius: borderRadius.full 
          }
        ]} 
      />
      <View 
        style={[
          styles.sliderThumb, 
          { 
            left: `${percentage}%`, 
            backgroundColor: color,
            borderRadius: borderRadius.full,
            marginLeft: -10
          }
        ]} 
      />
    </View>
  );
}

// Draggable slider metric
function SliderMetric({ 
  icon, 
  label, 
  value, 
  min, 
  max, 
  onChange, 
  iconColor,
  unit,
  step = 1
}: {
  icon: string;
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  iconColor: string;
  unit?: string;
  step?: number;
}) {
  const { colors, spacing, typography, borderRadius } = useTheme();
  
  return (
    <View style={{ marginBottom: spacing[4] }}>
      <View style={styles.sliderHeader}>
        <View style={[styles.iconBadge, { backgroundColor: iconColor + '15', borderRadius: borderRadius.md }]}>
          <Icon name={icon} size={20} color={iconColor} />
        </View>
        <Text style={{ color: colors.textPrimary, fontSize: typography.sm, fontWeight: '600', flex: 1, marginLeft: spacing[2] }}>
          {label}
        </Text>
        <View style={[styles.valueBadge, { backgroundColor: iconColor + '20', borderRadius: borderRadius.full, paddingHorizontal: spacing[3], paddingVertical: spacing[1] }]}>
          <Text style={{ color: iconColor, fontSize: typography.base, fontWeight: '700' }}>
            {value}{unit ? ` ${unit}` : ''}
          </Text>
        </View>
      </View>
      <CustomSlider
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={onChange}
        color={iconColor}
      />
      <View style={styles.sliderLabels}>
        <Text style={{ color: colors.textSecondary, fontSize: typography.xs }}>
          {min}{unit ? ` ${unit}` : ''}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: typography.xs }}>
          {max}{unit ? ` ${unit}` : ''}
        </Text>
      </View>
    </View>
  );
}

export default function LogWellnessScreen() {
  const navigation = useNavigation<Props['navigation']>();
  const route      = useRoute<Props['route']>();
  const { colors, spacing, typography, borderRadius } = useTheme();

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
        <Text style={[styles.pageTitle, { color: colors.textPrimary, fontSize: typography.xl, fontWeight: '700', marginBottom: spacing[1] }]}>
          {logId ? 'Edit Wellness Log' : "How are you today?"}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: typography.sm, marginBottom: spacing[5] }}>
          Drag the sliders to track your wellness
        </Text>

        {/* Mental Health */}
        <Card style={{ marginBottom: spacing[4], padding: spacing[4] }}>
          <View style={styles.sectionHeader}>
            <Icon name="brain" size={24} color="#FF6B6B" />
            <Text style={{ color: colors.textPrimary, fontSize: typography.lg, fontWeight: '700', marginLeft: spacing[2] }}>
              Mental Health
            </Text>
          </View>
          <View style={{ marginTop: spacing[4] }}>
            <SliderMetric 
              icon="emoticon-sad-outline" 
              label="Stress Level" 
              value={form.stress_level} 
              min={1} 
              max={10} 
              onChange={(v) => set('stress_level', Math.round(v))}
              iconColor="#FF6B6B"
            />
            <SliderMetric 
              icon="emoticon-happy-outline" 
              label="Mood" 
              value={form.mood_level} 
              min={1} 
              max={5} 
              onChange={(v) => set('mood_level', Math.round(v))}
              iconColor="#FFD93D"
            />
            <SliderMetric 
              icon="heart-pulse" 
              label="Anxiety Level" 
              value={form.anxiety_level} 
              min={1} 
              max={10} 
              onChange={(v) => set('anxiety_level', Math.round(v))}
              iconColor="#A8DADC"
            />
            <SliderMetric 
              icon="target" 
              label="Focus Level" 
              value={form.focus_level} 
              min={1} 
              max={10} 
              onChange={(v) => set('focus_level', Math.round(v))}
              iconColor="#457B9D"
            />
          </View>
        </Card>

        {/* Physical Health */}
        <Card style={{ marginBottom: spacing[4], padding: spacing[4] }}>
          <View style={styles.sectionHeader}>
            <Icon name="arm-flex" size={24} color="#F4A261" />
            <Text style={{ color: colors.textPrimary, fontSize: typography.lg, fontWeight: '700', marginLeft: spacing[2] }}>
              Physical Health
            </Text>
          </View>
          <View style={{ marginTop: spacing[4] }}>
            <SliderMetric 
              icon="lightning-bolt" 
              label="Energy Level" 
              value={form.energy_level} 
              min={1} 
              max={10} 
              onChange={(v) => set('energy_level', Math.round(v))}
              iconColor="#F4A261"
            />
            <SliderMetric 
              icon="bandage" 
              label="Pain Level" 
              value={form.pain_level} 
              min={0} 
              max={10} 
              onChange={(v) => set('pain_level', Math.round(v))}
              iconColor="#E76F51"
            />
            <SliderMetric 
              icon="run" 
              label="Exercise" 
              value={form.exercise_minutes} 
              min={0} 
              max={180} 
              step={5}
              onChange={(v) => set('exercise_minutes', Math.round(v))}
              iconColor="#2A9D8F"
              unit="min"
            />
            <SliderMetric 
              icon="food-apple" 
              label="Nutrition Quality" 
              value={form.nutrition_quality} 
              min={1} 
              max={5} 
              onChange={(v) => set('nutrition_quality', Math.round(v))}
              iconColor="#6A994E"
            />
          </View>
        </Card>

        {/* Lifestyle */}
        <Card style={{ marginBottom: spacing[4], padding: spacing[4] }}>
          <View style={styles.sectionHeader}>
            <Icon name="home-heart" size={24} color="#9D4EDD" />
            <Text style={{ color: colors.textPrimary, fontSize: typography.lg, fontWeight: '700', marginLeft: spacing[2] }}>
              Lifestyle
            </Text>
          </View>
          <View style={{ marginTop: spacing[4] }}>
            <SliderMetric 
              icon="sleep" 
              label="Sleep" 
              value={form.sleep_hours} 
              min={0} 
              max={12} 
              step={0.5}
              onChange={(v) => set('sleep_hours', Math.round(v * 2) / 2)}
              iconColor="#9D4EDD"
              unit="hrs"
            />
            <SliderMetric 
              icon="coffee" 
              label="Caffeine" 
              value={form.caffeine_intake} 
              min={0} 
              max={10} 
              onChange={(v) => set('caffeine_intake', Math.round(v))}
              iconColor="#8B4513"
              unit="cups"
            />
            <SliderMetric 
              icon="glass-wine" 
              label="Alcohol" 
              value={form.alcohol_intake} 
              min={0} 
              max={10} 
              onChange={(v) => set('alcohol_intake', Math.round(v))}
              iconColor="#C77DFF"
              unit="units"
            />
            <SliderMetric 
              icon="smoking" 
              label="Smoking" 
              value={form.smoking} 
              min={0} 
              max={20} 
              onChange={(v) => set('smoking', Math.round(v))}
              iconColor="#6C757D"
              unit="cigs"
            />
          </View>
        </Card>

        {/* Notes */}
        <Card style={{ marginBottom: spacing[5], padding: spacing[4] }}>
          <View style={styles.sectionHeader}>
            <Icon name="note-text" size={24} color={colors.primary} />
            <Text style={{ color: colors.textPrimary, fontSize: typography.lg, fontWeight: '700', marginLeft: spacing[2] }}>
              Notes
            </Text>
          </View>
          <Input
            placeholder="How are you feeling today? Any observations…"
            value={form.notes}
            onChangeText={(v) => set('notes', v)}
            multiline
            numberOfLines={4}
            style={{ minHeight: 80, textAlignVertical: 'top', marginTop: spacing[3] }}
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
  flex: { flex: 1 },
  pageTitle: {},
  sectionHeader: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  sliderHeader: { 
    flexDirection: 'row', 
    alignItems: 'center',
    marginBottom: 12
  },
  iconBadge: { 
    width: 32, 
    height: 32, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  valueBadge: {
    minWidth: 50,
    alignItems: 'center'
  },
  sliderTrack: {
    height: 8,
    width: '100%',
    position: 'relative',
    marginVertical: 8
  },
  sliderFill: {
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0
  },
  sliderThumb: {
    width: 20,
    height: 20,
    position: 'absolute',
    top: -6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5
  },
  sliderLabels: { 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    marginTop: 4
  },
});
