import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  Dimensions,
  ScrollView,
} from 'react-native';
import Animated, { FadeInUp, FadeInDown, FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { darkTheme } from '../../src/constants/theme';
import { authService } from '../../src/services/authService';
import { useAuth } from '../../src/contexts/AuthContext';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const IS_WEB = Platform.OS === 'web';
const colors = darkTheme.colors;

function asErrorText(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (typeof obj.message === 'string' && obj.message.trim()) return obj.message.trim();
  }
  return fallback;
}

export default function LoginScreen() {
  const [email, setEmail] = useState('');
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

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const { user, session, error, isSuperAdmin, founder } = await authService.signIn(
        email.trim(),
        password,
      );

      if (!mounted.current) return;

      if (error) {
        setErrorMsg(asErrorText(error.message ?? error, 'Login failed.'));
        return;
      }

      if (user && session) {
        const founderOk = Boolean(founder && founder.is_active);
        if (!isSuperAdmin && !founderOk) {
          await authService.signOut();
          if (mounted.current) {
            setErrorMsg('Access denied. Super admin or active founder access required.');
          }
        } else if (mounted.current) {
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
      {/* Static ambient base — Mode B glass world */}
      <LinearGradient
        colors={['#07080F', '#0C1020', '#0A0B12']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Soft ambient orbs — painted once, never animated */}
      <View pointerEvents="none" style={styles.glowOrb1} />
      <View pointerEvents="none" style={styles.glowOrb2} />
      <View pointerEvents="none" style={styles.glowOrb3} />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.content}>
            {/* Brand */}
            <Animated.View entering={FadeInDown.duration(320)} style={styles.header}>
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
                    source={require('../../assets/logo.png')}
                    style={styles.logoImage}
                    resizeMode="contain"
                  />
                </View>
              </View>

              <Text style={styles.title}>NexSyrus</Text>
              <Text style={styles.subtitle}>Super Admin Console</Text>

              <LinearGradient
                colors={['transparent', 'rgba(10, 132, 255, 0.55)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.decorLine}
              />
            </Animated.View>

            {/* Fake-glass login card */}
            <Animated.View entering={FadeInUp.duration(340).delay(80)} style={styles.formCard}>
              <LinearGradient
                colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.03)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.formCardSheen}
                pointerEvents="none"
              />

              <View style={styles.formBody}>
                <Text style={styles.formTitle}>Sign in to continue</Text>

                <Input
                  tone="dark"
                  label="Email Address"
                  placeholder="admin@nexsyrus.com"
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
                    if (errorMsg) setErrorMsg('');
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType="emailAddress"
                  returnKeyType="next"
                />

                <Input
                  tone="dark"
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
                  onSubmitEditing={handleLogin}
                />

                {errorMsg ? (
                  <View style={styles.errorContainer} accessibilityLiveRegion="polite">
                    <Text style={styles.errorText}>{errorMsg}</Text>
                  </View>
                ) : null}

                <Button
                  title="Sign In"
                  size="lg"
                  onPress={handleLogin}
                  loading={loading}
                  style={styles.button}
                />

                <Text style={styles.footerText}>Authorized access only</Text>
              </View>
            </Animated.View>

            <Animated.View entering={FadeIn.delay(220).duration(280)} style={styles.bottomBrand}>
              <View style={styles.bottomDot} />
              <Text style={styles.bottomBrandText}>Powered by NexSyrus</Text>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#07080F',
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
    maxWidth: IS_WEB ? 440 : undefined,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
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
    marginBottom: 28,
  },
  logoShell: {
    width: 88,
    height: 88,
    borderRadius: 26,
    marginBottom: 18,
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
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 44,
    height: 44,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryHover,
    marginTop: 8,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  decorLine: {
    width: 96,
    height: 2,
    marginTop: 16,
    borderRadius: 2,
  },

  formCard: {
    width: '100%',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(16, 18, 30, 0.78)',
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
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 26,
  },
  formTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(245,245,247,0.72)',
    marginBottom: 22,
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
    color: '#FF8A80',
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
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(245,245,247,0.48)',
    textAlign: 'center',
    marginTop: 18,
    letterSpacing: 0.4,
  },

  bottomBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 28,
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
    color: 'rgba(245,245,247,0.45)',
    letterSpacing: 0.3,
  },
});
