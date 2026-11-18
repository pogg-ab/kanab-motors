import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { SalesEnquiry } from './sales-enquiry.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { ProductItem } from '../../products/entities/product-item.entity';
import { VehicleUnit } from '../../vehicles/entities/vehicle-unit.entity';
import { AppUser } from '../../auth/entities/app-user.entity';

export enum InspectionStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum InspectionOutcome {
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  PENDING_DECISION = 'PENDING_DECISION',
}

@Entity('customer_vehicle_inspection')
@Index('idx_cvi_enquiry', ['enquiryId'])
@Index('idx_cvi_status', ['status'])
@Index('idx_cvi_deadline', ['inspectionDeadline'])
export class CustomerVehicleInspection {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'inspection_id' })
  inspectionId: string;

  @Column({
    name: 'inspection_number',
    length: 30,
    unique: true,
    default: () => "('INSP-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(nextval('inspection_number_seq')::text, 5, '0'))",
  })
  inspectionNumber: string;

  @Column({ name: 'enquiry_id', type: 'bigint' })
  enquiryId: string;

  @ManyToOne(() => SalesEnquiry, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'enquiry_id' })
  enquiry: SalesEnquiry;

  @Column({ name: 'customer_id', type: 'bigint' })
  customerId: string;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'item_id', type: 'bigint', nullable: true })
  itemId?: string;

  @ManyToOne(() => ProductItem, { nullable: true })
  @JoinColumn({ name: 'item_id' })
  item?: ProductItem;

  @Column({ name: 'vehicle_model', length: 200, nullable: true })
  vehicleModel?: string;

  @Column({ name: 'engine_number', length: 100, nullable: true })
  engineNumber?: string;

  @Column({ name: 'vin_chassis_number', length: 100, nullable: true })
  vinChassisNumber?: string;

  @Column({ name: 'vehicle_unit_id', type: 'bigint', nullable: true })
  vehicleUnitId?: string;

  @ManyToOne(() => VehicleUnit, { nullable: true })
  @JoinColumn({ name: 'vehicle_unit_id' })
  vehicleUnit?: VehicleUnit;

  @Column({ name: 'inspection_start_time', type: 'timestamptz', default: () => 'now()' })
  inspectionStartTime: Date;

  @Column({ name: 'allowed_duration_minutes', type: 'int', default: 120 })
  allowedDurationMinutes: number;

  @Column({ name: 'inspection_deadline', type: 'timestamptz', nullable: true })
  inspectionDeadline: Date;

  @Column({
    type: 'varchar',
    length: 50,
    default: InspectionStatus.PENDING,
  })
  status: InspectionStatus;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  outcome?: InspectionOutcome;

  @Column({ name: 'inspection_completed_at', type: 'timestamptz', nullable: true })
  inspectionCompletedAt?: Date;

  @Column({ name: 'extension_minutes', type: 'int', default: 0 })
  extensionMinutes: number;

  @Column({ name: 'extension_reason', type: 'text', nullable: true })
  extensionReason?: string;

  @Column({ name: 'extended_by', type: 'int', nullable: true })
  extendedBy?: number;

  @Column({ name: 'cancellation_reason', type: 'text', nullable: true })
  cancellationReason?: string;

  @Column({ name: 'cancelled_by', type: 'int', nullable: true })
  cancelledBy?: number;

  @Column({ type: 'text', nullable: true })
  remarks?: string;

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

