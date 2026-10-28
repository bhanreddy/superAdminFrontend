import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Share,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  BookOpen,
  Plus,
  RefreshCw,
  Download,
  ArrowUpRight,
  Wallet,
  FileText,
  Users,
  Package,
  Landmark,
  BarChart3,
  Clock,
  Settings,
  Repeat,
  ClipboardList,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react-native';
import { useBooksAccess as useAuth } from './BooksCompanyContext';
import { useTheme } from '../../contexts/ThemeContext';
import BooksDateFilter from './BooksDateFilter';
import * as api from '../../api/books';
import {
  Action,
  Panel,
  Field,
  Select,
  Table,
  Badge,
  Dialog,
  Notice,
  ui,
} from './BooksUi';
import DocumentEditor from './DocumentEditor';
import AttachmentsPanel from './AttachmentsPanel';
import DocumentDetail from './DocumentDetail';
import EntityEditor, { EntityType, JournalEditor } from './EntityEditor';
import FinanceConnections from './FinanceConnections';
import ReportsView, { Kpis, CashChart } from './ReportsView';
import { toCsv } from './csv';
const groups = [
  { label: 'OVERVIEW', items: [['home', 'Dashboard', BookOpen]] },
  {
    label: 'DIRECTORY',
    items: [
      ['customers', 'Customers', Users],
      ['vendors', 'Vendors', Users],
      ['items', 'Items & inventory', Package],
    ],
  },
  {
    label: 'SALES',
    items: [
      ['quote', 'Quotes', FileText],
      ['sales_order', 'Sales orders', ClipboardList],
      ['invoice', 'Invoices', FileText],
      ['delivery_challan', 'Delivery challans', ClipboardList],
      ['credit_note', 'Credit notes', FileText],
    ],
  },
  {
    label: 'PURCHASES',
    items: [
      ['purchase_order', 'Purchase orders', ClipboardList],
      ['bill', 'Bills', FileText],
      ['expense', 'Expenses', Wallet],
      ['vendor_credit', 'Vendor credits', FileText],
    ],
  },
  {
    label: 'ACCOUNTING',
    items: [
      ['payments', 'Payments', Wallet],
      ['banking', 'Banking', Landmark],
      ['accounts', 'Chart of accounts', BookOpen],
      ['journals', 'Journals', BookOpen],
      ['connections', 'Finance connections', Landmark],
      ['reports', 'Reports', BarChart3],
    ],
  },
  {
    label: 'WORKSPACE',
    items: [
      ['projects', 'Projects', ClipboardList],
      ['time', 'Time tracking', Clock],
      ['recurring', 'Recurring', Repeat],
      ['documents', 'Documents', FileText],
      ['activity', 'Activity log', Clock],
      ['settings', 'Settings', Settings],
    ],
  },
];
const modules = groups.flatMap((g) => g.items).map((a) => String(a[0]));
const docKinds = Object.keys(api.labels);
const urls: Record<string, string> = {
  payments: '/payments',
  banking: '/bank-transactions',
  accounts: '/accounts',
  journals: '/journals',
  projects: '/projects',
  time: '/time-entries',
  recurring: '/recurring',
  activity: '/activity',
};
const descriptions: Record<string, string> = {
  connections: 'Expenses, billing, collections and payroll, connected to one ledger.',
  home: 'Your business, at a glance.',
  customers: 'Customer details, billing addresses, and payment terms.',
  vendors: 'The people and businesses you purchase from.',
  items: 'Products, services, prices, and stock on hand.',
  payments: 'Recorded receipts and payments across your books.',
  banking: 'Import a statement and match recorded payments.',
  accounts: 'A single ledger behind every posted transaction.',
  journals: 'Post balanced accounting adjustments.',
  reports: 'Understand earnings, cash, taxes, and outstanding balances.',
  projects: 'Track customer projects and invoice billable work.',
  time: 'Log work against projects, then turn it into an invoice.',
  recurring: 'Generate due transactions as drafts for review.',
  activity: 'A history of changes made to your books.',
  settings: 'Your organization details and accounting preferences.',
};
function financialStart(month = 4) {
  const now = api.today();
  const y = Number(now.slice(0, 4)) - (Number(now.slice(5, 7)) < month ? 1 : 0);
  return `${y}-${String(month).padStart(2, '0')}-01`;
}
export default function BooksScreen() {
  const { colors } = useTheme(),
    { width } = useWindowDimensions();
  const [availableWidth, setAvailableWidth] = useState(width);
  const [navCollapsed, setNavCollapsed] = useState(false);
  const wide = availableWidth >= 1000;
  const compact = availableWidth < 650;
  const contentRef = useRef<ScrollView>(null);
  const { can, isFounder, role, permissions, refreshSessionProfile, booksCompany } = useAuth();
  const allowed = (key: string, action = 'view') => (key !== 'connections' || !booksCompany || booksCompany.code === 'nexsyrus') && can(`books.${key}.${action}`);
  const allowedModules = modules.filter(key => allowed(key));
  const grantKey = isFounder ? 'founder' : permissions.join('|');
  const visibleGroups = groups.map(g => ({ ...g, items: g.items.filter(a => allowed(String(a[0]))) })).filter(g => g.items.length);
  const params = useLocalSearchParams<{ module?: string }>(),
    router = useRouter();
  const [module, setModule] = useState(
    allowedModules.includes(String(params.module)) ? String(params.module) : allowedModules[0] || '',
  );
  const [bootstrap, setBootstrap] = useState<{
      settings: api.Settings;
      stats: any;
    } | null>(null),
    [contacts, setContacts] = useState<api.Contact[]>([]),
    [items, setItems] = useState<api.Item[]>([]),
    [accounts, setAccounts] = useState<api.Account[]>([]),
    [payments, setPayments] = useState<api.Payment[]>([]),
    [projects, setProjects] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]),
    [total, setTotal] = useState(0),
    [page, setPage] = useState(1),
    [report, setReport] = useState<api.DashboardReport | api.Report | null>(null);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [search, setSearch] = useState(''),
    [status, setStatus] = useState('');
  const [dates, setDates] = useState({ from: financialStart(), to: api.today() });
  const [editor, setEditor] = useState<{
      kind: api.DocumentKind;
      document?: api.BookDocument;
    } | null>(null),
    [entity, setEntity] = useState<{ type: EntityType; initial?: any } | null>(
      null,
    ),
    [journal, setJournal] = useState(false),
    [detail, setDetail] = useState<api.BookDocument | null>(null),
    [ledger, setLedger] = useState<{
      account: api.Account;
      rows: any[];
    } | null>(null),
    [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<{
    label: string;
    text: string;
    run: () => Promise<any>;
  } | null>(null);
  const [transactionType, setTransactionType] = useState('all');
  const [journalDetail, setJournalDetail] = useState<any>(null);
  const sequence = useRef(0);
  const cache = useRef<any>(null);
  const isDoc = docKinds.includes(module),
    title = String(
      groups.flatMap((g) => g.items).find((a) => a[0] === module)?.[1] ||
        'Books',
    );
  const load = useCallback(async () => {
    const seq = ++sequence.current;
    if (!allowedModules.includes(module)) { setRows([]); setReport(null); setLoading(false); return; }
    setLoading(true);
    setError('');
    try {
      if (!cache.current) {
        const base = await api.get<{ settings: api.Settings; stats: any }>(
          '/bootstrap',
        );
        const lookups = await api.get<{ contacts: api.Contact[]; items: api.Item[]; accounts: api.Account[]; payments: api.Payment[]; projects: any[] }>('/lookups');
        cache.current = { base, lookups };
      }
      const { base, lookups: { contacts: cs, items: its, accounts: acs, payments: pays, projects: projs } } = cache.current;
      let list: any[] = [],
        count = 0,
        newReport: api.DashboardReport | api.Report | null = null;
      if (isDoc) {
        const result = await api.get<{
          data: api.BookDocument[];
          total: number;
        }>('/documents', { kind: module, search, status, page });
        list = result.data;
        count = result.total;
      } else if (['home', 'reports'].includes(module))
        newReport = await api.get<api.Report | api.DashboardReport>(module === 'home' ? '/dashboard' : '/reports', dates);
      else if (module === 'customers' || module === 'vendors')
        list = cs.filter(
          (c: api.Contact) =>
            c.kind === 'both' ||
            c.kind === (module === 'customers' ? 'customer' : 'vendor'),
        );
      else if (module === 'items') list = its;
      else if (module === 'payments') list = pays;
      else if (module === 'accounts') list = acs;
      else if (module === 'projects') list = projs;
      else if (urls[module]) list = await api.get<any[]>(urls[module]);
      if (seq !== sequence.current) return;
      setBootstrap(base);
      setContacts(cs);
      setItems(its);
      setAccounts(acs);
      setPayments(pays);
      setProjects(projs);
      setRows(list);
      setTotal(count);
      if (newReport) setReport(newReport);
    } catch (e) {
      if (seq === sequence.current) setError(api.message(e));
    } finally {
      if (seq === sequence.current) setLoading(false);
    }
  }, [module, isDoc, search, status, page, dates, grantKey]);
  useEffect(() => {
    sequence.current++; cache.current = null;
    setRows([]); setReport(null); setBootstrap(null);
    setContacts([]); setItems([]); setAccounts([]); setPayments([]); setProjects([]);
    setDetail(null); setEditor(null); setEntity(null); setJournal(false); setLedger(null); setJournalDetail(null); setConfirm(null);
    if (!allowedModules.includes(module)) setModule(allowedModules[0] || '');
  }, [grantKey]);
  useEffect(() => {
    const timer = setTimeout(
      () => {
        void load();
      },
      search ? 250 : 0,
    );
    return () => {
      clearTimeout(timer);
      sequence.current++;
    };
  }, [load]);
  useEffect(() => {
    if (params.module && allowedModules.includes(String(params.module))) {
      setModule(String(params.module));
      setPage(1);
      setSearch('');
      setStatus('');
    }
  }, [params.module, grantKey]);
  function navigate(value: string) {
    if (!allowedModules.includes(value)) return;
    setRows([]); setReport(null);
    setModule(value);
    contentRef.current?.scrollTo({ y: 0, animated: false });
    setTransactionType('all');
    setPage(1);
    setSearch('');
    setStatus('');
    setNotice('');
    router.setParams({ module: value });
  }
  async function openDocument(id: string) {
    setBusy(true);
    setError('');
    try {
      setDetail(await api.get<api.BookDocument>(`/documents/${id}`));
    } catch (e) {
      setError(api.message(e));
    } finally {
      setBusy(false);
    }
  }
  async function refreshDetail() {
    cache.current = null;
    if (detail)
      setDetail(await api.get<api.BookDocument>(`/documents/${detail.id}`));
    await load();
  }
  async function mutate(fn: () => Promise<any>, success: string) {
    setBusy(true);
    setError('');
    try {
      await fn();
      setNotice(success);
      cache.current = null;
      await load();
      setConfirm(null);
    } catch (e) {
      setError(api.message(e));
    } finally {
      setBusy(false);
    }
  }
  async function exportCsv() {
    try {
      const data = isDoc
        ? rows.map((d) => ({
            number: d.number,
            type: d.kind,
            date: d.date,
            status: d.status,
            contact: d.contact_snapshot.name,
            subtotal_inr: api.decimal(d.subtotal),
            tax_inr: api.decimal(d.tax),
            total_inr: api.decimal(d.total),
            balance_inr: api.decimal(d.balance),
          }))
        : module === 'reports' && report && 'trial' in report
          ? report.trial.map((a) => ({
              code: a.code,
              name: a.name,
              type: a.type,
              debit_inr: api.decimal(a.debit),
              credit_inr: api.decimal(a.credit),
            }))
          : filtered;
      if (!data.length) throw new Error('There are no rows to export.');
      const csv = toCsv(data);
      if (Platform.OS === 'web') {
        const url = URL.createObjectURL(
          new Blob([csv], { type: 'text/csv;charset=utf-8' }),
        );
        const a = document.createElement('a');
        a.href = url;
        a.download = `books-${module}-${api.today()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else await Share.share({ message: csv, title: `Books ${title}` });
    } catch (e) {
      setError(api.message(e));
    }
  }
  const value = (v: unknown) => (
    <Text style={{ color: colors.textPrimary, fontSize: 13 }}>
      {api.money(v)}
    </Text>
  );
  const dateValue = (v: unknown) => (
    <Text style={{ color: colors.textPrimary, fontSize: 13 }}>
      {String(v || '—').slice(0, 10)}
    </Text>
  );
  const filtered = isDoc
    ? rows
    : rows
        .filter(
          (r) =>
            !['payments', 'recurring'].includes(module) ||
            transactionType === 'all' ||
            r.kind === transactionType,
        )
        .filter(
          (r) =>
            !search ||
            [
              r.name,
              r.number,
              r.reference,
              r.description,
              r.contact_name,
              r.project_name,
              r.code,
              r.sku,
              r.action,
              r.entity,
            ]
              .filter(Boolean)
              .join(' ')
              .toLowerCase()
              .includes(search.toLowerCase()),
        );
  function newRecord() {
    if (isDoc) setEditor({ kind: module as api.DocumentKind });
    else if (module === 'customers' || module === 'vendors')
      setEntity({
        type: 'contact',
        initial: { kind: module === 'customers' ? 'customer' : 'vendor' },
      });
    else if (module === 'items') setEntity({ type: 'item' });
    else if (module === 'accounts' || module === 'banking')
      setEntity({
        type: 'account',
        initial:
          module === 'banking' ? { is_cash: true, type: 'asset' } : undefined,
      });
    else if (module === 'projects') setEntity({ type: 'project' });
    else if (module === 'time') setEntity({ type: 'time' });
    else if (module === 'journals') setJournal(true);
    else if (module === 'payments')
      setEntity({
        type: 'payment',
        initial: {
          payment_kind: transactionType === 'bill' ? 'bill' : 'invoice',
        },
      });
  }
  const canCreate = allowed(module, module === 'payments' ? 'record' : module === 'journals' ? 'post' : 'manage') && (module !== 'banking' || allowed('accounts', 'manage')) && (module !== 'journals' || allowed('accounts')) && (module !== 'projects' || allowed('customers')) && (module !== 'time' || allowed('projects')) && (module !== 'payments' || allowed('invoice') || allowed('bill')) && (
    isDoc ||
    [
      'customers',
      'vendors',
      'items',
      'accounts',
      'banking',
      'projects',
      'time',
      'journals',
      'payments',
    ].includes(module));
  let columns: any[] = [];
  let onRow: ((r: any) => void) | undefined;
  if (isDoc) {
    columns = [
      { key: 'number', label: 'Document', width: 185 },
      {
        key: 'date',
        label: 'Date',
        width: 110,
        render: (r: any) => dateValue(r.date),
      },
      {
        key: 'contact',
        label: [
          'quote',
          'sales_order',
          'invoice',
          'credit_note',
          'delivery_challan',
        ].includes(module)
          ? 'Customer'
          : 'Vendor',
        width: 220,
        render: (r: any) => (
          <Text style={{ color: colors.textPrimary, fontSize: 13 }}>
            {r.contact_snapshot.name}
          </Text>
        ),
      },
      {
        key: 'status',
        label: 'Status',
        width: 110,
        render: (r: any) => (
          <Badge
            value={
              r.status === 'posted' &&
              ['invoice', 'bill'].includes(module) &&
              Number(r.balance) === 0
                ? 'paid'
                : r.status
            }
          />
        ),
      },
      {
        key: 'total',
        label: 'Total',
        width: 155,
        render: (r: any) => value(r.total),
      },
      {
        key: 'balance',
        label: 'Balance due',
        width: 155,
        render: (r: any) =>
          ['invoice', 'bill', 'credit_note', 'vendor_credit'].includes(
            module,
          ) ? (
            value(r.balance)
          ) : (
            <Text style={{ color: colors.textTertiary }}>—</Text>
          ),
      },
    ];
    onRow = (r) => void openDocument(r.id);
  } else if (['customers', 'vendors'].includes(module)) {
    columns = [
      { key: 'name', label: 'Name', width: 240 },
      { key: 'email', label: 'Email', width: 240 },
      { key: 'phone', label: 'Phone', width: 150 },
      { key: 'gstin', label: 'GSTIN', width: 170 },
      { key: 'payment_terms', label: 'Terms (days)', width: 110 },
      {
        key: 'active',
        label: 'Status',
        width: 100,
        render: (r: any) => <Badge value={r.active ? 'active' : 'inactive'} />,
      },
    ];
    if (allowed(module, 'manage')) onRow = (r) => { if (r.kind !== 'both' || (allowed('customers', 'manage') && allowed('vendors', 'manage'))) setEntity({ type: 'contact', initial: r }); };
  } else if (module === 'items') {
    columns = [
      { key: 'name', label: 'Item', width: 220 },
      { key: 'sku', label: 'SKU', width: 120 },
      {
        key: 'sale_rate',
        label: 'Selling price',
        render: (r: any) => value(r.sale_rate),
      },
      {
        key: 'purchase_rate',
        label: 'Standard cost',
        render: (r: any) => value(r.purchase_rate),
      },
      {
        key: 'stock',
        label: 'Stock on hand',
        width: 130,
        render: (r: any) => (
          <Text style={{ color: colors.textPrimary }}>
            {r.track_inventory
              ? `${Number(r.stock_milli) / 1000} ${r.unit}`
              : 'Service'}
          </Text>
        ),
      },
      {
        key: 'action',
        label: 'Actions',
        width: 150,
        render: (r: any) =>
          r.track_inventory && allowed('items', 'adjust') ? (
            <Action
              label="Adjust stock"
              secondary
              onPress={() => setEntity({ type: 'stock', initial: r })}
            />
          ) : null,
      },
    ];
    if (allowed('items', 'manage')) onRow = (r) => setEntity({ type: 'item', initial: r });
  } else if (module === 'payments') {
    columns = [
      { key: 'date', label: 'Date', render: (r: any) => dateValue(r.date) },
      { key: 'number', label: 'Document', width: 180 },
      { key: 'contact_name', label: 'Contact', width: 220 },
      { key: 'method', label: 'Method' },
      { key: 'reference', label: 'Reference' },
      { key: 'amount', label: 'Amount', render: (r: any) => value(r.amount) },
      {
        key: 'status',
        label: 'Status',
        render: (r: any) => <Badge value={r.status} />,
      },
    ];
    onRow = (r) => { if (allowed(r.kind)) void openDocument(r.document_id); };
  } else if (module === 'banking') {
    columns = [
      {
        key: 'date',
        label: 'Date',
        width: 110,
        render: (r: any) => dateValue(r.date),
      },
      { key: 'description', label: 'Description', width: 240 },
      { key: 'account_name', label: 'Account', width: 140 },
      { key: 'amount', label: 'Amount', render: (r: any) => value(r.amount) },
      {
        key: 'status',
        label: 'Status',
        render: (r: any) => (
          <Badge value={r.matched_payment_id ? 'matched' : 'unmatched'} />
        ),
      },
      {
        key: 'action',
        label: 'Action',
        width: 180,
        render: (r: any) => (
          <Action
            secondary
            disabled={!allowed('banking', 'manage') || (!r.matched_payment_id && !allowed('payments'))}
            label={r.matched_payment_id ? 'Unmatch' : 'Match payment'}
            onPress={() =>
              r.matched_payment_id
                ? setConfirm({
                    label: 'Unmatch transaction',
                    text: 'Remove the link to the recorded payment. The payment and bank statement row will remain.',
                    run: () =>
                      api.put(`/bank-transactions/${r.id}/match`, {
                        payment_id: null,
                      }),
                  })
                : setEntity({ type: 'match', initial: r })
            }
          />
        ),
      },
    ];
  } else if (module === 'accounts') {
    columns = [
      { key: 'code', label: 'Code', width: 100 },
      { key: 'name', label: 'Account', width: 280 },
      { key: 'type', label: 'Type' },
      {
        key: 'balance',
        label: 'Debit − credit',
        width: 190,
        render: (r: any) => value(r.balance),
      },
    ];
    onRow = (r) =>
      void mutate(
        async () =>
          setLedger({
            account: r,
            rows: await api.get(`/accounts/${r.code}/ledger`, dates),
          }),
        'Ledger opened',
      );
  } else if (module === 'journals') {
    columns = [
      {
        key: 'date',
        label: 'Date',
        width: 110,
        render: (r: any) => dateValue(r.date),
      },
      { key: 'reference', label: 'Reference', width: 270 },
      { key: 'source', label: 'Source', width: 160 },
      { key: 'notes', label: 'Notes', width: 240 },
      {
        key: 'amount',
        label: 'Amount',
        width: 170,
        render: (r: any) => value(r.amount),
      },
    ];
    onRow = (r) => {
      void (async () => {
        setBusy(true);
        try {
          setJournalDetail(await api.get(`/journals/${r.id}`));
        } catch (e) {
          setError(api.message(e));
        } finally {
          setBusy(false);
        }
      })();
    };
  } else if (module === 'projects') {
    columns = [
      { key: 'name', label: 'Project', width: 230 },
      { key: 'contact_name', label: 'Customer', width: 220 },
      { key: 'budget', label: 'Budget', render: (r: any) => value(r.budget) },
      {
        key: 'minutes',
        label: 'Logged time',
        width: 130,
        render: (r: any) => (
          <Text style={{ color: colors.textPrimary }}>
            {(Number(r.minutes) / 60).toFixed(2)} hrs
          </Text>
        ),
      },
      {
        key: 'action',
        label: 'Action',
        width: 210,
        render: (r: any) => (
          <Action
            label="Invoice unbilled time"
            disabled={!allowed('projects', 'invoice') || !allowed('invoice', 'manage') || !allowed('time')}
            secondary
            onPress={() =>
              void mutate(async () => {
                const d = await api.post<api.BookDocument>(
                  `/projects/${r.id}/invoice`,
                );
                await openDocument(d.id);
              }, 'Draft invoice created from unbilled time')
            }
          />
        ),
      },
    ];
  } else if (module === 'time') {
    columns = [
      { key: 'date', label: 'Date', render: (r: any) => dateValue(r.date) },
      { key: 'project_name', label: 'Project', width: 220 },
      { key: 'description', label: 'Work', width: 280 },
      { key: 'minutes', label: 'Minutes', width: 90 },
      {
        key: 'status',
        label: 'Billing status',
        render: (r: any) => (
          <Badge
            value={
              r.invoice_id
                ? 'invoiced'
                : r.billable
                  ? 'unbilled'
                  : 'non billable'
            }
          />
        ),
      },
    ];
  } else if (module === 'recurring') {
    columns = [
      { key: 'number', label: 'Template', width: 190 },
      { key: 'contact_name', label: 'Contact', width: 220 },
      {
        key: 'next_date',
        label: 'Next date',
        render: (r: any) => dateValue(r.next_date),
      },
      { key: 'interval_months', label: 'Interval (months)', width: 140 },
      {
        key: 'active',
        label: 'Status',
        render: (r: any) => <Badge value={r.active ? 'active' : 'paused'} />,
      },
      {
        key: 'action',
        label: 'Action',
        width: 130,
        render: (r: any) => (
          <Action
            disabled={!allowed('recurring', 'manage')}
            label={r.active ? 'Pause' : 'Resume'}
            secondary
            onPress={() =>
              void mutate(
                () => api.put(`/recurring/${r.id}`, { active: !r.active }),
                'Recurring profile updated',
              )
            }
          />
        ),
      },
    ];
  } else if (module === 'activity') {
    columns = [
      {
        key: 'created_at',
        label: 'When',
        width: 190,
        render: (r: any) => (
          <Text style={{ color: colors.textPrimary, fontSize: 12 }}>
            {new Date(r.created_at).toLocaleString('en-IN', {
              timeZone: 'Asia/Kolkata',
            })}
          </Text>
        ),
      },
      { key: 'entity', label: 'Record', width: 120 },
      { key: 'action', label: 'Action', width: 180 },
      { key: 'actor', label: 'Actor', width: 250 },
      { key: 'entity_id', label: 'Record ID', width: 310 },
    ];
  }
  const main = (
    <View style={{ gap: 18, minWidth: 0, flexShrink: 0 }}>
      <View style={st.moduleHeader}>
        <View style={{ flex: 1, minWidth: 180, gap: 5 }}>
          {wide ? <View style={ui.row}>
            <Pressable accessibilityRole="button" accessibilityLabel={navCollapsed ? 'Show Books navigation' : 'Hide Books navigation'} onPress={() => setNavCollapsed(current => !current)} style={[st.navToggle, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              {navCollapsed ? <PanelLeftOpen size={17} color={colors.textSecondary} /> : <PanelLeftClose size={17} color={colors.textSecondary} />}
            </Pressable>
            <Text accessibilityRole="header" style={[st.moduleTitle, { color: colors.textPrimary }]}>{title}</Text>
          </View> : <View style={{ maxWidth: 300 }}><Select compact label="Books section" value={module} options={visibleGroups.flatMap(group => group.items.map(item => ({ value: String(item[0]), label: String(item[1]) })))} onChange={navigate} /></View>}
          <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 20 }}>{descriptions[module] || `Create, review, and manage ${api.labels[module as api.DocumentKind]?.toLowerCase()}.`}</Text>
        </View>
        <View style={{ maxWidth: '100%' }}>
          <View style={[ui.row, { flexWrap: 'wrap' }]}>
            {(isFounder || role === 'CA_LEAD') && <Action label={role === 'CA_LEAD' ? 'CA team' : 'CA access'} secondary onPress={() => router.push('/(app)/books/access' as any)} />}
            {allowed('data', 'export') && !['home', 'settings', 'documents', 'connections'].includes(module) && (
              <Action
                label="Export CSV"
                secondary
                disabled={loading}
                icon={<Download size={14} color={colors.textSecondary} />}
                onPress={exportCsv}
              />
            )}
            <Action
              label="Refresh"
              secondary
              disabled={loading || busy}
              icon={<RefreshCw size={14} color={colors.textSecondary} />}
              onPress={() => {
                cache.current = null;
                void load();
              }}
            />
            {canCreate && (
              <Action
                label={
                  isDoc
                    ? `New ${api.singular[module as api.DocumentKind].toLowerCase()}`
                    : module === 'payments'
                      ? 'Record payment'
                      : module === 'banking'
                        ? 'Add bank account'
                        : `New ${{ customers: 'customer', vendors: 'vendor', items: 'item', accounts: 'account', projects: 'project', time: 'time entry', journals: 'journal' }[module]}`
                }
                disabled={busy}
                icon={<Plus size={16} color="#fff" />}
                onPress={newRecord}
              />
            )}
          </View>
        </View>
      </View>
      {error && <Notice error text={error} />}
      {notice && <Notice text={notice} />}
      {loading && (
        <View style={[ui.row, { gap: 10 }]}>
          <ActivityIndicator color={colors.primary} />
          <Text style={{ color: colors.textSecondary }}>Loading books…</Text>
        </View>
      )}
      {!bootstrap && !loading && (
        <Panel>
          <Text style={[ui.title, { color: colors.textPrimary }]}>
            Books is waiting for setup
          </Text>
          <Text style={{ color: colors.textSecondary, lineHeight: 22 }}>
            Your accounting workspace will be available after the Books database
            migration is applied and the API is running.
          </Text>
          <Action
            label="Try again"
            onPress={() => {
              cache.current = null;
              void load();
            }}
          />
        </Panel>
      )}
      {bootstrap && !loading && (
        <>
          {['home', 'reports'].includes(module) && <BooksDateFilter value={dates} fiscalStart={financialStart(bootstrap.settings.fiscal_year_month)} today={api.today()} onChange={setDates} />}
          {module === 'home' && report && (
            <>
              <Kpis report={report} />
              <Panel>
                <View style={[ui.row, { justifyContent: 'space-between' }]}>
                  <View style={{ gap: 6, flex: 1 }}>
                    <Text style={[ui.title, { color: colors.textPrimary }]}>
                      Welcome to {bootstrap.settings.organization_name} Books
                    </Text>
                    <Text
                      style={{
                        color: colors.textSecondary,
                        lineHeight: 21,
                        fontSize: 13,
                      }}
                    >
                      Keep your sales, purchases, and accounts together.
                    </Text>
                  </View>
                  <BookOpen color={colors.primary} size={34} />
                </View>
                <View style={[ui.row, { flexWrap: 'wrap' }]}>
                  <Action
                    label="Create invoice"
                    disabled={!allowed('invoice', 'manage')}
                    onPress={() => setEditor({ kind: 'invoice' })}
                  />
                  <Action
                    label="Record expense"
                    disabled={!allowed('expense', 'manage')}
                    secondary
                    onPress={() => setEditor({ kind: 'expense' })}
                  />
                  <Action
                    label="Add customer"
                    disabled={!allowed('customers', 'manage')}
                    secondary
                    onPress={() =>
                      setEntity({
                        type: 'contact',
                        initial: { kind: 'customer' },
                      })
                    }
                  />
                  <Action
                    label="View reports"
                    disabled={!allowed('reports')}
                    secondary
                    onPress={() => navigate('reports')}
                  />
                </View>
              </Panel>
              <CashChart report={report} />
              <View style={ui.wrap}>
                {[
                  {
                    label: 'Contacts',
                    value: bootstrap.stats.contacts,
                    target: 'customers',
                  },
                  {
                    label: 'Items & services',
                    value: bootstrap.stats.items,
                    target: 'items',
                  },
                  {
                    label: 'Documents',
                    value: bootstrap.stats.documents,
                    target: 'invoice',
                  },
                ].filter(k => allowed(k.target)).map((k) => (
                  <Pressable
                    key={k.label}
                    onPress={() => navigate(k.target)}
                    style={{ flex: 1, minWidth: 180 }}
                  >
                    <Panel>
                      <View
                        style={[ui.row, { justifyContent: 'space-between' }]}
                      >
                        <Text style={{ color: colors.textSecondary }}>
                          {k.label}
                        </Text>
                        <ArrowUpRight size={16} color={colors.primary} />
                      </View>
                      <Text style={[ui.title, { color: colors.textPrimary }]}>
                        {k.value}
                      </Text>
                    </Panel>
                  </Pressable>
                ))}
              </View>
              <Notice text="This native accounting workspace keeps its own records. Existing subscription billing, collections, and expense modules are separate; their historical records are not automatically posted here." />
            </>
          )}
          {module === 'reports' && report && 'trial' in report && (
            <ReportsView
              report={report}
              onDocument={(id, kind) => { if (kind === 'connections') { if (allowed('connections')) navigate('connections'); } else if (allowed(kind)) void openDocument(id); }}
            />
          )}
          {module === 'banking' && (
            <>
              <View style={ui.wrap}>
                {accounts
                  .filter((a) => a.is_cash)
                  .map((a) => (
                    <Panel key={a.code} style={{ minWidth: 210, flex: 1 }}>
                      <Text style={{ color: colors.textSecondary }}>
                        {a.name}
                      </Text>
                      <Text style={[ui.title, { color: colors.textPrimary }]}>
                        {api.money(a.balance)}
                      </Text>
                      <Text
                        style={{ color: colors.textTertiary, fontSize: 11 }}
                      >
                        Recorded ledger balance
                      </Text>
                    </Panel>
                  ))}
              </View>
              <View style={ui.row}>
                <Action
                  label="Import statement CSV"
                  disabled={!allowed('banking', 'manage')}
                  onPress={() => setEntity({ type: 'bank' })}
                />
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  Match statement rows to recorded payments.
                </Text>
              </View>
            </>
          )}
          {module === 'recurring' && (
            <>
              <Notice text="Create a recurring profile from any posted invoice, bill, or expense using “Make recurring”. Generation runs when you choose the button below; new documents remain drafts." />
              <View style={ui.row}>
                <Action
                  label="Generate due drafts"
                  disabled={busy || !allowed('recurring', 'generate') || !['invoice', 'bill', 'expense'].some(k => allowed(k) && allowed(k, 'manage'))}
                  onPress={() =>
                    void mutate(async () => {
                      const r = await api.post('/recurring/run');
                      setNotice(`${r.count} due draft(s) generated.`);
                    }, 'Due drafts generated')
                  }
                />
              </View>
            </>
          )}
          {module === 'accounts' && (
            <Notice text="Select an account to view its ledger. Amounts use debit minus credit, so income, liability, and equity accounts normally show negative balances." />
          )}
          {columns.length > 0 && (
            <>
              <View testID="books-record-filters" style={[ui.wrap, { alignItems: 'flex-end', flexShrink: 0 }]}>
                <View style={{ flexGrow: 1, flexBasis: 240, minWidth: 180, maxWidth: 480 }}>
                  <Field
                    label={`Search ${title.toLowerCase()}`}
                    value={search}
                    onChange={(v) => {
                      setSearch(v);
                      setPage(1);
                    }}
                    placeholder="Name, number, or reference…"
                  />
                </View>
                {['payments', 'recurring'].includes(module) && (
                  <View style={{ width: 200, maxWidth: '100%' }}><Select
                    label="Transaction type"
                    value={transactionType}
                    options={
                      module === 'payments'
                        ? [
                            { value: 'all', label: 'All payments' },
                            { value: 'invoice', label: 'Payments received' },
                            { value: 'bill', label: 'Payments made' },
                          ]
                        : [
                            {
                              value: 'all',
                              label: 'All recurring transactions',
                            },
                            { value: 'invoice', label: 'Recurring invoices' },
                            { value: 'bill', label: 'Recurring bills' },
                            { value: 'expense', label: 'Recurring expenses' },
                          ]
                    }
                    onChange={setTransactionType}
                  /></View>
                )}
                {isDoc && (
                  <View style={{ width: 170, maxWidth: '100%' }}><Select
                    label="Status"
                    value={status}
                    options={[
                      { value: '', label: 'All statuses' },
                      ...[
                        'draft',
                        'posted',
                        'void',
                        ...([
                          'invoice',
                          'bill',
                          'credit_note',
                          'vendor_credit',
                        ].includes(module)
                          ? ['unpaid', 'paid', 'overdue']
                          : []),
                      ].map((value) => ({
                        value,
                        label: value.charAt(0).toUpperCase() + value.slice(1),
                      })),
                    ]}
                    onChange={(v) => {
                      setStatus(v);
                      setPage(1);
                    }}
                  /></View>
                )}
              </View>
              <Table
                columns={columns}
                rows={filtered}
                onRow={onRow}
                empty={
                  search
                    ? 'No matching records.'
                    : 'No records yet. Create your first record to get started.'
                }
              />
              {isDoc && (
                <View style={[ui.row, { justifyContent: 'space-between' }]}>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    {total} records · Page {page} · 50 per page
                  </Text>
                  <View style={ui.row}>
                    <Action
                      label="Previous"
                      secondary
                      disabled={page === 1}
                      onPress={() => setPage((p) => p - 1)}
                    />
                    <Action
                      label="Next"
                      secondary
                      disabled={page * 50 >= total}
                      onPress={() => setPage((p) => p + 1)}
                    />
                  </View>
                </View>
              )}
              {!isDoc && (
                <Text style={{ color: colors.textTertiary, fontSize: 11 }}>
                  Showing {filtered.length} records
                  {['payments', 'journals'].includes(module)
                    ? ' (up to the latest 500)'
                    : module === 'activity'
                      ? ' (latest 200)'
                      : module === 'banking' || module === 'time'
                        ? ' (up to the latest 1,000)'
                        : ''}
                  .
                </Text>
              )}
            </>
          )}
          {module === 'connections' && <FinanceConnections />}
          {module === 'expense' && allowed('connections') && <Notice text="Approved operating expenses and reimbursements from the founder console appear in Finance connections and financial reports. This list contains expenses entered directly in Books." />}
          {module === 'documents' && <AttachmentsPanel />}
          {module === 'settings' && (
            <Panel>
              <Text style={[ui.title, { color: colors.textPrimary }]}>
                {bootstrap.settings.organization_name}
              </Text>
              <Text style={{ color: colors.textSecondary, lineHeight: 24 }}>
                {bootstrap.settings.address || 'Add your organization address'}
                {'\n'}GSTIN: {bootstrap.settings.gstin || 'Not configured'}
                {'\n'}State code:{' '}
                {bootstrap.settings.state_code || 'Not configured'}
                {'\n'}Currency: INR
              </Text>
              <View style={ui.row}>
                <Action
                  label="Edit organization"
                  disabled={!allowed('settings', 'manage')}
                  onPress={() =>
                    setEntity({ type: 'settings', initial: bootstrap.settings })
                  }
                />
              </View>
              <Notice text="Tax percentages are chosen per item or document. GST filing, e-invoice registration, live bank feeds, payment gateways, and email delivery need separate service integrations." />
            </Panel>
          )}
        </>
      )}
    </View>
  );
  return (
    <View style={[st.root, { backgroundColor: colors.background }]} onLayout={event => { if (event.nativeEvent.layout.width > 0) setAvailableWidth(event.nativeEvent.layout.width); }}>
      <View style={st.workspace}>
        {wide && !navCollapsed && <ScrollView
          accessibilityLabel="Books navigation"
          showsVerticalScrollIndicator
          style={[st.nav, { borderColor: colors.border }]}
          contentContainerStyle={{ padding: 12, paddingBottom: 28, gap: 18 }}
        >
          {visibleGroups.map((g) => (
            <View
              key={g.label}
              style={
                { gap: 3 }
              }
            >
              {wide && (
                <Text
                  style={{
                    color: colors.textTertiary,
                    fontSize: 9,
                    fontWeight: '700',
                    letterSpacing: 1,
                    paddingLeft: 10,
                    marginBottom: 6,
                  }}
                >
                  {g.label}
                </Text>
              )}
              {g.items.map(([key, label, Icon]: any) => (
                <Pressable
                  key={key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: key === module }}
                  onPress={() => navigate(key)}
                  style={[
                    ui.row,
                    {
                      paddingHorizontal: 11,
                      paddingVertical: 10,
                      borderRadius: 8,
                      backgroundColor:
                        key === module ? colors.primary + '18' : 'transparent',
                      minWidth: 0,
                    },
                  ]}
                >
                  <Icon
                    size={15}
                    color={
                      key === module ? colors.primary : colors.textSecondary
                    }
                  />
                  <Text
                    style={{
                      color:
                        key === module ? colors.primary : colors.textSecondary,
                      fontSize: 12,
                      fontWeight: key === module ? '700' : '500',
                    }}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
          ))}
        </ScrollView>}
        <ScrollView
          ref={contentRef}
          accessibilityLabel="Books content"
          showsVerticalScrollIndicator
          nestedScrollEnabled
          style={st.content}
          contentContainerStyle={{
            flexGrow: 1,
            padding: compact ? 14 : 22,
            paddingBottom: 40,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {allowedModules.length ? main : <Panel>
            <Text style={[ui.title, { color: colors.textPrimary }]}>Books access has not been assigned</Text>
            <Text style={{ color: colors.textSecondary, lineHeight: 23 }}>Ask the SuperAdmin to select the modules and actions you need. Your account has no access to accounting records yet.</Text>
            <Action label="Check my access" onPress={() => { void refreshSessionProfile(); }} />
          </Panel>}
        </ScrollView>
      </View>
      {detail && (
        <DocumentDetail
          document={detail}
          onClose={() => setDetail(null)}
          onRefresh={refreshDetail}
          onEdit={() => {
            setEditor({ kind: detail.kind, document: detail });
            setDetail(null);
          }}
          onEntity={(type) => setEntity({ type })}
          onConverted={(d) => {
            setDetail(null);
            setEditor({ kind: d.kind, document: d });
          }}
        />
      )}
      {editor && (
        <DocumentEditor
          {...editor}
          contacts={contacts}
          items={items}
          accounts={accounts}
          onClose={() => setEditor(null)}
          onSaved={(d) => {
            setEditor(null);
            setNotice(`${d.number} saved as draft.`);
            cache.current = null;
            void load();
            void openDocument(d.id);
          }}
        />
      )}
      {entity && (
        <EntityEditor
          {...entity}
          contacts={contacts}
          items={items}
          accounts={accounts}
          payments={payments}
          projects={projects}
          document={detail || undefined}
          onClose={() => setEntity(null)}
          onSaved={() => {
            setEntity(null);
            setNotice('Saved successfully.');
            void refreshDetail().catch((e) => setError(api.message(e)));
          }}
        />
      )}
      {journal && (
        <JournalEditor
          accounts={accounts}
          onClose={() => setJournal(false)}
          onSaved={() => {
            setJournal(false);
            setNotice('Journal posted.');
            cache.current = null;
            void load();
          }}
        />
      )}
      {journalDetail && (
        <Dialog
          title={journalDetail.reference}
          onClose={() => setJournalDetail(null)}
        >
          <Text style={{ color: colors.textSecondary }}>
            {journalDetail.date} · {journalDetail.source}
          </Text>
          <Text style={{ color: colors.textSecondary }}>
            {journalDetail.notes}
          </Text>
          <Table
            rows={journalDetail.lines}
            columns={[
              { key: 'account_code', label: 'Code', width: 100 },
              { key: 'name', label: 'Account', width: 260 },
              { key: 'debit', label: 'Debit', render: (r) => value(r.debit) },
              {
                key: 'credit',
                label: 'Credit',
                render: (r) => value(r.credit),
              },
            ]}
          />
        </Dialog>
      )}
      {ledger && (
        <Dialog
          title={`${ledger.account.code} · ${ledger.account.name}`}
          onClose={() => setLedger(null)}
        >
          <Notice
            text={`Ledger entries for ${dates.from} to ${dates.to}. Up to 2,000 entries are shown.`}
          />
          <Table
            rows={ledger.rows}
            columns={[
              {
                key: 'date',
                label: 'Date',
                render: (r: any) => dateValue(r.date),
              },
              { key: 'reference', label: 'Reference', width: 280 },
              {
                key: 'debit',
                label: 'Debit',
                render: (r: any) => value(r.debit),
              },
              {
                key: 'credit',
                label: 'Credit',
                render: (r: any) => value(r.credit),
              },
            ]}
          />
        </Dialog>
      )}
      {confirm && (
        <Dialog
          title={confirm.label}
          onClose={() => setConfirm(null)}
          busy={busy}
          footer={
            <>
              <Action
                label="Cancel"
                secondary
                onPress={() => setConfirm(null)}
                disabled={busy}
              />
              <Action
                label={confirm.label}
                onPress={() => void mutate(confirm.run, 'Updated successfully')}
                disabled={busy}
              />
            </>
          }
        >
          <Text style={{ color: colors.textSecondary, lineHeight: 23 }}>
            {confirm.text}
          </Text>
          {error && <Notice error text={error} />}
        </Dialog>
      )}
    </View>
  );
}
const st = StyleSheet.create({
  root: { flex: 1, minHeight: 0, minWidth: 0, overflow: 'hidden' },
  workspace: { flex: 1, minHeight: 0, minWidth: 0, flexDirection: 'row', overflow: 'hidden' },
  nav: { width: 176, maxWidth: 176, flexGrow: 0, flexShrink: 0, minHeight: 0, borderRightWidth: 1 },
  content: { flex: 1, minHeight: 0, minWidth: 0 },
  moduleHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14 },
  moduleTitle: { fontSize: 26, fontWeight: '700', letterSpacing: -0.7, lineHeight: 32 },
  navToggle: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 8 },
});
