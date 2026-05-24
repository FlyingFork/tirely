import type { DataTableQuery, DataTableResult } from '@/components/data-table';
import type { ApiError, ApiResponse } from '@tirely/types';

type QueryValue = string | number | null | undefined;


export function tableParams(base: Record<string, QueryValue>): URLSearchParams {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(base)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }

  return params;
}



export function addActiveFilter(
  params: URLSearchParams,
  filters: DataTableQuery['filters'],
  key: string,
) {
  const value = filters[key];
  if (value && value !== 'ALL') {
    params.set(key, value);
  }
}


export function addTrimmedSearch(params: URLSearchParams, search: string | undefined) {
  const value = search?.trim();
  if (value) {
    params.set('search', value);
  }
}


export function unwrapTableResponse<T>(
  response: ApiResponse<T[]> | ApiError,
): DataTableResult<T> {
  if ('code' in response) {
    throw new Error(response.message);
  }

  return {
    data: response.data,
    total: response.meta?.total ?? 0,
  };
}
