import React, { useState, useEffect } from 'react';
import {
  Boxes,
  ArrowRightLeft,
  SlidersHorizontal,
  Wrench,
  History,
  AlertTriangle,
  Building,
  CheckCircle2,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Check,
  Eye,
  FileText,
  CarFront,
  Clock,
  ChevronRight,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
import {
  api,
  Warehouse,
  StockBalance,
  LowStockAlert,
  StockTransfer,
  StockAdjustment,
  ProductionReceipt,
  StockMovementItem,
  VehicleStatusReportItem,
  VehicleStatusTransitionRule,
  ProductItem,
} from '../../api/client';

export const InventoryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'balances' | 'transfers' | 'adjustments' | 'production' | 'transitions' | 'movements'
  >('balances');

  const [loading, setLoading] = useState<boolean>(true);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [balances, setBalances] = useState<StockBalance[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlert[]>([]);
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [productionReceipts, setProductionReceipts] = useState<ProductionReceipt[]>([]);
  const [movements, setMovements] = useState<StockMovementItem[]>([]);
  const [vehicleStatusReport, setVehicleStatusReport] = useState<VehicleStatusReportItem[]>([]);
  const [transitionRules, setTransitionRules] = useState<VehicleStatusTransitionRule[]>([]);

  // Filters
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modals
  const [showTransferModal, setShowTransferModal] = useState<boolean>(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState<boolean>(false);
  const [showProductionModal, setShowProductionModal] = useState<boolean>(false);
  const [selectedTransfer, setSelectedTransfer] = useState<StockTransfer | null>(null);

  // Form states - Transfer
  const [transferFromWh, setTransferFromWh] = useState<number>(1);
  const [transferToWh, setTransferToWh] = useState<number>(2);
  const [transferItemType, setTransferItemType] = useState<'PART' | 'VEHICLE'>('PART');
  const [transferItemId, setTransferItemId] = useState<string>('');
  const [transferQuantity, setTransferQuantity] = useState<number>(1);
  const [transferVehicleUnitId, setTransferVehicleUnitId] = useState<string>('');

  // Form states - Adjustment
  const [adjWarehouseId, setAdjWarehouseId] = useState<number>(1);
  const [adjItemId, setAdjItemId] = useState<string>('');
  const [adjQuantityDelta, setAdjQuantityDelta] = useState<number>(0);
  const [adjReason, setAdjReason] = useState<string>('CYCLE_COUNT');
  const [adjReasonNotes, setAdjReasonNotes] = useState<string>('');

  // Form states - Production
  const [prodItemId, setProdItemId] = useState<string>('');
  const [prodChassis, setProdChassis] = useState<string>('');
  const [prodEngine, setProdEngine] = useState<string>('');
  const [prodWarehouseId, setProdWarehouseId] = useState<number>(1);
  const [prodAssembledAt, setProdAssembledAt] = useState<string>(
    new Date().toISOString().split('T')[0],
  );

  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(
    null,
  );

  useEffect(() => {
    loadAllData();
  }, []);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 5000);
  };

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [
        whList,
        prodRes,
        balList,
        alerts,
        trfList,
        adjList,
        prodReceiptList,
        movList,
        vReport,
        rules,
      ] = await Promise.all([
        api.getInventoryWarehouses().catch(() => []),
        api.getItems({ limit: 100 }).catch(() => ({ items: [] })),
        api.getStockBalances().catch(() => []),
        api.getLowStockAlerts().catch(() => []),
        api.getStockTransfers().catch(() => []),
        api.getStockAdjustments().catch(() => []),
        api.getProductionReceipts().catch(() => []),
        api.getMovementHistory({ limit: 100 }).catch(() => []),
        api.getVehicleInventoryByStatusReport().catch(() => []),
        api.getTransitionRules().catch(() => []),
      ]);

      const prodList = (prodRes as any)?.items || [];
      setWarehouses(whList);
      setProducts(prodList);
      setBalances(balList);
      setLowStockAlerts(alerts);
      setTransfers(trfList);
      setAdjustments(adjList);
      setProductionReceipts(prodReceiptList);
      setMovements(movList);
      setVehicleStatusReport(vReport);
      setTransitionRules(rules);

      if (prodList.length > 0) {
        setTransferItemId(prodList[0].itemId);
        setAdjItemId(prodList[0].itemId);
        setProdItemId(prodList[0].itemId);
      }
      if (whList.length > 0) {
        setTransferFromWh(whList[0].warehouseId);
        setAdjWarehouseId(whList[0].warehouseId);
        setProdWarehouseId(whList[0].warehouseId);
        if (whList.length > 1) {
          setTransferToWh(whList[1].warehouseId);
        }
      }
    } catch (err: any) {
      showToast('error', err.message || 'Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  // Transfer Actions
  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (transferFromWh === transferToWh) {
      showToast('error', 'Source and destination warehouse cannot be the same');
      return;
    }
    setActionLoading(true);
    try {
      const lines =
        transferItemType === 'VEHICLE'
          ? [{ vehicleUnitId: transferVehicleUnitId }]
          : [{ itemId: transferItemId, quantity: transferQuantity }];

      await api.createStockTransfer({
        fromWarehouseId: transferFromWh,
        toWarehouseId: transferToWh,
        lines,
      });

      showToast('success', 'Inter-warehouse stock transfer requested successfully');
      setShowTransferModal(false);
      setTransferVehicleUnitId('');
      setTransferQuantity(1);
      loadAllData();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || err.message || 'Failed to request transfer');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveTransfer = async (transferId: string) => {
    setActionLoading(true);
    try {
      await api.approveStockTransfer(transferId);
      showToast('success', `Transfer #${transferId} approved`);
      loadAllData();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || err.message || 'Failed to approve transfer');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteTransfer = async (transferId: string) => {
    setActionLoading(true);
    try {
      await api.completeStockTransfer(transferId);
      showToast('success', `Transfer #${transferId} completed. Stock balances updated!`);
      loadAllData();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || err.message || 'Failed to complete transfer');
    } finally {
      setActionLoading(false);
    }
  };

  // Adjustment Actions
  const handleCreateAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjReasonNotes.trim()) {
      showToast('error', 'A detailed reason note is mandatory for audit compliance');
      return;
    }
    setActionLoading(true);
    try {
      await api.createStockAdjustment({
        warehouseId: adjWarehouseId,
        itemId: adjItemId || undefined,
        quantityDelta: Number(adjQuantityDelta),
        reason: adjReason,
        reasonNotes: adjReasonNotes,
      });

      showToast('success', 'Stock adjustment request created and sent for approval');
      setShowAdjustmentModal(false);
      setAdjReasonNotes('');
      setAdjQuantityDelta(0);
      loadAllData();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || err.message || 'Failed to create adjustment');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApproveAdjustment = async (adjustmentId: string) => {
    setActionLoading(true);
    try {
      await api.approveStockAdjustment(adjustmentId);
      showToast('success', `Adjustment #${adjustmentId} approved and posted to inventory`);
      loadAllData();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || err.message || 'Failed to approve adjustment');
    } finally {
      setActionLoading(false);
    }
  };

  // Production Receipt Actions
  const handleCreateProductionReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodChassis || !prodEngine) {
      showToast('error', 'Chassis and engine numbers are required');
      return;
    }
    setActionLoading(true);
    try {
      await api.createProductionReceipt({
        itemId: prodItemId,
        chassisNumber: prodChassis,
        engineNumber: prodEngine,
        warehouseId: prodWarehouseId,
        assembledAt: prodAssembledAt,
      });

      showToast('success', `Locally assembled vehicle (${prodChassis}) received into inventory!`);
      setShowProductionModal(false);
      setProdChassis('');
      setProdEngine('');
      loadAllData();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || err.message || 'Failed to record production intake');
    } finally {
      setActionLoading(false);
    }
  };

  // Filtering balances
  const filteredBalances = balances.filter((b) => {
    if (selectedWarehouseFilter !== 'ALL' && String(b.warehouseId) !== selectedWarehouseFilter) {
      return false;
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const codeMatch = b.item?.itemCode?.toLowerCase().includes(term);
      const nameMatch = (b.item?.name || (b.item as any)?.itemName)?.toLowerCase().includes(term);
      const whMatch = b.warehouse?.warehouseName?.toLowerCase().includes(term);
      return codeMatch || nameMatch || whMatch;
    }
    return true;
  });

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1440px', margin: '0 auto', color: 'var(--text-primary)' }}>
      {/* Toast Notification */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            zIndex: 9999,
            padding: '1rem 1.5rem',
            borderRadius: '8px',
            background: notification.type === 'success' ? '#10B981' : '#EF4444',
            color: '#FFFFFF',
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontWeight: 600,
            animation: 'slideUp 0.3s ease-out',
          }}
        >
          {notification.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
          {notification.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Boxes className="text-cyan" size={28} />
            Inventory & Warehouse Management
          </h1>
          <p style={{ margin: '0.35rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            KMSICAMS-4 • Multi-Warehouse Stock Balances, State Transitions, Transfers, & Local Assembly Intake
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => loadAllData()}
            className="btn-outline"
            style={{
              padding: '0.6rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.85rem',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={16} /> Refresh
          </button>
          <button
            onClick={() => setShowTransferModal(true)}
            style={{
              padding: '0.6rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.85rem',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #00D2D3, #00A8FF)',
              color: '#0D1117',
              border: 'none',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <ArrowRightLeft size={16} /> New Transfer
          </button>
          <button
            onClick={() => setShowProductionModal(true)}
            style={{
              padding: '0.6rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.85rem',
              borderRadius: '6px',
              background: 'linear-gradient(135deg, #10B981, #059669)',
              color: '#FFFFFF',
              border: 'none',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <Wrench size={16} /> Assembly Intake
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '1.25rem',
          }}
        >
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>ACTIVE WAREHOUSES</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: '#00D2D3' }}>
            {warehouses.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Total Depots & Assembly plants
          </div>
        </div>

        <div
          style={{
            background: 'var(--bg-secondary)',
            border: lowStockAlerts.length > 0 ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '1.25rem',
          }}
        >
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>REORDER ALERTS</div>
          <div
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              marginTop: '0.25rem',
              color: lowStockAlerts.length > 0 ? '#EF4444' : '#10B981',
            }}
          >
            {lowStockAlerts.length}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            {lowStockAlerts.length > 0 ? 'Items below reorder point' : 'All stock levels healthy'}
          </div>
        </div>

        <div
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '1.25rem',
          }}
        >
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>PENDING TRANSFERS</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: '#F59E0B' }}>
            {transfers.filter((t) => t.status === 'REQUESTED' || t.status === 'APPROVED').length}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Inter-warehouse movements in progress
          </div>
        </div>

        <div
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '1.25rem',
          }}
        >
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 600 }}>PENDING ADJUSTMENTS</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: '#A855F7' }}>
            {adjustments.filter((a) => a.status === 'REQUESTED').length}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Awaiting manager approval
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          borderBottom: '1px solid var(--border-color)',
          marginBottom: '1.5rem',
          overflowX: 'auto',
        }}
      >
        {[
          { key: 'balances', label: 'Stock Balances', icon: Boxes },
          { key: 'transfers', label: 'Stock Transfers', icon: ArrowRightLeft },
          { key: 'adjustments', label: 'Stock Adjustments', icon: SlidersHorizontal },
          { key: 'production', label: 'Local Assembly Intake', icon: Wrench },
          { key: 'transitions', label: 'Vehicle State Machine', icon: CarFront },
          { key: 'movements', label: 'Movement History Log', icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.25rem',
                border: 'none',
                background: 'transparent',
                color: isActive ? '#00D2D3' : 'var(--text-secondary)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.9rem',
                borderBottom: isActive ? '2px solid #00D2D3' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={18} />
              {tab.label}
              {tab.key === 'balances' && lowStockAlerts.length > 0 && (
                <span
                  style={{
                    background: '#EF4444',
                    color: '#FFF',
                    fontSize: '0.7rem',
                    padding: '0.1rem 0.4rem',
                    borderRadius: '999px',
                    fontWeight: 700,
                  }}
                >
                  {lowStockAlerts.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: STOCK BALANCES */}
      {activeTab === 'balances' && (
        <div>
          {/* Low Stock Warning Banner */}
          {lowStockAlerts.length > 0 && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <ShieldAlert className="text-red" size={24} />
                <div>
                  <div style={{ fontWeight: 700, color: '#EF4444' }}>
                    Reorder Alert: {lowStockAlerts.length} product(s) below reorder threshold
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Immediate procurement purchase orders or replenishment transfers recommended.
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {lowStockAlerts.slice(0, 3).map((a) => (
                  <span
                    key={a.item_id}
                    style={{
                      background: 'rgba(239, 68, 68, 0.2)',
                      padding: '0.2rem 0.6rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      color: '#EF4444',
                    }}
                  >
                    {a.item_code} (Shortfall: {a.shortfall})
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Filters Bar */}
          <div
            style={{
              display: 'flex',
              gap: '1rem',
              marginBottom: '1rem',
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                position: 'relative',
                flex: 1,
                minWidth: '240px',
              }}
            >
              <Search
                size={16}
                style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}
              />
              <input
                type="text"
                placeholder="Search by item code, product name, or warehouse..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem 0.6rem 2.25rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Building size={16} style={{ color: 'var(--text-secondary)' }} />
              <select
                value={selectedWarehouseFilter}
                onChange={(e) => setSelectedWarehouseFilter(e.target.value)}
                style={{
                  padding: '0.6rem 1rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                }}
              >
                <option value="ALL">All Warehouses</option>
                {warehouses.map((w) => (
                  <option key={w.warehouseId} value={String(w.warehouseId)}>
                    {w.warehouseName} ({w.warehouseType || 'Depot'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Balances Table */}
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>WAREHOUSE</th>
                  <th style={{ padding: '0.85rem 1rem' }}>ITEM CODE</th>
                  <th style={{ padding: '0.85rem 1rem' }}>PRODUCT NAME</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>ON HAND</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>RESERVED</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>AVAILABLE</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {filteredBalances.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No stock balance records found matching filter.
                    </td>
                  </tr>
                ) : (
                  filteredBalances.map((b) => {
                    const isLow = b.item?.reorderLevel && b.quantityAvailable <= b.item.reorderLevel;
                    return (
                      <tr
                        key={b.balanceId}
                        style={{ borderBottom: '1px solid var(--border-color)' }}
                      >
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>
                          {b.warehouse?.warehouseName || `Warehouse #${b.warehouseId}`}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', color: '#00D2D3' }}>
                          {b.item?.itemCode || b.itemId}
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>{b.item?.name || '—'}</td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700 }}>
                          {b.quantityOnHand}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: '#F59E0B' }}>
                          {b.quantityReserved}
                        </td>
                        <td
                          style={{
                            padding: '0.85rem 1rem',
                            textAlign: 'right',
                            fontWeight: 800,
                            color: isLow ? '#EF4444' : '#10B981',
                          }}
                        >
                          {b.quantityAvailable}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                          {isLow ? (
                            <span
                              style={{
                                background: 'rgba(239, 68, 68, 0.15)',
                                color: '#EF4444',
                                padding: '0.2rem 0.5rem',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                              }}
                            >
                              LOW STOCK
                            </span>
                          ) : (
                            <span
                              style={{
                                background: 'rgba(16, 185, 129, 0.15)',
                                color: '#10B981',
                                padding: '0.2rem 0.5rem',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                              }}
                            >
                              OPTIMAL
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: STOCK TRANSFERS */}
      {activeTab === 'transfers' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ fontSize: '1rem', fontWeight: 700 }}>Inter-Warehouse Stock Transfers</div>
            <button
              onClick={() => setShowTransferModal(true)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                background: '#00D2D3',
                color: '#0D1117',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <Plus size={16} /> Request Transfer
            </button>
          </div>

          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>TRANSFER #</th>
                  <th style={{ padding: '0.85rem 1rem' }}>FROM WAREHOUSE</th>
                  <th style={{ padding: '0.85rem 1rem' }}>TO WAREHOUSE</th>
                  <th style={{ padding: '0.85rem 1rem' }}>REQUESTED BY</th>
                  <th style={{ padding: '0.85rem 1rem' }}>STATUS</th>
                  <th style={{ padding: '0.85rem 1rem' }}>REQUESTED DATE</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {transfers.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No transfer requests registered yet.
                    </td>
                  </tr>
                ) : (
                  transfers.map((t) => (
                    <tr key={t.transferId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 700, fontFamily: 'monospace' }}>
                        #{t.transferId}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {t.fromWarehouse?.warehouseName || `Warehouse #${t.fromWarehouseId}`}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {t.toWarehouse?.warehouseName || `Warehouse #${t.toWarehouseId}`}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>{t.requester?.fullName || `User #${t.requestedBy}`}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          style={{
                            padding: '0.2rem 0.6rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background:
                              t.status === 'COMPLETED'
                                ? 'rgba(16, 185, 129, 0.15)'
                                : t.status === 'APPROVED'
                                ? 'rgba(0, 210, 211, 0.15)'
                                : 'rgba(245, 158, 11, 0.15)',
                            color:
                              t.status === 'COMPLETED'
                                ? '#10B981'
                                : t.status === 'APPROVED'
                                ? '#00D2D3'
                                : '#F59E0B',
                          }}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>
                        {new Date(t.requestedAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => setSelectedTransfer(t)}
                            style={{
                              background: 'transparent',
                              border: '1px solid var(--border-color)',
                              padding: '0.3rem 0.6rem',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              color: 'var(--text-primary)',
                              fontSize: '0.75rem',
                            }}
                          >
                            <Eye size={14} /> Lines
                          </button>
                          {t.status === 'REQUESTED' && (
                            <button
                              disabled={actionLoading}
                              onClick={() => handleApproveTransfer(t.transferId)}
                              style={{
                                background: '#00D2D3',
                                border: 'none',
                                color: '#0D1117',
                                padding: '0.3rem 0.6rem',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: 700,
                                fontSize: '0.75rem',
                              }}
                            >
                              Approve
                            </button>
                          )}
                          {t.status === 'APPROVED' && (
                            <button
                              disabled={actionLoading}
                              onClick={() => handleCompleteTransfer(t.transferId)}
                              style={{
                                background: '#10B981',
                                border: 'none',
                                color: '#FFFFFF',
                                padding: '0.3rem 0.6rem',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: 700,
                                fontSize: '0.75rem',
                              }}
                            >
                              Complete
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
      )}

      {/* TAB 3: STOCK ADJUSTMENTS */}
      {activeTab === 'adjustments' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ fontSize: '1rem', fontWeight: 700 }}>Stock Quantity & Condition Adjustments</div>
            <button
              onClick={() => setShowAdjustmentModal(true)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                background: '#A855F7',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <Plus size={16} /> New Adjustment
            </button>
          </div>

          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>ADJUSTMENT #</th>
                  <th style={{ padding: '0.85rem 1rem' }}>WAREHOUSE</th>
                  <th style={{ padding: '0.85rem 1rem' }}>ITEM / VEHICLE</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>DELTA</th>
                  <th style={{ padding: '0.85rem 1rem' }}>REASON</th>
                  <th style={{ padding: '0.85rem 1rem' }}>REASON NOTES</th>
                  <th style={{ padding: '0.85rem 1rem' }}>STATUS</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {adjustments.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No stock adjustments filed yet.
                    </td>
                  </tr>
                ) : (
                  adjustments.map((a) => (
                    <tr key={a.adjustmentId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 700, fontFamily: 'monospace' }}>
                        #{a.adjustmentId}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {a.warehouse?.warehouseName || `Warehouse #${a.warehouseId}`}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {a.item ? `${a.item.itemCode} - ${a.item.name}` : a.vehicleUnit?.chassisNumber || '—'}
                      </td>
                      <td
                        style={{
                          padding: '0.85rem 1rem',
                          textAlign: 'right',
                          fontWeight: 700,
                          color: (a.quantityDelta || 0) >= 0 ? '#10B981' : '#EF4444',
                        }}
                      >
                        {(a.quantityDelta || 0) > 0 ? `+${a.quantityDelta}` : a.quantityDelta}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          style={{
                            background: 'rgba(255,255,255,0.06)',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                          }}
                        >
                          {a.reason}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {a.reasonNotes}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          style={{
                            padding: '0.2rem 0.6rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            background:
                              a.status === 'APPROVED'
                                ? 'rgba(16, 185, 129, 0.15)'
                                : a.status === 'REJECTED'
                                ? 'rgba(239, 68, 68, 0.15)'
                                : 'rgba(245, 158, 11, 0.15)',
                            color:
                              a.status === 'APPROVED'
                                ? '#10B981'
                                : a.status === 'REJECTED'
                                ? '#EF4444'
                                : '#F59E0B',
                          }}
                        >
                          {a.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        {a.status === 'REQUESTED' && (
                          <button
                            disabled={actionLoading}
                            onClick={() => handleApproveAdjustment(a.adjustmentId)}
                            style={{
                              background: '#10B981',
                              border: 'none',
                              color: '#FFF',
                              padding: '0.3rem 0.6rem',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                            }}
                          >
                            Approve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: PRODUCTION ASSEMBLY INTAKE */}
      {activeTab === 'production' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 700 }}>Local Vehicle Assembly Intake</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Fills SRS gap: directly receives locally assembled three-wheelers/motorcycles into warehouse inventory with auto-activation to AVAILABLE_FOR_SALE
              </div>
            </div>
            <button
              onClick={() => setShowProductionModal(true)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                background: '#10B981',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <Plus size={16} /> Record Assembly Receipt
            </button>
          </div>

          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>RECEIPT #</th>
                  <th style={{ padding: '0.85rem 1rem' }}>CHASSIS / VIN</th>
                  <th style={{ padding: '0.85rem 1rem' }}>ENGINE NUMBER</th>
                  <th style={{ padding: '0.85rem 1rem' }}>MODEL</th>
                  <th style={{ padding: '0.85rem 1rem' }}>WAREHOUSE</th>
                  <th style={{ padding: '0.85rem 1rem' }}>ASSEMBLED DATE</th>
                  <th style={{ padding: '0.85rem 1rem' }}>INSPECTION STATUS</th>
                </tr>
              </thead>
              <tbody>
                {productionReceipts.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No production assembly receipts recorded yet.
                    </td>
                  </tr>
                ) : (
                  productionReceipts.map((p) => (
                    <tr key={p.productionReceiptId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 700, fontFamily: 'monospace' }}>
                        #{p.productionReceiptId}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', color: '#00D2D3', fontWeight: 700 }}>
                        {p.chassisNumber}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace' }}>{p.engineNumber}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>{p.item?.name || p.itemId}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>{p.warehouse?.warehouseName || `Warehouse #${p.warehouseId}`}</td>
                      <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>{p.assembledAt}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          style={{
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: '#10B981',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                          }}
                        >
                          AVAILABLE_FOR_SALE
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: VEHICLE STATUS STATE MACHINE */}
      {activeTab === 'transitions' && (
        <div>
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>
              Vehicle Lifecycle State Machine Rules
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Enforced by database function <code style={{ color: '#00D2D3' }}>fn_transition_vehicle_status()</code>.
              Direct unauthorized status jumps (e.g. RECEIVED → SOLD) are strictly blocked.
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '1rem',
              marginBottom: '2rem',
            }}
          >
            {transitionRules.map((r, i) => (
              <div
                key={i}
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.85rem' }}>
                    <span style={{ color: '#F59E0B' }}>{r.fromStatus}</span>
                    <ChevronRight size={16} />
                    <span style={{ color: '#10B981' }}>{r.toStatus}</span>
                  </div>
                  <span
                    style={{
                      background: 'rgba(0, 210, 211, 0.1)',
                      color: '#00D2D3',
                      fontSize: '0.7rem',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '4px',
                      fontWeight: 700,
                    }}
                  >
                    {r.allowedTriggerModule || 'ANY'}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {r.description || 'Valid state machine transition path.'}
                </div>
              </div>
            ))}
          </div>

          {/* Vehicle Inventory by Status Summary */}
          <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem' }}>
            Current Fleet Distribution by Status
          </div>
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>WAREHOUSE</th>
                  <th style={{ padding: '0.85rem 1rem' }}>MODEL</th>
                  <th style={{ padding: '0.85rem 1rem' }}>STATUS</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>UNITS COUNT</th>
                </tr>
              </thead>
              <tbody>
                {vehicleStatusReport.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No vehicle status distribution records found.
                    </td>
                  </tr>
                ) : (
                  vehicleStatusReport.map((vr, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>{vr.warehouse_name || 'All Warehouses'}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>{vr.model_name || 'All Models'}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          style={{
                            background: 'rgba(255,255,255,0.06)',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                          }}
                        >
                          {vr.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 800, color: '#00D2D3' }}>
                        {vr.vehicle_count}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: MOVEMENT HISTORY LOG */}
      {activeTab === 'movements' && (
        <div>
          <div style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: 700 }}>
            Unified Double-Entry Stock Movement History (Story H1)
          </div>

          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>TIMESTAMP</th>
                  <th style={{ padding: '0.85rem 1rem' }}>TYPE</th>
                  <th style={{ padding: '0.85rem 1rem' }}>WAREHOUSE</th>
                  <th style={{ padding: '0.85rem 1rem' }}>ITEM / VEHICLE</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>QUANTITY</th>
                  <th style={{ padding: '0.85rem 1rem' }}>REFERENCE</th>
                  <th style={{ padding: '0.85rem 1rem' }}>PERFORMED BY</th>
                </tr>
              </thead>
              <tbody>
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No stock movement audit records found.
                    </td>
                  </tr>
                ) : (
                  movements.map((m) => {
                    const isPositive = m.quantity > 0;
                    return (
                      <tr key={m.movement_id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.85rem 1rem', color: 'var(--text-secondary)' }}>
                          {new Date(m.movement_at).toLocaleString()}
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              background: isPositive
                                ? 'rgba(16, 185, 129, 0.15)'
                                : 'rgba(239, 68, 68, 0.15)',
                              color: isPositive ? '#10B981' : '#EF4444',
                            }}
                          >
                            {isPositive ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                            {m.movement_type}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>{m.warehouse_name}</td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          {m.item_code ? `${m.item_code} - ${m.item_name}` : m.chassis_number || '—'}
                        </td>
                        <td
                          style={{
                            padding: '0.85rem 1rem',
                            textAlign: 'right',
                            fontWeight: 800,
                            color: isPositive ? '#10B981' : '#EF4444',
                          }}
                        >
                          {isPositive ? `+${m.quantity}` : m.quantity}
                        </td>
                        <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                          {m.reference_type} #{m.reference_id}
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>{m.performed_by_name || 'System / Auto'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: CREATE TRANSFER */}
      {showTransferModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
          }}
        >
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '1.5rem',
              width: '100%',
              maxWidth: '520px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Request Inter-Warehouse Transfer</h2>
              <button
                onClick={() => setShowTransferModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.25rem' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTransfer}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    From Warehouse
                  </label>
                  <select
                    value={transferFromWh}
                    onChange={(e) => setTransferFromWh(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      borderRadius: '6px',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {warehouses.map((w) => (
                      <option key={w.warehouseId} value={w.warehouseId}>
                        {w.warehouseName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    To Warehouse
                  </label>
                  <select
                    value={transferToWh}
                    onChange={(e) => setTransferToWh(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      borderRadius: '6px',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {warehouses.map((w) => (
                      <option key={w.warehouseId} value={w.warehouseId}>
                        {w.warehouseName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Transfer Item Type
                </label>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="itemType"
                      checked={transferItemType === 'PART'}
                      onChange={() => setTransferItemType('PART')}
                    />
                    General Item / Part
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="itemType"
                      checked={transferItemType === 'VEHICLE'}
                      onChange={() => setTransferItemType('VEHICLE')}
                    />
                    Serialized Vehicle Unit
                  </label>
                </div>
              </div>

              {transferItemType === 'PART' ? (
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                      Product Item
                    </label>
                    <select
                      value={transferItemId}
                      onChange={(e) => setTransferItemId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.6rem',
                        borderRadius: '6px',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {products.map((p) => (
                        <option key={p.itemId} value={p.itemId}>
                          {p.itemCode} - {p.itemName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                      Quantity
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={transferQuantity}
                      onChange={(e) => setTransferQuantity(Number(e.target.value))}
                      style={{
                        width: '100%',
                        padding: '0.6rem',
                        borderRadius: '6px',
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Vehicle Unit ID / VIN
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter Vehicle Unit ID (e.g. 101)"
                    value={transferVehicleUnitId}
                    onChange={(e) => setTransferVehicleUnitId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      borderRadius: '6px',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  style={{
                    padding: '0.6rem 1rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'transparent',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{
                    padding: '0.6rem 1.25rem',
                    borderRadius: '6px',
                    background: '#00D2D3',
                    color: '#0D1117',
                    border: 'none',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE ADJUSTMENT */}
      {showAdjustmentModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
          }}
        >
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '1.5rem',
              width: '100%',
              maxWidth: '520px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Create Stock Adjustment</h2>
              <button
                onClick={() => setShowAdjustmentModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.25rem' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAdjustment}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Warehouse
                </label>
                <select
                  value={adjWarehouseId}
                  onChange={(e) => setAdjWarehouseId(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    borderRadius: '6px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {warehouses.map((w) => (
                    <option key={w.warehouseId} value={w.warehouseId}>
                      {w.warehouseName}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Item
                  </label>
                  <select
                    value={adjItemId}
                    onChange={(e) => setAdjItemId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      borderRadius: '6px',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {products.map((p) => (
                      <option key={p.itemId} value={p.itemId}>
                        {p.itemCode} - {p.itemName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Quantity Delta (+ / -)
                  </label>
                  <input
                    type="number"
                    required
                    value={adjQuantityDelta}
                    onChange={(e) => setAdjQuantityDelta(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      borderRadius: '6px',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Adjustment Reason Category
                </label>
                <select
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    borderRadius: '6px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <option value="DAMAGE">Damage (Packaging / Transit fault)</option>
                  <option value="LOSS">Loss (Discrepancy / Missing)</option>
                  <option value="CYCLE_COUNT">Cycle Count Physical Audit</option>
                  <option value="FOUND">Found Surplus Stock</option>
                  <option value="STATUS_CORRECTION">Status Correction</option>
                  <option value="SCRAP">Scrap / Write-off</option>
                  <option value="OTHER">Other Reason</option>
                </select>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Mandatory Audit Notes & Explanation <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explain why this adjustment is required (mandatory for audit compliance)..."
                  value={adjReasonNotes}
                  onChange={(e) => setAdjReasonNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    borderRadius: '6px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAdjustmentModal(false)}
                  style={{
                    padding: '0.6rem 1rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'transparent',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{
                    padding: '0.6rem 1.25rem',
                    borderRadius: '6px',
                    background: '#A855F7',
                    color: '#FFFFFF',
                    border: 'none',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Submit for Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: PRODUCTION VEHICLE INTAKE */}
      {showProductionModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
          }}
        >
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '1.5rem',
              width: '100%',
              maxWidth: '520px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Record Local Assembly Intake</h2>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Creates Vehicle Unit with status AVAILABLE_FOR_SALE
                </div>
              </div>
              <button
                onClick={() => setShowProductionModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.25rem' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProductionReceipt}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                  Model / Item
                </label>
                <select
                  value={prodItemId}
                  onChange={(e) => setProdItemId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    borderRadius: '6px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {products.map((p) => (
                    <option key={p.itemId} value={p.itemId}>
                      {p.itemCode} - {p.itemName}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Chassis / VIN Number <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. KANAB-2026-CHAS-01"
                    value={prodChassis}
                    onChange={(e) => setProdChassis(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      borderRadius: '6px',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Engine Number <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. KANAB-2026-ENG-01"
                    value={prodEngine}
                    onChange={(e) => setProdEngine(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      borderRadius: '6px',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Receiving Warehouse
                  </label>
                  <select
                    value={prodWarehouseId}
                    onChange={(e) => setProdWarehouseId(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      borderRadius: '6px',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {warehouses.map((w) => (
                      <option key={w.warehouseId} value={w.warehouseId}>
                        {w.warehouseName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                    Assembly Date
                  </label>
                  <input
                    type="date"
                    value={prodAssembledAt}
                    onChange={(e) => setProdAssembledAt(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      borderRadius: '6px',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowProductionModal(false)}
                  style={{
                    padding: '0.6rem 1rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'transparent',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{
                    padding: '0.6rem 1.25rem',
                    borderRadius: '6px',
                    background: '#10B981',
                    color: '#FFFFFF',
                    border: 'none',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Receive into Inventory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: VIEW TRANSFER LINES */}
      {selectedTransfer && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
          }}
        >
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '1.5rem',
              width: '100%',
              maxWidth: '560px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Transfer #{selectedTransfer.transferId} Lines</h2>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {selectedTransfer.fromWarehouse?.warehouseName} → {selectedTransfer.toWarehouse?.warehouseName}
                </div>
              </div>
              <button
                onClick={() => setSelectedTransfer(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.25rem' }}
              >
                ✕
              </button>
            </div>

            <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '1.25rem' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '0.6rem' }}>ITEM / VEHICLE</th>
                    <th style={{ padding: '0.6rem', textAlign: 'right' }}>QUANTITY</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedTransfer.lines?.map((line) => (
                    <tr key={line.lineId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.6rem' }}>
                        {line.item ? `${line.item.itemCode} - ${line.item.name}` : line.vehicleUnit?.chassisNumber || line.vehicleUnitId}
                      </td>
                      <td style={{ padding: '0.6rem', textAlign: 'right', fontWeight: 700 }}>
                        {line.quantity || 1}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedTransfer(null)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  background: 'var(--border-color)',
                  color: 'var(--text-primary)',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
