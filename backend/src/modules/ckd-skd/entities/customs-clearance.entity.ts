import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { AppUser } from '../../auth/entities/app-user.entity';
import { CustomsClearanceLine } from './customs-clearance-line.entity';

export enum CustomsClearanceStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  PARTIALLY_CLEARED = 'PARTIALLY_CLEARED',
  CLEARED = 'CLEARED',
  ON_HOLD = 'ON_HOLD',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

@Entity('customs_clearance')
export class CustomsClearance {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'clearance_id' })
  clearanceId: string;

  @Column({ name: 'declaration_number', length: 100, unique: true })
  declarationNumber: string;

  @Column({ name: 'clearance_date', type: 'date', nullable: true })
  clearanceDate?: string;

  @Column({
    name: 'status',
    length: 25,
    default: CustomsClearanceStatus.DRAFT,
  })
  status: CustomsClearanceStatus;

  @Column({ name: 'document_reference', length: 500, nullable: true })
  documentReference?: string;

  @Column({ type: 'text', nullable: true })
  remarks?: string;

  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true })
  submittedAt?: Date;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt?: Date;

  @Column({ name: 'approved_by', type: 'int', nullable: true })
  approvedBy?: number;

  @ManyToOne(() => AppUser, { nullable: true })
  @JoinColumn({ name: 'approved_by' })
  approver?: AppUser;

  @Column({ name: 'created_by', type: 'int' })
  createdBy: number;

  @ManyToOne(() => AppUser)
  @JoinColumn({ name: 'created_by' })
  creator: AppUser;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => CustomsClearanceLine, (line) => line.clearance, { cascade: true })
  lines: CustomsClearanceLine[];
}
