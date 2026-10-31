import React, { useState, useRef, useEffect } from 'react';
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
  TextInput,
} from 'react-native';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import {
  Shield,
  Layers,
  Fingerprint,
  Check,
  Server,
  ArrowRight,
  ShieldCheck,
  Lock,
  ChevronDown,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, Link } from 'expo-router';

import { brandColors } from '../../constants/experienceColors';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useCluster } from '../../contexts/ClusterContext';
import { authService } from '../../services/authService';

import { InstitutionLandscape } from '../../components/auth/InstitutionLandscape';
import { CommandCenterInput } from '../../components/auth/CommandCenterInput';
import { CommandCenterButton } from '../../components/auth/CommandCenterButton';
import {
  CommandCenterAlert,
  AlertType,
} from '../../components/auth/CommandCenterAlert';
import { CommandCenterRecoveryModal } from '../../components/auth/CommandCenterRecoveryModal';
import { CommandCenterMfaModal } from '../../components/auth/CommandCenterMfaModal';

const REMEMBER_KEY = 'nexsyrus_remembered_terminal_id';

function asErrorText(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (typeof obj.message === 'string' && obj.message.trim())
      return obj.message.trim();
    if (typeof obj.error === 'string' && obj.error.trim())
      return obj.error.trim();
  }
  return fallback;
}

