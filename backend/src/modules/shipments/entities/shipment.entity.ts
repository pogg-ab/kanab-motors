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
import { AppUser } from '../../auth/entities/app-user.entity';
import { ShipmentLine } from './shipment-line.entity';
import { ShipmentStageHistory } from './shipment-stage-history.entity';
import { ShipmentCostComponent } from './shipment-cost-component.entity';
import { ShipmentStage, AllocationMethod } from './shipment-stage.enum';

export { ShipmentStage, AllocationMethod };

@Entity('shipment')
@Index('idx_shipment_stage', ['currentStage'])
export class Shipment {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'shipment_id' })
  shipmentId: string;

  @Column({ name: 'shipment_number', length: 20, unique: true })
  shipmentNumber: string;

  @Column({
    name: 'current_stage',
    type: 'enum',
    enum: ShipmentStage,
    enumName: 'shipment_stage_enum',
    default: ShipmentStage.ORDERED,
  })
  currentStage: ShipmentStage;

  @Column({ name: 'bill_of_lading_number', length: 60, nullable: true })
  billOfLadingNumber?: string;

  @Column({ name: 'expected_arrival_date', type: 'date', nullable: true })
  expectedArrivalDate?: string;

  @Column({ name: 'actual_arrival_date', type: 'date', nullable: true })
  actualArrivalDate?: string;

  @Column({
    name: 'allocation_method',
    length: 20,
    default: 'BY_VALUE',
  })
  allocationMethod: AllocationMethod;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy?: number;

  @ManyToOne(() => AppUser, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator?: AppUser;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'updated_by', type: 'int', nullable: true })
  updatedBy?: number;

  @ManyToOne(() => AppUser, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updater?: AppUser;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => ShipmentLine, (line) => line.shipment, { cascade: true })
  lines: ShipmentLine[];

  @OneToMany(() => ShipmentStageHistory, (history) => history.shipment)
  stageHistory: ShipmentStageHistory[];

  @OneToMany(() => ShipmentCostComponent, (cost) => cost.shipment)
  costComponents: ShipmentCostComponent[];
}
