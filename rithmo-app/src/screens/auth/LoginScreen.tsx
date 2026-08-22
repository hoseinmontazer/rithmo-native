import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
  Dimensions,
  TouchableOpacity,
  Image,
  Animated,
  Easing,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@hooks/useTheme';
import { useAuth } from '@hooks/useAuth';
import { Button, Input, GradientBackground } from '@components/ui';
import { extractErrorMessage } from '@utils/errorHandler';
import type { AuthScreenProps } from '@navigation/types';

type Props = AuthScreenProps<'Login'>;

const { height: SCREEN_H } = Dimensions.get('window');
const HERO_H = SCREEN_H * 0.38;

export default function LoginScreen() {
  const navigation = useNavigation<Props['navigation']>();
  const { colors, spacing, typography, borderRadius } = useTheme();
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [errors, setErrors]     = useState<{ username?: string; password?: string }>({});

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const ring1Anim = useRef(new Animated.Value(0)).current;
  const ring2Anim = useRef(new Animated.Value(0)).current;
  const ring3Anim = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;

  // Entrance animations
  useEffect(() => {
    // Staggered fade and slide in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.5)),
      }),
    ]).start();

    // Pulsing rings animation
    const pulseRing = (animValue: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animValue, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
          Animated.timing(animValue, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
        ])
      ).start();
    };

    pulseRing(ring1Anim, 0);
    pulseRing(ring2Anim, 300);
    pulseRing(ring3Anim, 600);

    // Subtle logo rotation
    Animated.loop(
      Animated.timing(logoRotate, {
        toValue: 1,
        duration: 20000,
        useNativeDriver: true,
        easing: Easing.linear,
      })
    ).start();
  }, []);

  const validate = useCallback((): boolean => {
    const next: typeof errors = {};
    if (!username.trim()) {next.username = 'نام کاربری الزامی است';}
    if (!password)        {next.password = 'رمز عبور الزامی است';}
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [username, password]);

  const handleLogin = useCallback(async () => {
    if (!validate()) {return;}

    // Haptic feedback would go here if available
    setLoading(true);

    try {
      await login({ username: username.trim(), password });
      // Success animation could be added here
    } catch (err) {
      // Shake animation on error
      Animated.sequence([
        Animated.timing(slideAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();

      Alert.alert('ورود ناموفق بود', extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [login, username, password, validate, slideAnim]);

  const CARD_RADIUS = borderRadius['3xl'];

  // Interpolations for animations
  const ring1Scale = ring1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.15],
  });
  const ring1Opacity = ring1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.05],
  });

  const ring2Scale = ring2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.15],
  });
  const ring2Opacity = ring2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.08],
  });

  const ring3Scale = ring3Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.15],
  });
  const ring3Opacity = ring3Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 0.1],
  });

  const logoRotation = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      // Android's windowSoftInputMode is already `adjustResize`, so the OS
      // shrinks the window when the keyboard opens. Adding behavior="height"
      // on top of that makes KeyboardAvoidingView shrink it a SECOND time,
      // and the two compensations fight as the keyboard animates — which is
      // the visible jumping on this screen. iOS does not resize, so it still
      // needs padding.
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* ── Hero with gradient background ──────────────────────────── */}
      <GradientBackground variant="rose" style={{ height: HERO_H }}>
        <View style={[styles.hero, { height: HERO_H }]}>
          {/* Animated decorative concentric rings with pulsing effect */}
          <Animated.View
            style={[
              styles.ring,
              {
                width: 260,
                height: 260,
                borderColor: colors.primary + '12',
                borderWidth: 1.5,
                transform: [{ scale: ring1Scale }],
                opacity: ring1Opacity,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.ring,
              {
                width: 180,
                height: 180,
                borderColor: colors.primary + '20',
                borderWidth: 2,
                transform: [{ scale: ring2Scale }],
                opacity: ring2Opacity,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.ring,
              {
                width: 110,
                height: 110,
                borderColor: colors.primary + '30',
                borderWidth: 2.5,
                transform: [{ scale: ring3Scale }],
                opacity: ring3Opacity,
              },
            ]}
          />

          {/* Brand mark with mental health image - animated entrance */}
          <Animated.View
            style={[
              styles.brandBlock,
              {
                marginTop: spacing[8],
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <Animated.View
              style={[
                styles.logoCircle,
                {
                  backgroundColor: colors.primary + '18',
                  borderColor: colors.primary + '40',
                  borderWidth: 2,
                  transform: [{ rotate: logoRotation }],
                },
              ]}
            >
              <Image
                source={require('../../assets/icons/mental-health.png')}
                style={{ width: 44, height: 44 }}
                resizeMode="contain"
              />
            </Animated.View>
            <View style={{ marginTop: spacing[6] }}>
              <Text
                style={[
                  styles.appName,
                  {
                    color: colors.primary,
                    fontSize: 30,
                    fontWeight: '700',
                    letterSpacing: -0.5,
                  },
                ]}
              >
                ریتمو
              </Text>
              <Text
                style={[
                  styles.tagline,
                  {
                    color: colors.textSecondary,
                    fontSize: typography.sm,
                    marginTop: 4,
                    textAlign: 'center',
                  },
                ]}
              >
                چرخه‌ات، ریتم توست
              </Text>
            </View>
          </Animated.View>
        </View>
      </GradientBackground>

      {/* ── Form card (slides up over hero) ───────────────────────── */}
      <Animated.View
        style={[
          styles.formCard,
          {
            backgroundColor: colors.surface,
            borderTopLeftRadius: CARD_RADIUS,
            borderTopRightRadius: CARD_RADIUS,
            marginTop: -CARD_RADIUS,
            paddingHorizontal: spacing[6],
            paddingTop: spacing[6],
            paddingBottom: spacing[16],
            flex: 1,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
            // Add subtle shadow for depth
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 8,
          },
        ]}
      >
        <Text
          style={[
            styles.formTitle,
            {
              color: colors.textPrimary,
              fontSize: 22,
              fontWeight: '700',
            },
          ]}
        >
          خوش برگشتی
        </Text>
        <Text
          style={[
            styles.formSubtitle,
            {
              color: colors.textSecondary,
              fontSize: typography.sm,
              marginTop: spacing[1],
              marginBottom: spacing[5],
            },
          ]}
        >
          برای ادامه‌ی پیگیری چرخه‌ات وارد شو
        </Text>

        <Input
          label="نام کاربری"
          placeholder="نام کاربری"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
          error={errors.username}
          leftIconName="account-outline"
          containerStyle={{ marginBottom: spacing[4] }}
        />

        <Input
          label="رمز عبور"
          placeholder="رمز عبور"
          value={password}
          onChangeText={setPassword}
          isPassword
          returnKeyType="done"
          onSubmitEditing={handleLogin}
          error={errors.password}
          leftIconName="lock-outline"
          containerStyle={{ marginBottom: spacing[2] }}
        />

        {/* Forgot password */}
        <TouchableOpacity
          onPress={() => navigation.navigate('ForgotPassword')}
          style={[styles.forgotBtn, { marginBottom: spacing[5] }]}
          accessibilityRole="button"
          activeOpacity={0.7}
        >
          <Text
            style={{
              color: colors.primary,
              fontSize: typography.sm,
              fontWeight: '600',
            }}
          >
            رمز عبورت را گم کردی؟
          </Text>
        </TouchableOpacity>

        <Button
          label="ورود"
          onPress={handleLogin}
          loading={loading}
          fullWidth
          size="lg"
        />

        {/* Divider */}
        <View style={[styles.dividerRow, { marginVertical: spacing[4] }]}>
          <View style={[styles.dividerLine, { backgroundColor: colors.divider }]} />
          <Text
            style={{
              color: colors.textTertiary,
              fontSize: typography.sm,
              marginHorizontal: spacing[3],
            }}
          >
            یا
          </Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.divider }]} />
        </View>

        <Button
          label="ساخت حساب کاربری"
          onPress={() => navigation.navigate('Register')}
          variant="outline"
          fullWidth
          size="lg"
        />
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },

  // Hero
  hero:       { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  ring:       { position: 'absolute', borderRadius: 999 },
  brandBlock: { alignItems: 'center', zIndex: 1 },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName:  {},
  tagline:  {},

  // Form
  formCard:     {},
  formTitle:    {},
  formSubtitle: {},
  forgotBtn:    { alignSelf: 'flex-end' },
  dividerRow:   { flexDirection: 'row', alignItems: 'center' },
  dividerLine:  { flex: 1, height: 1 },
});
