import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ShipmentsService } from './shipments.service';
import { Shipment, ShipmentStage } from '../entities/shipment.entity';
import { ShipmentLine } from '../entities/shipment-line.entity';
import { ShipmentStageHistory } from '../entities/shipment-stage-history.entity';
import { ShipmentCostComponent } from '../entities/shipment-cost-component.entity';
import { ShipmentReceipt } from '../entities/shipment-receipt.entity';
import { CostComponentType } from '../entities/cost-component-type.entity';
import { ExchangeRateDefault } from '../entities/exchange-rate-default.entity';
import { Attachment } from '../../customers/entities/attachment.entity';
import { VehicleUnit } from '../../vehicles/entities/vehicle-unit.entity';
import { PurchaseOrder } from '../../purchase-orders/entities/purchase-order.entity';
import { PurchaseOrderLine } from '../../purchase-orders/entities/purchase-order-line.entity';
import { ShipmentLineLandedCost } from '../entities/shipment-line-landed-cost.entity';
import { VehicleUnitLandedCost } from '../entities/vehicle-unit-landed-cost.entity';
import { FreightForwarder } from '../entities/freight-forwarder.entity';
import { ShipmentFreightQuotation } from '../entities/shipment-freight-quotation.entity';
import { ShipmentBooking } from '../entities/shipment-booking.entity';
import { ShipmentContainer } from '../entities/shipment-container.entity';
import { ShipmentMilestone } from '../entities/shipment-milestone.entity';
import { ShipmentInsurance } from '../entities/shipment-insurance.entity';
import { ShipmentCargoTracking } from '../entities/shipment-cargo-tracking.entity';
import { ShipmentDocument } from '../entities/shipment-document.entity';
import { ImportNotification } from '../entities/import-notification.entity';
import { LandedCostAllocationService } from './landed-cost-allocation.service';
import { DataSource } from 'typeorm';

