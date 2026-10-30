import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  Dimensions,
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import Animated, {
  FadeInUp,
  FadeInDown,
  FadeIn,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import type { ThemeColors } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';
import { Link } from 'expo-router';
import { authService } from '../../services/authService';
import { useAuth } from '../../contexts/AuthContext';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const IS_WEB = Platform.OS === 'web';

function asErrorText(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (typeof obj.message === 'string' && obj.message.trim())
      return obj.message.trim();
  }
  return fallback;
}

export default function LoginScreen({ caMode = false }: { caMode?: boolean }) {
  const { colors, isDark, reducedMotion, reducedTransparency } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { refreshSessionProfile } = useAuth();
  const mounted = useRef(true);

  useEffect(() => {
    return () => {
      mounted.current = false;
    };
  }, []);

  const handleLogin = async (overrideId?: string, overridePwd?: string) => {
    const idToUse = (overrideId || identifier).trim();
    const pwdToUse = overridePwd || password;

    if (!idToUse || !pwdToUse) {
      setErrorMsg('Please enter both Email / Employee ID and password.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await authService.signIn(idToUse, pwdToUse, caMode);

      if (!mounted.current) return;

      if (res.error) {
        setErrorMsg(
          asErrorText(res.error.message ?? res.error, 'Login failed.'),
        );
        return;
      }

      if (res.user && res.session) {
        if (mounted.current) {
          await refreshSessionProfile();
        }
      }
    } catch {
      if (mounted.current) {
        setErrorMsg('Something went wrong. Please try again.');
      }
    } finally {
      if (mounted.current) {
        setLoading(false);
      }
    }
  };

  return (
    <View style={styles.outerContainer}>
      {/* Ambient gradient base */}
      <LinearGradient
        colors={[colors.background, colors.background, colors.background]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { minHeight: windowHeight },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View
            style={[
              styles.content,
              windowWidth < 400 && { paddingHorizontal: 16 },
            ]}
          >
            {/* Header / Brand */}
            <Animated.View
              entering={reducedMotion ? undefined : FadeInDown.duration(320)}
              style={styles.header}
            >
              <View style={styles.logoShell}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.16)', 'rgba(255,255,255,0.04)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.logoSheen}
                  pointerEvents="none"
                />
                <View style={styles.logoInner}>
                  <Image
                    source={require('../../../assets/logo.png')}
                    style={styles.logoImage}
                    resizeMode="contain"
                  />
                </View>
              </View>

              <Text style={styles.title}>NexSyrus</Text>
              <Text style={styles.subtitle}>
                {caMode
                  ? 'Chartered Accountant Access'
                  : 'Your team. Your work. Connected.'}
              </Text>

              <LinearGradient
                colors={[
                  'transparent',
                  'rgba(10, 132, 255, 0.55)',
                  'transparent',
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.decorLine}
              />
            </Animated.View>

            {/* Glass Login Card */}
            <Animated.View
              entering={reducedMotion ? undefined : FadeInUp.duration(340).delay(80)}
              style={styles.formCard}
            >
              <LinearGradient
                colors={reducedTransparency ? [colors.card, colors.card] : ['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.03)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.formCardSheen}
                pointerEvents="none"
              />

              <View style={styles.formBody}>
                <Text style={styles.formTitle}>
                  {caMode
                    ? 'Sign in to your Books workspace'
                    : 'Welcome back to your workspace'}
                </Text>

                <Input
                  tone={isDark ? 'dark' : 'auto'}
                  label={
                    caMode
                      ? 'CA email / Employee ID'
                      : 'Email / Phone / Employee ID'
                  }
                  placeholder={
                    caMode
                      ? 'e.g. ca@nexsyrus.com'
                      : 'e.g. admin@nexsyrus.com or SE-011'
                  }
                  value={identifier}
                  onChangeText={(t) => {
                    setIdentifier(t);
                    if (errorMsg) setErrorMsg('');
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />

                <Input
                  tone={isDark ? 'dark' : 'auto'}
                  label="Password"
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    if (errorMsg) setErrorMsg('');
                  }}
                  secureTextEntry
                  autoComplete="password"
                  textContentType="password"
                  returnKeyType="go"
                  onSubmitEditing={() => handleLogin()}
                />

                {errorMsg ? (
                  <View
                    style={styles.errorContainer}
                    accessibilityLiveRegion="polite"
                  >
                    <Text style={styles.errorText}>{errorMsg}</Text>
                  </View>
                ) : null}

                <Button
                  title="Sign In"
                  size="lg"
                  onPress={() => handleLogin()}
                  loading={loading}
                  style={styles.button}
                />

                <Text style={styles.footerText}>
                  {caMode
                    ? 'Lead CA and accounting team access.'
                    : 'One workspace for your schools, teams and operations.'}
                </Text>
                <Link
                  href={(caMode ? '/(auth)/login' : '/(auth)/ca-login') as any}
                  style={[
                    styles.footerText,
                    { color: colors.info, marginTop: 16 },
                  ]}
                >
                  {caMode ? 'SuperAdmin / staff sign in' : 'CA sign in'}
                </Link>
              </View>
            </Animated.View>

            <Animated.View
              entering={reducedMotion ? undefined : FadeIn.delay(220).duration(280)}
              style={styles.bottomBrand}
            >
              <View style={styles.bottomDot} />
              <Text style={styles.bottomBrandText}>
                Powered by NexSyrus Cloud
              </Text>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: SCREEN_H,
  },
  content: {
    width: '100%',
    maxWidth: IS_WEB ? 460 : undefined,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 36,
  },

  glowOrb1: {
    position: 'absolute',
    top: -SCREEN_H * 0.08,
    right: -SCREEN_W * 0.18,
    width: Math.min(360, SCREEN_W * 0.72),
    height: Math.min(360, SCREEN_W * 0.72),
    borderRadius: 999,
    backgroundColor: 'rgba(10, 132, 255, 0.16)',
  },
  glowOrb2: {
    position: 'absolute',
    bottom: SCREEN_H * 0.08,
    left: -SCREEN_W * 0.22,
    width: Math.min(300, SCREEN_W * 0.62),
    height: Math.min(300, SCREEN_W * 0.62),
    borderRadius: 999,
    backgroundColor: 'rgba(94, 92, 230, 0.12)',
  },
  glowOrb3: {
    position: 'absolute',
    top: SCREEN_H * 0.42,
    right: SCREEN_W * 0.08,
    width: 160,
    height: 160,
    borderRadius: 999,
    backgroundColor: 'rgba(100, 210, 255, 0.06)',
  },

  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoShell: {
    width: 84,
    height: 84,
    borderRadius: 24,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 18px 40px rgba(0,0,0,0.35)' }
      : {
          shadowColor: '#000',
          shadowOpacity: 0.28,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 10 },
          elevation: 6,
        }),
  } as any,
  logoSheen: {
    ...StyleSheet.absoluteFillObject,
  },
  logoInner: {
    width: 68,
    height: 68,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 42,
    height: 42,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryHover,
    marginTop: 6,
    letterSpacing: 0.2,
  },
  decorLine: {
    width: 96,
    height: 2,
    marginTop: 14,
    borderRadius: 2,
  },

  formCard: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 24px 64px rgba(0,0,0,0.45)' }
      : {
          shadowColor: '#000',
          shadowOpacity: 0.35,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 14 },
          elevation: 6,
        }),
  } as any,
  formCardSheen: {
    ...StyleSheet.absoluteFillObject,
  },
  formBody: {
    paddingHorizontal: 26,
    paddingTop: 26,
    paddingBottom: 24,
  },
  formTitle: {
    fontSize: 14.5,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 69, 58, 0.12)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 58, 0.28)',
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 18,
  },
  button: {
    marginTop: 4,
    width: '100%',
  },

  footerText: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 20,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 20,
    letterSpacing: 0.3,
  },

  bottomBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    gap: 8,
  },
  bottomDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(10, 132, 255, 0.7)',
  },
  bottomBrandText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    letterSpacing: 0.3,
  },
});
