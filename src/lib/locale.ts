/** Padrão global: Real brasileiro + fuso de São Paulo. */

export const LOCALE = "pt-BR";
export const TIMEZONE = "America/Sao_Paulo";
export const CURRENCY_CODE = "BRL";

const moneyFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: CURRENCY_CODE,
});

function datePartsInTimezone(date: Date, timeZone = TIMEZONE) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour") % 24,
    minute: get("minute"),
    second: get("second"),
  };
}

/** Data de hoje no fuso de São Paulo (YYYY-MM-DD). */
export function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function firstDayOfMonthISO(ref?: string): string {
  const base = ref ?? todayISO();
  return `${base.slice(0, 7)}-01`;
}

export function tomorrowISO(): string {
  return shiftDateISO(todayISO(), 1);
}

export function shiftDateISO(iso: string, days: number): string {
  const d = parseDateOnly(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return formatDateOnlyUTC(d);
}

/** Converte YYYY-MM-DD em Date estável (meio-dia UTC). */
export function parseDateOnly(iso: string): Date {
  return new Date(`${iso.slice(0, 10)}T12:00:00.000Z`);
}

function formatDateOnlyUTC(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function currentYearMonth(): string {
  return todayISO().slice(0, 7);
}

export function nowInTimezone(): Date {
  return new Date();
}

export function getZonedTimeParts(date: Date = new Date()) {
  return datePartsInTimezone(date);
}

export function getZonedWeekday(date: Date = new Date()): number {
  const wd = new Intl.DateTimeFormat("en-US", { timeZone: TIMEZONE, weekday: "short" }).format(date);
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[wd] ?? 0;
}

export function isSameDayInTimezone(a: Date, b: Date = new Date()): boolean {
  const pa = datePartsInTimezone(a);
  const pb = datePartsInTimezone(b);
  return pa.year === pb.year && pa.month === pb.month && pa.day === pb.day;
}

/** Valor monetário em Real (R$). */
export function fmtMoney(n: number | string | null | undefined): string {
  return moneyFormatter.format(Number(n ?? 0));
}

/** Alias histórico. */
export const fmt = fmtMoney;

export function parseBRLInput(s: string): number {
  const clean = s.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(clean);
  return Number.isFinite(n) ? n : 0;
}

const defaultDateOptions: Intl.DateTimeFormatOptions = {
  timeZone: TIMEZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
};

/** Formata data ISO (YYYY-MM-DD ou timestamp). */
export function fmtDate(s: string | null | undefined): string {
  if (!s) return "—";
  const raw = s.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return parseDateOnly(raw).toLocaleDateString(LOCALE, defaultDateOptions);
  }
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(LOCALE, defaultDateOptions);
}

export function fmtDateFromDate(
  date: Date,
  options: Intl.DateTimeFormatOptions = defaultDateOptions,
): string {
  return date.toLocaleDateString(LOCALE, { timeZone: TIMEZONE, ...options });
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(LOCALE, {
    timeZone: TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fmtDateTimeFromDate(
  date: Date,
  options: Intl.DateTimeFormatOptions = {},
): string {
  return date.toLocaleString(LOCALE, {
    timeZone: TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  });
}

export function fmtTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString(LOCALE, {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fmtTimeFromDate(
  date: Date = new Date(),
  options: Intl.DateTimeFormatOptions = {},
): string {
  return date.toLocaleTimeString(LOCALE, {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  });
}

export function formatYMD(year: number, monthIndex: number, day: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function addMonthsISO(iso: string, months: number): string {
  const d = parseDateOnly(iso.slice(0, 10));
  d.setUTCMonth(d.getUTCMonth() + months);
  return formatDateOnlyUTC(d);
}

export function fmtDateLong(iso: string): string {
  return fmtDateFromDate(parseDateOnly(iso.slice(0, 10)), {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
  });
}

export function fmtDateFull(iso: string): string {
  return fmtDateFromDate(parseDateOnly(iso.slice(0, 10)), {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function fmtDateShortWeekday(iso: string): string {
  return fmtDateFromDate(parseDateOnly(iso.slice(0, 10)), {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Valor para input datetime-local no fuso de São Paulo. */
export function fmtDateTimeLocalInput(date: Date = new Date()): string {
  const p = datePartsInTimezone(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

export function fmtMonthYear(date: Date | string): string {
  const d = typeof date === "string" ? parseDateOnly(date.slice(0, 10)) : date;
  return d.toLocaleDateString(LOCALE, {
    timeZone: TIMEZONE,
    month: "long",
    year: "numeric",
  });
}

export function fmtRelativeTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `há ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "ontem";
  if (diffD < 7) return `há ${diffD} dias`;
  return fmtDateFromDate(date, { day: "2-digit", month: "short" });
}

export function fmtMessageTime(iso: string): string {
  const date = new Date(iso);
  if (isSameDayInTimezone(date)) {
    return fmtTimeFromDate(date);
  }
  return fmtDateTimeFromDate(date);
}

export function isOverdue(due: string, status: string): boolean {
  if (status !== "pending" && status !== "partial") return false;
  return due.slice(0, 10) < todayISO();
}

export function fmtNumber(n: number | string | null | undefined): string {
  return Number(n ?? 0).toLocaleString(LOCALE);
}

export function compareStringsPt(a: string, b: string): number {
  return a.localeCompare(b, LOCALE);
}
