const fs = require('fs');

const content = `import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Platform, ScrollView, useWindowDimensions } from 'react-native';
import { Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X, ArrowUpDown } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { EmptyState } from './EmptyState';
import { SkeletonTable } from './Skeleton';

export interface Column<T> {
  key: string;
  title: string;
  width?: number | string;
  flex?: number;
  sortable?: boolean;
  render?: (item: T, index: number) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  loading?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchKeys?: string[];
  pageSize?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: React.ReactNode;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  headerRight?: React.ReactNode;
  onRowPress?: (item: T) => void;
  /**
   * On narrow viewports (<520px), render each row as a vertical card instead of a
   * horizontally scrollable table so values (phone, address) are not truncated.
   */
  narrowLayout?: 'table' | 'cards';
}

type SortDir = 'asc' | 'desc' | null;

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  keyExtractor,
  loading,
  searchable = true,
  searchPlaceholder = 'Search...',
  searchKeys,
  pageSize = 15,
  emptyTitle = 'No data found',
  emptyDescription,
  emptyIcon,
  emptyActionLabel,
  onEmptyAction,
  headerRight,
  onRowPress,
  narrowLayout = 'table',
}: DataTableProps<T>) {
  const { colors, isDark } = useTheme();
  const { width: screenW } = useWindowDimensions();
  const isPhone = screenW < 520;
  const isTinyPhone = screenW < 380;
  const useCards = narrowLayout === 'cards' && isPhone;
  /** Phone width minus horizontal inset from scroll content (16px each side). */
  const tableMinWidth = isPhone
    ? Math.max(screenW - 32, isTinyPhone ? 312 : 336)
    : screenW < 640
      ? Math.max(screenW - 40, 340)
      : Math.max(screenW - 32, 520);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [page, setPage] = useState(0);
  const [searchFocused, setSearchFocused] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    const keys = searchKeys || columns.map((c) => c.key);
    return data.filter((item) =>
      keys.some((k) => {
        const val = item[k];
        return val !== undefined && val !== null && String(val).toLowerCase().includes(q);
      }),
    );
  }, [data, search, searchKeys, columns]);

  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      const sa = String(av).toLowerCase();
      const sb = String(bv).toLowerCase();
      return sortDir === 'asc' ? sa.localeCompare(sb) : sb.localeCompare(sa);
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageData = sorted.slice(page * pageSize, (page + 1) * pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else if (sortDir === 'desc') { setSortKey(null); setSortDir(null); }
      else setSortDir('asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(0);
  };

  if (loading) {
    return (
      <View style={[s.wrap, {
        backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#fff',
        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
      }]}>
        <SkeletonTable rows={6} columns={columns.length} />
      </View>
    );
  }

  const isFiltering = search.length > 0 && filtered.length !== data.length;

  return (
    <View style={[s.wrap, {
      backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : '#fff',
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
      ...(Platform.OS === 'web' ? {
        boxShadow: isDark
          ? '0 1px 3px rgba(0,0,0,0.3), 0 4px 16px rgba(0,0,0,0.2)'
          : '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)',
      } : {}),
    } as any, Platform.OS !== 'web' && {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.35 : 0.08,
      shadowRadius: 10,
      elevation: 4,
    }]}
    >

      {/* ── Toolbar ── */}
      {(searchable || headerRight) && (
        <View style={[s.toolbar, isPhone && s.toolbarPhone, { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
          {searchable && (
            <View
              style={[
                s.searchBox,
                isPhone && s.searchBoxPhone,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)',
                  borderColor: searchFocused
                    ? \`\${colors.primary}70\`
                    : isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
                },
                searchFocused && {
                  shadowColor: colors.primary,
                  shadowOpacity: 0.15,
                  shadowRadius: 16,
                  shadowOffset: { width: 0, height: 0 },
                  ...(Platform.OS === 'web' ? {
                    boxShadow: \`0 0 0 3px \${colors.primary}18\`,
                  } : {}),
                },
              ] as any}
            >
              <Search size={15} color={searchFocused ? colors.primary : colors.textTertiary} strokeWidth={2} />
              <TextInput
                style={[
                  s.searchInput,
                  isPhone && s.searchInputPhone,
                  { color: colors.textPrimary },
                  Platform.OS === 'web' ? { outlineWidth: 0 } as any : {},
                ]}
                placeholder={searchPlaceholder}
                placeholderTextColor={colors.textTertiary}
                value={search}
                onChangeText={(v) => { setSearch(v); setPage(0); }}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
              />
              {search.length > 0 && (
                <Pressable
                  onPress={() => { setSearch(''); setPage(0); }}
                  style={({ hovered }: any) => [
                    s.clearBtn,
                    { backgroundColor: hovered ? \`\${colors.primary}20\` : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' },
                  ]}
                  hitSlop={6}
                >
                  <X size={11} color={colors.textTertiary} strokeWidth={2.5} />
                </Pressable>
              )}
            </View>
          )}
          {headerRight && <View style={s.toolbarRight}>{headerRight}</View>}
        </View>
      )}

      {/* ── Filter badge ── */}
      {isFiltering && (
        <View style={[s.filterBar, {
          backgroundColor: \`\${colors.primary}08\`,
          borderBottomColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
        }]}>
          <View style={[s.filterDot, { backgroundColor: colors.primary }]} />
          <Text style={[s.filterText, { color: colors.primary }]}>
            {filtered.length} {filtered.length === 1 ? 'result' : 'results'} found
          </Text>
          <Pressable
            onPress={() => { setSearch(''); setPage(0); }}
            style={({ hovered }: any) => [
              s.filterClearBtn,
              { backgroundColor: hovered ? \`\${colors.primary}14\` : 'transparent' },
            ]}
          >
            <Text style={[s.filterClear, { color: colors.textTertiary }]}>Clear</Text>
          </Pressable>
        </View>
      )}

      {/* ── Table (desktop) or stacked cards (narrow + narrowLayout=cards) ── */}
      {useCards ? (
        <View style={s.cardsOuter}>
          {pageData.length === 0 ? (
            <EmptyState
              title={emptyTitle}
              description={emptyDescription || (search ? 'Try a different search term' : undefined)}
              icon={emptyIcon}
              actionLabel={emptyActionLabel}
              onAction={onEmptyAction}
            />
          ) : (
            pageData.map((item, ri) => {
              const rowIndex = page * pageSize + ri;
              return (
                <Pressable
                  key={keyExtractor(item)}
                  onPress={onRowPress ? () => onRowPress(item) : undefined}
                  style={({ pressed, hovered }: any) => [
                    s.dataCard,
                    {
                      backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : colors.surface,
                      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
                      ...(pressed ? { opacity: 0.92 } : {}),
                      ...(hovered && onRowPress
                        ? { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(99,102,241,0.04)' }
                        : {}),
                    },
                    Platform.OS === 'web' ? {
                      cursor: onRowPress ? 'pointer' : 'default',
                      transition: 'background-color 0.18s ease',
                    } as any : {},
                  ]}
                >
                  {columns.map((col, ci) => {
                    const isActive = sortKey === col.key;
                    const isLast = ci === columns.length - 1;
                    return (
                      <View
                        key={col.key}
                        style={[
                          s.cardFieldRow,
                          !isLast && {
                            borderBottomWidth: StyleSheet.hairlineWidth,
                            borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                          },
                        ]}
                      >
                        <Pressable
                          onPress={col.sortable ? () => handleSort(col.key) : undefined}
                          disabled={!col.sortable}
                          style={({ hovered }: any) => [
                            s.cardLabelCol,
                            col.sortable && hovered && { opacity: 0.8 },
                            Platform.OS === 'web' && col.sortable ? { cursor: 'pointer' } as any : {},
                          ]}
                        >
                          <Text
                            style={[s.cardFieldLabel, { color: isActive ? colors.primary : colors.textTertiary }]}
                            numberOfLines={2}
                          >
                            {col.title}
                          </Text>
                          {col.sortable && (
                            <View style={s.cardSortIcons}>
                              {isActive ? (
                                <View style={[s.sortBadge, { backgroundColor: \`\${colors.primary}14\` }]}>
                                  {sortDir === 'desc' ? (
                                    <ChevronDown size={10} color={colors.primary} strokeWidth={2.5} />
                                  ) : (
                                    <ChevronUp size={10} color={colors.primary} strokeWidth={2.5} />
                                  )}
                                </View>
                              ) : (
                                <ArrowUpDown size={10} color={colors.textTertiary} strokeWidth={2} style={{ opacity: 0.45 }} />
                              )}
                            </View>
                          )}
                        </Pressable>
                        <View style={s.cardValueCol}>
                          {col.render ? (
                            col.render(item, rowIndex)
                          ) : (
                            <Text style={[s.cellText, { color: colors.textPrimary }]}>
                              {item[col.key] !== undefined && item[col.key] !== null ? String(item[col.key]) : '—'}
                            </Text>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </Pressable>
              );
            })
          )}
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.scrollH}>
          <View style={{ minWidth: tableMinWidth, width: '100%' } as any}>
            {/* Header */}
            <View style={[s.headerRow, isPhone && s.headerRowPhone, {
              backgroundColor: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.018)',
              borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
            }]}>
              {columns.map((col) => {
                const isActive = sortKey === col.key;
                return (
                  <Pressable
                    key={col.key}
                    style={({ hovered }: any) => [
                      s.cell,
                      isPhone && s.cellPhone,
                      col.flex ? { flex: col.flex, minWidth: 0 } : col.width ? { width: col.width as any, minWidth: col.width as any, flexShrink: 0 } : { flex: 1, minWidth: 0 },
                      col.sortable && hovered && { opacity: 0.75 },
                      Platform.OS === 'web' && col.sortable ? { cursor: 'pointer', transition: 'opacity 0.15s' } as any : {},
                    ]}
                    onPress={col.sortable ? () => handleSort(col.key) : undefined}
                    disabled={!col.sortable}
                  >
                    <Text style={[s.headerLabel, isPhone && s.headerLabelPhone, { color: isActive ? colors.primary : colors.textTertiary }]} numberOfLines={1}>
                      {col.title}
                    </Text>
                    {col.sortable && isActive && (
                      <View style={[s.sortBadge, { backgroundColor: \`\${colors.primary}14\` }]}>
                        {sortDir === 'desc' ? (
                          <ChevronDown size={10} color={colors.primary} strokeWidth={2.5} />
                        ) : (
                          <ChevronUp size={10} color={colors.primary} strokeWidth={2.5} />
                        )}
                      </View>
                    )}
                    {col.sortable && !isActive && (
                      <ArrowUpDown size={10} color={colors.textTertiary} strokeWidth={2} style={{ opacity: 0.4 }} />
                    )}
                  </Pressable>
                );
              })}
            </View>

            {/* Rows */}
            {pageData.length === 0 ? (
              <EmptyState
                title={emptyTitle}
                description={emptyDescription || (search ? 'Try a different search term' : undefined)}
                icon={emptyIcon}
                actionLabel={emptyActionLabel}
                onAction={onEmptyAction}
              />
            ) : (
              pageData.map((item, ri) => (
                <Pressable
                  key={keyExtractor(item)}
                  onPress={onRowPress ? () => onRowPress(item) : undefined}
                  style={({ pressed, hovered }: any) => [
                    s.dataRow,
                    isPhone && s.dataRowPhone,
                    {
                      borderBottomColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                      backgroundColor: hovered
                        ? isDark ? 'rgba(255,255,255,0.035)' : 'rgba(99,102,241,0.025)'
                        : 'transparent',
                    },
                    pressed && { opacity: 0.75 },
                    Platform.OS === 'web' ? {
                      cursor: onRowPress ? 'pointer' : 'default',
                      transition: 'background-color 0.18s ease',
                    } as any : {},
                  ]}
                >
                  {columns.map((col) => (
                    <View key={col.key} style={[s.cell, isPhone && s.cellPhone, col.flex ? { flex: col.flex, minWidth: 0 } : col.width ? { width: col.width as any, minWidth: col.width as any, flexShrink: 0 } : { flex: 1, minWidth: 0 }]}>
                      {col.render ? (
                        col.render(item, page * pageSize + ri)
                      ) : (
                        <Text style={[s.cellText, { color: colors.textPrimary }]} numberOfLines={1}>
                          {item[col.key] !== undefined && item[col.key] !== null ? String(item[col.key]) : '—'}
                        </Text>
                      )}
                    </View>
                  ))}
                </Pressable>
              ))
            )}
          </View>
        </ScrollView>
      )}

      {/* ── Pagination ── */}
      {sorted.length > pageSize && (
        <View style={[s.pagination, isPhone && s.paginationPhone, { borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }]}>
          <Text style={[s.pageInfo, { color: colors.textTertiary }]}>
            Showing{' '}
            <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>
              {page * pageSize + 1}–{Math.min((page + 1) * pageSize, sorted.length)}
            </Text>{' '}
            of {sorted.length}
          </Text>
          <View style={s.pageActions}>
            {[
              { icon: ChevronsLeft, onPress: () => setPage(0), disabled: page === 0 },
              { icon: ChevronLeft, onPress: () => setPage((p) => Math.max(0, p - 1)), disabled: page === 0 },
            ].map(({ icon: Icon, onPress, disabled }, i) => (
              <Pressable
                key={\`l\${i}\`}
                onPress={onPress}
                disabled={disabled}
                style={({ hovered }: any) => [
                  s.pageBtn,
                  {
                    opacity: disabled ? 0.3 : 1,
                    backgroundColor: hovered && !disabled
                      ? isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'
                      : 'transparent',
                    borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                  },
                  Platform.OS === 'web' ? {
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease',
                  } as any : {},
                ]}
              >
                <Icon size={14} color={colors.textSecondary} />
              </Pressable>
            ))}
            <LinearGradient
              colors={[\`\${colors.primary}1C\`, \`\${colors.primary}0C\`]}
              style={[s.pageIndicator, { borderColor: \`\${colors.primary}28\` }]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              <Text style={[s.pageNum, { color: colors.primary }]}>{page + 1} / {totalPages}</Text>
            </LinearGradient>
            {[
              { icon: ChevronRight, onPress: () => setPage((p) => Math.min(totalPages - 1, p + 1)), disabled: page >= totalPages - 1 },
              { icon: ChevronsRight, onPress: () => setPage(totalPages - 1), disabled: page >= totalPages - 1 },
            ].map(({ icon: Icon, onPress, disabled }, i) => (
              <Pressable
                key={\`r\${i}\`}
                onPress={onPress}
                disabled={disabled}
                style={({ hovered }: any) => [
                  s.pageBtn,
                  {
                    opacity: disabled ? 0.3 : 1,
                    backgroundColor: hovered && !disabled
                      ? isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'
                      : 'transparent',
                    borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                  },
                  Platform.OS === 'web' ? {
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease',
                  } as any : {},
                ]}
              >
                <Icon size={14} color={colors.textSecondary} />
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  toolbarPhone: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    flex: 1,
    maxWidth: 400,
    gap: 10,
    ...(Platform.OS === 'web' ? { transition: 'all 0.2s ease' } as any : {}),
  },
  searchBoxPhone: {
    maxWidth: '100%',
    borderRadius: 14,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 10,
    fontWeight: '400',
    letterSpacing: 0.1,
  },
  searchInputPhone: {
    fontSize: 13,
    paddingVertical: 9,
  },
  clearBtn: {
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  filterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  filterClearBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  filterClear: {
    fontSize: 12,
    fontWeight: '500',
  },
  scrollH: {
    flexGrow: 0,
  },
  cardsOuter: {
    paddingTop: 4,
    paddingBottom: 8,
    gap: 10,
  },
  dataCard: {
    marginHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardFieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 10,
  },
  cardLabelCol: {
    width: 92,
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    paddingTop: 2,
  },
  cardFieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.55,
    flex: 1,
  },
  cardSortIcons: {
    marginTop: -1,
  },
  cardValueCol: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderBottomWidth: 1,
  },
  headerRowPhone: {
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dataRowPhone: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  cell: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 14,
    gap: 5,
  },
  cellPhone: {
    paddingRight: 8,
    gap: 4,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  headerLabelPhone: {
    fontSize: 10,
    letterSpacing: 0.6,
  },
  sortBadge: {
    width: 18,
    height: 18,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 14,
    fontWeight: '400',
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  paginationPhone: {
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pageInfo: {
    fontSize: 13,
    fontWeight: '400',
  },
  pageActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pageBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageIndicator: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    marginHorizontal: 4,
  },
  pageNum: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
`;

fs.writeFileSync('src/components/ui/DataTable.tsx', content);
console.log('Done full reconstruct');
