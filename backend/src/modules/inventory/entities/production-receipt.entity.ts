import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ProductItem } from '../../products/entities/product-item.entity';
import { Warehouse } from '../../lookups/entities/warehouse.entity';
import { AppUser } from '../../auth/entities/app-user.entity';

@Entity('production_receipt')
export class ProductionReceipt {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'production_receipt_id' })
  productionReceiptId: string;

  @Column({ name: 'item_id', type: 'bigint' })
  itemId: string;

  @ManyToOne(() => ProductItem)
  @JoinColumn({ name: 'item_id' })
  item: ProductItem;

  @Column({ name: 'chassis_number', length: 50, unique: true })
  chassisNumber: string;

  @Column({ name: 'engine_number', length: 50, unique: true })
  engineNumber: string;

  @Column({ name: 'warehouse_id', type: 'int' })
  warehouseId: number;

  @ManyToOne(() => Warehouse)
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse;

  @Column({ name: 'assembled_at', type: 'date', default: () => 'CURRENT_DATE' })
  assembledAt: string;

  @Column({ name: 'received_by', type: 'int', nullable: true })
  receivedBy?: number;

  @ManyToOne(() => AppUser, { nullable: true })
  @JoinColumn({ name: 'received_by' })
  receiver?: AppUser;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
