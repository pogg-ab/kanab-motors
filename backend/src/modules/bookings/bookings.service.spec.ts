import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { Booking } from './entities/booking.entity';
import { PreAdvanceSlip } from '../enquiries/entities/pre-advance-slip.entity';
import { SalesEnquiry } from '../enquiries/entities/sales-enquiry.entity';
import { ProductItem } from '../products/entities/product-item.entity';
import { Customer } from '../customers/entities/customer.entity';
import { LedgerService } from '../ledger/ledger.service';
import { AuditService } from '../audit/audit.service';

describe('BookingsService - Mandatory Salesperson Validation', () => {
  let service: BookingsService;
  let bookingRepo: any;
  let slipRepo: any;
  let enquiryRepo: any;
  let itemRepo: any;
  let customerRepo: any;
  let ledgerService: any;
  let auditService: any;

  beforeEach(async () => {
    bookingRepo = {
      findOne: jest.fn().mockResolvedValue({
        bookingId: '1',
        bookingNumber: 'BK-2026-00001',
        salespersonName: 'Sara Haile',
        quantity: 1,
        payments: [],
      }),
      find: jest.fn(),
      create: jest.fn((dto) => ({ ...dto, bookingId: '1', bookingNumber: 'BK-2026-00001' })),
      save: jest.fn((entity) => Promise.resolve({ ...entity, bookingId: '1', bookingNumber: 'BK-2026-00001' })),
      createQueryBuilder: jest.fn(),
      query: jest.fn().mockResolvedValue([{ total: '0' }]),
    };
    slipRepo = {
      findOne: jest.fn(),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };
    enquiryRepo = {
      findOne: jest.fn(),
      save: jest.fn((entity) => Promise.resolve(entity)),
    };
    itemRepo = {
      findOne: jest.fn().mockResolvedValue({
        itemId: '1',
        sellingPrice: 200000,
        taxConfig: { taxRatePct: 15 },
      }),
    };
    customerRepo = {
      findOne: jest.fn().mockResolvedValue({ customerId: '1', fullName: 'Dawit Mengistu' }),
    };
    ledgerService = {
      postJournalEntry: jest.fn().mockResolvedValue({}),
    };
    auditService = {
      log: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        { provide: getRepositoryToken(Booking), useValue: bookingRepo },
        { provide: getRepositoryToken(PreAdvanceSlip), useValue: slipRepo },
        { provide: getRepositoryToken(SalesEnquiry), useValue: enquiryRepo },
        { provide: getRepositoryToken(ProductItem), useValue: itemRepo },
        { provide: getRepositoryToken(Customer), useValue: customerRepo },
        { provide: LedgerService, useValue: ledgerService },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
  });

  it('should reject booking creation when salespersonName is empty or missing', async () => {
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

  it('should reject booking creation when generic placeholder is used (e.g. "salesperson")', async () => {
    await expect(
      service.create({
        customerId: '1',
        itemId: '1',
        quantity: 1,
        salespersonName: 'salesperson',
      } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('should reject conversion of enquiry to booking if enquiry has missing/empty salesperson', async () => {
    enquiryRepo.findOne.mockResolvedValue({
      enquiryId: '10',
      customerId: '1',
      itemId: '1',
      quantity: 1,
      unitPrice: 200000,
      salespersonName: '  ',
    });

    await expect(service.convertFromEnquiry('10')).rejects.toThrow(BadRequestException);
  });

  it('should successfully create booking with valid salesperson name and store trimmed name', async () => {
    const booking = await service.create({
      customerId: '1',
      itemId: '1',
      quantity: 1,
      salespersonName: '  Sara Haile  ',
    });

    expect(bookingRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        salespersonName: 'Sara Haile',
      }),
    );
    expect(booking).toBeDefined();
  });
});
