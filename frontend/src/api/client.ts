import axios from 'axios';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? 'http://localhost:3000/api' : '/api');

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('kanab_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface AppUser {
  userId: number;
  username: string;
  email: string;
  fullName: string;
  roleId: number;
  role?: {
    roleId: number;
    roleName: string;
    displayName?: string;
    description?: string;
    permissions?: string[];
    isSystemRole?: boolean;
  };
  permissions: string[];
  isActive: boolean;
  lastLoginAt?: string;
  mustChangePassword?: boolean;
  createdAt: string;
}

export interface Role {
  roleId: number;
  roleName: string;
  displayName?: string;
  description?: string;
  permissions?: string[];
  isSystemRole?: boolean;
}

export interface SystemModule {
  moduleCode: string;
  moduleName: string;
  description?: string;
  displayOrder: number;
}

export interface SystemAction {
  actionCode: string;
  actionName: string;
  description?: string;
  displayOrder: number;
}

export interface RolePermissionMatrixResponse {
  roles: Role[];
  modules: SystemModule[];
  actions: SystemAction[];
  matrix: Record<number, Record<string, Record<string, boolean>>>;
}

export interface SystemPermission {
  key: string;
  label: string;
  category: string;
  description: string;
}

export interface Region {
  regionId: number;
  regionName: string;
}

export interface Warehouse {
  warehouseId: number;
  warehouseName: string;
  location?: string;
  warehouseType?: string;
  capacity?: number;
  managerUserId?: number;
  contactPhone?: string;
  manager?: {
    userId: number;
    fullName: string;
    username: string;
  };
  isActive: boolean;
}

export interface CustomerBankAccount {
  bankAccountId: string;
  customerId: string;
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  branch?: string;
  isPrimary: boolean;
  createdAt: string;
}

export interface CustomerAccountSummary {
  customerId: string;
  totalDeposits: number | string;
  allocatedToBookings: number | string;
  outstandingBalance: number | string;
  availableCredit: number | string;
  excessPayments: number | string;
  refundableBalance: number | string;
  lastRecalculatedAt: string;
}

export interface Attachment {
  attachmentId: string;
  fileName: string;
  filePath: string;
  contentType?: string;
  fileSizeBytes?: string;
  documentType?: string;
  uploadedAt: string;
}

export interface Customer {
  customerId: string;
  customerCode: string;
  customerType: 'DIRECT_POS' | 'DEALER' | 'GOVERNMENT';
  fullName: string;
  regionId?: number;
  region?: Region;
  addressTown?: string;
  mobileNumber: string;
  tinNumber?: string;
  withholdingTaxFlag?: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  bankAccounts?: CustomerBankAccount[];
  accountSummary?: CustomerAccountSummary;
  documents?: Attachment[];
}

export interface ProductCategory {
  categoryId: number;
  categoryName: string;
}

export interface Brand {
  brandId: number;
  brandName: string;
}

export interface UnitOfMeasure {
  uomId: number;
  uomName: string;
  uomCode?: string;
}

export interface VehicleColor {
  colorId: number;
  colorName: string;
  hexCode?: string;
  isActive?: boolean;
}

export interface TaxConfiguration {
  taxConfigId: number;
  taxName: string;
  taxCode?: string;
  taxRatePct: number | string;
  taxRate?: number | string;
  taxType?: 'VAT' | 'EXCISE' | 'WHT';
  applicableCustomerType?: string;
  applicableVehicleType?: string;
  calculationBase?: string;
  priority?: number;
  effectiveFrom?: string;
  effectiveTo?: string;
  description?: string;
  isActive: boolean;
}

export interface ProductItem {
  itemId: string;
  itemCode: string;
  itemName: string;
  categoryId: number;
  category?: ProductCategory;
  brandId?: number;
  brand?: Brand;
  model?: string;
  colour?: string;
  engineCapacityCc?: string;
  batteryPowerKwh?: number;
  uomId: number;
  uom?: UnitOfMeasure;
  sellingPrice: number | string;
  taxConfigId?: number;
  taxConfig?: TaxConfiguration;
  reorderLevel: number;
  weightKg?: number;
  isActive: boolean;
  createdAt: string;
  totalUnits?: number;
  isIndividuallyTracked?: boolean;
}


export interface VehicleUnit {
  vehicleUnitId: string;
  itemId: string;
  item?: ProductItem;
  chassisNumber: string;
  engineNumber: string;
  productionImportInfo?: string;
  currentWarehouseId?: number;
  currentWarehouse?: Warehouse;
  currentStatus:
  | 'RECEIVED'
  | 'AVAILABLE_FOR_SALE'
  | 'RESERVED'
  | 'ALLOTTED'
  | 'READY_FOR_DELIVERY'
  | 'SOLD'
  | 'DELIVERED';
  createdAt: string;
}

// --- KMSICAMS-2 Interfaces ---

export interface LedgerTransaction {
  transactionId: string;
  date: string;
  description: string;
  transactionType: string;
  reference: string;
  debit: number;
  credit: number;
  runningBalance: number;
  bookingNumber?: string;
  processedBy?: string;
}

export interface StatementOfAccount {
  customerId: string;
  summary: CustomerAccountSummary;
  transactions: LedgerTransaction[];
  total: number;
  page: number;
  limit: number;
}

export interface SalesEnquiry {
  enquiryId: string;
  enquiryNumber: string;
  customerId: string;
  customer?: Customer;
  itemId: string;
  item?: ProductItem;
  quantity: number;
  unitPrice: number;
  vatAmount: number;
  estimatedSalesValue: number;
  salespersonName: string;
  paymentMode: string;
  status: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CONVERTED';
  rejectionReason?: string;
  createdAt: string;
}

export interface PreAdvanceSlip {
  slipId: string;
  slipNumber: string;
  enquiryId: string;
  enquiry?: SalesEnquiry;
  customerId: string;
  customer?: Customer;
  itemId: string;
  item?: ProductItem;
  quantity: number;
  unitPrice: number;
  vatAmount: number;
  totalAmount: number;
  requiredAdvanceAmount: number;
  status: 'ACTIVE' | 'PAYMENT_PENDING' | 'CONVERTED' | 'EXPIRED' | 'CANCELLED';
  issuedAt: string;
  expiresAt: string;
  notes?: string;
  createdAt: string;
}

export interface Booking {
  bookingId: string;
  bookingNumber: string;
  customerId: string;
  customer?: Customer;
  enquiryId?: string;
  enquiry?: SalesEnquiry;
  slipId?: string;
  slip?: PreAdvanceSlip;
  itemId: string;
  item?: ProductItem;
  quantity: number;
  unitPrice: number;
  vatAmount: number;
  grossTotal: number;
  requiredAdvanceAmount: number;
  totalAmountDeposited: number;
  outstandingBalance: number;
  bookingDate: string;
  targetDeliveryDate?: string;
  bookingStatus:
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'CONFIRMED'
  | 'ALLOTTED'
  | 'SETTLED'
  | 'CANCELLED';
  salespersonName: string;
  cancellationReason?: string;
  allottedQuantity?: number;
  remainingQuantity?: number;
  createdAt: string;
}

export interface CustomerPayment {
  paymentId: string;
  receiptNumber: string;
  bookingId: string;
  booking?: Booking;
  customerId: string;
  customer?: Customer;
  paymentDate: string;
  instrumentType: 'CASH' | 'BANK_DEPOSIT' | 'TRANSFER' | 'CHEQUE';
  bankName: string;
  amount: number;
  referenceNumber: string;
  referenceDate?: string;
  status: 'SUBMITTED' | 'CONFIRMED' | 'REJECTED';
  isInstallment?: boolean;
  installmentApprovalStatus?: 'NONE' | 'PENDING_CEO' | 'APPROVED' | 'REJECTED';
  ceoApprovedBy?: number;
  ceoApprovedAt?: string;
  ceoRejectionReason?: string;
  confirmedBy?: number;
  confirmedAt?: string;
  createdAt: string;
}

export interface CustomerRefund {
  refundId: string;
  refundNumber: string;
  customerId: string;
  customer?: Customer;
  bookingId?: string;
  booking?: Booking;
  originalPaymentReference?: string;
  refundReason: string;
  refundAmount: number;
  refundMethod: string;
  bankAccountId?: string;
  bankAccount?: CustomerBankAccount;
  status:
  | 'REQUESTED'
  | 'REVIEWED'
  | 'APPROVED'
  | 'FINANCE_PROCESSED'
  | 'CONFIRMED'
  | 'REJECTED';
  rejectionReason?: string;
  createdAt: string;
}

// --- KMSICAMS-5 Interfaces (Vehicle Allotment Management) ---

export interface AllotmentLine {
  allotmentLineId: string;
  allotmentId: string;
  vehicleUnitId: string;
  vehicleUnit?: VehicleUnit;
  isActive: boolean;
  createdAt: string;
  deactivatedAt?: string;
  deactivatedBy?: number;
}

export interface Allotment {
  allotmentId: string;
  allotmentNumber: string;
  bookingId: string;
  booking?: Booking;
  status: 'DRAFT' | 'SUBMITTED' | 'REQUESTED' | 'UNDER_REVIEW' | 'APPROVED' | 'POSTED' | 'REJECTED' | 'CANCELLED' | 'REVERSED' | string;
  requestedBy?: number;
  requestedAt: string;
  approvedBy?: number;
  approvedAt?: string;
  rejectionReason?: string;
  remarks?: string;
  notes?: string;
  dispatchLocation?: string;
  warehouseName?: string;
  lines?: AllotmentLine[];
}

export interface EligibleBooking extends Booking {
  isDepositSatisfied: boolean;
  requiredQuantity: number;
  allottedQuantity: number;
  remainingQuantity: number;
}

// --- KMSICAMS-3 Interfaces (Import, Shipment Tracking & Landed Cost) ---

export interface Supplier {
  exporterIecNo?: string;
  exporterAdCode?: string;
  supplierId: number;
  supplierName: string;
  country?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
}

export type ShipmentStage =
  | 'ORDERED'
  | 'SHIPPED'
  | 'AT_DJIBOUTI_PORT'
  | 'ETHIOPIAN_CUSTOMS_CLEARANCE'
  | 'IN_TRANSIT_INLAND'
  | 'RECEIVED';

export interface PurchaseOrderLine {
  poLineId: string;
  poId: string;
  purchaseOrder?: PurchaseOrder;
  itemId: string;
  item?: ProductItem;
  quantityOrdered: number;
  remainingQuantity?: number;
  unitPrice: number;
  currency: string;
  lineTotal: number;
  hsnSacCode?: string;
  uom?: string;
  itemDescription?: string;
}

export interface CompanyProfile {
  profileId: number;
  companyName: string;
  iecNo?: string;
  adCode?: string;
  taxId?: string;
  address?: string;
  city?: string;
  country: string;
  phone?: string;
  email?: string;
  isDefault: boolean;
}

export interface CompanyBankAccount {
  bankAccountId: number;
  accountName: string;
  bankName: string;
  accountNumber: string;
  bankBranch?: string;
  ifscCode?: string;
  swiftCode?: string;
  currency: string;
  isActive: boolean;
}

