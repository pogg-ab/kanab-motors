import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { VehicleUnit } from '../../vehicles/entities/vehicle-unit.entity';
import { AppUser } from '../../auth/entities/app-user.entity';
import { PdiInspectionResult } from './pdi-inspection-result.entity';

@Entity('pdi_inspection')
@Index('idx_pdi_inspection_vehicle', ['vehicleUnitId'])
export class PdiInspection {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'pdi_inspection_id' })
  pdiInspectionId: string;

  @Column({ name: 'vehicle_unit_id', type: 'bigint' })
  vehicleUnitId: string;

  @ManyToOne(() => VehicleUnit)
  @JoinColumn({ name: 'vehicle_unit_id' })
  vehicleUnit: VehicleUnit;

  @Column({ name: 'inspected_by', type: 'int', nullable: true })
  inspectedBy: number;

  @ManyToOne(() => AppUser, { nullable: true })
  @JoinColumn({ name: 'inspected_by' })
  inspector: AppUser;

  @CreateDateColumn({ name: 'inspected_at', type: 'timestamptz' })
  inspectedAt: Date;

  @OneToMany(() => PdiInspectionResult, (res) => res.inspection, { cascade: true })
  results: PdiInspectionResult[];
}
