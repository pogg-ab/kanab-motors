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
import { Customer } from '../../customers/entities/customer.entity';
import { AppUser } from '../../auth/entities/app-user.entity';

@Entity('customer_payment_transfer')
@Index('idx_cpt_source_booking', ['sourceBookingId'])
@Index('idx_cpt_dest_booking', ['destinationBookingId'])
export class CustomerPaymentTransfer {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'transfer_id' })
  transferId: string;

  @Column({ name: 'source_booking_id', type: 'bigint' })
  sourceBookingId: string;

  @ManyToOne(() => Booking)
  @JoinColumn({ name: 'source_booking_id' })
  sourceBooking: Booking;

  @Column({ name: 'source_customer_id', type: 'bigint' })
  sourceCustomerId: string;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'source_customer_id' })
  sourceCustomer: Customer;

  @Column({ name: 'destination_booking_id', type: 'bigint' })
  destinationBookingId: string;

  @ManyToOne(() => Booking)
  @JoinColumn({ name: 'destination_booking_id' })
  destinationBooking: Booking;

  @Column({ name: 'destination_customer_id', type: 'bigint' })
  destinationCustomerId: string;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'destination_customer_id' })
  destinationCustomer: Customer;

  @Column({ name: 'transfer_amount', type: 'numeric', precision: 18, scale: 2 })
  transferAmount: number;

  @Column({ name: 'transfer_reason', type: 'text' })
  transferReason: string;

  @Column({ name: 'authorization_reference', length: 150, nullable: true })
  authorizationReference?: string;

  @Column({ name: 'transferred_by', type: 'int', nullable: true })
  transferredBy?: number;

  @ManyToOne(() => AppUser, { nullable: true })
  @JoinColumn({ name: 'transferred_by' })
  transferredByUser?: AppUser;

  @CreateDateColumn({ name: 'transferred_at', type: 'timestamptz' })
  transferredAt: Date;
}

