/**
 * CircularButton — Circular action button with gradient background and animations
 * Features: gradient backgrounds, scale animations, ripple effects, completion indicators
 */
import React, { memo, useRef, useEffect } from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  ViewStyle,
} from 'react-native';
import { useTheme } from '@hooks/useTheme';
import { Icon } from './Icon';
import { CircularProgress } from './CircularProgress';

interface CircularButtonProps {
  icon: string;
  label?: string;
  onPress: () => void;
  size?: number;
  colors?: string[];
  completed?: boolean;
  completionProgress?: number;
  disabled?: boolean;
  style?: ViewStyle;
  showLabel?: boolean;
}

export const CircularButton = memo(function CircularButton({
  icon,
  label,
  onPress,
  size = 72,
  colors: gradientColors,
  completed = false,
  completionProgress = 0,
  disabled = false,
  style,
  showLabel = true,
}: CircularButtonProps) {
  const { colors, typography, shadow } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rippleAnim = useRef(new Animated.Value(0)).current;

  // Default gradient colors
  const defaultColors = [colors.primary, colors.accent];
  const buttonColors = gradientColors || defaultColors;

  // Scale animation on press
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
    
    // Ripple effect
    rippleAnim.setValue(0);
    Animated.timing(rippleAnim, {
      toValue: 1,
      duration: 400,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const rippleScale = rippleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.5],
  });

  const rippleOpacity = rippleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0],
  });

  return (
    <View style={[styles.container, style]}>
      <Animated.View
        style={[
          styles.buttonWrapper,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <TouchableOpacity
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled}
          activeOpacity={0.9}
          style={[
            styles.button,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: buttonColors[0],
              opacity: disabled ? 0.5 : 1,
              ...shadow.md,
            },
          ]}
        >
          {/* Gradient overlay (simulated with opacity) */}
          <View
            style={[
              styles.gradientOverlay,
              {
                backgroundColor: buttonColors[1],
                opacity: 0.6,
                borderRadius: size / 2,
              },
            ]}
          />
          
          {/* Icon */}
          <Icon name={icon} size={size * 0.4} color="#fff" />
          
          {/* Completion indicator */}
          {completed && (
            <View style={[styles.completionBadge, { backgroundColor: colors.success }]}>
              <Icon name="check" size={12} color="#fff" />
            </View>
          )}
          
          {/* Progress ring for partial completion */}
          {!completed && completionProgress > 0 && (
            <View style={styles.progressRing}>
              <CircularProgress
                progress={completionProgress}
                size={size + 8}
                strokeWidth={4}
                colors={[colors.success, colors.success, colors.success]}
                backgroundColor="transparent"
                animationDuration={600}
              />
            </View>
          )}
        </TouchableOpacity>
        
        {/* Ripple effect */}
        <Animated.View
          style={[
            styles.ripple,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: buttonColors[0],
              transform: [{ scale: rippleScale }],
              opacity: rippleOpacity,
            },
          ]}
          pointerEvents="none"
        />
      </Animated.View>
      
      {/* Label */}
      {showLabel && label && (
        <Text
          style={[
            styles.label,
            {
              color: colors.textPrimary,
              fontSize: typography.xs,
              marginTop: 8,
            },
          ]}
          numberOfLines={2}
        >
          {label}
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  gradientOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  completionBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  progressRing: {
    position: 'absolute',
    top: -4,
    left: -4,
  },
  ripple: {
    position: 'absolute',
  },
  label: {
    textAlign: 'center',
    fontWeight: '600',
    maxWidth: 80,
  },
});
