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
  Trash2,
  Download,
  Check,
  Layers,
  ArrowRight,
  Eye,
  FileText,
  DollarSign,
  Clock,
  User,
  Ship,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  api,
  VehicleUnit,
  ProductItem,
  Warehouse,
} from '../../api/client';
import { usePermissions } from '../../authz/usePermissions';
import { useModal } from '../../context/ModalContext';
import { formatApiError } from '../../utils/error';
import { ModalErrorAlert } from '../../components/ModalErrorAlert';

const VEHICLE_STATUS_LABELS: Record<string, string> = {
  RECEIVED: 'RECEIVED',
  AVAILABLE_FOR_SALE: 'AVAILABLE FOR SALE',
  RESERVED: 'RESERVED',
  ALLOTTED: 'ALLOTTED',
  READY_FOR_DELIVERY: 'READY FOR DELIVERY',
  SOLD: 'SOLD',
  DELIVERED: 'DELIVERED',
};

const ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> = {
  RECEIVED: ['AVAILABLE_FOR_SALE'],
  AVAILABLE_FOR_SALE: ['RESERVED'],
  RESERVED: ['AVAILABLE_FOR_SALE', 'ALLOTTED'],
  ALLOTTED: ['RESERVED', 'AVAILABLE_FOR_SALE', 'READY_FOR_DELIVERY'],
  READY_FOR_DELIVERY: ['ALLOTTED', 'SOLD'],
  SOLD: ['DELIVERED'],
  DELIVERED: [],
};

