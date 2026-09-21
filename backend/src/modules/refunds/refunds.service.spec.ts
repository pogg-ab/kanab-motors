import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { RefundsService } from './refunds.service';
import { CustomerRefund, RefundStatus } from './entities/customer-refund.entity';
import { CustomerAccountSummary } from '../customers/entities/customer-account-summary.entity';
import { Customer } from '../customers/entities/customer.entity';
import { LedgerService } from '../ledger/ledger.service';
import { AuditService } from '../audit/audit.service';

describe('RefundsService (SRS §7.4 Validation Rule - Story R2)', () => {
  let service: RefundsService;
  let refundRepo: any;
  let summaryRepo: any;
  let customerRepo: any;
  let ledgerService: any;
  let auditService: any;

  beforeEach(async () => {
    refundRepo = {
      create: jest.fn((dto) => ({ ...dto, refundId: '1', refundNumber: 'RFD-00001' })),
      save: jest.fn((entity) => Promise.resolve({ ...entity, refundId: '1', refundNumber: 'RFD-00001' })),
      findOne: jest.fn(),
    };
    summaryRepo = {
      findOne: jest.fn(),
    };
    customerRepo = {
      findOne: jest.fn().mockResolvedValue({ customerId: '1', fullName: 'Abebe Bikila' }),
    };
    ledgerService = {
      postTransaction: jest.fn().mockResolvedValue({}),
    };
    auditService = {
      log: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefundsService,
        { provide: getRepositoryToken(CustomerRefund), useValue: refundRepo },
        { provide: getRepositoryToken(CustomerAccountSummary), useValue: summaryRepo },
        { provide: getRepositoryToken(Customer), useValue: customerRepo },
        { provide: LedgerService, useValue: ledgerService },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<RefundsService>(RefundsService);
  });

  it('should REJECT refund request if amount exceeds available refundable balance (SRS §7.4 Rule)', async () => {
    // Customer has 20,000 ETB refundable balance
    summaryRepo.findOne.mockResolvedValue({ customerId: '1', refundableBalance: 20000 });

    // Customer requests 30,000 ETB refund -> MUST FAIL
    await expect(
      service.create({
        customerId: '1',
        refundAmount: 30000,
        refundReason: 'Excess payment withdrawal',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should ALLOW refund request if amount is within available refundable balance', async () => {
    // Customer has 50,000 ETB refundable balance
    summaryRepo.findOne.mockResolvedValue({ customerId: '1', refundableBalance: 50000 });
    refundRepo.findOne.mockResolvedValue({
      refundId: '1',
      refundNumber: 'RFD-00001',
      refundAmount: 30000,
      status: RefundStatus.REQUESTED,
    });

    const result = await service.create({
      customerId: '1',
      refundAmount: 30000,
      refundReason: 'Excess payment withdrawal',
    });

    expect(result).toBeDefined();
    expect(result.refundNumber).toBe('RFD-00001');
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'INSERT', entityType: 'customer_refund' }),
    );
  });
});
