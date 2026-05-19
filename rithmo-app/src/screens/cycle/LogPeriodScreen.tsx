import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@hooks/useTheme';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Button, Icon } from '@components/ui';
import type { CycleStackParamList } from '@navigation/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<CycleStackParamList, 'LogPeriod'>;

export default function LogPeriodScreen() {
  const navigation = useNavigation<Props['navigation']>();
  const { colors, spacing, typography, borderRadius } = useTheme();
  const queryClient = useQueryClient();

  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [medication, setMedication] = useState('');
  const [cycleLength, setCycleLength] = useState('28');
  const [periodDuration, setPeriodDuration] = useState('5');

  // Create period mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/periods/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create period');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['periods'] });
      queryClient.invalidateQueries({ queryKey: ['cycle', 'analysis'] });
      Alert.alert('Success', 'Period logged successfully');
      navigation.goBack();
    },
    onError: () => {
      Alert.alert('Error', 'Failed to log period');
    },
  });

  const handleSubmit = () => {
    if (!startDate) {
      Alert.alert('Error', 'Please select a start date');
      return;
    }

    createMutation.mutate({
      start_date: startDate,
      end_date: endDate || undefined,
      symptoms: symptoms || undefined,
      medication: medication || undefined,
      cycle_length: parseInt(cycleLength) || 28,
      period_duration: parseInt(periodDuration) || 5,
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
          Track your menstrual cycle
        </Text>
      </View>

      {/* ── Form ────────────────────────────────────────────────────────── */}
      <View style={{ paddingHorizontal: spacing[5], marginTop: spacing[6] }}>
        {/* Start Date */}
        <View style={{ marginBottom: spacing[5] }}>
          <Text style={[{ color: colors.textPrimary, fontSize: typography.sm, fontWeight: '600', marginBottom: spacing[2] }]}>
            Start Date *
          </Text>
          <TouchableOpacity
            style={[
              {
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: borderRadius.lg,
                paddingHorizontal: spacing[4],
                paddingVertical: spacing[3],
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              },
            ]}
          >
            <Text style={[{ color: colors.textPrimary, fontSize: typography.base }]}>
              {new Date(startDate).toLocaleDateString()}
            </Text>
            <Icon name="calendar" size={20} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[{ color: colors.textTertiary, fontSize: typography.xs, marginTop: spacing[1] }]}>
            When did your period start?
          </Text>
        </View>

        {/* End Date */}
        <View style={{ marginBottom: spacing[5] }}>
          <Text style={[{ color: colors.textPrimary, fontSize: typography.sm, fontWeight: '600', marginBottom: spacing[2] }]}>
            End Date (Optional)
          </Text>
          <TouchableOpacity
            style={[
              {
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.border,
                borderRadius: borderRadius.lg,
                paddingHorizontal: spacing[4],
                paddingVertical: spacing[3],
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              },
            ]}
          >
            <Text style={[{ color: endDate ? colors.textPrimary : colors.textTertiary, fontSize: typography.base }]}>
              {endDate ? new Date(endDate).toLocaleDateString() : 'Select end date'}
            </Text>
            <Icon name="calendar" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Cycle Length */}
        <View style={{ marginBottom: spacing[5] }}>
          <Text style={[{ color: colors.textPrimary, fontSize: typography.sm, fontWeight: '600', marginBottom: spacing[2] }]}>
            Cycle Length (days)
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
              },
            ]}
            placeholder="28"
            placeholderTextColor={colors.textTertiary}
            value={cycleLength}
            onChangeText={setCycleLength}
            keyboardType="number-pad"
          />
        </View>

        {/* Period Duration */}
        <View style={{ marginBottom: spacing[5] }}>
          <Text style={[{ color: colors.textPrimary, fontSize: typography.sm, fontWeight: '600', marginBottom: spacing[2] }]}>
            Period Duration (days)
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
              },
            ]}
            placeholder="5"
            placeholderTextColor={colors.textTertiary}
            value={periodDuration}
            onChangeText={setPeriodDuration}
            keyboardType="number-pad"
          />
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
          <Text style={[{ color: colors.textTertiary, fontSize: typography.xs, marginTop: spacing[1] }]}>
            Separate multiple symptoms with commas
          </Text>
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
          <Text style={[{ color: colors.textTertiary, fontSize: typography.xs, marginTop: spacing[1] }]}>
            What did you take to manage symptoms?
          </Text>
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
