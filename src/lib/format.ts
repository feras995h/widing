/** Western (Latin) digits 0–9; use with ar-LY so month names stay Arabic. */
const LATN = "latn" as const;

function toLatinDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
}

function normalizeSeparators(value: string): string {
  return toLatinDigits(
    value.replaceAll("٬", ",").replaceAll("٫", ".").replaceAll("،", ","),
  );
}

export function formatLYD(amount: number | string | null | undefined): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount ?? 0;
  const formatted = new Intl.NumberFormat("en-US", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    numberingSystem: LATN,
  }).format(n);
  return normalizeSeparators(formatted) + " د.ل";
}

/** Formats a plain number in Arabic locale with Western (Latin) digits. */
export function formatDecimal(
  n: number,
  options?: Omit<Intl.NumberFormatOptions, "numberingSystem">,
): string {
  const formatted = new Intl.NumberFormat("en-US", {
    ...options,
    numberingSystem: LATN,
  }).format(n);
  return normalizeSeparators(formatted);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const formatted = new Intl.DateTimeFormat("ar-LY", {
    year: "numeric",
    month: "long",
    day: "numeric",
    numberingSystem: LATN,
  }).format(d);
  return normalizeSeparators(formatted);
}

export function formatShortDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const formatted = new Intl.DateTimeFormat("ar-LY", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    numberingSystem: LATN,
  }).format(d);
  return normalizeSeparators(formatted);
}

/** YYYY-MM-DD in the browser's local calendar (unlike `Date#toISOString`, which is UTC). */
export function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Normalizes `event_date` from API (string YYYY-MM-DD, ISO string, or `Date`) to YYYY-MM-DD.
 * Avoids assuming `.trim` / string methods — DB clients may return `Date` objects.
 */
export function eventDateYmd(v: string | Date | null | undefined): string | null {
  if (v == null) return null;
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return null;
    return localDateKey(v);
  }
  const s = String(v).trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s;
}

/** Parses event/SQL date values without applying timezone shifts on plain dates. */
export function partsFromYmd(ymd: string | Date | null | undefined): { y: number; m0: number; d: number } | null {
  const s = eventDateYmd(ymd);
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return { y: Number(m[1]), m0: Number(m[2]) - 1, d: Number(m[3]) };
}

export const eventTypeLabels: Record<string, string> = {
  wedding: "زفاف",
  engagement: "خطوبة",
  birthday: "عيد ميلاد",
  graduation: "تخرج",
  corporate: "مناسبة شركة",
  other: "أخرى",
};

export const statusLabels: Record<string, string> = {
  confirmed: "مؤكد",
  tentative: "مبدئي",
  cancelled: "ملغى",
  completed: "مكتمل",
};

export const statusColors: Record<string, string> = {
  confirmed: "bg-success/15 text-success border-success/30",
  tentative: "bg-warning/15 text-warning border-warning/30",
  cancelled: "bg-destructive/15 text-destructive border-destructive/30",
  completed: "bg-primary/15 text-primary border-primary/30",
};

export const paymentMethodLabels: Record<string, string> = {
  cash: "نقداً",
  bank_transfer: "تحويل بنكي",
  card: "بطاقة",
  other: "أخرى",
};

export const expenseCategoryLabels: Record<string, string> = {
  utilities: "كهرباء وماء",
  maintenance: "صيانة",
  supplies: "مستلزمات",
  rent: "إيجار",
  marketing: "تسويق",
  taxes: "ضرائب",
  other: "أخرى",
};