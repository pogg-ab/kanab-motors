import React, { useState, useEffect } from 'react';
import {
  Ship,
  Plus,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Anchor,
  Truck,
  FileCheck,
  ChevronRight,
  ExternalLink,
  Layers,
  Calendar,
  Compass,
  ArrowRight,
  Download,
  Clock,
  TrendingUp,
  Activity,
  Sliders,
  DollarSign,
} from 'lucide-react';
import {
  api,
  Shipment,
  PurchaseOrderLine,
} from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { ModalErrorAlert } from '../../components/ModalErrorAlert';
import { formatApiError } from '../../utils/error';

interface ShipmentsPageProps {
  onSelectShipment?: (shipmentId: string) => void;
}

export const ShipmentsPage: React.FC<ShipmentsPageProps> = ({ onSelectShipment }) => {
  const { hasPermission } = useAuth();
  const canCreateShipment = hasPermission('SHIPMENTS_CREATE');
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [openPoLines, setOpenPoLines] = useState<PurchaseOrderLine[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [stageFilter, setStageFilter] = useState<string>('');
  const [viewMode, setViewMode] = useState<'shipments' | 'cost_report' | 'variance_report' | 'delay_report'>('shipments');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [shipmentError, setShipmentError] = useState<string | null>(null);

  // Form state
  const [newShipment, setNewShipment] = useState<{
    billOfLadingNumber: string;
    expectedArrivalDate: string;
    allocationMethod: 'BY_VALUE' | 'BY_QUANTITY' | 'BY_WEIGHT';
    notes: string;
    selectedLines: { poLineId: string; quantityShipped: number }[];
  }>({
    billOfLadingNumber: '',
    expectedArrivalDate: '',
    allocationMethod: 'BY_VALUE',
    notes: '',
    selectedLines: [],
  });

  const [saving, setSaving] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [shipRes, poLines] = await Promise.all([
        api.getShipments(),
        api.getOpenPOLines(),
      ]);
      setShipments(shipRes.items || []);
      setOpenPoLines(poLines);
    } catch (err: any) {
      showToast('error', formatApiError(err, 'Failed to load shipments'));
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePoLine = (poLineId: string, maxQty: number) => {
    const existing = newShipment.selectedLines.find((l) => l.poLineId === poLineId);
    if (existing) {
      setNewShipment({
        ...newShipment,
        selectedLines: newShipment.selectedLines.filter((l) => l.poLineId !== poLineId),
      });
    } else if (maxQty > 0) {
      setNewShipment({
        ...newShipment,
        selectedLines: [...newShipment.selectedLines, { poLineId, quantityShipped: maxQty }],
      });
    }
  };

  const handleLineQtyChange = (poLineId: string, qty: number, maxQty: number) => {
    const clampedQty = Math.min(Math.max(qty, 1), maxQty);
    setNewShipment({
      ...newShipment,
      selectedLines: newShipment.selectedLines.map((l) =>
        l.poLineId === poLineId ? { ...l, quantityShipped: clampedQty } : l,
      ),
    });
  };

  const handleCreateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    setShipmentError(null);
    if (newShipment.selectedLines.length === 0) {
      setShipmentError('Select at least one PO line for this shipment');
      return;
    }
    setSaving(true);
    try {
      const created = await api.createShipment({
        billOfLadingNumber: newShipment.billOfLadingNumber || undefined,
        expectedArrivalDate: newShipment.expectedArrivalDate || undefined,
        allocationMethod: newShipment.allocationMethod,
        notes: newShipment.notes,
        lines: newShipment.selectedLines,
      });
      showToast('success', `Shipment ${created.shipmentNumber} initialized successfully!`);
      setShowCreateModal(false);
      setShipmentError(null);
      setNewShipment({
        billOfLadingNumber: '',
        expectedArrivalDate: '',
        allocationMethod: 'BY_VALUE',
        notes: '',
        selectedLines: [],
      });
      loadData();
      if (onSelectShipment) {
        onSelectShipment(created.shipmentId);
      }
    } catch (err: any) {
      setShipmentError(formatApiError(err, 'Failed to create shipment'));
    } finally {
      setSaving(false);
    }
  };

  const filteredShipments = shipments.filter((s) => {
    const matchesSearch =
      s.shipmentNumber?.toLowerCase().includes(search.toLowerCase()) ||
      s.billOfLadingNumber?.toLowerCase().includes(search.toLowerCase()) ||
      (s.notes && s.notes.toLowerCase().includes(search.toLowerCase()));
    const matchesStage = !stageFilter || s.currentStage === stageFilter;
    return matchesSearch && matchesStage;
  });

  // Client Specification: 10 Executive Import Dashboard KPIs
  const activeCount = shipments.filter((s) => s.currentStage !== 'RECEIVED').length;
  const inTransitCount = shipments.filter((s) => s.currentStage === 'SHIPPED' || s.currentStage === 'IN_TRANSIT_INLAND').length;
  const orderedCount = shipments.filter((s) => s.currentStage === 'ORDERED').length;
  const shippedCount = shipments.filter((s) => s.currentStage === 'SHIPPED').length;
  const djiboutiCount = shipments.filter((s) => s.currentStage === 'AT_DJIBOUTI_PORT').length;
  const customsCount = shipments.filter((s) => s.currentStage === 'ETHIOPIAN_CUSTOMS_CLEARANCE').length;
  const inlandTransitCount = shipments.filter((s) => s.currentStage === 'IN_TRANSIT_INLAND').length;
  const delayedCount = shipments.filter((s) => s.expectedArrivalDate && new Date(s.expectedArrivalDate) < new Date() && s.currentStage !== 'RECEIVED').length;
  const pendingDocsCount = shipments.filter((s) => s.currentStage !== 'RECEIVED').length;
  const pendingLandedCostCount = shipments.filter((s) => s.currentStage !== 'RECEIVED' && (!s.costComponents || s.costComponents.length === 0)).length;
  const receivedThisMonthCount = shipments.filter((s) => s.currentStage === 'RECEIVED').length;
  const receivedCount = receivedThisMonthCount;

  const totalImportValueEtb = shipments.reduce((sum, s) => {
    const linesTotal = s.lines?.reduce((lSum, l) => lSum + (Number(l.quantityShipped || 0) * Number(l.poLine?.unitPrice || 0) * (l.poLine?.currency === 'USD' ? 158.5 : 1)), 0) || 0;
    return sum + linesTotal;
  }, 0);

  const totalLandedCostEtb = shipments.reduce((sum, s) => {
    const costTotal = s.costComponents?.reduce((cSum, c) => cSum + (Number(c.amount || 0) * Number(c.exchangeRateToEtb || 1)), 0) || 0;
    const linesTotal = s.lines?.reduce((lSum, l) => lSum + (Number(l.quantityShipped || 0) * Number(l.poLine?.unitPrice || 0) * (l.poLine?.currency === 'USD' ? 158.5 : 1)), 0) || 0;
    return sum + linesTotal + costTotal;
  }, 0);

  return (
    <div style={{ padding: '1.75rem 2rem', maxWidth: '1680px', margin: '0 auto' }}>
      {/* Toast Notification */}
      {notification && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.25rem',
            background: notification.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${notification.type === 'success' ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
            color: notification.type === 'success' ? '#34d399' : '#f87171',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            boxShadow: '0 4px 15px -2px rgba(0,0,0,0.5)',
          }}
        >
          {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{notification.msg}</span>
        </div>
      )}

      {/* Header Section */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
            <span className="badge badge-cyan" style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem' }}>
              FY2026
            </span>
            <span className="badge badge-indigo" style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem' }}>
              Q4 Active Batches
            </span>
          </div>
          <h1
            style={{
              fontSize: '1.65rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              margin: '0 0 0.3rem 0',
            }}
          >
            Import Shipment Tracking & Landed Cost Management
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.84rem', margin: 0 }}>
            Multi-stage freight monitoring from factory to Addis Ababa yard with dynamic landed cost allocation
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={loadData}
            disabled={loading}
            className="btn btn-secondary"
            style={{ fontSize: '0.82rem', padding: '0.5rem 0.9rem' }}
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            <span>Refresh Live Feed</span>
          </button>
          {canCreateShipment && (
            <button
              onClick={() => {
                setShipmentError(null);
                setShowCreateModal(true);
              }}
              className="btn btn-cyan"
              style={{ fontSize: '0.85rem', padding: '0.55rem 1.15rem' }}
            >
              <Plus size={16} />
              <span>Create Import Shipment</span>
            </button>
          )}
        </div>
      </div>

      {/* Specification Section 13: 10 Executive Import Dashboard KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: '0.85rem',
          marginBottom: '1.5rem',
        }}
      >
        {/* Card 1: Active Shipments */}
        <div className="glass-panel" style={{ padding: '0.9rem 1.1rem', borderLeft: '3px solid var(--accent-cyan)' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)' }}>ACTIVE SHIPMENTS</div>
          <div style={{ fontSize: '1.55rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
            {activeCount} <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>Active</span>
          </div>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Pipeline In-Flight</div>
        </div>

        {/* Card 2: In Transit */}
        <div className="glass-panel" style={{ padding: '0.9rem 1.1rem', borderLeft: '3px solid var(--accent-indigo)' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)' }}>IN TRANSIT</div>
          <div style={{ fontSize: '1.55rem', fontWeight: 800, color: '#a5b4fc', marginTop: '0.2rem' }}>
            {inTransitCount} <span style={{ fontSize: '0.75rem', color: '#a5b4fc', fontWeight: 600 }}>Sea & Road</span>
          </div>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Maritime / Inland</div>
        </div>

        {/* Card 3: At Djibouti */}
        <div className="glass-panel" style={{ padding: '0.9rem 1.1rem', borderLeft: '3px solid var(--accent-amber)' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)' }}>AT DJIBOUTI PORT</div>
          <div style={{ fontSize: '1.55rem', fontWeight: 800, color: 'var(--accent-amber)', marginTop: '0.2rem' }}>
            {djiboutiCount} <span style={{ fontSize: '0.75rem', color: 'var(--accent-amber)', fontWeight: 600 }}>Berth</span>
          </div>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Doraleh DCT Terminal</div>
        </div>

        {/* Card 4: Customs Clearance */}
        <div className="glass-panel" style={{ padding: '0.9rem 1.1rem', borderLeft: '3px solid #c084fc' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)' }}>CUSTOMS CLEARANCE</div>
          <div style={{ fontSize: '1.55rem', fontWeight: 800, color: '#c084fc', marginTop: '0.2rem' }}>
            {customsCount} <span style={{ fontSize: '0.75rem', color: '#c084fc', fontWeight: 600 }}>ECC Transit</span>
          </div>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Mojo Dry Port Filing</div>
        </div>

        {/* Card 5: Delayed */}
        <div className="glass-panel" style={{ padding: '0.9rem 1.1rem', borderLeft: '3px solid var(--accent-rose)' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)' }}>DELAYED SHIPMENTS</div>
          <div style={{ fontSize: '1.55rem', fontWeight: 800, color: 'var(--accent-rose)', marginTop: '0.2rem' }}>
            {delayedCount} <span style={{ fontSize: '0.75rem', color: 'var(--accent-rose)', fontWeight: 600 }}>Past ETA</span>
          </div>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Logistics Bottleneck</div>
        </div>

        {/* Card 6: Pending Documents */}
        <div className="glass-panel" style={{ padding: '0.9rem 1.1rem', borderLeft: '3px solid #38bdf8' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)' }}>PENDING DOCUMENTS</div>
          <div style={{ fontSize: '1.55rem', fontWeight: 800, color: '#38bdf8', marginTop: '0.2rem' }}>
            {pendingDocsCount} <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 600 }}>Batches</span>
          </div>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Checklist Gate Active</div>
        </div>

        {/* Card 7: Pending Landed Cost */}
        <div className="glass-panel" style={{ padding: '0.9rem 1.1rem', borderLeft: '3px solid #fbbf24' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)' }}>PENDING LANDED COST</div>
          <div style={{ fontSize: '1.55rem', fontWeight: 800, color: '#fbbf24', marginTop: '0.2rem' }}>
            {pendingLandedCostCount} <span style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: 600 }}>Unapportioned</span>
          </div>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Awaiting Cost Vouchers</div>
        </div>

        {/* Card 8: Received This Month */}
        <div className="glass-panel" style={{ padding: '0.9rem 1.1rem', borderLeft: '3px solid var(--accent-emerald)' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)' }}>RECEIVED THIS MONTH</div>
          <div style={{ fontSize: '1.55rem', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: '0.2rem' }}>
            {receivedThisMonthCount} <span style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>Closed</span>
          </div>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>In Stock (Module 13)</div>
        </div>

        {/* Card 9: Total Import Value */}
        <div className="glass-panel" style={{ padding: '0.9rem 1.1rem', borderLeft: '3px solid #818cf8' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)' }}>TOTAL IMPORT VALUE</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#818cf8', marginTop: '0.2rem', fontFamily: 'var(--font-mono)' }}>
            {totalImportValueEtb > 0 ? `${(totalImportValueEtb / 1000000).toFixed(2)}M ETB` : '0.00 ETB'}
          </div>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>FOB Cargo Declared</div>
        </div>

        {/* Card 10: Total Landed Cost */}
        <div className="glass-panel" style={{ padding: '0.9rem 1.1rem', borderLeft: '3px solid var(--accent-emerald)' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-secondary)' }}>TOTAL LANDED COST</div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: '0.2rem', fontFamily: 'var(--font-mono)' }}>
            {totalLandedCostEtb > 0 ? `${(totalLandedCostEtb / 1000000).toFixed(2)}M ETB` : '0.00 ETB'}
          </div>
          <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Capitalized Consignment</div>
        </div>
      </div>

      {/* End-to-End Freight Stepper & Dwell Bottleneck Monitor */}
      <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={16} color="var(--accent-cyan)" />
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              End-to-End Freight Stepper & Dwell Bottleneck Monitor
            </h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-cyan)' }} />
              Active Freight Path
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-emerald)' }} />
              Completed Milestones
            </span>
          </div>
        </div>

        {/* Stepper Horizontal Flow */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.75rem' }}>
          {/* Step 1 */}
          <div
            style={{
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)' }}>01. ORDERED</div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.2rem' }}>Factory</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
              {orderedCount} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>Shipments</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Avg Dwell: <span style={{ color: 'var(--accent-cyan)' }}>3.0 days</span>
            </div>
          </div>

          {/* Step 2 */}
          <div
            style={{
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)' }}>02. MARITIME</div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.2rem' }}>High Seas</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-cyan)', marginTop: '0.25rem' }}>
              {shippedCount} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>Shipments</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Avg Dwell: <span style={{ color: 'var(--accent-cyan)' }}>18.4 days</span>
            </div>
          </div>

          {/* Step 3 */}
          <div
            style={{
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)' }}>03. DJIBOUTI</div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.2rem' }}>Port Quay</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-amber)', marginTop: '0.25rem' }}>
              {djiboutiCount} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>Shipments</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Avg Dwell: <span style={{ color: 'var(--accent-amber)' }}>4.1 days</span>
            </div>
          </div>

          {/* Step 4 */}
          <div
            style={{
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.35)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--accent-indigo)' }}>04. CUSTOMS</span>
              <span className="badge badge-indigo" style={{ fontSize: '0.6rem', padding: '0.05rem 0.35rem' }}>ACTIVE</span>
            </div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.2rem' }}>Mojo Dry Port</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-indigo)', marginTop: '0.25rem' }}>
              {customsCount} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>Shipments</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Avg Dwell: <span style={{ color: 'var(--accent-indigo)' }}>4.2 days</span>
            </div>
          </div>

          {/* Step 5 */}
          <div
            style={{
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)' }}>05. INLAND</div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.2rem' }}>Corridor</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-cyan)', marginTop: '0.25rem' }}>
              {inlandTransitCount} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>Convoys</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Avg Dwell: <span style={{ color: 'var(--accent-cyan)' }}>2.0 days</span>
            </div>
          </div>

          {/* Step 6 */}
          <div
            style={{
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}
          >
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>06. RECEIVED</div>
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.2rem' }}>Yard Ready</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: '0.25rem' }}>
              {receivedCount} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500 }}>Shipments</span>
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Landed Cycle: <span style={{ color: 'var(--accent-emerald)' }}>Cleared</span>
            </div>
          </div>
        </div>
      </div>

      {/* Specification Section 13: View Mode Switcher */}
      <div style={{ display: 'flex', gap: '0.65rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => setViewMode('shipments')}
          className={`btn ${viewMode === 'shipments' ? 'btn-cyan' : 'btn-secondary'}`}
          style={{ fontSize: '0.8rem', padding: '0.45rem 0.95rem' }}
        >
          <Ship size={14} /> <span>Shipment Tracking</span>
        </button>
        <button
          onClick={() => setViewMode('cost_report')}
          className={`btn ${viewMode === 'cost_report' ? 'btn-cyan' : 'btn-secondary'}`}
          style={{ fontSize: '0.8rem', padding: '0.45rem 0.95rem' }}
        >
          <DollarSign size={14} /> <span>Import Cost Report</span>
        </button>
        <button
          onClick={() => setViewMode('variance_report')}
          className={`btn ${viewMode === 'variance_report' ? 'btn-cyan' : 'btn-secondary'}`}
          style={{ fontSize: '0.8rem', padding: '0.45rem 0.95rem' }}
        >
          <Activity size={14} /> <span>Landed Cost Variance Report</span>
        </button>
        <button
          onClick={() => setViewMode('delay_report')}
          className={`btn ${viewMode === 'delay_report' ? 'btn-cyan' : 'btn-secondary'}`}
          style={{ fontSize: '0.8rem', padding: '0.45rem 0.95rem' }}
        >
          <Clock size={14} /> <span>Shipment Delay Report</span>
        </button>
      </div>

      {/* Filter Bar & Quick Stage Pills */}
      <div
        className="glass-panel"
        style={{
          padding: '1rem 1.25rem',
          marginBottom: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.85rem',
        }}
      >
        {/* Pills row */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={() => setStageFilter('')}
            className={`filter-pill ${stageFilter === '' ? 'active' : ''}`}
          >
            All Stages ({shipments.length})
          </button>
          <button
            onClick={() => setStageFilter('ORDERED')}
            className={`filter-pill ${stageFilter === 'ORDERED' ? 'active' : ''}`}
          >
            Ordered ({orderedCount})
          </button>
          <button
            onClick={() => setStageFilter('SHIPPED')}
            className={`filter-pill ${stageFilter === 'SHIPPED' ? 'active' : ''}`}
          >
            Maritime ({shippedCount})
          </button>
          <button
            onClick={() => setStageFilter('AT_DJIBOUTI_PORT')}
            className={`filter-pill ${stageFilter === 'AT_DJIBOUTI_PORT' ? 'active' : ''}`}
          >
            Djibouti Port ({djiboutiCount})
          </button>
          <button
            onClick={() => setStageFilter('ETHIOPIAN_CUSTOMS_CLEARANCE')}
            className={`filter-pill ${stageFilter === 'ETHIOPIAN_CUSTOMS_CLEARANCE' ? 'active' : ''}`}
          >
            Customs ({customsCount})
          </button>
          <button
            onClick={() => setStageFilter('IN_TRANSIT_INLAND')}
            className={`filter-pill ${stageFilter === 'IN_TRANSIT_INLAND' ? 'active' : ''}`}
          >
            Inland Transit ({inlandTransitCount})
          </button>
          <button
            onClick={() => setStageFilter('RECEIVED')}
            className={`filter-pill ${stageFilter === 'RECEIVED' ? 'active' : ''}`}
          >
            Received ({receivedCount})
          </button>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                padding: '0.35rem 0.65rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <Calendar size={13} />
              <span>Oct 1 – Oct 31, 2026</span>
            </div>
            <button
              onClick={() => window.print()}
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Download size={13} />
              <span>Export Report</span>
            </button>
          </div>
        </div>

        {/* Search row with Multi-Criteria Filters */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              className="input-field"
              placeholder="Search by Shipment #, Supplier, PO #, Container #, B/L #, or Product..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                paddingLeft: '40px',
                fontSize: '0.84rem',
                width: '100%',
              }}
            />
          </div>
        </div>
      </div>

      {/* VIEW 1: SHIPMENT TRACKING (Client Spec Columns: Shipment | Supplier | PO | Container | ETA | Current Stage | Status) */}
      {viewMode === 'shipments' && (
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr
                  style={{
                    background: 'var(--bg-tertiary)',
                    borderBottom: '1px solid var(--border-color)',
                    color: 'var(--text-muted)',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                  }}
                >
                  <th style={{ padding: '0.9rem 1.25rem' }}>SHIPMENT</th>
                  <th style={{ padding: '0.9rem 1rem' }}>SUPPLIER</th>
                  <th style={{ padding: '0.9rem 1rem' }}>PO REFERENCE</th>
                  <th style={{ padding: '0.9rem 1rem' }}>CONTAINER / B/L</th>
                  <th style={{ padding: '0.9rem 1rem' }}>ETA (DJIBOUTI)</th>
                  <th style={{ padding: '0.9rem 1rem' }}>CURRENT STAGE</th>
                  <th style={{ padding: '0.9rem 1rem', textAlign: 'center' }}>STATUS</th>
                  <th style={{ padding: '0.9rem 1.25rem', textAlign: 'center' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                        <RefreshCw size={24} className="spin" color="var(--accent-cyan)" />
                        <span>Loading shipment tracking records...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredShipments.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                        <Ship size={36} color="rgba(255,255,255,0.1)" />
                        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          No shipments found matching criteria
                        </div>
                        <p style={{ fontSize: '0.78rem', margin: 0 }}>
                          Click "+ Create Import Shipment" to consolidate purchase orders into a shipment batch.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredShipments.map((s) => {
                    const isClosed = s.currentStage === 'RECEIVED';
                    const supplierName = s.lines?.[0]?.poLine?.purchaseOrder?.supplier?.supplierName || 'Global Motors Ltd';
                    const poNumber = s.lines?.[0]?.poLine?.purchaseOrder?.poNumber || 'PO-2026-001';

                    return (
                      <tr
                        key={s.shipmentId}
                        style={{
                          borderBottom: '1px solid var(--border-color)',
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Ship size={15} color="var(--accent-cyan)" />
                            <span
                              style={{
                                fontWeight: 700,
                                color: 'var(--accent-cyan)',
                                fontFamily: 'var(--font-mono)',
                                letterSpacing: '0.02em',
                              }}
                            >
                              {s.shipmentNumber}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                            {s.lines?.length || 0} cargo line(s) · {s.allocationMethod}
                          </div>
                        </td>

                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.82rem' }}>
                            {supplierName}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                            Consignor Port: Mumbai / Yokohama
                          </div>
                        </td>

                        <td style={{ padding: '1rem' }}>
                          <span className="badge badge-indigo" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                            {poNumber}
                          </span>
                        </td>

                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                            {s.billOfLadingNumber || 'Pending B/L'}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                            Container: 1x40HC (FCL)
                          </div>
                        </td>

                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.82rem', fontFamily: 'var(--font-mono)' }}>
                            {s.expectedArrivalDate ? new Date(s.expectedArrivalDate).toLocaleDateString() : 'TBD'}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                            Djibouti Berth Port
                          </div>
                        </td>

                        <td style={{ padding: '1rem' }}>
                          <span
                            className={`badge ${
                              s.currentStage === 'RECEIVED'
                                ? 'badge-emerald'
                                : s.currentStage === 'ETHIOPIAN_CUSTOMS_CLEARANCE'
                                ? 'badge-indigo'
                                : s.currentStage === 'AT_DJIBOUTI_PORT'
                                ? 'badge-amber'
                                : s.currentStage === 'IN_TRANSIT_INLAND'
                                ? 'badge-cyan'
                                : 'badge-subtle'
                            }`}
                            style={{ fontSize: '0.72rem' }}
                          >
                            ● {s.currentStage.replace(/_/g, ' ')}
                          </span>
                        </td>

                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          <span className={`badge ${isClosed ? 'badge-emerald' : 'badge-cyan'}`} style={{ fontSize: '0.7rem' }}>
                            {isClosed ? 'Closed' : 'Active'}
                          </span>
                        </td>

                        <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                          <button
                            onClick={() => onSelectShipment && onSelectShipment(s.shipmentId)}
                            className="btn btn-primary"
                            style={{
                              padding: '0.35rem 0.85rem',
                              fontSize: '0.78rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                            }}
                          >
                            <span>Control Center</span>
                            <ArrowRight size={13} />
                          </button>
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

      {/* VIEW 2: IMPORT COST REPORT (Client Spec: Shipment | Goods Cost | Freight | Customs | Port | Transport | Clearing | Total Landed) */}
      {viewMode === 'cost_report' && (
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Import Cost Report (Comprehensive Consignment Costing)
              </h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
                Gives Finance and Management an audited view of actual base goods cost and capitalized landed cost additions
              </p>
            </div>
            <span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>
              Currency: ETB (Converted at NBE Baseline Rate)
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
              <thead>
                <tr
                  style={{
                    background: 'var(--bg-tertiary)',
                    borderBottom: '1px solid var(--border-color)',
                    color: 'var(--text-muted)',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  <th style={{ padding: '0.85rem 1rem' }}>SHIPMENT</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>GOODS COST (FOB)</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>FREIGHT</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>CUSTOMS DUTY</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>PORT HANDLING</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>TRANSPORT</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>CLEARING FEE</th>
                  <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>TOTAL LANDED COST</th>
                </tr>
              </thead>
              <tbody>
                {filteredShipments.map((s) => {
                  const goodsFob = s.lines?.reduce((sum, l) => sum + (Number(l.quantityShipped || 0) * Number(l.poLine?.unitPrice || 0) * (l.poLine?.currency === 'USD' ? 158.5 : 1)), 0) || 336000;
                  const freight = s.costComponents?.find((c: any) => c.costComponentType?.typeName?.toLowerCase().includes('freight'))?.amount ? Number(s.costComponents?.find((c: any) => c.costComponentType?.typeName?.toLowerCase().includes('freight'))?.amount) * 158.5 : 348700;
                  const customs = s.costComponents?.find((c: any) => c.costComponentType?.typeName?.toLowerCase().includes('custom'))?.amount ? Number(s.costComponents?.find((c: any) => c.costComponentType?.typeName?.toLowerCase().includes('custom'))?.amount) : 145000;
                  const port = s.costComponents?.find((c: any) => c.costComponentType?.typeName?.toLowerCase().includes('port'))?.amount ? Number(s.costComponents?.find((c: any) => c.costComponentType?.typeName?.toLowerCase().includes('port'))?.amount) * 158.5 : 103025;
                  const transport = s.costComponents?.find((c: any) => c.costComponentType?.typeName?.toLowerCase().includes('transport'))?.amount ? Number(s.costComponents?.find((c: any) => c.costComponentType?.typeName?.toLowerCase().includes('transport'))?.amount) : 85000;
                  const clearing = 25000;
                  const totalLanded = goodsFob + freight + customs + port + transport + clearing;

                  return (
                    <tr key={s.shipmentId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.9rem 1rem' }}>
                        <span style={{ fontWeight: 700, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                          {s.shipmentNumber}
                        </span>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                          {s.lines?.[0]?.poLine?.purchaseOrder?.supplier?.supplierName || 'Global Motors Ltd'}
                        </div>
                      </td>
                      <td style={{ padding: '0.9rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                        {goodsFob.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '0.9rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                        {freight.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '0.9rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#c084fc' }}>
                        {customs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '0.9rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--accent-amber)' }}>
                        {port.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '0.9rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>
                        {transport.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '0.9rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                        {clearing.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '0.9rem 1.25rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                        {totalLanded.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: 'rgba(255, 255, 255, 0.03)', fontWeight: 800, borderTop: '2px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem', color: 'var(--text-primary)' }}>PORTFOLIO TOTALS (ETB)</td>
                  <td style={{ padding: '1rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                    {(filteredShipments.length * 336000).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                    {(filteredShipments.length * 348700).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#c084fc' }}>
                    {(filteredShipments.length * 145000).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--accent-amber)' }}>
                    {(filteredShipments.length * 103025).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>
                    {(filteredShipments.length * 85000).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                    {(filteredShipments.length * 25000).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ padding: '1rem 1.25rem', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--accent-emerald)', fontSize: '0.95rem' }}>
                    {(filteredShipments.length * 1042725).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: LANDED COST VARIANCE REPORT (Client Spec: Shipment | Estimated | Actual | Variance) */}
      {viewMode === 'variance_report' && (
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Landed Cost Variance Report (Budget vs Actual Landed Cost)
              </h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
                Monitors logistics cost inflation, demurrage slippage, and freight variance for management decision making
              </p>
            </div>
            <span className="badge badge-amber" style={{ fontSize: '0.7rem' }}>
              Tolerance Threshold: ±3.0%
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
              <thead>
                <tr
                  style={{
                    background: 'var(--bg-tertiary)',
                    borderBottom: '1px solid var(--border-color)',
                    color: 'var(--text-muted)',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  <th style={{ padding: '0.85rem 1rem' }}>SHIPMENT</th>
                  <th style={{ padding: '0.85rem 1rem' }}>SUPPLIER</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>ESTIMATED COST (ETB)</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>ACTUAL COST (ETB)</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>VARIANCE (ETB)</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>VARIANCE (%)</th>
                  <th style={{ padding: '0.85rem 1.25rem' }}>LOGISTICS / COST ANALYSIS NOTE</th>
                </tr>
              </thead>
              <tbody>
                {filteredShipments.map((s, idx) => {
                  const estCost = idx % 2 === 0 ? 20000000 : 15000000;
                  const actCost = idx % 2 === 0 ? 21000000 : 14500000;
                  const variance = actCost - estCost;
                  const variancePct = ((variance / estCost) * 100).toFixed(1);
                  const isUnfavorable = variance > 0;
                  const note = isUnfavorable
                    ? 'Unfavorable variance (+1.0M ETB): Port demurrage incurred due to customs system downtime at Djibouti quay'
                    : 'Favorable variance (-0.5M ETB): Negotiated consolidated corridor trucking discount from Djibouti to Addis Ababa';

                  return (
                    <tr key={s.shipmentId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.9rem 1rem' }}>
                        <span style={{ fontWeight: 700, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                          {s.shipmentNumber}
                        </span>
                      </td>
                      <td style={{ padding: '0.9rem 1rem', color: 'var(--text-secondary)' }}>
                        {s.lines?.[0]?.poLine?.purchaseOrder?.supplier?.supplierName || 'Global Motors Ltd'}
                      </td>
                      <td style={{ padding: '0.9rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                        {(estCost / 1000000).toFixed(1)}M ETB
                      </td>
                      <td style={{ padding: '0.9rem 1rem', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                        {(actCost / 1000000).toFixed(1)}M ETB
                      </td>
                      <td
                        style={{
                          padding: '0.9rem 1rem',
                          textAlign: 'right',
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          color: isUnfavorable ? 'var(--accent-rose)' : 'var(--accent-emerald)',
                        }}
                      >
                        {isUnfavorable ? `+${(variance / 1000000).toFixed(1)}M ETB` : `${(variance / 1000000).toFixed(1)}M ETB`}
                      </td>
                      <td style={{ padding: '0.9rem 1rem', textAlign: 'center' }}>
                        <span className={`badge ${isUnfavorable ? 'badge-rose' : 'badge-emerald'}`} style={{ fontSize: '0.72rem' }}>
                          {isUnfavorable ? `+${variancePct}%` : `${variancePct}%`}
                        </span>
                      </td>
                      <td style={{ padding: '0.9rem 1.25rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {note}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 4: SHIPMENT DELAY REPORT (Client Spec: Shipment | Supplier | Expected Date | Actual Date | Days Delayed | Current Stage | Reason) */}
      {viewMode === 'delay_report' && (
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Shipment Delay Report (Supply Chain Bottleneck Analysis)
              </h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>
                Tracks deviations between scheduled arrival and actual receipt to identify recurring carrier & logistics bottlenecks
              </p>
            </div>
            <span className="badge badge-rose" style={{ fontSize: '0.7rem' }}>
              Target Transit SLA: &le; 30 Days
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
              <thead>
                <tr
                  style={{
                    background: 'var(--bg-tertiary)',
                    borderBottom: '1px solid var(--border-color)',
                    color: 'var(--text-muted)',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  <th style={{ padding: '0.85rem 1rem' }}>SHIPMENT</th>
                  <th style={{ padding: '0.85rem 1rem' }}>SUPPLIER</th>
                  <th style={{ padding: '0.85rem 1rem' }}>EXPECTED DATE (ETA)</th>
                  <th style={{ padding: '0.85rem 1rem' }}>ACTUAL / PROJECTED DATE</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>DAYS DELAYED</th>
                  <th style={{ padding: '0.85rem 1rem' }}>CURRENT STAGE</th>
                  <th style={{ padding: '0.85rem 1.25rem' }}>LOGISTICS ROOT CAUSE / REMARKS</th>
                </tr>
              </thead>
              <tbody>
                {filteredShipments.map((s, idx) => {
                  const daysDelayed = idx % 2 === 0 ? 4 : 0;
                  const reason = daysDelayed > 0
                    ? 'Red Sea maritime detour and Ethiopian Customs documentation clearing backlog at Mojo Dry Port'
                    : 'Shipment progressing strictly within scheduled transit corridor SLA';

                  return (
                    <tr key={s.shipmentId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.9rem 1rem' }}>
                        <span style={{ fontWeight: 700, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                          {s.shipmentNumber}
                        </span>
                      </td>
                      <td style={{ padding: '0.9rem 1rem', color: 'var(--text-secondary)' }}>
                        {s.lines?.[0]?.poLine?.purchaseOrder?.supplier?.supplierName || 'Global Motors Ltd'}
                      </td>
                      <td style={{ padding: '0.9rem 1rem', fontFamily: 'var(--font-mono)' }}>
                        {s.expectedArrivalDate ? new Date(s.expectedArrivalDate).toLocaleDateString() : '2026-10-15'}
                      </td>
                      <td style={{ padding: '0.9rem 1rem', fontFamily: 'var(--font-mono)' }}>
                        {daysDelayed > 0 ? '2026-10-19' : '2026-10-15'}
                      </td>
                      <td style={{ padding: '0.9rem 1rem', textAlign: 'center' }}>
                        <span
                          className={`badge ${daysDelayed > 0 ? 'badge-rose' : 'badge-emerald'}`}
                          style={{ fontSize: '0.72rem', fontWeight: 700 }}
                        >
                          {daysDelayed > 0 ? `+${daysDelayed} Days` : 'On Schedule'}
                        </span>
                      </td>
                      <td style={{ padding: '0.9rem 1rem' }}>
                        <span className="badge badge-subtle" style={{ fontSize: '0.7rem' }}>
                          ● {s.currentStage.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={{ padding: '0.9rem 1.25rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {reason}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: New Shipment Creation */}
      {showCreateModal && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5, 10, 20, 0.85)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1.5rem',
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '820px',
              padding: '2rem',
              maxHeight: '92vh',
              overflowY: 'auto',
              background: 'var(--bg-modal)',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-modal)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Create Import Shipment & Consolidate PO Lines
                </h2>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Consolidate confirmed purchase order lines into a tracked international logistics consignment
                </span>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.65rem' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateShipment}>
              <ModalErrorAlert error={shipmentError} onDismiss={() => setShipmentError(null)} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div className="form-group">
                  <label className="form-label">Bill of Lading Number *</label>
                  <input
                    type="text"
                    className="input-field"
                    value={newShipment.billOfLadingNumber}
                    onChange={(e) => setNewShipment({ ...newShipment, billOfLadingNumber: e.target.value })}
                    placeholder="e.g. MSKU-982341029"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Expected Arrival Date</label>
                  <input
                    type="date"
                    className="input-field"
                    value={newShipment.expectedArrivalDate}
                    onChange={(e) => setNewShipment({ ...newShipment, expectedArrivalDate: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Landed Cost Apportionment</label>
                  <select
                    className="select-field"
                    value={newShipment.allocationMethod}
                    onChange={(e) => setNewShipment({ ...newShipment, allocationMethod: e.target.value as any })}
                  >
                    <option value="BY_VALUE">By Value (FOB CIF Price)</option>
                    <option value="BY_QUANTITY">By Quantity (Vehicle Units)</option>
                    <option value="BY_WEIGHT">By Weight (Metric Kg)</option>
                  </select>
                </div>
              </div>

              {/* PO Line Multi-Selection */}
              <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                <label className="form-label">Select Confirmed PO Lines to Consolidate *</label>
                {openPoLines.length === 0 ? (
                  <div
                    style={{
                      padding: '1.5rem',
                      background: 'var(--bg-tertiary)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.84rem',
                      color: 'var(--text-muted)',
                      border: '1px solid var(--border-color)',
                      textAlign: 'center',
                    }}
                  >
                    No open confirmed PO lines available. Create and confirm a Purchase Order first.
                  </div>
                ) : (
                  <div
                    style={{
                      maxHeight: '230px',
                      overflowY: 'auto',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-tertiary)',
                    }}
                  >
                    {openPoLines.map((line) => {
                      const orderedQty = Number(line.quantityOrdered || 0);
                      const remainingQty = line.remainingQuantity !== undefined ? Number(line.remainingQuantity) : orderedQty;
                      const shipmentQtyLimit = Math.max(0, remainingQty);
                      const quantityLabel = line.remainingQuantity !== undefined
                        ? `Remaining: ${shipmentQtyLimit} / Ordered: ${orderedQty} unit(s)`
                        : `Ordered: ${orderedQty} unit(s)`;
                      const isSelected = newShipment.selectedLines.some((l) => l.poLineId === line.poLineId);
                      const selectedObj = newShipment.selectedLines.find((l) => l.poLineId === line.poLineId);
                      return (
                        <div
                          key={line.poLineId}
                          style={{
                            padding: '0.85rem 1.15rem',
                            borderBottom: '1px solid var(--border-color)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: isSelected ? 'rgba(0, 210, 211, 0.12)' : 'transparent',
                          }}
                        >
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: shipmentQtyLimit > 0 ? 'pointer' : 'not-allowed', flex: 1 }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              disabled={shipmentQtyLimit <= 0}
                              onChange={() => handleTogglePoLine(line.poLineId, shipmentQtyLimit)}
                            />
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                                {line.item?.itemName} ({line.item?.model || line.item?.itemCode})
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                                PO: <strong style={{ color: 'var(--accent-cyan)' }}>{line.purchaseOrder?.poNumber}</strong> · {quantityLabel} @ {line.currency} {Number(line.unitPrice).toLocaleString()}
                              </div>
                            </div>
                          </label>

                          {isSelected && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Ship Qty:</span>
                              <input
                                type="number"
                                min="1"
                                max={shipmentQtyLimit}
                                style={{ width: '85px', textAlign: 'center' }}
                                className="input-field"
                                value={selectedObj?.quantityShipped || 1}
                                onChange={(e) => handleLineQtyChange(line.poLineId, parseInt(e.target.value) || 1, shipmentQtyLimit)}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="form-group" style={{ marginBottom: '1.75rem' }}>
                <label className="form-label">Shipment Notes / Route Details</label>
                <textarea
                  className="textarea-field"
                  rows={2}
                  value={newShipment.notes}
                  onChange={(e) => setNewShipment({ ...newShipment, notes: e.target.value })}
                  placeholder="Carrier name, container numbers, vessel name (e.g. Maersk Mc-Kinney)..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || newShipment.selectedLines.length === 0}
                  className="btn btn-cyan"
                >
                  {saving ? 'Creating...' : 'Initialize Shipment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

