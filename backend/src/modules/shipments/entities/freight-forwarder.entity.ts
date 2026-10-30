import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('freight_forwarder')
export class FreightForwarder {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'freight_forwarder_id' })
  freightForwarderId: string;

  @Column({ length: 150 })
  name: string;

  @Column({ length: 100 })
  country: string;

  @Column({ name: 'contact_person', length: 100, nullable: true })
  contactPerson?: string;

  @Column({ length: 50, nullable: true })
  phone?: string;

  @Column({ length: 100, nullable: true })
  email?: string;

  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

