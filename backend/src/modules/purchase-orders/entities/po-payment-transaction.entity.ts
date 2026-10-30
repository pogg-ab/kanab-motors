import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { PoPaymentSchedule } from './po-payment-schedule.entity';
import { AppUser } from '../../auth/entities/app-user.entity';

@Entity('po_payment_transaction')
@Index('idx_po_pay_txn_sched', ['paymentScheduleId'])
export class PoPaymentTransaction {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'payment_transaction_id' })
  paymentTransactionId: string;

  @Column({ name: 'payment_schedule_id', type: 'bigint' })
  paymentScheduleId: string;

  @ManyToOne(() => PoPaymentSchedule, (sched) => sched.transactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'payment_schedule_id' })
  paymentSchedule: PoPaymentSchedule;

  @Column({ name: 'payment_reference', length: 100 })
  paymentReference: string;

  @Column({ name: 'payment_date', type: 'date', default: () => 'CURRENT_DATE' })
  paymentDate: string;

  @Column({ name: 'amount_paid', type: 'numeric', precision: 18, scale: 2 })
  amountPaid: number;

  @Column({ length: 10 })
  currency: string;

  @Column({ name: 'bank_name', length: 150, nullable: true })
  bankName?: string;

  @Column({ length: 30, default: 'CONFIRMED' })
  status: string; // INITIATED, CONFIRMED, REJECTED, REVERSED

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy?: number;

  @ManyToOne(() => AppUser, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator?: AppUser;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

