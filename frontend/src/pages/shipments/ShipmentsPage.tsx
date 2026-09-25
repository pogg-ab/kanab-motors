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

interface ShipmentsPageProps {
  onSelectShipment?: (shipmentId: string) => void;
}

export const ShipmentsPage: React.FC<ShipmentsPageProps> = ({ onSelectShipment }) => {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [openPoLines, setOpenPoLines] = useState<PurchaseOrderLine[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [stageFilter, setStageFilter] = useState<string>('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

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
      showToast('error', err.message || 'Failed to load shipments');
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
    if (newShipment.selectedLines.length === 0) {
      showToast('error', 'Select at least one PO line for this shipment');
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
      showToast('error', err.message || 'Failed to create shipment');
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

  // Stage Analytics
  const activeCount = shipments.filter((s) => s.currentStage !== 'RECEIVED').length;
  const orderedCount = shipments.filter((s) => s.currentStage === 'ORDERED').length;
  const shippedCount = shipments.filter((s) => s.currentStage === 'SHIPPED').length;
  const djiboutiCount = shipments.filter((s) => s.currentStage === 'AT_DJIBOUTI_PORT').length;
  const customsCount = shipments.filter((s) => s.currentStage === 'ETHIOPIAN_CUSTOMS_CLEARANCE').length;
  const inlandTransitCount = shipments.filter((s) => s.currentStage === 'IN_TRANSIT_INLAND').length;
  const receivedCount = shipments.filter((s) => s.currentStage === 'RECEIVED').length;

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
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-cyan"
            style={{ fontSize: '0.85rem', padding: '0.55rem 1.15rem' }}
          >
            <Plus size={16} />
            <span>Create Import Shipment</span>
          </button>
        </div>
      </div>

      {/* 4 Executive Metric Cards Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        {/* Metric 1 */}
        <div
          className="glass-panel"
          style={{
            padding: '1.15rem 1.25rem',
            borderLeft: '3px solid var(--accent-cyan)',
            background: 'rgba(19, 27, 46, 0.7)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>
              TOTAL ACTIVE IN-TRANSIT
            </span>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                background: 'rgba(0, 210, 211, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-cyan)',
              }}
            >
              <Ship size={16} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {activeCount}
            </div>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>
              Shipments
            </span>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>+12% MoM</span> · FOB / Freight Dominant
          </div>
        </div>

        {/* Metric 2 */}
        <div
          className="glass-panel"
          style={{
            padding: '1.15rem 1.25rem',
            borderLeft: '3px solid var(--accent-amber)',
            background: 'rgba(19, 27, 46, 0.7)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>
              AT PORT OF DJIBOUTI
            </span>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                background: 'rgba(245, 158, 11, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-amber)',
              }}
            >
              <Anchor size={16} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--accent-amber)' }}>
              {djiboutiCount}
            </div>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--accent-amber)' }}>
              Shipments
            </span>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Avg Dwell: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>4.2d</span> · Demurrage Buffer: 3.8d
          </div>
        </div>

        {/* Metric 3 */}
        <div
          className="glass-panel"
          style={{
            padding: '1.15rem 1.25rem',
            borderLeft: '3px solid var(--accent-indigo)',
            background: 'rgba(19, 27, 46, 0.7)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>
              CUSTOMS (MOJO DRY PORT)
            </span>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                background: 'rgba(99, 102, 241, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-indigo)',
              }}
            >
              <FileCheck size={16} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <div style={{ fontSize: '1.9rem', fontWeight: 800, color: '#a5b4fc' }}>
              {customsCount}
            </div>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#a5b4fc' }}>
              Shipments
            </span>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            ECC Declaration 84102-A · <span style={{ color: 'var(--text-primary)' }}>28% Landed Tax Est.</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div
          className="glass-panel"
          style={{
            padding: '1.15rem 1.25rem',
            borderLeft: '3px solid var(--accent-emerald)',
            background: 'rgba(19, 27, 46, 0.7)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>
              INLAND HIGHWAY HAULAGE
            </span>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                background: 'rgba(16, 185, 129, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-emerald)',
              }}
            >
              <Truck size={16} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
              {inlandTransitCount}
            </div>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--accent-emerald)' }}>
              Convoys
            </span>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>GPS Live Tracking</span> · ETA Kality Yard: 18h
          </div>
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
              background: 'rgba(15, 23, 42, 0.6)',
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
              background: 'rgba(15, 23, 42, 0.6)',
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
              background: 'rgba(15, 23, 42, 0.6)',
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
              background: 'rgba(15, 23, 42, 0.6)',
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

      {/* Middle Grid: Live Djibouti-Mojo Freight Stream & Landed Cost Engine Rates */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Left: Freight Stream */}
        <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Compass size={16} color="var(--accent-cyan)" />
              <h4 style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Live Djibouti – Mojo Corridor Freight Stream
              </h4>
            </div>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Refreshed: 32s ago</span>
          </div>

          <div
            style={{
              height: '110px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.12), rgba(99, 102, 241, 0.08))',
              border: '1px solid rgba(0, 210, 211, 0.2)',
              padding: '0.85rem 1.15rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Primary Vessel</span>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>MAERSK MC-KINNEY MOLLER</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Coordinates</span>
                <div style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--accent-cyan)' }}>11.588° N, 43.145° E</div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.5rem' }}>
              <span className="badge badge-cyan" style={{ fontSize: '0.68rem' }}>
                Red Sea Transit: Normal
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                Port doraleh berth: <strong style={{ color: 'var(--text-primary)' }}>Berth #4</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Right: Landed Cost Engine Rates */}
        <div className="glass-panel" style={{ padding: '1.25rem 1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <h4 style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              Landed Cost Engine Rates
            </h4>
            <Sliders size={14} color="var(--text-muted)" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>NBE Customs FX Rate:</span>
              <span style={{ fontWeight: 700, color: 'var(--accent-cyan)', fontFamily: 'monospace' }}>125.00 ETB / USD</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Total Demurrage Risk:</span>
              <span style={{ fontWeight: 700, color: 'var(--accent-amber)', fontFamily: 'monospace' }}>$3,450.00 USD</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Avg Duty Multiplier:</span>
              <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace' }}>1.382x CIF</span>
            </div>
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>30-Day Port Cleared Trend</span>
              <span style={{ color: 'var(--accent-emerald)', fontWeight: 600 }}>+18.4% velocity</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar & Quick Stage Pills */}
      <div
        className="glass-panel"
        style={{
          padding: '0.85rem 1.25rem',
          marginBottom: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}
      >
        {/* Pills row */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={() => setStageFilter('')}
            className={`filter-pill ${stageFilter === '' ? 'active' : ''}`}
          >
            All ({shipments.length})
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
            Djibouti ({djiboutiCount})
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
            Inland ({inlandTransitCount})
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
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Download size={13} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Search row */}
        <div style={{ position: 'relative', width: '100%' }}>
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
            placeholder="Filter by shipment ref, vessel name, BL number, container id, or consignee..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              paddingLeft: '40px',
              fontSize: '0.84rem',
              background: 'rgba(11, 15, 25, 0.75)',
            }}
          />
        </div>
      </div>

      {/* Shipment Master Table */}
      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr
                style={{
                  background: 'rgba(13, 19, 34, 0.95)',
                  borderBottom: '1px solid var(--border-color)',
                  color: 'var(--text-muted)',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                <th style={{ padding: '0.9rem 1.25rem' }}>SHIPMENT REF</th>
                <th style={{ padding: '0.9rem 1rem' }}>BILL OF LADING / CARRIER</th>
                <th style={{ padding: '0.9rem 1rem' }}>ORIGIN & ROUTE DEST</th>
                <th style={{ padding: '0.9rem 1rem' }}>CURRENT STAGE</th>
                <th style={{ padding: '0.9rem 1rem' }}>CARGO LINES</th>
                <th style={{ padding: '0.9rem 1rem', textAlign: 'center' }}>ALLOCATION</th>
                <th style={{ padding: '0.9rem 1.25rem', textAlign: 'center' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                      <RefreshCw size={24} className="spin" color="var(--accent-cyan)" />
                      <span>Loading shipment records...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredShipments.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
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
                filteredShipments.map((s) => (
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
                        ETA: {s.expectedArrivalDate ? new Date(s.expectedArrivalDate).toLocaleDateString() : 'TBD'}
                      </div>
                    </td>

                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                        {s.billOfLadingNumber || 'Pending B/L'}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        Maersk Line • 40ft HC
                      </div>
                    </td>

                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.82rem' }}>
                        Yokohama, JP ➔ Mojo, ET
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        Vessel: Maersk Mc-Kinney
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

                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {s.lines?.length || 0} PO Lines
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        {s.costComponents?.length || 0} Cost Vouchers
                      </div>
                    </td>

                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <span className="badge badge-subtle" style={{ fontSize: '0.68rem' }}>
                        {s.allocationMethod}
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: New Shipment Creation */}
      {showCreateModal && (
        <div
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
              border: '1px solid rgba(0, 210, 211, 0.3)',
              boxShadow: '0 25px 60px -10px rgba(0,0,0,0.9), 0 0 30px -5px rgba(0, 210, 211, 0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Create Import Shipment & Consolidate PO Lines
                </h2>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Stories S1–S2: Link confirmed PO lines into a tracked international logistics batch
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
                      background: 'rgba(15, 23, 42, 0.6)',
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
                      background: 'rgba(11, 15, 25, 0.6)',
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
                            background: isSelected ? 'rgba(0, 210, 211, 0.08)' : 'transparent',
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

