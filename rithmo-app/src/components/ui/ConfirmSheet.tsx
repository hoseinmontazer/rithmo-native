/**
 * ConfirmSheet — Beautiful bottom-sheet confirmation dialog
 * Replaces native Alert.alert for destructive/confirm actions.
 */
import React, { memo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Animated,
  Easing,
  StyleSheet,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@hooks/useTheme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import type { AppColors } from '@theme/colors';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export type ConfirmSheetVariant = 'danger' | 'warning' | 'info';

interface ConfirmSheetProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmSheetVariant;
  /** MaterialCommunityIcons glyph name; defaults to the variant's own. */
  icon?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Variant styling, from the palette.
 *
 * This held a Tailwind palette of its own — `#EF4444`, `#F59E0B`, `#3B82F6`
 * and their tints — so a destructive confirmation was a different red from
 * every other error surface in the app, and none of it responded to dark
 * mode: it painted a near-white `#FEF2F2` panel whatever the theme.
 *
 * The glyphs were emoji (🗑️ ⚠️ ℹ️) for the same reason the toast's were, and
 * with the same consequence — drawn by the handset, not by the product.
 */
type VariantPalette = { bg: string; border: string; btn: string; icon: string };

function variantStyles(colors: AppColors): Record<ConfirmSheetVariant, VariantPalette> {
  return {
    danger:  { bg: colors.errorBg,   border: colors.error,   btn: colors.error,   icon: 'trash-can-outline' },
    warning: { bg: colors.warningBg, border: colors.warning, btn: colors.warning, icon: 'alert' },
    info:    { bg: colors.infoBg,    border: colors.info,    btn: colors.info,    icon: 'information' },
  };
}

export const ConfirmSheet = memo(function ConfirmSheet({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  icon,
  onConfirm,
  onCancel,
}: ConfirmSheetProps) {
  const { colors, spacing, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const slideY  = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const palette = variantStyles(colors)[variant];
  const displayIcon = icon ?? palette.icon;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(slideY, {
          toValue: 0,
          damping: 22,
          stiffness: 280,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(slideY, {
          toValue: SCREEN_HEIGHT,
          duration: 200,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, opacity, slideY]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel}>
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={onCancel}>
        <Animated.View style={[styles.backdrop, { opacity }]} />
      </TouchableWithoutFeedback>

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: colors.surface,
            paddingBottom: insets.bottom + spacing[4],
            transform: [{ translateY: slideY }],
          },
        ]}
      >
        {/* Handle bar */}
        <View style={[styles.handle, { backgroundColor: colors.border }]} />

        {/* Icon badge */}
        <View
          style={[
            styles.iconBadge,
            { backgroundColor: palette.bg, borderColor: palette.border },
          ]}
        >
          <Icon name={displayIcon} size={26} color={palette.btn} />
        </View>

        {/* Title */}
        <Text
          style={[
            styles.title,
            {
              color: colors.textPrimary,
              fontSize: typography.xl,
              marginTop: spacing[4],
              marginBottom: message ? spacing[2] : spacing[5],
            },
          ]}
        >
          {title}
        </Text>

        {/* Message */}
        {message ? (
          <Text
            style={[
              styles.message,
              {
                color: colors.textSecondary,
                fontSize: typography.sm,
                marginBottom: spacing[6],
              },
            ]}
          >
            {message}
          </Text>
        ) : null}

        {/* Buttons */}
        <View style={[styles.buttons, { gap: spacing[3], paddingHorizontal: spacing[5] }]}>
          {/* Cancel */}
          <TouchableOpacity
            onPress={onCancel}
            activeOpacity={0.78}
            style={[
              styles.btn,
              {
                backgroundColor: colors.surfaceSecondary,
                borderWidth: 1,
                borderColor: colors.border,
              },
            ]}
          >
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: typography.base,
                fontWeight: '600',
              }}
            >
              {cancelLabel}
            </Text>
          </TouchableOpacity>

          {/* Confirm */}
          <TouchableOpacity
            onPress={onConfirm}
            activeOpacity={0.78}
            style={[styles.btn, { backgroundColor: palette.btn }]}
          >
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: typography.base,
                fontWeight: '700',
              }}
            >
              {confirmLabel}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    alignItems: 'center',
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 20,
  },
  iconBadge: {
    width: 72,
    height: 72,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
    paddingHorizontal: 32,
  },
  message: {
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 32,
  },
  buttons: {
    flexDirection: 'row',
    width: '100%',
  },
  btn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
