import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Booking } from '../../bookings/entities/booking.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { ProductItem } from '../../products/entities/product-item.entity';
import { VehicleUnit } from '../../vehicles/entities/vehicle-unit.entity';
import { AppUser } from '../../auth/entities/app-user.entity';

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

@Entity('sales_invoice')
@Index('idx_sales_invoice_booking', ['bookingId'])
@Index('idx_sales_invoice_customer', ['customerId'])
@Index('idx_sales_invoice_status', ['status'])
export class SalesInvoice {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'invoice_id' })
  invoiceId: string;

  @Column({
    name: 'invoice_number',
    length: 20,
    unique: true,
    default: () => "('INV-' || lpad(nextval('invoice_number_seq')::text, 6, '0'))",
  })
  invoiceNumber: string;

  @Column({ name: 'booking_id', type: 'bigint' })
  bookingId: string;

  @ManyToOne(() => Booking)
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @Column({ name: 'customer_id', type: 'bigint' })
  customerId: string;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'item_id', type: 'bigint' })
  itemId: string;

  @ManyToOne(() => ProductItem)
  @JoinColumn({ name: 'item_id' })
  item: ProductItem;

  @Column({ name: 'vehicle_unit_id', type: 'bigint', nullable: true })
  vehicleUnitId?: string;

  @ManyToOne(() => VehicleUnit, { nullable: true })
  @JoinColumn({ name: 'vehicle_unit_id' })
  vehicleUnit?: VehicleUnit;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  quantity: number;

  @Column({ name: 'unit_price', type: 'numeric', precision: 18, scale: 2 })
  unitPrice: number;

  @Column({ name: 'vat_amount', type: 'numeric', precision: 18, scale: 2, default: 0 })
  vatAmount: number;

  @Column({
    name: 'gross_total',
    type: 'numeric',
    precision: 18,
    scale: 2,
    insert: false,
    update: false,
    asExpression: 'quantity * unit_price + vat_amount',
    generatedType: 'STORED',
  })
  grossTotal: number;

  @Column({ name: 'deposits_applied', type: 'numeric', precision: 18, scale: 2, default: 0 })
  depositsApplied: number;

  @Column({
    name: 'outstanding_balance',
    type: 'numeric',
    precision: 18,
    scale: 2,
    insert: false,
    update: false,
    asExpression: 'quantity * unit_price + vat_amount - deposits_applied',
    generatedType: 'STORED',
  })
  outstandingBalance: number;

  @Column({ name: 'excess_payment_flag', type: 'boolean', default: false })
  excessPaymentFlag: boolean;

  @Column({
    type: 'enum',
    enum: InvoiceStatus,
    default: InvoiceStatus.DRAFT,
  })
  status: InvoiceStatus;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number;

  @ManyToOne(() => AppUser, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator: AppUser;

  @Column({ name: 'salesperson_id', type: 'int', nullable: true })
  salespersonId?: number;

  @ManyToOne(() => AppUser, { nullable: true })
  @JoinColumn({ name: 'salesperson_id' })
  salesperson?: AppUser;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
