import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Image,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import {
  Receipt,
  Plus,
  BookOpen,
  RefreshCw,
  ArrowUpRight,
  Clock3,
  Wallet,
  Paperclip,
  CheckCircle2,
  Search,
} from "lucide-react-native";
import { ScreenHeader } from "../../components/ui/ScreenHeader";
import { useTheme } from "../../contexts/ThemeContext";
import { useFounderAuth } from "../../hooks/useFounderAuth";
import { useExpenses } from "../../hooks/useExpenses";
import * as founderDb from "../../services/founderSupabase";
import { founderApi } from "../../services/apiService";
import type { ExpenseCategory, ExpenseRow } from "../../types/founder";
import { ConsoleAmbientBackground, bottomTabPad } from "./founderUi";
import {
  Action,
  Dialog,
  Field,
  FormRow,
  Notice,
  Select,
} from "../books/BooksUi";
import {
  categories,
  categoryLabel,
  expenseDate,
  expenseInputAmount,
  expenseSummary,
  filterExpenses,
  indiaToday,
} from "./expenseModel";

const statusColors = {
  PENDING: "#B77910",
  APPROVED: "#059669",
  REJECTED: "#E05268",
};
const statusLabels = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};
const money = (amount: number) => founderDb.formatInr(amount, 2);
const errorMessage = (e: any) =>
  e?.response?.data?.details ||
  e?.response?.data?.error ||
  e?.message ||
  "Unable to complete this action.";

function Status({ row }: { row: ExpenseRow }) {
  const { colors } = useTheme();
  const color = statusColors[row.status];
  return (
    <View style={{ gap: 6, alignItems: "flex-start" }}>
      <View style={[s.badge, { backgroundColor: color + "16" }]}>
        <View style={[s.dot, { backgroundColor: color }]} />
        <Text style={{ color, fontSize: 12, fontWeight: "700" }}>
          {statusLabels[row.status]}
        </Text>
      </View>
      {row.status === "APPROVED" && (
        <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
          {row.paid_at ? "Paid" : "To reimburse"}
        </Text>
      )}
    </View>
  );
}

