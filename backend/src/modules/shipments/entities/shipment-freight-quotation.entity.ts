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
import { FreightForwarder } from './freight-forwarder.entity';
import { AppUser } from '../../auth/entities/app-user.entity';

@Entity('shipment_freight_quotation')
export class ShipmentFreightQuotation {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'quotation_id' })
  quotationId: string;

  @Column({ name: 'shipment_id', type: 'bigint' })
  shipmentId: string;

  @ManyToOne(() => Shipment, (s) => (s as any).quotations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shipment_id' })
  shipment: Shipment;

  @Column({ name: 'freight_forwarder_id', type: 'bigint' })
  freightForwarderId: string;

  @ManyToOne(() => FreightForwarder, { eager: true })
  @JoinColumn({ name: 'freight_forwarder_id' })
  forwarder: FreightForwarder;

  @Column({ name: 'quotation_reference', length: 100, nullable: true })
  quotationReference?: string;

  @Column({ name: 'quotation_date', type: 'date', nullable: true })
  quotationDate?: string;

  @Column({ name: 'valid_until', type: 'date', nullable: true })
  validUntil?: string;

  @Column({ name: 'freight_amount', type: 'numeric', precision: 16, scale: 2, default: 0 })
  freightAmount: number;

  @Column({ length: 10, default: 'USD' })
  currency: string;

  @Column({ name: 'estimated_transit_days', type: 'int', nullable: true })
  estimatedTransitDays?: number;

  @Column({ name: 'destination_charges', type: 'numeric', precision: 16, scale: 2, default: 0 })
  destinationCharges: number;

  @Column({ name: 'additional_terms', type: 'text', nullable: true })
  additionalTerms?: string;

  @Column({ name: 'attachment_id', type: 'bigint', nullable: true })
  attachmentId?: string;

  @Column({ name: 'selection_status', length: 20, default: 'PENDING' })
  selectionStatus: 'PENDING' | 'SELECTED' | 'REJECTED';

  @Column({ name: 'selection_reason', type: 'text', nullable: true })
  selectionReason?: string;

  @Column({ name: 'selected_by', type: 'int', nullable: true })
  selectedBy?: number;

  @ManyToOne(() => AppUser, { nullable: true })
  @JoinColumn({ name: 'selected_by' })
  selector?: AppUser;

  @Column({ name: 'selected_at', type: 'timestamptz', nullable: true })
  selectedAt?: Date;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy?: number;

  @ManyToOne(() => AppUser, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator?: AppUser;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

