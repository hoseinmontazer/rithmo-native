export interface MedicationType {
  id: number;
  name: string;
  description: string;
  icon: string;
  color: string;
  is_active: boolean;
}

export type MedicationTypeRequest = Omit<MedicationType, 'id'>;

export interface MedicationDrug {
  id: number;
  name: string;
  generic_name: string;
  medication_type: number;
  description: string;
  common_dosages: string[];
  side_effects: string;
  contraindications: string;
  is_prescription: boolean;
  is_active: boolean;
}

export type MedicationDrugRequest = Omit<MedicationDrug, 'id'>;

export interface UserMedication {
  id: number;
  medication: number;
  custom_name: string;
  dosage: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'as_needed' | 'custom' | string;
  custom_frequency: string;
  start_date: string;
  end_date: string | null;
  notes: string;
  is_active: boolean;
}

export type UserMedicationRequest = Omit<UserMedication, 'id'>;

export interface MedicationLog {
  id: number;
  user_medication: number;
  date_taken: string;
  dosage_taken: string;
  effectiveness: number;
  side_effects_experienced: string;
  notes: string;
}

export type MedicationLogRequest = Omit<MedicationLog, 'id'>;

export interface MedicationReminder {
  id: number;
  user_medication: number;
  reminder_time: string;
  is_active: boolean;
  days_of_week: number[];
}

export type MedicationReminderRequest = Omit<MedicationReminder, 'id'>;
