export type ApiErrorPayload = {
  error?: string;
  errors?: { msg?: string }[];
  [key: string]: unknown;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly response: { data: ApiErrorPayload; status: number };

  constructor(status: number, message: string, data: ApiErrorPayload = {}, code = 'API_ERROR') {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.response = { data, status };
  }
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (error && typeof error === 'object') {
    const candidate = error as {
      message?: unknown;
      response?: { data?: { error?: unknown; errors?: { msg?: unknown }[] } };
    };
    const responseMessage = candidate.response?.data?.error;
    if (typeof responseMessage === 'string' && responseMessage.trim()) return responseMessage;
    const errors = candidate.response?.data?.errors;
    const validationMessage = Array.isArray(errors) ? errors.find(
      (item) => typeof item?.msg === 'string' && item.msg.trim()
    )?.msg : undefined;
    if (typeof validationMessage === 'string') return validationMessage;
    if (typeof candidate.message === 'string' && candidate.message.trim()) return candidate.message;
  }
  return fallback;
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
