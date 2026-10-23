export const TAB_PERMISSIONS: Record<string, string[]> = {
  dashboard: ['REPORTS_VIEW'],
  reports: ['REPORTS_VIEW'],
  invoices: ['PAYMENTS_CONFIRM', 'PAYMENTS_REJECT', 'LEDGER_ADJUST'],
  deliveries: ['VEHICLES_STATUS_UPDATE', 'SHIPMENTS_RECEIVE_STOCK'],
  approvals: ['ENQUIRIES_APPROVE', 'REFUNDS_APPROVE', 'PURCHASE_ORDERS_CONFIRM'],
  documents: ['CUSTOMERS_DOCS_UPLOAD', 'SHIPMENTS_DOCS_UPLOAD'],
  inventory: ['WAREHOUSES_MANAGE', 'STOCK_RECEIPTS_CREATE', 'STOCK_ADJUSTMENTS_CREATE', 'STOCK_TRANSFERS_CREATE'],
  shipments: ['SHIPMENTS_VIEW'],
  'purchase-orders': ['PURCHASE_ORDERS_VIEW'],
  suppliers: ['SUPPLIERS_VIEW'],
  'procurement-reports': ['REPORTS_VIEW', 'SHIPMENTS_VIEW', 'PURCHASE_ORDERS_VIEW'],
  statement: ['LEDGER_VIEW'],
  enquiries: ['ENQUIRIES_VIEW'],
  bookings: ['BOOKINGS_VIEW'],
  allotments: ['BOOKINGS_ALLOCATE'],
  payments: ['PAYMENTS_VIEW'],
  settlement: ['EXCESS_VIEW', 'REFUNDS_VIEW'],
  customers: ['CUSTOMERS_VIEW'],
  products: ['PRODUCTS_VIEW'],
  'spare-parts': ['PRODUCTS_VIEW'],
  vehicles: ['VEHICLES_VIEW'],
  users: ['USERS_VIEW', 'USERS_EDIT', 'ROLES_MANAGE'],
  audit: ['AUDIT_VIEW'],
};

export const DEFAULT_AUTHORIZED_TAB_ORDER = [
  'dashboard',
  'reports',
  'shipments',
  'purchase-orders',
  'suppliers',
  'procurement-reports',
  'inventory',
  'customers',
  'products',
  'spare-parts',
  'vehicles',
  'statement',
  'enquiries',
  'bookings',
  'allotments',
  'payments',
  'settlement',
  'invoices',
  'deliveries',
  'approvals',
  'documents',
  'users',
  'audit',
];

export const canAccessAny = (
  hasPermission: (permissionKey: string) => boolean,
  permissions: string[] = [],
) => permissions.length === 0 || permissions.some((permission) => hasPermission(permission));

export const canAccessTab = (
  tabId: string,
  hasPermission: (permissionKey: string) => boolean,
) => canAccessAny(hasPermission, TAB_PERMISSIONS[tabId] || []);

export const getFirstAuthorizedTab = (
  hasPermission: (permissionKey: string) => boolean,
) => DEFAULT_AUTHORIZED_TAB_ORDER.find((tabId) => canAccessTab(tabId, hasPermission)) || 'dashboard';
