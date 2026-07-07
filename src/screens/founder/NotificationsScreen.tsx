import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { useFounderAuth } from '../../hooks/useFounderAuth';
import * as founderDb from '../../services/founderSupabase';
import type { NotificationRow } from '../../types/founder';
import {
  ConsoleAmbientBackground,
  GlassCard,
  bottomTabPad,
} from './founderUi';
import { pressableWebStyles } from '../../utils/webPressable';
import { safePressHandler } from '../../utils/safePressHandler';
import { Trash2, Mail, MailOpen } from 'lucide-react-native';

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { founder } = useFounderAuth();
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const list = await founderDb.listNotificationsForUser(user.id, founder?.id ?? null);
      setRows(list);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [user?.id, founder?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggleRead = async (n: NotificationRow) => {
    try {
      if (n.read_at) {
        await founderDb.markNotificationUnread(n.id);
      } else {
        await founderDb.markNotificationRead(n.id);
      }
      load();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Update failed');
    }
  };

  const remove = (n: NotificationRow) => {
    Alert.alert('Delete notification?', n.title, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await founderDb.deleteNotification(n.id);
            load();
          } catch (e: any) {
            Alert.alert('Error', e?.message || 'Delete failed');
          }
        },
      },
    ]);
  };

  return (
    <ConsoleAmbientBackground>
      <ScreenHeader title="Notifications" subtitle="Inbox" />
      <View style={styles.pad}>
        {loading ? (
          <ActivityIndicator color="#7C6FFF" style={{ marginTop: 32 }} />
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: bottomTabPad }}
          >
            {rows.map((n) => (
              <GlassCard
                key={n.id}
                style={{
                  marginBottom: 12,
                  opacity: n.read_at ? 0.72 : 1,
                }}
              >
                <View style={styles.top}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.title, { color: colors.textPrimary }]}>{n.title}</Text>
                    <Text style={[styles.time, { color: colors.textSecondary }]}>
                      {new Date(n.created_at).toLocaleString('en-IN')}
                    </Text>
                  </View>
                  {!n.read_at ? <View style={styles.dot} /> : null}
                </View>
                {n.body ? (
                  <Text style={[styles.body, { color: colors.textSecondary }]}>{n.body}</Text>
                ) : null}
                <View style={styles.actions}>
                  <Pressable
                    style={({ pressed }) => [styles.act, ...pressableWebStyles(pressed, { pressedOpacity: 0.8 })]}
                    onPress={safePressHandler(() => toggleRead(n))}
                  >
                    {n.read_at ? (
                      <Mail color="#38C8F4" size={20} />
                    ) : (
                      <MailOpen color="#FFB020" size={20} />
                    )}
                    <Text style={[styles.actTxt, { color: colors.textSecondary }]}>
                      {n.read_at ? 'Mark unread' : 'Mark read'}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.act, ...pressableWebStyles(pressed, { pressedOpacity: 0.8 })]}
                    onPress={() => remove(n)}
                  >
                    <Trash2 color="#FF6B7A" size={20} />
                    <Text style={[styles.actTxt, { color: '#FF6B7A' }]}>Delete</Text>
                  </Pressable>
                </View>
              </GlassCard>
            ))}
            {rows.length === 0 ? (
              <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 32 }}>
                You are all caught up.
              </Text>
            ) : null}
          </ScrollView>
        )}
      </View>
    </ConsoleAmbientBackground>
  );
}

const styles = StyleSheet.create({
  pad: { flex: 1, paddingHorizontal: 0, paddingTop: 8 },
  top: { flexDirection: 'row', alignItems: 'flex-start' },
  title: { fontSize: 16, fontWeight: '800' },
  time: { fontSize: 11, marginTop: 4, fontWeight: '600' },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#7C6FFF',
    marginLeft: 8,
    marginTop: 4,
  },
  body: { marginTop: 10, fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: 'row', marginTop: 14, gap: 24 },
  act: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actTxt: { fontSize: 13, fontWeight: '700' },
});
