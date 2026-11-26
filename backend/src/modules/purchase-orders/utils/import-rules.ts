import { BadRequestException } from '@nestjs/common';

export const DEFAULT_IMPORT_POLICY = {
  timezone: 'Africa/Addis_Ababa',
  standardTerms: [
    'Import duties and local taxes, where applicable on arrival, are borne by the importing company.',
    "Bank charges and other expenses incurred in the supplier's country are borne by the supplier.",
    'Delivery lead time is {days} {dayType} days after {trigger}.',
  ],
  holidays: [] as string[],
  requirements: [] as { destination: string; mode: string; type: string; authority: string; checkpoint: string; evidenceRequired: boolean }[],
  commercialRequirements: [] as { destination: string; paymentMethod: string; fields: string[] }[],
  recipients: { payment: 'FINANCE_OFFICER', lcExpiry: 'FINANCE_MANAGER', lcShipment: 'PROCUREMENT' },
  escalationDays: 3,
  escalationRole: 'FINANCE_MANAGER',
};

export function businessDate(now = new Date(), timezone = DEFAULT_IMPORT_POLICY.timezone): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function dateAfter(date: string, days: number, dayType = 'CALENDAR', holidays: string[] = []): string {
  const d = new Date(`${date}T12:00:00Z`);
  if (!Number.isFinite(d.getTime()) || !Number.isInteger(days) || days < 0) throw new BadRequestException('Invalid delivery date or lead time');
  for (let remaining = days; remaining > 0;) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (dayType !== 'WORKING' || (d.getUTCDay() !== 0 && d.getUTCDay() !== 6 && !holidays.includes(d.toISOString().slice(0, 10)))) remaining--;
  }
  return d.toISOString().slice(0, 10);
}

export function deliveryDate(issuedDate: string | undefined, advanceDate: string | undefined, days: number, trigger: string, dayType: string, holidays: string[]): string | null {
  if (!issuedDate || (trigger !== 'ISSUANCE' && !advanceDate)) return null;
  const base = trigger === 'ISSUANCE' ? issuedDate : [issuedDate, advanceDate!].sort().pop()!;
  return dateAfter(base, days, dayType, holidays);
}

export function milestoneAmount(base: number, percentage: number): number {
  if (!Number.isFinite(base) || base <= 0 || !Number.isFinite(percentage) || percentage <= 0 || percentage > 100) throw new BadRequestException('A positive PO total and percentage up to 100 are required');
  return Math.round(base * percentage) / 100;
}

export async function loadImportPolicy(db: { query: Function }): Promise<typeof DEFAULT_IMPORT_POLICY> {
  const rows = await db.query('SELECT settings FROM import_process_policy WHERE policy_id = 1');
  return { ...DEFAULT_IMPORT_POLICY, ...rows?.[0]?.settings };
}

export async function complianceChecklist(db: { query: Function }, po: any, checkpoint?: string) {
  const policy = await loadImportPolicy(db);
  const today = businessDate(new Date(), policy.timezone);
  const records = await db.query('SELECT * FROM import_compliance_record WHERE po_id=$1 ORDER BY created_at DESC', [po.poId]);
  const rules = policy.requirements.filter(r => (!r.destination || r.destination.toLowerCase() === (po.destinationCountry || '').toLowerCase()) && (!r.mode || r.mode === po.modeOfShipment) && (!checkpoint || r.checkpoint === checkpoint));
  const items = [];
  for (const rule of rules) {
    const candidates = records.filter(r => r.requirement_type === rule.type);
    let valid = false;
    for (const rec of candidates) {
      if (rec.status !== 'APPROVED' || (rec.expiry_date && String(rec.expiry_date).slice(0,10) < today)) continue;
      if (rule.evidenceRequired) {
        const evidence = await db.query("SELECT attachment_id FROM attachment WHERE entity_type='import_compliance' AND entity_id=$1 LIMIT 1", [String(rec.compliance_record_id)]);
        if (!evidence.length) continue;
      }
      valid = true;
    }
    items.push({ ...rule, status: valid ? 'APPROVED' : candidates.length ? 'ACTION_REQUIRED' : 'MISSING' });
  }
  return items;
}

export async function assertCompliance(db: { query: Function }, po: any, checkpoint: string) {
  const missing = (await complianceChecklist(db, po, checkpoint)).filter(r => r.status !== 'APPROVED');
  if (missing.length) throw new BadRequestException(`${checkpoint} requires valid approved compliance evidence: ${missing.map(r => r.type).join(', ')}`);
}
