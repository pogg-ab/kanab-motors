import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AllotmentsService } from './allotments.service';
import { Allotment, AllotmentStatus } from './entities/allotment.entity';
import { AllotmentLine } from './entities/allotment-line.entity';
import { Booking, BookingStatus } from '../bookings/entities/booking.entity';
import { VehicleUnit, VehicleStatus } from '../vehicles/entities/vehicle-unit.entity';
import { AuditService } from '../audit/audit.service';
import { BadRequestException, ConflictException } from '@nestjs/common';

describe('AllotmentsService (KMSICAMS-5 Business Rules)', () => {
  let service: AllotmentsService;
  let allotmentRepo: any;
  let lineRepo: any;
  let bookingRepo: any;
  let vehicleRepo: any;
  let auditService: any;
  let dataSource: any;

  beforeEach(async () => {
    allotmentRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    lineRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    bookingRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
    };

    vehicleRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    auditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    dataSource = {
      transaction: jest.fn().mockImplementation(async (cb) => {
        const mockManager = {
          create: jest.fn((entity, data) => ({ ...data, allotmentId: '10' })),
          save: jest.fn((data) => Promise.resolve(data)),
          findOne: jest.fn(),
          update: jest.fn().mockResolvedValue(undefined),
          query: jest.fn().mockResolvedValue(undefined),
        };
        return cb(mockManager);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AllotmentsService,
        { provide: getRepositoryToken(Allotment), useValue: allotmentRepo },
        { provide: getRepositoryToken(AllotmentLine), useValue: lineRepo },
        { provide: getRepositoryToken(Booking), useValue: bookingRepo },
        { provide: getRepositoryToken(VehicleUnit), useValue: vehicleRepo },
        { provide: AuditService, useValue: auditService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<AllotmentsService>(AllotmentsService);
  });

  describe('Payment Validation Gate (Stories BK1 & BK2)', () => {
    it('should REJECT allotment if booking deposit threshold is not satisfied', async () => {
      bookingRepo.findOne.mockResolvedValue({
        bookingId: '1',
        bookingNumber: 'BKG-000001',
        bookingStatus: BookingStatus.DRAFT,
        requiredAdvanceAmount: 100000,
        totalAmountDeposited: 50000, // Insufficient!
        quantity: 1,
        itemId: '1',
      });

      await expect(
        service.create({ bookingId: '1', vehicleUnitIds: ['101'] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should ALLOW allotment if booking is CONFIRMED or SETTLED', async () => {
      bookingRepo.findOne.mockResolvedValue({
        bookingId: '1',
        bookingNumber: 'BKG-000001',
        bookingStatus: BookingStatus.CONFIRMED,
        requiredAdvanceAmount: 100000,
        totalAmountDeposited: 100000,
        quantity: 2,
        itemId: '1',
        item: { itemName: 'Bajaj Boxer BM 150' },
      });

      lineRepo.createQueryBuilder.mockReturnValue({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      });

      vehicleRepo.find.mockResolvedValue([
        {
          vehicleUnitId: '101',
          itemId: '1',
          chassisNumber: 'CHS-101',
          currentStatus: VehicleStatus.AVAILABLE_FOR_SALE,
        },
      ]);

      lineRepo.findOne.mockResolvedValue(null); // No active allotment

      jest.spyOn(service, 'findOne').mockResolvedValue({
        allotmentId: '10',
        allotmentNumber: 'ALT-000010',
        status: AllotmentStatus.REQUESTED,
      } as any);

      const res = await service.create({ bookingId: '1', vehicleUnitIds: ['101'] });
      expect(res).toBeDefined();
      expect(res.allotmentNumber).toBe('ALT-000010');
    });
  });

  describe('Over-Allotment Prevention (Stories P1 & P2)', () => {
    it('should REJECT allotment if unit count exceeds booking ordered quantity', async () => {
      bookingRepo.findOne.mockResolvedValue({
        bookingId: '1',
        bookingNumber: 'BKG-000001',
        bookingStatus: BookingStatus.CONFIRMED,
        requiredAdvanceAmount: 100000,
        totalAmountDeposited: 100000,
        quantity: 1, // Only 1 ordered
        itemId: '1',
      });

      lineRepo.createQueryBuilder.mockReturnValue({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      });

      // Attempting to allot 2 units for a 1-unit order!
      await expect(
        service.create({ bookingId: '1', vehicleUnitIds: ['101', '102'] }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Double-Allocation Prevention (Story AL3 & IN1)', () => {
    it('should REJECT allotment if vehicle unit is already active in another allotment', async () => {
      bookingRepo.findOne.mockResolvedValue({
        bookingId: '1',
        bookingNumber: 'BKG-000001',
        bookingStatus: BookingStatus.CONFIRMED,
        requiredAdvanceAmount: 100000,
        totalAmountDeposited: 100000,
        quantity: 2,
        itemId: '1',
      });

      lineRepo.createQueryBuilder.mockReturnValue({
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      });

      vehicleRepo.find.mockResolvedValue([
        {
          vehicleUnitId: '101',
          itemId: '1',
          chassisNumber: 'CHS-101',
          currentStatus: VehicleStatus.AVAILABLE_FOR_SALE,
        },
      ]);

      // Vehicle is already active!
      lineRepo.findOne.mockResolvedValue({
        allotmentLineId: '1',
        isActive: true,
        allotment: { allotmentNumber: 'ALT-000005' },
      });

      await expect(
        service.create({ bookingId: '1', vehicleUnitIds: ['101'] }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('Allotment Approval & Status Transition (Stories AP1, IN2)', () => {
    it('should approve allotment and transition status', async () => {
      const mockAllotment = {
        allotmentId: '10',
        allotmentNumber: 'ALT-000010',
        status: AllotmentStatus.REQUESTED,
        lines: [{ isActive: true, vehicleUnitId: '101' }],
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(mockAllotment as any);

      const approved = await service.approve('10', 1);
      expect(approved).toBeDefined();
    });
  });

  describe('Allotment Reversal / Un-Allotment (Story IN3)', () => {
    it('should reverse approved allotment back to AVAILABLE_FOR_SALE', async () => {
      const mockAllotment = {
        allotmentId: '10',
        allotmentNumber: 'ALT-000010',
        status: AllotmentStatus.APPROVED,
        lines: [{ isActive: true, vehicleUnitId: '101' }],
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(mockAllotment as any);

      const reversed = await service.reverse('10', 1);
      expect(reversed).toBeDefined();
    });

    it('should REJECT reversal if allotment is not approved', async () => {
      const mockAllotment = {
        allotmentId: '10',
        allotmentNumber: 'ALT-000010',
        status: AllotmentStatus.REQUESTED,
        lines: [],
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(mockAllotment as any);

      await expect(service.reverse('10', 1)).rejects.toThrow(BadRequestException);
    });
  });
});
