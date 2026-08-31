/**
 * strings.fa.ts — the single source of Persian UI text that is NOT owned by
 * a screen.
 *
 * Two responsibilities, and nothing else:
 *
 *   1. **Navigation titles.** They used to be English literals scattered
 *      across `navigation/stacks/*.tsx` — 19 of 24 shipped as "Profile",
 *      "Wellness", "Cycle Analytics", left-aligned above RTL screens.
 *      Header titles are the one string category no screen owns, so they
 *      have to live somewhere shared or they drift back to English.
 *
 *   2. **API value → Persian.** The backend legitimately returns machine
 *      values (`medium`, `menstrual`) and English prose (`"Day 1 of your
 *      period."`). Prose must never reach a user-facing component. The maps
 *      below are the transformation boundary: the client renders Persian
 *      built from the *code*, never the server's sentence.
 *
 * This is deliberately a plain object, not an i18n framework. The app is
 * Persian-only; adding a runtime locale system now would be scaffolding for
 * a requirement that does not exist. If a second locale is ever needed, the
 * shape here is what a framework would consume.
 */

export const navTitles = {
  // Home
  Home: 'خانه',
  Notifications: 'اعلان‌ها',

  // Cycle
  CycleAnalysis: 'چرخه من',
  CycleTracker: 'تقویم چرخه',
  EditPeriod: 'ویرایش دوره',
  LogPeriod: 'ثبت دوره',

  // Wellness / log
  QuickLog: 'ثبت امروز',
  WellnessDashboard: 'تاریخچه سلامت',
  LogWellness: 'ثبت کامل',
  Medications: 'داروها',

  // Insights
  InsightsHome: 'الگوهای من',
  DeepInsights: 'تحلیل عمیق',
  LearningTimeline: 'چیزهایی که یاد گرفته‌ام',

  // Profile
  Profile: 'پروفایل',
  EditProfile: 'ویرایش پروفایل',
  PartnerManage: 'شریک',
  PartnerMessages: 'پیام‌ها',
  Settings: 'تنظیمات',
  ChangePassword: 'تغییر رمز عبور',
  DeleteAccount: 'حذف حساب',
  Support: 'پشتیبانی',
  Upgrade: 'ریتمو پریمیوم',
  Pregnancy: 'بارداری',

  // Messages
  MessagesList: 'پیام‌ها',
  Conversation: 'گفت‌وگو',
} as const;

export type NavRouteName = keyof typeof navTitles;

// ---------------------------------------------------------------------------
// API value → Persian
// ---------------------------------------------------------------------------

/**
 * `prediction_confidence_label` from the cycle engine.
 * Was rendering as «میزان اطمینان پیش‌بینی: ۶۰٪ (medium)».
 */
export const confidenceLabels: Record<string, string> = {
  low: 'کم',
  medium: 'متوسط',
  high: 'زیاد',
  insufficient: 'داده کافی نیست',
  emerging: 'نشانه‌ی اولیه',
  repeated: 'الگوی تکرارشونده',
  established: 'الگوی تثبیت‌شده',
};

/**
 * Biological phases plus the lifecycle states the analytics service also
 * reports (`expected` / `late` / `overdue`).
 */
export const phaseLabels: Record<string, string> = {
  menstrual: 'قاعدگی',
  follicular: 'فولیکولار',
  ovulation: 'تخمک‌گذاری',
  luteal: 'لوتئال',
  expected: 'انتظار دوره',
  late: 'با تأخیر',
  overdue: 'عقب‌افتاده',
  unknown: 'نامشخص',
};

/**
 * Everyday wording for each phase, used where the clinical term would not
 * be understood. The clinical term stays available via `phaseLabels` for
 * users who want it.
 */
export const phasePlainLabels: Record<string, string> = {
  menstrual: 'روزهای دوره',
  follicular: 'نیمه اول چرخه',
  ovulation: 'روزهای تخمک‌گذاری',
  luteal: 'هفته‌های پیش از دوره',
  expected: 'انتظار دوره',
  late: 'دوره با تأخیر',
  overdue: 'دوره عقب‌افتاده',
  unknown: 'نامشخص',
};

/**
 * Signal keys from the intelligence engine (`intelligence/domain/signals.py`).
 *
 * The backend has its own `label_fa` on each SignalSpec, but the client maps
 * the CODE rather than rendering the server's string — same boundary rule as
 * every other value here, so wording stays owned by the UI.
 */
export const signalLabels: Record<string, string> = {
  mood: 'خلق',
  energy: 'انرژی',
  sleep: 'خواب',
  pain: 'درد',
  stress: 'استرس',
  anxiety: 'اضطراب',
  focus: 'تمرکز',
  exercise: 'تحرک',
  nutrition: 'تغذیه',
  water: 'آب',
  steps: 'قدم',
};

export const subscriptionStatusLabels: Record<string, string> = {
  active: 'فعال',
  trialing: 'دوره‌ی آزمایشی',
  canceled: 'لغو شده',
  past_due: 'پرداخت معوق',
  unpaid: 'پرداخت‌نشده',
  incomplete: 'ناتمام',
  incomplete_expired: 'منقضی‌شده',
  paused: 'متوقف',
  free: 'رایگان',
};

export const planLabels: Record<string, string> = {
  monthly: 'ماهانه',
  annual: 'سالانه',
  family: 'خانوادگی',
  trial: 'آزمایشی',
};

/**
 * Medication enums (`medications/models.py`).
 *
 * `UserMedication.frequency` and `.unit` are machine values. The Medications
 * screen rendered `med.frequency` straight through, so a Persian UI showed
 * «۱ tablet · daily». Same boundary rule as every other map here: the client
 * renders Persian built from the code, never the server's own string.
 */
export const medicationFrequencyLabels: Record<string, string> = {
  as_needed: 'در صورت نیاز',
  daily: 'روزانه',
  twice_daily: 'دو بار در روز',
  three_times_daily: 'سه بار در روز',
  weekly: 'هفتگی',
  monthly: 'ماهانه',
  custom: 'برنامه‌ی دلخواه',
};

export const medicationUnitLabels: Record<string, string> = {
  mg: 'میلی‌گرم',
  ml: 'میلی‌لیتر',
  tablet: 'قرص',
  capsule: 'کپسول',
  drop: 'قطره',
  unit: 'واحد',
  other: 'واحد',
};
