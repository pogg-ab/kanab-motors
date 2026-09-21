import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Shipment } from './shipment.entity';
import { ShipmentStage } from './shipment-stage.enum';
import { AppUser } from '../../auth/entities/app-user.entity';

@Entity('shipment_stage_history')
@Index('idx_shipment_stage_history_shipment', ['shipmentId'])
export class ShipmentStageHistory {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'stage_history_id' })
  stageHistoryId: string;

  @Column({ name: 'shipment_id', type: 'bigint' })
  shipmentId: string;

  @ManyToOne(() => Shipment, (shipment) => shipment.stageHistory, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shipment_id' })
  shipment: Shipment;

  @Column({
    name: 'from_stage',
    type: 'enum',
    enum: ShipmentStage,
    enumName: 'shipment_stage_enum',
    nullable: true,
  })
  fromStage?: ShipmentStage;

  @Column({
    name: 'to_stage',
    type: 'enum',
    enum: ShipmentStage,
    enumName: 'shipment_stage_enum',
  })
  toStage: ShipmentStage;

  @Column({ name: 'changed_by', type: 'int', nullable: true })
  changedBy?: number;

  @ManyToOne(() => AppUser, { nullable: true })
  @JoinColumn({ name: 'changed_by' })
  user?: AppUser;

  @CreateDateColumn({ name: 'changed_at', type: 'timestamptz' })
  changedAt: Date;

  @Column({ type: 'text', nullable: true })
  notes?: string;
}