export default function LoginScreen({ caMode = false }: { caMode?: boolean }) {
  const { reducedMotion } = useTheme();
  const { refreshSessionProfile } = useAuth();
  const { selectedCluster } = useCluster();
  const params = useLocalSearchParams<{ reason?: string }>();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  // Responsive Breakpoints
  const isDesktop = windowWidth >= 1024;
  const isCompact = windowWidth < 480;

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
  const passwordInput = useRef<TextInput>(null);
  const submitting = useRef(false);

  // Restore remembered terminal identifier on initial load
  useEffect(() => {
    mounted.current = true;
    let active = true;

    AsyncStorage.getItem(REMEMBER_KEY)
      .then((saved) => {
        if (active && saved && saved.trim()) {
          setIdentifier(saved.trim());
          setRememberTerminal(true);
        }
      })
      .catch(() => {});

    // Check if redirected due to expired session
    if (params?.reason === 'session_expired') {
      setAlertState({
        visible: true,
        type: 'session_expired',
        title: 'Session Expired',
        message: 'Your session has expired. Sign in again to continue.',
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
      setIdentifierError(
        caMode
          ? 'Enter CA email or employee ID.'
          : 'Enter email, phone, or employee ID.'
      );
      isValid = false;
    }

    if (!password) {
      setPasswordError('Enter your password.');
      isValid = false;
    }

    return isValid;
  };

  // Login Execution
  const handleLogin = async (overrideId?: string, overridePwd?: string) => {
    if (submitting.current || authSuccess) return;
    const idToUse = (overrideId ?? identifier).trim();
    const pwdToUse = overridePwd ?? password;

    if (!idToUse || !pwdToUse) {
      validateForm();
      setAlertState({
        visible: true,
        type: 'warning',
        title: 'Missing Required Credentials',
        message: 'Enter your account identifier and password to continue.',
      });
      return;
    }

    submitting.current = true;
    setLoading(true);
    setAlertState({ visible: false, type: 'error', message: '' });

    try {
      const res = await authService.signIn(idToUse, pwdToUse, caMode);

      if (!mounted.current) return;

      if (res.error) {
        const errorText = asErrorText(
          res.error.message ?? res.error,
          'Authentication failed.'
        );

        // Differentiate 403 inactive / account locked vs invalid credentials vs network
        if (
          errorText.toLowerCase().includes('inactive') ||
          errorText.toLowerCase().includes('denied') ||
          errorText.toLowerCase().includes('locked')
        ) {
          setAlertState({
            visible: true,
            type: 'locked',
            title: 'Access Suspended',
            message: errorText,
          });
        } else if (
          errorText.toLowerCase().includes('network') ||
          errorText.toLowerCase().includes('unreachable')
        ) {
          setAlertState({
            visible: true,
            type: 'network',
            title: 'Cluster Unreachable',
            message:
              'Unable to establish secure handshake with the cluster gateway. Check connectivity and retry.',
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
            message: 'You’re signed in. Opening your workspace…',
          });

          await refreshSessionProfile();
        }
      }
    } catch (err: any) {
      if (!mounted.current) return;
      const isNetwork =
        err?.code === 'ERR_NETWORK' || err?.message?.includes('Network');
      setAlertState({
        visible: true,
        type: isNetwork ? 'network' : 'error',
        title: isNetwork ? 'Network Failure' : 'Authentication Error',
        message: isNetwork
          ? 'Network timeout while contacting the cluster. Please check your connection.'
          : 'An unexpected terminal error occurred during authentication. Please retry.',
      });
    } finally {
      submitting.current = false;
      if (mounted.current) {
        setLoading(false);
      }
    }
  };

  const activeClusterName =
    selectedCluster?.label || 'Primary Production Cluster';

  const brand = (
    <View style={styles.brandHeader}>
      <View style={styles.brandLogoBox}>
        <Image
          source={require('../../../assets/logo.png')}
          style={styles.brandLogoImage}
          resizeMode="contain"
          accessibilityLabel="Nexsyrus logo"
        />
      </View>
      <View style={styles.brandTitleBox}>
        <Text style={styles.brandWordmark}>NEXSYRUS</Text>
        <Text style={styles.brandSubtitle}>
          {isDesktop ? 'A CONNECTED WAY FORWARD' : 'SUPERADMIN COMMAND CENTRE'}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.outerCanvas}>
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
          <View style={[styles.pageShell, isDesktop && styles.desktopShell]}>
            {isDesktop ? (
              <View
                style={[
                  styles.storyPanel,
                  windowWidth < 1200 && styles.storyPanelNarrow,
                ]}
              >
                {brand}
                <Animated.View
                  entering={
                    reducedMotion ? undefined : FadeInDown.duration(400)
                  }
                  style={styles.storyContent}
                >
                  <View style={styles.eyebrowRow}>
                    <View style={styles.eyebrowDot} />
                    <Text style={styles.eyebrow}>
                      THE INSTITUTIONAL WORKSPACE
                    </Text>
                  </View>
                  <Text
                    accessibilityRole="header"
                    style={[
                      styles.headline,
                      windowWidth < 1200 && styles.headlineNarrow,
                    ]}
                  >
                    A clearer view.{'\n'}A stronger{'\n'}
                    <Text style={styles.headlineAccent}>institution.</Text>
                  </Text>
                  <Text style={styles.leadParagraph}>
                    Good things happen when everything comes together. Your
                    schools, finances, and people — in one thoughtful workspace.
                  </Text>
                  <View style={styles.landscapeWrapper}>
                    <InstitutionLandscape />
                  </View>
                  <View style={styles.domainRow}>
                    <Text style={styles.domainText}>Schools</Text>
                    <View style={styles.domainDot} />
                    <Text style={styles.domainText}>Finance</Text>
                    <View style={styles.domainDot} />
                    <Text style={styles.domainText}>People</Text>
                    <View style={styles.domainRule} />
                    <Text style={styles.domainCaption}>ALL IN SYNC</Text>
                  </View>
                </Animated.View>
                <View style={styles.storyFooter}>
                  <Text style={styles.storyFooterText}>
                    Designed for the bigger picture.
                  </Text>
                  <Text style={styles.storyFooterIndex}>01 — NEXSYRUS</Text>
                </View>
              </View>
            ) : (
              <View style={styles.mobileHeader}>{brand}</View>
            )}

            <View
              style={[
                styles.accessPanel,
                !isDesktop && styles.accessPanelMobile,
                isCompact && styles.accessPanelCompact,
              ]}
            >
              {isDesktop && (
                <View style={styles.accessHeader}>
                  <Lock size={12} color="#5D687A" />
                  <Text style={styles.accessHeaderText}>PRIVATE WORKSPACE</Text>
                </View>
              )}
              <Animated.View
                entering={
                  reducedMotion ? undefined : FadeInUp.duration(360).delay(60)
                }
                style={[
                  styles.formContent,
                  !isDesktop && styles.formContentMobile,
                ]}
              >
                <View style={styles.formIntro}>
                  <Text style={styles.formEyebrow}>
                    COMMAND CENTRE / {caMode ? 'FINANCE' : 'ADMINISTRATION'}
                  </Text>
                  <Text accessibilityRole="header" style={styles.terminalTitle}>
                    {caMode ? 'Your financial workspace.' : 'Welcome back.'}
                  </Text>
                  <Text style={styles.terminalSubtitle}>
                    A fresh start to a productive day. Sign in to continue.
                  </Text>
                </View>
                <View
                  style={styles.modeSwitcherContainer}
                  accessibilityRole="tablist"
                >
                  <Link href={'/(auth)/login' as any} asChild>
                    <Pressable
                      accessibilityRole="tab"
                      accessibilityLabel="Operations SuperAdmin Access"
                      accessibilityState={{ selected: !caMode }}
                      style={StyleSheet.flatten([
                        styles.modeTab,
                        !caMode && styles.modeTabActive,
                      ])}
                    >
                      <Shield
                        size={15}
                        color={!caMode ? brandColors.blue : '#5D687A'}
                      />
                      <Text
                        style={[
                          styles.modeTabText,
                          !caMode && styles.modeTabTextActive,
                        ]}
                      >
                        SuperAdmin
                      </Text>
                    </Pressable>
                  </Link>
                  <Link href={'/(auth)/ca-login' as any} asChild>
                    <Pressable
                      accessibilityRole="tab"
                      accessibilityLabel="Chartered Accountant Books Access"
                      accessibilityState={{ selected: caMode }}
                      style={StyleSheet.flatten([
                        styles.modeTab,
                        caMode && styles.modeTabActive,
                      ])}
                    >
                      <Layers
                        size={15}
                        color={caMode ? brandColors.blue : '#5D687A'}
                      />
                      <Text
                        style={[
                          styles.modeTabText,
                          caMode && styles.modeTabTextActive,
                        ]}
                      >
                        Chartered Accountant
                      </Text>
                    </Pressable>
                  </Link>
                </View>
                <Link href={'/cluster-selector' as any} asChild>
                  <Pressable
                    accessibilityRole="link"
                    accessibilityLabel={`Switch cluster, currently ${activeClusterName}`}
                    style={styles.clusterSelector}
                  >
                    <View style={styles.clusterIcon}>
                      <Server size={17} color="#2455C6" />
                    </View>
                    <View style={styles.clusterDetails}>
                      <Text style={styles.clusterCaption}>YOUR WORKSPACE</Text>
                      <Text style={styles.clusterName} numberOfLines={1}>
                        {activeClusterName}
                      </Text>
                    </View>
                    <ChevronDown size={16} color="#746687" />
                  </Pressable>
                </Link>
                {caMode && (
                  <View style={styles.caModeNotice}>
                    <ShieldCheck size={16} color="#2455C6" />
                    <Text style={styles.caModeNoticeText}>
                      Chartered Accountant Gateway · Access to the Books
                      Financial Ledger.
                    </Text>
                  </View>
                )}
                {alertState.visible && (
                  <CommandCenterAlert
                    appearance="light"
                    type={alertState.type}
                    title={alertState.title}
                    message={alertState.message}
                    onDismiss={() =>
                      setAlertState((s) => ({ ...s, visible: false }))
                    }
                    onRetry={
                      alertState.type === 'network'
                        ? () => handleLogin()
                        : undefined
                    }
                  />
                )}

                <CommandCenterInput
                  appearance="light"
                  label={
                    caMode
                      ? 'CA email or employee ID'
                      : 'Email, phone, or employee ID'
                  }
                  placeholder={
                    caMode ? 'ca@nexsyrus.com' : 'Enter your account identifier'
                  }
                  value={identifier}
                  onChangeText={(text) => {
                    setIdentifier(text);
                    if (identifierError) setIdentifierError('');
                    if (alertState.visible)
                      setAlertState((s) => ({ ...s, visible: false }));
                  }}
                  error={identifierError}
                  required
                  detectType
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="username"
                  textContentType="username"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => passwordInput.current?.focus()}
                  editable={!loading && !authSuccess}
                />
                <CommandCenterInput
                  appearance="light"
                  ref={passwordInput}
                  label="Password"
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (passwordError) setPasswordError('');
                    if (alertState.visible)
                      setAlertState((s) => ({ ...s, visible: false }));
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
                <View style={styles.auxRow}>
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityLabel="Remember my identifier"
                    accessibilityHint="Saves your account identifier on this device. Your password is never saved."
                    accessibilityState={{
                      checked: rememberTerminal,
                      disabled: loading || authSuccess,
                    }}
                    disabled={loading || authSuccess}
                    onPress={() => setRememberTerminal((prev) => !prev)}
                    style={styles.rememberBox}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        rememberTerminal && styles.checkboxChecked,
                      ]}
                    >
                      {rememberTerminal && (
                        <Check size={12} color="#FFFFFF" strokeWidth={3} />
                      )}
                    </View>
                    <Text style={styles.rememberLabel}>Remember my ID</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Forgot password recovery"
                    onPress={() => setRecoveryModalVisible(true)}
                    style={({ pressed }) => [
                      styles.forgotButton,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Text style={styles.forgotText}>Forgot password?</Text>
                  </Pressable>
                </View>
                <CommandCenterButton
                  appearance="light"
                  title={
                    caMode ? 'Sign in to Books' : 'Sign in to Command Centre'
                  }
                  onPress={() => handleLogin()}
                  loading={loading}
                  success={authSuccess}
                  style={styles.submitButton}
                />
                <View style={styles.securityFootprint}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="View sign-in security and biometric options"
                    onPress={() => setMfaModalVisible(true)}
                    style={({ pressed }) => [
                      styles.securityBadgeRow,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Fingerprint size={17} color="#5D687A" />
                    <Text style={styles.securityBadgeText}>
                      About secure sign-in
                    </Text>
                    <ArrowRight size={13} color="#5D687A" />
                  </Pressable>
                </View>
              </Animated.View>
              <View style={styles.accessFooter}>
                <View style={styles.footerSecurity}>
                  <ShieldCheck size={13} color="#5D687A" />
                  <Text style={styles.footerText}>
                    Role-based access. A space you can trust.
                  </Text>
                </View>
                <Text style={styles.footerCopyright}>
                  Nexsyrus · Institutional operations
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <CommandCenterRecoveryModal
        visible={recoveryModalVisible}
        onClose={() => setRecoveryModalVisible(false)}
        initialIdentifier={identifier}
        clusterLabel={activeClusterName}
      />
      <CommandCenterMfaModal
        visible={mfaModalVisible}
        onClose={() => setMfaModalVisible(false)}
      />
    </View>
  );
}

const serifFont = Platform.select({
  web: "Georgia, 'Times New Roman', serif",
  ios: 'Georgia',
  android: 'serif',
});

const styles = StyleSheet.create({
  outerCanvas: { flex: 1, backgroundColor: '#FCFDFE' },
  container: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  pageShell: { flex: 1, width: '100%', maxWidth: 1920, alignSelf: 'center' },
  desktopShell: { flexDirection: 'row' },
  storyPanel: {
    flex: 1.06,
    minWidth: 0,
    backgroundColor: brandColors.navy,
    paddingHorizontal: 64,
    paddingTop: 34,
    paddingBottom: 28,
    borderRightWidth: 1,
    borderRightColor: '#263B58',
  },
  storyPanelNarrow: { paddingHorizontal: 40 },
  brandHeader: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  brandLogoBox: {
    width: 44,
    height: 44,
    backgroundColor: '#FFFFFF',
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLogoImage: { width: 30, height: 30 },
  brandTitleBox: { gap: 5 },
  brandWordmark: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: 1.8,
  },
  brandSubtitle: {
    color: '#B6C7DF',
    fontSize: 8,
    fontWeight: '600',
    letterSpacing: 1.7,
  },
  storyContent: {
    flex: 1,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    justifyContent: 'center',
    paddingTop: 42,
    paddingBottom: 30,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  eyebrowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: brandColors.gold,
  },
  eyebrow: {
    fontSize: 9,
    letterSpacing: 1.6,
    fontWeight: '600',
    color: '#D8BE8C',
  },
  headline: {
    color: '#F7FAFF',
    fontFamily: serifFont,
    fontSize: 65,
    lineHeight: 69,
    fontWeight: '400',
    letterSpacing: -2.3,
  },
  headlineNarrow: { fontSize: 56, lineHeight: 61 },
  headlineAccent: { color: brandColors.gold, fontStyle: 'italic' },
  leadParagraph: {
    color: '#BCCCE2',
    fontSize: 14,
    lineHeight: 23,
    maxWidth: 380,
    marginTop: 22,
  },
  landscapeWrapper: { width: '100%', maxWidth: 500, height: 235, marginTop: 8 },
  domainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  domainText: { fontSize: 11, color: '#DDE6F3', fontWeight: '500' },
  domainDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#D4B57C',
  },
  domainRule: {
    flex: 1,
    height: 1,
    backgroundColor: '#3A4E6B',
    marginHorizontal: 4,
  },
  domainCaption: {
    color: '#AFC1D8',
    fontSize: 8,
    letterSpacing: 1.4,
    fontWeight: '600',
  },
  storyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  storyFooterText: { fontSize: 10, color: '#AFC1D8' },
  storyFooterIndex: { fontSize: 8, color: '#AFC1D8', letterSpacing: 1.1 },
  mobileHeader: {
    backgroundColor: brandColors.navy,
    paddingHorizontal: 26,
    paddingVertical: 22,
    borderBottomWidth: 1,
    borderBottomColor: '#263B58',
  },
  accessPanel: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 64,
    paddingTop: 42,
    paddingBottom: 24,
    backgroundColor: '#FCFDFE',
  },
  accessPanelMobile: { paddingTop: 36, paddingHorizontal: 30 },
  accessPanelCompact: { paddingHorizontal: 24, paddingTop: 30 },
  accessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 7,
  },
  accessHeaderText: {
    color: '#5D687A',
    fontSize: 8,
    letterSpacing: 1.4,
    fontWeight: '500',
  },
  formContent: {
    flex: 1,
    justifyContent: 'center',
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    paddingVertical: 38,
  },
  formContentMobile: { paddingTop: 8, paddingBottom: 20 },
  formIntro: { marginBottom: 25 },
  formEyebrow: {
    color: '#5D687A',
    fontSize: 8,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginBottom: 14,
  },
  terminalTitle: {
    color: '#1D2A3E',
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '600',
    letterSpacing: -1.2,
  },
  terminalSubtitle: {
    color: '#5D687A',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 9,
  },
  modeSwitcherContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#DEE5EE',
  },
  modeTab: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    minHeight: 45,
    paddingHorizontal: 4,
    paddingBottom: 13,
    paddingTop: 5,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -1,
  },
  modeTabActive: { borderBottomColor: brandColors.blue },
  modeTabText: {
    fontSize: 12,
    color: '#5D687A',
    flexShrink: 1,
    textAlign: 'center',
    fontWeight: '500',
  },
  modeTabTextActive: { color: brandColors.blue, fontWeight: '600' },
  clusterSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F1F5FB',
    borderWidth: 1,
    borderColor: '#DCE4EF',
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 6,
    marginBottom: 25,
  },
  clusterIcon: { width: 28, alignItems: 'center' },
  clusterDetails: { flex: 1, minWidth: 0, gap: 4 },
  clusterCaption: {
    color: '#5D687A',
    fontSize: 8,
    fontWeight: '500',
    letterSpacing: 1.1,
  },
  clusterName: { color: '#263852', fontSize: 12, fontWeight: '500' },
  caModeNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#EDF2FA',
    borderRadius: 6,
    marginBottom: 22,
  },
  caModeNoticeText: { flex: 1, color: '#415B83', fontSize: 11, lineHeight: 17 },
  auxRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: 12,
    marginTop: -6,
    marginBottom: 18,
  },
  rememberBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 40,
  },
  checkbox: {
    width: 15,
    height: 15,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#9EADC3',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: brandColors.blue,
    borderColor: brandColors.blue,
  },
  rememberLabel: { color: '#5D687A', fontSize: 12 },
  forgotButton: { minHeight: 40, justifyContent: 'center' },
  forgotText: { color: brandColors.blue, fontSize: 12, fontWeight: '600' },
  submitButton: { width: '100%', borderRadius: 6 },
  securityFootprint: { marginTop: 20, alignItems: 'center' },
  securityBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    minHeight: 36,
  },
  securityBadgeText: { fontSize: 10, color: '#5D687A' },
  accessFooter: { alignItems: 'center', gap: 10, paddingTop: 16 },
  footerSecurity: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerText: { color: '#5D687A', fontSize: 10 },
  footerCopyright: { color: '#5D687A', fontSize: 9 },
});
