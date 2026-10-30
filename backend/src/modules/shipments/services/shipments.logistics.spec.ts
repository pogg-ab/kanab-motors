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
        { provide: DataSource, useValue: {} },
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

  it('should record competing quotation and select approved quotation (Story IMP-24, IMP-25)', async () => {
    const quote = await service.addShipmentQuotation('10', {
      freightForwarderId: '1',
      freightAmount: 4200,
      currency: 'USD',
    });
    expect(quote.freightAmount).toBe(4200);

    const selected = await service.selectShipmentQuotation('10', '100', {
      selectionReason: 'Lowest transit time and bonded warehouse facilities at Mojo dry port',
    });
    expect(selected.selectionStatus).toBe('SELECTED');
    expect(selected.selectionReason).toContain('Lowest transit time');
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
