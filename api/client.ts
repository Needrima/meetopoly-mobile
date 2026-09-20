/**
 * Shared HTTP layer for Meetopoly API.
 * Used as the orval mutator — endpoint functions live in generated services.
 */

const DEFAULT_BASE_URL = 'http://localhost:8080';

/**
 * API base URL from Expo public env (`.env` → `EXPO_PUBLIC_API_URL`).
 * Restart Metro after changing `.env` (`npx expo start -c`).
 */
export function getApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv.replace(/\/$/, '') : DEFAULT_BASE_URL;
}

export class ApiError extends Error {
  readonly status: number;
  readonly body: string;

  constructor(status: number, body: string) {
    super(`API ${status}: ${body}`);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

export type ApiMutatorOptions = RequestInit & {
  /** Orval may pass query params separately; unused by this mutator. */
  params?: Record<string, unknown>;
};

/**
 * Orval mutator: `(url, options) => Promise<T>`.
 * Relative URLs are prefixed with `getApiBaseUrl()`.
 *
 * `/health` returns JSON on both 200 and 503 — both are accepted when a body is present.
 */
export async function apiMutator<T>(url: string, options?: ApiMutatorOptions): Promise<T> {
  const { params: _params, ...init } = options ?? {};
  const path = url.startsWith('http') ? url : `${getApiBaseUrl()}${url}`;

  const response = await fetch(path, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init.headers ?? {}),
    },
  });

  const text = await response.text();
  const acceptBody = response.ok || response.status === 503;

  if (!acceptBody) {
    throw new ApiError(response.status, text);
  }

  if (!text) {
    if (response.ok) {
      return undefined as T;
    }
    throw new ApiError(response.status, text);
  }

  return JSON.parse(text) as T;
}
