import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { CustomsClearance } from './customs-clearance.entity';
import { CkdSkdBatch } from './ckd-skd-batch.entity';
import { CkdSkdBatchReceipt } from './ckd-skd-batch-receipt.entity';
import { AppUser } from '../../auth/entities/app-user.entity';

@Entity('customs_clearance_line')
@Index('idx_clearance_line_batch', ['batchId'])
@Index('idx_clearance_line_receipt', ['batchReceiptId'])
export class CustomsClearanceLine {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'clearance_line_id' })
  clearanceLineId: string;

  @Column({ name: 'clearance_id', type: 'bigint' })
  clearanceId: string;

  @ManyToOne(() => CustomsClearance, (c) => c.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'clearance_id' })
  clearance: CustomsClearance;

  @Column({ name: 'batch_id', type: 'bigint' })
  batchId: string;

  @ManyToOne(() => CkdSkdBatch)
  @JoinColumn({ name: 'batch_id' })
  batch: CkdSkdBatch;

  @Column({ name: 'batch_receipt_id', type: 'bigint' })
  batchReceiptId: string;

  @ManyToOne(() => CkdSkdBatchReceipt, (br) => br.clearanceLines)
  @JoinColumn([
    { name: 'batch_receipt_id', referencedColumnName: 'batchReceiptId' },
    { name: 'batch_id', referencedColumnName: 'batchId' },
  ])
  batchReceipt: CkdSkdBatchReceipt;

  @Column({ name: 'cleared_quantity', type: 'numeric', precision: 18, scale: 3 })
  clearedQuantity: number;

  @Column({ name: 'is_reversed', type: 'boolean', default: false })
  isReversed: boolean;

  @Column({ name: 'reversal_reason', type: 'text', nullable: true })
  reversalReason?: string;

  @Column({ name: 'created_by', type: 'int' })
  createdBy: number;

  @ManyToOne(() => AppUser)
  @JoinColumn({ name: 'created_by' })
  creator: AppUser;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
