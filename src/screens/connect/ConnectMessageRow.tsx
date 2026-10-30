import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, Platform, StyleSheet } from 'react-native';
import {
  MoreHorizontal,
  SmilePlus,
  MessageSquare,
  Paperclip,
} from 'lucide-react-native';
import * as Linking from 'expo-linking';
import type { ThemeColors } from '../../constants/theme';
import type { Message } from '../../services/connect/api';

const EMOJI = ['👍', '❤️', '🎉', '👀', '✅'];
export const ConnectAvatar = React.memo(function ConnectAvatar({
  name,
  colors,
  small = false,
}: {
  name: string;
  colors: ThemeColors;
  small?: boolean;
}) {
  const backgroundColor = ['#337C91', '#9B594E', '#6E5BA7', '#4D7861'][
    Array.from(name).reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 4
  ];
  return (
    <View
      style={[styles.avatar, { backgroundColor }, small && styles.smallAvatar]}
    >
      <Text
        style={{
          color: '#FFFFFF',
          fontWeight: '700',
          fontSize: small ? 11 : 14,
        }}
      >
        {name
          .split(' ')
          .map((n) => n[0])
          .slice(0, 2)
          .join('')
          .toUpperCase()}
      </Text>
    </View>
  );
});

export const ConnectMessageBody = React.memo(function ConnectMessageBody({
  message: m,
  colors,
  isDark,
}: {
  message: Message;
  colors: ThemeColors;
  isDark: boolean;
}) {
  const render = (body: string): React.ReactNode =>
    body
      .split(
        /(`[^`\n]+`|<@[a-f0-9-]{36}>|https?:\/\/[^\s<>]+|\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~)/gi,
      )
      .map((part, i) => {
        if (/^(`[^`]+`|\*[^*]+\*|_[^_]+_|~[^~]+~)$/.test(part))
          return (
            <Text
              key={i}
              style={
                part[0] === '*'
                  ? { fontWeight: '700' }
                  : part[0] === '_'
                    ? { fontStyle: 'italic' }
                    : part[0] === '~'
                      ? { textDecorationLine: 'line-through' }
                      : {
                          fontFamily:
                            Platform.OS === 'ios' ? 'Menlo' : 'monospace',
                          backgroundColor: colors.hover,
                          color: isDark ? '#E891A6' : '#C22D50',
                        }
              }
            >
              {part[0] === '`' ? part.slice(1, -1) : render(part.slice(1, -1))}
            </Text>
          );
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
  return render(m.body);
});

