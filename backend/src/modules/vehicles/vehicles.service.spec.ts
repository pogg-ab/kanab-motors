import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException } from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { VehicleUnit, VehicleStatus } from './entities/vehicle-unit.entity';
import { ProductItem } from '../products/entities/product-item.entity';
import { AuditService } from '../audit/audit.service';

describe('VehiclesService', () => {
  let service: VehiclesService;
  let unitRepo: any;
  let itemRepo: any;
  let auditService: any;

  beforeEach(async () => {
    unitRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((dto) => ({ ...dto, vehicleUnitId: '10' })),
      save: jest.fn((entity) => Promise.resolve({ ...entity, vehicleUnitId: '10' })),
      createQueryBuilder: jest.fn(),
    };
    itemRepo = {
      findOne: jest.fn().mockResolvedValue({ itemId: '1', itemCode: 'BOXER150' }),
    };
    auditService = {
      log: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehiclesService,
        { provide: getRepositoryToken(VehicleUnit), useValue: unitRepo },
        { provide: getRepositoryToken(ProductItem), useValue: itemRepo },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<VehiclesService>(VehiclesService);
  });

  it('should reject duplicate chassis number', async () => {
    unitRepo.findOne.mockResolvedValueOnce({ vehicleUnitId: '1', chassisNumber: 'CHS-12345' });

    await expect(
      service.create({
        itemId: '1',
        chassisNumber: 'CHS-12345',
        engineNumber: 'ENG-99999',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should reject duplicate engine number', async () => {
    unitRepo.findOne
      .mockResolvedValueOnce(null) // chassis is unique
      .mockResolvedValueOnce({ vehicleUnitId: '2', engineNumber: 'ENG-99999' }); // engine exists

    await expect(
      service.create({
        itemId: '1',
        chassisNumber: 'CHS-12345',
        engineNumber: 'ENG-99999',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should create vehicle unit with RECEIVED status by default', async () => {
    // 1st call chassis check (null), 2nd call engine check (null), 3rd call findOne (returns saved unit)
    unitRepo.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        vehicleUnitId: '10',
        itemId: '1',
        chassisNumber: 'CHS-NEW-001',
        engineNumber: 'ENG-NEW-001',
        currentStatus: VehicleStatus.RECEIVED,
      });

    const result = await service.create({
      itemId: '1',
      chassisNumber: 'CHS-NEW-001',
      engineNumber: 'ENG-NEW-001',
    });
    expect(result).toBeDefined();
    expect(unitRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        currentStatus: VehicleStatus.RECEIVED,
        chassisNumber: 'CHS-NEW-001',
        engineNumber: 'ENG-NEW-001',
      }),
    );
  });
});
