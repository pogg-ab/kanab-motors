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
  lines: PurchaseOrderLine[];
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



