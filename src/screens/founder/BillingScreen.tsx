import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  Pressable,
  ActivityIndicator,
  Platform,
  Alert,
  Share,
  KeyboardAvoidingView,
  useWindowDimensions,
  TextInput,
  Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  FileText,
  Plus,
  Trash2,
  X,
  ExternalLink,
  Ban,
  RefreshCw,
  Settings2,
  Send,
  Save,
  Building2,
  IndianRupee,
  ReceiptText,
  Search,
  ChevronDown,
  CheckCircle2,
  WalletCards,
  Stethoscope,
} from 'lucide-react-native';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Input } from '../../components/ui/Input';
import { useTheme } from '../../contexts/ThemeContext';
import {
  ConsoleAmbientBackground,
  GlassCard,
  PrimaryGradientButton,
  SectionTitle,
  bottomTabPad,
} from './founderUi';
import * as billing from '../../api/billing';
import type {
  BillingConfig,
  BillingDocument,
  DocumentType,
  DocumentStatus,
  IssueDocumentInput,
  LineItemInput,
  PreviewResult,
  BillingClient,
} from '../../api/billing';
import { CollectionsTab } from './CollectionsScreen';

/* ── Helpers ──────────────────────────────────────────────────────────────── */
const money = (n: number | string | null | undefined) => {
  if (n === null || n === undefined || n === '') return '—';
  return `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const STATUS_META: Record<DocumentStatus, { label: string; color: string; bg: string }> = {
  draft: { label: 'Draft', color: '#FB923C', bg: 'rgba(251,146,60,0.15)' },
  issued: { label: 'Issued', color: '#10D9A0', bg: 'rgba(16,217,160,0.15)' },
  cancelled: { label: 'Cancelled', color: '#F43F5E', bg: 'rgba(244,63,94,0.15)' },
};

const TYPE_META: Record<DocumentType, { label: string; color: string; bg: string }> = {
  tax_invoice: { label: 'Tax Invoice', color: '#7C6FFF', bg: 'rgba(124,111,255,0.15)' },
  receipt: { label: 'Receipt', color: '#38C8F4', bg: 'rgba(56,200,244,0.15)' },
};

const emptyLine = (): LineItemInput => ({ description: '', quantity: '1', rate: '' });

/* ── Small UI atoms ───────────────────────────────────────────────────────── */
function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <View style={[st.badge, { backgroundColor: bg }]}>
      <Text style={[st.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

function Segmented({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (k: any) => void;
  options: { key: string; label: string }[];
}) {
  const { colors, isDark } = useTheme();
  return (
    <View style={[st.segWrap, { borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : colors.surface }]}>
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            style={[
              st.segBtn,
              active && { backgroundColor: colors.primary },
              Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null,
            ]}
          >
            <Text style={[st.segText, { color: active ? '#FFF' : colors.textSecondary }]} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={st.kvRow}>
      <Text style={[st.kvLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[st.kvValue, { color: colors.textPrimary, fontWeight: strong ? '800' : '600' }]}>{value}</Text>
    </View>
  );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  const { colors, isDark } = useTheme();
  return (
    <View style={[st.detailMetric, { borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.035)' : '#FFFFFF' }]}>
      <Text style={[st.detailMetricLabel, { color: colors.textTertiary ?? colors.textSecondary }]}>{label}</Text>
      <Text style={[st.detailMetricValue, { color: colors.textPrimary }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function HeroMetric({ icon: Icon, label, value, tone, compact }: { icon: any; label: string; value: string; tone: string; compact: boolean }) {
  const { colors, isDark } = useTheme();
  return (
    <View style={[st.heroMetric, compact && st.heroMetricCompact, { backgroundColor: isDark ? 'rgba(255,255,255,0.055)' : 'rgba(255,255,255,0.72)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(103,86,187,0.12)' }]}>
      <View style={[st.metricIcon, { backgroundColor: `${tone}20` }]}><Icon size={17} color={tone} /></View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[st.metricLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[st.metricValue, { color: colors.textPrimary }]} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}

/* ── Screen ───────────────────────────────────────────────────────────────── */
export default function BillingScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const { width } = useWindowDimensions();
  const compact = width < 700;

  const [config, setConfig] = useState<BillingConfig | null>(null);
  const [docs, setDocs] = useState<BillingDocument[]>([]);
  const [clients, setClients] = useState<BillingClient[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [clientsWarning, setClientsWarning] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  const [typeFilter, setTypeFilter] = useState<'all' | DocumentType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | DocumentStatus>('all');

  const [showCreate, setShowCreate] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [detail, setDetail] = useState<BillingDocument | null>(null);
  const [section, setSection] = useState<'subscriptions' | 'documents' | 'collections'>(tab === 'collections' ? 'collections' : 'subscriptions');
  const [clientSearch, setClientSearch] = useState('');

  const loadList = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const filters: billing.DocumentListFilters = { page: 1, page_size: 100 };
      if (typeFilter !== 'all') filters.document_type = typeFilter;
      if (statusFilter !== 'all') filters.status = statusFilter;
      const res = await billing.listDocuments(filters);
      setDocs(res.data);
    } catch (err) {
      const e = billing.toBillingError(err);
      setListError(e.message);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const loadClients = useCallback(async () => {
    setClientsLoading(true);
    try {
      const result = await billing.listClients();
      setClients(result.data);
      setClientsWarning(result.cluster_unreachable ? 'Some clusters could not be reached. The visible list may be incomplete.' : null);
    } catch (err) {
      setClientsWarning(billing.toBillingError(err).message);
    } finally {
      setClientsLoading(false);
    }
  }, []);

  useEffect(() => { loadClients(); }, [loadClients]);

  useEffect(() => {
    if (tab === 'collections') setSection('collections');
  }, [tab]);

  useEffect(() => {
    billing
      .getConfig()
      .then(setConfig)
      .catch((err) => {
        const e = billing.toBillingError(err);
        // Non-fatal — surfaced inside the create form when supplier identity is missing.
        console.warn('[billing] config load failed:', e.code, e.message);
      });
  }, []);

  const supplierReady = Boolean(config?.supplier_gstin && config?.supplier_state_code);
  const activeClients = useMemo(() => clients.filter((client) => client.is_active), [clients]);
  const schoolCount = useMemo(() => clients.filter((client) => client.kind === 'school').length, [clients]);
  const medicalCount = useMemo(() => clients.filter((client) => client.kind === 'medical').length, [clients]);
  const configuredClients = useMemo(() => clients.filter((client) => client.monthly_fee !== null), [clients]);
  const monthlyRevenue = useMemo(() => activeClients.reduce((sum, client) => sum + Number(client.monthly_fee || 0), 0), [activeClients]);
  const issuedRevenue = useMemo(() => docs.filter((doc) => doc.status === 'issued').reduce((sum, doc) => sum + Number(doc.total_amount || 0), 0), [docs]);
  const visibleClients = useMemo(() => {
    const query = clientSearch.trim().toLowerCase();
    if (!query) return clients;
    return clients.filter((client) => `${client.name} ${client.code || ''} ${client.cluster_id}`.toLowerCase().includes(query));
  }, [clients, clientSearch]);

  const onIssued = useCallback(
    (doc: BillingDocument) => {
      setShowCreate(false);
      setDocs((prev) => [doc, ...prev]);
    },
    [],
  );

  const onCancelled = useCallback((doc: BillingDocument) => {
    setDocs((prev) => prev.map((d) => (d.id === doc.id ? doc : d)));
    setDetail(doc);
  }, []);

  const onConfigSaved = useCallback((c: BillingConfig) => {
    setConfig(c);
    setShowConfig(false);
  }, []);

  return (
    <ConsoleAmbientBackground>
      <ScrollView
        contentContainerStyle={{ paddingVertical: 20, paddingHorizontal: 0, paddingBottom: bottomTabPad }}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          title="Client Billing"
          subtitle="NexSyrus SaaS invoices & receipts"
          showBack
          rightAction={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Pressable
                onPress={() => setShowConfig(true)}
                hitSlop={6}
                style={[
                  st.iconBtn,
                  { borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : colors.surface },
                  Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null,
                ]}
              >
                <Settings2 size={18} color={colors.textSecondary} />
              </Pressable>
              {!compact && <PrimaryGradientButton label="New Document" onPress={() => setShowCreate(true)} />}
            </View>
          }
        />

        <Animated.View entering={FadeInDown.duration(500)} style={st.heroShell}>
          <LinearGradient
            colors={isDark ? ['#28243A', '#171625'] : ['#FFFFFF', '#EEEAFE']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.heroGradient}
          >
            <View style={[st.heroOrb, { backgroundColor: isDark ? 'rgba(124,111,255,0.22)' : 'rgba(124,111,255,0.16)' }]} />
            <View style={[st.heroTop, compact && { flexDirection: 'column', alignItems: 'stretch' }]}>
              <View style={{ flex: 1 }}>
                <View style={st.heroKickerRow}>
                  <View style={st.heroIcon}><WalletCards size={18} color="#FFFFFF" /></View>
                  <Text style={[st.heroKicker, { color: isDark ? '#B8B1FF' : '#6255D9' }]}>FINANCIAL COMMAND CENTER</Text>
                </View>
                <Text style={[st.heroTitle, { color: colors.textPrimary }]}>Subscriptions, billing and collections—together.</Text>
                <Text style={[st.heroSubtitle, { color: colors.textSecondary }]}>Manage every school’s monthly plan and send payment links without leaving Founder Console.</Text>
              </View>
              <Pressable onPress={() => setShowCreate(true)} style={({ pressed }) => [st.heroAction, { opacity: pressed ? 0.86 : 1 }]}>
                <Plus size={18} color="#FFFFFF" /><Text style={st.heroActionText}>New document</Text>
              </Pressable>
            </View>
            <View style={[st.metricGrid, compact && st.metricGridCompact]}>
              <HeroMetric icon={Building2} label="Active clients" value={String(activeClients.length)} tone="#7C6FFF" compact={compact} />
              <HeroMetric icon={IndianRupee} label="Monthly recurring" value={money(monthlyRevenue)} tone="#10B981" compact={compact} />
              <HeroMetric icon={CheckCircle2} label="Plans configured" value={`${configuredClients.length}/${clients.length}`} tone="#38BDF8" compact={compact} />
              <HeroMetric icon={ReceiptText} label="Issued value" value={money(issuedRevenue)} tone="#F59E0B" compact={compact} />
            </View>
          </LinearGradient>
        </Animated.View>

        {!supplierReady && (
          <GlassCard style={{ marginBottom: 16, borderColor: 'rgba(251,146,60,0.4)' }}>
            <Text style={{ color: '#FB923C', fontWeight: '800', marginBottom: 4 }}>Supplier identity not configured</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 12 }}>
              Set NexSyrus's GSTIN and state code in billing config before issuing documents.
            </Text>
            <Pressable
              onPress={() => setShowConfig(true)}
              style={[st.outlineBtn, { borderColor: '#FB923C' }, Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null]}
            >
              <Settings2 size={16} color="#FB923C" />
              <Text style={{ color: '#FB923C', fontWeight: '700' }}>Configure now</Text>
            </Pressable>
          </GlassCard>
        )}

        <View style={[st.sectionSwitch, { backgroundColor: isDark ? 'rgba(255,255,255,0.045)' : 'rgba(102,84,200,0.07)', borderColor: colors.clayBorderColor }]}>
          {(['subscriptions', 'documents', 'collections'] as const).map((key) => (
            <Pressable key={key} onPress={() => setSection(key)} style={[st.sectionSwitchBtn, section === key && { backgroundColor: isDark ? 'rgba(124,111,255,0.22)' : '#FFFFFF' }]}>
              {key === 'subscriptions' ? <Building2 size={16} color={section === key ? colors.primary : colors.textSecondary} /> : key === 'documents' ? <ReceiptText size={16} color={section === key ? colors.primary : colors.textSecondary} /> : <WalletCards size={16} color={section === key ? colors.primary : colors.textSecondary} />}
              <Text style={{ color: section === key ? colors.textPrimary : colors.textSecondary, fontWeight: '800', fontSize: 13 }}>{key === 'subscriptions' ? 'Subscriptions' : key === 'documents' ? 'Documents' : 'Collections'}</Text>
            </Pressable>
          ))}
        </View>

        {section === 'subscriptions' && <>
        <View style={st.sectionHeadingRow}>
          <View><Text style={[st.sectionHeading, { color: colors.textPrimary }]}>Client subscriptions</Text><Text style={[st.sectionSub, { color: colors.textSecondary }]}>{schoolCount} schools · {medicalCount} medical shops</Text></View>
          <Badge label={`${clients.length} clients`} color="#7C6FFF" bg="rgba(124,111,255,0.14)" />
        </View>
        <View style={[st.searchShell, { borderColor: colors.clayBorderColor, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF' }]}>
          <Search size={17} color={colors.textSecondary} />
          <TextInput value={clientSearch} onChangeText={setClientSearch} placeholder="Search school, medical shop or cluster" placeholderTextColor={colors.textTertiary ?? colors.textSecondary} style={[st.searchInput, { color: colors.textPrimary }]} />
          {clientSearch.length > 0 && <Pressable onPress={() => setClientSearch('')}><X size={16} color={colors.textSecondary} /></Pressable>}
        </View>
        {clientsWarning && <Text style={{ color: '#FB923C', fontSize: 12, marginBottom: 10 }}>{clientsWarning}</Text>}
        {clientsLoading ? (
          <View style={{ paddingVertical: 24, alignItems: 'center' }}><ActivityIndicator color={colors.primary} /></View>
        ) : clients.length === 0 ? (
          <GlassCard style={{ marginBottom: 18 }}>
            <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>No school or medical clients were returned by the active clusters.</Text>
          </GlassCard>
        ) : (
          <View style={{ gap: compact ? 12 : 14, marginBottom: 22 }}>
            {visibleClients.map((client, index) => (
              <Animated.View key={`${client.cluster_id}:${client.id}`} entering={FadeInUp.delay(Math.min(index, 8) * 45).duration(420)}>
                <SubscriptionClientCard client={client} onChanged={loadClients} compact={compact} />
              </Animated.View>
            ))}
          </View>
        )}
        </>}

        {section === 'documents' && <>
        {/* Filters */}
        <View style={{ gap: 10, marginBottom: 16 }}>
          <Segmented
            value={typeFilter}
            onChange={setTypeFilter}
            options={[
              { key: 'all', label: 'All Types' },
              { key: 'tax_invoice', label: 'Tax Invoice' },
              { key: 'receipt', label: 'Receipt' },
            ]}
          />
          <Segmented
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { key: 'all', label: 'All' },
              { key: 'issued', label: 'Issued' },
              { key: 'cancelled', label: 'Cancelled' },
            ]}
          />
        </View>

        <SectionTitle title="Documents" />

        {loading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : listError ? (
          <GlassCard>
            <Text style={{ color: '#F43F5E', fontWeight: '700', marginBottom: 8 }}>{listError}</Text>
            <PrimaryGradientButton label="Retry" onPress={loadList} />
          </GlassCard>
        ) : docs.length === 0 ? (
          <GlassCard>
            <Text style={{ color: colors.textSecondary, textAlign: 'center', paddingVertical: 20 }}>
              No billing documents yet.
            </Text>
          </GlassCard>
        ) : (
          <View style={{ gap: 10 }}>
            {docs.map((d) => (
              <Pressable
                key={d.id}
                onPress={() => setDetail(d)}
                style={({ pressed }) => [
                  st.docRow,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : colors.surface,
                    borderColor: colors.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                  Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null,
                ]}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Text style={[st.docNumber, { color: colors.textPrimary }]} numberOfLines={1}>
                      {d.document_number}
                    </Text>
                    <Badge {...TYPE_META[d.document_type]} />
                  </View>
                  <Text style={{ color: colors.textSecondary, fontSize: 13 }} numberOfLines={1}>
                    {d.client_legal_name}
                  </Text>
                  <Text style={{ color: colors.textTertiary ?? colors.textSecondary, fontSize: 11, marginTop: 2 }}>
                    {d.issued_at ? new Date(d.issued_at).toLocaleDateString('en-IN') : '—'} · FY {d.financial_year}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <Text style={[st.docAmount, { color: colors.textPrimary }]}>{money(d.total_amount)}</Text>
                  <Badge {...STATUS_META[d.status]} />
                </View>
              </Pressable>
            ))}
          </View>
        )}
        </>}

        {section === 'collections' && <CollectionsTab />}
      </ScrollView>

      {showCreate && (
        <CreateDocumentModal
          config={config}
          supplierReady={supplierReady}
          onClose={() => setShowCreate(false)}
          onIssued={onIssued}
        />
      )}

      {detail && (
        <DocumentDetailModal
          document={detail}
          onClose={() => setDetail(null)}
          onCancelled={onCancelled}
        />
      )}

      {showConfig && (
        <ConfigModal
          config={config}
          onClose={() => setShowConfig(false)}
          onSaved={onConfigSaved}
        />
      )}
    </ConsoleAmbientBackground>
  );
}

function SubscriptionClientCard({ client, onChanged, compact }: { client: BillingClient; onChanged: () => void; compact: boolean }) {
  const { colors, isDark, clayShadows } = useTheme();
  const [fee, setFee] = useState(client.monthly_fee == null ? '' : String(client.monthly_fee));
  const [link, setLink] = useState(client.payment_link || '');
  const [planName, setPlanName] = useState(client.plan_name || 'NexSyrus School ERP');
  const [amountDue, setAmountDue] = useState(String(client.amount_due || ''));
  const [dueDate, setDueDate] = useState(client.next_due_date ? String(client.next_due_date).slice(0, 10) : '');
  const [cycle, setCycle] = useState<BillingClient['billing_cycle']>(client.billing_cycle || 'monthly');
  const [status, setStatus] = useState<BillingClient['subscription_status']>(client.subscription_status || 'active');
  const [reminderEnabled, setReminderEnabled] = useState(Boolean(client.reminder_enabled));
  const [reminderMessage, setReminderMessage] = useState(client.reminder_message || '');
  const [busy, setBusy] = useState<'save' | 'send' | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setFee(client.monthly_fee == null ? '' : String(client.monthly_fee));
    setLink(client.payment_link || '');
    setPlanName(client.plan_name || 'NexSyrus School ERP');
    setAmountDue(String(client.amount_due || ''));
    setDueDate(client.next_due_date ? String(client.next_due_date).slice(0, 10) : '');
    setCycle(client.billing_cycle || 'monthly');
    setStatus(client.subscription_status || 'active');
    setReminderEnabled(Boolean(client.reminder_enabled));
    setReminderMessage(client.reminder_message || '');
  }, [client]);

  const editedSettings = () => ({
    plan_name: planName.trim() || 'NexSyrus School ERP',
    billing_cycle: cycle,
    subscription_status: status,
    next_due_date: dueDate.trim() || null,
    amount_due: amountDue.trim() === '' ? 0 : Number(amountDue),
    reminder_enabled: reminderEnabled,
    reminder_message: reminderMessage.trim() || null,
  });

  const save = async () => {
    const amount = fee.trim() === '' ? null : Number(fee);
    if (amount !== null && (!Number.isFinite(amount) || amount < 0)) return Alert.alert('Invalid fee', 'Enter zero or a positive monthly fee.');
    setBusy('save');
    try {
      const settings = editedSettings();
      if (!Number.isFinite(Number(settings.amount_due)) || Number(settings.amount_due) < 0) return Alert.alert('Invalid due amount', 'Enter zero or a positive amount due.');
      if (reminderMessage.trim().length > 280) return Alert.alert('Reminder too long', 'Keep the reminder within 280 characters.');
      await billing.updateClient(client, amount, link.trim() || null, settings);
      onChanged();
    } catch (err) { Alert.alert('Could not save', billing.toBillingError(err).message); }
    finally { setBusy(null); }
  };

  const send = async () => {
    if (client.kind !== 'school') return Alert.alert('Messaging unavailable', 'Medical shop messaging is not connected yet. The subscription and payment link can still be saved here.');
    if (!/^https:\/\//i.test(link.trim())) return Alert.alert('Payment link required', 'Enter a secure https payment link first.');
    setBusy('send');
    try {
      const amount = fee.trim() === '' ? null : Number(fee);
      await billing.updateClient(client, amount, link.trim(), editedSettings());
      await billing.sendPaymentLink(client, link.trim());
      Alert.alert('Sent', `Payment link sent to the admin of ${client.name}. It is now visible in Messages.`);
      onChanged();
    } catch (err) { Alert.alert('Could not send', billing.toBillingError(err).message); }
    finally { setBusy(null); }
  };

  return (
    <View style={[st.clientCard, { borderColor: colors.clayBorderColor, backgroundColor: isDark ? 'rgba(34,32,48,0.88)' : '#F8F6FC' }, Platform.OS === 'web' ? { boxShadow: clayShadows.clayElevated.web } as any : null]}>
      <Pressable onPress={() => setExpanded((value) => !value)} style={({ pressed }) => [st.clientSummary, { opacity: pressed ? 0.82 : 1 }]}>
        <View style={[st.schoolAvatar, { backgroundColor: client.kind === 'medical' ? 'rgba(16,185,129,0.14)' : client.is_active ? 'rgba(124,111,255,0.16)' : 'rgba(148,163,184,0.14)' }]}>
          {client.kind === 'medical' ? <Stethoscope size={20} color="#10B981" /> : <Text style={{ color: client.is_active ? '#7C6FFF' : colors.textSecondary, fontSize: 17, fontWeight: '900' }}>{client.name.slice(0, 2).toUpperCase()}</Text>}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[st.schoolName, { color: colors.textPrimary }]} numberOfLines={1}>{client.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}><Text style={{ color: client.kind === 'medical' ? '#10B981' : colors.textSecondary, fontSize: 11, fontWeight: '700' }}>{client.kind === 'medical' ? 'Medical shop' : 'School'}</Text><View style={[st.metaDot, { backgroundColor: colors.textSecondary }]} /><Text style={{ color: colors.textSecondary, fontSize: 11 }} numberOfLines={1}>{client.code || 'No code'} · {client.cluster_id}</Text></View>
        </View>
        {!compact && <View style={{ alignItems: 'flex-end' }}><Text style={[st.feeValue, { color: colors.textPrimary }]}>{money(client.monthly_fee)}</Text><Text style={{ color: colors.textSecondary, fontSize: 10 }}>per month</Text></View>}
        <Badge label={client.is_active ? 'Active' : 'Inactive'} color={client.is_active ? '#10D9A0' : '#F43F5E'} bg={client.is_active ? 'rgba(16,217,160,0.15)' : 'rgba(244,63,94,0.15)'} />
        <View style={[st.chevron, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF' }]}><ChevronDown size={16} color={colors.textSecondary} style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }} /></View>
      </Pressable>
      {compact && <View style={[st.mobileFeeStrip, { borderColor: colors.border }]}><Text style={{ color: colors.textSecondary, fontSize: 11 }}>Monthly plan</Text><Text style={[st.feeValue, { color: colors.textPrimary }]}>{money(client.monthly_fee)}</Text></View>}
      {expanded && <Animated.View entering={FadeInDown.duration(260)} style={[st.clientEditor, { borderTopColor: colors.border }]}>
        <Text style={[st.editorHint, { color: colors.textSecondary }]}>{client.kind === 'school' ? 'Configure the school portal, amount due and a courteous reminder. PhonePe checkout is created securely when the admin pays.' : 'Update this medical shop subscription and keep its secure payment link on file.'}</Text>
        <View style={[st.clientFields, compact && { flexDirection: 'column' }]}>
          <Input containerStyle={compact ? { width: '100%' } : { flex: 1.2, minWidth: 220 }} label="Plan name" value={planName} onChangeText={setPlanName} placeholder="NexSyrus School ERP" />
          <Input containerStyle={compact ? { width: '100%' } : { flex: 0.8, minWidth: 150 }} label="Amount due (₹)" keyboardType="decimal-pad" value={amountDue} onChangeText={setAmountDue} placeholder="0" />
          <Input containerStyle={compact ? { width: '100%' } : { flex: 0.8, minWidth: 160 }} label="Next due date" value={dueDate} onChangeText={setDueDate} placeholder="YYYY-MM-DD" />
        </View>
        <Text style={[st.miniLabel, { color: colors.textSecondary }]}>BILLING CYCLE</Text>
        <View style={st.choiceRow}>{(['monthly', 'quarterly', 'annual', 'custom'] as const).map((value) => <Pressable key={value} onPress={() => setCycle(value)} style={[st.choiceChip, { borderColor: cycle === value ? colors.primary : colors.border, backgroundColor: cycle === value ? 'rgba(124,111,255,0.15)' : 'transparent' }]}><Text style={{ color: cycle === value ? colors.primary : colors.textSecondary, fontSize: 11, fontWeight: '800', textTransform: 'capitalize' }}>{value}</Text></Pressable>)}</View>
        <Text style={[st.miniLabel, { color: colors.textSecondary }]}>SUBSCRIPTION STATUS</Text>
        <View style={st.choiceRow}>{(['trial', 'active', 'past_due', 'paused', 'cancelled'] as const).map((value) => <Pressable key={value} onPress={() => setStatus(value)} style={[st.choiceChip, { borderColor: status === value ? colors.primary : colors.border, backgroundColor: status === value ? 'rgba(124,111,255,0.15)' : 'transparent' }]}><Text style={{ color: status === value ? colors.primary : colors.textSecondary, fontSize: 11, fontWeight: '800', textTransform: 'capitalize' }}>{value.replace('_', ' ')}</Text></Pressable>)}</View>
        <View style={[st.clientFields, compact && { flexDirection: 'column' }]}>
          <Input containerStyle={compact ? { width: '100%' } : { flex: 0.7, minWidth: 150 }} label="Monthly fee (₹)" keyboardType="decimal-pad" value={fee} onChangeText={setFee} placeholder="Set fee" />
          <Input containerStyle={compact ? { width: '100%' } : { flex: 1.3, minWidth: 240 }} label="Secure payment link" autoCapitalize="none" value={link} onChangeText={setLink} placeholder="https://..." />
        </View>
        {client.kind === 'school' && <View style={[st.reminderEditor, { borderColor: colors.border }]}>
          <View style={st.reminderToggleRow}><View style={{ flex: 1 }}><Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: '800' }}>Show payment reminder</Text><Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 3 }}>Displays a gentle notice on the school admin dashboard and billing portal.</Text></View><Switch value={reminderEnabled} onValueChange={setReminderEnabled} trackColor={{ false: '#94A3B8', true: colors.primary }} /></View>
          {reminderEnabled && <Input label="Respectful reminder message" value={reminderMessage} onChangeText={setReminderMessage} placeholder="When convenient, please review the subscription amount due. Thank you." multiline />}
        </View>}
        <View style={[st.cardActions, compact && { flexDirection: 'column-reverse' }]}>
          <Pressable disabled={busy !== null} onPress={save} style={[st.outlineBtn, compact && { width: '100%' }, { borderColor: colors.border, opacity: busy ? 0.6 : 1 }]}>
            <Save size={15} color={colors.textSecondary} /><Text style={{ color: colors.textSecondary, fontWeight: '700' }}>{busy === 'save' ? 'Saving…' : 'Save changes'}</Text>
          </Pressable>
          {client.kind === 'school' && <Pressable disabled={busy !== null} onPress={send} style={[st.sendBtn, compact && { width: '100%' }, { opacity: busy ? 0.6 : 1 }]}>
            <LinearGradient colors={['#8B7CFF', '#6554E8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <Send size={15} color="#FFF" /><Text style={{ color: '#FFF', fontWeight: '800' }}>{busy === 'send' ? 'Sending…' : 'Send payment link'}</Text>
          </Pressable>}
        </View>
      </Animated.View>}
    </View>
  );
}

/* ── Supplier config modal ────────────────────────────────────────────────── */
function ConfigModal({
  config,
  onClose,
  onSaved,
}: {
  config: BillingConfig | null;
  onClose: () => void;
  onSaved: (c: BillingConfig) => void;
}) {
  const { colors } = useTheme();

  const [legalName, setLegalName] = useState(config?.supplier_legal_name ?? '');
  const [gstin, setGstin] = useState(config?.supplier_gstin ?? '');
  const [stateCode, setStateCode] = useState(config?.supplier_state_code ?? '');
  const [address, setAddress] = useState(config?.supplier_address ?? '');
  const [logoUrl, setLogoUrl] = useState(config?.supplier_logo_url ?? '');
  const [prefix, setPrefix] = useState(config?.invoice_prefix ?? 'NEX');
  const [rate, setRate] = useState(String(config?.default_gst_rate ?? '18'));
  const [sac, setSac] = useState(config?.default_sac_code ?? '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const gstinValid = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin.trim());

  // State code is the first 2 digits of the GSTIN — keep it in sync as you type.
  useEffect(() => {
    const g = gstin.trim();
    if (g.length >= 2) setStateCode(g.slice(0, 2));
  }, [gstin]);

  const canSave = !saving && (gstin.trim() === '' || gstinValid);

  const onSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setErr(null);
    try {
      const patch: any = {
        supplier_legal_name: legalName.trim() || null,
        supplier_gstin: gstin.trim() ? gstin.trim().toUpperCase() : null,
        supplier_state_code: stateCode.trim() || (gstin.trim() ? gstin.trim().slice(0, 2) : null),
        supplier_address: address.trim() || null,
        supplier_logo_url: logoUrl.trim() || null,
        invoice_prefix: prefix.trim() || 'NEX',
        default_gst_rate: rate.trim() ? Number(rate) : null,
        default_sac_code: sac.trim() || null,
      };
      const updated = await billing.updateConfig(patch);
      onSaved(updated);
    } catch (e) {
      const be = billing.toBillingError(e);
      setErr(`${be.message} (${be.code})`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={st.modalRoot}>
        <Pressable style={st.modalBackdrop} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[st.modalSheet, { backgroundColor: colors.background, borderColor: colors.border }]}
        >
          <View style={[st.modalHead, { borderBottomColor: colors.border }]}>
            <Text style={[st.modalTitle, { color: colors.textPrimary }]}>Supplier / Billing Config</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
            <Text style={{ color: colors.textTertiary ?? colors.textSecondary, fontSize: 12, marginBottom: 14 }}>
              These details appear on every issued document and drive the CGST/SGST vs IGST split. GSTIN and state code are required before issuing.
            </Text>

            <Input label="Supplier legal name" value={legalName} onChangeText={setLegalName} placeholder="NexSyrus Technologies Pvt Ltd" />
            <Input
              label="Supplier GSTIN"
              required
              autoCapitalize="characters"
              value={gstin}
              onChangeText={(t) => setGstin(t.toUpperCase())}
              placeholder="29ABCDE1234F1Z5"
              error={gstin.length > 0 && !gstinValid ? 'Invalid GSTIN format' : undefined}
            />
            <Input
              label="Supplier state code (2-digit)"
              keyboardType="number-pad"
              maxLength={2}
              value={stateCode}
              onChangeText={setStateCode}
              placeholder="29"
            />
            <Input label="Supplier address" value={address} onChangeText={setAddress} placeholder="Street, City, State, PIN" multiline />
            <Input
              label="Logo URL (optional)"
              autoCapitalize="none"
              value={logoUrl}
              onChangeText={setLogoUrl}
              placeholder="https://… or data:image/png;base64,…  (blank = bundled logo)"
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Input containerStyle={{ flex: 1 }} label="Invoice prefix" autoCapitalize="characters" value={prefix} onChangeText={(t) => setPrefix(t.toUpperCase())} placeholder="NEX" />
              <Input containerStyle={{ flex: 1 }} label="Default GST rate (%)" keyboardType="decimal-pad" value={rate} onChangeText={setRate} placeholder="18" />
            </View>
            <Input label="Default SAC code" value={sac} onChangeText={setSac} placeholder="Confirm with CA before first invoice" />

            {err && <Text style={{ color: '#F43F5E', fontSize: 12, marginTop: 10 }}>{err}</Text>}

            <View style={{ height: 16 }} />
            <PrimaryGradientButton label={saving ? 'Saving…' : 'Save Config'} onPress={onSave} disabled={!canSave} />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

/* ── Create modal ─────────────────────────────────────────────────────────── */
function CreateDocumentModal({
  config,
  supplierReady,
  onClose,
  onIssued,
}: {
  config: BillingConfig | null;
  supplierReady: boolean;
  onClose: () => void;
  onIssued: (doc: BillingDocument) => void;
}) {
  const { colors, isDark } = useTheme();

  const [docType, setDocType] = useState<DocumentType>('receipt');
  const [legalName, setLegalName] = useState('');
  const [address, setAddress] = useState('');
  const [gstin, setGstin] = useState('');
  const [gstRate, setGstRate] = useState(String(config?.default_gst_rate ?? '18'));
  const [items, setItems] = useState<LineItemInput[]>([emptyLine()]);

  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [previewErr, setPreviewErr] = useState<string | null>(null);
  const [issuing, setIssuing] = useState(false);
  const [issueErr, setIssueErr] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (config?.default_gst_rate != null) setGstRate(String(config.default_gst_rate));
  }, [config?.default_gst_rate]);

  const gstinValid = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin.trim());

  const itemsValid = items.length > 0 && items.every(
    (it) => it.description.trim() && Number(it.quantity) > 0 && Number(it.rate) >= 0,
  );

  const baseValid =
    legalName.trim().length > 0 &&
    address.trim().length > 0 &&
    itemsValid &&
    (docType === 'receipt' || gstinValid);

  const buildInput = useCallback((): IssueDocumentInput => {
    const input: IssueDocumentInput = {
      document_type: docType,
      client: {
        legal_name: legalName.trim(),
        billing_address: address.trim(),
        gstin: gstin.trim() ? gstin.trim().toUpperCase() : null,
      },
      line_items: items.map((it) => ({
        description: it.description.trim(),
        quantity: Number(it.quantity),
        rate: Number(it.rate),
      })),
    };
    if (docType === 'tax_invoice') input.gst_rate = Number(gstRate);
    return input;
  }, [docType, legalName, address, gstin, items, gstRate]);

  // Debounced live preview (server-side computation is the source of truth).
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!baseValid || !supplierReady) {
      setPreview(null);
      return;
    }
    debounceRef.current = setTimeout(() => {
      billing
        .previewDocument(buildInput())
        .then((p) => {
          setPreview(p);
          setPreviewErr(null);
        })
        .catch((err) => {
          const e = billing.toBillingError(err);
          setPreview(null);
          setPreviewErr(e.message);
        });
    }, 450);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [baseValid, supplierReady, buildInput]);

  const updateItem = (idx: number, patch: Partial<LineItemInput>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };
  const addItem = () => setItems((prev) => [...prev, emptyLine()]);
  const removeItem = (idx: number) => setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));

  const onIssue = async () => {
    if (!baseValid || issuing) return;
    setIssuing(true);
    setIssueErr(null);
    try {
      const doc = await billing.issueDocument(buildInput());
      if (doc.portal_sync_warning) {
        Alert.alert('Receipt issued, portal sync pending', doc.portal_sync_warning);
      }
      onIssued(doc);
    } catch (err) {
      const e = billing.toBillingError(err);
      setIssueErr(`${e.message} (${e.code})`);
    } finally {
      setIssuing(false);
    }
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={st.modalRoot}>
        <Pressable style={st.modalBackdrop} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[st.modalSheet, { backgroundColor: colors.background, borderColor: colors.border }]}
        >
          <View style={[st.modalHead, { borderBottomColor: colors.border }]}>
            <Text style={[st.modalTitle, { color: colors.textPrimary }]}>New Billing Document</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
            <Text style={[st.fieldLabel, { color: colors.textSecondary }]}>Document Type</Text>
            <Segmented
              value={docType}
              onChange={(k) => setDocType(k)}
              options={[
                { key: 'tax_invoice', label: 'Tax Invoice' },
                { key: 'receipt', label: 'Receipt' },
              ]}
            />
            <Text style={{ color: colors.textTertiary ?? colors.textSecondary, fontSize: 11, marginTop: 6 }}>
              {docType === 'tax_invoice'
                ? 'Full GST tax invoice — client GSTIN required, CGST/SGST or IGST computed.'
                : 'Plain payment receipt — no GST breakup, GSTIN optional.'}
            </Text>

            <View style={{ height: 18 }} />
            <Input label="Client legal / billing name" required value={legalName} onChangeText={setLegalName} placeholder="Acme Schools Pvt Ltd" />
            <Input label="Billing address" required value={address} onChangeText={setAddress} placeholder="Street, City, State, PIN" multiline />

            {docType === 'tax_invoice' && (
              <Input
                label="Client GSTIN"
                required
                autoCapitalize="characters"
                value={gstin}
                onChangeText={(t) => setGstin(t.toUpperCase())}
                placeholder="29ABCDE1234F1Z5"
                error={gstin.length > 0 && !gstinValid ? 'Invalid GSTIN format' : undefined}
              />
            )}
            {docType === 'receipt' && (
              <Input
                label="Client GSTIN (optional)"
                autoCapitalize="characters"
                value={gstin}
                onChangeText={(t) => setGstin(t.toUpperCase())}
                placeholder="Leave blank if not applicable"
              />
            )}
            {docType === 'tax_invoice' && (
              <Input
                label="GST rate (%)"
                keyboardType="decimal-pad"
                value={gstRate}
                onChangeText={setGstRate}
                placeholder="18"
              />
            )}

            <View style={{ height: 8 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={[st.fieldLabel, { color: colors.textSecondary, marginBottom: 0 }]}>Line Items</Text>
              <Pressable onPress={addItem} style={[st.addBtn, { borderColor: colors.primary }]} hitSlop={6}>
                <Plus size={14} color={colors.primary} />
                <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>Add</Text>
              </Pressable>
            </View>

            {items.map((it, idx) => (
              <View key={idx} style={[st.itemCard, { borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : colors.surface }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '700' }}>Item {idx + 1}</Text>
                  {items.length > 1 && (
                    <Pressable onPress={() => removeItem(idx)} hitSlop={8}>
                      <Trash2 size={15} color="#F43F5E" />
                    </Pressable>
                  )}
                </View>
                <Input label="Description" value={it.description} onChangeText={(t) => updateItem(idx, { description: t })} placeholder="Annual SaaS subscription" />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Input containerStyle={{ flex: 1 }} label="Qty" keyboardType="decimal-pad" value={String(it.quantity)} onChangeText={(t) => updateItem(idx, { quantity: t })} />
                  <Input containerStyle={{ flex: 1.4 }} label="Rate (₹)" keyboardType="decimal-pad" value={String(it.rate)} onChangeText={(t) => updateItem(idx, { rate: t })} placeholder="0.00" />
                </View>
              </View>
            ))}

            {/* Live preview */}
            <View style={{ height: 6 }} />
            <GlassCard>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text style={{ color: colors.textPrimary, fontWeight: '800', fontSize: 14 }}>Live Preview</Text>
                <RefreshCw size={14} color={colors.textSecondary} />
              </View>
              {!supplierReady ? (
                <Text style={{ color: '#FB923C', fontSize: 12 }}>Configure supplier GSTIN to compute totals.</Text>
              ) : previewErr ? (
                <Text style={{ color: '#F43F5E', fontSize: 12 }}>{previewErr}</Text>
              ) : !preview ? (
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Fill in valid details to see the computed total.</Text>
              ) : (
                <View>
                  <Row label={docType === 'tax_invoice' ? 'Taxable value' : 'Subtotal'} value={money(preview.taxable_value)} />
                  {preview.igst_amount != null && (
                    <Row label={`IGST (${preview.igst_rate}%)`} value={money(preview.igst_amount)} />
                  )}
                  {preview.cgst_amount != null && (
                    <Row label={`CGST (${preview.cgst_rate}%)`} value={money(preview.cgst_amount)} />
                  )}
                  {preview.sgst_amount != null && (
                    <Row label={`SGST (${preview.sgst_rate}%)`} value={money(preview.sgst_amount)} />
                  )}
                  <View style={{ height: 6 }} />
                  <Row label="Total" value={money(preview.total_amount)} strong />
                </View>
              )}
            </GlassCard>

            {issueErr && (
              <Text style={{ color: '#F43F5E', fontSize: 12, marginTop: 12 }}>{issueErr}</Text>
            )}

            <View style={{ height: 16 }} />
            <PrimaryGradientButton
              label={issuing ? 'Issuing…' : 'Issue Document'}
              onPress={onIssue}
              disabled={!baseValid || !supplierReady || issuing}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

/* ── Detail modal ─────────────────────────────────────────────────────────── */
function DocumentDetailModal({
  document,
  onClose,
  onCancelled,
}: {
  document: BillingDocument;
  onClose: () => void;
  onCancelled: (doc: BillingDocument) => void;
}) {
  const { colors, isDark } = useTheme();
  const [doc, setDoc] = useState<BillingDocument>(document);
  const [cancelling, setCancelling] = useState(false);
  const [actionErr, setActionErr] = useState<string | null>(null);

  // The list endpoint returns a lightweight column subset (no line_items / tax
  // breakup); hydrate the full record by id when the detail opens.
  useEffect(() => {
    let alive = true;
    billing
      .getDocument(document.id)
      .then((full) => {
        if (alive) setDoc(full);
      })
      .catch((err) => {
        if (alive) {
          const e = billing.toBillingError(err);
          setActionErr(`${e.message} (${e.code})`);
        }
      });
    return () => {
      alive = false;
    };
  }, [document.id]);

  const lineItems = doc.line_items ?? [];
  const issuedDisplay = doc.issued_at ? new Date(doc.issued_at).toLocaleDateString('en-IN') : '—';
  const issuedFullDisplay = doc.issued_at ? new Date(doc.issued_at).toLocaleString('en-IN') : '—';
  const statusMeta = STATUS_META[doc.status];
  const typeMeta = TYPE_META[doc.document_type];

  const openDocument = async () => {
    setActionErr(null);
    try {
      const html = await billing.fetchDocumentHtml(doc.id);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      } else {
        // Native: no headless print engine bundled — share a text summary.
        await Share.share({
          message: `${doc.document_number} · ${doc.client_legal_name} · ${money(doc.total_amount)}`,
        });
      }
    } catch (err) {
      const e = billing.toBillingError(err);
      setActionErr(`${e.message} (${e.code})`);
    }
  };

  const confirmCancel = () => {
    const run = async () => {
      setCancelling(true);
      setActionErr(null);
      try {
        const updated = await billing.cancelDocument(doc.id);
        if (updated.portal_sync_warning) {
          Alert.alert('Cancelled, portal sync pending', updated.portal_sync_warning);
        }
        setDoc(updated);
        onCancelled(updated);
      } catch (err) {
        const e = billing.toBillingError(err);
        setActionErr(`${e.message} (${e.code})`);
      } finally {
        setCancelling(false);
      }
    };
    if (Platform.OS === 'web') {
      run();
    } else {
      Alert.alert('Cancel document', 'This marks the document cancelled (it is never deleted). Continue?', [
        { text: 'Keep', style: 'cancel' },
        { text: 'Cancel document', style: 'destructive', onPress: run },
      ]);
    }
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={st.modalRoot}>
        <Pressable style={st.modalBackdrop} onPress={onClose} />
        <View style={[st.modalSheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={[st.modalHead, { borderBottomColor: colors.border }]}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[st.modalTitle, { color: colors.textPrimary }]} numberOfLines={1}>{doc.document_number}</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                <Badge {...TYPE_META[doc.document_type]} />
                <Badge {...STATUS_META[doc.status]} />
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={8}>
              <X size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
            <View style={[st.billHero, { borderColor: colors.border, backgroundColor: isDark ? 'rgba(124,111,255,0.16)' : '#F7F5FF' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={[st.billIcon, { backgroundColor: typeMeta.bg }]}>
                    <FileText size={18} color={typeMeta.color} />
                  </View>
                  <Text style={[st.billHeroKicker, { color: colors.textSecondary }]}>{typeMeta.label}</Text>
                  <Text style={[st.billHeroTitle, { color: colors.textPrimary }]} numberOfLines={1}>{doc.document_number}</Text>
                </View>
                <Badge {...statusMeta} />
              </View>
              <View style={[st.billHeroTotal, { borderTopColor: colors.border }]}>
                <Text style={[st.billHeroTotalLabel, { color: colors.textSecondary }]}>
                  {doc.status === 'cancelled' ? 'Cancelled total' : doc.document_type === 'tax_invoice' ? 'Amount payable' : 'Amount received'}
                </Text>
                <Text style={[st.billHeroAmount, { color: colors.textPrimary }]}>{money(doc.total_amount)}</Text>
              </View>
            </View>

            <View style={st.detailMetricGrid}>
              <DetailMetric label="Issued" value={issuedDisplay} />
              <DetailMetric label="Financial year" value={doc.financial_year} />
              <DetailMetric label="Supply state" value={doc.place_of_supply_state_code || '—'} />
            </View>

            <View style={[st.partyPanel, { borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.035)' : colors.surface }]}>
              <Text style={[st.fieldLabel, { color: colors.textSecondary }]}>Billed To</Text>
              <Text style={{ color: colors.textPrimary, fontWeight: '800', fontSize: 16 }}>{doc.client_legal_name}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 5, lineHeight: 18 }}>{doc.client_billing_address}</Text>
              {doc.client_gstin ? (
                <View style={[st.gstinChip, { borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF' }]}>
                  <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '800', letterSpacing: 0.7 }}>GSTIN</Text>
                  <Text style={{ color: colors.textPrimary, fontSize: 12, fontWeight: '800' }}>{doc.client_gstin}</Text>
                </View>
              ) : null}
            </View>

            <View style={{ height: 18 }} />
            <Text style={[st.fieldLabel, { color: colors.textSecondary }]}>Line Items</Text>
            {lineItems.length === 0 ? (
              <View style={[st.lineItemPremium, { borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.025)' : colors.surface }]}>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Loading line items…</Text>
              </View>
            ) : (
              lineItems.map((li, i) => (
                <View key={i} style={[st.lineItemPremium, { borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.025)' : colors.surface }]}>
                  <View style={[st.lineItemIndex, { backgroundColor: typeMeta.bg }]}>
                    <Text style={{ color: typeMeta.color, fontWeight: '900', fontSize: 11 }}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ color: colors.textPrimary, fontWeight: '800', fontSize: 13 }} numberOfLines={2}>{li.description}</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>
                      Qty {li.quantity} × {money(li.rate)}
                    </Text>
                  </View>
                  <Text style={{ color: colors.textPrimary, fontWeight: '900', fontSize: 14 }}>{money(li.amount)}</Text>
                </View>
              ))
            )}

            <View style={{ height: 12 }} />
            <View style={[st.totalPanel, { borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.035)' : '#FFFFFF' }]}>
              <Row label={doc.document_type === 'tax_invoice' ? 'Taxable value' : 'Subtotal'} value={money(doc.taxable_value)} />
              {doc.igst_amount != null && <Row label={`IGST (${doc.igst_rate}%)`} value={money(doc.igst_amount)} />}
              {doc.cgst_amount != null && <Row label={`CGST (${doc.cgst_rate}%)`} value={money(doc.cgst_amount)} />}
              {doc.sgst_amount != null && <Row label={`SGST (${doc.sgst_rate}%)`} value={money(doc.sgst_amount)} />}
              <View style={[st.totalDivider, { backgroundColor: colors.border }]} />
              <Row label="Total" value={money(doc.total_amount)} strong />
            </View>

            <View style={{ height: 8 }} />
            <Text style={{ color: colors.textTertiary ?? colors.textSecondary, fontSize: 11 }}>
              FY {doc.financial_year} · Issued {issuedFullDisplay} · Place of supply {doc.place_of_supply_state_code}
            </Text>

            {actionErr && <Text style={{ color: '#F43F5E', fontSize: 12, marginTop: 12 }}>{actionErr}</Text>}

            <View style={{ height: 18 }} />
            <Pressable onPress={openDocument} style={[st.outlineBtn, { borderColor: colors.primary }]}>
              <ExternalLink size={16} color={colors.primary} />
              <Text style={{ color: colors.primary, fontWeight: '700' }}>
                {Platform.OS === 'web' ? 'Open / Print Document' : 'Share Document'}
              </Text>
            </Pressable>

            {doc.status === 'issued' && (
              <Pressable
                onPress={confirmCancel}
                disabled={cancelling}
                style={[st.outlineBtn, { borderColor: '#F43F5E', marginTop: 10, opacity: cancelling ? 0.5 : 1 }]}
              >
                <Ban size={16} color="#F43F5E" />
                <Text style={{ color: '#F43F5E', fontWeight: '700' }}>{cancelling ? 'Cancelling…' : 'Cancel Document'}</Text>
              </Pressable>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  heroShell: { borderRadius: 28, overflow: 'hidden', marginBottom: 18, borderWidth: 1, borderColor: 'rgba(124,111,255,0.18)' },
  heroGradient: { padding: 20, minHeight: 250, overflow: 'hidden' },
  heroOrb: { position: 'absolute', width: 220, height: 220, borderRadius: 110, right: -60, top: -90 },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 18 },
  heroKickerRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 12 },
  heroIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#7567F1', shadowColor: '#6554E8', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 5 } },
  heroKicker: { fontSize: 10, fontWeight: '900', letterSpacing: 1.1 },
  heroTitle: { fontSize: 24, lineHeight: 30, fontWeight: '900', letterSpacing: -0.7, maxWidth: 580 },
  heroSubtitle: { fontSize: 13, lineHeight: 19, marginTop: 7, maxWidth: 570 },
  heroAction: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#6F5FEA', borderRadius: 15, paddingHorizontal: 16, paddingVertical: 13, overflow: 'hidden' },
  heroActionText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  metricGrid: { flexDirection: 'row', gap: 10, marginTop: 24 },
  metricGridCompact: { flexWrap: 'wrap', marginTop: 20 },
  heroMetric: { flex: 1, minWidth: 130, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 12 },
  heroMetricCompact: { flexBasis: '46%', minWidth: 135 },
  metricIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  metricLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.3, textTransform: 'uppercase' },
  metricValue: { fontSize: 15, fontWeight: '900', letterSpacing: -0.25, marginTop: 2 },
  sectionSwitch: { flexDirection: 'row', padding: 4, borderWidth: 1, borderRadius: 16, marginBottom: 22, gap: 4 },
  sectionSwitchBtn: { flex: 1, minHeight: 44, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  sectionHeadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionHeading: { fontSize: 19, fontWeight: '900', letterSpacing: -0.45 },
  sectionSub: { fontSize: 12, marginTop: 3 },
  searchShell: { height: 48, borderRadius: 15, borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 10, marginBottom: 14 },
  searchInput: { flex: 1, height: '100%', fontSize: 14, outlineStyle: 'none' } as any,
  clientCard: { borderWidth: 1, borderRadius: 20, overflow: 'hidden' },
  clientSummary: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  schoolAvatar: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  schoolName: { fontSize: 15, fontWeight: '900', letterSpacing: -0.2 },
  metaDot: { width: 3, height: 3, borderRadius: 2, opacity: 0.5 },
  feeValue: { fontSize: 15, fontWeight: '900', letterSpacing: -0.2 },
  chevron: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  mobileFeeStrip: { marginHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  clientEditor: { borderTopWidth: 1, padding: 14 },
  editorHint: { fontSize: 11, lineHeight: 16, marginBottom: 8 },
  clientFields: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  miniLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 0.8, marginTop: 12, marginBottom: 7 },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  choiceChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7 },
  reminderEditor: { borderWidth: 1, borderRadius: 16, padding: 12, marginTop: 14, gap: 10 },
  reminderToggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardActions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginTop: 2 },
  sendBtn: { position: 'relative', overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 13, borderRadius: 14 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3, textTransform: 'uppercase' },
  segWrap: { flexDirection: 'row', borderWidth: 1, borderRadius: 12, padding: 3, gap: 3 },
  segBtn: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  segText: { fontSize: 12, fontWeight: '700' },
  kvRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  kvLabel: { fontSize: 13 },
  kvValue: { fontSize: 14 },
  detailMetricGrid: { flexDirection: 'row', gap: 10, marginTop: 12 },
  detailMetric: { flex: 1, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, minWidth: 0 },
  detailMetricLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 },
  detailMetricValue: { fontSize: 12, fontWeight: '800' },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1 },
  docNumber: { fontSize: 14, fontWeight: '800', letterSpacing: -0.2 },
  docAmount: { fontSize: 15, fontWeight: '900', letterSpacing: -0.3 },
  billHero: { borderWidth: 1, borderRadius: 22, padding: 16, overflow: 'hidden' },
  billIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  billHeroKicker: { fontSize: 10, fontWeight: '900', letterSpacing: 1.1, textTransform: 'uppercase' },
  billHeroTitle: { fontSize: 19, fontWeight: '900', letterSpacing: -0.45, marginTop: 3 },
  billHeroTotal: { borderTopWidth: 1, marginTop: 16, paddingTop: 14, alignItems: 'flex-end' },
  billHeroTotalLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  billHeroAmount: { fontSize: 28, fontWeight: '900', letterSpacing: -0.8, marginTop: 3 },
  partyPanel: { borderWidth: 1, borderRadius: 18, padding: 16, marginTop: 14 },
  gstinChip: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, marginTop: 12 },
  lineItemPremium: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 16, padding: 12, marginBottom: 9 },
  lineItemIndex: { width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  totalPanel: { borderWidth: 1, borderRadius: 18, padding: 14 },
  totalDivider: { height: 1, marginVertical: 8 },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  modalSheet: {
    maxHeight: '92%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    ...(Platform.OS === 'web'
      ? ({ maxWidth: 560, width: '100%', alignSelf: 'center' } as any)
      : {}),
  },
  modalHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 18,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  fieldLabel: { fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  itemCard: { borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 10, gap: 2 },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
