import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
  AppState,
  Platform,
  KeyboardAvoidingView,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Hash,
  Lock,
  MessageCircle,
  ArrowLeft,
  Send,
  Search,
  Bell,
  ChevronRight,
  Plus,
  Paperclip,
  AtSign,
  Bookmark,
  Settings2,
  ShieldCheck,
  MoreHorizontal,
  CheckCheck,
  RefreshCw,
  PenSquare,
} from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { useCluster } from '../../contexts/ClusterContext';
import {
  Bootstrap,
  Message,
  Employee,
  Notice,
  Draft,
  connectApi,
  draftId,
  errorText,
  mergeMessages,
} from '../../services/connect/api';
import {
  watchConnect,
  reconcileHistory,
  ConnectionState,
} from '../../services/connect/realtime';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import {
  pickConnectFile,
  downloadConnectFile,
} from '../../services/connect/files';

type Pending = {
  conversation_id: string;
  draft: Draft;
  error: string;
  file?: FormData;
};
type Dialog =
  | 'create'
  | 'people'
  | 'members'
  | 'notifications'
  | 'search'
  | 'settings'
  | 'saved'
  | 'pins'
  | 'task'
  | 'message'
  | 'company'
  | null;
const EMOJI = ['👍', '❤️', '🎉', '👀', '✅'];

