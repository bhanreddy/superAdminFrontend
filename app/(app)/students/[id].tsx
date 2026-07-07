import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { Router } from 'expo-router';
import { ChevronLeft, GraduationCap, School, Hash, Calendar, User } from 'lucide-react-native';
import { superAdminApi } from '../../../src/services/apiService';
import { Student } from '../../../src/types/student';

const D = {
  radius: { sm: 10, md: 14, lg: 20 },
  space: { sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 },
  font: {
    displayBold: { fontSize: 24, fontWeight: '800' as const, letterSpacing: -0.6 },
    title: { fontSize: 13, fontWeight: '700' as const, letterSpacing: 0.4, textTransform: 'uppercase' as const },
    body: { fontSize: 14, fontWeight: '500' as const },
    caption: { fontSize: 12, fontWeight: '400' as const },
    mono: { fontSize: 13, fontWeight: '600' as const, fontVariant: ['tabular-nums' as const] },
  },
};

const P = {
  bg: '#0F1117',
  surface: '#181B24',
  surfaceAlt: '#1E2230',
  border: '#2A2F42',
  borderSoft: '#232738',
  accent: '#6C8EFF',
  accentDim: 'rgba(108,142,255,0.12)',
  textPrimary: '#F0F2FF',
  textSecondary: '#8B91A8',
  textTertiary: '#555C75',
  success: '#34D399',
  successDim: 'rgba(52,211,153,0.12)',
};

function formatDate(iso: string | undefined) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

