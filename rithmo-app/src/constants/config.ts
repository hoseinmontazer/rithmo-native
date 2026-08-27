/**
 * API base URL.
 * Both dev and production point to the live Rithmo API.
 * Change the DEV_API_URL below if you run a local backend.
 */
const DEV_API_URL = 'https://api.rithmo.ir';
const PROD_API_URL = 'https://api.rithmo.ir';

export const API_BASE_URL = __DEV__ ? DEV_API_URL : PROD_API_URL;

export const API_TIMEOUT_MS = 15_000;

export const API_ENDPOINTS = {
  // Auth
  AUTH_LOGIN: '/api/auth/jwt/create/',
  AUTH_REFRESH: '/api/auth/jwt/refresh/',
  AUTH_VERIFY: '/api/auth/jwt/verify/',
  AUTH_REGISTER: '/api/auth/users/',
  AUTH_ACTIVATE: '/api/auth/users/activation/',
  AUTH_ME: '/api/auth/users/me/',
  AUTH_SET_PASSWORD: '/api/auth/users/set_password/',
  AUTH_RESET_PASSWORD: '/api/auth/users/reset_password/',
  AUTH_RESET_PASSWORD_CONFIRM: '/api/auth/users/reset_password_confirm/',

  // Profile
  USER_PROFILE: '/api/user/profile/',
  USER_INVITATION: '/api/user/invitation/',
  USER_PARTNER_REMOVE: '/api/user/partner/remove/',
  USER_PARTNER_SELF_REVOKE: '/api/user/partner/self-revoke/',
  USER_SHARE_SETTINGS: '/api/user/share-settings/',

  // Periods
  PERIODS: '/api/periods/',
  PERIODS_UPDATE_LATEST: '/api/periods/update/',
  PERIODS_CYCLE_ANALYSIS: '/api/periods/cycle_analysis/',
  PERIODS_CYCLE_INSIGHTS: '/api/periods/cycle_insights/',
  PERIODS_WELLNESS_CORRELATION: '/api/periods/wellness_correlation/',
  PERIODS_SYMPTOM_PATTERNS: '/api/periods/symptom_patterns/',

  // Analytics (newer endpoints)
  ANALYTICS_CYCLE: '/api/analytics/cycle/',

  // Personal intelligence — the server-side pattern/guidance engine.
  // Insights and recommendations are computed there, not on the device,
  // so the phone, notifications and the partner view can never disagree
  // about what the user's data says.
  INTELLIGENCE_TODAY: '/api/intelligence/today/',
  INTELLIGENCE_INSIGHTS: '/api/intelligence/insights/',
  INTELLIGENCE_INSIGHT_DISMISS: '/api/intelligence/insights/',
  INTELLIGENCE_ACTIONS: '/api/intelligence/actions/',
  INTELLIGENCE_PROGRESS: '/api/intelligence/progress/',
  INTELLIGENCE_PARTNER_TODAY: '/api/intelligence/partner/today/',

  // Ovulation — nested under analytics/, not a top-level router (there was
  // never a bare "/api/ovulation/" route; this pointed at a 404).
  OVULATION: '/api/analytics/ovulation/',

  // Wellness
  WELLNESS: '/api/wellness/',
  WELLNESS_ANALYTICS: '/api/wellness/analytics/',
  WELLNESS_STREAKS: '/api/wellness/streaks/',
  WELLNESS_TODAY: '/api/wellness/today/',
  WELLNESS_WEEKLY_SUMMARY: '/api/wellness/weekly-summary/',

  // Notifications
  NOTIFICATIONS: '/api/notifications/notifications/',
  NOTIFICATIONS_UNREAD: '/api/notifications/notifications/unread/',
  NOTIFICATIONS_MARK_ALL_READ: '/api/notifications/notifications/mark_all_read/',
  NOTIFICATIONS_PREFERENCES: '/api/notifications/preferences/',
  NOTIFICATIONS_PREFERENCES_UPDATE: '/api/notifications/preferences/update_preferences/',
  PUSH_TOKENS: '/api/notifications/push-tokens/',
  GENERATE_NOTIFICATIONS: '/api/generate-notifications/',

  // Messages
  MESSAGES: '/api/notifications/messages/',
  MESSAGES_CONVERSATION: '/api/notifications/messages/conversation/',
  MESSAGES_UNREAD: '/api/notifications/messages/unread/',

  // AI
  AI_SUGGESTIONS: '/api/ai/suggestions/',
  AI_SUGGESTION_HISTORY: '/api/ai/suggestion-history/',
  AI_MODEL_STATUS: '/api/ai/model-status/',
  AI_DEBUG_SUGGESTIONS: '/api/ai/debug-suggestions/',
  AI_FEEDBACK: '/api/ai/feedback/',

  // Dashboard
  DASHBOARD_CORRELATIONS: '/api/dashboard/correlations/',
  DASHBOARD_COMPARISON: '/api/dashboard/comparison/',

  // Medications
  MEDICATION_TYPES: '/api/medications/types/',
  MEDICATION_DRUGS: '/api/medications/drugs/',
  MEDICATION_DRUG_SEARCH: '/api/medications/drugs/search/',
  USER_MEDICATIONS: '/api/medications/my-medications/',
  MEDICATION_LOGS: '/api/medications/logs/',
  MEDICATION_REMINDERS: '/api/medications/reminders/',
  // Subscriptions
  SUBSCRIPTION_STATUS: '/api/subscriptions/status/',
  STRIPE_WEBHOOK:      '/api/subscriptions/webhook/',

  // Pregnancy (premium)
  PREGNANCY:     '/api/pregnancy/',
  PREGNANCY_END: '/api/pregnancy/end/',

  // AI Daily Reflection (premium) — backend-owned Qwen pipeline; the app
  // never talks to the AI provider directly.
  AI_DAILY_REFLECTION: '/api/ai/daily-reflection/',

  // Support (user-facing tickets; internal notes are server-side only)
  SUPPORT_TICKETS: '/api/support/tickets/',
} as const;

export const KEYCHAIN_SERVICE = 'com.rithmo.auth';
export const QUERY_STALE_TIME_MS = 5 * 60 * 1000; // 5 minutes
export const QUERY_CACHE_TIME_MS = 10 * 60 * 1000; // 10 minutes
