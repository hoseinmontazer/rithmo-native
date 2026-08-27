/**
 * PressScale — the "Rhythmo App" design spec's press feedback
 * (`transform: scale(.955)`, `cubic-bezier(.34,1.4,.64,1)`) as a reusable
 * wrapper, so primary/prominent controls get a real tactile response
 * instead of only `TouchableOpacity`'s opacity dim.
 *
 * Deliberately NOT a blanket replacement for `TouchableOpacity` across the
 * app (31 files use it) — applied to the highest-traffic, most prominent
 * controls (hero cards, primary CTAs) where the premium feel matters most,
 * not every touchable everywhere.
 */
import React, { useRef } from 'react';
import { Animated, Easing, Pressable, type GestureResponderEvent, type StyleProp, type ViewStyle } from 'react-native';

interface PressScaleProps {
  onPress?: (e: GestureResponderEvent) => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  disabled?: boolean;
  accessibilityRole?: 'button';
  accessibilityLabel?: string;
  accessibilityState?: { selected?: boolean; disabled?: boolean };
}

const PRESS_CURVE = Easing.bezier(0.34, 1.4, 0.64, 1);

// A separate Animated.View wrapper inside Pressable would only receive the
// transform, not `style` — any caller relying on PressScale as a flex child
// (e.g. `flex: 1` in a row of equal-width buttons) would silently collapse
// to content size, since Pressable itself — the actual flex participant —
// never saw that style. Animating the Pressable directly avoids the split.
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PressScale({
  onPress,
  children,
  style,
  scaleTo = 0.955,
  disabled,
  accessibilityRole,
  accessibilityLabel,
  accessibilityState,
}: PressScaleProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const animate = (toValue: number) => {
    Animated.timing(scale, {
      toValue,
      duration: 160,
      easing: PRESS_CURVE,
      useNativeDriver: true,
    }).start();
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => animate(scaleTo)}
      onPressOut={() => animate(1)}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState}
      style={[style, { transform: [{ scale }] }]}
    >
      {children}
    </AnimatedPressable>
  );
}
