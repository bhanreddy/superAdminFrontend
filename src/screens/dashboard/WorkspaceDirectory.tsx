import { MotionPressable } from '../../components/ui/MotionPressable';
import React, { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { getCardTone, type CardTone } from '../../constants/experienceColors';
import { borderRadius, theme } from '../../constants/theme';
import {
  Platform,
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
import { dashboardWorkspaces } from './dashboardWorkspaces';

const CARD_GAP = theme.spacing.sm;
const MIN_CARD_WIDTH = 240;

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
// One colour per category makes the directory learnable across cards and filters.
const CATEGORY_TONES = {
  Operations: 'blue',
  Finance: 'honey',
  Growth: 'crimson',
  'People & content': 'lavender',
  Administration: 'slate',
} as const satisfies Record<
  (typeof dashboardWorkspaces)[number]['category'],
  CardTone
>;

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
    ? Math.max(
        1,
        Math.min(
          5,
          Math.floor((contentWidth + CARD_GAP) / (MIN_CARD_WIDTH + CARD_GAP)),
        ),
      )
    : phone
    ? 1
    : wide
    ? 4
    : 2;
  const cardWidth = contentWidth
    ? (contentWidth - (columns - 1) * CARD_GAP) / columns
    : phone
    ? '100%'
    : wide
    ? '23%'
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
          const accent =
            category === 'All workspaces'
              ? p.action
              : getCardTone(
                  CATEGORY_TONES[category as keyof typeof CATEGORY_TONES],
                  isDark,
                ).accent;
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
            const tone = CATEGORY_TONES[category];
            const paint = getCardTone(tone, isDark);
            const categoryEntries = shownWorkspaces.filter(
              (w) => w.category === category,
            );
            return (
              <View key={category} style={styles.group}>
                <View style={styles.groupHeader}>
                  <View
                    style={[styles.groupDot, { backgroundColor: paint.accent }]}
                  />
                  <Text
                    accessibilityRole="header"
                    style={[styles.groupTitle, { color: p.ink }]}
                  >
                    {category}
                  </Text>
                  <Text
                    style={[
                      styles.groupCount,
                      { color: paint.accent, backgroundColor: paint.surface },
                    ]}
                  >
                    {categoryEntries.length}
                  </Text>
                  <View
                    style={[styles.groupRule, { backgroundColor: p.line }]}
                  />
                </View>
                <View style={styles.grid}>
                  {categoryEntries.map((w) => {
                    const Icon = ICONS[w.icon];
                    return (
                      <Card
                        key={w.title}
                        noPadding
                        tone={tone}
                        material="neutral"
                        accessibilityLabel={`Open ${w.title}`}
                        onPress={() => onNavigate(w.route)}
                        style={[styles.card, { width: cardWidth }]}
                      >
                        <View style={styles.cardTop}>
                          <View
                            style={[
                              styles.icon,
                              { backgroundColor: paint.accent },
                            ]}
                          >
                            <Icon
                              size={22}
                              color={paint.panel}
                              strokeWidth={1.8}
                            />
                          </View>
                          <Text
                            style={[styles.cardTitle, { color: p.ink }]}
                          >
                            {w.title}
                          </Text>
                          <View
                            style={[
                              styles.cardArrow,
                              { backgroundColor: paint.surface },
                            ]}
                          >
                            <ArrowUpRight
                              size={15}
                              color={paint.accent}
                              strokeWidth={2}
                            />
                          </View>
                        </View>
                        <Text
                          style={[styles.cardDetail, { color: p.muted }]}
                        >
                          {w.detail}
                        </Text>
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
  directory: { gap: theme.spacing.md, width: '100%' },
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
  group: { gap: CARD_GAP, marginTop: theme.spacing.xs },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  groupDot: { width: 7, height: 7, borderRadius: 3 },
  groupTitle: { fontSize: 14, fontWeight: '600' },
  groupCount: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: borderRadius.xs,
    overflow: 'hidden',
  },
  groupRule: { flex: 1, height: 1, marginLeft: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: CARD_GAP },
  card: {
    minWidth: 0,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: theme.spacing.md,
    minHeight: 112,
    overflow: 'hidden',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: CARD_GAP,
  },
  icon: {
    width: 40,
    height: 40,
    flexShrink: 0,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardArrow: {
    width: 26,
    height: 26,
    flexShrink: 0,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  cardDetail: { fontSize: 12, lineHeight: 18, marginTop: theme.spacing.xs * 2 },
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
