import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PurchaseOrdersService } from './purchase-orders.service';
import { PurchaseOrder, POStatus } from './entities/purchase-order.entity';
import { PurchaseOrderLine } from './entities/purchase-order-line.entity';
import { CompanyProfile } from './entities/company-profile.entity';
import { CompanyBankAccount } from './entities/company-bank-account.entity';
import { ImportComplianceRecord } from './entities/import-compliance-record.entity';
import { PoPaymentSchedule } from './entities/po-payment-schedule.entity';
import { PoPaymentTransaction } from './entities/po-payment-transaction.entity';
import { PoLetterOfCredit } from './entities/po-letter-of-credit.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { ProductItem } from '../products/entities/product-item.entity';
import { ExchangeRateDefault } from '../shipments/entities/exchange-rate-default.entity';
import { AuditService } from '../audit/audit.service';
import { BadRequestException, ConflictException } from '@nestjs/common';

describe('PurchaseOrdersService (KMSICAMS-12 Phases 2, 3, 4)', () => {
  let service: PurchaseOrdersService;
  let poRepo: any;
  let poLineRepo: any;
  let companyProfileRepo: any;
  let bankAccountRepo: any;
  let complianceRepo: any;
  let paymentScheduleRepo: any;
  let paymentTxnRepo: any;
  let lcRepo: any;
  let supplierRepo: any;
  let productRepo: any;
  let exchangeRateRepo: any;
  let auditService: any;
  let dataSource: any;

  beforeEach(async () => {
    poRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    poLineRepo = {
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    companyProfileRepo = {
      findOne: jest.fn().mockResolvedValue({
        companyName: 'KANAB Motors PLC',
        iecNo: 'ETH-IEC-994821',
        adCode: 'AD-CBE-0019284',
      }),
    };

    bankAccountRepo = {
      find: jest.fn().mockResolvedValue([{ bankAccountId: 1, bankName: 'CBE', accountNumber: '1000' }]),
      findOne: jest.fn().mockResolvedValue({ bankAccountId: 1, bankName: 'CBE', accountNumber: '1000' }),
    };

    complianceRepo = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((data) => ({ ...data, complianceRecordId: '1' })),
      save: jest.fn((data) => Promise.resolve(data)),
      findOne: jest.fn(),
    };

    paymentScheduleRepo = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((data) => ({ ...data, paymentScheduleId: '1' })),
      save: jest.fn((data) => Promise.resolve(data)),
      findOne: jest.fn(),
    };

    paymentTxnRepo = {
      create: jest.fn((data) => ({ ...data, paymentTransactionId: '1' })),
      save: jest.fn((data) => Promise.resolve(data)),
    };

    lcRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      create: jest.fn((data) => ({ ...data, lcId: '1' })),
      save: jest.fn((data) => Promise.resolve(data)),
    };

    supplierRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
    };

    productRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
    };

    exchangeRateRepo = {
      findOne: jest.fn().mockResolvedValue({ currency: 'USD', rateToEtb: 120 }),
    };

    auditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    dataSource = {
      transaction: jest.fn(),
      createQueryRunner: jest.fn().mockReturnValue({
        connect: jest.fn().mockResolvedValue(undefined),
        startTransaction: jest.fn().mockResolvedValue(undefined),
        commitTransaction: jest.fn().mockResolvedValue(undefined),
        rollbackTransaction: jest.fn().mockResolvedValue(undefined),
        release: jest.fn().mockResolvedValue(undefined),
        manager: {
          create: jest.fn((entity, data) => ({ ...data, poId: '1' })),
          save: jest.fn((entity, data) => Promise.resolve(data || entity)),
          delete: jest.fn().mockResolvedValue(undefined),
          query: jest.fn().mockResolvedValue([{ value: 1 }]),
        },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PurchaseOrdersService,
        { provide: getRepositoryToken(PurchaseOrder), useValue: poRepo },
        { provide: getRepositoryToken(PurchaseOrderLine), useValue: poLineRepo },
        { provide: getRepositoryToken(CompanyProfile), useValue: companyProfileRepo },
        { provide: getRepositoryToken(CompanyBankAccount), useValue: bankAccountRepo },
        { provide: getRepositoryToken(ImportComplianceRecord), useValue: complianceRepo },
        { provide: getRepositoryToken(PoPaymentSchedule), useValue: paymentScheduleRepo },
        { provide: getRepositoryToken(PoPaymentTransaction), useValue: paymentTxnRepo },
        { provide: getRepositoryToken(PoLetterOfCredit), useValue: lcRepo },
        { provide: getRepositoryToken(Supplier), useValue: supplierRepo },
        { provide: getRepositoryToken(ProductItem), useValue: productRepo },
        { provide: getRepositoryToken(ExchangeRateDefault), useValue: exchangeRateRepo },
        { provide: AuditService, useValue: auditService },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<PurchaseOrdersService>(PurchaseOrdersService);
  });

  describe('Commercial & Compliance Validation Gate (Story IMP-11, IMP-15)', () => {
    it('should PASS validation when mandatory commercial terms and compliant records are present', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({
        poId: '1',
        incoterms: 'FOB',
        portOfLoading: 'Nhava Sheva',
        portOfDischarge: 'Djibouti',
        bankAccountId: 1,
      } as any);

      complianceRepo.find.mockResolvedValue([
        { complianceRecordId: '1', requirementType: 'IMPORT_PERMIT', status: 'APPROVED' },
      ]);

      const result = await service.validateCommercialReadiness('1');
      expect(result.isReady).toBe(true);
    });

    it('should REJECT validation if mandatory terms like incoterms or ports are missing', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue({
        poId: '1',
        incoterms: '',
        portOfLoading: '',
        portOfDischarge: 'Djibouti',
        bankAccountId: 1,
      } as any);

      await expect(service.validateCommercialReadiness('1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('Payment Schedule & Transaction Recording (Story IMP-16, IMP-18)', () => {
    it('should record payment transaction and update milestone status to PAID when fully paid', async () => {
      const mockSchedule = {
        paymentScheduleId: '1',
        amountDue: 30000,
        currency: 'USD',
        status: 'PLANNED',
        transactions: [],
      };
      paymentScheduleRepo.findOne.mockResolvedValue(mockSchedule);

      const txn = await service.recordPaymentTransaction({
        paymentScheduleId: '1',
        paymentReference: 'SWIFT-FT-99281',
        amountPaid: 30000,
        currency: 'USD',
      });

      expect(txn).toBeDefined();
      expect(mockSchedule.status).toBe('PAID');
    });

    it('should REJECT payment transaction if amount exceeds milestone balance over allowable buffer', async () => {
      const mockSchedule = {
        paymentScheduleId: '1',
        amountDue: 10000,
        currency: 'USD',
        status: 'PLANNED',
        transactions: [],
      };
      paymentScheduleRepo.findOne.mockResolvedValue(mockSchedule);

      await expect(
        service.recordPaymentTransaction({
          paymentScheduleId: '1',
          paymentReference: 'SWIFT-FT-EXCESS',
          amountPaid: 15000, // Exceeds by 50%
          currency: 'USD',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Letter of Credit (Story IMP-20)', () => {
    it('should prevent duplicate Letter of Credit reference numbers', async () => {
      lcRepo.findOne.mockResolvedValue({ lcId: '5', lcNumber: 'LC-2024-CBE-001' });

      await expect(
        service.createLetterOfCredit({
          poId: '1',
          lcNumber: 'LC-2024-CBE-001',
          issuingBank: 'Commercial Bank of Ethiopia',
          amount: 50000,
          currency: 'USD',
          issueDate: '2024-03-01',
          expiryDate: '2024-09-01',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });
});

