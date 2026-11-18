/**
 * Presentation helpers. A fixed locale and time zone keep output identical
 * on the server and in every browser, which avoids hydration mismatches.
 */
const LOCALE = "en-GB";
const TIME_ZONE = "Asia/Dubai";

const numberFormat = new Intl.NumberFormat(LOCALE);
const compactFormat = new Intl.NumberFormat(LOCALE, { notation: "compact", maximumFractionDigits: 1 });

export function formatNumber(value: number): string {
  return numberFormat.format(Math.round(value));
}

export function formatCompact(value: number): string {
  return compactFormat.format(value);
}

export function formatCurrency(value: number, currency = "USD", fractionDigits = 0): string {
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

/** Formats a 0–1 ratio as a percentage. */
export function formatRatio(value: number, fractionDigits = 0): string {
  return `${(value * 100).toFixed(fractionDigits)}%`;
}

/** Formats a value that is already a percentage (0–100). */
export function formatPct(value: number, fractionDigits = 0): string {
  return `${value.toFixed(fractionDigits)}%`;
}

/** Normalised 0–1 score, three decimals as produced by the scoring pipeline. */
export function formatScore(value: number, fractionDigits = 2): string {
  return value.toFixed(fractionDigits);
}

export function formatSigned(value: number, fractionDigits = 2): string {
  const fixed = Math.abs(value).toFixed(fractionDigits);
  if (Number(fixed) === 0) return fixed;
  return `${value > 0 ? "+" : "−"}${fixed}`;
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(LOCALE, { day: "2-digit", month: "short", year: "numeric", timeZone: TIME_ZONE }).format(
    date,
  );
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(LOCALE, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TIME_ZONE,
  }).format(date);
}

export function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(LOCALE, { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TIME_ZONE }).format(
    date,
  );
}

/** "2026-03" → "Mar 26" */
export function formatMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split("-").map(Number);
  if (!year || !month) return yearMonth;
  const label = new Intl.DateTimeFormat(LOCALE, { month: "short", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  );
  return `${label} ${String(year).slice(2)}`;
}

export function formatRelative(iso: string, now: Date = new Date()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const minutes = Math.round((now.getTime() - then) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d ago`;
  return formatDate(iso);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
