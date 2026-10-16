import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CustomerAccountSummary } from '../customers/entities/customer-account-summary.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { LedgerService } from '../ledger/ledger.service';
import { LedgerTransactionType } from '../ledger/entities/customer-ledger-transaction.entity';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ExcessService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly ledgerService: LedgerService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Route excess funds to either Customer Credit or Refundable Balance (Stories X2 & X3)
   */
  async routeExcessFunds(
    customerId: string,
    body: {
      amount: number;
      routeTo?: 'CUSTOMER_CREDIT' | 'REFUNDABLE' | 'TRANSFER_TO_CREDIT' | 'TRANSFER_TO_REFUNDABLE';
      action?: 'CUSTOMER_CREDIT' | 'REFUNDABLE' | 'TRANSFER_TO_CREDIT' | 'TRANSFER_TO_REFUNDABLE';
      notes?: string;
    },
    userId: number = 1,
  ) {
    const summary = await this.dataSource
      .getRepository(CustomerAccountSummary)
      .findOne({ where: { customerId } });
    if (!summary) throw new NotFoundException(`Customer account summary for ${customerId} not found`);

    const currentExcess = Number(summary.excessPayments || 0);
    if (body.amount <= 0 || body.amount > currentExcess) {
      throw new BadRequestException(
        `Amount to route (ETB ${body.amount}) must be between 1 and available excess (ETB ${currentExcess})`,
      );
    }

    const targetRoute: 'CUSTOMER_CREDIT' | 'REFUNDABLE' =
      (body.routeTo || body.action || 'REFUNDABLE').includes('CREDIT')
        ? 'CUSTOMER_CREDIT'
        : 'REFUNDABLE';

    const txType =
      targetRoute === 'CUSTOMER_CREDIT'
        ? LedgerTransactionType.CUSTOMER_CREDIT
        : LedgerTransactionType.EXCESS_PAYMENT;

    const ref = `EXC-${Date.now().toString().slice(-6)}`;
    const description = `Excess Payment Allocation of ETB ${body.amount.toLocaleString()} to ${
      targetRoute === 'CUSTOMER_CREDIT' ? 'Customer Credit (Future Purchases)' : 'Refundable Balance'
    }. ${body.notes || ''}`;

    await this.ledgerService.postTransaction({
      customerId,
      transactionType: txType,
      referenceNumber: ref,
      description,
      creditAmount: 0,
      debitAmount: 0,
      processedBy: userId,
      summaryDelta: {
        excessPayments: -body.amount,
        availableCredit: targetRoute === 'CUSTOMER_CREDIT' ? body.amount : 0,
        refundableBalance: targetRoute === 'REFUNDABLE' ? body.amount : 0,
      },
    });

    await this.auditService.log({
      entityType: 'customer_account_summary',
      entityId: customerId,
      action: 'UPDATE',
      changedBy: userId,
      newValue: {
        action: 'EXCESS_ROUTED',
        amount: body.amount,
        routeTo: body.routeTo,
      },
    });

    return {
      success: true,
      message: `Successfully routed ETB ${body.amount.toLocaleString()} to ${body.routeTo}`,
      updatedSummary: await this.dataSource
        .getRepository(CustomerAccountSummary)
        .findOne({ where: { customerId } }),
    };
  }

  /**
   * Excess Payment Report (Story X4)
   * Lists customers with excess payments awaiting routing
   */
  async getExcessPaymentReport() {
    return this.dataSource
      .getRepository(CustomerAccountSummary)
      .createQueryBuilder('s')
      .innerJoinAndSelect('s.customer', 'customer')
      .where('s.excess_payments > 0')
      .orderBy('s.excess_payments', 'DESC')
      .getMany();
  }

  /**
   * Customer Credit Balance Report (Story X5)
   * Lists customers holding available credit balances
   */
  async getCreditBalanceReport() {
    return this.dataSource
      .getRepository(CustomerAccountSummary)
      .createQueryBuilder('s')
      .innerJoinAndSelect('s.customer', 'customer')
      .where('s.available_credit > 0')
      .orderBy('s.available_credit', 'DESC')
      .getMany();
  }

  /**
   * Credit transfer between customers (Story X9: two-sided atomic ledger posting)
   * A customer credit can be transferred to a different customer, or used against a different vehicle order.
   */
  async transferCreditBetweenCustomers(
    sourceCustomerId: string,
    body: {
      targetCustomerId: string;
      amount: number;
      reason?: string;
      targetBookingId?: string;
    },
    userId: number = 1,
  ) {
    if (!body.targetCustomerId) {
      throw new BadRequestException('Recipient target customer ID is required');
    }
    if (sourceCustomerId === body.targetCustomerId) {
      throw new BadRequestException('Cannot transfer credit to the same customer account');
    }

    const transferAmount = Number(body.amount);
    if (!transferAmount || transferAmount <= 0) {
      throw new BadRequestException('Transfer amount must be greater than zero');
    }

    // Load source customer summary
    const sourceSummary = await this.dataSource
      .getRepository(CustomerAccountSummary)
      .findOne({
        where: { customerId: sourceCustomerId },
        relations: ['customer'],
      });
    if (!sourceSummary) {
      throw new NotFoundException(`Source customer #${sourceCustomerId} account summary not found`);
    }

    const availableCredit = Number(sourceSummary.availableCredit || 0);
    if (transferAmount > availableCredit) {
      throw new BadRequestException(
        `Insufficient customer credit. Requested ETB ${transferAmount.toLocaleString()}, but available credit is ETB ${availableCredit.toLocaleString()}`,
      );
    }

    // Load target customer summary (or initialize if not existing)
    let targetSummary = await this.dataSource
      .getRepository(CustomerAccountSummary)
      .findOne({
        where: { customerId: body.targetCustomerId },
        relations: ['customer'],
      });
    if (!targetSummary) {
      const targetCustomer = await this.dataSource.getRepository('Customer').findOne({
        where: { customerId: body.targetCustomerId },
      });
      if (!targetCustomer) {
        throw new NotFoundException(`Recipient customer #${body.targetCustomerId} not found`);
      }
      targetSummary = this.dataSource.getRepository(CustomerAccountSummary).create({
        customerId: body.targetCustomerId,
        totalDeposits: 0,
        allocatedToBookings: 0,
        outstandingBalance: 0,
        availableCredit: 0,
        excessPayments: 0,
        refundableBalance: 0,
      });
      await this.dataSource.getRepository(CustomerAccountSummary).save(targetSummary);
    }

    const ref = `CR-XFER-${Date.now().toString().slice(-6)}`;
    const sourceName = sourceSummary.customer?.fullName || `Customer #${sourceCustomerId}`;
    const targetName = targetSummary.customer?.fullName || `Customer #${body.targetCustomerId}`;

    // Two-sided atomic ledger posting (Story X9)
    // Side 1: Debit source customer's available credit
    await this.ledgerService.postTransaction({
      customerId: sourceCustomerId,
      transactionType: LedgerTransactionType.CREDIT_TRANSFER,
      referenceNumber: ref,
      description: `Credit Transfer Out to ${targetName}. ${body.reason || ''}`.trim(),
      debitAmount: transferAmount,
      creditAmount: 0,
      processedBy: userId,
      summaryDelta: {
        availableCredit: -transferAmount,
      },
    });

    let resolvedBookingId: string | undefined = undefined;
    if (body.targetBookingId && body.targetBookingId.trim() !== '') {
      const bRef = body.targetBookingId.trim();
      if (/^\d+$/.test(bRef)) {
        resolvedBookingId = bRef;
      } else {
        const foundB = await this.dataSource.getRepository(Booking).findOne({
          where: { bookingNumber: bRef },
        });
        if (foundB) {
          resolvedBookingId = foundB.bookingId;
        }
      }
    }

    // Side 2: Credit recipient customer's available credit
    await this.ledgerService.postTransaction({
      customerId: body.targetCustomerId,
      transactionType: LedgerTransactionType.CREDIT_TRANSFER,
      referenceNumber: ref,
      description: `Credit Transfer In from ${sourceName}. ${body.reason || ''}`.trim(),
      debitAmount: 0,
      creditAmount: transferAmount,
      relatedBookingId: resolvedBookingId,
      processedBy: userId,
      summaryDelta: {
        availableCredit: transferAmount,
      },
    });

    await this.auditService.log({
      entityType: 'customer_account_summary',
      entityId: sourceCustomerId,
      action: 'UPDATE',
      changedBy: userId,
      newValue: {
        action: 'CREDIT_TRANSFERRED',
        referenceNumber: ref,
        fromCustomerId: sourceCustomerId,
        toCustomerId: body.targetCustomerId,
        amount: transferAmount,
        reason: body.reason,
      },
    });

    return {
      success: true,
      referenceNumber: ref,
      message: `Successfully transferred ETB ${transferAmount.toLocaleString()} credit from ${sourceName} to ${targetName}`,
      sourceSummary: await this.dataSource
        .getRepository(CustomerAccountSummary)
        .findOne({ where: { customerId: sourceCustomerId } }),
      targetSummary: await this.dataSource
        .getRepository(CustomerAccountSummary)
        .findOne({ where: { customerId: body.targetCustomerId } }),
    };
  }
}
