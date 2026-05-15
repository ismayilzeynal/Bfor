import { differenceInCalendarDays, format, formatDistanceToNow, parseISO } from "date-fns";
import { az } from "date-fns/locale";

const AZN_FORMATTER = new Intl.NumberFormat("az-AZ", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const NUMBER_FORMATTER = new Intl.NumberFormat("az-AZ", {
  maximumFractionDigits: 0,
});

export function formatAZN(value: number, opts?: { compact?: boolean; sign?: boolean }): string {
  if (!Number.isFinite(value)) return "—";
  const sign = opts?.sign && value > 0 ? "+" : "";
  if (opts?.compact && Math.abs(value) >= 1000) {
    const compact = new Intl.NumberFormat("az-AZ", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
    return `${sign}${compact} ₼`;
  }
  return `${sign}${AZN_FORMATTER.format(value)} ₼`;
}

export function formatNumber(value: number, fractionDigits = 0): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("az-AZ", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatPercent(value: number, fractionDigits = 0): string {
  if (!Number.isFinite(value)) return "—";
  return `${(value * 100).toFixed(fractionDigits)}%`;
}

function toDate(input: string | Date): Date {
  return typeof input === "string" ? parseISO(input) : input;
}

export function formatDate(input: string | Date, pattern = "dd MMM yyyy"): string {
  try {
    return format(toDate(input), pattern, { locale: az });
  } catch {
    return "—";
  }
}

export function formatDateTime(input: string | Date): string {
  return formatDate(input, "dd MMM yyyy, HH:mm");
}

export function formatRelative(input: string | Date): string {
  try {
    return formatDistanceToNow(toDate(input), { addSuffix: true, locale: az });
  } catch {
    return "—";
  }
}

export function daysUntil(input: string | Date, from: Date = new Date()): number {
  try {
    return differenceInCalendarDays(toDate(input), from);
  } catch {
    return NaN;
  }
}

export function formatDaysToExpiry(days: number): string {
  if (!Number.isFinite(days)) return "—";
  if (days < 0) return `${Math.abs(days)} days overdue`;
  if (days === 0) return "Today";
  if (days === 1) return "1 day";
  return `${days} days`;
}

export function truncate(input: string, maxLength: number): string {
  if (!input) return "";
  return input.length <= maxLength ? input : `${input.slice(0, maxLength - 1)}…`;
}
