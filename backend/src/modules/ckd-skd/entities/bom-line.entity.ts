import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Bom } from './bom.entity';
import { ProductItem } from '../../products/entities/product-item.entity';
import { UnitOfMeasure } from '../../products/entities/unit-of-measure.entity';

@Entity('bom_line')
export class BomLine {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'bom_line_id' })
  bomLineId: string;

  @Column({ name: 'bom_id', type: 'bigint' })
  bomId: string;

  @ManyToOne(() => Bom, (b) => b.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bom_id' })
  bom: Bom;

  @Column({ name: 'component_item_id', type: 'bigint' })
  componentItemId: string;

  @ManyToOne(() => ProductItem)
  @JoinColumn({ name: 'component_item_id' })
  componentItem: ProductItem;

  @Column({ name: 'required_quantity', type: 'numeric', precision: 18, scale: 3 })
  requiredQuantity: number;

  @Column({ name: 'uom_id', type: 'smallint' })
  uomId: number;

  @ManyToOne(() => UnitOfMeasure)
  @JoinColumn({ name: 'uom_id' })
  uom: UnitOfMeasure;

  @Column({ name: 'is_serialized', type: 'boolean', default: false })
  isSerialized: boolean;

  @Column({ name: 'serial_type', length: 20, nullable: true })
  serialType?: string;
}
