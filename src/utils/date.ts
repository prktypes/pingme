import type { RepeatRule } from '@/features/reminders/types';

const TIME_FORMAT = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
});

const WEEKDAY_DATE_FORMAT = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});

const FULL_DATE_FORMAT = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
});

const SHORT_DATE_FORMAT = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
});

export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function isSameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

export function formatTime(date: Date): string {
  return TIME_FORMAT.format(date);
}

export function formatDueAt(value: string | null | undefined, now = new Date()): string {
  const date = parseDate(value);
  if (!date) return '';

  const tomorrow = startOfDay(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (isSameDay(date, now)) return `Today, ${formatTime(date)}`;
  if (isSameDay(date, tomorrow)) return `Tomorrow, ${formatTime(date)}`;

  const sameYear = date.getFullYear() === now.getFullYear();
  const day = sameYear ? WEEKDAY_DATE_FORMAT.format(date) : FULL_DATE_FORMAT.format(date);
  return `${day}, ${formatTime(date)}`;
}

export function formatDate(value: string | null | undefined, now = new Date()): string {
  const date = parseDate(value);
  if (!date) return '';
  if (date.getFullYear() === now.getFullYear()) return SHORT_DATE_FORMAT.format(date);
  return FULL_DATE_FORMAT.format(date);
}

/** Compact trailing label for dense list rows. */
export function formatCompactDue(value: string | null | undefined, now = new Date()): string {
  const date = parseDate(value);
  if (!date) return '';
  if (isSameDay(date, now)) return formatTime(date);

  const tomorrow = startOfDay(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (isSameDay(date, tomorrow)) return 'Tomorrow';

  return SHORT_DATE_FORMAT.format(date);
}

export function formatTimestamp(value: string | null | undefined): string {
  const date = parseDate(value);
  if (!date) return '';
  return `${WEEKDAY_DATE_FORMAT.format(date)} at ${formatTime(date)}`;
}

export type SnoozeOption = 'hour' | 'threeHours' | 'tomorrow';

export function snoozeUntil(option: SnoozeOption, now = new Date()): Date {
  if (option === 'hour') return new Date(now.getTime() + 60 * 60 * 1_000);
  if (option === 'threeHours') return new Date(now.getTime() + 3 * 60 * 60 * 1_000);

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  return tomorrow;
}

export function isSnoozed(snoozedUntil: string | null | undefined, now = new Date()): boolean {
  const date = parseDate(snoozedUntil);
  return Boolean(date && date.getTime() > now.getTime());
}

/**
 * Returns the next occurrence at or after `from` for a recurring rule.
 * Used for messaging and for picking the next notification anchor.
 */
export function nextOccurrence(
  dueAt: string | null | undefined,
  rule: RepeatRule,
  from = new Date(),
): Date | null {
  const base = parseDate(dueAt);
  if (!base) return null;
  if (rule === 'none') return base;

  const next = new Date(base);
  if (next.getTime() >= from.getTime()) return next;

  if (rule === 'daily') {
    next.setDate(next.getDate() + 1);
    while (next.getTime() < from.getTime()) next.setDate(next.getDate() + 1);
    return next;
  }

  if (rule === 'weekly') {
    next.setDate(next.getDate() + 7);
    while (next.getTime() < from.getTime()) next.setDate(next.getDate() + 7);
    return next;
  }

  next.setMonth(next.getMonth() + 1);
  while (next.getTime() < from.getTime()) next.setMonth(next.getMonth() + 1);
  return next;
}

export function defaultDueDate(now = new Date()): Date {
  const date = new Date(now.getTime() + 60 * 60 * 1_000);
  date.setMinutes(Math.ceil(date.getMinutes() / 15) * 15, 0, 0);
  return date;
}

export function repeatLabel(rule: RepeatRule): string {
  switch (rule) {
    case 'daily':
      return 'Every day';
    case 'weekly':
      return 'Every week';
    case 'monthly':
      return 'Every month';
    default:
      return 'Does not repeat';
  }
}

/** Converts a JavaScript weekday to iOS/Expo's Sunday = 1 convention. */
export function expoWeekday(date: Date): number {
  return date.getDay() + 1;
}
