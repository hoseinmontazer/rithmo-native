import React, { memo, useState } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { useTheme } from '@hooks/useTheme';
import { Icon } from './Icon';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  containerStyle?: ViewStyle;
  isPassword?: boolean;
  /** MaterialCommunityIcons name for a leading icon, e.g. "account-outline" */
  leftIconName?: string;
}

export const Input = memo(function Input({
  label,
  error,
  hint,
  containerStyle,
  isPassword = false,
  leftIconName,
  onFocus: onFocusProp,
  onBlur: onBlurProp,
  ...rest
}: InputProps) {
  const { colors, typography, spacing, borderRadius } = useTheme();
  const [show, setShow]       = useState(false);
  const [focused, setFocused] = useState(false);

  const handleFocus = (e: any) => {
    setFocused(true);
    onFocusProp?.(e);
  };
  const handleBlur = (e: any) => {
    setFocused(false);
    onBlurProp?.(e);
  };

  const borderColor = error
    ? colors.error
    : focused
    ? colors.primary
    : colors.border;

  const bg = error
    ? colors.errorBg
    : colors.surface;

  return (
    <View style={[{ width: '100%' }, containerStyle]}>
      {label && (
        <Text
          style={{
            color: focused ? colors.primary : colors.textSecondary,
            fontSize: typography.sm,
            fontWeight: '600',
            marginBottom: spacing[2],
            letterSpacing: 0,
          }}
        >
          {label}
        </Text>
      )}

      <View
        style={[
          styles.wrap,
          {
            borderColor,
            borderWidth: focused ? 1.5 : 1,
            borderRadius: borderRadius.medium,
            backgroundColor: bg,
            paddingHorizontal: spacing[3],
            minHeight: 48,
          },
        ]}
      >
        {leftIconName && (
          <View style={{ marginHorizontal: 4 }}>
            <Icon
              name={leftIconName}
              size={20}
              color={focused ? colors.primary : colors.textTertiary}
            />
          </View>
        )}

        <TextInput
          style={{
            flex: 1,
            color: colors.textPrimary,
            fontSize: typography.body,
            paddingVertical: spacing[2],
            textAlign: 'auto',
          }}
          placeholderTextColor={colors.textTertiary}
          secureTextEntry={isPassword && !show}
          onFocus={handleFocus}
          onBlur={handleBlur}
          accessibilityLabel={label}
          {...rest}
        />

        {isPassword && (
          <TouchableOpacity
            onPress={() => setShow(v => !v)}
            style={{ padding: 4 }}
            accessibilityLabel={show ? 'Hide password' : 'Show password'}
          >
            <Icon
              name={show ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.textTertiary}
            />
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <View style={styles.errRow}>
          <Icon
            name="alert-circle-outline"
            size={14}
            color={colors.error}
          />
          <Text
            style={{
              color: colors.error,
              fontSize: typography.xs,
              fontWeight: '500',
              marginHorizontal: 4,
            }}
          >
            {error}
          </Text>
        </View>
      )}

      {hint && !error && (
        <Text
          style={{
            color: colors.textTertiary,
            fontSize: typography.xs,
            marginTop: 4,
          }}
        >
          {hint}
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap:   { flexDirection: 'row', alignItems: 'center' },
  errRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
});

