import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import {
  Bell,
  CheckCheck,
  Inbox,
  MailOpen,
  RefreshCw,
  Settings2,
  Archive,
  ArrowUpRight,
  Send,
} from "lucide-react-native";
import { useTheme } from "../../contexts/ThemeContext";
import { useNotifications } from "../../contexts/NotificationContext";
import { useAuth } from "../../hooks/useAuth";
import {
  notificationApi,
  notificationError,
  NotificationChannel,
  NotificationItem,
} from "../../api/notifications";
import { Button } from "../../components/ui/Button";
import { MotionPressable } from "../../components/ui/MotionPressable";
import { Skeleton } from "../../components/ui/Skeleton";
import { borderRadius, theme } from "../../constants/theme";
import {
  nativePushSupported,
  enableDevicePush,
  disableDevicePush,
  devicePushEnabled,
} from "../../services/notifications/push";
import { ROLE_LABELS, ROLES } from "../../constants/rbac";

const { spacing } = theme;
const EMPTY: NotificationItem[] = [];
const allowedPaths = new Set([
  "/connect",
  "/requirements",
  "/complaints",
  "/checklist",
  "/books",
  "/console/billing",
  "/console/payroll",
  "/console/expenses",
  "/console/collections",
  "/console/sprint",
]);
const Row = memo(function Row({
  item,
  label,
  busy,
  onAction,
  onOpen,
}: {
  item: NotificationItem;
  label: string;
  busy: boolean;
  onAction: (
    item: NotificationItem,
    operation: "read" | "unread" | "archive",
  ) => void;
  onOpen: (item: NotificationItem) => void;
}) {
  const { colors } = useTheme();
  const urgent = item.priority !== "normal";
  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: item.read_at ? colors.card : colors.primaryMuted,
          borderColor: colors.borderSubtle,
        },
      ]}
    >
      <View style={styles.rowTop}>
        <View
          style={[
            styles.icon,
            { backgroundColor: urgent ? colors.warningDim : colors.surface },
          ]}
        >
          <Bell size={19} color={urgent ? colors.warning : colors.primary} />
        </View>
        <View style={styles.grow}>
          <View style={styles.wrap}>
            <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>
              {label}
            </Text>
            {urgent && (
              <Text style={[styles.eyebrow, { color: colors.warning }]}>
                {item.priority.toUpperCase()}
              </Text>
            )}
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {item.title}
          </Text>
        </View>
        {!item.read_at && (
          <View
            accessibilityLabel="Unread"
            style={[styles.dot, { backgroundColor: colors.primary }]}
          />
        )}
      </View>
      {!!item.body && (
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          {item.body}
        </Text>
      )}
      <Text style={[styles.timestamp, { color: colors.textSecondary }]}>
        {item.school_id ? "School #" + item.school_id + " · " : ""}
        {new Date(item.created_at).toLocaleString("en-IN", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </Text>
      <View style={styles.rowActions}>
        {item.action_path && allowedPaths.has(item.action_path) && (
          <Button
            title="Open workspace"
            variant="secondary"
            size="sm"
            disabled={busy}
            rightIcon={<ArrowUpRight size={15} color={colors.primary} />}
            onPress={() => onOpen(item)}
          />
        )}
        <Button
          title={item.read_at ? "Mark unread" : "Mark read"}
          variant="ghost"
          size="sm"
          disabled={busy}
          leftIcon={<MailOpen size={16} color={colors.textSecondary} />}
          onPress={() => onAction(item, item.read_at ? "unread" : "read")}
        />
        <Button
          title="Archive"
          variant="ghost"
          size="sm"
          disabled={busy}
          leftIcon={<Archive size={16} color={colors.textSecondary} />}
          onPress={() => onAction(item, "archive")}
        />
      </View>
    </View>
  );
});

