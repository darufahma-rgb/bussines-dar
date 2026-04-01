import { format, parseISO, isToday, isYesterday, formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";

/**
 * Format a number as Indonesian Rupiah.
 * Returns "—" for null/undefined/0.
 * Example: formatIDR(1500000) → "IDR 1.500.000"
 */
export function formatIDR(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (isNaN(n)) return "—";
  if (n === 0) return "—";
  return `IDR ${n.toLocaleString("id-ID")}`;
}

/**
 * Format a number as abbreviated IDR for compact displays.
 * Example: formatIDRCompact(1500000) → "1,5jt"
 */
export function formatIDRCompact(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (isNaN(n) || n === 0) return "—";
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}M`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}rb`;
  return String(n);
}

/**
 * Format a date string or Date object in Indonesian short format.
 * Example: "2025-04-01" → "1 Apr 2025"
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  try {
    const d = typeof date === "string" ? parseISO(date) : date;
    return format(d, "d MMM yyyy", { locale: idLocale });
  } catch {
    return "—";
  }
}

/**
 * Format a date string in short format without the year.
 * Example: "2025-04-01" → "1 Apr"
 */
export function formatDateShort(date: string | Date | null | undefined): string {
  if (!date) return "—";
  try {
    const d = typeof date === "string" ? parseISO(date) : date;
    return format(d, "d MMM", { locale: idLocale });
  } catch {
    return "—";
  }
}

/**
 * Format a date relative to now, with smart labeling.
 * Example: today → "Hari ini", yesterday → "Kemarin", older → "3 Apr"
 */
export function formatDateRelative(date: string | Date | null | undefined): string {
  if (!date) return "—";
  try {
    const d = typeof date === "string" ? parseISO(date) : date;
    if (isToday(d)) return "Hari ini";
    if (isYesterday(d)) return "Kemarin";
    return format(d, "d MMM", { locale: idLocale });
  } catch {
    return "—";
  }
}

/**
 * Format a datetime with time included.
 * Example: "2025-04-01T10:30:00Z" → "1 Apr, 10:30"
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "—";
  try {
    const d = typeof date === "string" ? parseISO(date) : date;
    return format(d, "d MMM, HH:mm", { locale: idLocale });
  } catch {
    return "—";
  }
}

/**
 * Capitalize the first letter of a string.
 */
export function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
