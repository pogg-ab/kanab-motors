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
import { Warehouse } from '../../lookups/entities/warehouse.entity';
import { AppUser } from '../../auth/entities/app-user.entity';
import { SparePartsSaleItem } from './spare-parts-sale-item.entity';

export enum SparePartsSaleStatus {
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('spare_parts_sale')
@Index('idx_sps_customer', ['customerId'])
@Index('idx_sps_warehouse', ['warehouseId'])
@Index('idx_sps_status', ['status'])
@Index('idx_sps_date', ['saleDate'])
export class SparePartsSale {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'sale_id' })
  saleId: string;

  @Column({
    name: 'sale_number',
    length: 30,
    unique: true,
    default: () => "('SPS-' || lpad(nextval('spare_parts_sale_seq')::text, 6, '0'))",
  })
  saleNumber: string;

  @Column({ name: 'customer_id', type: 'bigint', nullable: true })
  customerId?: string;

  @ManyToOne(() => Customer, { nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer?: Customer;

  @Column({ name: 'customer_name', length: 200 })
  customerName: string;

  @Column({ name: 'customer_phone', length: 50, nullable: true })
  customerPhone?: string;

  @Column({ name: 'customer_type', length: 50, default: 'DIRECT_POS' })
  customerType: string;

  @Column({ name: 'warehouse_id', type: 'int' })
  warehouseId: number;

  @ManyToOne(() => Warehouse)
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse;

  @CreateDateColumn({ name: 'sale_date', type: 'timestamptz' })
  saleDate: Date;

  @Column({ name: 'payment_method', length: 50, default: 'CASH' })
  paymentMethod: string;

  @Column({ name: 'payment_reference', length: 100, nullable: true })
  paymentReference?: string;

  @Column({ type: 'numeric', precision: 18, scale: 2, default: 0 })
  subtotal: number;

  @Column({ name: 'discount_amount', type: 'numeric', precision: 18, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ name: 'vat_amount', type: 'numeric', precision: 18, scale: 2, default: 0 })
  vatAmount: number;

  @Column({ name: 'grand_total', type: 'numeric', precision: 18, scale: 2, default: 0 })
  grandTotal: number;

  @Column({ length: 30, default: SparePartsSaleStatus.COMPLETED })
  status: SparePartsSaleStatus;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy?: number;

  @ManyToOne(() => AppUser, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator?: AppUser;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => SparePartsSaleItem, (item) => item.sale, { cascade: true })
  items: SparePartsSaleItem[];
}
