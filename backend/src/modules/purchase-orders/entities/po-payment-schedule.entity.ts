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
import { PurchaseOrder } from './purchase-order.entity';
import { AppUser } from '../../auth/entities/app-user.entity';
import { PoPaymentTransaction } from './po-payment-transaction.entity';

@Entity('po_payment_schedule')
@Index('idx_po_pay_sched_po', ['poId'])
@Index('idx_po_pay_sched_status', ['status'])
export class PoPaymentSchedule {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'payment_schedule_id' })
  paymentScheduleId: string;

  @Column({ name: 'po_id', type: 'bigint' })
  poId: string;

  @ManyToOne(() => PurchaseOrder, (po) => po.paymentSchedules, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'po_id' })
  purchaseOrder: PurchaseOrder;

  @Column({ name: 'milestone_name', length: 100 })
  milestoneName: string;

  @Column({ name: 'payment_method', length: 50, default: 'TELEGRAPHIC_TRANSFER' })
  paymentMethod: string; // TELEGRAPHIC_TRANSFER, LETTER_OF_CREDIT, CASH_AGAINST_DOCUMENTS

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate?: string;

  @Column({ name: 'amount_due', type: 'numeric', precision: 18, scale: 2 })
  amountDue: number;

  @Column({ length: 10 })
  currency: string;

  @Column({ length: 30, default: 'PLANNED' })
  status: string; // PLANNED, DUE, PARTIALLY_PAID, PAID, OVERDUE, CANCELLED

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

  @OneToMany(() => PoPaymentTransaction, (txn) => txn.paymentSchedule)
  transactions: PoPaymentTransaction[];
}

