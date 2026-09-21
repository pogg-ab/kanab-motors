import React, { useState, useEffect } from 'react';
import {
  CarFront,
  Plus,
  Search,
  Upload,
  FileSpreadsheet,
  Warehouse as WarehouseIcon,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  X,
  Edit2,
  Layers,
  ArrowRight,
} from 'lucide-react';
import {
  api,
  VehicleUnit,
  ProductItem,
  Warehouse,
} from '../../api/client';

export const VehiclesPage: React.FC = () => {
  const [vehicles, setVehicles] = useState<VehicleUnit[]>([]);
  const [items, setItems] = useState<ProductItem[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('ALL');
  const [selectedItem, setSelectedItem] = useState<string>('ALL');

  // Modals
  const [isSingleOpen, setIsSingleOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [statusModalUnit, setStatusModalUnit] = useState<VehicleUnit | null>(null);

  // Single Form State
  const [singleForm, setSingleForm] = useState({
    itemId: '',
    chassisNumber: '',
    engineNumber: '',
    currentWarehouseId: '',
    productionImportInfo: '',
  });
  const [singleError, setSingleError] = useState<string | null>(null);
  const [submittingSingle, setSubmittingSingle] = useState(false);

  // Bulk CSV State
  const [bulkCsvText, setBulkCsvText] = useState(
    'CHS-2026-00101,ENG-2026-00101,Shipment Batch A\nCHS-2026-00102,ENG-2026-00102,Shipment Batch A\nCHS-2026-00103,ENG-2026-00103,Shipment Batch A',
  );
  const [bulkItemId, setBulkItemId] = useState('');
  const [bulkWarehouseId, setBulkWarehouseId] = useState('');
  const [bulkReport, setBulkReport] = useState<{
    success: boolean;
    importedCount: number;
    failedCount: number;
    errors: string[];
  } | null>(null);
  const [submittingBulk, setSubmittingBulk] = useState(false);

  // Status Change State
  const [newStatus, setNewStatus] = useState<string>('');
  const [newWarehouseId, setNewWarehouseId] = useState<string>('');

  const fetchDependencies = async () => {
    try {
      const [itms, whs] = await Promise.all([
        api.getItems({ limit: 100 }),
        api.getWarehouses(),
      ]);
      setItems(itms.items);
      setWarehouses(whs);
    } catch (err) {
      console.error('Failed to load vehicle dependencies:', err);
    }
  };

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (selectedStatus !== 'ALL') params.status = selectedStatus;
      if (selectedWarehouse !== 'ALL') params.warehouseId = Number(selectedWarehouse);
      if (selectedItem !== 'ALL') params.itemId = selectedItem;
      if (search.trim()) params.search = search.trim();

      const res = await api.getVehicles(params);
      setVehicles(res.items);
    } catch (err) {
      console.error('Failed to load vehicles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDependencies();
  }, []);

  useEffect(() => {
    fetchVehicles();
  }, [selectedStatus, selectedWarehouse, selectedItem, search]);

  const handleOpenSingle = () => {
    setSingleForm({
      itemId: items[0]?.itemId || '',
      chassisNumber: '',
      engineNumber: '',
      currentWarehouseId: warehouses[0]?.warehouseId?.toString() || '',
      productionImportInfo: '',
    });
    setSingleError(null);
    setIsSingleOpen(true);
  };

  const handleCreateSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    setSingleError(null);
    setSubmittingSingle(true);

    try {
      await api.createVehicle({
        itemId: singleForm.itemId,
        chassisNumber: singleForm.chassisNumber.trim().toUpperCase(),
        engineNumber: singleForm.engineNumber.trim().toUpperCase(),
        currentWarehouseId: singleForm.currentWarehouseId ? Number(singleForm.currentWarehouseId) : undefined,
        productionImportInfo: singleForm.productionImportInfo.trim() || undefined,
      });
      setIsSingleOpen(false);
      fetchVehicles();
    } catch (err: any) {
      setSingleError(err.response?.data?.message || 'Failed to register vehicle unit');
    } finally {
      setSubmittingSingle(false);
    }
  };

  const handleOpenBulk = () => {
    setBulkItemId(items[0]?.itemId || '');
    setBulkWarehouseId(warehouses[0]?.warehouseId?.toString() || '');
    setBulkReport(null);
    setIsBulkOpen(true);
  };

  const handleExecuteBulkImport = async () => {
    if (!bulkItemId) {
      alert('Please select a Product Model');
      return;
    }

    const lines = bulkCsvText.trim().split('\n');
    const parsedUnits = lines
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        const parts = line.split(',');
        return {
          chassisNumber: parts[0]?.trim() || '',
          engineNumber: parts[1]?.trim() || '',
          productionImportInfo: parts[2]?.trim() || '',
        };
      });

    if (parsedUnits.length === 0) {
      alert('No units detected in CSV text');
      return;
    }

    setSubmittingBulk(true);
    setBulkReport(null);

    try {
      const res = await api.bulkImportVehicles({
        itemId: bulkItemId,
        currentWarehouseId: bulkWarehouseId ? Number(bulkWarehouseId) : undefined,
        units: parsedUnits,
      });
      setBulkReport(res);
      fetchVehicles();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Bulk import failed');
    } finally {
      setSubmittingBulk(false);
    }
  };

  const handleOpenStatusModal = (unit: VehicleUnit) => {
    setStatusModalUnit(unit);
    setNewStatus(unit.currentStatus);
    setNewWarehouseId(unit.currentWarehouseId ? unit.currentWarehouseId.toString() : '');
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusModalUnit) return;
    try {
      await api.updateVehicleStatus(
        statusModalUnit.vehicleUnitId,
        newStatus,
        newWarehouseId ? Number(newWarehouseId) : undefined,
      );
      setStatusModalUnit(null);
      fetchVehicles();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update vehicle status');
    }
  };

  // Metrics
  const totalUnits = vehicles.length;
  const received = vehicles.filter((v) => v.currentStatus === 'RECEIVED').length;
  const available = vehicles.filter((v) => v.currentStatus === 'AVAILABLE_FOR_SALE').length;
  const reservedOrAllotted = vehicles.filter(
    (v) => v.currentStatus === 'RESERVED' || v.currentStatus === 'ALLOTTED',
  ).length;

  return (
    <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Breadcrumbs & Top Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-cyan)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>★ Core Masters</span>
          <span style={{ color: 'var(--text-muted)' }}>/</span>
          <span>Vehicle Units & VIN Tracking</span>
          <span style={{ color: 'var(--text-muted)' }}>/</span>
          <span style={{ color: 'var(--text-primary)' }}>Stock Registry</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '0.4rem' }}>
              <div style={{ padding: '0.6rem', background: 'rgba(6, 182, 212, 0.12)', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: 'var(--radius-md)', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CarFront size={24} />
              </div>
              <div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
                  Vehicle Units & Chassis Tracking
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.2rem' }}>
                  <span className="mono-code" style={{ fontSize: '0.65rem', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-indigo)', borderColor: 'rgba(99, 102, 241, 0.3)' }}>
                    Stock Registry
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Individual physical units tracked by Chassis Number & Engine Number with single-allocation guarantees
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button className="btn btn-secondary" onClick={handleOpenBulk} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileSpreadsheet size={16} color="var(--accent-emerald)" /> Bulk Import CSV
            </button>
            <button className="btn btn-cyan" onClick={handleOpenSingle} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={17} /> Register Unit
            </button>
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
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Units Tracked</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-indigo)' }}>
              <CarFront size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace', letterSpacing: '-0.02em' }}>
            {totalUnits}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Unique Chassis & Engine units
          </div>
        </div>

        <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--accent-amber)' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Received (Pending PDI)</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-amber)' }}>
              <WarehouseIcon size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--accent-amber)', fontFamily: 'monospace', letterSpacing: '-0.02em' }}>
            {received}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Initial shipment intake
          </div>
        </div>

        <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--accent-emerald)' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Available for Sale</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-emerald)' }}>
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--accent-emerald)', fontFamily: 'monospace', letterSpacing: '-0.02em' }}>
            {available}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Ready for customer allotment
          </div>
        </div>

        <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--accent-cyan)' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Reserved / Allotted</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(6, 182, 212, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-cyan)' }}>
              <Layers size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--accent-cyan)', fontFamily: 'monospace', letterSpacing: '-0.02em' }}>
            {reservedOrAllotted}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Bound to customer bookings
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {[
              'ALL',
              'RECEIVED',
              'AVAILABLE_FOR_SALE',
              'RESERVED',
              'ALLOTTED',
              'READY_FOR_DELIVERY',
              'SOLD',
            ].map((st) => (
              <button
                key={st}
                className={`filter-pill ${selectedStatus === st ? 'active' : ''}`}
                style={{ cursor: 'pointer' }}
                onClick={() => setSelectedStatus(st)}
              >
                {st.replace(/_/g, ' ')}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <select
              className="input"
              style={{ width: '180px', height: '38px', fontSize: '0.85rem' }}
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
            >
              <option value="ALL">All Warehouses</option>
              {warehouses.map((w) => (
                <option key={w.warehouseId} value={w.warehouseId}>
                  {w.warehouseName}
                </option>
              ))}
            </select>

            <div style={{ position: 'relative', width: '280px' }}>
              <Search
                size={16}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                className="input"
                style={{ paddingLeft: '2.4rem', height: '38px', fontSize: '0.85rem' }}
                placeholder="Search Chassis or Engine..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Vehicles Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#090D16', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '0.9rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Chassis Number</th>
                <th style={{ padding: '0.9rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Engine Number</th>
                <th style={{ padding: '0.9rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Model / Description</th>
                <th style={{ padding: '0.9rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Current Warehouse</th>
                <th style={{ padding: '0.9rem 1.25rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lifecycle Status</th>
                <th style={{ padding: '0.9rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Import / Production Notes</th>
                <th style={{ padding: '0.9rem 1.25rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    Loading vehicle inventory...
                  </td>
                </tr>
              ) : vehicles.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No vehicle units match your query. Register a unit or use Bulk CSV Import.
                  </td>
                </tr>
              ) : (
                vehicles.map((v) => (
                  <tr key={v.vehicleUnitId} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <span className="mono-code" style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>
                        {v.chassisNumber}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <span className="mono-code" style={{ color: 'var(--accent-amber)' }}>
                        {v.engineNumber}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{v.item?.itemName}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        Code: <span className="mono-code" style={{ fontSize: '0.65rem' }}>{v.item?.itemCode}</span> · {v.item?.brand?.brandName}
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                        <WarehouseIcon size={14} color="var(--text-muted)" />
                        <span>{v.currentWarehouse?.warehouseName || 'Unassigned'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                      <span
                        className={`badge ${
                          v.currentStatus === 'AVAILABLE_FOR_SALE'
                            ? 'badge-emerald'
                            : v.currentStatus === 'RECEIVED'
                            ? 'badge-amber'
                            : v.currentStatus === 'ALLOTTED'
                            ? 'badge-indigo'
                            : 'badge-purple'
                        }`}
                      >
                        {v.currentStatus}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {v.productionImportInfo || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleOpenStatusModal(v)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}
                      >
                        <Edit2 size={13} /> Update Status
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SINGLE UNIT REGISTRATION MODAL */}
      {isSingleOpen && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <CarFront size={22} color="var(--accent-indigo)" />
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Register Physical Vehicle Unit</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Capture unique chassis and engine numbers (enforces zero duplicates)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsSingleOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSingle}>
              <div className="modal-body">
                {singleError && (
                  <div className="alert-banner-danger">
                    {singleError}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Product Model *</label>
                  <select
                    className="select-field"
                    required
                    value={singleForm.itemId}
                    onChange={(e) => setSingleForm({ ...singleForm, itemId: e.target.value })}
                  >
                    {items.map((i) => (
                      <option key={i.itemId} value={i.itemId}>
                        {i.itemCode} — {i.itemName}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Chassis Number (VIN) *</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. CHS-2026-00991"
                      required
                      value={singleForm.chassisNumber}
                      onChange={(e) => setSingleForm({ ...singleForm, chassisNumber: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Engine Number *</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. ENG-2026-00991"
                      required
                      value={singleForm.engineNumber}
                      onChange={(e) => setSingleForm({ ...singleForm, engineNumber: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Initial Warehouse</label>
                  <select
                    className="select-field"
                    value={singleForm.currentWarehouseId}
                    onChange={(e) => setSingleForm({ ...singleForm, currentWarehouseId: e.target.value })}
                  >
                    {warehouses.map((w) => (
                      <option key={w.warehouseId} value={w.warehouseId}>
                        {w.warehouseName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Import / Production Information</label>
                  <textarea
                    className="textarea-field"
                    rows={2}
                    placeholder="e.g. Shipment SHP-001 from Bajaj Auto India via Djibouti Port"
                    value={singleForm.productionImportInfo}
                    onChange={(e) => setSingleForm({ ...singleForm, productionImportInfo: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsSingleOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-cyan" disabled={submittingSingle}>
                  {submittingSingle ? 'Registering...' : 'Confirm Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK CSV IMPORT MODAL (Story 2.9) */}
      {isBulkOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '750px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <FileSpreadsheet size={22} color="var(--accent-emerald)" />
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Bulk Import Vehicle Units (CSV)</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    High-speed intake for shipment batches with duplicate chassis validation
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBulkOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Target Product Model *</label>
                  <select
                    className="select-field"
                    value={bulkItemId}
                    onChange={(e) => setBulkItemId(e.target.value)}
                  >
                    {items.map((i) => (
                      <option key={i.itemId} value={i.itemId}>
                        {i.itemCode} — {i.itemName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Destination Warehouse</label>
                  <select
                    className="select-field"
                    value={bulkWarehouseId}
                    onChange={(e) => setBulkWarehouseId(e.target.value)}
                  >
                    {warehouses.map((w) => (
                      <option key={w.warehouseId} value={w.warehouseId}>
                        {w.warehouseName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  CSV Data Rows (format: <span className="mono-code">chassis_number,engine_number,import_notes</span>)
                </label>
                <textarea
                  className="textarea-field"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
                  rows={6}
                  value={bulkCsvText}
                  onChange={(e) => setBulkCsvText(e.target.value)}
                />
              </div>

              {/* Bulk Report Summary */}
              {bulkReport && (
                <div style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  background: bulkReport.success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                  border: bulkReport.success ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(244, 63, 94, 0.3)',
                  marginTop: '1rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}>
                    {bulkReport.success ? (
                      <>
                        <CheckCircle2 size={18} color="var(--accent-emerald)" />
                        <span style={{ color: '#6ee7b7' }}>
                          Successfully imported {bulkReport.importedCount} vehicle units!
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertCircle size={18} color="var(--accent-rose)" />
                        <span style={{ color: '#fca5a5' }}>
                          Import completed with {bulkReport.failedCount} error(s) ({bulkReport.importedCount} imported)
                        </span>
                      </>
                    )}
                  </div>

                  {bulkReport.errors.length > 0 && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#fda4af' }}>
                      <div style={{ fontWeight: 600 }}>Error Details:</div>
                      <ul style={{ paddingLeft: '1.25rem', marginTop: '0.25rem' }}>
                        {bulkReport.errors.map((err, idx) => (
                          <li key={idx}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setIsBulkOpen(false)}>
                Close
              </button>
              <button
                type="button"
                className="btn btn-cyan"
                onClick={handleExecuteBulkImport}
                disabled={submittingBulk}
              >
                {submittingBulk ? 'Validating & Importing...' : 'Validate & Import Batch'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UPDATE STATUS MODAL (Story 2.8) */}
      {statusModalUnit && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Update Vehicle Lifecycle Status</h3>
              <button
                onClick={() => setStatusModalUnit(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateStatus}>
              <div className="modal-body">
                <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(0,0,0,0.3)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Chassis Number:</div>
                  <div className="mono-code" style={{ color: 'var(--accent-blue)', display: 'inline-block', marginTop: '0.2rem' }}>
                    {statusModalUnit.chassisNumber}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Vehicle Lifecycle Status</label>
                  <select
                    className="select-field"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                  >
                    {[
                      'RECEIVED',
                      'AVAILABLE_FOR_SALE',
                      'RESERVED',
                      'ALLOTTED',
                      'READY_FOR_DELIVERY',
                      'SOLD',
                      'DELIVERED',
                    ].map((s) => (
                      <option key={s} value={s}>
                        {s.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Current Warehouse Location</label>
                  <select
                    className="select-field"
                    value={newWarehouseId}
                    onChange={(e) => setNewWarehouseId(e.target.value)}
                  >
                    {warehouses.map((w) => (
                      <option key={w.warehouseId} value={w.warehouseId}>
                        {w.warehouseName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setStatusModalUnit(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-cyan">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