export default function ConnectScreen() {
  const { user } = useAuth();
  const { selectedCluster } = useCluster();
  return (
    <ConnectWorkspace
      key={`${user?.id || 'signed-out'}:${selectedCluster?.cluster_id || ''}`}
    />
  );
}
function ConnectWorkspace() {
  const { colors: themeColors, isDark } = useTheme();
  const colors = useMemo(
    () => ({
      ...themeColors,
      primary: isDark ? '#70ADFF' : '#176BD6',
      textInverse: '#FFFFFF',
      border: isDark ? '#2B3544' : themeColors.border,
      borderSubtle: isDark ? '#202A38' : themeColors.borderSubtle,
      textSecondary: isDark ? '#AAB6C8' : '#596678',
      textTertiary: isDark ? '#94A0B2' : '#738093',
    }),
    [themeColors, isDark],
  );
  const actionColor = '#176BD6';
  const rail = {
    background: isDark ? '#101923' : '#18283E',
    text: '#F3F6FC',
    muted: '#AAB9CD',
    line: '#304158',
    selected: '#304B70',
  };
  const composerRef = useRef<TextInput>(null);
  const { user, role, can, isFounder } = useAuth();
  const { selectedCluster } = useCluster();
  const router = useRouter();
  const params = useLocalSearchParams<{
    conversation?: string;
    message?: string;
  }>();
  const { width } = useWindowDimensions();
  const mobile = width < 900;
  const [context, setContext] = useState<Bootstrap | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState('');
  const [active, setActive] = useState<string | null>(null),
    [messages, setMessages] = useState<Message[]>([]),
    [historyLoading, setHistoryLoading] = useState(false),
    [more, setMore] = useState(false);
  const [thread, setThread] = useState<Message | null>(null),
    [threadMore, setThreadMore] = useState(false);
  const [draft, setDraft] = useState(''),
    [editing, setEditing] = useState<Message | null>(null),
    [sending, setSending] = useState(false),
    [pending, setPending] = useState<Pending[]>([]);
  const [connection, setConnection] = useState<ConnectionState>('connecting'),
    [retryConnection, setRetryConnection] = useState(0);
  const [dialog, setDialog] = useState<Dialog>(null),
    [people, setPeople] = useState<Employee[]>([]),
    [peopleQuery, setPeopleQuery] = useState(''),
    [notices, setNotices] = useState<Notice[]>([]);
  const [searchQuery, setSearchQuery] = useState(''),
    [searchAuthor, setSearchAuthor] = useState(''),
    [searchFrom, setSearchFrom] = useState(''),
    [searchTo, setSearchTo] = useState(''),
    [searchHere, setSearchHere] = useState(false),
    [mentionsOnly, setMentionsOnly] = useState(false),
    [searchResults, setSearchResults] = useState<Awaited<
      ReturnType<typeof connectApi.search>
    > | null>(null);
  const [busy, setBusy] = useState(false),
    [channelName, setChannelName] = useState(''),
    [purpose, setPurpose] = useState(''),
    [description, setDescription] = useState(''),
    [privateChannel, setPrivateChannel] = useState(false),
    [announcement, setAnnouncement] = useState(false),
    [category, setCategory] = useState('company');
  const [members, setMembers] = useState<
      Awaited<ReturnType<typeof connectApi.members>>
    >([]),
    [suggestions, setSuggestions] = useState<Employee[]>([]);
  const [bookmarks, setBookmarks] = useState<
      Awaited<ReturnType<typeof connectApi.saved>>
    >([]),
    [presence, setPresence] = useState<
      Awaited<ReturnType<typeof connectApi.listPresence>>
    >([]);
  const [actionMessage, setActionMessage] = useState<Message | null>(null),
    [pickedFile, setPickedFile] = useState<FormData | null>(null),
    [failedUploads, setFailedUploads] = useState<
      {
        message: Message;
        form: FormData;
      }[]
    >([]);
  const [taskTitle, setTaskTitle] = useState(''),
    [taskDescription, setTaskDescription] = useState(''),
    [taskSchool, setTaskSchool] = useState(''),
    [taskAssignee, setTaskAssignee] = useState(''),
    [taskPriority, setTaskPriority] = useState('MEDIUM'),
    [taskDeadline, setTaskDeadline] = useState(''),
    [taskStatus, setTaskStatus] = useState('NOT_STARTED');
  const [taskSchools, setTaskSchools] = useState<
      { id: number; name: string }[]
    >([]),
    [taskEmployees, setTaskEmployees] = useState<Employee[]>([]),
    [searchEmployees, setSearchEmployees] = useState<Employee[]>([]);
  const [accessNotice, setAccessNotice] = useState('');
  const activeRef = useRef(active),
    messagesRef = useRef(messages),
    scope = useRef(0);
  const messageList = useRef<FlatList<Message>>(null);
  const scrollToLatest = useRef(true),
    nearBottom = useRef(true),
    jumpToMessage = useRef<string | null>(null);
  activeRef.current = active;
  messagesRef.current = messages;
  const self = context?.self.id;
  const selected = context?.channels.find((c) => c.id === active);
  const dm = context?.direct_messages.find((c) => c.id === active);
  const currentTitle = selected
    ? `# ${selected.name}`
    : dm?.name || 'Conversation';
  const roots = useMemo(() => messages.filter((m) => !m.parent_id), [messages]);
  useEffect(() => {
    const id = jumpToMessage.current;
    if (!id || thread) return;
    const index = roots.findIndex((m) => m.id === id);
    if (index >= 0) {
      jumpToMessage.current = null;
      scrollToLatest.current = false;
      messageList.current?.scrollToIndex({
        index,
        animated: false,
        viewPosition: 0.4,
      });
    }
  }, [roots, thread]);
  const replies = useMemo(
    () => messages.filter((m) => m.parent_id === thread?.id),
    [messages, thread?.id],
  );
  const textStyle = { color: colors.textPrimary };
  const fieldStyle = [
    styles.input,
    {
      backgroundColor: colors.background,
      color: colors.textPrimary,
      borderColor: colors.border,
    },
  ];
  const action = async (fn: () => Promise<any>) => {
    setError('');
    setBusy(true);
    try {
      return await fn();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const refreshContext = useCallback(async () => {
    const version = scope.current;
    const next = await connectApi.bootstrap().catch((e: any) => {
      if (
        version === scope.current &&
        [401, 403].includes(e?.response?.status)
      ) {
        scope.current++;
        setContext(null);
        setMessages([]);
        setThread(null);
        setActive(null);
        setDialog(null);
        setPending([]);
        setPickedFile(null);
        setFailedUploads([]);
        setActionMessage(null);
        setSearchResults(null);
        setNotices([]);
        setBookmarks([]);
        setPeople([]);
        setPresence([]);
        setMembers([]);
        setSuggestions([]);
        setTaskTitle('');
        setTaskDescription('');
        setTaskEmployees([]);
        setSearchEmployees([]);
        setDraft('');
        setEditing(null);
        setSending(false);
        setError(errorText(e));
      }
      throw e;
    });
    if (version === scope.current) setContext(next);
    if (connectApi.listPresence)
      void connectApi
        .listPresence()
        .then((rows) => {
          if (version === scope.current) setPresence(rows);
        })
        .catch(() => {});
    return next;
  }, []);
  const refresh = useCallback(async () => {
    const version = scope.current,
      id = activeRef.current;
    try {
      await refreshContext();
      if (id) {
        const current = messagesRef.current;
        const merged = current.length
          ? await reconcileHistory(id, current)
          : (await connectApi.history(id)).messages;
        if (version === scope.current && id === activeRef.current)
          setMessages((old) => mergeMessages(old, merged));
      }
    } catch (e: any) {
      if (version !== scope.current) return;
      if ([403, 404].includes(e?.response?.status)) {
        setMessages([]);
        setThread(null);
        setActive(null);
      }
      setError(errorText(e));
    }
  }, [refreshContext]);
  useEffect(() => {
    const version = ++scope.current;
    setContext(null);
    setMessages([]);
    setActive(null);
    setPending([]);
    setThread(null);
    setDraft('');
    setLoading(true);
    setError('');
    if (!user || role === 'CA' || role === 'CA_LEAD') {
      setLoading(false);
      return;
    }
    connectApi
      .bootstrap()
      .then((next) => {
        if (version !== scope.current) return;
        setContext(next);
        setActive(
          params.conversation ||
            (!mobile
              ? next.channels.find((c) => c.joined && !c.archived_at)?.id ||
                next.direct_messages[0]?.id ||
                null
              : null),
        );
      })
      .catch((e) => {
        if (version === scope.current) setError(errorText(e));
      })
      .finally(() => {
        if (version === scope.current) setLoading(false);
      });
    return () => {
      scope.current++;
    };
  }, [user?.id, selectedCluster?.cluster_id]);

  useEffect(() => {
    if (!context) return;
    const version = scope.current;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const stop = watchConnect(
      (event) => {
        if (version !== scope.current) return;
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          void refreshContext().catch((e) => setError(errorText(e)));
        }, 200);
        const id = activeRef.current;
        if (event.conversation_id === id && event.message_id) {
          void connectApi
            .message(event.message_id)
            .then(async (m) => {
              const incoming = [m];
              if (m.parent_id)
                incoming.push(await connectApi.message(m.parent_id));
              if (version === scope.current && id === activeRef.current) {
                if (nearBottom.current && !m.parent_id)
                  scrollToLatest.current = true;
                setMessages((old) => mergeMessages(old, incoming));
              }
            })
            .catch(() => {
              void refresh();
            });
        } else if (event.conversation_id === id && event.user_id === self)
          void refresh();
      },
      (state) => {
        if (version === scope.current) {
          setConnection(state);
        }
      },
      () => {
        void refresh();
      },
    );
    return () => {
      stop();
      if (timer) clearTimeout(timer);
    };
  }, [!!context, self, retryConnection, refresh, refreshContext]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    const visible = () => {
      if (
        typeof document !== 'undefined' &&
        document.visibilityState === 'visible'
      )
        void refresh();
    };
    if (Platform.OS === 'web')
      document.addEventListener('visibilitychange', visible);
    return () => {
      sub.remove();
      if (Platform.OS === 'web')
        document.removeEventListener('visibilitychange', visible);
    };
  }, [refresh]);

  useEffect(() => {
    if (
      context &&
      params.conversation &&
      params.conversation !== activeRef.current
    )
      chooseConversation(params.conversation);
  }, [params.conversation, !!context]);

  useEffect(() => {
    let cancelled = false;
    const version = scope.current;
    setMessages([]);
    scrollToLatest.current = true;
    nearBottom.current = true;
    setThread(null);
    setEditing(null);
    setDraft('');
    setMore(false);
    setPickedFile(null);
    if (!active) return;
    setHistoryLoading(true);
    connectApi
      .history(active)
      .then(async (result) => {
        if (cancelled || version !== scope.current) return;
        setMessages(result.messages);
        setMore(result.has_more);
        if (params.message && params.conversation === active)
          await navigateMessage(params.message);
      })
      .catch((e) => {
        if (!cancelled) setError(errorText(e));
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [active, params.conversation, params.message]);

  const mentionQuery = draft.match(/(?:^|\s)@([^\s<>]*)$/)?.[1];
  useEffect(() => {
    let cancelled = false;
    setSuggestions([]);
    if (mentionQuery === undefined || !active) return;
    const timer = setTimeout(() => {
      connectApi
        .employees(mentionQuery, active)
        .then((rows) => {
          if (!cancelled) setSuggestions(rows);
        })
        .catch(() => {});
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [mentionQuery, active]);
  useEffect(() => {
    if (dialog !== 'people' && dialog !== 'members' && dialog !== 'company')
      return;
    let cancelled = false;
    setPeople([]);
    const timer = setTimeout(() => {
      (dialog === 'company'
        ? connectApi.directory(peopleQuery)
        : connectApi.employees(peopleQuery)
      )
        .then((rows) => {
          if (!cancelled) setPeople(rows);
        })
        .catch((e) => {
          if (!cancelled) setError(errorText(e));
        });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [dialog, peopleQuery]);

  function chooseConversation(id: string) {
    setDialog(null);
    setError('');
    setActive(id);
    activeRef.current = id;
  }
  async function openThread(m: Message) {
    setThread(m);
    setEditing(null);
    setDraft('');
    const id = activeRef.current;
    const version = scope.current;
    try {
      const result = await connectApi.history(m.conversation_id, {
        parent: m.id,
      });
      if (id === activeRef.current && version === scope.current) {
        setMessages((old) => mergeMessages(old, [m, ...result.messages]));
        setThreadMore(result.has_more);
      }
    } catch (e) {
      setError(errorText(e));
    }
  }
  async function navigateMessage(id: string) {
    const m = await connectApi.message(id);
    const version = scope.current;
    if (m.conversation_id !== activeRef.current) {
      chooseConversation(m.conversation_id);
      router.setParams({ conversation: m.conversation_id, message: id });
      return;
    }
    const result = await connectApi.history(m.conversation_id, {
      before: Number(m.sequence) + 1,
    });
    if (version !== scope.current || m.conversation_id !== activeRef.current)
      return;
    scrollToLatest.current = false;
    if (!m.parent_id) jumpToMessage.current = m.id;
    setMessages((old) => mergeMessages(old, [m, ...result.messages]));
    setDialog(null);
    if (m.parent_id) await openThread(await connectApi.message(m.parent_id));
  }
  async function sendDraft(item?: Pending) {
    const id = item?.conversation_id || activeRef.current;
    if (!id || sending) return;
    const fileToUpload = item ? item.file : pickedFile;
    const isEdit = !!editing && !item;
    const body = draft.trim() || (pickedFile ? 'Shared a file' : '');
    if (!item && !body) return;
    const payload = item?.draft || {
      client_id: draftId(),
      body,
      mentions: [...draft.matchAll(/<@([a-f0-9-]{36})>/gi)].map((m) => m[1]),
      parent_id: thread?.id || null,
    };
    const version = scope.current;
    setSending(true);
    setError('');
    try {
      const sent = isEdit
        ? await connectApi.edit(editing!.id, body, payload.mentions)
        : await connectApi.send(id, payload);
      if (version !== scope.current) return;
      setPending((old) =>
        old.filter((p) => p.draft.client_id !== payload.client_id),
      );
      if (id === activeRef.current) {
        scrollToLatest.current = true;
        setMessages((old) => mergeMessages(old, [sent]));
        if (!item) {
          setDraft('');
          setEditing(null);
        }
      }
      if (fileToUpload && !isEdit) {
        const form = fileToUpload;
        if (!item) setPickedFile(null);
        try {
          await connectApi.upload(sent.id, form);
          const m = await connectApi.message(sent.id);
          if (id === activeRef.current)
            setMessages((old) => mergeMessages(old, [m]));
        } catch (e) {
          setFailedUploads((old) => [
            ...old.filter((p) => p.message.id !== sent.id),
            { message: sent, form },
          ]);
          setError('Message sent. File upload failed: ' + errorText(e));
        }
      }
      if (sent.parent_id)
        void connectApi
          .message(sent.parent_id)
          .then((p) => {
            if (id === activeRef.current && version === scope.current)
              setMessages((old) => mergeMessages(old, [p]));
          })
          .catch(() => {});
      await refreshContext().catch((e) => setError(errorText(e)));
    } catch (e) {
      if (version !== scope.current) return;
      if (!isEdit)
        setPending((old) => [
          ...old.filter((p) => p.draft.client_id !== payload.client_id),
          {
            conversation_id: id,
            draft: payload,
            error: errorText(e),
            file: fileToUpload || undefined,
          },
        ]);
      else setError(errorText(e));
      if (!isEdit && !item && id === activeRef.current) {
        setDraft('');
        setPickedFile(null);
      }
    } finally {
      if (version === scope.current) setSending(false);
    }
  }
  const loadOlder = async (inThread = false) => {
    const id = activeRef.current;
    if (!id) return;
    const version = scope.current;
    const rows = inThread ? replies : roots;
    const page = await connectApi.history(id, {
      before: rows[0]?.sequence,
      parent: inThread ? thread?.id : undefined,
    });
    if (version !== scope.current || id !== activeRef.current) return;
    setMessages((old) => mergeMessages(old, page.messages));
    if (inThread) setThreadMore(page.has_more);
    else setMore(page.has_more);
  };
  const button = (
    label: string,
    onPress: () => void,
    disabled = false,
    primary = false,
  ) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: primary
            ? actionColor
            : pressed
              ? colors.hover
              : 'transparent',
          borderColor: colors.border,
          opacity: disabled ? 0.45 : 1,
        },
      ]}
    >
      <Text
        style={{
          color: primary ? colors.textInverse : colors.textSecondary,
          fontSize: 13,
          fontWeight: '600',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
  function iconButton(
    label: string,
    Icon: typeof Search,
    onPress: () => void,
    disabled = false,
  ) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.icon,
          {
            backgroundColor: pressed ? colors.hover : 'transparent',
            opacity: disabled ? 0.4 : 1,
          },
        ]}
      >
        <Icon size={19} color={colors.textSecondary} />
      </Pressable>
    );
  }
  function startDirectMessage() {
    setPeopleQuery('');
    setDialog('people');
  }
  function emptyConversation() {
    return (
      <View
        style={[
          styles.emptyConversation,
          { paddingHorizontal: mobile ? 24 : 48 },
        ]}
      >
        <View
          style={[
            styles.emptyEmblem,
            {
              backgroundColor: colors.primaryMuted,
              borderColor: colors.border,
            },
          ]}
        >
          {dm ? (
            <Text style={[styles.emptyInitial, { color: colors.primary }]}>
              {currentTitle.slice(0, 1).toUpperCase()}
            </Text>
          ) : (
            <Hash size={36} strokeWidth={1.5} color={colors.primary} />
          )}
        </View>
        <Text style={[styles.eyebrow, { color: colors.textTertiary }]}>
          {dm
            ? 'A LITTLE HELLO GOES A LONG WAY'
            : 'YOUR TEAM, ON THE SAME PAGE'}
        </Text>
        <Text
          style={[styles.welcomeTitle, textStyle, mobile && { fontSize: 26 }]}
        >
          {dm
            ? `Start a conversation with ${currentTitle}`
            : `Welcome to ${currentTitle}`}
        </Text>
        <Text style={[styles.welcomeCopy, { color: colors.textSecondary }]}>
          {dm
            ? 'Share an idea, ask a question, or pick up where work left off. This space is just for the two of you.'
            : selected?.purpose ||
              'Give your team a place to share updates, ask questions, and move work forward together.'}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Write the first message"
          onPress={() => composerRef.current?.focus()}
          style={[styles.startButton, { backgroundColor: actionColor }]}
        >
          <PenSquare size={16} color={colors.textInverse} />
          <Text
            style={{
              color: colors.textInverse,
              fontWeight: '600',
              fontSize: 14,
            }}
          >
            Write the first message
          </Text>
        </Pressable>
        <View style={[styles.row, { marginTop: 18, gap: 6 }]}>
          <Lock size={12} color={colors.textTertiary} />
          <Text style={{ color: colors.textTertiary, fontSize: 12 }}>
            {dm
              ? 'Private direct message'
              : selected?.visibility === 'private'
                ? 'Only channel members can read messages'
                : 'A space for your company'}
          </Text>
        </View>
      </View>
    );
  }
  function avatar(name: string) {
    return (
      <View style={[styles.avatar, { backgroundColor: colors.primaryMuted }]}>
        <Text style={{ color: colors.primary, fontWeight: '700' }}>
          {name
            .split(' ')
            .map((n) => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase()}
        </Text>
      </View>
    );
  }
  function bodyOf(m: Message) {
    return m.body
      .split(/(<@[a-f0-9-]{36}>|https?:\/\/[^\s<>]+)/gi)
      .map((part, i) => {
        const id = part.match(/^<@(.+)>$/)?.[1];
        const mention = m.mentions.find((x) => x.user_id === id);
        if (/^https?:\/\//i.test(part)) {
          try {
            const url = new URL(part);
            if (!url.username && !url.password)
              return (
                <Text
                  key={i}
                  accessibilityRole="link"
                  onPress={() => {
                    void Linking.openURL(url.href);
                  }}
                  style={{
                    color: colors.primary,
                    textDecorationLine: 'underline',
                  }}
                >
                  {part}
                </Text>
              );
          } catch {}
        }
        return (
          <Text
            key={i}
            style={
              id
                ? {
                    color: colors.primary,
                    backgroundColor: colors.primaryMuted,
                    fontWeight: '600',
                  }
                : undefined
            }
          >
            {id ? '@' + (mention?.name || 'employee') : part}
          </Text>
        );
      });
  }
  const renderMessage = useCallback(
    ({ item: m }: { item: Message }) => (
      <View
        style={[styles.message, { borderBottomColor: colors.borderSubtle }]}
      >
        {avatar(m.sender_name)}
        <View style={styles.messageContent}>
          <View style={styles.row}>
            <Text style={[styles.sender, textStyle]}>{m.sender_name}</Text>
            <Text style={[styles.meta, { color: colors.textTertiary }]}>
              {new Date(m.created_at).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
              {m.edited_at ? ' · edited' : ''}
            </Text>
          </View>
          <Text
            selectable
            style={{
              color: m.deleted_at ? colors.textTertiary : colors.textPrimary,
              fontSize: 15,
              lineHeight: 24,
            }}
          >
            {m.deleted_at ? 'Message deleted' : bodyOf(m)}
          </Text>
          {!m.deleted_at &&
            m.attachments?.map((file) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Download ${file.filename}`}
                key={file.id}
                onPress={() => {
                  void action(() => downloadConnectFile(file));
                }}
                style={[styles.notice, { borderColor: colors.border }]}
              >
                <Text style={{ color: colors.primary, fontSize: 12 }}>
                  {file.filename} · {Math.ceil(file.byte_size / 1024)} KB
                </Text>
              </Pressable>
            ))}
          {!m.deleted_at && (
            <View style={[styles.row, { flexWrap: 'wrap', marginTop: 5 }]}>
              {!m.parent_id &&
                button(
                  m.reply_count
                    ? `${m.reply_count} ${m.reply_count === 1 ? 'reply' : 'replies'}`
                    : 'Reply in thread',
                  () => {
                    void openThread(m);
                  },
                )}
              {EMOJI.filter((emoji) =>
                m.reactions.some((r) => r.emoji === emoji),
              ).map((emoji) => {
                const reactions = m.reactions.filter((r) => r.emoji === emoji),
                  mine = reactions.some((r) => r.user_id === self);
                return (
                  <Pressable
                    key={emoji}
                    accessibilityRole="button"
                    accessibilityLabel={`${mine ? 'Remove' : 'Add'} ${emoji} reaction`}
                    onPress={() => {
                      void action(async () => {
                        const updated = await connectApi.react(
                          m.id,
                          emoji,
                          mine,
                        );
                        setMessages((old) => mergeMessages(old, [updated]));
                      });
                    }}
                    style={[
                      styles.reaction,
                      {
                        borderColor: mine ? colors.primary : colors.border,
                        backgroundColor: mine
                          ? colors.primaryMuted
                          : 'transparent',
                      },
                    ]}
                  >
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                      {emoji}
                      {reactions.length ? ' ' + reactions.length : ''}
                    </Text>
                  </Pressable>
                );
              })}
              {iconButton('Message actions', MoreHorizontal, () => {
                setActionMessage(m);
                setDialog('message');
              })}
            </View>
          )}
        </View>
      </View>
    ),
    [colors, self, thread],
  );
  const [deleteTarget, setDeleteTarget] = useState<Message | null>(null);
  function composer() {
    return (
      <View style={[styles.composer, { backgroundColor: colors.surface }]}>
        {pickedFile && (
          <View style={styles.row}>
            <Text
              style={{ color: colors.textSecondary, flex: 1, fontSize: 12 }}
            >
              One file ready to attach · up to 8 MB
            </Text>
            {button('Remove file', () => setPickedFile(null))}
          </View>
        )}
        {editing && (
          <View style={styles.row}>
            <Text style={{ color: colors.primary, flex: 1 }}>
              Editing your message
            </Text>
            {button('Cancel edit', () => {
              setEditing(null);
              setDraft('');
            })}
          </View>
        )}
        {suggestions.length > 0 && (
          <View
            style={[
              styles.suggestions,
              { backgroundColor: colors.elevated, borderColor: colors.border },
            ]}
          >
            {suggestions.slice(0, 5).map((p) => (
              <Pressable
                key={p.id}
                accessibilityRole="button"
                accessibilityLabel={`Mention ${p.full_name}`}
                onPress={() => {
                  setDraft((old) => old.replace(/@[^\s<>]*$/, `<@${p.id}> `));
                  setSuggestions([]);
                }}
                style={styles.person}
              >
                <Text style={textStyle}>{p.full_name}</Text>
                <Text style={{ color: colors.textTertiary, fontSize: 12 }}>
                  {p.employee_id}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
        <View
          style={[
            styles.composeBox,
            { borderColor: colors.border, backgroundColor: colors.surface },
          ]}
        >
          <TextInput
            ref={composerRef}
            accessibilityLabel={
              editing
                ? 'Edit message'
                : thread
                  ? 'Reply to thread'
                  : 'Message composer'
            }
            placeholder={
              selected?.archived_at
                ? 'Channel archived'
                : thread
                  ? 'Reply in thread…'
                  : dm
                    ? `Message ${currentTitle}…`
                    : `Message ${currentTitle}…`
            }
            placeholderTextColor={colors.textTertiary}
            value={draft}
            onChangeText={setDraft}
            multiline
            maxLength={8000}
            editable={!sending && !selected?.archived_at}
            style={[styles.composerInput, textStyle]}
          />
          <View
            style={[
              styles.composeToolbar,
              { borderTopColor: colors.borderSubtle },
            ]}
          >
            {!editing &&
              iconButton(
                'Attach a file',
                Paperclip,
                () => {
                  void action(async () => {
                    const form = await pickConnectFile();
                    if (form) setPickedFile(form);
                  });
                },
                sending || !!selected?.archived_at,
              )}
            {iconButton(
              'Mention a colleague',
              AtSign,
              () => {
                setDraft(
                  (old) => old + (old && !old.endsWith(' ') ? ' @' : '@'),
                );
                composerRef.current?.focus();
              },
              sending || !!selected?.archived_at,
            )}
            <Text style={{ flex: 1, color: colors.textTertiary, fontSize: 12 }}>
              {pickedFile ? 'File attached' : '@ to mention'}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={sending ? 'Sending message' : 'Send message'}
              disabled={
                sending ||
                (!draft.trim() && !pickedFile) ||
                !!selected?.archived_at
              }
              onPress={() => {
                void sendDraft();
              }}
              style={[
                styles.send,
                {
                  backgroundColor: actionColor,
                  opacity: (draft.trim() || pickedFile) && !sending ? 1 : 0.4,
                },
              ]}
            >
              {sending ? (
                <ActivityIndicator size="small" color={colors.textInverse} />
              ) : (
                <>
                  <Send size={16} color={colors.textInverse} />
                  {!mobile && (
                    <Text
                      style={{
                        color: colors.textInverse,
                        fontSize: 13,
                        fontWeight: '600',
                      }}
                    >
                      {editing ? 'Save' : 'Send'}
                    </Text>
                  )}
                </>
              )}
            </Pressable>
          </View>
        </View>
        <Text
          style={[styles.meta, { color: colors.textTertiary, marginTop: 6 }]}
        >
          {thread
            ? 'Replies stay with this message.'
            : 'Keep the conversation moving. Share a message, file, or idea.'}
        </Text>
      </View>
    );
  }
  function railButton(label: string, Icon: typeof Search, onPress: () => void) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={({ pressed }) => [
          styles.railButton,
          { backgroundColor: pressed ? rail.line : 'transparent' },
        ]}
      >
        <Icon size={17} color={rail.muted} />
        <Text style={{ color: rail.text, fontSize: 13, fontWeight: '500' }}>
          {label}
        </Text>
      </Pressable>
    );
  }
  function conversationList() {
    return (
      <View
        testID="connect-conversations"
        style={[
          styles.channels,
          {
            width: mobile ? '100%' : 280,
            borderRightColor: rail.line,
            backgroundColor: rail.background,
          },
        ]}
      >
        <View
          style={[
            styles.row,
            { paddingHorizontal: 22, paddingTop: 26, paddingBottom: 18 },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.eyebrow, { color: rail.muted, fontSize: 10 }]}>
              WORKSPACE
            </Text>
            <Text
              style={{
                color: rail.text,
                fontSize: 20,
                fontWeight: '700',
                marginTop: 6,
              }}
            >
              Your conversations
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="New DM"
            onPress={startDirectMessage}
            style={[styles.railCompose, { backgroundColor: rail.line }]}
          >
            <PenSquare size={18} color={rail.text} />
          </Pressable>
        </View>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 20 }}
        >
          <View style={styles.sectionHeading}>
            <Text style={[styles.label, { color: rail.muted }]}>Channels</Text>
            {context?.can_manage &&
              railButton('Create', Plus, () => {
                setChannelName('');
                setPurpose('');
                setDescription('');
                setPrivateChannel(false);
                setAnnouncement(false);
                setDialog('create');
              })}
          </View>
          {!context?.channels.length && (
            <View style={[styles.railEmpty, { borderColor: rail.line }]}>
              <Hash size={22} color={rail.muted} />
              <Text
                style={{ color: rail.text, fontSize: 14, fontWeight: '600' }}
              >
                Make room for teamwork
              </Text>
              <Text style={{ color: rail.muted, fontSize: 13, lineHeight: 20 }}>
                {context?.can_manage
                  ? 'Create a channel for a team, project, or the whole company.'
                  : 'Your company channels will appear here once an administrator creates one.'}
              </Text>
            </View>
          )}
          {context?.channels.map((c) => (
            <Pressable
              key={c.id}
              accessibilityRole="button"
              accessibilityLabel={`Open ${c.name}${c.unread_count ? `, ${c.unread_count} unread` : ''}`}
              onPress={() => {
                if (c.joined) chooseConversation(c.id);
                else
                  void action(async () => {
                    await connectApi.membership(c.id, self!);
                    await refreshContext();
                    chooseConversation(c.id);
                  });
              }}
              style={[
                styles.channelRow,
                {
                  backgroundColor:
                    c.id === active ? rail.selected : 'transparent',
                },
              ]}
            >
              {c.visibility === 'private' ? (
                <Lock size={15} color={rail.muted} />
              ) : (
                <Hash size={16} color={rail.muted} />
              )}
              <Text
                numberOfLines={1}
                style={{
                  flex: 1,
                  color: rail.text,
                  fontWeight: c.unread_count ? '700' : '400',
                }}
              >
                {c.name}
                {c.archived_at ? ' · archived' : ''}
              </Text>
              {!c.joined ? (
                <Text style={{ color: colors.primary, fontSize: 11 }}>
                  Join
                </Text>
              ) : c.unread_count > 0 ? (
                <Text
                  style={[
                    styles.badge,
                    {
                      backgroundColor: actionColor,
                      color: colors.textInverse,
                    },
                  ]}
                >
                  {c.unread_count}
                </Text>
              ) : null}
            </Pressable>
          ))}
          <View style={[styles.sectionHeading, { marginTop: 22 }]}>
            <Text style={[styles.label, { color: rail.muted }]}>
              Direct messages
            </Text>
          </View>
          {!context?.direct_messages.length && (
            <Text style={[styles.empty, { color: rail.muted }]}>
              Start a private conversation with a colleague.
            </Text>
          )}
          {context?.direct_messages.map((d) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open DM with ${d.name}`}
              key={d.id}
              onPress={() => chooseConversation(d.id)}
              style={[
                styles.channelRow,
                {
                  backgroundColor:
                    d.id === active ? rail.selected : 'transparent',
                },
              ]}
            >
              {avatar(d.name)}
              <Text
                numberOfLines={1}
                style={{
                  flex: 1,
                  color: rail.text,
                  fontWeight: d.unread_count ? '700' : '400',
                }}
              >
                {d.name}
              </Text>
              {d.unread_count > 0 && (
                <Text
                  style={[
                    styles.badge,
                    {
                      backgroundColor: actionColor,
                      color: colors.textInverse,
                    },
                  ]}
                >
                  {d.unread_count}
                </Text>
              )}
            </Pressable>
          ))}
        </ScrollView>
        <View style={[styles.railFooter, { borderTopColor: rail.line }]}>
          <View style={styles.sectionHeading}>
            <Text style={[styles.eyebrow, { color: rail.muted, fontSize: 10 }]}>
              YOUR TOOLS
            </Text>
          </View>
          {railButton('Saved messages', Bookmark, () => {
            void action(async () => {
              setBookmarks(await connectApi.saved());
              setDialog('saved');
            });
          })}
          {context?.can_manage &&
            railButton('Company access', ShieldCheck, () => {
              setPeopleQuery('');
              setDialog('company');
            })}
          {railButton('Preferences', Settings2, () => setDialog('settings'))}
        </View>
      </View>
    );
  }

  if (role === 'CA' || role === 'CA_LEAD')
    return (
      <Text style={textStyle}>Connect is available to company employees.</Text>
    );
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.root, { backgroundColor: colors.background }]}
    >
      <View
        style={[
          styles.top,
          mobile && { paddingHorizontal: 16, gap: 10 },
          { borderBottomColor: colors.border, backgroundColor: colors.surface },
        ]}
      >
        <View style={[styles.logo, { backgroundColor: actionColor }]}>
          <MessageCircle color={colors.textInverse} size={22} strokeWidth={2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            numberOfLines={1}
            style={[styles.title, textStyle, mobile && { fontSize: 18 }]}
          >
            NexSyrus Connect
          </Text>
          <Text style={{ color: colors.textTertiary, fontSize: 12 }}>
            A shared space for great work
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Search Connect"
          disabled={!context}
          onPress={() => {
            setDialog('search');
            void connectApi
              .employees()
              .then(setSearchEmployees)
              .catch(() => {});
          }}
          style={[
            mobile ? styles.icon : styles.searchTrigger,
            { borderColor: colors.border, backgroundColor: colors.background },
          ]}
        >
          <Search color={colors.textSecondary} size={18} />
          {!mobile && (
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
              Search conversations
            </Text>
          )}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Notifications, ${context?.unread_notifications || 0} unread`}
          disabled={!context}
          onPress={() => {
            void action(async () => {
              setNotices(await connectApi.notifications());
              setDialog('notifications');
            });
          }}
          style={styles.icon}
        >
          <Bell color={colors.textSecondary} size={20} />
          {!!context?.unread_notifications && (
            <Text
              style={[
                styles.dot,
                { backgroundColor: actionColor, color: colors.textInverse },
              ]}
            >
              {context.unread_notifications}
            </Text>
          )}
        </Pressable>
      </View>
      {error !== '' && (
        <View
          accessibilityRole="alert"
          style={[styles.banner, { backgroundColor: colors.errorDim }]}
        >
          <Text style={{ color: colors.error, flex: 1 }}>{error}</Text>
          {button('Dismiss', () => setError(''))}
        </View>
      )}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.empty, { color: colors.textSecondary }]}>
            Opening your workspace…
          </Text>
        </View>
      ) : !context ? (
        <View style={styles.center}>
          <Text style={[styles.empty, textStyle]}>
            Connect could not open. Verify employee membership and database
            setup.
          </Text>
          {button('Try again', () => {
            void action(async () => {
              await refreshContext();
            });
          })}
        </View>
      ) : (
        <View style={styles.workspace}>
          {(!mobile || !active) && conversationList()}
          {(!mobile || !!active) && (
            <View
              testID="connect-conversation"
              style={[styles.conversation, { backgroundColor: colors.surface }]}
            >
              {!active ? (
                <View style={styles.center}>
                  <View
                    style={[
                      styles.emptyEmblem,
                      {
                        backgroundColor: colors.primaryMuted,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <MessageCircle size={30} color={colors.primary} />
                  </View>
                  <Text style={[styles.welcomeTitle, textStyle]}>
                    Good work starts with a conversation.
                  </Text>
                  <Text
                    style={[
                      styles.welcomeCopy,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Choose a channel from your workspace, or reach out to a
                    colleague directly.
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Start a direct message"
                    onPress={startDirectMessage}
                    style={[
                      styles.startButton,
                      { backgroundColor: actionColor },
                    ]}
                  >
                    <PenSquare size={17} color={colors.textInverse} />
                    <Text
                      style={{
                        color: colors.textInverse,
                        fontSize: 14,
                        fontWeight: '600',
                      }}
                    >
                      Start a conversation
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <>
                  <View
                    style={[
                      styles.conversationHeader,
                      { borderBottomColor: colors.border },
                    ]}
                  >
                    {mobile && (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={
                          thread ? 'Back to conversation' : 'Back to channels'
                        }
                        onPress={() => {
                          if (thread) {
                            setThread(null);
                            setDraft('');
                            setEditing(null);
                          } else {
                            setActive(null);
                            activeRef.current = null;
                          }
                        }}
                        style={styles.icon}
                      >
                        <ArrowLeft size={20} color={colors.textPrimary} />
                      </Pressable>
                    )}
                    {!mobile &&
                      (dm ? (
                        avatar(currentTitle)
                      ) : (
                        <View
                          style={[
                            styles.headerSymbol,
                            { backgroundColor: colors.primaryMuted },
                          ]}
                        >
                          {selected?.visibility === 'private' ? (
                            <Lock size={22} color={colors.primary} />
                          ) : (
                            <Hash size={24} color={colors.primary} />
                          )}
                        </View>
                      ))}
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        numberOfLines={1}
                        style={[styles.sectionTitle, textStyle]}
                      >
                        {mobile && thread ? 'Thread' : currentTitle}
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={{
                          color: colors.textTertiary,
                          fontSize: 12,
                          marginTop: 3,
                        }}
                      >
                        {selected?.purpose ||
                          (dm
                            ? 'Direct message · Just the two of you'
                            : 'Company channel')}
                      </Text>
                    </View>
                    {!!selected &&
                      button('Members', () => {
                        void action(async () => {
                          setMembers(await connectApi.members(active));
                          setDescription(selected.description);
                          setPurpose(selected.purpose);
                          setDialog('members');
                        });
                      })}
                    {!!selected &&
                      !mobile &&
                      button('Pins', () => {
                        void action(async () => {
                          setBookmarks(await connectApi.pins(active));
                          setDialog('pins');
                        });
                      })}
                    {iconButton('Mark read', CheckCheck, () => {
                      void action(async () => {
                        const max = Math.max(
                          0,
                          ...messagesRef.current.map((m) => Number(m.sequence)),
                        );
                        await connectApi.read(active, max);
                        await refreshContext();
                      });
                    })}
                  </View>
                  <View
                    style={[
                      styles.connectionBar,
                      { borderBottomColor: colors.borderSubtle },
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor:
                            connection === 'live'
                              ? colors.success
                              : colors.warning,
                        },
                      ]}
                    />
                    <Text
                      numberOfLines={2}
                      style={{
                        color: colors.textTertiary,
                        fontSize: 12,
                        flex: 1,
                      }}
                    >
                      {connection === 'live'
                        ? 'Live updates connected'
                        : connection === 'connecting'
                          ? 'Connecting live updates…'
                          : 'Live updates unavailable · refresh for new messages'}
                    </Text>
                    {iconButton('Refresh messages', RefreshCw, () => {
                      void refresh();
                      if (connection !== 'live')
                        setRetryConnection((n) => n + 1);
                    })}
                  </View>
                  <View style={styles.discussion}>
                    {(!mobile || !thread) && (
                      <View style={styles.mainMessages}>
                        {historyLoading ? (
                          <View style={styles.center}>
                            <ActivityIndicator color={colors.primary} />
                          </View>
                        ) : (
                          <FlatList
                            ref={messageList}
                            testID="connect-message-list"
                            data={roots}
                            keyExtractor={(m) => m.id}
                            renderItem={renderMessage}
                            initialNumToRender={20}
                            maxToRenderPerBatch={15}
                            windowSize={7}
                            onScroll={(event) => {
                              const {
                                layoutMeasurement,
                                contentOffset,
                                contentSize,
                              } = event.nativeEvent;
                              nearBottom.current =
                                contentSize.height -
                                  contentOffset.y -
                                  layoutMeasurement.height <
                                160;
                            }}
                            scrollEventThrottle={100}
                            onContentSizeChange={() => {
                              if (scrollToLatest.current) {
                                scrollToLatest.current = false;
                                messageList.current?.scrollToEnd({
                                  animated: false,
                                });
                              }
                            }}
                            onScrollToIndexFailed={(info) => {
                              messageList.current?.scrollToOffset({
                                offset: info.averageItemLength * info.index,
                                animated: false,
                              });
                            }}
                            ListHeaderComponent={
                              more ? (
                                <View style={styles.center}>
                                  {button(
                                    'Load earlier messages',
                                    () => {
                                      void action(() => loadOlder());
                                    },
                                    busy,
                                  )}
                                </View>
                              ) : null
                            }
                            ListEmptyComponent={emptyConversation()}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{
                              paddingBottom: 12,
                              flexGrow: roots.length ? 0 : 1,
                            }}
                          />
                        )}
                        {pending
                          .filter((p) => p.conversation_id === active)
                          .map((p) => (
                            <View
                              key={p.draft.client_id}
                              style={[
                                styles.pending,
                                { backgroundColor: colors.errorDim },
                              ]}
                            >
                              <Text style={{ color: colors.textPrimary }}>
                                {p.draft.body}
                              </Text>
                              <Text
                                style={{ color: colors.error, fontSize: 12 }}
                              >
                                {p.error}
                              </Text>
                              {button(
                                'Retry failed message',
                                () => {
                                  void sendDraft(p);
                                },
                                sending,
                              )}
                            </View>
                          ))}
                        {failedUploads
                          .filter(
                            (target) =>
                              target.message.conversation_id === active,
                          )
                          .map((target) => (
                            <View
                              key={target.message.id}
                              style={[
                                styles.pending,
                                { backgroundColor: colors.errorDim },
                              ]}
                            >
                              <Text style={{ color: colors.error }}>
                                Your message was sent; its file still needs
                                uploading.
                              </Text>
                              {button(
                                'Retry file upload',
                                () => {
                                  void action(async () => {
                                    await connectApi.upload(
                                      target.message.id,
                                      target.form,
                                    );
                                    const m = await connectApi.message(
                                      target.message.id,
                                    );
                                    setMessages((old) =>
                                      mergeMessages(old, [m]),
                                    );
                                    setFailedUploads((old) =>
                                      old.filter(
                                        (p) =>
                                          p.message.id !== target.message.id,
                                      ),
                                    );
                                  });
                                },
                                busy,
                              )}
                            </View>
                          ))}
                        {!thread && composer()}
                      </View>
                    )}
                    {!!thread && (
                      <View
                        testID="connect-thread"
                        style={[
                          styles.thread,
                          {
                            width: mobile
                              ? '100%'
                              : Math.max(300, Math.min(420, width * 0.3)),
                            borderLeftColor: colors.border,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.row,
                            {
                              paddingHorizontal: 14,
                              paddingVertical: 8,
                              borderBottomWidth: 1,
                              borderBottomColor: colors.border,
                            },
                          ]}
                        >
                          <Text style={[styles.sectionTitle, textStyle]}>
                            Thread
                          </Text>
                          <View style={{ flex: 1 }} />
                          {button('Original', () => {
                            jumpToMessage.current = thread.id;
                            scrollToLatest.current = false;
                            setThread(null);
                            setDraft('');
                          })}
                          {button('Close thread', () => {
                            setThread(null);
                            setDraft('');
                            setEditing(null);
                          })}
                        </View>
                        <FlatList
                          data={replies}
                          keyExtractor={(m) => m.id}
                          renderItem={renderMessage}
                          initialNumToRender={15}
                          ListHeaderComponent={
                            <>
                              {renderMessage({
                                item:
                                  messages.find((m) => m.id === thread.id) ||
                                  thread,
                              })}
                              {threadMore &&
                                button('Load earlier replies', () => {
                                  void action(() => loadOlder(true));
                                })}
                            </>
                          }
                          ListEmptyComponent={
                            <Text
                              style={[
                                styles.empty,
                                { color: colors.textTertiary },
                              ]}
                            >
                              Keep the discussion together. Add a reply below.
                            </Text>
                          }
                        />
                        {composer()}
                      </View>
                    )}
                  </View>
                </>
              )}
            </View>
          )}
        </View>
      )}
      <Modal
        visible={!!context && (dialog !== null || !!deleteTarget)}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setDialog(null);
          setDeleteTarget(null);
        }}
      >
        <View
          style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}
        >
          <View
            style={[
              styles.modal,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                maxWidth: dialog === 'search' ? 760 : 540,
              },
            ]}
          >
            <View style={[styles.row, { marginBottom: 12 }]}>
              <Text style={[styles.sectionTitle, textStyle]}>
                {deleteTarget
                  ? 'Delete message?'
                  : dialog === 'create'
                    ? 'Create a channel'
                    : dialog === 'people'
                      ? 'New direct message'
                      : dialog === 'members'
                        ? 'Channel details & members'
                        : dialog === 'notifications'
                          ? 'Your notifications'
                          : dialog === 'search'
                            ? 'Search Connect'
                            : dialog === 'saved'
                              ? 'Saved messages'
                              : dialog === 'pins'
                                ? 'Pinned messages'
                                : dialog === 'task'
                                  ? 'Create a school checklist task'
                                  : dialog === 'message'
                                    ? 'Message actions'
                                    : dialog === 'company'
                                      ? 'Company access'
                                      : 'Preferences & availability'}
              </Text>
              <View style={{ flex: 1 }} />
              {button('Close', () => {
                setDialog(null);
                setDeleteTarget(null);
              })}
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              {dialog === 'company' && (
                <>
                  <Text style={[styles.empty, { color: colors.textSecondary }]}>
                    Grant or revoke Connect access for existing company
                    employees. Channel membership is managed separately.
                  </Text>
                  {!!accessNotice && (
                    <Text
                      accessibilityRole="alert"
                      style={{ color: colors.success }}
                    >
                      {accessNotice}
                    </Text>
                  )}
                  <TextInput
                    accessibilityLabel="Find company employee"
                    placeholder="Search your existing employee directory"
                    placeholderTextColor={colors.textTertiary}
                    value={peopleQuery}
                    onChangeText={setPeopleQuery}
                    style={fieldStyle}
                  />
                  {people
                    .filter((p) => p.id !== self)
                    .map((p) => (
                      <View key={p.id} style={styles.person}>
                        <View style={{ flex: 1 }}>
                          <Text style={textStyle}>{p.full_name}</Text>
                          <Text
                            style={{ fontSize: 12, color: colors.textTertiary }}
                          >
                            {p.employee_id} · {p.role}
                          </Text>
                        </View>
                        {button(
                          'Grant access',
                          () => {
                            void action(async () => {
                              await connectApi.provision(p.id);
                              await refreshContext();
                              setAccessNotice(
                                `${p.full_name} can now use Connect.`,
                              );
                            });
                          },
                          busy,
                        )}
                        {button(
                          'Revoke access',
                          () => {
                            void action(async () => {
                              await connectApi.provision(p.id, true);
                              await refreshContext();
                              setAccessNotice(
                                `${p.full_name} no longer has Connect access.`,
                              );
                            });
                          },
                          busy,
                        )}
                      </View>
                    ))}
                </>
              )}
              {!!deleteTarget && (
                <>
                  <Text style={[styles.empty, { color: colors.textSecondary }]}>
                    The message will become a tombstone. Its text will be
                    removed and the action audited.
                  </Text>
                  {button(
                    'Delete my message',
                    () => {
                      void action(async () => {
                        const m = await connectApi.delete(deleteTarget.id);
                        setMessages((old) => mergeMessages(old, [m]));
                        setDeleteTarget(null);
                      });
                    },
                    busy,
                    true,
                  )}
                </>
              )}
              {dialog === 'message' && actionMessage && (
                <>
                  <Text
                    style={[
                      styles.label,
                      { color: colors.textSecondary, marginBottom: 12 },
                    ]}
                  >
                    Add a reaction
                  </Text>
                  <View style={[styles.row, { marginBottom: 16 }]}>
                    {EMOJI.map((emoji) => (
                      <Pressable
                        key={emoji}
                        accessibilityRole="button"
                        accessibilityLabel={`React ${emoji}`}
                        onPress={() => {
                          void action(async () => {
                            const updated = await connectApi.react(
                              actionMessage.id,
                              emoji,
                              actionMessage.reactions.some(
                                (r) => r.emoji === emoji && r.user_id === self,
                              ),
                            );
                            setMessages((old) => mergeMessages(old, [updated]));
                            setDialog(null);
                          });
                        }}
                        style={[
                          styles.reaction,
                          {
                            borderColor: colors.border,
                            backgroundColor: colors.background,
                          },
                        ]}
                      >
                        <Text style={{ fontSize: 22 }}>{emoji}</Text>
                      </Pressable>
                    ))}
                  </View>
                  {button(
                    'Save message',
                    () => {
                      void action(async () => {
                        await connectApi.save(actionMessage.id);
                        setDialog(null);
                      });
                    },
                    busy,
                  )}
                  {selected?.can_manage &&
                    button(
                      'Pin message',
                      () => {
                        void action(async () => {
                          await connectApi.pin(actionMessage.id);
                          setDialog(null);
                        });
                      },
                      busy,
                    )}
                  {button('Copy message link', () => {
                    void action(async () => {
                      const link =
                        Platform.OS === 'web'
                          ? `${window.location.origin}/connect?conversation=${actionMessage.conversation_id}&message=${actionMessage.id}`
                          : Linking.createURL('connect', {
                              queryParams: {
                                conversation: actionMessage.conversation_id,
                                message: actionMessage.id,
                              },
                            });
                      await Clipboard.setStringAsync(link);
                      setDialog(null);
                    });
                  })}
                  {(isFounder || can?.('checklist.delegate')) &&
                    button('Convert to task', () => {
                      void action(async () => {
                        setTaskSchools(await connectApi.taskSchools());
                        setTaskEmployees(
                          await connectApi.employees(
                            '',
                            actionMessage.conversation_id,
                          ),
                        );
                        setTaskTitle('');
                        setTaskDescription('');
                        setTaskAssignee(self || '');
                        setTaskSchool('');
                        setTaskDeadline('');
                        setDialog('task');
                      });
                    })}
                  {actionMessage.sender_id === self && (
                    <>
                      {button('Edit message', () => {
                        void action(async () => {
                          if (actionMessage.parent_id)
                            await openThread(
                              await connectApi.message(actionMessage.parent_id),
                            );
                          setEditing(actionMessage);
                          setDraft(actionMessage.body);
                          setDialog(null);
                        });
                      })}
                      {button('Delete message', () => {
                        setDeleteTarget(actionMessage);
                        setDialog(null);
                      })}
                    </>
                  )}
                </>
              )}
              {(dialog === 'saved' || dialog === 'pins') && (
                <>
                  {!bookmarks.length && (
                    <Text
                      style={[styles.empty, { color: colors.textSecondary }]}
                    >
                      {dialog === 'saved'
                        ? 'Save useful messages to return to them later.'
                        : 'Channel managers can pin useful messages.'}
                    </Text>
                  )}
                  {bookmarks.map((b) => (
                    <View
                      key={b.message_id}
                      style={[styles.notice, { borderColor: colors.border }]}
                    >
                      <Text numberOfLines={3} style={textStyle}>
                        {b.deleted_at ? 'Message deleted' : b.preview}
                      </Text>
                      <View style={styles.row}>
                        {button('Open original', () => {
                          void action(() => navigateMessage(b.message_id));
                        })}
                        {dialog === 'saved'
                          ? button('Unsave', () => {
                              void action(async () => {
                                await connectApi.save(b.message_id, true);
                                setBookmarks(await connectApi.saved());
                              });
                            })
                          : selected?.can_manage
                            ? button('Unpin', () => {
                                void action(async () => {
                                  await connectApi.pin(b.message_id, true);
                                  setBookmarks(await connectApi.pins(active!));
                                });
                              })
                            : null}
                      </View>
                    </View>
                  ))}
                </>
              )}
              {dialog === 'task' && actionMessage && (
                <>
                  <Text style={[styles.empty, { color: colors.textSecondary }]}>
                    Create work in the existing school checklist. Choose an
                    authorized school and employee. Enter the task wording to
                    share; original message text stays in Connect.
                  </Text>
                  <TextInput
                    accessibilityLabel="Task title"
                    placeholder="Task title"
                    placeholderTextColor={colors.textTertiary}
                    value={taskTitle}
                    onChangeText={setTaskTitle}
                    style={fieldStyle}
                  />
                  <TextInput
                    accessibilityLabel="Task description"
                    placeholder="Instructions to share with the task assignee"
                    placeholderTextColor={colors.textTertiary}
                    value={taskDescription}
                    onChangeText={setTaskDescription}
                    style={fieldStyle}
                    multiline
                  />
                  <Text
                    style={[
                      styles.label,
                      { color: colors.textTertiary, marginVertical: 10 },
                    ]}
                  >
                    SCHOOL
                  </Text>
                  <View style={[styles.row, { flexWrap: 'wrap' }]}>
                    {taskSchools.map((s) => (
                      <React.Fragment key={s.id}>
                        {button(
                          `${taskSchool === String(s.id) ? '✓ ' : ''}${s.name}`,
                          () => setTaskSchool(String(s.id)),
                        )}
                      </React.Fragment>
                    ))}
                  </View>
                  <Text
                    style={[
                      styles.label,
                      { color: colors.textTertiary, marginVertical: 10 },
                    ]}
                  >
                    ASSIGN TO
                  </Text>
                  <View style={[styles.row, { flexWrap: 'wrap' }]}>
                    {taskEmployees.map((e) => (
                      <React.Fragment key={e.id}>
                        {button(
                          `${taskAssignee === e.id ? '✓ ' : ''}${e.full_name}`,
                          () => setTaskAssignee(e.id),
                        )}
                      </React.Fragment>
                    ))}
                  </View>
                  <TextInput
                    accessibilityLabel="Task deadline"
                    placeholder="Deadline YYYY-MM-DD (optional)"
                    placeholderTextColor={colors.textTertiary}
                    value={taskDeadline}
                    onChangeText={setTaskDeadline}
                    style={fieldStyle}
                  />
                  <View style={[styles.row, { flexWrap: 'wrap' }]}>
                    {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((p) => (
                      <React.Fragment key={p}>
                        {button(`${taskPriority === p ? '✓ ' : ''}${p}`, () =>
                          setTaskPriority(p),
                        )}
                      </React.Fragment>
                    ))}
                  </View>
                  <View style={[styles.row, { flexWrap: 'wrap' }]}>
                    {['NOT_STARTED', 'IN_PROGRESS', 'BLOCKED'].map((s) => (
                      <React.Fragment key={s}>
                        {button(
                          `${taskStatus === s ? '✓ ' : ''}${s.replace('_', ' ')}`,
                          () => setTaskStatus(s),
                        )}
                      </React.Fragment>
                    ))}
                  </View>
                  {button(
                    'Create checklist task',
                    () => {
                      void action(async () => {
                        const task = await connectApi.task(actionMessage.id, {
                          title: taskTitle,
                          description: taskDescription,
                          assigned_to: taskAssignee,
                          school_id: taskSchool,
                          priority: taskPriority,
                          deadline: taskDeadline || undefined,
                          status: taskStatus,
                        });
                        setDialog(null);
                        router.push(
                          `/(app)/checklist?schoolId=${task.school_id}` as any,
                        );
                      });
                    },
                    busy || !taskTitle.trim() || !taskSchool,
                    true,
                  )}
                </>
              )}
              {dialog === 'create' && (
                <>
                  <TextInput
                    accessibilityLabel="Channel name"
                    placeholder="Channel name, e.g. product-and-research"
                    placeholderTextColor={colors.textTertiary}
                    value={channelName}
                    onChangeText={setChannelName}
                    style={fieldStyle}
                    maxLength={64}
                  />
                  <TextInput
                    accessibilityLabel="Channel purpose"
                    placeholder="Purpose"
                    placeholderTextColor={colors.textTertiary}
                    value={purpose}
                    onChangeText={setPurpose}
                    style={fieldStyle}
                    maxLength={250}
                  />
                  <TextInput
                    accessibilityLabel="Channel description"
                    placeholder="Description"
                    placeholderTextColor={colors.textTertiary}
                    value={description}
                    onChangeText={setDescription}
                    style={fieldStyle}
                    maxLength={1000}
                  />
                  <View style={styles.row}>
                    {['company', 'department', 'project'].map((c) => (
                      <React.Fragment key={c}>
                        {button(`${category === c ? '✓ ' : ''}${c}`, () =>
                          setCategory(c),
                        )}
                      </React.Fragment>
                    ))}
                  </View>
                  {button(
                    privateChannel
                      ? 'Private · invited members'
                      : 'Public · employees can join',
                    () => setPrivateChannel(!privateChannel),
                  )}
                  {button(
                    announcement
                      ? 'Announcements · managers post'
                      : 'All members can post',
                    () => setAnnouncement(!announcement),
                  )}
                  {button(
                    'Create channel',
                    () => {
                      void action(async () => {
                        const c = await connectApi.createChannel({
                          name: channelName,
                          purpose,
                          description,
                          category,
                          visibility: privateChannel ? 'private' : 'public',
                          announcements_only: announcement,
                        });
                        await refreshContext();
                        chooseConversation(c.id);
                      });
                    },
                    busy || !channelName.trim(),
                    true,
                  )}
                </>
              )}
              {(dialog === 'people' || dialog === 'members') && (
                <>
                  {dialog === 'members' && selected && (
                    <>
                      <Text
                        style={[styles.empty, { color: colors.textSecondary }]}
                      >
                        {selected.description || 'No description yet.'}
                      </Text>
                      {button('Pinned messages', () => {
                        void action(async () => {
                          setBookmarks(await connectApi.pins(selected.id));
                          setDialog('pins');
                        });
                      })}
                      {selected.can_manage && (
                        <>
                          <TextInput
                            accessibilityLabel="Edit channel purpose"
                            value={purpose}
                            onChangeText={setPurpose}
                            style={fieldStyle}
                          />
                          <TextInput
                            accessibilityLabel="Edit channel description"
                            value={description}
                            onChangeText={setDescription}
                            style={fieldStyle}
                          />
                          <View style={[styles.row, { flexWrap: 'wrap' }]}>
                            {button(
                              'Save details',
                              () => {
                                void action(async () => {
                                  await connectApi.updateChannel(selected.id, {
                                    purpose,
                                    description,
                                  });
                                  await refreshContext();
                                });
                              },
                              busy,
                            )}
                            {button(
                              selected.archived_at
                                ? 'Restore channel'
                                : 'Archive channel',
                              () => {
                                void action(async () => {
                                  await connectApi.updateChannel(selected.id, {
                                    archived: !selected.archived_at,
                                  });
                                  await refreshContext();
                                });
                              },
                              busy,
                            )}
                          </View>
                        </>
                      )}
                      {members.map((m) => (
                        <View key={m.user_id} style={styles.person}>
                          <Text style={[textStyle, { flex: 1 }]}>
                            {m.full_name} · {m.role}
                          </Text>
                          {selected.can_manage && m.user_id !== self && (
                            <>
                              {button(
                                m.role === 'manager'
                                  ? 'Make member'
                                  : 'Make manager',
                                () => {
                                  void action(async () => {
                                    await connectApi.membership(
                                      selected.id,
                                      m.user_id,
                                      m.role === 'manager'
                                        ? 'member'
                                        : 'manager',
                                    );
                                    setMembers(
                                      await connectApi.members(selected.id),
                                    );
                                  });
                                },
                                busy,
                              )}
                              {button(
                                'Remove',
                                () => {
                                  void action(async () => {
                                    await connectApi.membership(
                                      selected.id,
                                      m.user_id,
                                      'member',
                                      true,
                                    );
                                    setMembers(
                                      await connectApi.members(selected.id),
                                    );
                                    await refreshContext();
                                  });
                                },
                                busy,
                              )}
                            </>
                          )}
                        </View>
                      ))}
                    </>
                  )}
                  {(dialog === 'people' || selected?.can_manage) && (
                    <>
                      <TextInput
                        accessibilityLabel="Find employee"
                        placeholder="Find an employee"
                        placeholderTextColor={colors.textTertiary}
                        value={peopleQuery}
                        onChangeText={setPeopleQuery}
                        style={fieldStyle}
                      />
                      {people
                        .filter(
                          (p) =>
                            p.id !== self &&
                            (dialog !== 'members' ||
                              !members.some((m) => m.user_id === p.id)),
                        )
                        .map((p) => (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`${dialog === 'people' ? 'Message' : 'Add'} ${p.full_name}`}
                            key={p.id}
                            onPress={() => {
                              void action(async () => {
                                if (dialog === 'people') {
                                  const d = await connectApi.dm(p.id);
                                  await refreshContext();
                                  chooseConversation(d.id);
                                } else if (active) {
                                  await connectApi.membership(active, p.id);
                                  setMembers(await connectApi.members(active));
                                }
                              });
                            }}
                            style={styles.person}
                          >
                            {avatar(p.full_name)}
                            <View style={{ flex: 1 }}>
                              <Text style={textStyle}>{p.full_name}</Text>
                              <Text
                                style={{
                                  color: colors.textTertiary,
                                  fontSize: 12,
                                }}
                              >
                                {p.employee_id} · {p.role}
                              </Text>
                            </View>
                            <ChevronRight
                              size={16}
                              color={colors.textTertiary}
                            />
                          </Pressable>
                        ))}
                    </>
                  )}
                </>
              )}
              {dialog === 'notifications' && (
                <>
                  {!notices.length && (
                    <Text
                      style={[styles.empty, { color: colors.textSecondary }]}
                    >
                      You're caught up. Mentions, DMs and thread replies will
                      appear here.
                    </Text>
                  )}
                  {notices.map((n) => (
                    <Pressable
                      key={n.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${n.kind} from ${n.sender_name}`}
                      onPress={() => {
                        void action(async () => {
                          await connectApi.readNotice(n.id);
                          router.setParams({
                            conversation: n.conversation_id,
                            message: n.message_id,
                          });
                          if (activeRef.current === n.conversation_id)
                            await navigateMessage(n.message_id);
                          else chooseConversation(n.conversation_id);
                          await refreshContext();
                          setDialog(null);
                        });
                      }}
                      style={[
                        styles.notice,
                        {
                          borderColor: colors.border,
                          backgroundColor: n.read_at
                            ? 'transparent'
                            : colors.primaryMuted,
                        },
                      ]}
                    >
                      <Text style={[styles.sender, textStyle]}>
                        {n.sender_name} · {n.kind}
                      </Text>
                      <Text
                        numberOfLines={2}
                        style={{ color: colors.textSecondary, marginTop: 5 }}
                      >
                        {n.preview}
                      </Text>
                      <Text
                        style={{
                          color: colors.textTertiary,
                          fontSize: 11,
                          marginTop: 5,
                        }}
                      >
                        {new Date(n.created_at).toLocaleString()}
                      </Text>
                    </Pressable>
                  ))}
                </>
              )}
              {dialog === 'settings' && (
                <>
                  <Text style={[styles.empty, { color: colors.textSecondary }]}>
                    Set your availability for the next five minutes. It returns
                    to away when the status expires.
                  </Text>
                  <View style={styles.row}>
                    {['online', 'away', 'busy'].map((s) => (
                      <React.Fragment key={s}>
                        {button(
                          s,
                          () => {
                            void action(async () => {
                              await connectApi.presence(s);
                              setPresence(await connectApi.listPresence());
                            });
                          },
                          busy,
                        )}
                      </React.Fragment>
                    ))}
                  </View>
                  <Text style={[styles.empty, { color: colors.textSecondary }]}>
                    Choose what reaches your notification centre.
                  </Text>
                  {(['all', 'mentions', 'muted'] as const).map((mode) => (
                    <React.Fragment key={mode}>
                      {button(
                        `${context?.preferences.mode === mode ? '✓ ' : ''}${mode === 'all' ? 'All messages' : mode === 'mentions' ? 'Mentions, DMs, threads & announcements' : 'Mute notifications'}`,
                        () => {
                          void action(async () => {
                            await connectApi.preferences(mode);
                            await refreshContext();
                          });
                        },
                        busy,
                      )}
                    </React.Fragment>
                  ))}
                  <Text style={[styles.empty, { color: colors.textTertiary }]}>
                    Push notifications are not available yet.
                  </Text>
                  {presence.map((p) => (
                    <Text
                      key={p.user_id}
                      style={{ color: colors.textSecondary, fontSize: 12 }}
                    >
                      {p.user_id === self
                        ? 'You'
                        : context?.direct_messages.find(
                            (d) => d.employee_id === p.user_id,
                          )?.name || 'Colleague'}{' '}
                      · {p.status}
                    </Text>
                  ))}
                </>
              )}
              {dialog === 'search' && (
                <>
                  <TextInput
                    accessibilityLabel="Search messages"
                    placeholder="Search messages, channels and employees"
                    placeholderTextColor={colors.textTertiary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    style={fieldStyle}
                  />
                  <Text
                    style={[
                      styles.label,
                      { color: colors.textTertiary, marginVertical: 10 },
                    ]}
                  >
                    FROM EMPLOYEE
                  </Text>
                  <ScrollView horizontal>
                    <View style={styles.row}>
                      {button(searchAuthor ? 'Anyone' : '✓ Anyone', () =>
                        setSearchAuthor(''),
                      )}
                      {searchEmployees.map((e) => (
                        <React.Fragment key={e.id}>
                          {button(
                            `${searchAuthor === e.id ? '✓ ' : ''}${e.full_name}`,
                            () => setSearchAuthor(e.id),
                          )}
                        </React.Fragment>
                      ))}
                    </View>
                  </ScrollView>
                  <View style={styles.row}>
                    <TextInput
                      accessibilityLabel="Search after date"
                      placeholder="From YYYY-MM-DD"
                      placeholderTextColor={colors.textTertiary}
                      value={searchFrom}
                      onChangeText={setSearchFrom}
                      style={[...fieldStyle, { flex: 1 }]}
                    />
                    <TextInput
                      accessibilityLabel="Search before date"
                      placeholder="To YYYY-MM-DD"
                      placeholderTextColor={colors.textTertiary}
                      value={searchTo}
                      onChangeText={setSearchTo}
                      style={[...fieldStyle, { flex: 1 }]}
                    />
                  </View>
                  <View style={[styles.row, { flexWrap: 'wrap' }]}>
                    {active &&
                      button(
                        searchHere
                          ? '✓ Current conversation'
                          : 'All conversations',
                        () => setSearchHere(!searchHere),
                      )}
                    {button(
                      mentionsOnly ? '✓ My mentions' : 'Include all messages',
                      () => setMentionsOnly(!mentionsOnly),
                    )}
                    {button(
                      'Search',
                      () => {
                        void action(async () =>
                          setSearchResults(
                            await connectApi.search({
                              q: searchQuery,
                              conversation_id: searchHere ? active : undefined,
                              sender_id: searchAuthor || undefined,
                              after_date: searchFrom || undefined,
                              before_date: searchTo || undefined,
                              mentions_only: mentionsOnly,
                            }),
                          ),
                        );
                      },
                      busy,
                      true,
                    )}
                  </View>
                  {searchResults && (
                    <>
                      {!searchResults.messages.length &&
                        !searchResults.channels.length &&
                        !searchResults.employees.length && (
                          <Text
                            style={[
                              styles.empty,
                              { color: colors.textSecondary },
                            ]}
                          >
                            No results in conversations you can access.
                          </Text>
                        )}
                      {searchResults.channels.map((c) => (
                        <View key={c.id} style={styles.person}>
                          <Text style={[textStyle, { flex: 1 }]}>
                            # {c.name}
                          </Text>
                          {button('Open channel', () => {
                            const joined = context?.channels.find(
                              (x) => x.id === c.id,
                            )?.joined;
                            void action(async () => {
                              if (!joined)
                                await connectApi.membership(c.id, self!);
                              await refreshContext();
                              chooseConversation(c.id);
                            });
                          })}
                        </View>
                      ))}
                      {searchResults.employees
                        .filter((p) => p.id !== self)
                        .map((p) => (
                          <View key={p.id} style={styles.person}>
                            <Text style={[textStyle, { flex: 1 }]}>
                              {p.full_name}
                            </Text>
                            {button('Message employee', () => {
                              void action(async () => {
                                const d = await connectApi.dm(p.id);
                                await refreshContext();
                                chooseConversation(d.id);
                              });
                            })}
                          </View>
                        ))}
                      {searchResults.messages.map((m) => (
                        <Pressable
                          key={m.id}
                          accessibilityRole="button"
                          accessibilityLabel={`Open message from ${m.sender_name}`}
                          onPress={() => {
                            void action(() => navigateMessage(m.id));
                          }}
                          style={[
                            styles.notice,
                            { borderColor: colors.border },
                          ]}
                        >
                          <Text style={[styles.sender, textStyle]}>
                            {m.sender_name}
                          </Text>
                          <Text
                            numberOfLines={3}
                            style={{
                              color: colors.textSecondary,
                              marginTop: 5,
                            }}
                          >
                            {bodyOf(m)}
                          </Text>
                        </Pressable>
                      ))}
                    </>
                  )}
                </>
              )}
            </ScrollView>
            {!!error && (
              <Text
                accessibilityRole="alert"
                style={{ color: colors.error, marginTop: 10 }}
              >
                {error}
              </Text>
            )}
            {busy && <ActivityIndicator color={colors.primary} />}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 500, borderRadius: 16, overflow: 'hidden' },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  logo: {
    height: 42,
    width: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.7 },
  icon: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  workspace: { flex: 1, flexDirection: 'row', minHeight: 0 },
  channels: { borderRightWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 42,
    paddingHorizontal: 8,
  },
  label: { fontSize: 12, fontWeight: '600', letterSpacing: 0.3 },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
  },
  badge: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  conversation: { flex: 1, minWidth: 0 },
  conversationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    minHeight: 80,
    borderBottomWidth: 1,
  },
  connectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    minHeight: 36,
    borderBottomWidth: 1,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  discussion: { flexDirection: 'row', flex: 1, minHeight: 0 },
  mainMessages: { flex: 1, minWidth: 0 },
  thread: { borderLeftWidth: 1, flexShrink: 0, minHeight: 0 },
  message: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  messageContent: { flex: 1, minWidth: 0 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sender: { fontSize: 14, fontWeight: '700' },
  meta: { fontSize: 11 },
  reaction: {
    minHeight: 32,
    minWidth: 32,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    minHeight: 40,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  empty: {
    fontSize: 13,
    lineHeight: 21,
    paddingVertical: 16,
    paddingHorizontal: 10,
  },
  composer: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14 },
  composeBox: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  composerInput: {
    minHeight: 64,
    maxHeight: 160,
    fontSize: 15,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    textAlignVertical: 'top',
  },
  send: {
    minWidth: 40,
    height: 36,
    paddingHorizontal: 12,
    flexDirection: 'row',
    gap: 8,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composeToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderTopWidth: 1,
  },
  railButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 42,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  railCompose: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  railFooter: { padding: 14, borderTopWidth: 1 },
  railEmpty: {
    marginHorizontal: 6,
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.4 },
  emptyConversation: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  emptyEmblem: {
    width: 64,
    height: 64,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyInitial: { fontSize: 28, fontWeight: '600' },
  welcomeTitle: {
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -1,
    textAlign: 'center',
    marginTop: 12,
    maxWidth: 620,
  },
  welcomeCopy: {
    fontSize: 15,
    lineHeight: 25,
    textAlign: 'center',
    maxWidth: 440,
    marginTop: 14,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 18,
    minHeight: 44,
    borderRadius: 9,
    marginTop: 20,
  },
  headerSymbol: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  searchTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 9,
    minHeight: 40,
    width: 240,
    paddingHorizontal: 14,
  },
  suggestions: { borderWidth: 1, borderRadius: 10, marginBottom: 8 },
  person: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    minHeight: 48,
    flexWrap: 'wrap',
  },
  banner: { padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  pending: {
    marginHorizontal: 14,
    marginBottom: 8,
    padding: 10,
    borderRadius: 8,
  },
  dot: {
    position: 'absolute',
    top: 0,
    right: 0,
    fontSize: 9,
    borderRadius: 7,
    paddingHorizontal: 4,
  },
  modalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modal: {
    width: '100%',
    maxHeight: '90%',
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: 9,
    padding: 12,
    fontSize: 14,
    marginBottom: 10,
    minHeight: 44,
  },
  notice: { padding: 14, borderRadius: 10, borderWidth: 1, marginVertical: 5 },
});
