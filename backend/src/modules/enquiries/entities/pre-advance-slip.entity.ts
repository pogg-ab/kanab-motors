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
import { SalesEnquiry } from './sales-enquiry.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { ProductItem } from '../../products/entities/product-item.entity';
import { AppUser } from '../../auth/entities/app-user.entity';

export enum PreAdvanceSlipStatus {
  ACTIVE = 'ACTIVE',
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  CONVERTED = 'CONVERTED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

@Entity('pre_advance_slip')
@Index('idx_slip_enquiry', ['enquiryId'])
@Index('idx_slip_customer', ['customerId'])
@Index('idx_slip_status', ['status'])
export class PreAdvanceSlip {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'slip_id' })
  slipId: string;

  @Column({
    name: 'slip_number',
    length: 30,
    unique: true,
    default: () => "('PAS-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(nextval('pre_advance_slip_seq')::text, 5, '0'))",
  })
  slipNumber: string;

  @Column({ name: 'enquiry_id', type: 'bigint' })
  enquiryId: string;

  @ManyToOne(() => SalesEnquiry)
  @JoinColumn({ name: 'enquiry_id' })
  enquiry: SalesEnquiry;

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

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ name: 'unit_price', type: 'numeric', precision: 18, scale: 2 })
  unitPrice: number;

  @Column({ name: 'vat_amount', type: 'numeric', precision: 18, scale: 2, default: 0 })
  vatAmount: number;

  @Column({ name: 'total_amount', type: 'numeric', precision: 18, scale: 2 })
  totalAmount: number;

  @Column({ name: 'required_advance_amount', type: 'numeric', precision: 18, scale: 2 })
  requiredAdvanceAmount: number;

  @Column({
    type: 'varchar',
    length: 30,
    default: PreAdvanceSlipStatus.ACTIVE,
  })
  status: PreAdvanceSlipStatus;

  @Column({ name: 'issued_at', type: 'timestamptz', default: () => 'now()' })
  issuedAt: Date;

  @Column({ name: 'expires_at', type: 'timestamptz', default: () => "now() + interval '3 days'" })
  expiresAt: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;

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
