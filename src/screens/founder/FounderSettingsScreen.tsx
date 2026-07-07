import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Input } from '../../components/ui/Input';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { useFounderAuth } from '../../hooks/useFounderAuth';
import * as founderDb from '../../services/founderSupabase';
import type { FounderRow } from '../../types/founder';
import {
  ConsoleAmbientBackground,
  GlassCard,
  PrimaryGradientButton,
  bottomTabPad,
} from './founderUi';
import { pressableWebStyles } from '../../utils/webPressable';

const BUDGET_LOCK_KEY = 'budget_lock';

function readBudgetLocked(v: unknown): boolean {
  if (v === true) return true;
  if (v && typeof v === 'object' && 'locked' in v) {
    return Boolean((v as { locked?: boolean }).locked);
  }
  return false;
}

export default function FounderSettingsScreen() {
  const { colors } = useTheme();
  const { isSuperAdmin } = useAuth();
  const { isApprover } = useFounderAuth();
  const canManageOrgSettings = isApprover || isSuperAdmin;

  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  const [budgetLocked, setBudgetLocked] = useState(false);
  const [budgetLoading, setBudgetLoading] = useState(false);

  const [founders, setFounders] = useState<FounderRow[]>([]);
  const [foundersLoading, setFoundersLoading] = useState(false);

  const loadBudget = useCallback(async () => {
    if (!canManageOrgSettings) return;
    setBudgetLoading(true);
    try {
      const v = await founderDb.getSetting(BUDGET_LOCK_KEY);
      setBudgetLocked(readBudgetLocked(v));
    } finally {
      setBudgetLoading(false);
    }
  }, [canManageOrgSettings]);

  const loadFounders = useCallback(async () => {
    if (!canManageOrgSettings) return;
    setFoundersLoading(true);
    try {
      const list = await founderDb.listFoundersForSettings();
      setFounders(list);
    } finally {
      setFoundersLoading(false);
    }
  }, [canManageOrgSettings]);

  useFocusEffect(
    useCallback(() => {
      loadBudget();
      loadFounders();
    }, [loadBudget, loadFounders]),
  );

  const onBudgetToggle = async (next: boolean) => {
    if (!canManageOrgSettings) return;
    setBudgetLoading(true);
    try {
      await founderDb.upsertSetting(BUDGET_LOCK_KEY, { locked: next });
      setBudgetLocked(next);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not update budget lock');
    } finally {
      setBudgetLoading(false);
    }
  };

  const changePassword = async () => {
    if (pw.length < 8) {
      Alert.alert('Validation', 'Password must be at least 8 characters.');
      return;
    }
    if (pw !== pw2) {
      Alert.alert('Validation', 'Passwords do not match.');
      return;
    }
    setPwLoading(true);
    try {
      await founderDb.updateAuthPassword(pw);
      setPw('');
      setPw2('');
      Alert.alert('Success', 'Password updated.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Password update failed');
    } finally {
      setPwLoading(false);
    }
  };

  const toggleFounder = (f: FounderRow) => {
    Alert.alert(
      f.is_active ? 'Deactivate founder?' : 'Activate founder?',
      f.full_name || f.email || f.id,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: async () => {
            try {
              await founderDb.setFounderActive(f.id, !f.is_active);
              loadFounders();
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Update failed');
            }
          },
        },
      ],
    );
  };

  return (
    <ConsoleAmbientBackground>
      <ScreenHeader title="Founder settings" subtitle="Security & access" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.pad, { paddingBottom: bottomTabPad }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.section, { color: colors.textSecondary }]}>Password</Text>
        <GlassCard>
          <Input
            label="New password"
            value={pw}
            onChangeText={setPw}
            secureTextEntry
            placeholder="Min 8 characters"
          />
          <Input
            label="Confirm password"
            value={pw2}
            onChangeText={setPw2}
            secureTextEntry
            placeholder="Repeat"
          />
          <PrimaryGradientButton
            label={pwLoading ? 'Updating…' : 'Update password'}
            onPress={changePassword}
            disabled={pwLoading}
          />
        </GlassCard>

        {canManageOrgSettings ? (
          <>
            <Text style={[styles.section, { color: colors.textSecondary }]}>Budget lock</Text>
            <GlassCard>
              <View style={styles.rowBetween}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={[styles.lbl, { color: colors.textPrimary }]}>Lock budgets</Text>
                  <Text style={[styles.sub, { color: colors.textSecondary }]}>
                    When enabled, founders follow locked budget policy (per your Supabase logic).
                  </Text>
                </View>
                {budgetLoading ? (
                  <ActivityIndicator color="#7C6FFF" />
                ) : (
                  <Switch
                    value={budgetLocked}
                    onValueChange={onBudgetToggle}
                    trackColor={{ false: '#333', true: '#7C6FFF88' }}
                    thumbColor={budgetLocked ? '#7C6FFF' : '#888'}
                  />
                )}
              </View>
            </GlassCard>

            <Text style={[styles.section, { color: colors.textSecondary }]}>Founders</Text>
            {foundersLoading ? (
              <ActivityIndicator color="#7C6FFF" style={{ marginVertical: 16 }} />
            ) : (
              founders.map((f) => (
                <GlassCard key={f.id} style={{ marginBottom: 10 }}>
                  <View style={styles.rowBetween}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.nm, { color: colors.textPrimary }]}>
                        {f.full_name || f.email || 'Founder'}
                      </Text>
                      <Text style={[styles.sub, { color: colors.textSecondary }]}>
                        {f.role} · {f.is_active ? 'Active' : 'Inactive'}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => toggleFounder(f)}
                      style={({ pressed }) => [...pressableWebStyles(pressed, { pressedOpacity: 0.85 })]}
                    >
                      <Text style={{ color: f.is_active ? '#FF6B7A' : '#00D4AD', fontWeight: '800' }}>
                        {f.is_active ? 'Deactivate' : 'Activate'}
                      </Text>
                    </Pressable>
                  </View>
                </GlassCard>
              ))
            )}
          </>
        ) : null}
      </ScrollView>
    </ConsoleAmbientBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  pad: { paddingHorizontal: 0, paddingTop: 8 },
  section: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 20,
    marginBottom: 10,
  },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lbl: { fontSize: 16, fontWeight: '800' },
  sub: { fontSize: 12, marginTop: 4, fontWeight: '600', lineHeight: 17 },
  nm: { fontSize: 16, fontWeight: '800' },
});
