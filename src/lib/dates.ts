import { addDays, addMonths, addYears, differenceInCalendarDays, format, getDay, parseISO } from 'date-fns'

export function todayIsoDate(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function formatDisplayDate(isoDate: string): string {
  return format(parseISO(isoDate), 'd MMM yyyy')
}

export function formatShortDate(isoDate: string): string {
  return format(parseISO(isoDate), 'd MMM')
}

export function addDaysIso(isoDate: string, days: number): string {
  return format(addDays(parseISO(isoDate), days), 'yyyy-MM-dd')
}

export function addMonthsIso(isoDate: string, months: number): string {
  return format(addMonths(parseISO(isoDate), months), 'yyyy-MM-dd')
}

export function dateRange(startIso: string, days: number): string[] {
  return Array.from({ length: days }, (_, index) => addDaysIso(startIso, index))
}

export function addYearsIso(isoDate: string, years: number): string {
  return format(addYears(parseISO(isoDate), years), 'yyyy-MM-dd')
}

export function calendarDaysInclusive(fromIso: string, toIso: string): number {
  return differenceInCalendarDays(parseISO(toIso), parseISO(fromIso)) + 1
}

export function weekdayIndex(isoDate: string): number {
  return getDay(parseISO(isoDate))
}