export interface ImportComplianceRecord {
  complianceRecordId: string;
  poId: string;
  shipmentId?: string;
  requirementType: string;
  issuingAuthority: string;
  applicationReference?: string;
  documentReference?: string;
  applicationDate?: string;
  submissionDate?: string;
  issueDate?: string;
  expiryDate?: string;
  status: string;
  notes?: string;
  createdAt: string;
}

export interface PoPaymentTransaction {
  paymentTransactionId: string;
  paymentScheduleId: string;
  paymentReference: string;
  paymentDate: string;
  amountPaid: number;
  currency: string;
  bankName?: string;
  status: string;
  notes?: string;
  createdAt?: string;
}

export interface PoPaymentSchedule {
  paymentScheduleId: string;
  poId: string;
  milestoneName: string;
  paymentMethod: string;
  dueDate?: string;
  amountDue: number;
  currency: string;
  status: string;
  notes?: string;
  totalPaid?: number;
  remainingBalance?: number;
  isFullyPaid?: boolean;
  transactions?: PoPaymentTransaction[];
}

export interface PoLetterOfCredit {
  lcId: string;
  poId: string;
  lcNumber: string;
  issuingBank: string;
  advisingBank?: string;
  amount: number;
  currency: string;
  issueDate: string;
  expiryDate: string;
  latestShipmentDate?: string;
  status: string;
  documentaryRequirements?: string;
  notes?: string;
  createdAt?: string;
}

export interface ImportRequisitionLine {
  requisitionLineId: string;
  requisitionId: string;
  itemId: string;
  item?: ProductItem;
  quantityRequested: number;
  estimatedUnitPrice: number;
  currency: string;
  lineTotal: number;
  technicalSpecification?: string;
  qualityRequirements?: string;
  intendedApplication?: string;
  notes?: string;
  createdAt: string;
}

export interface ImportRequisition {
  requisitionId: string;
  requisitionNumber: string;
  businessUnitId: string;
  requestedBy?: number;
  requester?: { userId: number; username: string; fullName: string };
  requestDate: string;
  requiredDeliveryDate?: string;
  justification?: string;
  estimatedBudget: number;
  currency: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'CONVERTED_TO_PO';
  approvedBy?: number;
  approver?: { userId: number; username: string; fullName: string };
  approvedAt?: string;
  approvalNotes?: string;
  rejectionReason?: string;
  lines: ImportRequisitionLine[];
  createdAt: string;
  updatedAt: string;
}

export interface StockOrderReview {
  itemId: string;
  itemCode: string;
  itemName: string;
  category?: string;
  brand?: string;
  stockOnHand: number;
  stockReserved: number;
  stockAvailable: number;
  openPOQuantity: number;
  pendingRequisitionQuantity: number;
  totalPipeline: number;
  minimumOrderQuantity: number;
  safetyStockThreshold: number;
  suggestedOrderQuantity: number;
}

export interface PurchaseOrder {
  poId: string;
  poNumber: string;
  supplierId: number;
  supplier?: Supplier;
  poDate: string;
  currency: string;
  status: 'DRAFT' | 'SUBMITTED' | 'CONFIRMED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';
  notes?: string;
  requisitionId?: string;
  requisition?: ImportRequisition;
  incoterms?: string;
  paymentTerms?: string;
  countryOfOrigin?: string;
  portOfLoading?: string;
  portOfDischarge?: string;
  modeOfShipment?: string;
  packingRequirements?: string;
  deliveryLeadTimeDays?: number;
  leadTimeTrigger?: string;
  expectedDeliveryDate?: string;
  proformaInvoiceNo?: string;
  proformaInvoiceDate?: string;
  contractReference?: string;
  inspectionRequirements?: string;
  warrantyTerms?: string;
  commercialRemarks?: string;
  bankAccountId?: number;
  bankAccount?: CompanyBankAccount;
  amountInWords?: string;
  lines: PurchaseOrderLine[];
  complianceRecords?: ImportComplianceRecord[];
  paymentSchedules?: PoPaymentSchedule[];
  lettersOfCredit?: PoLetterOfCredit[];
  createdAt: string;
  updatedAt: string;
}

export interface CostComponentType {
  costComponentTypeId: number;
  typeCode: string;
  typeName: string;
}

export interface ExchangeRateDefault {
  currency: string;
  rateToEtb: number;
  updatedAt: string;
}

export interface ShipmentCostComponent {
  costComponentId: string;
  shipmentId: string;
  costComponentTypeId: number;
  costComponentType?: CostComponentType;
  amount: number;
  currency: string;
  exchangeRateToEtb: number;
  amountEtb: number;
  notes?: string;
  createdAt: string;
}

export interface ShipmentLine {
  shipmentLineId: string;
  shipmentId: string;
  poLineId: string;
  poLine?: PurchaseOrderLine;
  quantityShipped: number;
  quantityReceived: number;
  receipts?: any[];
}

export interface ShipmentStageHistory {
  stageHistoryId: string;
  shipmentId: string;
  fromStage?: string;
  toStage: string;
  changedBy?: number;
  user?: { fullName?: string; username?: string };
  changedAt: string;
  notes?: string;
}

export interface Shipment {
  shipmentId: string;
  shipmentNumber: string;
  currentStage:
  | 'ORDERED'
  | 'SHIPPED'
  | 'AT_DJIBOUTI_PORT'
  | 'ETHIOPIAN_CUSTOMS_CLEARANCE'
  | 'IN_TRANSIT_INLAND'
  | 'RECEIVED';
  billOfLadingNumber?: string;
  expectedArrivalDate?: string;
  actualArrivalDate?: string;
  allocationMethod: 'BY_VALUE' | 'BY_QUANTITY' | 'BY_WEIGHT';
  notes?: string;
  lines: ShipmentLine[];
  costComponents: ShipmentCostComponent[];
  stageHistory: ShipmentStageHistory[];
  createdAt: string;
  updatedAt: string;
}


