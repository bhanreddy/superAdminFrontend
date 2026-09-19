import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  Image,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as DocumentPicker from "expo-document-picker";
import {
  BadgeCheck,
  Banknote,
  Bot,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  FileBadge,
  FileCheck2,
  FileText,
  GraduationCap,
  Mail,
  PenLine,
  Plus,
  Search,
  Sparkles,
  Pencil,
  Trash2,
  Upload,
  UserPlus,
  Users,
  WalletCards,
  X,
} from "lucide-react-native";
import { useTheme } from "../../contexts/ThemeContext";
import { ConsoleAmbientBackground, bottomTabPad } from "./founderUi";
import * as payrollApi from "../../api/payroll";
import type {
  Employee,
  EmployeeInput,
  HrDocument,
  HrDocumentType,
  PayrollConfig,
  PayrollRun,
  PayrollSummary,
} from "../../api/payroll";

type Tab = "PEOPLE" | "PAYROLL" | "DOCUMENTS";
const PURPLE = "#8B5CF6";
const CYAN = "#22D3EE";
const GREEN = "#10B981";
const AMBER = "#F59E0B";
const ROSE = "#F43F5E";
const DOC_TYPES: {
  type: Exclude<HrDocumentType, "PAYSLIP">;
  label: string;
  sub: string;
  icon: any;
  color: string;
}[] = [
  {
    type: "EMPLOYMENT_CERTIFICATE",
    label: "Employment",
    sub: "Proof of current employment",
    icon: BriefcaseBusiness,
    color: PURPLE,
  },
  {
    type: "EXPERIENCE_CERTIFICATE",
    label: "Experience",
    sub: "Tenure and contribution",
    icon: FileBadge,
    color: CYAN,
  },
  {
    type: "INTERNSHIP_CERTIFICATE",
    label: "Internship",
    sub: "Internship completion",
    icon: GraduationCap,
    color: GREEN,
  },
  {
    type: "OFFER_LETTER",
    label: "Offer letter",
    sub: "Role and compensation offer",
    icon: Mail,
    color: AMBER,
  },
  {
    type: "RELIEVING_LETTER",
    label: "Relieving",
    sub: "Formal release confirmation",
    icon: FileCheck2,
    color: ROSE,
  },
];

const inr = (value: number | string) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
const monthLabel = (year: number, month: number) =>
  new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
const shortDate = (value: string) =>
  new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

function notify(title: string, message: string) {
  if (Platform.OS === "web" && typeof window !== "undefined")
    window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
}

function readBlobAsDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () =>
      reject(new Error("Could not read the signature file"));
    reader.readAsDataURL(blob);
  });
}

async function normalizeSignatureImage(dataUri: string): Promise<string> {
  const maxChars = 500000;
  if (Platform.OS !== "web" || typeof document === "undefined") {
    if (dataUri.length > maxChars) {
      throw new Error("Signature image is too large. Use a PNG under 250 KB.");
    }
    return dataUri;
  }
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const maxW = 420;
      const maxH = 160;
      const scale = Math.min(1, maxW / img.width, maxH / img.height);
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not process the signature image"));
        return;
      }
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      let output = canvas.toDataURL("image/png");
      if (output.length > maxChars) {
        output = canvas.toDataURL("image/jpeg", 0.82);
      }
      if (output.length > maxChars) {
        reject(
          new Error("Signature image is too large. Use a simpler PNG scan."),
        );
        return;
      }
      resolve(output);
    };
    img.onerror = () => reject(new Error("Could not read the signature image"));
    img.src = dataUri;
  });
}

async function pickSignatureDataUri(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["image/png", "image/jpeg", "image/webp", "image/*"],
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  const blob =
    Platform.OS === "web" && asset.file
      ? asset.file
      : await (await fetch(asset.uri)).blob();
  const dataUri = await readBlobAsDataUri(blob);
  if (!dataUri.startsWith("data:image/")) {
    throw new Error("Please choose a PNG, JPEG or WebP signature image.");
  }
  return normalizeSignatureImage(dataUri);
}