export default function StudentDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const id = useMemo(() => {
    const raw = params.id;
    return Array.isArray(raw) ? raw[0] : raw;
  }, [params.id]);

  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!id) {
        setStudent(null);
        setNotFound(true);
        setLoadError(false);
        setLoading(false);
        return;
      }
      setLoading(true);
      setNotFound(false);
      setLoadError(false);
      setStudent(null);
      try {
        const data = await superAdminApi.getStudent(id);
        if (!cancelled) setStudent(data);
      } catch (e: any) {
        if (!cancelled) {
          if (e?.response?.status === 404) setNotFound(true);
          else setLoadError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const displayName = student
    ? `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Unknown'
    : '';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: P.bg }]}>
        <ActivityIndicator size="large" color={P.accent} />
      </View>
    );
  }

  if (loadError || notFound || !student) {
    return (
      <View style={[styles.center, styles.pad, { backgroundColor: P.bg }]}>
        <View style={styles.headerIconWrap}>
          <GraduationCap size={28} color={P.accent} />
        </View>
        <Text style={styles.emptyTitle}>{loadError ? 'Could not load student' : 'Student not found'}</Text>
        <Text style={styles.emptyDesc}>
          {loadError
            ? 'Check your connection and try again from the students list.'
            : 'This profile may have been removed or the link is invalid.'}
        </Text>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(app)/students/' as any))}
          style={({ pressed }) => [styles.backLink, pressed && { opacity: 0.8 }]}
        >
          <ChevronLeft size={18} color={P.accent} />
          <Text style={styles.backLinkText}>Back to students</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: P.bg }]}
      contentContainerStyle={styles.scrollContent}
    >
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/(app)/students/' as any))}
        style={({ pressed }) => [styles.backRow, pressed && { opacity: 0.75 }]}
      >
        <ChevronLeft size={20} color={P.accent} />
        <Text style={styles.backText}>Students</Text>
      </Pressable>

      <View style={styles.hero}>
        {student.photo_url ? (
          <Image source={{ uri: student.photo_url }} style={styles.photo} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: P.accentDim }]}>
            <Text style={[styles.avatarText, { color: P.accent }]}>{initials || '?'}</Text>
          </View>
        )}
        <View style={styles.heroText}>
          <Text style={styles.heroName} numberOfLines={2}>
            {displayName}
          </Text>
          {student.status_name ? (
            <View style={[styles.statusPill, { backgroundColor: P.successDim }]}>
              <Text style={[styles.statusText, { color: P.success }]}>{student.status_name}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.card}>
        <Row label="Admission no." value={student.admission_no || '—'} icon={<Hash size={16} color={P.textTertiary} />} />
        <Row
          label="School"
          value={student.school_name || '—'}
          icon={<School size={16} color={P.textTertiary} />}
          schoolId={student.school_id}
          router={router}
        />
        <Row label="Gender ID" value={String(student.gender_id ?? '—')} icon={<User size={16} color={P.textTertiary} />} />
        <Row label="Student ID" value={student.id} mono icon={<Hash size={16} color={P.textTertiary} />} />
        <Row label="Enrolled" value={formatDate(student.created_at)} icon={<Calendar size={16} color={P.textTertiary} />} isLast />
      </View>
    </ScrollView>
  );
}

function Row({
  label,
  value,
  icon,
  mono,
  schoolId,
  router,
  isLast,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  mono?: boolean;
  schoolId?: number;
  router?: Router;
  isLast?: boolean;
}) {
  const isSchoolLink = label === 'School' && schoolId != null && router;

  const content = (
    <View style={[styles.row, isLast && styles.rowLast]}>
      <View style={styles.rowIcon}>{icon}</View>
      <View style={styles.rowBody}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text
          style={[styles.rowValue, mono && styles.rowMono]}
          numberOfLines={isSchoolLink ? 2 : 4}
          selectable={mono}
        >
          {value}
        </Text>
      </View>
      {isSchoolLink ? (
        <Text style={styles.rowChevron}>›</Text>
      ) : null}
    </View>
  );

  if (isSchoolLink) {
    return (
      <Pressable
        onPress={() => router.push(`/(app)/schools/${schoolId}` as any)}
        style={({ pressed }) => [pressed && { opacity: 0.85 }]}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pad: { paddingHorizontal: D.space.xl },
  scrollContent: {
    paddingTop: 8,
    paddingBottom: 48,
    paddingHorizontal: 20,
    maxWidth: 720,
    alignSelf: 'center',
    width: '100%',
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: D.space.lg,
    alignSelf: 'flex-start',
  },
  backText: {
    ...D.font.body,
    color: P.accent,
    fontWeight: '600',
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: D.space.lg,
    marginBottom: D.space.xl,
  },
  photo: {
    width: 72,
    height: 72,
    borderRadius: D.radius.md,
    backgroundColor: P.surfaceAlt,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: D.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${P.accent}33`,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  heroText: { flex: 1, gap: D.space.sm },
  heroName: {
    ...D.font.displayBold,
    color: P.textPrimary,
  },
  statusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    backgroundColor: P.surface,
    borderRadius: D.radius.lg,
    borderWidth: 1,
    borderColor: P.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: D.space.lg,
    paddingVertical: D.space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: P.borderSoft,
    gap: D.space.md,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowIcon: { width: 22, alignItems: 'center' },
  rowBody: { flex: 1, gap: 2 },
  rowLabel: {
    ...D.font.title,
    color: P.textTertiary,
    fontSize: 11,
  },
  rowValue: {
    ...D.font.body,
    color: P.textPrimary,
  },
  rowMono: {
    ...D.font.mono,
    fontSize: 12,
    color: P.textSecondary,
  },
  rowChevron: {
    fontSize: 22,
    color: P.textTertiary,
    fontWeight: '300',
  },
  headerIconWrap: {
    width: 56,
    height: 56,
    borderRadius: D.radius.md,
    backgroundColor: P.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: D.space.lg,
    borderWidth: 1,
    borderColor: `${P.accent}33`,
  },
  emptyTitle: {
    ...D.font.displayBold,
    fontSize: 20,
    color: P.textPrimary,
    marginBottom: D.space.sm,
    textAlign: 'center',
  },
  emptyDesc: {
    ...D.font.caption,
    color: P.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: D.space.xl,
    maxWidth: 320,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backLinkText: {
    ...D.font.body,
    color: P.accent,
    fontWeight: '600',
  },
});
