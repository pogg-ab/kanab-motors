import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { DeliveriesService } from './deliveries.service';
import { Delivery, DeliveryStatus } from './entities/delivery.entity';
import { PdiChecklistItem } from './entities/pdi-checklist-item.entity';
import { PdiInspection } from './entities/pdi-inspection.entity';
import { PdiInspectionResult } from './entities/pdi-inspection-result.entity';
import { VehicleUnit, VehicleStatus } from '../vehicles/entities/vehicle-unit.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { NotFoundException } from '@nestjs/common';

describe('DeliveriesService (KMSICAMS-6 Delivery & Handover)', () => {
  let service: DeliveriesService;
  let deliveryRepo: any;
  let pdiChecklistItemRepo: any;
  let pdiInspectionRepo: any;
  let pdiInspectionResultRepo: any;
  let vehicleUnitRepo: any;
  let bookingRepo: any;
  let dataSource: any;

  beforeEach(async () => {
    deliveryRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    pdiChecklistItemRepo = {
      find: jest.fn(),
    };
    pdiInspectionRepo = {
      findOne: jest.fn(),
    };
    pdiInspectionResultRepo = {};
    vehicleUnitRepo = {
      findOne: jest.fn(),
    };
    bookingRepo = {
      findOne: jest.fn(),
    };
    dataSource = {
      query: jest.fn(),
      createQueryRunner: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveriesService,
        { provide: getRepositoryToken(Delivery), useValue: deliveryRepo },
        { provide: getRepositoryToken(PdiChecklistItem), useValue: pdiChecklistItemRepo },
        { provide: getRepositoryToken(PdiInspection), useValue: pdiInspectionRepo },
        { provide: getRepositoryToken(PdiInspectionResult), useValue: pdiInspectionResultRepo },
        { provide: getRepositoryToken(VehicleUnit), useValue: vehicleUnitRepo },
        { provide: getRepositoryToken(Booking), useValue: bookingRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<DeliveriesService>(DeliveriesService);
  });

  describe('PDI Checklist & Inspection (Story DL4)', () => {
    it('TC-D1: should retrieve 7 standard pre-delivery inspection checklist items', async () => {
      const mockItems = [
        { pdiChecklistItemId: 1, itemDescription: 'Engine oil level checked' },
        { pdiChecklistItemId: 2, itemDescription: 'Tire pressure checked' },
      ];
      pdiChecklistItemRepo.find.mockResolvedValue(mockItems);

      const result = await service.getPdiChecklist();
      expect(result).toEqual(mockItems);
      expect(pdiChecklistItemRepo.find).toHaveBeenCalledWith({
        order: { pdiChecklistItemId: 'ASC' },
      });
    });

    it('TC-D2: should record PDI inspection transaction and return completed inspection', async () => {
      vehicleUnitRepo.findOne.mockResolvedValue({
        vehicleUnitId: '1',
        currentStatus: VehicleStatus.ALLOTTED,
      });

      const mockQueryRunner = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        query: jest.fn()
          .mockResolvedValueOnce([{ pdi_inspection_id: '10' }]) // insert inspection header
          .mockResolvedValueOnce([]), // insert results
      };
      dataSource.createQueryRunner.mockReturnValue(mockQueryRunner);

      pdiInspectionRepo.findOne.mockResolvedValue({
        pdiInspectionId: '10',
        vehicleUnitId: '1',
        results: [{ checklistItemId: 1, passed: true }],
      });

      const result = await service.recordPdiInspection({
        vehicleUnitId: 1,
        results: [{ checklistItemId: 1, passed: true, notes: 'OK' }],
      });

      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(result.pdiInspectionId).toBe('10');
    });
  });

  describe('Delivery Order & Gate Pass Generation (Stories DL1, DL3, DL5)', () => {
    it('TC-D3: should create delivery order with financial settlement and PDI verification', async () => {
      vehicleUnitRepo.findOne.mockResolvedValue({
        vehicleUnitId: '1',
        chassisNumber: 'CHS-123',
      });
      bookingRepo.findOne.mockResolvedValue({
        bookingId: '1',
        bookingStatus: 'SETTLED',
      });
      pdiInspectionRepo.findOne.mockResolvedValue({
        pdiInspectionId: '10',
      });

      dataSource.query
        .mockResolvedValueOnce([{ delivery_id: '1' }]); // insert delivery

      const mockDelivery = {
        deliveryId: '1',
        deliveryNumber: 'DEL-000001',
        pdiCompleted: true,
        financialSettlementValidated: true,
        status: DeliveryStatus.PENDING,
      };
      deliveryRepo.findOne.mockResolvedValue(mockDelivery);

      const result = await service.createDelivery({
        bookingId: 1,
        vehicleUnitId: 1,
        financialSettlementValidated: true,
      });

      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO delivery'),
        expect.arrayContaining([
          '1', // bookingId
          '1', // vehicleUnitId
          expect.any(String), // deliveryDate
          1, // responsibleEmployee
          false, // customerAcknowledged
          true, // pdiCompleted
          true, // financialSettlementValidated
          1, // userId
        ]),
      );
      expect(result.deliveryNumber).toBe('DEL-000001');
    });

    it('TC-D4: should generate structured Gate Pass document for vehicle exit (Story DL5)', async () => {
      const mockDelivery = {
        deliveryId: '1',
        deliveryNumber: 'DEL-000001',
        deliveryDate: '2026-09-24',
        status: DeliveryStatus.APPROVED,
        pdiCompleted: true,
        financialSettlementValidated: true,
        customerAcknowledged: true,
        booking: {
          bookingId: '1',
          bookingNumber: 'BKG-2026-00001',
          customer: {
            customerId: '10',
            fullName: 'Abebe Bikila Transport',
            mobileNumber: '+251911223344',
          },
        },
        vehicleUnit: {
          vehicleUnitId: '1',
          chassisNumber: 'CHS-999',
          engineNumber: 'ENG-999',
          item: { itemName: 'Toyota Land Cruiser HZJ76', itemCode: 'TLC-76' },
          currentStatus: 'SOLD',
        },
        responsibleStaff: { fullName: 'Tewodros Kassahun' },
      };
      deliveryRepo.findOne.mockResolvedValue(mockDelivery);
      pdiInspectionRepo.findOne.mockResolvedValue({
        pdiInspectionId: '10',
        inspectedAt: new Date(),
        inspector: { fullName: 'Inspector Dawit' },
        results: [{ passed: true }, { passed: true }],
      });

      const gatePass = await service.generateGatePass('1');

      expect(gatePass.gatePassNumber).toBe('GP-DEL-000001');
      expect(gatePass.customer.name).toBe('Abebe Bikila Transport');
      expect(gatePass.vehicle.chassisNumber).toBe('CHS-999');
      expect(gatePass.verifications.pdiCompleted).toBe(true);
      expect(gatePass.verifications.financialSettlementValidated).toBe(true);
    });
  });

  describe('authorize - Handover Authorization (Stories DL2, DL7)', () => {
    it('TC-D5: should authorize delivery and advance vehicle to DELIVERED status', async () => {
      const pendingDelivery = {
        deliveryId: '1',
        status: DeliveryStatus.PENDING,
      };
      const approvedDelivery = {
        deliveryId: '1',
        status: DeliveryStatus.APPROVED,
      };
      deliveryRepo.findOne
        .mockResolvedValueOnce(pendingDelivery)
        .mockResolvedValueOnce(approvedDelivery);

      dataSource.query
        .mockResolvedValueOnce([{ approval_request_id: '15' }]) // pending approval request lookup
        .mockResolvedValueOnce([]); // fn_record_approval_decision

      const result = await service.authorize('1', 1, 'Delivery authorized and keys handed over');

      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT fn_record_approval_decision'),
        ['15', 'APPROVED', 1, 'Delivery authorized and keys handed over'],
      );
      expect(result.status).toBe(DeliveryStatus.APPROVED);
    });
  });
});
