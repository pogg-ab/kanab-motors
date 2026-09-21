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
import { Supplier } from '../../suppliers/entities/supplier.entity';
import { AppUser } from '../../auth/entities/app-user.entity';
import { PurchaseOrderLine } from './purchase-order-line.entity';

export enum POStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  CONFIRMED = 'CONFIRMED',
  PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED',
}

@Entity('purchase_order')
@Index('idx_po_supplier', ['supplierId'])
@Index('idx_po_status', ['status'])
export class PurchaseOrder {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'po_id' })
  poId: string;

  @Column({ name: 'po_number', length: 20, unique: true })
  poNumber: string;

  @Column({ name: 'supplier_id', type: 'int' })
  supplierId: number;

  @ManyToOne(() => Supplier)
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @Column({ name: 'po_date', type: 'date', default: () => 'CURRENT_DATE' })
  poDate: string;

  @Column({ type: 'enum', enum: ['ETB', 'USD', 'EUR'] })
  currency: 'ETB' | 'USD' | 'EUR';

  @Column({
    type: 'enum',
    enum: POStatus,
    default: POStatus.DRAFT,
  })
  status: POStatus;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy?: number;

  @ManyToOne(() => AppUser, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator?: AppUser;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'updated_by', type: 'int', nullable: true })
  updatedBy?: number;

  @ManyToOne(() => AppUser, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updater?: AppUser;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => PurchaseOrderLine, (line) => line.purchaseOrder, { cascade: true })
  lines: PurchaseOrderLine[];
}
