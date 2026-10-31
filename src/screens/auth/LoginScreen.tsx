import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  useWindowDimensions,
  ScrollView,
  Pressable,
} from 'react-native';
import Animated, {
  FadeInUp,
  FadeInDown,
  FadeIn,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Shield,
  Layers,
  Fingerprint,
  Check,
  Server,
  ArrowRight,
  ShieldCheck,
  Lock,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useLocalSearchParams, Link } from 'expo-router';

import { COMMAND_CENTER } from '../../constants/commandCenterTheme';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useCluster } from '../../contexts/ClusterContext';
import { authService } from '../../services/authService';

import { CommandCenterOrbital } from '../../components/auth/CommandCenterOrbital';
import { CommandCenterInput } from '../../components/auth/CommandCenterInput';
import { CommandCenterButton } from '../../components/auth/CommandCenterButton';
import { CommandCenterAlert, AlertType } from '../../components/auth/CommandCenterAlert';
import { CommandCenterRecoveryModal } from '../../components/auth/CommandCenterRecoveryModal';
import { CommandCenterMfaModal } from '../../components/auth/CommandCenterMfaModal';

const REMEMBER_KEY = 'nexsyrus_remembered_terminal_id';

function asErrorText(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (typeof obj.message === 'string' && obj.message.trim()) return obj.message.trim();
    if (typeof obj.error === 'string' && obj.error.trim()) return obj.error.trim();
  }
  return fallback;
}

