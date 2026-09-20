import React, { useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../hooks/useAuth';
import { playbookChapters, trainingModules } from '../../content/salesPlaybook';
import { styles } from './SalesPlaybookScreen';

type Progress = Record<string, boolean>;
export default function SalesTrainingScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  // Progress is personal practice, stored per account on this device, not certification.
  const storageKey = user?.id ? `schoolims:sales-training:v1:${user.id}` : null;
  const router = useRouter();
  const [activeId, setActiveId] = useState(trainingModules[0].id);
  const [completed, setCompleted] = useState<Progress>({});
  const [practiced, setPracticed] = useState(false);
  const [answer, setAnswer] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const currentKey = useRef(storageKey);
  currentKey.current = storageKey;
  useEffect(() => {
    let cancelled = false;
    setCompleted({}); setLoading(true); setError(null);
    setPracticed(false); setAnswer(null); setChecked(false);
    if (!storageKey) { setLoading(false); return; }
    AsyncStorage.getItem(storageKey).then((raw) => {
      const parsed = raw ? JSON.parse(raw) : {};
      const progress: Progress = {};
      for (const lesson of trainingModules) if (parsed?.[lesson.id] === true) progress[lesson.id] = true;
      if (!cancelled) setCompleted(progress);
    }).catch(() => {
      if (!cancelled) setError('Could not load your practice progress. Retry before saving.');
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [storageKey, reload]);
  const lesson = trainingModules.find((item) => item.id === activeId)!;
  const completedCount = trainingModules.filter((item) => completed[item.id]).length;
  const card = { backgroundColor: isDark ? '#181D27' : '#FFFFFF', borderColor: colors.border };
  const chooseLesson = (id: string) => {
    setActiveId(id); setPracticed(false); setAnswer(null); setChecked(false);
  };
  const saveLesson = async () => {
    if (!storageKey || !practiced || !checked || answer !== lesson.answer || saving || loading || error) return;
    const key = storageKey;
    const progress = { ...completed, [lesson.id]: true };
    setSaving(true);
    try {
      await AsyncStorage.setItem(key, JSON.stringify(progress));
      if (currentKey.current === key) setCompleted(progress);
    } catch {
      if (currentKey.current === key) setError('Could not save your practice progress. Retry to reload the last saved state.');
    } finally { setSaving(false); }
  };
  const button = (label: string, onPress: () => void, disabled = false) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={[styles.primary, { opacity: disabled ? 0.45 : 1, alignSelf: 'flex-start' }]}>
      <Text style={styles.primaryText}>{label}</Text>
    </Pressable>
  );
  return (
    <ScrollView contentContainerStyle={[styles.page, { backgroundColor: colors.background }]}>
      <Text style={styles.eyebrow}>SCHOOLIMS · NEW EMPLOYEE LEARNING PATH</Text>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Ready for your first school visit</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Six guided lessons. Read the playbook, rehearse the conversation, then check your understanding.</Text>
      <View style={[styles.chapter, card]}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{completedCount} of {trainingModules.length} lessons completed</Text>
        <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: trainingModules.length, now: completedCount }} style={{ height: 8, backgroundColor: colors.border, borderRadius: 8 }}>
          <View style={{ height: 8, width: `${completedCount / trainingModules.length * 100}%`, backgroundColor: '#248A68', borderRadius: 8 }} />
        </View>
        <Text style={[styles.body, { color: colors.textSecondary }]}>Progress is saved for your account on this device. This is self-paced practice; arrange a manager-observed roleplay before independent field visits.</Text>
        {loading && <ActivityIndicator color={colors.primary} />}
        {!storageKey && <Text style={{ color: colors.textSecondary }}>Sign in to save your progress.</Text>}
        {error && <><Text accessibilityRole="alert" style={{ color: colors.textPrimary }}>{error}</Text>{button('Retry progress', () => setReload((value) => value + 1))}</>}
      </View>
      <View style={styles.filters}>
        {trainingModules.map((item) => <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: item.id === activeId }} disabled={saving} onPress={() => chooseLesson(item.id)} style={[styles.filter, { borderColor: colors.border, backgroundColor: item.id === activeId ? colors.primary : card.backgroundColor }]}>
          <Text style={{ color: item.id === activeId ? '#FFFFFF' : colors.textPrimary }}>{completed[item.id] ? '✓ ' : ''}{item.title}</Text>
        </Pressable>)}
      </View>
      <View style={[styles.chapter, card]}>
        <Text style={styles.eyebrow}>{lesson.duration} · {completed[lesson.id] ? 'COMPLETED · REVIEW ANYTIME' : 'READ, PRACTICE, CHECK'}</Text>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{lesson.title}</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>{lesson.objective}</Text>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Read the relevant chapters</Text>
        {lesson.chapterIds.map((id) => <Pressable key={id} accessibilityRole="link" onPress={() => router.push(`/sales/playbook?chapter=${id}` as any)}>
          <Text style={[styles.body, { color: colors.primary }]}>{playbookChapters.find((chapter) => chapter.id === id)?.title} →</Text>
        </Pressable>)}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Practice aloud</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>{lesson.exercise}</Text>
        {lesson.checklist.map((item) => <Text key={item} style={[styles.body, { color: colors.textSecondary }]}>• {item}</Text>)}
        <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: practiced }} disabled={saving} onPress={() => setPracticed(!practiced)} style={[styles.filter, { borderColor: colors.border }]}>
          <Text style={{ color: colors.textPrimary }}>{practiced ? '☑' : '☐'} I rehearsed the exercise and covered these points.</Text>
        </Pressable>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Knowledge check</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>{lesson.question}</Text>
        {lesson.options.map((option, index) => <Pressable key={option} accessibilityRole="radio" accessibilityState={{ checked: answer === index }} disabled={saving} onPress={() => { setAnswer(index); setChecked(false); }} style={[styles.filter, { borderColor: answer === index ? colors.primary : colors.border }]}>
          <Text style={[styles.body, { color: colors.textPrimary }]}>{answer === index ? '●' : '○'} {option}</Text>
        </Pressable>)}
        {button('Check answer', () => setChecked(true), answer === null || saving)}
        {checked && <View accessibilityRole="alert" style={{ gap: 8 }}>
          <Text style={[styles.sectionTitle, { color: answer === lesson.answer ? '#248A68' : colors.textPrimary }]}>{answer === lesson.answer ? 'Correct' : 'Try again'}</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>{answer === lesson.answer ? lesson.explanation : 'Review the linked chapter, then choose another answer.'}</Text>
        </View>}
        {!completed[lesson.id] && button(saving ? 'Saving progress…' : 'Complete lesson', saveLesson, !practiced || !checked || answer !== lesson.answer || saving || loading || !!error || !storageKey)}
        {completed[lesson.id] && <Text accessibilityLiveRegion="polite" style={[styles.body, { color: '#248A68' }]}>Lesson complete. Your progress is saved.</Text>}
      </View>
      {completedCount === trainingModules.length && <View style={[styles.chapter, card]}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Practice path complete</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>Next: ask your manager to observe a full discovery, demo, objection response and close. Bring a sample implementation handoff and confirm your approved pricing and demo setup.</Text>
      </View>}
    </ScrollView>
  );
}
