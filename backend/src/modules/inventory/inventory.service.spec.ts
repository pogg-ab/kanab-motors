import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { Warehouse } from '../lookups/entities/warehouse.entity';
import { UserWarehouseAccess } from './entities/user-warehouse-access.entity';
import { VehicleStatusTransitionRule } from './entities/vehicle-status-transition-rule.entity';
import { VehicleStatusHistory } from './entities/vehicle-status-history.entity';
import { StockBalance } from './entities/stock-balance.entity';
import { StockTransfer, TransferStatus } from './entities/stock-transfer.entity';
import { StockTransferLine } from './entities/stock-transfer-line.entity';
import { StockAdjustment, AdjustmentStatus } from './entities/stock-adjustment.entity';
import { ProductionReceipt } from './entities/production-receipt.entity';
import { VehicleUnit, VehicleStatus } from '../vehicles/entities/vehicle-unit.entity';

describe('InventoryService (KMSICAMS-4 Inventory & Warehouse)', () => {
  let service: InventoryService;
  let warehouseRepo: any;
  let userWarehouseAccessRepo: any;
  let transitionRuleRepo: any;
  let statusHistoryRepo: any;
  let stockBalanceRepo: any;
  let transferRepo: any;
  let transferLineRepo: any;
  let adjustmentRepo: any;
  let productionReceiptRepo: any;
  let vehicleUnitRepo: any;
  let dataSource: any;

  beforeEach(async () => {
    warehouseRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    };

    userWarehouseAccessRepo = {
      find: jest.fn(),
      delete: jest.fn(),
      create: jest.fn((data) => data),
      save: jest.fn((data) => Promise.resolve(data)),
    };

    transitionRuleRepo = {
      find: jest.fn(),
    };

    statusHistoryRepo = {
      find: jest.fn(),
    };

    stockBalanceRepo = {
      createQueryBuilder: jest.fn(),
    };

    transferRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    };

    transferLineRepo = {
      find: jest.fn(),
      save: jest.fn(),
    };

    adjustmentRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    };

    productionReceiptRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
    };

    vehicleUnitRepo = {
      findOne: jest.fn(),
    };

    dataSource = {
      query: jest.fn(),
      createQueryRunner: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: getRepositoryToken(Warehouse), useValue: warehouseRepo },
        { provide: getRepositoryToken(UserWarehouseAccess), useValue: userWarehouseAccessRepo },
        { provide: getRepositoryToken(VehicleStatusTransitionRule), useValue: transitionRuleRepo },
        { provide: getRepositoryToken(VehicleStatusHistory), useValue: statusHistoryRepo },
        { provide: getRepositoryToken(StockBalance), useValue: stockBalanceRepo },
        { provide: getRepositoryToken(StockTransfer), useValue: transferRepo },
        { provide: getRepositoryToken(StockTransferLine), useValue: transferLineRepo },
        { provide: getRepositoryToken(StockAdjustment), useValue: adjustmentRepo },
        { provide: getRepositoryToken(ProductionReceipt), useValue: productionReceiptRepo },
        { provide: getRepositoryToken(VehicleUnit), useValue: vehicleUnitRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  // =========================================================================
  // 1. Warehouse Scoped Access Tests (W1, W2, W3)
  // =========================================================================
  describe('Warehouse Management & User-Scoped Access', () => {
    it('should return list of warehouses', async () => {
      const mockWh = [{ warehouseId: 1, name: 'Main Depot', capacity: 100 }];
      warehouseRepo.find.mockResolvedValue(mockWh);

      const result = await service.getWarehouses();
      expect(result).toEqual(mockWh);
      expect(warehouseRepo.find).toHaveBeenCalledWith({
        relations: ['manager'],
        order: { warehouseId: 'ASC' },
      });
    });

    it('should update warehouse details', async () => {
      const existing = { warehouseId: 1, name: 'Main Depot', capacity: 50 };
      warehouseRepo.findOne.mockResolvedValue(existing);
      warehouseRepo.save.mockImplementation(async (d: any) => d);

      const result = await service.updateWarehouse(1, { capacity: 80, contactPhone: '+251911223344' });
      expect(result.capacity).toBe(80);
      expect(result.contactPhone).toBe('+251911223344');
    });

    it('should throw NotFoundException if warehouse to update is missing', async () => {
      warehouseRepo.findOne.mockResolvedValue(null);
      await expect(service.updateWarehouse(999, { capacity: 10 })).rejects.toThrow(NotFoundException);
    });

    it('should manage user-warehouse access correctly', async () => {
      userWarehouseAccessRepo.find.mockResolvedValue([
        { userId: 5, warehouseId: 1 },
        { userId: 5, warehouseId: 2 },
      ]);

      const access = await service.getUserWarehouseAccess(5);
      expect(access).toEqual([1, 2]);

      await service.setUserWarehouseAccess(5, [2, 3]);
      expect(userWarehouseAccessRepo.delete).toHaveBeenCalledWith({ userId: 5 });
      expect(userWarehouseAccessRepo.save).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 2. Vehicle Status State Machine Tests (V1, V2, V3)
  // =========================================================================
  describe('Vehicle Status State Machine', () => {
    it('should transition vehicle status using database function fn_transition_vehicle_status', async () => {
      dataSource.query.mockResolvedValue([{ fn_transition_vehicle_status: true }]);
      const mockUnit = {
        vehicleUnitId: '101',
        status: VehicleStatus.AVAILABLE_FOR_SALE,
        item: { name: 'KMT-150' },
      };
      vehicleUnitRepo.findOne.mockResolvedValue(mockUnit);

      const result = await service.transitionVehicleStatus(
        '101',
        VehicleStatus.AVAILABLE_FOR_SALE,
        1,
        'MANUAL',
        'Inspection passed',
      );

      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('fn_transition_vehicle_status'),
        ['101', VehicleStatus.AVAILABLE_FOR_SALE, 1, 'MANUAL', 'Inspection passed'],
      );
      expect(result).toEqual(mockUnit);
    });

    it('should throw BadRequestException if transition function throws', async () => {
      dataSource.query.mockRejectedValue(new Error('Invalid vehicle status transition from RECEIVED to SOLD'));
      await expect(
        service.transitionVehicleStatus('101', VehicleStatus.SOLD, 1),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // 3. Stock Transfers (T1, T2, T3)
  // =========================================================================
  describe('Stock Transfers', () => {
    it('should throw BadRequestException when source and destination warehouse are identical', async () => {
      await expect(
        service.createStockTransfer({
          fromWarehouseId: 1,
          toWarehouseId: 1,
          lines: [{ itemId: 'ITEM-01', quantity: 5 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should approve a transfer in REQUESTED status', async () => {
      const mockTrf = {
        transferId: '1',
        status: TransferStatus.REQUESTED,
      };
      transferRepo.findOne
        .mockResolvedValueOnce(mockTrf)
        .mockResolvedValueOnce({ ...mockTrf, status: TransferStatus.APPROVED });
      transferRepo.save.mockResolvedValue(true);

      const approved = await service.approveStockTransfer('1', 2);
      expect(approved.status).toBe(TransferStatus.APPROVED);
    });

    it('should complete a transfer and trigger trg_execute_stock_transfer', async () => {
      const mockTrf = {
        transferId: '1',
        status: TransferStatus.APPROVED,
      };
      transferRepo.findOne
        .mockResolvedValueOnce(mockTrf)
        .mockResolvedValueOnce({ ...mockTrf, status: TransferStatus.COMPLETED });
      dataSource.query.mockResolvedValue([]);

      const completed = await service.completeStockTransfer('1');
      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE stock_transfer'),
        ['1'],
      );
      expect(completed.status).toBe(TransferStatus.COMPLETED);
    });
  });

  // =========================================================================
  // 4. Stock Adjustments (J1, J2, J4)
  // =========================================================================
  describe('Stock Adjustments', () => {
    it('should reject adjustment creation if reason notes are missing', async () => {
      await expect(
        service.createStockAdjustment({
          warehouseId: 1,
          itemId: 'ITEM-01',
          quantityDelta: -2,
          reason: 'DAMAGE' as any,
          reasonNotes: '',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create stock adjustment and auto-submit to approval engine', async () => {
      dataSource.query
        .mockResolvedValueOnce([{ adjustment_id: '50' }]) // INSERT
        .mockResolvedValueOnce([]); // fn_submit_for_approval

      const mockAdj = {
        adjustmentId: '50',
        status: AdjustmentStatus.REQUESTED,
        quantityDelta: -3,
        reason: 'DAMAGE',
        reasonNotes: 'Water leak damaged packaging',
      };
      adjustmentRepo.findOne.mockResolvedValue(mockAdj);

      const result = await service.createStockAdjustment({
        warehouseId: 1,
        itemId: 'ITEM-01',
        quantityDelta: -3,
        reason: 'DAMAGE' as any,
        reasonNotes: 'Water leak damaged packaging',
      });

      expect(result.adjustmentId).toBe('50');
      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO stock_adjustment'),
        expect.any(Array),
      );
    });
  });

  // =========================================================================
  // 5. Local Production Vehicle Intake (P1, P2)
  // =========================================================================
  describe('Local Production Vehicle Intake', () => {
    it('should record local production intake and return receipt with vehicle', async () => {
      dataSource.query.mockResolvedValueOnce([{ production_receipt_id: 10 }]);
      const mockReceipt = {
        productionReceiptId: '10',
        chassisNumber: 'KANAB-2026-CHAS-99',
        engineNumber: 'KANAB-2026-ENG-99',
      };
      productionReceiptRepo.findOne.mockResolvedValue(mockReceipt);

      const result = await service.createProductionReceipt({
        itemId: 'ITEM-01',
        chassisNumber: 'KANAB-2026-CHAS-99',
        engineNumber: 'KANAB-2026-ENG-99',
        warehouseId: 1,
      });

      expect(result.productionReceiptId).toBe('10');
      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO production_receipt'),
        expect.any(Array),
      );
    });
  });

  // =========================================================================
  // 6. Reports & Movement History (H1, RP1, RP2)
  // =========================================================================
  describe('Reports and Stock Movement History', () => {
    it('should query vw_stock_movement_history', async () => {
      dataSource.query.mockResolvedValue([
        { movement_type: 'RECEIPT', quantity: 10 },
        { movement_type: 'TRANSFER_OUT', quantity: -2 },
      ]);

      const history = await service.getMovementHistory({ warehouseId: 1 });
      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('vw_stock_movement_history'),
        [1, 100],
      );
      expect(history.length).toBe(2);
    });

    it('should query vw_current_stock_balance and vw_vehicle_inventory_by_status', async () => {
      dataSource.query
        .mockResolvedValueOnce([{ item_code: 'KMT-150', quantity_on_hand: 20 }])
        .mockResolvedValueOnce([{ status: 'AVAILABLE_FOR_SALE', count: 12 }]);

      const stockReport = await service.getCurrentStockReport();
      const vehicleReport = await service.getVehicleInventoryByStatusReport();

      expect(stockReport[0].item_code).toBe('KMT-150');
      expect(vehicleReport[0].status).toBe('AVAILABLE_FOR_SALE');
    });
  });
});
