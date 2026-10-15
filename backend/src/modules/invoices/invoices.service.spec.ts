import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { InvoicesService } from './invoices.service';
import { SalesInvoice, InvoiceStatus } from './entities/sales-invoice.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { LedgerService } from '../ledger/ledger.service';
import { NotFoundException } from '@nestjs/common';

describe('InvoicesService (KMSICAMS-11 Updated Story Points: Sales Invoice & Settlement)', () => {
  let service: InvoicesService;
  let invoiceRepo: any;
  let bookingRepo: any;
  let dataSource: any;
  let ledgerService: any;

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

    ledgerService = {
      postTransaction: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        { provide: getRepositoryToken(SalesInvoice), useValue: invoiceRepo },
        { provide: getRepositoryToken(Booking), useValue: bookingRepo },
        { provide: DataSource, useValue: dataSource },
        { provide: LedgerService, useValue: ledgerService },
      ],
    }).compile();

    service = module.get<InvoicesService>(InvoicesService);
  });

  describe('Story IV2: Tax Rule Evaluation Engine (evaluateTaxes)', () => {
    it('IV2.1: should evaluate standard vehicle tax (15% VAT, 0% Excise, 0% WHT)', async () => {
      dataSource.query.mockResolvedValueOnce([
        { tax_config_id: 1, tax_name: 'Standard VAT (15%)', tax_rate_pct: '15.00', tax_type: 'VAT', applicable_vehicle_type: 'ALL', priority: 2 },
        { tax_config_id: 2, tax_name: 'Excise Tax Motorcycle (10%)', tax_rate_pct: '10.00', tax_type: 'EXCISE', applicable_vehicle_type: 'MOTORCYCLE', priority: 1 },
      ]);

      const result = await service.evaluateTaxes({
        subtotal: 2000000,
        vehicleType: 'ALL',
        isWhtCustomer: false,
      });

      expect(result.subtotal).toBe(2000000);
      expect(result.vatAmount).toBe(300000); // 15% of 2,000,000
      expect(result.exciseTaxAmount).toBe(0);
      expect(result.totalTaxAmount).toBe(300000);
      expect(result.grossTotal).toBe(2300000);
      expect(result.whtAmount).toBe(0);
      expect(result.netPayable).toBe(2300000);
      expect(result.taxDetails.appliedRules).toHaveLength(3);
    });

    it('IV2.2: should evaluate Motorcycle with 10% Excise Duty + 15% VAT', async () => {
      dataSource.query.mockResolvedValueOnce([
        { tax_config_id: 1, tax_name: 'Standard VAT (15%)', tax_rate_pct: '15.00', tax_type: 'VAT', applicable_vehicle_type: 'ALL', priority: 2 },
        { tax_config_id: 2, tax_name: 'Excise Tax Motorcycle (10%)', tax_rate_pct: '10.00', tax_type: 'EXCISE', applicable_vehicle_type: 'MOTORCYCLE', priority: 1 },
      ]);

      const result = await service.evaluateTaxes({
        subtotal: 100000,
        vehicleType: 'MOTORCYCLE',
        isWhtCustomer: false,
      });

      expect(result.exciseTaxAmount).toBe(10000); // 10% of 100,000
      expect(result.vatAmount).toBe(15000); // 15% of 100,000
      expect(result.totalTaxAmount).toBe(25000); // 10,000 + 15,000
      expect(result.grossTotal).toBe(125000); // 100,000 + 25,000
      expect(result.netPayable).toBe(125000);
    });

    it('IV2.3: should evaluate Three-Wheeler for WHT Customer (Gross = Price + VAT + Excise; Net Payable = Gross - WHT)', async () => {
      dataSource.query.mockResolvedValueOnce([
        { tax_config_id: 1, tax_name: 'Standard VAT (15%)', tax_rate_pct: '15.00', tax_type: 'VAT', applicable_vehicle_type: 'ALL', priority: 2 },
        { tax_config_id: 3, tax_name: 'Excise Tax Three-Wheeler (5%)', tax_rate_pct: '5.00', tax_type: 'EXCISE', applicable_vehicle_type: 'THREE_WHEELER', priority: 1 },
        { tax_config_id: 4, tax_name: 'Withholding Tax (2%)', tax_rate_pct: '2.00', tax_type: 'WHT', applicable_customer_type: 'WHT_ONLY', priority: 3 },
      ]);

      const result = await service.evaluateTaxes({
        subtotal: 200000,
        vehicleType: 'THREE_WHEELER',
        isWhtCustomer: true,
      });

      expect(result.exciseTaxAmount).toBe(10000); // 5% of 200,000
      expect(result.vatAmount).toBe(30000); // 15% of 200,000
      expect(result.totalTaxAmount).toBe(40000); // 10,000 + 30,000
      expect(result.grossTotal).toBe(240000); // 200,000 + 40,000
      expect(result.whtAmount).toBe(4000); // 2% of 200,000 withheld
      expect(result.netPayable).toBe(236000); // 240,000 - 4,000
    });

    it('IV2.4: should honor tax exemptions and manual overrides with audit trail', async () => {
      dataSource.query.mockResolvedValueOnce([]);

      const result = await service.evaluateTaxes({
        subtotal: 1000000,
        vehicleType: 'MOTORCYCLE',
        isExciseExempt: true,
        vatRateOverride: 0.10, // 10% manual override
        isWhtExempt: true,
      });

      expect(result.exciseTaxAmount).toBe(0); // Exempted
      expect(result.vatAmount).toBe(100000); // 10% manual override
      expect(result.whtAmount).toBe(0); // Exempted
      expect(result.grossTotal).toBe(1100000);
      expect(result.netPayable).toBe(1100000);
    });
  });

  describe('Story IV3: Retrieve Customer Available Deposits & Credits', () => {
    it('IV3.1: should combine booking deposits and ledger credits', async () => {
      bookingRepo.findOne.mockResolvedValue({
        bookingId: '1',
        totalAmountDeposited: 500000,
      });
      dataSource.query.mockResolvedValueOnce([
        { unapplied_credit_balance: 50000, excess_payment_balance: 25000 },
      ]);

      const deposits = await service.getCustomerAvailableDeposits('10', '1');

      expect(deposits.bookingDeposits).toBe(500000);
      expect(deposits.ledgerCredits).toBe(75000);
      expect(deposits.totalEligibleDeposits).toBe(575000);
    });
  });

  describe('Story IV1, IV4, IV5, IV6: Create Invoice & Settlement Allocation', () => {
    it('IV1/IV4/IV5: should create invoice, apply deposits against net payable and submit to approval', async () => {
      bookingRepo.findOne.mockResolvedValue({
        bookingId: '1',
        customerId: '10',
        itemId: '100',
        quantity: 1,
        unitPrice: 200000,
        grossTotal: 200000,
        totalAmountDeposited: 240000,
        customer: { withholdingTaxFlag: true },
        item: { itemName: 'Bajaj Three-Wheeler', usageType: 'THREE_WHEELER' },
      });

      // 1. evaluateTaxes query
      dataSource.query.mockResolvedValueOnce([]);
      // 2. allotment line query
      dataSource.query.mockResolvedValueOnce([{ vehicle_unit_id: '99' }]);
      // 3. insert query
      dataSource.query.mockResolvedValueOnce([{ invoice_id: '1' }]);
      // 4. fn_submit_for_approval call
      dataSource.query.mockResolvedValueOnce([]);

      invoiceRepo.findOne.mockResolvedValue({
        invoiceId: '1',
        invoiceNumber: 'INV-000001',
        grossTotal: 240000,
        netPayable: 236000,
        depositsApplied: 236000,
        outstandingBalance: 0,
        excessPaymentFlag: true, // 240,000 deposited > 236,000 net payable
        status: InvoiceStatus.PENDING_APPROVAL,
      });

      const invoice = await service.create({ bookingId: 1 });

      expect(invoice.netPayable).toBe(236000);
      expect(invoice.depositsApplied).toBe(236000);
      expect(invoice.outstandingBalance).toBe(0);
      expect(invoice.excessPaymentFlag).toBe(true);
    });
  });

  describe('Story IV7, IV8, IV9, IV10: Approve Invoice & Final Settlement', () => {
    it('IV7/IV8/IV9: should transition vehicle to SOLD, settle booking, and post idempotent INVOICE_CHARGE', async () => {
      const invoice = {
        invoiceId: '1',
        invoiceNumber: 'INV-000001',
        bookingId: '1',
        customerId: '10',
        vehicleUnitId: '99',
        grossTotal: 240000,
        vatAmount: 30000,
        exciseTaxAmount: 10000,
        depositsApplied: 236000,
        status: InvoiceStatus.PENDING_APPROVAL,
      };

      invoiceRepo.findOne
        .mockResolvedValueOnce(invoice)
        .mockResolvedValueOnce({ ...invoice, status: InvoiceStatus.APPROVED });

      // 1. fn_transition_vehicle_status
      dataSource.query.mockResolvedValueOnce([]);
      // 2. UPDATE booking
      dataSource.query.mockResolvedValueOnce([]);
      // 3. Check existing customer_ledger_transaction charge (returns empty -> not yet posted)
      dataSource.query.mockResolvedValueOnce([]);
      // 4. Check approval_request
      dataSource.query.mockResolvedValueOnce([{ approval_request_id: '12' }]);
      // 5. fn_record_approval_decision
      dataSource.query.mockResolvedValueOnce([]);
      // 6. UPDATE sales_invoice
      dataSource.query.mockResolvedValueOnce([]);

      const result = await service.approve('1', 1, 'Final Settlement Approved');

      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('fn_transition_vehicle_status'),
        ['99', 1, 'Invoice INV-000001'],
      );
      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE booking SET booking_status = 'SETTLED'"),
        ['1'],
      );
      expect(ledgerService.postTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionType: 'INVOICE_CHARGE',
          referenceNumber: 'INV-000001',
          debitAmount: 240000,
        }),
      );
      expect(ledgerService.postTransaction).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionType: 'PAYMENT_ALLOCATION',
          creditAmount: 236000,
        }),
      );
      expect(result.status).toBe(InvoiceStatus.APPROVED);
    });
  });
});
