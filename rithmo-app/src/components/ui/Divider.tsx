import React, { memo } from 'react';
import { View, ViewStyle } from 'react-native';
import { useTheme } from '@hooks/useTheme';

interface DividerProps {
  style?: ViewStyle;
  vertical?: boolean;
}

export const Divider = memo(function Divider({ style, vertical = false }: DividerProps) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        vertical
          ? { width: 1, alignSelf: 'stretch', backgroundColor: colors.divider }
          : { height: 1, width: '100%', backgroundColor: colors.divider },
        style,
      ]}
    />
  );
});