function PrimaryButton({
  label,
  icon: Icon = Plus,
  onPress,
  disabled,
  compact,
}: {
  label: string;
  icon?: any;
  onPress: () => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed, hovered }: any) => [
        styles.primaryButton,
        compact && styles.primaryButtonCompact,
        {
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
          transform: [{ translateY: hovered && !disabled ? -1 : 0 }],
        },
        Platform.OS === "web" &&
          ({ cursor: disabled ? "default" : "pointer" } as any),
      ]}
    >
      <LinearGradient
        colors={["#9B6CFF", "#6D3DEB"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, { borderRadius: compact ? 12 : 15 }]}
      />
      {disabled ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <Icon size={compact ? 15 : 17} color="#fff" />
      )}
      <Text style={[styles.primaryButtonText, compact && { fontSize: 12 }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function MetricCard({
  label,
  value,
  note,
  color,
  icon: Icon,
  compact,
}: {
  label: string;
  value: string;
  note: string;
  color: string;
  icon: any;
  compact: boolean;
}) {
  const { colors, isDark } = useTheme();
  return (
    <View
      style={[
        styles.metricCard,
        compact && styles.metricCardCompact,
        {
          backgroundColor: isDark
            ? "rgba(23,22,37,0.86)"
            : "rgba(255,255,255,0.9)",
          borderColor: `${color}28`,
        },
        Platform.OS === "web" &&
          ({ boxShadow: `0 12px 36px ${color}12` } as any),
      ]}
    >
      <View style={[styles.metricIcon, { backgroundColor: `${color}18` }]}>
        <Icon size={18} color={color} />
      </View>
      <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
        {label}
      </Text>
      <Text
        style={[
          styles.metricValue,
          compact && { fontSize: 20 },
          { color: colors.textPrimary },
        ]}
        numberOfLines={1}
      >
        {value}
      </Text>
      <Text style={[styles.metricNote, { color }]}>{note}</Text>
    </View>
  );
}

function StatusPill({ value }: { value: string }) {
  const meta =
    value === "PAID" || value === "ACTIVE"
      ? { color: GREEN, label: value === "PAID" ? "Paid" : "Active" }
      : value === "PROCESSED"
        ? { color: PURPLE, label: "Ready" }
        : value === "ON_LEAVE"
          ? { color: AMBER, label: "On leave" }
          : { color: ROSE, label: value.toLowerCase().replace("_", " ") };
  return (
    <View
      style={[
        styles.statusPill,
        { backgroundColor: `${meta.color}14`, borderColor: `${meta.color}32` },
      ]}
    >
      <View style={[styles.statusDot, { backgroundColor: meta.color }]} />
      <Text style={[styles.statusText, { color: meta.color }]}>
        {meta.label}
      </Text>
    </View>
  );
}

function EmptyState({
  icon: Icon,
  title,
  message,
  action,
}: {
  icon: any;
  title: string;
  message: string;
  action?: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Icon size={26} color={PURPLE} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
        {title}
      </Text>
      <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>
        {message}
      </Text>
      {action}
    </View>
  );
}

export default function PayrollScreen() {
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const compact = width < 700;
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [tab, setTab] = useState<Tab>("PEOPLE");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [documents, setDocuments] = useState<HrDocument[]>([]);
  const [summary, setSummary] = useState<PayrollSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [employeeModal, setEmployeeModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [documentEmployee, setDocumentEmployee] = useState<Employee | null>(
    null,
  );
  const [payrollConfig, setPayrollConfig] = useState<PayrollConfig | null>(
    null,
  );
  const autoAttempted = useRef(false);

  const load = useCallback(
    async (quiet = false) => {
      if (!quiet) setLoading(true);
      setError(null);
      try {
        const [people, payRuns, docs, stats, config] = await Promise.all([
          payrollApi.listEmployees(),
          payrollApi.listRuns(year, month),
          payrollApi.listDocuments(),
          payrollApi.getSummary(year, month),
          payrollApi.getConfig(),
        ]);
        setEmployees(people);
        setRuns(payRuns);
        setDocuments(docs);
        setSummary(stats);
        setPayrollConfig(config);
      } catch (err) {
        setError(payrollApi.errorMessage(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [year, month],
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (
      autoAttempted.current ||
      loading ||
      error ||
      year !== now.getFullYear() ||
      month !== now.getMonth() + 1
    )
      return;
    autoAttempted.current = true;
    payrollApi
      .getConfig()
      .then(async (config) => {
        if (
          config.auto_process_enabled &&
          now.getDate() >= Number(config.salary_day) &&
          summary &&
          summary.active_count > summary.processed_count
        ) {
          await payrollApi.processPayroll(year, month);
          await load(true);
        }
      })
      .catch(() => {});
  }, [loading, error, year, month, summary, load, now]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) =>
      [e.full_name, e.employee_code, e.designation, e.department].some((v) =>
        String(v).toLowerCase().includes(q),
      ),
    );
  }, [employees, query]);

  const shiftPeriod = (direction: number) => {
    const date = new Date(year, month - 1 + direction, 1);
    autoAttempted.current = false;
    setYear(date.getFullYear());
    setMonth(date.getMonth() + 1);
  };

  const process = async () => {
    setProcessing(true);
    try {
      const result = await payrollApi.processPayroll(year, month);
      await load(true);
      notify(
        "Payroll ready",
        `${result.processed} salaries were calculated and payslips generated.`,
      );
    } catch (err) {
      notify("Could not process payroll", payrollApi.errorMessage(err));
    } finally {
      setProcessing(false);
    }
  };

  const openDocument = async (doc: HrDocument) => {
    try {
      const html = await payrollApi.fetchDocumentHtml(doc.id);
      if (Platform.OS === "web" && typeof window !== "undefined") {
        const url = URL.createObjectURL(
          new Blob([html], { type: "text/html" }),
        );
        window.open(url, "_blank", "noopener,noreferrer");
        window.setTimeout(() => URL.revokeObjectURL(url), 60000);
      } else
        await Share.share({
          message: `${doc.title} · ${doc.full_name} · ${doc.document_number}`,
        });
    } catch (err) {
      notify("Document unavailable", payrollApi.errorMessage(err));
    }
  };

  const markPaid = async (run: PayrollRun) => {
    try {
      await payrollApi.markPaid(run.id);
      await load(true);
    } catch (err) {
      notify("Could not update payroll", payrollApi.errorMessage(err));
    }
  };

  const metrics = [
    {
      label: "Active team",
      value: String(summary?.active_count ?? 0),
      note: `${employees.filter((e) => e.employment_type === "INTERN").length} interns`,
      color: CYAN,
      icon: Users,
    },
    {
      label: "Monthly gross",
      value: inr(summary?.monthly_gross ?? 0),
      note: "Committed salary",
      color: PURPLE,
      icon: WalletCards,
    },
    {
      label: "Net payroll",
      value: inr(summary?.net_payroll ?? 0),
      note: `${summary?.processed_count ?? 0} processed`,
      color: GREEN,
      icon: CircleDollarSign,
    },
    {
      label: "HR documents",
      value: String(summary?.document_count ?? 0),
      note: "Auto archived",
      color: AMBER,
      icon: FileText,
    },
  ];

  return (
    <ConsoleAmbientBackground>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: bottomTabPad },
          width > 1100 && styles.contentWide,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load(true);
            }}
            tintColor={PURPLE}
          />
        }
      >
        <LinearGradient
          colors={
            isDark
              ? ["#211A3D", "#10182E", "#11131F"]
              : ["#F1EBFF", "#E9F8FF", "#FFFFFF"]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.hero,
            {
              borderColor: isDark
                ? "rgba(168,139,250,.25)"
                : "rgba(109,40,217,.12)",
            },
          ]}
        >
          <View style={styles.heroOrbA} />
          <View style={styles.heroOrbB} />
          <View
            style={[
              styles.heroTop,
              compact && { flexDirection: "column", alignItems: "stretch" },
            ]}
          >
            <View style={{ flex: 1 }}>
              <View style={styles.kicker}>
                <View style={styles.kickerIcon}>
                  <Bot size={15} color="#fff" />
                </View>
                <Text style={styles.kickerText}>
                  PEOPLE OPERATIONS · AUTOPILOT ON
                </Text>
              </View>
              <Text
                style={[
                  styles.heroTitle,
                  compact && { fontSize: 29, lineHeight: 34 },
                  { color: colors.textPrimary },
                ]}
              >
                Your team, paid right. Every month.
              </Text>
              <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
                Salary calculations, payslips and employee
                certificates—generated from one trusted employee record.
              </Text>
            </View>
            <PrimaryButton
              label="Add employee"
              icon={UserPlus}
              onPress={() => {
                setEditingEmployee(null);
                setEmployeeModal(true);
              }}
            />
          </View>
          <View
            style={[
              styles.autopilotStrip,
              {
                backgroundColor: isDark
                  ? "rgba(16,185,129,.09)"
                  : "rgba(255,255,255,.72)",
                borderColor: "rgba(16,185,129,.2)",
              },
            ]}
          >
            <View style={styles.liveDot}>
              <View style={styles.liveDotInner} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.autoTitle, { color: colors.textPrimary }]}>
                Payroll autopilot is monitoring {monthLabel(year, month)}
              </Text>
              <Text style={[styles.autoSub, { color: colors.textSecondary }]}>
                Eligible employees are prorated by joining and exit dates. PF,
                ESI and fixed deductions are calculated automatically.
              </Text>
            </View>
            <Sparkles size={18} color={GREEN} />
          </View>
        </LinearGradient>

        <View style={[styles.metrics, compact && styles.metricsCompact]}>
          {metrics.map((metric) => (
            <MetricCard key={metric.label} {...metric} compact={compact} />
          ))}
        </View>

        <View
          style={[
            styles.toolbar,
            compact && { flexDirection: "column", alignItems: "stretch" },
          ]}
        >
          <View
            style={[
              styles.tabs,
              {
                backgroundColor: isDark
                  ? "rgba(255,255,255,.04)"
                  : "rgba(109,40,217,.05)",
                borderColor: colors.border,
              },
            ]}
          >
            {(["PEOPLE", "PAYROLL", "DOCUMENTS"] as Tab[]).map((item) => (
              <Pressable
                key={item}
                onPress={() => setTab(item)}
                style={[
                  styles.tab,
                  tab === item && {
                    backgroundColor: isDark ? "#2D2550" : "#fff",
                  },
                  Platform.OS === "web" && ({ cursor: "pointer" } as any),
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: tab === item ? PURPLE : colors.textSecondary },
                  ]}
                >
                  {item === "PEOPLE"
                    ? "People"
                    : item === "PAYROLL"
                      ? "Payroll"
                      : "Documents"}
                </Text>
                {item === "PAYROLL" && runs.length > 0 && (
                  <View style={styles.tabCount}>
                    <Text style={styles.tabCountText}>{runs.length}</Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>
          {tab === "PEOPLE" && (
            <View
              style={[
                styles.search,
                {
                  backgroundColor: isDark ? "rgba(255,255,255,.05)" : "#fff",
                  borderColor: colors.border,
                },
              ]}
            >
              <Search size={16} color={colors.textSecondary} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search team"
                placeholderTextColor={colors.textSecondary}
                style={[
                  styles.searchInput,
                  { color: colors.textPrimary },
                  Platform.OS === "web" && ({ outlineStyle: "none" } as any),
                ]}
              />
            </View>
          )}
          {tab === "PAYROLL" && (
            <View style={styles.periodActions}>
              <View
                style={[styles.periodPicker, { borderColor: colors.border }]}
              >
                <Pressable
                  onPress={() => shiftPeriod(-1)}
                  style={styles.arrowButton}
                >
                  <ChevronLeft size={17} color={colors.textSecondary} />
                </Pressable>
                <Text
                  style={[styles.periodText, { color: colors.textPrimary }]}
                >
                  {monthLabel(year, month)}
                </Text>
                <Pressable
                  onPress={() => shiftPeriod(1)}
                  style={styles.arrowButton}
                >
                  <ChevronRight size={17} color={colors.textSecondary} />
                </Pressable>
              </View>
              <PrimaryButton
                label={runs.length ? "Recalculate" : "Run payroll"}
                icon={Sparkles}
                onPress={process}
                disabled={processing}
                compact
              />
            </View>
          )}
        </View>

        {error ? (
          <View
            style={[
              styles.errorCard,
              { backgroundColor: `${ROSE}10`, borderColor: `${ROSE}30` },
            ]}
          >
            <X size={19} color={ROSE} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>
                Payroll module needs attention
              </Text>
              <Text style={[styles.errorText, { color: colors.textSecondary }]}>
                {error}
              </Text>
            </View>
            <Pressable onPress={() => load()}>
              <Text style={{ color: PURPLE, fontWeight: "800" }}>Retry</Text>
            </Pressable>
          </View>
        ) : loading ? (
          <View style={styles.loader}>
            <ActivityIndicator color={PURPLE} />
            <Text style={{ color: colors.textSecondary }}>
              Preparing people operations…
            </Text>
          </View>
        ) : null}

        {!loading && !error && tab === "PEOPLE" && (
          <View style={styles.listGap}>
            {filtered.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Build your team directory"
                message="Add the first employee. Their salary and every future HR document will use this single record."
                action={
                  <PrimaryButton
                    label="Add employee"
                    icon={UserPlus}
                    onPress={() => {
                      setEditingEmployee(null);
                      setEmployeeModal(true);
                    }}
                    compact
                  />
                }
              />
            ) : (
              filtered.map((employee, index) => (
                <EmployeeCard
                  key={employee.id}
                  employee={employee}
                  index={index}
                  compact={compact}
                  onEdit={() => {
                    setEditingEmployee(employee);
                    setEmployeeModal(true);
                  }}
                  onDocument={() => setDocumentEmployee(employee)}
                />
              ))
            )}
          </View>
        )}
        {!loading && !error && tab === "PAYROLL" && (
          <View style={styles.listGap}>
            {runs.length === 0 ? (
              <EmptyState
                icon={Banknote}
                title={`No payroll for ${monthLabel(year, month)}`}
                message="Run payroll once. The engine will calculate every eligible salary and generate individual payslips."
                action={
                  <PrimaryButton
                    label="Run payroll now"
                    icon={Sparkles}
                    onPress={process}
                    disabled={processing}
                    compact
                  />
                }
              />
            ) : (
              runs.map((run) => (
                <PayrollCard
                  key={run.id}
                  run={run}
                  compact={compact}
                  onPaid={() => markPaid(run)}
                  onPayslip={() => {
                    const doc = documents.find(
                      (d) => d.payroll_run_id === run.id,
                    );
                    if (doc) openDocument(doc);
                  }}
                />
              ))
            )}
          </View>
        )}
        {!loading && !error && tab === "DOCUMENTS" && (
          <View style={styles.listGap}>
            <SignatureStampCard
              config={payrollConfig}
              onUpdated={setPayrollConfig}
            />
            {documents.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="Your document vault is empty"
                message="Payslips appear here after payroll. Generate certificates directly from any employee card."
              />
            ) : (
              documents.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  compact={compact}
                  onOpen={() => openDocument(doc)}
                />
              ))
            )}
          </View>
        )}
      </ScrollView>
      <EmployeeModal
        visible={employeeModal}
        employee={editingEmployee}
        onClose={() => setEmployeeModal(false)}
        onSaved={async () => {
          setEmployeeModal(false);
          setEditingEmployee(null);
          await load(true);
        }}
      />
      <DocumentModal
        employee={documentEmployee}
        config={payrollConfig}
        onConfigUpdated={setPayrollConfig}
        onClose={() => setDocumentEmployee(null)}
        onGenerated={async (doc) => {
          setDocumentEmployee(null);
          await load(true);
          await openDocument(doc);
        }}
      />
    </ConsoleAmbientBackground>
  );
}

