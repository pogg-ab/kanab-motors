import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { Customer, CustomerType } from './entities/customer.entity';
import { CustomerBankAccount } from './entities/customer-bank-account.entity';
import { CustomerAccountSummary } from './entities/customer-account-summary.entity';
import { Attachment } from './entities/attachment.entity';
import { AuditService } from '../audit/audit.service';

describe('CustomersService', () => {
  let service: CustomersService;
  let customerRepo: any;
  let summaryRepo: any;
  let bankRepo: any;
  let attachmentRepo: any;
  let auditService: any;

  beforeEach(async () => {
    customerRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((dto) => ({ ...dto, customerId: '1', customerCode: 'CUST-000001' })),
      save: jest.fn((entity) => Promise.resolve({ ...entity, customerId: '1', customerCode: 'CUST-000001' })),
      createQueryBuilder: jest.fn(),
    };
    summaryRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((dto) => dto),
      save: jest.fn((dto) => Promise.resolve(dto)),
    };
    bankRepo = {
      create: jest.fn((dto) => dto),
      save: jest.fn((dto) => Promise.resolve(dto)),
    };
    attachmentRepo = {
      find: jest.fn().mockResolvedValue([]),
    };
    auditService = {
      log: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        { provide: getRepositoryToken(Customer), useValue: customerRepo },
        { provide: getRepositoryToken(CustomerBankAccount), useValue: bankRepo },
        { provide: getRepositoryToken(CustomerAccountSummary), useValue: summaryRepo },
        { provide: getRepositoryToken(Attachment), useValue: attachmentRepo },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
  });

  it('should reject DEALER customer creation without TIN number', async () => {
    await expect(
      service.create({
        customerType: CustomerType.DEALER,
        fullName: 'Dealer Motors PLC',
        mobileNumber: '+251911000001',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject GOVERNMENT customer creation without TIN number', async () => {
    await expect(
      service.create({
        customerType: CustomerType.GOVERNMENT,
        fullName: 'Ministry of Transport',
        mobileNumber: '+251911000002',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should allow DIRECT_POS customer creation without TIN number', async () => {
    // 1st call for mobile check returns null
    // 2nd call in findOne returns the created customer
    customerRepo.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        customerId: '1',
        customerCode: 'CUST-000001',
        fullName: 'John Doe',
        customerType: CustomerType.DIRECT_POS,
        mobileNumber: '+251911000003',
      });

    const result = await service.create({
      customerType: CustomerType.DIRECT_POS,
      fullName: 'John Doe',
      mobileNumber: '+251911000003',
    });
    expect(result).toBeDefined();
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'INSERT', entityType: 'customer' }),
    );
  });

  it('should reject duplicate mobile number', async () => {
    customerRepo.findOne.mockResolvedValueOnce({ customerId: '2', customerCode: 'CUST-000002' });
    await expect(
      service.create({
        customerType: CustomerType.DIRECT_POS,
        fullName: 'Duplicate Mobile',
        mobileNumber: '+251911000003',
      }),
    ).rejects.toThrow(ConflictException);
  });
});
