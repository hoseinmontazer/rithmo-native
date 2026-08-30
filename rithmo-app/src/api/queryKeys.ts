/**
 * Centralised React Query key factory.
 * Keeps cache invalidation consistent across the app.
 */
export const queryKeys = {
  auth: {
    me: () => ['auth', 'me'] as const,
  },
  profile: {
    all: () => ['profile'] as const,
    invitation: () => ['profile', 'invitation'] as const,
    shareSettings: () => ['profile', 'shareSettings'] as const,
  },
  periods: {
    all: () => ['periods'] as const,
    list: (role?: 'partner') => ['periods', 'list', role ?? 'self'] as const,
    detail: (id: number) => ['periods', 'detail', id] as const,
    cycleAnalysis: (role?: 'partner') => ['periods', 'cycleAnalysis', role ?? 'self'] as const,
    cycleInsights: () => ['periods', 'cycleInsights'] as const,
    wellnessCorrelation: () => ['periods', 'wellnessCorrelation'] as const,
    symptomPatterns: () => ['periods', 'symptomPatterns'] as const,
    analyticsCycle: (role?: 'partner', mode?: 'analysis') => ['periods', 'analyticsCycle', role ?? 'self', mode ?? 'full'] as const,
  },
  ovulation: {
    latest: () => ['ovulation', 'latest'] as const,
    forPeriod: (periodId: number) => ['ovulation', periodId] as const,
  },
  wellness: {
    all: () => ['wellness'] as const,
    // The window is part of the identity — a 30-day list and a 90-day list
    // are different data and must not share a cache entry.
    list: (bounds?: { days?: number; limit?: number }) =>
      ['wellness', 'list', bounds?.days ?? 'all', bounds?.limit ?? 'all'] as const,
    detail: (id: number) => ['wellness', id] as const,
    analytics: (days: number) => ['wellness', 'analytics', days] as const,
    streaks: () => ['wellness', 'streaks'] as const,
    today: () => ['wellness', 'today'] as const,
    weeklySummary: () => ['wellness', 'weeklySummary'] as const,
  },
  notifications: {
    all: () => ['notifications'] as const,
    unread: () => ['notifications', 'unread'] as const,
    preferences: () => ['notifications', 'preferences'] as const,
    pushTokens: () => ['notifications', 'pushTokens'] as const,
  },
  messages: {
    all: () => ['messages'] as const,
    conversation: (partnerId: string) => ['messages', 'conversation', partnerId] as const,
    unread: () => ['messages', 'unread'] as const,
  },
  medications: {
    types: () => ['medications', 'types'] as const,
    type: (id: number) => ['medications', 'types', id] as const,
    drugs: () => ['medications', 'drugs'] as const,
    drug: (id: number) => ['medications', 'drugs', id] as const,
    drugSearch: (q: string) => ['medications', 'drugs', 'search', q] as const,
    userMedications: () => ['medications', 'userMedications'] as const,
    userMedication: (id: number) => ['medications', 'userMedications', id] as const,
    logs: () => ['medications', 'logs'] as const,
    log: (id: number) => ['medications', 'logs', id] as const,
    reminders: () => ['medications', 'reminders'] as const,
    reminder: (id: number) => ['medications', 'reminders', id] as const,
  },
  dashboard: {
    correlations: () => ['dashboard', 'correlations'] as const,
    comparison:   () => ['dashboard', 'comparison']   as const,
  },
  intelligence: {
    all: () => ['intelligence'] as const,
    today: () => ['intelligence', 'today'] as const,
    insights: (includeInsufficient?: boolean) =>
      ['intelligence', 'insights', includeInsufficient ? 'all' : 'supported'] as const,
    progress: () => ['intelligence', 'progress'] as const,
    partnerToday: () => ['intelligence', 'partner', 'today'] as const,
  },
  subscription: {
    status: () => ['subscription', 'status'] as const,
  },
  pregnancy: {
    all: () => ['pregnancy'] as const,
    status: () => ['pregnancy', 'status'] as const,
  },
  aiReflection: {
    daily: () => ['aiReflection', 'daily'] as const,
    partner: () => ['aiReflection', 'partner'] as const,
    cycleChange: () => ['aiReflection', 'cycleChange'] as const,
    weeklyReview: () => ['aiReflection', 'weeklyReview'] as const,
  },
  support: {
    all: () => ['support'] as const,
    list: () => ['support', 'list'] as const,
    detail: (id: number) => ['support', 'detail', id] as const,
  },
} as const;
