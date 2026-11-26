import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { AppUser } from '../../auth/entities/app-user.entity';

export enum WarehouseType {
  MAIN = 'MAIN',
  BRANCH = 'BRANCH',
  SHOWROOM = 'SHOWROOM',
}

export enum WarehouseClassification {
  BONDED = 'BONDED',
  CUSTOMS_RELEASED = 'CUSTOMS_RELEASED',
  PRODUCTION = 'PRODUCTION',
  SATELLITE_STORE = 'SATELLITE_STORE',
  FINISHED_GOODS = 'FINISHED_GOODS',
  STANDARD = 'STANDARD',
}

@Entity('warehouse')
export class Warehouse {
  @PrimaryGeneratedColumn('increment', { type: 'int', name: 'warehouse_id' })
  warehouseId: number;

  @Column({ name: 'warehouse_name', length: 150 })
  warehouseName: string;

  @Column({
    name: 'warehouse_type',
    type: 'enum',
    enum: WarehouseType,
    default: WarehouseType.BRANCH,
  })
  warehouseType: WarehouseType;

  @Column({
    name: 'warehouse_classification',
    type: 'varchar',
    length: 30,
    default: WarehouseClassification.STANDARD,
  })
  warehouseClassification: WarehouseClassification;

  @Column({ type: 'int', nullable: true })
  capacity?: number;

  @Column({ name: 'manager_user_id', type: 'int', nullable: true })
  managerUserId?: number;

  @ManyToOne(() => AppUser, { nullable: true })
  @JoinColumn({ name: 'manager_user_id' })
  manager?: AppUser;

  @Column({ name: 'contact_phone', length: 30, nullable: true })
  contactPhone?: string;

  @Column({ length: 250, nullable: true })
  location: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}
