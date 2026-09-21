import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { LedgerService } from './ledger.service';
import { LedgerTransactionType } from './entities/customer-ledger-transaction.entity';
import { AuditService } from '../audit/audit.service';
import { DataSource } from 'typeorm';

describe('LedgerService (Financial Engine - Story L2, L3, L6)', () => {
  let service: LedgerService;
  let dataSource: any;
  let auditService: any;

  beforeEach(async () => {
    auditService = {
      log: jest.fn().mockResolvedValue({}),
    };

    dataSource = {
      transaction: jest.fn(async (cb) => {
        const mockManager = {
          createQueryBuilder: jest.fn().mockReturnValue({
            setLock: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            getOne: jest.fn().mockResolvedValueOnce({
              customerId: '1',
              totalDeposits: 0,
              refundableBalance: 0,
            }), // for summary
          }),
          findOne: jest.fn().mockResolvedValue({ customerId: '1' }),
          create: jest.fn((entityClass, data) => data),
          save: jest.fn((data) => Promise.resolve(data)),
        };
        return cb(mockManager);
      }),
      getRepository: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LedgerService,
        { provide: DataSource, useValue: dataSource },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<LedgerService>(LedgerService);
  });

  it('should reject zero debit and zero credit transaction', async () => {
    await expect(
      service.postTransaction({
        customerId: '1',
        transactionType: LedgerTransactionType.ADVANCE_DEPOSIT,
        referenceNumber: 'BRV-001',
        description: 'Zero test',
        debitAmount: 0,
        creditAmount: 0,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject negative debit or credit amount', async () => {
    await expect(
      service.postTransaction({
        customerId: '1',
        transactionType: LedgerTransactionType.ADVANCE_DEPOSIT,
        referenceNumber: 'BRV-001',
        description: 'Negative test',
        creditAmount: -5000,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should post transaction and compute running balance', async () => {
    const result = await service.postTransaction({
      customerId: '1',
      transactionType: LedgerTransactionType.ADVANCE_DEPOSIT,
      referenceNumber: 'BRV-001',
      description: 'Advance Deposit for Motorcycle Booking',
      creditAmount: 100000,
    });

    expect(result).toBeDefined();
    expect(result.creditAmount).toBe(100000);
    expect(result.runningBalance).toBe(100000);
  });
});
