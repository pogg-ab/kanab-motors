import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ImportRequisitionsService } from './import-requisitions.service';
import { ImportRequisition, ImportRequisitionStatus } from './entities/import-requisition.entity';
import { ImportRequisitionLine } from './entities/import-requisition-line.entity';
import { ProductItem } from '../products/entities/product-item.entity';
import { PurchaseOrder, POStatus } from '../purchase-orders/entities/purchase-order.entity';
import { PurchaseOrderLine } from '../purchase-orders/entities/purchase-order-line.entity';
import { ExchangeRateDefault } from '../shipments/entities/exchange-rate-default.entity';
import { AuditService } from '../audit/audit.service';
import { BadRequestException, ConflictException } from '@nestjs/common';

describe('ImportRequisitionsService (KMSICAMS-12 Phase 1)', () => {
  let service: ImportRequisitionsService;
  let reqRepo: any;
  let lineRepo: any;
  let productRepo: any;
  let poRepo: any;
  let poLineRepo: any;
  let exchangeRateRepo: any;
  let auditService: any;
  let dataSource: any;

  beforeEach(async () => {
    reqRepo = {
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
      delete: jest.fn(),
    };

    productRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
    };

    poRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    };

    poLineRepo = {
      create: jest.fn(),
      save: jest.fn(),
    };

    exchangeRateRepo = {
      findOne: jest.fn().mockResolvedValue({ currency: 'USD', rateToEtb: 120 }),
    };

    auditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    dataSource = {
      transaction: jest.fn().mockImplementation(async (cb) => {
        const mockManager = {
          create: jest.fn((entity, data) => ({ ...data, requisitionId: '10', poId: '20' })),
          save: jest.fn((entity, data) => Promise.resolve(data || entity)),
          delete: jest.fn().mockResolvedValue(undefined),
          query: jest.fn().mockResolvedValue([{ value: 1 }]),
        };
        return cb(mockManager);
      }),
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportRequisitionsService,
        { provide: getRepositoryToken(ImportRequisition), useValue: reqRepo },
        { provide: getRepositoryToken(ImportRequisitionLine), useValue: lineRepo },
        { provide: getRepositoryToken(ProductItem), useValue: productRepo },
        { provide: getRepositoryToken(PurchaseOrder), useValue: poRepo },
        { provide: getRepositoryToken(PurchaseOrderLine), useValue: poLineRepo },
        { provide: getRepositoryToken(ExchangeRateDefault), useValue: exchangeRateRepo },
        { provide: AuditService, useValue: auditService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<ImportRequisitionsService>(ImportRequisitionsService);
  });

  describe('Requisition Creation (Story IMP-01, IMP-02)', () => {
    it('should create a requisition with line items and default to DRAFT', async () => {
      productRepo.find.mockResolvedValue([{ itemId: '1', itemName: 'Bajaj RE 4S' }]);

      jest.spyOn(service, 'findOne').mockResolvedValue({
        requisitionId: '10',
        requisitionNumber: 'REQ-2024-00010',
        status: ImportRequisitionStatus.DRAFT,
        estimatedBudget: 30000,
        currency: 'USD',
        lines: [
          {
            requisitionLineId: '1',
            itemId: '1',
            quantityRequested: 10,
            estimatedUnitPrice: 3000,
          } as any,
        ],
      } as any);

      const result = await service.create({
        businessUnitId: 'Commercial Fleet',
        currency: 'USD',
        lines: [
          {
            itemId: '1',
            quantityRequested: 10,
            estimatedUnitPrice: 3000,
          },
        ],
      });

      expect(result).toBeDefined();
      expect(result.status).toBe(ImportRequisitionStatus.DRAFT);
      expect(result.estimatedBudget).toBe(30000);
    });

    it('should REJECT requisition creation if line items are empty', async () => {
      await expect(
        service.create({
          currency: 'USD',
          lines: [],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Approval Workflow (Story IMP-03)', () => {
    it('should submit DRAFT requisition for approval', async () => {
      const mockReq = {
        requisitionId: '1',
        status: ImportRequisitionStatus.DRAFT,
      };
      jest.spyOn(service, 'findOne').mockResolvedValue(mockReq as any);
      reqRepo.save.mockImplementation((r: any) => Promise.resolve(r));

      const updated = await service.submit('1', 1);
      expect(mockReq.status).toBe(ImportRequisitionStatus.SUBMITTED);
    });

    it('should approve SUBMITTED requisition', async () => {
      const mockReq = {
        requisitionId: '1',
        status: ImportRequisitionStatus.SUBMITTED,
      };
      jest.spyOn(service, 'findOne').mockResolvedValue(mockReq as any);
      reqRepo.save.mockImplementation((r: any) => Promise.resolve(r));

      await service.approve('1', 'Approved for foreign procurement', 2);
      expect(mockReq.status).toBe(ImportRequisitionStatus.APPROVED);
    });

    it('should REJECT submitted requisition with reason', async () => {
      const mockReq = {
        requisitionId: '1',
        status: ImportRequisitionStatus.SUBMITTED,
      };
      jest.spyOn(service, 'findOne').mockResolvedValue(mockReq as any);
      reqRepo.save.mockImplementation((r: any) => Promise.resolve(r));

      await service.reject('1', 'Budget cap exceeded', 2);
      expect(mockReq.status).toBe(ImportRequisitionStatus.REJECTED);
      expect((mockReq as any).rejectionReason).toBe('Budget cap exceeded');
    });
  });

  describe('Stock and Order Review (Story IMP-04, IMP-05)', () => {
    it('should calculate stock, open POs, and pending requisitions for requested item', async () => {
      productRepo.findOne.mockResolvedValue({
        itemId: '1',
        itemName: 'Bajaj Maxima Z',
        itemCode: 'ITM-MAX-01',
      });

      dataSource.query
        .mockResolvedValueOnce([{ on_hand: '20', reserved: '5' }]) // stock_balance
        .mockResolvedValueOnce([{ open_po_qty: '30' }]) // open POs
        .mockResolvedValueOnce([{ open_req_qty: '15' }]); // open requisitions

      const review = await service.getStockAndOrderReview('1');
      expect(review.stockOnHand).toBe(20);
      expect(review.stockReserved).toBe(5);
      expect(review.stockAvailable).toBe(15);
      expect(review.openPOQuantity).toBe(30);
      expect(review.pendingRequisitionQuantity).toBe(15);
      expect(review.totalPipeline).toBe(60);
    });
  });

  describe('Convert Approved Requisition to PO (Story IMP-06)', () => {
    it('should convert APPROVED requisition into a new PO and update status to CONVERTED_TO_PO', async () => {
      const mockReq = {
        requisitionId: '1',
        requisitionNumber: 'REQ-2024-00001',
        status: ImportRequisitionStatus.APPROVED,
        currency: 'USD',
        lines: [
          {
            itemId: '1',
            quantityRequested: 20,
            estimatedUnitPrice: 2500,
          },
        ],
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(mockReq as any);
      poRepo.findOne.mockResolvedValue({
        poId: '20',
        poNumber: 'PO-000001',
        requisitionId: '1',
      });

      const convertedPO = await service.convertToPO('1', { supplierId: 5 }, 1);
      expect(convertedPO).toBeDefined();
      expect(mockReq.status).toBe(ImportRequisitionStatus.CONVERTED_TO_PO);
    });

    it('should REJECT conversion if requisition is already CONVERTED_TO_PO', async () => {
      const mockReq = {
        requisitionId: '1',
        requisitionNumber: 'REQ-2024-00001',
        status: ImportRequisitionStatus.CONVERTED_TO_PO,
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(mockReq as any);

      await expect(service.convertToPO('1', { supplierId: 5 }, 1)).rejects.toThrow(ConflictException);
    });
  });
});

