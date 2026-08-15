/**
 * CircularAvatar — Circular profile picture with gradient border and badge
 * Features: gradient border, completion badge, scale animations
 */
import React, { memo, useRef, useEffect } from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ViewStyle,
} from 'react-native';
import { useTheme } from '@hooks/useTheme';
import { Icon } from './Icon';

interface CircularAvatarProps {
  source?: { uri: string } | number;
  size?: number;
  onPress?: () => void;
  showBadge?: boolean;
  badgeIcon?: string;
  gradientBorder?: boolean;
  style?: ViewStyle;
}

export const CircularAvatar = memo(function CircularAvatar({
  source,
  size = 48,
  onPress,
  showBadge = false,
  badgeIcon = 'check',
  gradientBorder = true,
  style,
}: CircularAvatarProps) {
  const { colors, shadow } = useTheme();
  const badgeScale = useRef(new Animated.Value(0)).current;

  // Animate badge appearance
  useEffect(() => {
    if (showBadge) {
      Animated.sequence([
        Animated.timing(badgeScale, {
          toValue: 1.2,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(badgeScale, {
          toValue: 1,
          friction: 3,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      badgeScale.setValue(0);
    }
  }, [showBadge, badgeScale]);

  const borderWidth = 2;
  const badgeSize = 16;
  const innerSize = size - borderWidth * 2;

  const content = (
    <View style={[styles.container, style]}>
      {/* Gradient border container */}
      <View
        style={[
          styles.borderContainer,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: gradientBorder ? colors.primary : 'transparent',
            ...shadow.sm,
          },
        ]}
      >
        {/* Gradient effect (simulated with multiple colors) */}
        {gradientBorder && (
          <View
            style={[
              styles.gradientLayer,
              {
                borderRadius: size / 2,
                backgroundColor: colors.accent,
                opacity: 0.5,
              },
            ]}
          />
        )}
        
        {/* Avatar image */}
        <View
          style={[
            styles.imageContainer,
            {
              width: innerSize,
              height: innerSize,
              borderRadius: innerSize / 2,
              backgroundColor: colors.surfaceSecondary,
            },
          ]}
        >
          {source ? (
            <Image
              source={source}
              style={[
                styles.image,
                {
                  width: innerSize,
                  height: innerSize,
                  borderRadius: innerSize / 2,
                },
              ]}
            />
          ) : (
            <Icon name="account" size={innerSize * 0.6} color={colors.textSecondary} />
          )}
        </View>
      </View>
      
      {/* Badge */}
      {showBadge && (
        <Animated.View
          style={[
            styles.badge,
            {
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
              backgroundColor: colors.success,
              borderColor: colors.surface,
              transform: [{ scale: badgeScale }],
            },
          ]}
        >
          <Icon name={badgeIcon} size={10} color="#fff" />
        </Animated.View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
});

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  borderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  gradientLayer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  imageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: {
    resizeMode: 'cover',
  },
  badge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
});
