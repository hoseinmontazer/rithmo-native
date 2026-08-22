/**
 * GradientSurface — a real gradient background you can put children inside.
 *
 * Why this exists
 * ---------------
 * Two screens imported `LinearGradient` from `react-native-svg` and used it
 * as a layout container:
 *
 *     import { LinearGradient } from 'react-native-svg';
 *     <LinearGradient colors={[...]}>...</LinearGradient>
 *
 * In `react-native-svg`, `LinearGradient` is a *paint definition* that only
 * has meaning inside `<Svg><Defs>` — it is not a view. Used as a container
 * it renders nothing and drops its children. On Home that silently deleted
 * the entire header (greeting, date, notification bell) and, combined with
 * a negative top margin on the card below it, pushed the first card under
 * the Android status bar. On the paywall the same import sat above a
 * separate crash.
 *
 * The fix is an ordinary `View` with an absolutely-positioned `<Svg>` behind
 * the children — a correct use of the dependency the project already has,
 * so no native module is added for what is decoration.
 */

import React, { memo, useId } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

export interface GradientSurfaceProps {
  /** Gradient stops, start → end. Two or more colors. */
  colors: string[];
  children?: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  /** Diagonal by default; `false` renders a vertical gradient. */
  diagonal?: boolean;
  /** Applied to the painted rect so the gradient follows the card corners. */
  borderRadius?: number;
}

export const GradientSurface = memo(function GradientSurface({
  colors,
  children,
  style,
  diagonal = true,
  borderRadius = 0,
}: GradientSurfaceProps) {
  // Gradient ids must be unique per instance — two surfaces sharing an id
  // would make the second one paint with the first one's stops.
  const gradientId = `grad-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  const from = colors[0] ?? 'transparent';
  const to = colors[colors.length - 1] ?? from;

  return (
    <View style={[{ overflow: 'hidden', borderRadius }, style]}>
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <LinearGradient
            id={gradientId}
            x1="0"
            y1="0"
            x2={diagonal ? '1' : '0'}
            y2="1"
          >
            <Stop offset="0" stopColor={from} stopOpacity="1" />
            <Stop offset="1" stopColor={to} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${gradientId})`} />
      </Svg>
      {children}
    </View>
  );
});
