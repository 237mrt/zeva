export type DatePreset = 'TODAY' | 'LAST_7_DAYS' | 'THIS_MONTH' | 'LAST_MONTH' | 'LAST_30_DAYS' | 'THIS_YEAR' | 'CUSTOM';

export interface DateFilterValue {
  preset: DatePreset;
  fromDate: string;
  toDate: string;
  from: string;
  to: string;
}

interface CalendarDate { year: number; month: number; day: number }
interface CalendarDateTime extends CalendarDate { hour: number; minute: number; second: number }

const REPORTING_TIME_ZONE = 'Europe/Istanbul';
const istanbulDateTime = new Intl.DateTimeFormat('en-CA', {
  timeZone: REPORTING_TIME_ZONE,
  numberingSystem: 'latn',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

function numericParts(value: Date): CalendarDateTime {
  const parts = new Map(istanbulDateTime.formatToParts(value).map((part) => [part.type, part.value]));
  return {
    year: Number(parts.get('year')),
    month: Number(parts.get('month')),
    day: Number(parts.get('day')),
    hour: Number(parts.get('hour')),
    minute: Number(parts.get('minute')),
    second: Number(parts.get('second')),
  };
}

function parseCalendarDate(value: string): CalendarDate {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error('Geçersiz takvim tarihi.');
  const date = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  const normalized = new Date(Date.UTC(date.year, date.month - 1, date.day));
  if (normalized.getUTCFullYear() !== date.year || normalized.getUTCMonth() + 1 !== date.month || normalized.getUTCDate() !== date.day) throw new Error('Geçersiz takvim tarihi.');
  return date;
}

const calendarDate = (value: Date): CalendarDate => { const { year, month, day } = numericParts(value); return { year, month, day }; };
const inputDate = ({ year, month, day }: CalendarDate) => `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
const calendarCarrier = ({ year, month, day }: CalendarDate) => new Date(Date.UTC(year, month - 1, day));
const fromCarrier = (value: Date): CalendarDate => ({ year: value.getUTCFullYear(), month: value.getUTCMonth() + 1, day: value.getUTCDate() });
const addDays = (value: CalendarDate, days: number): CalendarDate => { const carrier = calendarCarrier(value); carrier.setUTCDate(carrier.getUTCDate() + days); return fromCarrier(carrier); };

function timeZoneOffset(timestamp: number): number {
  const instant = new Date(timestamp); const parts = numericParts(instant);
  const representedAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return representedAsUtc - Math.floor(timestamp / 1_000) * 1_000;
}

function istanbulInstant(date: CalendarDate, endOfDay: boolean): Date {
  const hour = endOfDay ? 23 : 0; const minute = endOfDay ? 59 : 0; const second = endOfDay ? 59 : 0; const millisecond = endOfDay ? 999 : 0;
  const wallClockAsUtc = Date.UTC(date.year, date.month - 1, date.day, hour, minute, second, millisecond);
  const firstPass = wallClockAsUtc - timeZoneOffset(wallClockAsUtc);
  return new Date(wallClockAsUtc - timeZoneOffset(firstPass));
}

function value(preset: DatePreset, fromDate: CalendarDate, toDate: CalendarDate): DateFilterValue {
  return { preset, fromDate: inputDate(fromDate), toDate: inputDate(toDate), from: istanbulInstant(fromDate, false).toISOString(), to: istanbulInstant(toDate, true).toISOString() };
}

export function createCustomDateFilter(fromDate: string, toDate: string): DateFilterValue {
  return value('CUSTOM', parseCalendarDate(fromDate), parseCalendarDate(toDate));
}

export function createDateFilter(preset: DatePreset, now = new Date()): DateFilterValue {
  const today = calendarDate(now); let from = today; let to = today;
  if (preset === 'LAST_7_DAYS') from = addDays(today, -6);
  if (preset === 'THIS_MONTH') from = { year: today.year, month: today.month, day: 1 };
  if (preset === 'LAST_MONTH') { const currentMonth = { year: today.year, month: today.month, day: 1 }; to = addDays(currentMonth, -1); from = { year: to.year, month: to.month, day: 1 }; }
  if (preset === 'LAST_30_DAYS') from = addDays(today, -29);
  if (preset === 'THIS_YEAR') from = { year: today.year, month: 1, day: 1 };
  return value(preset, from, to);
}
