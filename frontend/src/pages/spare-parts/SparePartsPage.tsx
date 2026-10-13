import React, { useState, useEffect, useId } from 'react';
import {
  Package,
  Boxes,
  ShoppingCart,
  BarChart3,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  X,
  ArrowUpRight,
  RefreshCw,
  Printer,
  ChevronRight,
  Eye,
  SlidersHorizontal,
  Tag,
  Warehouse as WarehouseIcon,
  Car,
  Wrench,
  DollarSign,
  Layers,
  Info,
  Trash2,
  Edit2,
  Check,
} from 'lucide-react';
import {
  api,
  SparePartItem,
  SparePartDetail,
  SparePartStockItem,
  SparePartsSaleRecord,
  SparePartsReportsSummary,
  ProductCategory,
  Brand,
  UnitOfMeasure,
  Warehouse,
  Customer,
} from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { ModalErrorAlert } from '../../components/ModalErrorAlert';

export const SparePartsPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'catalog' | 'stock' | 'pos' | 'reports'>('catalog');

  // Master lookups
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [uoms, setUoms] = useState<UnitOfMeasure[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Catalog State
  const [parts, setParts] = useState<SparePartItem[]>([]);
  const [allParts, setAllParts] = useState<SparePartItem[]>([]);
  const [loadingParts, setLoadingParts] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | ''>('');
  const [selectedBrand, setSelectedBrand] = useState<number | ''>('');
  const [filterModel, setFilterModel] = useState('');
  const [filterUsageType, setFilterUsageType] = useState<string>('');
  const [totalPartsCount, setTotalPartsCount] = useState(0);

  // Stock State
  const [stockList, setStockList] = useState<SparePartStockItem[]>([]);
  const [loadingStock, setLoadingStock] = useState(false);
  const [selectedStockWarehouse, setSelectedStockWarehouse] = useState<number | ''>('');
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false);

  // Sales / POS State
  const [salesList, setSalesList] = useState<SparePartsSaleRecord[]>([]);
  const [loadingSales, setLoadingSales] = useState(false);
  const [salesSearch, setSalesSearch] = useState('');

  // Reports State
  const [summaryMetrics, setSummaryMetrics] = useState<SparePartsReportsSummary | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  // Modals
  const [isPartModalOpen, setIsPartModalOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<SparePartDetail | null>(null);
  const [isStockIntakeModalOpen, setIsStockIntakeModalOpen] = useState(false);
  const [isNewSaleModalOpen, setIsNewSaleModalOpen] = useState(false);
  const [viewingSale, setViewingSale] = useState<SparePartsSaleRecord | null>(null);
  const [cancellingSale, setCancellingSale] = useState<SparePartsSaleRecord | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [submittingCancel, setSubmittingCancel] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Feedback Notification
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Load Reference Lookups
  useEffect(() => {
    loadLookups();
  }, []);

  const loadLookups = async () => {
    try {
      const [catsRes, brandsRes, uomsRes, whsRes, custRes] = await Promise.all([
        api.getCategories(),
        api.getBrands(),
        api.getUoms(),
        api.getWarehouses(),
        api.getCustomers(),
      ]);
      setCategories(catsRes);
      setBrands(brandsRes);
      setUoms(uomsRes);
      setWarehouses(whsRes);
      setCustomers((custRes as any)?.items || custRes || []);
    } catch (err: any) {
      console.error('Failed to load lookup masters:', err);
    }
  };

  const loadAllParts = async () => {
    try {
      const res = await api.getSpareParts({ limit: 500, isActive: true });
      setAllParts(res.items);
    } catch (err: any) {
      console.error('Failed to load active spare parts:', err);
    }
  };

  // SubTab specific loaders
  useEffect(() => {
    if (activeSubTab === 'catalog') {
      loadParts();
    } else if (activeSubTab === 'stock') {
      loadStock();
      loadAllParts();
    } else if (activeSubTab === 'pos') {
      loadSales();
      loadAllParts();
    } else if (activeSubTab === 'reports') {
      loadReports();
    }
  }, [activeSubTab, searchQuery, selectedCategory, selectedBrand, filterModel, filterUsageType, selectedStockWarehouse, filterLowStockOnly]);

  // Load summary metrics & full active parts list on mount
  useEffect(() => {
    loadReports();
    loadAllParts();
  }, []);

  const loadParts = async () => {
    setLoadingParts(true);
    try {
      const res = await api.getSpareParts({
        search: searchQuery || undefined,
        categoryId: selectedCategory || undefined,
        brandId: selectedBrand || undefined,
        model: filterModel || undefined,
        usageType: filterUsageType || undefined,
        limit: 50,
      });
      setParts(res.items);
      setTotalPartsCount(res.total);
    } catch (err: any) {
      showNotification(err?.response?.data?.message || 'Failed to load spare parts catalog', 'error');
    } finally {
      setLoadingParts(false);
    }
  };

  const loadStock = async () => {
    setLoadingStock(true);
    try {
      const data = await api.getSparePartsStock({
        warehouseId: selectedStockWarehouse ? Number(selectedStockWarehouse) : undefined,
        lowStockOnly: filterLowStockOnly || undefined,
      });
      setStockList(data);
    } catch (err: any) {
      showNotification(err?.response?.data?.message || 'Failed to load stock balances', 'error');
    } finally {
      setLoadingStock(false);
    }
  };

  const loadSales = async () => {
    setLoadingSales(true);
    try {
      const res = await api.getSparePartsSales({
        search: salesSearch || undefined,
        limit: 50,
      });
      setSalesList(res.items);
    } catch (err: any) {
      showNotification(err?.response?.data?.message || 'Failed to load POS sales records', 'error');
    } finally {
      setLoadingSales(false);
    }
  };

  const loadReports = async () => {
    setLoadingMetrics(true);
    try {
      const data = await api.getSparePartsReportsSummary();
      setSummaryMetrics(data);
    } catch (err: any) {
      showNotification(err?.response?.data?.message || 'Failed to load reports summary', 'error');
    } finally {
      setLoadingMetrics(false);
    }
  };

  const handleToggleStatus = async (item: SparePartItem) => {
    try {
      await api.toggleSparePartStatus(item.itemId, !item.isActive);
      showNotification(`Spare part ${item.itemCode} status updated to ${!item.isActive ? 'Active' : 'Inactive'}`);
      loadParts();
    } catch (err: any) {
      showNotification(err?.response?.data?.message || 'Status toggle failed', 'error');
    }
  };

  const handleConfirmCancelSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingSale) return;
    if (!cancelReason.trim()) {
      setCancelError('Please provide a formal cancellation reason.');
      return;
    }

    setSubmittingCancel(true);
    setCancelError(null);
    try {
      await api.cancelSparePartsSale(cancellingSale.saleId, cancelReason.trim());
      showNotification(`Sale #${cancellingSale.saleNumber} has been cancelled and warehouse stock has been safely restored!`);
      setCancellingSale(null);
      setCancelReason('');
      loadSales();
      loadStock();
      loadReports();
    } catch (err: any) {
      setCancelError(err?.response?.data?.message || 'Failed to cancel sale');
    } finally {
      setSubmittingCancel(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Toast Notification */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 9999,
            backgroundColor: notification.type === 'success' ? '#10b981' : '#f43f5e',
            color: '#ffffff',
            padding: '0.85rem 1.4rem',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-modal)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontWeight: 600,
            fontSize: '0.9rem',
          }}
        >
          {notification.type === 'success' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
          {notification.message}
        </div>
      )}

      {/* Breadcrumbs & Top Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-cyan)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>★ Inventory & Parts</span>
          <span style={{ color: 'var(--text-muted)' }}>/</span>
          <span>Spare Parts & POS</span>
          <span style={{ color: 'var(--text-muted)' }}>/</span>
          <span style={{ color: 'var(--text-primary)' }}>Catalog & Sales Hub</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '0.4rem' }}>
              <div style={{ padding: '0.6rem', background: 'rgba(6, 182, 212, 0.12)', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: 'var(--radius-md)', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Wrench size={24} />
              </div>
              <div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
                  Spare Parts Sales & Inventory Hub
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.2rem' }}>
                  <span className="mono-code" style={{ fontSize: '0.65rem', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-indigo)', borderColor: 'rgba(99, 102, 241, 0.3)' }}>
                    Parts & POS
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Quantity-based parts catalog, multi-model vehicle compatibility, POS walk-in sales & inventory ledger
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {hasPermission('STOCK_RECEIPTS_CREATE') && (
              <button
                className="btn btn-secondary"
                onClick={() => {
                  loadAllParts();
                  setIsStockIntakeModalOpen(true);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Boxes size={16} color="var(--accent-cyan)" /> Stock Intake
              </button>
            )}

            {hasPermission('PAYMENTS_RECORD') && (
              <button
                className="btn btn-emerald"
                onClick={() => {
                  loadAllParts();
                  setIsNewSaleModalOpen(true);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <ShoppingCart size={16} /> New POS Sale
              </button>
            )}

            {hasPermission('PRODUCTS_CREATE') && (
              <button
                className="btn btn-cyan"
                onClick={() => {
                  setEditingPart(null);
                  setIsPartModalOpen(true);
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Plus size={17} /> New Spare Part
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2rem',
      }}>
        <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--accent-indigo)' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Active Catalog SKUs</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-indigo)' }}>
              <Package size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace', letterSpacing: '-0.02em' }}>
            {summaryMetrics?.totalCatalogParts || totalPartsCount || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Registered active spare parts
          </div>
        </div>

        <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--accent-emerald)' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Available Stock</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-emerald)' }}>
              <Boxes size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--accent-emerald)', fontFamily: 'monospace', letterSpacing: '-0.02em' }}>
            {summaryMetrics?.stock.available ?? 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Across all warehouses ({summaryMetrics?.stock.onHand ?? 0} on hand)
          </div>
        </div>

        <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--accent-cyan)' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Stock Valuation (Retail)</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(6, 182, 212, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-cyan)' }}>
              <DollarSign size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace', letterSpacing: '-0.02em' }}>
            ETB {(summaryMetrics?.stock.valuationAtRetail || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Cost Value: ETB {(summaryMetrics?.stock.valuationAtCost || 0).toLocaleString()}
          </div>
        </div>

        <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--accent-indigo)' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Sales Revenue</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-indigo)' }}>
              <ShoppingCart size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--accent-indigo)', fontFamily: 'monospace', letterSpacing: '-0.02em' }}>
            ETB {(summaryMetrics?.sales.totalRevenue || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            {summaryMetrics?.sales.count || 0} completed orders (VAT: ETB {(summaryMetrics?.sales.vatCollected || 0).toLocaleString()})
          </div>
        </div>

        <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: (summaryMetrics?.lowStockAlertCount || 0) > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Low Stock Alerts</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: (summaryMetrics?.lowStockAlertCount || 0) > 0 ? 'rgba(244, 63, 94, 0.12)' : 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: (summaryMetrics?.lowStockAlertCount || 0) > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>
              <AlertTriangle size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: (summaryMetrics?.lowStockAlertCount || 0) > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)', fontFamily: 'monospace', letterSpacing: '-0.02em' }}>
            {summaryMetrics?.lowStockAlertCount || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Items at or below reorder level
          </div>
        </div>
      </div>

      {/* Sub Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '0.75rem',
          marginBottom: '1.5rem',
          overflowX: 'auto',
        }}
      >
        <button
          onClick={() => setActiveSubTab('catalog')}
          className={`filter-pill ${activeSubTab === 'catalog' ? 'active' : ''}`}
        >
          <Package size={15} />
          <span>Parts Catalog ({totalPartsCount})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('stock')}
          className={`filter-pill ${activeSubTab === 'stock' ? 'active' : ''}`}
        >
          <Boxes size={15} />
          <span>Stock & Warehouses</span>
        </button>

        <button
          onClick={() => setActiveSubTab('pos')}
          className={`filter-pill ${activeSubTab === 'pos' ? 'active' : ''}`}
        >
          <ShoppingCart size={15} />
          <span>POS & Sales History ({salesList.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('reports')}
          className={`filter-pill ${activeSubTab === 'reports' ? 'active' : ''}`}
        >
          <BarChart3 size={15} />
          <span>Reports & Valuation</span>
        </button>
      </div>

      {/* =====================================================================
          TAB 1: SPARE PARTS CATALOG (SP-02 & SP-03)
      ===================================================================== */}
      {activeSubTab === 'catalog' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Filter Bar */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <select
                  className="input"
                  style={{ width: '190px', height: '38px', fontSize: '0.85rem' }}
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.categoryId} value={c.categoryId}>
                      {c.categoryName}
                    </option>
                  ))}
                </select>

                <select
                  className="input"
                  style={{ width: '170px', height: '38px', fontSize: '0.85rem' }}
                  value={selectedBrand}
                  onChange={(e) => setSelectedBrand(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">All Brands</option>
                  {brands.map((b) => (
                    <option key={b.brandId} value={b.brandId}>
                      {b.brandName}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  placeholder="Fitment (e.g. Boxer 150)"
                  className="input"
                  style={{ width: '190px', height: '38px', fontSize: '0.85rem' }}
                  value={filterModel}
                  onChange={(e) => setFilterModel(e.target.value)}
                />

                <select
                  className="input"
                  style={{ width: '185px', height: '38px', fontSize: '0.85rem' }}
                  value={filterUsageType}
                  onChange={(e) => setFilterUsageType(e.target.value)}
                >
                  <option value="">All Usage Types</option>
                  <option value="SALES_ONLY">🛒 Sales Only</option>
                  <option value="ASSEMBLY_ONLY">🏭 Assembly Only</option>
                  <option value="BOTH">🔄 Sales & Assembly</option>
                </select>

                {(selectedCategory || selectedBrand || filterModel || filterUsageType || searchQuery) && (
                  <button
                    onClick={() => {
                      setSelectedCategory('');
                      setSelectedBrand('');
                      setFilterModel('');
                      setFilterUsageType('');
                      setSearchQuery('');
                    }}
                    className="btn btn-secondary btn-sm"
                    style={{ height: '38px' }}
                  >
                    Reset Filters
                  </button>
                )}
              </div>

              <div style={{ position: 'relative', width: '320px' }}>
                <Search
                  size={16}
                  color="var(--text-muted)"
                  style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  type="text"
                  className="input"
                  style={{ paddingLeft: '2.4rem', height: '38px', fontSize: '0.85rem', width: '100%' }}
                  placeholder="Search SKU, name, part #, barcode..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Catalog Table */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '0.9rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Item / SKU Code</th>
                    <th style={{ padding: '0.9rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Spare Part Name & Part #</th>
                    <th style={{ padding: '0.9rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category / Brand</th>
                    <th style={{ padding: '0.9rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vehicle Fitment</th>
                    <th style={{ padding: '0.9rem 1.25rem', textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Retail Price</th>
                    <th style={{ padding: '0.9rem 1.25rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Available Stock</th>
                    <th style={{ padding: '0.9rem 1.25rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                    <th style={{ padding: '0.9rem 1.25rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingParts ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        Loading spare parts catalog...
                      </td>
                    </tr>
                  ) : parts.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        No spare parts found matching the criteria. Click "+ New Spare Part" to add items.
                      </td>
                    </tr>
                  ) : (
                    parts.map((p) => (
                      <tr key={p.itemId} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <span className="mono-code" style={{ color: 'var(--accent-amber)', borderColor: 'rgba(245, 158, 11, 0.3)', background: 'rgba(245, 158, 11, 0.08)' }}>
                            {p.itemCode}
                          </span>
                          {p.barcode && (
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem', fontFamily: 'monospace' }}>
                              BAR: {p.barcode}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.itemName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                            Part #: <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{p.partNumber || 'N/A'}</span> · UoM: {p.uom?.uomName || 'PCS'}
                          </div>
                        </td>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            <span className="badge badge-indigo">
                              {p.category?.categoryName || 'SPARE_PARTS'}
                            </span>
                            {p.brand && (
                              <span className="badge badge-cyan">
                                {p.brand.brandName}
                              </span>
                            )}
                            {p.usageType === 'SALES_ONLY' && (
                              <span className="badge badge-emerald" style={{ fontSize: '0.66rem' }} title="Designated for Retail / POS Sales Only">
                                🛒 Sales Only
                              </span>
                            )}
                            {p.usageType === 'ASSEMBLY_ONLY' && (
                              <span className="badge badge-amber" style={{ fontSize: '0.66rem' }} title="Reserved for Factory Vehicle Assembly Only">
                                🏭 Assembly Only
                              </span>
                            )}
                            {(p.usageType === 'BOTH' || !p.usageType) && (
                              <span className="badge badge-subtle" style={{ fontSize: '0.66rem' }} title="Usable for Both Sales and Assembly">
                                🔄 Sales & Assembly
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-primary)', fontSize: '0.85rem' }}>
                            <Car size={13} style={{ color: 'var(--accent-cyan)' }} />
                            <span>{p.compatibleMake || 'Any'} {p.compatibleModel ? `(${p.compatibleModel})` : ''}</span>
                          </div>
                        </td>
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                            ETB {Number(p.sellingPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </div>
                          {p.purchasePrice !== undefined && Number(p.purchasePrice) > 0 && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              Cost: ETB {Number(p.purchasePrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center' }}>
                            <span className="mono-code" style={{ fontWeight: 800, color: p.isLowStock ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>
                              {p.stock?.available ?? 0}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{p.uom?.uomName || 'PCS'}</span>
                          </div>
                          {p.isLowStock && (
                            <span className="badge badge-rose" style={{ marginTop: '0.25rem', fontSize: '0.65rem' }}>
                              <AlertTriangle size={10} /> Low Stock (≤{p.reorderLevel})
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                          {p.isActive ? (
                            <span className="badge badge-emerald">
                              <CheckCircle2 size={12} /> Active
                            </span>
                          ) : (
                            <span className="badge badge-rose">
                              <XCircle size={12} /> Inactive
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                            {hasPermission('PRODUCTS_EDIT') && (
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={async () => {
                                  try {
                                    const detail = await api.getSparePartById(p.itemId);
                                    setEditingPart(detail);
                                    setIsPartModalOpen(true);
                                  } catch (err) {
                                    showNotification('Failed to load spare part details', 'error');
                                  }
                                }}
                                title="Edit Spare Part"
                              >
                                <Edit2 size={12} /> Edit
                              </button>
                            )}

                            {hasPermission('PRODUCTS_EDIT') && (
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleToggleStatus(p)}
                                title={p.isActive ? 'Deactivate part' : 'Activate part'}
                                style={{
                                  color: p.isActive ? 'var(--accent-rose)' : 'var(--accent-emerald)',
                                }}
                              >
                                {p.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: STOCK BALANCES BY WAREHOUSE (SP-04)
      ===================================================================== */}
      {activeSubTab === 'stock' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Stock Toolbar */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <select
                  className="input"
                  style={{ width: '220px', height: '38px', fontSize: '0.85rem' }}
                  value={selectedStockWarehouse}
                  onChange={(e) => setSelectedStockWarehouse(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">All Warehouses</option>
                  {warehouses.map((w) => (
                    <option key={w.warehouseId} value={w.warehouseId}>
                      {w.warehouseName}
                    </option>
                  ))}
                </select>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={filterLowStockOnly}
                    onChange={(e) => setFilterLowStockOnly(e.target.checked)}
                  />
                  <span>Show Low Stock Alerts Only</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  onClick={loadStock}
                  className="btn btn-secondary btn-sm"
                  style={{ height: '38px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <RefreshCw size={14} className={loadingStock ? 'spin' : ''} /> Refresh
                </button>

                {hasPermission('STOCK_RECEIPTS_CREATE') && (
                  <button
                    onClick={() => setIsStockIntakeModalOpen(true)}
                    className="btn btn-cyan btn-sm"
                    style={{ height: '38px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <Plus size={15} /> Receive Stock
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Stock Table */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '0.9rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Warehouse Facility</th>
                    <th style={{ padding: '0.9rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Item SKU</th>
                    <th style={{ padding: '0.9rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Spare Part Description</th>
                    <th style={{ padding: '0.9rem 1.25rem', textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>On-Hand Qty</th>
                    <th style={{ padding: '0.9rem 1.25rem', textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reserved Qty</th>
                    <th style={{ padding: '0.9rem 1.25rem', textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Available Qty</th>
                    <th style={{ padding: '0.9rem 1.25rem', textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reorder Alert</th>
                    <th style={{ padding: '0.9rem 1.25rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stock Status</th>
                    <th style={{ padding: '0.9rem 1.25rem', textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Valuation (Retail)</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingStock ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        Loading warehouse stock balances...
                      </td>
                    </tr>
                  ) : stockList.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        No stock records found for the selected filter.
                      </td>
                    </tr>
                  ) : (
                    stockList.map((row, idx) => (
                      <tr key={`${row.warehouseId}-${row.itemId}-${idx}`} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <td style={{ padding: '1rem 1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                            <WarehouseIcon size={15} style={{ color: 'var(--accent-cyan)' }} />
                            <span>{row.warehouseName}</span>
                          </div>
                        </td>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <span className="mono-code" style={{ color: 'var(--accent-cyan)' }}>
                            {row.itemCode}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 1.25rem', color: 'var(--text-primary)' }}>
                          <div>{row.itemName}</div>
                          {row.partNumber && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                              Part #: {row.partNumber}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'right', fontWeight: 600 }}>
                          {row.quantityOnHand} {row.uomCode || 'PCS'}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'right', color: 'var(--text-secondary)' }}>
                          {row.quantityReserved}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'right', fontWeight: 800, color: row.isLowStock ? 'var(--accent-rose)' : 'var(--accent-emerald)', fontFamily: 'monospace' }}>
                          {row.quantityAvailable}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'right', color: 'var(--text-secondary)' }}>
                          {row.reorderLevel}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                          {row.isLowStock ? (
                            <span className="badge badge-rose">
                              <AlertTriangle size={11} /> Low Stock
                            </span>
                          ) : (
                            <span className="badge badge-emerald">
                              <CheckCircle2 size={11} /> Optimal
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>
                          ETB {(row.quantityOnHand * row.sellingPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3: POS & SALES TRANSACTIONS (SP-05 & SP-06)
      ===================================================================== */}
      {activeSubTab === 'pos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Sales Toolbar */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ position: 'relative', width: '360px' }}>
                <Search
                  size={16}
                  color="var(--text-muted)"
                  style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  type="text"
                  placeholder="Search sale #, customer name, receipt ref..."
                  value={salesSearch}
                  onChange={(e) => setSalesSearch(e.target.value)}
                  className="input"
                  style={{ paddingLeft: '2.4rem', height: '38px', fontSize: '0.85rem', width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  onClick={loadSales}
                  className="btn btn-secondary btn-sm"
                  style={{ height: '38px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <RefreshCw size={14} className={loadingSales ? 'spin' : ''} /> Refresh Sales
                </button>

                {hasPermission('PAYMENTS_RECORD') && (
                  <button
                    onClick={() => setIsNewSaleModalOpen(true)}
                    className="btn btn-emerald btn-sm"
                    style={{ height: '38px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <ShoppingCart size={15} /> New POS Sale
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Sales Table */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '0.9rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sale # / Invoice</th>
                    <th style={{ padding: '0.9rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sale Date</th>
                    <th style={{ padding: '0.9rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Customer Info</th>
                    <th style={{ padding: '0.9rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Warehouse</th>
                    <th style={{ padding: '0.9rem 1.25rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Items Sold</th>
                    <th style={{ padding: '0.9rem 1.25rem', textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Grand Total (inc. VAT)</th>
                    <th style={{ padding: '0.9rem 1.25rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                    <th style={{ padding: '0.9rem 1.25rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingSales ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        Loading sales history...
                      </td>
                    </tr>
                  ) : salesList.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        No sales orders registered yet. Click "New POS Sale" to process customer purchases.
                      </td>
                    </tr>
                  ) : (
                    salesList.map((sale) => (
                      <tr key={sale.saleId} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <span className="mono-code" style={{ color: 'var(--accent-cyan)' }}>
                            {sale.saleNumber}
                          </span>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                            Pay: {sale.paymentMethod} {sale.paymentReference ? `(${sale.paymentReference})` : ''}
                          </div>
                        </td>
                        <td style={{ padding: '1rem 1.25rem', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                          {new Date(sale.saleDate).toLocaleDateString()} {new Date(sale.saleDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{sale.customerName}</div>
                          {sale.customerPhone && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{sale.customerPhone}</div>
                          )}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', color: 'var(--text-secondary)' }}>
                          {sale.warehouse?.warehouseName || `Warehouse #${sale.warehouseId}`}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                          <span className="badge badge-indigo">
                            {sale.items?.length || 0} line(s)
                          </span>
                        </td>
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                          <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                            ETB {Number(sale.grandTotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            VAT: ETB {Number(sale.vatAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </div>
                        </td>
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                          {sale.status === 'COMPLETED' ? (
                            <span className="badge badge-emerald">
                              <CheckCircle2 size={12} /> Completed
                            </span>
                          ) : (
                            <span className="badge badge-rose">
                              <XCircle size={12} /> Cancelled
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => setViewingSale(sale)}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                            >
                              <Eye size={12} /> View Slip
                            </button>

                            {sale.status === 'COMPLETED' && hasPermission('BOOKINGS_CANCEL') && (
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => {
                                  setCancellingSale(sale);
                                  setCancelReason('');
                                  setCancelError(null);
                                }}
                                style={{ color: 'var(--accent-rose)' }}
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 4: REPORTS & ANALYTICS (SP-07)
      ===================================================================== */}
      {activeSubTab === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Top-Selling Spare Parts Card */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                  Top-Selling Spare Parts & Consumables
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
                  Ranked by unit velocity and revenue contribution
                </p>
              </div>
              <button
                onClick={loadReports}
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <RefreshCw size={13} className={loadingMetrics ? 'spin' : ''} /> Refresh Metrics
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Rank</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>SKU Code</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Spare Part Name</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Units Sold</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Gross Revenue (ETB)</th>
                  </tr>
                </thead>
                <tbody>
                  {!summaryMetrics?.topSellingParts || summaryMetrics.topSellingParts.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                        No completed sales transactions yet.
                      </td>
                    </tr>
                  ) : (
                    summaryMetrics.topSellingParts.map((t, idx) => (
                      <tr key={t.itemId} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span className="badge badge-cyan" style={{ width: '26px', height: '26px', borderRadius: '50%', justifyContent: 'center' }}>
                            #{idx + 1}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span className="mono-code" style={{ color: 'var(--accent-amber)' }}>
                            {t.itemCode}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {t.itemName}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, color: 'var(--accent-emerald)', fontFamily: 'monospace' }}>
                          {t.unitsSold} units
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 800, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                          ETB {t.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 1: REGISTER / EDIT SPARE PART (SP-02 & SP-03)
      ===================================================================== */}
      {isPartModalOpen && (
        <SparePartFormModal
          isOpen={isPartModalOpen}
          editingPart={editingPart}
          categories={categories}
          brands={brands}
          uoms={uoms}
          onClose={() => setIsPartModalOpen(false)}
          onSuccess={() => {
            setIsPartModalOpen(false);
            showNotification(editingPart ? 'Spare part updated successfully!' : 'New spare part registered successfully!');
            loadParts();
            loadAllParts();
            loadReports();
          }}
        />
      )}

      {/* =====================================================================
          MODAL 2: STOCK INTAKE / OPENING BALANCE (SP-04)
      ===================================================================== */}
      {isStockIntakeModalOpen && (
        <StockIntakeModal
          isOpen={isStockIntakeModalOpen}
          parts={allParts.length > 0 ? allParts : parts}
          warehouses={warehouses}
          onClose={() => setIsStockIntakeModalOpen(false)}
          onSuccess={() => {
            setIsStockIntakeModalOpen(false);
            showNotification('Stock received into warehouse balance successfully!');
            loadStock();
            loadParts();
            loadAllParts();
            loadReports();
          }}
        />
      )}

      {/* =====================================================================
          MODAL 3: NEW POS SALE (SP-05 & SP-06)
      ===================================================================== */}
      {isNewSaleModalOpen && (
        <NewSaleModal
          isOpen={isNewSaleModalOpen}
          parts={allParts.length > 0 ? allParts : parts}
          warehouses={warehouses}
          customers={customers}
          onClose={() => setIsNewSaleModalOpen(false)}
          onSuccess={(newSale) => {
            setIsNewSaleModalOpen(false);
            showNotification(`Sale #${newSale.saleNumber} posted and stock deducted successfully!`);
            setViewingSale(newSale);
            loadSales();
            loadParts();
            loadStock();
            loadReports();
          }}
        />
      )}

      {/* =====================================================================
          MODAL 4: VIEW PRINTABLE SALE SLIP / INVOICE
      ===================================================================== */}
      {viewingSale && (
        <SaleReceiptModal sale={viewingSale} onClose={() => setViewingSale(null)} />
      )}

      {/* =====================================================================
          MODAL 5: CANCEL SALE CONFIRMATION MODAL
      ===================================================================== */}
      {cancellingSale && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'rgba(239, 68, 68, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent-rose)',
                  }}
                >
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-rose)', margin: 0 }}>
                    Cancel Spare Parts Sale
                  </h2>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Void transaction #{cancellingSale.saleNumber} & restore inventory
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCancellingSale(null)}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.65rem', borderRadius: '8px' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleConfirmCancelSale}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                <ModalErrorAlert error={cancelError} onDismiss={() => setCancelError(null)} />

                {/* Sale Overview Summary Box */}
                <div
                  style={{
                    background: 'var(--bg-table-header)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.85rem 1rem',
                    fontSize: '0.85rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Sale / Invoice:</span>
                    <strong className="mono-code" style={{ color: 'var(--accent-cyan)' }}>
                      #{cancellingSale.saleNumber}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Customer:</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {cancellingSale.customerName}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Warehouse:</span>
                    <span style={{ color: 'var(--text-primary)' }}>
                      {cancellingSale.warehouse?.warehouseName || `Warehouse #${cancellingSale.warehouseId}`}
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      borderTop: '1px dashed var(--border-color)',
                      paddingTop: '0.35rem',
                      marginTop: '0.35rem',
                    }}
                  >
                    <span style={{ color: 'var(--text-muted)' }}>Grand Total:</span>
                    <strong style={{ color: 'var(--accent-emerald)', fontFamily: 'monospace' }}>
                      ETB {Number(cancellingSale.grandTotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                </div>

                {/* Notice warning */}
                <div
                  style={{
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.82rem',
                    color: 'var(--accent-rose)',
                    lineHeight: 1.4,
                  }}
                >
                  <strong>Notice:</strong> Cancelling this sale voids the transaction and automatically restores the deducted spare parts quantities back into the warehouse stock balance.
                </div>

                <div>
                  <label
                    className="form-label"
                    style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.35rem', display: 'block' }}
                  >
                    Cancellation Reason <span style={{ color: 'var(--accent-rose)' }}>*</span>
                  </label>
                  <textarea
                    className="input"
                    rows={3}
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Provide a formal cancellation reason (e.g., Customer return, billing error, wrong item)..."
                    required
                    style={{ width: '100%', resize: 'vertical' }}
                    autoFocus
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setCancellingSale(null)}
                  className="btn btn-secondary"
                  disabled={submittingCancel}
                >
                  Keep Sale
                </button>
                <button
                  type="submit"
                  disabled={submittingCancel || !cancelReason.trim()}
                  className="btn"
                  style={{
                    background: 'var(--accent-rose)',
                    color: '#ffffff',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  {submittingCancel ? 'Reversing Sale...' : 'Confirm Reversal & Restore Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// COMPONENT: SPARE PART FORM MODAL (CREATE / EDIT)
// ============================================================================
interface SparePartFormModalProps {
  isOpen: boolean;
  editingPart: SparePartDetail | null;
  categories: ProductCategory[];
  brands: Brand[];
  uoms: UnitOfMeasure[];
  onClose: () => void;
  onSuccess: () => void;
}

const SparePartFormModal: React.FC<SparePartFormModalProps> = ({
  editingPart,
  categories,
  brands,
  uoms,
  onClose,
  onSuccess,
}) => {
  const [itemCode, setItemCode] = useState(editingPart?.itemCode || '');
  const [itemName, setItemName] = useState(editingPart?.itemName || '');
  const [categoryId, setCategoryId] = useState<number>(editingPart?.categoryId || categories[0]?.categoryId || 1);
  const [brandId, setBrandId] = useState<number | undefined>(editingPart?.brandId);
  const [partNumber, setPartNumber] = useState(editingPart?.partNumber || '');
  const [barcode, setBarcode] = useState(editingPart?.barcode || '');
  const [description, setDescription] = useState(editingPart?.description || '');
  const [compatibleMake, setCompatibleMake] = useState(editingPart?.compatibleMake || 'Bajaj');
  const [compatibleModel, setCompatibleModel] = useState(editingPart?.compatibleModel || '');
  const [uomId, setUomId] = useState<number>(editingPart?.uomId || uoms[0]?.uomId || 1);
  const [purchasePrice, setPurchasePrice] = useState<number>(editingPart?.purchasePrice || 0);
  const [sellingPrice, setSellingPrice] = useState<number>(editingPart?.sellingPrice || 0);
  const [reorderLevel, setReorderLevel] = useState<number>(editingPart?.reorderLevel || 10);
  const [usageType, setUsageType] = useState<'SALES_ONLY' | 'ASSEMBLY_ONLY' | 'BOTH'>(
    (editingPart?.usageType as any) || 'BOTH',
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!itemCode.trim() || !itemName.trim() || !sellingPrice) {
      setError('SKU, Item Name, and Selling Price are required.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        itemCode: itemCode.trim(),
        itemName: itemName.trim(),
        categoryId: Number(categoryId),
        brandId: brandId ? Number(brandId) : undefined,
        partNumber: partNumber.trim() || undefined,
        barcode: barcode.trim() || undefined,
        description: description.trim() || undefined,
        compatibleMake: compatibleMake.trim() || undefined,
        compatibleModel: compatibleModel.trim() || undefined,
        uomId: Number(uomId),
        purchasePrice: Number(purchasePrice) || 0,
        sellingPrice: Number(sellingPrice),
        reorderLevel: Number(reorderLevel) || 0,
        usageType,
      };

      if (editingPart) {
        await api.updateSparePart(editingPart.itemId, payload);
      } else {
        await api.createSparePart(payload);
      }
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Operation failed. Please verify unique SKU.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: '680px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(6, 182, 212, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-cyan)',
              }}
            >
              <Wrench size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                {editingPart ? `Edit Spare Part: ${editingPart.itemCode}` : 'Register New Spare Part'}
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
                Catalog SKU specifications, vehicle fitment compatibility & retail pricing
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '0.35rem 0.65rem', borderRadius: '8px' }}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div className="modal-body" style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
            <ModalErrorAlert error={error} onDismiss={() => setError(null)} />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Part SKU / Code *</label>
                <input
                  type="text"
                  required
                  value={itemCode}
                  onChange={(e) => setItemCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SP-BP-BOXER150"
                  className="input-field"
                  disabled={!!editingPart}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Manufacturer Part #</label>
                <input
                  type="text"
                  value={partNumber}
                  onChange={(e) => setPartNumber(e.target.value)}
                  placeholder="e.g. 36-DK00-12"
                  className="input-field"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Spare Part Name *</label>
              <input
                type="text"
                required
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="e.g. Ceramic Front Brake Pad Set"
                className="input-field"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Category *</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(Number(e.target.value))}
                  className="select-field"
                >
                  {categories.map((c) => (
                    <option key={c.categoryId} value={c.categoryId}>
                      {c.categoryName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Brand</label>
                <select
                  value={brandId || ''}
                  onChange={(e) => setBrandId(e.target.value ? Number(e.target.value) : undefined)}
                  className="select-field"
                >
                  <option value="">(None)</option>
                  {brands.map((b) => (
                    <option key={b.brandId} value={b.brandId}>
                      {b.brandName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Unit of Measure *</label>
                <select
                  value={uomId}
                  onChange={(e) => setUomId(Number(e.target.value))}
                  className="select-field"
                >
                  {uoms.map((u) => (
                    <option key={u.uomId} value={u.uomId}>
                      {u.uomName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Compatible Make</label>
                <input
                  type="text"
                  value={compatibleMake}
                  onChange={(e) => setCompatibleMake(e.target.value)}
                  placeholder="e.g. Bajaj / TVS / Universal"
                  className="input-field"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Compatible Vehicle Model</label>
                <input
                  type="text"
                  value={compatibleModel}
                  onChange={(e) => setCompatibleModel(e.target.value)}
                  placeholder="e.g. Boxer 150, Maxima Z"
                  className="input-field"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Purchase Price (ETB)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(Number(e.target.value))}
                  className="input-field"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Selling Price (ETB) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(Number(e.target.value))}
                  className="input-field"
                  style={{ fontWeight: 700 }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Reorder Alert Level</label>
                <input
                  type="number"
                  min="0"
                  value={reorderLevel}
                  onChange={(e) => setReorderLevel(Number(e.target.value))}
                  className="input-field"
                />
              </div>
            </div>

            {/* Usage Type Designation */}
            <div className="form-group" style={{ background: 'var(--bg-table-header)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <label className="form-label" style={{ fontWeight: 700, marginBottom: '0.45rem', display: 'block' }}>
                Part Usage Designation *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: usageType === 'SALES_ONLY' ? '2px solid var(--accent-emerald)' : '1px solid var(--border-color)',
                    background: usageType === 'SALES_ONLY' ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    fontWeight: usageType === 'SALES_ONLY' ? 700 : 500,
                  }}
                >
                  <input
                    type="radio"
                    name="partUsageType"
                    value="SALES_ONLY"
                    checked={usageType === 'SALES_ONLY'}
                    onChange={() => setUsageType('SALES_ONLY')}
                  />
                  <span>🛒 Sales Only</span>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: usageType === 'ASSEMBLY_ONLY' ? '2px solid var(--accent-amber)' : '1px solid var(--border-color)',
                    background: usageType === 'ASSEMBLY_ONLY' ? 'rgba(245, 158, 11, 0.12)' : 'transparent',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    fontWeight: usageType === 'ASSEMBLY_ONLY' ? 700 : 500,
                  }}
                >
                  <input
                    type="radio"
                    name="partUsageType"
                    value="ASSEMBLY_ONLY"
                    checked={usageType === 'ASSEMBLY_ONLY'}
                    onChange={() => setUsageType('ASSEMBLY_ONLY')}
                  />
                  <span>🏭 Assembly Only</span>
                </label>

                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: usageType === 'BOTH' ? '2px solid var(--accent-cyan)' : '1px solid var(--border-color)',
                    background: usageType === 'BOTH' ? 'rgba(6, 182, 212, 0.12)' : 'transparent',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    fontWeight: usageType === 'BOTH' ? 700 : 500,
                  }}
                >
                  <input
                    type="radio"
                    name="partUsageType"
                    value="BOTH"
                    checked={usageType === 'BOTH'}
                    onChange={() => setUsageType('BOTH')}
                  />
                  <span>🔄 Both (Sales & Assembly)</span>
                </label>
              </div>
              <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '0.45rem' }}>
                {usageType === 'SALES_ONLY' && '• Available for retail, workshop and counter POS sales only.'}
                {usageType === 'ASSEMBLY_ONLY' && '• Reserved exclusively for vehicle manufacturing/assembly lines. Blocked from retail POS sales.'}
                {usageType === 'BOTH' && '• Dual-purpose part eligible for both plant assembly allocations and counter POS sales.'}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Barcode / Scanner ID</label>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="e.g. 890123450001"
                className="input-field"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Technical Description / Specs</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Additional fitment notes or material specs..."
                className="textarea-field"
              />
            </div>
          </div>

          <div className="modal-footer" style={{ flexShrink: 0 }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-cyan"
            >
              {submitting ? 'Saving...' : editingPart ? 'Update Spare Part' : 'Register Spare Part'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// COMPONENT: STOCK INTAKE / OPENING BALANCE MODAL (SP-04)
// ============================================================================
interface StockIntakeModalProps {
  isOpen: boolean;
  parts: SparePartItem[];
  warehouses: Warehouse[];
  onClose: () => void;
  onSuccess: () => void;
}

const StockIntakeModal: React.FC<StockIntakeModalProps> = ({
  parts,
  warehouses,
  onClose,
  onSuccess,
}) => {
  const [warehouseId, setWarehouseId] = useState<number>(warehouses[0]?.warehouseId || 1);
  const [activeParts, setActiveParts] = useState<SparePartItem[]>(parts);
  const [itemId, setItemId] = useState<string>(parts[0]?.itemId || '');
  const [quantity, setQuantity] = useState<number>(10);
  const [sourceType, setSourceType] = useState('OPENING_BALANCE');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (parts && parts.length > 0) {
      setActiveParts(parts);
      if (!itemId) {
        setItemId(parts[0].itemId);
      }
    } else {
      api.getSpareParts({ limit: 500, isActive: true })
        .then((res) => {
          setActiveParts(res.items);
          if (res.items.length > 0 && !itemId) {
            setItemId(res.items[0].itemId);
          }
        })
        .catch(console.error);
    }
  }, [parts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemId || quantity <= 0) {
      setError('Please select a spare part and specify quantity > 0.');
      return;
    }

    setSubmitting(true);
    try {
      await api.receiveSparePartStock({
        warehouseId: Number(warehouseId),
        itemId,
        quantity: Number(quantity),
        sourceType,
        notes: notes || undefined,
      });
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to record stock intake.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: '540px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(6, 182, 212, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-cyan)',
              }}
            >
              <Boxes size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                Spare Parts Stock Intake
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
                Receive opening balance, local shipment or replenishment into warehouse
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '0.35rem 0.65rem', borderRadius: '8px' }}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div className="modal-body" style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
            <ModalErrorAlert error={error} onDismiss={() => setError(null)} />

            <div className="form-group">
              <label className="form-label">Target Warehouse *</label>
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(Number(e.target.value))}
                className="select-field"
              >
                {warehouses.map((w) => (
                  <option key={w.warehouseId} value={w.warehouseId}>
                    {w.warehouseName}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Select Spare Part *</label>
              <select
                value={itemId}
                onChange={(e) => setItemId(e.target.value)}
                className="select-field"
                required
              >
                {activeParts.length === 0 ? (
                  <option value="">No registered spare parts found</option>
                ) : (
                  activeParts.map((p) => (
                    <option key={p.itemId} value={p.itemId}>
                      {p.itemCode} — {p.itemName} (Available: {p.stock?.available || 0})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Intake Quantity *</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="input-field"
                  style={{ fontWeight: 700 }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Intake Source *</label>
                <select
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value)}
                  className="select-field"
                >
                  <option value="OPENING_BALANCE">Opening Stock Balance</option>
                  <option value="LOCAL_PURCHASE">Local Supplier Purchase</option>
                  <option value="IMPORT_CONTAINER">Import Shipment Batch</option>
                  <option value="MANUAL_RECEIPT">Manual Stock Correction</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Reference / Delivery Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. GRN-00124 or initial inventory count"
                className="input-field"
              />
            </div>
          </div>

          <div className="modal-footer" style={{ flexShrink: 0 }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-cyan"
            >
              {submitting ? 'Recording...' : 'Post Stock Intake'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// COMPONENT: NEW POS SALE MODAL (SP-05 & SP-06)
// ============================================================================
interface NewSaleModalProps {
  isOpen: boolean;
  parts: SparePartItem[];
  warehouses: Warehouse[];
  customers: Customer[];
  onClose: () => void;
  onSuccess: (sale: SparePartsSaleRecord) => void;
}

interface SaleLineForm {
  itemId: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
}

const NewSaleModal: React.FC<NewSaleModalProps> = ({
  parts,
  warehouses,
  customers,
  onClose,
  onSuccess,
}) => {
  const [warehouseId, setWarehouseId] = useState<number>(warehouses[0]?.warehouseId || 1);
  const [isRegisteredCustomer, setIsRegisteredCustomer] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState('Walk-in POS Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paymentReference, setPaymentReference] = useState('');
  const [activeParts, setActiveParts] = useState<SparePartItem[]>(parts);
  const [lines, setLines] = useState<SaleLineForm[]>([
    {
      itemId: parts[0]?.itemId || '',
      quantity: 1,
      unitPrice: Number(parts[0]?.sellingPrice || 0),
      discountPercent: 0,
    },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter only spare parts eligible for sales (SALES_ONLY or BOTH)
  const sellableParts = activeParts.filter((p) => p.usageType !== 'ASSEMBLY_ONLY');

  useEffect(() => {
    if (parts && parts.length > 0) {
      setActiveParts(parts);
      const eligible = parts.filter((p) => p.usageType !== 'ASSEMBLY_ONLY');
      setLines((prev) => {
        if (prev.length === 1 && !prev[0].itemId && eligible.length > 0) {
          return [
            {
              itemId: eligible[0].itemId,
              quantity: 1,
              unitPrice: Number(eligible[0].sellingPrice || 0),
              discountPercent: 0,
            },
          ];
        }
        return prev;
      });
    } else {
      api.getSpareParts({ limit: 500, isActive: true })
        .then((res) => {
          setActiveParts(res.items);
          const eligible = res.items.filter((p) => p.usageType !== 'ASSEMBLY_ONLY');
          if (eligible.length > 0) {
            setLines((prev) => {
              if (prev.length === 1 && !prev[0].itemId) {
                return [
                  {
                    itemId: eligible[0].itemId,
                    quantity: 1,
                    unitPrice: Number(eligible[0].sellingPrice || 0),
                    discountPercent: 0,
                  },
                ];
              }
              return prev;
            });
          }
        })
        .catch(console.error);
    }
  }, [parts]);

  const handleCustomerSelect = (id: string) => {
    setSelectedCustomerId(id);
    const found = customers.find((c) => String(c.customerId) === id);
    if (found) {
      setCustomerName(found.fullName);
      setCustomerPhone(found.mobileNumber || '');
    }
  };

  const addLine = () => {
    const firstPart = sellableParts[0] || activeParts[0];
    setLines([
      ...lines,
      {
        itemId: firstPart?.itemId || '',
        quantity: 1,
        unitPrice: Number(firstPart?.sellingPrice || 0),
        discountPercent: 0,
      },
    ]);
  };

  const removeLine = (idx: number) => {
    if (lines.length <= 1) return;
    setLines(lines.filter((_, i) => i !== idx));
  };

  const updateLine = (idx: number, field: keyof SaleLineForm, val: any) => {
    const copy = [...lines];
    copy[idx] = { ...copy[idx], [field]: val };

    if (field === 'itemId') {
      const selected = activeParts.find((p) => p.itemId === val);
      if (selected) {
        copy[idx].unitPrice = Number(selected.sellingPrice);
      }
    }
    setLines(copy);
  };

  // Live Calculations
  const calculatedSubtotal = lines.reduce((acc, l) => acc + l.quantity * l.unitPrice, 0);
  const calculatedDiscount = lines.reduce(
    (acc, l) => acc + l.quantity * l.unitPrice * ((l.discountPercent || 0) / 100),
    0,
  );
  const taxable = calculatedSubtotal - calculatedDiscount;
  const calculatedVat = taxable * 0.15;
  const calculatedGrandTotal = taxable + calculatedVat;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || lines.length === 0) {
      setError('Please provide customer name and at least one item line.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.createSparePartsSale({
        warehouseId: Number(warehouseId),
        customerId: isRegisteredCustomer && selectedCustomerId ? selectedCustomerId : undefined,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        paymentMethod,
        paymentReference: paymentReference.trim() || undefined,
        items: lines.map((l) => ({
          itemId: l.itemId,
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice),
          discountPercent: Number(l.discountPercent || 0),
          vatPercent: 15,
        })),
      });

      onSuccess(res);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Sale execution failed. Verify stock availability.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: '850px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(16, 185, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-emerald)',
              }}
            >
              <ShoppingCart size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                New Spare Parts POS Sale & Invoice
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
                Walk-in or registered customer purchase with line discounts, 15% VAT & instant stock deduction
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '0.35rem 0.65rem', borderRadius: '8px' }}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div className="modal-body" style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
            <ModalErrorAlert error={error} onDismiss={() => setError(null)} />

            {/* Warehouse and Customer Configuration */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Fulfilling Warehouse *</label>
                <select
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(Number(e.target.value))}
                  className="select-field"
                >
                  {warehouses.map((w) => (
                    <option key={w.warehouseId} value={w.warehouseId}>
                      {w.warehouseName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                  <label className="form-label" style={{ margin: 0 }}>Customer Profile</label>
                  <label style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <input
                      type="checkbox"
                      checked={isRegisteredCustomer}
                      onChange={(e) => {
                        setIsRegisteredCustomer(e.target.checked);
                        if (!e.target.checked) {
                          setSelectedCustomerId('');
                          setCustomerName('Walk-in POS Customer');
                        }
                      }}
                    />
                    <span>Registered Customer</span>
                  </label>
                </div>

                {isRegisteredCustomer ? (
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => handleCustomerSelect(e.target.value)}
                    className="select-field"
                  >
                    <option value="">Select Customer...</option>
                    {customers.map((c) => (
                      <option key={c.customerId} value={c.customerId}>
                        {c.fullName} ({c.customerCode})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Customer Full Name"
                    className="input-field"
                  />
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Customer Mobile</label>
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+251 9..."
                  className="input-field"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Payment Method *</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="select-field"
                >
                  <option value="CASH">Cash at Counter</option>
                  <option value="BANK_TRANSFER">Bank Receipt Voucher (BRV)</option>
                  <option value="CHEQUE">Corporate Cheque</option>
                  <option value="CUSTOMER_CREDIT">Customer Account Credit</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Payment Ref / Slip #</label>
                <input
                  type="text"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="e.g. BRV-9082 or Cash Slip"
                  className="input-field"
                />
              </div>
            </div>

            {/* Line Items Table */}
            <div style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                <span className="form-label" style={{ fontWeight: 700, margin: 0 }}>
                  Spare Parts Order Lines
                </span>
                <button
                  type="button"
                  onClick={addLine}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Plus size={14} color="var(--accent-cyan)" /> Add Line
                </button>
              </div>

              <div className="card" style={{ overflow: 'hidden' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ padding: '0.75rem 0.9rem', textAlign: 'left' }}>Spare Part</th>
                      <th style={{ padding: '0.75rem 0.9rem', width: '90px', textAlign: 'center' }}>Qty</th>
                      <th style={{ padding: '0.75rem 0.9rem', width: '130px', textAlign: 'right' }}>Unit Price (ETB)</th>
                      <th style={{ padding: '0.75rem 0.9rem', width: '90px', textAlign: 'center' }}>Disc %</th>
                      <th style={{ padding: '0.75rem 0.9rem', width: '140px', textAlign: 'right' }}>Total (inc. VAT)</th>
                      <th style={{ padding: '0.75rem 0.9rem', width: '50px', textAlign: 'center' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, idx) => {
                      const lineSub = line.quantity * line.unitPrice * (1 - (line.discountPercent || 0) / 100);
                      const lineTot = lineSub * 1.15;
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '0.6rem 0.9rem' }}>
                            <select
                              value={line.itemId}
                              onChange={(e) => updateLine(idx, 'itemId', e.target.value)}
                              className="select-field"
                              style={{ padding: '0.45rem', fontSize: '0.82rem' }}
                            >
                              {sellableParts.length === 0 ? (
                                <option value="">No sales-eligible spare parts found</option>
                              ) : (
                                sellableParts.map((p) => (
                                  <option key={p.itemId} value={p.itemId}>
                                    {p.itemCode} — {p.itemName} (ETB {Number(p.sellingPrice).toLocaleString()})
                                  </option>
                                ))
                              )}
                            </select>
                          </td>

                          <td style={{ padding: '0.6rem 0.9rem' }}>
                            <input
                              type="number"
                              min="1"
                              value={line.quantity}
                              onChange={(e) => updateLine(idx, 'quantity', Number(e.target.value))}
                              className="input-field"
                              style={{ padding: '0.45rem', textAlign: 'center', fontSize: '0.82rem' }}
                            />
                          </td>

                          <td style={{ padding: '0.6rem 0.9rem' }}>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={line.unitPrice}
                              onChange={(e) => updateLine(idx, 'unitPrice', Number(e.target.value))}
                              className="input-field"
                              style={{ padding: '0.45rem', textAlign: 'right', fontSize: '0.82rem' }}
                            />
                          </td>

                          <td style={{ padding: '0.6rem 0.9rem' }}>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={line.discountPercent}
                              onChange={(e) => updateLine(idx, 'discountPercent', Number(e.target.value))}
                              className="input-field"
                              style={{ padding: '0.45rem', textAlign: 'center', fontSize: '0.82rem' }}
                            />
                          </td>

                          <td style={{ padding: '0.6rem 0.9rem', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>
                            ETB {lineTot.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>

                          <td style={{ padding: '0.6rem 0.9rem', textAlign: 'center' }}>
                            {lines.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeLine(idx)}
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '0.3rem 0.5rem', color: 'var(--accent-rose)' }}
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Summary */}
            <div
              className="card"
              style={{
                padding: '1.15rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.45rem',
                marginLeft: 'auto',
                width: '100%',
                maxWidth: '380px',
                fontSize: '0.85rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Gross Subtotal:</span>
                <span style={{ fontFamily: 'monospace' }}>ETB {calculatedSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>

              {calculatedDiscount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent-emerald)' }}>
                  <span>Line Discounts:</span>
                  <span style={{ fontFamily: 'monospace' }}>- ETB {calculatedDiscount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                <span>Standard VAT (15%):</span>
                <span style={{ fontFamily: 'monospace' }}>ETB {calculatedVat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: 800,
                  fontSize: '1.05rem',
                  color: 'var(--accent-cyan)',
                  borderTop: '1px solid var(--border-color)',
                  paddingTop: '0.5rem',
                  marginTop: '0.3rem',
                }}
              >
                <span>Grand Total Payable:</span>
                <span style={{ fontFamily: 'monospace' }}>ETB {calculatedGrandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          <div className="modal-footer" style={{ flexShrink: 0 }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-emerald"
            >
              {submitting ? 'Posting...' : 'Post Sale & Issue Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// COMPONENT: SALE RECEIPT / INVOICE MODAL (PRINTABLE)
// ============================================================================
interface SaleReceiptModalProps {
  sale: SparePartsSaleRecord;
  onClose: () => void;
}

const SaleReceiptModal: React.FC<SaleReceiptModalProps> = ({ sale, onClose }) => {
  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: '680px', background: '#ffffff', color: '#0f172a' }}>
        <div className="modal-header" style={{ borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: '#0284c7' }}>
              KANAB MOTORS
            </h2>
            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
              Official Spare Parts Sales Invoice & Delivery Receipt
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a', fontFamily: 'monospace' }}>{sale.saleNumber}</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{new Date(sale.saleDate).toLocaleDateString()}</div>
            </div>
            <button
              onClick={onClose}
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.65rem', borderRadius: '8px', color: '#64748b' }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="modal-body" style={{ padding: '1.5rem', background: '#ffffff', color: '#0f172a' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
            <div>
              <div style={{ fontWeight: 700, color: '#334155' }}>Customer Information:</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{sale.customerName}</div>
              {sale.customerPhone && <div style={{ color: '#64748b' }}>{sale.customerPhone}</div>}
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Account: {sale.customerType}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 700, color: '#334155' }}>Warehouse & Settlement:</div>
              <div>{sale.warehouse?.warehouseName || `Warehouse #${sale.warehouseId}`}</div>
              <div>Payment: <strong>{sale.paymentMethod}</strong></div>
              {sale.paymentReference && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Ref: {sale.paymentReference}</div>}
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem', margin: '1rem 0' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', color: '#334155' }}>
                <th style={{ padding: '0.6rem', textAlign: 'left' }}>Item / SKU</th>
                <th style={{ padding: '0.6rem', textAlign: 'center' }}>Qty</th>
                <th style={{ padding: '0.6rem', textAlign: 'right' }}>Unit Price</th>
                <th style={{ padding: '0.6rem', textAlign: 'right' }}>VAT (15%)</th>
                <th style={{ padding: '0.6rem', textAlign: 'right' }}>Total (ETB)</th>
              </tr>
            </thead>
            <tbody>
              {sale.items && sale.items.length > 0 ? (
                sale.items.map((it, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '0.6rem' }}>
                      <strong style={{ color: '#0284c7' }}>{it.item?.itemCode || `Part #${it.itemId}`}</strong>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{it.item?.itemName}</div>
                    </td>
                    <td style={{ padding: '0.6rem', textAlign: 'center', fontWeight: 600 }}>{it.quantity}</td>
                    <td style={{ padding: '0.6rem', textAlign: 'right', fontFamily: 'monospace' }}>{Number(it.unitPrice).toLocaleString()}</td>
                    <td style={{ padding: '0.6rem', textAlign: 'right', fontFamily: 'monospace' }}>{Number(it.lineVat).toLocaleString()}</td>
                    <td style={{ padding: '0.6rem', textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>{Number(it.lineTotal).toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ padding: '1rem', textAlign: 'center' }}>Direct Sale</td>
                </tr>
              )}
            </tbody>
          </table>

          <div style={{ marginLeft: 'auto', width: '280px', display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
              <span>Subtotal:</span>
              <span style={{ fontFamily: 'monospace' }}>ETB {Number(sale.subtotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            {Number(sale.discountAmount) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#059669' }}>
                <span>Discount:</span>
                <span style={{ fontFamily: 'monospace' }}>- ETB {Number(sale.discountAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569' }}>
              <span>VAT (15%):</span>
              <span style={{ fontFamily: 'monospace' }}>ETB {Number(sale.vatAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '1.1rem', borderTop: '2px solid #0f172a', paddingTop: '0.5rem', color: '#0f172a' }}>
              <span>Grand Total:</span>
              <span style={{ fontFamily: 'monospace' }}>ETB {Number(sale.grandTotal).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', background: '#f8fafc', justifyContent: 'space-between' }}>
          <button
            onClick={() => window.print()}
            className="btn btn-cyan"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Printer size={15} /> Print Receipt
          </button>
          <button
            onClick={onClose}
            className="btn btn-secondary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
