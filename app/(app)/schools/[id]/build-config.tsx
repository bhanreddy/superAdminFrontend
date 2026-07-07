import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, Pressable, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle, Circle, Copy, Terminal, Database, Server, Smartphone, ExternalLink, ShieldCheck } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../../../../src/contexts/ThemeContext';
import { getBuildConfig, updateOnboardingStatus, type BuildConfig, type OnboardingStatus } from '../../../../src/services/schoolOnboardingService';
import { superAdminApi } from '../../../../src/services/apiService';
import { ScreenHeader } from '../../../../src/components/ui/ScreenHeader';
import { Button } from '../../../../src/components/ui/Button';

type ConfigSection = 'env' | 'appjson' | 'easjson';

const isConfigSection = (value: string | undefined): value is ConfigSection =>
  value === 'env' || value === 'appjson' || value === 'easjson';

export default function BuildConfigScreen() {
  const { id, section } = useLocalSearchParams<{ id: string; section?: string }>();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const sectionOffsets = useRef<Partial<Record<ConfigSection, number>>>({});

  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<BuildConfig | null>(null);
  const [school, setSchool] = useState<any>(null);
  
  // Local checklists
  const [firebaseChecked, setFirebaseChecked] = useState(false);
  const [envChecked, setEnvChecked] = useState(false);
  const [appJsonChecked, setAppJsonChecked] = useState(false);
  const [easJsonChecked, setEasJsonChecked] = useState(false);
  const [googleServicesChecked, setGoogleServicesChecked] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [configData, schoolData] = await Promise.all([
          getBuildConfig(id),
          superAdminApi.getSchool(parseInt(id, 10))
        ]);
        setConfig(configData);
        setSchool(schoolData);
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

  const targetSection = isConfigSection(section) ? section : undefined;

  const scrollToSection = (sectionKey: ConfigSection) => {
    const y = sectionOffsets.current[sectionKey];
    if (typeof y !== 'number') return;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: Math.max(y - 12, 0), animated: true });
    });
  };

  useEffect(() => {
    if (!loading && targetSection) {
      const timer = setTimeout(() => scrollToSection(targetSection), 120);
      return () => clearTimeout(timer);
    }
  }, [loading, targetSection]);

  const handleSectionLayout = (sectionKey: ConfigSection, y: number) => {
    sectionOffsets.current[sectionKey] = y;
    if (!loading && targetSection === sectionKey) {
      scrollToSection(sectionKey);
    }
  };

  const copyToClipboard = async (text: string, description: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied', `${description} copied to clipboard!`);
  };

  const handleStatusUpdate = async (status: OnboardingStatus) => {
    try {
      await updateOnboardingStatus(id, status);
      setSchool({ ...school, onboarding_status: status });
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

  if (!config || !school) return null;

  const currentStatus = school.onboarding_status || 'pending_build';

  return (
    <ScrollView ref={scrollRef} style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <ScreenHeader 
        title="School Build Config" 
        subtitle={`Generate configuration for ${school.name}`}
      />

      {/* Section 1: Onboarding Status */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>1. Onboarding Status</Text>
        <View style={styles.stepper}>
          <StatusStep label="DB Seeded" completed={true} />
          <StatusStep label="Build Config Ready" completed={true} />
          <StatusStep 
            label="APK Delivered" 
            completed={currentStatus === 'apk_delivered' || currentStatus === 'live'} 
            onPress={() => handleStatusUpdate('apk_delivered')} 
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

      {/* Section 2: Assigned Cluster Info */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>2. Assigned Cluster Info</Text>
        <View style={styles.infoRow}>
          <Server size={18} color={colors.textSecondary} />
          <Text style={[styles.infoText, { color: colors.textPrimary }]}>Cluster ID: {school.cluster_id || 'cluster_a'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Database size={18} color={colors.textSecondary} />
          <Text style={[styles.infoText, { color: colors.textPrimary }]}>Backend URL: {school.backend_url}</Text>
        </View>
      </View>

      {/* Section 3: .env File */}
      <View
        onLayout={(event) => handleSectionLayout('env', event.nativeEvent.layout.y)}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>3. .env File Configuration</Text>
          <Button title="Copy" size="sm" variant="secondary" onPress={() => copyToClipboard(config.env_file, '.env contents')} />
        </View>
        <ScrollView horizontal style={styles.codeBlockContainer}>
          <Text style={[styles.codeBlock, { color: isDark ? '#A6E22E' : '#22863A' }]}>{config.env_file}</Text>
        </ScrollView>
      </View>

      {/* Section 4: app.json Changes */}
      <View
        onLayout={(event) => handleSectionLayout('appjson', event.nativeEvent.layout.y)}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>4. app.json Variables</Text>
          <Button title="Copy JSON" size="sm" variant="secondary" onPress={() => copyToClipboard(JSON.stringify(config.app_json_changes, null, 2), 'app.json updates')} />
        </View>
        <ScrollView horizontal style={styles.codeBlockContainer}>
          <Text style={[styles.codeBlock, { color: isDark ? '#66D9EF' : '#005CC5' }]}>
            {JSON.stringify(config.app_json_changes, null, 2)}
          </Text>
        </ScrollView>
      </View>

      {/* Section 5: eas.json Profile */}
      <View
        onLayout={(event) => handleSectionLayout('easjson', event.nativeEvent.layout.y)}
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>5. eas.json Profile Block</Text>
          <Button title="Copy Block" size="sm" variant="secondary" onPress={() => copyToClipboard(JSON.stringify(config.eas_profile, null, 2), 'eas.json profile')} />
        </View>
        <ScrollView horizontal style={styles.codeBlockContainer}>
          <Text style={[styles.codeBlock, { color: isDark ? '#E6DB74' : '#032F62' }]}>
            {JSON.stringify(config.eas_profile, null, 2)}
          </Text>
        </ScrollView>
      </View>

      {/* Section 6: Firebase Setup */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>6. Firebase Setup</Text>
        <Text style={[styles.textLabel, { color: colors.textSecondary, marginBottom: 12 }]}>
          Register this Android app package in the Firebase Console:
        </Text>
        <Pressable 
          onPress={() => copyToClipboard(config.firebase_package, 'Firebase package')}
          style={[styles.packageBlock, { backgroundColor: isDark ? '#1E1E1E' : '#F1F5F9' }]}
        >
          <Text style={[styles.packageText, { color: colors.textPrimary }]}>{config.firebase_package}</Text>
          <Copy size={16} color={colors.textSecondary} />
        </Pressable>
        <Pressable 
          style={styles.checkboxRow}
          onPress={() => setFirebaseChecked(!firebaseChecked)}
        >
          {firebaseChecked ? <CheckCircle size={24} color={colors.primary} /> : <Circle size={24} color={colors.textSecondary} />}
          <Text style={[styles.checkboxText, { color: colors.textPrimary }]}>Firebase app registered & google-services.json downloaded</Text>
        </Pressable>
      </View>

      {/* Section 7: Setup Commands */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>7. Setup Commands</Text>
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

      {/* Section 8: Build Readiness Summary */}
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>8. Build Readiness Checklist</Text>
        
        <CheckItem label=".env file updated locally" checked={envChecked} onToggle={() => setEnvChecked(!envChecked)} colors={colors} />
        <CheckItem label="app.json fields updated" checked={appJsonChecked} onToggle={() => setAppJsonChecked(!appJsonChecked)} colors={colors} />
        <CheckItem label="eas.json profile added" checked={easJsonChecked} onToggle={() => setEasJsonChecked(!easJsonChecked)} colors={colors} />
        <CheckItem label="google-services.json replaced" checked={googleServicesChecked} onToggle={() => setGoogleServicesChecked(!googleServicesChecked)} colors={colors} />
        <CheckItem label="School DB seeded" checked={true} readonly colors={colors} />
        <CheckItem label="First Admin seeded" checked={true} readonly colors={colors} />

        {(envChecked && appJsonChecked && easJsonChecked && googleServicesChecked) && (
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
  },
  codeBlock: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
  },
  textLabel: {
    fontSize: 14,
  },
  packageBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  packageText: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
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
