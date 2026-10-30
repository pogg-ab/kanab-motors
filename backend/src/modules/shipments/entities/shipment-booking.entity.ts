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

@Entity('shipment_booking')
export class ShipmentBooking {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'booking_id' })
  bookingId: string;

  @Column({ name: 'shipment_id', type: 'bigint' })
  shipmentId: string;

  @ManyToOne(() => Shipment, (s) => (s as any).bookings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shipment_id' })
  shipment: Shipment;

  @Column({ name: 'freight_forwarder_id', type: 'bigint', nullable: true })
  freightForwarderId?: string;

  @ManyToOne(() => FreightForwarder, { nullable: true, eager: true })
  @JoinColumn({ name: 'freight_forwarder_id' })
  forwarder?: FreightForwarder;

  @Column({ name: 'booking_reference', length: 100 })
  bookingReference: string;

  @Column({ name: 'carrier_name', length: 100, nullable: true })
  carrierName?: string;

  @Column({ name: 'vessel_name', length: 100, nullable: true })
  vesselName?: string;

  @Column({ name: 'voyage_number', length: 50, nullable: true })
  voyageNumber?: string;

  @Column({ name: 'origin_port', length: 100, nullable: true })
  originPort?: string;

  @Column({ name: 'destination_port', length: 100, nullable: true })
  destinationPort?: string;

  @Column({ name: 'estimated_departure_date', type: 'date', nullable: true })
  estimatedDepartureDate?: string;

  @Column({ name: 'actual_departure_date', type: 'date', nullable: true })
  actualDepartureDate?: string;

  @Column({ name: 'estimated_arrival_date', type: 'date', nullable: true })
  estimatedArrivalDate?: string;

  @Column({ name: 'actual_arrival_date', type: 'date', nullable: true })
  actualArrivalDate?: string;

  @Column({ name: 'booking_status', length: 30, default: 'CONFIRMED' })
  bookingStatus: 'REQUESTED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

  @Column({ type: 'text', nullable: true })
  notes?: string;

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

