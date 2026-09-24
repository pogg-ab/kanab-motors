import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Booking } from '../../bookings/entities/booking.entity';
import { AppUser } from '../../auth/entities/app-user.entity';
import { AllotmentLine } from './allotment-line.entity';

export enum AllotmentStatus {
  REQUESTED = 'REQUESTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

@Entity('allotment')
@Index('idx_allotment_booking', ['bookingId'])
@Index('idx_allotment_status', ['status'])
export class Allotment {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'allotment_id' })
  allotmentId: string;

  @Column({
    name: 'allotment_number',
    length: 20,
    unique: true,
    default: () => "('ALT-' || lpad(nextval('allotment_number_seq')::text, 6, '0'))",
  })
  allotmentNumber: string;

  @Column({ name: 'booking_id', type: 'bigint' })
  bookingId: string;

  @ManyToOne(() => Booking)
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @Column({
    type: 'enum',
    enum: AllotmentStatus,
    default: AllotmentStatus.REQUESTED,
  })
  status: AllotmentStatus;

  @Column({ name: 'requested_by', type: 'int', nullable: true })
  requestedBy: number;

  @ManyToOne(() => AppUser, { nullable: true })
  @JoinColumn({ name: 'requested_by' })
  requester: AppUser;

  @CreateDateColumn({ name: 'requested_at', type: 'timestamptz' })
  requestedAt: Date;

  @Column({ name: 'approved_by', type: 'int', nullable: true })
  approvedBy: number;

  @ManyToOne(() => AppUser, { nullable: true })
  @JoinColumn({ name: 'approved_by' })
  approver: AppUser;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt: Date;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string;

  @OneToMany(() => AllotmentLine, (line) => line.allotment, { cascade: true })
  lines: AllotmentLine[];
}
