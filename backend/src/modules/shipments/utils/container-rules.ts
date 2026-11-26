import { BadRequestException } from '@nestjs/common';

export function validDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
}
export function expiryDate(start: string, days: number, convention: string): string {
  if (!validDate(start) || !Number.isInteger(days) || days < 0 || days > 3650 || !['INCLUSIVE','EXCLUSIVE'].includes(convention))
    throw new BadRequestException('Valid start date, 0–3650 free days and day-counting convention required');
  const d = new Date(`${start}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + Math.max(0, days - (convention === 'INCLUSIVE' ? 1 : 0)));
  return d.toISOString().slice(0,10);
}
export function daysRemaining(deadline: string | undefined, today: string): number | null {
  return deadline ? Math.round((Date.parse(deadline) - Date.parse(today))/86400000) : null;
}
export function deadlineState(deadline: string | undefined, today: string, returned = false, window = 7) {
  const days = daysRemaining(deadline,today);
  return { days, status: returned ? 'RETURNED' : days === null ? 'NOT_SET' : days < 0 ? 'OVERDUE' : days === 0 ? 'DUE_TODAY' : days <= window ? 'APPROACHING' : 'ON_TIME' };
}
export function reminderEvents(deadline: string, today: string, offsets: number[]): string[] {
  const days = daysRemaining(deadline,today)!;
  // Catch up missed thresholds after downtime, each threshold remains idempotent.
  if (days < 0) return ['OVERDUE'];
  return offsets.filter(offset => days <= offset).map(offset => `BEFORE_${offset}`);
}
