import type { Loan } from '../types';

export const formatCurrency = (amount: number): string => {
  const safe = Number.isFinite(amount) ? amount : 0;
  const showPaise = Math.round(safe * 100) % 100 !== 0;
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: showPaise ? 2 : 0,
    maximumFractionDigits: showPaise ? 2 : 0,
  }).format(safe);

  return `₹${formatted}`;
};

export const formatDate = (value: string | Date): string => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

export const formatShortDate = (value: string | Date): string => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
  }).format(date);
};

export const formatPhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');

  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return `+91 ${digits.slice(1, 6)} ${digits.slice(6)}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  return phone;
};

export const initialsOf = (name: string | null | undefined): string => {
  if (!name?.trim()) return 'ML';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || 'ML';
};

const AVATAR_PALETTE = [
  { background: '#E8F0D3', foreground: '#3F5A25' },
  { background: '#F7E7D8', foreground: '#8A5426' },
  { background: '#E3EBF5', foreground: '#345479' },
  { background: '#F3E3EE', foreground: '#7A3A64' },
  { background: '#E4EFEC', foreground: '#2E6153' },
];

export const avatarPalette = (seed: string) => {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % 997;
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length] ?? AVATAR_PALETTE[0]!;
};

export const greeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

/** Short, human status line used under each friend name. */
export const dueLabel = (loan: Loan): string => {
  if (loan.status === 'repaid') {
    return loan.repaidAt ? `Repaid ${formatShortDate(loan.repaidAt)}` : 'Repaid';
  }

  if (loan.status === 'overdue') {
    const days = loan.daysOverdue;
    if (days === 0) return 'Overdue since today';
    return `Overdue by ${days} ${days === 1 ? 'day' : 'days'}`;
  }

  const days = loan.daysUntilDue;
  if (days <= 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `Due in ${days} days`;
};

export const toDateChipIso = (date: Date): string => {
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  return endOfDay.toISOString();
};

export const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

export const toYyyyMmDd = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};
