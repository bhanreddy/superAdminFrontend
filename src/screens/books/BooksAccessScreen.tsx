import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, View, Text, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../../contexts/ThemeContext';
import { RouteGuard } from '../../components/auth/RouteGuard';
import { useAuth } from '../../hooks/useAuth';
import * as api from '../../api/books';
import { Action, Panel, Field, Select, Toggle, Notice, Dialog, Table, Badge, ui } from './BooksUi';
type Module = { key: string; label: string; actions: { key: string; label: string; permission: string }[] };
type CompanyAccess = { company_id: string; permissions: string[] };
type Company = { id: string; name: string };
type Account = { role: string; manager_id: string | null; company_access: CompanyAccess[]; id: string; full_name: string; email: string; employee_id: string; status: string; permissions: string[]; must_change_password: boolean };
function AccessManager() {
  const { colors } = useTheme();
  const { isFounder, role } = useAuth();
  const [options, setOptions] = useState<{ companies: Company[]; leads: { id: string; full_name: string }[] }>({ companies: [], leads: [] });
  const [catalog, setCatalog] = useState<Module[]>([]), [accounts, setAccounts] = useState<Account[]>([]);
  const [form, setForm] = useState<Partial<Account> | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [credential, setCredential] = useState<{ email: string; password: string } | null>(null), [reset, setReset] = useState<Account | null>(null);
  const [notice, setNotice] = useState('');
  const load = useCallback(async () => {
    try { const [c, a, o] = await Promise.all([api.get<Module[]>('/access/catalog'), api.get<Account[]>('/access/users'), api.get<any>('/access/options')]); setCatalog(c); setAccounts(a); setOptions({ companies: o.companies || [], leads: o.leads || [] }); }
    catch (e) { setError(api.message(e)); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  function toggle(companyId: string, module: Module, p: string, value: boolean) {
    setForm(f => {
      const assignments = f?.company_access || [];
      const grants = new Set(assignments.find(c => c.company_id === companyId)?.permissions || []), view = `books.${module.key}.view`;
      if (value) { grants.add(p); if (module.key !== 'data') grants.add(view); }
      else { grants.delete(p); if (p === view) module.actions.forEach(a => grants.delete(a.permission)); }
      return { ...f, company_access: assignments.map(c => c.company_id === companyId ? { ...c, permissions: [...grants] } : c) };
    });
  }
  async function save() {
    if (!form) return;
    setBusy(true); setError('');
    try {
      const result = form.id ? await api.put(`/access/users/${form.id}`, form) : await api.post('/access/users', form);
      if (result.temporary_password) setCredential({ email: result.email, password: result.temporary_password });
      setForm(null); setNotice('CA access saved. Permission changes apply to the next API request.'); await load();
    } catch (e) { setError(api.message(e)); } finally { setBusy(false); }
  }
  async function resetPassword() {
    if (!reset) return;
    setBusy(true); setError('');
    try { const r = await api.post(`/access/users/${reset.id}/reset-password`); setCredential({ email: reset.email, password: r.temporary_password }); setReset(null); await load(); }
    catch (e) { setError(api.message(e)); } finally { setBusy(false); }
  }
  return <ScrollView contentContainerStyle={{ padding: 28, gap: 20 }}>
    <View style={[ui.row, { flexWrap: 'wrap', justifyContent: 'space-between' }]}>
      <View style={{ gap: 8 }}><Text style={[ui.title, { color: colors.textPrimary }]}>{role === 'CA_LEAD' ? 'CA team' : 'CA access'}</Text><Text style={{ color: colors.textSecondary }}>Choose which Books records and actions each accountant can access.</Text></View>
      <Action label="Create CA account" onPress={() => { setError(''); setForm({ full_name: '', email: '', role: 'CA', manager_id: isFounder ? options.leads[0]?.id || null : null, status: 'ACTIVE', permissions: [], company_access: [] }); }} />
    </View>
    {!!error && <Notice error text={error} />}{!!notice && <Notice text={notice} />}
    <Notice text="The lead CA oversees accounting for Nexsyrus and Nexmaxx and manages the CA team. Each team member receives separate company permissions. Suspension and password reset revoke active sessions. Only the SuperAdmin can appoint or change a lead CA." />
    <Panel><Text selectable style={{ color: colors.textPrimary }}>CA login: {Platform.OS === 'web' ? `${window.location.origin}/ca-login` : '/ca-login'}</Text></Panel>
    <Table rows={accounts} columns={[
      { key: 'full_name', label: 'Name', width: 180 }, { key: 'email', label: 'Email', width: 270 },
      { key: 'status', label: 'Status', render: r => <Badge value={r.status.toLowerCase()} /> },
      { key: 'role', label: 'Role', render: r => <Text style={{ color: colors.textPrimary }}>{r.role === 'CA_LEAD' ? 'Lead CA' : 'CA team member'}</Text> },
      { key: 'company_access', label: 'Companies', width: 220, render: r => <Text style={{ color: colors.textPrimary }}>{r.role === 'CA_LEAD' ? 'Nexsyrus & Nexmaxx · Full accounting' : r.company_access?.map((a: CompanyAccess) => options.companies.find(c => c.id === a.company_id)?.name).filter(Boolean).join(', ') || 'No company access'}</Text> },
      { key: 'action', label: 'Actions', width: 290, render: r => <View style={[ui.row, { flexWrap: 'wrap' }]}><Action label="Manage access" secondary onPress={() => { setError(''); setForm({ ...r, company_access: (r.company_access || []).map((c: CompanyAccess) => ({ ...c, permissions: [...c.permissions] })) }); }} /><Action label="Reset password" secondary onPress={() => setReset(r)} /></View> },
    ]} empty="No CA accounts yet." />
    {form && <Dialog title={form.id ? `Access for ${form.email}` : 'Create CA account'} onClose={() => setForm(null)} busy={busy} footer={<><Action label="Cancel" secondary disabled={busy} onPress={() => setForm(null)} /><Action label="Save CA access" disabled={busy} onPress={() => void save()} /></>}>
      {!!error && <Notice error text={error} />}
      <Field label="Full name" value={form.full_name} onChange={v => setForm({ ...form, full_name: v })} />
      {!form.id && <Field label="CA email" value={form.email} onChange={v => setForm({ ...form, email: v })} />}
      {isFounder && <Select label="Accounting role" value={form.role || 'CA'} options={[{ value: 'CA', label: 'CA team member' }, { value: 'CA_LEAD', label: 'Lead CA · Full accounting and CA management' }]} onChange={v => setForm({ ...form, role: v })} />}
      {isFounder && form.role !== 'CA_LEAD' && <Select label="Reports to lead CA" value={form.manager_id || ''} options={[{ value: '', label: 'SuperAdmin only' }, ...options.leads.map(l => ({ value: l.id, label: l.full_name }))]} onChange={v => setForm({ ...form, manager_id: v || null })} />}
      {form.id && <Select label="Account status" value={form.status || 'ACTIVE'} options={[{ value: 'ACTIVE', label: 'Active' }, { value: 'SUSPENDED', label: 'Suspended' }]} onChange={v => setForm({ ...form, status: v })} />}
      <Notice text="Actions also select viewing for that module. Document creation uses the customer/vendor and item lists you grant. Journal posting needs Accounts viewing; time invoicing needs Invoices create/edit and Time viewing; recurring generation needs create/edit for its document types. Reports and Dashboard each reveal financial totals. Print/export permits downloading records already visible to the CA." />
      {form.role === 'CA_LEAD' ? <Notice text="Lead CAs have full accounting authority for both companies, including posting, banking, financial reports and management of their CA team. SuperAdmin platform controls remain with the owner." /> : options.companies.map(company => {
        const assignment = form.company_access?.find(c => c.company_id === company.id);
        return <Panel key={company.id}>
          <Toggle label={`Allow ${company.name}`} value={Boolean(assignment)} onChange={v => setForm({ ...form, company_access: v ? [...(form.company_access || []), { company_id: company.id, permissions: [] }] : form.company_access?.filter(c => c.company_id !== company.id) })} />
          {assignment && catalog.map(m => <Panel key={m.key}><Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{company.name} · {m.label}</Text>{m.actions.map(a => <Toggle key={a.permission} label={a.label} value={assignment.permissions.includes(a.permission)} onChange={v => toggle(company.id, m, a.permission, v)} />)}</Panel>)}
        </Panel>;
      })}
    </Dialog>}
    {reset && <Dialog title="Reset CA password" busy={busy} onClose={() => setReset(null)} footer={<><Action label="Cancel" secondary onPress={() => setReset(null)} disabled={busy} /><Action label="Reset password" danger disabled={busy} onPress={() => void resetPassword()} /></>}><Text style={{ color: colors.textPrimary }}>Reset {reset.email}'s password and sign out all their sessions? They must change the temporary password at their next login.</Text>{!!error && <Notice error text={error} />}</Dialog>}
    {credential && <Dialog title="Temporary CA password" onClose={() => setCredential(null)} footer={<Action label="I have saved it" onPress={() => setCredential(null)} />}>
      <Notice text="This password is shown once. Share it securely with the CA. They must choose a new password at first login." />
      <Text selectable style={{ color: colors.textPrimary }}>{credential.email}</Text><Text selectable style={{ color: colors.textPrimary, fontSize: 19 }}>{credential.password}</Text>
      <Action label="Copy temporary password" secondary onPress={() => { void Clipboard.setStringAsync(credential.password); }} />
    </Dialog>}
  </ScrollView>;
}
export default function BooksAccessScreen() { const { isFounder, role } = useAuth(); return <RouteGuard allowedRoles={['CA_LEAD']}>{(isFounder || role === 'CA_LEAD') && <AccessManager />}</RouteGuard>; }
