import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';
import { SalesEnquiry } from '../../enquiries/entities/sales-enquiry.entity';
import { ProductItem } from '../../products/entities/product-item.entity';
import { AppUser } from '../../auth/entities/app-user.entity';
import { CustomerPayment } from '../../payments/entities/customer-payment.entity';

export enum BookingStatus {
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  CONFIRMED = 'CONFIRMED',
  ALLOTTED = 'ALLOTTED',
  SETTLED = 'SETTLED',
  CANCELLED = 'CANCELLED',
}

@Entity('booking')
@Index('idx_booking_customer', ['customerId'])
@Index('idx_booking_status', ['bookingStatus'])
export class Booking {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'booking_id' })
  bookingId: string;

  @Column({
    name: 'booking_number',
    length: 30,
    unique: true,
    default: () => "('BKG-' || lpad(nextval('booking_number_seq')::text, 6, '0'))",
  })
  bookingNumber: string;

  @Column({ name: 'customer_id', type: 'bigint' })
  customerId: string;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'enquiry_id', type: 'bigint', nullable: true })
  enquiryId: string;

  @ManyToOne(() => SalesEnquiry, { nullable: true })
  @JoinColumn({ name: 'enquiry_id' })
  enquiry: SalesEnquiry;

  @Column({ name: 'item_id', type: 'bigint' })
  itemId: string;

  @ManyToOne(() => ProductItem)
  @JoinColumn({ name: 'item_id' })
  item: ProductItem;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ name: 'unit_price', type: 'numeric', precision: 18, scale: 2 })
  unitPrice: number;

  @Column({ name: 'vat_amount', type: 'numeric', precision: 18, scale: 2, default: 0 })
  vatAmount: number;

  @Column({ name: 'gross_total', type: 'numeric', precision: 18, scale: 2 })
  grossTotal: number;

  @Column({ name: 'required_advance_amount', type: 'numeric', precision: 18, scale: 2 })
  requiredAdvanceAmount: number;

  @Column({ name: 'total_amount_deposited', type: 'numeric', precision: 18, scale: 2, default: 0 })
  totalAmountDeposited: number;

  @Column({ name: 'outstanding_balance', type: 'numeric', precision: 18, scale: 2, default: 0 })
  outstandingBalance: number;

  @Column({ name: 'booking_date', type: 'timestamptz', default: () => 'now()' })
  bookingDate: Date;

  @Column({
    name: 'booking_status',
    type: 'enum',
    enum: BookingStatus,
    default: BookingStatus.PENDING_APPROVAL,
  })
  bookingStatus: BookingStatus;

  @Column({ name: 'salesperson_name', length: 200 })
  salespersonName: string;

  @Column({ name: 'cancellation_reason', type: 'text', nullable: true })
  cancellationReason: string;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt: Date;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number;

  @ManyToOne(() => AppUser, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator: AppUser;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => CustomerPayment, (p) => p.booking)
  payments: CustomerPayment[];
}
