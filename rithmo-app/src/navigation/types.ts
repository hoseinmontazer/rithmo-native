import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { Insight } from '@types/intelligence.types';

// ── Auth Stack ────────────────────────────────────────────────────────────────
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPasswordConfirm: { uid: string; token: string };
  ActivateAccount: { uid: string; token: string };
};

// ── Main Tab Navigator ────────────────────────────────────────────────────────
export type MainTabParamList = {
  HomeTab:         undefined;
  CycleTab:        undefined;
  LogTab:          undefined;
  InsightsTab:     undefined;
  ProfileTab:      undefined;
};

// ── Home Stack ────────────────────────────────────────────────────────────────
export type HomeStackParamList = {
  Home:            undefined;
  Notifications:   undefined;
  // Owner-only. The insight is passed as-is — it's already the exact object
  // TodayView/InsightListView returned, and re-fetching it by key would be a
  // duplicate call for data the caller already has in hand. There is no
  // partner-reachable route to this screen: PartnerHomeScreen renders no
  // trigger that navigates here, and the underlying data itself requires an
  // owner-authenticated request server-side regardless.
  InsightDetail:   { insight: Insight };
};

// ── Cycle Stack ───────────────────────────────────────────────────────────────
export type CycleStackParamList = {
  CycleTracker:    undefined;
  EditPeriod:      { periodId: number };
  LogPeriod:       undefined;
  CycleAnalysis:   undefined;
};

// ── Wellness / Log Stack ──────────────────────────────────────────────────────
export type WellnessStackParamList = {
  QuickLog:          { logId?: number };
  WellnessDashboard: undefined;
  LogWellness:       { logId?: number };   // legacy full-form (keep for backward compat)
  Medications:       undefined;
};

// ── Insights Stack ────────────────────────────────────────────────────────────
export type InsightsStackParamList = {
  InsightsHome:      undefined;
  DeepInsights:      undefined;
  // Owner-only by construction: InsightsTab is never mounted for a partner
  // role at all (see MainNavigator's `{!isPartner && ...}` gate), so this
  // route inherits that same guarantee without any privacy code of its own.
  LearningTimeline:  undefined;
};

// ── Profile Stack ─────────────────────────────────────────────────────────────
export type ProfileStackParamList = {
  Profile:         undefined;
  EditProfile:     undefined;
  PartnerManage:   undefined;
  PartnerMessages: undefined;
  Settings:        undefined;
  ChangePassword:  undefined;
  DeleteAccount:   undefined;
  Support:         undefined;
  Upgrade:         { featureName?: string };  // paywall — featureName shown in headline
  Pregnancy:       undefined;                 // premium-gated; shows setup or status internally
};

// ── Messages Stack ────────────────────────────────────────────────────────────
export type MessagesStackParamList = {
  MessagesList: undefined;
  Conversation: { partnerId: string; partnerName: string };
};

// ── Onboarding Stack ──────────────────────────────────────────────────────────
export type OnboardingStackParamList = {
  Onboarding: undefined;
};

// ── Screen prop helpers ───────────────────────────────────────────────────────
export type AuthScreenProps<T extends keyof AuthStackParamList> =
  NativeStackScreenProps<AuthStackParamList, T>;

export type HomeScreenProps<T extends keyof HomeStackParamList> =
  NativeStackScreenProps<HomeStackParamList, T>;

export type CycleScreenProps<T extends keyof CycleStackParamList> =
  NativeStackScreenProps<CycleStackParamList, T>;

export type WellnessScreenProps<T extends keyof WellnessStackParamList> =
  NativeStackScreenProps<WellnessStackParamList, T>;

export type InsightsScreenProps<T extends keyof InsightsStackParamList> =
  NativeStackScreenProps<InsightsStackParamList, T>;

export type ProfileScreenProps<T extends keyof ProfileStackParamList> =
  NativeStackScreenProps<ProfileStackParamList, T>;

export type MainTabScreenProps<T extends keyof MainTabParamList> =
  BottomTabScreenProps<MainTabParamList, T>;

export type MessagesScreenProps<T extends keyof MessagesStackParamList> =
  NativeStackScreenProps<MessagesStackParamList, T>;
