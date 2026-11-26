import { E2EHarness } from './e2e-helper';
import * as bcrypt from 'bcrypt';
import { ShipmentsService } from '../src/modules/shipments/services/shipments.service';

describe('Phase 5 updated Jira acceptance — isolated database',()=>{
  const h=new E2EHarness();
  let token:string,sales:string,sid:string,otherSid:string,actor:number,container:any,forwarder:any,quote:any,booking:any;
  const req=(path:string,method='GET',body?:any,auth=token)=>h.request(path,{method,body,token:auth});
  const ok=async(path:string,method='GET',body?:any)=>{const r=await req(path,method,body);if(r.status>=300)throw new Error(`${method} ${path}: ${r.status} ${r.text}`);return r.body;};
  const save=(kind:string,body:any,id?:string)=>ok(`/shipments/${sid}/logistics-records/${kind}${id?`/${id}`:''}`,id?'PUT':'POST',body);
  beforeAll(async()=>{
    if(!/^codex_phase5_acceptance_\d+$/.test(process.env.DB_NAME||'')) throw new Error('An isolated codex_phase5_acceptance_ database is required');
    await h.init();
    // Only the identities required by these tests; avoid unrelated demo/master seeding.
    await h.dataSource.query("INSERT INTO role(role_name,permissions) VALUES('ADMIN',ARRAY['ALL_PERMISSIONS']),('P5_RESTRICTED',ARRAY['PRODUCTS_VIEW']) ON CONFLICT(role_name) DO UPDATE SET permissions=EXCLUDED.permissions");
    for(const [username,password,role] of [['admin','Admin@123','ADMIN'],['salesperson','Sales@123','P5_RESTRICTED']]) {
      await h.dataSource.query(`INSERT INTO app_user(username,full_name,role_id,password_hash,is_active) SELECT $1,$1,role_id,$2,TRUE FROM role WHERE role_name=$3 ON CONFLICT(username) DO UPDATE SET password_hash=EXCLUDED.password_hash,role_id=EXCLUDED.role_id,is_active=TRUE`,[username,await bcrypt.hash(password,10),role]);
    }
    const login=await h.login('admin','Admin@123');token=login.accessToken;actor=login.user.userId;
    sales=(await h.login('salesperson','Sales@123')).accessToken;
    const rows=await h.dataSource.query("INSERT INTO shipment(shipment_number) VALUES('P5-ACCEPT-1'),('P5-ACCEPT-2') RETURNING shipment_id");
    sid=String(rows[0].shipment_id);otherSid=String(rows[1].shipment_id);
  },120000);
  afterAll(async()=>h.close());

  it('enforces access and trusted identity; retains quote validity and decisions',async()=>{
    expect((await req('/shipments/logistics-policy/config','PUT',{},sales)).status).toBe(403);
    expect((await req(`/shipments/${sid}/logistics-records/containers`,'POST',{},sales)).status).toBe(403);
    forwarder=await ok('/shipments/freight-forwarders','POST',{name:'Phase Five Forwarder',country:'Kenya',isActive:true});
    quote=await ok(`/shipments/${sid}/quotations`,'POST',{freightForwarderId:forwarder.freightForwarderId,quotationReference:'P5-Q1',quotationDate:'2026-01-01',validUntil:'2099-12-31',freightAmount:4000,currency:'USD',destinationCharges:500,estimatedTransitDays:20,additionalTerms:'Test terms',userId:999999});
    expect(Number(quote.createdBy)).toBe(Number(actor));
    expect((await req(`/shipments/${sid}/forwarder/${forwarder.freightForwarderId}`,'PATCH')).status).toBe(400);
    await ok(`/shipments/${sid}/quotations/${quote.quotationId}/select`,'POST',{selectionReason:'Best transit',userId:999999});
    expect((await req(`/shipments/${sid}/quotations/${quote.quotationId}/approve`,'POST',{approvalNotes:'Spoof exception',allowSelfApproval:true,userId:999999})).status).toBe(400);
    const config=await ok('/shipments/logistics-policy/config');
    await ok('/shipments/logistics-policy/config','PUT',{...config.policy,allowSelfApproval:true});
    await ok(`/shipments/${sid}/quotations/${quote.quotationId}/approve`,'POST',{approvalNotes:'Policy-authorized decision'});
    const overview=await ok(`/shipments/${sid}/logistics-overview`);
    expect(overview.shipment.selectedForwarder.name).toBe('Phase Five Forwarder');
    expect(overview.quotations[0].decisionHistory).toHaveLength(2);
    await ok(`/shipments/freight-forwarders/${forwarder.freightForwarderId}`,'PUT',{isActive:false});
    expect((await req(`/shipments/${sid}/forwarder/${forwarder.freightForwarderId}`,'PATCH')).status).toBe(400);
    await ok(`/shipments/freight-forwarders/${forwarder.freightForwarderId}`,'PUT',{isActive:true});
  });
  it('calculates independent deadlines, serializes duplicate creation and preserves revisions',async()=>{
    container=await save('containers',{containerNumber:'test-001',containerType:'40ft HC',freeTimeStartDate:'2026-11-10',freeTimeDays:14,dayCounting:'EXCLUSIVE',emptyReturnDueDate:'2026-11-28',payloadCapacityKg:25000,grossWeightKg:23000,loadingDate:'2026-11-01',containerStatus:'DELIVERED'});
    expect(container.freeTimeEndDate).toBe('2026-11-24');
    expect(container.containerNumber).toBe('TEST-001');
    const results=await Promise.all([req(`/shipments/${sid}/logistics-records/containers`,'POST',{containerNumber:'RACE-01',freeTimeDays:0,freeTimeStartDate:'2026-11-19'}),req(`/shipments/${sid}/logistics-records/containers`,'POST',{containerNumber:'race-01',freeTimeDays:0,freeTimeStartDate:'2026-11-19'})]);
    expect(results.filter(r=>r.status<300)).toHaveLength(1);expect(results.filter(r=>r.status===400)).toHaveLength(1);
    const revised=await save('containers',{...container,freeTimeDays:16,revisionReason:'Official extension'},container.containerId);
    expect(revised.freeTimeEndDate).toBe('2026-11-26');expect(revised.deadlineRevision).toBe(2);
    expect((await req(`/shipments/${otherSid}/logistics-records/containers/${container.containerId}`,'PUT',{...revised,revisionReason:'Wrong shipment'})).status).toBe(400);
    const overview=await ok(`/shipments/${sid}/logistics-overview`);
    const hist=overview.logisticsHistory.find((r:any)=>r.reason==='Official extension');
    expect(hist.old_value.freeTimeEndDate).toBe('2026-11-24');expect(Number(hist.changed_by)).toBe(Number(actor));
  });
  it('creates independent reminders and overdue events, deduplicates concurrent scans, stops after actual return',async()=>{
    const service=h.app.get(ShipmentsService);
    await Promise.all([service.scanContainerDeadlines(new Date('2026-11-19T10:00:00Z')),service.scanContainerDeadlines(new Date('2026-11-19T10:00:00Z'))]);
    let rows=await h.dataSource.query("SELECT * FROM import_notification WHERE entity_type='CONTAINER' AND entity_id=$1",[container.containerId]);
    expect(rows.filter(r=>r.event_type==='CONTAINER_FREE_TIME_BEFORE_7')).toHaveLength(1);
    await service.scanContainerDeadlines(new Date('2026-11-23T10:00:00Z'));
    await service.scanContainerDeadlines(new Date('2026-11-25T10:00:00Z'));
    await service.scanContainerDeadlines(new Date('2026-11-27T10:00:00Z'));
    rows=await h.dataSource.query("SELECT * FROM import_notification WHERE entity_type='CONTAINER' AND entity_id=$1",[container.containerId]);
    for(const event of ['BEFORE_7','BEFORE_3','BEFORE_1','OVERDUE']) expect(rows.filter(r=>r.event_type===`CONTAINER_FREE_TIME_${event}`)).toHaveLength(1);
    expect(rows.some(r=>r.event_type==='CONTAINER_EMPTY_RETURN_BEFORE_7')).toBe(true);
    expect(rows.every(r=>r.recipient_user_id&&r.delivery_status==='DELIVERED')).toBe(true);
    const returned=await save('containers',{actualEmptyReturnDate:'2026-11-18',revisionReason:'Empty returned with receipt'},container.containerId);
    expect(returned.containerStatus).toBe('RETURNED');
    const count=rows.length;await service.scanContainerDeadlines(new Date('2026-11-30T10:00:00Z'));
    expect((await h.dataSource.query("SELECT * FROM import_notification WHERE entity_type='CONTAINER' AND entity_id=$1",[container.containerId])).length).toBe(count);
  });
  it('updates existing bookings and retains milestone, insurance and tracking fields/history',async()=>{
    const requested=await ok(`/shipments/${otherSid}/logistics-records/bookings`,'POST',{bookingReference:'P5-REQUESTED'});
    expect(requested.bookingStatus).toBe('REQUESTED');
    booking=await save('bookings',{bookingReference:'P5-B1',vesselName:'Vessel',voyageNumber:'V1',originPort:'Origin',destinationPort:'Destination',estimatedDepartureDate:'2026-11-01',estimatedArrivalDate:'2026-12-01',bookingStatus:'CONFIRMED'});
    await save('bookings',{actualDepartureDate:'2026-11-02',revisionReason:'Carrier confirmed'},booking.bookingId);
    const milestone=await save('milestones',{milestoneName:'PRODUCTION_COMPLETED',plannedDate:'2026-11-01'});
    await save('milestones',{isCompleted:true,milestoneDate:'2026-11-02',revisionReason:'Factory confirmed'},milestone.milestoneId);
    await save('milestones',{isCompleted:false,revisionReason:'Correction'},milestone.milestoneId);
    const insurance=await save('insurance',{policyNumber:'P5-I1',insurerName:'Test Insurer',insuredValue:100000,currency:'EUR',premiumAmount:500,issueDate:'2026-01-01',validUntil:'2026-01-31',isActive:true});
    await ok(`/shipments/${sid}/insurance-requirement`,'PUT',{required:true,reason:'Contract requires insurance'});
    const tracking=await save('tracking',{documentName:'ECTN',referenceNumber:'P5-E1',status:'SUBMITTED',submissionDate:'2026-11-01',deadlineDate:'2026-11-02',shippingCutOffDate:'2026-11-03'});
    await save('tracking',{status:'APPROVED',revisionReason:'Authority approved'},tracking.trackingId);
    const overview=await ok(`/shipments/${sid}/logistics-overview`);
    expect(overview.bookings).toHaveLength(1);expect(overview.bookings[0].actualDepartureDate).toBe('2026-11-02');
    expect(overview.insurances[0].currency).toBe('EUR');expect(overview.insuranceRequired).toBe(true);
    expect(overview.logisticsActions.some((a:string)=>a.includes('Required insurance'))).toBe(true);
    expect(overview.logisticsHistory.filter((r:any)=>r.entity_type==='shipment_milestone'&&r.entity_id===milestone.milestoneId)).toHaveLength(3);
    const form=new FormData();form.append('file',new Blob(['test insurance evidence'],{type:'text/plain'}),'policy.txt');
    const upload=await h.request(`/documents/shipment_insurance/${insurance.insuranceId}/upload`,{method:'POST',token,formData:form});
    expect(upload.status).toBe(201);
    expect((await ok(`/documents/shipment_insurance/${insurance.insuranceId}`)).length).toBe(1);
    expect((await req(`/documents/${upload.body.attachmentId}`,'DELETE')).status).toBe(400);
  });
  it('blocks only configured milestone and tracking checkpoints',async()=>{
    const {policy}=await ok('/shipments/logistics-policy/config');
    await ok('/shipments/logistics-policy/config','PUT',{...policy,milestoneRules:[{destination:'',mode:'',name:'ACCEPT_READY',stage:'SHIPPED'}],trackingRules:[{destination:'',mode:'',name:'ACCEPT_ECTN',stage:'SHIPPED'}]});
    expect((await req(`/shipments/${sid}/stage`,'PATCH',{stage:'SHIPPED'})).status).toBe(400);
    await save('milestones',{milestoneName:'ACCEPT_READY',isCompleted:true,milestoneDate:'2026-11-01'});
    expect((await req(`/shipments/${sid}/stage`,'PATCH',{stage:'SHIPPED'})).status).toBe(400);
    await save('tracking',{documentName:'ACCEPT_ECTN',referenceNumber:'READY',status:'APPROVED',submissionDate:'2026-11-01'});
    await ok(`/shipments/${sid}/stage`,'PATCH',{stage:'SHIPPED'});
  });
  it('uses configured calendar timezone/offsets and retains failed-recipient history before recovery',async()=>{
    const {policy}=await ok('/shipments/logistics-policy/config');
    await h.dataSource.query("INSERT INTO role(role_name,permissions) VALUES('P5_EMPTY',ARRAY['SHIPMENTS_VIEW'])");
    await ok('/shipments/logistics-policy/config','PUT',{...policy,timezone:'Asia/Tokyo',freeTimeOffsets:[2],recipientRoles:['P5_EMPTY']});
    const c=await save('containers',{containerNumber:'TZ-001',freeTimeStartDate:'2026-11-20',freeTimeDays:2});
    const service=h.app.get(ShipmentsService);
    await service.scanContainerDeadlines(new Date('2026-11-19T20:00:00Z')); // Nov 20 locally
    let rows=await h.dataSource.query("SELECT * FROM import_notification WHERE entity_type='CONTAINER' AND entity_id=$1",[c.containerId]);
    expect(rows).toHaveLength(1);expect(rows[0].delivery_status).toBe('FAILED');
    expect(rows[0].event_type).toBe('CONTAINER_FREE_TIME_BEFORE_2');
    expect(new Date(rows[0].reminder_date).getDate()).toBe(20);
    await h.dataSource.query("INSERT INTO app_user(username,full_name,role_id,is_active) SELECT 'p5recipient','Logistics Recipient',role_id,TRUE FROM role WHERE role_name='P5_EMPTY'");
    await service.scanContainerDeadlines(new Date('2026-11-19T20:01:00Z'));
    rows=await h.dataSource.query("SELECT * FROM import_notification WHERE entity_type='CONTAINER' AND entity_id=$1",[c.containerId]);
    expect(rows).toHaveLength(2);expect(rows.some(r=>r.delivery_status==='FAILED')).toBe(true);expect(rows.some(r=>r.delivery_status==='DELIVERED'&&r.recipient_user_id)).toBe(true);
    await ok('/shipments/logistics-policy/config','PUT',policy);
  });
  it('preserves legacy expiry until an official start is supplied and validates invalid revisions',async()=>{
    const rows=await h.dataSource.query("INSERT INTO shipment_container(shipment_id,container_number,free_time_days,free_time_end_date) VALUES($1,'LEGACY-P5',14,'2026-11-24') RETURNING container_id",[sid]);
    const id=String(rows[0].container_id);
    const unchanged=await save('containers',{notes:'Historical data',revisionReason:'Notes only'},id);
    expect(unchanged.freeTimeEndDate).toBe('2026-11-24');expect(unchanged.freeTimeStartDate).toBeNull();
    expect((await req(`/shipments/${sid}/logistics-records/containers/${id}`,'PUT',{freeTimeDays:16,revisionReason:'No start'})).status).toBe(400);
    const revised=await save('containers',{freeTimeStartDate:'2026-11-10',freeTimeDays:14,dayCounting:'INCLUSIVE',revisionReason:'Line confirmed inclusive terms'},id);
    expect(revised.freeTimeEndDate).toBe('2026-11-23');
    expect((await req(`/shipments/${sid}/logistics-records/containers/${id}`,'PUT',{freeTimeDays:-1,revisionReason:'Invalid'})).status).toBe(400);
    expect((await req(`/shipments/${sid}/logistics-records/containers/${id}`,'PUT',{freeTimeDays:15})).status).toBe(400);
    expect((await req(`/shipments/${sid}/logistics-records/containers/${id}`,'PUT',{actualEmptyReturnDate:'2099-01-01',revisionReason:'Future return'})).status).toBe(400);
  });
});
