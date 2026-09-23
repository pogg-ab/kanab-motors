import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import {
  CustomerLedgerTransaction,
  LedgerTransactionType,
} from './entities/customer-ledger-transaction.entity';
import { CustomerAccountSummary } from '../customers/entities/customer-account-summary.entity';
import { Customer } from '../customers/entities/customer.entity';
import { AuditService } from '../audit/audit.service';

export interface PostLedgerEntryDto {
  customerId: string;
  transactionType: LedgerTransactionType;
  referenceNumber: string;
  description: string;
  debitAmount?: number;
  creditAmount?: number;
  relatedBookingId?: string;
  relatedReceiptId?: string;
  relatedSalesInvoiceId?: string;
  processedBy?: number;
  // Financial summary delta hints
  summaryDelta?: {
    totalDeposits?: number;
    allocatedToBookings?: number;
    outstandingBalance?: number;
    availableCredit?: number;
    excessPayments?: number;
    refundableBalance?: number;
  };
}

@Injectable()
export class LedgerService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Concurrency-safe, atomic ledger posting (Story L2 & L3)
   * Uses row-level lock (SELECT ... FOR UPDATE) on customer_account_summary
   * to guarantee that simultaneous transactions for the same customer never corrupt the running balance.
   */
  async postTransaction(dto: PostLedgerEntryDto): Promise<CustomerLedgerTransaction> {
    const debit = Number(dto.debitAmount || 0);
    const credit = Number(dto.creditAmount || 0);

    if (debit < 0 || credit < 0) {
      throw new BadRequestException('Debit and Credit amounts must be non-negative');
    }
    if (debit === 0 && credit === 0) {
      throw new BadRequestException('Either Debit or Credit must be greater than zero');
    }

    return this.dataSource.transaction(async (manager) => {
      // 1. Lock customer summary row for update to serialize postings for this customer
      let summary = await manager
        .createQueryBuilder(CustomerAccountSummary, 's')
        .setLock('pessimistic_write')
        .where('s.customer_id = :cid', { cid: dto.customerId })
        .getOne();

      if (!summary) {
        // Ensure customer exists
        const cust = await manager.findOne(Customer, { where: { customerId: dto.customerId } });
        if (!cust) throw new NotFoundException(`Customer ${dto.customerId} not found`);

        summary = manager.create(CustomerAccountSummary, {
          customerId: dto.customerId,
          totalDeposits: 0,
          allocatedToBookings: 0,
          outstandingBalance: 0,
          availableCredit: 0,
          excessPayments: 0,
          refundableBalance: 0,
        });
        await manager.save(summary);

        // re-lock
        summary = await manager
          .createQueryBuilder(CustomerAccountSummary, 's')
          .setLock('pessimistic_write')
          .where('s.customer_id = :cid', { cid: dto.customerId })
          .getOne();
      }

      // 2. Find previous transaction to compute running balance
      const lastTx = await manager
        .createQueryBuilder(CustomerLedgerTransaction, 'tx')
        .where('tx.customer_id = :cid', { cid: dto.customerId })
        .orderBy('tx.transaction_id', 'DESC')
        .getOne();

      const prevBalance = lastTx ? Number(lastTx.runningBalance) : 0;
      // In customer account ledger:
      // Credit = money received from customer (increases customer credit balance)
      // Debit = invoice charges or refunds (decreases customer balance)
      const newRunningBalance = prevBalance + credit - debit;

      // 3. Create and save ledger entry
      const ledgerEntry = manager.create(CustomerLedgerTransaction, {
        customerId: dto.customerId,
        transactionDate: new Date(),
        transactionType: dto.transactionType,
        referenceNumber: dto.referenceNumber,
        description: dto.description,
        debitAmount: debit,
        creditAmount: credit,
        runningBalance: newRunningBalance,
        relatedBookingId: dto.relatedBookingId,
        relatedReceiptId: dto.relatedReceiptId,
        relatedSalesInvoiceId: dto.relatedSalesInvoiceId,
        processedBy: dto.processedBy || 1,
      });

      const savedEntry = await manager.save(ledgerEntry);

      // 4. Atomically update Customer Account Summary (Story L4)
      if (dto.summaryDelta) {
        if (dto.summaryDelta.totalDeposits) {
          summary.totalDeposits = Number(summary.totalDeposits) + dto.summaryDelta.totalDeposits;
        }
        if (dto.summaryDelta.allocatedToBookings) {
          summary.allocatedToBookings =
            Number(summary.allocatedToBookings) + dto.summaryDelta.allocatedToBookings;
        }
        if (dto.summaryDelta.outstandingBalance) {
          summary.outstandingBalance =
            Number(summary.outstandingBalance) + dto.summaryDelta.outstandingBalance;
        }
        if (dto.summaryDelta.availableCredit) {
          summary.availableCredit =
            Number(summary.availableCredit) + dto.summaryDelta.availableCredit;
        }
        if (dto.summaryDelta.excessPayments) {
          summary.excessPayments =
            Number(summary.excessPayments) + dto.summaryDelta.excessPayments;
        }
        if (dto.summaryDelta.refundableBalance) {
          summary.refundableBalance =
            Number(summary.refundableBalance) + dto.summaryDelta.refundableBalance;
        }
      } else {
        // Automatic delta inference from transaction type
        if (
          dto.transactionType === LedgerTransactionType.ADVANCE_DEPOSIT ||
          dto.transactionType === LedgerTransactionType.ADDITIONAL_PAYMENT
        ) {
          summary.totalDeposits = Number(summary.totalDeposits) + credit;
        } else if (dto.transactionType === LedgerTransactionType.CUSTOMER_CREDIT) {
          summary.availableCredit = Number(summary.availableCredit) + credit;
        } else if (dto.transactionType === LedgerTransactionType.EXCESS_PAYMENT) {
          summary.excessPayments = Number(summary.excessPayments) + credit;
        } else if (dto.transactionType === LedgerTransactionType.REFUND) {
          summary.refundableBalance = Math.max(0, Number(summary.refundableBalance) - debit);
        } else if (dto.transactionType === LedgerTransactionType.ADJUSTMENT) {
          if (credit > 0) {
            summary.totalDeposits = Number(summary.totalDeposits) + credit;
            summary.availableCredit = Number(summary.availableCredit) + credit;
          }
          if (debit > 0) {
            summary.availableCredit = Math.max(0, Number(summary.availableCredit) - debit);
          }
        }
      }

      summary.lastRecalculatedAt = new Date();
      await manager.save(summary);

      return savedEntry;
    });
  }

  /**
   * Statement of Account API matching SRS §8.7 table (Story L5 & L6)
   */
  async getStatementOfAccount(params: {
    customerId: string;
    startDate?: string;
    endDate?: string;
    transactionType?: LedgerTransactionType;
    bookingId?: string;
    bookingNumber?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(200, params.limit || 50));
    const skip = (page - 1) * limit;

    const qb = this.dataSource
      .getRepository(CustomerLedgerTransaction)
      .createQueryBuilder('tx')
      .leftJoinAndSelect('tx.booking', 'booking')
      .leftJoinAndSelect('tx.receipt', 'receipt')
      .leftJoinAndSelect('tx.processedByUser', 'user')
      .where('tx.customer_id = :cid', { cid: params.customerId });

    if (params.startDate) {
      qb.andWhere('tx.transaction_date >= :startDate', { startDate: params.startDate });
    }
    if (params.endDate) {
      const end = params.endDate.length === 10 ? `${params.endDate} 23:59:59.999` : params.endDate;
      qb.andWhere('tx.transaction_date <= :endDate', { endDate: end });
    }
    if (params.transactionType) {
      qb.andWhere('tx.transaction_type = :tt', { tt: params.transactionType });
    }
    if (params.bookingId || params.bookingNumber) {
      const bRef = (params.bookingNumber || params.bookingId)!.trim();
      if (/^\d+$/.test(bRef)) {
        qb.andWhere('(tx.related_booking_id = :bid OR booking.booking_number = :bnum)', {
          bid: bRef,
          bnum: bRef,
        });
      } else {
        qb.andWhere('booking.booking_number = :bnum', { bnum: bRef });
      }
    }

    qb.orderBy('tx.transactionDate', 'ASC');
    qb.skip(skip).take(limit);

    const [transactions, total] = await qb.getManyAndCount();

    // Fetch summary
    let summary = await this.dataSource
      .getRepository(CustomerAccountSummary)
      .findOne({ where: { customerId: params.customerId } });

    // Sync summary metrics with ledger balance if not populated
    if (summary && transactions.length > 0) {
      const latestTx = transactions[transactions.length - 1];
      const currentRunning = Number(latestTx.runningBalance);
      const totalCreds = transactions.reduce((acc, t) => acc + Number(t.creditAmount || 0), 0);

      let needsSave = false;
      if (Number(summary.totalDeposits) === 0 && totalCreds > 0) {
        summary.totalDeposits = totalCreds;
        needsSave = true;
      }
      if (Number(summary.availableCredit) === 0 && currentRunning > 0) {
        summary.availableCredit = Math.max(0, currentRunning - Number(summary.allocatedToBookings || 0));
        needsSave = true;
      }
      if (needsSave) {
        summary.lastRecalculatedAt = new Date();
        summary = await this.dataSource.getRepository(CustomerAccountSummary).save(summary);
      }
    }

    return {
      customerId: params.customerId,
      summary,
      transactions: transactions.map((t) => ({

        transactionId: t.transactionId,
        date: t.transactionDate,
        description: t.description,
        transactionType: t.transactionType,
        reference: t.referenceNumber,
        debit: Number(t.debitAmount),
        credit: Number(t.creditAmount),
        runningBalance: Number(t.runningBalance),
        bookingNumber: t.booking?.bookingNumber,
        processedBy: t.processedByUser?.fullName,
      })),
      total,
      page,
      limit,
    };
  }

  /**
   * Manual adjustment restricted to Finance Manager with mandatory reason (Story L9)
   */
  async manualAdjustment(
    customerId: string,
    body: {
      type: 'CREDIT' | 'DEBIT';
      amount: number;
      reason: string;
      referenceNumber: string;
    },
    userId: number = 1,
  ) {
    if (!body.reason || body.reason.trim().length < 5) {
      throw new BadRequestException('Mandatory explanation reason is required for manual adjustments');
    }
    if (body.amount <= 0) {
      throw new BadRequestException('Adjustment amount must be greater than zero');
    }

    const post = await this.postTransaction({
      customerId,
      transactionType: LedgerTransactionType.ADJUSTMENT,
      referenceNumber: body.referenceNumber || `ADJ-${Date.now().toString().slice(-6)}`,
      description: `Manual Adjustment (${body.type}): ${body.reason}`,
      creditAmount: body.type === 'CREDIT' ? body.amount : 0,
      debitAmount: body.type === 'DEBIT' ? body.amount : 0,
      processedBy: userId,
    });

    await this.auditService.log({
      entityType: 'customer_ledger_transaction',
      entityId: post.transactionId,
      action: 'INSERT',
      changedBy: userId,
      newValue: {
        action: 'MANUAL_ADJUSTMENT',
        customerId,
        type: body.type,
        amount: body.amount,
        reason: body.reason,
      },
    });

    return post;
  }
}
