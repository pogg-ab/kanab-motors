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
import { PurchaseOrder } from './purchase-order.entity';
import { Shipment } from '../../shipments/entities/shipment.entity';
import { AppUser } from '../../auth/entities/app-user.entity';

@Entity('import_compliance_record')
@Index('idx_compliance_po', ['poId'])
@Index('idx_compliance_shipment', ['shipmentId'])
@Index('idx_compliance_status', ['status'])
export class ImportComplianceRecord {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'compliance_record_id' })
  complianceRecordId: string;

  @Column({ name: 'po_id', type: 'bigint' })
  poId: string;

  @ManyToOne(() => PurchaseOrder, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'po_id' })
  purchaseOrder: PurchaseOrder;

  @Column({ name: 'shipment_id', type: 'bigint', nullable: true })
  shipmentId?: string;

  @ManyToOne(() => Shipment, { nullable: true })
  @JoinColumn({ name: 'shipment_id' })
  shipment?: Shipment;

  @Column({ name: 'requirement_type', length: 100 })
  requirementType: string;

  @Column({ name: 'issuing_authority', length: 200 })
  issuingAuthority: string;

  @Column({ name: 'application_reference', length: 100, nullable: true })
  applicationReference?: string;

  @Column({ name: 'document_reference', length: 100, nullable: true })
  documentReference?: string;

  @Column({ name: 'application_date', type: 'date', nullable: true })
  applicationDate?: string;

  @Column({ name: 'submission_date', type: 'date', nullable: true })
  submissionDate?: string;

  @Column({ name: 'issue_date', type: 'date', nullable: true })
  issueDate?: string;

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate?: string;

  @Column({ length: 30, default: 'PENDING' })
  status: string; // PENDING, SUBMITTED, APPROVED, REJECTED, EXPIRED, WAIVED

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

