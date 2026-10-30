import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Shipment } from './shipment.entity';
import { AppUser } from '../../auth/entities/app-user.entity';

@Entity('shipment_milestone')
export class ShipmentMilestone {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'milestone_id' })
  milestoneId: string;

  @Column({ name: 'shipment_id', type: 'bigint' })
  shipmentId: string;

  @ManyToOne(() => Shipment, (s) => (s as any).milestones, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shipment_id' })
  shipment: Shipment;

  @Column({ name: 'milestone_name', length: 100 })
  milestoneName: string;

  @Column({ name: 'planned_date', type: 'date', nullable: true })
  plannedDate?: string;

  @Column({ name: 'milestone_date', type: 'date', nullable: true })
  milestoneDate?: string;

  @Column({ name: 'is_completed', type: 'boolean', default: false })
  isCompleted: boolean;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt?: Date;

  @Column({ name: 'completed_by', type: 'int', nullable: true })
  completedBy?: number;

  @ManyToOne(() => AppUser, { nullable: true })
  @JoinColumn({ name: 'completed_by' })
  completer?: AppUser;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
