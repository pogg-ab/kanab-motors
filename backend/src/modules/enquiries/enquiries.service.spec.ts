import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { EnquiriesService } from './enquiries.service';
import { SalesEnquiry } from './entities/sales-enquiry.entity';
import { PreAdvanceSlip } from './entities/pre-advance-slip.entity';
import { ProductItem } from '../products/entities/product-item.entity';
import { Customer } from '../customers/entities/customer.entity';
import { AuditService } from '../audit/audit.service';

describe('EnquiriesService - Mandatory Salesperson Validation', () => {
  let service: EnquiriesService;
  let enquiryRepo: any;
  let slipRepo: any;
  let itemRepo: any;
  let customerRepo: any;
  let auditService: any;

  beforeEach(async () => {
    enquiryRepo = {
      findOne: jest.fn().mockResolvedValue({ enquiryId: '1', enquiryNumber: 'ENQ-2026-00001', salespersonName: 'Yared Tadesse' }),
      find: jest.fn(),
      create: jest.fn((dto) => ({ ...dto, enquiryId: '1', enquiryNumber: 'ENQ-2026-00001' })),
      save: jest.fn((entity) => Promise.resolve({ ...entity, enquiryId: '1', enquiryNumber: 'ENQ-2026-00001' })),
      createQueryBuilder: jest.fn(),
    };
    slipRepo = {
      findOne: jest.fn(),
      create: jest.fn((dto) => dto),
      save: jest.fn((dto) => Promise.resolve(dto)),
      createQueryBuilder: jest.fn(),
    };
    itemRepo = {
      findOne: jest.fn().mockResolvedValue({
        itemId: '1',
        sellingPrice: 150000,
        taxConfig: { taxRatePct: 15 },
      }),
    };
    customerRepo = {
      findOne: jest.fn().mockResolvedValue({ customerId: '1', fullName: 'Abebe Kebede' }),
    };
    auditService = {
      log: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnquiriesService,
        { provide: getRepositoryToken(SalesEnquiry), useValue: enquiryRepo },
        { provide: getRepositoryToken(PreAdvanceSlip), useValue: slipRepo },
        { provide: getRepositoryToken(ProductItem), useValue: itemRepo },
        { provide: getRepositoryToken(Customer), useValue: customerRepo },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<EnquiriesService>(EnquiriesService);
  });

  it('should reject enquiry creation when salespersonName is empty or missing', async () => {
    await expect(
      service.create({
        customerId: '1',
        itemId: '1',
        quantity: 1,
        salespersonName: '',
      } as any),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.create({
        customerId: '1',
        itemId: '1',
        quantity: 1,
        salespersonName: '   ',
      } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject enquiry creation when generic placeholder is used (e.g. "salesperson", "sales rep")', async () => {
    const genericNames = ['salesperson', 'Sales Person', 'sales rep', 'representative', 'n/a', 'test'];
    for (const name of genericNames) {
      await expect(
        service.create({
          customerId: '1',
          itemId: '1',
          quantity: 1,
          salespersonName: name,
        } as any),
      ).rejects.toThrow(BadRequestException);
    }
  });

  it('should successfully create enquiry with valid real salesperson name', async () => {
    const enquiry = await service.create({
      customerId: '1',
      itemId: '1',
      quantity: 1,
      salespersonName: '  Yared Tadesse  ',
    });

    expect(enquiryRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        salespersonName: 'Yared Tadesse',
      }),
    );
    expect(enquiry).toBeDefined();
  });
});
