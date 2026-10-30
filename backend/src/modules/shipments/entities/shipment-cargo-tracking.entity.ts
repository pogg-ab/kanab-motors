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

@Entity('shipment_cargo_tracking')
export class ShipmentCargoTracking {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'tracking_id' })
  trackingId: string;

  @Column({ name: 'shipment_id', type: 'bigint' })
  shipmentId: string;

  @ManyToOne(() => Shipment, (s) => (s as any).cargoTrackings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shipment_id' })
  shipment: Shipment;

  @Column({ name: 'document_name', length: 100, default: 'ECTN / BESC Certificate' })
  documentName: string;

  @Column({ name: 'reference_number', length: 100, nullable: true })
  referenceNumber?: string;

  @Column({ length: 30, default: 'PENDING' })
  status: 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'EXPIRED';

  @Column({ name: 'submission_date', type: 'date', nullable: true })
  submissionDate?: string;

  @Column({ name: 'deadline_date', type: 'date', nullable: true })
  deadlineDate?: string;

  @Column({ name: 'shipping_cut_off_date', type: 'date', nullable: true })
  shippingCutOffDate?: string;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt?: Date;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
