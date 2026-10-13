import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { SparePartsSale } from './spare-parts-sale.entity';
import { ProductItem } from './product-item.entity';

@Entity('spare_parts_sale_item')
@Index('idx_sps_item_sale', ['saleId'])
@Index('idx_sps_item_item', ['itemId'])
export class SparePartsSaleItem {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'sale_item_id' })
  saleItemId: string;

  @Column({ name: 'sale_id', type: 'bigint' })
  saleId: string;

  @ManyToOne(() => SparePartsSale, (sale) => sale.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sale_id' })
  sale: SparePartsSale;

  @Column({ name: 'item_id', type: 'bigint' })
  itemId: string;

  @ManyToOne(() => ProductItem)
  @JoinColumn({ name: 'item_id' })
  item: ProductItem;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  quantity: number;

  @Column({ name: 'unit_price', type: 'numeric', precision: 18, scale: 2 })
  unitPrice: number;

  @Column({ name: 'discount_percent', type: 'numeric', precision: 5, scale: 2, default: 0 })
  discountPercent: number;

  @Column({ name: 'vat_percent', type: 'numeric', precision: 5, scale: 2, default: 15 })
  vatPercent: number;

  @Column({ name: 'line_subtotal', type: 'numeric', precision: 18, scale: 2 })
  lineSubtotal: number;

  @Column({ name: 'line_vat', type: 'numeric', precision: 18, scale: 2 })
  lineVat: number;

  @Column({ name: 'line_total', type: 'numeric', precision: 18, scale: 2 })
  lineTotal: number;
}
