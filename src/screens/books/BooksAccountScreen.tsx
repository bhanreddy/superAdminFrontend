import React, { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../contexts/ThemeContext';
import { authService } from '../../services/authService';
import { Action, Notice, Panel, ui } from './BooksUi';
import { message } from '../../api/books';
import { FingerprintSettings } from '../../components/auth/FingerprintSecurity';
export default function BooksAccountScreen() {
  const { user, role, mustChangePassword, signOut } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const [password, setPassword] = useState(''), [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function save() {
    setError('');
    if (password.length < 12 || password.length > 256) return setError('Use a password of 12–256 characters.');
    if (password !== confirm) return setError('The passwords do not match.');
    setBusy(true);
    try {
      await authService.changePassword(password);
      setPassword(''); setConfirm('');
      await signOut();
      router.replace('/(auth)/ca-login' as any);
    } catch (e) { setError(message(e)); } finally { setBusy(false); }
  }
  if ((role !== 'CA' && role !== 'CA_LEAD')) return <View style={{ padding: 28 }}><Notice text="Manage accountant accounts from Books → CA access." /></View>;
  return <ScrollView contentContainerStyle={{ padding: 28, gap: 20, maxWidth: 680, width: '100%' }}>
    <Text style={[ui.title, { color: colors.textPrimary }]}>My CA account</Text>
    <Text style={{ color: colors.textSecondary }}>{user?.email}</Text>
    <FingerprintSettings />
    {mustChangePassword && <Notice text="Choose your own password before opening Books. After saving, sign in again with your new password." />}
    {!!error && <Notice error text={error} />}
    <Panel>
      {['New password', 'Confirm new password'].map((label, i) => <View key={label} style={{ gap: 8 }}>
        <Text style={{ color: colors.textSecondary }}>{label}</Text>
        <TextInput accessibilityLabel={label} value={i ? confirm : password} onChangeText={i ? setConfirm : setPassword} secureTextEntry autoComplete="new-password" style={[ui.input, { color: colors.textPrimary, borderColor: colors.border }]} />
      </View>)}
      <Action label="Save password and sign in again" disabled={busy} onPress={() => void save()} />
    </Panel>
  </ScrollView>;
}
