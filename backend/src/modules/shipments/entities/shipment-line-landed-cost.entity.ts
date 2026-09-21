import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ShipmentLine } from './shipment-line.entity';
import { AppUser } from '../../auth/entities/app-user.entity';

@Entity('shipment_line_landed_cost')
@Index('idx_shipment_line_landed_cost_line', ['shipmentLineId'])
export class ShipmentLineLandedCost {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'line_landed_cost_id' })
  lineLandedCostId: string;

  @Column({ name: 'shipment_line_id', type: 'bigint' })
  shipmentLineId: string;

  @ManyToOne(() => ShipmentLine, (line) => line.landedCosts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shipment_line_id' })
  shipmentLine: ShipmentLine;

  @Column({ name: 'allocated_cost_etb', type: 'numeric', precision: 18, scale: 2 })
  allocatedCostEtb: number;

  @Column({ name: 'allocation_basis', length: 20 })
  allocationBasis: string;

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
