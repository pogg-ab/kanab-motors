import {
  Entity,
  PrimaryColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Customer } from './customer.entity';

@Entity('customer_account_summary')
export class CustomerAccountSummary {
  @PrimaryColumn({ name: 'customer_id', type: 'bigint' })
  customerId: string;

  @OneToOne(() => Customer, (customer) => customer.accountSummary, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'total_deposits', type: 'numeric', precision: 18, scale: 2, default: 0 })
  totalDeposits: number;

  @Column({ name: 'allocated_to_bookings', type: 'numeric', precision: 18, scale: 2, default: 0 })
  allocatedToBookings: number;

  @Column({ name: 'outstanding_balance', type: 'numeric', precision: 18, scale: 2, default: 0 })
  outstandingBalance: number;

  @Column({ name: 'available_credit', type: 'numeric', precision: 18, scale: 2, default: 0 })
  availableCredit: number;

  @Column({ name: 'excess_payments', type: 'numeric', precision: 18, scale: 2, default: 0 })
  excessPayments: number;

  @Column({ name: 'refundable_balance', type: 'numeric', precision: 18, scale: 2, default: 0 })
  refundableBalance: number;

  @Column({ name: 'last_recalculated_at', type: 'timestamptz', default: () => 'now()' })
  lastRecalculatedAt: Date;
}
