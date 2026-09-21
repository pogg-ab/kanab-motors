import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { ProductItem } from './product-item.entity';

@Entity('tax_configuration')
export class TaxConfiguration {
  @PrimaryGeneratedColumn('increment', { type: 'smallint', name: 'tax_config_id' })
  taxConfigId: number;

  @Column({ name: 'tax_name', length: 100 })
  taxName: string;

  @Column({ name: 'tax_rate_pct', type: 'numeric', precision: 5, scale: 2 })
  taxRatePct: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => ProductItem, (item) => item.taxConfig)
  items: ProductItem[];
}
