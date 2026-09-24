import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Warehouse } from '../../lookups/entities/warehouse.entity';
import { AppUser } from '../../auth/entities/app-user.entity';
import { StockTransferLine } from './stock-transfer-line.entity';

export enum TransferStatus {
  REQUESTED = 'REQUESTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

@Entity('stock_transfer')
@Index('idx_stock_transfer_status', ['status'])
export class StockTransfer {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'transfer_id' })
  transferId: string;

  @Column({
    name: 'transfer_number',
    length: 20,
    unique: true,
    default: () => "('TRF-' || lpad(nextval('transfer_number_seq')::text, 6, '0'))",
  })
  transferNumber: string;

  @Column({ name: 'from_warehouse_id', type: 'int' })
  fromWarehouseId: number;

  @ManyToOne(() => Warehouse)
  @JoinColumn({ name: 'from_warehouse_id' })
  fromWarehouse: Warehouse;

  @Column({ name: 'to_warehouse_id', type: 'int' })
  toWarehouseId: number;

  @ManyToOne(() => Warehouse)
  @JoinColumn({ name: 'to_warehouse_id' })
  toWarehouse: Warehouse;

  @Column({
    type: 'enum',
    enum: TransferStatus,
    default: TransferStatus.REQUESTED,
  })
  status: TransferStatus;

  @Column({ name: 'requested_by', type: 'int', nullable: true })
  requestedBy?: number;

  @ManyToOne(() => AppUser, { nullable: true })
  @JoinColumn({ name: 'requested_by' })
  requester?: AppUser;

  @CreateDateColumn({ name: 'requested_at', type: 'timestamptz' })
  requestedAt: Date;

  @Column({ name: 'approved_by', type: 'int', nullable: true })
  approvedBy?: number;

  @ManyToOne(() => AppUser, { nullable: true })
  @JoinColumn({ name: 'approved_by' })
  approver?: AppUser;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt?: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt?: Date;

  @OneToMany(() => StockTransferLine, (line) => line.transfer, { cascade: true })
  lines: StockTransferLine[];
}
