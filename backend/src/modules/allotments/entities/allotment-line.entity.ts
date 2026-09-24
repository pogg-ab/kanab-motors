import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Allotment } from './allotment.entity';
import { VehicleUnit } from '../../vehicles/entities/vehicle-unit.entity';
import { AppUser } from '../../auth/entities/app-user.entity';

@Entity('allotment_line')
@Index('idx_allotment_line_allotment', ['allotmentId'])
@Index('idx_allotment_line_vehicle_unit', ['vehicleUnitId'])
export class AllotmentLine {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'allotment_line_id' })
  allotmentLineId: string;

  @Column({ name: 'allotment_id', type: 'bigint' })
  allotmentId: string;

  @ManyToOne(() => Allotment, (allotment) => allotment.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'allotment_id' })
  allotment: Allotment;

  @Column({ name: 'vehicle_unit_id', type: 'bigint' })
  vehicleUnitId: string;

  @ManyToOne(() => VehicleUnit)
  @JoinColumn({ name: 'vehicle_unit_id' })
  vehicleUnit: VehicleUnit;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'deactivated_at', type: 'timestamptz', nullable: true })
  deactivatedAt: Date;

  @Column({ name: 'deactivated_by', type: 'int', nullable: true })
  deactivatedBy: number;

  @ManyToOne(() => AppUser, { nullable: true })
  @JoinColumn({ name: 'deactivated_by' })
  deactivator: AppUser;
}
