/**
 * Types for the PRIVATE contraception records, personal reminders and
 * sexual-health check dates. Owner-only on the server; never part of the
 * profile payload, never sent to analytics or the AI, never shown to a partner.
 */
export type MethodCode =
  | 'male_condom' | 'female_condom' | 'combined_pill' | 'progestin_pill' | 'patch' | 'ring'
  | 'injection' | 'implant' | 'hormonal_iud' | 'copper_iud' | 'vasectomy' | 'tubal_sterilization'
  | 'withdrawal' | 'fertility_awareness' | 'other';

export interface ContraceptionRecord {
  id: number;
  method: MethodCode;
  started_on: string;
  stopped_on: string | null;
  is_active: boolean;
}

export type ReminderKind = 'daily' | 'every_n_days' | 'once';

export interface ContraceptionReminder {
  id: number;
  record_id: number | null;
  kind: ReminderKind;
  /** "HH:MM", the user's own wall-clock time. */
  time_local: string;
  utc_offset_minutes: number;
  interval_days: number | null;
  anchor_date: string | null;
  is_active: boolean;
  /** True while a pregnancy pauses reminders (they resume by themselves). */
  paused: boolean;
}

export type CheckType = 'sti_screening' | 'hpv_vaccine' | 'hepatitis_b_vaccine' | 'checkup';

export interface SexualHealthCheck {
  id: number;
  check_type: CheckType;
  done_on: string;
  next_due: string | null;
}

export type NoticeCode = 'pregnancy_active' | 'trying_to_conceive' | 'hormonal_method_cycle';

export interface SummaryNotice {
  code: NoticeCode;
  text_fa: string;
}

export interface CycleSide {
  count: number;
  average_length: number | null;
}

export interface LongitudinalRow {
  record_id: number;
  method: MethodCode;
  started_on: string;
  cycles_before: CycleSide;
  cycles_after: CycleSide;
}

export interface ContraceptionSummary {
  active_methods: ContraceptionRecord[];
  history: ContraceptionRecord[];
  reminders_paused: boolean;
  notices: SummaryNotice[];
  disclaimer_fa: string;
  premium_required: boolean;
  premium_teaser_fa?: string;
  /** Premium depth: the user's own cycle lengths around a recorded method. */
  longitudinal: { records: LongitudinalRow[]; note_fa: string } | null;
}

export interface CreateRecordRequest {
  method: MethodCode;
  started_on: string;
  stopped_on?: string | null;
}

export interface CreateReminderRequest {
  kind: ReminderKind;
  time_local: string;
  utc_offset_minutes: number;
  interval_days?: number | null;
  anchor_date?: string | null;
  record_id?: number | null;
}

export interface CreateCheckRequest {
  check_type: CheckType;
  done_on: string;
  next_due?: string | null;
}
