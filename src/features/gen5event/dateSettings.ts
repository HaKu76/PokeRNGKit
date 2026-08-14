export interface Gen5EventDates {
  startDate: string;
  endDate: string;
}

interface DateStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const DATE_STORAGE_KEY = "pokerngkit.gen5event.dates.v1";

function validDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 2000 || year > 2099) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function defaultGen5EventDates(now = new Date()): Gen5EventDates {
  const year = Math.min(2099, Math.max(2000, now.getFullYear()));
  const part = (value: number) => String(value).padStart(2, "0");
  const date = `${year}-${part(now.getMonth() + 1)}-${part(now.getDate())}`;
  return { startDate: date, endDate: date };
}

export function loadGen5EventDates(
  storage: DateStorage | undefined,
  now = new Date(),
): Gen5EventDates {
  try {
    const stored = JSON.parse(
      storage?.getItem(DATE_STORAGE_KEY) ?? "null",
    ) as Partial<Gen5EventDates> | null;
    if (validDate(stored?.startDate) && validDate(stored.endDate))
      return { startDate: stored.startDate, endDate: stored.endDate };
  } catch {
    // Optional date persistence falls back to the current date.
  }
  return defaultGen5EventDates(now);
}

export function saveGen5EventDates(
  storage: DateStorage | undefined,
  dates: Gen5EventDates,
) {
  try {
    storage?.setItem(DATE_STORAGE_KEY, JSON.stringify(dates));
  } catch {
    // Search remains available when local settings cannot be written.
  }
}
