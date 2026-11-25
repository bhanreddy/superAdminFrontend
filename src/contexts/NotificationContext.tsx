import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState, Platform } from "react-native";
import {
  notificationApi,
  notificationError,
  NotificationBootstrap,
} from "../api/notifications";
import { useRouter } from "expo-router";
import {
  watchDevicePush,
  syncNotificationBadge,
} from "../services/notifications/push";
import { useAuth } from "../hooks/useAuth";

type NotificationContextValue = {
  data: NotificationBootstrap | null;
  error: string | null;
  refreshing: boolean;
  revision: number;
  refresh: () => Promise<void>;
  changed: () => Promise<void>;
};
const Context = createContext<NotificationContextValue | null>(null);
export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, mustChangePassword } = useAuth();
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const [data, setData] = useState<NotificationBootstrap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [revision, setRevision] = useState(0);
  const pending = useRef<Promise<void> | null>(null);
  const controller = useRef<AbortController | null>(null);
  const failures = useRef(0);
  const live = useRef(true);
  const refresh = useCallback((): Promise<void> => {
    if (!user || loading || mustChangePassword) return Promise.resolve();
    if (pending.current) return pending.current;
    const abort = new AbortController();
    controller.current = abort;
    setRefreshing(true);
    pending.current = notificationApi
      .bootstrap(abort.signal)
      .then((next) => {
        if (!live.current || abort.signal.aborted) return;
        setData((previous) =>
          JSON.stringify(previous) === JSON.stringify(next) ? previous : next,
        );
        setError(null);
        failures.current = 0;
      })
      .catch((e) => {
        if (!live.current || abort.signal.aborted) return;
        failures.current += 1;
        setError(notificationError(e));
      })
      .finally(() => {
        pending.current = null;
        if (live.current) setRefreshing(false);
      });
    return pending.current;
  }, [user?.id, loading, mustChangePassword]);
  const changed = useCallback(async () => {
    setRevision((v) => v + 1);
    await refresh();
  }, [refresh]);
  useEffect(() => {
    live.current = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    const active = () =>
      AppState.currentState !== "background" &&
      (Platform.OS !== "web" ||
        typeof document === "undefined" ||
        document.visibilityState !== "hidden");
    const poll = async () => {
      if (active()) await refresh();
      if (!stopped)
        timer = setTimeout(
          poll,
          Math.min(120000, 15000 * 2 ** Math.min(failures.current, 3)) +
            Math.random() * 2000,
        );
    };
    void poll();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    const visible = () => {
      if (active()) void refresh();
    };
    if (Platform.OS === "web" && typeof document !== "undefined")
      document.addEventListener("visibilitychange", visible);
    return () => {
      stopped = true;
      live.current = false;
      clearTimeout(timer);
      controller.current?.abort();
      subscription.remove();
      if (Platform.OS === "web" && typeof document !== "undefined")
        document.removeEventListener("visibilitychange", visible);
    };
  }, [refresh]);
  useEffect(() => {
    if (!user || mustChangePassword) return;
    return watchDevicePush(
      user.id,
      () => {
        void refresh();
        setRevision((v) => v + 1);
      },
      () => routerRef.current.push("/(app)/notifications" as any),
    );
  }, [user?.id, mustChangePassword, refresh]);
  useEffect(() => {
    void syncNotificationBadge(data?.unread || 0);
  }, [data?.unread]);
  return (
    <Context.Provider
      value={{ data, error, refreshing, revision, refresh, changed }}
    >
      {children}
    </Context.Provider>
  );
}
export function useNotifications() {
  const value = useContext(Context);
  if (!value) throw new Error("NotificationProvider is required");
  return value;
}
