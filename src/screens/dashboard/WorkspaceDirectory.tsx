import { MotionPressable } from '../../components/ui/MotionPressable';
import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { LinearGradient } from 'expo-linear-gradient';
import { getCardTone, type CardTone } from '../../constants/experienceColors';
import { borderRadius } from '../../constants/theme';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  ArrowUpRight,
  BookOpen,
  CheckCheck,
  Layers,
  MessageCircle,
  Receipt,
  School,
  Search,
  Target,
  Users,
  Wallet,
  BarChart3,
  LayoutGrid,
  X,
} from 'lucide-react-native';
import { EmptyNote, useDashboardPalette } from './DashboardPrimitives';
import { useTheme } from '../../contexts/ThemeContext';
import {
  getWorkspaceModule,
  workspaceModules,
} from '../../constants/workspaceDesign';
import { dashboardWorkspaces } from './dashboardWorkspaces';

const ICONS = {
  school: School,
  check: CheckCheck,
  layers: Layers,
  book: BookOpen,
  wallet: Wallet,
  receipt: Receipt,
  users: Users,
  target: Target,
  chart: BarChart3,
  message: MessageCircle,
};
const CATEGORY_MODULES = {
  Operations: 'schools',
  Finance: 'finance',
  Growth: 'sales',
  'People & content': 'content',
  Administration: 'system',
} as const;

const MODULE_TONES: Record<keyof typeof workspaceModules, CardTone> = {
  overview: 'crimson',
  schools: 'blue',
  finance: 'honey',
  connect: 'crimson',
  sales: 'honey',
  team: 'rose',
  content: 'lavender',
  support: 'rose',
  system: 'blue',
};
function workspaceTone(route: string): CardTone {
  if (route.includes('checklist')) return 'honey';
  if (route.includes('school-intake') || route.includes('expenses'))
    return 'rose';
  if (route.includes('import')) return 'lavender';
  if (route.includes('media-qr')) return 'crimson';
  if (route.includes('/crm')) return 'rose';
  return MODULE_TONES[getWorkspaceModule(route)];
}