describe('ShipmentsService - KMSICAMS-12 Part II Logistics & Documents', () => {
  let service: ShipmentsService;

  const mockShipment = {
    shipmentId: '10',
    shipmentNumber: 'SHP-2026-0001',
    currentStage: ShipmentStage.ORDERED,
    lines: [],
  };

  const mockForwarder = {
    freightForwarderId: '1',
    name: 'Bolloré Logistics',
    country: 'Ethiopia',
    isActive: true,
  };

  const mockQuotation = {
    quotationId: '100',
    shipmentId: '10',
    freightForwarderId: '1',
    freightAmount: 3500,
    currency: 'USD',
    selectionStatus: 'PENDING',
  };

  const mockForwarderRepo = {
    find: jest.fn().mockResolvedValue([mockForwarder]),
    findOne: jest.fn().mockResolvedValue(mockForwarder),
    create: jest.fn().mockImplementation((dto) => ({ freightForwarderId: '1', ...dto })),
    save: jest.fn().mockImplementation((f) => Promise.resolve(f)),
  };

  const mockQuotationRepo = {
    find: jest.fn().mockResolvedValue([mockQuotation]),
    findOne: jest.fn().mockResolvedValue(mockQuotation),
    create: jest.fn().mockImplementation((dto) => ({ quotationId: '100', ...dto })),
    save: jest.fn().mockImplementation((q) => Promise.resolve(q)),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockBookingRepo = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockImplementation((dto) => ({ bookingId: '200', ...dto })),
    save: jest.fn().mockImplementation((b) => Promise.resolve(b)),
  };

  const mockContainerRepo = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockImplementation((dto) => ({ containerId: '300', ...dto })),
    save: jest.fn().mockImplementation((c) => Promise.resolve(c)),
  };

  const mockMilestoneRepo = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue({ milestoneId: '400', isCompleted: false }),
    create: jest.fn().mockImplementation((dto) => ({ milestoneId: '400', ...dto })),
    save: jest.fn().mockImplementation((m) => Promise.resolve(m)),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const mockInsuranceRepo = {
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockImplementation((dto) => ({ insuranceId: '500', ...dto })),
    save: jest.fn().mockImplementation((i) => Promise.resolve(i)),
  };

  const mockCargoTrackingRepo = {
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn().mockImplementation((dto) => ({ trackingId: '600', ...dto })),
    save: jest.fn().mockImplementation((t) => Promise.resolve(t)),
  };

  const mockShipmentDocRepo = {
    find: jest.fn().mockResolvedValue([
      { shipmentDocumentId: '700', documentType: 'COMMERCIAL_INVOICE', verificationStatus: 'PENDING' },
    ]),
    findOne: jest.fn().mockResolvedValue({
      shipmentDocumentId: '700',
      documentType: 'COMMERCIAL_INVOICE',
      verificationStatus: 'PENDING',
    }),
    create: jest.fn().mockImplementation((dto) => ({ shipmentDocumentId: '700', ...dto })),
    save: jest.fn().mockImplementation((d) => Promise.resolve(d)),
  };

  const mockNotificationRepo = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockImplementation((dto) => ({ notificationId: '800', ...dto })),
    save: jest.fn().mockImplementation((n) => Promise.resolve(n)),
    createQueryBuilder: jest.fn().mockReturnValue({
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    }),
  };

  const mockShipmentRepo = {
    find: jest.fn().mockResolvedValue([mockShipment]),
    findOne: jest.fn().mockResolvedValue(mockShipment),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShipmentsService,
        { provide: getRepositoryToken(Shipment), useValue: mockShipmentRepo },
        { provide: getRepositoryToken(ShipmentLine), useValue: { find: jest.fn().mockResolvedValue([]) } },
        { provide: getRepositoryToken(ShipmentStageHistory), useValue: {} },
        { provide: getRepositoryToken(ShipmentCostComponent), useValue: {} },
        { provide: getRepositoryToken(ShipmentReceipt), useValue: { find: jest.fn().mockResolvedValue([]) } },
        { provide: getRepositoryToken(CostComponentType), useValue: {} },
        { provide: getRepositoryToken(ExchangeRateDefault), useValue: {} },
        { provide: getRepositoryToken(Attachment), useValue: {} },
        { provide: getRepositoryToken(VehicleUnit), useValue: {} },
        { provide: getRepositoryToken(PurchaseOrder), useValue: { find: jest.fn().mockResolvedValue([]) } },
        { provide: getRepositoryToken(PurchaseOrderLine), useValue: {} },
        { provide: getRepositoryToken(ShipmentLineLandedCost), useValue: {} },
        { provide: getRepositoryToken(VehicleUnitLandedCost), useValue: {} },
        { provide: getRepositoryToken(FreightForwarder), useValue: mockForwarderRepo },
        { provide: getRepositoryToken(ShipmentFreightQuotation), useValue: mockQuotationRepo },
        { provide: getRepositoryToken(ShipmentBooking), useValue: mockBookingRepo },
        { provide: getRepositoryToken(ShipmentContainer), useValue: mockContainerRepo },
        { provide: getRepositoryToken(ShipmentMilestone), useValue: mockMilestoneRepo },
        { provide: getRepositoryToken(ShipmentInsurance), useValue: mockInsuranceRepo },
        { provide: getRepositoryToken(ShipmentCargoTracking), useValue: mockCargoTrackingRepo },
        { provide: getRepositoryToken(ShipmentDocument), useValue: mockShipmentDocRepo },
        { provide: getRepositoryToken(ImportNotification), useValue: mockNotificationRepo },
        { provide: DataSource, useValue: { query: jest.fn().mockResolvedValue([]) } },
        { provide: LandedCostAllocationService, useValue: {} },
      ],
    }).compile();

    service = module.get<ShipmentsService>(ShipmentsService);
  });

  it('should list freight forwarders (Story IMP-23)', async () => {
    const forwarders = await service.getFreightForwarders(true);
    expect(forwarders).toHaveLength(1);
    expect(forwarders[0].name).toBe('Bolloré Logistics');
  });

  it('should record competing quotation, select pending approval, then approve separately with separation of duties (Story IMP-24, IMP-25)', async () => {
    const quote = await service.addShipmentQuotation('10', {
      freightForwarderId: '1',
      freightAmount: 4200,
      currency: 'USD',
    });
    expect(quote.freightAmount).toBe(4200);

    mockShipmentRepo.update.mockClear();
    const selected = await service.selectShipmentQuotation('10', '100', {
      selectionReason: 'Lowest transit time and bonded warehouse facilities at Mojo dry port',
      userId: 2,
    });
    expect(selected.selectionStatus).toBe('SELECTED');
    expect(selected.approvalStatus).toBe('PENDING');
    expect(selected.selectionReason).toContain('Lowest transit time');
    expect(mockShipmentRepo.update).not.toHaveBeenCalled();

    // Same user cannot self-approve without explicit override
    mockQuotationRepo.findOne.mockResolvedValueOnce({ ...selected });
    await expect(
      service.approveShipmentQuotation('10', '100', { userId: 2 }),
    ).rejects.toThrow('Separation of duties');

    // Different authorized approver approves and appoints forwarder
    mockQuotationRepo.findOne.mockResolvedValueOnce({ ...selected });
    mockQuotationRepo.find.mockResolvedValueOnce([
      { ...selected },
      { quotationId: '101', shipmentId: '10', freightForwarderId: '2', selectionStatus: 'PENDING', approvalStatus: 'PENDING' },
    ]);
    const approved = await service.approveShipmentQuotation('10', '100', {
      approvalNotes: 'Executive approval granted',
      userId: 5,
    });
    expect(approved.approvalStatus).toBe('APPROVED');
    expect(approved.approvedBy).toBe(5);
    expect(mockShipmentRepo.update).toHaveBeenCalledWith(
      { shipmentId: '10' },
      { selectedForwarderId: '1' },
    );

    // Reject workflow test
    mockQuotationRepo.findOne.mockResolvedValueOnce({
      quotationId: '102',
      shipmentId: '10',
      freightForwarderId: '3',
      selectionStatus: 'SELECTED',
      approvalStatus: 'PENDING',
    });
    const rejected = await service.rejectShipmentQuotation('10', '102', {
      rejectionReason: 'Incomplete port destination fee breakdown',
      userId: 5,
    });
    expect(rejected.selectionStatus).toBe('REJECTED');
    expect(rejected.approvalStatus).toBe('REJECTED');
    expect(rejected.rejectionReason).toContain('Incomplete');
  });

  it('should detect missing required docs and derive expiry from expiryDate in document completeness report (Story IMP-46, IMP-48)', async () => {
    const mockDataSource = (service as any).dataSource;
    const mockAttachRepo = (service as any).attachmentRepo;
    mockAttachRepo.find = jest.fn().mockResolvedValue([]);
    mockShipmentRepo.find.mockResolvedValueOnce([
      {
        shipmentId: '10',
        shipmentNumber: 'SHP-2026-0001',
        currentStage: ShipmentStage.ETHIOPIAN_CUSTOMS_CLEARANCE,
        lines: [],
        bookings: [],
      },
    ]);
    mockShipmentDocRepo.find.mockResolvedValueOnce([
      {
        shipmentDocumentId: '701',
        shipmentId: '10',
        shipment: { shipmentNumber: 'SHP-2026-0001' },
        documentType: 'COMMERCIAL_INVOICE',
        documentReference: 'INV-OLD-1',
        verificationStatus: 'VERIFIED',
        expiryDate: '2020-01-01',
        originalDocumentStatus: 'NOT_RECEIVED',
      },
    ]);
    mockDataSource.query.mockResolvedValueOnce([
      {
        requirement_id: '1',
        process_stage: 'ETHIOPIAN_CUSTOMS_CLEARANCE',
        document_type: 'CUSTOMS_DECLARATION',
        is_required: true,
        requires_verification: true,
      },
    ]);

    const report = await service.getDocumentCompletenessReport();
    expect(report.statusCounts.EXPIRED).toBe(1);
    expect(report.statusCounts.MISSING).toBe(1);
    expect(report.missingCount).toBe(1);
    expect(report.expiredCount).toBe(1);
    const missingEntry = report.documents.find((d: any) => d.documentType === 'CUSTOMS_DECLARATION');
    expect(missingEntry?.verificationStatus).toBe('MISSING');
    expect(missingEntry?.isMissing).toBe(true);
    const expiredEntry = report.documents.find((d: any) => d.documentType === 'COMMERCIAL_INVOICE');
    expect(expiredEntry?.verificationStatus).toBe('EXPIRED');
    expect(expiredEntry?.isExpired).toBe(true);
  });

  it('should match destination_country against company country rather than port and skip future stages (IMP-46)', async () => {
    const mockDataSource = (service as any).dataSource;
    const mockAttachRepo = (service as any).attachmentRepo;
    mockAttachRepo.find = jest.fn().mockResolvedValue([]);
    mockShipmentRepo.find.mockResolvedValueOnce([
      {
        shipmentId: '12',
        shipmentNumber: 'SHP-2026-0012',
        currentStage: ShipmentStage.AT_DJIBOUTI_PORT,
        lines: [
          {
            quantityShipped: 2,
            poLine: {
              purchaseOrder: {
                poNumber: 'PO-12',
                modeOfShipment: 'SEA',
                portOfDischarge: 'Djibouti Port',
                companySnapshot: { country: 'Ethiopia' },
              },
            },
          },
        ],
        bookings: [{ destinationPort: 'Djibouti Port' }],
      },
    ]);
    mockShipmentDocRepo.find.mockResolvedValueOnce([
      {
        shipmentDocumentId: '799',
        shipmentId: '12',
        shipment: { shipmentNumber: 'SHP-2026-0012' },
        documentType: 'BILL_OF_LADING',
        verificationStatus: 'PENDING',
        originalDocumentStatus: 'NOT_RECEIVED',
      },
    ]);
    mockDataSource.query.mockResolvedValueOnce([
      {
        requirement_id: '10',
        destination_country: 'Ethiopia',
        shipment_type: 'SEA',
        process_stage: 'AT_DJIBOUTI_PORT',
        document_type: 'PACKING_LIST',
        is_required: true,
        requires_verification: true,
      },
      {
        requirement_id: '11',
        destination_country: 'Kenya',
        shipment_type: 'SEA',
        process_stage: 'AT_DJIBOUTI_PORT',
        document_type: 'KENYA_IDF',
        is_required: true,
        requires_verification: true,
      },
      {
        requirement_id: '12',
        destination_country: null,
        shipment_type: null,
        process_stage: 'RECEIVED',
        document_type: 'BILL_OF_LADING',
        is_required: true,
        requires_verification: true,
      },
    ]);

    const report = await service.getDocumentCompletenessReport();
    expect(report.missingCount).toBe(1);
    expect(report.documents.map((d: any) => d.documentType)).toEqual(['PACKING_LIST']);
  });

  it('should filter pipeline report and build CSV export (Story IMP-43)', async () => {
    const mockDataSource = (service as any).dataSource;
    mockShipmentRepo.find.mockResolvedValueOnce([
      {
        shipmentId: '10',
        shipmentNumber: 'SHP-2026-0001',
        currentStage: ShipmentStage.SHIPPED,
        expectedArrivalDate: '2026-06-15',
        lines: [{ quantityShipped: 4, poLine: { purchaseOrder: { poNumber: 'PO-1', portOfDischarge: 'Djibouti', supplier: { supplierName: 'TVS India' } } } }],
        bookings: [],
        costComponents: [],
      },
      {
        shipmentId: '11',
        shipmentNumber: 'SHP-2026-0002',
        currentStage: ShipmentStage.RECEIVED,
        expectedArrivalDate: '2026-07-01',
        lines: [{ quantityShipped: 2, poLine: { purchaseOrder: { poNumber: 'PO-2', portOfDischarge: 'Modjo', supplier: { supplierName: 'Bajaj Auto' } } } }],
        bookings: [],
        costComponents: [],
      },
    ]);
    mockDataSource.query.mockResolvedValue([]);

    const filtered = await service.getPipelineReport({ supplier: 'TVS', status: 'SHIPPED' });
    expect(filtered.totalShipments).toBe(1);
    expect(filtered.shipments[0].shipmentNumber).toBe('SHP-2026-0001');

    mockShipmentRepo.find.mockResolvedValueOnce([
      {
        shipmentId: '10',
        shipmentNumber: 'SHP-2026-0001',
        currentStage: ShipmentStage.SHIPPED,
        expectedArrivalDate: '2026-06-15',
        lines: [{ quantityShipped: 4, poLine: { purchaseOrder: { poNumber: 'PO-1', portOfDischarge: 'Djibouti', supplier: { supplierName: 'TVS India' } } } }],
        bookings: [],
        costComponents: [],
      },
    ]);
    const csvExport = await service.exportPipelineReportCsv({ supplier: 'TVS' });
    expect(csvExport.filename).toContain('import-pipeline-report-');
    expect(csvExport.csv).toContain('Shipment No,Current Stage,PO Number');
    expect(csvExport.csv).toContain('SHP-2026-0001,SHIPPED,PO-1,TVS India');
  });

  it('should record vessel booking and container allocations (Story IMP-26, IMP-27)', async () => {
    const booking = await service.createShipmentBooking('10', {
      bookingReference: 'MSK-ADD-99120',
      vesselName: 'Maersk Mc-Kinney Moller',
      voyageNumber: '2405W',
    });
    expect(booking.bookingReference).toBe('MSK-ADD-99120');

    const container = await service.addShipmentContainer('10', {
      containerNumber: 'MSKU9918231',
      containerType: '40ft High Cube',
      freeTimeDays: 14,
    });
    expect(container.containerNumber).toBe('MSKU9918231');
  });

  it('should verify document and update verification status (Story IMP-34)', async () => {
    const verified = await service.verifyShipmentDocument('700', {
      status: 'VERIFIED',
      notes: 'Commercial Invoice verified against NBE Form and PO price',
      userId: 1,
    });
    expect(verified.verificationStatus).toBe('VERIFIED');
    expect(verified.verificationNotes).toContain('verified against NBE');
  });

  it('should generate logistics overview cockpit summary (Story IMP-31)', async () => {
    const overview = await service.getShipmentLogisticsOverview('10');
    expect(overview).toHaveProperty('shipment');
    expect(overview).toHaveProperty('containersCount');
    expect(overview).toHaveProperty('documentsCount');
    expect(overview).toHaveProperty('alerts');
  });
});

