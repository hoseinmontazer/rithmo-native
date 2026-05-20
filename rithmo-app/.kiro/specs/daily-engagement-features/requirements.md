# Requirements Document

## Introduction

This document defines requirements for daily engagement features in the Rithmo wellness and period tracking app. The goal is to encourage users to engage with the app daily, even when they have limited time available. These features will complement existing wellness tracking, period tracking, home screen, and profile functionality.

## Glossary

- **Rithmo_App**: The React Native mobile application for wellness and period tracking
- **User**: A person who has installed and authenticated with the Rithmo app
- **Daily_Check_In**: A quick wellness assessment that can be completed in under 60 seconds
- **Streak**: A consecutive sequence of days where the User completed at least one Daily_Check_In
- **Quick_Action**: A one-tap interaction that logs wellness data without requiring form navigation
- **Engagement_Reminder**: A push notification or in-app prompt encouraging daily interaction
- **Wellness_Score**: A calculated metric representing overall wellness based on logged data
- **Home_Screen**: The primary dashboard view shown after authentication
- **Quick_Log_Widget**: A UI component on the Home_Screen enabling rapid data entry
- **Streak_Display**: A visual indicator showing the User's current consecutive engagement days
- **Minimal_Entry**: A wellness log requiring only 1-3 data points to be considered complete

## Requirements

### Requirement 1: Quick Daily Check-In

**User Story:** As a User, I want to complete a daily wellness check-in in under 60 seconds, so that I can maintain engagement even when I'm busy.

#### Acceptance Criteria

1. THE Rithmo_App SHALL provide a Daily_Check_In interface accessible from the Home_Screen
2. THE Daily_Check_In SHALL require no more than 3 user inputs to be considered complete
3. WHEN a User completes a Daily_Check_In, THE Rithmo_App SHALL save the entry within 2 seconds
4. THE Daily_Check_In SHALL include at minimum mood level, energy level, and one optional note field
5. WHEN a User has already completed a Daily_Check_In for the current day, THE Rithmo_App SHALL display a completion indicator
6. THE Rithmo_App SHALL allow Users to edit their Daily_Check_In for the current day

### Requirement 2: Engagement Streak Tracking

**User Story:** As a User, I want to see my engagement streak, so that I feel motivated to maintain daily app usage.

#### Acceptance Criteria

1. THE Rithmo_App SHALL calculate a Streak based on consecutive days with at least one Daily_Check_In
2. WHEN a User completes their first Daily_Check_In of the day, THE Rithmo_App SHALL increment the Streak counter
3. WHEN a User misses a day without completing a Daily_Check_In, THE Rithmo_App SHALL reset the Streak to zero
4. THE Rithmo_App SHALL display the current Streak value on the Home_Screen
5. WHEN a User achieves a Streak milestone (7, 14, 30, 60, 90 days), THE Rithmo_App SHALL display a congratulatory message
6. THE Rithmo_App SHALL store the User's longest Streak value
7. THE Rithmo_App SHALL display both current Streak and longest Streak in a dedicated view

### Requirement 3: Quick Action Buttons

**User Story:** As a User, I want one-tap actions for common wellness entries, so that I can log data without navigating through multiple screens.

#### Acceptance Criteria

1. THE Rithmo_App SHALL provide Quick_Action buttons on the Home_Screen
2. THE Quick_Action buttons SHALL include at minimum: "Log Mood", "Log Energy", "Log Sleep", and "Log Period" (for cycle-tracking Users)
3. WHEN a User taps a Quick_Action button, THE Rithmo_App SHALL present a single-screen input interface
4. THE single-screen input interface SHALL allow submission with no more than 2 taps after data entry
5. WHEN a User submits via Quick_Action, THE Rithmo_App SHALL save the entry and return to the Home_Screen within 1 second
6. THE Quick_Action buttons SHALL display visual feedback indicating which actions have been completed today

### Requirement 4: Daily Engagement Reminders

**User Story:** As a User, I want to receive gentle reminders to check in daily, so that I maintain my wellness tracking habit.

#### Acceptance Criteria

1. THE Rithmo_App SHALL send one Engagement_Reminder per day to Users who have not completed a Daily_Check_In
2. THE Rithmo_App SHALL allow Users to configure the time of day for Engagement_Reminder delivery
3. THE Rithmo_App SHALL allow Users to disable Engagement_Reminder notifications
4. WHEN a User has completed a Daily_Check_In, THE Rithmo_App SHALL not send an Engagement_Reminder for that day
5. THE Engagement_Reminder SHALL include the User's current Streak value in the notification text
6. WHEN a User's Streak is at risk (no check-in by 8 PM local time), THE Rithmo_App SHALL send a second reminder notification
7. WHERE Users have disabled Engagement_Reminder notifications, THE Rithmo_App SHALL display an in-app prompt on Home_Screen instead

### Requirement 5: Minimal Wellness Entry

**User Story:** As a User, I want to log wellness data with minimal required fields, so that I can participate even when I don't have time for detailed entries.

#### Acceptance Criteria

1. THE Rithmo_App SHALL accept a Minimal_Entry with only mood level and energy level
2. WHEN a User creates a Minimal_Entry, THE Rithmo_App SHALL mark it as a valid Daily_Check_In
3. THE Rithmo_App SHALL allow Users to expand a Minimal_Entry into a full wellness log later
4. WHEN displaying wellness history, THE Rithmo_App SHALL visually distinguish Minimal_Entry records from full entries
5. THE Rithmo_App SHALL include Minimal_Entry data in all wellness analytics and correlations

### Requirement 6: Home Screen Quick Log Widget

**User Story:** As a User, I want a prominent quick-log widget on my home screen, so that I can immediately engage without searching for features.

