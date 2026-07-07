import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../src/contexts/ThemeContext';
import { ScreenHeader } from '../../../src/components/ui/ScreenHeader';
import { Input } from '../../../src/components/ui/Input';
import { Button } from '../../../src/components/ui/Button';
import { superAdminClient } from '../../../src/api/superAdminClient';
import { Building2, FileText, Phone, MapPin, ShieldCheck, Server, Key } from 'lucide-react-native';
import { getMedicalClusterAssignment } from '../../../src/services/medicalOnboardingService';
import { ClusterConfig } from '../../../src/config/clusters';
import { useToast } from '../../../src/components/ui/Toast';

export default function AddMedicalShopScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    medical_name: '',
    owner_name: '',
    email: '',
    password: '',
    gst_number: '',
    drug_license_number: '',
    address_line_1: '',
    address_line_2: '',
    city: '',
    state: '',
    pincode: '',
    phone_number: '',
    logo_url: '',
    plan: 'trial',
    amount_paid: '0',
    razorpay_key_id: '',
    razorpay_plan_id: '',
    trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB'),
  });

  const [assignedCluster, setAssignedCluster] = useState<ClusterConfig | null>(null);
  const [clusterLoading, setClusterLoading] = useState(true);
  const [clusterError, setClusterError] = useState<string | null>(null);

  useEffect(() => {
    loadCluster();
  }, []);

  const loadCluster = async () => {
    try {
      setClusterLoading(true);
      setClusterError(null);
      const cluster = await getMedicalClusterAssignment();
      setAssignedCluster(cluster);
    } catch (err: any) {
      setClusterError(
        err.response?.data?.error || 
        'All clusters are at medical capacity. Go to Cluster Management to add a new cluster.'
      );
    } finally {
      setClusterLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    // Basic validation
    if (
      !formData.medical_name ||
      !formData.owner_name ||
      !formData.email ||
      !formData.password ||
      !formData.gst_number ||
      !formData.drug_license_number ||
      !formData.address_line_1 ||
      !formData.city ||
      !formData.state ||
      !formData.pincode ||
      !formData.phone_number
    ) {
      showToast('Please fill out all required fields.', 'error', 3000);
      return;
    }

    if (!assignedCluster) {
      showToast('No cluster assigned. Please resolve cluster capacity issues first.', 'error', 4000);
      return;
    }

    try {
      setLoading(true);
      const response = await superAdminClient.post('/api/v1/medical/shops', formData, {
        timeout: 60000,
      });
      if (response.data?.success) {
        showToast('Medical shop registered successfully!', 'success', 3000);
        router.replace(`/(app)/medical/${response.data.data.id}/build-config`);
      } else {
        throw new Error(response.data?.error || 'Registration failed');
      }
    } catch (error: any) {
      const msg =
        error.response?.data?.error || error.message || 'Failed to register the medical shop.';
      showToast(msg, 'error', 5000);
    } finally {
      setLoading(false);
    }
  };

  const sectionLabelStyle = [styles.sectionLabel, { color: colors.textPrimary }];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScreenHeader title="Register Medical Shop" subtitle="Add to Project B database" />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Cluster Assignment Section */}
          <View style={styles.sectionHeader}>
            <Server size={20} color="#6C63FF" />
            <Text style={sectionLabelStyle}>Assigned Cluster</Text>
          </View>
          <View style={[styles.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : colors.surface, borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border }]}>
            {clusterLoading ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
                <ActivityIndicator color={colors.primary} size="small" />
                <Text style={{ color: colors.textSecondary }}>Finding optimal cluster...</Text>
              </View>
            ) : clusterError ? (
              <View style={{ paddingVertical: 4 }}>
                <Text style={{ color: colors.error, fontWeight: '600', marginBottom: 4 }}>Capacity Reached</Text>
                <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 18 }}>{clusterError}</Text>
              </View>
            ) : assignedCluster ? (
              <View style={{ paddingVertical: 4 }}>
                <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: '600', marginBottom: 2 }}>
                  {assignedCluster.label}
                </Text>
                <Text style={{ color: colors.textTertiary, fontSize: 13, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}>
                  {assignedCluster.cluster_id}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Identity Section */}
          <View style={styles.sectionHeader}>
            <Building2 size={20} color="#6C63FF" />
            <Text style={sectionLabelStyle}>Identity & Login</Text>
          </View>
          <View style={[styles.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : colors.surface, borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border }]}>
            <Input
              label="Medical Shop Name *"
              placeholder="e.g. Apollo Pharmacy"
              value={formData.medical_name}
              onChangeText={(t) => handleChange('medical_name', t)}
            />
            <Input
              label="Owner Name *"
              placeholder="Full name of owner"
              value={formData.owner_name}
              onChangeText={(t) => handleChange('owner_name', t)}
            />
            <Input
              label="Email *"
              placeholder="admin@pharmacy.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={formData.email}
              onChangeText={(t) => handleChange('email', t)}
            />
            <Input
              label="Password *"
              placeholder="Create a password to login"
              secureTextEntry
              value={formData.password}
              onChangeText={(t) => handleChange('password', t)}
            />
            <Input
              label="Logo URL (Optional)"
              placeholder="https://example.com/logo.png"
              value={formData.logo_url}
              onChangeText={(t) => handleChange('logo_url', t)}
            />
          </View>

          {/* Legal Section */}
          <View style={styles.sectionHeader}>
            <FileText size={20} color="#6C63FF" />
            <Text style={sectionLabelStyle}>Legal Details</Text>
          </View>
          <View style={[styles.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : colors.surface, borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border }]}>
            <Input
              label="GST Number *"
              placeholder="Enter GSTIN"
              autoCapitalize="characters"
              value={formData.gst_number}
              onChangeText={(t) => handleChange('gst_number', t)}
            />
            <Input
              label="Drug License Number *"
              placeholder="Enter Drug License Number"
              autoCapitalize="characters"
              value={formData.drug_license_number}
              onChangeText={(t) => handleChange('drug_license_number', t)}
            />
          </View>

          {/* Subscription Section */}
          <View style={styles.sectionHeader}>
            <ShieldCheck size={20} color="#6C63FF" />
            <Text style={sectionLabelStyle}>Subscription (Manual)</Text>
          </View>
          <View style={[styles.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : colors.surface, borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border }]}>
            <Input
              label="Active Plan"
              placeholder="trial | basic | pro | custom"
              value={formData.plan}
              onChangeText={(t) => handleChange('plan', t)}
            />
            <Input
              label="Amount Paid (Physical) *"
              placeholder="e.g. 5000"
              keyboardType="numeric"
              value={formData.amount_paid}
              onChangeText={(t) => handleChange('amount_paid', t)}
            />
            <Input
              label="Razorpay Key ID"
              placeholder="Optional - Can be added after onboarding"
              value={formData.razorpay_key_id}
              onChangeText={(t) => handleChange('razorpay_key_id', t)}
            />
            <Input
              label="Razorpay Plan ID"
              placeholder="Optional"
              value={formData.razorpay_plan_id}
              onChangeText={(t) => handleChange('razorpay_plan_id', t)}
            />
            <Input
              label="Trial End Date"
              placeholder="DD/MM/YYYY"
              value={formData.trial_ends_at}
              onChangeText={(t) => handleChange('trial_ends_at', t)}
              containerStyle={{ marginBottom: 0 }}
            />
          </View>

          {/* Contact & Address Section */}
          <View style={styles.sectionHeader}>
            <MapPin size={20} color="#6C63FF" />
            <Text style={sectionLabelStyle}>Address & Contact</Text>
          </View>
          <View style={[styles.card, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : colors.surface, borderColor: isDark ? 'rgba(255,255,255,0.08)' : colors.border }]}>
            <Input
              label="Phone Number *"
              placeholder="e.g. +91 9876543210"
              keyboardType="phone-pad"
              value={formData.phone_number}
              onChangeText={(t) => handleChange('phone_number', t)}
            />
            <Input
              label="Address Line 1 *"
              placeholder="Building, Street"
              value={formData.address_line_1}
              onChangeText={(t) => handleChange('address_line_1', t)}
            />
            <Input
              label="Address Line 2"
              placeholder="Locality, Landmark (Optional)"
              value={formData.address_line_2}
              onChangeText={(t) => handleChange('address_line_2', t)}
            />
            <View style={styles.row}>
              <View style={styles.halfWidth}>
                <Input
                  label="City *"
                  placeholder="City"
                  value={formData.city}
                  onChangeText={(t) => handleChange('city', t)}
                />
              </View>
              <View style={styles.halfWidth}>
                <Input
                  label="State *"
                  placeholder="State"
                  value={formData.state}
                  onChangeText={(t) => handleChange('state', t)}
                />
              </View>
            </View>
            <Input
              label="Pincode *"
              placeholder="Postal Code"
              keyboardType="number-pad"
              value={formData.pincode}
              onChangeText={(t) => handleChange('pincode', t)}
              containerStyle={{ marginBottom: 0 }}
            />
          </View>

          <Button
            title="Register Shop"
            onPress={handleSubmit}
            loading={loading}
            disabled={clusterLoading || !!clusterError}
            style={{ marginTop: 24, marginBottom: 40 }}
          />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100, // Added padding at the bottom to ensure content clears the bottom navigation bar
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    paddingBottom: 4, 
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
});
