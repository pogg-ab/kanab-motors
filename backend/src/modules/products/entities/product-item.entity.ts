import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { ProductCategory } from './product-category.entity';
import { Brand } from './brand.entity';
import { UnitOfMeasure } from './unit-of-measure.entity';
import { TaxConfiguration } from './tax-configuration.entity';
import { AppUser } from '../../auth/entities/app-user.entity';
import { VehicleUnit } from '../../vehicles/entities/vehicle-unit.entity';

@Entity('product_item')
@Index('idx_product_item_category', ['categoryId'])
@Index('idx_product_item_brand', ['brandId'])
export class ProductItem {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'item_id' })
  itemId: string;

  @Column({ name: 'item_code', length: 30, unique: true })
  itemCode: string;

  @Column({ name: 'item_name', length: 200 })
  itemName: string;

  @Column({ name: 'category_id', type: 'smallint' })
  categoryId: number;

  @ManyToOne(() => ProductCategory, (cat) => cat.items)
  @JoinColumn({ name: 'category_id' })
  category: ProductCategory;

  @Column({ name: 'brand_id', type: 'smallint', nullable: true })
  brandId: number;

  @ManyToOne(() => Brand, (brand) => brand.items, { nullable: true })
  @JoinColumn({ name: 'brand_id' })
  brand: Brand;

  @Column({ length: 100, nullable: true })
  model: string;

  @Column({ name: 'uom_id', type: 'smallint' })
  uomId: number;

  @ManyToOne(() => UnitOfMeasure, (uom) => uom.items)
  @JoinColumn({ name: 'uom_id' })
  uom: UnitOfMeasure;

  @Column({ name: 'selling_price', type: 'numeric', precision: 18, scale: 2 })
  sellingPrice: number;

  @Column({ name: 'tax_config_id', type: 'smallint', nullable: true })
  taxConfigId: number;

  @ManyToOne(() => TaxConfiguration, (tax) => tax.items, { nullable: true })
  @JoinColumn({ name: 'tax_config_id' })
  taxConfig: TaxConfiguration;

  @Column({ name: 'reorder_level', type: 'int', default: 0 })
  reorderLevel: number;

  @Column({ name: 'weight_kg', type: 'numeric', precision: 10, scale: 2, nullable: true })
  weightKg?: number;

  @Column({ name: 'is_individually_tracked', type: 'boolean', default: false })
  isIndividuallyTracked: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number;

  @ManyToOne(() => AppUser, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator: AppUser;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'updated_by', type: 'int', nullable: true })
  updatedBy: number;

  @ManyToOne(() => AppUser, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updater: AppUser;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => VehicleUnit, (unit) => unit.item)
  vehicleUnits: VehicleUnit[];
}
