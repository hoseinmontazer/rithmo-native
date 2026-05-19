import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@hooks/useTheme';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Badge, Icon, Button } from '@components/ui';
import type { WellnessStackParamList } from '@navigation/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<WellnessStackParamList, 'Medications'>;

interface UserMedication {
  id: number;
  medication: number;
  medication_name: string;
  custom_name: string;
  dosage: string;
  frequency: string;
  start_date: string;
  end_date: string | null;
  notes: string;
  is_active: boolean;
}

interface MedicationLog {
  id: number;
  user_medication: number;
  date_taken: string;
  dosage_taken: string;
  effectiveness: number;
  side_effects_experienced: string;
  notes: string;
}

interface MedicationReminder {
  id: number;
  user_medication: number;
  reminder_time: string;
  is_active: boolean;
  days_of_week: number[];
}

export default function MedicationsScreen() {
  const navigation = useNavigation<Props['navigation']>();
  const { colors, spacing, typography, borderRadius } = useTheme();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = React.useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState<UserMedication | null>(null);

  // Fetch user medications
  const { data: medications, isLoading: medicationsLoading, refetch: refetchMedications } = useQuery({
    queryKey: ['medications', 'my-medications'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/medications/my-medications/');
        return response.json() as Promise<UserMedication[]>;
      } catch {
        return [];
      }
    },
  });

  // Fetch medication logs
  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ['medications', 'logs'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/medications/logs/');
        return response.json() as Promise<MedicationLog[]>;
      } catch {
        return [];
      }
    },
  });

  // Fetch medication reminders
  const { data: reminders, isLoading: remindersLoading } = useQuery({
    queryKey: ['medications', 'reminders'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/medications/reminders/');
        return response.json() as Promise<MedicationReminder[]>;
      } catch {
        return [];
      }
    },
  });

  // Delete medication mutation
  const deleteMutation = useMutation({
    mutationFn: async (medicationId: number) => {
      const response = await fetch(`/api/medications/my-medications/${medicationId}/`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete medication');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications', 'my-medications'] });
      Alert.alert('Success', 'Medication deleted successfully');
    },
    onError: () => {
      Alert.alert('Error', 'Failed to delete medication');
    },
  });

  // Log medication mutation
  const logMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/medications/logs/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to log medication');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medications', 'logs'] });
      Alert.alert('Success', 'Medication logged successfully');
    },
    onError: () => {
      Alert.alert('Error', 'Failed to log medication');
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchMedications();
    setRefreshing(false);
  }, [refetchMedications]);

  const handleDeleteMedication = (medicationId: number) => {
    Alert.alert(
      'Delete Medication',
      'Are you sure you want to delete this medication?',
      [
        { text: 'Cancel', onPress: () => {} },
        {
          text: 'Delete',
          onPress: () => deleteMutation.mutate(medicationId),
          style: 'destructive',
        },
      ]
    );
  };

  const handleLogMedication = (medication: UserMedication) => {
    logMutation.mutate({
      user_medication: medication.id,
      date_taken: new Date().toISOString(),
      dosage_taken: medication.dosage,
      effectiveness: 3,
      side_effects_experienced: '',
      notes: '',
    });
  };

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: spacing[10] }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <View style={{ paddingHorizontal: spacing[5], marginTop: spacing[6], marginBottom: spacing[3] }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={[{ color: colors.textPrimary, fontSize: typography.lg, fontWeight: '600' }]}>
            My Medications
          </Text>
          <TouchableOpacity
            onPress={() => setShowAddModal(true)}
            style={[
              {
                backgroundColor: colors.primary,
                borderRadius: borderRadius.lg,
                padding: spacing[2],
              },
            ]}
          >
            <Icon name="plus" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Active Medications ──────────────────────────────────────────── */}
      <View style={{ paddingHorizontal: spacing[5], marginTop: spacing[4] }}>
        <Text style={[{ color: colors.textSecondary, fontSize: typography.sm, fontWeight: '600', marginBottom: spacing[3] }]}>
          Active Medications
        </Text>

        {medicationsLoading ? (
          <View style={{ alignItems: 'center', paddingVertical: spacing[6] }}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : medications && medications.filter(m => m.is_active).length > 0 ? (
          medications.filter(m => m.is_active).map((medication) => (
            <Card key={medication.id} style={{ marginBottom: spacing[3] }}>
              <View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[{ color: colors.textPrimary, fontSize: typography.base, fontWeight: '600' }]}>
                      {medication.custom_name || medication.medication_name}
                    </Text>
                    <Text style={[{ color: colors.textSecondary, fontSize: typography.sm, marginTop: spacing[1] }]}>
                      {medication.dosage} • {medication.frequency}
                    </Text>
                    {medication.notes && (
                      <Text style={[{ color: colors.textTertiary, fontSize: typography.xs, marginTop: spacing[1] }]}>
                        {medication.notes}
                      </Text>
                    )}
                  </View>
                  <Badge label="Active" variant="success" />
                </View>

                {/* Action Buttons */}
                <View style={{ flexDirection: 'row', gap: spacing[2], marginTop: spacing[3] }}>
                  <TouchableOpacity
                    onPress={() => handleLogMedication(medication)}
                    style={[
                      {
                        flex: 1,
                        backgroundColor: colors.primaryLighter,
                        borderRadius: borderRadius.lg,
                        paddingVertical: spacing[2],
                        alignItems: 'center',
                      },
                    ]}
                  >
                    <Text style={[{ color: colors.primary, fontSize: typography.sm, fontWeight: '600' }]}>
                      Log Taken
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteMedication(medication.id)}
                    style={[
                      {
                        flex: 1,
                        backgroundColor: colors.border,
                        borderRadius: borderRadius.lg,
                        paddingVertical: spacing[2],
                        alignItems: 'center',
                      },
                    ]}
                  >
                    <Text style={[{ color: colors.textSecondary, fontSize: typography.sm, fontWeight: '600' }]}>
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
          ))
        ) : (
          <Card>
            <Text style={[{ color: colors.textSecondary, fontSize: typography.sm, textAlign: 'center' }]}>
              No active medications
            </Text>
          </Card>
        )}
      </View>

      {/* ── Medication Logs ─────────────────────────────────────────────── */}
      <View style={{ paddingHorizontal: spacing[5], marginTop: spacing[6] }}>
        <Text style={[{ color: colors.textSecondary, fontSize: typography.sm, fontWeight: '600', marginBottom: spacing[3] }]}>
          Recent Logs
        </Text>

        {logsLoading ? (
          <View style={{ alignItems: 'center', paddingVertical: spacing[6] }}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : logs && logs.length > 0 ? (
          logs.slice(0, 5).map((log) => (
            <Card key={log.id} style={{ marginBottom: spacing[3] }}>
              <View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[{ color: colors.textPrimary, fontSize: typography.sm, fontWeight: '600' }]}>
                      {new Date(log.date_taken).toLocaleDateString()}
                    </Text>
                    <Text style={[{ color: colors.textSecondary, fontSize: typography.xs, marginTop: spacing[1] }]}>
                      {log.dosage_taken}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={[{ color: colors.primary, fontSize: typography.lg, fontWeight: '700' }]}>
                      {log.effectiveness}
                    </Text>
                    <Text style={[{ color: colors.textTertiary, fontSize: typography.xs, marginTop: spacing[1] }]}>
                      effectiveness
                    </Text>
                  </View>
                </View>
                {log.side_effects_experienced && (
                  <Text style={[{ color: colors.textTertiary, fontSize: typography.xs, marginTop: spacing[2] }]}>
                    Side effects: {log.side_effects_experienced}
                  </Text>
                )}
              </View>
            </Card>
          ))
        ) : (
          <Card>
            <Text style={[{ color: colors.textSecondary, fontSize: typography.sm, textAlign: 'center' }]}>
              No medication logs yet
            </Text>
          </Card>
        )}
      </View>

      {/* ── Reminders ───────────────────────────────────────────────────── */}
      <View style={{ paddingHorizontal: spacing[5], marginTop: spacing[6], marginBottom: spacing[6] }}>
        <Text style={[{ color: colors.textSecondary, fontSize: typography.sm, fontWeight: '600', marginBottom: spacing[3] }]}>
          Reminders
        </Text>

        {remindersLoading ? (
          <View style={{ alignItems: 'center', paddingVertical: spacing[6] }}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : reminders && reminders.length > 0 ? (
          reminders.map((reminder) => (
            <Card key={reminder.id} style={{ marginBottom: spacing[3] }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={[{ color: colors.textPrimary, fontSize: typography.sm, fontWeight: '600' }]}>
                    {reminder.reminder_time}
                  </Text>
                  <Text style={[{ color: colors.textSecondary, fontSize: typography.xs, marginTop: spacing[1] }]}>
                    {reminder.days_of_week.length} days per week
                  </Text>
                </View>
                <Badge label={reminder.is_active ? 'Active' : 'Inactive'} variant={reminder.is_active ? 'success' : 'default'} />
              </View>
            </Card>
          ))
        ) : (
          <Card>
            <Text style={[{ color: colors.textSecondary, fontSize: typography.sm, textAlign: 'center' }]}>
              No reminders set
            </Text>
          </Card>
        )}
      </View>

      {/* ── Add Medication Modal ────────────────────────────────────────── */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={[{ flex: 1, backgroundColor: colors.background }]}>
          <View
            style={[
              {
                backgroundColor: colors.surface,
                paddingHorizontal: spacing[5],
                paddingTop: spacing[6],
                paddingBottom: spacing[3],
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
              },
            ]}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[{ color: colors.textPrimary, fontSize: typography.lg, fontWeight: '600' }]}>
                Add Medication
              </Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Icon name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={{ flex: 1, paddingHorizontal: spacing[5], paddingTop: spacing[6] }}>
            <Card>
              <Text style={[{ color: colors.textPrimary, fontSize: typography.sm, fontWeight: '600', marginBottom: spacing[3] }]}>
                Coming soon: Add medication form
              </Text>
              <Text style={[{ color: colors.textSecondary, fontSize: typography.sm }]}>
                This feature will allow you to add medications from the database or create custom medications.
              </Text>
            </Card>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
