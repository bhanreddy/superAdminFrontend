import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  Animated,
  TextInput,
  StatusBar,
  Dimensions,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, Mail, User, Lock, Eye, EyeOff,
  Shield, Check, AlertTriangle, X, Fingerprint, Zap,
  Sun, Moon
} from 'lucide-react-native';
import { superAdminApi } from '../../../src/services/apiService';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { pressableWebStyles } from '../../../src/utils/webPressable';
import { safePressHandler } from '../../../src/utils/safePressHandler';

const { width, height } = Dimensions.get('window');

// ─── Constants & Utils ────────────────────────────────────────────────────────
const C = {
  gold: '#D4AF37',
  goldGlow: 'rgba(212,175,55,0.15)',
  borderGold: 'rgba(212,175,55,0.3)',
  green: '#10B981',
  greenFaint: 'rgba(16,185,129,0.1)',
  red: '#EF4444',
  borderRed: 'rgba(239,68,68,0.3)',
  border: 'rgba(255,255,255,0.08)',
  layer2: '#121214',
  layer3: '#1A1A1D',
  textC: '#94A3B8',
  textD: '#64748B',
};

const getStrength = (pw: string) => {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[!@#$%^&*]/.test(pw)) s++;
  if (pw.length >= 12) s++;

  const map = [
    { label: 'Too Weak', color: '#EF4444' },
    { label: 'Weak', color: '#F59E0B' },
    { label: 'Fair', color: '#FBBF24' },
    { label: 'Good', color: '#10B981' },
    { label: 'Strong', color: '#059669' },
    { label: 'Elite', color: '#D4AF37' },
  ];
  return { score: s, ...map[s] };
};

// ─── Dot Grid Background ──────────────────────────────────────────────────────
const DotGrid = () => {
  const { colors, isDark } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 1400, useNativeDriver: true }).start();
  }, []);
  const cols = Math.ceil(width / 28);
  const rows = 13;
  const dots: { key: string; x: number; y: number }[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      dots.push({ key: `${r}-${c}`, x: c * 28, y: r * 28 });

  return (
    <Animated.View style={[dg.wrap, { opacity }]} pointerEvents="none">
      {dots.map(d => (
        <View key={d.key} style={[dg.dot, { left: d.x, top: d.y, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]} />
      ))}
    </Animated.View>
  );
};

const dg = StyleSheet.create({
  wrap: { position: 'absolute', top: 0, left: 0, right: 0, height: 360, overflow: 'hidden' },
  dot: { position: 'absolute', width: 2, height: 2, borderRadius: 1 },
});

const StrengthMeter = ({ password }: { password: string }) => {
  const { colors, isDark } = useTheme();
  const { score, label, color } = getStrength(password);
  if (!password) return null;
  return (
    <View style={sm.wrap}>
      <View style={sm.bars}>
        {[1, 2, 3, 4, 5].map(i => (
          <View key={i} style={[sm.track, { backgroundColor: isDark ? C.layer3 : colors.border }]}>
            <View style={[sm.fill, { width: i <= score ? '100%' : '0%', backgroundColor: color }]} />
          </View>
        ))}
      </View>
      <View style={sm.meta}>
        <Text style={[sm.label, { color }]}>{label}</Text>
        <Text style={[sm.count, { color: colors.textSecondary }]}>{score}/5</Text>
      </View>
    </View>
  );
};

const sm = StyleSheet.create({
  wrap: { marginVertical: 12 },
  bars: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  track: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  count: { fontSize: 11, fontWeight: '600' },
});

// ─── Floating Label Input ─────────────────────────────────────────────────────
const FloatInput = ({
  label, placeholder, value, onChange, icon: Icon,
  keyboard, capitalize, secure, error, success, delay = 0,
}: {
  label: string; placeholder: string; value: string;
  onChange: (t: string) => void; icon: any;
  keyboard?: any; capitalize?: any;
  secure?: boolean; error?: boolean; success?: boolean; delay?: number;
}) => {
  const { colors, isDark } = useTheme();
  const [focused, setFocused] = useState(false);
  const [shown, setShown] = useState(false);
  const floatAnim = useRef(new Animated.Value(value ? 1 : 0)).current;
  const borderAnim = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideIn = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 420, delay, useNativeDriver: true }),
      Animated.spring(slideIn, { toValue: 0, delay, tension: 75, friction: 13, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    Animated.timing(floatAnim, { toValue: focused || value.length > 0 ? 1 : 0, duration: 180, useNativeDriver: false }).start();
    Animated.timing(borderAnim, { toValue: focused ? 1 : 0, duration: 200, useNativeDriver: false }).start();
  }, [focused, value]);

  const labelTop = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [18, -9] });
  const labelSize = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [15, 11] });
  const labelColor = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [isDark ? C.textD : colors.textSecondary, focused ? (isDark ? C.gold : colors.primary) : colors.textSecondary] });
  const borderColor = error ? C.borderRed
    : success ? (isDark ? 'rgba(16,185,129,0.4)' : colors.success)
      : borderAnim.interpolate({ inputRange: [0, 1], outputRange: [isDark ? C.border : '#CBD5E1', isDark ? C.borderGold : colors.primary] });
  const iconColor = error ? C.red : success ? C.green : focused ? (isDark ? C.gold : colors.primary) : (isDark ? C.textD : colors.textSecondary);

  return (
    <Animated.View style={{ opacity: fadeIn, transform: [{ translateY: slideIn }] }}>
      <Animated.View style={[fi.shell, { borderColor, backgroundColor: colors.surface }]}>
        <Animated.Text style={[fi.floatLabel, { top: labelTop, fontSize: labelSize, color: labelColor, backgroundColor: colors.surface, paddingHorizontal: 4 }]}>
          {label}
        </Animated.Text>
        <View style={fi.iconLeft}>
          <Icon size={16} color={iconColor} strokeWidth={1.8} />
        </View>
        <TextInput
          style={[fi.input, { color: colors.textPrimary }]}
          value={value}
          onChangeText={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          keyboardType={keyboard ?? 'default'}
          autoCapitalize={capitalize ?? 'none'}
          secureTextEntry={secure && !shown}
          autoCorrect={false}
          placeholder={focused ? placeholder : ''}
          placeholderTextColor={isDark ? C.textD : '#94A3B8'}
          selectionColor={isDark ? C.gold : colors.primary}
        />
        {secure ? (
          <Pressable
            style={({ pressed }) => [fi.iconRight, ...pressableWebStyles(pressed, { pressedOpacity: 0.85 })]}
            onPress={() => setShown(!shown)}
          >
            {shown ? <EyeOff size={15} color={isDark ? C.textC : colors.textSecondary} strokeWidth={1.8} /> : <Eye size={15} color={isDark ? C.textC : colors.textSecondary} strokeWidth={1.8} />}
          </Pressable>
        ) : success ? (
          <View style={fi.iconRight}>
            <View style={[fi.checkBadge, { backgroundColor: isDark ? C.greenFaint : colors.success + '1A', borderColor: isDark ? 'rgba(16,185,129,0.3)' : colors.success }]}>
              <Check size={10} color={C.green} strokeWidth={3} />
            </View>
          </View>
        ) : null}
        {focused && (
          <LinearGradient
            colors={error ? [C.red, 'transparent'] : [isDark ? C.gold : colors.primary, 'transparent']}
            style={fi.glowLine}
            start={{ x: 0.5, y: 0 }} end={{ x: 1, y: 0 }}
          />
        )}
      </Animated.View>
    </Animated.View>
  );
};