export default function ExpensesScreen({
  approvalsOnly = false,
}: {
  approvalsOnly?: boolean;
}) {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const compact = width < 900;
  const { founder, canApproveReject, isApprover, hasFounderAccess } =
    useFounderAuth();
  const { expenses, loading, error, refresh } = useExpenses();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(approvalsOnly ? "PENDING" : "ALL");
  const [category, setCategory] = useState("ALL");
  const [period, setPeriod] = useState("all");
  const [accounting, setAccounting] = useState("all");
  const [detail, setDetail] = useState<ExpenseRow | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [entryDate, setEntryDate] = useState(indiaToday());
  const [entryCategory, setEntryCategory] = useState<ExpenseCategory>("MISC");
  const [picked, setPicked] = useState<{ uri: string; mime: string } | null>(
    null
  );
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [reject, setReject] = useState<ExpenseRow | null>(null);
  const [reason, setReason] = useState("");
  const [payment, setPayment] = useState<ExpenseRow | null>(null);
  const [paymentAccount, setPaymentAccount] = useState("1010");
  const [receipt, setReceipt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const canCreate = hasFounderAccess && !isApprover && !approvalsOnly;
  useEffect(() => {
    if (approvalsOnly && !canApproveReject)
      router.replace("/(app)/console/expenses" as any);
  }, [approvalsOnly, canApproveReject]);
  const month = indiaToday().slice(0, 7);
  // Totals reflect category/period, independently of the selected status and search.
  const scoped = useMemo(
    () =>
      filterExpenses(expenses, {
        search: "",
        status: "ALL",
        category,
        period,
        month,
      }),
    [expenses, category, period, month]
  );
  const summary = useMemo(() => expenseSummary(scoped), [scoped]);
  const rows = useMemo(
    () =>
      filterExpenses(expenses, {
        search,
        status,
        category,
        period,
        month,
      }).filter(
        (row) =>
          accounting === "all" ||
          (accounting === "linked"
            ? row.books_state === "posted"
            : row.status === "APPROVED" && row.books_state !== "posted")
      ),
    [expenses, search, status, category, period, month, accounting]
  );
  const missingLinks = expenses.filter(
    (row) => row.status === "APPROVED" && row.books_state !== "posted"
  ).length;
  const canOpenBooks = hasFounderAccess && !isApprover;
  const openBooks = () =>
    router.push("/(app)/books?module=connections&company=nexsyrus" as any);

  const run = async (fn: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setActionError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setActionError(errorMessage(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const openCreate = () => {
    setActionError("");
    setNotice("");
    setCreateOpen(true);
  };
  const closeCreate = () => {
    setCreateOpen(false);
    setCreatedId(null);
    setTitle("");
    setDescription("");
    setAmount("");
    setPicked(null);
    setEntryDate(indiaToday());
    setEntryCategory("MISC");
    setActionError("");
  };
  const save = () =>
    run(async () => {
      if (!title.trim()) throw new Error("Enter an expense title.");
      const value = expenseInputAmount(amount);
      const date = new Date(`${entryDate}T00:00:00Z`);
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(entryDate) ||
        Number.isNaN(date.getTime()) ||
        date.toISOString().slice(0, 10) !== entryDate
      )
        throw new Error("Enter the expense date as YYYY-MM-DD.");
      // Preserve the created record on an upload failure so retry cannot duplicate the expense.
      let id = createdId;
      if (!id) {
        const row = await founderDb.createExpense({
          title: title.trim(),
          description: description.trim(),
          amount: value,
          category: entryCategory,
          expense_date: entryDate,
          receipt_url: null,
          created_by_founder_id: founder?.id || null,
        });
        id = row.id;
        setCreatedId(id);
      }
      if (picked)
        await founderDb.uploadExpenseReceipt(
          picked.uri,
          founder?.id || "admin",
          id,
          picked.mime
        );
      closeCreate();
      setNotice(
        "Expense submitted for approval. It will post to Books when approved."
      );
      await refresh();
    });
  const viewReceipt = (row: ExpenseRow) =>
    run(async () => {
      const result = await founderApi.getReceiptUrl(row.id);
      if (!result?.signedUrl)
        throw new Error("The receipt could not be opened.");
      setReceipt(result.signedUrl);
    });
  const approve = (row: ExpenseRow) =>
    run(async () => {
      await founderDb.approveExpense(row.id, founder?.id || "");
      setDetail(null);
      setNotice("Expense approved and posted to Books.");
      await refresh();
    });
  const metrics = [
    {
      label: "Approved spend",
      value: money(summary.approved),
      hint: "Recognized in your books",
      icon: Wallet,
      color: "#7C6FE8",
    },
    {
      label: "Awaiting approval",
      value: money(summary.pending),
      hint: "Pending review",
      icon: Clock3,
      color: "#C48A21",
    },
    {
      label: "To reimburse",
      value: money(summary.unpaid),
      hint: "Approved, awaiting payment",
      icon: ArrowUpRight,
      color: "#279C87",
    },
    {
      label: "Missing receipts",
      value: String(summary.receipts),
      hint: "Active entries without a receipt",
      icon: Paperclip,
      color: "#4E92CA",
    },
  ];
  const tabs = [
    ["ALL", "All expenses"],
    ["PENDING", "Pending"],
    ["APPROVED", "Approved"],
    ["UNPAID", "To reimburse"],
    ["REJECTED", "Rejected"],
  ];
  const panel = { backgroundColor: colors.surface, borderColor: colors.border };
  const cellText = { color: colors.textPrimary, fontSize: 13 };
  const actions = (row: ExpenseRow) => (
    <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
      {canApproveReject && row.status === "PENDING" && (
        <>
          <Action
            label="Approve"
            disabled={busy}
            onPress={() => void approve(row)}
          />
          <Action
            label="Reject"
            secondary
            disabled={busy}
            onPress={() => {
              setActionError("");
              setReject(row);
              setReason("");
            }}
          />
        </>
      )}
      {canApproveReject && row.status === "APPROVED" && !row.paid_at && (
        <Action
          label="Record payment"
          secondary
          disabled={busy}
          onPress={() => {
            setActionError("");
            setPayment(row);
            setPaymentAccount("1010");
          }}
        />
      )}
    </View>
  );

  return (
    <ConsoleAmbientBackground>
      <ScreenHeader
        title={approvalsOnly ? "Expense approvals" : "Expenses"}
        subtitle="Finance & accounting"
      />
      <ScrollView
        contentContainerStyle={{
          paddingTop: 8,
          paddingBottom: bottomTabPad + 24,
          gap: 20,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={[
            s.heading,
            compact && { flexDirection: "column", alignItems: "stretch" },
          ]}
        >
          <View style={{ flex: 1, gap: 7 }}>
            <Text style={[s.eyebrow, { color: colors.primary }]}>
              EXPENSE WORKSPACE
            </Text>
            <Text style={[s.title, { color: colors.textPrimary }]}>
              {approvalsOnly
                ? "Keep approvals moving."
                : "Every expense, accounted for."}
            </Text>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 13,
                lineHeight: 21,
              }}
            >
              Track spending, review receipts and settle reimbursements with
              Books.
            </Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {canOpenBooks && (
              <Action
                label="Open Books"
                secondary
                icon={<BookOpen size={15} color={colors.primary} />}
                onPress={openBooks}
              />
            )}
            {canCreate && (
              <Action
                label="New expense"
                icon={<Plus size={16} color="#FFF" />}
                onPress={openCreate}
              />
            )}
          </View>
        </View>
        <View style={s.metrics}>
          {metrics.map(({ label, value, hint, icon: Icon, color }) => (
            <View
              key={label}
              style={[s.metric, panel, compact && { flexBasis: "46%" }]}
            >
              <View style={s.metricHead}>
                <Text style={[s.metricLabel, { color: colors.textSecondary }]}>
                  {label}
                </Text>
                <View style={[s.metricIcon, { backgroundColor: color + "16" }]}>
                  <Icon size={16} color={color} />
                </View>
              </View>
              <Text style={[s.metricValue, { color: colors.textPrimary }]}>
                {loading && !expenses.length ? "—" : value}
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 11,
                  lineHeight: 17,
                }}
              >
                {hint}
              </Text>
            </View>
          ))}
        </View>
        <View
          style={[
            s.connection,
            {
              backgroundColor: isDark ? "#172726" : "#EEF8F5",
              borderColor: isDark ? "#29433D" : "#D3EBE2",
            },
          ]}
        >
          <CheckCircle2 size={19} color="#279C87" />
          <View style={{ flex: 1, gap: 3, minWidth: compact ? 200 : 0 }}>
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: 13,
                fontWeight: "700",
              }}
            >
              {error
                ? "Books connection could not be verified"
                : "Connected to Nexsyrus Books"}
            </Text>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 12,
                lineHeight: 19,
              }}
            >
              {error
                ? "Refresh to check the connection and your expenses."
                : missingLinks
                ? `${missingLinks} approved expense(s) still need importing. Review them in Finance connections.`
                : "Approvals post expense payables. Recorded payments clear the balance."}
            </Text>
          </View>
          {canOpenBooks && (
            <Action label="View connections" secondary onPress={openBooks} />
          )}
        </View>
        {!!error && <Notice error text={error} />}
        {!!actionError && !createOpen && !reject && !payment && (
          <Notice error text={actionError} />
        )}
        {!!notice && <Notice text={notice} />}
        <View style={[s.listPanel, panel]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, padding: 16 }}
          >
            {tabs.map(([key, label]) => (
              <Pressable
                key={key}
                accessibilityRole="tab"
                accessibilityState={{ selected: status === key }}
                onPress={() => setStatus(key)}
                style={[
                  s.tab,
                  {
                    backgroundColor:
                      status === key ? colors.primary + "15" : "transparent",
                    borderColor:
                      status === key ? colors.primary + "35" : "transparent",
                  },
                ]}
              >
                <Text
                  style={{
                    color:
                      status === key ? colors.primary : colors.textSecondary,
                    fontSize: 12,
                    fontWeight: "700",
                  }}
                >
                  {label}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                  {key === "ALL"
                    ? scoped.length
                    : scoped.filter((r) =>
                        key === "UNPAID"
                          ? r.status === "APPROVED" && !r.paid_at
                          : r.status === key
                      ).length}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={{ paddingHorizontal: 18, gap: 14 }}>
            <FormRow>
              <Field
                label="Search expenses"
                value={search}
                onChange={setSearch}
                placeholder="Title, description or category"
              />
              <Select
                label="Category"
                value={category}
                options={[
                  { value: "ALL", label: "All categories" },
                  ...categories,
                ]}
                onChange={setCategory}
              />
              <Select
                label="Period"
                value={period}
                options={[
                  { value: "all", label: "All time" },
                  { value: "month", label: "This month" },
                ]}
                onChange={setPeriod}
              />
              <Select
                label="Books status"
                value={accounting}
                options={[
                  { value: "all", label: "All entries" },
                  { value: "linked", label: "Posted to Books" },
                  { value: "unlinked", label: "Needs import" },
                ]}
                onChange={setAccounting}
              />
            </FormRow>
            <View style={[s.heading, { marginBottom: 4 }]}>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                {rows.length} {rows.length === 1 ? "expense" : "expenses"} ·{" "}
                {period === "all" ? "All time" : "This month"}
              </Text>
              <Action
                label="Refresh"
                secondary
                disabled={busy || loading}
                icon={<RefreshCw size={13} color={colors.textSecondary} />}
                onPress={() => void refresh()}
              />
            </View>
          </View>
          {!compact && (
            <View
              style={[
                s.tableHead,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                },
              ]}
            >
              {[
                ["Expense", 3],
                ["Category / date", 1.5],
                ["Amount", 1.3],
                ["Status", 1.2],
                ["Books", 1.4],
              ].map(([label, flex]) => (
                <Text
                  key={label}
                  style={{
                    flex: Number(flex),
                    color: colors.textSecondary,
                    fontSize: 11,
                    fontWeight: "700",
                  }}
                >
                  {label}
                </Text>
              ))}
            </View>
          )}
          {loading && !expenses.length ? (
            <View style={s.empty}>
              <ActivityIndicator color={colors.primary} />
              <Text style={{ color: colors.textSecondary }}>
                Loading expenses…
              </Text>
            </View>
          ) : !rows.length ? (
            <View style={s.empty}>
              <View
                style={[
                  s.emptyIcon,
                  { backgroundColor: colors.primary + "12" },
                ]}
              >
                <Search size={28} color={colors.primary} />
              </View>
              <Text
                style={{
                  color: colors.textPrimary,
                  fontSize: 18,
                  fontWeight: "700",
                }}
              >
                {expenses.length
                  ? "No matching expenses"
                  : error
                  ? "Expenses could not be loaded"
                  : "Your expenses start here"}
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  textAlign: "center",
                  lineHeight: 21,
                  maxWidth: 360,
                }}
              >
                {expenses.length
                  ? "Try another search or clear your filters."
                  : error
                  ? "Refresh to try again."
                  : "Add an expense and receipt. Once approved, it appears in your books."}
              </Text>
              {expenses.length ? (
                <Action
                  label="Clear filters"
                  secondary
                  onPress={() => {
                    setSearch("");
                    setStatus("ALL");
                    setCategory("ALL");
                    setPeriod("all");
                    setAccounting("all");
                  }}
                />
              ) : canCreate && !error ? (
                <Action label="Add an expense" onPress={openCreate} />
              ) : null}
            </View>
          ) : (
            rows.map((row) => (
              <Pressable
                key={row.id}
                accessibilityRole="button"
                accessibilityLabel={`View expense ${row.title}`}
                onPress={() => {
                  setActionError("");
                  setDetail(row);
                }}
                style={({ pressed }) => [
                  s.expenseRow,
                  {
                    borderColor: colors.border,
                    backgroundColor: pressed
                      ? colors.primary + "08"
                      : "transparent",
                  },
                  compact && { flexDirection: "column", gap: 14 },
                ]}
              >
                <View
                  style={{
                    flex: compact ? undefined : 3,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    minWidth: 0,
                  }}
                >
                  <View
                    style={[
                      s.rowIcon,
                      { backgroundColor: colors.primary + "10" },
                    ]}
                  >
                    <Receipt size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, gap: 5 }}>
                    <Text
                      numberOfLines={1}
                      style={[cellText, { fontWeight: "700" }]}
                    >
                      {row.title}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={{ color: colors.textSecondary, fontSize: 11 }}
                    >
                      {row.description ||
                        (row.receipt_url
                          ? "Receipt attached"
                          : "No receipt attached")}
                    </Text>
                  </View>
                  {compact && (
                    <Text style={[cellText, { fontWeight: "800" }]}>
                      {money(Number(row.amount))}
                    </Text>
                  )}
                </View>
                <View style={{ flex: compact ? undefined : 1.5, gap: 5 }}>
                  <Text style={cellText}>{categoryLabel(row.category)}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                    {expenseDate(row)}
                  </Text>
                </View>
                {!compact && (
                  <Text style={[cellText, { flex: 1.3, fontWeight: "700" }]}>
                    {money(Number(row.amount))}
                  </Text>
                )}
                <View style={{ flex: compact ? undefined : 1.2 }}>
                  <Status row={row} />
                </View>
                <View
                  style={{
                    flex: compact ? undefined : 1.4,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <View
                    style={[
                      s.dot,
                      {
                        backgroundColor:
                          row.books_state === "posted"
                            ? "#279C87"
                            : colors.textSecondary,
                      },
                    ]}
                  />
                  <Text
                    style={{
                      color:
                        row.books_state === "posted"
                          ? "#279C87"
                          : colors.textSecondary,
                      fontSize: 11,
                    }}
                  >
                    {row.books_state === "posted"
                      ? "Posted to Books"
                      : row.status === "APPROVED"
                      ? "Needs import"
                      : row.books_state === "reversed"
                      ? "Reversed"
                      : row.status === "REJECTED"
                      ? "Not posted"
                      : "After approval"}
                  </Text>
                </View>
              </Pressable>
            ))
          )}
        </View>
        <Text
          style={{ color: colors.textSecondary, fontSize: 11, lineHeight: 18 }}
        >
          Approved spend excludes rejected and pending entries. Summary cards
          follow category and period filters. Record payroll in Payroll to avoid
          adding the same salary twice.
        </Text>
      </ScrollView>
      {detail && (
        <Dialog
          title={detail.title}
          busy={busy}
          onClose={() => setDetail(null)}
          footer={actions(detail)}
        >
          <Text style={[s.detailAmount, { color: colors.textPrimary }]}>
            {money(Number(detail.amount))}
          </Text>
          <Status row={detail} />
          <Text style={{ color: colors.textSecondary, lineHeight: 22 }}>
            {categoryLabel(detail.category)} · {expenseDate(detail)}
            {detail.description ? `\n\n${detail.description}` : ""}
          </Text>
          {detail.rejection_reason && (
            <Notice
              error
              text={`Rejection reason: ${detail.rejection_reason}`}
            />
          )}
          <Notice
            text={
              detail.paid_at
                ? `Payment recorded on ${new Date(
                    detail.paid_at
                  ).toLocaleDateString("en-IN", {
                    timeZone: "Asia/Kolkata",
                  })} · ${detail.paid_account === "1000" ? "Cash" : "Bank"}.`
                : detail.status === "APPROVED"
                ? "Approved expenses are recorded as reimbursements payable until payment is recorded."
                : "This entry will post to Books after approval."
            }
          />
          {!!actionError && <Notice error text={actionError} />}
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {detail.receipt_url ? (
              <Action
                label="View receipt"
                secondary
                disabled={busy}
                onPress={() => void viewReceipt(detail)}
              />
            ) : (
              <Text style={{ color: colors.textSecondary }}>
                No receipt attached
              </Text>
            )}
            {canOpenBooks && detail.books_journal_id && (
              <Action
                label="View in Books"
                secondary
                onPress={() => {
                  setDetail(null);
                  openBooks();
                }}
              />
            )}
          </View>
        </Dialog>
      )}
      {createOpen && (
        <Dialog
          title={createdId ? "Finish receipt upload" : "New expense"}
          busy={busy}
          onClose={closeCreate}
          footer={
            <>
              <Action
                label={createdId ? "Keep expense without receipt" : "Cancel"}
                secondary
                disabled={busy}
                onPress={() => {
                  closeCreate();
                  void refresh();
                }}
              />
              <Action
                label={
                  busy
                    ? "Saving…"
                    : createdId
                    ? "Retry receipt upload"
                    : "Submit for approval"
                }
                disabled={busy}
                onPress={() => void save()}
              />
            </>
          }
        >
          <Notice
            text={
              createdId
                ? "The expense has been saved. Retry the receipt upload or keep the entry without a receipt."
                : "Approval records the expense in Nexsyrus Books. Reimbursement is recorded separately."
            }
          />
          {!!actionError && <Notice error text={actionError} />}
          {!createdId && (
            <>
              <Field
                label="Expense title"
                value={title}
                onChange={setTitle}
                placeholder="e.g. October cloud hosting"
              />
              <FormRow>
                <Field
                  label="Amount (INR)"
                  value={amount}
                  onChange={setAmount}
                  placeholder="0.00"
                />
                <Field
                  label="Expense date"
                  value={entryDate}
                  onChange={setEntryDate}
                  placeholder="YYYY-MM-DD"
                />
              </FormRow>
              <Select
                label="Expense category"
                value={entryCategory}
                options={categories}
                onChange={(v) => setEntryCategory(v as ExpenseCategory)}
              />
              <Field
                label="Description"
                value={description}
                onChange={setDescription}
                placeholder="Purpose, vendor or reference"
                multiline
              />
            </>
          )}
          <Action
            label={picked ? "Change receipt image" : "Attach receipt image"}
            secondary
            disabled={busy}
            icon={<Paperclip size={15} color={colors.primary} />}
            onPress={() =>
              void run(async () => {
                const result = await DocumentPicker.getDocumentAsync({
                  type: "image/*",
                  copyToCacheDirectory: true,
                });
                if (!result.canceled && result.assets?.[0]) {
                  const file = result.assets[0];
                  setPicked({
                    uri: file.uri,
                    mime: file.mimeType || "image/jpeg",
                  });
                }
              })
            }
          />
          {picked && (
            <Image
              source={{ uri: picked.uri }}
              style={{ width: "100%", height: 160, borderRadius: 12 }}
              resizeMode="contain"
            />
          )}
        </Dialog>
      )}
      {reject && (
        <Dialog
          title="Reject expense"
          busy={busy}
          onClose={() => setReject(null)}
          footer={
            <Action
              label="Confirm rejection"
              danger
              disabled={busy || !reason.trim()}
              onPress={() =>
                void run(async () => {
                  await founderDb.rejectExpense(
                    reject.id,
                    founder?.id || "",
                    reason.trim()
                  );
                  setReject(null);
                  setDetail(null);
                  setNotice("Expense rejected.");
                  await refresh();
                })
              }
            />
          }
        >
          <Text style={{ color: colors.textPrimary }}>
            {reject.title} · {money(Number(reject.amount))}
          </Text>
          <Field
            label="Rejection reason"
            value={reason}
            onChange={setReason}
            multiline
          />
          {!!actionError && <Notice error text={actionError} />}
        </Dialog>
      )}
      {payment && (
        <Dialog
          title="Record expense payment"
          busy={busy}
          onClose={() => setPayment(null)}
          footer={
            <Action
              label="Confirm payment recorded"
              disabled={busy}
              onPress={() =>
                void run(async () => {
                  await founderApi.markExpensePaid(payment.id, paymentAccount);
                  setPayment(null);
                  setDetail(null);
                  setNotice("Payment recorded in Books.");
                  await refresh();
                })
              }
            />
          }
        >
          <Text style={[s.detailAmount, { color: colors.textPrimary }]}>
            {money(Number(payment.amount))}
          </Text>
          <Text style={{ color: colors.textSecondary }}>{payment.title}</Text>
          <Notice text="Record a payment that has already been made. This clears the reimbursement payable in Books and does not transfer money." />
          <Select
            label="Paid from"
            value={paymentAccount}
            options={[
              { value: "1010", label: "Bank" },
              { value: "1000", label: "Cash" },
            ]}
            onChange={setPaymentAccount}
          />
          {!!actionError && <Notice error text={actionError} />}
        </Dialog>
      )}
      {receipt && (
        <Dialog title="Expense receipt" onClose={() => setReceipt(null)}>
          <Image
            source={{ uri: receipt }}
            style={{ width: "100%", height: 500 }}
            resizeMode="contain"
          />
        </Dialog>
      )}
    </ConsoleAmbientBackground>
  );
}
const s = StyleSheet.create({
  heading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  eyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 1.5 },
  title: {
    fontSize: 27,
    lineHeight: 35,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  metric: {
    flex: 1,
    minWidth: 140,
    borderRadius: 17,
    borderWidth: 1,
    padding: 18,
    gap: 8,
  },
  metricHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  metricLabel: { fontSize: 11, fontWeight: "600", flex: 1 },
  metricIcon: { padding: 7, borderRadius: 9 },
  metricValue: { fontSize: 23, fontWeight: "800", letterSpacing: -0.7 },
  connection: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
  },
  listPanel: { borderWidth: 1, borderRadius: 18, overflow: "hidden" },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 9,
  },
  tableHead: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderTopWidth: 1,
    gap: 12,
  },
  expenseRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
  },
  rowIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  dot: { width: 5, height: 5, borderRadius: 3 },
  empty: { padding: 42, alignItems: "center", gap: 15 },
  emptyIcon: {
    width: 66,
    height: 66,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  detailAmount: { fontSize: 32, fontWeight: "800", letterSpacing: -1 },
});
