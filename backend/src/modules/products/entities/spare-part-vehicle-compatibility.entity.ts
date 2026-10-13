import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ProductItem } from './product-item.entity';
import { AppUser } from '../../auth/entities/app-user.entity';

@Entity('spare_part_vehicle_compatibility')
@Index('idx_sp_compat_part', ['sparePartId'])
@Index('idx_sp_compat_model', ['vehicleModel'])
export class SparePartVehicleCompatibility {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'compatibility_id' })
  compatibilityId: string;

  @Column({ name: 'spare_part_id', type: 'bigint' })
  sparePartId: string;

  @ManyToOne(() => ProductItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'spare_part_id' })
  sparePart: ProductItem;

  @Column({ name: 'vehicle_model', length: 100 })
  vehicleModel: string;

  @Column({ name: 'vehicle_make', length: 100, nullable: true })
  vehicleMake?: string;

  @Column({ name: 'year_from', type: 'int', nullable: true })
  yearFrom?: number;

  @Column({ name: 'year_to', type: 'int', nullable: true })
  yearTo?: number;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy?: number;

  @ManyToOne(() => AppUser, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator?: AppUser;
}