const fi = StyleSheet.create({
  shell: { height: 56, borderRadius: 16, borderWidth: 1, marginBottom: 20, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  floatLabel: { position: 'absolute', left: 44, fontWeight: '600' },
  iconLeft: { marginRight: 12 },
  iconRight: { marginLeft: 8 },
  input: { flex: 1, fontSize: 15, fontWeight: '600', height: '100%', paddingTop: 4 },
  glowLine: { position: 'absolute', bottom: -1, left: 16, right: 16, height: 1.5, borderRadius: 1 },
  checkBadge: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});

// ─── Requirement Pill ─────────────────────────────────────────────────────────
const ReqPill = ({ ok, label }: { ok: boolean; label: string }) => {
  const { colors, isDark } = useTheme();
  return (
    <View style={[rp.pill, ok ? rp.ok : [rp.off, { backgroundColor: colors.surface, borderColor: colors.border }]]}>
      {ok ? <Check size={9} color={C.green} strokeWidth={3} /> : <View style={[rp.dash, { backgroundColor: isDark ? C.textD : colors.textSecondary }]} />}
      <Text style={[rp.text, { color: ok ? C.green : (isDark ? C.textD : colors.textSecondary) }]}>{label}</Text>
    </View>
  );
};
const rp = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  ok: { backgroundColor: C.greenFaint, borderColor: 'rgba(16,185,129,0.25)' },
  off: { },
  text: { fontSize: 11, fontWeight: '600' },
  dash: { width: 6, height: 1.5, borderRadius: 1, backgroundColor: C.textD },
});

