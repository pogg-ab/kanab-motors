import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Booking } from '../../bookings/entities/booking.entity';
import { VehicleUnit } from '../../vehicles/entities/vehicle-unit.entity';
import { AppUser } from '../../auth/entities/app-user.entity';

export enum DeliveryStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

@Entity('delivery')
@Index('idx_delivery_booking', ['bookingId'])
@Index('idx_delivery_vehicle_unit', ['vehicleUnitId'])
@Index('idx_delivery_status', ['status'])
export class Delivery {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'delivery_id' })
  deliveryId: string;

  @Column({
    name: 'delivery_number',
    length: 20,
    unique: true,
    default: () => "('DEL-' || lpad(nextval('delivery_number_seq')::text, 6, '0'))",
  })
  deliveryNumber: string;

  @Column({ name: 'booking_id', type: 'bigint' })
  bookingId: string;

  @ManyToOne(() => Booking)
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @Column({ name: 'vehicle_unit_id', type: 'bigint' })
  vehicleUnitId: string;

  @ManyToOne(() => VehicleUnit)
  @JoinColumn({ name: 'vehicle_unit_id' })
  vehicleUnit: VehicleUnit;

  @Column({ name: 'delivery_date', type: 'date', nullable: true })
  deliveryDate?: string;

  @Column({ name: 'responsible_employee', type: 'int', nullable: true })
  responsibleEmployee?: number;

  @ManyToOne(() => AppUser, { nullable: true })
  @JoinColumn({ name: 'responsible_employee' })
  responsibleStaff?: AppUser;

  @Column({ name: 'customer_acknowledged', type: 'boolean', default: false })
  customerAcknowledged: boolean;

  @Column({ name: 'pdi_completed', type: 'boolean', default: false })
  pdiCompleted: boolean;

  @Column({ name: 'financial_settlement_validated', type: 'boolean', default: false })
  financialSettlementValidated: boolean;

  @Column({
    type: 'enum',
    enum: DeliveryStatus,
    default: DeliveryStatus.PENDING,
  })
  status: DeliveryStatus;

  @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true })
  deliveredAt?: Date;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number;

  @ManyToOne(() => AppUser, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator: AppUser;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
