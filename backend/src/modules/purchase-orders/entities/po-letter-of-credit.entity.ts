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
import { AppUser } from '../../auth/entities/app-user.entity';

@Entity('po_letter_of_credit')
@Index('idx_po_lc_po', ['poId'])
@Index('idx_po_lc_status', ['status'])
export class PoLetterOfCredit {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'lc_id' })
  lcId: string;

  @Column({ name: 'po_id', type: 'bigint' })
  poId: string;

  @ManyToOne(() => PurchaseOrder, (po) => po.lettersOfCredit, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'po_id' })
  purchaseOrder: PurchaseOrder;

  @Column({ name: 'lc_number', length: 100, unique: true })
  lcNumber: string;

  @Column({ name: 'issuing_bank', length: 150 })
  issuingBank: string;

  @Column({ name: 'advising_bank', length: 150, nullable: true })
  advisingBank?: string;

  @Column({ type: 'numeric', precision: 18, scale: 2 })
  amount: number;

  @Column({ length: 10, default: 'USD' })
  currency: string;

  @Column({ name: 'issue_date', type: 'date' })
  issueDate: string;

  @Column({ name: 'expiry_date', type: 'date' })
  expiryDate: string;

  @Column({ name: 'latest_shipment_date', type: 'date', nullable: true })
  latestShipmentDate?: string;

  @Column({ length: 30, default: 'ISSUED' })
  status: string; // APPLIED, ISSUED, AMENDED, UTILIZED, EXPIRED, CLOSED

  @Column({ name: 'documentary_requirements', type: 'text', nullable: true })
  documentaryRequirements?: string;

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

