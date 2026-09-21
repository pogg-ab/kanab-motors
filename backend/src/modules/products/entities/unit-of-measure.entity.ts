import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { ProductItem } from './product-item.entity';

@Entity('unit_of_measure')
export class UnitOfMeasure {
  @PrimaryGeneratedColumn('increment', { type: 'smallint', name: 'uom_id' })
  uomId: number;

  @Column({ name: 'uom_name', length: 30, unique: true })
  uomName: string;

  @OneToMany(() => ProductItem, (item) => item.uom)
  items: ProductItem[];
}
