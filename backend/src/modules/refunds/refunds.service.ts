import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { CustomerRefund, RefundStatus } from './entities/customer-refund.entity';
import { CustomerAccountSummary } from '../customers/entities/customer-account-summary.entity';
import { Customer } from '../customers/entities/customer.entity';
import { CreateRefundDto } from './dto/create-refund.dto';
import { RefundQueryDto } from './dto/refund-query.dto';
import { LedgerService } from '../ledger/ledger.service';
import { LedgerTransactionType } from '../ledger/entities/customer-ledger-transaction.entity';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class RefundsService {
  constructor(
    @InjectRepository(CustomerRefund)
    private readonly refundRepo: Repository<CustomerRefund>,
    @InjectRepository(CustomerAccountSummary)
    private readonly summaryRepo: Repository<CustomerAccountSummary>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    private readonly ledgerService: LedgerService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Create Refund Request with Strict SRS §7.4 Validation (Story R2)
   * The refund amount MUST NOT exceed the customer's available refundable balance.
   */
  async create(dto: CreateRefundDto, userId: number = 1): Promise<CustomerRefund> {
    const customer = await this.customerRepo.findOne({ where: { customerId: dto.customerId } });
    if (!customer) throw new NotFoundException(`Customer ${dto.customerId} not found`);

    const summary = await this.summaryRepo.findOne({ where: { customerId: dto.customerId } });
    const availableRefundable = summary ? Number(summary.refundableBalance || 0) : 0;

    // SRS §7.4 Refund Validation Rule
    if (dto.refundAmount > availableRefundable) {
      throw new BadRequestException(
        `Refund request of ETB ${dto.refundAmount.toLocaleString()} exceeds available refundable balance of ETB ${availableRefundable.toLocaleString()} (SRS §7.4 Violation)`,
      );
    }

    const refund = this.refundRepo.create({
      customerId: dto.customerId,
      bookingId: dto.bookingId || null,
      originalPaymentReference: dto.originalPaymentReference,
      refundReason: dto.refundReason.trim(),
      refundAmount: dto.refundAmount,
      refundMethod: dto.refundMethod || 'BANK_TRANSFER',
      bankAccountId: dto.bankAccountId || null,
      status: RefundStatus.REQUESTED,
      createdBy: userId,
    });

    const saved = await this.refundRepo.save(refund);

    await this.auditService.log({
      entityType: 'customer_refund',
      entityId: saved.refundId,
      action: 'INSERT',
      changedBy: userId,
      newValue: {
        refundNumber: saved.refundNumber,
        amount: saved.refundAmount,
        customerId: saved.customerId,
        reason: saved.refundReason,
      },
    });

    return this.findOne(saved.refundId);
  }

  async review(id: string, userId: number = 1): Promise<CustomerRefund> {
    const refund = await this.findOne(id);
    refund.status = RefundStatus.REVIEWED;
    refund.reviewedBy = userId;
    refund.reviewedAt = new Date();
    return this.refundRepo.save(refund);
  }

  async approve(id: string, userId: number = 1): Promise<CustomerRefund> {
    const refund = await this.findOne(id);
    refund.status = RefundStatus.APPROVED;
    refund.approvedBy = userId;
    refund.approvedAt = new Date();
    return this.refundRepo.save(refund);
  }

  async financeProcess(id: string, userId: number = 1): Promise<CustomerRefund> {
    const refund = await this.findOne(id);
    refund.status = RefundStatus.FINANCE_PROCESSED;
    refund.processedBy = userId;
    refund.processedAt = new Date();
    return this.refundRepo.save(refund);
  }

  /**
   * Final Payment Confirmation & Ledger Deduction (Story R6)
   * Posts REFUND entry to Customer Ledger, debiting the customer balance
   * and reducing refundable_balance atomically.
   */
  async confirmPayout(id: string, userId: number = 1): Promise<CustomerRefund> {
    const refund = await this.findOne(id);
    if (refund.status === RefundStatus.CONFIRMED) {
      throw new BadRequestException('Refund is already confirmed and paid');
    }

    refund.status = RefundStatus.CONFIRMED;
    refund.updatedAt = new Date();
    const saved = await this.refundRepo.save(refund);

    // Post to Customer Ledger (Story R6)
    await this.ledgerService.postTransaction({
      customerId: refund.customerId,
      transactionType: LedgerTransactionType.REFUND,
      referenceNumber: refund.refundNumber,
      description: `Customer Refund Payout via ${refund.refundMethod} (${refund.refundReason})`,
      debitAmount: Number(refund.refundAmount),
      creditAmount: 0,
      relatedBookingId: refund.bookingId || undefined,
      processedBy: userId,
      summaryDelta: {
        refundableBalance: -Number(refund.refundAmount),
      },
    });

    await this.auditService.log({
      entityType: 'customer_refund',
      entityId: id,
      action: 'UPDATE',
      changedBy: userId,
      newValue: {
        action: 'REFUND_CONFIRMED',
        refundNumber: refund.refundNumber,
        amount: refund.refundAmount,
      },
    });

    return saved;
  }

  async reject(id: string, reason: string, userId: number = 1): Promise<CustomerRefund> {
    const refund = await this.findOne(id);
    refund.status = RefundStatus.REJECTED;
    refund.rejectionReason = reason;
    return this.refundRepo.save(refund);
  }

  async findAll(query: RefundQueryDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 10));
    const skip = (page - 1) * limit;

    const qb = this.refundRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.customer', 'customer')
      .leftJoinAndSelect('r.booking', 'booking')
      .leftJoinAndSelect('r.bankAccount', 'bankAccount')
      .leftJoinAndSelect('r.approver', 'approver');

    if (query.status) {
      qb.andWhere('r.status = :status', { status: query.status });
    }
    if (query.customerId) {
      qb.andWhere('r.customerId = :cid', { cid: query.customerId });
    }
    if (query.search && query.search.trim() !== '') {
      const s = `%${query.search.trim()}%`;
      qb.andWhere('(r.refundNumber ILIKE :s OR customer.fullName ILIKE :s OR r.refundReason ILIKE :s)', { s });
    }

    qb.orderBy('r.createdAt', 'DESC');
    qb.skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<CustomerRefund> {
    const refund = await this.refundRepo.findOne({
      where: { refundId: id },
      relations: ['customer', 'booking', 'bankAccount', 'reviewer', 'approver', 'financeProcessor', 'creator'],
    });
    if (!refund) throw new NotFoundException(`Refund ${id} not found`);
    return refund;
  }
}
