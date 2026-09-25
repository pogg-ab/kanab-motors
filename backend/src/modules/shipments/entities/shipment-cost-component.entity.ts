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
import { CostComponentType } from './cost-component-type.entity';
import { AppUser } from '../../auth/entities/app-user.entity';

@Entity('shipment_cost_component')
@Index('idx_shipment_cost_component_shipment', ['shipmentId'])
export class ShipmentCostComponent {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'cost_component_id' })
  costComponentId: string;

  @Column({ name: 'shipment_id', type: 'bigint' })
  shipmentId: string;

  @ManyToOne(() => Shipment, (shipment) => shipment.costComponents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shipment_id' })
  shipment: Shipment;

  @Column({ name: 'cost_component_type_id', type: 'smallint' })
  costComponentTypeId: number;

  @ManyToOne(() => CostComponentType)
  @JoinColumn({ name: 'cost_component_type_id' })
  costComponentType: CostComponentType;

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  amount: number;

  @Column({ type: 'enum', enum: ['ETB', 'USD', 'EUR'] })
  currency: 'ETB' | 'USD' | 'EUR';

  @Column({ name: 'exchange_rate_to_etb', type: 'numeric', precision: 18, scale: 6 })
  exchangeRateToEtb: number;

  @Column({
    name: 'amount_etb',
    type: 'numeric',
    precision: 18,
    scale: 2,
  })
  amountEtb: number;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy?: number;

  @ManyToOne(() => AppUser, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator?: AppUser;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
