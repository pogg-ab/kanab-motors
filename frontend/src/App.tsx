import React, { useState } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/auth/LoginPage';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { CustomersPage } from './pages/customers/CustomersPage';
import { ProductsPage } from './pages/products/ProductsPage';
import { VehiclesPage } from './pages/vehicles/VehiclesPage';
import { AuditLogsPage } from './pages/audit/AuditLogsPage';
import { StatementOfAccountPage } from './pages/ledger/StatementOfAccountPage';
import { EnquiriesPage } from './pages/enquiries/EnquiriesPage';
import { BookingsPage } from './pages/bookings/BookingsPage';
import { PaymentsPage } from './pages/payments/PaymentsPage';
import { SettlementPage } from './pages/settlement/SettlementPage';
import { AllotmentPage } from './pages/allotment/AllotmentPage';
import { SuppliersPage } from './pages/procurement/SuppliersPage';
import { PurchaseOrdersPage } from './pages/procurement/PurchaseOrdersPage';
import { ShipmentsPage } from './pages/shipments/ShipmentsPage';
import { ShipmentDetailPage } from './pages/shipments/ShipmentDetailPage';
import { ProcurementReportsPage } from './pages/reports/ProcurementReportsPage';
import { UsersPage } from './pages/users/UsersPage';
import { InvoicesPage } from './pages/invoices/InvoicesPage';
import { DeliveriesPage } from './pages/deliveries/DeliveriesPage';
import { ApprovalsPage } from './pages/approvals/ApprovalsPage';
import { DocumentsPage } from './pages/documents/DocumentsPage';

function MainAppContent() {
  const { isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('shipments');
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);

  if (loading) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-primary)',
          color: 'var(--text-primary)',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            border: '3px solid rgba(0, 210, 211, 0.2)',
            borderTopColor: 'var(--accent-cyan)',
            animation: 'spin 0.8s linear infinite',
            marginBottom: '1rem',
          }}
        />
        <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Verifying enterprise session...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setIsMobileNavOpen(false);
    if (tab !== 'shipments') {
      setSelectedShipmentId(null);
    }
  };

  const getModuleTitle = () => {
    switch (activeTab) {
      case 'invoices':
        return 'Operations: Sales Invoices, VAT Calculation & Financial Settlement (KMSICAMS-6)';
      case 'deliveries':
        return 'Operations: Delivery Handover, PDI Station & Official Gate Pass (KMSICAMS-6)';
      case 'approvals':
        return 'Internal Controls: Unified Approval Queue & Policy Engine (KMSICAMS-6)';
      case 'documents':
        return 'Document Management: Unified Document Center & Registry (KMSICAMS-6)';
      case 'shipments':
        return selectedShipmentId
          ? 'Import Management: Shipment Control & Landed Cost Engine'
          : 'Import Management: Multi-Stage Shipment Tracking & Allocation';
      case 'purchase-orders':
        return 'Procurement: Purchase Orders & Line Allocations';
      case 'suppliers':
        return 'Procurement: International Suppliers & Manufacturers';
      case 'procurement-reports':
        return 'Analytics: Import Pipeline Bottlenecks & Executive Reports';
      case 'statement':
        return 'Financial Engine: Customer Ledger & Statement of Account';
      case 'enquiries':
        return 'Sales Pipeline: Enquiries, Quotes & Live 15% VAT Engine';
      case 'bookings':
        return 'Sales Pipeline: Advance Order Bookings & Vehicle Allocations';
      case 'allotments':
        return 'Vehicle Allotment Management: Physical VIN & Chassis Allocation (KMSICAMS-5)';
      case 'payments':
        return 'Financial Engine: Bank Receipt Vouchers (BRV) & Customer Deposits';
      case 'settlement':
        return 'Financial Engine: Excess Routing & Customer Refunds';
      case 'customers':
        return 'Core Masters: Customer & Dealer Directory';
      case 'products':
        return 'Core Masters: Product & Vehicle Master Catalog';
      case 'vehicles':
        return 'Core Masters: Physical Vehicle Units Tracking (Chassis & Engine)';
      case 'users':
        return 'System Governance: Identity & Access Management (RBAC)';
      case 'audit':
        return 'System Intelligence: Audit Trail & Compliance';
      default:
        return 'KANAB Motors SIMS';
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
      {/* Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
      />

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100vh' }}>
        <Navbar
          currentModuleTitle={getModuleTitle()}
          onToggleSidebar={() => setIsMobileNavOpen(!isMobileNavOpen)}
        />

        <main style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-primary)' }}>
          {/* KMSICAMS-6 Pages */}
          {activeTab === 'invoices' && <InvoicesPage />}
          {activeTab === 'deliveries' && <DeliveriesPage />}
          {activeTab === 'approvals' && <ApprovalsPage />}
          {activeTab === 'documents' && <DocumentsPage />}

          {/* KMSICAMS-3 Pages */}
          {activeTab === 'shipments' &&
            (selectedShipmentId ? (
              <ShipmentDetailPage
                shipmentId={selectedShipmentId}
                onBack={() => setSelectedShipmentId(null)}
              />
            ) : (
              <ShipmentsPage onSelectShipment={(id) => setSelectedShipmentId(id)} />
            ))}
          {activeTab === 'purchase-orders' && <PurchaseOrdersPage />}
          {activeTab === 'suppliers' && <SuppliersPage />}
          {activeTab === 'procurement-reports' && <ProcurementReportsPage />}

          {/* KMSICAMS-2 Pages */}
          {activeTab === 'statement' && <StatementOfAccountPage />}
          {activeTab === 'enquiries' && <EnquiriesPage />}
          {activeTab === 'bookings' && <BookingsPage />}
          {activeTab === 'allotments' && <AllotmentPage />}
          {activeTab === 'payments' && <PaymentsPage />}
          {activeTab === 'settlement' && <SettlementPage />}

          {/* KMSICAMS-1 Pages */}
          {activeTab === 'customers' && <CustomersPage />}
          {activeTab === 'products' && <ProductsPage />}
          {activeTab === 'vehicles' && <VehiclesPage />}
          {activeTab === 'users' && <UsersPage />}
          {activeTab === 'audit' && <AuditLogsPage />}
        </main>
      </div>
    </div>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainAppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
