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
import { CkdSkdBatch } from './ckd-skd-batch.entity';
import { CkdSkdBatchReceipt } from './ckd-skd-batch-receipt.entity';
import { ProductItem } from '../../products/entities/product-item.entity';
import { VehicleUnit } from '../../vehicles/entities/vehicle-unit.entity';
import { Warehouse } from '../../lookups/entities/warehouse.entity';
import { AppUser } from '../../auth/entities/app-user.entity';

export enum SerialType {
  VIN = 'VIN',
  MOTOR = 'MOTOR',
  ENGINE = 'ENGINE',
  BATTERY = 'BATTERY',
  CONTROLLER = 'CONTROLLER',
}

export enum SerialStatus {
  RECEIVED = 'RECEIVED',
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  INSTALLED = 'INSTALLED',
  REPLACED = 'REPLACED',
  REJECTED = 'REJECTED',
  RETURNED = 'RETURNED',
}

export enum SerialSourceType {
  IMPORT = 'IMPORT',
  GOODS_RECEIPT = 'GOODS_RECEIPT',
  BULK_IMPORT = 'BULK_IMPORT',
  MANUAL = 'MANUAL',
}

@Entity('ckd_skd_serial')
@Index('idx_ckd_serial_batch', ['batchId'])
@Index('idx_ckd_serial_product', ['itemId'])
export class CkdSkdSerial {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'serial_id' })
  serialId: string;

  @Column({ name: 'batch_id', type: 'bigint' })
  batchId: string;

  @ManyToOne(() => CkdSkdBatch, (b) => b.serials)
  @JoinColumn({ name: 'batch_id' })
  batch: CkdSkdBatch;

  @Column({ name: 'batch_receipt_id', type: 'bigint', nullable: true })
  batchReceiptId?: string;

  @ManyToOne(() => CkdSkdBatchReceipt, { nullable: true })
  @JoinColumn({ name: 'batch_receipt_id' })
  batchReceipt?: CkdSkdBatchReceipt;

  @Column({ name: 'item_id', type: 'bigint' })
  itemId: string;

  @ManyToOne(() => ProductItem)
  @JoinColumn({ name: 'item_id' })
  item: ProductItem;

  @Column({ name: 'vehicle_unit_id', type: 'bigint', nullable: true })
  vehicleUnitId?: string;

  @ManyToOne(() => VehicleUnit, { nullable: true })
  @JoinColumn({ name: 'vehicle_unit_id' })
  vehicleUnit?: VehicleUnit;

  @Column({ name: 'warehouse_id', type: 'int', nullable: true })
  warehouseId?: number;

  @ManyToOne(() => Warehouse, { nullable: true })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse?: Warehouse;

  @Column({ name: 'serial_type', length: 20 })
  serialType: SerialType;

  @Column({ name: 'serial_number', length: 150 })
  serialNumber: string;

  @Column({ name: 'serial_status', length: 20, default: SerialStatus.RECEIVED })
  serialStatus: SerialStatus;

  @Column({ name: 'source_type', length: 30, default: SerialSourceType.IMPORT })
  sourceType: SerialSourceType;

  @Column({ name: 'source_reference', length: 150, nullable: true })
  sourceReference?: string;

  @Column({ name: 'received_at', type: 'timestamptz', nullable: true })
  receivedAt?: Date;

  @Column({ name: 'created_by', type: 'int' })
  createdBy: number;

  @ManyToOne(() => AppUser)
  @JoinColumn({ name: 'created_by' })
  creator: AppUser;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'updated_by', type: 'int', nullable: true })
  updatedBy?: number;

  @ManyToOne(() => AppUser, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updater?: AppUser;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz', nullable: true })
  updatedAt?: Date;
}
