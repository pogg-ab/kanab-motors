import { deadlineState, expiryDate, reminderEvents } from './container-rules';

describe('Phase 5 container deadline rules',()=>{
  it('calculates the client example and supports inclusive terms',()=>{
    expect(expiryDate('2026-11-10',14,'EXCLUSIVE')).toBe('2026-11-24');
    expect(expiryDate('2026-11-10',14,'INCLUSIVE')).toBe('2026-11-23');
  });
  it('handles zero allowance, leap years and year boundaries',()=>{
    expect(expiryDate('2026-11-10',0,'EXCLUSIVE')).toBe('2026-11-10');
    expect(expiryDate('2028-02-28',2,'EXCLUSIVE')).toBe('2028-03-01');
    expect(expiryDate('2026-12-30',3,'EXCLUSIVE')).toBe('2027-01-02');
  });
  it.each([['2026-02-30',14,'EXCLUSIVE'],['2026-11-10',-1,'EXCLUSIVE'],['2026-11-10',1.5,'EXCLUSIVE'],['2026-11-10',14,'UNKNOWN']])('rejects invalid calculation %s %s %s',(start,days,convention)=>{
    expect(()=>expiryDate(String(start),Number(days),String(convention))).toThrow();
  });
  it('distinguishes due today, overdue, missing and returned states',()=>{
    expect(deadlineState('2026-11-19','2026-11-19')).toEqual({days:0,status:'DUE_TODAY'});
    expect(deadlineState('2026-11-18','2026-11-19').status).toBe('OVERDUE');
    expect(deadlineState(undefined,'2026-11-19').status).toBe('NOT_SET');
    expect(deadlineState('2026-11-18','2026-11-19',true).status).toBe('RETURNED');
  });
  it('keeps reminder thresholds independent with catch-up and separate overdue events',()=>{
    expect(reminderEvents('2026-11-27','2026-11-19',[7,3,1])).toEqual([]);
    expect(reminderEvents('2026-11-26','2026-11-19',[7,3,1])).toEqual(['BEFORE_7']);
    expect(reminderEvents('2026-11-22','2026-11-19',[7,3,1])).toEqual(['BEFORE_7','BEFORE_3']);
    expect(reminderEvents('2026-11-20','2026-11-19',[7,3,1])).toEqual(['BEFORE_7','BEFORE_3','BEFORE_1']);
    expect(reminderEvents('2026-11-18','2026-11-19',[7,3,1])).toEqual(['OVERDUE']);
    expect(reminderEvents('2026-11-21','2026-11-19',[2])).toEqual(['BEFORE_2']);
  });
});
