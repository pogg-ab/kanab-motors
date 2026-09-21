import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { VehicleUnit } from '../../vehicles/entities/vehicle-unit.entity';
import { ShipmentLine } from './shipment-line.entity';
import { AppUser } from '../../auth/entities/app-user.entity';

@Entity('vehicle_unit_landed_cost')
@Index('idx_vehicle_unit_landed_cost_unit', ['vehicleUnitId'])
export class VehicleUnitLandedCost {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'vehicle_unit_cost_id' })
  vehicleUnitCostId: string;

  @Column({ name: 'vehicle_unit_id', type: 'bigint' })
  vehicleUnitId: string;

  @ManyToOne(() => VehicleUnit, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vehicle_unit_id' })
  vehicleUnit: VehicleUnit;

  @Column({ name: 'shipment_line_id', type: 'bigint' })
  shipmentLineId: string;

  @ManyToOne(() => ShipmentLine)
  @JoinColumn({ name: 'shipment_line_id' })
  shipmentLine: ShipmentLine;

  @Column({ name: 'landed_cost_etb', type: 'numeric', precision: 18, scale: 2 })
  landedCostEtb: number;

  @Column({ name: 'is_current', type: 'boolean', default: true })
  isCurrent: boolean;

  @CreateDateColumn({ name: 'calculated_at', type: 'timestamptz' })
  calculatedAt: Date;

  @Column({ name: 'calculated_by', type: 'int', nullable: true })
  calculatedBy?: number;

  @ManyToOne(() => AppUser, { nullable: true })
  @JoinColumn({ name: 'calculated_by' })
  calculator?: AppUser;
}
