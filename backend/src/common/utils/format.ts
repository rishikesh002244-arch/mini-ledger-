import { Prisma } from '@prisma/client';

/** Prisma Decimal → JSON number rounded to 2 paise/cents. */
export const decimalToNumber = (value: Prisma.Decimal | string | number): number =>
  Number(new Prisma.Decimal(value).toFixed(2));

/**
 * Dates sent as plain `YYYY-MM-DD` mean "due by the end of that day".
 * Full ISO timestamps are respected as-is.
 */
export const parseDueDate = (value: string): Date | null => {
  const input = value.trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [year, month, day] = input.split('-').map(Number) as [number, number, number];
    const date = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
    const isRealCalendarDate =
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day;
    return isRealCalendarDate ? date : null;
  }

  const date = new Date(input);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const startOfUtcDay = (date: Date): number =>
  Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

/** Whole days between the due date and today; 0 while it is still due today. */
export const daysOverdue = (dueDate: Date, now = new Date()): number =>
  Math.max(0, Math.round((startOfUtcDay(now) - startOfUtcDay(dueDate)) / 86_400_000));

/** Whole days until a future due date (negative when overdue). */
export const daysUntilDue = (dueDate: Date, now = new Date()): number =>
  Math.round((startOfUtcDay(dueDate) - startOfUtcDay(now)) / 86_400_000);
