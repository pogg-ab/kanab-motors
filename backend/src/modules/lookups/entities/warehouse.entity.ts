import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('warehouse')
export class Warehouse {
  @PrimaryGeneratedColumn('increment', { type: 'int', name: 'warehouse_id' })
  warehouseId: number;

  @Column({ name: 'warehouse_name', length: 150 })
  warehouseName: string;

  @Column({ length: 250, nullable: true })
  location: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;
}
