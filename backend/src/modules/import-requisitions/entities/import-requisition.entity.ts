import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { AppUser } from '../../auth/entities/app-user.entity';
import { ImportRequisitionLine } from './import-requisition-line.entity';

export enum ImportRequisitionStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  CONVERTED_TO_PO = 'CONVERTED_TO_PO',
}

@Entity('import_requisition')
@Index('idx_import_requisition_status', ['status'])
@Index('idx_import_requisition_req_by', ['requestedBy'])
export class ImportRequisition {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'requisition_id' })
  requisitionId: string;

  @Column({
    name: 'requisition_number',
    length: 30,
    unique: true,
    default: () => "('REQ-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(nextval('import_requisition_number_seq')::text, 5, '0'))",
  })
  requisitionNumber: string;

  @Column({ name: 'business_unit_id', length: 100, default: 'Fleet & Commercial Vehicle Assembly' })
  businessUnitId: string;

  @Column({ name: 'requested_by', type: 'int', nullable: true })
  requestedBy?: number;

  @ManyToOne(() => AppUser, { nullable: true })
  @JoinColumn({ name: 'requested_by' })
  requester?: AppUser;

  @Column({ name: 'request_date', type: 'date', default: () => 'CURRENT_DATE' })
  requestDate: string;

  @Column({ name: 'required_delivery_date', type: 'date', nullable: true })
  requiredDeliveryDate?: string;

  @Column({ type: 'text', nullable: true })
  justification?: string;

  @Column({ name: 'estimated_budget', type: 'numeric', precision: 18, scale: 2, default: 0 })
  estimatedBudget: number;

  @Column({ type: 'varchar', length: 10, default: 'USD' })
  currency: string;

  @Column({
    type: 'enum',
    enum: ImportRequisitionStatus,
    default: ImportRequisitionStatus.DRAFT,
  })
  status: ImportRequisitionStatus;

  @Column({ name: 'approved_by', type: 'int', nullable: true })
  approvedBy?: number;

  @ManyToOne(() => AppUser, { nullable: true })
  @JoinColumn({ name: 'approved_by' })
  approver?: AppUser;

  @Column({ name: 'approved_at', type: 'timestamptz', nullable: true })
  approvedAt?: Date;

  @Column({ name: 'approval_notes', type: 'text', nullable: true })
  approvalNotes?: string;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => ImportRequisitionLine, (line) => line.requisition)
  lines: ImportRequisitionLine[];
}

