import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';
import { AppUser } from '../../auth/entities/app-user.entity';
import { Booking } from '../../bookings/entities/booking.entity';
import { CustomerPayment } from '../../payments/entities/customer-payment.entity';

export enum LedgerTransactionType {
  ADVANCE_DEPOSIT = 'ADVANCE_DEPOSIT',
  ADDITIONAL_PAYMENT = 'ADDITIONAL_PAYMENT',
  INVOICE_CHARGE = 'INVOICE_CHARGE',
  PAYMENT_ALLOCATION = 'PAYMENT_ALLOCATION',
  CUSTOMER_CREDIT = 'CUSTOMER_CREDIT',
  EXCESS_PAYMENT = 'EXCESS_PAYMENT',
  REFUND = 'REFUND',
  ADJUSTMENT = 'ADJUSTMENT',
  BOOKING_CANCELLATION = 'BOOKING_CANCELLATION',
  BOOKING_TRANSFER = 'BOOKING_TRANSFER',
}

@Entity('customer_ledger_transaction')
@Index('idx_ledger_customer', ['customerId'])
@Index('idx_ledger_date', ['transactionDate'])
export class CustomerLedgerTransaction {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'transaction_id' })
  transactionId: string;

  @Column({ name: 'customer_id', type: 'bigint' })
  customerId: string;

  @ManyToOne(() => Customer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'transaction_date', type: 'timestamptz', default: () => 'now()' })
  transactionDate: Date;

  @Column({
    name: 'transaction_type',
    type: 'enum',
    enum: LedgerTransactionType,
  })
  transactionType: LedgerTransactionType;

  @Column({ name: 'reference_number', length: 100 })
  referenceNumber: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'debit_amount', type: 'numeric', precision: 18, scale: 2, default: 0 })
  debitAmount: number;

  @Column({ name: 'credit_amount', type: 'numeric', precision: 18, scale: 2, default: 0 })
  creditAmount: number;

  @Column({ name: 'running_balance', type: 'numeric', precision: 18, scale: 2 })
  runningBalance: number;

  @Column({ name: 'related_booking_id', type: 'bigint', nullable: true })
  relatedBookingId: string;

  @ManyToOne(() => Booking, { nullable: true })
  @JoinColumn({ name: 'related_booking_id' })
  booking: Booking;

  @Column({ name: 'related_receipt_id', type: 'bigint', nullable: true })
  relatedReceiptId: string;

  @ManyToOne(() => CustomerPayment, { nullable: true })
  @JoinColumn({ name: 'related_receipt_id' })
  receipt: CustomerPayment;

  @Column({ name: 'related_sales_invoice_id', type: 'bigint', nullable: true })
  relatedSalesInvoiceId: string;

  @Column({ name: 'processed_by', type: 'int', nullable: true })
  processedBy: number;

  @ManyToOne(() => AppUser, { nullable: true })
  @JoinColumn({ name: 'processed_by' })
  processedByUser: AppUser;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
