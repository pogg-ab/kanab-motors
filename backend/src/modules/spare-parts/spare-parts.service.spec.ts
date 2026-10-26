import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SparePartsService } from './spare-parts.service';
import { ProductItem } from '../products/entities/product-item.entity';
import { ProductCategory } from '../products/entities/product-category.entity';
import { Brand } from '../products/entities/brand.entity';
import { UnitOfMeasure } from '../products/entities/unit-of-measure.entity';
import { TaxConfiguration } from '../products/entities/tax-configuration.entity';
import { SparePartVehicleCompatibility } from '../products/entities/spare-part-vehicle-compatibility.entity';
import { SparePartsSale } from '../products/entities/spare-parts-sale.entity';
import { SparePartsSaleItem } from '../products/entities/spare-parts-sale-item.entity';
import { StockBalance } from '../inventory/entities/stock-balance.entity';
import { Warehouse } from '../lookups/entities/warehouse.entity';
import { Customer } from '../customers/entities/customer.entity';
import { AuditService } from '../audit/audit.service';

describe('SparePartsService - transferStock', () => {
  let service: SparePartsService;
  let productRepo: any;
  let dataSource: any;
  let queryRunner: any;
  let auditService: any;

  beforeEach(async () => {
    queryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      query: jest.fn(),
    };

    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(queryRunner),
      query: jest.fn(),
    };

    productRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((d) => d),
      save: jest.fn((d) => Promise.resolve(d)),
    };

    auditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SparePartsService,
        { provide: getRepositoryToken(ProductItem), useValue: productRepo },
        { provide: getRepositoryToken(ProductCategory), useValue: {} },
        { provide: getRepositoryToken(Brand), useValue: {} },
        { provide: getRepositoryToken(UnitOfMeasure), useValue: {} },
        { provide: getRepositoryToken(TaxConfiguration), useValue: {} },
        { provide: getRepositoryToken(SparePartVehicleCompatibility), useValue: {} },
        { provide: getRepositoryToken(SparePartsSale), useValue: {} },
        { provide: getRepositoryToken(SparePartsSaleItem), useValue: {} },
        { provide: getRepositoryToken(StockBalance), useValue: {} },
        { provide: getRepositoryToken(Warehouse), useValue: {} },
        { provide: getRepositoryToken(Customer), useValue: {} },
        { provide: AuditService, useValue: auditService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<SparePartsService>(SparePartsService);
  });

  it('should reject non-positive quantity', async () => {
    await expect(
      service.transferStock({
        fromWarehouseId: 1,
        toWarehouseId: 2,
        itemId: '10',
        quantity: 0,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject transfer to same warehouse', async () => {
    await expect(
      service.transferStock({
        fromWarehouseId: 1,
        toWarehouseId: 1,
        itemId: '10',
        quantity: 5,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject if spare part is not found', async () => {
    productRepo.findOne.mockResolvedValue(null);

    await expect(
      service.transferStock({
        fromWarehouseId: 1,
        toWarehouseId: 2,
        itemId: '999',
        quantity: 2,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should reject if source warehouse has insufficient available stock', async () => {
    productRepo.findOne.mockResolvedValue({
      itemId: '10',
      itemCode: 'BP-001',
      itemType: 'SPARE_PART',
    });

    queryRunner.query.mockResolvedValueOnce([
      { quantity_on_hand: 5, quantity_reserved: 3 }, // available = 2
    ]);

    await expect(
      service.transferStock({
        fromWarehouseId: 1,
        toWarehouseId: 2,
        itemId: '10',
        quantity: 5, // requests 5, but available is 2
      }),
    ).rejects.toThrow(BadRequestException);

    expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
  });

  it('should decrement source, increment destination, create transfer record, and commit successfully', async () => {
    productRepo.findOne.mockResolvedValue({
      itemId: '10',
      itemCode: 'BP-001',
      itemType: 'SPARE_PART',
    });

    // 1. SELECT quantity_on_hand, quantity_reserved FROM stock_balance ... FOR UPDATE
    queryRunner.query.mockResolvedValueOnce([
      { quantity_on_hand: 13, quantity_reserved: 0 },
    ]);
    // 2. UPDATE stock_balance (source decrement)
    queryRunner.query.mockResolvedValueOnce([]);
    // 3. INSERT INTO stock_balance (destination upsert)
    queryRunner.query.mockResolvedValueOnce([]);
    // 4. INSERT INTO stock_transfer RETURNING transfer_id
    queryRunner.query.mockResolvedValueOnce([{ transfer_id: 42 }]);
    // 5. INSERT INTO stock_transfer_line
    queryRunner.query.mockResolvedValueOnce([]);

    // After commit balance fetches
    dataSource.query.mockResolvedValueOnce([{ quantity_on_hand: '12' }]);
    dataSource.query.mockResolvedValueOnce([{ quantity_on_hand: '81' }]);

    const result = await service.transferStock(
      {
        fromWarehouseId: 1,
        toWarehouseId: 2,
        itemId: '10',
        quantity: 1,
        notes: 'Inter-warehouse rebalancing',
      },
      1,
    );

    expect(result.success).toBe(true);
    expect(result.transferId).toBe(42);
    expect(result.sourceBalanceAfter).toBe(12);
    expect(result.destinationBalanceAfter).toBe(81);
    expect(queryRunner.commitTransaction).toHaveBeenCalled();
    expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();

    // Verify no query to invalid non-existent table stock_movement
    const executedQueries = queryRunner.query.mock.calls.map((c: any) => c[0]);
    const stockMovementQuery = executedQueries.find((q: string) =>
      q.includes('INSERT INTO stock_movement'),
    );
    expect(stockMovementQuery).toBeUndefined();
  });

  describe('cancelSparePartsSale', () => {
    it('should reject if sale is not found', async () => {
      queryRunner.manager = { findOne: jest.fn().mockResolvedValue(null) };
      await expect(service.cancelSparePartsSale('999', 'Reason', 1)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should reject if sale is already cancelled', async () => {
      queryRunner.manager = {
        findOne: jest.fn().mockResolvedValue({
          saleId: '1',
          saleNumber: 'POS-001',
          status: 'CANCELLED',
        }),
      };
      await expect(service.cancelSparePartsSale('1', 'Reason', 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reverse stock back into stock_balance, record in stock_receipt, and commit', async () => {
      const mockSale = {
        saleId: '1',
        saleNumber: 'POS-001',
        status: 'COMPLETED',
        warehouseId: 2,
        customerId: '5',
        grandTotal: 1500,
        notes: null,
        items: [
          { itemId: '10', quantity: 3, unitPrice: 500 },
        ],
      };
      queryRunner.manager = {
        findOne: jest.fn().mockResolvedValue(mockSale),
        save: jest.fn().mockResolvedValue(mockSale),
      };
      queryRunner.query.mockResolvedValue([]);

      const result = await service.cancelSparePartsSale('1', 'Customer return', 1);

      expect(result.status).toBe('CANCELLED');
      expect(result.restoredItemsCount).toBe(1);
      expect(mockSale.status).toBe('CANCELLED');
      expect(queryRunner.commitTransaction).toHaveBeenCalled();

      // Check executed queries: stock_balance update, stock_receipt insert, customer_ledger_transaction insert
      const queries = queryRunner.query.mock.calls.map((c: any) => c[0]);
      expect(queries.some((q: string) => q.includes('UPDATE stock_balance'))).toBe(true);
      expect(queries.some((q: string) => q.includes('INSERT INTO stock_receipt'))).toBe(true);
      expect(queries.some((q: string) => q.includes('INSERT INTO customer_ledger_transaction'))).toBe(true);
    });
  });
});
