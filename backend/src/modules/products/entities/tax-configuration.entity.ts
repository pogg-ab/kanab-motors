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

  @Column({ name: 'tax_type', length: 20, default: 'VAT' })
  taxType: string; // 'VAT' | 'EXCISE' | 'WHT'

  @Column({ name: 'applicable_customer_type', length: 30, default: 'ALL' })
  applicableCustomerType: string; // 'ALL' | 'DEALER' | 'GOVERNMENT' | 'DIRECT_POS' | 'WHT_ONLY'

  @Column({ name: 'applicable_vehicle_type', length: 50, default: 'ALL' })
  applicableVehicleType: string; // 'ALL' | 'MOTORCYCLE' | 'THREE_WHEELER' | 'IMPORTED_VEHICLE'

  @Column({ name: 'calculation_base', length: 50, default: 'VEHICLE_PRICE' })
  calculationBase: string; // 'VEHICLE_PRICE' | 'GROSS_INCL_EXCISE'

  @Column({ type: 'int', default: 1 })
  priority: number;

  @Column({ name: 'effective_from', type: 'date', default: '2026-01-01' })
  effectiveFrom: string;

  @Column({ name: 'effective_to', type: 'date', nullable: true })
  effectiveTo?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => ProductItem, (item) => item.taxConfig)
  items: ProductItem[];
}
