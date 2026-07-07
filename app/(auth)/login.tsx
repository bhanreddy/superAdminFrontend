import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, Image, Dimensions } from 'react-native';
import Animated, { FadeInUp, FadeInDown, FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { theme } from '../../src/constants/theme';
import { authService } from '../../src/services/authService';
import { useAuth } from '../../src/contexts/AuthContext';
import LogoLoader from '../../src/components/ui/LogoLoader';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const IS_WEB = Platform.OS === 'web';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();
  const { refreshSessionProfile } = useAuth();
  const mounted = useRef(true);

  useEffect(() => {
    return () => {
      mounted.current = false;
    };
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const { user, session, error, isSuperAdmin, founder } = await authService.signIn(email, password);

      if (!mounted.current) return;

      if (error) {
        setErrorMsg(error.message || 'Login failed.');
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
          // Update the global auth state.
          // The RootLayout will automatically redirect to /(app)/ when session is detected.
          await refreshSessionProfile();
        }
      }
    } catch (e) {
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
      {/* Full-screen warm dark gradient */}
      <LinearGradient
        colors={['#0F0E16', '#13121A', '#100F17']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Ambient glow orbs */}
      <View style={styles.glowOrb1} />
      <View style={styles.glowOrb2} />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          {/* Logo + Brand */}
          <Animated.View entering={FadeInDown.duration(800).springify()} style={styles.header}>
            {/* Logo image in clay-embossed circle */}
            <View style={styles.logoContainer}>
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

            {/* Decorative line */}
            <LinearGradient
              colors={['transparent', 'rgba(129, 140, 248, 0.35)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.decorLine}
            />
          </Animated.View>

          {/* Login Card — full claymorphism treatment */}
          <Animated.View entering={FadeInUp.duration(800).delay(200).springify()} style={[
            styles.formCard,
            Platform.OS === 'web' ? {
              boxShadow: '12px 12px 28px rgba(0,0,0,0.35), -12px -12px 28px rgba(255,255,255,0.04)',
            } as any : {
              shadowColor: '#000',
              shadowOffset: { width: 8, height: 8 },
              shadowOpacity: 0.25,
              shadowRadius: 24,
              elevation: 8,
            },
          ]}>
            <LinearGradient
              colors={['rgba(33, 31, 45, 0.95)', 'rgba(27, 26, 37, 0.98)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.formCardGradient}
            >
              {/* Card top accent */}
              <LinearGradient
                colors={[theme.colors.primary, 'rgba(129, 140, 248, 0.15)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.cardAccent}
              />

              <Text style={styles.formTitle}>Sign in to continue</Text>

              <Input
                label="Email Address"
                placeholder="admin@nexsyrus.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Input
                label="Password"
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              {errorMsg ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
              ) : null}

              <Button
                title="Sign In"
                onPress={handleLogin}
                loading={loading}
                style={styles.button}
              />

              <Text style={styles.footerText}>
                Authorized access only
              </Text>
            </LinearGradient>
          </Animated.View>

          {/* Bottom brand badge */}
          <Animated.View entering={FadeIn.delay(600).duration(500)} style={styles.bottomBrand}>
            <LogoLoader size={16} color="rgba(129, 140, 248, 0.5)" />
            <Text style={styles.bottomBrandText}>Powered by NexSyrus</Text>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },

  // ─── Ambient glows ─────────────────────────────────────────
  glowOrb1: {
    position: 'absolute',
    top: SCREEN_H * 0.15,
    right: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(129, 140, 248, 0.05)',
  },
  glowOrb2: {
    position: 'absolute',
    bottom: SCREEN_H * 0.1,
    left: -80,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(244, 114, 182, 0.03)',
  },

  // ─── Header ────────────────────────────────────────────────
  header: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoContainer: {
    marginBottom: 22,
  },
  logoInner: {
    width: 94,
    height: 94,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    // Clay-embossed logo circle
    ...(Platform.OS === 'web' ? {
      boxShadow: '8px 8px 20px rgba(0,0,0,0.3), -8px -8px 20px rgba(255,255,255,0.04)',
    } : {
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 16,
      shadowOffset: { width: 6, height: 6 },
      elevation: 8,
    }),
  } as any,
  logoImage: {
    width: 56,
    height: 56,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#F0EFF5',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#818CF8',
    marginTop: 5,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  decorLine: {
    width: 120,
    height: 1,
    marginTop: 18,
  },

  // ─── Form card ─────────────────────────────────────────────
  formCard: {
    width: '100%',
    maxWidth: IS_WEB ? 420 : undefined,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(129, 140, 248, 0.08)',
  },
  formCardGradient: {
    padding: 32,
  },
  cardAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  formTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(160, 157, 181, 0.8)',
    marginBottom: 28,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  errorContainer: {
    backgroundColor: 'rgba(252, 165, 165, 0.1)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  button: {
    marginTop: 10,
    borderRadius: 16,
    paddingVertical: 16,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '400',
    color: 'rgba(160, 157, 181, 0.45)',
    textAlign: 'center',
    marginTop: 18,
    letterSpacing: 0.5,
  },

  // ─── Bottom brand ──────────────────────────────────────────
  bottomBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 44,
    gap: 8,
  },
  bottomBrandText: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(160, 157, 181, 0.35)',
    letterSpacing: 0.5,
  },
});
