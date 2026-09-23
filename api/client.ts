/**
 * Shared HTTP layer for Meetopoly API.
 * Used as the orval mutator — endpoint functions live in generated services.
 */

import { Platform } from 'react-native';

const DEFAULT_BASE_URL = 'http://127.0.0.1:8080';

/**
 * Android emulator loopback is not the host machine — map localhost → 10.0.2.2.
 * Leave LAN IPs (e.g. 192.168.x.x) unchanged for physical devices.
 */
function resolveHostForPlatform(url: string): string {
  const trimmed = url.replace(/\/$/, '');
  if (Platform.OS !== 'android') {
    return trimmed;
  }
  return trimmed
    .replace('://127.0.0.1', '://10.0.2.2')
    .replace('://localhost', '://10.0.2.2');
}

/**
 * API base URL from Expo public env (`.env` → `EXPO_PUBLIC_API_URL`).
 * Restart Metro after changing `.env` (`npx expo start -c`).
 */
export function getApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  const raw =
    fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_BASE_URL;
  return resolveHostForPlatform(raw);
}

/** WebSocket origin matching `getApiBaseUrl()` (`http`→`ws`, `https`→`wss`). */
export function getWsBaseUrl(): string {
  const http = getApiBaseUrl();
  if (http.startsWith("https://")) {
    return `wss://${http.slice("https://".length)}`;
  }
  if (http.startsWith("http://")) {
    return `ws://${http.slice("http://".length)}`;
  }
  return http;
}

export class ApiError extends Error {
  readonly status: number;
  readonly body: string;
  readonly code: string | null;

  constructor(status: number, body: string, code: string | null = null) {
    super(messageFromBody(body, status));
    this.name = "ApiError";
    this.status = status;
    this.body = body;
    this.code = code;
  }
}

function messageFromBody(body: string, status: number): string {
  if (!body) {
    return `API ${status}`;
  }
  try {
    const parsed = JSON.parse(body) as { message?: string; error?: string };
    if (parsed.message) {
      return parsed.message;
    }
    if (parsed.error) {
      return parsed.error;
    }
  } catch {
    // not JSON
  }
  return `API ${status}: ${body}`;
}

function errorCodeFromBody(body: string): string | null {
  try {
    const parsed = JSON.parse(body) as { error?: string };
    return parsed.error ?? null;
  } catch {
    return null;
  }
}

export type ApiMutatorOptions = RequestInit & {
  /** Orval may pass query params separately; unused by this mutator. */
  params?: Record<string, unknown>;
};

type TokenGetter = () => string | null;

let accessTokenGetter: TokenGetter | null = null;

/** Register the session token source used for authenticated requests. */
export function setAccessTokenGetter(getter: TokenGetter | null): void {
  accessTokenGetter = getter;
}

function hasAuthorizationHeader(headers: HeadersInit | undefined): boolean {
  if (!headers) {
    return false;
  }
  if (headers instanceof Headers) {
    return headers.has("Authorization");
  }
  if (Array.isArray(headers)) {
    return headers.some(([key]) => key.toLowerCase() === "authorization");
  }
  return Object.keys(headers).some(
    (key) => key.toLowerCase() === "authorization",
  );
}

/**
 * Orval mutator: `(url, options) => Promise<T>`.
 * Relative URLs are prefixed with `getApiBaseUrl()`.
 * Injects `Authorization: Bearer <session>` when a token getter is set
 * and the caller did not already supply Authorization.
 *
 * `/health` returns JSON on both 200 and 503 — both are accepted when a body is present.
 */
export async function apiMutator<T>(
  url: string,
  options?: ApiMutatorOptions,
): Promise<T> {
  const { params: _params, ...init } = options ?? {};
  const path = url.startsWith("http") ? url : `${getApiBaseUrl()}${url}`;

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  const token = accessTokenGetter?.() ?? null;
  if (token && !hasAuthorizationHeader(init.headers)) {
    headers.Authorization = `Bearer ${token}`;
  }

  if (init.headers) {
    if (init.headers instanceof Headers) {
      init.headers.forEach((value, key) => {
        headers[key] = value;
      });
    } else if (Array.isArray(init.headers)) {
      for (const [key, value] of init.headers) {
        headers[key] = value;
      }
    } else {
      Object.assign(headers, init.headers);
    }
  }

  const response = await fetch(path, {
    ...init,
    headers,
  });

  const text = await response.text();
  const acceptBody = response.ok || response.status === 503;

  if (!acceptBody) {
    throw new ApiError(response.status, text, errorCodeFromBody(text));
  }

  if (!text) {
    if (response.ok) {
      return undefined as T;
    }
    throw new ApiError(response.status, text, errorCodeFromBody(text));
  }

  return JSON.parse(text) as T;
}
