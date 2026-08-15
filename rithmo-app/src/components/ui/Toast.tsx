/**
 * Toast — Beautiful design-system toast notifications
 * Slides in from top, auto-dismisses, supports success/error/warning/info
 */
import React, { memo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Animated,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@hooks/useTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastConfig {
  type: ToastType;
  title: string;
  message?: string;
  duration?: number; // ms, default 3500
}

interface ToastProps extends ToastConfig {
  visible: boolean;
  onDismiss: () => void;
}

const TOAST_ICONS: Record<ToastType, string> = {
  success: '✅',
  error:   '❌',
  warning: '⚠️',
  info:    'ℹ️',
};

const TOAST_COLORS = {
  success: { bg: '#ECFDF5', border: '#10B981', text: '#065F46', icon: '#10B981' },
  error:   { bg: '#FEF2F2', border: '#EF4444', text: '#7F1D1D', icon: '#EF4444' },
  warning: { bg: '#FFFBEB', border: '#F59E0B', text: '#78350F', icon: '#F59E0B' },
  info:    { bg: '#EFF6FF', border: '#3B82F6', text: '#1E3A8A', icon: '#3B82F6' },
};

export const Toast = memo(function Toast({
  visible,
  type,
  title,
  message,
  duration = 3500,
  onDismiss,
}: ToastProps) {
  const { spacing, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const scale      = useRef(new Animated.Value(0.92)).current;
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const palette = TOAST_COLORS[type];

  const slideIn = () => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        damping: 18,
        stiffness: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        damping: 16,
        stiffness: 180,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const slideOut = (cb?: () => void) => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -120,
        duration: 260,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start(() => cb?.());
  };

  useEffect(() => {
    if (visible) {
      // Reset position
      translateY.setValue(-120);
      opacity.setValue(0);
      scale.setValue(0.92);

      slideIn();

      // Auto-dismiss
      timerRef.current = setTimeout(() => {
        slideOut(onDismiss);
      }, duration);
    } else {
      if (timerRef.current) clearTimeout(timerRef.current);
      slideOut();
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + 12,
          transform: [{ translateY }, { scale }],
          opacity,
        },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={() => slideOut(onDismiss)}
        style={[
          styles.toast,
          {
            backgroundColor: palette.bg,
            borderColor: palette.border,
            paddingHorizontal: spacing[4],
            paddingVertical: spacing[3],
          },
        ]}
      >
        {/* Left accent bar */}
        <View style={[styles.accent, { backgroundColor: palette.border }]} />

        {/* Icon */}
        <Text style={styles.icon}>{TOAST_ICONS[type]}</Text>

        {/* Text content */}
        <View style={styles.textBlock}>
          <Text
            style={[
              styles.title,
              {
                color: palette.text,
                fontSize: typography.sm,
              },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {message ? (
            <Text
              style={[
                styles.message,
                {
                  color: palette.text,
                  fontSize: typography.xs,
                  opacity: 0.8,
                },
              ]}
              numberOfLines={2}
            >
              {message}
            </Text>
          ) : null}
        </View>

        {/* Dismiss x */}
        <Text style={[styles.dismiss, { color: palette.text }]}>✕</Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    ...Platform.select({
      android: { elevation: 20 },
    }),
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
    gap: 10,
  },
  accent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  icon: {
    fontSize: 22,
    marginLeft: 8,
  },
  textBlock: {
    flex: 1,
  },
  title: {
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  message: {
    marginTop: 2,
    lineHeight: 16,
  },
  dismiss: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.5,
    paddingLeft: 4,
  },
});
