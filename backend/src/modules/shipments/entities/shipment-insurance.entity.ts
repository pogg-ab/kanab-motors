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

@Entity('shipment_insurance')
export class ShipmentInsurance {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'insurance_id' })
  insuranceId: string;

  @Column({ name: 'shipment_id', type: 'bigint' })
  shipmentId: string;

  @ManyToOne(() => Shipment, (s) => (s as any).insurances, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shipment_id' })
  shipment: Shipment;

  @Column({ name: 'policy_number', length: 100 })
  policyNumber: string;

  @Column({ name: 'insurer_name', length: 150 })
  insurerName: string;

  @Column({ name: 'insured_value', type: 'numeric', precision: 16, scale: 2 })
  insuredValue: number;

  @Column({ length: 10, default: 'USD' })
  currency: string;

  @Column({ name: 'premium_amount', type: 'numeric', precision: 16, scale: 2, nullable: true })
  premiumAmount?: number;

  @Column({ name: 'coverage_type', length: 150, default: 'All Risks (Institute Cargo Clauses A)' })
  coverageType: string;

  @Column({ name: 'issue_date', type: 'date', nullable: true })
  issueDate?: string;

  @Column({ name: 'valid_until', type: 'date', nullable: true })
  validUntil?: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