function EmployeeCard({
  employee,
  index,
  compact,
  onEdit,
  onDocument,
}: {
  employee: Employee;
  index: number;
  compact: boolean;
  onEdit: () => void;
  onDocument: () => void;
}) {
  const { colors, isDark } = useTheme();
  const entrance = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(entrance, {
      toValue: 1,
      duration: 350,
      delay: Math.min(index, 8) * 45,
      useNativeDriver: true,
    }).start();
  }, [entrance, index]);
  return (
    <Animated.View
      style={[
        styles.rowCard,
        compact && styles.rowCardCompact,
        {
          opacity: entrance,
          transform: [
            {
              translateY: entrance.interpolate({
                inputRange: [0, 1],
                outputRange: [12, 0],
              }),
            },
          ],
          backgroundColor: isDark
            ? "rgba(27,26,43,.78)"
            : "rgba(255,255,255,.9)",
          borderColor: colors.border,
        },
      ]}
    >
      <View style={[styles.avatar, { backgroundColor: `${PURPLE}1A` }]}>
        <Text style={styles.avatarText}>{initials(employee.full_name)}</Text>
      </View>
      <View style={styles.employeeMain}>
        <View style={styles.nameRow}>
          <Text
            style={[styles.employeeName, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {employee.full_name}
          </Text>
          <StatusPill value={employee.status} />
        </View>
        <Text style={[styles.employeeRole, { color: colors.textSecondary }]}>
          {employee.designation} · {employee.department}
        </Text>
        <View style={styles.metaRow}>
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            {employee.employee_code}
          </Text>
          <View style={styles.metaDot} />
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            {employee.employment_type.replace("_", " ").toLowerCase()}
          </Text>
          <View style={styles.metaDot} />
          <Text style={[styles.metaText, { color: colors.textSecondary }]}>
            Since {shortDate(employee.joining_date)}
          </Text>
        </View>
      </View>
      <View style={[styles.salaryBlock, compact && styles.salaryBlockCompact]}>
        <Text style={[styles.salaryLabel, { color: colors.textSecondary }]}>
          MONTHLY GROSS
        </Text>
        <Text style={[styles.salaryValue, { color: colors.textPrimary }]}>
          {inr(employee.gross_salary)}
        </Text>
      </View>
      <View style={styles.employeeActions}>
        <Pressable
          onPress={onEdit}
          style={({ pressed }) => [
            styles.iconButton,
            { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            Platform.OS === "web" && ({ cursor: "pointer" } as any),
          ]}
        >
          <Pencil size={15} color={colors.textSecondary} />
        </Pressable>
        <Pressable
          onPress={onDocument}
          style={({ pressed }) => [
            styles.outlineButton,
            {
              borderColor: `${PURPLE}3A`,
              backgroundColor: `${PURPLE}0B`,
              opacity: pressed ? 0.7 : 1,
            },
            Platform.OS === "web" && ({ cursor: "pointer" } as any),
          ]}
        >
          <FileBadge size={16} color={PURPLE} />
          <Text style={styles.outlineButtonText}>Create document</Text>
        </Pressable>
      </View>
    </Animated.View>
  );
}

function PayrollCard({
  run,
  compact,
  onPaid,
  onPayslip,
}: {
  run: PayrollRun;
  compact: boolean;
  onPaid: () => void;
  onPayslip: () => void;
}) {
  const { colors, isDark } = useTheme();
  return (
    <View
      style={[
        styles.payCard,
        {
          backgroundColor: isDark ? "rgba(27,26,43,.78)" : "#fff",
          borderColor: colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.payHead,
          compact && { flexDirection: "column", alignItems: "stretch" },
        ]}
      >
        <View style={styles.personInline}>
          <View style={[styles.smallAvatar, { backgroundColor: `${CYAN}18` }]}>
            <Text style={[styles.avatarText, { color: CYAN, fontSize: 12 }]}>
              {initials(run.full_name)}
            </Text>
          </View>
          <View>
            <Text style={[styles.employeeName, { color: colors.textPrimary }]}>
              {run.full_name}
            </Text>
            <Text
              style={[styles.employeeRole, { color: colors.textSecondary }]}
            >
              {run.employee_code} · {run.designation}
            </Text>
          </View>
        </View>
        <View style={styles.payStatusRow}>
          <StatusPill value={run.status} />
          <Text style={[styles.netPay, { color: colors.textPrimary }]}>
            {inr(run.net_pay)}
          </Text>
        </View>
      </View>
      <View style={styles.payBreakdown}>
        <PayMini label="Gross" value={inr(run.gross_pay)} />
        <PayMini label="Deductions" value={inr(run.total_deductions)} />
        <PayMini
          label="Paid days"
          value={`${run.paid_days}/${run.working_days}`}
        />
      </View>
      <View style={styles.payActions}>
        <Pressable onPress={onPayslip} style={styles.textButton}>
          <FileText size={15} color={PURPLE} />
          <Text style={styles.textButtonLabel}>View payslip</Text>
        </Pressable>
        {run.status !== "PAID" && (
          <Pressable
            onPress={onPaid}
            style={[styles.textButton, { backgroundColor: `${GREEN}12` }]}
          >
            <Check size={15} color={GREEN} />
            <Text style={[styles.textButtonLabel, { color: GREEN }]}>
              Mark paid
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function PayMini({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.payMini}>
      <Text style={[styles.salaryLabel, { color: colors.textSecondary }]}>
        {label}
      </Text>
      <Text style={[styles.payMiniValue, { color: colors.textPrimary }]}>
        {value}
      </Text>
    </View>
  );
}

function DocumentCard({
  doc,
  compact,
  onOpen,
}: {
  doc: HrDocument;
  compact: boolean;
  onOpen: () => void;
}) {
  const { colors, isDark } = useTheme();
  const meta =
    doc.document_type === "PAYSLIP"
      ? { icon: Banknote, color: GREEN }
      : DOC_TYPES.find((d) => d.type === doc.document_type) || DOC_TYPES[0];
  const Icon = meta.icon;
  return (
    <Pressable
      onPress={onOpen}
      style={({ pressed, hovered }: any) => [
        styles.documentCard,
        compact && { alignItems: "flex-start" },
        {
          backgroundColor: isDark ? "rgba(27,26,43,.78)" : "#fff",
          borderColor: hovered ? `${meta.color}55` : colors.border,
          opacity: pressed ? 0.78 : 1,
        },
        Platform.OS === "web" && ({ cursor: "pointer" } as any),
      ]}
    >
      <View
        style={[styles.documentIcon, { backgroundColor: `${meta.color}16` }]}
      >
        <Icon size={20} color={meta.color} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={[styles.employeeName, { color: colors.textPrimary }]}
          numberOfLines={1}
        >
          {doc.title}
        </Text>
        <Text style={[styles.employeeRole, { color: colors.textSecondary }]}>
          {doc.full_name} · {doc.employee_code}
        </Text>
        <Text
          style={[styles.docNumber, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          {doc.document_number}
        </Text>
      </View>
      <View style={styles.docRight}>
        <Text style={[styles.metaText, { color: colors.textSecondary }]}>
          {shortDate(doc.generated_at)}
        </Text>
        <ChevronRight size={18} color={meta.color} />
      </View>
    </Pressable>
  );
}

const EMPTY_FORM: EmployeeInput = {
  full_name: "",
  email: "",
  phone: "",
  designation: "",
  department: "",
  employment_type: "FULL_TIME",
  joining_date: new Date().toISOString().slice(0, 10),
  basic_salary: 0,
  hra: 0,
  allowances: 0,
  fixed_deductions: 0,
  pf_enabled: false,
  esi_enabled: false,
  bank_account_number: "",
  bank_ifsc: "",
  pan_number: "",
};

function EmployeeModal({
  visible,
  employee,
  onClose,
  onSaved,
}: {
  visible: boolean;
  employee: Employee | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const [form, setForm] = useState<EmployeeInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!visible) return;
    setForm(
      employee
        ? {
            employee_code: employee.employee_code,
            full_name: employee.full_name,
            email: employee.email || "",
            phone: employee.phone || "",
            designation: employee.designation,
            department: employee.department,
            employment_type: employee.employment_type,
            status: employee.status,
            joining_date: employee.joining_date,
            exit_date: employee.exit_date,
            basic_salary: Number(employee.basic_salary),
            hra: Number(employee.hra),
            allowances: Number(employee.allowances),
            fixed_deductions: Number(employee.fixed_deductions),
            pf_enabled: employee.pf_enabled,
            esi_enabled: employee.esi_enabled,
            bank_account_number: employee.bank_account_number || "",
            bank_ifsc: employee.bank_ifsc || "",
            pan_number: employee.pan_number || "",
            notes: employee.notes || "",
          }
        : { ...EMPTY_FORM },
    );
  }, [visible, employee]);
  const set = (key: keyof EmployeeInput, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));
  const save = async () => {
    if (
      !form.full_name.trim() ||
      !form.designation.trim() ||
      !form.department.trim()
    )
      return notify(
        "Complete required fields",
        "Name, designation and department are required.",
      );
    setSaving(true);
    try {
      if (employee) await payrollApi.updateEmployee(employee.id, form);
      else await payrollApi.createEmployee(form);
      setForm(EMPTY_FORM);
      onSaved();
    } catch (err) {
      notify(
        employee ? "Could not update employee" : "Could not add employee",
        payrollApi.errorMessage(err),
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalBackdrop}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          style={[
            styles.modalCard,
            {
              width: Math.min(width - 28, 720),
              backgroundColor: isDark ? "#171523" : "#fff",
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.modalHead}>
            <View>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {employee ? "Edit employee" : "Add employee"}
              </Text>
              <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
                One profile powers payroll and every HR document.
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X size={20} color={colors.textSecondary} />
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={styles.formContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.formGrid}>
              <Field
                label="Full name"
                value={form.full_name}
                onChangeText={(v) => set("full_name", v)}
                required
              />
              <Field
                label="Work email"
                value={form.email || ""}
                onChangeText={(v) => set("email", v)}
                keyboardType="email-address"
              />
              <Field
                label="Designation"
                value={form.designation}
                onChangeText={(v) => set("designation", v)}
                required
              />
              <Field
                label="Department"
                value={form.department}
                onChangeText={(v) => set("department", v)}
                required
              />
              <Field
                label="Joining date"
                value={form.joining_date}
                onChangeText={(v) => set("joining_date", v)}
                placeholder="YYYY-MM-DD"
              />
              <Field
                label="Phone"
                value={form.phone || ""}
                onChangeText={(v) => set("phone", v)}
                keyboardType="phone-pad"
              />
            </View>
            <Text style={[styles.formSection, { color: colors.textPrimary }]}>
              Employment type
            </Text>
            <View style={styles.choiceRow}>
              {(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"] as const).map(
                (type) => (
                  <Choice
                    key={type}
                    label={type.replace("_", " ")}
                    active={form.employment_type === type}
                    onPress={() => set("employment_type", type)}
                  />
                ),
              )}
            </View>
            {employee && (
              <>
                <Text
                  style={[styles.formSection, { color: colors.textPrimary }]}
                >
                  Employee status
                </Text>
                <View style={styles.choiceRow}>
                  {(["ACTIVE", "ON_LEAVE", "EXITED"] as const).map((status) => (
                    <Choice
                      key={status}
                      label={status.replace("_", " ")}
                      active={form.status === status}
                      onPress={() => set("status", status)}
                    />
                  ))}
                </View>
                {form.status === "EXITED" && (
                  <View style={[styles.formGrid, { marginTop: 12 }]}>
                    <Field
                      label="Last working date"
                      value={form.exit_date || ""}
                      onChangeText={(v) => set("exit_date", v)}
                      placeholder="YYYY-MM-DD"
                    />
                  </View>
                )}
              </>
            )}
            <Text style={[styles.formSection, { color: colors.textPrimary }]}>
              Monthly salary structure
            </Text>
            <View style={styles.formGrid}>
              <MoneyField
                label="Basic salary"
                value={form.basic_salary}
                onChange={(v) => set("basic_salary", v)}
              />
              <MoneyField
                label="HRA"
                value={form.hra}
                onChange={(v) => set("hra", v)}
              />
              <MoneyField
                label="Allowances"
                value={form.allowances}
                onChange={(v) => set("allowances", v)}
              />
              <MoneyField
                label="Fixed deductions"
                value={form.fixed_deductions}
                onChange={(v) => set("fixed_deductions", v)}
              />
            </View>
            <View style={styles.switchRow}>
              <Toggle
                label="Provident Fund"
                sub="Auto-deduct statutory PF"
                value={form.pf_enabled}
                onValueChange={(v) => set("pf_enabled", v)}
              />
              <Toggle
                label="ESI"
                sub="Apply under configured gross limit"
                value={form.esi_enabled}
                onValueChange={(v) => set("esi_enabled", v)}
              />
            </View>
            <Text style={[styles.formSection, { color: colors.textPrimary }]}>
              Bank & compliance
            </Text>
            <View style={styles.formGrid}>
              <Field
                label="Bank account"
                value={form.bank_account_number || ""}
                onChangeText={(v) => set("bank_account_number", v)}
              />
              <Field
                label="IFSC code"
                value={form.bank_ifsc || ""}
                onChangeText={(v) => set("bank_ifsc", v.toUpperCase())}
              />
              <Field
                label="PAN number"
                value={form.pan_number || ""}
                onChangeText={(v) => set("pan_number", v.toUpperCase())}
              />
            </View>
          </ScrollView>
          <View style={[styles.modalFoot, { borderColor: colors.border }]}>
            <Pressable onPress={onClose} style={styles.cancelButton}>
              <Text
                style={[styles.cancelText, { color: colors.textSecondary }]}
              >
                Cancel
              </Text>
            </Pressable>
            <PrimaryButton
              label={
                saving
                  ? "Saving…"
                  : employee
                    ? "Save changes"
                    : "Create employee"
              }
              icon={employee ? Check : UserPlus}
              onPress={save}
              disabled={saving}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field(
  props: React.ComponentProps<typeof TextInput> & {
    label: string;
    required?: boolean;
  },
) {
  const { colors, isDark } = useTheme();
  return (
    <View style={styles.field}>
      <View style={styles.fieldLabelRow}>
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
          {props.label}
        </Text>
        {props.required && <View style={styles.requiredDot} />}
      </View>
      <TextInput
        {...props}
        placeholderTextColor={colors.textSecondary}
        style={[
          styles.fieldInput,
          {
            color: colors.textPrimary,
            backgroundColor: isDark ? "rgba(255,255,255,.045)" : "#F8F8FB",
            borderColor: colors.border,
          },
          Platform.OS === "web" && ({ outlineStyle: "none" } as any),
        ]}
      />
    </View>
  );
}
function MoneyField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <Field
      label={label}
      value={value ? String(value) : ""}
      onChangeText={(v: string) =>
        onChange(Number(v.replace(/[^0-9.]/g, "")) || 0)
      }
      keyboardType="decimal-pad"
      placeholder="0"
    />
  );
}
function Choice({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.choice,
        {
          borderColor: active ? `${PURPLE}70` : colors.border,
          backgroundColor: active ? `${PURPLE}16` : "transparent",
        },
      ]}
    >
      <Text
        style={[
          styles.choiceText,
          { color: active ? PURPLE : colors.textSecondary },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
function Toggle({
  label,
  sub,
  value,
  onValueChange,
}: {
  label: string;
  sub: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.toggle}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>
          {label}
        </Text>
        <Text style={[styles.toggleSub, { color: colors.textSecondary }]}>
          {sub}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: `${PURPLE}99` }}
        thumbColor={value ? PURPLE : "#aaa"}
      />
    </View>
  );
}

function SignatureStampCard({
  config,
  onUpdated,
  compact,
}: {
  config: PayrollConfig | null;
  onUpdated: (config: PayrollConfig) => void;
  compact?: boolean;
}) {
  const { colors, isDark } = useTheme();
  const [busy, setBusy] = useState(false);
  const signature = config?.authorised_signatory_image || null;

  const saveImage = async (image: string | null) => {
    setBusy(true);
    try {
      const updated = await payrollApi.updateConfig({
        authorised_signatory_image: image,
      });
      onUpdated(updated);
    } catch (err) {
      notify("Could not save signature", payrollApi.errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const upload = async () => {
    try {
      const image = await pickSignatureDataUri();
      if (!image) return;
      await saveImage(image);
    } catch (err) {
      notify(
        "Could not upload signature",
        err instanceof Error ? err.message : payrollApi.errorMessage(err),
      );
    }
  };

  return (
    <View
      style={[
        styles.signatureCard,
        {
          backgroundColor: isDark ? "rgba(27,26,43,.78)" : "#fff",
          borderColor: colors.border,
        },
      ]}
    >
      <View style={[styles.signaturePreview, { borderColor: `${PURPLE}32` }]}>
        {signature ? (
          <Image
            source={{ uri: signature }}
            style={styles.signatureImage}
            resizeMode="contain"
          />
        ) : (
          <PenLine size={22} color={PURPLE} />
        )}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>
          Digital signature
        </Text>
        <Text style={[styles.toggleSub, { color: colors.textSecondary }]}>
          {signature
            ? "This stamp appears above Authorised Signatory on every certificate."
            : "Upload a PNG of the authorised signatory. A transparent background looks best."}
        </Text>
        {!compact && (
          <View style={styles.signatureActions}>
            <Pressable
              onPress={upload}
              disabled={busy}
              style={({ pressed }) => [
                styles.outlineButton,
                {
                  borderColor: `${PURPLE}3A`,
                  backgroundColor: `${PURPLE}0B`,
                  opacity: pressed || busy ? 0.7 : 1,
                },
                Platform.OS === "web" && ({ cursor: "pointer" } as any),
              ]}
            >
              {busy ? (
                <ActivityIndicator size="small" color={PURPLE} />
              ) : (
                <Upload size={15} color={PURPLE} />
              )}
              <Text style={styles.outlineButtonText}>
                {signature ? "Replace signature" : "Upload signature"}
              </Text>
            </Pressable>
            {signature ? (
              <Pressable
                onPress={() => saveImage(null)}
                disabled={busy}
                style={({ pressed }) => [
                  styles.iconButton,
                  {
                    borderColor: `${ROSE}40`,
                    opacity: pressed || busy ? 0.7 : 1,
                  },
                  Platform.OS === "web" && ({ cursor: "pointer" } as any),
                ]}
              >
                <Trash2 size={15} color={ROSE} />
              </Pressable>
            ) : null}
          </View>
        )}
      </View>
      {compact ? (
        <Pressable
          onPress={upload}
          disabled={busy}
          style={({ pressed }) => [
            styles.outlineButton,
            {
              borderColor: `${PURPLE}3A`,
              backgroundColor: `${PURPLE}0B`,
              opacity: pressed || busy ? 0.7 : 1,
            },
            Platform.OS === "web" && ({ cursor: "pointer" } as any),
          ]}
        >
          {busy ? (
            <ActivityIndicator size="small" color={PURPLE} />
          ) : (
            <Upload size={15} color={PURPLE} />
          )}
          <Text style={styles.outlineButtonText}>
            {signature ? "Replace" : "Upload"}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function DocumentModal({
  employee,
  config,
  onConfigUpdated,
  onClose,
  onGenerated,
}: {
  employee: Employee | null;
  config: PayrollConfig | null;
  onConfigUpdated: (config: PayrollConfig) => void;
  onClose: () => void;
  onGenerated: (doc: HrDocument) => void;
}) {
  const { colors, isDark } = useTheme();
  const [busy, setBusy] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const dateInputProps =
    Platform.OS === "web" ? ({ type: "date" } as any) : {};

  useEffect(() => {
    if (!employee) return;
    setFromDate(String(employee.joining_date || "").slice(0, 10));
    setToDate(
      String(employee.exit_date || new Date().toISOString()).slice(0, 10),
    );
  }, [employee]);

  const generate = async (type: Exclude<HrDocumentType, "PAYSLIP">) => {
    if (!employee) return;
    if (!fromDate || !toDate) {
      notify("Dates required", "Choose both a from date and a to date.");
      return;
    }
    if (fromDate > toDate) {
      notify("Invalid period", "The from date must be on or before the to date.");
      return;
    }
    setBusy(type);
    try {
      const doc = await payrollApi.generateDocument(employee.id, type, {
        startDate: fromDate,
        endDate: toDate,
      });
      onGenerated(doc);
    } catch (err) {
      notify("Could not generate document", payrollApi.errorMessage(err));
    } finally {
      setBusy(null);
    }
  };
  return (
    <Modal
      visible={Boolean(employee)}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <ScrollView
          style={[
            styles.documentModal,
            {
              backgroundColor: isDark ? "#171523" : "#fff",
              borderColor: colors.border,
            },
          ]}
          contentContainerStyle={{ paddingBottom: 8 }}
          bounces={false}
        >
          <View style={styles.modalHead}>
            <View>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Create verified document
              </Text>
              <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
                {employee?.full_name} · {employee?.employee_code}
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <X size={20} color={colors.textSecondary} />
            </Pressable>
          </View>
          <View style={styles.signatureModalWrap}>
            <SignatureStampCard
              config={config}
              onUpdated={onConfigUpdated}
              compact
            />
          </View>
          <View style={styles.periodBlock}>
            <View style={styles.fieldLabelRow}>
              <CalendarDays size={14} color={PURPLE} />
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                Certificate period
              </Text>
            </View>
            <View style={styles.formGrid}>
              <Field
                label="From"
                value={fromDate}
                onChangeText={setFromDate}
                placeholder="YYYY-MM-DD"
                required
                {...dateInputProps}
              />
              <Field
                label="To"
                value={toDate}
                onChangeText={setToDate}
                placeholder="YYYY-MM-DD"
                required
                {...dateInputProps}
              />
            </View>
          </View>
          <View style={styles.docChoiceList}>
            {DOC_TYPES.map(({ type, label, sub, icon: Icon, color }) => (
              <Pressable
                key={type}
                disabled={Boolean(busy)}
                onPress={() => generate(type)}
                style={({ pressed, hovered }: any) => [
                  styles.docChoice,
                  {
                    borderColor: hovered ? `${color}60` : colors.border,
                    backgroundColor: `${color}08`,
                    opacity: pressed ? 0.7 : busy && busy !== type ? 0.5 : 1,
                  },
                ]}
              >
                <View
                  style={[
                    styles.documentIcon,
                    { backgroundColor: `${color}16` },
                  ]}
                >
                  {busy === type ? (
                    <ActivityIndicator size="small" color={color} />
                  ) : (
                    <Icon size={19} color={color} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.toggleLabel, { color: colors.textPrimary }]}
                  >
                    {label}
                  </Text>
                  <Text
                    style={[styles.toggleSub, { color: colors.textSecondary }]}
                  >
                    {sub}
                  </Text>
                </View>
                <ChevronRight size={18} color={color} />
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 18, gap: 18 },
  contentWide: {
    width: "100%",
    maxWidth: 1240,
    alignSelf: "center",
    paddingHorizontal: 28,
  },
  hero: { borderWidth: 1, borderRadius: 28, padding: 26, overflow: "hidden" },
  heroOrbA: {
    position: "absolute",
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: "rgba(139,92,246,.13)",
    top: -145,
    right: -45,
  },
  heroOrbB: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(34,211,238,.09)",
    bottom: -100,
    left: "45%",
  },
  heroTop: { flexDirection: "row", alignItems: "flex-start", gap: 24 },
  kicker: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginBottom: 15,
  },
  kickerIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: PURPLE,
  },
  kickerText: {
    color: PURPLE,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.1,
  },
  heroTitle: {
    fontSize: 38,
    lineHeight: 43,
    fontWeight: "800",
    letterSpacing: -1.25,
    maxWidth: 710,
  },
  heroSub: { fontSize: 14, lineHeight: 21, marginTop: 10, maxWidth: 680 },
  primaryButton: {
    height: 48,
    paddingHorizontal: 18,
    borderRadius: 15,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryButtonCompact: { height: 40, borderRadius: 12, paddingHorizontal: 14 },
  primaryButtonText: { color: "#fff", fontSize: 14, fontWeight: "800" },
  autopilotStrip: {
    marginTop: 24,
    borderWidth: 1,
    borderRadius: 17,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  liveDot: {
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: `${GREEN}1C`,
    alignItems: "center",
    justifyContent: "center",
  },
  liveDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: GREEN,
  },
  autoTitle: { fontSize: 12, fontWeight: "800" },
  autoSub: { fontSize: 10, lineHeight: 15, marginTop: 2 },
  metrics: { flexDirection: "row", gap: 12 },
  metricsCompact: { flexWrap: "wrap" },
  metricCard: {
    flex: 1,
    minWidth: 170,
    padding: 17,
    borderRadius: 20,
    borderWidth: 1,
  },
  metricCardCompact: { minWidth: "46%" as any },
  metricIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.6,
    marginTop: 5,
  },
  metricNote: { fontSize: 10, fontWeight: "700", marginTop: 5 },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },
  tabs: { flexDirection: "row", padding: 4, borderWidth: 1, borderRadius: 15 },
  tab: {
    minHeight: 37,
    paddingHorizontal: 17,
    borderRadius: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  tabText: { fontSize: 12, fontWeight: "800" },
  tabCount: {
    backgroundColor: PURPLE,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  tabCountText: { color: "#fff", fontSize: 9, fontWeight: "900" },
  search: {
    height: 43,
    minWidth: 240,
    borderWidth: 1,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 13,
  },
  searchInput: { flex: 1, fontSize: 13, borderWidth: 0 },
  periodActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  periodPicker: {
    height: 40,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  arrowButton: {
    width: 37,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  periodText: {
    minWidth: 120,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "800",
  },
  listGap: { gap: 10 },
  rowCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  rowCardCompact: { flexWrap: "wrap" },
  avatar: {
    width: 47,
    height: 47,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  smallAvatar: {
    width: 39,
    height: 39,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: PURPLE, fontSize: 14, fontWeight: "900" },
  employeeMain: { flex: 1, minWidth: 180 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  employeeName: { fontSize: 14, fontWeight: "800" },
  employeeRole: { fontSize: 11, marginTop: 4 },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 7,
    marginTop: 7,
  },
  metaText: { fontSize: 9.5, fontWeight: "600" },
  metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: "#8B88A0" },
  statusPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    height: 21,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusText: { fontSize: 8.5, fontWeight: "800", textTransform: "capitalize" },
  salaryBlock: { minWidth: 125, alignItems: "flex-end" },
  salaryBlockCompact: { alignItems: "flex-start", marginLeft: 61 },
  salaryLabel: {
    fontSize: 8.5,
    fontWeight: "800",
    letterSpacing: 0.55,
    textTransform: "uppercase",
  },
  salaryValue: { fontSize: 16, fontWeight: "800", marginTop: 4 },
  outlineButton: {
    height: 39,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  outlineButtonText: { color: PURPLE, fontSize: 11, fontWeight: "800" },
  payCard: { borderWidth: 1, borderRadius: 20, overflow: "hidden" },
  payHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 15,
    padding: 15,
  },
  personInline: { flexDirection: "row", alignItems: "center", gap: 11 },
  payStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  netPay: { fontSize: 19, fontWeight: "900" },
  payBreakdown: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(128,128,145,.18)",
  },
  payMini: {
    flex: 1,
    padding: 12,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(128,128,145,.18)",
  },
  payMiniValue: { fontSize: 12, fontWeight: "800", marginTop: 4 },
  payActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 9,
    padding: 10,
  },
  textButton: {
    height: 34,
    borderRadius: 10,
    paddingHorizontal: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: `${PURPLE}10`,
  },
  textButtonLabel: { fontSize: 10, color: PURPLE, fontWeight: "800" },
  documentCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  documentIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  docNumber: { fontSize: 9, marginTop: 6 },
  docRight: { alignItems: "flex-end", gap: 8 },
  emptyState: {
    alignItems: "center",
    paddingVertical: 58,
    paddingHorizontal: 25,
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: `${PURPLE}12`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 15,
  },
  emptyTitle: { fontSize: 17, fontWeight: "800" },
  emptyMessage: {
    maxWidth: 430,
    textAlign: "center",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 7,
    marginBottom: 17,
  },
  loader: {
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  errorCard: {
    borderWidth: 1,
    borderRadius: 17,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  errorTitle: { fontSize: 13, fontWeight: "800" },
  errorText: { fontSize: 11, marginTop: 3 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(4,3,12,.72)",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
  },
  modalCard: {
    maxHeight: "92%",
    borderWidth: 1,
    borderRadius: 25,
    overflow: "hidden",
  },
  documentModal: {
    width: "100%",
    maxWidth: 510,
    maxHeight: "92%",
    borderWidth: 1,
    borderRadius: 25,
  },
  modalHead: {
    padding: 21,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  modalTitle: { fontSize: 21, fontWeight: "800", letterSpacing: -0.4 },
  modalSub: { fontSize: 11, marginTop: 5 },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "rgba(128,128,145,.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  formContent: { paddingHorizontal: 21, paddingBottom: 16 },
  formGrid: { flexDirection: "row", flexWrap: "wrap", columnGap: 12 },
  field: { minWidth: 215, flex: 1, marginBottom: 13 },
  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 7,
  },
  fieldLabel: { fontSize: 10.5, fontWeight: "700" },
  requiredDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: PURPLE,
  },
  fieldInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 13,
    fontSize: 13,
  },
  formSection: {
    fontSize: 12,
    fontWeight: "800",
    marginTop: 9,
    marginBottom: 10,
  },
  choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choice: {
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  choiceText: { fontSize: 9.5, fontWeight: "800" },
  switchRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  toggle: {
    flex: 1,
    minWidth: 220,
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    backgroundColor: "rgba(128,128,145,.07)",
  },
  toggleLabel: { fontSize: 12, fontWeight: "800" },
  toggleSub: { fontSize: 9.5, marginTop: 3 },
  modalFoot: {
    borderTopWidth: 1,
    padding: 15,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 10,
  },
  cancelButton: { height: 45, justifyContent: "center", paddingHorizontal: 16 },
  cancelText: { fontSize: 12, fontWeight: "700" },
  docChoiceList: { paddingHorizontal: 15, paddingBottom: 12, gap: 8 },
  docChoice: {
    borderWidth: 1,
    borderRadius: 15,
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  employeeActions: { flexDirection: "row", alignItems: "center", gap: 7 },
  iconButton: {
    width: 39,
    height: 39,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  signatureCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  signaturePreview: {
    width: 92,
    height: 58,
    borderWidth: 1,
    borderRadius: 12,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(139,92,246,.06)",
    overflow: "hidden",
  },
  signatureImage: { width: "100%", height: "100%" },
  signatureActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  signatureModalWrap: { paddingHorizontal: 15, paddingBottom: 10 },
  periodBlock: { paddingHorizontal: 15, paddingBottom: 4 },
});
