'use client';

import {
  Button,
  Card,
  Flex,
  Select,
  SegmentedControl,
  Table,
  Text,
  TextField,
} from '@radix-ui/themes';
import { ArrowDown, ArrowUp, ArrowUpDown, Search, X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';

import { EmptyState } from '@/components/feedback/EmptyState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { TableSkeleton } from '@/components/feedback/Skeletons';

import type { ColumnDef, DataTableProps, DataTableQuery, FilterDef, SortState } from './types';

function prefixParamKey(prefix: string, key: string): string {
  return prefix ? `${prefix}_${key}` : key;
}

function getFilterDefault(fd: FilterDef): string {
  return fd.defaultValue ?? fd.options[0]?.value ?? '';
}

interface SortIconProps {
  colKey: string;
  sortState: SortState | null;
}

function SortIcon({ colKey, sortState }: SortIconProps) {
  if (sortState?.field !== colKey) {
    return <ArrowUpDown size={13} style={{ color: 'var(--gray-8)', flexShrink: 0 }} />;
  }
  if (sortState.direction === 'asc') {
    return <ArrowUp size={13} style={{ color: 'var(--accent-9)', flexShrink: 0 }} />;
  }
  return <ArrowDown size={13} style={{ color: 'var(--accent-9)', flexShrink: 0 }} />;
}

// useSearchParams needs the exported Suspense wrapper below.
function DataTableInner<T>({
  columns,
  filters: filterDefs = [],
  searchPlaceholder = 'Search...',
  fetchData,
  defaultSort,
  perPage = 10,
  urlPrefix = '',
  onRowClick,
  getRowKey = (_, i) => String(i),
  debounceMs = 300,
}: DataTableProps<T>) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const p = useCallback((key: string) => prefixParamKey(urlPrefix, key), [urlPrefix]);

  const currentPage = Number(searchParams.get(p('page'))) || 1;
  const currentQ = searchParams.get(p('q')) ?? '';

  const sortableKeys = columns.filter((c) => c.sortable).map((c) => c.key);
  const rawSortField = searchParams.get(p('sort'));
  const rawSortDir = searchParams.get(p('dir'));
  const validSortField = rawSortField && sortableKeys.includes(rawSortField) ? rawSortField : null;
  const validSortDir: 'asc' | 'desc' =
    rawSortDir === 'asc' || rawSortDir === 'desc' ? rawSortDir : 'asc';

  const sortState: SortState | null = validSortField
    ? { field: validSortField, direction: validSortDir }
    : (defaultSort ?? null);

  const currentFilters: Record<string, string> = {};
  for (const fd of filterDefs) {
    const raw = searchParams.get(p(fd.key));
    const isValid = raw !== null && fd.options.some((opt) => opt.value === raw);
    currentFilters[fd.key] = isValid ? raw! : getFilterDefault(fd);
  }

  const [searchInput, setSearchInput] = useState(currentQ);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  const prevQ = useRef(currentQ);
  useEffect(() => {
    if (prevQ.current !== currentQ) {
      prevQ.current = currentQ;
      setSearchInput(currentQ);
    }
  }, [currentQ]);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null) {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      }
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [searchParams, router, pathname],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== currentQ) {
        updateParams({
          [p('q')]: searchInput.trim() || null,
          [p('page')]: '1',
        });
      }
    }, debounceMs);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const activeFilters: Record<string, string> = {};
  for (const fd of filterDefs) {
    const val = currentFilters[fd.key] ?? getFilterDefault(fd);
    if (val !== getFilterDefault(fd)) {
      activeFilters[fd.key] = val;
    }
  }

  const query: DataTableQuery = {
    page: currentPage,
    perPage,
    search: currentQ.trim() || undefined,
    sort: sortState,
    filters: activeFilters,
  };

  const queryKey = JSON.stringify(query);

  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');

    fetchData(query)
      .then((result) => {
        if (!controller.signal.aborted) {
          setData(result.data);
          setTotal(result.total);
          setStatus('success');
        }
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setErrorMsg(err instanceof Error ? err.message : 'An unknown error occurred');
          setStatus('error');
        }
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey, retryCount]);

  function handleSort(colKey: string) {
    const isActive = sortState?.field === colKey;
    const hasExplicitSort = validSortField !== null;

    if (!isActive) {
      updateParams({ [p('sort')]: colKey, [p('dir')]: 'asc', [p('page')]: '1' });
    } else if (!hasExplicitSort) {
      updateParams({ [p('sort')]: colKey, [p('dir')]: 'asc', [p('page')]: '1' });
    } else if (sortState?.direction === 'asc') {
      updateParams({ [p('sort')]: colKey, [p('dir')]: 'desc', [p('page')]: '1' });
    } else {
      updateParams({ [p('sort')]: null, [p('dir')]: null, [p('page')]: '1' });
    }
  }

  function handleFilterChange(key: string, value: string) {
    updateParams({ [p(key)]: value, [p('page')]: '1' });
  }

  function handleReset() {
    const resets: Record<string, null> = {
      [p('page')]: null,
      [p('q')]: null,
      [p('sort')]: null,
      [p('dir')]: null,
    };
    for (const fd of filterDefs) resets[p(fd.key)] = null;
    setSearchInput('');
    updateParams(resets);
  }

  const isDefaultSort =
    !validSortField ||
    (defaultSort && validSortField === defaultSort.field && validSortDir === defaultSort.direction);

  const hasActiveFilters =
    searchInput !== '' ||
    !isDefaultSort ||
    filterDefs.some((fd) => {
      const val = currentFilters[fd.key] ?? getFilterDefault(fd);
      return val !== getFilterDefault(fd);
    });

  const totalPages = Math.ceil(total / perPage);
  const showPagination = status === 'success' && total > perPage;

  return (
    <Flex direction="column" gap="3">
      <Card style={{ background: 'var(--surface-subtle)' }}>
        <Flex direction="row" gap="3" wrap="wrap" align="center" p="3">
          <TextField.Root
            size="2"
            placeholder={searchPlaceholder}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={{ flex: 1, minWidth: 160, maxWidth: 320 }}
          >
            <TextField.Slot>
              <Search size={14} />
            </TextField.Slot>
          </TextField.Root>

          {filterDefs.map((fd) => {
            const value = currentFilters[fd.key] ?? getFilterDefault(fd);
            return (
              <Flex key={fd.key} direction="row" gap="2" align="center">
                <Text size="2" color="gray">
                  {fd.label}
                </Text>
                {fd.type === 'select' ? (
                  <Select.Root
                    size="2"
                    value={value}
                    onValueChange={(val) => handleFilterChange(fd.key, val)}
                  >
                    <Select.Trigger />
                    <Select.Content>
                      <Select.Group>
                        {fd.options.map((opt) => (
                          <Select.Item key={opt.value} value={opt.value}>
                            {opt.label}
                          </Select.Item>
                        ))}
                      </Select.Group>
                    </Select.Content>
                  </Select.Root>
                ) : (
                  <SegmentedControl.Root
                    size="1"
                    value={value}
                    onValueChange={(val) => handleFilterChange(fd.key, val)}
                  >
                    {fd.options.map((opt) => (
                      <SegmentedControl.Item key={opt.value} value={opt.value}>
                        {opt.label}
                      </SegmentedControl.Item>
                    ))}
                  </SegmentedControl.Root>
                )}
              </Flex>
            );
          })}

          {hasActiveFilters && (
            <Button variant="ghost" color="gray" size="2" onClick={handleReset}>
              <X size={13} /> Reset
            </Button>
          )}
        </Flex>
      </Card>

      <Table.Root variant="surface" size="2">
        <Table.Header>
          <Table.Row>
            {columns.map((col) => (
              <Table.ColumnHeaderCell key={col.key}>
                {col.sortable ? (
                  <button
                    onClick={() => handleSort(col.key)}
                    aria-label={`Sort by ${col.label}`}
                    style={{
                      all: 'unset',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    {col.label}
                    <SortIcon colKey={col.key} sortState={sortState} />
                  </button>
                ) : (
                  col.label
                )}
              </Table.ColumnHeaderCell>
            ))}
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {status === 'loading' ? (
            <Table.Row>
              <Table.Cell colSpan={columns.length} p="0">
                <TableSkeleton columns={columns} rows={perPage} />
              </Table.Cell>
            </Table.Row>
          ) : status === 'error' ? (
            <Table.Row>
              <Table.Cell colSpan={columns.length}>
                <Flex direction="column" align="center" gap="3" py="6">
                  <ErrorState message={errorMsg} onRetry={() => setRetryCount((c) => c + 1)} />
                </Flex>
              </Table.Cell>
            </Table.Row>
          ) : data.length === 0 ? (
            <Table.Row>
              <Table.Cell colSpan={columns.length}>
                <EmptyState icon={Search} title="No results found" variant="plain" />
              </Table.Cell>
            </Table.Row>
          ) : (
            data.map((row, i) => (
              <Table.Row
                key={getRowKey(row, i)}
                align="center"
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                style={onRowClick ? { cursor: 'pointer' } : undefined}
              >
                {columns.map((col, ci) => {
                  const cell = col.render
                    ? col.render(row)
                    : String((row as Record<string, unknown>)[col.key] ?? '');
                  return ci === 0 ? (
                    <Table.RowHeaderCell key={col.key}>{cell}</Table.RowHeaderCell>
                  ) : (
                    <Table.Cell key={col.key}>{cell}</Table.Cell>
                  );
                })}
              </Table.Row>
            ))
          )}
        </Table.Body>
      </Table.Root>

      {showPagination && (
        <Flex direction="row" justify="between" align="center" mt="1">
          <Text size="2" color="gray">
            Page {currentPage} of {totalPages} · {total} result{total !== 1 ? 's' : ''}
          </Text>
          <Flex direction="row" gap="2">
            <Button
              variant="soft"
              size="2"
              disabled={currentPage <= 1}
              onClick={() => updateParams({ [p('page')]: String(currentPage - 1) })}
            >
              Previous
            </Button>
            <Button
              variant="soft"
              size="2"
              disabled={currentPage >= totalPages}
              onClick={() => updateParams({ [p('page')]: String(currentPage + 1) })}
            >
              Next
            </Button>
          </Flex>
        </Flex>
      )}
    </Flex>
  );
}

export function DataTable<T>(props: DataTableProps<T>) {
  const skeletonCols = props.columns as ColumnDef<unknown>[];
  return (
    <Suspense fallback={<TableSkeleton columns={skeletonCols} rows={props.perPage ?? 10} />}>
      <DataTableInner {...props} />
    </Suspense>
  );
}
