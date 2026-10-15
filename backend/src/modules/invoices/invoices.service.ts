import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { SalesInvoice, InvoiceStatus } from './entities/sales-invoice.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { RecordWhtSettlementDto, UpdateWhtCertificateDto } from './dto/record-wht-settlement.dto';
import { LedgerService } from '../ledger/ledger.service';
import { LedgerTransactionType } from '../ledger/entities/customer-ledger-transaction.entity';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(SalesInvoice)
    private invoiceRepo: Repository<SalesInvoice>,
    @InjectRepository(Booking)
    private bookingRepo: Repository<Booking>,
    private dataSource: DataSource,
    private ledgerService: LedgerService,
  ) {}

  async create(dto: CreateInvoiceDto, userId = 1): Promise<SalesInvoice> {
    const booking = await this.bookingRepo.findOne({
      where: { bookingId: String(dto.bookingId) },
      relations: ['customer', 'item'],
    });

    if (!booking) {
      throw new NotFoundException(`Booking #${dto.bookingId} not found`);
    }

    const quantity = dto.quantity || Number(booking.quantity) || 1;
    let unitPrice = dto.unitPrice;
    if (unitPrice === undefined || unitPrice === null) {
      unitPrice = Number(booking.unitPrice) || (Number(booking.grossTotal) / quantity);
    }

    const subtotal = quantity * unitPrice;
    const taxRate = dto.taxRate !== undefined ? dto.taxRate : 0.15; // 15% Ethiopian standard VAT
    const vatAmount = Math.round(subtotal * taxRate * 100) / 100;
    const grossTotal = subtotal + vatAmount;

    // Resolve vehicle unit if not provided
    let vehicleUnitId = dto.vehicleUnitId ? String(dto.vehicleUnitId) : null;
    if (!vehicleUnitId) {
      // Find vehicle from approved allotment
      const allotmentRow = await this.dataSource.query(`
        SELECT al.vehicle_unit_id
        FROM allotment_line al
        JOIN allotment a ON a.allotment_id = al.allotment_id
        WHERE a.booking_id = $1 AND a.status = 'APPROVED' AND al.is_active = TRUE
        LIMIT 1
      `, [booking.bookingId]);

      if (allotmentRow.length > 0) {
        vehicleUnitId = String(allotmentRow[0].vehicle_unit_id);
      }
    }

    // Story IV14: WHT applicability from customer tax standing
    const isWhtCustomer = (booking.customer as any)?.withholdingTaxFlag || false;
    const whtApplicable = dto.whtApplicable !== undefined ? dto.whtApplicable : isWhtCustomer;
    const whtRate = dto.whtRate !== undefined ? dto.whtRate : 0.02;
    const whtStatus = whtApplicable ? 'PENDING_CERTIFICATE' : 'NONE';

    // Calculate deposits applied and excess flag
    let depositsApplied = 0;
    let excessPaymentFlag = false;

    if (dto.applyDeposits !== false) {
      const totalDeposited = Number(booking.totalAmountDeposited) || 0;
      depositsApplied = Math.min(totalDeposited, grossTotal);
      excessPaymentFlag = totalDeposited > grossTotal;
    }

    // Insert invoice
    const insertResult = await this.dataSource.query(`
      INSERT INTO sales_invoice (
        booking_id, customer_id, item_id, vehicle_unit_id,
        quantity, unit_price, vat_amount, deposits_applied,
        excess_payment_flag, status, created_by,
        wht_applicable, wht_rate, wht_status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'DRAFT', $10, $11, $12, $13)
      RETURNING invoice_id
    `, [
      booking.bookingId,
      booking.customerId,
      booking.itemId,
      vehicleUnitId,
      quantity,
      unitPrice,
      vatAmount,
      depositsApplied,
      excessPaymentFlag,
      userId,
      whtApplicable,
      whtRate,
      whtStatus,
    ]);

    const invoiceId = insertResult[0].invoice_id;
    return this.findOne(String(invoiceId));
  }

  async findAll(filters?: { status?: InvoiceStatus; customerId?: string }): Promise<SalesInvoice[]> {
    const qb = this.invoiceRepo
      .createQueryBuilder('inv')
      .leftJoinAndSelect('inv.booking', 'bkg')
      .leftJoinAndSelect('inv.customer', 'cust')
      .leftJoinAndSelect('inv.item', 'item')
      .leftJoinAndSelect('inv.vehicleUnit', 'vu')
      .leftJoinAndSelect('inv.creator', 'creator')
      .orderBy('inv.createdAt', 'DESC');

    if (filters?.status) {
      qb.andWhere('inv.status = :status', { status: filters.status });
    }
    if (filters?.customerId) {
      qb.andWhere('inv.customerId = :cid', { cid: filters.customerId });
    }

    return qb.getMany();
  }

  async findOne(id: string): Promise<SalesInvoice> {
    const invoice = await this.invoiceRepo.findOne({
      where: { invoiceId: id },
      relations: ['booking', 'customer', 'item', 'vehicleUnit', 'creator'],
    });

    if (!invoice) {
      throw new NotFoundException(`Sales invoice #${id} not found`);
    }

    return invoice;
  }

  async approve(id: string, userId = 1, comments = 'Sales invoice approved and finalized'): Promise<SalesInvoice> {
    const invoice = await this.findOne(id);
    if (invoice.status === InvoiceStatus.APPROVED) {
      return invoice;
    }

    // Find pending approval request
    const pendingRequest = await this.dataSource.query(`
      SELECT approval_request_id
      FROM approval_request
      WHERE entity_type = 'SALES_INVOICE' AND entity_id = $1 AND status = 'PENDING'
      LIMIT 1
    `, [id]);

    if (pendingRequest.length > 0) {
      const requestId = pendingRequest[0].approval_request_id;
      await this.dataSource.query(`
        SELECT fn_record_approval_decision($1, $2, $3, $4)
      `, [requestId, 'APPROVED', userId, comments]);
    } else {
      // Direct call fallback
      await this.dataSource.query(`
        SELECT fn_apply_invoice_approval($1, $2)
      `, [id, userId]);
    }

    return this.findOne(id);
  }

  async reject(id: string, userId = 1, comments = 'Sales invoice rejected'): Promise<SalesInvoice> {
    const invoice = await this.findOne(id);

    const pendingRequest = await this.dataSource.query(`
      SELECT approval_request_id
      FROM approval_request
      WHERE entity_type = 'SALES_INVOICE' AND entity_id = $1 AND status = 'PENDING'
      LIMIT 1
    `, [id]);

    if (pendingRequest.length > 0) {
      const requestId = pendingRequest[0].approval_request_id;
      await this.dataSource.query(`
        SELECT fn_record_approval_decision($1, $2, $3, $4)
      `, [requestId, 'REJECTED', userId, comments]);
    } else {
      await this.dataSource.query(`
        UPDATE sales_invoice SET status = 'REJECTED' WHERE invoice_id = $1
      `, [id]);
    }

    return this.findOne(id);
  }

  /**
   * Story IV14: Tax withheld by the customer, recorded as a non-cash settlement.
   * - Offsets invoice balance
   * - Records separate WHT_SETTLEMENT credit in customer ledger carrying certificate number
   * - Non-refundable (decreases outstanding debt without adding to cash refundable balance)
   */
  async recordWhtSettlement(id: string, dto: RecordWhtSettlementDto, userId = 1): Promise<SalesInvoice> {
    const invoice = await this.findOne(id);
    const amount = Number(dto.whtAmount);
    if (!amount || amount <= 0) {
      throw new BadRequestException('Withholding tax amount must be greater than zero');
    }

    const certNo = dto.certificateNumber?.trim() || `WHT-CERT-${invoice.invoiceNumber}`;
    const certDate = dto.certificateDate || new Date().toISOString().split('T')[0];
    const notes = dto.notes || `Tax withheld at source, certificate ${certNo}`;

    // 1. Post to Customer Ledger as atomic non-cash WHT_SETTLEMENT credit (Story IV14)
    // Non-refundable: decreases outstanding balance only, does NOT touch refundableBalance or totalDeposits
    await this.ledgerService.postTransaction({
      customerId: String(invoice.customerId),
      transactionType: LedgerTransactionType.WHT_SETTLEMENT,
      referenceNumber: certNo,
      description: notes,
      creditAmount: amount,
      debitAmount: 0,
      relatedSalesInvoiceId: String(invoice.invoiceId),
      relatedBookingId: String(invoice.bookingId),
      processedBy: userId,
      summaryDelta: {
        outstandingBalance: -amount,
      },
    });

    // 2. Update sales_invoice record:
    // Update deposits_applied (which in postgres satisfies outstanding_balance = quantity*unit_price+vat - deposits_applied = 0)
    await this.dataSource.query(`
      UPDATE sales_invoice
      SET deposits_applied = deposits_applied + $1,
          wht_applicable = TRUE,
          wht_amount = COALESCE(wht_amount, 0) + $1,
          wht_certificate_number = $2,
          wht_certificate_date = $3,
          wht_status = 'CERTIFICATE_RECEIVED',
          wht_settled_at = NOW()
      WHERE invoice_id = $4
    `, [amount, certNo, certDate, id]);

    return this.findOne(id);
  }

  /**
   * Story IV14: Finance tracks certificates.
   * Returns list of withheld amounts, certificate numbers, and status.
   */
  async getWhtCertificates(): Promise<any[]> {
    const rows = await this.dataSource.query(`
      SELECT 
        inv.invoice_id AS "invoiceId",
        inv.invoice_number AS "invoiceNumber",
        inv.created_at AS "createdAt",
        inv.gross_total AS "grossTotal",
        inv.deposits_applied AS "depositsApplied",
        inv.outstanding_balance AS "outstandingBalance",
        inv.status AS "status",
        inv.wht_applicable AS "whtApplicable",
        inv.wht_amount AS "whtAmount",
        inv.wht_certificate_number AS "whtCertificateNumber",
        inv.wht_certificate_date AS "whtCertificateDate",
        inv.wht_status AS "whtStatus",
        inv.wht_settled_at AS "whtSettledAt",
        c.customer_id AS "customerId",
        c.full_name AS "customerName",
        c.tin_number AS "tinNumber",
        c.mobile_number AS "mobileNumber",
        b.booking_number AS "bookingNumber"
      FROM sales_invoice inv
      JOIN customer c ON c.customer_id = inv.customer_id
      LEFT JOIN booking b ON b.booking_id = inv.booking_id
      WHERE inv.wht_applicable = TRUE OR (inv.wht_amount IS NOT NULL AND inv.wht_amount > 0) OR c.withholding_tax_flag = TRUE
      ORDER BY inv.created_at DESC
    `);
    return rows;
  }

  async updateWhtCertificate(id: string, dto: UpdateWhtCertificateDto): Promise<SalesInvoice> {
    const invoice = await this.findOne(id);
    const updates: string[] = [];
    const params: any[] = [];
    let pIdx = 1;

    if (dto.certificateNumber !== undefined) {
      updates.push(`wht_certificate_number = $${pIdx++}`);
      params.push(dto.certificateNumber);
    }
    if (dto.certificateDate !== undefined) {
      updates.push(`wht_certificate_date = $${pIdx++}`);
      params.push(dto.certificateDate);
    }
    if (dto.status !== undefined) {
      updates.push(`wht_status = $${pIdx++}`);
      params.push(dto.status);
    }

    if (updates.length > 0) {
      params.push(id);
      await this.dataSource.query(`
        UPDATE sales_invoice
        SET ${updates.join(', ')}
        WHERE invoice_id = $${pIdx}
      `, params);
    }

    return this.findOne(id);
  }
}