// ─── Confirmation Sheet ──────────────────────────────────────────────────────────
const ConfirmSheet = ({ visible, onHide, onConfirm, data, loading, error }: any) => {
  const { colors, isDark } = useTheme();
  const slide = useRef(new Animated.Value(height)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const [show, setShow] = useState(visible);

  useEffect(() => {
    if (visible) {
      setShow(true);
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(slide, { toValue: 0, tension: 50, friction: 12, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fade, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(slide, { toValue: height, duration: 250, useNativeDriver: true }),
      ]).start(() => setShow(false));
    }
  }, [visible]);

  if (!show) return null;

  return (
    <Modal transparent visible={show} animationType="none">
      <View style={cs.root}>
        <Animated.View style={[cs.backdrop, { opacity: fade, backgroundColor: isDark ? 'black' : 'rgba(0,0,0,0.5)' }]}>
          <Pressable style={({ pressed }) => [StyleSheet.absoluteFill, ...pressableWebStyles(pressed, { pressedOpacity: 1 })]} onPress={onHide} />
        </Animated.View>
        <Animated.View style={[cs.sheet, { transform: [{ translateY: slide }], backgroundColor: isDark ? C.layer2 : colors.surface, borderTopColor: isDark ? C.borderGold : colors.border }]}>
          <View style={[cs.handle, { backgroundColor: isDark ? C.layer3 : colors.border }]} />
          <View style={cs.header}>
            <View style={[cs.iconBox, { backgroundColor: isDark ? 'rgba(212,175,55,0.1)' : colors.primary + '1A' }]}>
              <Fingerprint size={28} color={isDark ? C.gold : colors.primary} />
            </View>
            <View style={cs.titleRow}>
              <Text style={[cs.title, { color: colors.textPrimary }]}>Confirm New Admin</Text>
              <Text style={[cs.sub, { color: colors.textSecondary }]}>Please verify the details before proceeding</Text>
            </View>
          </View>

          <View style={[cs.body, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <View style={cs.item}>
              <View style={[cs.miniIcon, { backgroundColor: isDark ? C.layer3 : colors.background }]}>
                <User size={14} color={colors.textSecondary} />
              </View>
              <View style={cs.itemText}>
                <Text style={[cs.label, { color: colors.textSecondary }]}>FULL NAME</Text>
                <Text style={[cs.value, { color: colors.textPrimary }]}>{data.fullName}</Text>
              </View>
            </View>
            <View style={[cs.line, { backgroundColor: colors.border }]} />
            <View style={cs.item}>
              <View style={[cs.miniIcon, { backgroundColor: isDark ? C.layer3 : colors.background }]}>
                <Mail size={14} color={colors.textSecondary} />
              </View>
              <View style={cs.itemText}>
                <Text style={[cs.label, { color: colors.textSecondary }]}>EMAIL ADDRESS</Text>
                <Text style={[cs.value, { color: colors.textPrimary }]}>{data.email}</Text>
              </View>
            </View>
          </View>

          {error ? (
            <View style={cs.modalErrBox}>
              <AlertTriangle size={15} color={C.red} />
              <Text style={cs.modalErrText}>{error}</Text>
            </View>
          ) : null}

          <View style={cs.actions}>
            <Pressable
              style={({ pressed }) => [
                cs.btnSub,
                { backgroundColor: isDark ? C.layer3 : colors.background, borderColor: colors.border },
                ...pressableWebStyles(pressed, { pressedOpacity: 0.85 }),
              ]}
              onPress={onHide}
            >
              <Text style={[cs.btnSubTxt, { color: colors.textSecondary }]}>Review Details</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                cs.btnMain,
                { backgroundColor: isDark ? C.gold : colors.primary },
                ...pressableWebStyles(pressed, { disabled: loading, pressedOpacity: 0.9 }),
              ]}
              onPress={safePressHandler(onConfirm)}
              disabled={loading}
            >
              <LinearGradient colors={loading ? [C.textD, C.textD] : [isDark ? C.gold : colors.primary, isDark ? '#B8860B' : colors.primary]} style={cs.grad}>
                <Text style={cs.btnMainTxt}>{loading ? 'Deploying...' : 'Confirm & Create'}</Text>
                {!loading && <Zap size={16} color="black" />}
              </LinearGradient>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const cs = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    borderTopWidth: 1,
  },
  handle: { width: 40, height: 5, borderRadius: 3, alignSelf: 'center', marginTop: 12, marginBottom: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
  iconBox: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flex: 1 },
  title: { fontSize: 20, fontWeight: '700', letterSpacing: -0.5 },
  sub: { fontSize: 13, color: C.textC, lineHeight: 18 },
  body: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 24 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  miniIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  itemText: { flex: 1 },
  label: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginBottom: 2 },
  value: { fontSize: 14, fontWeight: '600' },
  line: { height: 1 },
  modalErrBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
    marginBottom: 16,
  },
  modalErrText: {
    color: C.red,
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  actions: { flexDirection: 'row', gap: 12 },
  btnSub: { flex: 1, height: 54, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  btnSubTxt: { fontSize: 15, fontWeight: '600' },
  btnMain: { flex: 2, height: 54, borderRadius: 16, overflow: 'hidden' },
  grad: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  btnMainTxt: { fontSize: 15, fontWeight: '700', color: 'black' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function AddAdminScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(formFade, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  const passValid = password.length >= 8 && getStrength(password).score >= 3;
  const match = password && password === confirmPassword;
  const canContinue = fullName.trim().length >= 2 && email.includes('@') && passValid && match;

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    try {
      await superAdminApi.createSuperAdmin({
        full_name: fullName.trim(),
        email: email.trim(),
        password,
      });
      setShowConfirm(false);
      router.back();
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Failed to create admin';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <LinearGradient
        colors={isDark ? ['#0A0A0B', '#121214'] : [colors.background, colors.surface]}
        style={[StyleSheet.absoluteFillObject, Platform.OS === 'web' ? { pointerEvents: 'none' } : null]}
      />
      <DotGrid />

      <View style={s.ambientGlow} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.flex}>
        <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

          {/* Header */}
          <Animated.View style={[s.nav, { opacity: formFade }]}>
            <Pressable
              style={({ pressed }) => [
                s.backBtn,
                { backgroundColor: colors.surface, borderColor: colors.border },
                ...pressableWebStyles(pressed, { pressedOpacity: 0.85 }),
              ]}
              onPress={() => router.back()}
            >
              <ArrowLeft size={20} color={colors.textPrimary} strokeWidth={2.5} />
            </Pressable>

            <View style={s.navTitleBox}>
              <Text style={[s.navTitle, { color: colors.textPrimary }]}>Access Control</Text>
              <View style={s.liveRow}>
                <View style={s.dot} /><Text style={[s.navSub, { color: colors.textSecondary }]}>System Provisioning</Text>
              </View>
            </View>
            <View style={[s.badge, { backgroundColor: isDark ? C.layer2 : colors.surface, borderColor: isDark ? C.border : colors.border }]}>
              <Shield size={12} color={isDark ? C.gold : colors.primary} />
            </View>
          </Animated.View>

          {/* Form Area */}
          <Animated.View style={[s.formRoot, { opacity: formFade, transform: [{ translateY: formFade.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]}>
            <View style={s.sectionHeader}>
              <View style={s.sectionLine} />
              <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>ADMINISTRATOR IDENTITY</Text>
              <View style={s.sectionLine} />
            </View>

            <FloatInput label="Full Identity Name" icon={User} value={fullName} onChange={setFullName} placeholder="e.g. Alexander Pierce" capitalize="words" delay={100} />
            <FloatInput label="Secure Email Portal" icon={Mail} value={email} onChange={setEmail} placeholder="admin@nexusyrus.com" keyboard="email-address" delay={200} />

            <View style={s.sectionHeader}>
              <View style={s.sectionLine} />
              <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>SECURITY CREDENTIALS</Text>
              <View style={s.sectionLine} />
            </View>

            <FloatInput label="System Access Key" icon={Lock} value={password} onChange={setPassword} placeholder="Min. 8 characters" secure delay={300} />
            <StrengthMeter password={password} />

            <View style={s.reqs}>
              <ReqPill ok={password.length >= 8} label="8+ chars" />
              <ReqPill ok={/[A-Z]/.test(password)} label="Uppercase" />
              <ReqPill ok={/[0-9]/.test(password)} label="Digit" />
              <ReqPill ok={/[!@#$%^&*]/.test(password)} label="Symbol" />
            </View>

            <FloatInput label="Confirm Access Key" icon={Shield} value={confirmPassword} onChange={setConfirmPassword} placeholder="Must match exactly" secure success={Boolean(match && password.length > 0)} error={Boolean(confirmPassword.length > 0 && !match)} delay={400} />

            {error && (
              <Animated.View style={s.errBox}>
                <AlertTriangle size={16} color={C.red} />
                <Text style={s.errText}>{error}</Text>
              </Animated.View>
            )}
          </Animated.View>

          <Text style={[s.footNote, { color: colors.textSecondary }]}>
            This action is audited and irreversible without direct DB intervention.
          </Text>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Action */}
      <View style={[s.footer, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <Pressable
          style={({ pressed }) => [
            s.submitBtn,
            !canContinue && s.btnDisabled,
            { backgroundColor: isDark ? C.gold : colors.primary },
            ...pressableWebStyles(pressed, { disabled: !canContinue, pressedOpacity: 0.9 }),
          ]}
          disabled={!canContinue}
          onPress={() => {
            setError(null);
            setShowConfirm(true);
          }}
        >
          <Text style={[s.submitText, { color: isDark ? 'black' : 'white' }]}>Initialize Provisioning</Text>
          <Zap size={18} color={isDark ? 'black' : 'white'} />
        </Pressable>
      </View>

      <ConfirmSheet
        visible={showConfirm}
        onHide={() => {
          setShowConfirm(false);
          setError(null);
        }}
        onConfirm={handleCreate}
        data={{ fullName, email }}
        loading={loading}
        error={error}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 24, paddingTop: Platform.OS === 'ios' ? 60 : 40 },
  nav: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 12 },
  backBtn: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  themeToggle: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  navTitleBox: { flex: 1 },
  navTitle: { fontSize: 20, fontWeight: '700', letterSpacing: -0.5 },
  navSub: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.green },
  badge: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  formRoot: { marginTop: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  sectionTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginHorizontal: 12 },
  sectionLine: { flex: 1, height: 1, backgroundColor: 'rgba(212,175,55,0.1)' },
  reqs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 16 },
  errBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', marginTop: 16 },
  errText: { color: C.red, fontSize: 13, fontWeight: '500' },
  footNote: { fontSize: 12, textAlign: 'center', opacity: 0.6, marginTop: 32, lineHeight: 18 },
  footer: { padding: 20, paddingBottom: 110, borderTopWidth: 1 },
  submitBtn: { height: 56, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  btnDisabled: { opacity: 0.5 },
  submitText: { fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  ambientGlow: { position: 'absolute', top: -100, right: -100, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(212,175,55,0.05)' },
});