import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';
import { Booking } from '../../bookings/entities/booking.entity';
import { CustomerBankAccount } from '../../customers/entities/customer-bank-account.entity';
import { AppUser } from '../../auth/entities/app-user.entity';

export enum RefundStatus {
  REQUESTED = 'REQUESTED',
  REVIEWED = 'REVIEWED',
  APPROVED = 'APPROVED',
  FINANCE_PROCESSED = 'FINANCE_PROCESSED',
  CONFIRMED = 'CONFIRMED',
  REJECTED = 'REJECTED',
}

@Entity('customer_refund')
@Index('idx_refund_customer', ['customerId'])
@Index('idx_refund_status', ['status'])
export class CustomerRefund {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'refund_id' })
  refundId: string;

  @Column({
    name: 'refund_number',
    length: 30,
    unique: true,
    default: () => "('RFD-' || lpad(nextval('refund_number_seq')::text, 5, '0'))",
  })
  refundNumber: string;

  @Column({ name: 'customer_id', type: 'bigint' })
  customerId: string;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'booking_id', type: 'bigint', nullable: true })
  bookingId: string;

  @ManyToOne(() => Booking, { nullable: true })
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @Column({ name: 'original_payment_reference', length: 100, nullable: true })
  originalPaymentReference: string;

  @Column({ name: 'refund_reason', type: 'text' })
  refundReason: string;

  @Column({ name: 'refund_amount', type: 'numeric', precision: 18, scale: 2 })
  refundAmount: number;

  @Column({ name: 'refund_method', length: 50, default: 'BANK_TRANSFER' })
  refundMethod: string;

  @Column({ name: 'bank_account_id', type: 'bigint', nullable: true })
  bankAccountId: string;

  @ManyToOne(() => CustomerBankAccount, { nullable: true })
  @JoinColumn({ name: 'bank_account_id' })
  bankAccount: CustomerBankAccount;

  @Column({
    type: 'enum',
    enum: RefundStatus,
    default: RefundStatus.REQUESTED,
  })
  status: RefundStatus;

  @Column({ name: 'reviewed_by', type: 'int', nullable: true })
  reviewedBy: number;

  @ManyToOne(() => AppUser, { nullable: true })
  @JoinColumn({ name: 'reviewed_by' })
  reviewer: AppUser;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt: Date;

  @Column({ name: 'approved_by', type: 'int', nullable: true })
  approvedBy: number;

  @ManyToOne(() => AppUser, { nullable: true })
  @JoinColumn({ name: 'approved_by' })
  approver: AppUser;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date;

  @Column({ name: 'processed_by', type: 'int', nullable: true })
  processedBy: number;

  @ManyToOne(() => AppUser, { nullable: true })
  @JoinColumn({ name: 'processed_by' })
  financeProcessor: AppUser;

  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt: Date;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number;

  @ManyToOne(() => AppUser, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator: AppUser;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
