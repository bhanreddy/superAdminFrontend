import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../../../src/contexts/ThemeContext';
import { updateCluster, validateClusterUrls, invalidateClusterCache, getAllClusters } from '../../../../src/services/clusterConfigService';
import { INPUT_PLACEHOLDER_COLOR } from '../../../../src/theme/styles';
import { pressableWebStyles } from '../../../../src/utils/webPressable';
import { safePressHandler } from '../../../../src/utils/safePressHandler';
import { useCluster } from '../../../../src/contexts/ClusterContext';
import type { ClusterConfig } from '../../../../src/config/clusters';

export default function EditClusterScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { refreshClusters } = useCluster();

  const [loading, setLoading] = useState(true);
  
  const [clusterId, setClusterId] = useState('');
  const [label, setLabel] = useState('');
  const [schoolBackendUrl, setSchoolBackendUrl] = useState('');
  const [medicalBackendUrl, setMedicalBackendUrl] = useState('');
  const [schoolSupabaseUrl, setSchoolSupabaseUrl] = useState('');
  const [medicalSupabaseUrl, setMedicalSupabaseUrl] = useState('');
  const [schoolAnonKey, setSchoolAnonKey] = useState('');
  const [medicalAnonKey, setMedicalAnonKey] = useState('');
  const [schoolServiceRoleKey, setSchoolServiceRoleKey] = useState('');
  const [medicalServiceRoleKey, setMedicalServiceRoleKey] = useState('');
  const [maxSchools, setMaxSchools] = useState('40');

  const [originalSchoolUrl, setOriginalSchoolUrl] = useState('');
  const [originalMedicalUrl, setOriginalMedicalUrl] = useState('');

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ school_reachable: boolean; medical_reachable: boolean; latency_ms: number } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const clusters = await getAllClusters();
        const cluster = clusters.find(c => c.cluster_id === id);
        if (!cluster) {
          Alert.alert('Error', 'Cluster not found');
          router.back();
          return;
        }

        setClusterId(cluster.cluster_id);
        setLabel(cluster.label);
        setSchoolBackendUrl(cluster.school_db.backend_url || '');
        setMedicalBackendUrl(cluster.medical_db.backend_url || '');
        setSchoolSupabaseUrl(cluster.school_db.supabase_url || '');
        setMedicalSupabaseUrl(cluster.medical_db.supabase_url || '');
        setSchoolAnonKey(cluster.school_db.supabase_anon_key || '');
        setMedicalAnonKey(cluster.medical_db.supabase_anon_key || '');
        setMaxSchools(cluster.max_schools?.toString() || '40');

        setOriginalSchoolUrl(cluster.school_db.backend_url || '');
        setOriginalMedicalUrl(cluster.medical_db.backend_url || '');
      } catch (err) {
        Alert.alert('Error', 'Failed to load cluster details');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id, router]);

  const urlsChanged = schoolBackendUrl !== originalSchoolUrl || medicalBackendUrl !== originalMedicalUrl;
  const requiresTest = urlsChanged;
  const canSave = !requiresTest || (testResult?.school_reachable && testResult?.medical_reachable);

  const handleTestConnection = async () => {
    if (!schoolBackendUrl || !medicalBackendUrl) {
      Alert.alert('Error', 'Both School and Medical Backend URLs are required to test.');
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const result = await validateClusterUrls(schoolBackendUrl, medicalBackendUrl);
      setTestResult(result);
      if (!result.school_reachable || !result.medical_reachable) {
        Alert.alert('Connection Failed', 'One or both backend URLs are unreachable.');
      }
    } catch (err: any) {
      Alert.alert('Test Failed', err.message || 'Could not validate URLs.');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!label || !schoolBackendUrl || !medicalBackendUrl) {
      Alert.alert('Error', 'Please fill all required fields.');
      return;
    }
    
    if (!canSave) {
      Alert.alert('Error', 'Please test the new connection URLs before saving.');
      return;
    }

    setSaving(true);
    try {
      await updateCluster(clusterId, {
        label,
        school_backend_url: schoolBackendUrl,
        medical_backend_url: medicalBackendUrl,
        school_supabase_url: schoolSupabaseUrl,
        medical_supabase_url: medicalSupabaseUrl,
        school_anon_key: schoolAnonKey,
        medical_anon_key: medicalAnonKey,
        ...(schoolServiceRoleKey ? { school_service_role_key: schoolServiceRoleKey } : {}),
        ...(medicalServiceRoleKey ? { medical_service_role_key: medicalServiceRoleKey } : {}),
        max_schools: parseInt(maxSchools, 10) || 40,
      } as any);

      await invalidateClusterCache();
      await refreshClusters();
      Alert.alert('Success', 'Cluster updated successfully');
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update cluster.');
    } finally {
      setSaving(false);
    }
  };

  const themedStyles = useMemo(() => ({
    root: [styles.root, { backgroundColor: colors.background }] as any,
    header: [styles.header, { borderBottomColor: colors.border, backgroundColor: colors.surface }] as any,
    headerTitle: [styles.headerTitle, { color: colors.textPrimary }] as any,
    backBtnText: [styles.backBtnText, { color: colors.primary }] as any,
    label: [styles.label, { color: colors.textSecondary }] as any,
    input: [styles.input, { backgroundColor: colors.surface, borderColor: isDark ? colors.border : '#CBD5E1', color: colors.textPrimary }] as any,
    disabledInput: [styles.input, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9', borderColor: 'transparent', color: colors.textSecondary }] as any,
  }), [colors, isDark]);

  if (loading) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={themedStyles.root}>
      <View style={themedStyles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={themedStyles.backBtnText}>←</Text>
        </Pressable>
        <Text style={themedStyles.headerTitle}>Edit Cluster</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={themedStyles.label}>Cluster ID (Read Only)</Text>
        <TextInput
          style={themedStyles.disabledInput}
          value={clusterId}
          editable={false}
        />

        <Text style={themedStyles.label}>Label (Required)</Text>
        <TextInput
          style={themedStyles.input}
          placeholder="e.g. Europe East Cluster"
          placeholderTextColor={INPUT_PLACEHOLDER_COLOR}
          value={label}
          onChangeText={setLabel}
        />

        <Text style={themedStyles.label}>School Backend URL (Required)</Text>
        <TextInput
          style={themedStyles.input}
          placeholder="https://api-school.nexsyrus.com"
          placeholderTextColor={INPUT_PLACEHOLDER_COLOR}
          value={schoolBackendUrl}
          onChangeText={(text) => {
            setSchoolBackendUrl(text);
            if (testResult) setTestResult(null); // invalidate test if url changes
          }}
          autoCapitalize="none"
          keyboardType="url"
        />

        <Text style={themedStyles.label}>Medical Backend URL (Required)</Text>
        <TextInput
          style={themedStyles.input}
          placeholder="https://api-medical.nexsyrus.com"
          placeholderTextColor={INPUT_PLACEHOLDER_COLOR}
          value={medicalBackendUrl}
          onChangeText={(text) => {
            setMedicalBackendUrl(text);
            if (testResult) setTestResult(null);
          }}
          autoCapitalize="none"
          keyboardType="url"
        />

        {/* Connection Test Section - only strongly enforce if changed */}
        {requiresTest && (
          <View style={[styles.testSection, { borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Connection Validation</Text>
            <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>URLs have changed. You must successfully ping both backend URLs before saving.</Text>
            
            {testResult && (
              <View style={styles.testResults}>
                <Text style={{ color: testResult.school_reachable ? colors.success : colors.error }}>
                  School: {testResult.school_reachable ? '✅ Reachable' : '❌ Unreachable'}
                </Text>
                <Text style={{ color: testResult.medical_reachable ? colors.success : colors.error }}>
                  Medical: {testResult.medical_reachable ? '✅ Reachable' : '❌ Unreachable'}
                </Text>
                <Text style={{ color: colors.textSecondary, marginTop: 4, fontSize: 12 }}>Latency: {testResult.latency_ms}ms</Text>
              </View>
            )}

            <Pressable
              style={({ pressed }) => [styles.testBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0' }, ...pressableWebStyles(pressed, { disabled: testing })]}
              onPress={safePressHandler(handleTestConnection)}
              disabled={testing}
            >
              {testing ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={[styles.testBtnText, { color: colors.primary }]}>Test Connection</Text>}
            </Pressable>
          </View>
        )}

        <Text style={themedStyles.label}>School Supabase URL (Optional)</Text>
        <TextInput
          style={themedStyles.input}
          placeholder="https://xxxx.supabase.co"
          placeholderTextColor={INPUT_PLACEHOLDER_COLOR}
          value={schoolSupabaseUrl}
          onChangeText={setSchoolSupabaseUrl}
          autoCapitalize="none"
        />

        <Text style={themedStyles.label}>School Anon Key (Optional)</Text>
        <TextInput
          style={themedStyles.input}
          placeholder="eyJhbGciOiJIUz..."
          placeholderTextColor={INPUT_PLACEHOLDER_COLOR}
          value={schoolAnonKey}
          onChangeText={setSchoolAnonKey}
          autoCapitalize="none"
          secureTextEntry
        />

        <Text style={themedStyles.label}>Medical Supabase URL (Optional)</Text>
        <TextInput
          style={themedStyles.input}
          placeholder="https://xxxx.supabase.co"
          placeholderTextColor={INPUT_PLACEHOLDER_COLOR}
          value={medicalSupabaseUrl}
          onChangeText={setMedicalSupabaseUrl}
          autoCapitalize="none"
        />

        <Text style={themedStyles.label}>Medical Anon Key (Optional)</Text>
        <TextInput
          style={themedStyles.input}
          placeholder="eyJhbGciOiJIUz..."
          placeholderTextColor={INPUT_PLACEHOLDER_COLOR}
          value={medicalAnonKey}
          onChangeText={setMedicalAnonKey}
          autoCapitalize="none"
          secureTextEntry
        />

        <Text style={themedStyles.label}>Update School Service Role Key (Optional)</Text>
        <TextInput
          style={themedStyles.input}
          placeholder="Leave blank to keep unchanged"
          placeholderTextColor={INPUT_PLACEHOLDER_COLOR}
          value={schoolServiceRoleKey}
          onChangeText={setSchoolServiceRoleKey}
          autoCapitalize="none"
          secureTextEntry
        />

        <Text style={themedStyles.label}>Update Medical Service Role Key (Optional)</Text>
        <TextInput
          style={themedStyles.input}
          placeholder="Leave blank to keep unchanged"
          placeholderTextColor={INPUT_PLACEHOLDER_COLOR}
          value={medicalServiceRoleKey}
          onChangeText={setMedicalServiceRoleKey}
          autoCapitalize="none"
          secureTextEntry
        />

        <Text style={themedStyles.label}>Max Schools Limit</Text>
        <TextInput
          style={themedStyles.input}
          placeholder="40"
          placeholderTextColor={INPUT_PLACEHOLDER_COLOR}
          value={maxSchools}
          onChangeText={setMaxSchools}
          keyboardType="numeric"
        />

        <Pressable
          style={({ pressed }) => [
            styles.saveBtn,
            { backgroundColor: colors.primary },
            (!canSave || saving) && { opacity: 0.5 },
            ...pressableWebStyles(pressed)
          ]}
          onPress={safePressHandler(handleSave)}
          disabled={!canSave || saving}
        >
          {saving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
        </Pressable>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 8 },
  backBtnText: { fontSize: 24 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  headerRight: { width: 40 },
  content: { padding: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    fontSize: 15,
  },
  testSection: {
    marginVertical: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  sectionDesc: { fontSize: 13, marginBottom: 16 },
  testResults: { marginBottom: 16, padding: 12, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 8 },
  testBtn: { padding: 12, borderRadius: 8, alignItems: 'center' },
  testBtnText: { fontWeight: '600' },
  saveBtn: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 50,
  },
  saveBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
});
