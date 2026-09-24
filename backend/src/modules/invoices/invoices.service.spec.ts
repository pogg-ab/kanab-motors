import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { InvoicesService } from './invoices.service';
import { SalesInvoice, InvoiceStatus } from './entities/sales-invoice.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { NotFoundException } from '@nestjs/common';

describe('InvoicesService (KMSICAMS-6 Sales Invoice & Settlement)', () => {
  let service: InvoicesService;
  let invoiceRepo: any;
  let bookingRepo: any;
  let dataSource: any;

  beforeEach(async () => {
    invoiceRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    bookingRepo = {
      findOne: jest.fn(),
    };

    dataSource = {
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        { provide: getRepositoryToken(SalesInvoice), useValue: invoiceRepo },
        { provide: getRepositoryToken(Booking), useValue: bookingRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<InvoicesService>(InvoicesService);
  });

  describe('create - Invoice Calculation & Settlement Rules', () => {
    it('TC-I1: should accurately compute 15% Ethiopian standard VAT on gross sales total (Story IV2)', async () => {
      const mockBooking = {
        bookingId: '1',
        customerId: '10',
        itemId: '100',
        quantity: 1,
        unitPrice: 2000000,
        grossTotal: 2000000,
        totalAmountDeposited: 1500000,
      };
      bookingRepo.findOne.mockResolvedValue(mockBooking);
      dataSource.query
        .mockResolvedValueOnce([]) // allotment vehicle query
        .mockResolvedValueOnce([{ invoice_id: '1' }]); // insert query

      const expectedInvoice = {
        invoiceId: '1',
        bookingId: '1',
        quantity: 1,
        unitPrice: 2000000,
        vatAmount: 300000, // 15% of 2,000,000
        grossTotal: 2300000,
        depositsApplied: 1500000,
        outstandingBalance: 800000,
        status: InvoiceStatus.PENDING_APPROVAL,
      };
      invoiceRepo.findOne.mockResolvedValue(expectedInvoice);

      const result = await service.create({ bookingId: 1 });

      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO sales_invoice'),
        expect.arrayContaining([
          '1', // bookingId
          '10', // customerId
          '100', // itemId
          null, // vehicleUnitId
          1, // quantity
          2000000, // unitPrice
          300000, // vatAmount (15%)
          1500000, // depositsApplied
          false, // excessPaymentFlag
          1, // userId
        ]),
      );
      expect(result.vatAmount).toBe(300000);
      expect(result.grossTotal).toBe(2300000);
    });

    it('TC-I2: should detect excess payments when customer deposit exceeds invoice gross total (Story IV6)', async () => {
      const mockBooking = {
        bookingId: '2',
        customerId: '10',
        itemId: '100',
        quantity: 1,
        unitPrice: 1000000,
        grossTotal: 1000000,
        totalAmountDeposited: 1500000, // exceeds gross total (1,000,000 + 150,000 = 1,150,000)
      };
      bookingRepo.findOne.mockResolvedValue(mockBooking);
      dataSource.query
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ invoice_id: '2' }]);

      invoiceRepo.findOne.mockResolvedValue({
        invoiceId: '2',
        grossTotal: 1150000,
        depositsApplied: 1150000,
        outstandingBalance: 0,
        excessPaymentFlag: true,
      });

      await service.create({ bookingId: 2 });

      // Verifies excess_payment_flag = true and deposits_applied capped at grossTotal (1,150,000)
      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO sales_invoice'),
        expect.arrayContaining([
          '2',
          '10',
          '100',
          null,
          1,
          1000000,
          150000,
          1150000,
          true, // excessPaymentFlag is true
          1,
        ]),
      );
    });

    it('TC-I3: should throw NotFoundException when booking does not exist', async () => {
      bookingRepo.findOne.mockResolvedValue(null);
      await expect(service.create({ bookingId: 999 })).rejects.toThrow(NotFoundException);
    });
  });

  describe('approve - Invoice Approval & Vehicle Status Transition', () => {
    it('TC-I4: should submit approval decision and transition vehicle to SOLD (Stories IV9, IV10)', async () => {
      const pendingInvoice = {
        invoiceId: '1',
        invoiceNumber: 'INV-000001',
        status: InvoiceStatus.PENDING_APPROVAL,
      };
      const approvedInvoice = {
        invoiceId: '1',
        invoiceNumber: 'INV-000001',
        status: InvoiceStatus.APPROVED,
      };

      invoiceRepo.findOne
        .mockResolvedValueOnce(pendingInvoice)
        .mockResolvedValueOnce(approvedInvoice);

      dataSource.query
        .mockResolvedValueOnce([{ approval_request_id: '5' }]) // pending request lookup
        .mockResolvedValueOnce([]); // fn_record_approval_decision call

      const result = await service.approve('1', 1, 'Approved by Finance Director');

      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT fn_record_approval_decision'),
        ['5', 'APPROVED', 1, 'Approved by Finance Director'],
      );
      expect(result.status).toBe(InvoiceStatus.APPROVED);
    });
  });
});
