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
import { Booking } from '../../bookings/entities/booking.entity';
import { AppUser } from '../../auth/entities/app-user.entity';

export enum PaymentInstrument {
  CASH = 'CASH',
  BANK_DEPOSIT = 'BANK_DEPOSIT',
  TRANSFER = 'TRANSFER',
  CHEQUE = 'CHEQUE',
}

export enum PaymentStatus {
  SUBMITTED = 'SUBMITTED',
  CONFIRMED = 'CONFIRMED',
  REJECTED = 'REJECTED',
}

@Entity('customer_payment')
@Index('idx_payment_booking', ['bookingId'])
@Index('idx_payment_customer', ['customerId'])
export class CustomerPayment {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'payment_id' })
  paymentId: string;

  @Column({
    name: 'receipt_number',
    length: 30,
    unique: true,
    default: () => "('BRV-' || lpad(nextval('receipt_number_seq')::text, 5, '0'))",
  })
  receiptNumber: string;

  @Column({ name: 'booking_id', type: 'bigint' })
  bookingId: string;

  @ManyToOne(() => Booking, (b) => b.payments)
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @Column({ name: 'customer_id', type: 'bigint' })
  customerId: string;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'payment_date', type: 'timestamptz', default: () => 'now()' })
  paymentDate: Date;

  @Column({
    name: 'instrument_type',
    type: 'enum',
    enum: PaymentInstrument,
    default: PaymentInstrument.BANK_DEPOSIT,
  })
  instrumentType: PaymentInstrument;

  @Column({ name: 'bank_name', length: 150 })
  bankName: string;

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  amount: number;

  @Column({ name: 'reference_number', length: 100 })
  referenceNumber: string;

  @Column({ name: 'reference_date', type: 'date', nullable: true })
  referenceDate: string;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.SUBMITTED,
  })
  status: PaymentStatus;

  @Column({ name: 'confirmed_by', type: 'int', nullable: true })
  confirmedBy: number;

  @ManyToOne(() => AppUser, { nullable: true })
  @JoinColumn({ name: 'confirmed_by' })
  confirmer: AppUser;

  @Column({ name: 'confirmed_at', type: 'timestamptz', nullable: true })
  confirmedAt: Date;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number;

  @ManyToOne(() => AppUser, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator: AppUser;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
