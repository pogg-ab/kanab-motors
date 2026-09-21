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
import { ProductItem } from '../../products/entities/product-item.entity';
import { AppUser } from '../../auth/entities/app-user.entity';

export enum EnquiryStatus {
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CONVERTED = 'CONVERTED',
}

@Entity('sales_enquiry')
@Index('idx_enquiry_customer', ['customerId'])
@Index('idx_enquiry_status', ['status'])
export class SalesEnquiry {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'enquiry_id' })
  enquiryId: string;

  @Column({
    name: 'enquiry_number',
    length: 30,
    unique: true,
    default: () => "('ENQ-' || lpad(nextval('enquiry_number_seq')::text, 6, '0'))",
  })
  enquiryNumber: string;

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

  @Column({ type: 'int' })
  quantity: number;

  @Column({ name: 'unit_price', type: 'numeric', precision: 18, scale: 2 })
  unitPrice: number;

  @Column({ name: 'vat_amount', type: 'numeric', precision: 18, scale: 2, default: 0 })
  vatAmount: number;

  @Column({ name: 'estimated_sales_value', type: 'numeric', precision: 18, scale: 2 })
  estimatedSalesValue: number;

  @Column({ name: 'salesperson_name', length: 200 })
  salespersonName: string;

  @Column({ name: 'payment_mode', length: 50, default: 'BANK_DEPOSIT' })
  paymentMode: string;

  @Column({
    type: 'enum',
    enum: EnquiryStatus,
    default: EnquiryStatus.SUBMITTED,
  })
  status: EnquiryStatus;

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
