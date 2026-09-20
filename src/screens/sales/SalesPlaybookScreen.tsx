import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { BookOpen, ArrowRight, Search } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { playbookChapters } from '../../content/salesPlaybook';

export default function SalesPlaybookScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { chapter } = useLocalSearchParams<{ chapter?: string }>();
  const [search, setSearch] = useState('');
  const [audience, setAudience] = useState('All');
  const [selected, setSelected] = useState<string | null>(chapter || null);
  React.useEffect(() => { setSelected(chapter || null); }, [chapter]);
  const chapters = useMemo(() => playbookChapters.filter((item) =>
    (audience === 'All' || item.audience === audience) &&
    JSON.stringify(item).toLowerCase().includes(search.trim().toLowerCase()),
  ), [audience, search]);
  const card = { backgroundColor: isDark ? '#181D27' : '#FFFFFF', borderColor: colors.border };
  return (
    <ScrollView contentContainerStyle={[styles.page, { backgroundColor: colors.background }]}>
      <View style={styles.headingRow}>
        <View style={{ flex: 1, minWidth: 240 }}>
          <Text style={styles.eyebrow}>SCHOOLIMS · SALES ENABLEMENT</Text>
          <Text style={[styles.title, { color: colors.textPrimary }]}>The field playbook</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Ask better questions. Demonstrate the difference. Agree on the next step.</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={() => router.push('/sales/training' as any)} style={styles.primary}>
          <Text style={styles.primaryText}>Start sales training</Text><ArrowRight size={17} color="#FFFFFF" />
        </Pressable>
      </View>
      <View style={[styles.intro, card]}>
        <BookOpen size={24} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Keep this open before your next school visit</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>Choose the general school conversation or the existing ERP approach. Each chapter includes practical talk tracks and its source pages.</Text>
        </View>
      </View>
      <View style={[styles.search, card]}>
        <Search size={18} color={colors.textSecondary} />
        <TextInput accessibilityLabel="Search sales playbook" placeholder="Search discovery, fees, objections, migration…" placeholderTextColor={colors.textSecondary} value={search} onChangeText={setSearch} style={[styles.searchInput, { color: colors.textPrimary }]} />
      </View>
      <View style={styles.filters}>
        {['All', 'Every school', 'Existing ERP'].map((filter) => (
          <Pressable key={filter} accessibilityRole="button" accessibilityState={{ selected: audience === filter }} onPress={() => setAudience(filter)} style={[styles.filter, { borderColor: colors.border, backgroundColor: audience === filter ? colors.primary : card.backgroundColor }]}>
            <Text style={{ color: audience === filter ? '#FFFFFF' : colors.textPrimary, fontWeight: '600' }}>{filter}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={{ color: colors.textSecondary }}>{chapters.length} chapters</Text>
      {chapters.map((item, index) => {
        const open = selected === item.id;
        return (
          <View key={item.id} style={[styles.chapter, card]}>
            <Pressable accessibilityRole="button" accessibilityLabel={item.title} accessibilityState={{ expanded: open }} onPress={() => setSelected(open ? null : item.id)} style={styles.chapterHeader}>
              <View style={styles.number}><Text style={{ color: colors.primary, fontWeight: '800' }}>{String(index + 1).padStart(2, '0')}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                <Text style={[styles.body, { color: colors.textSecondary }]}>{item.summary}</Text>
                <Text style={[styles.source, { color: colors.primary }]}>{item.audience} · {open ? 'Hide chapter' : 'Read chapter'}</Text>
              </View>
            </Pressable>
            {open && <View style={[styles.chapterBody, { borderColor: colors.border }]}>
              {item.sections.map((section) => <View key={section.title} style={{ gap: 7 }}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{section.title}</Text>
                <Text selectable style={[styles.body, { color: colors.textSecondary }]}>{section.body}</Text>
                {section.prompts?.map((prompt) => <Text selectable key={prompt} style={[styles.body, { color: colors.textSecondary }]}>• {prompt}</Text>)}
              </View>)}
              <Text style={[styles.source, { color: colors.textSecondary }]}>Reference: {item.source}</Text>
            </View>}
          </View>
        );
      })}
      {!chapters.length && <Text style={[styles.body, { color: colors.textSecondary }]}>No chapters match. Try a different search or audience.</Text>}
      <View style={[styles.chapter, card]}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Source library</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>Adapted from SchoolIMS Sales Playbook (v1.0, 12 pages) and SchoolIMS Incumbent ERP Battlebook Premium (field edition v2.4, 7 pages). Internal Nexsyrus sales reference.</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>Pricing and performance figures are training examples. Confirm the approved offer and demonstrated product capabilities before making a customer commitment.</Text>
      </View>
    </ScrollView>
  );
}

export const styles = StyleSheet.create({
  page: { padding: 28, paddingBottom: 100, gap: 18, flexGrow: 1 },
  headingRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 20, marginBottom: 8 },
  eyebrow: { color: '#3186D8', fontWeight: '800', fontSize: 11, letterSpacing: 1.5, marginBottom: 10 },
  title: { fontSize: 32, fontWeight: '800', letterSpacing: -0.8 },
  subtitle: { fontSize: 15, lineHeight: 23, marginTop: 8 },
  primary: { backgroundColor: '#1765B2', borderRadius: 12, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 10 },
  primaryText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  intro: { borderWidth: 1, borderRadius: 16, padding: 22, flexDirection: 'row', gap: 16, alignItems: 'center' },
  sectionTitle: { fontSize: 17, fontWeight: '700', lineHeight: 24 },
  body: { fontSize: 14, lineHeight: 23 },
  search: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, flexDirection: 'row', gap: 12, alignItems: 'center' },
  searchInput: { paddingVertical: 16, flex: 1, fontSize: 14, minWidth: 0 },
  filters: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  filter: { paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderRadius: 20 },
  chapter: { borderWidth: 1, borderRadius: 16, padding: 20, gap: 12 },
  chapterHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  number: { padding: 10, borderRadius: 10, backgroundColor: 'rgba(49,134,216,0.1)' },
  chapterBody: { borderTopWidth: 1, paddingTop: 20, gap: 22 },
  source: { fontSize: 12, lineHeight: 19, marginTop: 6 },
});
