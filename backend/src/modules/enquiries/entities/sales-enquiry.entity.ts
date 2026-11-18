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
import { Customer } from '../../customers/entities/customer.entity';
import { ProductItem } from '../../products/entities/product-item.entity';
import { AppUser } from '../../auth/entities/app-user.entity';

export enum EnquiryStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  SALES_REP_APPROVED = 'SALES_REP_APPROVED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CONVERTED = 'CONVERTED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

@Entity('sales_enquiry')
@Index('idx_enquiry_customer', ['customerId'])
@Index('idx_enquiry_status', ['status'])
export class SalesEnquiry {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', name: 'enquiry_id' })
  enquiryId: string;

  @Column({
    name: 'enquiry_number',
    length: 30,
    unique: true,
    default: () => "('ENQ-' || lpad(nextval('enquiry_number_seq')::text, 6, '0'))",
  })
  enquiryNumber: string;

  @Column({ name: 'customer_id', type: 'bigint' })
  customerId: string;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @Column({ name: 'item_id', type: 'bigint' })
  itemId: string;

  @ManyToOne(() => ProductItem)
  @JoinColumn({ name: 'item_id' })
  item: ProductItem;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ name: 'unit_price', type: 'numeric', precision: 18, scale: 2 })
  unitPrice: number;

  @Column({ name: 'vat_amount', type: 'numeric', precision: 18, scale: 2, default: 0 })
  vatAmount: number;

  @Column({ name: 'estimated_sales_value', type: 'numeric', precision: 18, scale: 2 })
  estimatedSalesValue: number;

  @Column({ name: 'salesperson_name', length: 200 })
  salespersonName: string;

  @Column({ name: 'payment_mode', length: 50, default: 'BANK_DEPOSIT' })
  paymentMode: string;

  @Column({ name: 'enquiry_date', type: 'timestamptz', default: () => 'now()' })
  enquiryDate: Date;

  @Column({ name: 'lead_source', length: 50, default: 'WALK_IN' })
  leadSource: string;

  @Column({ name: 'branch_showroom', length: 150, nullable: true })
  branchShowroom?: string;

  @Column({ name: 'vehicle_category_id', type: 'smallint', nullable: true })
  vehicleCategoryId?: number;

  @Column({ name: 'preferred_color', length: 50, nullable: true })
  preferredColor?: string;

  @Column({ name: 'required_delivery_date', type: 'date', nullable: true })
  requiredDeliveryDate?: string;

  @Column({ name: 'registration_homologation_needed', type: 'boolean', default: false })
  registrationHomologationNeeded: boolean;

  @Column({ name: 'charger_type_included', type: 'boolean', default: false })
  chargerTypeIncluded: boolean;

  @Column({ name: 'target_budget', type: 'numeric', precision: 18, scale: 2, nullable: true })
  targetBudget?: number;

  @Column({ name: 'currency', length: 10, default: 'ETB' })
  currency: string;

  @Column({ name: 'financing_required', type: 'boolean', default: false })
  financingRequired: boolean;

  @Column({ name: 'expected_deposit', type: 'numeric', precision: 18, scale: 2, nullable: true })
  expectedDeposit?: number;

  @Column({ name: 'expected_payment_timeline', length: 100, nullable: true })
  expectedPaymentTimeline?: string;

  @Column({ name: 'finance_provider', length: 150, nullable: true })
  financeProvider?: string;

  // --- Commission Agent Tracking (Client Demo Feedback New Story 1) ---
  @Column({ name: 'commission_agent_name', length: 200, nullable: true })
  commissionAgentName?: string;

  @Column({ name: 'commission_agent_phone', length: 50, nullable: true })
  commissionAgentPhone?: string;

  @Column({ name: 'commission_percentage', type: 'numeric', precision: 5, scale: 2, nullable: true })
  commissionPercentage?: number;

  @Column({ name: 'commission_amount', type: 'numeric', precision: 18, scale: 2, default: 0 })
  commissionAmount: number;

  @Column({ name: 'commission_notes', type: 'text', nullable: true })
  commissionNotes?: string;

  // --- Financing Institution Tracking (Client Demo Feedback New Story 3) ---
  @Column({ name: 'financing_option', length: 50, default: 'CASH' })
  financingOption: string;

  @Column({ name: 'financing_type', length: 50, nullable: true })
  financingType?: string; // 'BANK' | 'MICROFINANCE'

  @Column({ name: 'financing_institution_name', length: 200, nullable: true })
  financingInstitutionName?: string;

  @Column({ name: 'financing_contact_person', length: 200, nullable: true })
  financingContactPerson?: string;

  @Column({ name: 'financing_contact_phone', length: 50, nullable: true })
  financingContactPhone?: string;

  @Column({ name: 'financing_percentage', type: 'numeric', precision: 5, scale: 2, nullable: true })
  financingPercentage?: number;

  @Column({ name: 'financing_amount', type: 'numeric', precision: 18, scale: 2, default: 0 })
  financingAmount: number;

  @Column({ name: 'customer_contribution_percentage', type: 'numeric', precision: 5, scale: 2, nullable: true })
  customerContributionPercentage?: number;

  @Column({ name: 'customer_contribution_amount', type: 'numeric', precision: 18, scale: 2, default: 0 })
  customerContributionAmount: number;

  @Column({ name: 'financing_status', length: 50, default: 'NOT_SUBMITTED' })
  financingStatus: string; // 'NOT_SUBMITTED' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'DISBURSED'

  @Column({ name: 'financing_application_number', length: 100, nullable: true })
  financingApplicationNumber?: string;

  @Column({ name: 'financing_submission_date', type: 'date', nullable: true })
  financingSubmissionDate?: string;

  @Column({ name: 'financing_approval_date', type: 'date', nullable: true })
  financingApprovalDate?: string;

  @Column({ name: 'financing_approved_amount', type: 'numeric', precision: 18, scale: 2, nullable: true })
  financingApprovedAmount?: number;

  @Column({ name: 'financing_disbursed_amount', type: 'numeric', precision: 18, scale: 2, nullable: true })
  financingDisbursedAmount?: number;

  @Column({ name: 'financing_disbursement_date', type: 'date', nullable: true })
  financingDisbursementDate?: string;

  @Column({ name: 'financing_notes', type: 'text', nullable: true })
  financingNotes?: string;

  @Column({ name: 'trade_in_vehicle', type: 'boolean', default: false })
  tradeInVehicle: boolean;

  @Column({ name: 'customer_requirements_notes', type: 'text', nullable: true })
  customerRequirementsNotes?: string;

  @Column({ name: 'sales_rep_approved_by', type: 'int', nullable: true })
  salesRepApprovedBy?: number;

  @ManyToOne(() => AppUser, { nullable: true })
  @JoinColumn({ name: 'sales_rep_approved_by' })
  salesRepApprover?: AppUser;

  @Column({ name: 'sales_rep_approved_at', type: 'timestamptz', nullable: true })
  salesRepApprovedAt?: Date;

  @Column({ name: 'sales_rep_notes', type: 'text', nullable: true })
  salesRepNotes?: string;

  @Column({ name: 'sales_manager_approved_by', type: 'int', nullable: true })
  salesManagerApprovedBy?: number;

  @ManyToOne(() => AppUser, { nullable: true })
  @JoinColumn({ name: 'sales_manager_approved_by' })
  salesManagerApprover?: AppUser;

  @Column({ name: 'sales_manager_approved_at', type: 'timestamptz', nullable: true })
  salesManagerApprovedAt?: Date;

  @Column({ name: 'sales_manager_notes', type: 'text', nullable: true })
  salesManagerNotes?: string;

  @Column({
    type: 'enum',
    enum: EnquiryStatus,
    default: EnquiryStatus.SUBMITTED,
  })
  status: EnquiryStatus;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number;

  @ManyToOne(() => AppUser, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator: AppUser;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