// ============================================================================
// KMSICAMS-12 Part II: Logistics, Forwarders, Containers & Documents
// ============================================================================
export interface FreightForwarder {
  freightForwarderId: string;
  name: string;
  country: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ShipmentFreightQuotation {
  quotationId: string;
  shipmentId: string;
  freightForwarderId: string;
  forwarder?: FreightForwarder;
  quotationReference?: string;
  quotationDate?: string;
  validUntil?: string;
  freightAmount: number;
  currency: string;
  estimatedTransitDays?: number;
  destinationCharges: number;
  additionalTerms?: string;
  attachmentId?: string;
  selectionStatus: 'PENDING' | 'SELECTED' | 'REJECTED';
  selectionReason?: string;
  selectedBy?: number;
  selector?: { fullName?: string };
  selectedAt?: string;
  createdBy?: number;
  creator?: { fullName?: string };
  createdAt: string;
  updatedAt: string;
}

export interface ShipmentBooking {
  bookingId: string;
  shipmentId: string;
  freightForwarderId?: string;
  forwarder?: FreightForwarder;
  bookingReference: string;
  carrierName?: string;
  vesselName?: string;
  voyageNumber?: string;
  originPort?: string;
  destinationPort?: string;
  estimatedDepartureDate?: string;
  actualDepartureDate?: string;
  estimatedArrivalDate?: string;
  actualArrivalDate?: string;
  bookingStatus: 'REQUESTED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  notes?: string;
  createdBy?: number;
  creator?: { fullName?: string };
  createdAt: string;
  updatedAt: string;
}

export interface ShipmentContainer {
  containerId: string;
  shipmentId: string;
  containerNumber: string;
  containerType: string;
  payloadCapacityKg?: number;
  grossWeightKg?: number;
  sealNumber?: string;
  loadingDate?: string;
  freeTimeDays: number;
  freeTimeEndDate?: string;
  emptyReturnDueDate?: string;
  containerStatus: 'LOADED' | 'IN_TRANSIT' | 'DISCHARGED' | 'AT_PORT' | 'DELIVERED' | 'RETURNED';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShipmentMilestone {
  milestoneId: string;
  shipmentId: string;
  milestoneName: string;
  plannedDate?: string;
  milestoneDate?: string;
  isCompleted: boolean;
  completedAt?: string;
  completedBy?: number;
  completer?: { fullName?: string };
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShipmentInsurance {
  insuranceId: string;
  shipmentId: string;
  policyNumber: string;
  insurerName: string;
  insuredValue: number;
  currency: string;
  premiumAmount?: number;
  coverageType: string;
  issueDate?: string;
  validUntil?: string;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShipmentCargoTracking {
  trackingId: string;
  shipmentId: string;
  documentName: string;
  referenceNumber?: string;
  status: 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'EXPIRED';
  submissionDate?: string;
  deadlineDate?: string;
  shippingCutOffDate?: string;
  verifiedAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShipmentDocument {
  shipmentDocumentId: string;
  shipmentId: string;
  poId?: string;
  purchaseOrder?: { poNumber?: string };
  attachmentId?: string;
  documentType: string;
  documentReference?: string;
  issueDate?: string;
  expiryDate?: string;
  receivedDate?: string;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';
  verifiedBy?: number;
  verifier?: { fullName?: string };
  verifiedAt?: string;
  verificationNotes?: string;
  originalDocumentStatus: 'NOT_RECEIVED' | 'RECEIVED' | 'ENDORSED_TO_BANK' | 'RELEASED_TO_AGENT' | 'SURRENDERED';
  releaseDate?: string;
  createdBy?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ImportNotification {
  notificationId: string;
  eventType: string;
  recipientRole?: string;
  recipientUserId?: number;
  entityType: string;
  entityId: string;
  title: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

export interface ShipmentLogisticsOverview {
  shipment: {
    shipmentId: string;
    shipmentNumber: string;
    currentStage: string;
    expectedArrivalDate?: string;
    billOfLadingNumber?: string;
    selectedForwarder?: FreightForwarder;
  };
  quotations: ShipmentFreightQuotation[];
  selectedQuotation?: ShipmentFreightQuotation;
  activeBooking?: ShipmentBooking;
  containersCount: number;
  containers: ShipmentContainer[];
  milestones: ShipmentMilestone[];
  insurances: ShipmentInsurance[];
  cargoTracking: ShipmentCargoTracking[];
  documentsCount: number;
  documents: ShipmentDocument[];
  alerts: string[];
}

export interface LandedCostReport {
  shipmentId: string;
  shipmentNumber: string;
  allocationMethod: string;
  totalCostEtb: number;
  costComponents: {
    typeCode: string;
    typeName: string;
    currency: string;
    amount: number;
    exchangeRateToEtb: number;
    amountEtb: number;
  }[];
  lines: {
    shipmentLineId: string;
    itemId: string;
    itemName: string;
    quantityShipped: number;
    basisValue: number;
    allocatedCostEtb: number;
    allocatedAdditionalCostEtb?: number;
    unitCostEtb: number;
  }[];
  vehicleUnits: {
    vehicleUnitId: string;
    chassisNumber: string;
    engineNumber: string;
    shipmentLineId: string;
    landedCostEtb: number;
  }[];
}

// KMSICAMS-6 Interfaces
export interface WorkflowType {
  workflowTypeCode: string;
  workflowTypeName: string;
}

export interface ApprovalPolicy {
  workflowTypeCode: string;
  approvalLevel: number;
  requiredRoleId: number;
  workflowType?: WorkflowType;
  requiredRole?: Role;
}

export interface ApprovalAction {
  approvalActionId: string;
  approvalRequestId: string;
  approvalLevel: number;
  decision: 'APPROVED' | 'REJECTED';
  decidedBy?: number;
  decider?: AppUser;
  decidedAt: string;
  comments?: string;
}

export interface ApprovalRequest {
  approvalRequestId: string;
  requestNumber: string;
  workflowTypeCode: string;
  workflowType?: WorkflowType;
  entityType: string;
  entityId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  currentLevel: number;
  requestedBy?: number;
  requester?: AppUser;
  requestedAt: string;
  finalizedAt?: string;
  actions?: ApprovalAction[];
}

export interface SalesInvoice {
  invoiceId: string;
  invoiceNumber: string;
  bookingId: string;
  booking?: Booking;
  customerId: string;
  customer?: Customer;
  itemId: string;
  item?: ProductItem;
  vehicleUnitId?: string;
  vehicleUnit?: VehicleUnit;
  quantity: number;
  unitPrice: number;
  vatRate?: number;
  vatAmount: number;
  exciseTaxRate?: number;
  exciseTaxAmount?: number;
  totalTaxAmount?: number;
  grossTotal: number;
  netPayable?: number;
  depositsApplied: number;
  outstandingBalance: number;
  excessPaymentFlag: boolean;
  taxDetails?: any;
  taxOverrideReason?: string;
  taxOverrideBy?: number;
  whtApplicable?: boolean;
  whtRate?: number;
  whtAmount?: number;
  whtCertificateNumber?: string;
  whtCertificateDate?: string;
  whtStatus?: string;
  whtSettledAt?: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  createdBy?: number;
  creator?: AppUser;
  createdAt: string;
}

export interface PdiChecklistItem {
  pdiChecklistItemId: number;
  itemDescription: string;
}

export interface PdiInspectionResult {
  pdiInspectionResultId: string;
  pdiInspectionId: string;
  pdiChecklistItemId: number;
  checklistItem?: PdiChecklistItem;
  passed: boolean;
  notes?: string;
}

export interface PdiInspection {
  pdiInspectionId: string;
  vehicleUnitId: string;
  vehicleUnit?: VehicleUnit;
  inspectedBy?: number;
  inspector?: AppUser;
  inspectedAt: string;
  results?: PdiInspectionResult[];
}

export interface Delivery {
  deliveryId: string;
  deliveryNumber: string;
  bookingId: string;
  booking?: Booking;
  vehicleUnitId: string;
  vehicleUnit?: VehicleUnit;
  deliveryDate?: string;
  responsibleEmployee?: number;
  responsibleStaff?: AppUser;
  customerAcknowledged: boolean;
  pdiCompleted: boolean;
  financialSettlementValidated: boolean;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  deliveredAt?: string;
  createdBy?: number;
  creator?: AppUser;
  createdAt: string;
}

export interface DocumentTypeRef {
  documentTypeCode: string;
  documentTypeName: string;
  restrictedToEntityType?: string;
}

export interface UnifiedDocumentItem {
  attachmentId: string;
  entityType: string;
  entityId: string;
  fileName: string;
  filePath: string;
  contentType?: string;
  fileSizeBytes?: string;
  uploadedAt: string;
  documentTypeCode?: string;
  documentTypeName?: string;
  uploadedByName?: string;
}


// ============================================================================
// KMSICAMS-14 Interfaces (Client Feedback Backlog)
// ============================================================================
export interface CustomerPaymentTransfer {
  transferId: string;
  fromBookingId: string;
  fromBooking?: Booking;
  toBookingId: string;
  toBooking?: Booking;
  sourceCustomerId: string;
  destinationCustomerId: string;
  amount: number;
  authorizationReason: string;
  transferDate: string;
  status: string;
  approvedBy?: number;
  createdAt: string;
}

export interface ApprovalReminderConfig {
  configId: number;
  requestType: string;
  intervalHours: number;
  escalationLeadHours?: number;
  isActive: boolean;
  notifyRole?: string;
  createdAt: string;
}

export interface ApprovalReminderLog {
  logId: string;
  approvalRequestId?: string;
  requestType: string;
  notificationIntervalHours: number;
  recipientRole?: string;
  recipientEmail?: string;
  notificationChannel: string;
  sentAt: string;
  isEscalation: boolean;
}

export interface CreditSaleItem {
  type: 'VEHICLE' | 'SPARE_PART';
  id: string;
  referenceNumber: string;
  customerName: string;
  customerCode?: string;
  saleDate: string;
  dueDate?: string;
  currency: string;
  totalAmount: number;
  amountPaid: number;
  outstandingBalance: number;
  status: string;
}

export interface CreditSalesReport {
  generatedAt: string;
  totals: {
    totalCreditSales: number;
    totalCollected: number;
    totalOutstanding: number;
    totalOverdue: number;
  };
  records: CreditSaleItem[];
}

export interface StockAgingItem {
  type: 'VEHICLE' | 'SPARE_PART';
  identifier: string;
  name: string;
  warehouseName?: string;
  entryDate: string;
  ageDays: number;
  ageBucket: '0-30' | '31-60' | '61-90' | '91-180' | '>180';
  quantity: number;
  unitCostOrPrice: number;
}

export interface StockAgingReport {
  generatedAt: string;
  bucketSummary: Record<string, { count: number; value: number }>;
  records: StockAgingItem[];
}

// API Methods
export const api = {
  // Lookups
  getRegions: () => apiClient.get<Region[]>('/lookups/regions').then((r) => r.data),
  getColors: () => apiClient.get<VehicleColor[]>('/lookups/colors').then((r) => r.data),
  createColor: (colorName: string, hexCode?: string) =>
    apiClient.post<VehicleColor>('/lookups/colors', { colorName, hexCode }).then((r) => r.data),
  updateColor: (id: number, colorName: string, hexCode?: string) =>
    apiClient.put<VehicleColor>(`/lookups/colors/${id}`, { colorName, hexCode }).then((r) => r.data),
  deleteColor: (id: number) =>
    apiClient.delete<{ success: boolean; message: string }>(`/lookups/colors/${id}`).then((r) => r.data),
  getWarehouses: () => apiClient.get<Warehouse[]>('/lookups/warehouses').then((r) => r.data),
  createWarehouse: (name: string, location?: string) =>
    apiClient.post<Warehouse>('/lookups/warehouses', { name, location }).then((r) => r.data),
  updateWarehouse: (id: number, name: string, location?: string) =>
    apiClient.put<Warehouse>(`/lookups/warehouses/${id}`, { name, location }).then((r) => r.data),
  deleteWarehouse: (id: number) =>
    apiClient.delete<{ success: boolean; message: string }>(`/lookups/warehouses/${id}`).then((r) => r.data),

  // Audit Logs
  getAuditLogs: (params?: { entityType?: string; limit?: number }) =>
    apiClient.get<any[]>('/audit', { params }).then((r) => r.data),


  // Customers
  getCustomers: (params?: any) =>
    apiClient
      .get<{ items: Customer[]; total: number; page: number; limit: number }>('/customers', {
        params,
      })
      .then((r) => r.data),
  getCustomer: (id: string) => apiClient.get<Customer>(`/customers/${id}`).then((r) => r.data),
  createCustomer: (data: any) => apiClient.post<Customer>('/customers', data).then((r) => r.data),
  updateCustomer: (id: string, data: any) =>
    apiClient.put<Customer>(`/customers/${id}`, data).then((r) => r.data),
  toggleCustomerStatus: (id: string, isActive: boolean) =>
    apiClient.put<Customer>(`/customers/${id}/status`, { isActive }).then((r) => r.data),
  uploadCustomerDoc: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient
      .post<Attachment>(`/customers/${id}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },
  deleteCustomerDoc: (customerId: string, docId: string) =>
    apiClient.delete(`/customers/${customerId}/documents/${docId}`).then((r) => r.data),
  addBankAccount: (customerId: string, data: any) =>
    apiClient.post(`/customers/${customerId}/bank-accounts`, data).then((r) => r.data),
  deleteBankAccount: (customerId: string, accountId: string) =>
    apiClient.delete(`/customers/${customerId}/bank-accounts/${accountId}`).then((r) => r.data),

  // Products
  getItems: (params?: any) =>
    apiClient
      .get<{ items: ProductItem[]; total: number; page: number; limit: number }>(
        '/products/items',
        { params },
      )
      .then((r) => r.data),
  getItem: (id: string) => apiClient.get<ProductItem>(`/products/items/${id}`).then((r) => r.data),
  createItem: (data: any) => apiClient.post<ProductItem>('/products/items', data).then((r) => r.data),
  updateItem: (id: string, data: any) =>
    apiClient.put<ProductItem>(`/products/items/${id}`, data).then((r) => r.data),
  getCategories: () => apiClient.get<ProductCategory[]>('/products/categories').then((r) => r.data),
  createCategory: (name: string) =>
    apiClient.post<ProductCategory>('/products/categories', { name }).then((r) => r.data),
  updateCategory: (id: number, name: string) =>
    apiClient.put<ProductCategory>(`/products/categories/${id}`, { name }).then((r) => r.data),
  deleteCategory: (id: number) =>
    apiClient.delete<{ success: boolean; message: string }>(`/products/categories/${id}`).then((r) => r.data),
  getBrands: () => apiClient.get<Brand[]>('/products/brands').then((r) => r.data),
  createBrand: (name: string) =>
    apiClient.post<Brand>('/products/brands', { name }).then((r) => r.data),
  updateBrand: (id: number, name: string) =>
    apiClient.put<Brand>(`/products/brands/${id}`, { name }).then((r) => r.data),
  deleteBrand: (id: number) =>
    apiClient.delete<{ success: boolean; message: string }>(`/products/brands/${id}`).then((r) => r.data),
  getUoms: () => apiClient.get<UnitOfMeasure[]>('/products/uoms').then((r) => r.data),
  getTaxConfigs: () =>
    apiClient.get<TaxConfiguration[]>('/products/tax-configs').then((r) => r.data),
  createTaxConfig: (data: { name: string; ratePct: number; taxType?: string; applicableCustomerType?: string; applicableVehicleType?: string; description?: string } | string, ratePct?: number) => {
    const payload = typeof data === 'string' ? { name: data, ratePct: ratePct || 0 } : data;
    return apiClient.post<TaxConfiguration>('/products/tax-configs', payload).then((r) => r.data);
  },
  updateTaxConfig: (id: number, data: { name?: string; ratePct?: number; taxType?: string; applicableCustomerType?: string; applicableVehicleType?: string; description?: string }) =>
    apiClient.put<TaxConfiguration>(`/products/tax-configs/${id}`, data).then((r) => r.data),
  deleteTaxConfig: (id: number) =>
    apiClient.delete<{ success: boolean; message: string }>(`/products/tax-configs/${id}`).then((r) => r.data),

  // Vehicles
  getVehicles: (params?: any) =>
    apiClient
      .get<{ items: VehicleUnit[]; total: number; page: number; limit: number }>('/vehicles', {
        params,
      })
      .then((r) => r.data),
  createVehicle: (data: any) =>
    apiClient.post<VehicleUnit>('/vehicles', data).then((r) => r.data),
  updateVehicle: (id: string, data: any) =>
    apiClient.put<VehicleUnit>(`/vehicles/${id}`, data).then((r) => r.data),
  updateVehicleStatus: (id: string, status: string, warehouseId?: number) =>
    apiClient.patch<VehicleUnit>(`/vehicles/${id}/status`, { status, warehouseId }).then((r) => r.data),
  bulkImportVehicles: (data: any) =>
    apiClient.post<any>('/vehicles/bulk-import', data).then((r) => r.data),

  // --- KMSICAMS-2 Endpoints ---

  // Customer Ledger (Stories L1-L10)
  getStatement: (customerId: string, params?: any) =>
    apiClient
      .get<StatementOfAccount>(`/ledger/customers/${customerId}/statement`, { params })
      .then((r) => r.data),
  postAdjustment: (customerId: string, data: any) =>
    apiClient.post(`/ledger/customers/${customerId}/adjustment`, data).then((r) => r.data),

  // Sales Enquiries (Stories E1-E18)
  getEnquiries: (params?: any) =>
    apiClient
      .get<{ items: SalesEnquiry[]; total: number; page: number; limit: number }>('/enquiries', {
        params,
      })
      .then((r) => r.data),
  createEnquiry: (data: any) => apiClient.post<SalesEnquiry>('/enquiries', data).then((r) => r.data),
  updateEnquiryStatus: (id: string, status: string, rejectionReason?: string) =>
    apiClient.patch<SalesEnquiry>(`/enquiries/${id}/status`, { status, rejectionReason }).then((r) => r.data),
  getPreAdvanceSlips: (params?: { status?: string; search?: string }) =>
    apiClient.get<PreAdvanceSlip[]>('/enquiries/slips', { params }).then((r) => r.data),
  getPreAdvanceSlipById: (slipId: string) =>
    apiClient.get<PreAdvanceSlip>(`/enquiries/slips/${slipId}`).then((r) => r.data),
  getPreAdvanceSlipByEnquiryId: (enquiryId: string) =>
    apiClient.get<PreAdvanceSlip>(`/enquiries/${enquiryId}/slip`).then((r) => r.data),

  // Bookings (Stories B1-B14)
  getBookings: (params?: any) =>
    apiClient
      .get<{ items: Booking[]; total: number; page: number; limit: number }>('/bookings', {
        params,
      })
      .then((r) => r.data),
  createBooking: (data: any) => apiClient.post<Booking>('/bookings', data).then((r) => r.data),
  convertEnquiryToBooking: (enquiryId: string) =>
    apiClient.post<Booking>(`/bookings/convert-enquiry/${enquiryId}`).then((r) => r.data),
  cancelBooking: (id: string, reason: string, routeTo?: string) =>
    apiClient.patch<Booking>(`/bookings/${id}/cancel`, { reason, routeTo }).then((r) => r.data),
  transferBookingFunds: (data: any) =>
    apiClient.post<any>('/bookings/transfer', data).then((r) => r.data),

  // Payments (BRV - Stories P1-P14)
  getPayments: (params?: any) =>
    apiClient
      .get<{ items: CustomerPayment[]; total: number; page: number; limit: number }>('/payments', {
        params,
      })
      .then((r) => r.data),
  createPayment: (data: any) =>
    apiClient.post<CustomerPayment>('/payments', data).then((r) => r.data),
  confirmPayment: (id: string) =>
    apiClient.patch<CustomerPayment>(`/payments/${id}/confirm`).then((r) => r.data),
  rejectPayment: (id: string, reason: string) =>
    apiClient.patch<CustomerPayment>(`/payments/${id}/reject`, { reason }).then((r) => r.data),
  decideCeoInstallmentApproval: (paymentId: string, data: { approved: boolean; reason?: string }) =>
    apiClient.patch<CustomerPayment>(`/payments/${paymentId}/ceo-approval`, data).then((r) => r.data),

  // Excess & Customer Credit (Stories X1-X10)
  routeExcess: (customerId: string, data: any) =>
    apiClient.post<any>(`/excess/customers/${customerId}/route`, data).then((r) => r.data),
  transferCustomerCredit: (
    customerId: string,
    data: { targetCustomerId: string; amount: number; reason?: string; targetBookingId?: string },
  ) => apiClient.post<any>(`/excess/customers/${customerId}/transfer-credit`, data).then((r) => r.data),
  getExcessReport: () => apiClient.get<any[]>('/excess/reports/excess-payments').then((r) => r.data),
  getCreditReport: () => apiClient.get<any[]>('/excess/reports/credit-balances').then((r) => r.data),

  // Refunds (Stories R1-R12)
  getRefunds: (params?: any) =>
    apiClient
      .get<{ items: CustomerRefund[]; total: number; page: number; limit: number }>('/refunds', {
        params,
      })
      .then((r) => r.data),
  createRefund: (data: any) => apiClient.post<CustomerRefund>('/refunds', data).then((r) => r.data),
  reviewRefund: (id: string) =>
    apiClient.patch<CustomerRefund>(`/refunds/${id}/review`).then((r) => r.data),
  approveRefund: (id: string) =>
    apiClient.patch<CustomerRefund>(`/refunds/${id}/approve`).then((r) => r.data),
  processRefund: (id: string) =>
    apiClient.patch<CustomerRefund>(`/refunds/${id}/process`).then((r) => r.data),
  confirmRefundPayout: (id: string, data?: { paymentReference?: string; notes?: string; actualAmountPaid?: number; paymentMethod?: string }) =>
    apiClient.patch<CustomerRefund>(`/refunds/${id}/confirm-payout`, data).then((r) => r.data),
  rejectRefund: (id: string, reason: string) =>
    apiClient.patch<CustomerRefund>(`/refunds/${id}/reject`, { reason }).then((r) => r.data),

  // --- Suppliers Endpoints ---
  getSuppliers: (search?: string, isActive?: boolean) =>
    apiClient
      .get<Supplier[]>('/suppliers', { params: { search, isActive } })
      .then((r) => r.data),
  getSupplier: (id: number) => apiClient.get<Supplier>(`/suppliers/${id}`).then((r) => r.data),
  createSupplier: (data: any) => apiClient.post<Supplier>('/suppliers', data).then((r) => r.data),
  updateSupplier: (id: number, data: any) =>
    apiClient.put<Supplier>(`/suppliers/${id}`, data).then((r) => r.data),
  deleteSupplier: (id: number) => apiClient.delete(`/suppliers/${id}`).then((r) => r.data),

  // Purchase Orders (Stories PO1-PO9)
  getPurchaseOrders: (params?: any) =>
    apiClient
      .get<{ items: PurchaseOrder[]; total: number; page: number; limit: number }>(
        '/purchase-orders',
        { params },
      )
      .then((r) => r.data),
  getPurchaseOrder: (id: string) =>
    apiClient.get<PurchaseOrder>(`/purchase-orders/${id}`).then((r) => r.data),
  createPurchaseOrder: (data: any) =>
    apiClient.post<PurchaseOrder>('/purchase-orders', data).then((r) => r.data),
  updatePurchaseOrder: (id: string, data: any) =>
    apiClient.put<PurchaseOrder>(`/purchase-orders/${id}`, data).then((r) => r.data),
  updatePurchaseOrderStatus: (id: string, status: string, userId?: number) =>
    apiClient.patch<PurchaseOrder>(`/purchase-orders/${id}/status`, { status, userId }).then((r) => r.data),
  getOpenPOLines: (supplierId?: number) =>
    apiClient
      .get<PurchaseOrderLine[]>('/purchase-orders/open-lines', { params: { supplierId } })
      .then((r) => r.data),
  getPOStatusReport: () =>
    apiClient.get<any>('/purchase-orders/reports/status').then((r) => r.data),

  // KMSICAMS-12 Phase 1: Import Requisition & Planning (IMP-01 to IMP-06)
  getImportRequisitions: (params?: any) =>
    apiClient.get<{ items: ImportRequisition[]; total: number }>('/import-requisitions', { params }).then((r) => r.data),
  getImportRequisition: (id: string) =>
    apiClient.get<ImportRequisition>('/import-requisitions/' + id).then((r) => r.data),
  getStockReview: (itemId: string) =>
    apiClient.get<StockOrderReview>('/import-requisitions/stock-review/' + itemId).then((r) => r.data),
  createImportRequisition: (data: any) =>
    apiClient.post<ImportRequisition>('/import-requisitions', data).then((r) => r.data),
  updateImportRequisition: (id: string, data: any) =>
    apiClient.put<ImportRequisition>('/import-requisitions/' + id, data).then((r) => r.data),
  submitImportRequisition: (id: string, userId?: number) =>
    apiClient.patch<ImportRequisition>('/import-requisitions/' + id + '/submit', { userId }).then((r) => r.data),
  approveImportRequisition: (id: string, approvalNotes?: string, userId?: number) =>
    apiClient.patch<ImportRequisition>('/import-requisitions/' + id + '/approve', { approvalNotes, userId }).then((r) => r.data),
  rejectImportRequisition: (id: string, reason: string, userId?: number) =>
    apiClient.patch<ImportRequisition>('/import-requisitions/' + id + '/reject', { reason, userId }).then((r) => r.data),
  cancelImportRequisition: (id: string, userId?: number) =>
    apiClient.patch<ImportRequisition>('/import-requisitions/' + id + '/cancel', { userId }).then((r) => r.data),
  convertRequisitionToPO: (id: string, data: any, userId?: number) =>
    apiClient.post<PurchaseOrder>('/import-requisitions/' + id + '/convert-to-po', { ...data, userId }).then((r) => r.data),

  // KMSICAMS-12 Phase 2-4: Commercial Terms, Compliance & Payment Schedules (IMP-07 to IMP-22)
  getCompanyProfile: () =>
    apiClient.get<CompanyProfile>('/purchase-orders/company-profile').then((r) => r.data),
  getCompanyBankAccounts: () =>
    apiClient.get<CompanyBankAccount[]>('/purchase-orders/bank-accounts').then((r) => r.data),
  getPOPrintData: (id: string) =>
    apiClient.get<any>('/purchase-orders/' + id + '/print').then((r) => r.data),
  validatePOReadiness: (id: string) =>
    apiClient.get<any>('/purchase-orders/' + id + '/validate-readiness').then((r) => r.data),
  getPOComplianceRecords: (id: string) =>
    apiClient.get<ImportComplianceRecord[]>('/purchase-orders/' + id + '/compliance').then((r) => r.data),
  createPOComplianceRecord: (poId: string, data: any) =>
    apiClient.post<ImportComplianceRecord>('/purchase-orders/' + poId + '/compliance', data).then((r) => r.data),
  updatePOComplianceStatus: (recordId: number | string, status: string, notes?: string) =>
    apiClient.patch<ImportComplianceRecord>('/purchase-orders/compliance/' + recordId + '/status', { status, notes }).then((r) => r.data),
  getPOPaymentSchedules: (poId: string) =>
    apiClient.get<PoPaymentSchedule[]>('/purchase-orders/' + poId + '/payment-schedules').then((r) => r.data),
  createPOPaymentSchedule: (poId: string, data: any) =>
    apiClient.post<PoPaymentSchedule>('/purchase-orders/' + poId + '/payment-schedules', data).then((r) => r.data),
  recordPOPaymentTransaction: (data: any) =>
    apiClient.post<PoPaymentTransaction>('/purchase-orders/payments/transactions', data).then((r) => r.data),
  getPOLettersOfCredit: (poId: string) =>
    apiClient.get<PoLetterOfCredit[]>('/purchase-orders/' + poId + '/letters-of-credit').then((r) => r.data),
  createPOLetterOfCredit: (poId: string, data: any) =>
    apiClient.post<PoLetterOfCredit>('/purchase-orders/' + poId + '/letters-of-credit', data).then((r) => r.data),
  updatePOLetterOfCreditStatus: (lcId: string, status: string, notes?: string) =>
    apiClient.patch<PoLetterOfCredit>('/purchase-orders/letters-of-credit/' + lcId + '/status', { status, notes }).then((r) => r.data),
  getFinancialCommitments: () =>
    apiClient.get<any>('/purchase-orders/financial-commitments').then((r) => r.data),

  // Shipments & Landed Cost (Stories S1-S7, C1-C6, A1-A8, R1-R6, D1-D4, RP1-RP2)
  getShipments: (params?: any) =>
    apiClient
      .get<{ items: Shipment[]; total: number; page: number; limit: number }>('/shipments', {
        params,
      })
      .then((r) => r.data),
  getShipment: (id: string) =>
    apiClient.get<Shipment>(`/shipments/${id}`).then((r) => r.data),
  createShipment: (data: any) =>
    apiClient.post<Shipment>('/shipments', data).then((r) => r.data),
  updateShipmentStage: (id: string, stage: string, notes?: string, userId?: number) =>
    apiClient.patch<Shipment>(`/shipments/${id}/stage`, { stage, notes, userId }).then((r) => r.data),
  addShipmentCost: (shipmentId: string, data: any) =>
    apiClient.post<ShipmentCostComponent>(`/shipments/${shipmentId}/costs`, data).then((r) => r.data),
  removeShipmentCost: (shipmentId: string, costId: string) =>
    apiClient.delete(`/shipments/${shipmentId}/costs/${costId}`).then((r) => r.data),
  allocateLandedCost: (shipmentId: string, allocationMethod?: string, userId?: number) =>
    apiClient
      .post<LandedCostReport>(`/shipments/${shipmentId}/allocate-landed-cost`, {
        allocationMethod,
        userId,
      })
      .then((r) => r.data),
  getLandedCostReport: (shipmentId: string) =>
    apiClient.get<LandedCostReport>(`/shipments/${shipmentId}/landed-cost-report`).then((r) => r.data),
  receiveShipmentLine: (shipmentId: string, data: any) =>
    apiClient.post(`/shipments/${shipmentId}/receive`, data).then((r) => r.data),
  getCostComponentTypes: () =>
    apiClient.get<CostComponentType[]>('/shipments/lookups/cost-component-types').then((r) => r.data),
  createCostComponentType: (typeName: string) =>
    apiClient.post<CostComponentType>('/shipments/lookups/cost-component-types', { typeName }).then((r) => r.data),
  getExchangeRates: () =>
    apiClient.get<ExchangeRateDefault[]>('/shipments/lookups/exchange-rates').then((r) => r.data),
  updateExchangeRate: (currency: string, rateToEtb: number) =>
    apiClient.put(`/shipments/lookups/exchange-rates/${currency}`, { rateToEtb }).then((r) => r.data),
  getShipmentPipelineReport: () =>
    apiClient.get<any>('/shipments/reports/pipeline').then((r) => r.data),
  // KMSICAMS-12 Part II: Freight Forwarders (IMP-23)
  getFreightForwarders: (activeOnly = true) =>
    apiClient.get<FreightForwarder[]>('/shipments/freight-forwarders', { params: { activeOnly } }).then((r) => r.data),
  createFreightForwarder: (data: any) =>
    apiClient.post<FreightForwarder>('/shipments/freight-forwarders', data).then((r) => r.data),
  updateFreightForwarder: (id: string, data: any) =>
    apiClient.put<FreightForwarder>('/shipments/freight-forwarders/' + id, data).then((r) => r.data),
  setShipmentForwarder: (shipmentId: string, forwarderId: string) =>
    apiClient.patch<Shipment>('/shipments/' + shipmentId + '/forwarder/' + forwarderId).then((r) => r.data),

  // Phase 5: Quotations, Bookings, Containers, Milestones, Insurance, Cargo Tracking (IMP-24 - IMP-30)
  getShipmentQuotations: (shipmentId: string) =>
    apiClient.get<ShipmentFreightQuotation[]>('/shipments/' + shipmentId + '/quotations').then((r) => r.data),
  addShipmentQuotation: (shipmentId: string, data: any) =>
    apiClient.post<ShipmentFreightQuotation>('/shipments/' + shipmentId + '/quotations', data).then((r) => r.data),
  selectShipmentQuotation: (shipmentId: string, quotationId: string, data: any) =>
    apiClient.post<ShipmentFreightQuotation>('/shipments/' + shipmentId + '/quotations/' + quotationId + '/select', data).then((r) => r.data),
  getShipmentBookings: (shipmentId: string) =>
    apiClient.get<ShipmentBooking[]>('/shipments/' + shipmentId + '/bookings').then((r) => r.data),
  createShipmentBooking: (shipmentId: string, data: any) =>
    apiClient.post<ShipmentBooking>('/shipments/' + shipmentId + '/bookings', data).then((r) => r.data),
  updateShipmentBooking: (bookingId: string, data: any) =>
    apiClient.put<ShipmentBooking>('/shipments/bookings/' + bookingId, data).then((r) => r.data),
  getShipmentContainers: (shipmentId: string) =>
    apiClient.get<ShipmentContainer[]>('/shipments/' + shipmentId + '/containers').then((r) => r.data),
  addShipmentContainer: (shipmentId: string, data: any) =>
    apiClient.post<ShipmentContainer>('/shipments/' + shipmentId + '/containers', data).then((r) => r.data),
  updateShipmentContainer: (containerId: string, data: any) =>
    apiClient.put<ShipmentContainer>('/shipments/containers/' + containerId, data).then((r) => r.data),
  getShipmentMilestones: (shipmentId: string) =>
    apiClient.get<ShipmentMilestone[]>('/shipments/' + shipmentId + '/milestones').then((r) => r.data),
  addShipmentMilestone: (shipmentId: string, data: any) =>
    apiClient.post<ShipmentMilestone>('/shipments/' + shipmentId + '/milestones', data).then((r) => r.data),
  updateShipmentMilestone: (milestoneId: string, isCompleted: boolean, notes?: string) =>
    apiClient.patch<ShipmentMilestone>('/shipments/milestones/' + milestoneId, { isCompleted, notes }).then((r) => r.data),
  getShipmentInsurances: (shipmentId: string) =>
    apiClient.get<ShipmentInsurance[]>('/shipments/' + shipmentId + '/insurance').then((r) => r.data),
  addShipmentInsurance: (shipmentId: string, data: any) =>
    apiClient.post<ShipmentInsurance>('/shipments/' + shipmentId + '/insurance', data).then((r) => r.data),
  getShipmentCargoTracking: (shipmentId: string) =>
    apiClient.get<ShipmentCargoTracking[]>('/shipments/' + shipmentId + '/cargo-tracking').then((r) => r.data),
  addShipmentCargoTracking: (shipmentId: string, data: any) =>
    apiClient.post<ShipmentCargoTracking>('/shipments/' + shipmentId + '/cargo-tracking', data).then((r) => r.data),
  updateShipmentCargoTracking: (trackingId: string, data: any) =>
    apiClient.put<ShipmentCargoTracking>('/shipments/cargo-tracking/' + trackingId, data).then((r) => r.data),

  // Phase 6: Document Control & Verification (IMP-32 - IMP-37)
  getShipmentDocumentsControl: (shipmentId: string) =>
    apiClient.get<ShipmentDocument[]>('/shipments/' + shipmentId + '/documents-control').then((r) => r.data),
  addShipmentDocumentControl: (shipmentId: string, data: any) =>
    apiClient.post<ShipmentDocument>('/shipments/' + shipmentId + '/documents-control', data).then((r) => r.data),
  verifyShipmentDocument: (docId: string, data: { status: 'VERIFIED' | 'REJECTED'; notes?: string }) =>
    apiClient.patch<ShipmentDocument>('/shipments/documents-control/' + docId + '/verify', data).then((r) => r.data),
  updateOriginalDocumentStatus: (docId: string, data: { status: string; releaseDate?: string }) =>
    apiClient.patch<ShipmentDocument>('/shipments/documents-control/' + docId + '/original-status', data).then((r) => r.data),
  getShipmentLogisticsOverview: (shipmentId: string) =>
    apiClient.get<ShipmentLogisticsOverview>('/shipments/' + shipmentId + '/logistics-overview').then((r) => r.data),

  // Phase 7: Notifications & Alerts (IMP-40, IMP-41)
  getImportNotifications: (unreadOnly?: boolean) =>
    apiClient.get<ImportNotification[]>('/shipments/notifications/alerts', { params: { unreadOnly } }).then((r) => r.data),
  markImportNotificationRead: (id: string) =>
    apiClient.patch<ImportNotification>('/shipments/notifications/' + id + '/read').then((r) => r.data),
  scanImportAlerts: () =>
    apiClient.post<number>('/shipments/notifications/scan-alerts').then((r) => r.data),

  // Phase 8: Reporting & Reconciliation (IMP-45 - IMP-48)
  getShipmentLogisticsReport: () =>
    apiClient.get<any[]>('/shipments/reports/logistics').then((r) => r.data),
  getDocumentCompletenessReport: () =>
    apiClient.get<any>('/shipments/reports/document-completeness').then((r) => r.data),
  getImportReconciliationReport: () =>
    apiClient.get<any[]>('/shipments/reports/reconciliation').then((r) => r.data),
  getImportMonitoringDashboard: () =>
    apiClient.get<any>('/shipments/reports/monitoring-dashboard').then((r) => r.data),

  getShipmentDocs: (shipmentId: string) =>
    apiClient.get<Attachment[]>(`/shipments/${shipmentId}/documents`).then((r) => r.data),
  uploadShipmentDoc: (
    shipmentId: string,
    file: File,
    documentType: string,
    onUploadProgress?: (progressPercent: number) => void,
  ) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);
    return apiClient
      .post<Attachment>(`/shipments/${shipmentId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (!onUploadProgress) return;
          if (!progressEvent.total) {
            onUploadProgress(1);
            return;
          }
          onUploadProgress(Math.min(99, Math.round((progressEvent.loaded * 100) / progressEvent.total)));
        },
      })
      .then((r) => r.data);
  },
  deleteShipmentDoc: (shipmentId: string, docId: string) =>
    apiClient.delete(`/shipments/${shipmentId}/documents/${docId}`).then((r) => r.data),

  // --- KMSICAMS-5 Endpoints (Vehicle Allotment Management) ---
  getEligibleBookings: () => apiClient.get<EligibleBooking[]>('/allotments/eligible-bookings').then((r) => r.data),
  getAvailableAllotmentVehicles: (itemId?: string) =>
    apiClient.get<VehicleUnit[]>('/allotments/available-vehicles', { params: { itemId } }).then((r) => r.data),
  getAllotments: (params?: any) =>
    apiClient
      .get<{ items: Allotment[]; total: number; page: number; limit: number }>('/allotments', { params })
      .then((r) => r.data),
  getAllotment: (id: string) => apiClient.get<Allotment>(`/allotments/${id}`).then((r) => r.data),
  createAllotment: (data: { bookingId: string; vehicleUnitIds: string[]; notes?: string }) =>
    apiClient.post<Allotment>('/allotments', data).then((r) => r.data),
  approveAllotment: (id: string) => apiClient.patch<Allotment>(`/allotments/${id}/approve`).then((r) => r.data),
  rejectAllotment: (id: string, reason: string) =>
    apiClient.patch<Allotment>(`/allotments/${id}/reject`, { reason }).then((r) => r.data),
  reverseAllotment: (id: string) => apiClient.patch<Allotment>(`/allotments/${id}/reverse`).then((r) => r.data),

  // Auth & RBAC
  login: (data: { email?: string; username?: string; password?: string }) =>
    apiClient.post<{ access_token: string; user: AppUser }>('/auth/login', data).then((r) => r.data),
  getRoles: () => apiClient.get<Role[]>('/auth/roles').then((r) => r.data),
  getPermissions: () => apiClient.get<SystemPermission[]>('/auth/permissions').then((r) => r.data),
  getUsers: () => apiClient.get<AppUser[]>('/auth/users').then((r) => r.data),
  getUser: (id: number) => apiClient.get<AppUser>(`/auth/users/${id}`).then((r) => r.data),
  createUser: (data: {
    username: string;
    fullName: string;
    email: string;
    password?: string;
    roleId: number;
    permissions?: string[];
  }) => apiClient.post<AppUser>('/auth/users', data).then((r) => r.data),
  updateUser: (
    id: number,
    data: {
      fullName?: string;
      email?: string;
      roleId?: number;
      isActive?: boolean;
      permissions?: string[];
      password?: string;
    },
  ) => apiClient.put<AppUser>(`/auth/users/${id}`, data).then((r) => r.data),
  toggleUserStatus: (id: number) =>
    apiClient.patch<AppUser>(`/auth/users/${id}/toggle-status`).then((r) => r.data),
  deleteRole: (id: number) =>
    apiClient.delete<{ success: boolean; message: string }>(`/auth/roles/${id}`).then((r) => r.data),
  getSystemModules: () =>
    apiClient.get<SystemModule[]>('/auth/modules').then((r) => r.data),
  getSystemActions: () =>
    apiClient.get<SystemAction[]>('/auth/actions').then((r) => r.data),
  getPermissionMatrix: () =>
    apiClient.get<RolePermissionMatrixResponse>('/auth/permissions/matrix').then((r) => r.data),
  updateRolePermissions: (
    roleId: number,
    permissions: { moduleCode: string; actionCode: string; granted: boolean }[],
  ) =>
    apiClient
      .put<{ success: boolean; message: string; roleId: number }>(`/auth/permissions/matrix/${roleId}`, {
        permissions,
      })
      .then((r) => r.data),
  checkPermission: (data: { userId: number; moduleCode: string; actionCode: string }) =>
    apiClient
      .post<{ userId: number; moduleCode: string; actionCode: string; granted: boolean }>(
        '/auth/permissions/check',
        data,
      )
      .then((r) => r.data),

  // --- KMSICAMS-6 Endpoints ---
  // Approvals
  getPendingApprovals: () => apiClient.get<ApprovalRequest[]>('/approvals/pending').then((r) => r.data),
  getAllApprovalRequests: (params?: any) =>
    apiClient.get<ApprovalRequest[]>('/approvals', { params }).then((r) => r.data),
  getApprovalRequest: (id: string) =>
    apiClient.get<ApprovalRequest>(`/approvals/${id}`).then((r) => r.data),
  submitForApproval: (data: { workflowTypeCode: string; entityType: string; entityId: string | number }) =>
    apiClient.post<{ approvalRequestId: string }>('/approvals/submit', data).then((r) => r.data),
  recordApprovalDecision: (id: string, data: { decision: 'APPROVED' | 'REJECTED'; comments?: string }) =>
    apiClient.post<{ success: boolean; message: string; request: ApprovalRequest }>(`/approvals/${id}/decision`, data).then((r) => r.data),
  getApprovalPolicies: () => apiClient.get<ApprovalPolicy[]>('/approvals/policies').then((r) => r.data),
  getWorkflowTypes: () => apiClient.get<WorkflowType[]>('/approvals/workflow-types').then((r) => r.data),

  // Sales Invoices
  getInvoices: (params?: any) => apiClient.get<SalesInvoice[]>('/invoices', { params }).then((r) => r.data),
  getInvoice: (id: string) => apiClient.get<SalesInvoice>(`/invoices/${id}`).then((r) => r.data),
  previewTaxCalculation: (params: any) => apiClient.get<any>('/invoices/preview-tax-calculation', { params }).then((r) => r.data),
  getCustomerAvailableDeposits: (customerId: string, bookingId?: string) =>
    apiClient.get<any>(`/invoices/customer/${customerId}/available-deposits`, { params: { bookingId } }).then((r) => r.data),
  createInvoice: (data: any) => apiClient.post<SalesInvoice>('/invoices', data).then((r) => r.data),
  approveInvoice: (id: string, comments?: string) =>
    apiClient.patch<SalesInvoice>(`/invoices/${id}/approve`, { comments }).then((r) => r.data),
  rejectInvoice: (id: string, comments?: string) =>
    apiClient.patch<SalesInvoice>(`/invoices/${id}/reject`, { comments }).then((r) => r.data),
  recordWhtSettlement: (id: string, data: { whtAmount: number; certificateNumber?: string; certificateDate?: string; notes?: string }) =>
    apiClient.post<SalesInvoice>(`/invoices/${id}/wht-settlement`, data).then((r) => r.data),
  getWhtCertificates: () => apiClient.get<any[]>('/invoices/wht/certificates').then((r) => r.data),
  updateWhtCertificate: (id: string, data: { certificateNumber?: string; certificateDate?: string; status?: string; notes?: string }) =>
    apiClient.patch<SalesInvoice>(`/invoices/${id}/wht-certificate`, data).then((r) => r.data),

  // Deliveries & PDI
  getDeliveries: () => apiClient.get<Delivery[]>('/deliveries').then((r) => r.data),
  getDelivery: (id: string) => apiClient.get<Delivery>(`/deliveries/${id}`).then((r) => r.data),
  createDelivery: (data: any) => apiClient.post<Delivery>('/deliveries', data).then((r) => r.data),
  authorizeDelivery: (id: string, comments?: string) =>
    apiClient.patch<Delivery>(`/deliveries/${id}/authorize`, { comments }).then((r) => r.data),
  getPdiChecklist: () => apiClient.get<PdiChecklistItem[]>('/deliveries/pdi/checklist').then((r) => r.data),
  recordPdiInspection: (data: any) => apiClient.post<PdiInspection>('/deliveries/pdi/inspection', data).then((r) => r.data),
  getVehiclePdi: (vehicleUnitId: string) =>
    apiClient.get<PdiInspection>(`/deliveries/pdi/vehicle/${vehicleUnitId}`).then((r) => r.data),
  getGatePass: (id: string) => apiClient.get<any>(`/deliveries/${id}/gate-pass`).then((r) => r.data),

  // Documents
  getDocumentTypes: (entityType?: string) =>
    apiClient.get<DocumentTypeRef[]>('/documents/types', { params: { entityType } }).then((r) => r.data),
  getAllDocuments: (params?: any) =>
    apiClient.get<UnifiedDocumentItem[]>('/documents', { params }).then((r) => r.data),

  // --- KMSICAMS-4 Endpoints (Inventory & Warehouse Management) ---
  // Warehouses & Scoped Access
  getInventoryWarehouses: () => apiClient.get<Warehouse[]>('/inventory/warehouses').then((r) => r.data),
  updateInventoryWarehouse: (id: number, data: Partial<Warehouse>) =>
    apiClient.patch<Warehouse>(`/inventory/warehouses/${id}`, data).then((r) => r.data),
  getUserWarehouseAccess: (userId: number) =>
    apiClient.get<number[]>(`/inventory/warehouses/user-access/${userId}`).then((r) => r.data),
  setUserWarehouseAccess: (userId: number, warehouseIds: number[]) =>
    apiClient.post<void>(`/inventory/warehouses/user-access/${userId}`, { warehouseIds }).then((r) => r.data),

  // Vehicle Status State Machine
  getTransitionRules: () =>
    apiClient.get<VehicleStatusTransitionRule[]>('/inventory/transitions/rules').then((r) => r.data),
  transitionVehicleStatus: (id: string, data: { toStatus: string; notes?: string; module?: string }) =>
    apiClient.post<any>(`/inventory/vehicles/${id}/transition`, data).then((r) => r.data),
  getVehicleStatusHistory: (id: string) =>
    apiClient.get<VehicleStatusHistory[]>(`/inventory/vehicles/${id}/history`).then((r) => r.data),

  // Stock Balances & Alerts
  getStockBalances: (params?: { warehouseId?: number; itemId?: string }) =>
    apiClient.get<StockBalance[]>('/inventory/balances', { params }).then((r) => r.data),
  getLowStockAlerts: () =>
    apiClient.get<LowStockAlert[]>('/inventory/balances/low-stock-alerts').then((r) => r.data),

  // Stock Transfers
  createStockTransfer: (data: {
    fromWarehouseId: number;
    toWarehouseId: number;
    lines: Array<{ itemId?: string; quantity?: number; vehicleUnitId?: string }>;
  }) => apiClient.post<StockTransfer>('/inventory/transfers', data).then((r) => r.data),
  getStockTransfers: () => apiClient.get<StockTransfer[]>('/inventory/transfers').then((r) => r.data),
  getStockTransfer: (id: string) => apiClient.get<StockTransfer>(`/inventory/transfers/${id}`).then((r) => r.data),
  approveStockTransfer: (id: string) =>
    apiClient.patch<StockTransfer>(`/inventory/transfers/${id}/approve`).then((r) => r.data),
  completeStockTransfer: (id: string) =>
    apiClient.patch<StockTransfer>(`/inventory/transfers/${id}/complete`).then((r) => r.data),

  // Stock Adjustments
  createStockAdjustment: (data: {
    warehouseId: number;
    itemId?: string;
    quantityDelta?: number;
    vehicleUnitId?: string;
    reason: string;
    reasonNotes: string;
  }) => apiClient.post<StockAdjustment>('/inventory/adjustments', data).then((r) => r.data),
  getStockAdjustments: () => apiClient.get<StockAdjustment[]>('/inventory/adjustments').then((r) => r.data),
  getStockAdjustment: (id: string) => apiClient.get<StockAdjustment>(`/inventory/adjustments/${id}`).then((r) => r.data),
  approveStockAdjustment: (id: string) =>
    apiClient.patch<StockAdjustment>(`/inventory/adjustments/${id}/approve`).then((r) => r.data),
  rejectStockAdjustment: (id: string, reason?: string) =>
    apiClient.patch<StockAdjustment>(`/inventory/adjustments/${id}/reject`, { reason }).then((r) => r.data),
  createStockReceipt: (data: {
    warehouseId: number;
    itemId: string;
    quantity: number;
    sourceType: 'OPENING_BALANCE' | 'LOCAL_PURCHASE' | 'MANUAL_RECEIPT' | 'CORRECTION';
    notes?: string;
  }) => apiClient.post<any>('/inventory/stock-receipts', data).then((r) => r.data),

  // Production Vehicle Intake
  createProductionReceipt: (data: {
    itemId: string;
    chassisNumber: string;
    engineNumber: string;
    warehouseId: number;
    assembledAt?: string;
  }) => apiClient.post<ProductionReceipt>('/inventory/production-receipts', data).then((r) => r.data),
  getProductionReceipts: () => apiClient.get<ProductionReceipt[]>('/inventory/production-receipts').then((r) => r.data),

  // Stock Movements & Reports (KMSICAMS-4)
  getMovementHistory: (params?: {
    warehouseId?: number;
    itemId?: string;
    movementType?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }) =>
    apiClient.get<StockMovementItem[]>('/inventory/movements', { params }).then((r) => r.data),
  getCurrentStockReport: () => apiClient.get<CurrentStockReportItem[]>('/inventory/reports/stock').then((r) => r.data),
  getVehicleInventoryByStatusReport: () =>
    apiClient.get<VehicleStatusReportItem[]>('/inventory/reports/vehicles-by-status').then((r) => r.data),

  // --- KMSICAMS-7 Endpoints (Dashboard & Reporting) ---
  getDashboardSummary: () => apiClient.get<DashboardSummary>('/reports/dashboard/summary').then((r) => r.data),
  getDailySalesReport: (params?: { startDate?: string; endDate?: string }) =>
    apiClient.get<DailySalesItem[]>('/reports/sales/daily', { params }).then((r) => r.data),
  getMonthlySalesReport: () => apiClient.get<MonthlySalesItem[]>('/reports/sales/monthly').then((r) => r.data),
  getSalesByVehicleType: () => apiClient.get<SalesByCategoryItem[]>('/reports/sales/by-vehicle-type').then((r) => r.data),
  getSalesByModel: () => apiClient.get<SalesByModelItem[]>('/reports/sales/by-model').then((r) => r.data),
  getSalesByCustomer: () => apiClient.get<SalesByCustomerItem[]>('/reports/sales/by-customer').then((r) => r.data),
  getSalesByRegion: () => apiClient.get<SalesByRegionItem[]>('/reports/sales/by-region').then((r) => r.data),
  getSalesByCustomerType: () => apiClient.get<SalesByCustomerTypeItem[]>('/reports/sales/by-customer-type').then((r) => r.data),
  getSalesBySalesperson: () => apiClient.get<SalesBySalespersonItem[]>('/reports/sales/by-salesperson').then((r) => r.data),
  getOperationalInvoiceReport: (params?: { status?: string; limit?: number }) =>
    apiClient.get<InvoiceReportItem[]>('/reports/operational/invoices', { params }).then((r) => r.data),
  getOperationalDeliveryReport: (params?: { status?: string; limit?: number }) =>
    apiClient.get<DeliveryReportItem[]>('/reports/operational/deliveries', { params }).then((r) => r.data),
  getOperationalEnquiriesReport: () =>
    apiClient.get<any[]>('/reports/operational/enquiries').then((r) => r.data),
  getOperationalBookingsReport: () =>
    apiClient.get<any[]>('/reports/operational/bookings').then((r) => r.data),
  getCustomerFinancialSummary: () =>
    apiClient.get<CustomerFinancialSummaryItem[]>('/reports/financial/summary').then((r) => r.data),

  // --- KMSICAMS-8 Endpoints (Management Dashboard) ---
  getManagementDashboardSummary: (params?: { startDate?: string; endDate?: string }) =>
    apiClient.get<ManagementDashboardSummary>('/reports/management-dashboard/summary', { params }).then((r) => r.data),
  getSalesPerformanceCrossTab: (params?: { startDate?: string; endDate?: string }) =>
    apiClient.get<SalesCrossTabItem[]>('/reports/management-dashboard/sales-cross-tab', { params }).then((r) => r.data),

  // --- KMSICAMS-10 Endpoints (Spare Parts Enhancement) ---
  getSpareParts: (params?: any) =>
    apiClient.get<{ items: SparePartItem[]; total: number; page: number; limit: number }>('/spare-parts', { params }).then((r) => r.data),
  getSparePartById: (id: string) =>
    apiClient.get<SparePartDetail>(`/spare-parts/${id}`).then((r) => r.data),
  createSparePart: (data: any) =>
    apiClient.post<SparePartItem>('/spare-parts', data).then((r) => r.data),
  updateSparePart: (id: string, data: any) =>
    apiClient.put<SparePartItem>(`/spare-parts/${id}`, data).then((r) => r.data),
  toggleSparePartStatus: (id: string, isActive: boolean) =>
    apiClient.patch(`/spare-parts/${id}/status`, { isActive }).then((r) => r.data),
  addSparePartCompatibility: (id: string, data: any) =>
    apiClient.post(`/spare-parts/${id}/compatibility`, data).then((r) => r.data),
  removeSparePartCompatibility: (compatibilityId: string) =>
    apiClient.delete(`/spare-parts/compatibility/${compatibilityId}`).then((r) => r.data),
  getSparePartsStock: (params?: { warehouseId?: number; lowStockOnly?: boolean }) =>
    apiClient.get<SparePartStockItem[]>('/spare-parts/stock', { params }).then((r) => r.data),
  receiveSparePartStock: (data: { warehouseId: number; itemId: string; quantity: number; sourceType?: string; notes?: string }) =>
    apiClient.post('/spare-parts/stock/receive', data).then((r) => r.data),
  transferSparePartStock: (data: { fromWarehouseId: number; toWarehouseId: number; itemId: string; quantity: number; notes?: string }) =>
    apiClient.post('/spare-parts/stock/transfer', data).then((r) => r.data),
  getSparePartsSales: (params?: any) =>
    apiClient.get<{ items: SparePartsSaleRecord[]; total: number; page: number; limit: number }>('/spare-parts/sales', { params }).then((r) => r.data),
  getSparePartsSaleById: (id: string) =>
    apiClient.get<SparePartsSaleRecord>(`/spare-parts/sales/${id}`).then((r) => r.data),
  createSparePartsSale: (data: any) =>
    apiClient.post<any>('/spare-parts/sales', data).then((r) => r.data),
  cancelSparePartsSale: (id: string, reason: string) =>
    apiClient.post(`/spare-parts/sales/${id}/cancel`, { reason }).then((r) => r.data),
  getSparePartsReportsSummary: () =>
    apiClient.get<SparePartsReportsSummary>('/spare-parts/reports/summary').then((r) => r.data),
  // KMSICAMS-14 Client Feedback Methods
  // Polymorphic Attachments (KMSI-14-01, KMSI-14-02, KMSI-14-03, KMSI-14-04)
  getEntityAttachments: (entityType: string, entityId: string) =>
    apiClient.get<Attachment[]>(`/documents/entity/${entityType}/${entityId}`).then((r) => r.data),
  uploadEntityAttachment: (entityType: string, entityId: string, file: File, documentType?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    if (documentType) formData.append('documentType', documentType);
    return apiClient.post<Attachment>(`/documents/entity/${entityType}/${entityId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data);
  },
  deleteEntityAttachment: (attachmentId: string) =>
    apiClient.delete(`/documents/${attachmentId}`).then((r) => r.data),

  // Two-Stage Sales Enquiry Approvals (KMSI-14-15)
  submitEnquiryForApproval: (id: string) =>
    apiClient.post<SalesEnquiry>(`/enquiries/${id}/submit`).then((r) => r.data),
  salesRepApproveEnquiry: (id: string, data: { decision: 'APPROVE' | 'REJECT'; notes?: string }) =>
    apiClient.post<SalesEnquiry>(`/enquiries/${id}/sales-rep-approval`, data).then((r) => r.data),
  salesManagerApproveEnquiry: (id: string, data: { decision: 'APPROVE' | 'REJECT'; notes?: string }) =>
    apiClient.post<SalesEnquiry>(`/enquiries/${id}/sales-manager-approval`, data).then((r) => r.data),

  // Excess Payment Transfer (KMSI-14-05)
  transferExcessPayment: (data: { fromBookingId: string; toBookingId: string; amount: number; authorizationReason: string }) =>
    apiClient.post<CustomerPaymentTransfer>('/payments/transfer-excess', data).then((r) => r.data),
  getPaymentTransfers: (bookingId: string) =>
    apiClient.get<CustomerPaymentTransfer[]>(`/payments/transfers/${bookingId}`).then((r) => r.data),

  // Customer Custody Vehicles (KMSI-14-06)
  recordVehicleCustody: (vehicleUnitId: string, data: { customerId: string; custodyReason: string; expectedHandoverDate?: string }) =>
    apiClient.post<VehicleUnit>(`/vehicles/units/${vehicleUnitId}/custody`, data).then((r) => r.data),
  releaseVehicleCustody: (vehicleUnitId: string) =>
    apiClient.post<VehicleUnit>(`/vehicles/units/${vehicleUnitId}/handover`).then((r) => r.data),

  // Financial & Inventory Reports (KMSI-14-07, KMSI-14-08)
  getCreditSalesReport: (params?: { startDate?: string; endDate?: string; customerId?: string }) =>
    apiClient.get<CreditSalesReport>('/reports/credit-sales', { params }).then((r) => r.data),
  getStockAgingReport: (params?: { category?: string; warehouseId?: number; agingBucket?: string }) =>
    apiClient.get<StockAgingReport>('/reports/stock-aging', { params }).then((r) => r.data),

  // Automated Approval Reminders (KMSI-14-09)
  scanApprovalReminders: () =>
    apiClient.post<{ scannedAt: string; pendingApprovalsFound: number; remindersCreated: number; details: any[] }>('/approvals/reminders/scan').then((r) => r.data),
  getApprovalReminderConfigs: () =>
    apiClient.get<ApprovalReminderConfig[]>('/approvals/reminders/configs').then((r) => r.data),
  updateApprovalReminderConfig: (id: number, data: { intervalHours?: number; escalationLeadHours?: number; isActive?: boolean }) =>
    apiClient.put<ApprovalReminderConfig>(`/approvals/reminders/configs/${id}`, data).then((r) => r.data),
  getApprovalReminderLogs: (limit?: number) =>
    apiClient.get<ApprovalReminderLog[]>('/approvals/reminders/logs', { params: { limit } }).then((r) => r.data),

};

// ============================================================================
// KMSICAMS-10 Interfaces (Spare Parts)
// ============================================================================
export interface SparePartItem {
  itemId: string;
  itemCode: string;
  itemName: string;
  itemType: string;
  partNumber?: string;
  barcode?: string;
  description?: string;
  compatibleMake?: string;
  compatibleModel?: string;
  categoryId: number;
  category?: ProductCategory;
  brandId?: number;
  brand?: Brand;
  uomId: number;
  uom?: UnitOfMeasure;
  purchasePrice: number;
  sellingPrice: number;
  taxConfigId?: number;
  taxConfig?: TaxConfiguration;
  reorderLevel: number;
  usageType?: 'SALES_ONLY' | 'ASSEMBLY_ONLY' | 'BOTH';
  isActive: boolean;
  stock?: {
    onHand: number;
    reserved: number;
    available: number;
  };
  isLowStock?: boolean;
}

export interface SparePartDetail extends SparePartItem {
  compatibilities: Array<{
    compatibilityId: string;
    sparePartId: string;
    vehicleModel: string;
    vehicleMake?: string;
    yearFrom?: number;
    yearTo?: number;
    notes?: string;
  }>;
  stockBalances: Array<{
    warehouse_id: number;
    warehouse_name: string;
    warehouse_code: string;
    quantity_on_hand: number;
    quantity_reserved: number;
    quantity_available: number;
    updated_at: string;
  }>;
  totalStock: {
    onHand: number;
    reserved: number;
    available: number;
  };
}

export interface SparePartStockItem {
  itemId: string;
  itemCode: string;
  itemName: string;
  partNumber?: string;
  usageType?: 'SALES_ONLY' | 'ASSEMBLY_ONLY' | 'BOTH';
  reorderLevel: number;
  sellingPrice: number;
  purchasePrice: number;
  uomCode?: string;
  categoryName?: string;
  warehouseId: number;
  warehouseName: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  isLowStock: boolean;
}

export interface SparePartsSaleItemRecord {
  saleItemId: string;
  saleId: string;
  itemId: string;
  item?: SparePartItem;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  vatPercent: number;
  lineSubtotal: number;
  lineVat: number;
  lineTotal: number;
}

export interface SparePartsSaleRecord {
  saleId: string;
  saleNumber: string;
  customerId?: string;
  customer?: Customer;
  customerName: string;
  customerPhone?: string;
  customerType: string;
  warehouseId: number;
  warehouse?: Warehouse;
  saleDate: string;
  paymentMethod: string;
  paymentReference?: string;
  subtotal: number;
  discountAmount: number;
  vatAmount: number;
  grandTotal: number;
  status: 'COMPLETED' | 'CANCELLED';
  notes?: string;
  items?: SparePartsSaleItemRecord[];
  creator?: AppUser;
  createdAt: string;
}

export interface SparePartsReportsSummary {
  totalCatalogParts: number;
  stock: {
    onHand: number;
    reserved: number;
    available: number;
    valuationAtCost: number;
    valuationAtRetail: number;
  };
  sales: {
    count: number;
    totalRevenue: number;
    subtotal: number;
    vatCollected: number;
  };
  lowStockAlertCount: number;
  topSellingParts: Array<{
    itemId: string;
    itemCode: string;
    itemName: string;
    unitsSold: number;
    revenue: number;
  }>;
}

// ============================================================================
// KMSICAMS-4 Interfaces
// ============================================================================
export interface VehicleStatusTransitionRule {
  fromStatus: string;
  toStatus: string;
  allowedTriggerModule?: string;
  description?: string;
}

export interface VehicleStatusHistory {
  historyId: string;
  vehicleUnitId: string;
  fromStatus?: string;
  toStatus: string;
  triggerModule?: string;
  triggerUserId?: number;
  triggerUser?: {
    userId: number;
    fullName: string;
    username: string;
  };
  notes?: string;
  changedAt: string;
}

export interface StockBalance {
  balanceId: string;
  warehouseId: number;
  itemId: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAllocated?: number;
  quantityAvailable: number;
  unitCost?: number;
  totalValue?: number;
  lastMovementAt?: string;
  warehouse?: Warehouse;
  item?: {
    itemId: string;
    itemCode: string;
    itemName?: string;
    name: string;
    reorderLevel?: number;
    unitOfMeasure?: string;
  };
}

export interface LowStockAlert {
  item_id: string;
  item_code: string;
  item_name: string;
  reorder_level: number;
  total_available: number;
  shortfall: number;
}

export interface StockTransferLine {
  lineId: string;
  transferId: string;
  itemId?: string;
  quantity?: number;
  vehicleUnitId?: string;
  item?: {
    itemId: string;
    itemCode: string;
    itemName?: string;
    name: string;
  };
  vehicleUnit?: {
    vehicleUnitId: string;
    chassisNumber: string;
    engineNumber: string;
    status: string;
  };
}

export interface StockTransfer {
  transferId: string;
  fromWarehouseId: number;
  toWarehouseId: number;
  status: 'REQUESTED' | 'APPROVED' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';
  requestedBy: number;
  requestedAt: string;
  approvedBy?: number;
  approvedAt?: string;
  completedAt?: string;
  notes?: string;
  fromWarehouse?: Warehouse;
  toWarehouse?: Warehouse;
  requester?: {
    userId: number;
    fullName: string;
    username: string;
  };
  approver?: {
    userId: number;
    fullName: string;
    username: string;
  };
  lines?: StockTransferLine[];
}

export interface StockAdjustment {
  adjustmentId: string;
  warehouseId: number;
  itemId?: string;
  quantityDelta?: number;
  vehicleUnitId?: string;
  reason: 'DAMAGE' | 'LOSS' | 'CYCLE_COUNT' | 'FOUND' | 'STATUS_CORRECTION' | 'SCRAP' | 'OTHER';
  reasonNotes: string;
  status: 'REQUESTED' | 'APPROVED' | 'REJECTED';
  requestedBy: number;
  requestedAt: string;
  approvedBy?: number;
  approvedAt?: string;
  warehouse?: Warehouse;
  item?: {
    itemId: string;
    itemCode: string;
    itemName?: string;
    name: string;
  };
  vehicleUnit?: {
    vehicleUnitId: string;
    chassisNumber: string;
    engineNumber: string;
    status: string;
  };
  requester?: {
    userId: number;
    fullName: string;
  };
  approver?: {
    userId: number;
    fullName: string;
  };
}

export interface ProductionReceipt {
  productionReceiptId: string;
  itemId: string;
  chassisNumber: string;
  engineNumber: string;
  warehouseId: number;
  assembledAt: string;
  receivedBy: number;
  createdAt: string;
  item?: {
    itemId: string;
    itemCode: string;
    name: string;
  };
  warehouse?: Warehouse;
  receiver?: {
    userId: number;
    fullName: string;
  };
}

export interface StockMovementItem {
  movement_id: string;
  movement_at: string;
  movement_type: string;
  warehouse_id: number;
  warehouse_name: string;
  item_id?: string;
  item_code?: string;
  item_name?: string;
  vehicle_unit_id?: string;
  chassis_number?: string;
  quantity: number;
  reference_type: string;
  reference_id: string;
  performed_by_name?: string;
}

export interface CurrentStockReportItem {
  warehouse_id: number;
  warehouse_name: string;
  item_id: string;
  item_code: string;
  item_name: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_available: number;
  reorder_level: number;
}

export interface VehicleStatusReportItem {
  warehouse_id?: number;
  warehouse_name?: string;
  item_name?: string;
  current_status?: string;
  unit_count?: number;
  model_name?: string;
  status?: string;
  vehicle_count?: number;
}

// ============================================================================
// KMSICAMS-7 Interfaces (Dashboard and Reporting)
// ============================================================================
export interface DashboardSummary {
  todays_sales: number;
  todays_invoice_count: number;
  vehicles_available: number;
  vehicles_reserved: number;
  vehicles_allotted: number;
  vehicles_sold: number;
  vehicles_delivered: number;
  pending_approvals: number;
  pending_allotments: number;
  total_invoiced?: number;
  total_collected?: number;
  total_receivables?: number;
  active_confirmed_bookings?: number;
  open_enquiries?: number;
  active_customers?: number;
  active_shipments?: number;
}

export interface DailySalesItem {
  sales_date: string;
  invoice_count: number;
  units_sold: number;
  total_sales: number;
}

export interface MonthlySalesItem {
  sales_month: string;
  invoice_count: number;
  units_sold: number;
  total_sales: number;
}

export interface SalesByCategoryItem {
  category_name: string;
  invoice_count: number;
  units_sold: number;
  total_sales: number;
}

export interface SalesByModelItem {
  model?: string;
  item_name: string;
  invoice_count: number;
  units_sold: number;
  total_sales: number;
}

export interface SalesByCustomerItem {
  customer_id: string;
  customer_code: string;
  full_name: string;
  invoice_count: number;
  total_sales: number;
}

export interface SalesByRegionItem {
  region_name: string;
  invoice_count: number;
  total_sales: number;
}

export interface SalesByCustomerTypeItem {
  customer_type: string;
  invoice_count: number;
  total_sales: number;
}

export interface SalesBySalespersonItem {
  salesperson_id: number;
  salesperson_name: string;
  invoice_count: number;
  total_sales: number;
}

export interface InvoiceReportItem {
  invoice_id: string;
  invoice_number: string;
  status: string;
  created_at: string;
  customer_code: string;
  customer_name: string;
  item_name: string;
  chassis_number?: string;
  quantity: number;
  unit_price: number;
  vat_amount: number;
  gross_total: number;
  outstanding_balance: number;
}

export interface DeliveryReportItem {
  delivery_id: string;
  delivery_number: string;
  status: string;
  delivery_date?: string;
  delivered_at?: string;
  chassis_number: string;
  engine_number: string;
  responsible_employee?: string;
  invoice_number?: string;
  customer_name?: string;
}

export interface CustomerFinancialSummaryItem {
  customer_id: string;
  customer_code: string;
  full_name: string;
  customer_type: string;
  total_debited: number;
  total_credited: number;
  net_receivable: number;
}

// ============================================================================
// KMSICAMS-8 Interfaces (Management Dashboard)
// ============================================================================
export interface ManagementDashboardSummary {
  period_start: string;
  period_end: string;
  total_sales: number;
  invoice_count: number;
  vehicles_available: number;
  vehicles_reserved: number;
  pending_allotment_requests: number;
  vehicles_ready_for_delivery: number;
  total_bookings: number;
  total_customer_deposits: number;
  outstanding_customer_balance: number;
  customer_credit_balance: number;
  excess_payments: number;
  pending_refunds: number;
  processed_refunds: number;
}

export interface SalesCrossTabItem {
  salesperson_id: number;
  salesperson_name: string;
  item_id: string;
  item_name: string;
  model?: string;
  invoice_count: number;
  units_sold: number;
  total_sales: number;
}



