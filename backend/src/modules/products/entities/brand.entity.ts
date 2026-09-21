import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { ProductItem } from './product-item.entity';

@Entity('brand')
export class Brand {
  @PrimaryGeneratedColumn('increment', { type: 'smallint', name: 'brand_id' })
  brandId: number;

  @Column({ name: 'brand_name', length: 100, unique: true })
  brandName: string;

  @OneToMany(() => ProductItem, (item) => item.brand)
  items: ProductItem[];
}