type RowProps = {
  message: Message;
  day?: string;
  colors: ThemeColors;
  isDark: boolean;
  mobile: boolean;
  self?: string;
  onThread: (message: Message) => void;
  onActions: (message: Message) => void;
  onReact: (message: Message, emoji: string, mine: boolean) => void;
  onDownload: (file: NonNullable<Message['attachments']>[number]) => void;
};
export const ConnectMessageRow = React.memo(function ConnectMessageRow({
  message: m,
  day,
  colors,
  isDark,
  mobile,
  self,
  onThread,
  onActions,
  onReact,
  onDownload,
}: RowProps) {
  const [hovered, setHovered] = useState(false);
  const timestamp = useMemo(
    () =>
      new Date(m.created_at).toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      }),
    [m.created_at],
  );
  const date = useMemo(
    () =>
      day
        ? new Date(day).toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })
        : '',
    [day],
  );
  const icon = (
    label: string,
    Icon: typeof MoreHorizontal,
    action: () => void,
  ) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={action}
      hitSlop={4}
      style={({ pressed }) => [
        styles.action,
        mobile && styles.touchAction,
        { backgroundColor: pressed ? colors.hover : 'transparent' },
      ]}
    >
      <Icon size={18} color={colors.textSecondary} />
    </Pressable>
  );
  return (
    <View>
      {!!day && (
        <View style={styles.dateDivider}>
          <View style={[styles.line, { backgroundColor: colors.border }]} />
          <Text
            style={[
              styles.dateLabel,
              {
                color: colors.textPrimary,
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            {date}
          </Text>
          <View style={[styles.line, { backgroundColor: colors.border }]} />
        </View>
      )}
      <Pressable
        accessible={false}
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        onLongPress={() => {
          if (!m.deleted_at) onActions(m);
        }}
        delayLongPress={350}
        style={[
          styles.message,
          mobile && styles.mobileMessage,
          { backgroundColor: hovered ? colors.hover : 'transparent' },
        ]}
      >
        <ConnectAvatar name={m.sender_name} colors={colors} />
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={[styles.sender, { color: colors.textPrimary }]}>
              {m.sender_name}
            </Text>
            <Text style={[styles.meta, { color: colors.textTertiary }]}>
              {timestamp}
              {m.edited_at ? ' · edited' : ''}
            </Text>
          </View>
          <Text
            selectable
            style={[
              styles.body,
              {
                color: m.deleted_at ? colors.textTertiary : colors.textPrimary,
              },
            ]}
          >
            {m.deleted_at ? (
              'Message deleted'
            ) : (
              <ConnectMessageBody message={m} colors={colors} isDark={isDark} />
            )}
          </Text>
          {!m.deleted_at &&
            m.attachments?.map((file) => (
              <Pressable
                key={file.id}
                accessibilityRole="button"
                accessibilityLabel={`Download ${file.filename}`}
                onPress={() => onDownload(file)}
                style={[styles.attachment, { borderColor: colors.border }]}
              >
                <Paperclip size={16} color={colors.primary} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    numberOfLines={2}
                    style={{ color: colors.primary, fontSize: 14 }}
                  >
                    {file.filename}
                  </Text>
                  <Text style={[styles.meta, { color: colors.textTertiary }]}>
                    {Math.ceil(file.byte_size / 1024)} KB
                  </Text>
                </View>
              </Pressable>
            ))}
          {!m.deleted_at && (
            <View style={styles.reactions}>
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
                    onPress={() => onReact(m, emoji, mine)}
                    style={[
                      styles.reaction,
                      mobile && { minHeight: 36 },
                      {
                        borderColor: mine ? colors.primary : colors.border,
                        backgroundColor: mine
                          ? colors.primaryMuted
                          : colors.surface,
                      },
                    ]}
                  >
                    <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                      {emoji} {reactions.length}
                    </Text>
                  </Pressable>
                );
              })}
              {!m.parent_id && !!m.reply_count && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${m.reply_count} ${m.reply_count === 1 ? 'reply' : 'replies'}`}
                  onPress={() => onThread(m)}
                  style={[styles.reply, mobile && { minHeight: 40 }]}
                >
                  <MessageSquare size={14} color={colors.primary} />
                  <Text
                    style={{
                      color: colors.primary,
                      fontSize: 13,
                      fontWeight: '600',
                    }}
                  >
                    {m.reply_count} {m.reply_count === 1 ? 'reply' : 'replies'}
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
        {!m.deleted_at && (
          <View
            style={[
              styles.tools,
              {
                backgroundColor:
                  hovered && !mobile ? colors.surface : 'transparent',
                borderColor: hovered && !mobile ? colors.border : 'transparent',
              },
            ]}
          >
            {hovered && !mobile && (
              <>
                {icon('Add a reaction', SmilePlus, () => onActions(m))}
                {!m.parent_id &&
                  icon('Reply in thread', MessageSquare, () => onThread(m))}
              </>
            )}
            {icon('Message actions', MoreHorizontal, () => onActions(m))}
          </View>
        )}
      </Pressable>
    </View>
  );
});
const styles = StyleSheet.create({
  message: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
    paddingRight: 52,
  },
  mobileMessage: { paddingLeft: 16, paddingRight: 48, gap: 10 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallAvatar: { width: 22, height: 22, borderRadius: 4 },
  content: { flex: 1, minWidth: 0 },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    columnGap: 8,
    marginBottom: 2,
  },
  sender: { fontSize: 15, fontWeight: '700', flexShrink: 1 },
  meta: { fontSize: 12, lineHeight: 18 },
  body: { fontSize: 15, lineHeight: 23 },
  attachment: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    maxWidth: 400,
  },
  reactions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  reaction: {
    minWidth: 36,
    minHeight: 28,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reply: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  tools: {
    position: 'absolute',
    right: 8,
    top: 3,
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 6,
  },
  action: {
    minWidth: 32,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 5,
  },
  touchAction: { minWidth: 40, minHeight: 44 },
  dateDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  line: { flex: 1, height: 1 },
  dateLabel: {
    fontSize: 12,
    fontWeight: '600',
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
});
