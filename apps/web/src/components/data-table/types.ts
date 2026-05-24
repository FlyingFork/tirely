import type { ReactNode } from 'react';

export type SortDirection = 'asc' | 'desc';

export interface SortState {
  field: string;
  direction: SortDirection;
}

export interface ColumnDef<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => ReactNode;
}

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterDef {
  key: string;
  label: string;
  type: 'select' | 'segmented';
  options: FilterOption[];
  /** The value meaning "no filter applied". Defaults to first option's value. */
  defaultValue?: string;
}

export interface DataTableQuery {
  page: number;
  perPage: number;
  search?: string;
  sort: SortState | null;
  /** Only non-default filter values are included. */
  filters: Record<string, string>;
}

export interface DataTableResult<T> {
  data: T[];
  total: number;
}

export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  filters?: FilterDef[];
  searchPlaceholder?: string;
  /**
   * Must be stable across renders (defined at module level or wrapped in useCallback).
   * The component depends on this reference — an unstable reference causes infinite refetches.
   */
  fetchData: (query: DataTableQuery) => Promise<DataTableResult<T>>;
  defaultSort?: SortState;
  /** @default 10 */
  perPage?: number;
  /**
   * Prefix for URL params to avoid collisions when multiple tables share a page.
   * e.g. urlPrefix='usr' → ?usr_page=2&usr_q=foo
   */
  urlPrefix?: string;
  onRowClick?: (row: T) => void;
  /** @default (_, index) => String(index) */
  getRowKey?: (row: T, index: number) => string;
  /** Debounce delay for search input in ms. @default 300 */
  debounceMs?: number;
}
