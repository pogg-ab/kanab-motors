import { E2EHarness } from './e2e-helper';
import { ShipmentsService } from '../src/modules/shipments/services/shipments.service';

describe('Jira Part 1 acceptance (isolated database only)',()=>{
  const h=new E2EHarness();
  let token:string, sales:string, itemId:string, supplierId:number, bankId:number, poId:string;
  const suffix=Date.now().toString();
  const request=async(path:string,method='GET',body?:any,auth=token)=>{
    const res=await h.request(path,{method,body,token:auth});
    return res;
  };
  const ok=async(path:string,method='GET',body?:any)=>{
    const r=await request(path,method,body);
    if(r.status>=300) throw new Error(`${method} ${path}: ${r.status} ${r.text}`);
    return r.body;
  };
  beforeAll(async()=>{
    if (!process.env.DB_NAME?.startsWith('codex_import_acceptance_')) throw new Error('This test requires an isolated codex_import_acceptance_ database');
    await h.init();
    token=(await h.login('admin','Admin@123')).accessToken;
    sales=(await h.login('salesperson','Sales@123')).accessToken;
    const items=await h.dataSource.query(`INSERT INTO product_item(item_code,item_name,category_id,uom_id,selling_price) SELECT $1,'Import Acceptance Product',(SELECT category_id FROM product_category LIMIT 1),(SELECT uom_id FROM unit_of_measure LIMIT 1),100 RETURNING item_id`,[`ACCEPT-${suffix}`]);
    itemId=String(items[0].item_id);
    const supplier=await ok('/suppliers','POST',{supplierName:`Acceptance ${suffix}`,country:'India'});
    supplierId=supplier.supplierId;
    const banks=await ok('/purchase-orders/bank-accounts');bankId=banks[0].bankAccountId;
  },60000);
  afterAll(async()=>{await h.close();});

  it('enforces requisition/payment/L/C permissions and trusted requester identity',async()=>{
    expect((await request('/import-requisitions','GET',undefined,'')).status).toBe(401);
    expect((await request('/purchase-orders/payments/transactions','POST',{},sales)).status).toBe(403);
    expect((await request('/purchase-orders/1/letters-of-credit','POST',{},sales)).status).toBe(403);
    const req=await ok('/import-requisitions','POST',{businessUnitId:'Acceptance',currency:'USD',userId:999999,lines:[{itemId,quantityRequested:10,estimatedUnitPrice:100,supplierMoq:5,planningLeadTimeDays:20,demandRationale:'Replenish stock'}]});
    expect(req.requestedBy).not.toBe(999999);
    await ok(`/import-requisitions/${req.requisitionId}/submit`,'PATCH');
    expect((await request(`/import-requisitions/${req.requisitionId}/approve`,'PATCH',{},sales)).status).toBe(403);
    await ok(`/import-requisitions/${req.requisitionId}/approve`,'PATCH',{approvalNotes:'Approved test'});
    const converted=await Promise.all([request(`/import-requisitions/${req.requisitionId}/convert-to-po`,'POST',{supplierId,bankAccountId:String(bankId)}),request(`/import-requisitions/${req.requisitionId}/convert-to-po`,'POST',{supplierId,bankAccountId:String(bankId)})]);
    expect(converted.filter(r=>r.status<300)).toHaveLength(1);
    expect(converted.filter(r=>r.status===409)).toHaveLength(1);
    poId=String(converted.find(r=>r.status<300)!.body.poId);
    expect(await ok(`/purchase-orders/${poId}/compliance`)).toEqual([]);
  });

  it('persists terms, replaces schedules, blocks mismatched amounts and requires configured permits',async()=>{
    await ok(`/purchase-orders/${poId}`,'PUT',{destinationCountry:'Ethiopia',incotermsNamedPlace:'Mumbai',leadTimeDayType:'WORKING',leadTimeTrigger:'ISSUANCE_AND_ADVANCE',deliveryLeadTimeDays:5});
    const policy=await ok('/purchase-orders/import-policy');
    policy.requirements=[{destination:'Ethiopia',mode:'SEA',type:'ACCEPT_PERMIT',authority:'Acceptance Authority',checkpoint:'PO_CONFIRMATION',evidenceRequired:false}];
    await ok('/purchase-orders/import-policy','PUT',policy);
    expect((await request(`/purchase-orders/${poId}/payment-schedules`,'PUT',{milestones:[{milestoneName:'Advance',paymentPercentage:100,amountDue:50,dueDate:'2026-12-20'}]})).status).toBe(400);
    const schedule=[{milestoneName:'Advance',paymentPercentage:30,dueDate:'2026-12-20',isAdvance:true},{milestoneName:'Balance',paymentPercentage:70,dueDate:'2027-01-20',isAdvance:false}];
    const saved=await ok(`/purchase-orders/${poId}/payment-schedules`,'PUT',{milestones:schedule});
    expect(saved.map((s:any)=>Number(s.amountDue))).toEqual([300,700]);
    await ok(`/purchase-orders/${poId}/status`,'PATCH',{status:'SUBMITTED'});
    expect((await request(`/purchase-orders/${poId}/status`,'PATCH',{status:'CONFIRMED'})).status).toBe(400);
    const permit=await ok(`/purchase-orders/${poId}/compliance`,'POST',{requirementType:'ACCEPT_PERMIT',issuingAuthority:'Acceptance Authority',issueDate:'2026-01-01',expiryDate:'2099-01-01'});
    expect((await request(`/purchase-orders/${poId}/status`,'PATCH',{status:'CONFIRMED'})).status).toBe(400);
    const permitPath=`/purchase-orders/compliance/${permit.complianceRecordId}`;
    expect((await request(permitPath,'PATCH',{applicationReference:'forbidden'},sales)).status).toBe(403);
    expect((await request(permitPath,'PATCH',{status:'APPROVED'})).status).toBe(400);
    await ok(permitPath,'PATCH',{applicationReference:'APP-UPDATED',applicationDate:'2025-12-01',submissionDate:'2025-12-02',documentReference:'DOC-UPDATED'});
    const audit=await h.dataSource.query("SELECT new_value FROM audit_log WHERE entity_type='import_compliance_record' AND entity_id=$1 ORDER BY changed_at DESC LIMIT 1",[permit.complianceRecordId]);
    expect(audit[0].new_value.applicationReference).toBe('APP-UPDATED');
    await ok(`${permitPath}/status`,'PATCH',{status:'APPROVED',notes:'Verified'});
    expect((await request(permitPath,'PATCH',{documentReference:'tampered'})).status).toBe(400);
    const confirmed=await ok(`/purchase-orders/${poId}/status`,'PATCH',{status:'CONFIRMED'});
    expect(confirmed.expectedDeliveryDate).toBeNull();
    const print=await ok(`/purchase-orders/${poId}/print`);
    expect(print.grandTotal).toBe(1000);expect(print.amountInWords).toContain('One Thousand');
    const originalBank=print.bankDetails.bankName;
    await h.dataSource.query('UPDATE company_bank_account SET bank_name=$1 WHERE bank_account_id=$2',['Changed master for snapshot test',bankId]);
    expect((await ok(`/purchase-orders/${poId}/print`)).bankDetails.bankName).toBe(originalBank);
  });

  it('preserves initiated/confirmed/reversed history and prevents concurrent overpayment',async()=>{
    const po=await ok(`/purchase-orders/${poId}`);
    const advance=po.paymentSchedules.find((s:any)=>s.isAdvance);
    const first=await ok('/purchase-orders/payments/transactions','POST',{paymentScheduleId:advance.paymentScheduleId,paymentReference:`A-${suffix}`,bankName:'Bank',amountPaid:200,currency:'USD',paymentDate:'2026-11-17'});
    const second=await ok('/purchase-orders/payments/transactions','POST',{paymentScheduleId:advance.paymentScheduleId,paymentReference:`B-${suffix}`,bankName:'Bank',amountPaid:200,currency:'USD',paymentDate:'2026-11-17'});
    expect(first.status).toBe('INITIATED');
    const decisions=await Promise.all([first,second].map(t=>request(`/purchase-orders/payments/transactions/${t.paymentTransactionId}/status`,'PATCH',{status:'CONFIRMED',reason:'Bank evidence verified'})));
    expect(decisions.filter(r=>r.status<300)).toHaveLength(1);
    expect(decisions.filter(r=>r.status===400)).toHaveLength(1);
    expect((await ok(`/purchase-orders/${poId}`)).expectedDeliveryDate).toBeNull();
    const last=await ok('/purchase-orders/payments/transactions','POST',{paymentScheduleId:advance.paymentScheduleId,paymentReference:`C-${suffix}`,bankName:'Bank',amountPaid:100,currency:'USD',paymentDate:'2026-11-18'});
    await ok(`/purchase-orders/payments/transactions/${last.paymentTransactionId}/status`,'PATCH',{status:'CONFIRMED',reason:'Bank verified'});
    expect((await ok(`/purchase-orders/${poId}`)).expectedDeliveryDate).toBeTruthy();
    await ok(`/purchase-orders/payments/transactions/${last.paymentTransactionId}/status`,'PATCH',{status:'REVERSED',reason:'Bank reversal'});
    expect((await ok(`/purchase-orders/${poId}`)).expectedDeliveryDate).toBeNull();
    const report=await ok('/purchase-orders/financial-commitments');
    expect(report.byCurrency.USD.totalPaid).toBeGreaterThanOrEqual(200);
  });

  it('rejects issued L/C without both dates, and scans independent deadlines',async()=>{
    const base={lcNumber:`LC-${suffix}`,issuingBank:'Bank',amount:1000,currency:'USD',issueDate:'2026-01-01',expiryDate:'2026-11-20'};
    expect((await request(`/purchase-orders/${poId}/letters-of-credit`,'POST',base)).status).toBe(400);
    const lc=await ok(`/purchase-orders/${poId}/letters-of-credit`,'POST',{...base,status:'DRAFT'});
    expect((await request(`/purchase-orders/letters-of-credit/${lc.lcId}/status`,'PATCH',{status:'ISSUED'})).status).toBe(400);
    const issued=await ok(`/purchase-orders/${poId}/letters-of-credit`,'POST',{...base,lcNumber:`LC2-${suffix}`,latestShipmentDate:'2026-11-18'});
    await h.app.get(ShipmentsService).generateAutomatedImportAlerts();
    const rows=await h.dataSource.query('SELECT event_type FROM import_notification WHERE entity_type=$1 AND entity_id=$2',['PO_LETTER_OF_CREDIT',issued.lcId]);
    expect(rows.some(r=>r.event_type.startsWith('LC_EXPIRY'))).toBe(true);
    expect(rows.some(r=>r.event_type.startsWith('LC_SHIPMENT'))).toBe(true);
  });
});