function ChannelPreference({
  item,
  busy,
  onChange,
  capabilities,
}: {
  item: NotificationChannel;
  busy: boolean;
  capabilities: { email: boolean; push: boolean; sms: boolean };
  onChange: (
    channel: string,
    key: "inbox_enabled" | "email_enabled" | "push_enabled" | "sms_enabled",
    value: boolean,
  ) => void;
}) {
  const { colors } = useTheme();
  const transports = [
    {
      key: "inbox_enabled" as const,
      label: "In-app inbox",
      enabled: !item.mandatory,
      hint: item.mandatory ? "Required for account security" : undefined,
    },
    {
      key: "email_enabled" as const,
      label: "Email",
      enabled: capabilities.email,
      hint: !capabilities.email ? "Provider not configured" : undefined,
    },
    {
      key: "push_enabled" as const,
      label: "Push",
      enabled: capabilities.push,
      hint: !capabilities.push
        ? "Provider not configured"
        : "Requires a registered device",
    },
    {
      key: "sms_enabled" as const,
      label: "SMS",
      enabled: capabilities.sms,
      hint: !capabilities.sms ? "Provider not configured" : undefined,
    },
  ];
  return (
    <View
      style={[
        styles.row,
        { backgroundColor: colors.card, borderColor: colors.borderSubtle },
      ]}
    >
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        {item.label}
      </Text>
      <Text style={[styles.body, { color: colors.textSecondary }]}>
        {item.description}
      </Text>
      {transports.map((t) => (
        <View key={t.key} style={styles.preference}>
          <View style={styles.grow}>
            <Text
              style={[styles.preferenceLabel, { color: colors.textPrimary }]}
            >
              {t.label}
            </Text>
            {t.hint && (
              <Text style={[styles.timestamp, { color: colors.textSecondary }]}>
                {t.hint}
              </Text>
            )}
          </View>
          <View style={styles.switchTarget}>
            <Switch
              accessibilityLabel={`${item.label}: ${t.label}`}
              disabled={busy || !t.enabled}
              value={item[t.key]}
              onValueChange={(value) => onChange(item.id, t.key, value)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function NotificationCenterScreen() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const compact = width < 640;
  const router = useRouter();
  const { isFounder, roleLabel } = useAuth();
  const {
    data: bootstrap,
    error: connectionError,
    refresh,
    changed,
    revision,
  } = useNotifications();
  const [deviceEnabled, setDeviceEnabled] = useState(false);
  useEffect(() => {
    let live = true;
    if (nativePushSupported)
      void devicePushEnabled()
        .then((v) => {
          if (live) setDeviceEnabled(v);
        })
        .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  const [tab, setTab] = useState<"inbox" | "preferences" | "publish">("inbox");
  const [channel, setChannel] = useState<string | undefined>();
  const [unread, setUnread] = useState(false);
  const [rows, setRows] = useState<NotificationItem[]>(EMPTY);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [paging, setPaging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const generation = useRef(0);
  const abort = useRef<AbortController | null>(null);
  const pagingRef = useRef(false);
  const paginated = useRef(false);
  const [updatesAvailable, setUpdatesAvailable] = useState(false);
  const loaded = useRef(false);
  const focused = useRef(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const publishKey = useRef<string | null>(null);
  const publishPayload = useRef<string | null>(null);
  const load = useCallback(
    async (before?: string) => {
      if (before && pagingRef.current) return;
      const version = before ? generation.current : ++generation.current;
      if (!before) {
        paginated.current = false;
        setUpdatesAvailable(false);
        abort.current?.abort();
        pagingRef.current = false;
        setPaging(false);
      }
      const controller = new AbortController();
      if (!before) abort.current = controller;
      if (before) {
        paginated.current = true;
        pagingRef.current = true;
        setPaging(true);
      } else if (!loaded.current) setLoading(true);
      try {
        const page = await notificationApi.list(
          { channel, unread: unread ? "true" : undefined, before },
          controller.signal,
        );
        if (
          version !== generation.current ||
          controller.signal.aborted ||
          !focused.current
        )
          return;
        setRows((current) =>
          before
            ? [
                ...current,
                ...page.data.filter((n) => !current.some((c) => c.id === n.id)),
              ]
            : page.data,
        );
        setCursor(page.next_cursor);
        loaded.current = true;
        setError(null);
      } catch (e) {
        if (
          version === generation.current &&
          !controller.signal.aborted &&
          focused.current
        )
          setError(notificationError(e));
      } finally {
        if (version === generation.current) {
          setLoading(false);
          setPaging(false);
          pagingRef.current = false;
        }
      }
    },
    [channel, unread],
  );
  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      loaded.current = false;
      setRows(EMPTY);
      setCursor(null);
      void load();
      void refresh();
      return () => {
        focused.current = false;
        generation.current++;
        abort.current?.abort();
      };
    }, [load, refresh]),
  );
  // The shared poll refreshes the visible first page. Later pages load on demand.
  useEffect(() => {
    if (focused.current && loaded.current && tab === "inbox") {
      if (paginated.current) setUpdatesAvailable(true);
      else void load();
    }
  }, [bootstrap, revision, tab]);
  const act = useCallback(
    async (
      item: NotificationItem,
      operation: "read" | "unread" | "archive",
    ) => {
      if (busy) return;
      setBusy(item.id);
      setError(null);
      setNotice(null);
      try {
        await notificationApi.update(item.id, operation);
        await changed();
        if (operation === "archive") setNotice("Notification archived.");
      } catch (e) {
        setError(notificationError(e));
      } finally {
        setBusy(null);
      }
    },
    [busy, changed, load],
  );
  const open = useCallback(
    (item: NotificationItem) => {
      if (!item.action_path || !allowedPaths.has(item.action_path)) return;
      if (!item.read_at) void act(item, "read");
      router.push(`/(app)${item.action_path}` as any);
    },
    [act, router],
  );
  const renderRow = useCallback(
    ({ item }: { item: NotificationItem }) => (
      <Row
        item={item}
        label={
          bootstrap?.channels.find((c) => c.id === item.channel)?.label ||
          item.channel
        }
        busy={!!busy}
        onAction={act}
        onOpen={open}
      />
    ),
    [bootstrap?.channels, busy, act, open],
  );
  const markAll = async () => {
    if (!rows.length || busy) return;
    setBusy("all");
    setError(null);
    try {
      await notificationApi.readAll(rows[0].created_at, channel);
      await changed();
      setNotice("Notifications marked as read.");
    } catch (e) {
      setError(notificationError(e));
    } finally {
      setBusy(null);
    }
  };
  const preference = async (
    id: string,
    key: "inbox_enabled" | "email_enabled" | "push_enabled" | "sms_enabled",
    value: boolean,
  ) => {
    if (busy) return;
    setBusy(id);
    setError(null);
    setNotice(null);
    try {
      await notificationApi.preferences(id, { [key]: value });
      await changed();
      setNotice("Preferences saved.");
    } catch (e) {
      setError(notificationError(e));
    } finally {
      setBusy(null);
    }
  };
  const configureDevice = async () => {
    if (busy || !bootstrap) return;
    setBusy("device");
    setError(null);
    try {
      if (deviceEnabled) await disableDevicePush();
      else await enableDevicePush(bootstrap.channels);
      setDeviceEnabled(!deviceEnabled);
      await changed();
      setNotice(
        deviceEnabled
          ? "Push disabled for this session."
          : "Device registered. Choose Push for the channels you want.",
      );
    } catch (e: any) {
      setError(
        e?.response?.data?.error ||
          e?.message ||
          "Unable to register this device. Retry.",
      );
    } finally {
      setBusy(null);
    }
  };
  const publish = async () => {
    if (busy || !draftTitle.trim() || !draftBody.trim()) return;
    const payload = {
      title: draftTitle.trim(),
      body: draftBody.trim(),
      roles,
      priority: "normal",
    };
    // Retain the key on ambiguous timeouts. Changing the draft makes a new event.
    const fingerprint = JSON.stringify(payload);
    if (publishPayload.current !== fingerprint) {
      publishKey.current = `notice_${Date.now()}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
      publishPayload.current = fingerprint;
    }
    setBusy("publish");
    setError(null);
    try {
      await notificationApi.publish(payload, publishKey.current!);
      setDraftTitle("");
      setDraftBody("");
      publishPayload.current = null;
      setNotice("Announcement queued for delivery.");
      await changed();
    } catch (e) {
      setError(notificationError(e));
    } finally {
      setBusy(null);
    }
  };
  const chip = (
    label: string,
    selected: boolean,
    onPress: () => void,
    key: string,
  ) => (
    <MotionPressable
      key={key}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.primaryMuted : colors.card,
          borderColor: selected ? colors.primary : colors.border,
        },
      ]}
    >
      <Text
        style={[
          styles.chipText,
          { color: selected ? colors.primary : colors.textSecondary },
        ]}
      >
        {label}
      </Text>
    </MotionPressable>
  );
  const header = (
    <View style={styles.header}>
      <View style={styles.heading}>
        <View style={styles.grow}>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>
            {roleLabel.toUpperCase()} · PERSONAL INBOX
          </Text>
          <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>
            Notifications
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {bootstrap
              ? `${bootstrap.unread} unread · Updates organised around your work`
              : "Updates organised around your work"}
          </Text>
        </View>
        <Button
          accessibilityLabel="Refresh notifications"
          variant="outline"
          icon={<RefreshCw size={19} color={colors.textPrimary} />}
          onPress={() => {
            void load();
            void refresh();
          }}
        />
      </View>
      <View style={styles.wrap}>
        <Button
          title="Inbox"
          variant={tab === "inbox" ? "primary" : "ghost"}
          leftIcon={
            <Inbox
              size={17}
              color={tab === "inbox" ? colors.onPrimary : colors.textSecondary}
            />
          }
          onPress={() => setTab("inbox")}
        />
        <Button
          title="Preferences"
          variant={tab === "preferences" ? "primary" : "ghost"}
          leftIcon={
            <Settings2
              size={17}
              color={
                tab === "preferences" ? colors.onPrimary : colors.textSecondary
              }
            />
          }
          onPress={() => setTab("preferences")}
        />
        {isFounder && (
          <Button
            title="Announce"
            variant={tab === "publish" ? "primary" : "ghost"}
            leftIcon={
              <Send
                size={17}
                color={
                  tab === "publish" ? colors.onPrimary : colors.textSecondary
                }
              />
            }
            onPress={() => setTab("publish")}
          />
        )}
      </View>
      {tab !== "publish" && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.channels}
        >
          {chip("All channels", !channel, () => setChannel(undefined), "all")}
          {bootstrap?.channels.map((c) =>
            chip(
              `${c.label}${c.unread ? ` · ${c.unread}` : ""}`,
              channel === c.id,
              () => setChannel(c.id),
              c.id,
            ),
          )}
        </ScrollView>
      )}
      {tab === "inbox" && (
        <View style={styles.toolbar}>
          {chip(
            unread ? "Unread only ✓" : "Unread only",
            unread,
            () => setUnread((v) => !v),
            "unread",
          )}
          <Button
            title="Mark all read"
            variant="ghost"
            leftIcon={<CheckCheck size={17} color={colors.textSecondary} />}
            disabled={!rows.length || !!busy}
            onPress={markAll}
          />
        </View>
      )}
      {tab === "inbox" && updatesAvailable && (
        <Button
          title="New updates available · Refresh inbox"
          variant="outline"
          onPress={() => void load()}
        />
      )}
      {(error || connectionError) && (
        <View
          accessibilityRole="alert"
          style={[styles.message, { backgroundColor: colors.errorDim }]}
        >
          <Text style={{ color: colors.error, flex: 1 }}>
            {error || connectionError}
          </Text>
          <Button
            title="Retry"
            variant="ghost"
            onPress={() => {
              void load();
              void refresh();
            }}
          />
        </View>
      )}
      {!!notice && (
        <Text
          accessibilityLiveRegion="polite"
          style={{ color: colors.success, paddingVertical: spacing.sm }}
        >
          {notice}
        </Text>
      )}
    </View>
  );
  return (
    <View style={styles.root}>
      {header}
      {tab === "inbox" ? (
        loading ? (
          <View style={styles.list}>
            {[0, 1, 2].map((i) => (
              <Skeleton
                key={i}
                height={150}
                style={{ marginBottom: spacing.md }}
              />
            ))}
          </View>
        ) : (
          <FlatList
            data={rows}
            renderItem={renderRow}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            windowSize={7}
            initialNumToRender={8}
            maxToRenderPerBatch={8}
            refreshing={false}
            onRefresh={() => {
              void load();
              void refresh();
            }}
            onEndReached={() => {
              if (cursor && !paging && !busy && !error) void load(cursor);
            }}
            onEndReachedThreshold={0.3}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Inbox size={36} color={colors.primary} />
                <Text style={[styles.title, { color: colors.textPrimary }]}>
                  {error || connectionError
                    ? "Inbox unavailable"
                    : unread
                      ? "No unread notifications"
                      : "You’re all caught up"}
                </Text>
                <Text
                  style={[
                    styles.body,
                    { color: colors.textSecondary, textAlign: "center" },
                  ]}
                >
                  {error || connectionError
                    ? "Retry when your connection is restored."
                    : "New updates for this channel will appear here."}
                </Text>
              </View>
            }
            ListFooterComponent={
              paging ? (
                <Skeleton height={100} />
              ) : cursor ? (
                <Button
                  title="Load more"
                  variant="outline"
                  onPress={() => void load(cursor)}
                />
              ) : null
            }
          />
        )
      ) : tab === "preferences" ? (
        <FlatList
          data={
            bootstrap?.channels.filter((c) => !channel || c.id === channel) ||
            []
          }
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          initialNumToRender={4}
          ListHeaderComponent={
            <View style={{ marginBottom: spacing.md }}>
              <Text style={[styles.body, { color: colors.textSecondary }]}>
                Choose delivery for each channel. Security alerts always stay in
                your inbox. Push devices registered:{" "}
                {bootstrap?.registered_devices || 0}.
              </Text>
              {nativePushSupported && bootstrap?.capabilities.expo_push && (
                <Button
                  title={
                    deviceEnabled
                      ? "Disable push on this device"
                      : "Enable push on this device"
                  }
                  variant="outline"
                  loading={busy === "device"}
                  disabled={!!busy}
                  onPress={configureDevice}
                  style={{ marginTop: spacing.md }}
                />
              )}
            </View>
          }
          renderItem={({ item }) => (
            <ChannelPreference
              item={item}
              busy={!!busy}
              capabilities={bootstrap!.capabilities}
              onChange={preference}
            />
          )}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={[
              styles.row,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Send a company announcement
            </Text>
            <Text style={[styles.body, { color: colors.textSecondary }]}>
              Recipients receive one copy in their own inbox. Select roles, or
              leave all roles selected.
            </Text>
            <Text
              style={[
                styles.preferenceLabel,
                { color: colors.textPrimary, marginTop: spacing.lg },
              ]}
            >
              Title
            </Text>
            <TextInput
              accessibilityLabel="Announcement title"
              value={draftTitle}
              maxLength={160}
              onChangeText={setDraftTitle}
              placeholder="e.g. Planned maintenance on Sunday"
              placeholderTextColor={colors.textTertiary}
              style={[
                styles.input,
                {
                  color: colors.textPrimary,
                  backgroundColor: colors.inputBg,
                  borderColor: colors.border,
                },
              ]}
            />
            <Text
              style={[styles.preferenceLabel, { color: colors.textPrimary }]}
            >
              Message
            </Text>
            <TextInput
              accessibilityLabel="Announcement message"
              value={draftBody}
              maxLength={2000}
              onChangeText={setDraftBody}
              multiline
              placeholder="e.g. Complete pending approvals before the maintenance window."
              placeholderTextColor={colors.textTertiary}
              style={[
                styles.input,
                styles.messageInput,
                {
                  color: colors.textPrimary,
                  backgroundColor: colors.inputBg,
                  borderColor: colors.border,
                },
              ]}
            />
            <Text
              style={[
                styles.preferenceLabel,
                { color: colors.textPrimary, marginBottom: spacing.sm },
              ]}
            >
              Audience
            </Text>
            <View style={styles.wrap}>
              {chip(
                "All roles",
                !roles.length,
                () => setRoles([]),
                "all-roles",
              )}
              {Object.values(ROLES).map((role) =>
                chip(
                  ROLE_LABELS[role],
                  roles.includes(role),
                  () =>
                    setRoles((current) =>
                      current.includes(role)
                        ? current.filter((r) => r !== role)
                        : [...current, role],
                    ),
                  role,
                ),
              )}
            </View>
            <Button
              title="Send announcement"
              loading={busy === "publish"}
              disabled={!!busy || !draftTitle.trim() || !draftBody.trim()}
              onPress={publish}
              style={{
                marginTop: spacing.lg,
                alignSelf: compact ? "stretch" : "flex-start",
              }}
            />
          </View>
        </ScrollView>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
    width: "100%",
    maxWidth: 1120,
    alignSelf: "center",
  },
  header: { gap: spacing.md, paddingBottom: spacing.md },
  heading: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  grow: { flex: 1, minWidth: 0 },
  pageTitle: {
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: -0.5,
    marginTop: spacing.sm,
  },
  eyebrow: { fontSize: 11, fontWeight: "700", letterSpacing: 0.6 },
  subtitle: { fontSize: 14, lineHeight: 21, marginTop: spacing.sm },
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    alignItems: "center",
  },
  channels: { gap: spacing.sm, paddingVertical: spacing.xs },
  chip: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  chipText: { fontSize: 12, fontWeight: "600" },
  toolbar: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  list: { paddingBottom: spacing["2xl"], gap: spacing.md },
  row: {
    padding: spacing.lg,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  rowTop: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  icon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: "700",
    marginTop: spacing.xs,
  },
  body: { fontSize: 14, lineHeight: 22, marginTop: spacing.sm },
  timestamp: { fontSize: 12, lineHeight: 18, marginTop: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: spacing.sm },
  rowActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  empty: { paddingVertical: 56, alignItems: "center", gap: spacing.sm },
  message: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  preference: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  preferenceLabel: { fontSize: 14, fontWeight: "600" },
  switchTarget: {
    minHeight: 44,
    minWidth: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minHeight: 48,
    fontSize: 15,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  messageInput: { minHeight: 132, textAlignVertical: "top" },
});
