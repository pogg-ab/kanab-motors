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
      routeTo: 'CUSTOMER_CREDIT' | 'REFUNDABLE';
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

    const txType =
      body.routeTo === 'CUSTOMER_CREDIT'
        ? LedgerTransactionType.CUSTOMER_CREDIT
        : LedgerTransactionType.EXCESS_PAYMENT;

    const ref = `EXC-${Date.now().toString().slice(-6)}`;
    const description = `Excess Payment Allocation of ETB ${body.amount.toLocaleString()} to ${
      body.routeTo === 'CUSTOMER_CREDIT' ? 'Customer Credit (Future Purchases)' : 'Refundable Balance'
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
        availableCredit: body.routeTo === 'CUSTOMER_CREDIT' ? body.amount : 0,
        refundableBalance: body.routeTo === 'REFUNDABLE' ? body.amount : 0,
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
}
