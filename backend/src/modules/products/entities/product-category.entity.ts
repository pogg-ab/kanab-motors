import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { ProductItem } from './product-item.entity';

@Entity('product_category')
export class ProductCategory {
  @PrimaryGeneratedColumn('increment', { type: 'smallint', name: 'category_id' })
  categoryId: number;

  @Column({ name: 'category_name', length: 100, unique: true })
  categoryName: string;

  @OneToMany(() => ProductItem, (item) => item.category)
  items: ProductItem[];
}
