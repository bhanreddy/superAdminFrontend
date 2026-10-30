import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Fingerprint, LockKeyhole, X } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFingerprint } from '../../contexts/FingerprintContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../hooks/useAuth';

export function FingerprintSettings() {
  const { colors } = useTheme();
  const fingerprint = useFingerprint();
  if (!fingerprint.supported) return null;
  return <View style={[styles.settings, { backgroundColor: colors.background, borderColor: colors.border }]}>
    <View style={styles.row}>
      <Fingerprint size={24} color={colors.primary} />
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>Fingerprint unlock</Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          Require your fingerprint when this app opens or returns from the background. Applies to this account on this device.
        </Text>
      </View>
      <Switch accessibilityLabel="Enable fingerprint unlock" value={fingerprint.enabled}
        disabled={fingerprint.busy || !fingerprint.ready}
        onValueChange={next => { void fingerprint.setEnabled(next); }}
        trackColor={{ true: colors.primary }} />
    </View>
    {fingerprint.busy && <ActivityIndicator color={colors.primary} />}
    {fingerprint.error && <Text accessibilityRole="alert" style={{ color: colors.error }}>{fingerprint.error}</Text>}
    {fingerprint.enabled && <Pressable accessibilityRole="button" accessibilityLabel="Lock app now"
      disabled={fingerprint.busy} onPress={fingerprint.lock} style={[styles.button, { backgroundColor: colors.primaryFill }]}>
      <LockKeyhole size={18} color="#FFFFFF" /><Text style={styles.buttonText}>Lock app now</Text>
    </Pressable>}
  </View>;
}

// Every signed-in native role can reach this control from the shared top bar.
export function FingerprintSecurityControl() {
  const { supported, locked, covered } = useFingerprint();
  const { colors, reducedMotion } = useTheme();
  const [visible, setVisible] = useState(false);
  useEffect(() => { if (locked || covered) setVisible(false); }, [locked, covered]);
  if (!supported) return null;
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel="Fingerprint security settings" onPress={() => setVisible(true)} style={styles.icon}>
      <Fingerprint size={20} color={colors.textSecondary} />
    </Pressable>
    <Modal visible={visible} transparent animationType={reducedMotion ? 'none' : 'fade'} onRequestClose={() => setVisible(false)}>
      <View style={[styles.backdrop, { backgroundColor: colors.overlay }]}>
        <View style={[styles.dialog, { backgroundColor: colors.background }]}>
          <View style={styles.row}>
            <Text style={[styles.title, { color: colors.textPrimary, flex: 1 }]}>App security</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close security settings" onPress={() => setVisible(false)} style={styles.icon}>
              <X size={22} color={colors.textSecondary} />
            </Pressable>
          </View>
          <FingerprintSettings />
        </View>
      </View>
    </Modal>
  </>;
}

export function FingerprintLockGate() {
  const fingerprint = useFingerprint();
  const { colors } = useTheme();
  const { role } = useAuth();
  const router = useRouter();
  return <Modal visible={fingerprint.locked || fingerprint.covered} animationType="none" onRequestClose={() => {}}>
    <SafeAreaView style={[styles.lockScreen, { backgroundColor: colors.background }]}>
      <View style={styles.lockContent}>
        <Fingerprint size={64} color={colors.primary} />
        <Text style={[styles.title, { color: colors.textPrimary }]}>NexSyrus is locked</Text>
        <Text style={[styles.description, { color: colors.textSecondary, textAlign: 'center' }]}>Unlock with your fingerprint to continue.</Text>
        {fingerprint.error && <Text accessibilityRole="alert" style={{ color: colors.error, textAlign: 'center' }}>{fingerprint.error}</Text>}
        {fingerprint.busy ? <ActivityIndicator color={colors.primary} /> : <>
          <Pressable accessibilityRole="button" accessibilityLabel="Unlock with fingerprint" disabled={!fingerprint.ready || fingerprint.covered}
            onPress={() => { void fingerprint.unlock(); }} style={[styles.button, { backgroundColor: colors.primaryFill, opacity: fingerprint.ready ? 1 : 0.5 }]}>
            <Fingerprint size={20} color="#FFFFFF" /><Text style={styles.buttonText}>Unlock with fingerprint</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Use account password" onPress={async () => {
            const signedOut = await fingerprint.usePassword();
            if (signedOut && (role === 'CA' || role === 'CA_LEAD')) router.replace('/(auth)/ca-login' as any);
          }} style={styles.button}>
            <Text style={[styles.label, { color: colors.primary }]}>Use account password</Text>
          </Pressable>
        </>}
      </View>
    </SafeAreaView>
  </Modal>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settings: { borderWidth: 1, borderRadius: 16, padding: 18, gap: 16 },
  label: { fontSize: 15, fontWeight: '700' },
  description: { fontSize: 13, lineHeight: 20 },
  title: { fontSize: 24, fontWeight: '700' },
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  dialog: { width: '100%', maxWidth: 480, borderRadius: 20, padding: 20, gap: 20 },
  lockScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  lockContent: { alignItems: 'center', gap: 22, width: '100%', maxWidth: 380 },
  button: { minHeight: 48, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
