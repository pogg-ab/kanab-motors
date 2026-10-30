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

@Entity('shipment_container')
export class ShipmentContainer {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'container_id' })
  containerId: string;

  @Column({ name: 'shipment_id', type: 'bigint' })
  shipmentId: string;

  @ManyToOne(() => Shipment, (s) => (s as any).containers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shipment_id' })
  shipment: Shipment;

  @Column({ name: 'container_number', length: 50 })
  containerNumber: string;

  @Column({ name: 'container_type', length: 50, default: '40ft HC' })
  containerType: string;

  @Column({ name: 'payload_capacity_kg', type: 'numeric', precision: 12, scale: 2, nullable: true })
  payloadCapacityKg?: number;

  @Column({ name: 'gross_weight_kg', type: 'numeric', precision: 12, scale: 2, nullable: true })
  grossWeightKg?: number;

  @Column({ name: 'seal_number', length: 50, nullable: true })
  sealNumber?: string;

  @Column({ name: 'loading_date', type: 'date', nullable: true })
  loadingDate?: string;

  @Column({ name: 'free_time_days', type: 'int', default: 14 })
  freeTimeDays: number;

  @Column({ name: 'free_time_end_date', type: 'date', nullable: true })
  freeTimeEndDate?: string;

  @Column({ name: 'empty_return_due_date', type: 'date', nullable: true })
  emptyReturnDueDate?: string;

  @Column({ name: 'container_status', length: 30, default: 'LOADED' })
  containerStatus: 'LOADED' | 'IN_TRANSIT' | 'DISCHARGED' | 'AT_PORT' | 'DELIVERED' | 'RETURNED';

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

