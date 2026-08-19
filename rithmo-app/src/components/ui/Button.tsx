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

const SIZES: Record<Size, { py: number; px: number; fs: number; minH: number }> = {
  xs: { py: 6,  px: 12, fs: 12, minH: 32 },
  sm: { py: 8,  px: 16, fs: 13, minH: 38 },
  md: { py: 12, px: 20, fs: 15, minH: 48 },
  lg: { py: 14, px: 24, fs: 16, minH: 52 },
  xl: { py: 16, px: 28, fs: 17, minH: 56 },
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
  const { colors, borderRadius, shadow } = useTheme();
  const s   = SIZES[size];
  const off = disabled || loading;

  const vs = {
    primary:   { bg: colors.primary,          fg: colors.textOnPrimary, border: 'transparent' },
    secondary: { bg: colors.surfaceSubtle,    fg: colors.textPrimary,   border: colors.borderSubtle },
    outline:   { bg: 'transparent',           fg: colors.textPrimary,   border: colors.border },
    ghost:     { bg: 'transparent',           fg: colors.textPrimary,   border: 'transparent' },
    danger:    { bg: colors.error,            fg: '#FFFFFF',             border: 'transparent' },
    soft:      { bg: colors.primaryLight,     fg: colors.textPrimary,   border: 'transparent' },
  }[variant];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={off}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        styles.base,
        {
          backgroundColor: vs.bg,
          borderRadius: borderRadius.medium,
          paddingVertical: s.py,
          paddingHorizontal: s.px,
          minHeight: s.minH,
          width: fullWidth ? '100%' : undefined,
          opacity: off ? 0.45 : 1,
          borderWidth: variant === 'outline' || variant === 'secondary' ? 1 : 0,
          borderColor: vs.border,
          ...(variant === 'primary' && !off ? shadow.xs : {}),
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={vs.fg} />
      ) : (
        <View style={styles.row}>
          {icon && <View style={styles.iconWrap}>{icon}</View>}
          <Text
            style={[
              styles.label,
              {
                color: vs.fg,
                fontSize: s.fs,
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
  base:     { alignItems: 'center', justifyContent: 'center' },
  row:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  iconWrap: { marginHorizontal: 4 },
  label:    { fontWeight: '600', letterSpacing: 0, textAlign: 'center' },
});

