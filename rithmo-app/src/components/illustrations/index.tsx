/**
 * Illustrations - one small original vector set, drawn from theme colours so it
 * follows light and dark mode and the brand palette without a single bundled
 * image. Each is decorative (hidden from screen readers; the text beside it
 * carries the meaning), arrives with the shared `Reveal` entrance (which
 * already stands still under reduced motion) and never loops.
 *
 * Deliberately abstract: a heart and leaf for care, a calendar for a record, a
 * bell for a reminder, an open book for reading. No body parts, no shields or
 * ticks that could be read as "protected", nothing that implies a result.
 */
import React, { memo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useTheme } from '@hooks/useTheme';
import { Reveal } from '@components/ui';

type Variant = 'care' | 'record' | 'reminder' | 'learn';

interface IllustrationProps {
  variant: Variant;
  size?: number;
  /** Skip the entrance (e.g. inside a list that re-renders). */
  still?: boolean;
}

export const Illustration = memo(function Illustration({ variant, size = 72, still }: IllustrationProps) {
  const { colors } = useTheme();
  const soft = colors.primaryLight;
  const ink = colors.primary;

  const art = (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={{ width: size, height: size }}
    >
      <Svg width={size} height={size} viewBox="0 0 96 96">
        <Circle cx="48" cy="48" r="46" fill={soft} opacity={0.3} />
        <Circle cx="48" cy="48" r="33" fill={soft} opacity={0.5} />
        {variant === 'care' ? (
          <>
            <Path d="M48 71 C30 59 24 47 30 39 C35 32 44 34 48 41 C52 34 61 32 66 39 C72 47 66 59 48 71 Z" fill={ink} />
            <Path d="M63 24 C73 24 79 30 79 40 C69 40 63 34 63 24 Z" fill={colors.follicular} opacity={0.9} />
            <Circle cx="20" cy="32" r="4" fill={colors.ovulation} opacity={0.75} />
            <Circle cx="78" cy="70" r="5" fill={colors.luteal} opacity={0.85} />
          </>
        ) : null}
        {variant === 'record' ? (
          <>
            <Rect x="26" y="28" width="44" height="42" rx="8" fill={colors.surface} stroke={ink} strokeWidth="3" />
            <Path d="M26 40 H70" stroke={ink} strokeWidth="3" />
            <Circle cx="38" cy="52" r="3.5" fill={ink} />
            <Circle cx="48" cy="52" r="3.5" fill={colors.follicular} />
            <Circle cx="58" cy="52" r="3.5" fill={soft} />
            <Circle cx="38" cy="62" r="3.5" fill={soft} />
            <Circle cx="48" cy="62" r="3.5" fill={ink} />
          </>
        ) : null}
        {variant === 'reminder' ? (
          <>
            <Path d="M48 24 C38 24 34 33 34 42 V50 L28 58 H68 L62 50 V42 C62 33 58 24 48 24 Z" fill={ink} />
            <Circle cx="48" cy="65" r="4.5" fill={colors.luteal} />
            <Path d="M72 36 C76 40 76 46 72 50" stroke={colors.ovulation} strokeWidth="3" strokeLinecap="round" fill="none" />
            <Path d="M24 36 C20 40 20 46 24 50" stroke={colors.ovulation} strokeWidth="3" strokeLinecap="round" fill="none" />
          </>
        ) : null}
        {variant === 'learn' ? (
          <>
            <Path d="M48 34 C41 29 31 29 24 31 V64 C31 62 41 62 48 67 Z" fill={ink} />
            <Path d="M48 34 C55 29 65 29 72 31 V64 C65 62 55 62 48 67 Z" fill={ink} opacity={0.72} />
            <Circle cx="74" cy="24" r="4" fill={colors.luteal} opacity={0.85} />
          </>
        ) : null}
      </Svg>
    </View>
  );

  return still ? art : <Reveal distance={6}>{art}</Reveal>;
});
