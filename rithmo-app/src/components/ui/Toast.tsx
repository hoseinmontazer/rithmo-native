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
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@hooks/useTheme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { AppColors } from '@theme/colors';

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

/**
 * Toast glyphs.
 *
 * These were emoji (✅ ❌ ⚠️ ℹ️), drawn by the handset's emoji font rather than
 * by the app — the same problem F-07 removed from mood, symptoms and the home
 * greeting. They also carried their own colour, so they ignored the theme.
 */
const TOAST_ICONS: Record<ToastType, string> = {
  success: 'check-circle',
  error:   'close-circle',
  warning: 'alert',
  info:    'information',
};

/**
 * Toast colours, from the palette.
 *
 * This component used to hold a Tailwind palette of its own — `#10B981`,
 * `#3B82F6`, `#F59E0B` and so on — which meant a success toast was a different
 * green from a success badge, and none of it responded to dark mode: the toast
 * painted a near-white `#ECFDF5` panel with near-black text on a dark screen.
 *
 * The `<semantic>` / `<semantic>Bg` pairs are the app's own, and each is held
 * at WCAG AA against the other by a test in `designSystem.test.ts` — so using
 * the token here inherits that guarantee instead of re-deciding it.
 */
type ToastPalette = { bg: string; border: string; text: string; icon: string };

function toastColors(colors: AppColors): Record<ToastType, ToastPalette> {
  return {
    success: { bg: colors.successBg, border: colors.success, text: colors.success, icon: colors.success },
    error:   { bg: colors.errorBg,   border: colors.error,   text: colors.error,   icon: colors.error },
    warning: { bg: colors.warningBg, border: colors.warning, text: colors.warning, icon: colors.warning },
    info:    { bg: colors.infoBg,    border: colors.info,    text: colors.info,    icon: colors.info },
  };
}

export const Toast = memo(function Toast({
  visible,
  type,
  title,
  message,
  duration = 3500,
  onDismiss,
}: ToastProps) {
  const { colors, spacing, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const scale      = useRef(new Animated.Value(0.92)).current;
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const palette = toastColors(colors)[type];

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
        <Icon name={TOAST_ICONS[type]} size={22} color={palette.icon} style={styles.icon} />

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
    // Size is an Icon prop, not a font size — this only positions it.
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