#### Acceptance Criteria

1. THE Rithmo_App SHALL display a Quick_Log_Widget in the top third of the Home_Screen
2. THE Quick_Log_Widget SHALL show the User's current Streak value
3. THE Quick_Log_Widget SHALL display the most relevant Quick_Action for the current time of day
4. WHEN the User has not completed a Daily_Check_In, THE Quick_Log_Widget SHALL display a "Check In Now" call-to-action
5. WHEN the User has completed a Daily_Check_In, THE Quick_Log_Widget SHALL display a completion message and the next suggested action
6. THE Quick_Log_Widget SHALL be visually distinct with elevated styling (shadow, border, or background color)

### Requirement 7: Wellness Score Calculation

**User Story:** As a User, I want to see a daily wellness score, so that I can quickly understand my overall wellness trend.

#### Acceptance Criteria

1. THE Rithmo_App SHALL calculate a Wellness_Score from 0 to 100 based on logged wellness data
2. THE Wellness_Score calculation SHALL include mood level, energy level, sleep hours, and stress level
3. WHEN a User has logged data for the current day, THE Rithmo_App SHALL display the Wellness_Score on the Home_Screen
4. THE Rithmo_App SHALL display a 7-day trend graph of Wellness_Score values
5. WHEN a User's Wellness_Score decreases by more than 20 points over 3 consecutive days, THE Rithmo_App SHALL display a supportive message
6. THE Wellness_Score SHALL be recalculated within 1 second whenever new wellness data is logged

### Requirement 8: Streak Recovery Grace Period

**User Story:** As a User, I want a grace period to recover my streak if I miss a day, so that I don't lose motivation from a single missed day.

#### Acceptance Criteria

1. WHEN a User misses one day of Daily_Check_In, THE Rithmo_App SHALL provide a 24-hour grace period to complete the previous day's entry
2. WHEN a User completes a backdated entry within the grace period, THE Rithmo_App SHALL preserve the Streak
3. THE Rithmo_App SHALL allow only one grace period recovery per 7-day period
4. WHEN a User uses a grace period recovery, THE Rithmo_App SHALL display a notification explaining the recovery
5. WHEN a User misses two consecutive days, THE Rithmo_App SHALL reset the Streak regardless of grace period
6. THE Rithmo_App SHALL display remaining grace period time in the Quick_Log_Widget when applicable

### Requirement 9: Quick Insights Display

**User Story:** As a User, I want to see quick wellness insights on my home screen, so that I gain value from the app even during brief interactions.

#### Acceptance Criteria

1. THE Rithmo_App SHALL display one personalized wellness insight on the Home_Screen daily
2. THE wellness insight SHALL be generated from the User's logged data and patterns
3. THE wellness insight SHALL be no longer than 2 sentences
4. WHEN a User has insufficient data for personalized insights, THE Rithmo_App SHALL display general wellness tips
5. THE Rithmo_App SHALL rotate the displayed insight daily at midnight local time
6. THE Rithmo_App SHALL allow Users to dismiss or refresh the displayed insight

### Requirement 10: Celebration Animations

**User Story:** As a User, I want to see celebratory feedback when I complete check-ins or reach milestones, so that I feel rewarded for my engagement.

#### Acceptance Criteria

1. WHEN a User completes a Daily_Check_In, THE Rithmo_App SHALL display a brief success animation
2. WHEN a User reaches a Streak milestone, THE Rithmo_App SHALL display a celebration animation with confetti or similar visual effect
3. THE celebration animation SHALL complete within 2 seconds
4. THE Rithmo_App SHALL allow Users to skip celebration animations by tapping anywhere on screen
5. WHERE Users have enabled reduced motion accessibility settings, THE Rithmo_App SHALL display static celebration graphics instead of animations
6. THE Rithmo_App SHALL play a subtle success sound effect with celebration animations unless the device is muted

### Requirement 11: Offline Quick Entry Support

**User Story:** As a User, I want to complete quick check-ins even without internet connectivity, so that I can maintain my streak regardless of network availability.

#### Acceptance Criteria

1. WHEN the device has no network connectivity, THE Rithmo_App SHALL allow Users to complete Daily_Check_In entries
2. THE Rithmo_App SHALL store offline entries in local device storage
3. WHEN network connectivity is restored, THE Rithmo_App SHALL synchronize offline entries to the server within 30 seconds
4. THE Rithmo_App SHALL update the Streak counter immediately for offline entries
5. WHEN an offline entry fails to synchronize after 3 retry attempts, THE Rithmo_App SHALL notify the User
6. THE Rithmo_App SHALL preserve offline entries for up to 7 days before requiring synchronization

### Requirement 12: Time-Based Quick Action Suggestions

**User Story:** As a User, I want to see contextually relevant quick actions based on the time of day, so that the app anticipates my needs.

#### Acceptance Criteria

1. WHEN the current time is between 6 AM and 10 AM, THE Rithmo_App SHALL prioritize "Log Sleep" and "Morning Mood" Quick_Actions
2. WHEN the current time is between 12 PM and 2 PM, THE Rithmo_App SHALL prioritize "Log Energy" and "Stress Check" Quick_Actions
3. WHEN the current time is between 8 PM and 11 PM, THE Rithmo_App SHALL prioritize "Evening Reflection" and "Tomorrow's Goals" Quick_Actions
4. THE Rithmo_App SHALL display no more than 4 Quick_Actions simultaneously on the Home_Screen
5. THE Rithmo_App SHALL allow Users to manually access all Quick_Actions via a "More" button
6. THE Quick_Action priority order SHALL adapt based on the User's historical logging patterns over 14 days