export default function LoginScreen({ caMode = false }: { caMode?: boolean }) {
  const { colors, reducedMotion } = useTheme();
  const { refreshSessionProfile } = useAuth();
  const { selectedCluster } = useCluster();
  const router = useRouter();
  const params = useLocalSearchParams<{ reason?: string }>();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  // Responsive Breakpoints
  const isDesktop = windowWidth >= 1024;
  const isTablet = windowWidth >= 768 && windowWidth < 1024;
  const isMobile = windowWidth < 768;

  // Form State
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberTerminal, setRememberTerminal] = useState(false);
  const [identifierError, setIdentifierError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Status & Modals State
  const [loading, setLoading] = useState(false);
  const [authSuccess, setAuthSuccess] = useState(false);
  const [alertState, setAlertState] = useState<{
    visible: boolean;
    type: AlertType;
    title?: string;
    message: string;
  }>({
    visible: false,
    type: 'error',
    message: '',
  });

  const [recoveryModalVisible, setRecoveryModalVisible] = useState(false);
  const [mfaModalVisible, setMfaModalVisible] = useState(false);

  const mounted = useRef(true);

  // Restore remembered terminal identifier on initial load
  useEffect(() => {
    mounted.current = true;
    let active = true;

    AsyncStorage.getItem(REMEMBER_KEY).then((saved) => {
      if (active && saved && saved.trim()) {
        setIdentifier(saved.trim());
        setRememberTerminal(true);
      }
    }).catch(() => {});

    // Check if redirected due to expired session
    if (params?.reason === 'session_expired') {
      setAlertState({
        visible: true,
        type: 'session_expired',
        title: 'Session Expired',
        message: 'Your cryptographic session has expired or was revoked. Please authenticate again.',
      });
    }

    return () => {
      active = false;
      mounted.current = false;
    };
  }, [params?.reason]);

  // Validation
  const validateForm = (): boolean => {
    let isValid = true;
    setIdentifierError('');
    setPasswordError('');

    const trimmedId = identifier.trim();
    if (!trimmedId) {
      setIdentifierError(caMode ? 'Enter CA email or employee ID.' : 'Enter email, phone, or employee ID.');
      isValid = false;
    }

    if (!password) {
      setPasswordError('Enter your master password.');
      isValid = false;
    }

    return isValid;
  };

  // Login Execution
  const handleLogin = async (overrideId?: string, overridePwd?: string) => {
    const idToUse = (overrideId ?? identifier).trim();
    const pwdToUse = overridePwd ?? password;

    if (!idToUse || !pwdToUse) {
      validateForm();
      setAlertState({
        visible: true,
        type: 'warning',
        title: 'Missing Required Credentials',
        message: 'Please provide both your authorized identifier and password to continue.',
      });
      return;
    }

    setLoading(true);
    setAlertState({ visible: false, type: 'error', message: '' });

    try {
      const res = await authService.signIn(idToUse, pwdToUse, caMode);

      if (!mounted.current) return;

      if (res.error) {
        const errorText = asErrorText(res.error.message ?? res.error, 'Authentication failed.');

        // Differentiate 403 inactive / account locked vs invalid credentials vs network
        if (errorText.toLowerCase().includes('inactive') || errorText.toLowerCase().includes('denied') || errorText.toLowerCase().includes('locked')) {
          setAlertState({
            visible: true,
            type: 'locked',
            title: 'Access Suspended',
            message: errorText,
          });
        } else if (errorText.toLowerCase().includes('network') || errorText.toLowerCase().includes('unreachable')) {
          setAlertState({
            visible: true,
            type: 'network',
            title: 'Cluster Unreachable',
            message: 'Unable to establish secure handshake with the cluster gateway. Check connectivity and retry.',
          });
        } else {
          setAlertState({
            visible: true,
            type: 'error',
            title: 'Invalid Credentials',
            message: caMode
              ? 'Authorized CA credential pair not found. Ensure your account is assigned the CA role.'
              : 'Invalid identifier or password. Verify your credentials and retry.',
          });
        }
        return;
      }

      if (res.user && res.session) {
        // Persist or clear remembered terminal identifier
        if (rememberTerminal) {
          await AsyncStorage.setItem(REMEMBER_KEY, idToUse);
        } else {
          await AsyncStorage.removeItem(REMEMBER_KEY);
        }

        if (mounted.current) {
          setAuthSuccess(true);
          setAlertState({
            visible: true,
            type: 'success',
            title: 'Credentials Verified',
            message: 'Cryptographic handshake confirmed. Establishing session...',
          });

          await refreshSessionProfile();
        }
      }
    } catch (err: any) {
      if (!mounted.current) return;
      const isNetwork = err?.code === 'ERR_NETWORK' || err?.message?.includes('Network');
      setAlertState({
        visible: true,
        type: isNetwork ? 'network' : 'error',
        title: isNetwork ? 'Network Failure' : 'Authentication Error',
        message: isNetwork
          ? 'Network timeout while contacting the cluster. Please check your connection.'
          : 'An unexpected terminal error occurred during authentication. Please retry.',
      });
    } finally {
      if (mounted.current) {
        setLoading(false);
      }
    }
  };

  const activeClusterName = selectedCluster?.label || 'Primary Production Cluster';
  const activeClusterId = selectedCluster?.cluster_id || 'sys-default';

  return (
    <View style={styles.outerCanvas}>
      {/* Deep Obsidian Radial Background */}
      <LinearGradient
        colors={['#060913', '#080D1A', '#04070E']}
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
            isDesktop && styles.desktopScrollContent,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={[styles.mainLayout, isDesktop && styles.desktopLayout]}>
            {/* ── LEFT PANEL: NEXSYRUS COMMAND CENTRE IDENTITY ── */}
            {isDesktop ? (
              <Animated.View
                entering={reducedMotion ? undefined : FadeInDown.duration(400)}
                style={styles.leftPanel}
              >
                {/* Brand Header */}
                <View style={styles.brandHeader}>
                  <View style={styles.brandLogoBox}>
                    <Image
                      source={require('../../../assets/logo.png')}
                      style={styles.brandLogoImage}
                      resizeMode="contain"
                    />
                  </View>
                  <View style={styles.brandTitleBox}>
                    <View style={styles.brandWordmarkRow}>
                      <Text style={styles.brandWordmark}>NEXSYRUS</Text>
                      <View style={styles.brandBadge}>
                        <View style={styles.livePulseDot} />
                        <Text style={styles.brandBadgeText}>COMMAND CENTRE</Text>
                      </View>
                    </View>
                    <Text style={styles.brandSubtitle}>SUPERADMIN OS • CLUSTER MATRIX</Text>
                  </View>
                </View>

                {/* Brand Statement */}
                <View style={styles.statementBox}>
                  <Text style={styles.headline}>
                    Unified Mission Control for Institutional Operations.
                  </Text>
                  <Text style={styles.leadParagraph}>
                    High-assurance governance, real-time multi-cluster telemetry, and unified
                    administrative orchestration across schools, finances, and field teams.
                  </Text>
                </View>

                {/* 3D / Orbital Visual Composition */}
                <View style={styles.orbitalWrapper}>
                  <CommandCenterOrbital
                    size={Math.min(480, windowWidth * 0.42)}
                    activeClusterLabel={activeClusterName}
                    isCaMode={caMode}
                  />
                </View>

                {/* Footer Metadata & Telemetry Card */}
                <View style={styles.telemetryCard}>
                  <View style={styles.telemetryHeader}>
                    <View style={styles.telemetryNode}>
                      <Server size={14} color={COMMAND_CENTER.cyanAccent} />
                      <Text style={styles.telemetryClusterLabel}>{activeClusterName}</Text>
                    </View>
                    <Link href={"/cluster-selector" as any} asChild>
                      <Pressable accessibilityRole="link" accessibilityLabel="Switch cluster" style={styles.switchClusterLink}>
                        <Text style={styles.switchClusterText}>Switch Cluster</Text>
                        <ArrowRight size={12} color={COMMAND_CENTER.cobaltPrimary} />
                      </Pressable>
                    </Link>
                  </View>

                  <View style={styles.telemetrySpecsRow}>
                    <Text style={styles.telemetrySpecItem}>NODE: {activeClusterId}</Text>
                    <Text style={styles.telemetryDivider}>•</Text>
                    <Text style={styles.telemetrySpecItem}>ZERO-TRUST ENCRYPTION</Text>
                    <Text style={styles.telemetryDivider}>•</Text>
                    <Text style={styles.telemetrySpecItem}>AES-256 GCM</Text>
                  </View>
                </View>
              </Animated.View>
            ) : null}

            {/* ── RIGHT PANEL: HIGH-PRECISION AUTHENTICATION CARD ── */}
            <Animated.View
              entering={reducedMotion ? undefined : FadeInUp.duration(360).delay(60)}
              style={[
                styles.rightPanel,
                isDesktop && styles.rightPanelDesktop,
                (isTablet || isMobile) && styles.rightPanelMobile,
              ]}
            >
              {/* Compact Mobile/Tablet Header */}
              {!isDesktop ? (
                <View style={styles.mobileHeader}>
                  <View style={styles.mobileLogoRow}>
                    <Image
                      source={require('../../../assets/logo.png')}
                      style={styles.mobileLogoImage}
                      resizeMode="contain"
                    />
                    <View>
                      <Text style={styles.mobileBrandTitle}>NEXSYRUS</Text>
                      <Text style={styles.mobileBrandSubtitle}>SUPERADMIN COMMAND CENTRE</Text>
                    </View>
                  </View>

                  <View style={styles.mobileClusterPill}>
                    <Server size={12} color={COMMAND_CENTER.cyanAccent} />
                    <Text style={styles.mobileClusterText}>{activeClusterName}</Text>
                  </View>
                </View>
              ) : null}

              {/* Liquid-Glass Authentication Terminal Card */}
              <View style={styles.authCard}>
                {/* Specular Edge Highlight */}
                <View style={styles.cardSpecularTop} pointerEvents="none" />

                {/* Mode Switcher: Operations vs CA Mode */}
                <View style={styles.modeSwitcherContainer}>
                  <Link href={"/(auth)/login" as any} asChild>
                    <Pressable
                      accessibilityRole="tab"
                      accessibilityLabel="Operations SuperAdmin Access"
                      accessibilityState={{ selected: !caMode }}
                      // Link's asChild slot merges styles as objects, so flatten native arrays first.
                      style={StyleSheet.flatten([styles.modeTab, !caMode && styles.modeTabActive])}
                    >
                      <Shield size={14} color={!caMode ? '#FFFFFF' : COMMAND_CENTER.textTertiary} />
                      <Text style={[styles.modeTabText, !caMode && styles.modeTabTextActive]}>
                        SuperAdmin
                      </Text>
                    </Pressable>
                  </Link>

                  <Link href={"/(auth)/ca-login" as any} asChild>
                    <Pressable
                      accessibilityRole="tab"
                      accessibilityLabel="Chartered Accountant Books Access"
                      accessibilityState={{ selected: caMode }}
                      style={StyleSheet.flatten([styles.modeTab, caMode && styles.modeTabActiveCA])}
                    >
                      <Layers size={14} color={caMode ? '#FFFFFF' : COMMAND_CENTER.textTertiary} />
                      <Text style={[styles.modeTabText, caMode && styles.modeTabTextActive]}>
                        Chartered Accountant
                      </Text>
                    </Pressable>
                  </Link>
                </View>

                {/* CA Dedicated Mode Notice */}
                {caMode ? (
                  <View style={styles.caModeNotice}>
                    <ShieldCheck size={16} color={COMMAND_CENTER.cyanAccent} />
                    <Text style={styles.caModeNoticeText}>
                      Chartered Accountant Gateway. Grants direct access to the Books Financial Ledger.
                    </Text>
                  </View>
                ) : null}

                {/* Card Title & Instructions */}
                <View style={styles.terminalHeader}>
                  <Text style={styles.terminalTitle}>
                    {caMode ? 'CA Financial Gateway' : 'Authenticate Session'}
                  </Text>
                  <Text style={styles.terminalSubtitle}>
                    {caMode
                      ? 'Enter your accredited accounting credentials to access institution ledgers.'
                      : 'Provide your authorized credentials to access mission-critical operations.'}
                  </Text>
                </View>

                {/* Status Alert Banner */}
                {alertState.visible ? (
                  <CommandCenterAlert
                    type={alertState.type}
                    title={alertState.title}
                    message={alertState.message}
                    onDismiss={() => setAlertState((s) => ({ ...s, visible: false }))}
                    onRetry={alertState.type === 'network' ? () => handleLogin() : undefined}
                  />
                ) : null}

                {/* Unified Identifier Input */}
                <CommandCenterInput
                  label={caMode ? 'CA Account Identifier' : 'Authorized Identifier'}
                  badge={caMode ? 'CA EMAIL • EMP ID' : 'EMAIL • PHONE • EMP ID'}
                  placeholder={
                    caMode ? 'e.g. ca@nexsyrus.com or CA-104' : 'e.g. admin@nexsyrus.com, 9876543210, or SE-011'
                  }
                  value={identifier}
                  onChangeText={(text) => {
                    setIdentifier(text);
                    if (identifierError) setIdentifierError('');
                    if (alertState.visible) setAlertState((s) => ({ ...s, visible: false }));
                  }}
                  error={identifierError}
                  required
                  detectType
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  editable={!loading && !authSuccess}
                />

                {/* Password Input */}
                <CommandCenterInput
                  label="Password"
                  badge="MASTER KEY"
                  placeholder="Enter your security password"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (passwordError) setPasswordError('');
                    if (alertState.visible) setAlertState((s) => ({ ...s, visible: false }));
                  }}
                  error={passwordError}
                  required
                  secureTextEntry
                  autoComplete="password"
                  textContentType="password"
                  returnKeyType="go"
                  onSubmitEditing={() => handleLogin()}
                  editable={!loading && !authSuccess}
                />

                {/* Aux Actions: Remember Device & Forgot Password */}
                <View style={styles.auxRow}>
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityLabel="Remember this terminal"
                    accessibilityState={{ checked: rememberTerminal }}
                    onPress={() => setRememberTerminal((prev) => !prev)}
                    style={styles.rememberBox}
                  >
                    <View style={[styles.checkbox, rememberTerminal && styles.checkboxChecked]}>
                      {rememberTerminal && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                    </View>
                    <Text style={styles.rememberLabel}>Remember terminal</Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Forgot password recovery"
                    onPress={() => setRecoveryModalVisible(true)}
                    style={({ pressed }) => [styles.forgotButton, pressed && { opacity: 0.7 }]}
                  >
                    <Text style={styles.forgotText}>Forgot password?</Text>
                  </Pressable>
                </View>

                {/* Primary Sign-In Button */}
                <CommandCenterButton
                  title={caMode ? 'Authenticate CA Gateway' : 'Sign In to Command Centre'}
                  onPress={() => handleLogin()}
                  loading={loading}
                  success={authSuccess}
                  style={styles.submitButton}
                />

                {/* Hardware Security / Biometric Footprint */}
                <View style={styles.securityFootprint}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Hardware security protocols and biometric guidance"
                    onPress={() => setMfaModalVisible(true)}
                    style={({ pressed }) => [styles.securityBadgeRow, pressed && { opacity: 0.7 }]}
                  >
                    <Fingerprint size={14} color={COMMAND_CENTER.cobaltPrimary} />
                    <Text style={styles.securityBadgeText}>
                      Protected by rotating session tokens & hardware biometrics
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Bottom Assurance Note */}
              <View style={styles.bottomAssurance}>
                <Lock size={12} color={COMMAND_CENTER.textTertiary} />
                <Text style={styles.bottomAssuranceText}>
                  NexSyrus Cloud Security • 256-Bit SSL Encrypted Handshake
                </Text>
              </View>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Zero-Disclosure Password Recovery Modal */}
      <CommandCenterRecoveryModal
        visible={recoveryModalVisible}
        onClose={() => setRecoveryModalVisible(false)}
        initialIdentifier={identifier}
        clusterLabel={activeClusterName}
      />

      {/* Hardware MFA & Biometrics Guidance Modal */}
      <CommandCenterMfaModal
        visible={mfaModalVisible}
        onClose={() => setMfaModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  outerCanvas: {
    flex: 1,
    backgroundColor: COMMAND_CENTER.canvas,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  desktopScrollContent: {
    paddingVertical: 48,
    paddingHorizontal: 48,
  },
  mainLayout: {
    width: '100%',
    maxWidth: 1320,
    alignSelf: 'center',
  },
  desktopLayout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 56,
  },

  // ── LEFT PANEL STYLES (DESKTOP) ──
  leftPanel: {
    flex: 1.15,
    maxWidth: 620,
    paddingRight: 24,
    gap: 28,
  },
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  brandLogoBox: {
    width: 60,
    height: 60,
    borderRadius: COMMAND_CENTER.radii.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: COMMAND_CENTER.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
        }
      : {}),
  } as any,
  brandLogoImage: {
    width: 36,
    height: 36,
  },
  brandTitleBox: {
    gap: 3,
  },
  brandWordmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandWordmark: {
    fontSize: 22,
    fontWeight: '800',
    color: COMMAND_CENTER.textPrimary,
    letterSpacing: 1.5,
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: COMMAND_CENTER.cobaltMuted,
    borderRadius: COMMAND_CENTER.radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(10, 132, 255, 0.3)',
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COMMAND_CENTER.statusActive,
  },
  brandBadgeText: {
    fontSize: 10.5,
    fontFamily: COMMAND_CENTER.fonts.mono,
    fontWeight: '700',
    color: COMMAND_CENTER.cyanAccent,
    letterSpacing: 0.8,
  },
  brandSubtitle: {
    fontSize: 12,
    fontFamily: COMMAND_CENTER.fonts.mono,
    fontWeight: '500',
    color: COMMAND_CENTER.textTertiary,
    letterSpacing: 1,
  },
  statementBox: {
    gap: 12,
  },
  headline: {
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 42,
    color: COMMAND_CENTER.textPrimary,
    letterSpacing: -0.8,
  },
  leadParagraph: {
    fontSize: 15,
    lineHeight: 24,
    color: COMMAND_CENTER.textSecondary,
    fontWeight: '400',
    letterSpacing: 0.1,
  },
  orbitalWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: -16,
  },
  telemetryCard: {
    padding: 16,
    borderRadius: COMMAND_CENTER.radii.lg,
    backgroundColor: 'rgba(11, 18, 33, 0.65)',
    borderWidth: 1,
    borderColor: COMMAND_CENTER.glassBorder,
    gap: 10,
  },
  telemetryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  telemetryNode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  telemetryClusterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COMMAND_CENTER.textPrimary,
    letterSpacing: 0.2,
  },
  switchClusterLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  switchClusterText: {
    fontSize: 12,
    fontWeight: '600',
    color: COMMAND_CENTER.cobaltPrimary,
  },
  telemetrySpecsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  telemetrySpecItem: {
    fontSize: 10.5,
    fontFamily: COMMAND_CENTER.fonts.mono,
    color: COMMAND_CENTER.textTertiary,
    letterSpacing: 0.5,
  },
  telemetryDivider: {
    fontSize: 10,
    color: COMMAND_CENTER.textMuted,
  },

  // ── RIGHT PANEL STYLES (AUTHENTICATION CARD) ──
  rightPanel: {
    width: '100%',
  },
  rightPanelDesktop: {
    flex: 0.95,
    maxWidth: 500,
  },
  rightPanelMobile: {
    maxWidth: 480,
    alignSelf: 'center',
  },
  mobileHeader: {
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  mobileLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mobileLogoImage: {
    width: 38,
    height: 38,
  },
  mobileBrandTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COMMAND_CENTER.textPrimary,
    letterSpacing: 1,
  },
  mobileBrandSubtitle: {
    fontSize: 10.5,
    fontFamily: COMMAND_CENTER.fonts.mono,
    color: COMMAND_CENTER.cyanAccent,
    letterSpacing: 0.8,
  },
  mobileClusterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: COMMAND_CENTER.radii.pill,
    borderWidth: 1,
    borderColor: COMMAND_CENTER.glassBorder,
  },
  mobileClusterText: {
    fontSize: 11.5,
    fontFamily: COMMAND_CENTER.fonts.mono,
    color: COMMAND_CENTER.textSecondary,
  },
  authCard: {
    backgroundColor: COMMAND_CENTER.surfaceCard,
    borderRadius: COMMAND_CENTER.radii.xxl,
    borderWidth: 1,
    borderColor: COMMAND_CENTER.glassBorder,
    paddingHorizontal: 30,
    paddingTop: 28,
    paddingBottom: 28,
    overflow: 'hidden',
    position: 'relative',
    ...(Platform.OS === 'web'
      ? {
          boxShadow: COMMAND_CENTER.shadows.cardWeb,
          backdropFilter: 'blur(20px)',
        }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 16 },
          shadowOpacity: 0.45,
          shadowRadius: 32,
          elevation: 12,
        }),
  } as any,
  cardSpecularTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: COMMAND_CENTER.glassSpecularTop,
  },
  modeSwitcherContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(9, 14, 27, 0.7)',
    borderRadius: COMMAND_CENTER.radii.md,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COMMAND_CENTER.glassBorder,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    borderRadius: COMMAND_CENTER.radii.sm,
  },
  modeTabActive: {
    backgroundColor: COMMAND_CENTER.cobaltPrimary,
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 4px 12px rgba(10, 132, 255, 0.4)',
        }
      : {}),
  } as any,
  modeTabActiveCA: {
    backgroundColor: '#0284C7',
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 4px 12px rgba(2, 132, 199, 0.4)',
        }
      : {}),
  } as any,
  modeTabText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COMMAND_CENTER.textTertiary,
  },
  modeTabTextActive: {
    color: '#FFFFFF',
  },
  caModeNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: COMMAND_CENTER.caPillBg,
    borderRadius: COMMAND_CENTER.radii.md,
    borderWidth: 1,
    borderColor: COMMAND_CENTER.caPillBorder,
    marginBottom: 18,
  },
  caModeNoticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: COMMAND_CENTER.cyanAccent,
    fontWeight: '500',
  },
  terminalHeader: {
    marginBottom: 22,
    gap: 6,
  },
  terminalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COMMAND_CENTER.textPrimary,
    letterSpacing: -0.4,
  },
  terminalSubtitle: {
    fontSize: 13.5,
    lineHeight: 20,
    color: COMMAND_CENTER.textSecondary,
    fontWeight: '400',
  },
  auxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    marginTop: 4,
  },
  rememberBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: COMMAND_CENTER.textTertiary,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: COMMAND_CENTER.cobaltPrimary,
    borderColor: COMMAND_CENTER.cobaltPrimary,
  },
  rememberLabel: {
    fontSize: 13,
    color: COMMAND_CENTER.textSecondary,
    fontWeight: '500',
  },
  forgotButton: {
    paddingVertical: 4,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '600',
    color: COMMAND_CENTER.cobaltPrimary,
  },
  submitButton: {
    width: '100%',
  },
  securityFootprint: {
    marginTop: 20,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: COMMAND_CENTER.glassBorder,
    alignItems: 'center',
  },
  securityBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  securityBadgeText: {
    fontSize: 11.5,
    color: COMMAND_CENTER.textTertiary,
    textAlign: 'center',
  },
  bottomAssurance: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
  },
  bottomAssuranceText: {
    fontSize: 11.5,
    fontFamily: COMMAND_CENTER.fonts.mono,
    color: COMMAND_CENTER.textTertiary,
    letterSpacing: 0.4,
  },
});