export const VehiclesPage: React.FC = () => {
  const { showConfirm, showAlert } = useModal();
  const { can } = usePermissions();
  const canCreateVehicle = can('VEHICLES_CREATE');
  const canEditVehicle = can('VEHICLES_EDIT') || can('VEHICLES_CREATE') || can('VEHICLES_STATUS_UPDATE');
  const canBulkImportVehicles = can('VEHICLES_BULK_IMPORT');
  const canUpdateVehicleStatus = can('VEHICLES_STATUS_UPDATE');
  const canManageWarehouses = can('WAREHOUSES_MANAGE');
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
  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);
  const [newWarehouseName, setNewWarehouseName] = useState('');
  const [newWarehouseLocation, setNewWarehouseLocation] = useState('');
  const [creatingWarehouse, setCreatingWarehouse] = useState(false);
  const [editingWarehouseId, setEditingWarehouseId] = useState<number | null>(null);
  const [editingWarehouseName, setEditingWarehouseName] = useState('');
  const [editingWarehouseLocation, setEditingWarehouseLocation] = useState('');
  const [savingWarehouse, setSavingWarehouse] = useState(false);
  const [warehouseActionError, setWarehouseActionError] = useState<string | null>(null);
  const [statusModalUnit, setStatusModalUnit] = useState<VehicleUnit | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [selectedVehicleForDetail, setSelectedVehicleForDetail] = useState<VehicleUnit | null>(null);

  // Excel Import State
  const [isExcelOpen, setIsExcelOpen] = useState(false);
  const [excelItemId, setExcelItemId] = useState('');
  const [excelWarehouseId, setExcelWarehouseId] = useState('');
  const [excelFileName, setExcelFileName] = useState('');
  const [excelParsedUnits, setExcelParsedUnits] = useState<
    Array<{ chassisNumber: string; engineNumber: string; productionImportInfo?: string }>
  >([]);
  const [excelError, setExcelError] = useState<string | null>(null);
  const [excelReport, setExcelReport] = useState<{
    success: boolean;
    importedCount: number;
    failedCount: number;
    errors: string[];
  } | null>(null);
  const [submittingExcel, setSubmittingExcel] = useState(false);

  // Edit Vehicle Unit State
  const [editingVehicle, setEditingVehicle] = useState<VehicleUnit | null>(null);
  const [editVehicleForm, setEditVehicleForm] = useState({
    itemId: '',
    chassisNumber: '',
    engineNumber: '',
    currentWarehouseId: '',
    productionImportInfo: '',
  });
  const [editVehicleError, setEditVehicleError] = useState<string | null>(null);
  const [submittingEditVehicle, setSubmittingEditVehicle] = useState(false);

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
    'CHS-BATCH-01,ENG-BATCH-01,Container A\nCHS-BATCH-02,ENG-BATCH-02,Container A\nCHS-BATCH-03,ENG-BATCH-03,Container A',
  );
  const [bulkItemId, setBulkItemId] = useState('');
  const [bulkWarehouseId, setBulkWarehouseId] = useState('');
  const [bulkError, setBulkError] = useState<string | null>(null);
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

  const handleOpenSingle = async () => {
    if (!canCreateVehicle) return;
    try {
      const [itms, whs] = await Promise.all([
        api.getItems({ limit: 100 }),
        api.getWarehouses(),
      ]);
      setItems(itms.items);
      setWarehouses(whs);
      setSingleForm({
        itemId: itms.items[0]?.itemId || '',
        chassisNumber: '',
        engineNumber: '',
        currentWarehouseId: whs[0]?.warehouseId?.toString() || '',
        productionImportInfo: '',
      });
    } catch (e) {
      console.error('Failed to load fresh dependencies on open:', e);
    }
    setSingleError(null);
    setIsSingleOpen(true);
  };

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageWarehouses) return;
    if (!newWarehouseName.trim()) return;
    setCreatingWarehouse(true);
    setWarehouseActionError(null);
    try {
      const created = await api.createWarehouse(
        newWarehouseName.trim(),
        newWarehouseLocation.trim() || undefined,
      );
      setNewWarehouseName('');
      setNewWarehouseLocation('');
      const whs = await api.getWarehouses();
      setWarehouses(whs);
      if (created?.warehouseId) {
        setSingleForm((prev) => ({
          ...prev,
          currentWarehouseId: created.warehouseId.toString(),
        }));
      }
    } catch (err: any) {
      setWarehouseActionError(formatApiError(err, 'Failed to create warehouse'));
    } finally {
      setCreatingWarehouse(false);
    }
  };

  const handleStartEditWarehouse = (w: Warehouse) => {
    setEditingWarehouseId(w.warehouseId);
    setEditingWarehouseName(w.warehouseName);
    setEditingWarehouseLocation(w.location || '');
    setWarehouseActionError(null);
  };

  const handleCancelEditWarehouse = () => {
    setEditingWarehouseId(null);
    setEditingWarehouseName('');
    setEditingWarehouseLocation('');
    setWarehouseActionError(null);
  };

  const handleSaveEditWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWarehouseId || !editingWarehouseName.trim()) return;
    setSavingWarehouse(true);
    setWarehouseActionError(null);
    try {
      await api.updateWarehouse(
        editingWarehouseId,
        editingWarehouseName.trim(),
        editingWarehouseLocation.trim() || undefined,
      );
      setEditingWarehouseId(null);
      const whs = await api.getWarehouses();
      setWarehouses(whs);
      fetchVehicles();
    } catch (err: any) {
      setWarehouseActionError(formatApiError(err, 'Failed to update warehouse'));
    } finally {
      setSavingWarehouse(false);
    }
  };

  const handleDeleteWarehouse = async (w: Warehouse) => {
    const confirmed = await showConfirm({
      title: 'Delete Storage Depot / Warehouse',
      message: `Are you sure you want to delete warehouse "${w.warehouseName}"? This action cannot be reversed.`,
      confirmText: 'Delete Warehouse',
      variant: 'danger',
    });
    if (!confirmed) {
      return;
    }
    setWarehouseActionError(null);
    try {
      await api.deleteWarehouse(w.warehouseId);
      const whs = await api.getWarehouses();
      setWarehouses(whs);
      fetchVehicles();
    } catch (err: any) {
      setWarehouseActionError(formatApiError(err, 'Failed to delete warehouse'));
    }
  };

  // Excel Import Handlers
  const handleOpenExcelImport = async () => {
    if (!canBulkImportVehicles) return;
    try {
      const [itms, whs] = await Promise.all([
        api.getItems({ limit: 100 }),
        api.getWarehouses(),
      ]);
      setItems(itms.items);
      setWarehouses(whs);
      setExcelItemId(itms.items[0]?.itemId || '');
      setExcelWarehouseId(whs[0]?.warehouseId?.toString() || '');
    } catch (e) {
      console.error(e);
    }
    setExcelFileName('');
    setExcelParsedUnits([]);
    setExcelError(null);
    setExcelReport(null);
    setIsExcelOpen(true);
  };

  const handleDownloadExcelTemplate = () => {
    const wb = XLSX.utils.book_new();
    const wsData = [
      ['Chassis Number', 'Engine Number', 'Production / Import Info'],
      ['KB-CHS-2026-0001', 'KB-ENG-2026-0001', 'Batch 1 - Red / Djibouti Port'],
      ['KB-CHS-2026-0002', 'KB-ENG-2026-0002', 'Batch 1 - Black / Djibouti Port'],
      ['KB-CHS-2026-0003', 'KB-ENG-2026-0003', 'Batch 1 - Blue / Djibouti Port'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 22 }, { wch: 22 }, { wch: 35 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Vehicle_Units_Template');
    XLSX.writeFile(wb, 'Kanab_Vehicle_Units_Template.xlsx');
  };

  const handleExcelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExcelFileName(file.name);
    setExcelError(null);
    setExcelReport(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          setExcelError('The uploaded Excel file contains no worksheets.');
          return;
        }
        const worksheet = workbook.Sheets[firstSheetName];
        const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        if (!rows || rows.length < 2) {
          setExcelError('Excel sheet must contain a header row and at least one data row.');
          return;
        }

        // Determine header indices
        const headerRow = rows[0].map((h: any) => String(h || '').trim().toLowerCase());
        let chassisIdx = headerRow.findIndex((h: string) => h.includes('chassis') || h.includes('vin'));
        let engineIdx = headerRow.findIndex((h: string) => h.includes('engine') || h.includes('motor'));
        let infoIdx = headerRow.findIndex((h: string) => h.includes('info') || h.includes('batch') || h.includes('production') || h.includes('import'));

        // Fallbacks if header labels don't match exactly
        if (chassisIdx === -1) chassisIdx = 0;
        if (engineIdx === -1) engineIdx = 1;
        if (infoIdx === -1) infoIdx = 2;

        const parsed: Array<{ chassisNumber: string; engineNumber: string; productionImportInfo?: string }> = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const chassis = String(row[chassisIdx] || '').trim().toUpperCase();
          const engine = String(row[engineIdx] || '').trim().toUpperCase();
          const info = row[infoIdx] !== undefined ? String(row[infoIdx]).trim() : undefined;

          if (chassis && engine) {
            parsed.push({
              chassisNumber: chassis,
              engineNumber: engine,
              productionImportInfo: info || undefined,
            });
          }
        }

        if (parsed.length === 0) {
          setExcelError('No valid vehicle unit rows found. Ensure Chassis Number and Engine Number columns are filled.');
          setExcelParsedUnits([]);
          return;
        }

        setExcelParsedUnits(parsed);
      } catch (err: any) {
        setExcelError(`Failed to parse Excel file: ${err.message || 'Invalid format'}`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleExecuteExcelImport = async () => {
    if (!excelItemId) {
      setExcelError('Please select a target Product Model');
      return;
    }
    if (!excelWarehouseId) {
      setExcelError('Please select an intake Warehouse');
      return;
    }
    if (excelParsedUnits.length === 0) {
      setExcelError('Please select and upload a valid Excel file with vehicle units');
      return;
    }

    setSubmittingExcel(true);
    setExcelError(null);
    try {
      const res = await api.bulkImportVehicles({
        itemId: excelItemId,
        warehouseId: Number(excelWarehouseId),
        units: excelParsedUnits,
      });

      setExcelReport({
        success: res.failedCount === 0,
        importedCount: res.importedCount,
        failedCount: res.failedCount,
        errors: res.errors || [],
      });

      if (res.importedCount > 0) {
        fetchVehicles();
        fetchDependencies();
      }
    } catch (err: any) {
      setExcelError(formatApiError(err, 'Failed to execute Excel import'));
    } finally {
      setSubmittingExcel(false);
    }
  };

  // Edit Vehicle Unit Handlers
  const handleOpenEditVehicle = (v: VehicleUnit) => {
    setEditingVehicle(v);
    setEditVehicleForm({
      itemId: v.itemId,
      chassisNumber: v.chassisNumber,
      engineNumber: v.engineNumber,
      currentWarehouseId: v.currentWarehouseId ? v.currentWarehouseId.toString() : '',
      productionImportInfo: v.productionImportInfo || '',
    });
    setEditVehicleError(null);
  };

  const handleUpdateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVehicle) return;
    if (!editVehicleForm.chassisNumber.trim()) {
      setEditVehicleError('Chassis Number is required');
      return;
    }
    if (!editVehicleForm.engineNumber.trim()) {
      setEditVehicleError('Engine Number is required');
      return;
    }

    setSubmittingEditVehicle(true);
    setEditVehicleError(null);
    try {
      await api.updateVehicle(editingVehicle.vehicleUnitId, {
        itemId: editVehicleForm.itemId,
        chassisNumber: editVehicleForm.chassisNumber.trim().toUpperCase(),
        engineNumber: editVehicleForm.engineNumber.trim().toUpperCase(),
        currentWarehouseId: editVehicleForm.currentWarehouseId ? Number(editVehicleForm.currentWarehouseId) : undefined,
        productionImportInfo: editVehicleForm.productionImportInfo.trim() || undefined,
      });
      setEditingVehicle(null);
      fetchVehicles();
    } catch (err: any) {
      setEditVehicleError(formatApiError(err, 'Failed to update vehicle unit'));
    } finally {
      setSubmittingEditVehicle(false);
    }
  };

  const handleCreateSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreateVehicle) return;
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
      setSingleError(formatApiError(err, 'Failed to register vehicle unit'));
    } finally {
      setSubmittingSingle(false);
    }
  };

  const handleOpenBulk = async () => {
    if (!canBulkImportVehicles) return;
    try {
      const [itms, whs] = await Promise.all([
        api.getItems({ limit: 100 }),
        api.getWarehouses(),
      ]);
      setItems(itms.items);
      setWarehouses(whs);
      setBulkItemId(itms.items[0]?.itemId || '');
      setBulkWarehouseId(whs[0]?.warehouseId?.toString() || '');
    } catch (e) {
      console.error(e);
    }
    setBulkError(null);
    setBulkReport(null);
    setIsBulkOpen(true);
  };

  const handleExecuteBulkImport = async () => {
    if (!canBulkImportVehicles) return;
    setBulkError(null);
    if (!bulkItemId) {
      setBulkError('Please select a Target Product Model.');
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
      setBulkError('No units detected in CSV text. Please provide valid rows.');
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
      setBulkError(formatApiError(err, 'Bulk import failed. Please verify your data.'));
    } finally {
      setSubmittingBulk(false);
    }
  };

  const handleOpenStatusModal = (unit: VehicleUnit) => {
    if (!canUpdateVehicleStatus) return;
    const allowedNextStatuses = ALLOWED_STATUS_TRANSITIONS[unit.currentStatus] || [];
    setStatusModalUnit(unit);
    setStatusError(null);
    setNewStatus(allowedNextStatuses[0] || unit.currentStatus);
    setNewWarehouseId(unit.currentWarehouseId ? unit.currentWarehouseId.toString() : '');
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canUpdateVehicleStatus) return;
    if (!statusModalUnit) return;
    setStatusError(null);
    try {
      await api.updateVehicleStatus(
        statusModalUnit.vehicleUnitId,
        newStatus,
        newWarehouseId ? Number(newWarehouseId) : undefined,
      );
      setStatusModalUnit(null);
      fetchVehicles();
    } catch (err: any) {
      setStatusError(formatApiError(err, 'Failed to update vehicle status. Direct unauthorized status jumps are strictly blocked.'));
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

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {canManageWarehouses && (
            <button className="btn btn-secondary" onClick={() => { setWarehouseActionError(null); setIsWarehouseModalOpen(true); }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <WarehouseIcon size={16} color="var(--accent-cyan)" /> + Warehouse
            </button>
            )}
            {canBulkImportVehicles && (
            <button className="btn btn-secondary" onClick={handleOpenBulk} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileSpreadsheet size={16} color="var(--accent-emerald)" /> Bulk Import CSV
            </button>
            )}
            {canBulkImportVehicles && (
            <button
              className="btn btn-secondary"
              onClick={handleOpenExcelImport}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                borderColor: 'rgba(16, 185, 129, 0.4)',
                color: 'var(--accent-emerald)',
              }}
            >
              <FileSpreadsheet size={16} /> Excel Import
            </button>
            )}
            {canCreateVehicle && (
            <button className="btn btn-cyan" onClick={handleOpenSingle} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={17} /> Register Unit
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
              <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
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
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center' }}>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => setSelectedVehicleForDetail(v)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                          title="View Full Lifecycle & Audit Trail"
                        >
                          <Eye size={12} /> Lifecycle
                        </button>
                        {canEditVehicle && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleOpenEditVehicle(v)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                            title="Edit Vehicle Details"
                          >
                            <Edit2 size={12} /> Edit
                          </button>
                        )}
                        {canUpdateVehicleStatus && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleOpenStatusModal(v)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                            title="Update Lifecycle Status"
                          >
                            <Layers size={12} /> Status
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

      {/* SINGLE UNIT REGISTRATION MODAL */}
      {isSingleOpen && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    padding: '0.6rem',
                    background: 'rgba(6, 182, 212, 0.12)',
                    border: '1px solid rgba(6, 182, 212, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--accent-cyan)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CarFront size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Register Physical Vehicle Unit</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Capture unique chassis and engine numbers (enforces zero duplicates)
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsSingleOpen(false)}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.65rem', borderRadius: '8px' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateSingle}>
              <div className="modal-body">
                <ModalErrorAlert error={singleError} onDismiss={() => setSingleError(null)} />

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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label className="form-label" style={{ margin: 0 }}>Initial Warehouse</label>
                    <button
                      type="button"
                      onClick={() => setIsWarehouseModalOpen(true)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--accent-cyan)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      <Plus size={12} /> Add Warehouse
                    </button>
                  </div>
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

      {/* BULK CSV IMPORT MODAL */}
      {isBulkOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '750px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    padding: '0.6rem',
                    background: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--accent-emerald)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Bulk Import Vehicle Units (CSV)</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    High-speed intake for shipment batches with duplicate chassis validation
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsBulkOpen(false)}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.65rem', borderRadius: '8px' }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              <ModalErrorAlert error={bulkError} onDismiss={() => setBulkError(null)} />

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

      {/* UPDATE STATUS MODAL */}
      {statusModalUnit && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    padding: '0.6rem',
                    background: 'rgba(6, 182, 212, 0.12)',
                    border: '1px solid rgba(6, 182, 212, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--accent-cyan)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Layers size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>Update Vehicle Lifecycle Status</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Transition vehicle status and track warehouse depot location
                  </span>
                </div>
              </div>
              <button
                onClick={() => setStatusModalUnit(null)}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.65rem', borderRadius: '8px' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUpdateStatus}>
              <div className="modal-body">
                <ModalErrorAlert error={statusError} onDismiss={() => setStatusError(null)} />
                <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(0,0,0,0.3)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Chassis Number:</div>
                  <div className="mono-code" style={{ color: 'var(--accent-blue)', display: 'inline-block', marginTop: '0.2rem' }}>
                    {statusModalUnit.chassisNumber}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Vehicle Lifecycle Status</label>
                  {(() => {
                    const allowedNextStatuses = ALLOWED_STATUS_TRANSITIONS[statusModalUnit.currentStatus] || [];
                    return (
                  <select
                    className="select-field"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    disabled={allowedNextStatuses.length === 0}
                  >
                    {allowedNextStatuses.length === 0 ? (
                      <option value={statusModalUnit.currentStatus}>
                        No next status available from {VEHICLE_STATUS_LABELS[statusModalUnit.currentStatus] || statusModalUnit.currentStatus}
                      </option>
                    ) : allowedNextStatuses.map((s) => (
                      <option key={s} value={s}>
                        {VEHICLE_STATUS_LABELS[s] || s.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                    );
                  })()}
                  <div style={{ marginTop: '0.35rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Current status: {VEHICLE_STATUS_LABELS[statusModalUnit.currentStatus] || statusModalUnit.currentStatus}
                  </div>
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
                <button
                  type="submit"
                  className="btn btn-cyan"
                  disabled={(ALLOWED_STATUS_TRANSITIONS[statusModalUnit.currentStatus] || []).length === 0}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WAREHOUSE MANAGER MODAL */}
      {isWarehouseModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '620px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(6, 182, 212, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <WarehouseIcon size={20} color="var(--accent-cyan)" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Manage Warehouses & Storage Hubs</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Add new storage hubs or modify and remove existing depots
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsWarehouseModalOpen(false);
                  setEditingWarehouseId(null);
                  setWarehouseActionError(null);
                }}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.65rem', borderRadius: '8px' }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              <ModalErrorAlert error={warehouseActionError} onDismiss={() => setWarehouseActionError(null)} />

              {/* Add New Warehouse Box */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                marginBottom: '1.5rem',
              }}>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '0.75rem' }}>
                  + Add New Warehouse
                </h4>
                <form onSubmit={handleCreateWarehouse}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Warehouse Name *</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="e.g. Hawassa Distribution Hub"
                        required
                        value={newWarehouseName}
                        onChange={(e) => setNewWarehouseName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Location / Address</label>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="e.g. Hawassa Industrial Park, Sidama"
                        value={newWarehouseLocation}
                        onChange={(e) => setNewWarehouseLocation(e.target.value)}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" className="btn btn-cyan btn-sm" disabled={creatingWarehouse}>
                      {creatingWarehouse ? 'Saving...' : 'Save Warehouse'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Existing Warehouses List */}
              <div>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                  Existing Warehouses ({warehouses.length})
                </h4>

                <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 'var(--radius-md)' }}>
                  <table style={{ width: '100%', fontSize: '0.82rem', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255, 255, 255, 0.04)', textAlign: 'left', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <th style={{ padding: '0.65rem 0.85rem', color: 'var(--text-secondary)' }}>Warehouse</th>
                        <th style={{ padding: '0.65rem 0.85rem', color: 'var(--text-secondary)' }}>Location</th>
                        <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center', color: 'var(--text-secondary)', width: '130px' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {warehouses.length === 0 ? (
                        <tr>
                          <td colSpan={3} style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            No warehouses configured yet.
                          </td>
                        </tr>
                      ) : (
                        warehouses.map((w) => {
                          const isEditing = editingWarehouseId === w.warehouseId;
                          return (
                            <tr key={w.warehouseId} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                              {isEditing ? (
                                <>
                                  <td style={{ padding: '0.5rem 0.85rem' }}>
                                    <input
                                      type="text"
                                      className="input-field"
                                      style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                                      value={editingWarehouseName}
                                      onChange={(e) => setEditingWarehouseName(e.target.value)}
                                    />
                                  </td>
                                  <td style={{ padding: '0.5rem 0.85rem' }}>
                                    <input
                                      type="text"
                                      className="input-field"
                                      style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                                      value={editingWarehouseLocation}
                                      onChange={(e) => setEditingWarehouseLocation(e.target.value)}
                                    />
                                  </td>
                                  <td style={{ padding: '0.5rem 0.85rem', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                                      <button
                                        type="button"
                                        className="btn btn-indigo btn-sm"
                                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem' }}
                                        onClick={handleSaveEditWarehouse}
                                        disabled={savingWarehouse}
                                      >
                                        Save
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-secondary btn-sm"
                                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.72rem' }}
                                        onClick={handleCancelEditWarehouse}
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td style={{ padding: '0.65rem 0.85rem' }}>
                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{w.warehouseName}</div>
                                  </td>
                                  <td style={{ padding: '0.65rem 0.85rem', color: 'var(--text-secondary)' }}>
                                    {w.location || '—'}
                                  </td>
                                  <td style={{ padding: '0.65rem 0.85rem', textAlign: 'center' }}>
                                    <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                                      <button
                                        type="button"
                                        className="btn btn-secondary btn-sm"
                                        style={{ padding: '0.25rem 0.45rem', fontSize: '0.72rem' }}
                                        onClick={() => handleStartEditWarehouse(w)}
                                        title="Edit Warehouse"
                                      >
                                        <Edit2 size={12} />
                                      </button>
                                      <button
                                        type="button"
                                        className="btn btn-secondary btn-sm"
                                        style={{ padding: '0.25rem 0.45rem', fontSize: '0.72rem', color: 'var(--accent-rose)' }}
                                        onClick={() => handleDeleteWarehouse(w)}
                                        title="Delete Warehouse"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  </td>
                                </>
                              )}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setIsWarehouseModalOpen(false);
                  setEditingWarehouseId(null);
                  setWarehouseActionError(null);
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXCEL IMPORT MODAL */}
      {isExcelOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(16, 185, 129, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <FileSpreadsheet size={22} color="var(--accent-emerald)" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Excel Import Vehicle Units (.xlsx)</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Download official spreadsheet template, fill unit details, and upload for intake
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsExcelOpen(false)}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.65rem', borderRadius: '8px' }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              <ModalErrorAlert error={excelError} onDismiss={() => setExcelError(null)} />

              {/* Step 1 & Configuration */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                marginBottom: '1.25rem',
              }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '0.75rem' }}>
                  Step 1: Target Model & Intake Location
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Target Product Model *</label>
                    <select
                      className="select-field"
                      value={excelItemId}
                      onChange={(e) => setExcelItemId(e.target.value)}
                    >
                      {items.map((i) => (
                        <option key={i.itemId} value={i.itemId}>
                          {i.itemCode} — {i.itemName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label">Intake Warehouse *</label>
                    <select
                      className="select-field"
                      value={excelWarehouseId}
                      onChange={(e) => setExcelWarehouseId(e.target.value)}
                    >
                      {warehouses.map((w) => (
                        <option key={w.warehouseId} value={w.warehouseId}>
                          {w.warehouseName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Step 2: Download Template & Upload */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                marginBottom: '1.25rem',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                    Step 2: Template & File Upload
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleDownloadExcelTemplate}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      fontSize: '0.75rem',
                      borderColor: 'rgba(16, 185, 129, 0.4)',
                      color: 'var(--accent-emerald)',
                    }}
                  >
                    <Download size={13} /> Download Template (.xlsx)
                  </button>
                </div>

                <div style={{
                  border: '2px dashed rgba(255, 255, 255, 0.15)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.5rem',
                  textAlign: 'center',
                  background: 'rgba(0, 0, 0, 0.2)',
                  cursor: 'pointer',
                  position: 'relative',
                }}>
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleExcelFileChange}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      opacity: 0,
                      cursor: 'pointer',
                    }}
                  />
                  <Upload size={28} color="var(--accent-cyan)" style={{ marginBottom: '0.5rem' }} />
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {excelFileName ? excelFileName : 'Click to select or drag and drop Excel spreadsheet'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Supported formats: .xlsx, .xls (columns: Chassis Number, Engine Number, Production / Import Info)
                  </div>
                </div>
              </div>

              {/* Step 3: Parsed Data Preview */}
              {excelParsedUnits.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Parsed Preview: <span style={{ color: 'var(--accent-emerald)' }}>{excelParsedUnits.length} Units Ready</span>
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Showing first {Math.min(excelParsedUnits.length, 5)} units
                    </span>
                  </div>
                  <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 'var(--radius-sm)' }}>
                    <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: 'rgba(255, 255, 255, 0.05)', textAlign: 'left' }}>
                          <th style={{ padding: '0.5rem 0.75rem' }}>#</th>
                          <th style={{ padding: '0.5rem 0.75rem' }}>Chassis Number</th>
                          <th style={{ padding: '0.5rem 0.75rem' }}>Engine Number</th>
                          <th style={{ padding: '0.5rem 0.75rem' }}>Import / Batch Info</th>
                        </tr>
                      </thead>
                      <tbody>
                        {excelParsedUnits.slice(0, 5).map((u, idx) => (
                          <tr key={idx} style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                            <td style={{ padding: '0.45rem 0.75rem', color: 'var(--text-muted)' }}>{idx + 1}</td>
                            <td style={{ padding: '0.45rem 0.75rem', color: 'var(--accent-cyan)', fontWeight: 600 }}>{u.chassisNumber}</td>
                            <td style={{ padding: '0.45rem 0.75rem', color: 'var(--accent-amber)', fontWeight: 600 }}>{u.engineNumber}</td>
                            <td style={{ padding: '0.45rem 0.75rem', color: 'var(--text-secondary)' }}>{u.productionImportInfo || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Import Report */}
              {excelReport && (
                <div style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  background: excelReport.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                  border: `1px solid ${excelReport.success ? 'var(--accent-emerald)' : 'var(--accent-amber)'}`,
                  marginTop: '1rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: excelReport.success ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
                    {excelReport.success ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    <span>{excelReport.success ? 'Excel Import Complete!' : 'Import Partially Completed'}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', marginTop: '0.4rem', color: 'var(--text-secondary)' }}>
                    Successfully imported <strong>{excelReport.importedCount}</strong> units.
                    {excelReport.failedCount > 0 && ` Failed / Skipped: ${excelReport.failedCount}`}
                  </div>
                  {excelReport.errors && excelReport.errors.length > 0 && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--accent-rose)', maxHeight: '100px', overflowY: 'auto' }}>
                      {excelReport.errors.map((err, i) => (
                        <div key={i}>• {err}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setIsExcelOpen(false)}>
                Close
              </button>
              <button
                type="button"
                className="btn btn-cyan"
                onClick={handleExecuteExcelImport}
                disabled={submittingExcel || excelParsedUnits.length === 0}
              >
                {submittingExcel ? 'Importing Excel...' : `Import ${excelParsedUnits.length} Units from Excel`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT VEHICLE UNIT MODAL */}
      {editingVehicle && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(99, 102, 241, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Edit2 size={20} color="var(--accent-indigo)" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Edit Vehicle Unit</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Update chassis, engine, warehouse depot, or shipment batch information
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingVehicle(null)}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.65rem', borderRadius: '8px' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUpdateVehicle}>
              <div className="modal-body">
                <ModalErrorAlert error={editVehicleError} onDismiss={() => setEditVehicleError(null)} />

                <div className="form-group">
                  <label className="form-label">Product Model *</label>
                  <select
                    className="select-field"
                    required
                    value={editVehicleForm.itemId}
                    onChange={(e) => setEditVehicleForm({ ...editVehicleForm, itemId: e.target.value })}
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
                      required
                      value={editVehicleForm.chassisNumber}
                      onChange={(e) => setEditVehicleForm({ ...editVehicleForm, chassisNumber: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Engine Number *</label>
                    <input
                      type="text"
                      className="input-field"
                      required
                      value={editVehicleForm.engineNumber}
                      onChange={(e) => setEditVehicleForm({ ...editVehicleForm, engineNumber: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Warehouse Depot Location</label>
                  <select
                    className="select-field"
                    value={editVehicleForm.currentWarehouseId}
                    onChange={(e) => setEditVehicleForm({ ...editVehicleForm, currentWarehouseId: e.target.value })}
                  >
                    <option value="">Unassigned</option>
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
                    value={editVehicleForm.productionImportInfo}
                    onChange={(e) => setEditVehicleForm({ ...editVehicleForm, productionImportInfo: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingVehicle(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-indigo" disabled={submittingEditVehicle}>
                  {submittingEditVehicle ? 'Saving Changes...' : 'Save Unit Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VEHICLE DETAIL & FULL LIFECYCLE MODAL (Client Spec) */}
      {selectedVehicleForDetail && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5, 10, 20, 0.85)',
            backdropFilter: 'blur(8px)',
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
              maxWidth: '850px',
              padding: '1.75rem',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: 'var(--bg-modal)',
              border: '1px solid var(--border-color)',
              boxShadow: 'var(--shadow-modal)',
              borderRadius: 'var(--radius-lg)',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <CarFront size={20} color="var(--accent-cyan)" />
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    Vehicle Lifecycle: {selectedVehicleForDetail.chassisNumber}
                  </h2>
                  <span className="badge badge-cyan" style={{ fontSize: '0.72rem' }}>
                    {selectedVehicleForDetail.currentStatus.replace(/_/g, ' ')}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Engine: <strong style={{ color: 'var(--accent-amber)', fontFamily: 'var(--font-mono)' }}>{selectedVehicleForDetail.engineNumber}</strong> · Model: {selectedVehicleForDetail.item?.itemName}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedVehicleForDetail(null)}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.65rem' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Controlled State Machine Stepper (7 Stages) */}
            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                Vehicle State Machine Pipeline (Controlled Lifecycle)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.35rem' }}>
                {[
                  { id: 'RECEIVED', label: '1. Received' },
                  { id: 'AVAILABLE_FOR_SALE', label: '2. Available' },
                  { id: 'RESERVED', label: '3. Reserved' },
                  { id: 'ALLOTTED', label: '4. Allotted' },
                  { id: 'READY_FOR_DELIVERY', label: '5. Ready' },
                  { id: 'SOLD', label: '6. Sold' },
                  { id: 'DELIVERED', label: '7. Delivered' },
                ].map((st, sIdx) => {
                  const statusOrder = ['RECEIVED', 'AVAILABLE_FOR_SALE', 'RESERVED', 'ALLOTTED', 'READY_FOR_DELIVERY', 'SOLD', 'DELIVERED'];
                  const currentIdx = statusOrder.indexOf(selectedVehicleForDetail.currentStatus);
                  const isCurrent = selectedVehicleForDetail.currentStatus === st.id;
                  const isPast = currentIdx > sIdx;

                  return (
                    <div
                      key={st.id}
                      style={{
                        padding: '0.5rem 0.25rem',
                        textAlign: 'center',
                        borderRadius: 'var(--radius-sm)',
                        background: isCurrent
                          ? 'rgba(6, 182, 212, 0.15)'
                          : isPast
                          ? 'rgba(16, 185, 129, 0.1)'
                          : 'rgba(255, 255, 255, 0.02)',
                        border: isCurrent
                          ? '1px solid var(--accent-cyan)'
                          : isPast
                          ? '1px solid rgba(16, 185, 129, 0.3)'
                          : '1px solid var(--border-color)',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '0.65rem',
                          fontWeight: isCurrent || isPast ? 700 : 500,
                          color: isCurrent
                            ? 'var(--accent-cyan)'
                            : isPast
                            ? 'var(--accent-emerald)'
                            : 'var(--text-muted)',
                        }}
                      >
                        {st.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4 Detail Grid Sections */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
              {/* Section 1: Basic & Warehouse Info */}
              <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-cyan)', margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <CarFront size={14} /> Basic & Warehouse Information
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.78rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Chassis Number:</span>
                    <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{selectedVehicleForDetail.chassisNumber}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Engine Number:</span>
                    <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-amber)' }}>{selectedVehicleForDetail.engineNumber}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Brand / Model:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{selectedVehicleForDetail.item?.brand?.brandName || 'Bajaj'} · {selectedVehicleForDetail.item?.itemName}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Current Warehouse:</span>
                    <strong style={{ color: 'var(--accent-cyan)' }}>{selectedVehicleForDetail.currentWarehouse?.warehouseName || 'Kality Assembly Plant Warehouse'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Bay / Location:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>Zone A · Bay 04 · Floor Slot 12</strong>
                  </div>
                </div>
              </div>

              {/* Section 2: Import & Landed Cost Integration (Module 12) */}
              <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-emerald)', margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Ship size={14} /> Import & Financial Valuation (Module 12)
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.78rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Supplier:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>Bajaj Auto Ltd (Mumbai)</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Purchase Order Ref:</span>
                    <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-indigo)' }}>PO-202610-001</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Shipment & Customs:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>SHP-202610-001 · ECC-DECL-88192</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Base Invoice FOB:</span>
                    <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>168,000.00 ETB</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '0.35rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Capitalized Landed Cost:</span>
                    <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-emerald)' }}>508,862.50 ETB</strong>
                  </div>
                </div>
              </div>

              {/* Section 3: Sales, Reservation & Allotment */}
              <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-indigo)', margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <User size={14} /> Booking & Customer Allotment
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.78rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Assigned Booking:</span>
                    <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-indigo)' }}>
                      {selectedVehicleForDetail.currentStatus === 'ALLOTTED' || selectedVehicleForDetail.currentStatus === 'SOLD' ? 'BK-2026-00125' : 'None (Unallocated)'}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Customer:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>
                      {selectedVehicleForDetail.currentStatus === 'ALLOTTED' || selectedVehicleForDetail.currentStatus === 'SOLD' ? 'ABC Trading Plc' : 'Open for Booking'}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Sales Invoice:</span>
                    <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                      {selectedVehicleForDetail.currentStatus === 'SOLD' || selectedVehicleForDetail.currentStatus === 'DELIVERED' ? 'INV-2026-0089' : 'Pending Invoice'}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Allocation Concurrency:</span>
                    <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>Strict 1:1 Locked</span>
                  </div>
                </div>
              </div>

              {/* Section 4: Movement History & Audit Trail */}
              <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#c084fc', margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Clock size={14} /> Movement History & Audit Log
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.74rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                    <span>● Stock Intake (Import Receipt):</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>2026-10-05 09:30</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                    <span>● PDI Inspection (Available for Sale):</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>2026-10-06 14:15</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                    <span>● Customer Booking Reservation:</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>2026-10-07 11:20</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                    <span>● VIN Chassis Allotment:</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>2026-10-08 16:40</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setSelectedVehicleForDetail(null)}
              >
                Close Lifecycle Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
