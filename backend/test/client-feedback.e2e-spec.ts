import * as fs from 'fs';
import * as path from 'path';
import { E2EHarness } from './e2e-helper';

describe('Client Feedback Backlog E2E (KMS-FB-01..17)', () => {
  const harness = new E2EHarness();
  const suffix = Date.now().toString().slice(-6);

  let adminToken: string;
  let financeToken: string;
  let salesManagerToken: string;
  let salesRepToken: string;
  let inventoryToken: string;
  let procurementToken: string;

  let sampleItemId: string;
  let warehouse1Id: number;
  let warehouse2Id: number;
  let categoryId: number;
  let uomId: number;

  const cleanup = {
    customerIds: [] as string[],
    bookingIds: [] as string[],
    enquiryIds: [] as string[],
    paymentIds: [] as string[],
    refundIds: [] as string[],
    sparePartId: '' as string,
    sparePartSaleId: '' as string,
    requisitionId: '' as string,
    attachmentIds: [] as string[],
    uploadedFiles: [] as string[],
    chassisNumbers: [] as string[],
    transferIds: [] as string[],
    adjustmentIds: [] as string[],
  };

  beforeAll(async () => {
    await harness.init();

    const [adminA, finA, salesMgrA, salesRepA, invA, procA] = await Promise.all([
      harness.login('admin', 'Admin@123'),
      harness.login('finance', 'Finance@123'),
      harness.login('sales', 'Sales@123'),
      harness.login('salesperson', 'Sales@123'),
      harness.login('inventory', 'Inventory@123'),
      harness.login('procurement', 'Procure@123'),
    ]);

    adminToken = adminA.accessToken;
    financeToken = finA.accessToken;
    salesManagerToken = salesMgrA.accessToken;
    salesRepToken = salesRepA.accessToken;
    inventoryToken = invA.accessToken;
    procurementToken = procA.accessToken;

    const itemsRes = await harness.request('/products/items?limit=10', { token: adminToken });
    const items = itemsRes.body?.items || itemsRes.body || [];
    const activeItem = items.find((i: any) => i.isActive !== false) || items[0];
    expect(activeItem).toBeDefined();
    sampleItemId = String(activeItem.itemId);

    const catsRes = await harness.request('/products/categories', { token: adminToken });
    categoryId = Number((catsRes.body || [])[0]?.categoryId || 1);

    const uomsRes = await harness.request('/lookups/uoms', { token: adminToken });
    uomId = Number((uomsRes.body || [])[0]?.uomId || 1);

    const whRes = await harness.request('/inventory/warehouses', { token: adminToken });
    const whs = whRes.body || [];
    expect(whs.length).toBeGreaterThanOrEqual(1);
    warehouse1Id = Number(whs[0].warehouseId);
    warehouse2Id = Number((whs[1] || whs[0]).warehouseId);
  });

  afterAll(async () => {
    try {
      const ds = harness.dataSource;
      for (const f of cleanup.uploadedFiles) {
        const abs = path.resolve(process.cwd(), f);
        if (fs.existsSync(abs)) {
          try {
            fs.unlinkSync(abs);
          } catch {
            // ignore
          }
        }
      }
      if (cleanup.attachmentIds.length > 0) {
        await ds.query(`DELETE FROM attachment WHERE attachment_id = ANY($1::bigint[])`, [
          cleanup.attachmentIds,
        ]);
      }
      if (cleanup.refundIds.length > 0) {
        await ds.query(`DELETE FROM customer_refund WHERE refund_id = ANY($1::bigint[])`, [
          cleanup.refundIds,
        ]);
      }
      if (cleanup.paymentIds.length > 0) {
        await ds.query(`DELETE FROM customer_payment_transfer WHERE source_booking_id = ANY($1::bigint[]) OR destination_booking_id = ANY($1::bigint[])`, [
          cleanup.bookingIds,
        ]);
        await ds.query(`DELETE FROM customer_ledger_transaction WHERE related_receipt_id = ANY($1::bigint[])`, [
          cleanup.paymentIds,
        ]);
        await ds.query(`DELETE FROM customer_payment WHERE payment_id = ANY($1::bigint[])`, [
          cleanup.paymentIds,
        ]);
      }
      if (cleanup.bookingIds.length > 0) {
        await ds.query(
          `DELETE FROM allotment_line WHERE allotment_id IN (SELECT allotment_id FROM allotment WHERE booking_id = ANY($1::bigint[]))`,
          [cleanup.bookingIds],
        );
        await ds.query(
          `DELETE FROM allotment WHERE booking_id = ANY($1::bigint[])`,
          [cleanup.bookingIds],
        );
      }
      if (cleanup.chassisNumbers.length > 0) {
        await ds.query(`DELETE FROM vehicle_unit WHERE chassis_number = ANY($1::text[])`, [
          cleanup.chassisNumbers,
        ]);
      }
      if (cleanup.bookingIds.length > 0) {
        await ds.query(`DELETE FROM customer_ledger_transaction WHERE related_booking_id = ANY($1::bigint[])`, [
          cleanup.bookingIds,
        ]);
        await ds.query(`DELETE FROM booking WHERE booking_id = ANY($1::bigint[])`, [
          cleanup.bookingIds,
        ]);
      }
      if (cleanup.enquiryIds.length > 0) {
        await ds.query(`DELETE FROM pre_advance_slip WHERE enquiry_id = ANY($1::bigint[])`, [
          cleanup.enquiryIds,
        ]);
        await ds.query(`DELETE FROM sales_enquiry WHERE enquiry_id = ANY($1::bigint[])`, [
          cleanup.enquiryIds,
        ]);
      }
      if (cleanup.customerIds.length > 0) {
        await ds.query(`DELETE FROM customer_ledger_transaction WHERE customer_id = ANY($1::bigint[])`, [
          cleanup.customerIds,
        ]);
        await ds.query(`DELETE FROM customer WHERE customer_id = ANY($1::bigint[])`, [
          cleanup.customerIds,
        ]);
      }
      if (cleanup.adjustmentIds.length > 0) {
        await ds.query(`DELETE FROM stock_adjustment WHERE adjustment_id = ANY($1::bigint[])`, [
          cleanup.adjustmentIds,
        ]);
      }
      if (cleanup.sparePartSaleId) {
        await ds.query(`DELETE FROM spare_parts_sale WHERE sale_id = $1`, [cleanup.sparePartSaleId]);
      }
      if (cleanup.sparePartId) {
        await ds.query(`DELETE FROM stock_adjustment WHERE item_id = $1`, [cleanup.sparePartId]);
        await ds.query(`DELETE FROM stock_receipt WHERE item_id = $1`, [cleanup.sparePartId]);
        await ds.query(`DELETE FROM stock_balance WHERE item_id = $1`, [cleanup.sparePartId]);
        await ds.query(`DELETE FROM product_item WHERE item_id = $1`, [cleanup.sparePartId]);
      }
      if (cleanup.requisitionId) {
        await ds.query(`DELETE FROM import_requisition WHERE requisition_id = $1`, [
          cleanup.requisitionId,
        ]);
      }
      if (cleanup.transferIds.length > 0) {
        await ds.query(`DELETE FROM stock_transfer WHERE transfer_id = ANY($1::bigint[])`, [
          cleanup.transferIds,
        ]);
      }
    } finally {
      await harness.close();
    }
  });

  const uploadSampleFile = async (entityType: string, entityId: string, token: string, docType: string) => {
    const fd = new FormData();
    fd.append('file', new Blob([`E2E sample file for ${entityType} ${entityId}`], { type: 'text/plain' }), 'sample.txt');
    fd.append('documentType', docType);
    const res = await harness.request(`/documents/${entityType}/${entityId}/upload`, {
      method: 'POST',
      token,
      formData: fd,
    });
    expect([200, 201]).toContain(res.status);
    cleanup.attachmentIds.push(String(res.body.attachmentId));
    if (res.body.filePath) cleanup.uploadedFiles.push(res.body.filePath);
    return res.body;
  };

  it('supports attachments across Booking, BRV, and Refunds + cross-customer excess transfer (KMS-FB-01, 02, 03, 05)', async () => {
    const cust1Res = await harness.request('/customers', {
      method: 'POST',
      token: salesRepToken,
      body: {
        customerType: 'DIRECT_POS',
        fullName: `E2E Customer One ${suffix}`,
        mobileNumber: `+251911${suffix.padStart(6, '0').slice(0, 6)}`,
        addressTown: 'Addis Ababa',
      },
    });
    const cust2Res = await harness.request('/customers', {
      method: 'POST',
      token: salesRepToken,
      body: {
        customerType: 'DIRECT_POS',
        fullName: `E2E Customer Two ${suffix}`,
        mobileNumber: `+251922${suffix.padStart(6, '0').slice(0, 6)}`,
        addressTown: 'Adama',
      },
    });
    expect([200, 201]).toContain(cust1Res.status);
    expect([200, 201]).toContain(cust2Res.status);
    const cust1Id = String(cust1Res.body.customerId);
    const cust2Id = String(cust2Res.body.customerId);
    cleanup.customerIds.push(cust1Id, cust2Id);

    // KMS-FB-01: Pre-submission draft attachment -> booking -> claim (attachment.entity_id is bigint)
    const draftId = String(900000000 + Number(suffix));
    await uploadSampleFile('booking_draft', draftId, salesRepToken, 'ADVANCE_BOOKING_DOC');

    const bkg1Res = await harness.request('/bookings', {
      method: 'POST',
      token: salesRepToken,
      body: {
        customerId: cust1Id,
        itemId: sampleItemId,
        quantity: 1,
        unitPrice: 100000,
        requiredAdvanceAmount: 20000,
        salespersonName: 'Yared Sales Representative',
      },
    });
    const bkg2Res = await harness.request('/bookings', {
      method: 'POST',
      token: salesRepToken,
      body: {
        customerId: cust2Id,
        itemId: sampleItemId,
        quantity: 1,
        unitPrice: 120000,
        requiredAdvanceAmount: 50000,
        salespersonName: 'Yared Sales Representative',
      },
    });
    expect([200, 201]).toContain(bkg1Res.status);
    expect([200, 201]).toContain(bkg2Res.status);
    const bkg1Id = String(bkg1Res.body.bookingId);
    const bkg2Id = String(bkg2Res.body.bookingId);
    cleanup.bookingIds.push(bkg1Id, bkg2Id);

    const claimRes = await harness.request(`/documents/draft/${draftId}/claim/booking/${bkg1Id}`, {
      method: 'POST',
      token: salesRepToken,
    });
    expect([200, 201]).toContain(claimRes.status);

    const bkgDocs = await harness.request(`/documents/booking/${bkg1Id}`, { token: salesRepToken });
    expect(bkgDocs.status).toBe(200);
    expect(bkgDocs.body.length).toBeGreaterThanOrEqual(1);

    // KMS-FB-02: BRV payment exceeding booking 1 total (100,000) -> 130,000 => 30,000 excess
    const payRes = await harness.request('/payments', {
      method: 'POST',
      token: financeToken,
      body: {
        bookingId: bkg1Id,
        customerId: cust1Id,
        instrumentType: 'BANK_DEPOSIT',
        bankName: 'Commercial Bank of Ethiopia',
        amount: 130000,
        referenceNumber: `BRV-E2E-${suffix}`,
      },
    });
    expect([200, 201]).toContain(payRes.status);
    const payId = String(payRes.body.paymentId);
    cleanup.paymentIds.push(payId);

    await uploadSampleFile('payment', payId, financeToken, 'BANK_RECEIPT_SLIP');
    const confirmPayRes = await harness.request(`/payments/${payId}/confirm`, {
      method: 'PATCH',
      token: financeToken,
      body: {},
    });
    expect(confirmPayRes.status).toBe(200);

    // KMS-FB-05: Transfer excess across customers (Booking 1 Customer 1 -> Booking 2 Customer 2)
    const xferRes = await harness.request('/payments/transfer-excess', {
      method: 'POST',
      token: financeToken,
      body: {
        sourceBookingId: bkg1Id,
        destinationBookingId: bkg2Id,
        destinationCustomerId: cust2Id,
        transferAmount: 15000,
        transferReason: 'Cross-customer authorized excess transfer E2E',
        authorizationReference: `AUTH-XFER-${suffix}`,
      },
    });
    expect([200, 201]).toContain(xferRes.status);

    const transfersList = await harness.request(`/payments/transfers/${bkg1Id}`, { token: financeToken });
    expect(transfersList.status).toBe(200);
    expect(transfersList.body.length).toBeGreaterThanOrEqual(1);

    // Route remaining excess (15,000) to REFUNDABLE balance so SRS §7.4 refund check allows 5,000 refund
    const routeRes = await harness.request(`/excess/customers/${cust1Id}/route`, {
      method: 'POST',
      token: financeToken,
      body: {
        amount: 15000,
        routeTo: 'REFUNDABLE',
        notes: 'Route excess funds for E2E refund verification',
      },
    });
    expect([200, 201]).toContain(routeRes.status);

    // KMS-FB-03: Refund request + attachment + review + approve
    const refRes = await harness.request('/refunds', {
      method: 'POST',
      token: financeToken,
      body: {
        customerId: cust1Id,
        bookingId: bkg1Id,
        originalPaymentReference: `BRV-E2E-${suffix}`,
        refundReason: 'Remaining excess refund E2E',
        refundAmount: 5000,
        refundMethod: 'BANK_TRANSFER',
      },
    });
    expect([200, 201]).toContain(refRes.status);
    const refundId = String(refRes.body.refundId);
    cleanup.refundIds.push(refundId);

    await uploadSampleFile('refund', refundId, financeToken, 'REFUND_SUPPORTING_DOC');
    const refDocs = await harness.request(`/documents/refund/${refundId}`, { token: financeToken });
    expect(refDocs.body.length).toBeGreaterThanOrEqual(1);
    expect((await harness.request(`/refunds/${refundId}/review`, { method: 'PATCH', token: financeToken, body: {} })).status).toBe(200);
    expect((await harness.request(`/refunds/${refundId}/approve`, { method: 'PATCH', token: adminToken, body: {} })).status).toBe(200);
  });

  it('tracks Customer-Owned Vehicle Stock Custody & excludes from sellable allotments (KMS-FB-06)', async () => {
    const custRes = await harness.request('/customers', {
      method: 'POST',
      token: salesRepToken,
      body: {
        customerType: 'DEALER',
        fullName: `E2E Custody Fleet ${suffix}`,
        mobileNumber: `+251933${suffix.padStart(6, '0').slice(0, 6)}`,
        tinNumber: `99${suffix.padStart(8, '0').slice(0, 8)}`,
        addressTown: 'Hawassa',
      },
    });
    const customerId = String(custRes.body.customerId);
    cleanup.customerIds.push(customerId);

    // Create booking & payment & approve allotment so customer is the approved buyer of this vehicle
    const bkgRes = await harness.request('/bookings', {
      method: 'POST',
      token: salesRepToken,
      body: {
        customerId,
        itemId: sampleItemId,
        quantity: 1,
        unitPrice: 100000,
        requiredAdvanceAmount: 10000,
        salespersonName: 'Yared Sales Representative',
      },
    });
    expect([200, 201]).toContain(bkgRes.status);
    const custodyBookingId = String(bkgRes.body.bookingId);
    cleanup.bookingIds.push(custodyBookingId);

    const payRes = await harness.request('/payments', {
      method: 'POST',
      token: financeToken,
      body: {
        bookingId: custodyBookingId,
        customerId,
        instrumentType: 'BANK_DEPOSIT',
        bankName: 'Commercial Bank of Ethiopia',
        amount: 100000,
        referenceNumber: `BRV-CUST-${suffix}`,
      },
    });
    expect([200, 201]).toContain(payRes.status);
    const custodyPayId = String(payRes.body.paymentId);
    cleanup.paymentIds.push(custodyPayId);
    expect(
      (await harness.request(`/payments/${custodyPayId}/confirm`, { method: 'PATCH', token: financeToken, body: {} }))
        .status,
    ).toBe(200);

    const chs = `E2E-CUSTODY-${suffix}`;
    cleanup.chassisNumbers.push(chs);
    const vehRes = await harness.request('/vehicles', {
      method: 'POST',
      token: inventoryToken,
      body: {
        itemId: sampleItemId,
        chassisNumber: chs,
        engineNumber: `ENG-${suffix}`,
        currentWarehouseId: warehouse1Id,
        currentStatus: 'AVAILABLE_FOR_SALE',
      },
    });
    expect([200, 201]).toContain(vehRes.status);
    const vehId = String(vehRes.body.vehicleUnitId);

    const allotRes = await harness.request('/allotments', {
      method: 'POST',
      token: adminToken,
      body: { bookingId: custodyBookingId, vehicleUnitIds: [vehId] },
    });
    expect([200, 201]).toContain(allotRes.status);
    expect(
      (await harness.request(`/allotments/${allotRes.body.allotmentId}/approve`, { method: 'PATCH', token: adminToken, body: {} }))
        .status,
    ).toBe(200);

    expect(
      (
        await harness.request(`/vehicles/${vehId}/status`, {
          method: 'PATCH',
          token: adminToken,
          body: { status: 'READY_FOR_DELIVERY' },
        })
      ).status,
    ).toBe(200);

    const custodyRes = await harness.request(`/vehicles/${vehId}/custody`, {
      method: 'POST',
      token: inventoryToken,
      body: {
        customerId,
        custodyReason: 'Customer requested delayed physical pickup while registration completes',
        custodyStartDate: '2026-11-01',
        expectedHandoverDate: '2026-11-30',
      },
    });
    expect([200, 201]).toContain(custodyRes.status);
    expect(custodyRes.body.ownershipStatus).toBe('CUSTOMER_OWNED');

    // Verify excluded from company-owned sellable vehicles in allotment pool
    const availRes = await harness.request(`/allotments/available-vehicles?itemId=${sampleItemId}`, {
      token: adminToken,
    });
    expect(availRes.status).toBe(200);
    expect((availRes.body || []).some((v: any) => String(v.vehicleUnitId) === vehId)).toBe(false);

    const releaseRes = await harness.request(`/vehicles/${vehId}/release-custody`, {
      method: 'POST',
      token: inventoryToken,
      body: {},
    });
    expect([200, 201]).toContain(releaseRes.status);
    expect(releaseRes.body.currentStatus).toBe('DELIVERED');
  });

  it('supports Spare Parts POS Sale, Attachments, Cancellation & Inventory Movements (KMS-FB-04, 07, 08, 09, 14, 15, 16)', async () => {
    const partRes = await harness.request('/spare-parts', {
      method: 'POST',
      token: inventoryToken,
      body: {
        itemCode: `E2E-PART-${suffix}`,
        itemName: `E2E Brake Pad Assembly ${suffix}`,
        categoryId,
        uomId,
        sellingPrice: 1200,
        purchasePrice: 800,
        reorderLevel: 10,
        usageType: 'SALES_ONLY',
      },
    });
    expect([200, 201]).toContain(partRes.status);
    cleanup.sparePartId = String(partRes.body.itemId);

    // Receive stock (10 units)
    const recvRes = await harness.request('/spare-parts/stock/receive', {
      method: 'POST',
      token: inventoryToken,
      body: {
        itemId: cleanup.sparePartId,
        warehouseId: warehouse1Id,
        quantity: 10,
        notes: 'E2E opening stock',
      },
    });
    expect([200, 201]).toContain(recvRes.status);

    // Record POS sale (3 units) + attach supporting doc (KMS-FB-04) + cancel (KMS-FB-08)
    const saleRes = await harness.request('/spare-parts/sales', {
      method: 'POST',
      token: adminToken,
      body: {
        customerName: `E2E Walkin Buyer ${suffix}`,
        customerType: 'WALK_IN',
        warehouseId: warehouse1Id,
        paymentMethod: 'CASH',
        items: [{ itemId: cleanup.sparePartId, quantity: 3, unitPrice: 1200 }],
      },
    });
    expect([200, 201]).toContain(saleRes.status);
    cleanup.sparePartSaleId = String(saleRes.body.saleId);

    await uploadSampleFile('spare_part_sale', cleanup.sparePartSaleId, adminToken, 'POS_INVOICE_DOC');
    const saleDocs = await harness.request(`/documents/spare_part_sale/${cleanup.sparePartSaleId}`, {
      token: adminToken,
    });
    expect(saleDocs.body.length).toBeGreaterThanOrEqual(1);

    const cancelSaleRes = await harness.request(`/spare-parts/sales/${cleanup.sparePartSaleId}/cancel`, {
      method: 'POST',
      token: adminToken,
      body: { reason: 'Customer returned unopened part E2E' },
    });
    expect([200, 201]).toContain(cancelSaleRes.status);
    expect(cancelSaleRes.body.status).toBe('CANCELLED');

    // Low-stock alerts + adjustment approval (KMS-FB-15)
    expect((await harness.request('/inventory/balances/low-stock-alerts', { token: inventoryToken })).status).toBe(200);
    const adjRes = await harness.request('/inventory/adjustments', {
      method: 'POST',
      token: inventoryToken,
      body: {
        warehouseId: warehouse1Id,
        itemId: cleanup.sparePartId,
        quantityDelta: -1,
        reason: 'DAMAGE',
        reasonNotes: 'E2E inspection writeoff',
      },
    });
    expect([200, 201]).toContain(adjRes.status);
    cleanup.adjustmentIds.push(String(adjRes.body.adjustmentId));
    expect((await harness.request(`/inventory/adjustments/${adjRes.body.adjustmentId}/approve`, { method: 'PATCH', token: inventoryToken, body: {} })).status).toBe(200);
  });

  it('verifies Enquiry dual approval, Pre-Advance Slip, Tax preview, Requisition & Management Reports (KMS-FB-10..13, 17)', async () => {
    const custRes = await harness.request('/customers', {
      method: 'POST',
      token: salesRepToken,
      body: {
        customerType: 'DIRECT_POS',
        fullName: `E2E Enquiry Buyer ${suffix}`,
        mobileNumber: `+251944${suffix.padStart(6, '0').slice(0, 6)}`,
        addressTown: 'Bahir Dar',
      },
    });
    const custId = String(custRes.body.customerId);
    cleanup.customerIds.push(custId);

    const enqRes = await harness.request('/enquiries', {
      method: 'POST',
      token: salesRepToken,
      body: {
        customerId: custId,
        itemId: sampleItemId,
        quantity: 1,
        unitPrice: 150000,
        salespersonName: 'Yared Sales Representative',
        paymentMode: 'BANK_DEPOSIT',
        isDraft: true,
      },
    });
    expect([200, 201]).toContain(enqRes.status);
    const enqId = String(enqRes.body.enquiryId);
    cleanup.enquiryIds.push(enqId);

    expect((await harness.request(`/enquiries/${enqId}/submit`, { method: 'POST', token: salesRepToken, body: {} })).status).toBeLessThan(300);
    expect(
      (
        await harness.request(`/enquiries/${enqId}/sales-rep-approve`, {
          method: 'POST',
          token: adminToken,
          body: { approved: true, notes: 'Sales Rep stage verified E2E' },
        })
      ).status,
    ).toBeLessThan(300);
    expect(
      (
        await harness.request(`/enquiries/${enqId}/sales-manager-approve`, {
          method: 'POST',
          token: salesManagerToken,
          body: { approved: true, notes: 'Sales Manager final approval E2E' },
        })
      ).status,
    ).toBeLessThan(300);

    // Pre-advance slip & tax calculation preview & Import Requisition workflow
    expect((await harness.request(`/enquiries/${enqId}/slip`, { token: salesRepToken })).status).toBe(200);
    expect(
      (
        await harness.request('/invoices/preview-tax-calculation?baseAmount=100000&vatRate=0.15&whtRate=0.03', {
          token: financeToken,
        })
      ).status,
    ).toBe(200);

    const reqRes = await harness.request('/import-requisitions', {
      method: 'POST',
      token: procurementToken,
      body: {
        currency: 'USD',
        justification: 'E2E stock replenishment test',
        lines: [{ itemId: sampleItemId, quantityRequested: 5, estimatedUnitPrice: 2200 }],
      },
    });
    expect([200, 201]).toContain(reqRes.status);
    cleanup.requisitionId = String(reqRes.body.requisitionId);
    expect((await harness.request(`/import-requisitions/stock-review/${sampleItemId}`, { token: procurementToken })).status).toBe(200);
    expect((await harness.request(`/import-requisitions/${cleanup.requisitionId}/submit`, { method: 'PATCH', token: procurementToken, body: {} })).status).toBe(200);

    // Management cross-tab & aging reports (KMS-FB-17)
    for (const reportPath of [
      '/reports/management-dashboard/summary',
      '/reports/management-dashboard/sales-cross-tab',
      '/reports/credit-sales',
      '/reports/stock-aging',
    ]) {
      const repRes = await harness.request(reportPath, { token: adminToken });
      expect(repRes.status).toBe(200);
    }
  });
});

