import React, { useState } from 'react';
import {
  Platform,
  Pressable,
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
        .includes(workspaceQuery.trim().toLowerCase())
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
          Math.abs(current - nextWidth) > 1 ? nextWidth : current
        );
      }}
    >
      <View style={[styles.toolbar, phone && { alignItems: 'stretch' }]}>
        <View style={styles.introduction}>
          <View style={[styles.directoryMark, { backgroundColor: p.inset }]}>
            <LayoutGrid size={21} color={p.green} />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              accessibilityRole="header"
              style={[styles.directoryTitle, { color: p.ink }]}
            >
              Workspace directory
            </Text>
            <Text style={[styles.directoryDetail, { color: p.muted }]}>
              {workspaces.length} workspaces, connected around your work.
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.search,
            {
              backgroundColor: p.surface,
              borderColor: searchFocused ? p.green : p.line,
              width: phone ? '100%' : '44%',
            },
          ]}
        >
          <Search size={17} color={searchFocused ? p.green : p.muted} />
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
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear workspace search"
              onPress={() => setWorkspaceQuery('')}
              style={styles.clear}
            >
              <X size={15} color={p.muted} />
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.filters}>
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
            <Pressable
              key={category}
              accessibilityRole="button"
              accessibilityLabel={`Filter ${category}`}
              accessibilityState={{ selected: active }}
              onPress={() => setSelectedCategory(category)}
              style={({ hovered, pressed }: any) => [
                styles.filter,
                {
                  backgroundColor: active
                    ? p.greenFill
                    : hovered
                    ? p.inset
                    : p.surface,
                  borderColor: active ? p.greenFill : p.line,
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
            </Pressable>
          );
        })}
      </View>

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
            shownWorkspaces.some((w) => w.category === category)
          )
          .map((category) => {
            const family = workspaceModules[CATEGORY_MODULES[category]];
            const accent = isDark ? family.dark : family.light;
            const categoryEntries = shownWorkspaces.filter(
              (w) => w.category === category
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
                    const module =
                      workspaceModules[getWorkspaceModule(w.route)];
                    const iconColor = isDark ? module.dark : module.light;
                    const iconBackground = isDark ? module.night : module.tint;
                    return (
                      <Pressable
                        key={w.title}
                        accessibilityRole="button"
                        accessibilityLabel={`Open ${w.title}`}
                        onPress={() => onNavigate(w.route)}
                        style={({ hovered, pressed }: any) => [
                          styles.card,
                          {
                            width: cardWidth,
                            backgroundColor: p.surface,
                            borderColor: hovered ? p.green : p.line,
                            opacity: pressed ? 0.8 : 1,
                          },
                          Platform.OS === 'web' &&
                            ({
                              boxShadow: hovered
                                ? '0 10px 28px -12px rgba(20,36,58,0.19)'
                                : '0 3px 12px rgba(20,36,58,0.035)',
                              transition:
                                'border-color 150ms ease, box-shadow 150ms ease',
                              cursor: 'pointer',
                            } as any),
                        ]}
                      >
                        <View style={styles.cardTop}>
                          <View
                            style={[
                              styles.icon,
                              {
                                backgroundColor: iconBackground,
                              },
                            ]}
                          >
                            <Icon
                              size={23}
                              color={iconColor}
                              strokeWidth={1.7}
                            />
                          </View>
                          <View
                            style={[
                              styles.cardArrow,
                              {
                                backgroundColor: p.inset,
                              },
                            ]}
                          >
                            <ArrowUpRight size={15} color={p.green} />
                          </View>
                        </View>
                        <Text style={[styles.cardTitle, { color: p.ink }]}>
                          {w.title}
                        </Text>
                        <Text style={[styles.cardDetail, { color: p.muted }]}>
                          {w.detail}
                        </Text>
                      </Pressable>
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reset workspace filters"
            onPress={() => {
              setSelectedCategory('All workspaces');
              setWorkspaceQuery('');
            }}
            style={[styles.reset, { backgroundColor: p.inset }]}
          >
            <Text style={{ color: p.green, fontSize: 13, fontWeight: '600' }}>
              Clear filters
            </Text>
          </Pressable>
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
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    minWidth: 0,
    maxWidth: 420,
  },
  searchInput: { flex: 1, minWidth: 0, fontSize: 14, paddingVertical: 13 },
  clear: {
    minHeight: 36,
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filter: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
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
    borderRadius: 17,
    padding: 21,
    minHeight: 178,
  },
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
    width: 27,
    height: 27,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  cardDetail: { fontSize: 13, lineHeight: 20, marginTop: 6 },
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
