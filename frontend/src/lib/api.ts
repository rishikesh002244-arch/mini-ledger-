import type { FieldIssue } from '../types';
import { API_BASE_URL } from './config';

interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: FieldIssue[] | unknown;
  };
}

export class ApiClientError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly fieldErrors: Record<string, string>;
  public readonly details?: unknown;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: unknown,
    fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.fieldErrors = fieldErrors ?? {};
  }
}

let unauthorizedHandler: (() => void) | null = null;

/** AuthProvider registers this so a 401 anywhere logs the user out cleanly. */
export const setUnauthorizedHandler = (handler: (() => void) | null): void => {
  unauthorizedHandler = handler;
};

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  token?: string | null;
  body?: unknown;
  signal?: AbortSignal;
}

const parseErrorBody = async (response: Response): Promise<ApiClientError> => {
  let payload: ApiErrorBody | null = null;

  try {
    payload = (await response.json()) as ApiErrorBody;
  } catch {
    // Non-JSON response (proxy, crash, HTML error page).
  }

  const details = payload?.error?.details;
  const fieldErrors: Record<string, string> = {};

  if (Array.isArray(details)) {
    for (const issue of details as FieldIssue[]) {
      if (issue?.field) fieldErrors[issue.field] = issue.message;
    }
  }

  return new ApiClientError(
    response.status,
    payload?.error?.code ?? 'NETWORK_ERROR',
    payload?.error?.message ?? `Request failed with status ${response.status}.`,
    details,
    fieldErrors,
  );
};

export const apiRequest = async <T>(
  path: string,
  { method = 'GET', token, body, signal }: RequestOptions = {},
): Promise<{ data: T; meta?: Record<string, unknown> }> => {
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      signal,
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        // Let the runtime set the multipart boundary for FormData.
        ...(body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body
        ? isFormData
          ? (body as FormData)
          : JSON.stringify(body)
        : undefined,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw new ApiClientError(
      0,
      'NETWORK_ERROR',
      `Cannot reach the MiniLedger API at ${API_BASE_URL}. Is the backend running?`,
    );
  }

  if (!response.ok) {
    const apiError = await parseErrorBody(response);

    if (response.status === 401 && apiError.code !== 'INVALID_OTP') {
      unauthorizedHandler?.();
    }

    throw apiError;
  }

  if (response.status === 204) {
    return { data: undefined as T };
  }

  const payload = (await response.json()) as {
    success: boolean;
    data: T;
    meta?: Record<string, unknown>;
  };

  return { data: payload.data, meta: payload.meta };
};
