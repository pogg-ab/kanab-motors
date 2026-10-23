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

  it('FTC-03: should reject invalid mobile number format', async () => {
    await expect(
      service.create({
        customerType: CustomerType.DIRECT_POS,
        fullName: 'Invalid Mobile User',
        mobileNumber: '12345',
      }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.create({
        customerType: CustomerType.DIRECT_POS,
        fullName: 'Invalid Mobile User',
        mobileNumber: 'invalid-phone',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('FTC-03: should accept valid international mobile numbers from different countries', async () => {
    // USA (+1)
    customerRepo.findOne
      .mockResolvedValueOnce(null) // duplicate mobile check
      .mockResolvedValueOnce({
        customerId: 'us-1',
        fullName: 'US Client',
        mobileNumber: '+12025550199',
      });
    const resUs = await service.create({
      customerType: CustomerType.DIRECT_POS,
      fullName: 'US Client',
      mobileNumber: '+12025550199',
    });
    expect(resUs.mobileNumber).toBe('+12025550199');

    // UAE (+971)
    customerRepo.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        customerId: 'uae-1',
        fullName: 'UAE Client',
        mobileNumber: '+971501234567',
      });
    const resUae = await service.create({
      customerType: CustomerType.DIRECT_POS,
      fullName: 'UAE Client',
      mobileNumber: '+971501234567',
    });
    expect(resUae.mobileNumber).toBe('+971501234567');

    // Djibouti (+253)
    customerRepo.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        customerId: 'dj-1',
        fullName: 'Djibouti Client',
        mobileNumber: '+25377123456',
      });
    const resDj = await service.create({
      customerType: CustomerType.DIRECT_POS,
      fullName: 'Djibouti Client',
      mobileNumber: '+25377123456',
    });
    expect(resDj.mobileNumber).toBe('+25377123456');
  });

  it('FTC-03: should reject invalid TIN format (must be 10 digits)', async () => {
    await expect(
      service.create({
        customerType: CustomerType.DEALER,
        fullName: 'Invalid TIN Dealer',
        mobileNumber: '+251911000001',
        tinNumber: '123',
      }),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.create({
        customerType: CustomerType.DEALER,
        fullName: 'Invalid TIN Dealer',
        mobileNumber: '+251911000001',
        tinNumber: 'TIN-00123456',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
