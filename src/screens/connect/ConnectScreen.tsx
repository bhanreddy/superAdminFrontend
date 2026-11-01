import { ConnectSidebar } from './ConnectSidebar';
import { ConnectDirectory } from './ConnectDirectory';
import { ConnectFiles } from './ConnectFiles';
import { MotionPressable as Pressable } from '../../components/ui/MotionPressable';
import { MotionSection } from '../../components/ui/MotionSection';
import { Skeleton } from '../../components/ui/Skeleton';
import { borderRadius } from '../../constants/theme';
import { brandColors, getCardTone } from '../../constants/experienceColors';
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
  Home,
  ChevronDown,
  ChevronRight as SectionClosed,
  SmilePlus,
  X,
  Pin,
  Users,
  Bold,
  Italic,
  Strikethrough,
  Code,
  MessageSquare,
  Command,
  Files,
  Compass,
} from 'lucide-react-native';
import {
  ConnectAvatar,
  ConnectMessageBody,
  ConnectMessageRow,
} from './ConnectMessageRow';
import { ConnectTextField } from './ConnectTextField';
import { useConnectViewport } from './useConnectViewport';
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
  | 'threads'
  | 'switcher'
  | 'channels'
  | null;
const EMOJI = ['👍', '❤️', '🎉', '👀', '✅'];
const dialogTitles: Record<Exclude<Dialog, null>, string> = {
  create: 'Create a channel', people: 'New direct message', members: 'Channel details & members',
  notifications: 'Your notifications', search: 'Search Connect', saved: 'Saved messages',
  pins: 'Pinned messages', task: 'Create a school checklist task', message: 'Message actions',
  company: 'Company access', threads: 'Threads', switcher: 'Jump to a conversation',
  channels: 'Channel browser', settings: 'Preferences & availability',
};

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
  const { colors: themeColors, isDark, reducedMotion } = useTheme();
  const colors = themeColors;
  const actionColor = colors.primaryFill;
  const conversationTone = getCardTone('blue', isDark);
  const rail = {
    background: colors.surface,
    text: colors.textPrimary,
    muted: colors.textSecondary,
    line: colors.borderSubtle,
    selected: colors.primaryFill,
  };
  const [conversationTab, setConversationTab] = useState<'messages' | 'files'>('messages');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [formattingOpen, setFormattingOpen] = useState(false);
  const [requestedSelection, setRequestedSelection] = useState<
    { start: number; end: number } | undefined
  >();
  const selection = useRef({ start: 0, end: 0 });
  const composerRef = useRef<TextInput>(null);
  const { user, can, isFounder } = useAuth();
  const { selectedCluster } = useCluster();
  const router = useRouter();
  const params = useLocalSearchParams<{
    conversation?: string;
    message?: string;
  }>();
  const { width } = useWindowDimensions();
  const mobile = width < 900;
  const viewport = useConnectViewport(mobile);
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
  const sendLock = useRef(false);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const threadRef = useRef(thread);
  threadRef.current = thread;
  const [composerHeight, setComposerHeight] = useState(52);
  const [composerFocused, setComposerFocused] = useState(false);
  const [connection, setConnection] = useState<ConnectionState>('connecting'),
    [retryConnection, setRetryConnection] = useState(0);
  const [dialog, setDialog] = useState<Dialog>(null),
    [people, setPeople] = useState<Employee[]>([]),
    [peopleQuery, setPeopleQuery] = useState(''),
    [notices, setNotices] = useState<Notice[]>([]);
  // Keep the outgoing dialog intact while the native modal fades away.
  const lastDialog = useRef<Dialog>(null);
  if (dialog) lastDialog.current = dialog;
  const visibleDialog = dialog || lastDialog.current;
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
  const pickedFileRef = useRef(pickedFile);
  const editingRef = useRef(editing);
  pickedFileRef.current = pickedFile;
  editingRef.current = editing;
  const channelDraft = useRef<{ text: string; file: FormData | null } | null>(null);
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
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined' || !context) return;
    const shortcut = (event: KeyboardEvent) => {
      if (event.isComposing || event.repeat) return;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setDialog('switcher');
      }
      if (event.key === 'Escape') { setDialog(null); setDeleteTarget(null); }
    };
    document.addEventListener('keydown', shortcut);
    return () => document.removeEventListener('keydown', shortcut);
  }, [!!context]);
  const textStyle = { color: colors.textPrimary };
  const fieldStyle = [
    styles.input,
    {
      backgroundColor: colors.background,
      color: colors.textPrimary,
      borderColor: colors.border,
    },
  ];
  const action = useCallback(async (fn: () => Promise<any>) => {
    setError('');
    setBusy(true);
    try {
      return await fn();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }, []);

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
        sendLock.current = false;
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
    if (!user) {
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
    channelDraft.current = null;
    scrollToLatest.current = true;
    nearBottom.current = true;
    setThread(null);
    setEditing(null);
    setDraft('');
    setMore(false);
    setPickedFile(null);
    if (!active) return;
    setConversationTab('messages');
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
    setConversationTab('messages');
    setEmojiOpen(false);
    setRequestedSelection(undefined);
    setComposerHeight(52);
    setDialog(null);
    setError('');
    setActive(id);
    activeRef.current = id;
  }
  function closeThread() {
    setThread(null);
    setEditing(null);
    setDraft(channelDraft.current?.text || '');
    setPickedFile(channelDraft.current?.file || null);
    channelDraft.current = null;
    setComposerHeight(52);
    setEmojiOpen(false);
  }
  const openThread = useCallback(async (m: Message) => {
    if (!threadRef.current) channelDraft.current = { text: editingRef.current ? '' : draftRef.current, file: pickedFileRef.current };
    setPickedFile(null);
    setConversationTab('messages');
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
  }, []);
  async function navigateMessage(id: string) {
    setConversationTab('messages');
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
    if (!id || sending || sendLock.current) return;
    const fileToUpload = item ? item.file : pickedFile;
    const isEdit = !!editing && !item;
    const submittedDraft = draftRef.current;
    const body = submittedDraft.trim() || (pickedFile ? 'Shared a file' : '');
    if (!item && !body) return;
    const payload = item?.draft || {
      client_id: draftId(),
      body,
      mentions: [...submittedDraft.matchAll(/<@([a-f0-9-]{36})>/gi)].map(
        (m) => m[1],
      ),
      parent_id: thread?.id || null,
    };
    const version = scope.current;
    sendLock.current = true;
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
        if (
          !item &&
          draftRef.current === submittedDraft &&
          (threadRef.current?.id || null) === payload.parent_id
        ) {
          setDraft('');
          setEditing(null);
          setComposerHeight(52);
        }
      }
      if (fileToUpload && !isEdit) {
        const form = fileToUpload;
        if (!item) setPickedFile((old) => (old === fileToUpload ? null : old));
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
      if (!isEdit && !item)
        setPickedFile((old) => (old === fileToUpload ? null : old));
      if (
        !isEdit &&
        !item &&
        id === activeRef.current &&
        draftRef.current === submittedDraft &&
        (threadRef.current?.id || null) === payload.parent_id
      ) {
        setDraft('');
        setComposerHeight(52);
      }
    } finally {
      if (version === scope.current) {
        // A send can finish while its channel composer is parked behind a thread.
        // The sent message or failed-message retry now owns that submitted draft.
        if (!item && !isEdit && !payload.parent_id && id === activeRef.current && channelDraft.current) {
          if (channelDraft.current.text === submittedDraft) channelDraft.current.text = '';
          if (channelDraft.current.file === fileToUpload) channelDraft.current.file = null;
        }
        sendLock.current = false;
        setSending(false);
      }
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
          color: primary ? colors.onPrimary : colors.textSecondary,
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
    keepFocus = false,
  ) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={disabled}
        onPress={onPress}
        onPressIn={
          keepFocus && Platform.OS === 'web'
            ? (event) => event.preventDefault()
            : undefined
        }
        hitSlop={4}
        style={({ pressed }) => [
          styles.icon,
          mobile && styles.touchIcon,
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
          { marginHorizontal: mobile ? 12 : 24, paddingHorizontal: mobile ? 20 : 28, backgroundColor: conversationTone.panel, borderColor: conversationTone.border },
        ]}
      >
        <View
          style={[
            styles.emptyEmblem,
            { backgroundColor: conversationTone.cover, width: 48, height: 48, borderRadius: borderRadius.md, marginBottom: 0 },
          ]}
        >
          {dm ? (
            <Text style={[styles.emptyInitial, { color: rail.text }]}>
              {currentTitle.slice(0, 1).toUpperCase()}
            </Text>
          ) : (
            <Hash size={32} color={conversationTone.accent} />
          )}
        </View>
        <Text style={[styles.welcomeTitle, textStyle, { fontSize: 24 }]}>{currentTitle}</Text>
        <Text style={[styles.welcomeCopy, { color: colors.textSecondary, fontSize: 13, lineHeight: 20 }]}>
          {dm
            ? `This is the very beginning of your direct message history with ${currentTitle}.`
            : `This is the very beginning of the ${currentTitle} channel.`}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Write the first message"
          onPress={() => composerRef.current?.focus()}
          style={styles.introAction}
        >
          <PenSquare size={15} color={colors.primary} />
          <Text
            style={{ color: colors.primary, fontSize: 14, fontWeight: '600' }}
          >
            Send a message
          </Text>
        </Pressable>
      </View>
    );
  }
  function openSearch() {
    setDialog('search');
    void connectApi
      .employees()
      .then(setSearchEmployees)
      .catch(() => {});
  }
  function openNotices() {
    void action(async () => {
      setNotices(await connectApi.notifications());
      setDialog('notifications');
    });
  }
  function openSaved() {
    void action(async () => {
      setBookmarks(await connectApi.saved());
      setDialog('saved');
    });
  }
  function createChannel() {
    setChannelName('');
    setPurpose('');
    setDescription('');
    setPrivateChannel(false);
    setAnnouncement(false);
    setDialog('create');
  }
  function home() {
    setDialog(null);
    setActive(null);
    activeRef.current = null;
    setThread(null);
    setDraft('');
    setEditing(null);
  }
  function navigationRail() {
    const nav = (
      label: string,
      Icon: typeof Search,
      onPress: () => void,
      selected = false,
    ) => (
      <Pressable
        key={label}
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={styles.appNavItem}
      >
        <View
          style={[
            styles.appNavIcon,
            { backgroundColor: selected ? '#FFFFFF33' : 'transparent' },
          ]}
        >
          <Icon size={23} color="#FFFFFF" strokeWidth={1.7} />
          {label === 'Activity' && !!context?.unread_notifications && (
            <View style={[styles.navUnread, { backgroundColor: brandColors.honey }]} />
          )}
        </View>
        <Text style={styles.appNavLabel}>{label}</Text>
      </Pressable>
    );
    return (
      <View style={styles.appRail}>
        <View style={styles.workspaceMonogram}>
          <Text style={{ color: brandColors.red, fontWeight: '800', fontSize: 25 }}>
            N
          </Text>
        </View>
        {nav('Home', Home, home, !dialog)}
        {nav('DMs', MessageCircle, startDirectMessage, dialog === 'people')}
        {nav('Activity', Bell, openNotices, dialog === 'notifications')}
        {nav('Later', Bookmark, openSaved, dialog === 'saved')}
        {nav(
          'More',
          MoreHorizontal,
          () => setDialog('settings'),
          dialog === 'settings',
        )}
        <View style={{ flex: 1 }} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Your preferences"
          onPress={() => setDialog('settings')}
          style={styles.selfAvatar}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>
            {(context?.self.full_name || 'You').slice(0, 1).toUpperCase()}
          </Text>
        </Pressable>
      </View>
    );
  }
  function formatDraft(delimiter: string) {
    const start = Math.min(selection.current.start, draft.length),
      end = Math.min(selection.current.end, draft.length);
    const value = draft.slice(start, end) || 'text';
    setDraft(
      draft.slice(0, start) + delimiter + value + delimiter + draft.slice(end),
    );
    setRequestedSelection({
      start: start + delimiter.length,
      end: start + delimiter.length + value.length,
    });
    composerRef.current?.focus();
  }
  const openMessageActions = useCallback((message: Message) => {
    setActionMessage(message);
    setDialog('message');
  }, []);
  const reactToMessage = useCallback(
    (message: Message, emoji: string, mine: boolean) => {
      void action(async () => {
        const updated = await connectApi.react(message.id, emoji, mine);
        setMessages((old) => mergeMessages(old, [updated]));
      });
    },
    [action],
  );
  const downloadFile = useCallback(
    (file: NonNullable<Message['attachments']>[number]) => {
      void action(() => downloadConnectFile(file));
    },
    [action],
  );
  function avatar(name: string, small = false) {
    return <ConnectAvatar name={name} small={small} colors={colors} />;
  }
  function bodyOf(message: Message) {
    return (
      <ConnectMessageBody message={message} colors={colors} isDark={!!isDark} />
    );
  }
  const renderMessage = useCallback(
    ({ item: message, index }: { item: Message; index?: number }) => (
      <ConnectMessageRow
        message={message}
        compact={
          !!index && !message.parent_id && !message.reply_count &&
          !roots[index - 1]?.reply_count &&
          roots[index - 1]?.sender_id === message.sender_id &&
          new Date(message.created_at).getTime() >= new Date(roots[index - 1].created_at).getTime() &&
          new Date(message.created_at).getTime() - new Date(roots[index - 1].created_at).getTime() < 5 * 60 * 1000 &&
          new Date(roots[index - 1].created_at).toDateString() === new Date(message.created_at).toDateString()
        }
        day={
          !message.parent_id &&
          index !== undefined &&
          (index === 0 ||
            new Date(roots[index - 1]?.created_at).toDateString() !==
              new Date(message.created_at).toDateString())
            ? message.created_at
            : undefined
        }
        colors={colors}
        isDark={!!isDark}
        mobile={mobile}
        self={self}
        onThread={openThread}
        onActions={openMessageActions}
        onReact={reactToMessage}
        onDownload={downloadFile}
      />
    ),
    [
      colors,
      isDark,
      mobile,
      self,
      openThread,
      openMessageActions,
      reactToMessage,
      downloadFile,
      roots,
    ],
  );
  const [deleteTarget, setDeleteTarget] = useState<Message | null>(null);
  async function searchMessages() {
    await action(async () =>
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
  }
  function composer() {
    const composerButton = (
      label: string,
      Icon: typeof Search,
      onPress: () => void,
      disabled = false,
    ) => iconButton(label, Icon, onPress, disabled, true);
    return (
      <View
        style={[
          styles.composer,
          mobile && { paddingHorizontal: 12 },
          { backgroundColor: colors.surface },
        ]}
      >
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
        {emojiOpen && (
          <MotionSection
            style={[
              styles.emojiPicker,
              {
                borderColor: colors.border,
                backgroundColor: colors.surface,
              },
            ]}
          >
            {['😀', '👍', '❤️', '🎉', '👀', '✅', '🙏', '🚀'].map((emoji) => (
              <Pressable
                key={emoji}
                accessibilityRole="button"
                accessibilityLabel={`Insert ${emoji}`}
                onPress={() => {
                  setDraft((old) => old + emoji);
                  setEmojiOpen(false);
                  composerRef.current?.focus();
                }}
                style={styles.emojiChoice}
              >
                <Text style={{ fontSize: 23 }}>{emoji}</Text>
              </Pressable>
            ))}
          </MotionSection>
        )}
        <View
          style={[
            styles.composeBox,
            {
              borderColor: composerFocused ? colors.primary : colors.border,
              backgroundColor: colors.surface,
            },
          ]}
        >
          {(!mobile || formattingOpen) && (
            <MotionSection
              style={[styles.formatToolbar, { backgroundColor: colors.hover }]}
            >
              {composerButton(
                'Bold text',
                Bold,
                () => formatDraft('*'),
                !!selected?.archived_at,
              )}
              {composerButton(
                'Italic text',
                Italic,
                () => formatDraft('_'),
                !!selected?.archived_at,
              )}
              {composerButton(
                'Strike through text',
                Strikethrough,
                () => formatDraft('~'),
                !!selected?.archived_at,
              )}
              <View
                style={[
                  styles.toolbarDivider,
                  { backgroundColor: colors.border },
                ]}
              />
              {composerButton(
                'Inline code',
                Code,
                () => formatDraft('`'),
                !!selected?.archived_at,
              )}
            </MotionSection>
          )}
          <TextInput
            ref={composerRef}
            selection={requestedSelection}
            onSelectionChange={(event) => {
              selection.current = event.nativeEvent.selection;
              if (requestedSelection) setRequestedSelection(undefined);
            }}
            onChange={(event) => {
              if (Platform.OS !== 'web') return;
              const node = event.target as unknown as HTMLTextAreaElement;
              if (node?.tagName !== 'TEXTAREA' || !node.style) return;
              node.style.height = 'auto';
              const height = Math.max(52, Math.min(132, node.scrollHeight));
              node.style.height = `${height}px`;
              setComposerHeight((old) => (old === height ? old : height));
            }}
            onFocus={() => setComposerFocused(true)}
            onBlur={() => setComposerFocused(false)}
            onContentSizeChange={(event) => {
              const height = Math.max(
                52,
                Math.min(132, Math.ceil(event.nativeEvent.contentSize.height)),
              );
              setComposerHeight((old) => (old === height ? old : height));
            }}
            underlineColorAndroid="transparent"
            selectionColor={colors.primary}
            blurOnSubmit={false}
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
            onKeyPress={(event) => {
              const key = event.nativeEvent as typeof event.nativeEvent & {
                shiftKey?: boolean;
                isComposing?: boolean;
                keyCode?: number;
              };
              if (
                Platform.OS === 'web' &&
                key.key === 'Enter' &&
                !key.shiftKey &&
                !key.isComposing &&
                key.keyCode !== 229
              ) {
                event.preventDefault();
                if (
                  !sending &&
                  !selected?.archived_at &&
                  (draft.trim() || pickedFile)
                )
                  void sendDraft();
              }
            }}
            multiline
            maxLength={8000}
            editable={!selected?.archived_at}
            style={[
              styles.composerInput,
              textStyle,
              { height: composerHeight },
              Platform.OS === 'web' && ({ outlineStyle: 'none' } as any),
            ]}
          />
          <View
            style={[
              styles.composeToolbar,
              { borderTopColor: colors.borderSubtle },
            ]}
          >
            {mobile &&
              composerButton(
                'Formatting options',
                Bold,
                () => setFormattingOpen(!formattingOpen),
                !!selected?.archived_at,
              )}
            {!editing &&
              composerButton(
                'Attach a file',
                Plus,
                () => {
                  void action(async () => {
                    const form = await pickConnectFile();
                    if (form) setPickedFile(form);
                  });
                },
                sending || !!selected?.archived_at,
              )}
            {composerButton(
              'Insert emoji',
              SmilePlus,
              () => setEmojiOpen(!emojiOpen),
              !!selected?.archived_at,
            )}
            {composerButton(
              'Mention a colleague',
              AtSign,
              () => {
                setDraft(
                  (old) => old + (old && !old.endsWith(' ') ? ' @' : '@'),
                );
                composerRef.current?.focus();
              },
              !!selected?.archived_at,
            )}
            <Text style={{ flex: 1, color: colors.textTertiary, fontSize: 12 }}>
              {pickedFile ? 'File attached' : ''}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={sending ? 'Sending message' : 'Send message'}
              disabled={
                sending ||
                (!draft.trim() && !pickedFile) ||
                !!selected?.archived_at
              }
              onPressIn={
                Platform.OS === 'web'
                  ? (event) => event.preventDefault()
                  : undefined
              }
              onPress={() => {
                void sendDraft();
              }}
              style={[
                styles.send,
                mobile && { minWidth: 44, height: 44 },
                {
                  backgroundColor:
                    (draft.trim() || pickedFile) && !sending
                      ? actionColor
                      : colors.hover,
                },
              ]}
            >
              {sending ? (
                <ActivityIndicator size="small" color={colors.textSecondary} />
              ) : (
                <>
                  <Send
                    size={17}
                    color={
                      (draft.trim() || pickedFile) && !sending
                        ? colors.onPrimary
                        : colors.textTertiary
                    }
                  />
                  {!mobile && <Text style={{ color: (draft.trim() || pickedFile) ? colors.onPrimary : colors.textTertiary, fontSize: 13, fontWeight: '700' }}>Send</Text>}
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
            : Platform.OS === 'web'
              ? 'Enter to send · Shift + Enter for a new line'
              : 'Use @ to mention someone in this conversation.'}
        </Text>
      </View>
    );
  }
  function openChannel(channel: Bootstrap['channels'][number]) {
    if (channel.joined) chooseConversation(channel.id);
    else void action(async () => {
      await connectApi.membership(channel.id, self!);
      await refreshContext();
      chooseConversation(channel.id);
    });
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[
        styles.root,
        { backgroundColor: colors.background },
        viewport && {
          flex: 0,
          flexBasis: 'auto',
          flexShrink: 0,
          height: viewport.height,
          maxHeight: viewport.height,
          transform: [{ translateY: viewport.offsetTop }],
        },
      ]}
    >
      <View style={styles.top}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to console"
          onPress={() => router.push('/(app)')}
          style={[styles.row, !mobile && { width: 280 }]}
        >
          <ArrowLeft size={17} color={brandColors.paper} />
          {!mobile && (
            <Text style={[styles.brandLabel, { width: undefined }]}>
              NexSyrus Connect
            </Text>
          )}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Search Connect"
          disabled={!context}
          onPress={openSearch}
          style={[styles.searchTrigger, mobile && { flex: 1 }]}
        >
          <Search size={16} color="#FFFFFF" />
          <Text numberOfLines={1} style={{ color: '#FFFFFF', fontSize: 13 }}>
            Search {context?.organization.name || 'NexSyrus'}
          </Text>
        </Pressable>
        {!mobile && <View style={{ flex: 1 }} />}
        <Pressable accessibilityRole="button" accessibilityLabel="Quick switcher" disabled={!context} onPress={() => setDialog('switcher')} style={[styles.quickSwitch, { borderColor: '#FFFFFF38' }]}>
          <Command size={17} color={brandColors.paper} />
          {!mobile && <Text style={{ color: brandColors.paper, fontSize: 12, fontWeight: '600' }}>Jump to… <Text style={{ opacity: 0.7 }}>⌘ / Ctrl K</Text></Text>}
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Notifications, ${context?.unread_notifications || 0} unread`}
          onPress={openNotices}
          disabled={!context}
          style={styles.topIcon}
        >
          <Bell size={18} color="#FFFFFF" />
          {!!context?.unread_notifications && (
            <View style={[styles.navUnread, { backgroundColor: brandColors.honey }]} />
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
        <View accessibilityLabel="Opening your workspace" accessibilityRole="progressbar" style={{ flex: 1, padding: 24, gap: 20 }}>
          <Skeleton width="55%" height={24} />
          <Skeleton height={68} borderRadius={20} />
          <Skeleton width="75%" height={68} borderRadius={20} />
          <View style={{ flex: 1 }} />
          <Skeleton height={132} borderRadius={24} />
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
          {!mobile && navigationRail()}
          {(!mobile || !active) && <ConnectSidebar
            context={context} active={active} mobile={mobile}
            onChannel={openChannel} onConversation={chooseConversation}
            onCompose={startDirectMessage} onCreate={createChannel}
            onBrowse={() => setDialog('channels')}
            onThreads={() => setDialog('threads')} onSaved={openSaved}
            onActivity={openNotices} onSettings={() => setDialog('settings')}
            onCompany={() => { setPeopleQuery(''); setDialog('company'); }}
          />}
          {(!mobile || !!active) && (
            <MotionSection
              transitionKey={`${active || 'welcome'}:${historyLoading}`}
              testID="connect-conversation"
              style={[styles.conversation, { backgroundColor: colors.surface }, !mobile && { margin: 12, marginLeft: 0, borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.xl, overflow: 'hidden' }]}
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
                    <PenSquare size={17} color={colors.onPrimary} />
                    <Text
                      style={{
                        color: colors.onPrimary,
                        fontSize: 14,
                        fontWeight: '600',
                      }}
                    >
                      Start a conversation
                    </Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" accessibilityLabel="Explore workspace channels" onPress={() => setDialog('channels')} style={[styles.startButton, { backgroundColor: conversationTone.panel, borderColor: conversationTone.border, borderWidth: 1, marginTop: 12 }]}><Compass size={17} color={conversationTone.accent} /><Text style={{ color: conversationTone.accent, fontSize: 14, fontWeight: '600' }}>Browse channels</Text></Pressable>
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
                            closeThread();
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
                    <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                      <Text style={{ color: colors.primary, fontSize: 9, fontWeight: '700', letterSpacing: 1.4 }}>{dm ? 'DIRECT MESSAGE' : selected?.visibility === 'private' ? 'PRIVATE CHANNEL' : 'TEAM CHANNEL'}</Text>
                      <Text
                        numberOfLines={1}
                        style={[styles.sectionTitle, textStyle]}
                      >
                        {mobile && thread
                          ? 'Thread'
                          : selected && !mobile
                            ? selected.name
                            : currentTitle}
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
                      iconButton('Members', Users, () => {
                        void action(async () => {
                          setMembers(await connectApi.members(active));
                          setDescription(selected.description);
                          setPurpose(selected.purpose);
                          setDialog('members');
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
                  <View style={[styles.conversationTabs, { borderColor: colors.border }]}>
                    <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: 4 }}>
                      {(['messages', 'files'] as const).map(tab => <Pressable key={tab} accessibilityRole="tab" accessibilityLabel={tab === 'messages' ? 'Messages' : 'Files'} accessibilityState={{ selected: conversationTab === tab }} aria-selected={conversationTab === tab} onPress={() => setConversationTab(tab)} style={[styles.conversationTab, { borderBottomColor: conversationTab === tab ? colors.primary : 'transparent', backgroundColor: conversationTab === tab ? colors.primaryMuted : 'transparent' }]}>
                        {tab === 'messages' ? <MessageSquare size={15} color={conversationTab === tab ? colors.primary : colors.textSecondary} /> : <Files size={15} color={conversationTab === tab ? colors.primary : colors.textSecondary} />}
                        <Text style={{ color: conversationTab === tab ? colors.primary : colors.textSecondary, fontSize: 12, fontWeight: '600' }}>{tab === 'messages' ? 'Messages' : 'Files'}</Text>
                      </Pressable>)}
                    </View>
                    {!!selected && <Pressable accessibilityRole="button" accessibilityLabel="Pins" onPress={() => { void action(async () => { setBookmarks(await connectApi.pins(active)); setDialog('pins'); }); }} style={styles.conversationTab}><Pin size={15} color={colors.textSecondary} /><Text style={{ color: colors.textSecondary, fontSize: 12 }}>Pins</Text></Pressable>}
                    <View style={{ flex: 1 }} />
                    {iconButton('Search in this conversation', Search, () => { setSearchHere(true); openSearch(); })}
                  </View>
                  {connection !== 'live' && (
                    <View
                      style={[
                        styles.connectionBar,
                        {
                          borderBottomColor: colors.borderSubtle,
                          backgroundColor: isDark ? '#332B16' : '#FFFAEC',
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          {
                            backgroundColor: colors.warning,
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
                        {connection === 'connecting'
                          ? 'Connecting live updates…'
                          : 'Live updates paused. Refresh to check for messages.'}
                      </Text>
                      {iconButton('Refresh messages', RefreshCw, () => {
                        void refresh();
                        setRetryConnection((n) => n + 1);
                      })}
                    </View>
                  )}
                  {conversationTab === 'files' && <ConnectFiles messages={messages} more={more} busy={busy} onEarlier={() => { void action(() => loadOlder()); }} onDownload={downloadFile} onMessage={id => { void action(() => navigateMessage(id)); }} />}
                  <View aria-hidden={conversationTab !== 'messages'} importantForAccessibility={conversationTab === 'messages' ? 'auto' : 'no-hide-descendants'} style={[styles.discussion, conversationTab !== 'messages' && { display: 'none' }]}>
                    {(!thread || width >= 1100) && (
                      <View style={styles.mainMessages}>
                        {historyLoading ? (
                          <View accessibilityLabel="Loading messages" accessibilityRole="progressbar" style={{ padding: 24, gap: 20, flex: 1 }}>
                            <Skeleton width="65%" height={58} borderRadius={16} />
                            <Skeleton width="85%" height={80} borderRadius={16} />
                            <Skeleton width="55%" height={58} borderRadius={16} />
                          </View>
                        ) : (
                          <FlatList
                            ref={messageList}
                            testID="connect-message-list"
                            data={roots}
                            keyExtractor={(m) => m.id}
                            renderItem={renderMessage}
                            initialNumToRender={12}
                            maxToRenderPerBatch={6}
                            updateCellsBatchingPeriod={50}
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
                            keyboardShouldPersistTaps="handled"
                            keyboardDismissMode={
                              Platform.OS === 'ios' ? 'interactive' : 'on-drag'
                            }
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
                              flexGrow: 1,
                              justifyContent: roots.length
                                ? 'flex-start'
                                : 'flex-end',
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
                      <MotionSection
                        testID="connect-thread"
                        style={[
                          styles.thread,
                          {
                            width: width < 1100
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
                            closeThread();
                          })}
                          {iconButton('Close thread', X, () => {
                            closeThread();
                          })}
                        </View>
                        <FlatList
                          data={replies}
                          keyExtractor={(m) => m.id}
                          renderItem={renderMessage}
                          initialNumToRender={10}
                          maxToRenderPerBatch={6}
                          windowSize={7}
                          keyboardShouldPersistTaps="handled"
                          keyboardDismissMode={
                            Platform.OS === 'ios' ? 'interactive' : 'on-drag'
                          }
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
                      </MotionSection>
                    )}
                  </View>
                </>
              )}
            </MotionSection>
          )}
        </View>
      )}
      <Modal
        visible={!!context && (dialog !== null || !!deleteTarget)}
        transparent
        animationType={mobile || reducedMotion ? 'none' : 'fade'}
        onRequestClose={() => {
          setDialog(null);
          setDeleteTarget(null);
        }}
      >
        <KeyboardAvoidingView
          style={[
            { flex: 1 },
            viewport && {
              flex: 0,
              height: viewport.height,
              transform: [{ translateY: viewport.offsetTop }],
            },
          ]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View
            style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}
          >
            <MotionSection
              transitionKey={visibleDialog || (deleteTarget ? 'delete' : 'closed')}
              role="dialog"
              accessibilityLabel={deleteTarget ? 'Delete message?' : dialogTitles[visibleDialog || 'settings']}
              accessibilityViewIsModal
              style={[
                styles.modal,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  maxWidth: visibleDialog === 'search' || visibleDialog === 'channels' || visibleDialog === 'switcher' ? 760 : 540,
                },
              ]}
            >
              <View style={[styles.row, { marginBottom: 12 }]}>
                <Text style={[styles.sectionTitle, textStyle]}>
                  {deleteTarget ? 'Delete message?' : dialogTitles[visibleDialog || 'settings']}
                </Text>
                <View style={{ flex: 1 }} />
                {button('Close', () => {
                  setDialog(null);
                  setDeleteTarget(null);
                })}
              </View>
              <ScrollView
                style={{ flexShrink: 1, minHeight: 0 }}
                contentContainerStyle={{ paddingBottom: 16 }}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
              >
                {context && (visibleDialog === 'switcher' || visibleDialog === 'channels') && <ConnectDirectory key={visibleDialog} mode={visibleDialog} context={context} busy={busy} onCreate={context.can_manage ? createChannel : undefined} onOpen={entry => { if (entry.channel) openChannel(entry.channel); else chooseConversation(entry.id); }} />}
                {visibleDialog === 'threads' && (
                  <>
                    <Text
                      style={[
                        styles.welcomeCopy,
                        { color: colors.textSecondary, marginBottom: 16 },
                      ]}
                    >
                      Replies in {currentTitle}. Open a thread to keep the
                      discussion going.
                    </Text>
                    {!roots.some((m) => m.reply_count) && (
                      <Text
                        style={[styles.empty, { color: colors.textSecondary }]}
                      >
                        No threads in this conversation yet. Reply to a message
                        to start one.
                      </Text>
                    )}
                    {roots
                      .filter((m) => m.reply_count)
                      .map((m) => (
                        <Pressable
                          key={m.id}
                          accessibilityRole="button"
                          accessibilityLabel={`Open thread from ${m.sender_name}`}
                          onPress={() => {
                            setDialog(null);
                            void openThread(m);
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
                            style={[
                              styles.welcomeCopy,
                              { color: colors.textSecondary },
                            ]}
                          >
                            {m.deleted_at ? 'Message deleted' : bodyOf(m)}
                          </Text>
                          <Text style={{ color: colors.primary, marginTop: 8 }}>
                            {m.reply_count}{' '}
                            {m.reply_count === 1 ? 'reply' : 'replies'}
                          </Text>
                        </Pressable>
                      ))}
                  </>
                )}
                {visibleDialog === 'company' && (
                  <>
                    <Text
                      style={[styles.empty, { color: colors.textSecondary }]}
                    >
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
                    <ConnectTextField
                      colors={colors}
                      accessibilityLabel="Find company employee"
                      autoFocus
                      autoCapitalize="none"
                      returnKeyType="search"
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
                              style={{
                                fontSize: 12,
                                color: colors.textTertiary,
                              }}
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
                    <Text
                      style={[styles.empty, { color: colors.textSecondary }]}
                    >
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
                {visibleDialog === 'message' && actionMessage && (
                  <>
                    {!actionMessage.parent_id &&
                      button('Reply in thread', () => {
                        setDialog(null);
                        void openThread(actionMessage);
                      })}
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
                                  (r) =>
                                    r.emoji === emoji && r.user_id === self,
                                ),
                              );
                              setMessages((old) =>
                                mergeMessages(old, [updated]),
                              );
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
                                await connectApi.message(
                                  actionMessage.parent_id,
                                ),
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
                {(visibleDialog === 'saved' || visibleDialog === 'pins') && (
                  <>
                    {!bookmarks.length && (
                      <Text
                        style={[styles.empty, { color: colors.textSecondary }]}
                      >
                        {visibleDialog === 'saved'
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
                          {visibleDialog === 'saved'
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
                                    setBookmarks(
                                      await connectApi.pins(active!),
                                    );
                                  });
                                })
                              : null}
                        </View>
                      </View>
                    ))}
                  </>
                )}
                {visibleDialog === 'task' && actionMessage && (
                  <>
                    <Text
                      style={[styles.empty, { color: colors.textSecondary }]}
                    >
                      Create work in the existing school checklist. Choose an
                      authorized school and employee. Enter the task wording to
                      share; original message text stays in Connect.
                    </Text>
                    <ConnectTextField
                      colors={colors}
                      accessibilityLabel="Task title"
                      placeholder="Task title"
                      placeholderTextColor={colors.textTertiary}
                      value={taskTitle}
                      onChangeText={setTaskTitle}
                      style={fieldStyle}
                    />
                    <ConnectTextField
                      colors={colors}
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
                    <ConnectTextField
                      colors={colors}
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
                {visibleDialog === 'create' && (
                  <>
                    <ConnectTextField
                      colors={colors}
                      accessibilityLabel="Channel name"
                      autoCapitalize="none"
                      autoCorrect={false}
                      helper="Use lowercase letters, numbers, and hyphens."
                      placeholder="Channel name, e.g. product-and-research"
                      placeholderTextColor={colors.textTertiary}
                      value={channelName}
                      onChangeText={setChannelName}
                      style={fieldStyle}
                      maxLength={64}
                    />
                    <ConnectTextField
                      colors={colors}
                      accessibilityLabel="Channel purpose"
                      placeholder="Purpose"
                      placeholderTextColor={colors.textTertiary}
                      value={purpose}
                      onChangeText={setPurpose}
                      style={fieldStyle}
                      maxLength={250}
                    />
                    <ConnectTextField
                      colors={colors}
                      accessibilityLabel="Channel description"
                      multiline
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
                {(visibleDialog === 'people' || visibleDialog === 'members') && (
                  <>
                    {visibleDialog === 'members' && selected && (
                      <>
                        <Text
                          style={[
                            styles.empty,
                            { color: colors.textSecondary },
                          ]}
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
                            <ConnectTextField
                              colors={colors}
                              accessibilityLabel="Edit channel purpose"
                              value={purpose}
                              onChangeText={setPurpose}
                              style={fieldStyle}
                            />
                            <ConnectTextField
                              colors={colors}
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
                                    await connectApi.updateChannel(
                                      selected.id,
                                      {
                                        purpose,
                                        description,
                                      },
                                    );
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
                                    await connectApi.updateChannel(
                                      selected.id,
                                      {
                                        archived: !selected.archived_at,
                                      },
                                    );
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
                    {(visibleDialog === 'people' || selected?.can_manage) && (
                      <>
                        <ConnectTextField
                          colors={colors}
                          accessibilityLabel="Find employee"
                          autoFocus
                          autoCapitalize="none"
                          returnKeyType="search"
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
                              (visibleDialog !== 'members' ||
                                !members.some((m) => m.user_id === p.id)),
                          )
                          .map((p) => (
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`${visibleDialog === 'people' ? 'Message' : 'Add'} ${p.full_name}`}
                              key={p.id}
                              onPress={() => {
                                void action(async () => {
                                  if (visibleDialog === 'people') {
                                    const d = await connectApi.dm(p.id);
                                    await refreshContext();
                                    chooseConversation(d.id);
                                  } else if (active) {
                                    await connectApi.membership(active, p.id);
                                    setMembers(
                                      await connectApi.members(active),
                                    );
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
                {visibleDialog === 'notifications' && (
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
                {visibleDialog === 'settings' && (
                  <>
                    <Text
                      style={[styles.empty, { color: colors.textSecondary }]}
                    >
                      Set your availability for the next five minutes. It
                      returns to away when the status expires.
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
                    <Text
                      style={[styles.empty, { color: colors.textSecondary }]}
                    >
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
                    <Text
                      style={[styles.empty, { color: colors.textTertiary }]}
                    >
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
                {visibleDialog === 'search' && (
                  <>
                    <ConnectTextField
                      colors={colors}
                      accessibilityLabel="Search messages"
                      onSubmitEditing={() => {
                        void searchMessages();
                      }}
                      autoFocus
                      autoCapitalize="none"
                      returnKeyType="search"
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
                    <View
                      style={[
                        styles.row,
                        mobile && {
                          flexDirection: 'column',
                          alignItems: 'stretch',
                          gap: 0,
                        },
                      ]}
                    >
                      <ConnectTextField
                        colors={colors}
                        accessibilityLabel="Search after date"
                        placeholder="YYYY-MM-DD"
                        autoCapitalize="none"
                        autoCorrect={false}
                        maxLength={10}
                        placeholderTextColor={colors.textTertiary}
                        value={searchFrom}
                        onChangeText={setSearchFrom}
                        style={fieldStyle}
                        containerStyle={mobile ? undefined : { flex: 1 }}
                      />
                      <ConnectTextField
                        colors={colors}
                        accessibilityLabel="Search before date"
                        placeholder="YYYY-MM-DD"
                        autoCapitalize="none"
                        autoCorrect={false}
                        maxLength={10}
                        placeholderTextColor={colors.textTertiary}
                        value={searchTo}
                        onChangeText={setSearchTo}
                        style={fieldStyle}
                        containerStyle={mobile ? undefined : { flex: 1 }}
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
                          void searchMessages();
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
            </MotionSection>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0, overflow: 'hidden' },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 56,
    paddingHorizontal: 16,
    backgroundColor: brandColors.redDark,
  },
  brandLabel: { color: brandColors.paper, width: 280, fontSize: 14, fontWeight: '600' },
  topIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appRail: {
    width: 68,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: brandColors.redDark,
  },
  workspaceMonogram: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    backgroundColor: brandColors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  appNavItem: { width: 64, minHeight: 70, alignItems: 'center', gap: 5 },
  appNavIcon: {
    width: 40,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appNavLabel: { color: brandColors.paper, fontSize: 11, fontWeight: '600' },
  navUnread: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 9,
    height: 9,
    borderRadius: 5,
    borderColor: brandColors.red,
    borderWidth: 1,
  },
  selfAvatar: {
    width: 34,
    height: 34,
    borderRadius: 7,
    backgroundColor: brandColors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    alignSelf: 'flex-start',
    minHeight: 36,
    marginTop: 8,
  },
  formatToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  toolbarDivider: { width: 1, height: 18, marginHorizontal: 5 },
  emojiPicker: {
    width: 194,
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  emojiChoice: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  quickSwitch: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minWidth: 44, minHeight: 40, paddingHorizontal: 10, borderRadius: borderRadius.sm, borderWidth: 1 },
  conversationTabs: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 16, minHeight: 48, borderBottomWidth: 1 },
  conversationTab: { minHeight: 44, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 6, borderBottomWidth: 2, borderBottomColor: 'transparent', borderTopLeftRadius: borderRadius.xs, borderTopRightRadius: borderRadius.xs },
  workspace: { flex: 1, flexDirection: 'row', minHeight: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  label: { fontSize: 14, fontWeight: '500' },
  conversation: { flex: 1, minWidth: 0 },
  conversationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    minHeight: 76,
    borderBottomWidth: 1,
  },
  connectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    minHeight: 30,
    borderBottomWidth: 1,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  discussion: { flexDirection: 'row', flex: 1, minHeight: 0 },
  mainMessages: { flex: 1, minWidth: 0 },
  thread: { borderLeftWidth: 1, flexShrink: 0, minHeight: 0 },
  sender: { fontSize: 15, fontWeight: '700' },
  meta: { fontSize: 12 },
  reaction: {
    minHeight: 26,
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
  composer: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10 },
  composeBox: {
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  composerInput: {
    minHeight: 52,
    maxHeight: 132,
    minWidth: 0,
    width: '100%',
    fontSize: 16,
    lineHeight: 24,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    textAlignVertical: 'top',
  },
  send: {
    minWidth: 44,
    height: 44,
    paddingHorizontal: 14,
    flexDirection: 'row',
    gap: 8,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composeToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  emptyConversation: {
    alignItems: 'flex-start',
    paddingTop: 20,
    paddingBottom: 20,
    marginTop: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderRadius: borderRadius.xl,
  },
  emptyEmblem: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyInitial: { fontSize: 28, fontWeight: '600' },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -1,
    textAlign: 'left',
    marginTop: 8,
    maxWidth: 620,
  },
  welcomeCopy: {
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'left',
    maxWidth: 640,
    marginTop: 8,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 18,
    minHeight: 44,
    borderRadius: 5,
    marginTop: 20,
  },
  headerSymbol: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  searchTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 40,
    flex: 2,
    maxWidth: 640,
    paddingHorizontal: 10,
    backgroundColor: '#FFFFFF26',
    borderWidth: 1,
    borderColor: '#FFFFFF38',
    borderRadius: borderRadius.md,
  },
  touchIcon: { minWidth: 44, minHeight: 44 },
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
  modalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modal: {
    width: '100%',
    maxHeight: '90%',
    minHeight: 0,
    flexShrink: 1,
    padding: 24,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: 12,
    fontSize: 14,
    marginBottom: 10,
    minHeight: 44,
  },
  notice: { padding: 14, borderRadius: 10, borderWidth: 1, marginVertical: 5 },
});
