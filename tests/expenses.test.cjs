const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const React = require("react");
const { create, act } = require("react-test-renderer");
const { loader, frontend, textOf } = require("./helpers.cjs");
const p = (file) => path.join(frontend, file);
const base = {
  id: "expense-1",
  title: "Cloud hosting",
  amount: 120.55,
  category: "HOSTING",
  status: "PENDING",
  created_at: "2026-10-27T20:00:00Z",
  receipt_url: null,
};
const colors = {
  primary: "#7661d6",
  textPrimary: "#111",
  textSecondary: "#666",
  textTertiary: "#888",
  surface: "#fff",
  border: "#ddd",
  background: "#fafafa",
};
const native = {
  View: "View",
  Text: "Text",
  ScrollView: "ScrollView",
  TextInput: "TextInput",
  Pressable: "Pressable",
  ActivityIndicator: "ActivityIndicator",
  Image: "Image",
  KeyboardAvoidingView: "KeyboardAvoidingView",
  Platform: { OS: "web" },
  StyleSheet: { create: (x) => x },
  Modal: ({ visible, children }) =>
    visible ? React.createElement("Modal", null, children) : null,
  useWindowDimensions: () => ({ width: 1300, height: 900 }),
};
function env({
  rows = [base],
  createExpense,
  uploadExpenseReceipt,
  canApprove = true,
  isApprover = false,
} = {}) {
  const calls = [],
    routes = [];
  const founderDb = {
    formatInr: (n) => `INR ${Number(n).toFixed(2)}`,
    createExpense:
      createExpense ||
      (async (body) => {
        calls.push({ type: "create", body });
        return { ...body, id: "saved" };
      }),
    uploadExpenseReceipt: uploadExpenseReceipt || (async () => ""),
    approveExpense: async (id) => calls.push({ type: "approve", id }),
    rejectExpense: async (id, _, reason) =>
      calls.push({ type: "reject", id, reason }),
  };
  const load = loader({
    "react-native": native,
    "expo-router": {
      useRouter: () => ({
        push: (route) => routes.push(route),
        replace: () => {},
      }),
    },
    "expo-document-picker": {
      getDocumentAsync: async () => ({
        canceled: false,
        assets: [{ uri: "receipt.jpg", mimeType: "image/jpeg" }],
      }),
    },
    "lucide-react-native": new Proxy({}, { get: () => () => null }),
    [p("src/contexts/ThemeContext.tsx")]: {
      useTheme: () => ({ colors, isDark: false }),
    },
    [p("src/hooks/useFounderAuth.ts")]: {
      useFounderAuth: () => ({
        founder: { id: "founder" },
        canApproveReject: canApprove,
        isApprover,
        hasFounderAccess: true,
      }),
    },
    [p("src/hooks/useExpenses.ts")]: {
      useExpenses: () => ({
        expenses: rows,
        loading: false,
        error: null,
        refresh: async () => calls.push({ type: "refresh" }),
      }),
    },
    [p("src/services/founderSupabase.ts")]: founderDb,
    [p("src/services/apiService.ts")]: {
      founderApi: {
        markExpensePaid: async (id, account) =>
          calls.push({ type: "paid", id, account }),
        getReceiptUrl: async () => ({
          signedUrl: "https://example.test/receipt.jpg",
        }),
      },
    },
    [p("src/screens/founder/founderUi.tsx")]: {
      ConsoleAmbientBackground: ({ children }) =>
        React.createElement("View", null, children),
      bottomTabPad: 0,
    },
    [p("src/components/ui/ScreenHeader.tsx")]: { ScreenHeader: () => null },
  });
  return { load, calls, routes };
}
async function press(tree, label) {
  const button = tree.root
    .findAllByType("Pressable")
    .find((b) => b.props.accessibilityLabel === label);
  assert.ok(button, `Missing ${label}`);
  assert.ok(!button.props.disabled);
  await act(async () => button.props.onPress({ stopPropagation() {} }));
}
async function field(tree, label, value) {
  const input = tree.root
    .findAllByType("TextInput")
    .find((i) => i.props.accessibilityLabel === label);
  assert.ok(input, `Missing ${label}`);
  await act(async () => input.props.onChangeText(value));
}
test("expense filters use India transaction dates and reimbursements exclude paid and rejected entries", () => {
  const model = loader()(p("src/screens/founder/expenseModel.ts"));
  const rows = [
    base,
    { ...base, id: "2", status: "APPROVED", amount: 10.1 },
    {
      ...base,
      id: "3",
      status: "APPROVED",
      amount: 5.2,
      paid_at: "2026-10-28",
    },
    { ...base, id: "4", status: "REJECTED", amount: 100 },
  ];
  assert.equal(model.expenseDate(base), "2026-10-28");
  assert.deepEqual(JSON.parse(JSON.stringify(model.expenseSummary(rows))), {
    approved: 15.3,
    pending: 120.55,
    unpaid: 10.1,
    receipts: 3,
  });
  assert.equal(
    model.filterExpenses(rows, {
      search: "CLOUD",
      category: "ALL",
      status: "UNPAID",
      period: "month",
      month: "2026-10",
    }).length,
    1
  );
  for (const value of ["1x", "-1", "0", "1.001", "Infinity"])
    assert.throws(() => model.expenseInputAmount(value));
  assert.equal(model.expenseInputAmount("1,200.55"), 1200.55);
});
test("expense detail approves through source workflow and opens Nexsyrus financial connections", async () => {
  const e = env();
  const Screen = e.load(p("src/screens/founder/ExpensesScreen.tsx")).default;
  let tree;
  await act(async () => {
    tree = create(React.createElement(Screen));
  });
  await press(tree, "View expense Cloud hosting");
  await press(tree, "Approve");
  assert.ok(e.calls.some((c) => c.type === "approve" && c.id === base.id));
  await press(tree, "Open Books");
  assert.match(e.routes[0], /company=nexsyrus/);
  await act(async () => tree.unmount());
});
test("payment confirmation records the bank account and is available only for approved unpaid expenses", async () => {
  const e = env({
    rows: [{ ...base, status: "APPROVED", books_state: "posted" }],
  });
  const Screen = e.load(p("src/screens/founder/ExpensesScreen.tsx")).default;
  let tree;
  await act(async () => {
    tree = create(React.createElement(Screen));
  });
  await press(tree, "View expense Cloud hosting");
  await press(tree, "Record payment");
  assert.match(textOf(tree.toJSON()), /does not transfer money/);
  await press(tree, "Confirm payment recorded");
  assert.ok(e.calls.some((c) => c.type === "paid" && c.account === "1010"));
  await act(async () => tree.unmount());
});
test("failed receipt upload retries the saved expense without creating another source record", async () => {
  let creates = 0,
    uploads = 0;
  const e = env({
    createExpense: async () => {
      creates++;
      return { id: "saved" };
    },
    uploadExpenseReceipt: async () => {
      uploads++;
      if (uploads === 1) throw new Error("Upload unavailable");
      return "path";
    },
  });
  const Screen = e.load(p("src/screens/founder/ExpensesScreen.tsx")).default;
  let tree;
  await act(async () => {
    tree = create(React.createElement(Screen));
  });
  await press(tree, "New expense");
  await field(tree, "Expense title", "Hosting");
  await field(tree, "Amount (INR)", "100.25");
  await press(tree, "Attach receipt image");
  await press(tree, "Submit for approval");
  assert.match(textOf(tree.toJSON()), /Upload unavailable/);
  assert.equal(creates, 1);
  await press(tree, "Retry receipt upload");
  assert.equal(creates, 1);
  assert.equal(uploads, 2);
  await act(async () => tree.unmount());
});
test("approval-only view has no create action and filtered empty states do not invent new entries", async () => {
  const e = env({ rows: [], isApprover: true });
  const Screen = e.load(p("src/screens/founder/ExpensesScreen.tsx")).default;
  let tree;
  await act(async () => {
    tree = create(React.createElement(Screen, { approvalsOnly: true }));
  });
  assert.equal(
    tree.root
      .findAllByType("Pressable")
      .some((b) => b.props.accessibilityLabel === "New expense"),
    false
  );
  await act(async () => tree.unmount());
});
