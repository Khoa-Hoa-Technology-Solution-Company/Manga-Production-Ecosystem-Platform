const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string): boolean {
  const normalized = normalizeEmail(value);
  return normalized.length <= 254 && EMAIL_PATTERN.test(normalized);
}

export function isValidHttpOrRelativeUrl(value: string): boolean {
  const normalized = value.trim();
  if (!normalized) return true;
  if (normalized.startsWith('/')) return !normalized.startsWith('//');

  try {
    const parsed = new URL(normalized);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function getErrorMessage(error: unknown, fallback: string): string {
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
