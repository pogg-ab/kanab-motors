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
import { PurchaseOrder } from '../../purchase-orders/entities/purchase-order.entity';
import { AppUser } from '../../auth/entities/app-user.entity';

@Entity('shipment_document')
export class ShipmentDocument {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'shipment_document_id' })
  shipmentDocumentId: string;

  @Column({ name: 'shipment_id', type: 'bigint' })
  shipmentId: string;

  @ManyToOne(() => Shipment, (s) => (s as any).documents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shipment_id' })
  shipment: Shipment;

  @Column({ name: 'po_id', type: 'bigint', nullable: true })
  poId?: string;

  @ManyToOne(() => PurchaseOrder, { nullable: true })
  @JoinColumn({ name: 'po_id' })
  purchaseOrder?: PurchaseOrder;

  @Column({ name: 'attachment_id', type: 'bigint', nullable: true })
  attachmentId?: string;

  @Column({ name: 'document_type', length: 60 })
  documentType: string;

  @Column({ name: 'document_reference', length: 100, nullable: true })
  documentReference?: string;

  @Column({ name: 'issue_date', type: 'date', nullable: true })
  issueDate?: string;

  @Column({ name: 'expiry_date', type: 'date', nullable: true })
  expiryDate?: string;

  @Column({ name: 'received_date', type: 'date', nullable: true })
  receivedDate?: string;

  @Column({ name: 'verification_status', length: 30, default: 'PENDING' })
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';

  @Column({ name: 'verified_by', type: 'int', nullable: true })
  verifiedBy?: number;

  @ManyToOne(() => AppUser, { nullable: true })
  @JoinColumn({ name: 'verified_by' })
  verifier?: AppUser;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt?: Date;

  @Column({ name: 'verification_notes', type: 'text', nullable: true })
  verificationNotes?: string;

  @Column({ name: 'original_document_status', length: 30, default: 'NOT_RECEIVED' })
  originalDocumentStatus: 'NOT_RECEIVED' | 'RECEIVED' | 'ENDORSED_TO_BANK' | 'RELEASED_TO_AGENT' | 'SURRENDERED';

  @Column({ name: 'release_date', type: 'date', nullable: true })
  releaseDate?: string;

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

