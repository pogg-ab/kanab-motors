import {
  Entity,
  PrimaryColumn,
  Column,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Warehouse } from '../../lookups/entities/warehouse.entity';
import { ProductItem } from '../../products/entities/product-item.entity';

@Entity('stock_balance')
export class StockBalance {
  @PrimaryColumn({ name: 'warehouse_id', type: 'int' })
  warehouseId: number;

  @ManyToOne(() => Warehouse)
  @JoinColumn({ name: 'warehouse_id' })
  warehouse: Warehouse;

  @PrimaryColumn({ name: 'item_id', type: 'bigint' })
  itemId: string;

  @ManyToOne(() => ProductItem)
  @JoinColumn({ name: 'item_id' })
  item: ProductItem;

  @Column({ name: 'quantity_on_hand', type: 'numeric', precision: 12, scale: 2, default: 0 })
  quantityOnHand: number;

  @Column({ name: 'quantity_reserved', type: 'numeric', precision: 12, scale: 2, default: 0 })
  quantityReserved: number;

  @Column({
    name: 'quantity_available',
    type: 'numeric',
    precision: 12,
    scale: 2,
    insert: false,
    update: false,
    asExpression: 'quantity_on_hand - quantity_reserved',
    generatedType: 'STORED',
  })
  quantityAvailable: number;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
