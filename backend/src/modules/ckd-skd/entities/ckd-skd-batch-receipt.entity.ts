import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { CkdSkdBatch } from './ckd-skd-batch.entity';
import { ShipmentReceipt } from '../../shipments/entities/shipment-receipt.entity';
import { AppUser } from '../../auth/entities/app-user.entity';
import { CustomsClearanceLine } from './customs-clearance-line.entity';

@Entity('ckd_skd_batch_receipt')
@Unique('uq_batch_receipt_line', ['batchId', 'receiptId'])
@Unique('uq_batch_receipt_id_batch', ['batchReceiptId', 'batchId'])
@Index('idx_batch_receipt_receipt', ['receiptId'])
export class CkdSkdBatchReceipt {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'batch_receipt_id' })
  batchReceiptId: string;

  @Column({ name: 'batch_id', type: 'bigint' })
  batchId: string;

  @ManyToOne(() => CkdSkdBatch, (b) => b.batchReceipts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'batch_id' })
  batch: CkdSkdBatch;

  @Column({ name: 'receipt_id', type: 'bigint' })
  receiptId: string;

  @ManyToOne(() => ShipmentReceipt)
  @JoinColumn({ name: 'receipt_id' })
  receipt: ShipmentReceipt;

  @Column({ name: 'received_quantity', type: 'numeric', precision: 18, scale: 3 })
  receivedQuantity: number;

  @Column({ name: 'transferred_to_production_qty', type: 'numeric', precision: 18, scale: 3, default: 0 })
  transferredToProductionQty: number;

  @Column({ name: 'created_by', type: 'int' })
  createdBy: number;

  @ManyToOne(() => AppUser)
  @JoinColumn({ name: 'created_by' })
  creator: AppUser;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => CustomsClearanceLine, (cl) => cl.batchReceipt)
  clearanceLines: CustomsClearanceLine[];
}
