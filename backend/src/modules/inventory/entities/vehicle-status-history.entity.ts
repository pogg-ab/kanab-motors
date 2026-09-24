import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { VehicleUnit, VehicleStatus } from '../../vehicles/entities/vehicle-unit.entity';
import { AppUser } from '../../auth/entities/app-user.entity';

@Entity('vehicle_status_history')
@Index('idx_vehicle_status_history_unit', ['vehicleUnitId'])
export class VehicleStatusHistory {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'status_history_id' })
  statusHistoryId: string;

  @Column({ name: 'vehicle_unit_id', type: 'bigint' })
  vehicleUnitId: string;

  @ManyToOne(() => VehicleUnit, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vehicle_unit_id' })
  vehicleUnit: VehicleUnit;

  @Column({
    name: 'from_status',
    type: 'enum',
    enum: VehicleStatus,
    nullable: true,
  })
  fromStatus?: VehicleStatus;

  @Column({
    name: 'to_status',
    type: 'enum',
    enum: VehicleStatus,
  })
  toStatus: VehicleStatus;

  @Column({ name: 'triggered_by_user', type: 'int', nullable: true })
  triggeredByUser?: number;

  @ManyToOne(() => AppUser, { nullable: true })
  @JoinColumn({ name: 'triggered_by_user' })
  triggerUser?: AppUser;

  @Column({ name: 'triggered_by_module', length: 50 })
  triggeredByModule: string;

  @CreateDateColumn({ name: 'changed_at', type: 'timestamptz' })
  changedAt: Date;

  @Column({ type: 'text', nullable: true })
  notes?: string;
}
