/**
 * TabIcon  — tinted PNG for the bottom tab bar.
 *            Applies tintColor so the icon responds to active/inactive state.
 *
 * AppIcon  — original-color PNG for cards, rows, and hub tiles.
 *            No tintColor — shows the artwork exactly as designed.
 *
 * Rule of thumb:
 *   Tab bar          → <TabIcon source={icons.home} size={24} color={color} />
 *   Cards / rows     → <AppIcon source={icons.menstruation} size={28} />
 */
import React, { memo } from 'react';
import { Image, ImageSourcePropType, View } from 'react-native';

// ── TabIcon (tinted) ──────────────────────────────────────────────────────────

interface TabIconProps {
  source: ImageSourcePropType;
  size?: number;
  color: string;   // active / inactive tint color from the tab navigator
}

export const TabIcon = memo(function TabIcon({
  source,
  size = 24,

}: TabIconProps) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Image
        source={source}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    </View>
  );
});

// ── AppIcon (original colors) ─────────────────────────────────────────────────

interface AppIconProps {
  source: ImageSourcePropType;
  size?: number;
}

export const AppIcon = memo(function AppIcon({
  source,
  size = 24,
}: AppIconProps) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Image
        source={source}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    </View>
  );
});
