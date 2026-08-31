/**
 * Reveal — subtle mount animation (fade + small slide-up).
 *
 * Used for card appearance on Home/Insights/History. Deliberately
 * understated: 380ms, native driver, fires once on mount, no loops.
 */
import React, { memo, useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleProp, ViewStyle } from 'react-native';

interface RevealProps {
  children: React.ReactNode;
  /** Stagger delay in ms (e.g. 60 * index). */
  delay?: number;
  /** Slide distance in px. */
  distance?: number;
  // `StyleProp` rather than a bare `ViewStyle`: callers pass style ARRAYS
  // (InsightsHomeScreen does in three places), which a bare ViewStyle rejects.
  style?: StyleProp<ViewStyle>;
}

export const Reveal = memo(function Reveal({
  children,
  delay = 0,
  distance = 12,
  style,
}: RevealProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(distance)).current;

  // Reduced motion: appear, do not travel.
  //
  // This component animated unconditionally, which the motion rules forbid —
  // a user who has asked the system for less movement still got a fade and a
  // slide on every card of every screen.
  //
  // The animation is still started first and only then cancelled, rather than
  // waiting on the async query before showing anything. That ordering is
  // deliberate: gating the initial opacity on an unresolved promise is how a
  // "respect reduced motion" change ends up leaving content permanently
  // invisible when the query is slow or rejects.
  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((reduce) => {
        if (cancelled || !reduce) { return; }
        opacity.stopAnimation();
        translateY.stopAnimation();
        opacity.setValue(1);
        translateY.setValue(0);
      })
      .catch(() => { /* keep the animation — never hide the content */ });
    return () => { cancelled = true; };
  }, [opacity, translateY]);

  useEffect(() => {
    const anim = Animated.stagger(0, [
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
    ]);
    anim.start();
    return () => {
      anim.stop();
    };
  }, [delay, opacity, translateY]);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
});
