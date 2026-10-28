import { useLocalSearchParams } from 'expo-router';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../contexts/ThemeContext';
import * as api from '../../api/books';
import { Action, Notice, Panel, Select, ui } from './BooksUi';
export type BooksCompany = { id: string; code: string; name: string; permissions: string[] };
const Context = createContext<{ companies: BooksCompany[]; company: BooksCompany; can: (p: string) => boolean } | null>(null);
export function useBooksAccess() {
  const scope = useContext(Context), auth = useAuth();
  return { ...auth, booksCompany: scope?.company, can: scope?.can || auth.can, permissions: scope?.company.permissions || auth.permissions };
}
export default function BooksCompanyWorkspace({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme(), { user, role, permissions, mustChangePassword } = useAuth();
  const [companies, setCompanies] = useState<BooksCompany[]>([]), [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true), [error, setError] = useState('');
  const params = useLocalSearchParams<{ company?: string }>();
  const grantKey = permissions.join('|');
  const load = useCallback(async () => {
    setError('');
    try {
      const list = await api.get<BooksCompany[]>('/organizations');
      setCompanies(list); setSelected(current => list.some(c => c.id === current) ? current : list.find(c => c.code === params.company)?.id || list[0]?.id || '');
    } catch (e) { setCompanies([]); setError(api.message(e)); }
    finally { setLoading(false); }
  }, [user?.id, role, grantKey, params.company]);
  useEffect(() => { if (!mustChangePassword) void load(); }, [load, mustChangePassword]);
  useEffect(() => () => api.setBooksCompany(null), []);
  useEffect(() => { const timer = setInterval(() => { void load(); }, 30000); return () => clearInterval(timer); }, [load]);
  const company = companies.find(c => c.id === selected);
  // Hide the previous company's component before changing the request scope.
  const [ready, setReady] = useState('');
  useEffect(() => { api.setBooksCompany(company?.id || null); setReady(company?.id || ''); }, [company?.id]);
  if (loading) return <ActivityIndicator />;
  if (!company) return <View style={{ padding: 28, gap: 20 }}>{!!error && <Notice error text={error} />}<Panel><Text style={[ui.title, { color: colors.textPrimary }]}>Company access has not been assigned</Text><Text style={{ color: colors.textSecondary }}>Your lead CA or SuperAdmin can assign Nexsyrus or Nexmaxx and choose your accounting permissions.</Text><Action label="Check company access" onPress={() => void load()} /></Panel></View>;
  return <View style={{ flex: 1, gap: 16 }}>
    <View style={{ maxWidth: 440 }}><Select label="Company books" value={selected} options={companies.map(c => ({ value: c.id, label: c.name }))} onChange={setSelected} /></View>
    {ready === company.id && <Context.Provider value={{ companies, company, can: p => company.permissions.includes(p) }}><React.Fragment key={company.id}>{children}</React.Fragment></Context.Provider>}
  </View>;
}
