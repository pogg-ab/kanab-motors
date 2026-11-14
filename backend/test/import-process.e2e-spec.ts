import * as bcrypt from 'bcrypt';
import { E2EHarness } from './e2e-helper';

describe('Import Process Part II & Company Profile E2E (IMP-23..52)', () => {
  const harness = new E2EHarness();
  const suffix = Date.now().toString().slice(-6);

  let adminToken: string;
  let financeToken: string;
  let procurementToken: string;
  let inventoryToken: string;
  let salespersonToken: string;
  let approverToken: string;

  const cleanupIds: {
    approverUserId?: number;
    inactiveBankId?: number;
    supplierId?: number;
    poId?: string;
    shipmentIds: string[];
    forwarderIds: string[];
    chassisNumbers: string[];
  } = {
    shipmentIds: [],
    forwarderIds: [],
    chassisNumbers: [],
  };

  let sampleItemId: string;
  let sampleWarehouseId: number;
  let defaultBankId: number;
  let supplierName: string;

  beforeAll(async () => {
    await harness.init();

    const [adminAuth, financeAuth, procAuth, invAuth, salesRepAuth] = await Promise.all([
      harness.login('admin', 'Admin@123'),
      harness.login('finance', 'Finance@123'),
      harness.login('procurement', 'Procure@123'),
      harness.login('inventory', 'Inventory@123'),
      harness.login('salesperson', 'Sales@123'),
    ]);

    adminToken = adminAuth.accessToken;
    financeToken = financeAuth.accessToken;
    procurementToken = procAuth.accessToken;
    inventoryToken = invAuth.accessToken;
    salespersonToken = salesRepAuth.accessToken;

    // Create a dedicated temporary APPROVER account to verify separation-of-duties RBAC
    const approverUsername = `e2e_approver_${suffix}`;
    const roleRows = await harness.dataSource.query(
      `SELECT role_id FROM role WHERE role_name = 'APPROVER' LIMIT 1`,
    );
    const approverRoleId = roleRows[0].role_id;
    const passHash = await bcrypt.hash('Approver@123', 10);
    const insertedUser = await harness.dataSource.query(
      `INSERT INTO app_user (username, email, password_hash, full_name, role_id, is_active)
       VALUES ($1, $2, $3, $4, $5, TRUE)
       RETURNING user_id`,
      [approverUsername, `${approverUsername}@kanabmotors.com`, passHash, 'E2E Approver', approverRoleId],
    );
    cleanupIds.approverUserId = insertedUser[0].user_id;
    const approverAuth = await harness.login(approverUsername, 'Approver@123');
    approverToken = approverAuth.accessToken;

    // Lookup an active vehicle ProductItem & Warehouse
    const itemsRes = await harness.request('/products/items?limit=10', { token: adminToken });
    const items = itemsRes.body?.items || itemsRes.body || [];
    const vehicleItem = items.find((it: any) => it.isActive !== false) || items[0];
    expect(vehicleItem).toBeDefined();
    sampleItemId = String(vehicleItem.itemId);

    const whRes = await harness.request('/inventory/warehouses', { token: adminToken });
    const warehouses = whRes.body || [];
    expect(warehouses.length).toBeGreaterThan(0);
    sampleWarehouseId = Number(warehouses[0].warehouseId);
  });

  afterAll(async () => {
    try {
      const ds = harness.dataSource;
      if (cleanupIds.chassisNumbers.length > 0) {
        await ds.query(`DELETE FROM vehicle_unit WHERE chassis_number = ANY($1::text[])`, [
          cleanupIds.chassisNumbers,
        ]);
      }
      for (const sId of cleanupIds.shipmentIds) {
        await ds.query(`DELETE FROM import_notification WHERE entity_id = $1`, [String(sId)]);
        await ds.query(
          `DELETE FROM shipment_receipt WHERE shipment_line_id IN (SELECT shipment_line_id FROM shipment_line WHERE shipment_id = $1)`,
          [sId],
        );
        await ds.query(`DELETE FROM shipment WHERE shipment_id = $1`, [sId]);
      }
      if (cleanupIds.poId) {
        await ds.query(`DELETE FROM purchase_order WHERE po_id = $1`, [cleanupIds.poId]);
      }
      for (const fId of cleanupIds.forwarderIds) {
        await ds.query(`DELETE FROM freight_forwarder WHERE freight_forwarder_id = $1`, [fId]);
      }
      if (cleanupIds.supplierId) {
        await ds.query(`DELETE FROM supplier WHERE supplier_id = $1`, [cleanupIds.supplierId]);
      }
      await ds.query(`DELETE FROM shipment_document_requirement WHERE document_type LIKE 'E2E_%'`);
      if (cleanupIds.inactiveBankId) {
        await ds.query(`DELETE FROM company_bank_account WHERE bank_account_id = $1`, [
          cleanupIds.inactiveBankId,
        ]);
      }
      if (cleanupIds.approverUserId) {
        await ds.query(`DELETE FROM freight_quotation_decision_history WHERE decided_by = $1`, [
          cleanupIds.approverUserId,
        ]);
        await ds.query(`DELETE FROM audit_log WHERE changed_by = $1`, [cleanupIds.approverUserId]);
        await ds.query(`DELETE FROM app_user WHERE user_id = $1`, [cleanupIds.approverUserId]);
      }
    } finally {
      await harness.close();
    }
  });

  it('enforces Company Profile RBAC and prioritizes active default importer bank account', async () => {
    // Unauthenticated requests blocked with 401
    expect((await harness.request('/company-profile')).status).toBe(401);
    expect((await harness.request('/company-profile/bank-accounts')).status).toBe(401);
    expect((await harness.request('/purchase-orders/company-profile')).status).toBe(401);
    expect((await harness.request('/purchase-orders/bank-accounts')).status).toBe(401);

    // Unauthorized roles blocked with 403
    expect((await harness.request('/company-profile', { token: salespersonToken })).status).toBe(403);
    expect((await harness.request('/company-profile/bank-accounts', { token: inventoryToken })).status).toBe(403);
    expect((await harness.request('/purchase-orders/bank-accounts', { token: salespersonToken })).status).toBe(403);

    // Procurement can view Company Profile & banks, but cannot modify them
    const procView = await harness.request('/company-profile', { token: procurementToken });
    expect(procView.status).toBe(200);
    expect(procView.body?.companyName).toBeTruthy();

    const procEditAttempt = await harness.request(`/company-profile/${procView.body.profileId}`, {
      method: 'PUT',
      token: procurementToken,
      body: { companyName: 'Unauthorized Change' },
    });
    expect(procEditAttempt.status).toBe(403);

    // Finance Manager can view & manage Company Profile and Bank Accounts
    const finView = await harness.request('/company-profile', { token: financeToken });
    expect(finView.status).toBe(200);

    const inactiveBankRes = await harness.request('/company-profile/bank-accounts', {
      method: 'POST',
      token: financeToken,
      body: {
        accountName: `E2E INACTIVE BANK ${suffix}`,
        bankName: 'E2E Test Bank',
        accountNumber: `999${suffix}`,
        currency: 'USD',
        isDefault: false,
        isActive: false,
        status: 'INACTIVE',
      },
    });
    expect([200, 201]).toContain(inactiveBankRes.status);
    cleanupIds.inactiveBankId = inactiveBankRes.body.bankAccountId;

    // PO bank-accounts endpoint must exclude inactive accounts and return active default first
    const poBanksRes = await harness.request('/purchase-orders/bank-accounts', {
      token: procurementToken,
    });
    expect(poBanksRes.status).toBe(200);
    const activeBanks: any[] = poBanksRes.body;
    expect(activeBanks.length).toBeGreaterThan(0);
    expect(activeBanks.some((b) => Number(b.bankAccountId) === Number(cleanupIds.inactiveBankId))).toBe(false);
    const defaultBank = activeBanks.find((b) => b.isDefault && b.isActive);
    expect(defaultBank).toBeDefined();
    expect(Number(activeBanks[0].bankAccountId)).toBe(Number(defaultBank.bankAccountId));
    defaultBankId = Number(defaultBank.bankAccountId);
  });

  it('executes full import workflow: PO, partial payments, partial shipments, separated quotation approval, document expiry/missing checks, stage blocks, receiving, filtering & CSV export', async () => {
    // 1. Create Supplier with Exporter IEC & AD code
    supplierName = `E2E Auto Exporter ${suffix}`;
    const suppRes = await harness.request('/suppliers', {
      method: 'POST',
      token: procurementToken,
      body: {
        supplierName,
        country: 'India',
        contactPerson: 'Rajesh Export',
        exporterIecNo: `IEC-${suffix}`,
        exporterAdCode: `AD-${suffix}`,
      },
    });
    expect([200, 201]).toContain(suppRes.status);
    cleanupIds.supplierId = suppRes.body.supplierId;

    // 2. Create, Submit & Confirm Purchase Order (qty 3)
    const poRes = await harness.request('/purchase-orders', {
      method: 'POST',
      token: procurementToken,
      body: {
        supplierId: cleanupIds.supplierId,
        currency: 'USD',
        bankAccountId: defaultBankId,
        incoterms: 'FOB',
        portOfLoading: 'Nhava Sheva, India',
        portOfDischarge: 'Djibouti / Modjo Dry Port',
        modeOfShipment: 'SEA',
        lines: [{ itemId: sampleItemId, quantityOrdered: 3, unitPrice: 2500 }],
      },
    });
    expect([200, 201]).toContain(poRes.status);
    cleanupIds.poId = String(poRes.body.poId);
    const poLineId = String(poRes.body.lines[0].poLineId);

    const submitPoRes = await harness.request(`/purchase-orders/${cleanupIds.poId}/status`, {
      method: 'PATCH',
      token: procurementToken,
      body: { status: 'SUBMITTED' },
    });
    expect(submitPoRes.status).toBe(200);

    const confirmRes = await harness.request(`/purchase-orders/${cleanupIds.poId}/status`, {
      method: 'PATCH',
      token: procurementToken,
      body: { status: 'CONFIRMED' },
    });
    expect(confirmRes.status).toBe(200);

    // 3. Partial Payment Schedule + Partial Payment Transaction ($2,500 of $7,500)
    const poDetailRes = await harness.request(`/purchase-orders/${cleanupIds.poId}`, { token: financeToken });
    const existingSchedules = poDetailRes.body?.paymentSchedules || [];
    let paymentScheduleId: string;
    const eligibleSchedule = existingSchedules.find((s: any) => Number(s.amountDue || 0) >= 2500);
    if (eligibleSchedule) {
      paymentScheduleId = String(eligibleSchedule.paymentScheduleId);
    } else {
      const schedRes = await harness.request(`/purchase-orders/${cleanupIds.poId}/payment-schedules`, {
        method: 'POST',
        token: financeToken,
        body: {
          milestoneName: 'Balance PO Milestone',
          paymentMethod: 'TELEGRAPHIC_TRANSFER',
          amountDue: 7500,
          currency: 'USD',
          dueDate: '2026-12-31',
        },
      });
      expect([200, 201]).toContain(schedRes.status);
      paymentScheduleId = String(schedRes.body.paymentScheduleId);
    }

    const txnRes = await harness.request('/purchase-orders/payments/transactions', {
      method: 'POST',
      token: financeToken,
      body: {
        paymentScheduleId,
        paymentReference: `TT-E2E-${suffix}`,
        amountPaid: 2500,
        currency: 'USD',
        bankName: 'Commercial Bank of Ethiopia',
      },
    });
    expect([200, 201]).toContain(txnRes.status);

    // 4. Create 2 Freight Forwarders
    const fwd1Res = await harness.request('/shipments/freight-forwarders', {
      method: 'POST',
      token: procurementToken,
      body: { name: `E2E Forwarder One ${suffix}`, country: 'Djibouti' },
    });
    const fwd2Res = await harness.request('/shipments/freight-forwarders', {
      method: 'POST',
      token: procurementToken,
      body: { name: `E2E Forwarder Two ${suffix}`, country: 'Ethiopia' },
    });
    expect([200, 201]).toContain(fwd1Res.status);
    expect([200, 201]).toContain(fwd2Res.status);
    cleanupIds.forwarderIds.push(fwd1Res.body.freightForwarderId, fwd2Res.body.freightForwarderId);

    // 5. Partial Shipments (2 + 1 = 3 ordered; fourth fails)
    const shp1Res = await harness.request('/shipments', {
      method: 'POST',
      token: procurementToken,
      body: {
        expectedArrivalDate: '2026-11-20',
        billOfLadingNumber: `BL-E2E-1-${suffix}`,
        lines: [{ poLineId, quantityShipped: 2 }],
      },
    });
    expect([200, 201]).toContain(shp1Res.status);
    const shp1Id = String(shp1Res.body.shipmentId);
    const shp1LineId = String(shp1Res.body.lines[0].shipmentLineId);
    cleanupIds.shipmentIds.push(shp1Id);

    const shp2Res = await harness.request('/shipments', {
      method: 'POST',
      token: procurementToken,
      body: {
        expectedArrivalDate: '2026-11-25',
        billOfLadingNumber: `BL-E2E-2-${suffix}`,
        lines: [{ poLineId, quantityShipped: 1 }],
      },
    });
    expect([200, 201]).toContain(shp2Res.status);
    const shp2Id = String(shp2Res.body.shipmentId);
    cleanupIds.shipmentIds.push(shp2Id);

    const overShipRes = await harness.request('/shipments', {
      method: 'POST',
      token: procurementToken,
      body: { lines: [{ poLineId, quantityShipped: 1 }] },
    });
    expect(overShipRes.status).toBe(400);

    // 6. Quotations & Separate Approval Workflow (IMP-24 & IMP-25)
    const q1Res = await harness.request(`/shipments/${shp1Id}/quotations`, {
      method: 'POST',
      token: procurementToken,
      body: {
        freightForwarderId: String(fwd1Res.body.freightForwarderId),
        quotationReference: `QT-A-${suffix}`,
        freightAmount: 3100,
        currency: 'USD',
        estimatedTransitDays: 18,
      },
    });
    const q2Res = await harness.request(`/shipments/${shp1Id}/quotations`, {
      method: 'POST',
      token: procurementToken,
      body: {
        freightForwarderId: String(fwd2Res.body.freightForwarderId),
        quotationReference: `QT-B-${suffix}`,
        freightAmount: 3900,
        currency: 'USD',
        estimatedTransitDays: 22,
      },
    });
    expect([200, 201]).toContain(q1Res.status);
    expect([200, 201]).toContain(q2Res.status);

    // Procurement selects Q1 -> PENDING approval, forwarder NOT yet assigned
    const selectRes = await harness.request(
      `/shipments/${shp1Id}/quotations/${q1Res.body.quotationId}/select`,
      {
        method: 'POST',
        token: procurementToken,
        body: { selectionReason: 'Lowest freight cost and shortest transit time' },
      },
    );
    expect([200, 201]).toContain(selectRes.status);
    expect(selectRes.body.selectionStatus).toBe('SELECTED');
    expect(selectRes.body.approvalStatus).toBe('PENDING');

    const shpBeforeApproval = await harness.request(`/shipments/${shp1Id}`, { token: procurementToken });
    expect(shpBeforeApproval.body.selectedForwarderId).toBeNull();

    // Procurement cannot approve
    const forbiddenApprove = await harness.request(
      `/shipments/${shp1Id}/quotations/${q1Res.body.quotationId}/approve`,
      {
        method: 'POST',
        token: procurementToken,
        body: { approvalNotes: 'Trying self approval without permission' },
      },
    );
    expect(forbiddenApprove.status).toBe(403);

    // Authorized APPROVER approves Q1 -> APPROVED, assigns selectedForwarderId, rejects Q2
    const approveRes = await harness.request(
      `/shipments/${shp1Id}/quotations/${q1Res.body.quotationId}/approve`,
      {
        method: 'POST',
        token: approverToken,
        body: { approvalNotes: 'Approved for E2E import run' },
      },
    );
    expect([200, 201]).toContain(approveRes.status);
    expect(approveRes.body.approvalStatus).toBe('APPROVED');

    const shpAfterApproval = await harness.request(`/shipments/${shp1Id}`, { token: procurementToken });
    expect(String(shpAfterApproval.body.selectedForwarderId)).toBe(
      String(fwd1Res.body.freightForwarderId),
    );

    const quotesList = await harness.request(`/shipments/${shp1Id}/quotations`, { token: procurementToken });
    const q1Final = quotesList.body.find((q: any) => String(q.quotationId) === String(q1Res.body.quotationId));
    const q2Final = quotesList.body.find((q: any) => String(q.quotationId) === String(q2Res.body.quotationId));
    expect(q2Final.selectionStatus).toBe('REJECTED');
    expect(q1Final.decisionHistory.length).toBeGreaterThanOrEqual(2);

    // Test Reject flow on Shipment 2
    const shp2Q = await harness.request(`/shipments/${shp2Id}/quotations`, {
      method: 'POST',
      token: procurementToken,
      body: {
        freightForwarderId: String(fwd2Res.body.freightForwarderId),
        freightAmount: 4500,
        currency: 'USD',
      },
    });
    await harness.request(`/shipments/${shp2Id}/quotations/${shp2Q.body.quotationId}/select`, {
      method: 'POST',
      token: procurementToken,
      body: { selectionReason: 'Single bid test' },
    });
    const rejRes = await harness.request(
      `/shipments/${shp2Id}/quotations/${shp2Q.body.quotationId}/reject`,
      {
        method: 'POST',
        token: approverToken,
        body: { rejectionReason: 'Tariff too high vs benchmark' },
      },
    );
    expect([200, 201]).toContain(rejRes.status);
    expect(rejRes.body.approvalStatus).toBe('REJECTED');

    // 7. Booking, Container, Insurance
    expect(
      (
        await harness.request(`/shipments/${shp1Id}/bookings`, {
          method: 'POST',
          token: procurementToken,
          body: {
            bookingReference: `BK-E2E-${suffix}`,
            vesselName: 'MV KANAB VOYAGER',
            voyageNumber: 'V26-01',
            originPort: 'Nhava Sheva',
            destinationPort: 'Djibouti / Modjo Dry Port',
            bookingStatus: 'CONFIRMED',
          },
        })
      ).status,
    ).toBeLessThan(300);

    // 8. Stage transitions + Document Completeness (MISSING & Date-Derived EXPIRED)
    expect(
      (
        await harness.request(`/shipments/${shp1Id}/stage`, {
          method: 'PATCH',
          token: procurementToken,
          body: { stage: 'SHIPPED' },
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await harness.request(`/shipments/${shp1Id}/stage`, {
          method: 'PATCH',
          token: procurementToken,
          body: { stage: 'AT_DJIBOUTI_PORT' },
        })
      ).status,
    ).toBe(200);

    // Future-stage requirements (ETHIOPIAN_CUSTOMS_CLEARANCE / RECEIVED) must NOT trigger false MISSING rows at AT_DJIBOUTI_PORT
    const docReportBeforeStage = await harness.request(
      `/shipments/reports/document-completeness?shipmentId=${shp1Id}`,
      { token: adminToken },
    );
    expect(docReportBeforeStage.status).toBe(200);
    expect(docReportBeforeStage.body.missingCount).toBe(0);

    // Stage-applicable + country-matched rule ('Ethiopia' matches importer country, 'Kenya' does not even if destinationPort is Djibouti)
    await harness.dataSource.query(
      `INSERT INTO shipment_document_requirement(destination_country, shipment_type, process_stage, document_type, is_required, requires_verification, is_active)
       VALUES
         ('Ethiopia', 'SEA', 'AT_DJIBOUTI_PORT', 'E2E_ETHIOPIA_PACKING_LIST', TRUE, TRUE, TRUE),
         ('Kenya', 'SEA', 'AT_DJIBOUTI_PORT', 'E2E_KENYA_IDF', TRUE, TRUE, TRUE)
       ON CONFLICT DO NOTHING`,
    );

    const docReportMissing = await harness.request(
      `/shipments/reports/document-completeness?shipmentId=${shp1Id}`,
      { token: adminToken },
    );
    expect(docReportMissing.status).toBe(200);
    expect(docReportMissing.body.missingCount).toBe(1);
    expect(docReportMissing.body.documents.some((d: any) => d.documentType === 'E2E_ETHIOPIA_PACKING_LIST')).toBe(true);
    expect(docReportMissing.body.documents.some((d: any) => d.documentType === 'E2E_KENYA_IDF')).toBe(false);

    // Advancing to customs without verified CUSTOMS_DECLARATION must fail (IMP-51)
    const blockedCustoms = await harness.request(`/shipments/${shp1Id}/stage`, {
      method: 'PATCH',
      token: procurementToken,
      body: { stage: 'ETHIOPIAN_CUSTOMS_CLEARANCE' },
    });
    expect(blockedCustoms.status).toBe(400);

    // Record COMMERCIAL_INVOICE with past expiryDate marked VERIFIED -> report must classify EXPIRED
    const expiredDocRes = await harness.request(`/shipments/${shp1Id}/documents-control`, {
      method: 'POST',
      token: procurementToken,
      body: {
        documentType: 'COMMERCIAL_INVOICE',
        documentReference: `CI-EXP-${suffix}`,
        issueDate: '2019-01-01',
        expiryDate: '2020-01-01',
        verificationStatus: 'VERIFIED',
      },
    });
    expect([200, 201]).toContain(expiredDocRes.status);

    const docReportExpired = await harness.request(
      `/shipments/reports/document-completeness?shipmentId=${shp1Id}`,
      { token: adminToken },
    );
    expect(docReportExpired.body.statusCounts.EXPIRED).toBeGreaterThanOrEqual(1);
    const expiredRow = docReportExpired.body.documents.find(
      (d: any) => d.documentType === 'COMMERCIAL_INVOICE',
    );
    expect(expiredRow.verificationStatus).toBe('EXPIRED');
    expect(expiredRow.isExpired).toBe(true);

    // Monitoring dashboard reflects applicable missing & expired counts
    const monDash = await harness.request('/shipments/reports/monitoring-dashboard', {
      token: adminToken,
    });
    expect(monDash.status).toBe(200);
    expect(monDash.body.missingDocumentsCount).toBeGreaterThanOrEqual(1);
    expect(monDash.body.expiredDocumentsCount).toBeGreaterThanOrEqual(1);

    await harness.dataSource.query(`DELETE FROM shipment_document_requirement WHERE document_type LIKE 'E2E_%'`);

    // Fix expired COMMERCIAL_INVOICE & add valid verified CUSTOMS_DECLARATION & BILL_OF_LADING
    await harness.request(`/shipments/documents-control/${expiredDocRes.body.shipmentDocumentId}/verify`, {
      method: 'PATCH',
      token: procurementToken,
      body: { status: 'REJECTED', notes: 'Superseded expired doc' },
    });
    await harness.dataSource.query(
      `UPDATE shipment_document SET expiry_date = '2029-12-31', verification_status = 'VERIFIED' WHERE shipment_document_id = $1`,
      [expiredDocRes.body.shipmentDocumentId],
    );
    for (const docType of ['CUSTOMS_DECLARATION', 'BILL_OF_LADING']) {
      const docRes = await harness.request(`/shipments/${shp1Id}/documents-control`, {
        method: 'POST',
        token: procurementToken,
        body: {
          documentType: docType,
          documentReference: `${docType.slice(0, 3)}-${suffix}`,
          issueDate: '2026-01-10',
          expiryDate: '2029-12-31',
          verificationStatus: 'VERIFIED',
        },
      });
      expect([200, 201]).toContain(docRes.status);
    }

    // Complete stage transitions through RECEIVED (PROCUREMENT holds SHIPMENTS_UPDATE_STAGE; INVENTORY performs physical receipt)
    for (const stage of ['ETHIOPIAN_CUSTOMS_CLEARANCE', 'IN_TRANSIT_INLAND', 'RECEIVED']) {
      const advRes = await harness.request(`/shipments/${shp1Id}/stage`, {
        method: 'PATCH',
        token: procurementToken,
        body: { stage },
      });
      expect(advRes.status).toBe(200);
    }

    // Receive 2 physical units on Shipment 1 into yard
    const chs1 = `E2E-CHS-${suffix}-1`;
    const chs2 = `E2E-CHS-${suffix}-2`;
    cleanupIds.chassisNumbers.push(chs1, chs2);
    const recvRes = await harness.request(`/shipments/${shp1Id}/receive`, {
      method: 'POST',
      token: inventoryToken,
      body: {
        shipmentLineId: shp1LineId,
        quantityReceived: 2,
        warehouseId: sampleWarehouseId,
        vehicles: [
          { chassisNumber: chs1, engineNumber: `E2E-ENG-${suffix}-1` },
          { chassisNumber: chs2, engineNumber: `E2E-ENG-${suffix}-2` },
        ],
      },
    });
    expect([200, 201]).toContain(recvRes.status);

    // 9. Pipeline Filtering, CSV Exports & Reconciliation (IMP-43, IMP-47, IMP-52)
    const pipeFiltered = await harness.request(
      `/shipments/reports/pipeline?supplier=${encodeURIComponent(supplierName)}&status=RECEIVED`,
      { token: adminToken },
    );
    expect(pipeFiltered.status).toBe(200);
    expect(pipeFiltered.body.totalShipments).toBe(1);
    expect(String(pipeFiltered.body.shipments[0].shipmentId)).toBe(shp1Id);

    // CSV export permission & content checks
    expect(
      (
        await harness.request('/shipments/reports/pipeline/export', {
          token: salespersonToken,
        })
      ).status,
    ).toBe(403);

    for (const exportEndpoint of [
      `/shipments/reports/pipeline/export?supplier=${encodeURIComponent(supplierName)}`,
      `/shipments/reports/document-completeness/export?shipmentId=${shp1Id}`,
      '/shipments/reports/logistics/export',
      '/shipments/reports/reconciliation/export',
    ]) {
      const csvRes = await harness.request(exportEndpoint, { token: adminToken });
      expect(csvRes.status).toBe(200);
      expect(csvRes.headers.get('content-type')).toContain('text/csv');
      expect(csvRes.text.length).toBeGreaterThan(20);
    }

    // Import Reconciliation confirms ordered=3, shipped=3 (partial shipments), received=2, confirmedPayments=2500
    const reconRes = await harness.request('/shipments/reports/reconciliation', { token: adminToken });
    expect(reconRes.status).toBe(200);
    const poRecon = reconRes.body.find((r: any) => String(r.poId) === cleanupIds.poId);
    expect(poRecon).toBeDefined();
    expect(poRecon.orderedQuantity).toBe(3);
    expect(poRecon.shippedQuantity).toBe(3);
    expect(poRecon.receivedQuantity).toBe(2);
    expect(poRecon.outstandingQuantity).toBe(1);
    expect(poRecon.varianceStatus).toBe('UNDER_RECEIVED');
    expect(poRecon.confirmedPayments).toBe(2500);
    expect(poRecon.outstandingPayment).toBe(5000);
  });
});

