import React, { memo } from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { useTheme } from '@hooks/useTheme';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'soft';
type Size    = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  /** Pass any ReactNode as a leading icon */
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

// All sizes use borderRadius: 999 (pill shape)
const SIZES: Record<Size, { py: number; px: number; fs: number }> = {
  xs: { py: 8,  px: 16, fs: 12 },
  sm: { py: 11, px: 20, fs: 13 },
  md: { py: 14, px: 24, fs: 15 },
  lg: { py: 17, px: 32, fs: 16 },
  xl: { py: 20, px: 36, fs: 17 },
};

export const Button = memo(function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
  style,
  textStyle,
}: ButtonProps) {
  const { colors, shadow } = useTheme();
  const s   = SIZES[size];
  const off = disabled || loading;

  const vs = {
    primary:   { bg: colors.primaryDark,      fg: '#fff',             border: 'transparent' },
    secondary: { bg: colors.surfaceSecondary, fg: colors.textPrimary, border: 'transparent' },
    outline:   { bg: 'transparent',           fg: colors.primary,     border: colors.primary },
    ghost:     { bg: 'transparent',           fg: colors.primary,     border: 'transparent' },
    danger:    { bg: colors.error,            fg: '#fff',             border: 'transparent' },
    soft:      { bg: colors.primaryLight,     fg: colors.primaryDark, border: 'transparent' },
  }[variant];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={off}
      activeOpacity={0.78}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.base,
        {
          backgroundColor: vs.bg,
          borderRadius: 999,
          paddingVertical: s.py,
          paddingHorizontal: s.px,
          width: fullWidth ? '100%' : undefined,
          opacity: off ? 0.48 : 1,
          borderWidth: variant === 'outline' ? 1.5 : 0,
          borderColor: vs.border,
          ...(variant === 'primary' && !off ? shadow.brand : {}),
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={vs.fg} />
      ) : (
        <View style={styles.row}>
          {icon && <View style={{ marginRight: 8 }}>{icon}</View>}
          <Text
            style={[
              {
                color: vs.fg,
                fontSize: s.fs,
                fontWeight: '600',
          letterSpacing: 0,
              },
              textStyle,
            ]}
          >
            {label}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  row:  { flexDirection: 'row', alignItems: 'center' },
});
