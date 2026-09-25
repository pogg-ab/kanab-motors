import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ProductItem } from '../../products/entities/product-item.entity';
import { PurchaseOrder } from './purchase-order.entity';

@Entity('purchase_order_line')
@Index('idx_po_line_po', ['poId'])
@Index('idx_po_line_item', ['itemId'])
export class PurchaseOrderLine {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'po_line_id' })
  poLineId: string;

  @Column({ name: 'po_id', type: 'bigint' })
  poId: string;

  @ManyToOne(() => PurchaseOrder, (po) => po.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'po_id' })
  purchaseOrder: PurchaseOrder;

  @Column({ name: 'item_id', type: 'bigint' })
  itemId: string;

  @ManyToOne(() => ProductItem)
  @JoinColumn({ name: 'item_id' })
  item: ProductItem;

  @Column({ name: 'quantity_ordered', type: 'numeric', precision: 12, scale: 2 })
  quantityOrdered: number;

  @Column({ name: 'unit_price', type: 'numeric', precision: 18, scale: 4 })
  unitPrice: number;

  @Column({ type: 'enum', enum: ['ETB', 'USD', 'EUR'] })
  currency: 'ETB' | 'USD' | 'EUR';

  @Column({
    name: 'line_total',
    type: 'numeric',
    precision: 18,
    scale: 2,
  })
  lineTotal: number;
}
