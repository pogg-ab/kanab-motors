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
import { ProductItem } from '../../products/entities/product-item.entity';
import { Warehouse } from '../../lookups/entities/warehouse.entity';
import { AppUser } from '../../auth/entities/app-user.entity';

export enum VehicleStatus {
  RECEIVED = 'RECEIVED',
  AVAILABLE_FOR_SALE = 'AVAILABLE_FOR_SALE',
  RESERVED = 'RESERVED',
  ALLOTTED = 'ALLOTTED',
  READY_FOR_DELIVERY = 'READY_FOR_DELIVERY',
  SOLD = 'SOLD',
  DELIVERED = 'DELIVERED',
}

@Entity('vehicle_unit')
@Index('idx_vehicle_unit_item', ['itemId'])
@Index('idx_vehicle_unit_status', ['currentStatus'])
@Index('idx_vehicle_unit_warehouse', ['currentWarehouseId'])
export class VehicleUnit {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'vehicle_unit_id' })
  vehicleUnitId: string;

  @Column({ name: 'item_id', type: 'bigint' })
  itemId: string;

  @ManyToOne(() => ProductItem, (item) => item.vehicleUnits)
  @JoinColumn({ name: 'item_id' })
  item: ProductItem;

  @Column({ name: 'chassis_number', length: 50, unique: true })
  chassisNumber: string;

  @Column({ name: 'engine_number', length: 50, unique: true })
  engineNumber: string;

  @Column({ name: 'production_import_info', type: 'text', nullable: true })
  productionImportInfo: string;

  @Column({ name: 'current_warehouse_id', type: 'int', nullable: true })
  currentWarehouseId: number;

  @Column({ name: 'shipment_line_id', type: 'bigint', nullable: true })
  shipmentLineId?: string;

  @ManyToOne(() => Warehouse, { nullable: true })
  @JoinColumn({ name: 'current_warehouse_id' })
  currentWarehouse: Warehouse;

  @Column({
    name: 'current_status',
    type: 'enum',
    enum: VehicleStatus,
    default: VehicleStatus.RECEIVED,
  })
  currentStatus: VehicleStatus;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number;

  @ManyToOne(() => AppUser, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator: AppUser;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'updated_by', type: 'int', nullable: true })
  updatedBy: number;

  @ManyToOne(() => AppUser, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updater: AppUser;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
