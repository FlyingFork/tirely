import { ERROR_CODES, type ApiError, type ApiResponse } from '@tirely/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type RequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type RequestOptions = {
  method?: RequestMethod;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

async function request<T>(
  path: string,
  options: RequestOptions,
  credentials: RequestCredentials,
): Promise<ApiResponse<T> | ApiError> {
  const { method = 'GET', body, headers = {}, signal } = options;

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      credentials,
      ...(body !== undefined && { body: JSON.stringify(body) }),
      ...(signal && { signal }),
    });

    return (await response.json()) as ApiResponse<T> | ApiError;
  } catch (error) {
    return {
      statusCode: 500,
      code: ERROR_CODES.INTERNAL_ERROR,
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
    } satisfies ApiError;
  }
}

export function publicRequest<T>(path: string, options: RequestOptions = {}) {
  return request<T>(path, options, 'omit');
}

export function authRequest<T>(path: string, options: RequestOptions = {}) {
  return request<T>(path, options, 'include');
}
