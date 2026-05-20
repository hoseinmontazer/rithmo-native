import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@hooks/useTheme';
import { Card, Button, Icon } from '@components/ui';
import type { CycleStackParamList } from '@navigation/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCreatePeriod } from '@hooks/queries/usePeriods';

type Props = NativeStackScreenProps<CycleStackParamList, 'LogPeriod'>;

// Simple date picker component
function DatePickerModal({
  visible,
  date,
  onClose,
  onSelect,
}: {
  visible: boolean;
  date: Date;
  onClose: () => void;
  onSelect: (date: Date) => void;
}) {
  const { colors, spacing, typography, borderRadius } = useTheme();
  const [selectedDate, setSelectedDate] = useState(date);

  const today = new Date();
  const dates: Date[] = [];
  
  // Generate last 60 days
  for (let i = 0; i < 60; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dates.push(d);
  }

  const formatDateFull = (d: Date) => {
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const isToday = (d: Date) => {
    return d.toDateString() === today.toDateString();
  };

  const isSelected = (d: Date) => {
    return d.toDateString() === selectedDate.toDateString();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: borderRadius.xl,
            borderTopRightRadius: borderRadius.xl,
            maxHeight: '70%',
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: spacing[5],
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Text style={{ color: colors.textPrimary, fontSize: typography.lg, fontWeight: '600' }}>
              Select Date
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Date List */}
          <ScrollView style={{ maxHeight: 400 }}>
            {dates.map((d, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => setSelectedDate(d)}
                style={{
                  paddingHorizontal: spacing[5],
                  paddingVertical: spacing[4],
                  backgroundColor: isSelected(d) ? colors.primary + '15' : 'transparent',
                  borderLeftWidth: isSelected(d) ? 4 : 0,
                  borderLeftColor: colors.primary,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View>
                    <Text
                      style={{
                        color: isSelected(d) ? colors.primary : colors.textPrimary,
                        fontSize: typography.base,
                        fontWeight: isSelected(d) ? '600' : '400',
                      }}
                    >
                      {formatDateFull(d)}
                    </Text>
                    {isToday(d) && (
                      <Text style={{ color: colors.primary, fontSize: typography.xs, marginTop: 2 }}>
                        Today
                      </Text>
                    )}
                  </View>
                  {isSelected(d) && <Icon name="check-circle" size={24} color={colors.primary} />}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Footer */}
          <View
            style={{
              padding: spacing[5],
              borderTopWidth: 1,
              borderTopColor: colors.border,
            }}
          >
            <Button
              label="Confirm"
              onPress={() => {
                onSelect(selectedDate);
                onClose();
              }}
              size="lg"
              fullWidth
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function LogPeriodScreen() {
  const navigation = useNavigation<Props['navigation']>();
  const { colors, spacing, typography, borderRadius } = useTheme();

  const [startDate, setStartDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [symptoms, setSymptoms] = useState('');
  const [medication, setMedication] = useState('');
  const [cycleLength, setCycleLength] = useState('28');
  const [periodDuration, setPeriodDuration] = useState('5');

  // Use the proper mutation hook
  const createMutation = useCreatePeriod();

  const handleSubmit = () => {
    createMutation.mutate(
      {
        start_date: startDate.toISOString().split('T')[0],
        symptoms: symptoms || undefined,
        medication: medication || undefined,
        cycle_length: parseInt(cycleLength) || 28,
        period_duration: parseInt(periodDuration) || 5,
      },
      {
        onSuccess: () => {
          Alert.alert('Success', 'Period logged successfully');
          navigation.goBack();
        },
        onError: (error: any) => {
          const errorMessage = error?.response?.data?.message || 'Failed to log period';
          Alert.alert('Error', errorMessage);
        },
      }
    );
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: spacing[10] }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View
        style={[
          {
            backgroundColor: colors.surface,
            paddingHorizontal: spacing[5],
            paddingTop: spacing[6],
            paddingBottom: spacing[5],
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[{ color: colors.textPrimary, fontSize: typography.lg, fontWeight: '600' }]}>
          Log Period
        </Text>
        <Text style={[{ color: colors.textSecondary, fontSize: typography.sm, marginTop: spacing[1] }]}>
          Track when your period started
        </Text>
      </View>

      {/* ── Form ────────────────────────────────────────────────────────── */}
      <View style={{ paddingHorizontal: spacing[5], marginTop: spacing[6] }}>
        {/* Start Date */}
        <View style={{ marginBottom: spacing[6] }}>
          <Text style={[{ color: colors.textPrimary, fontSize: typography.sm, fontWeight: '600', marginBottom: spacing[2] }]}>
            Period Start Date
          </Text>
          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            style={[
              {
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: borderRadius.lg,
                paddingHorizontal: spacing[4],
                paddingVertical: spacing[4],
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              },
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[3] }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: borderRadius.md,
                  backgroundColor: colors.menstrual + '20',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="calendar" size={20} color={colors.menstrual} />
              </View>
              <View>
                <Text style={[{ color: colors.textPrimary, fontSize: typography.base, fontWeight: '600' }]}>
                  {formatDate(startDate)}
                </Text>
                <Text style={[{ color: colors.textTertiary, fontSize: typography.xs, marginTop: 2 }]}>
                  Tap to change date
                </Text>
              </View>
            </View>
            <Icon name="chevron-right" size={20} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        <DatePickerModal
          visible={showDatePicker}
          date={startDate}
          onClose={() => setShowDatePicker(false)}
          onSelect={setStartDate}
        />

        {/* Quick Info Card */}
        <Card style={{ marginBottom: spacing[6], backgroundColor: colors.primary + '10' }}>
          <View style={{ flexDirection: 'row', gap: spacing[3] }}>
            <Icon name="information-outline" size={20} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[{ color: colors.textPrimary, fontSize: typography.sm, lineHeight: 20 }]}>
                Log the first day of your period. You can update cycle details later.
              </Text>
            </View>
          </View>
        </Card>

        {/* Cycle Settings */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: borderRadius.lg,
            padding: spacing[4],
            marginBottom: spacing[5],
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text style={[{ color: colors.textPrimary, fontSize: typography.base, fontWeight: '600', marginBottom: spacing[4] }]}>
            Cycle Settings
          </Text>

          <View style={{ flexDirection: 'row', gap: spacing[4] }}>
            {/* Cycle Length */}
            <View style={{ flex: 1 }}>
              <Text style={[{ color: colors.textSecondary, fontSize: typography.xs, marginBottom: spacing[2] }]}>
                Cycle Length
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TextInput
                  style={[
                    {
                      backgroundColor: colors.background,
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: borderRadius.md,
                      paddingHorizontal: spacing[3],
                      paddingVertical: spacing[2],
                      color: colors.textPrimary,
                      fontSize: typography.base,
                      fontWeight: '600',
                      textAlign: 'center',
                      flex: 1,
                    },
                  ]}
                  value={cycleLength}
                  onChangeText={setCycleLength}
                  keyboardType="number-pad"
                  maxLength={2}
                />
                <Text style={[{ color: colors.textTertiary, fontSize: typography.sm, marginLeft: spacing[2] }]}>
                  days
                </Text>
              </View>
            </View>

            {/* Period Duration */}
            <View style={{ flex: 1 }}>
              <Text style={[{ color: colors.textSecondary, fontSize: typography.xs, marginBottom: spacing[2] }]}>
                Period Duration
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TextInput
                  style={[
                    {
                      backgroundColor: colors.background,
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: borderRadius.md,
                      paddingHorizontal: spacing[3],
                      paddingVertical: spacing[2],
                      color: colors.textPrimary,
                      fontSize: typography.base,
                      fontWeight: '600',
                      textAlign: 'center',
                      flex: 1,
                    },
                  ]}
                  value={periodDuration}
                  onChangeText={setPeriodDuration}
                  keyboardType="number-pad"
                  maxLength={1}
                />
                <Text style={[{ color: colors.textTertiary, fontSize: typography.sm, marginLeft: spacing[2] }]}>
                  days
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Symptoms */}
        <View style={{ marginBottom: spacing[5] }}>
          <Text style={[{ color: colors.textPrimary, fontSize: typography.sm, fontWeight: '600', marginBottom: spacing[2] }]}>
            Symptoms (Optional)
          </Text>
          <TextInput
            style={[
              {
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: borderRadius.lg,
                paddingHorizontal: spacing[4],
                paddingVertical: spacing[3],
                color: colors.textPrimary,
                fontSize: typography.base,
                minHeight: 100,
                textAlignVertical: 'top',
              },
            ]}
            placeholder="e.g., cramps, headache, fatigue"
            placeholderTextColor={colors.textTertiary}
            value={symptoms}
            onChangeText={setSymptoms}
            multiline
          />
        </View>

        {/* Medication */}
        <View style={{ marginBottom: spacing[6] }}>
          <Text style={[{ color: colors.textPrimary, fontSize: typography.sm, fontWeight: '600', marginBottom: spacing[2] }]}>
            Medication (Optional)
          </Text>
          <TextInput
            style={[
              {
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: borderRadius.lg,
                paddingHorizontal: spacing[4],
                paddingVertical: spacing[3],
                color: colors.textPrimary,
                fontSize: typography.base,
                minHeight: 80,
                textAlignVertical: 'top',
              },
            ]}
            placeholder="e.g., ibuprofen, heating pad"
            placeholderTextColor={colors.textTertiary}
            value={medication}
            onChangeText={setMedication}
            multiline
          />
        </View>

        {/* Submit Button */}
        <Button
          label={createMutation.isPending ? 'Saving...' : 'Save Period'}
          onPress={handleSubmit}
          disabled={createMutation.isPending}
          size="lg"
          fullWidth
        />

        {/* Cancel Button */}
        <Button
          label="Cancel"
          onPress={() => navigation.goBack()}
          variant="outline"
          size="lg"
          fullWidth
          style={{ marginTop: spacing[3] }}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
