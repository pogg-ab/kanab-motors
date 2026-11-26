import { businessDate, dateAfter, deliveryDate, milestoneAmount, assertCompliance, DEFAULT_IMPORT_POLICY } from './import-rules';

describe('Import acceptance business rules',()=>{
  it('uses the later of issuance and completed advance and waits for both events',()=>{
    expect(deliveryDate('2026-11-20',undefined,30,'ISSUANCE_AND_ADVANCE','CALENDAR',[])).toBeNull();
    expect(deliveryDate('2026-11-20','2026-11-17',30,'ISSUANCE_AND_ADVANCE','CALENDAR',[])).toBe('2026-12-20');
    expect(deliveryDate('2026-11-17','2026-11-20',30,'ISSUANCE_AND_ADVANCE','CALENDAR',[])).toBe('2026-12-20');
  });
  it('supports issuance-only, working days, configured holidays and year rollover',()=>{
    expect(deliveryDate('2026-12-24',undefined,2,'ISSUANCE','WORKING',['2026-12-25'])).toBe('2026-12-29');
    expect(dateAfter('2026-12-31',1)).toBe('2027-01-01');
  });
  it('calculates calendar dates in the configured timezone',()=>{
    expect(businessDate(new Date('2026-11-17T22:30:00Z'),'Africa/Nairobi')).toBe('2026-11-18');
    expect(businessDate(new Date('2026-11-17T22:30:00Z'),'America/New_York')).toBe('2026-11-17');
  });
  it('calculates percentage amounts and rejects invalid percentages',()=>{
    expect(milestoneAmount(100000,30)).toBe(30000);
    expect(milestoneAmount(999.99,33.33)).toBe(333.3);
    expect(()=>milestoneAmount(1000,101)).toThrow();
    expect(()=>milestoneAmount(1000,NaN)).toThrow();
  });
  it('blocks missing, pending, expired and evidence-less required permits but accepts a valid renewal',async()=>{
    let records:any[]=[];let evidence:any[]=[];
    const db={query:jest.fn(async(sql:string)=>sql.includes('SELECT settings')?[{settings:{...DEFAULT_IMPORT_POLICY,requirements:[{destination:'Ethiopia',mode:'SEA',type:'PERMIT',authority:'Authority',checkpoint:'PAYMENT',evidenceRequired:true}]}}]:sql.includes('FROM attachment')?evidence:records)};
    const po={poId:'1',destinationCountry:'Ethiopia',modeOfShipment:'SEA'};
    await expect(assertCompliance(db,po,'PAYMENT')).rejects.toThrow('PERMIT');
    records=[{requirement_type:'PERMIT',status:'PENDING',expiry_date:'2099-01-01'}];
    await expect(assertCompliance(db,po,'PAYMENT')).rejects.toThrow();
    records=[{requirement_type:'PERMIT',status:'APPROVED',expiry_date:'2000-01-01'}];
    await expect(assertCompliance(db,po,'PAYMENT')).rejects.toThrow();
    records.push({requirement_type:'PERMIT',status:'APPROVED',expiry_date:'2099-01-01'});
    await expect(assertCompliance(db,po,'PAYMENT')).rejects.toThrow();
    evidence=[{attachment_id:'1'}];
    await expect(assertCompliance(db,po,'PAYMENT')).resolves.toBeUndefined();
    await expect(assertCompliance(db,{...po,destinationCountry:'Kenya'},'PAYMENT')).resolves.toBeUndefined();
    await expect(assertCompliance(db,po,'SHIPMENT')).resolves.toBeUndefined();
  });
});
