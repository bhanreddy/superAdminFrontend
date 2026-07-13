import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Switch, StatusBar, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Shield, Server } from 'lucide-react-native';
import { Input } from '../../../src/components/ui/Input';
import { Button } from '../../../src/components/ui/Button';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { superAdminApi } from '../../../src/services/apiService';
import { crmService } from '../../../src/services/crmService';
import { updateEnquiry } from '../../../src/services/founderSupabase';
import { getClusterAssignment } from '../../../src/services/schoolOnboardingService';
import type { ClusterConfig } from '../../../src/config/clusters';
import { useToast } from '../../../src/components/ui/Toast';
import { ScreenHeader } from '../../../src/components/ui/ScreenHeader';
import { LinearGradient } from 'expo-linear-gradient';

const getApiErrorMessage = (err: any, fallback: string) => (
  err?.response?.data?.error
  || err?.response?.data?.details
  || err?.message
  || fallback
);

export default function AddSchoolScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { showToast } = useToast();

  // Pre-fill params arrive when onboarding an accepted CRM enquiry. enquiryId /
  // accountId let us close the loop (link the tenant, close the lead) on create.
  const params = useLocalSearchParams<{
    name?: string; email?: string; phone?: string; organization?: string;
    address?: string; enquiryId?: string; accountId?: string;
  }>();
  const asStr = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || '';
  const enquiryId = asStr(params.enquiryId);
  const accountId = asStr(params.accountId);

  const [name, setName] = useState(asStr(params.name) || asStr(params.organization));
  const [code, setCode] = useState('');
  const [address, setAddress] = useState(asStr(params.address));
  const [logoUrl, setLogoUrl] = useState('');
  
  // App Config
  const [androidPackage, setAndroidPackage] = useState('');
  const [iosBundleId, setIosBundleId] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#1A73E8');

  // Auto-fill logic
  useEffect(() => {
    if (name && !androidPackage) {
      const sanitized = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (sanitized) {
        const pkg = `com.nexsyrus.schoolims.${sanitized}`;
        setAndroidPackage(pkg);
        setIosBundleId(pkg);
      }
    }
  }, [name]);

  const handleAndroidPackageChange = (text: string) => {
    setAndroidPackage(text);
    if (iosBundleId === androidPackage) {
      setIosBundleId(text);
    }
  };

  // Cluster Assignment
  const [assignedCluster, setAssignedCluster] = useState<ClusterConfig | null>(null);
  const [loadingCluster, setLoadingCluster] = useState(true);
  const [clusterError, setClusterError] = useState('');

  const fetchClusterAssignment = async () => {
    setLoadingCluster(true);
    setClusterError('');
    try {
      const cluster = await getClusterAssignment();
      setAssignedCluster(cluster);
    } catch (err: any) {
      setClusterError(getApiErrorMessage(err, 'Failed to assign cluster.'));
    } finally {
      setLoadingCluster(false);
    }
  };

  useEffect(() => {
    fetchClusterAssignment();
  }, []);

  // First admin toggle & fields
  const [seedAdmin, setSeedAdmin] = useState(false);
  const [adminFirstName, setAdminFirstName] = useState('');
  const [adminLastName, setAdminLastName] = useState('');
  const [adminEmail, setAdminEmail] = useState(asStr(params.email));
  const [adminPassword, setAdminPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleCreate = async () => {
    if (!name || !code) {
      setErrorMsg('Name and Code are required identifiers.');
      return;
    }
    if (!assignedCluster) {
      setErrorMsg('Cannot create school: No cluster assigned.');
      return;
    }

    if (seedAdmin) {
      if (!adminFirstName || !adminLastName || !adminEmail || !adminPassword) {
        setErrorMsg('All admin fields are required when seeding first admin.');
        return;
      }
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const newSchool = await superAdminApi.createSchool({
        name,
        code,
        address: address || undefined,
        logo_url: logoUrl || undefined,
        android_package: androidPackage || undefined,
        ios_bundle_id: iosBundleId || undefined,
        primary_color: primaryColor || undefined,
      });

      const setupWarnings: string[] = [];

      if (seedAdmin) {
        try {
          await superAdminApi.addFirstAdmin(newSchool.id, {
            email: adminEmail,
            first_name: adminFirstName,
            last_name: adminLastName,
            password: adminPassword,
            gender_id: 1, // Fallback for gender
            dob: '1990-01-01' // Fallback for dob
          });
        } catch (adminErr: any) {
          console.error('First admin creation failed after school creation:', adminErr);
          setupWarnings.push(getApiErrorMessage(adminErr, 'First admin account could not be provisioned automatically.'));
        }
      }

      // Close the CRM loop when this school came from an accepted enquiry:
      // link the account to the provisioned tenant and close the lead. Both are
      // best-effort — a failure here must not block the school setup flow.
      if (accountId) {
        try {
          await crmService.linkAccountToTenant(accountId, {
            external_client_id: String(newSchool.id),
            cluster_id: assignedCluster?.cluster_id,
          });
        } catch (linkErr) {
          console.warn('CRM account link failed:', linkErr);
        }
      }
      if (enquiryId) {
        try {
          await updateEnquiry(enquiryId, { status: 'CLOSED' });
        } catch (closeErr) {
          console.warn('Enquiry close failed:', closeErr);
        }
      }

      if (setupWarnings.length) {
        showToast(
          `School "${newSchool.name}" created with warnings: ${setupWarnings.join('; ')}`,
          'warning',
          6000
        );
      } else {
        showToast(
          `School "${newSchool.name}" created successfully.`,
          'success',
          5000
        );
      }

      // Navigate to the new school's build config
      router.replace(`/(app)/schools/${newSchool.id}/build-config` as any);
    } catch (err: any) {
      const msg = getApiErrorMessage(err, 'Failed to create school.');
      setErrorMsg(msg);
      showToast(msg, 'error', 5000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <LinearGradient
        colors={isDark ? ['#0A0A0B', '#121214'] : [colors.background, colors.surface]}
        style={StyleSheet.absoluteFillObject}
      />

      <ScreenHeader
        title="Register School"
        subtitle="Create a new tenant entity"
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Cluster Assignment Card */}
        <View style={[styles.clusterCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : colors.surface, borderColor: colors.border }]}>
          <View style={styles.clusterHeader}>
            <Server size={18} color={colors.primary} />
            <Text style={[styles.clusterTitle, { color: colors.textPrimary }]}>Assigned Cluster</Text>
          </View>
          
          {loadingCluster ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 8 }} />
          ) : clusterError ? (
            <View>
              <Text style={[styles.clusterErrorText, { color: colors.error }]}>{clusterError}</Text>
              <Button title="Retry Assignment" variant="secondary" onPress={fetchClusterAssignment} style={{ marginTop: 8 }} />
            </View>
          ) : assignedCluster ? (
            <Text style={[styles.clusterValue, { color: colors.textSecondary }]}>
              {assignedCluster.label} ({assignedCluster.cluster_id})
            </Text>
          ) : null}
        </View>

        <View style={styles.form}>
          <Input
            label="School name"
            required
            placeholder="e.g. Springfield High School"
            value={name}
            onChangeText={setName}
            containerStyle={{ marginBottom: 16 }}
          />
          <Input
            label="School code"
            required
            placeholder="e.g. SMHS"
            value={code}
            onChangeText={(text) => setCode(text.toUpperCase())}
            autoCapitalize="characters"
            containerStyle={{ marginBottom: 16 }}
          />
          <Input
            label="Android Package Name"
            placeholder="com.nexsyrus.schoolims.schoolname"
            value={androidPackage}
            onChangeText={handleAndroidPackageChange}
            autoCapitalize="none"
            containerStyle={{ marginBottom: 16 }}
          />
          <Input
            label="iOS Bundle ID"
            placeholder="com.nexsyrus.schoolims.schoolname"
            value={iosBundleId}
            onChangeText={setIosBundleId}
            autoCapitalize="none"
            containerStyle={{ marginBottom: 16 }}
          />
          <Input
            label="Brand Color"
            placeholder="#1A73E8"
            value={primaryColor}
            onChangeText={setPrimaryColor}
            autoCapitalize="characters"
            containerStyle={{ marginBottom: 16 }}
          />
          <Input
            label="Logo URL"
            placeholder="https://example.com/logo.png"
            value={logoUrl}
            onChangeText={setLogoUrl}
            keyboardType="url"
            autoCapitalize="none"
            containerStyle={{ marginBottom: 16 }}
          />
          <Input
            label="Address"
            placeholder="123 Education Lane"
            value={address}
            onChangeText={setAddress}
            multiline
            numberOfLines={3}
            containerStyle={{ marginBottom: 16 }}
          />

          {/* ── Seed First Admin Toggle ── */}
          <View style={[styles.toggleSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleLabel}>
                <Shield size={20} color={colors.primary} />
                <Text style={[styles.toggleTitle, { color: colors.textPrimary }]}>Seed First Admin</Text>
              </View>
              <Switch
                value={seedAdmin}
                onValueChange={setSeedAdmin}
                trackColor={{ false: colors.border, true: colors.primaryDim }}
                thumbColor={seedAdmin ? colors.primary : colors.textSecondary}
              />
            </View>
            <Text style={[styles.toggleHint, { color: colors.textSecondary }]}>
              Provision the school's first admin account during setup.
            </Text>
          </View>

          {seedAdmin && (
            <View style={styles.adminSection}>
              <View style={[styles.adminDivider, { backgroundColor: colors.primary }]} />
              <Text style={[styles.adminSectionTitle, { color: colors.primary }]}>Admin Account Details</Text>
              <Input
                label="First name"
                required
                placeholder="John"
                value={adminFirstName}
                onChangeText={setAdminFirstName}
                containerStyle={{ marginBottom: 16 }}
              />
              <Input
                label="Last name"
                required
                placeholder="Doe"
                value={adminLastName}
                onChangeText={setAdminLastName}
                containerStyle={{ marginBottom: 16 }}
              />
              <Input
                label="Email"
                required
                placeholder="admin@school.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={adminEmail}
                onChangeText={setAdminEmail}
                containerStyle={{ marginBottom: 16 }}
              />
              <Input
                label="Temporary password"
                required
                placeholder="Secure Password"
                secureTextEntry
                value={adminPassword}
                onChangeText={setAdminPassword}
                containerStyle={{ marginBottom: 16 }}
              />
            </View>
          )}

          {errorMsg ? <Text style={[styles.errorText, { color: colors.error }]}>{errorMsg}</Text> : null}

          <View style={styles.buttonGroup}>
            <Button
              title="Cancel"
              variant="secondary"
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/');
                }
              }}
              style={styles.actionButton}
            />
            <Button
              title={seedAdmin ? 'Create & Seed' : 'Create School'}
              variant="primary"
              onPress={handleCreate}
              loading={loading}
              disabled={loadingCluster || !!clusterError || !assignedCluster}
              style={styles.actionButton}
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  clusterCard: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  clusterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  clusterTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  clusterValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  clusterErrorText: {
    fontSize: 14,
    marginTop: 4,
    fontWeight: '500',
  },
  form: {
    gap: 8,
  },
  toggleSection: {
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  toggleHint: {
    fontSize: 12,
    marginTop: 4,
  },
  adminSection: {
    gap: 8,
    marginTop: 16,
  },
  adminDivider: {
    height: 1,
    opacity: 0.3,
    marginVertical: 8,
  },
  adminSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 16,
  },
  actionButton: {
    flex: 1,
  },
});
