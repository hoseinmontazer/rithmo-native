# Rithmo — React Native App

Production-ready React Native period & cycle tracker built against the **Rithmo API** (`https://api.rithmo.ir`).

---

## Tech Stack

| Layer | Library |
|---|---|
| Framework | React Native 0.75 + TypeScript |
| Navigation | React Navigation 6 (Native Stack + Bottom Tabs) |
| State | Zustand 5 |
| Server state / caching | TanStack React Query 5 |
| HTTP | Axios 1.7 |
| Secure storage | react-native-keychain |
| Theme | Custom design system (light + dark) |

---

## Project Structure

```
src/
├── api/
│   ├── client.ts              # Axios instance + interceptors + auto-refresh
│   ├── queryKeys.ts           # Centralised React Query key factory
│   └── services/              # One file per API domain
│       ├── authService.ts
│       ├── profileService.ts
│       ├── periodService.ts
│       ├── wellnessService.ts
│       ├── notificationService.ts
│       └── aiService.ts
├── components/
│   ├── ui/                    # Button, Input, Card, Badge, LoadingState, ErrorState, EmptyState, Divider
│   ├── cycle/                 # CyclePhaseBanner, PeriodListItem
│   ├── wellness/              # WellnessMetricSlider
│   ├── notifications/         # NotificationItem
│   └── messages/              # MessageBubble
├── constants/
│   └── config.ts              # API URLs, endpoints, timeouts
├── hooks/
│   ├── useAuth.ts
│   ├── useTheme.ts
│   └── queries/               # usePeriods, useWellness, useNotifications, useAI, useProfile
├── navigation/
│   ├── RootNavigator.tsx      # Auth gate
│   ├── AuthNavigator.tsx
│   ├── MainNavigator.tsx      # Bottom tabs
│   ├── types.ts               # Typed param lists
│   └── stacks/                # HomeStack, CycleStack, WellnessStack, MessagesStack, ProfileStack
├── screens/
│   ├── auth/                  # Login, Register, ForgotPassword, ActivateAccount
│   ├── home/                  # HomeScreen
│   ├── cycle/                 # CycleTracker, LogPeriod, PeriodDetail, CycleAnalysis, Ovulation
│   ├── wellness/              # WellnessDashboard, LogWellness
│   ├── notifications/         # NotificationsScreen
│   ├── messages/              # MessagesList, Conversation
│   ├── ai/                    # AISuggestions
│   └── profile/               # Profile, EditProfile, PartnerManage, Settings, ChangePassword
├── store/
│   ├── authStore.ts           # Zustand auth store (login, logout, initialize)
│   └── themeStore.ts          # Zustand theme store (light/dark/system)
├── theme/
│   ├── colors.ts              # Light + dark palettes
│   ├── typography.ts          # Font scale
│   ├── spacing.ts             # 4-point spacing + border radius
│   └── index.ts               # buildTheme()
├── types/                     # Full TypeScript types for every API domain
└── utils/
    ├── secureStorage.ts       # Keychain wrapper — tokens NEVER in AsyncStorage
    ├── errorHandler.ts        # Typed Axios error extraction
    └── dateUtils.ts           # Lightweight date helpers
```

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- React Native CLI environment ([setup guide](https://reactnative.dev/docs/environment-setup))
- iOS: Xcode 15+ / macOS
- Android: Android Studio + JDK 17

### Install

```bash
cd rithmo-app
npm install          # or yarn / pnpm install

# iOS only
cd ios && pod install && cd ..
```

### Run

```bash
# Start Metro bundler
npm start

# iOS
npm run ios

# Android
npm run android
```

### Environment

The app automatically switches between dev and production URLs:

| `__DEV__` | Base URL |
|---|---|
| `true`  | `http://localhost:8000` |
| `false` | `https://api.rithmo.ir` |

No `.env` file needed — controlled via `src/constants/config.ts`.

---

## Security

- **Tokens are stored exclusively in `react-native-keychain`** — never in AsyncStorage.
- Access token is auto-attached to every request via Axios request interceptor.
- On 401, the refresh token flow fires transparently, queues concurrent requests, and retries them with the new token.
- If refresh fails, tokens are cleared and the user is redirected to Login.
- API timeout is enforced at 15 seconds on every request.

---

## API Domains

| Domain | Endpoints |
|---|---|
| Auth | JWT login/refresh/verify, register, activate, reset password |
| Profile | Get/update profile, cycle settings |
| Partner | Invitation codes, accept/remove partner |
| Periods | CRUD, update latest |
| Cycle Analysis | Analysis, insights, wellness correlation, symptom patterns |
| Ovulation | Latest prediction, per-period prediction |
| Wellness | Daily log CRUD |
| Notifications | List, unread, mark read, preferences, push tokens |
| Messages | Partner conversation, unread count |
| AI | Health suggestions, feedback, model status |

---

## Scripts

```bash
npm run lint        # ESLint
npm run type-check  # TypeScript (no emit)
```
