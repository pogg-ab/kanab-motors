import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LandedCostAllocationService } from './landed-cost-allocation.service';
import { Shipment } from '../entities/shipment.entity';
import { ShipmentLine } from '../entities/shipment-line.entity';
import { ShipmentCostComponent } from '../entities/shipment-cost-component.entity';
import { ShipmentLineLandedCost } from '../entities/shipment-line-landed-cost.entity';
import { VehicleUnitLandedCost } from '../entities/vehicle-unit-landed-cost.entity';
import { VehicleUnit } from '../../vehicles/entities/vehicle-unit.entity';
import { DataSource } from 'typeorm';

describe('LandedCostAllocationService (Core Mathematical Engine)', () => {
  let service: LandedCostAllocationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LandedCostAllocationService,
        {
          provide: getRepositoryToken(Shipment),
          useValue: { findOne: jest.fn(), save: jest.fn() },
        },
        {
          provide: getRepositoryToken(ShipmentLine),
          useValue: { findOne: jest.fn(), save: jest.fn() },
        },
        {
          provide: getRepositoryToken(ShipmentCostComponent),
          useValue: { find: jest.fn() },
        },
        {
          provide: getRepositoryToken(ShipmentLineLandedCost),
          useValue: { find: jest.fn(), save: jest.fn(), createQueryBuilder: jest.fn() },
        },
        {
          provide: getRepositoryToken(VehicleUnitLandedCost),
          useValue: { find: jest.fn(), save: jest.fn(), createQueryBuilder: jest.fn() },
        },
        {
          provide: getRepositoryToken(VehicleUnit),
          useValue: { find: jest.fn(), createQueryBuilder: jest.fn() },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn().mockReturnValue({
              connect: jest.fn(),
              startTransaction: jest.fn(),
              commitTransaction: jest.fn(),
              rollbackTransaction: jest.fn(),
              release: jest.fn(),
              manager: {
                save: jest.fn(),
                create: jest.fn((entity, data) => data),
                createQueryBuilder: jest.fn().mockReturnValue({
                  update: jest.fn().mockReturnThis(),
                  set: jest.fn().mockReturnThis(),
                  where: jest.fn().mockReturnThis(),
                  execute: jest.fn().mockResolvedValue({}),
                }),
              },
            }),
          },
        },
      ],
    }).compile();

    service = module.get<LandedCostAllocationService>(LandedCostAllocationService);
  });

  describe('Zero-Rounding-Drift Mathematical Distribution (Story A2)', () => {
    it('should allocate 100 ETB across 3 equal lines with ZERO rounding drift', () => {
      const totalCost = 100.00;
      const weights = [1, 1, 1]; // 3 equal lines

      const allocated = service.distributeAmountZeroDrift(totalCost, weights);

      expect(allocated.length).toBe(3);
      // Largest remainder method gives 1 cent to the first remainder: 33.34, 33.33, 33.33
      expect(allocated[0]).toBeCloseTo(33.34, 2);
      expect(allocated[1]).toBeCloseTo(33.33, 2);
      expect(allocated[2]).toBeCloseTo(33.33, 2);

      const sum = allocated.reduce((a, b) => a + b, 0);
      expect(Number(sum.toFixed(2))).toBe(100.00);
    });

    it('should allocate 1,485,321.73 ETB across 7 uneven weighted lines with ZERO drift', () => {
      const totalCost = 1485321.73;
      const weights = [350000, 120000, 89500, 450000, 230000, 115000, 98000];

      const allocated = service.distributeAmountZeroDrift(totalCost, weights);

      expect(allocated.length).toBe(7);

      const sum = allocated.reduce((a, b) => a + b, 0);
      expect(Number(sum.toFixed(2))).toBe(totalCost);

      // Verify every allocation has at most 2 decimal places
      for (const val of allocated) {
        const decimals = val.toString().split('.')[1] || '';
        expect(decimals.length).toBeLessThanOrEqual(2);
      }
    });

    it('should allocate properly when a single line exists', () => {
      const totalCost = 54321.99;
      const weights = [10];

      const allocated = service.distributeAmountZeroDrift(totalCost, weights);

      expect(allocated.length).toBe(1);
      expect(allocated[0]).toBe(54321.99);
    });

    it('should distribute by quantity and by weight correctly', () => {
      // 2 vehicles: Line 1 = 1 unit (15,000 kg), Line 2 = 3 units (5,000 kg each = 15,000 kg)
      const totalFreight = 60000.00;

      // By Quantity: 1 vs 3 -> 25% vs 75% -> 15,000 vs 45,000
      const byQty = service.distributeAmountZeroDrift(totalFreight, [1, 3]);
      expect(byQty[0]).toBe(15000.00);
      expect(byQty[1]).toBe(45000.00);

      // By Weight: 15,000 kg vs 15,000 kg -> 50% vs 50% -> 30,000 vs 30,000
      const byWeight = service.distributeAmountZeroDrift(totalFreight, [15000, 15000]);
      expect(byWeight[0]).toBe(30000.00);
      expect(byWeight[1]).toBe(30000.00);
    });
  });
});
