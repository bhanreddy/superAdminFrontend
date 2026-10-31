import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ScrollView,
} from 'react-native';
import { Fingerprint, ShieldCheck, X, KeyRound, Cpu, ShieldAlert } from 'lucide-react-native';
import { COMMAND_CENTER } from '../../constants/commandCenterTheme';
import { CommandCenterButton } from './CommandCenterButton';
import { useFingerprint } from '../../contexts/FingerprintContext';

interface MfaModalProps {
  visible: boolean;
  onClose: () => void;
}

export const CommandCenterMfaModal: React.FC<MfaModalProps> = ({
  visible,
  onClose,
}) => {
  const fingerprint = useFingerprint();

  const handleBiometricAction = async () => {
    if (fingerprint.supported && fingerprint.ready) {
      await fingerprint.unlock();
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <Fingerprint size={20} color={COMMAND_CENTER.cobaltPrimary} />
              </View>
              <View>
                <Text style={styles.title}>Hardware & Biometric Gateway</Text>
                <Text style={styles.subtitle}>Institutional MFA & Device Verification</Text>
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close security dialog"
              onPress={onClose}
              style={({ pressed }) => [styles.closeButton, pressed && { opacity: 0.6 }]}
            >
              <X size={20} color={COMMAND_CENTER.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.bodyScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.content}>
              <Text style={styles.leadText}>
                NexSyrus SuperAdmin enforces cryptographic identity validation with ephemeral token
                rotation and hardware biometric integration.
              </Text>

              {/* Status Indicator */}
              <View style={styles.specCard}>
                <View style={styles.specRow}>
                  <Cpu size={16} color={COMMAND_CENTER.cyanAccent} />
                  <Text style={styles.specLabel}>Terminal Architecture</Text>
                  <Text style={styles.specValue}>{Platform.OS.toUpperCase()}</Text>
                </View>

                <View style={styles.specRow}>
                  <KeyRound size={16} color={COMMAND_CENTER.cobaltPrimary} />
                  <Text style={styles.specLabel}>Session Token Protocol</Text>
                  <Text style={styles.specValue}>Rotating Bearer JWT</Text>
                </View>

                <View style={styles.specRow}>
                  <ShieldCheck size={16} color={COMMAND_CENTER.statusActive} />
                  <Text style={styles.specLabel}>Hardware Biometrics</Text>
                  <Text
                    style={[
                      styles.specValue,
                      { color: fingerprint.supported ? COMMAND_CENTER.statusActive : COMMAND_CENTER.textTertiary },
                    ]}
                  >
                    {fingerprint.supported ? 'Supported on Device' : 'Not Available (Web Terminal)'}
                  </Text>
                </View>
              </View>

              {fingerprint.supported && fingerprint.enabled ? (
                <View style={styles.actionSection}>
                  <Text style={styles.actionNote}>
                    Your terminal has local fingerprint protection active. You can authenticate using your
                    biometric sensor.
                  </Text>
                  <CommandCenterButton
                    title="Authenticate with Fingerprint"
                    leftIcon={<Fingerprint size={18} color="#FFFFFF" />}
                    onPress={handleBiometricAction}
                  />
                </View>
              ) : (
                <View style={styles.guidanceBox}>
                  <ShieldAlert size={18} color={COMMAND_CENTER.cyanAccent} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.guidanceTitle}>Master Credentials Required</Text>
                    <Text style={styles.guidanceText}>
                      Web and non-enrolled administrative terminals must provide their verified Email /
                      Employee ID and password for all session initializations. Biometric quick-unlock can
                      be configured inside workspace settings once signed in.
                    </Text>
                  </View>
                </View>
              )}

              <CommandCenterButton
                title="Acknowledge & Close"
                variant="secondary"
                onPress={onClose}
                style={{ marginTop: 8 }}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 16, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    filter: Platform.OS === 'web' ? 'backdrop-filter: blur(8px)' : undefined,
  } as any,
  dialog: {
    width: '100%',
    maxWidth: 500,
    backgroundColor: COMMAND_CENTER.surfaceCardElevated,
    borderRadius: COMMAND_CENTER.radii.xl,
    borderWidth: 1,
    borderColor: COMMAND_CENTER.glassBorder,
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        }
      : {
          elevation: 10,
        }),
  } as any,
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: COMMAND_CENTER.glassBorder,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COMMAND_CENTER.cobaltMuted,
    borderWidth: 1,
    borderColor: 'rgba(10, 132, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COMMAND_CENTER.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: COMMAND_CENTER.textTertiary,
    marginTop: 2,
    fontFamily: COMMAND_CENTER.fonts.mono,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodyScroll: {
    padding: 24,
    maxHeight: 520,
  },
  content: {
    gap: 16,
  },
  leadText: {
    fontSize: 13.5,
    lineHeight: 20,
    color: COMMAND_CENTER.textSecondary,
  },
  specCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: COMMAND_CENTER.radii.md,
    borderWidth: 1,
    borderColor: COMMAND_CENTER.glassBorder,
    padding: 14,
    gap: 12,
  },
  specRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  specLabel: {
    fontSize: 12.5,
    color: COMMAND_CENTER.textSecondary,
    flex: 1,
  },
  specValue: {
    fontSize: 12,
    fontFamily: COMMAND_CENTER.fonts.mono,
    fontWeight: '600',
    color: COMMAND_CENTER.textPrimary,
  },
  actionSection: {
    gap: 12,
    padding: 14,
    backgroundColor: COMMAND_CENTER.cobaltSubtle,
    borderRadius: COMMAND_CENTER.radii.md,
    borderWidth: 1,
    borderColor: 'rgba(10, 132, 255, 0.2)',
  },
  actionNote: {
    fontSize: 12.5,
    lineHeight: 18,
    color: COMMAND_CENTER.textSecondary,
  },
  guidanceBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: COMMAND_CENTER.radii.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  guidanceTitle: {
    fontSize: 12.5,
    fontWeight: '600',
    color: COMMAND_CENTER.textPrimary,
  },
  guidanceText: {
    fontSize: 12,
    lineHeight: 18,
    color: COMMAND_CENTER.textTertiary,
  },
});
