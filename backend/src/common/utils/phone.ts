/**
 * Normalize user-typed phone numbers so "+91 98765 43210",
 * "09876543210" and "9876543210" all identify the same account.
 *
 * Defaults to India (+91) for bare 10-digit numbers, which keeps the
 * assignment demo friendly while still supporting international numbers.
 */
export const normalizePhone = (input: string): string => {
  const trimmed = input.trim();
  const digits = trimmed.replace(/\D/g, '');

  if (trimmed.startsWith('+')) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) return `+91${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;

  return `+${digits}`;
};

/** True for a normalized number such as +919876543210. */
export const isValidNormalizedPhone = (phone: string): boolean =>
  /^\+\d{10,15}$/.test(phone);
