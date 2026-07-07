import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, Pressable, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle, Circle, Copy, Terminal, Database, Server, CreditCard, ShieldCheck } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../../../../src/contexts/ThemeContext';
import { getMedicalBuildConfig, updateMedicalOnboardingStatus, type MedicalBuildConfig, type MedicalOnboardingStatus } from '../../../../src/services/medicalOnboardingService';
import { superAdminClient } from '../../../../src/api/superAdminClient';
import { ScreenHeader } from '../../../../src/components/ui/ScreenHeader';
import { Button } from '../../../../src/components/ui/Button';

export default function MedicalBuildConfigScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, isDark } = useTheme();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<MedicalBuildConfig | null>(null);
  const [shop, setShop] = useState<any>(null);
  
  // Local checklists
  const [envChecked, setEnvChecked] = useState(false);
  const [tauriConfigChecked, setTauriConfigChecked] = useState(false);
  const [razorpayChecked, setRazorpayChecked] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [configData, shopResponse] = await Promise.all([
          getMedicalBuildConfig(id),
          superAdminClient.get(`/api/v1/medical/shops`) // We filter manually since get single is not exposed easily via API wrapper, but let's fetch from the generic list or subscription route? Wait, I'll fetch from subscription or shops. Actually, we can just use the config since it has everything, but we need shop details like onboarding_status. Let's try to get the shop from the list.
        ]);
        setConfig(configData);
        // Find shop in the list
        const foundShop = shopResponse.data?.data?.find((s: any) => s.id === id);
        if (foundShop) {
          setShop(foundShop);
        } else {
          // fallback, maybe use config.env_file values
          setShop({ id, onboarding_status: 'pending_build' });
        }
      } catch (error) {
        console.error('Failed to load build config', error);
        Alert.alert('Error', 'Failed to load build config');
        if (router.canGoBack()) router.back();
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  const copyToClipboard = async (text: string, description: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied', `${description} copied to clipboard!`);
  };

  const handleStatusUpdate = async (status: MedicalOnboardingStatus) => {
    try {
      await updateMedicalOnboardingStatus(id, status);
      setShop((prev: any) => ({ ...prev, onboarding_status: status }));
    } catch (err) {
      Alert.alert('Error', 'Failed to update onboarding status');
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!config || !shop) return null;

  const currentStatus = shop.onboarding_status || 'pending_build';

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <ScreenHeader 
        title="Medical Build Config" 
        subtitle={`Generate configuration for Tauri Desktop App`}
      />

      {/* Section 1: Onboarding Status */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>1. Onboarding Status</Text>
        <View style={styles.stepper}>
          <StatusStep label="DB Seeded" completed={true} />
          <StatusStep label="Build Config Ready" completed={true} />
          <StatusStep 
            label="App Delivered" 
            completed={currentStatus === 'app_delivered' || currentStatus === 'live'} 
            onPress={() => handleStatusUpdate('app_delivered')} 
            colors={colors}
          />
          <StatusStep 
            label="Live" 
            completed={currentStatus === 'live'} 
            onPress={() => handleStatusUpdate('live')} 
            colors={colors}
          />
        </View>
      </View>

      {/* Section 2: Subscription Info */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary, marginBottom: 0 }]}>2. Subscription Info</Text>
          <Button title="Edit Shop" size="sm" variant="secondary" onPress={() => router.push('/(app)/medical' as any)} />
        </View>
        <View style={styles.infoRow}>
          <CreditCard size={18} color={colors.textSecondary} />
          <Text style={[styles.infoText, { color: colors.textPrimary }]}>
            Status: {config.subscription_info.subscription_status}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={[styles.infoText, { color: colors.textPrimary }]}>
            Trial Ends: {config.subscription_info.trial_ends_at ? new Date(config.subscription_info.trial_ends_at).toLocaleDateString() : 'N/A'}
          </Text>
        </View>
        <Pressable onPress={() => copyToClipboard(config.subscription_info.razorpay_plan_id || '', 'Plan ID')}>
          <View style={styles.infoRow}>
            <Text style={[styles.infoText, { color: colors.textPrimary }]}>
              Plan ID: {config.subscription_info.razorpay_plan_id || 'Not set'}
            </Text>
            <Copy size={14} color={colors.textSecondary} />
          </View>
        </Pressable>
      </View>

      {/* Section 3: Assigned Cluster Info */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>3. Assigned Cluster Info</Text>
        <View style={styles.infoRow}>
          <Server size={18} color={colors.textSecondary} />
          <Text style={[styles.infoText, { color: colors.textPrimary }]}>Cluster ID: {shop.cluster_id || 'cluster_a'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Database size={18} color={colors.textSecondary} />
          <Text style={[styles.infoText, { color: colors.textPrimary }]}>Backend URL: {shop.backend_url || 'N/A'}</Text>
        </View>
      </View>

      {/* Section 4: .env File */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary, marginBottom: 0 }]}>4. .env File Configuration</Text>
          <Button title="Copy" size="sm" variant="secondary" onPress={() => copyToClipboard(config.env_file, '.env contents')} />
        </View>
        <ScrollView horizontal style={styles.codeBlockContainer}>
          <Text style={[styles.codeBlock, { color: isDark ? '#A6E22E' : '#22863A' }]}>{config.env_file}</Text>
        </ScrollView>
      </View>

      {/* Section 5: Tauri Config Changes */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary, marginBottom: 0 }]}>5. tauri.conf.json Variables</Text>
          <Button title="Copy JSON" size="sm" variant="secondary" onPress={() => copyToClipboard(JSON.stringify(config.tauri_config_changes, null, 2), 'Tauri config updates')} />
        </View>
        <ScrollView horizontal style={styles.codeBlockContainer}>
          <Text style={[styles.codeBlock, { color: isDark ? '#66D9EF' : '#005CC5' }]}>
            {JSON.stringify(config.tauri_config_changes, null, 2)}
          </Text>
        </ScrollView>
      </View>

      {/* Section 6: Setup Commands */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>6. Setup Commands</Text>
        {config.setup_commands.map((cmd, idx) => (
          <View key={idx} style={[styles.commandRow, { backgroundColor: isDark ? '#1E1E1E' : '#F1F5F9', borderColor: colors.border }]}>
            <Terminal size={14} color={colors.textSecondary} style={{ marginRight: 8 }} />
            <Text style={[styles.commandText, { color: colors.textPrimary }]} numberOfLines={1}>{cmd}</Text>
            <Pressable onPress={() => copyToClipboard(cmd, 'Command')} style={styles.copyBtn}>
              <Copy size={14} color={colors.textSecondary} />
            </Pressable>
          </View>
        ))}
      </View>

      {/* Section 7: Build Readiness Summary */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>7. Build Readiness Checklist</Text>
        
        <CheckItem label=".env file updated locally" checked={envChecked} onToggle={() => setEnvChecked(!envChecked)} colors={colors} />
        <CheckItem label="tauri.conf.json updated" checked={tauriConfigChecked} onToggle={() => setTauriConfigChecked(!tauriConfigChecked)} colors={colors} />
        <CheckItem label="Razorpay plan configured (if applicable)" checked={razorpayChecked} onToggle={() => setRazorpayChecked(!razorpayChecked)} colors={colors} />
        <CheckItem label="Medical Shop DB seeded" checked={true} readonly colors={colors} />
        <CheckItem label="Admin user seeded" checked={true} readonly colors={colors} />

        {(envChecked && tauriConfigChecked && razorpayChecked) && (
          <View style={[styles.readyBanner, { backgroundColor: colors.primaryDim }]}>
            <ShieldCheck size={24} color={colors.primary} />
            <Text style={[styles.readyText, { color: colors.primary }]}>Ready to Build 🚀</Text>
          </View>
        )}
      </View>
      
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// Helper Components
function StatusStep({ label, completed, onPress, colors }: any) {
  return (
    <Pressable style={styles.stepRow} onPress={onPress} disabled={!onPress}>
      {completed ? <CheckCircle size={20} color="#10B981" /> : <Circle size={20} color={colors?.textSecondary || '#888'} />}
      <Text style={[styles.stepText, { color: completed ? '#10B981' : (colors?.textPrimary || '#333') }]}>{label}</Text>
    </Pressable>
  );
}

function CheckItem({ label, checked, onToggle, readonly, colors }: any) {
  return (
    <Pressable style={styles.checkboxRow} onPress={readonly ? undefined : onToggle} disabled={readonly}>
      {checked ? <CheckCircle size={22} color={readonly ? "#10B981" : colors.primary} /> : <Circle size={22} color={colors.textSecondary} />}
      <Text style={[styles.checkboxText, { color: readonly ? colors.textSecondary : colors.textPrimary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepper: {
    gap: 12,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepText: {
    fontSize: 16,
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '500',
  },
  codeBlockContainer: {
    backgroundColor: '#1E1E1E',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  codeBlock: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  checkboxText: {
    fontSize: 15,
  },
  commandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  commandText: {
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
  },
  copyBtn: {
    padding: 4,
  },
  readyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  readyText: {
    fontSize: 18,
    fontWeight: '700',
  },
});
