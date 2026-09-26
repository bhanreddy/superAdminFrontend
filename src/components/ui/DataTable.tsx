import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Platform, ScrollView, useWindowDimensions } from 'react-native';
import { Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X, ArrowUpDown } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, clayStyle } from '../../contexts/ThemeContext';
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
  /**
   * When set, the current `data` array is one server page. Client search, sort,
   * and slicing stay off so a large import is not loaded into this table.
   */
  serverPagination?: {
    page: number;
    pageCount: number;
    onPageChange: (page: number) => void;
  };
  cursorPagination?: {
    hasMore: boolean;
    onNext: () => void;
    total?: number | null;
    loading?: boolean;
  };
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
  serverPagination,
  cursorPagination,
}: DataTableProps<T>) {
  const { colors, isDark, clayShadows } = useTheme();
  const { width: screenW } = useWindowDimensions();
  const isPhone = screenW < 520;
  const isTinyPhone = screenW < 380;
  const useCards = narrowLayout === 'cards' && isPhone;

  const tableMinWidth = isPhone
    ? Math.max(screenW - 32, isTinyPhone ? 312 : 336)
    : screenW < 640
      ? Math.max(screenW - 40, 340)
      : 520;

  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [page, setPage] = useState(0);
  const [searchFocused, setSearchFocused] = useState(false);

  const filtered = useMemo(() => {
    if (serverPagination) return data;
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    const keys = searchKeys || columns.map((c) => c.key);
    return data.filter((item) =>
      keys.some((k) => {
        const val = item[k];
        return val !== undefined && val !== null && String(val).toLowerCase().includes(q);
      }),
    );
  }, [data, search, searchKeys, columns, serverPagination]);

  const sorted = useMemo(() => {
    if (serverPagination || !sortKey || !sortDir) return filtered;
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
  }, [filtered, sortKey, sortDir, serverPagination]);

  const currentPage = serverPagination ? serverPagination.page : page;
  const totalPages = serverPagination ? Math.max(1, serverPagination.pageCount) : Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageData = serverPagination ? data : sorted.slice(page * pageSize, (page + 1) * pageSize);
  const goToPage = (next: number) => {
    if (serverPagination) serverPagination.onPageChange(next);
    else setPage(next);
  };

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
        backgroundColor: colors.card,
        borderColor: colors.clayBorderColor,
      }, clayStyle(clayShadows.clayElevated)]}>
        <SkeletonTable rows={6} columns={columns.length} />
      </View>
    );
  }

  const isFiltering = search.length > 0 && filtered.length !== data.length;

  return (
    <View style={[s.wrap, {
      backgroundColor: colors.card,
      borderColor: colors.clayBorderColor,
    }, clayStyle(clayShadows.clayElevated)]}>

      {/* - Toolbar - */}
      {(searchable || headerRight) && (
        <View style={[s.toolbar, isPhone && s.toolbarPhone]}>
          {searchable && (
            <View
              style={[
                s.searchBox,
                isPhone && s.searchBoxPhone,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
                },
                Platform.OS === 'web' ? {
                  boxShadow: searchFocused
                    ? isDark
                      ? `inset 1.5px 1.5px 4px rgba(0,0,0,0.4), inset -1.5px -1.5px 4px rgba(255,255,255,0.03), 0 0 0 4px ${colors.primary}30`
                      : `inset 1.5px 1.5px 4px rgba(0,0,0,0.08), inset -1.5px -1.5px 4px rgba(255,255,255,0.7), 0 0 0 4px ${colors.primary}25`
                    : isDark
                      ? 'inset 1.5px 1.5px 4px rgba(0,0,0,0.3), inset -1.5px -1.5px 4px rgba(255,255,255,0.02)'
                      : 'inset 1.5px 1.5px 4px rgba(0,0,0,0.05), inset -1.5px -1.5px 4px rgba(255,255,255,0.6)',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                } as any : {},
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
                    { backgroundColor: hovered ? `${colors.primary}20` : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' },
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

      {/* - Filter badge - */}
      {isFiltering && (
        <View style={[s.filterBar, {
          backgroundColor: `${colors.primary}08`,
        }]}>
          <View style={[s.filterDot, { backgroundColor: colors.primary }]} />
          <Text style={[s.filterText, { color: colors.primary }]}>
            {filtered.length} {filtered.length === 1 ? 'result' : 'results'} found
          </Text>
          <Pressable
            onPress={() => { setSearch(''); setPage(0); }}
            style={({ hovered }: any) => [
              s.filterClearBtn,
              { backgroundColor: hovered ? `${colors.primary}14` : 'transparent' },
            ]}
          >
            <Text style={[s.filterClear, { color: colors.textTertiary }]}>Clear</Text>
          </Pressable>
        </View>
      )}

      {/* - Table (desktop) or stacked cards (narrow + narrowLayout=cards) - */}
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
                      backgroundColor: isDark ? colors.elevated : colors.surface,
                      borderColor: colors.clayBorderColor,
                      ...(pressed ? { opacity: 0.92 } : {}),
                      ...(hovered && onRowPress
                        ? { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(99,102,241,0.03)' }
                        : {}),
                    },
                    clayStyle(clayShadows.subtle),
                    Platform.OS === 'web' ? {
                      cursor: onRowPress ? 'pointer' : 'default',
                      transition: 'all 0.2s ease',
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
                            borderBottomColor: colors.divider,
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
                                <View style={[s.sortBadge, { backgroundColor: `${colors.primary}14` }]}>
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
                              {item[col.key] !== undefined && item[col.key] !== null ? String(item[col.key]) : '-'}
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
        <View style={s.scrollH}>
          <ScrollView
            horizontal={Platform.OS === 'web' ? true : isPhone}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ minWidth: '100%' }}
          >
            <View style={{ minWidth: tableMinWidth, width: '100%' } as any}>
              {/* Header */}
              <View style={[s.headerRow, isPhone && s.headerRowPhone, {
                backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
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
                        <View style={[s.sortBadge, { backgroundColor: `${colors.primary}14` }]}>
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
                        borderBottomColor: colors.divider,
                        backgroundColor: hovered
                          ? isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
                          : 'transparent',
                      },
                      pressed && { opacity: 0.75 },
                      Platform.OS === 'web' ? {
                        cursor: onRowPress ? 'pointer' : 'default',
                        transition: 'all 0.2s ease',
                      } as any : {},
                    ]}
                  >
                    {columns.map((col) => (
                      <View key={col.key} style={[s.cell, isPhone && s.cellPhone, col.flex ? { flex: col.flex, minWidth: 0 } : col.width ? { width: col.width as any, minWidth: col.width as any, flexShrink: 0 } : { flex: 1, minWidth: 0 }]}>
                        {col.render ? (
                          col.render(item, currentPage * pageSize + ri)
                        ) : (
                          <Text style={[s.cellText, { color: colors.textPrimary }]} numberOfLines={1}>
                            {item[col.key] !== undefined && item[col.key] !== null ? String(item[col.key]) : '-'}
                          </Text>
                        )}
                      </View>
                    ))}
                  </Pressable>
                ))
              )}
            </View>
          </ScrollView>
        </View>
      )}

      {cursorPagination ? (
        <View style={[s.pagination, isPhone && s.paginationPhone]}>
          <Text style={[s.pageInfo, { color: colors.textTertiary }]}>
            {data.length} shown{cursorPagination.total != null ? ` of ${cursorPagination.total}` : ''}
          </Text>
          {cursorPagination.hasMore ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Load more" onPress={cursorPagination.onNext} disabled={cursorPagination.loading} style={s.pageBtn}>
              <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{cursorPagination.loading ? 'Loading' : 'Load more'}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {!cursorPagination && (serverPagination ? serverPagination.pageCount > 1 : sorted.length > pageSize) && (
        <View style={[s.pagination, isPhone && s.paginationPhone]}>
          <Text style={[s.pageInfo, { color: colors.textTertiary }]}>
            Showing{' '}
            <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>
              {currentPage * pageSize + 1}–{Math.min((currentPage + 1) * pageSize, serverPagination ? data.length : sorted.length)}
            </Text>{' '}
            of {serverPagination ? 'this page' : sorted.length}
          </Text>
          <View style={s.pageActions}>
            {[
              { icon: ChevronsLeft, onPress: () => goToPage(0), disabled: currentPage === 0 },
              { icon: ChevronLeft, onPress: () => goToPage(Math.max(0, currentPage - 1)), disabled: currentPage === 0 },
            ].map(({ icon: Icon, onPress, disabled }, i) => (
              <Pressable
                key={`l${i}`}
                onPress={onPress}
                disabled={disabled}
                style={({ hovered }: any) => [
                  s.pageBtn,
                  {
                    opacity: disabled ? 0.3 : 1,
                    backgroundColor: hovered && !disabled
                      ? isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'
                      : colors.clayInnerLight,
                  },
                  Platform.OS === 'web' ? {
                    boxShadow: disabled
                      ? 'none'
                      : isDark
                        ? hovered
                          ? 'inset 2px 2px 4px rgba(255,255,255,0.06), inset -2px -2px 4px rgba(0,0,0,0.3), 4px 8px 12px rgba(0,0,0,0.25)'
                          : 'inset 2px 2px 4px rgba(255,255,255,0.06), inset -2px -2px 4px rgba(0,0,0,0.3), 2px 4px 8px rgba(0,0,0,0.18)'
                        : hovered
                          ? 'inset 2px 2px 4px rgba(255,255,255,0.95), inset -2px -2px 4px rgba(0,0,0,0.04), 4px 8px 12px rgba(0,0,0,0.05), -2px -2px 6px rgba(255,255,255,0.8)'
                          : 'inset 2px 2px 4px rgba(255,255,255,0.95), inset -2px -2px 4px rgba(0,0,0,0.04), 2px 4px 8px rgba(0,0,0,0.03), -2px -2px 6px rgba(255,255,255,0.8)',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                  } as any : {},
                ]}
              >
                <Icon size={14} color={colors.textSecondary} />
              </Pressable>
            ))}
            <View style={[s.pageIndicator, {
              backgroundColor: `${colors.primary}10`,
              borderColor: `${colors.primary}20`,
            }]}>
              <Text style={[s.pageNum, { color: colors.primary }]}>{currentPage + 1} / {totalPages}</Text>
            </View>
            {[
              { icon: ChevronRight, onPress: () => goToPage(Math.min(totalPages - 1, currentPage + 1)), disabled: currentPage >= totalPages - 1 },
              { icon: ChevronsRight, onPress: () => goToPage(totalPages - 1), disabled: currentPage >= totalPages - 1 },
            ].map(({ icon: Icon, onPress, disabled }, i) => (
              <Pressable
                key={`r${i}`}
                onPress={onPress}
                disabled={disabled}
                style={({ hovered }: any) => [
                  s.pageBtn,
                  {
                    opacity: disabled ? 0.3 : 1,
                    backgroundColor: hovered && !disabled
                      ? isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'
                      : colors.clayInnerLight,
                  },
                  Platform.OS === 'web' ? {
                    boxShadow: disabled
                      ? 'none'
                      : isDark
                        ? hovered
                          ? 'inset 2px 2px 4px rgba(255,255,255,0.06), inset -2px -2px 4px rgba(0,0,0,0.3), 4px 8px 12px rgba(0,0,0,0.25)'
                          : 'inset 2px 2px 4px rgba(255,255,255,0.06), inset -2px -2px 4px rgba(0,0,0,0.3), 2px 4px 8px rgba(0,0,0,0.18)'
                        : hovered
                          ? 'inset 2px 2px 4px rgba(255,255,255,0.95), inset -2px -2px 4px rgba(0,0,0,0.04), 4px 8px 12px rgba(0,0,0,0.05), -2px -2px 6px rgba(255,255,255,0.8)'
                          : 'inset 2px 2px 4px rgba(255,255,255,0.95), inset -2px -2px 4px rgba(0,0,0,0.04), 2px 4px 8px rgba(0,0,0,0.03), -2px -2px 6px rgba(255,255,255,0.8)',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
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
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingVertical: 18,
    gap: 14,
  },
  toolbarPhone: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 16,
    flex: 1,
    maxWidth: 400,
    gap: 10,
  },
  searchBoxPhone: {
    maxWidth: '100%',
    borderRadius: 16,
    paddingHorizontal: 14,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 11,
    fontWeight: '400',
    letterSpacing: 0.1,
  },
  searchInputPhone: {
    fontSize: 13,
    paddingVertical: 10,
  },
  clearBtn: {
    width: 24,
    height: 24,
    borderRadius: 8,
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
    paddingHorizontal: 22,
    paddingVertical: 10,
  },
  filterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  filterClearBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  filterClear: {
    fontSize: 12,
    fontWeight: '500',
  },
  scrollH: {
    flexGrow: 0,
  },
  cardsOuter: {
    paddingTop: 6,
    paddingBottom: 10,
    gap: 12,
  },
  dataCard: {
    marginHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardFieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 11,
    paddingHorizontal: 16,
    gap: 12,
  },
  cardLabelCol: {
    width: 96,
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
    letterSpacing: 0.6,
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
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  headerRowPhone: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dataRowPhone: {
    paddingHorizontal: 16,
    paddingVertical: 13,
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
    width: 20,
    height: 20,
    borderRadius: 7,
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
    gap: 12,
    paddingHorizontal: 22,
    paddingVertical: 16,
  },
  paginationPhone: {
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pageInfo: {
    fontSize: 13,
    fontWeight: '400',
  },
  pageActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  pageBtn: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageIndicator: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 4,
  },
  pageNum: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});