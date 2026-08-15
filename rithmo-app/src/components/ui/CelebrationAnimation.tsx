/**
 * CelebrationAnimation — Circular celebration animations for milestones
 * Features: expanding rings, confetti particles, pulsing glow effects
 */
import React, { memo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import { useTheme } from '@hooks/useTheme';
import { Icon } from './Icon';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CelebrationAnimationProps {
  visible: boolean;
  onDismiss: () => void;
  title: string;
  message?: string;
  icon?: string;
  type?: 'success' | 'milestone';
}

export const CelebrationAnimation = memo(function CelebrationAnimation({
  visible,
  onDismiss,
  title,
  message,
  icon = 'check',
  type = 'success',
}: CelebrationAnimationProps) {
  const { colors, typography } = useTheme();
  
  // Animation values
  const ring1Scale = useRef(new Animated.Value(0)).current;
  const ring2Scale = useRef(new Animated.Value(0)).current;
  const ring3Scale = useRef(new Animated.Value(0)).current;
  const ring1Opacity = useRef(new Animated.Value(1)).current;
  const ring2Opacity = useRef(new Animated.Value(1)).current;
  const ring3Opacity = useRef(new Animated.Value(1)).current;
  const iconScale = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(1)).current;
  
  // Confetti particles
  const confettiAnims = useRef(
    Array.from({ length: 12 }, () => ({
      translateY: new Animated.Value(0),
      translateX: new Animated.Value(0),
      rotate: new Animated.Value(0),
      opacity: new Animated.Value(1),
    }))
  ).current;

  useEffect(() => {
    if (visible) {
      // Reset all animations
      ring1Scale.setValue(0);
      ring2Scale.setValue(0);
      ring3Scale.setValue(0);
      ring1Opacity.setValue(1);
      ring2Opacity.setValue(1);
      ring3Opacity.setValue(1);
      iconScale.setValue(0);
      glowPulse.setValue(1);
      confettiAnims.forEach(anim => {
        anim.translateY.setValue(0);
        anim.translateX.setValue(0);
        anim.rotate.setValue(0);
        anim.opacity.setValue(1);
      });

      // Start animations
      Animated.parallel([
        // Expanding rings
        Animated.sequence([
          Animated.timing(ring1Scale, {
            toValue: 2,
            duration: 800,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.delay(100),
          Animated.timing(ring2Scale, {
            toValue: 2.5,
            duration: 800,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.delay(200),
          Animated.timing(ring3Scale, {
            toValue: 3,
            duration: 800,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        // Fade out rings
        Animated.timing(ring1Opacity, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(ring2Opacity, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(ring3Opacity, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
        // Icon pop
        Animated.spring(iconScale, {
          toValue: 1,
          friction: 4,
          tension: 40,
          useNativeDriver: true,
        }),
        // Glow pulse
        Animated.loop(
          Animated.sequence([
            Animated.timing(glowPulse, {
              toValue: 1.2,
              duration: 600,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(glowPulse, {
              toValue: 1,
              duration: 600,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        ),
      ]).start();

      // Confetti animations
      if (type === 'milestone') {
        confettiAnims.forEach((anim, index) => {
          const angle = (index / confettiAnims.length) * Math.PI * 2;
          const distance = 150;
          const targetX = Math.cos(angle) * distance;
          const targetY = Math.sin(angle) * distance;

          Animated.parallel([
            Animated.timing(anim.translateX, {
              toValue: targetX,
              duration: 1000,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(anim.translateY, {
              toValue: targetY,
              duration: 1000,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(anim.rotate, {
              toValue: 360 * (index % 2 === 0 ? 1 : -1),
              duration: 1000,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(anim.opacity, {
              toValue: 0,
              duration: 1000,
              useNativeDriver: true,
            }),
          ]).start();
        });
      }
    }
  }, [visible, type, ring1Scale, ring2Scale, ring3Scale, ring1Opacity, ring2Opacity, ring3Opacity, iconScale, glowPulse, confettiAnims]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onDismiss}
      >
        <View style={styles.container}>
          {/* Expanding rings */}
          <Animated.View
            style={[
              styles.ring,
              {
                backgroundColor: colors.primary,
                transform: [{ scale: ring1Scale }],
                opacity: ring1Opacity,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.ring,
              {
                backgroundColor: colors.accent,
                transform: [{ scale: ring2Scale }],
                opacity: ring2Opacity,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.ring,
              {
                backgroundColor: colors.success,
                transform: [{ scale: ring3Scale }],
                opacity: ring3Opacity,
              },
            ]}
          />

          {/* Pulsing glow */}
          <Animated.View
            style={[
              styles.glow,
              {
                backgroundColor: colors.primary,
                transform: [{ scale: glowPulse }],
              },
            ]}
          />

          {/* Icon */}
          <Animated.View
            style={[
              styles.iconContainer,
              {
                backgroundColor: colors.primary,
                transform: [{ scale: iconScale }],
              },
            ]}
          >
            <Icon name={icon} size={48} color="#fff" />
          </Animated.View>

          {/* Confetti particles */}
          {type === 'milestone' && confettiAnims.map((anim, index) => (
            <Animated.View
              key={index}
              style={[
                styles.confetti,
                {
                  backgroundColor: index % 3 === 0 ? colors.menstrual : index % 3 === 1 ? colors.ovulationColor : colors.success,
                  transform: [
                    { translateX: anim.translateX },
                    { translateY: anim.translateY },
                    { rotate: anim.rotate.interpolate({
                      inputRange: [0, 360],
                      outputRange: ['0deg', '360deg'],
                    }) },
                  ],
                  opacity: anim.opacity,
                },
              ]}
            />
          ))}

          {/* Text */}
          <View style={styles.textContainer}>
            <Text
              style={[
                styles.title,
                {
                  color: colors.textPrimary,
                  fontSize: typography['2xl'],
                },
              ]}
            >
              {title}
            </Text>
            {message && (
              <Text
                style={[
                  styles.message,
                  {
                    color: colors.textSecondary,
                    fontSize: typography.md,
                  },
                ]}
              >
                {message}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  glow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    opacity: 0.3,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  confetti: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  textContainer: {
    marginTop: 180,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  title: {
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontWeight: '500',
    textAlign: 'center',
  },
});
