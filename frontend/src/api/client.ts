import axios from 'axios';

export const API_BASE_URL = 'http://localhost:3000/api';

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
    description?: string;
    permissions?: string[];
  };
  permissions: string[];
  isActive: boolean;
  createdAt: string;
}

export interface Role {
  roleId: number;
  roleName: string;
  description?: string;
  permissions?: string[];
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
}

export interface TaxConfiguration {
  taxConfigId: number;
  taxName: string;
  taxRatePct: number | string;
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
  uomId: number;
  uom?: UnitOfMeasure;
  sellingPrice: number | string;
  taxConfigId?: number;
  taxConfig?: TaxConfiguration;
  reorderLevel: number;
  isActive: boolean;
  createdAt: string;
  totalUnits?: number;
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

export interface Booking {
  bookingId: string;
  bookingNumber: string;
  customerId: string;
  customer?: Customer;
  enquiryId?: string;
  enquiry?: SalesEnquiry;
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
  unitPrice: number;
  currency: 'ETB' | 'USD' | 'EUR';
  lineTotal: number;
}

export interface PurchaseOrder {
  poId: string;
  poNumber: string;
  supplierId: number;
  supplier?: Supplier;
  poDate: string;
  currency: 'ETB' | 'USD' | 'EUR';
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
  currency: 'ETB' | 'USD' | 'EUR';
  rateToEtb: number;
  updatedAt: string;
}

export interface ShipmentCostComponent {
  costComponentId: string;
  shipmentId: string;
  costComponentTypeId: number;
  costComponentType?: CostComponentType;
  amount: number;
  currency: 'ETB' | 'USD' | 'EUR';
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

// API Methods
export const api = {
  // Lookups
  getRegions: () => apiClient.get<Region[]>('/lookups/regions').then((r) => r.data),
  getWarehouses: () => apiClient.get<Warehouse[]>('/lookups/warehouses').then((r) => r.data),
  createWarehouse: (name: string, location?: string) =>
    apiClient.post<Warehouse>('/lookups/warehouses', { name, location }).then((r) => r.data),

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
  getBrands: () => apiClient.get<Brand[]>('/products/brands').then((r) => r.data),
  createBrand: (name: string) =>
    apiClient.post<Brand>('/products/brands', { name }).then((r) => r.data),
  getUoms: () => apiClient.get<UnitOfMeasure[]>('/products/uoms').then((r) => r.data),
  getTaxConfigs: () =>
    apiClient.get<TaxConfiguration[]>('/products/tax-configs').then((r) => r.data),
  createTaxConfig: (name: string, ratePct: number) =>
    apiClient.post<TaxConfiguration>('/products/tax-configs', { name, ratePct }).then((r) => r.data),

  // Vehicles
  getVehicles: (params?: any) =>
    apiClient
      .get<{ items: VehicleUnit[]; total: number; page: number; limit: number }>('/vehicles', {
        params,
      })
      .then((r) => r.data),
  createVehicle: (data: any) =>
    apiClient.post<VehicleUnit>('/vehicles', data).then((r) => r.data),
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

  // Sales Enquiries (Stories E1-E15)
  getEnquiries: (params?: any) =>
    apiClient
      .get<{ items: SalesEnquiry[]; total: number; page: number; limit: number }>('/enquiries', {
        params,
      })
      .then((r) => r.data),
  createEnquiry: (data: any) => apiClient.post<SalesEnquiry>('/enquiries', data).then((r) => r.data),
  updateEnquiryStatus: (id: string, status: string, rejectionReason?: string) =>
    apiClient.patch<SalesEnquiry>(`/enquiries/${id}/status`, { status, rejectionReason }).then((r) => r.data),

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

  // Payments (BRV - Stories P1-P13)
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

  // Excess & Customer Credit (Stories X1-X8)
  routeExcess: (customerId: string, data: any) =>
    apiClient.post<any>(`/excess/customers/${customerId}/route`, data).then((r) => r.data),
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
  confirmRefundPayout: (id: string) =>
    apiClient.patch<CustomerRefund>(`/refunds/${id}/confirm-payout`).then((r) => r.data),
  rejectRefund: (id: string, reason: string) =>
    apiClient.patch<CustomerRefund>(`/refunds/${id}/reject`, { reason }).then((r) => r.data),

  // --- KMSICAMS-3 Endpoints ---

  // Suppliers (Story F1)
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
  getExchangeRates: () =>
    apiClient.get<ExchangeRateDefault[]>('/shipments/lookups/exchange-rates').then((r) => r.data),
  updateExchangeRate: (currency: string, rateToEtb: number) =>
    apiClient.put(`/shipments/lookups/exchange-rates/${currency}`, { rateToEtb }).then((r) => r.data),
  getShipmentPipelineReport: () =>
    apiClient.get<any>('/shipments/reports/pipeline').then((r) => r.data),
  uploadShipmentDoc: (shipmentId: string, file: File, documentType: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);
    return apiClient
      .post<Attachment>(`/customers/${shipmentId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

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
};
