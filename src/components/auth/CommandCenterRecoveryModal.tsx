import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  ScrollView,
} from 'react-native';
import { ShieldAlert, CheckCircle2, X, Lock, ExternalLink } from 'lucide-react-native';
import { COMMAND_CENTER } from '../../constants/commandCenterTheme';
import { CommandCenterInput } from './CommandCenterInput';
import { CommandCenterButton } from './CommandCenterButton';

interface RecoveryModalProps {
  visible: boolean;
  onClose: () => void;
  initialIdentifier?: string;
  clusterLabel?: string;
}

export const CommandCenterRecoveryModal: React.FC<RecoveryModalProps> = ({
  visible,
  onClose,
  initialIdentifier = '',
  clusterLabel = 'Primary Cluster',
}) => {
  const [recoveryIdentifier, setRecoveryIdentifier] = useState(initialIdentifier);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!recoveryIdentifier.trim()) {
      setError('Please provide an Email or Employee ID.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    // Simulate enterprise security dispatch without exposing backend enumeration
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
    }, 700);
  };

  const handleReset = () => {
    setSubmitted(false);
    setError('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleReset}
    >
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          {/* Top Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <Lock size={18} color={COMMAND_CENTER.cobaltPrimary} />
              </View>
              <View>
                <Text style={styles.title}>Credential Recovery Protocol</Text>
                <Text style={styles.subtitle}>NexSyrus Zero-Trust Security Standard</Text>
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close recovery dialog"
              onPress={handleReset}
              style={({ pressed }) => [styles.closeButton, pressed && { opacity: 0.6 }]}
            >
              <X size={20} color={COMMAND_CENTER.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.bodyScroll} showsVerticalScrollIndicator={false}>
            {submitted ? (
              <View style={styles.submittedBox}>
                <View style={styles.successIconBox}>
                  <CheckCircle2 size={36} color={COMMAND_CENTER.statusActive} />
                </View>
                <Text style={styles.submittedTitle}>Recovery Dispatch Dispatched</Text>
                <Text style={styles.submittedMessage}>
                  If the identifier is registered and authorized within{' '}
                  <Text style={{ color: COMMAND_CENTER.textPrimary, fontWeight: '600' }}>
                    {clusterLabel}
                  </Text>
                  , a credential verification ticket has been queued with the cluster root
                  security officer.
                </Text>

                <View style={styles.securityNoticeBox}>
                  <ShieldAlert size={16} color={COMMAND_CENTER.textTertiary} />
                  <Text style={styles.securityNoticeText}>
                    In compliance with enterprise security policy, this gateway does not disclose
                    whether an account exists. Contact your institutional operations lead for immediate
                    clearance.
                  </Text>
                </View>

                <CommandCenterButton
                  title="Return to Authentication"
                  onPress={handleReset}
                  style={{ marginTop: 20 }}
                />
              </View>
            ) : (
              <View style={styles.formContent}>
                <Text style={styles.description}>
                  To prevent unauthorized account compromise across operational clusters,
                  administrative credentials require institutional verification before reset.
                </Text>

                <CommandCenterInput
                  label="Registered Email or Employee ID"
                  placeholder="e.g. admin@nexsyrus.com or SE-011"
                  value={recoveryIdentifier}
                  onChangeText={(t) => {
                    setRecoveryIdentifier(t);
                    if (error) setError('');
                  }}
                  error={error}
                  required
                  detectType
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <View style={styles.clusterTag}>
                  <Text style={styles.clusterTagLabel}>Target Cluster:</Text>
                  <Text style={styles.clusterTagValue}>{clusterLabel}</Text>
                </View>

                <View style={styles.actionRow}>
                  <CommandCenterButton
                    title="Dispatch Recovery Request"
                    onPress={handleSubmit}
                    loading={isSubmitting}
                  />
                </View>

                <View style={styles.noteBox}>
                  <Text style={styles.noteTitle}>Enterprise Account Policy</Text>
                  <Text style={styles.noteText}>
                    For immediate emergency credential reset, please reach out directly to your SuperAdmin
                    System Lead or security supervisor.
                  </Text>
                </View>
              </View>
            )}
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
  formContent: {
    gap: 16,
  },
  description: {
    fontSize: 13.5,
    lineHeight: 20,
    color: COMMAND_CENTER.textSecondary,
    marginBottom: 4,
  },
  clusterTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: COMMAND_CENTER.radii.sm,
    borderWidth: 1,
    borderColor: COMMAND_CENTER.glassBorder,
  },
  clusterTagLabel: {
    fontSize: 12,
    color: COMMAND_CENTER.textTertiary,
  },
  clusterTagValue: {
    fontSize: 12,
    fontFamily: COMMAND_CENTER.fonts.mono,
    color: COMMAND_CENTER.cyanAccent,
    fontWeight: '600',
  },
  actionRow: {
    marginTop: 8,
  },
  noteBox: {
    marginTop: 8,
    padding: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: COMMAND_CENTER.radii.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 4,
  },
  noteTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COMMAND_CENTER.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  noteText: {
    fontSize: 12,
    lineHeight: 18,
    color: COMMAND_CENTER.textTertiary,
  },
  submittedBox: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 14,
  },
  successIconBox: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(48, 209, 88, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(48, 209, 88, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submittedTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COMMAND_CENTER.textPrimary,
  },
  submittedMessage: {
    fontSize: 13.5,
    lineHeight: 21,
    color: COMMAND_CENTER.textSecondary,
    textAlign: 'center',
  },
  securityNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 12,
    borderRadius: COMMAND_CENTER.radii.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.07)',
  },
  securityNoticeText: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 17,
    color: COMMAND_CENTER.textTertiary,
  },
});
