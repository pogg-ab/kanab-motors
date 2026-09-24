import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { SalesInvoice, InvoiceStatus } from './entities/sales-invoice.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { CreateInvoiceDto } from './dto/create-invoice.dto';

@Injectable()
export class InvoicesService {
  constructor(
    @InjectRepository(SalesInvoice)
    private invoiceRepo: Repository<SalesInvoice>,
    @InjectRepository(Booking)
    private bookingRepo: Repository<Booking>,
    private dataSource: DataSource,
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
        excess_payment_flag, status, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'DRAFT', $10)
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
}
