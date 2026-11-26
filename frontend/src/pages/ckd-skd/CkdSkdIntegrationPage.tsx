import React, { useEffect, useState } from 'react';
import {
  Layers,
  PackageCheck,
  ShieldCheck,
  ArrowRightLeft,
  Cpu,
  GitBranch,
  Activity,
  Plus,
  CheckCircle2,
  AlertTriangle,
  X,
  RefreshCw,
  Warehouse as WarehouseIcon,
} from 'lucide-react';
import { api, ProductItem, Shipment } from '../../api/client';
import { formatApiError } from '../../utils/error';

type TabKey = 'batches' | 'customs' | 'transfer' | 'serials' | 'bom' | 'events';

export const CkdSkdIntegrationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('batches');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Core data
  const [mapping, setMapping] = useState<any>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [availableReceipts, setAvailableReceipts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [clearances, setClearances] = useState<any[]>([]);
  const [outstandingClearances, setOutstandingClearances] = useState<any[]>([]);
  const [serials, setSerials] = useState<any[]>([]);
  const [boms, setBoms] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [items, setItems] = useState<ProductItem[]>([]);

  // Modals / Forms
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchForm, setBatchForm] = useState({
    batchCode: '',
    shipmentId: '',
    kitType: 'CKD',
    itemId: '',
    plannedQuantity: 100,
    batchDate: new Date().toISOString().slice(0, 10),
    remarks: '',
  });

  const [showLinkReceiptModal, setShowLinkReceiptModal] = useState(false);
  const [linkForm, setLinkForm] = useState({
    batchId: '',
    receiptId: '',
    receivedQuantity: 1,
  });

  const [showClearanceModal, setShowClearanceModal] = useState(false);
  const [clearanceForm, setClearanceForm] = useState({
    declarationNumber: '',
    clearanceDate: new Date().toISOString().slice(0, 10),
    batchId: '',
    batchReceiptId: '',
    clearedQuantity: 1,
    documentReference: '',
    remarks: '',
    autoSubmit: true,
  });

  const [transferForm, setTransferForm] = useState({
    batchReceiptId: '',
    toWarehouseId: '',
    quantity: 1,
  });

  const [serialForm, setSerialForm] = useState({
    batchId: '',
    batchReceiptId: '',
    serialType: 'MOTOR',
    bulkText: '',
    sourceType: 'IMPORT',
  });

  const [showBomModal, setShowBomModal] = useState(false);
  const [bomForm, setBomForm] = useState({
    bomCode: '',
    itemId: '',
    version: '1.0',
    notes: '',
    componentItemId: '',
    requiredQuantity: 1,
    isSerialized: true,
    serialType: 'MOTOR',
  });
  const [bomLinesDraft, setBomLinesDraft] = useState<
    Array<{ componentItemId: string; componentName: string; requiredQuantity: number; isSerialized: boolean; serialType: string }>
  >([]);

  const [eligibilityItemId, setEligibilityItemId] = useState('');
  const [eligibilityReqQty, setEligibilityReqQty] = useState(1);
  const [eligibilityResult, setEligibilityResult] = useState<any>(null);

  const loadAll = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [mapRes, batchRes, recRes, whRes, clrRes, outRes, serRes, bomRes, evtRes, shpRes, itemRes] =
        await Promise.all([
          api.getCkdSkdMappingSummary().catch(() => null),
          api.getCkdSkdBatches().catch(() => []),
          api.getCkdSkdAvailableReceipts().catch(() => []),
          api.getCkdSkdWarehouses().catch(() => []),
          api.getCustomsClearances().catch(() => []),
          api.getOutstandingCustomsClearances().catch(() => []),
          api.getCkdSkdSerials().catch(() => []),
          api.getBoms().catch(() => []),
          api.getCkdSkdIntegrationEvents().catch(() => []),
          api.getShipments().catch(() => []),
          api.getItems({ limit: 500 }).catch(() => ({ items: [] })),
        ]);
      setMapping(mapRes);
      setBatches(batchRes);
      setAvailableReceipts(recRes);
      setWarehouses(whRes);
      setClearances(clrRes);
      setOutstandingClearances(outRes);
      setSerials(serRes);
      setBoms(bomRes);
      setEvents(evtRes);
      setShipments(Array.isArray(shpRes) ? shpRes : (shpRes as any)?.items || []);
      setItems((itemRes as any)?.items || []);
    } catch (err) {
      setErrorMsg(formatApiError(err, 'Failed to load CKD/SKD integration data'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const flashSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await api.createCkdSkdBatch({
        ...batchForm,
        plannedQuantity: Number(batchForm.plannedQuantity),
      });
      setShowBatchModal(false);
      setBatchForm({ ...batchForm, batchCode: '', remarks: '' });
      flashSuccess('CKD/SKD Batch created and linked to shipment.');
      await loadAll();
    } catch (err) {
      setErrorMsg(formatApiError(err, 'Failed to create CKD/SKD batch'));
    }
  };

  const handleLinkReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await api.linkCkdSkdBatchReceipt({
        batchId: linkForm.batchId,
        receiptId: linkForm.receiptId,
        receivedQuantity: Number(linkForm.receivedQuantity),
      });
      setShowLinkReceiptModal(false);
      flashSuccess('Goods receipt linked to CKD/SKD batch and CKD_SKD_RECEIPT_CONFIRMED event emitted.');
      await loadAll();
    } catch (err) {
      setErrorMsg(formatApiError(err, 'Failed to link goods receipt'));
    }
  };

  const handleUpdateWarehouseClass = async (warehouseId: number, classification: string) => {
    setErrorMsg(null);
    try {
      await api.updateWarehouseClassification(warehouseId, classification);
      flashSuccess(`Warehouse #${warehouseId} classification updated to ${classification}.`);
      await loadAll();
    } catch (err) {
      setErrorMsg(formatApiError(err, 'Failed to update warehouse classification'));
    }
  };

  const handleCreateClearance = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await api.createCustomsClearance({
        declarationNumber: clearanceForm.declarationNumber,
        clearanceDate: clearanceForm.clearanceDate,
        documentReference: clearanceForm.documentReference,
        remarks: clearanceForm.remarks,
        autoSubmit: clearanceForm.autoSubmit,
        lines: [
          {
            batchId: clearanceForm.batchId,
            batchReceiptId: clearanceForm.batchReceiptId,
            clearedQuantity: Number(clearanceForm.clearedQuantity),
          },
        ],
      });
      setShowClearanceModal(false);
      setClearanceForm({ ...clearanceForm, declarationNumber: '', remarks: '' });
      flashSuccess('Customs clearance declaration recorded.');
      await loadAll();
    } catch (err) {
      setErrorMsg(formatApiError(err, 'Failed to create customs clearance'));
    }
  };

  const handleApproveClearance = async (id: string) => {
    setErrorMsg(null);
    try {
      await api.approveCustomsClearance(id);
      flashSuccess('Customs clearance approved! Cleared quantities are now eligible for Production Warehouse transfer.');
      await loadAll();
    } catch (err) {
      setErrorMsg(formatApiError(err, 'Failed to approve clearance'));
    }
  };

  const handleTransferToProduction = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      const res = await api.transferClearedToProduction({
        batchReceiptId: transferForm.batchReceiptId,
        toWarehouseId: Number(transferForm.toWarehouseId),
        quantity: Number(transferForm.quantity),
      });
      flashSuccess(`Transferred ${res.transferredQuantity} customs-released units to Production Warehouse (${res.transfer?.transferNumber}).`);
      await loadAll();
    } catch (err) {
      setErrorMsg(formatApiError(err, 'Transfer blocked'));
    }
  };

  const handleRegisterSerials = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const lines = serialForm.bulkText
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      setErrorMsg('Please enter at least one serial number (one per line or comma-separated).');
      return;
    }
    try {
      await api.registerCkdSkdSerials({
        batchId: serialForm.batchId,
        batchReceiptId: serialForm.batchReceiptId || undefined,
        sourceType: serialForm.sourceType,
        serials: lines.map((num) => ({
          serialType: serialForm.serialType,
          serialNumber: num,
        })),
      });
      setSerialForm({ ...serialForm, bulkText: '' });
      flashSuccess(`Registered ${lines.length} ${serialForm.serialType} serial number(s) with duplicate validation.`);
      await loadAll();
    } catch (err) {
      setErrorMsg(formatApiError(err, 'Failed to register serial numbers'));
    }
  };

  const handleAddBomLineDraft = () => {
    if (!bomForm.componentItemId) return;
    const comp = items.find((i) => String(i.itemId) === String(bomForm.componentItemId));
    setBomLinesDraft((prev) => [
      ...prev,
      {
        componentItemId: bomForm.componentItemId,
        componentName: comp ? `${comp.itemCode} — ${comp.itemName}` : bomForm.componentItemId,
        requiredQuantity: Number(bomForm.requiredQuantity),
        isSerialized: bomForm.isSerialized,
        serialType: bomForm.isSerialized ? bomForm.serialType : '',
      },
    ]);
  };

  const handleCreateBom = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (bomLinesDraft.length === 0) {
      setErrorMsg('Add at least one component line to the BOM.');
      return;
    }
    try {
      await api.createBom({
        bomCode: bomForm.bomCode || undefined,
        itemId: bomForm.itemId,
        version: bomForm.version,
        notes: bomForm.notes,
        lines: bomLinesDraft.map((l) => ({
          componentItemId: l.componentItemId,
          requiredQuantity: l.requiredQuantity,
          isSerialized: l.isSerialized,
          serialType: l.serialType || undefined,
        })),
      });
      setShowBomModal(false);
      setBomLinesDraft([]);
      flashSuccess('Vehicle BOM created and integrated with Product Master.');
      await loadAll();
    } catch (err) {
      setErrorMsg(formatApiError(err, 'Failed to create BOM'));
    }
  };

  const handleCheckEligibility = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!eligibilityItemId) return;
    try {
      const res = await api.validateProductionEligibility({
        itemId: eligibilityItemId,
        requestedQuantity: Number(eligibilityReqQty),
      });
      setEligibilityResult(res);
    } catch (err) {
      setErrorMsg(formatApiError(err, 'Failed to validate production eligibility'));
    }
  };

  const productionWarehouses = warehouses.filter(
    (w) => w.warehouseClassification === 'PRODUCTION' || w.warehouseClassification === 'SATELLITE_STORE',
  );

  return (
    <div style={{ padding: '1.5rem 2rem', maxWidth: '1480px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <div style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Work Package 1 · Import & Inventory Integration
          </div>
          <h1 style={{ margin: '0.2rem 0 0.25rem', fontSize: '1.55rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            CKD/SKD Import, Customs Clearance & Assembly Sync
          </h1>
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Traceability from Import Shipment → Bonded Warehouse → Partial/Full Customs Clearance → Production Warehouse → BOM & Serial Eligibility.
          </p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={loadAll} disabled={loading} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem', marginBottom: '1.25rem' }}>
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>CKD/SKD BATCHES</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-cyan)', marginTop: '0.25rem' }}>{batches.length}</div>
        </div>
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>CUSTOMS CLEARANCES</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-amber)', marginTop: '0.25rem' }}>{clearances.length}</div>
        </div>
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>REGISTERED SERIALS</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: '0.25rem' }}>{serials.length}</div>
        </div>
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>ACTIVE BOMS</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.25rem' }}>{boms.length}</div>
        </div>
        <div className="card" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>INTEGRATION EVENTS</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#a855f7', marginTop: '0.25rem' }}>{events.length}</div>
        </div>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.4)', color: '#f87171', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
            <AlertTriangle size={16} /> {errorMsg}
          </span>
          <button onClick={() => setErrorMsg(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}><X size={15} /></button>
        </div>
      )}
      {successMsg && (
        <div style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.4)', color: '#34d399', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
            <CheckCircle2 size={16} /> {successMsg}
          </span>
          <button onClick={() => setSuccessMsg(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}><X size={15} /></button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
        {[
          { key: 'batches', label: '1. Batches & Receipts', icon: Layers },
          { key: 'customs', label: '2. Customs & Bonded Control', icon: ShieldCheck },
          { key: 'transfer', label: '3. Release to Production', icon: ArrowRightLeft },
          { key: 'serials', label: '4. VIN & Component Serials', icon: Cpu },
          { key: 'bom', label: '5. BOM & Stock Eligibility', icon: GitBranch },
          { key: 'events', label: '6. Integration Events & Map', icon: Activity },
        ].map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.key;
          return (
            <button
              key={t.key}
              className={`btn btn-sm ${active ? 'btn-cyan' : 'btn-secondary'}`}
              onClick={() => setActiveTab(t.key as TabKey)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}
            >
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: BATCHES & RECEIPTS */}
      {activeTab === 'batches' && (
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>CKD/SKD Batches & Goods Receipt Traceability</h3>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Supports multiple batches per shipment and partial/multiple goods receipts per batch.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowLinkReceiptModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <PackageCheck size={14} /> Link Goods Receipt
              </button>
              <button className="btn btn-cyan btn-sm" onClick={() => setShowBatchModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <Plus size={14} /> New CKD/SKD Batch
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.72rem' }}>BATCH CODE</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.72rem' }}>TYPE</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.72rem' }}>SHIPMENT</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.72rem' }}>PRODUCT / MODEL</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.72rem', textAlign: 'right' }}>PLANNED</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.72rem', textAlign: 'right' }}>RECEIVED</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.72rem', textAlign: 'right' }}>CLEARED</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.72rem', textAlign: 'right' }}>IN PRODUCTION</th>
                </tr>
              </thead>
              <tbody>
                {batches.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No CKD/SKD batches created yet. Click "+ New CKD/SKD Batch" to start.
                    </td>
                  </tr>
                ) : (
                  batches.map((b) => (
                    <tr key={b.batchId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>{b.batchCode}</td>
                      <td style={{ padding: '0.75rem 1rem' }}><span className="badge badge-subtle">{b.kitType}</span></td>
                      <td style={{ padding: '0.75rem 1rem' }}>{b.shipment?.shipmentNumber || b.shipmentId}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>{b.item?.itemCode} — {b.item?.itemName}</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600 }}>{b.summary?.plannedQuantity}</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, color: 'var(--accent-cyan)' }}>{b.summary?.totalReceived}</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, color: 'var(--accent-amber)' }}>{b.summary?.totalCleared}</td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, color: 'var(--accent-emerald)' }}>{b.summary?.totalTransferredToProduction}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: CUSTOMS CLEARANCE & BONDED WAREHOUSE CONTROL */}
      {activeTab === 'customs' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Warehouse Classifications */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <WarehouseIcon size={16} color="var(--accent-cyan)" /> Warehouse Classifications (Bonded vs Production Eligibility)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem' }}>
              {warehouses.map((w) => (
                <div key={w.warehouseId} style={{ background: 'rgba(15,23,42,0.5)', padding: '0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{w.warehouseName}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Type: {w.warehouseType}</div>
                  </div>
                  <select
                    className="input"
                    style={{ width: '165px', fontSize: '0.75rem', padding: '0.35rem 0.5rem' }}
                    value={w.warehouseClassification || 'STANDARD'}
                    onChange={(e) => handleUpdateWarehouseClass(w.warehouseId, e.target.value)}
                  >
                    <option value="BONDED">BONDED (Locked)</option>
                    <option value="CUSTOMS_RELEASED">CUSTOMS_RELEASED</option>
                    <option value="PRODUCTION">PRODUCTION (Eligible)</option>
                    <option value="SATELLITE_STORE">SATELLITE_STORE (Eligible)</option>
                    <option value="FINISHED_GOODS">FINISHED_GOODS</option>
                    <option value="STANDARD">STANDARD</option>
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Customs Clearances Table */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Customs Clearance Declarations (Partial & Full)</h3>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Only approved cleared quantities are eligible for transfer to Production Warehouse.
                </p>
              </div>
              <button className="btn btn-cyan btn-sm" onClick={() => setShowClearanceModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <Plus size={14} /> Record Customs Clearance
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.72rem' }}>DECLARATION #</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.72rem' }}>DATE</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.72rem' }}>BATCHES & QUANTITIES</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.72rem', textAlign: 'center' }}>STATUS</th>
                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.72rem', textAlign: 'center' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {clearances.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        No customs clearance declarations recorded yet.
                      </td>
                    </tr>
                  ) : (
                    clearances.map((c) => (
                      <tr key={c.clearanceId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>{c.declarationNumber}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>{c.clearanceDate || '—'}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          {(c.lines || []).map((l: any) => (
                            <div key={l.clearanceLineId} style={{ fontSize: '0.78rem' }}>
                              <strong>{l.batch?.batchCode}</strong>: {l.clearedQuantity} units {l.isReversed ? '(REVERSED)' : ''}
                            </div>
                          ))}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                          <span className={`badge ${c.status === 'CLEARED' ? 'badge-emerald' : c.status === 'PARTIALLY_CLEARED' ? 'badge-cyan' : c.status === 'ON_HOLD' ? 'badge-amber' : 'badge-subtle'}`}>
                            {c.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                          {(c.status === 'DRAFT' || c.status === 'SUBMITTED' || c.status === 'ON_HOLD') && (
                            <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                              <button className="btn btn-emerald btn-sm" onClick={() => handleApproveClearance(c.clearanceId)}>
                                Approve & Release
                              </button>
                              <button className="btn btn-secondary btn-sm" onClick={() => api.updateCustomsClearanceStatus(c.clearanceId, 'ON_HOLD', 'Hold for inspection').then(loadAll)}>
                                Hold
                              </button>
                            </div>
                          )}
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

      {/* TAB 3: TRANSFER CUSTOMS-RELEASED STOCK TO PRODUCTION WAREHOUSE */}
      {activeTab === 'transfer' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '1.25rem' }}>
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem', fontWeight: 700 }}>Transfer Released Stock to Production</h3>
            <form onSubmit={handleTransferToProduction} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label className="form-label">Select Batch Receipt (Customs-Cleared)</label>
                <select
                  className="input"
                  required
                  value={transferForm.batchReceiptId}
                  onChange={(e) => setTransferForm({ ...transferForm, batchReceiptId: e.target.value })}
                >
                  <option value="">-- Choose Batch Receipt --</option>
                  {outstandingClearances.map((oc) => (
                    <option key={oc.batchReceiptId} value={oc.batchReceiptId}>
                      {oc.batchCode} · Receipt #{oc.receiptId} (Eligible: {oc.eligibleToTransferToProduction} / Cleared: {oc.approvedClearedQuantity})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Destination Production Warehouse</label>
                <select
                  className="input"
                  required
                  value={transferForm.toWarehouseId}
                  onChange={(e) => setTransferForm({ ...transferForm, toWarehouseId: e.target.value })}
                >
                  <option value="">-- Choose Production Warehouse --</option>
                  {productionWarehouses.map((w) => (
                    <option key={w.warehouseId} value={w.warehouseId}>
                      {w.warehouseName} ({w.warehouseClassification})
                    </option>
                  ))}
                </select>
                {productionWarehouses.length === 0 && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--accent-amber)', marginTop: '0.25rem' }}>
                    Tip: Go to Tab 2 and set a warehouse classification to PRODUCTION first.
                  </div>
                )}
              </div>
              <div>
                <label className="form-label">Quantity to Transfer</label>
                <input
                  type="number"
                  min={0.001}
                  step="any"
                  className="input"
                  required
                  value={transferForm.quantity}
                  onChange={(e) => setTransferForm({ ...transferForm, quantity: Number(e.target.value) })}
                />
              </div>
              <button type="submit" className="btn btn-cyan">
                Execute Production Stock Transfer
              </button>
            </form>
          </div>

          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem', fontWeight: 700 }}>Clearance & Production Release Ledger</h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '0.65rem', fontSize: '0.7rem' }}>BATCH</th>
                    <th style={{ padding: '0.65rem', fontSize: '0.7rem' }}>WAREHOUSE</th>
                    <th style={{ padding: '0.65rem', fontSize: '0.7rem', textAlign: 'right' }}>RECEIVED</th>
                    <th style={{ padding: '0.65rem', fontSize: '0.7rem', textAlign: 'right' }}>CLEARED</th>
                    <th style={{ padding: '0.65rem', fontSize: '0.7rem', textAlign: 'right' }}>TRANSFERRED</th>
                    <th style={{ padding: '0.65rem', fontSize: '0.7rem', textAlign: 'right' }}>ELIGIBLE TO MOVE</th>
                  </tr>
                </thead>
                <tbody>
                  {outstandingClearances.map((oc) => (
                    <tr key={oc.batchReceiptId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.65rem', fontWeight: 700 }}>{oc.batchCode}</td>
                      <td style={{ padding: '0.65rem', fontSize: '0.78rem' }}>{oc.warehouseName} ({oc.warehouseClassification})</td>
                      <td style={{ padding: '0.65rem', textAlign: 'right' }}>{oc.receivedQuantity}</td>
                      <td style={{ padding: '0.65rem', textAlign: 'right', color: 'var(--accent-cyan)', fontWeight: 700 }}>{oc.approvedClearedQuantity}</td>
                      <td style={{ padding: '0.65rem', textAlign: 'right', color: 'var(--accent-emerald)', fontWeight: 700 }}>{oc.transferredToProductionQty}</td>
                      <td style={{ padding: '0.65rem', textAlign: 'right', color: 'var(--accent-amber)', fontWeight: 800 }}>{oc.eligibleToTransferToProduction}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: VIN & COMPONENT SERIAL NUMBERS */}
      {activeTab === 'serials' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '1.25rem' }}>
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem', fontWeight: 700 }}>Register / Bulk Import Component Serials</h3>
            <form onSubmit={handleRegisterSerials} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label className="form-label">CKD/SKD Batch</label>
                <select className="input" required value={serialForm.batchId} onChange={(e) => setSerialForm({ ...serialForm, batchId: e.target.value })}>
                  <option value="">-- Select Batch --</option>
                  {batches.map((b) => (
                    <option key={b.batchId} value={b.batchId}>{b.batchCode} ({b.item?.itemName})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Component Serial Type</label>
                <select className="input" value={serialForm.serialType} onChange={(e) => setSerialForm({ ...serialForm, serialType: e.target.value })}>
                  <option value="VIN">VIN / Chassis</option>
                  <option value="MOTOR">Motor Serial</option>
                  <option value="ENGINE">Engine Serial</option>
                  <option value="BATTERY">Battery Serial</option>
                  <option value="CONTROLLER">Controller Serial</option>
                </select>
              </div>
              <div>
                <label className="form-label">Serial Numbers (one per line or comma-separated)</label>
                <textarea
                  rows={5}
                  className="input"
                  placeholder="MTR-2026-0001&#10;MTR-2026-0002&#10;MTR-2026-0003"
                  value={serialForm.bulkText}
                  onChange={(e) => setSerialForm({ ...serialForm, bulkText: e.target.value })}
                />
              </div>
              <button type="submit" className="btn btn-cyan">Register Serial Numbers</button>
            </form>
          </div>

          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem', fontWeight: 700 }}>Component Serial Registry ({serials.length})</h3>
            <div style={{ overflowX: 'auto', maxHeight: '420px' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '0.65rem', fontSize: '0.7rem' }}>TYPE</th>
                    <th style={{ padding: '0.65rem', fontSize: '0.7rem' }}>SERIAL NUMBER</th>
                    <th style={{ padding: '0.65rem', fontSize: '0.7rem' }}>BATCH</th>
                    <th style={{ padding: '0.65rem', fontSize: '0.7rem' }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {serials.map((s) => (
                    <tr key={s.serialId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '0.65rem' }}><span className="badge badge-subtle">{s.serialType}</span></td>
                      <td style={{ padding: '0.65rem', fontWeight: 700, fontFamily: 'monospace' }}>{s.serialNumber}</td>
                      <td style={{ padding: '0.65rem' }}>{s.batch?.batchCode}</td>
                      <td style={{ padding: '0.65rem' }}><span className="badge badge-cyan">{s.serialStatus}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: BOM & PRODUCTION MATERIAL ELIGIBILITY */}
      {activeTab === 'bom' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          {/* Eligibility Validator */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem', fontWeight: 700 }}>
              Production Material Eligibility Validator (Story 9)
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 0 }}>
              Validates stock in PRODUCTION / SATELLITE_STORE warehouses only. Excludes BONDED & uncleared stock.
            </p>
            <form onSubmit={handleCheckEligibility} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              <select className="input" style={{ flex: 1 }} required value={eligibilityItemId} onChange={(e) => setEligibilityItemId(e.target.value)}>
                <option value="">-- Select Product / Component --</option>
                {items.map((i) => (
                  <option key={i.itemId} value={i.itemId}>{i.itemCode} — {i.itemName}</option>
                ))}
              </select>
              <input type="number" min={1} className="input" style={{ width: '90px' }} value={eligibilityReqQty} onChange={(e) => setEligibilityReqQty(Number(e.target.value))} />
              <button type="submit" className="btn btn-cyan btn-sm">Validate</button>
            </form>

            {eligibilityResult && (
              <div style={{ background: 'rgba(15,23,42,0.5)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span>Total Production-Eligible Qty:</span>
                  <strong style={{ color: 'var(--accent-emerald)', fontSize: '1.1rem' }}>{eligibilityResult.totalProductionEligibleQty}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span>Reservation Status ({eligibilityResult.requestedQuantity} requested):</span>
                  <span className={`badge ${eligibilityResult.canReserve ? 'badge-emerald' : 'badge-rose'}`}>
                    {eligibilityResult.canReserve ? '✓ ELIGIBLE FOR PRODUCTION' : '✕ INSUFFICIENT ELIGIBLE STOCK'}
                  </span>
                </div>
                {(eligibilityResult.warehouseBreakdown || []).map((w: any) => (
                  <div key={w.warehouseId} style={{ fontSize: '0.75rem', padding: '0.4rem 0', borderTop: '1px dashed var(--border-color)' }}>
                    <strong>{w.warehouseName}</strong> ({w.warehouseClassification}): On-hand {w.quantityOnHand} · Eligible: <strong>{w.eligibleForProductionQty}</strong>
                    {w.exclusionReason && <div style={{ color: 'var(--accent-amber)' }}>{w.exclusionReason}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* BOM Master */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Vehicle BOM Definitions ({boms.length})</h3>
              <button className="btn btn-cyan btn-sm" onClick={() => setShowBomModal(true)}><Plus size={14} /> New BOM</button>
            </div>
            {boms.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>No BOMs defined yet. Click "+ New BOM" to configure vehicle component requirements.</div>
            ) : (
              boms.map((b) => (
                <div key={b.bomId} style={{ background: 'rgba(15,23,42,0.4)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '0.65rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--accent-cyan)' }}>{b.bomCode} (v{b.version})</span>
                    <span>{b.item?.itemName}</span>
                  </div>
                  <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {(b.lines || []).map((l: any) => (
                      <div key={l.bomLineId}>
                        • {l.componentItem?.itemCode} — {l.componentItem?.itemName}: <strong>{l.requiredQuantity}</strong> {l.isSerialized ? `(${l.serialType})` : ''}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 6: INTEGRATION EVENTS & SOURCE-OF-TRUTH MAPPING */}
      {activeTab === 'events' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem', fontWeight: 700 }}>Source-of-Truth Ownership Mapping (Story 1)</h3>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '0.65rem', fontSize: '0.72rem' }}>LOGICAL ENTITY</th>
                  <th style={{ padding: '0.65rem', fontSize: '0.72rem' }}>AUTHORITATIVE TABLE</th>
                  <th style={{ padding: '0.65rem', fontSize: '0.72rem' }}>OWNER MODULE</th>
                  <th style={{ padding: '0.65rem', fontSize: '0.72rem' }}>INTEGRATION ROLE</th>
                </tr>
              </thead>
              <tbody>
                {(mapping?.sourceOfTruthMapping || []).map((m: any, idx: number) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.65rem', fontWeight: 700 }}>{m.logicalEntity}</td>
                    <td style={{ padding: '0.65rem', fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>{m.existingTable}</td>
                    <td style={{ padding: '0.65rem' }}>{m.owner}</td>
                    <td style={{ padding: '0.65rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{m.integrationRole}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card" style={{ padding: '1.25rem' }}>
            <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem', fontWeight: 700 }}>Transactional Outbox Integration Events</h3>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '0.65rem', fontSize: '0.72rem' }}>EVENT TYPE</th>
                  <th style={{ padding: '0.65rem', fontSize: '0.72rem' }}>SOURCE → TARGET</th>
                  <th style={{ padding: '0.65rem', fontSize: '0.72rem' }}>IDEMPOTENCY KEY</th>
                  <th style={{ padding: '0.65rem', fontSize: '0.72rem' }}>STATUS</th>
                  <th style={{ padding: '0.65rem', fontSize: '0.72rem' }}>TIMESTAMP</th>
                </tr>
              </thead>
              <tbody>
                {events.map((ev) => (
                  <tr key={ev.eventId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.65rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>{ev.eventType}</td>
                    <td style={{ padding: '0.65rem', fontSize: '0.78rem' }}>{ev.sourceModule} → {ev.targetModule}</td>
                    <td style={{ padding: '0.65rem', fontFamily: 'monospace', fontSize: '0.72rem' }}>{ev.idempotencyKey}</td>
                    <td style={{ padding: '0.65rem' }}><span className="badge badge-emerald">{ev.processingStatus}</span></td>
                    <td style={{ padding: '0.65rem', fontSize: '0.75rem' }}>{new Date(ev.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: NEW BATCH */}
      {showBatchModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '540px', width: '95%' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Create CKD/SKD Batch</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowBatchModal(false)}><X size={15} /></button>
            </div>
            <form onSubmit={handleCreateBatch}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <label className="form-label">Batch Code (optional auto-generate)</label>
                  <input className="input" placeholder="e.g. CKD-BATCH-2026-001" value={batchForm.batchCode} onChange={(e) => setBatchForm({ ...batchForm, batchCode: e.target.value })} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="form-label">Kit Type</label>
                    <select className="input" value={batchForm.kitType} onChange={(e) => setBatchForm({ ...batchForm, kitType: e.target.value })}>
                      <option value="CKD">CKD (Completely Knocked Down)</option>
                      <option value="SKD">SKD (Semi Knocked Down)</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Planned Quantity</label>
                    <input type="number" min={1} className="input" required value={batchForm.plannedQuantity} onChange={(e) => setBatchForm({ ...batchForm, plannedQuantity: Number(e.target.value) })} />
                  </div>
                </div>
                <div>
                  <label className="form-label">Import Shipment</label>
                  <select className="input" required value={batchForm.shipmentId} onChange={(e) => setBatchForm({ ...batchForm, shipmentId: e.target.value })}>
                    <option value="">-- Select Import Shipment --</option>
                    {shipments.map((s) => (
                      <option key={s.shipmentId} value={s.shipmentId}>{s.shipmentNumber} ({s.currentStage})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Vehicle Model / Product Item</label>
                  <select className="input" required value={batchForm.itemId} onChange={(e) => setBatchForm({ ...batchForm, itemId: e.target.value })}>
                    <option value="">-- Select Product --</option>
                    {items.map((i) => (
                      <option key={i.itemId} value={i.itemId}>{i.itemCode} — {i.itemName}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowBatchModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-cyan">Create Batch</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LINK GOODS RECEIPT */}
      {showLinkReceiptModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '540px', width: '95%' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Link Goods Receipt to CKD/SKD Batch</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowLinkReceiptModal(false)}><X size={15} /></button>
            </div>
            <form onSubmit={handleLinkReceipt}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <label className="form-label">CKD/SKD Batch</label>
                  <select className="input" required value={linkForm.batchId} onChange={(e) => setLinkForm({ ...linkForm, batchId: e.target.value })}>
                    <option value="">-- Select Batch --</option>
                    {batches.map((b) => (
                      <option key={b.batchId} value={b.batchId}>{b.batchCode} (Planned: {b.plannedQuantity})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Goods Receipt</label>
                  <select className="input" required value={linkForm.receiptId} onChange={(e) => setLinkForm({ ...linkForm, receiptId: e.target.value })}>
                    <option value="">-- Select Goods Receipt --</option>
                    {availableReceipts.map((r) => (
                      <option key={r.receiptId} value={r.receiptId}>
                        Receipt #{r.receiptId} · {r.shipmentLine?.shipment?.shipmentNumber || 'Shipment'} · {r.warehouse?.warehouseName || 'WH'} (Unlinked: {r.unlinkedQuantity} / {r.quantityReceived})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Received Quantity for This Batch</label>
                  <input type="number" min={0.001} step="any" className="input" required value={linkForm.receivedQuantity} onChange={(e) => setLinkForm({ ...linkForm, receivedQuantity: Number(e.target.value) })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowLinkReceiptModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-cyan">Link Receipt</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NEW CUSTOMS CLEARANCE */}
      {showClearanceModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '560px', width: '95%' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Record Customs Clearance</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowClearanceModal(false)}><X size={15} /></button>
            </div>
            <form onSubmit={handleCreateClearance}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <label className="form-label">Customs Declaration Number</label>
                  <input className="input" required placeholder="e.g. DEC-ET-2026-0091" value={clearanceForm.declarationNumber} onChange={(e) => setClearanceForm({ ...clearanceForm, declarationNumber: e.target.value })} />
                </div>
                <div>
                  <label className="form-label">Batch Receipt to Clear</label>
                  <select
                    className="input"
                    required
                    value={clearanceForm.batchReceiptId}
                    onChange={(e) => {
                      const oc = outstandingClearances.find((o) => String(o.batchReceiptId) === e.target.value);
                      setClearanceForm({
                        ...clearanceForm,
                        batchReceiptId: e.target.value,
                        batchId: oc?.batchId || '',
                        clearedQuantity: oc?.outstandingClearanceQuantity || 1,
                      });
                    }}
                  >
                    <option value="">-- Select Batch Receipt --</option>
                    {outstandingClearances.map((oc) => (
                      <option key={oc.batchReceiptId} value={oc.batchReceiptId}>
                        {oc.batchCode} · Receipt #{oc.receiptId} (Outstanding: {oc.outstandingClearanceQuantity} / {oc.receivedQuantity})
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="form-label">Cleared Quantity (supports partial)</label>
                    <input type="number" min={0.001} step="any" className="input" required value={clearanceForm.clearedQuantity} onChange={(e) => setClearanceForm({ ...clearanceForm, clearedQuantity: Number(e.target.value) })} />
                  </div>
                  <div>
                    <label className="form-label">Clearance Date</label>
                    <input type="date" className="input" value={clearanceForm.clearanceDate} onChange={(e) => setClearanceForm({ ...clearanceForm, clearanceDate: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label className="form-label">Document Reference</label>
                  <input className="input" placeholder="e.g. Customs Release Cert #4412" value={clearanceForm.documentReference} onChange={(e) => setClearanceForm({ ...clearanceForm, documentReference: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowClearanceModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-cyan">Save Clearance</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NEW BOM */}
      {showBomModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '640px', width: '95%' }}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Create Vehicle BOM</h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowBomModal(false)}><X size={15} /></button>
            </div>
            <form onSubmit={handleCreateBom}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <label className="form-label">Finished Vehicle Product</label>
                  <select className="input" required value={bomForm.itemId} onChange={(e) => setBomForm({ ...bomForm, itemId: e.target.value })}>
                    <option value="">-- Select Vehicle --</option>
                    {items.map((i) => (
                      <option key={i.itemId} value={i.itemId}>{i.itemCode} — {i.itemName}</option>
                    ))}
                  </select>
                </div>
                <div style={{ border: '1px solid var(--border-color)', padding: '0.75rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.5rem' }}>Add Component Line</div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <select className="input" style={{ flex: 2 }} value={bomForm.componentItemId} onChange={(e) => setBomForm({ ...bomForm, componentItemId: e.target.value })}>
                      <option value="">-- Select Component --</option>
                      {items.map((i) => (
                        <option key={i.itemId} value={i.itemId}>{i.itemCode} — {i.itemName}</option>
                      ))}
                    </select>
                    <input type="number" min={0.001} step="any" className="input" style={{ width: '80px' }} value={bomForm.requiredQuantity} onChange={(e) => setBomForm({ ...bomForm, requiredQuantity: Number(e.target.value) })} />
                    <select className="input" style={{ width: '130px' }} value={bomForm.serialType} onChange={(e) => setBomForm({ ...bomForm, serialType: e.target.value })}>
                      <option value="MOTOR">MOTOR</option>
                      <option value="BATTERY">BATTERY</option>
                      <option value="CONTROLLER">CONTROLLER</option>
                      <option value="ENGINE">ENGINE</option>
                      <option value="VIN">VIN</option>
                    </select>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddBomLineDraft}>Add</button>
                  </div>
                  {bomLinesDraft.length > 0 && (
                    <div style={{ marginTop: '0.6rem', fontSize: '0.78rem' }}>
                      {bomLinesDraft.map((l, idx) => (
                        <div key={idx}>• {l.componentName} × {l.requiredQuantity} ({l.serialType || 'Non-serialized'})</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowBomModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-cyan">Save BOM</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
