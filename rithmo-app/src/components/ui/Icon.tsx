/**
 * Icon — wrapper around react-native-vector-icons/MaterialCommunityIcons.
 * Provides consistent icon usage across the app with emoji fallbacks.
 */
import React, { memo } from 'react';
import { Text } from 'react-native';

let VectorIcon: React.ComponentType<{
  name: string;
  size: number;
  color: string;
}> | null = null;

try {

  VectorIcon = require('react-native-vector-icons/MaterialCommunityIcons').default;
} catch {
  VectorIcon = null;
}

interface IconProps {
  name: string;       // MaterialCommunityIcons name, e.g. "account-outline"
  size?: number;
  color?: string;
  fallback?: string;  // text/emoji shown when native module not linked
}

// Icon name to emoji fallback mapping
const ICON_FALLBACKS: Record<string, string> = {
  // Material Community Icons names
  'account-outline': '👤',
  'account': '👤',
  'lock-outline': '🔒',
  'lock': '🔒',
  'eye-outline': '👁',
  'eye': '👁',
  'eye-off-outline': '👁',
  'eye-off': '👁',
  'email-outline': '✉️',
  'email': '✉️',
  'home-outline': '🏠',
  'home': '🏠',
  'calendar-outline': '📅',
  'calendar': '📅',
  'heart-outline': '💚',
  'heart': '💚',
  'message-outline': '💬',
  'message': '💬',
  'bell-outline': '🔔',
  'bell': '🔔',
  'cog-outline': '⚙️',
  'cog': '⚙️',
  'plus': '➕',
  'close': '✖️',
  'check': '✓',
  'alert-circle-outline': '⚠️',
  'magnify': '🔍',

  // Legacy Ionicons names (for backward compatibility)
  'person-outline': '👤',
  'person': '👤',
  'lock-closed-outline': '🔒',
  'lock-closed': '🔒',
  'mail-outline': '✉️',
  'mail': '✉️',
  'chatbubble-outline': '💬',
  'chatbubble': '💬',
  'notifications-outline': '🔔',
  'notifications': '🔔',
  'settings-outline': '⚙️',
  'settings': '⚙️',
  'add': '➕',
  'checkmark': '✓',
  'search-outline': '🔍',
  'search': '🔍',
};

export const Icon = memo(function Icon({
  name,
  size = 22,
  color = '#000',
  fallback = '●',
}: IconProps) {
  if (VectorIcon) {
    return <VectorIcon name={name} size={size} color={color} />;
  }

  // Use mapped fallback or provided fallback
  const iconFallback = ICON_FALLBACKS[name] || fallback;

  return (
    <Text style={{ fontSize: size, color, lineHeight: size * 1.2 }}>
      {iconFallback}
    </Text>
  );
});

// Icon name presets for common actions (MaterialCommunityIcons)
export const IconNames = {
  home: 'home-outline',
  homeActive: 'home',
  cycle: 'calendar-outline',
  cycleActive: 'calendar',
  wellness: 'heart-outline',
  wellnessActive: 'heart',
  chat: 'message-outline',
  chatActive: 'message',
  profile: 'account-outline',
  profileActive: 'account',
  add: 'plus',
  close: 'close',
  check: 'check',
  notification: 'bell-outline',
  settings: 'cog-outline',
  lock: 'lock-outline',
  mail: 'email-outline',
  eye: 'eye-outline',
  eyeOff: 'eye-off-outline',
  search: 'magnify',
  filter: 'filter-outline',
  calendar: 'calendar-outline',
  time: 'clock-outline',
  chevronRight: 'chevron-right',
  chevronLeft: 'chevron-left',
  chevronDown: 'chevron-down',
  chevronUp: 'chevron-up',
} as const;
