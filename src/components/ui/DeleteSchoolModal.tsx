import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Platform, Animated, Easing } from 'react-native';
import { useTheme, clayStyle } from '../../contexts/ThemeContext';
import { Button } from './Button';
import { Input } from './Input';
import { AlertTriangle, Trash2, X, ShieldAlert } from 'lucide-react-native';
import { School } from '../../types/school';

interface Props {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  school: School | null;
}

export function DeleteSchoolModal({ visible, onClose, onConfirm, school }: Props) {
  const { colors, isDark, clayShadows } = useTheme();
  const [step, setStep] = useState(1);
  const [verifyText, setVerifyText] = useState('');
  const [loading, setLoading] = useState(false);
  
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setStep(1);
      setVerifyText('');
      setLoading(false);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [visible, fadeAnim]);

  if (!visible || !school) return null;

  const handleNext = () => setStep(prev => prev + 1);
  const handleBack = () => setStep(prev => prev - 1);

  const renderContent = () => {
    switch (step) {
      case 1:
        return (
          <>
            <View style={[
              st.iconCircle,
              { backgroundColor: `${colors.error}15` },
              Platform.OS === 'web' ? {
                boxShadow: isDark
                  ? 'inset 3px 3px 8px rgba(0,0,0,0.2), inset -3px -3px 8px rgba(255,255,255,0.03)'
                  : 'inset 3px 3px 8px rgba(0,0,0,0.04), inset -3px -3px 8px rgba(255,255,255,0.6)',
              } as any : {},
            ]}>
              <AlertTriangle size={32} color={colors.error} strokeWidth={2} />
            </View>
            <Text style={[st.title, { color: colors.textPrimary }]}>Delete School</Text>
            <Text style={[st.desc, { color: colors.textSecondary }]}>
              You are about to delete <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{school.name}</Text>. 
              This action will completely wipe all multitenant data including students, staff, attendance, and finance records.
            </Text>
            <View style={st.actionRow}>
              <Button style={{ flex: 1 }} title="Cancel" variant="outline" onPress={onClose} />
              <Button style={{ flex: 1 }} title="Yes, Proceed" variant="danger" onPress={handleNext} />
            </View>
          </>
        );
      case 2:
        return (
          <>
            <View style={[
              st.iconCircle,
              { backgroundColor: `${colors.primary}15` },
              Platform.OS === 'web' ? {
                boxShadow: isDark
                  ? 'inset 3px 3px 8px rgba(0,0,0,0.2), inset -3px -3px 8px rgba(255,255,255,0.03)'
                  : 'inset 3px 3px 8px rgba(0,0,0,0.04), inset -3px -3px 8px rgba(255,255,255,0.6)',
              } as any : {},
            ]}>
              <ShieldAlert size={32} color={colors.primary} strokeWidth={2} />
            </View>
            <Text style={[st.title, { color: colors.textPrimary }]}>Verification Required</Text>
            <Text style={[st.desc, { color: colors.textSecondary }]}>
              To confirm your intent, please type the school name <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{school.name}</Text> exactly as shown.
            </Text>
            <Input
              value={verifyText}
              onChangeText={setVerifyText}
              placeholder="Type school name here"
              autoCapitalize="none"
              autoCorrect={false}
              containerStyle={{ marginBottom: 20, width: '100%' }}
            />
            <View style={st.actionRow}>
              <Button style={{ flex: 1 }} title="Back" variant="outline" onPress={handleBack} />
              <Button 
                style={{ flex: 1 }} 
                title="Verify" 
                variant="primary" 
                disabled={verifyText !== school.name}
                onPress={handleNext} 
              />
            </View>
          </>
        );
      case 3:
        return (
          <>
            <View style={[
              st.iconCircle,
              { backgroundColor: `${colors.error}20` },
              Platform.OS === 'web' ? {
                boxShadow: isDark
                  ? 'inset 3px 3px 8px rgba(0,0,0,0.2), inset -3px -3px 8px rgba(255,255,255,0.03)'
                  : 'inset 3px 3px 8px rgba(0,0,0,0.04), inset -3px -3px 8px rgba(255,255,255,0.6)',
              } as any : {},
            ]}>
              <Trash2 size={36} color={colors.error} strokeWidth={2.5} />
            </View>
            <Text style={[st.title, { color: colors.error, fontSize: 24, fontWeight: '800' }]}>FINAL WARNING</Text>
            <Text style={[st.desc, { color: colors.textSecondary, fontWeight: '600' }]}>
              This is your last chance to abort. Clicking delete below is an irreversible action. Data cannot be recovered.
            </Text>
            <View style={st.actionRow}>
              <Button style={{ flex: 1 }} title="ABORT" variant="outline" onPress={onClose} />
              <Button 
                style={{ flex: 1 }} 
                title="DELETE FOREVER" 
                variant="danger" 
                loading={loading}
                leftIcon={<Trash2 size={16} color="white" />}
                onPress={async () => {
                  setLoading(true);
                  try {
                    await onConfirm();
                  } finally {
                    setLoading(false);
                  }
                }} 
              />
            </View>
          </>
        );
    }
  };

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Animated.View style={[st.overlay, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={step === 3 ? undefined : onClose} />
        <View style={[
          st.modal,
          { backgroundColor: colors.surface },
          clayStyle(clayShadows.clayStrong),
        ]}>
          {step < 3 && (
            <Pressable
              style={({ pressed, hovered }: any) => [
                st.closeBtn,
                {
                  backgroundColor: hovered ? colors.hover : 'transparent',
                },
                pressed && { opacity: 0.6 },
              ]}
              onPress={onClose}
            >
              <X size={20} color={colors.textTertiary} />
            </Pressable>
          )}
          {renderContent()}
        </View>
      </Animated.View>
    </Modal>
  );
}

const st = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    ...Platform.select({
      web: { backdropFilter: 'blur(8px)' } as any,
    }),
  },
  modal: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 28,
    padding: 36,
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 18,
    right: 18,
    padding: 8,
    borderRadius: 10,
    ...(Platform.OS === 'web' ? { cursor: 'pointer', transition: 'all 0.15s ease' } : {}),
  } as any,
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  desc: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: 32,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
});
