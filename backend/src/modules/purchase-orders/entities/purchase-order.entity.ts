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
import { Supplier } from '../../suppliers/entities/supplier.entity';
import { AppUser } from '../../auth/entities/app-user.entity';
import { PurchaseOrderLine } from './purchase-order-line.entity';
import { ImportRequisition } from '../../import-requisitions/entities/import-requisition.entity';
import { CompanyBankAccount } from './company-bank-account.entity';
import { PoPaymentSchedule } from './po-payment-schedule.entity';
import { PoLetterOfCredit } from './po-letter-of-credit.entity';
import { ImportComplianceRecord } from './import-compliance-record.entity';

export enum POStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  CONFIRMED = 'CONFIRMED',
  PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED',
}

@Entity('purchase_order')
@Index('idx_po_supplier', ['supplierId'])
@Index('idx_po_status', ['status'])
export class PurchaseOrder {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'po_id' })
  poId: string;

  @Column({ name: 'po_number', length: 20, unique: true })
  poNumber: string;

  @Column({ name: 'supplier_id', type: 'int' })
  supplierId: number;

  @ManyToOne(() => Supplier)
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier;

  @Column({ name: 'po_date', type: 'date', default: () => 'CURRENT_DATE' })
  poDate: string;

  @Column({ type: 'varchar', length: 10 })
  currency: string;

  @Column({
    type: 'enum',
    enum: POStatus,
    default: POStatus.DRAFT,
  })
  status: POStatus;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  // Commercial & Import Integration (KMSICAMS-12)
  @Column({ name: 'requisition_id', type: 'bigint', nullable: true })
  requisitionId?: string;

  @ManyToOne(() => ImportRequisition, { nullable: true })
  @JoinColumn({ name: 'requisition_id' })
  requisition?: ImportRequisition;

  @Column({ length: 30, default: 'FOB' })
  incoterms: string;

  @Column({ name: 'payment_terms', length: 100, default: '30% Advance T/T, 70% against Bill of Lading' })
  paymentTerms: string;

  @Column({ name: 'country_of_origin', length: 100, default: 'India' })
  countryOfOrigin: string;

  @Column({ name: 'port_of_loading', length: 100, default: 'Nhava Sheva (JNPT), Mumbai, India' })
  portOfLoading: string;

  @Column({ name: 'port_of_discharge', length: 100, default: 'Djibouti Free Port / Mojo Dry Port' })
  portOfDischarge: string;

  @Column({ name: 'mode_of_shipment', length: 50, default: 'SEA' })
  modeOfShipment: string;

  @Column({ name: 'packing_requirements', length: 200, default: 'Standard export seaworthy packing in heavy-duty 40ft High Cube containers' })
  packingRequirements: string;

  @Column({ name: 'delivery_lead_time_days', type: 'int', default: 30 })
  deliveryLeadTimeDays: number;

  @Column({ name: 'lead_time_trigger', length: 100, default: 'PO issuance and confirmed advance payment' })
  leadTimeTrigger: string;

  @Column({ name: 'expected_delivery_date', type: 'date', nullable: true })
  expectedDeliveryDate?: string;

  @Column({ name: 'proforma_invoice_no', length: 100, nullable: true })
  proformaInvoiceNo?: string;

  @Column({ name: 'proforma_invoice_date', type: 'date', nullable: true })
  proformaInvoiceDate?: string;

  @Column({ name: 'contract_reference', length: 100, nullable: true })
  contractReference?: string;

  @Column({ name: 'inspection_requirements', type: 'text', nullable: true })
  inspectionRequirements?: string;

  @Column({ name: 'warranty_terms', type: 'text', nullable: true })
  warrantyTerms?: string;

  @Column({ name: 'commercial_remarks', type: 'text', nullable: true })
  commercialRemarks?: string;

  @Column({ name: 'bank_account_id', type: 'int', nullable: true })
  bankAccountId?: number;

  @ManyToOne(() => CompanyBankAccount, { nullable: true })
  @JoinColumn({ name: 'bank_account_id' })
  bankAccount?: CompanyBankAccount;

  @Column({ name: 'amount_in_words', type: 'text', nullable: true })
  amountInWords?: string;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy?: number;

  @ManyToOne(() => AppUser, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator?: AppUser;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'updated_by', type: 'int', nullable: true })
  updatedBy?: number;

  @ManyToOne(() => AppUser, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updater?: AppUser;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @OneToMany(() => PurchaseOrderLine, (line) => line.purchaseOrder, { cascade: true })
  lines: PurchaseOrderLine[];

  @OneToMany(() => PoPaymentSchedule, (sched) => sched.purchaseOrder)
  paymentSchedules: PoPaymentSchedule[];

  @OneToMany(() => PoLetterOfCredit, (lc) => lc.purchaseOrder)
  lettersOfCredit: PoLetterOfCredit[];

  @OneToMany(() => ImportComplianceRecord, (rec) => rec.purchaseOrder)
  complianceRecords: ImportComplianceRecord[];
}
