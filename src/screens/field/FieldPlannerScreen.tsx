import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Calendar, Search, X } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { fieldVisitApi } from '../../services/fieldVisitService';
import { ConsoleAmbientBackground, GlassCard, SkeletonActionList } from '../founder/founderUi';

function localDate(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

function labelFor(date: string) {
  const tomorrow = localDate(1);
  const today = localDate(0);
  const pretty = new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  if (date === tomorrow) return `Tomorrow · ${pretty}`;
  if (date === today) return `Today · ${pretty}`;
  return pretty;
}

const TIMES = ['09:00', '10:30', '12:00', '14:00', '16:00'];

export default function FieldPlannerScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [date, setDate] = useState(localDate(1));
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [priority, setPriority] = useState('MEDIUM');
  const [time, setTime] = useState('10:30');
  const [note, setNote] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formMessage, setFormMessage] = useState('');

  const load = useCallback(async (planDate: string) => {
    setLoading(true);
    try {
      const res: any = await fieldVisitApi.getPlan(planDate);
      setPlan(res?.data ?? res);
    } catch {
      setPlan(null);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(date); }, [date, load]);

  const search = async () => {
    if (query.trim().length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const res: any = await fieldVisitApi.searchSchools(query.trim());
      const rows = res?.data ?? res;
      const list = Array.isArray(rows) ? rows : [];
      setResults(list);
      setSearched(true);
      return list;
    } catch {
      Alert.alert('Search failed', 'School search needs a connection. Try again when you are online.');
      return [];
    } finally { setSearching(false); }
  };

  const add = async (school: any) => {
    try {
      await fieldVisitApi.addPlanStop({
        date,
        school_account_id: school.id,
        priority,
        appointment_time: time,
        research_note: note,
        contact_name: school.contact_name,
        contact_phone: school.contact_phone || school.phone,
      });
      setNote('');
      setQuery('');
      setResults([]);
      setSearched(false);
      setSelectedId(null);
      setFormMessage('');
      load(date);
    } catch (e: any) {
      const message = e?.response?.data?.error || 'This school may already be on the plan.';
      setFormMessage(message);
      Alert.alert('Could not add school', message);
    }
  };

  const save = async () => {
    const name = query.trim();
    if (name.length < 2 && !selectedId) {
      setFormMessage('Enter the school name, then save.');
      return;
    }
    setSaving(true);
    setFormMessage('');
    try {
      let school = results.find((row) => row.id === selectedId) || null;
      if (!school && name.length >= 2) {
        const list = await search();
        const wanted = name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
        school = (list || []).find((row) => row.name?.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() === wanted) || null;
      }
      if (!school) {
        const range = note.match(/(\d[\d,]*)\s*\+/)?.[1]?.replace(/,/g, '');
        try {
          const created: any = await fieldVisitApi.createSchool({
            name,
            student_range: range ? `${range}+` : null,
            create_anyway_reason: 'Researched and added from the day planner',
          });
          const account = created?.account || created;
          school = { id: account.id, name: account.name, phone: account.phone };
        } catch (createError: any) {
          const matches = createError?.response?.data?.details?.matches;
          if (createError?.response?.status === 409 && matches?.[0]?.id) {
            school = matches[0];
          } else {
            throw createError;
          }
        }
      }
      await add(school);
    } catch (e: any) {
      setFormMessage(e?.response?.data?.error || 'Could not save this plan. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await fieldVisitApi.removePlanStop(id);
      load(date);
    } catch (e: any) {
      Alert.alert('Could not remove', e?.response?.data?.error || 'Visited stops stay on the day.');
    }
  };

  const stops = plan?.stops || [];

  return (
    <ConsoleAmbientBackground>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        <View style={styles.titleRow}>
          <Calendar size={20} color={colors.primary} />
          <Text style={[styles.title, { color: colors.textPrimary }]}>Plan the day before</Text>
        </View>
        <Text style={[styles.sub, { color: colors.textSecondary }]}>
          Research schools now. Tomorrow's route is this list. Check-in starts only after you arrive.
        </Text>

        <View style={styles.chips}>
          {[1, 0, 2].map((offset) => {
            const value = localDate(offset);
            const selected = value === date;
            return (
              <Pressable key={value} onPress={() => setDate(value)}
                style={[styles.chip, { borderColor: selected ? colors.primary : 'rgba(150,150,160,0.35)', backgroundColor: selected ? `${colors.primary}18` : 'transparent' }]}>
                <Text style={{ color: selected ? colors.primary : colors.textSecondary, fontWeight: '700', fontSize: 12.5 }}>{labelFor(value)}</Text>
              </Pressable>
            );
          })}
        </View>

        <GlassCard style={styles.card}>
          <Text style={[styles.h, { color: colors.textPrimary }]}>Find a school</Text>
          <View style={styles.searchRow}>
            <TextInput value={query} onChangeText={(value) => { setQuery(value); setSelectedId(null); }} onSubmitEditing={search}
              placeholder="Name, area, or district" placeholderTextColor="rgba(150,150,160,0.7)"
              style={[styles.input, { color: colors.textPrimary, borderColor: colors.glassBorder }]} />
            <Pressable onPress={search} style={styles.searchBtn}>
              <Search size={16} color="#fff" />
            </Pressable>
          </View>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Appointment</Text>
          <View style={styles.chips}>
            {TIMES.map((slot) => (
              <Pressable key={slot} onPress={() => setTime(slot)}
                style={[styles.chip, { borderColor: time === slot ? '#0A84FF' : 'rgba(150,150,160,0.35)' }]}>
                <Text style={{ color: time === slot ? '#0A84FF' : colors.textSecondary, fontWeight: '700', fontSize: 12 }}>{slot}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Priority</Text>
          <View style={styles.chips}>
            {['HIGH', 'MEDIUM', 'LOW'].map((level) => (
              <Pressable key={level} onPress={() => setPriority(level)}
                style={[styles.chip, { borderColor: priority === level ? '#FF9F0A' : 'rgba(150,150,160,0.35)' }]}>
                <Text style={{ color: priority === level ? '#FF9F0A' : colors.textSecondary, fontWeight: '700', fontSize: 12 }}>{level}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput value={note} onChangeText={setNote} placeholder="Why this school — renewal, size, who to meet"
            placeholderTextColor="rgba(150,150,160,0.7)"
            style={[styles.input, { color: colors.textPrimary, borderColor: colors.glassBorder, marginTop: 8 }]} />
          <Pressable onPress={save} disabled={saving}
            style={({ pressed }) => [styles.saveBtn, (pressed || saving) && { opacity: 0.72 }]}>
            <Text style={styles.primaryText}>{saving ? 'Saving…' : 'Save to plan'}</Text>
          </Pressable>
          {formMessage ? <Text style={[styles.meta, { color: '#FF453A', marginTop: 8 }]}>{formMessage}</Text> : null}
          {searching ? <SkeletonActionList count={2} /> : null}
          {!searching && searched && results.length === 0 ? (
            <Text style={[styles.meta, { color: colors.textSecondary, marginTop: 12 }]}>No school matches that search. Try a shorter name or a district.</Text>
          ) : null}
          {!searching && results.map((school) => (
            <Pressable key={school.id} onPress={() => setSelectedId(school.id)}
              style={[styles.result, { borderColor: selectedId === school.id ? colors.primary : colors.glassBorder, borderWidth: selectedId === school.id ? 1.5 : 0, borderTopWidth: 1 }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: colors.textPrimary }]}>{school.name}</Text>
                <Text style={[styles.meta, { color: colors.textSecondary }]}>
                  {[school.locality_raw, school.district_raw].filter(Boolean).join(' · ') || 'Area not on file'}
                  {school.contact_name ? ` · ${school.contact_name}` : ''}
                  {school.sales_stage ? ` · ${school.sales_stage}` : ''}
                  {school.total_students ? ` · ${school.total_students} students` : ''}
                </Text>
              </View>
            </Pressable>
          ))}
        </GlassCard>

        <Text style={[styles.h, { color: colors.textPrimary, marginBottom: 8 }]}>{labelFor(date)} · {stops.length} schools</Text>
        {loading ? <SkeletonActionList count={2} /> : stops.length === 0 ? (
          <GlassCard style={styles.empty}>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>Nothing planned yet. Enter the school, then Save to plan.</Text>
          </GlassCard>
        ) : stops.map((stop: any, index: number) => (
          <GlassCard key={stop.id} style={styles.stop}>
            <View style={styles.stopTop}>
              <Text style={[styles.index, { color: colors.primary }]}>{index + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: colors.textPrimary }]}>{stop.school_name}</Text>
                <Text style={[styles.meta, { color: colors.textSecondary }]}>
                  {stop.appointment_at ? new Date(stop.appointment_at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : 'Time open'}
                  {' · '}{stop.priority || 'MEDIUM'}
                  {stop.area ? ` · ${stop.area}` : ''}
                </Text>
                {stop.research_note ? <Text style={[styles.meta, { color: colors.textPrimary }]}>{stop.research_note}</Text> : null}
              </View>
              <Pressable onPress={() => remove(stop.id)} style={styles.removeBtn}>
                <X size={16} color="#FF453A" />
              </Pressable>
            </View>
          </GlassCard>
        ))}

        <Pressable onPress={() => router.push('/(app)/field/today' as any)} style={styles.primary}>
          <Text style={styles.primaryText}>See today's mission</Text>
        </Pressable>
      </ScrollView>
    </ConsoleAmbientBackground>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 24, fontWeight: '800' },
  sub: { fontSize: 13, lineHeight: 18, marginTop: 6, marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5 },
  card: { padding: 16, marginBottom: 16 },
  h: { fontSize: 15, fontWeight: '700' },
  label: { fontSize: 12, fontWeight: '600', marginTop: 10, marginBottom: 6 },
  searchRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  input: { flex: 1, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, fontSize: 14 },
  searchBtn: { width: 46, borderRadius: 12, backgroundColor: '#0A84FF', alignItems: 'center', justifyContent: 'center' },
  result: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, paddingTop: 12, marginTop: 12 },
  name: { fontSize: 14.5, fontWeight: '700' },
  meta: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  addBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#30D158', alignItems: 'center', justifyContent: 'center' },
  empty: { padding: 18, marginBottom: 12 },
  stop: { padding: 14, marginBottom: 10 },
  stopTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  index: { fontSize: 16, fontWeight: '800', width: 18 },
  removeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  saveBtn: { backgroundColor: '#0A84FF', padding: 14, borderRadius: 14, alignItems: 'center', marginTop: 14 },
  primary: { backgroundColor: '#0A84FF', padding: 14, borderRadius: 14, alignItems: 'center', marginTop: 8 },
  primaryText: { color: '#fff', fontWeight: '700' },
});
