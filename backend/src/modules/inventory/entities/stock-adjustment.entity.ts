import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Warehouse } from '../../lookups/entities/warehouse.entity';
import { ProductItem } from '../../products/entities/product-item.entity';
import { VehicleUnit } from '../../vehicles/entities/vehicle-unit.entity';
import { AppUser } from '../../auth/entities/app-user.entity';

export enum AdjustmentReason {
  DAMAGE = 'DAMAGE',
  LOSS = 'LOSS',
  CYCLE_COUNT_CORRECTION = 'CYCLE_COUNT_CORRECTION',
  OTHER = 'OTHER',
}

export enum AdjustmentStatus {
  REQUESTED = 'REQUESTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('stock_adjustment')
export class StockAdjustment {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'adjustment_id' })
  adjustmentId: string;

  @Column({
    name: 'adjustment_number',
    length: 20,
    unique: true,
    default: () => "('ADJ-' || lpad(nextval('adjustment_number_seq')::text, 6, '0'))",
  })
  adjustmentNumber: string;

  @Column({ name: 'warehouse_id', type: 'int' })
  warehouseId: number;

  @ManyToOne(() => Warehouse)
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse;

  @Column({ name: 'item_id', type: 'bigint', nullable: true })
  itemId?: string;

  @ManyToOne(() => ProductItem, { nullable: true })
  @JoinColumn({ name: 'item_id' })
  item?: ProductItem;

  @Column({ name: 'quantity_delta', type: 'numeric', precision: 12, scale: 2, nullable: true })
  quantityDelta?: number;

  @Column({ name: 'vehicle_unit_id', type: 'bigint', nullable: true })
  vehicleUnitId?: string;

  @ManyToOne(() => VehicleUnit, { nullable: true })
  @JoinColumn({ name: 'vehicle_unit_id' })
  vehicleUnit?: VehicleUnit;

  @Column({
    type: 'enum',
    enum: AdjustmentReason,
  })
  reason: AdjustmentReason;

  @Column({ name: 'reason_notes', type: 'text' })
  reasonNotes: string;

  @Column({
    type: 'enum',
    enum: AdjustmentStatus,
    default: AdjustmentStatus.REQUESTED,
  })
  status: AdjustmentStatus;

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
}
