import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "../../contexts/ThemeContext";
import { useBooksAccess } from "./BooksCompanyContext";
import * as api from "../../api/books";
import { Action, Dialog, Notice, Panel, Table, ui } from "./BooksUi";
type Summary = {
  source_type: string;
  label: string;
  eligible: number;
  unlinked: number;
  unlinked_amount: string;
};
type Link = {
  source_type: string;
  source_id: string;
  component: string;
  journal_id: string;
  reference: string;
  date: string;
  state: string;
  amount: string;
  notes: string;
};
type Overview = { summary: Summary[]; rows: Link[]; limit: number };
const sourceLabels: Record<string, string> = {
  expense: "Expense",
  billing: "Client billing",
  collection: "Collection",
  payroll: "Payroll",
};
export default function FinanceConnections() {
  const { colors } = useTheme(),
    { can, isFounder } = useBooksAccess(),
    router = useRouter();
  const [data, setData] = useState<Overview | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [confirm, setConfirm] = useState(false),
    [journal, setJournal] = useState<any>(null);
  const lock = useRef(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await api.get("/connections"));
    } catch (e) {
      setError(api.message(e));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const pending =
    data?.summary.reduce((sum, row) => sum + row.unlinked, 0) || 0;
  const sync = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await api.post<Overview & { imported: number }>(
        "/connections/import"
      );
      setData(result);
      setConfirm(false);
      setNotice(
        `${result.imported} existing record(s) connected. New approvals, payments and cancellations connect automatically.`
      );
    } catch (e) {
      setError(api.message(e));
    } finally {
      setBusy(false);
      lock.current = false;
    }
  };
  return (
    <View style={{ gap: 18 }}>
      <Notice text="Platform expenses, client billing, business collections and payroll feed Nexsyrus Books automatically. Bills, invoices and payments created within Books already use the same ledger. Nexmaxx keeps its own books." />
      {!!error && <Notice error text={error} />}
      {!!notice && <Notice text={notice} />}
      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        data && (
          <>
            <View style={ui.wrap}>
              {data.summary.map((row) => (
                <Panel key={row.source_type} style={{ flex: 1, minWidth: 200 }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    {row.label}
                  </Text>
                  <Text style={[ui.title, { color: colors.textPrimary }]}>
                    {row.eligible - row.unlinked} / {row.eligible} connected
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    {row.unlinked
                      ? `${row.unlinked} to import · ${api.money(
                          row.unlinked_amount
                        )}`
                      : "Up to date"}
                  </Text>
                </Panel>
              ))}
            </View>
            <View style={ui.row}>
              <Action
                label="Refresh connections"
                secondary
                disabled={busy}
                onPress={() => void load()}
              />
              {can("books.connections.sync") && (
                <Action
                  label="Review existing records"
                  disabled={busy || !pending}
                  onPress={() => {
                    setError("");
                    setConfirm(true);
                  }}
                />
              )}
            </View>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 12,
                lineHeight: 20,
              }}
            >
              Expenses post when approved and clear when paid. Payroll posts
              gross wages and deductions, then clears net salaries when paid.
              Tax invoices record receivables; linked receipts settle them.
              Standalone non-GST receipts and collections record income.
            </Text>
            <Text style={[ui.title, { color: colors.textPrimary }]}>
              Connected activity
            </Text>
            <Table
              rows={data.rows}
              empty="No connected records yet. Approve an expense or review existing records to get started."
              onRow={
                can("books.journals.view")
                  ? (row) => {
                      setError("");
                      void api
                        .get(`/journals/${row.journal_id}`)
                        .then(setJournal)
                        .catch((e) => setError(api.message(e)));
                    }
                  : undefined
              }
              columns={[
                {
                  key: "date",
                  label: "Date",
                  width: 110,
                  render: (row) => String(row.date).slice(0, 10),
                },
                { key: "reference", label: "Reference", width: 300 },
                {
                  key: "source_type",
                  label: "Source",
                  width: 140,
                  render: (row) =>
                    sourceLabels[row.source_type] || row.source_type,
                },
                {
                  key: "component",
                  label: "Entry",
                  width: 120,
                  render: (row) =>
                    row.component === "payment" ? "Payment" : "Accrual",
                },
                {
                  key: "amount",
                  label: "Amount",
                  width: 150,
                  render: (row) => api.money(row.amount),
                },
                {
                  key: "state",
                  label: "Books status",
                  width: 120,
                  render: (row) =>
                    row.state === "posted" ? "Posted" : "Reversed",
                },
              ]}
            />
            <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
              Latest {data.limit} connections. All entries are included in the
              ledger and financial reports.
            </Text>
            {isFounder && (
              <View style={ui.row}>
                <Action
                  label="Expense workspace"
                  secondary
                  onPress={() => router.push("/(app)/console/expenses" as any)}
                />
                <Action
                  label="Client billing"
                  secondary
                  onPress={() => router.push("/(app)/console/billing" as any)}
                />
              </View>
            )}
          </>
        )
      )}
      {confirm && data && (
        <Dialog
          title="Connect existing financial records"
          busy={busy}
          onClose={() => setConfirm(false)}
          footer={
            <Action
              label={busy ? "Connecting…" : "Connect next 200 records"}
              disabled={busy}
              onPress={() => void sync()}
            />
          }
        >
          <Notice
            text={`${pending} eligible historical records remain. This adds their accounting entries to Nexsyrus Books, using the original transaction dates. Review any opening balances or manual entries covering these records before importing.`}
          />
          <Text style={{ color: colors.textSecondary, lineHeight: 21 }}>
            Each source connects once. Repeat imports skip connected records.
            Importing does not send invoices or transfer money. If a client
            payment already has a tax invoice, record a receipt linked to that
            invoice instead of a separate collection or standalone receipt.
          </Text>
          <Table
            rows={data.summary.filter((row) => row.unlinked)}
            columns={[
              { key: "label", label: "Source", width: 230 },
              { key: "unlinked", label: "Records" },
              {
                key: "unlinked_amount",
                label: "Source value",
                width: 180,
                render: (row) => api.money(row.unlinked_amount),
              },
            ]}
          />
          {!!error && <Notice error text={error} />}
        </Dialog>
      )}
      {journal && (
        <Dialog title={journal.reference} onClose={() => setJournal(null)}>
          <Text style={{ color: colors.textSecondary }}>
            {String(journal.date).slice(0, 10)} · {journal.source}
          </Text>
          <Text style={{ color: colors.textSecondary }}>{journal.notes}</Text>
          <Table
            rows={journal.lines}
            columns={[
              { key: "account_code", label: "Account" },
              { key: "name", label: "Name", width: 260 },
              {
                key: "debit",
                label: "Debit",
                render: (row) => api.money(row.debit),
              },
              {
                key: "credit",
                label: "Credit",
                render: (row) => api.money(row.credit),
              },
            ]}
          />
        </Dialog>
      )}
    </View>
  );
}
