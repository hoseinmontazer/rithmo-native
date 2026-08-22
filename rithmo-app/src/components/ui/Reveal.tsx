/**
 * Reveal — subtle mount animation (fade + small slide-up).
 *
 * Used for card appearance on Home/Insights/History. Deliberately
 * understated: 380ms, native driver, fires once on mount, no loops.
 */
import React, { memo, useEffect, useRef } from 'react';
import { Animated, Easing, ViewStyle } from 'react-native';

interface RevealProps {
  children: React.ReactNode;
  /** Stagger delay in ms (e.g. 60 * index). */
  delay?: number;
  /** Slide distance in px. */
  distance?: number;
  style?: ViewStyle;
}

export const Reveal = memo(function Reveal({
  children,
  delay = 0,
  distance = 12,
  style,
}: RevealProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(distance)).current;

  useEffect(() => {
    Animated.stagger(0, [
      Animated.timing(opacity, {
        toValue: 1,
        duration: 380,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 380,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
});