export function WorkspaceDirectory({
  entries: workspaces,
  phone,
  wide,
  onNavigate,
}: {
  entries: readonly (typeof dashboardWorkspaces)[number][];
  phone: boolean;
  wide: boolean;
  onNavigate: (route: string) => void;
}) {
  const p = useDashboardPalette();
  const { isDark } = useTheme();
  const [workspaceQuery, setWorkspaceQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All workspaces');
  const [contentWidth, setContentWidth] = useState(0);
  const [searchFocused, setSearchFocused] = useState(false);
  const categories = [...new Set(workspaces.map((w) => w.category))];
  const shownWorkspaces = workspaces.filter(
    (w) =>
      (selectedCategory === 'All workspaces' ||
        w.category === selectedCategory) &&
      `${w.title} ${w.detail} ${w.category}`
        .toLowerCase()
        .includes(workspaceQuery.trim().toLowerCase()),
  );
  const columns = contentWidth
    ? contentWidth >= 1240
      ? 4
      : contentWidth >= 900
      ? 3
      : contentWidth >= 590
      ? 2
      : 1
    : phone
    ? 1
    : wide
    ? 3
    : 2;
  const cardWidth = contentWidth
    ? (contentWidth - (columns - 1) * 16) / columns
    : phone
    ? '100%'
    : wide
    ? '31.8%'
    : '48%';

  return (
    <View
      style={styles.directory}
      onLayout={(event) => {
        const nextWidth = event.nativeEvent.layout.width;
        setContentWidth((current) =>
          Math.abs(current - nextWidth) > 1 ? nextWidth : current,
        );
      }}
    >
      <View style={[styles.toolbar, phone && { alignItems: 'stretch' }]}>
        {!phone && (
          <View style={styles.introduction}>
            <View style={[styles.directoryMark, { backgroundColor: p.inset }]}>
              <LayoutGrid size={21} color={p.action} />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                accessibilityRole="header"
                style={[styles.directoryTitle, { color: p.ink }]}
              >
                Find your focus
              </Text>
              <Text style={[styles.directoryDetail, { color: p.muted }]}>
                {workspaces.length} workspaces, organized for the way you work.
              </Text>
            </View>
          </View>
        )}
        <View
          style={[
            styles.search,
            {
              backgroundColor: p.surface,
              borderColor: searchFocused ? p.action : p.line,
              width: phone ? '100%' : '44%',
            },
          ]}
        >
          <Search size={17} color={searchFocused ? p.action : p.muted} />
          <TextInput
            accessibilityLabel="Find a workspace"
            placeholder="Search workspaces…"
            placeholderTextColor={p.muted}
            value={workspaceQuery}
            onChangeText={setWorkspaceQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            style={[
              styles.searchInput,
              { color: p.ink },
              Platform.OS === 'web' && ({ outlineStyle: 'none' } as any),
            ]}
          />
          {!!workspaceQuery && (
            <MotionPressable
              accessibilityRole="button"
              accessibilityLabel="Clear workspace search"
              onPress={() => setWorkspaceQuery('')}
              style={styles.clear}
            >
              <X size={15} color={p.muted} />
            </MotionPressable>
          )}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
        style={{ flexGrow: 0 }}
      >
        {['All workspaces', ...categories].map((category) => {
          const active = selectedCategory === category;
          const count =
            category === 'All workspaces'
              ? workspaces.length
              : workspaces.filter((w) => w.category === category).length;
          const family =
            category === 'All workspaces'
              ? workspaceModules.overview
              : workspaceModules[
                  CATEGORY_MODULES[category as keyof typeof CATEGORY_MODULES]
                ];
          const accent = isDark ? family.dark : family.light;
          return (
            <MotionPressable
              key={category}
              accessibilityRole="button"
              accessibilityLabel={`Filter ${category}`}
              accessibilityState={{ selected: active }}
              onPress={() => setSelectedCategory(category)}
              style={({ hovered, pressed }: any) => [
                styles.filter,
                {
                  backgroundColor: active
                    ? p.actionFill
                    : hovered
                    ? p.inset
                    : p.surface,
                  borderColor: active ? p.actionFill : p.line,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              {category !== 'All workspaces' && (
                <View
                  style={[
                    styles.filterDot,
                    { backgroundColor: active ? '#FFFFFF' : accent },
                  ]}
                />
              )}
              <Text
                style={[
                  styles.filterText,
                  { color: active ? '#FFFFFF' : p.muted },
                ]}
              >
                {category}
              </Text>
              <Text
                style={[
                  styles.filterCount,
                  { color: active ? '#FFFFFF' : p.muted },
                ]}
              >
                {count}
              </Text>
            </MotionPressable>
          );
        })}
      </ScrollView>

      {!!workspaceQuery.trim() && (
        <Text
          accessibilityLiveRegion="polite"
          style={{ color: p.muted, fontSize: 12 }}
        >
          {shownWorkspaces.length} matching{' '}
          {shownWorkspaces.length === 1 ? 'workspace' : 'workspaces'}
        </Text>
      )}
      {shownWorkspaces.length ? (
        categories
          .filter((category) =>
            shownWorkspaces.some((w) => w.category === category),
          )
          .map((category) => {
            const family = workspaceModules[CATEGORY_MODULES[category]];
            const accent = isDark ? family.dark : family.light;
            const categoryEntries = shownWorkspaces.filter(
              (w) => w.category === category,
            );
            return (
              <View key={category} style={styles.group}>
                <View style={styles.groupHeader}>
                  <View
                    style={[styles.groupDot, { backgroundColor: accent }]}
                  />
                  <Text
                    accessibilityRole="header"
                    style={[styles.groupTitle, { color: p.ink }]}
                  >
                    {category}
                  </Text>
                  <Text style={[styles.groupCount, { color: p.muted }]}>
                    {categoryEntries.length}
                  </Text>
                  <View
                    style={[styles.groupRule, { backgroundColor: p.line }]}
                  />
                </View>
                <View style={styles.grid}>
                  {categoryEntries.map((w) => {
                    const Icon = ICONS[w.icon];
                    const tone = workspaceTone(w.route);
                    const paint = getCardTone(tone, isDark);
                    return (
                      <Card
                        key={w.title}
                        noPadding
                        tone={tone}
                        material="panel"
                        accessibilityLabel={`Open ${w.title}`}
                        onPress={() => onNavigate(w.route)}
                        style={[styles.card, { width: cardWidth }]}
                      >
                        <LinearGradient
                          colors={[paint.cover, paint.coverEnd]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.cover}
                        >
                          <View style={styles.coverTop}>
                            <Text
                              style={[
                                styles.coverLabel,
                                { color: paint.accent },
                              ]}
                            >
                              {w.category.toUpperCase()}
                            </Text>
                            <ArrowUpRight size={18} color={paint.accent} />
                          </View>
                          <Icon
                            size={42}
                            color={paint.accent}
                            strokeWidth={1.5}
                          />
                          <View
                            pointerEvents="none"
                            style={[
                              styles.coverRing,
                              { borderColor: paint.accent },
                            ]}
                          />
                          <View
                            pointerEvents="none"
                            style={[
                              styles.coverTile,
                              { borderColor: paint.accent },
                            ]}
                          />
                        </LinearGradient>
                        <View style={styles.cardBody}>
                          <Text
                            style={[styles.cardTitle, { color: paint.ink }]}
                          >
                            {w.title}
                          </Text>
                          <Text
                            style={[styles.cardDetail, { color: paint.muted }]}
                          >
                            {w.detail}
                          </Text>
                          <View
                            style={[
                              styles.cardFooter,
                              { borderColor: paint.border },
                            ]}
                          >
                            <Text
                              style={[
                                styles.openLabel,
                                { color: paint.accent },
                              ]}
                            >
                              Open workspace
                            </Text>
                            <View
                              style={[
                                styles.cardArrow,
                                { backgroundColor: paint.surface },
                              ]}
                            >
                              <ArrowUpRight size={16} color={paint.accent} />
                            </View>
                          </View>
                        </View>
                      </Card>
                    );
                  })}
                </View>
              </View>
            );
          })
      ) : (
        <View
          style={[
            styles.empty,
            { backgroundColor: p.surface, borderColor: p.line },
          ]}
        >
          <EmptyNote
            title="No matching workspace."
            detail="Try schools, finance, content or another workspace name."
          />
          <MotionPressable
            accessibilityRole="button"
            accessibilityLabel="Reset workspace filters"
            onPress={() => {
              setSelectedCategory('All workspaces');
              setWorkspaceQuery('');
            }}
            style={[styles.reset, { backgroundColor: p.inset }]}
          >
            <Text style={{ color: p.action, fontSize: 13, fontWeight: '600' }}>
              Clear filters
            </Text>
          </MotionPressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  directory: { gap: 24, width: '100%' },
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 20,
  },
  introduction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexGrow: 1,
    flexBasis: 250,
  },
  directoryMark: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  directoryTitle: { fontSize: 19, fontWeight: '600', letterSpacing: -0.4 },
  directoryDetail: { fontSize: 12, lineHeight: 18, marginTop: 4 },
  search: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    minWidth: 0,
    maxWidth: 420,
  },
  searchInput: { flex: 1, minWidth: 0, fontSize: 16, paddingVertical: 13 },
  clear: {
    minHeight: 44,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filters: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
  filter: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  filterText: { fontSize: 12, fontWeight: '500' },
  filterCount: { fontSize: 11, opacity: 0.85, marginLeft: 2 },
  filterDot: { width: 5, height: 5, borderRadius: 3 },
  group: { gap: 14, marginTop: 2 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  groupDot: { width: 7, height: 7, borderRadius: 3 },
  groupTitle: { fontSize: 14, fontWeight: '600' },
  groupCount: { fontSize: 11 },
  groupRule: { flex: 1, height: 1, marginLeft: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  card: {
    minWidth: 0,
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    padding: 0,
    minHeight: 278,
    overflow: 'hidden',
  },
  cover: {
    height: 118,
    padding: 20,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  coverTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  coverLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.2 },
  coverRing: {
    position: 'absolute',
    width: 122,
    height: 122,
    borderWidth: 1,
    borderRadius: 61,
    right: 36,
    bottom: -54,
    opacity: 0.22,
  },
  coverTile: {
    position: 'absolute',
    width: 82,
    height: 82,
    borderWidth: 1,
    borderRadius: 22,
    right: -12,
    top: 38,
    transform: [{ rotate: '-22deg' }],
    opacity: 0.25,
  },
  cardBody: { padding: 22, flexGrow: 1 },
  openLabel: { fontSize: 12, fontWeight: '600' },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 17,
  },
  icon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardArrow: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 20,
    lineHeight: 27,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  cardDetail: { fontSize: 13, lineHeight: 20, marginTop: 6, flexGrow: 1 },
  cardFooter: {
    marginTop: 20,
    paddingTop: 14,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  empty: {
    borderWidth: 1,
    borderRadius: 14,
    alignItems: 'center',
    paddingBottom: 24,
  },
  reset: {
    paddingHorizontal: 18,
    minHeight: 40,
    borderRadius: 8,
    justifyContent: 'center',
  },
});
