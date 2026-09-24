import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { AppUser } from '../../auth/entities/app-user.entity';
import { Warehouse } from '../../lookups/entities/warehouse.entity';

@Entity('user_warehouse_access')
export class UserWarehouseAccess {
  @PrimaryColumn({ name: 'user_id', type: 'int' })
  userId: number;

  @PrimaryColumn({ name: 'warehouse_id', type: 'int' })
  warehouseId: number;

  @ManyToOne(() => AppUser, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: AppUser;

  @ManyToOne(() => Warehouse, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse;
}
