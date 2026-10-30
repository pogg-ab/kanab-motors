import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Mail,
  Phone,
  MapPin,
  Edit2,
  UserCheck,
  UserX,
  Ship,
} from 'lucide-react';
import { api, Supplier, FreightForwarder } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { ModalErrorAlert } from '../../components/ModalErrorAlert';
import { formatApiError } from '../../utils/error';

export const SuppliersPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const canCreateSupplier = hasPermission('SUPPLIERS_CREATE');
  const canEditSupplier = hasPermission('SUPPLIERS_EDIT');

  // Active top tab: Suppliers vs Freight Forwarders
  const [activeTab, setActiveTab] = useState<'suppliers' | 'forwarders'>('suppliers');

  // Supplier state
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState<boolean>(true);
  const [supplierSearch, setSupplierSearch] = useState<string>('');
  const [supplierStatusFilter, setSupplierStatusFilter] = useState<string>('');
  const [showSupplierModal, setShowSupplierModal] = useState<boolean>(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierError, setSupplierError] = useState<string | null>(null);

  const [supplierFormData, setSupplierFormData] = useState<{
    supplierName: string;
    country: string;
    contactPerson: string;
    phone: string;
    email: string;
    address: string;
    isActive: boolean;
  }>({
    supplierName: '',
    country: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    isActive: true,
  });

  // Freight Forwarder state (IMP-23)
  const [forwarders, setForwarders] = useState<FreightForwarder[]>([]);
  const [loadingForwarders, setLoadingForwarders] = useState<boolean>(false);
  const [forwarderSearch, setForwarderSearch] = useState<string>('');
  const [forwarderStatusFilter, setForwarderStatusFilter] = useState<string>('');
  const [showForwarderModal, setShowForwarderModal] = useState<boolean>(false);
  const [editingForwarder, setEditingForwarder] = useState<FreightForwarder | null>(null);
  const [forwarderError, setForwarderError] = useState<string | null>(null);

  const [forwarderFormData, setForwarderFormData] = useState<{
    name: string;
    country: string;
    contactPerson: string;
    phone: string;
    email: string;
    address: string;
    isActive: boolean;
  }>({
    name: '',
    country: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    isActive: true,
  });

  const [saving, setSaving] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    loadSuppliers();
    loadForwarders();
  }, []);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadSuppliers = async () => {
    setLoadingSuppliers(true);
    try {
      const data = await api.getSuppliers();
      setSuppliers(data);
    } catch (err: any) {
      showToast('error', formatApiError(err, 'Failed to load suppliers'));
    } finally {
      setLoadingSuppliers(false);
    }
  };

  const loadForwarders = async () => {
    setLoadingForwarders(true);
    try {
      const data = await api.getFreightForwarders();
      setForwarders(data);
    } catch (err: any) {
      showToast('error', formatApiError(err, 'Failed to load freight forwarders'));
    } finally {
      setLoadingForwarders(false);
    }
  };

  // Supplier Save
  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setSupplierError(null);
    if (!supplierFormData.supplierName.trim()) {
      setSupplierError('Supplier name is required');
      return;
    }
    setSaving(true);
    try {
      if (editingSupplier) {
        await api.updateSupplier(editingSupplier.supplierId, supplierFormData);
        showToast('success', `Supplier '${supplierFormData.supplierName}' updated successfully!`);
      } else {
        await api.createSupplier(supplierFormData);
        showToast('success', `Supplier '${supplierFormData.supplierName}' registered successfully!`);
      }
      setShowSupplierModal(false);
      setEditingSupplier(null);
      setSupplierError(null);
      setSupplierFormData({
        supplierName: '',
        country: '',
        contactPerson: '',
        phone: '',
        email: '',
        address: '',
        isActive: true,
      });
      loadSuppliers();
    } catch (err: any) {
      setSupplierError(formatApiError(err, 'Failed to save supplier'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActiveSupplier = async (supplier: Supplier) => {
    try {
      await api.updateSupplier(supplier.supplierId, { isActive: !supplier.isActive });
      showToast('success', `Supplier status updated to ${!supplier.isActive ? 'Active' : 'Inactive'}`);
      loadSuppliers();
    } catch (err: any) {
      showToast('error', formatApiError(err, 'Failed to update status'));
    }
  };

  // Freight Forwarder Save (IMP-23)
  const handleSaveForwarder = async (e: React.FormEvent) => {
    e.preventDefault();
    setForwarderError(null);
    if (!forwarderFormData.name.trim()) {
      setForwarderError('Forwarder company name is required');
      return;
    }
    setSaving(true);
    try {
      if (editingForwarder) {
        await api.updateFreightForwarder(editingForwarder.freightForwarderId, forwarderFormData);
        showToast('success', `Freight forwarder '${forwarderFormData.name}' updated successfully!`);
      } else {
        await api.createFreightForwarder(forwarderFormData);
        showToast('success', `Freight forwarder '${forwarderFormData.name}' registered successfully!`);
      }
      setShowForwarderModal(false);
      setEditingForwarder(null);
      setForwarderError(null);
      setForwarderFormData({
        name: '',
        country: '',
        contactPerson: '',
        phone: '',
        email: '',
        address: '',
        isActive: true,
      });
      loadForwarders();
    } catch (err: any) {
      setForwarderError(formatApiError(err, 'Failed to save freight forwarder'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActiveForwarder = async (ff: FreightForwarder) => {
    try {
      await api.updateFreightForwarder(ff.freightForwarderId, { isActive: !ff.isActive });
      showToast('success', `Forwarder status updated to ${!ff.isActive ? 'Active' : 'Inactive'}`);
      loadForwarders();
    } catch (err: any) {
      showToast('error', formatApiError(err, 'Failed to update forwarder status'));
    }
  };

  // Supplier metrics
  const activeSuppliers = suppliers.filter((s) => s.isActive);
  const inactiveSuppliers = suppliers.filter((s) => !s.isActive);
  const originHubs = Array.from(
    new Set(
      suppliers
        .map((s) => s.country?.trim())
        .filter((country): country is string => Boolean(country)),
    ),
  );
  const procurementReadiness = suppliers.length > 0 ? Math.round((activeSuppliers.length / suppliers.length) * 100) : 0;

  const filteredSuppliers = suppliers.filter((s) => {
    const matchesSearch =
      s.supplierName?.toLowerCase().includes(supplierSearch.toLowerCase()) ||
      s.country?.toLowerCase().includes(supplierSearch.toLowerCase()) ||
      s.contactPerson?.toLowerCase().includes(supplierSearch.toLowerCase());
    const matchesStatus =
      supplierStatusFilter === ''
        ? true
        : supplierStatusFilter === 'ACTIVE'
        ? s.isActive
        : !s.isActive;
    return matchesSearch && matchesStatus;
  });

  // Forwarder metrics
  const activeForwarders = forwarders.filter((f) => f.isActive);
  const inactiveForwarders = forwarders.filter((f) => !f.isActive);
  const filteredForwarders = forwarders.filter((f) => {
    const matchesSearch =
      f.name?.toLowerCase().includes(forwarderSearch.toLowerCase()) ||
      f.country?.toLowerCase().includes(forwarderSearch.toLowerCase()) ||
      f.contactPerson?.toLowerCase().includes(forwarderSearch.toLowerCase());
    const matchesStatus =
      forwarderStatusFilter === ''
        ? true
        : forwarderStatusFilter === 'ACTIVE'
        ? f.isActive
        : !f.isActive;
    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <span style={{ color: 'var(--accent-cyan)' }}>★</span>
        <span>Logistics & Import</span>
        <span>/</span>
        <span style={{ color: 'var(--text-secondary)' }}>Procurement Master Data</span>
        <span>/</span>
        <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>
          {activeTab === 'suppliers' ? 'Suppliers' : 'Freight Forwarders (IMP-23)'}
        </span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 0.35rem 0', letterSpacing: '-0.02em' }}>
            {activeTab === 'suppliers' ? 'International Supplier Master Data' : 'Freight Forwarder Master Catalog (IMP-23)'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
            {activeTab === 'suppliers'
              ? 'Foreign vehicle manufacturers, OEM distributors, and approved domestic logistics suppliers'
              : 'Approved shipping agents, international freight forwarders, and logistics clearance partners'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={() => {
              if (activeTab === 'suppliers') loadSuppliers();
              else loadForwarders();
            }}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <RefreshCw size={15} className={loadingSuppliers || loadingForwarders ? 'spin' : ''} />
            Refresh
          </button>

          {activeTab === 'suppliers' ? (
            canCreateSupplier && (
              <button
                onClick={() => {
                  setSupplierError(null);
                  setEditingSupplier(null);
                  setSupplierFormData({ supplierName: '', country: '', contactPerson: '', phone: '', email: '', address: '', isActive: true });
                  setShowSupplierModal(true);
                }}
                className="btn btn-cyan"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Plus size={16} />
                Register Supplier
              </button>
            )
          ) : (
            <button
              onClick={() => {
                setForwarderError(null);
                setEditingForwarder(null);
                setForwarderFormData({ name: '', country: '', contactPerson: '', phone: '', email: '', address: '', isActive: true });
                setShowForwarderModal(true);
              }}
              className="btn btn-cyan"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Plus size={16} />
              Register Freight Forwarder
            </button>
          )}
        </div>
      </div>

      {/* Master Toggle Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem' }}>
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`filter-pill ${activeTab === 'suppliers' ? 'active' : ''}`}
          style={{ borderRadius: 'var(--radius-md) var(--radius-md) 0 0', borderBottom: 'none' }}
        >
          <Building2 size={15} />
          <span>Vehicle & Parts Suppliers ({suppliers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('forwarders')}
          className={`filter-pill ${activeTab === 'forwarders' ? 'active' : ''}`}
          style={{ borderRadius: 'var(--radius-md) var(--radius-md) 0 0', borderBottom: 'none' }}
        >
          <Ship size={15} />
          <span>Freight Forwarders (IMP-23) ({forwarders.length})</span>
        </button>
      </div>

      {/* Toast Notification */}
      {notification && (
        <div
          style={{
            padding: '0.9rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.5rem',
            background: notification.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            border: `1px solid ${notification.type === 'success' ? 'var(--accent-emerald)' : 'var(--accent-rose)'}`,
            color: notification.type === 'success' ? 'var(--accent-emerald)' : 'var(--accent-rose)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{notification.msg}</span>
        </div>
      )}

      {/* ===================== TAB 1: SUPPLIERS ===================== */}
      {activeTab === 'suppliers' && (
        <>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
            <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  TOTAL SUPPLIERS
                </span>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(0, 210, 211, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={17} color="var(--accent-cyan)" />
                </div>
              </div>
              <div style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>{suppliers.length}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.65rem' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--accent-emerald)', fontWeight: 600, background: 'rgba(16, 185, 129, 0.1)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                  {activeSuppliers.length} Active Partners
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Verified manufacturers</span>
              </div>
            </div>

            <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  PRIMARY ORIGIN HUBS
                </span>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Globe size={17} color="var(--accent-indigo)" />
                </div>
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--accent-indigo)', letterSpacing: '-0.01em', marginTop: '0.25rem' }}>
                {originHubs.length > 0 ? originHubs.slice(0, 4).join(' · ') : 'No origins yet'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.65rem' }}>
                {originHubs.length > 4 ? `+${originHubs.length - 4} more registered origin hubs` : `${originHubs.length} registered supplier origin${originHubs.length === 1 ? '' : 's'}`}
              </div>
            </div>

            <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  PROCUREMENT READINESS
                </span>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UserCheck size={17} color="var(--accent-emerald)" />
                </div>
              </div>
              <div style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--accent-emerald)', letterSpacing: '-0.02em', lineHeight: 1 }}>
                {procurementReadiness}%
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.65rem' }}>
                {activeSuppliers.length} of {suppliers.length} suppliers active for Purchase Order linkage
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="card" style={{ padding: '0.85rem 1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '0.45rem' }}>
              {[
                { id: '', label: `All Suppliers (${suppliers.length})` },
                { id: 'ACTIVE', label: `Active (${activeSuppliers.length})` },
                { id: 'INACTIVE', label: `Inactive (${inactiveSuppliers.length})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSupplierStatusFilter(tab.id)}
                  className={`filter-pill ${supplierStatusFilter === tab.id ? 'active' : ''}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div style={{ position: 'relative', width: '340px', minWidth: '260px' }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="input"
                placeholder="Search supplier name, country, contact..."
                value={supplierSearch}
                onChange={(e) => setSupplierSearch(e.target.value)}
                style={{ paddingLeft: '36px', height: '38px', fontSize: '0.825rem' }}
              />
            </div>
          </div>

          {/* Suppliers Table */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '0.85rem 1.15rem', textAlign: 'left', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>SUPPLIER NAME</th>
                    <th style={{ padding: '0.85rem 1.15rem', textAlign: 'left', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>COUNTRY / REGION</th>
                    <th style={{ padding: '0.85rem 1.15rem', textAlign: 'left', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>CONTACT PERSON</th>
                    <th style={{ padding: '0.85rem 1.15rem', textAlign: 'left', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>COMMUNICATION</th>
                    <th style={{ padding: '0.85rem 1.15rem', textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>STATUS</th>
                    <th style={{ padding: '0.85rem 1.15rem', textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingSuppliers ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <RefreshCw size={20} className="spin" style={{ display: 'inline-block', marginBottom: '0.5rem' }} />
                        <div>Loading Suppliers catalog...</div>
                      </td>
                    </tr>
                  ) : filteredSuppliers.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No suppliers found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredSuppliers.map((s) => (
                      <tr key={s.supplierId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '1rem 1.15rem' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                            {s.supplierName}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                            Registered: {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : 'N/A'}
                          </div>
                        </td>
                        <td style={{ padding: '1rem 1.15rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                            <Globe size={14} color="var(--accent-cyan)" />
                            {s.country || 'International'}
                          </div>
                          {s.address && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.2rem' }}>
                              <MapPin size={12} />
                              {s.address}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '1rem 1.15rem' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {s.contactPerson || '–'}
                          </div>
                        </td>
                        <td style={{ padding: '1rem 1.15rem' }}>
                          {s.phone && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <Phone size={12} /> {s.phone}
                            </div>
                          )}
                          {s.email && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.2rem' }}>
                              <Mail size={12} /> {s.email}
                            </div>
                          )}
                          {!s.phone && !s.email && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>–</span>
                          )}
                        </td>
                        <td style={{ padding: '1rem 1.15rem', textAlign: 'center' }}>
                          <span className={`badge ${s.isActive ? 'badge-emerald' : 'badge-rose'}`}>
                            {s.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 1.15rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                            {canEditSupplier && (
                              <>
                                <button
                                  onClick={() => {
                                    setSupplierError(null);
                                    setEditingSupplier(s);
                                    setSupplierFormData({
                                      supplierName: s.supplierName,
                                      country: s.country || '',
                                      contactPerson: s.contactPerson || '',
                                      phone: s.phone || '',
                                      email: s.email || '',
                                      address: s.address || '',
                                      isActive: s.isActive,
                                    });
                                    setShowSupplierModal(true);
                                  }}
                                  className="btn btn-secondary"
                                  style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                                  title="Edit Supplier"
                                >
                                  <Edit2 size={13} /> Edit
                                </button>
                                <button
                                  onClick={() => handleToggleActiveSupplier(s)}
                                  className="btn btn-secondary"
                                  style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                                  title={s.isActive ? 'Deactivate' : 'Activate'}
                                >
                                  {s.isActive ? <UserX size={13} color="var(--accent-rose)" /> : <UserCheck size={13} color="var(--accent-emerald)" />}
                                </button>
                              </>
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
        </>
      )}

      {/* ===================== TAB 2: FREIGHT FORWARDERS (IMP-23) ===================== */}
      {activeTab === 'forwarders' && (
        <>
          {/* Forwarder KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
            <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  FREIGHT FORWARDERS
                </span>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Ship size={17} color="var(--accent-indigo)" />
                </div>
              </div>
              <div style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>{forwarders.length}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.65rem' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--accent-emerald)', fontWeight: 600, background: 'rgba(16, 185, 129, 0.1)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                  {activeForwarders.length} Active Logistics Partners
                </span>
              </div>
            </div>

            <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  COMPLIANCE & QUOTATION POOL
                </span>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UserCheck size={17} color="var(--accent-emerald)" />
                </div>
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--accent-emerald)', letterSpacing: '-0.01em', marginTop: '0.25rem' }}>
                {forwarders.length >= 3 ? 'Multi-Quote Ready' : 'Low Quoting Pool'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.65rem' }}>
                Complies with competitive tender rules (minimum 3 quotes recommended)
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="card" style={{ padding: '0.85rem 1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '0.45rem' }}>
              {[
                { id: '', label: `All Forwarders (${forwarders.length})` },
                { id: 'ACTIVE', label: `Active (${activeForwarders.length})` },
                { id: 'INACTIVE', label: `Inactive (${inactiveForwarders.length})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setForwarderStatusFilter(tab.id)}
                  className={`filter-pill ${forwarderStatusFilter === tab.id ? 'active' : ''}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div style={{ position: 'relative', width: '340px', minWidth: '260px' }}>
              <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="input"
                placeholder="Search forwarder name, country, agent..."
                value={forwarderSearch}
                onChange={(e) => setForwarderSearch(e.target.value)}
                style={{ paddingLeft: '36px', height: '38px', fontSize: '0.825rem' }}
              />
            </div>
          </div>

          {/* Forwarders Table */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '0.85rem 1.15rem', textAlign: 'left', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>FORWARDER / SHIPPING LINE</th>
                    <th style={{ padding: '0.85rem 1.15rem', textAlign: 'left', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>COUNTRY / HUB</th>
                    <th style={{ padding: '0.85rem 1.15rem', textAlign: 'left', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>CONTACT PERSON</th>
                    <th style={{ padding: '0.85rem 1.15rem', textAlign: 'left', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>CONTACT CHANNELS</th>
                    <th style={{ padding: '0.85rem 1.15rem', textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>STATUS</th>
                    <th style={{ padding: '0.85rem 1.15rem', textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingForwarders ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <RefreshCw size={20} className="spin" style={{ display: 'inline-block', marginBottom: '0.5rem' }} />
                        <div>Loading Freight Forwarders master catalog...</div>
                      </td>
                    </tr>
                  ) : filteredForwarders.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No freight forwarders registered.
                      </td>
                    </tr>
                  ) : (
                    filteredForwarders.map((f) => (
                      <tr key={f.freightForwarderId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '1rem 1.15rem' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                            {f.name}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                            ID: #{f.freightForwarderId} · Active Logistics Agent
                          </div>
                        </td>
                        <td style={{ padding: '1rem 1.15rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                            <Globe size={14} color="var(--accent-cyan)" />
                            {f.country || 'International'}
                          </div>
                          {f.address && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.2rem' }}>
                              <MapPin size={12} />
                              {f.address}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '1rem 1.15rem' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {f.contactPerson || '–'}
                          </div>
                        </td>
                        <td style={{ padding: '1rem 1.15rem' }}>
                          {f.phone && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <Phone size={12} /> {f.phone}
                            </div>
                          )}
                          {f.email && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.2rem' }}>
                              <Mail size={12} /> {f.email}
                            </div>
                          )}
                          {!f.phone && !f.email && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>–</span>
                          )}
                        </td>
                        <td style={{ padding: '1rem 1.15rem', textAlign: 'center' }}>
                          <span className={`badge ${f.isActive ? 'badge-emerald' : 'badge-rose'}`}>
                            {f.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 1.15rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                            <button
                              onClick={() => {
                                setForwarderError(null);
                                setEditingForwarder(f);
                                setForwarderFormData({
                                  name: f.name,
                                  country: f.country || '',
                                  contactPerson: f.contactPerson || '',
                                  phone: f.phone || '',
                                  email: f.email || '',
                                  address: f.address || '',
                                  isActive: f.isActive,
                                });
                                setShowForwarderModal(true);
                              }}
                              className="btn btn-secondary"
                              style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                              title="Edit Forwarder"
                            >
                              <Edit2 size={13} /> Edit
                            </button>
                            <button
                              onClick={() => handleToggleActiveForwarder(f)}
                              className="btn btn-secondary"
                              style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                              title={f.isActive ? 'Deactivate' : 'Activate'}
                            >
                              {f.isActive ? <UserX size={13} color="var(--accent-rose)" /> : <UserCheck size={13} color="var(--accent-emerald)" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Modal: Create/Edit Supplier */}
      {showSupplierModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '620px' }}>
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
                  <Building2 size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    {editingSupplier ? 'Edit Supplier Partner' : 'Register International Supplier'}
                  </h2>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Foreign manufacturing & OEM partner master profile</span>
                </div>
              </div>
              <button onClick={() => setShowSupplierModal(false)} className="btn btn-secondary" style={{ padding: '0.35rem 0.65rem', borderRadius: '8px' }}>✕</button>
            </div>

            <form onSubmit={handleSaveSupplier}>
              <div className="modal-body">
                <ModalErrorAlert error={supplierError} onDismiss={() => setSupplierError(null)} />
                <div style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Supplier / Manufacturer Name *</label>
                  <input
                    type="text"
                    className="input"
                    value={supplierFormData.supplierName}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, supplierName: e.target.value })}
                    placeholder="e.g. Sinotruk Heavy Equipment Co. Ltd."
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label className="form-label">Country of Origin *</label>
                    <input
                      type="text"
                      className="input"
                      value={supplierFormData.country}
                      onChange={(e) => setSupplierFormData({ ...supplierFormData, country: e.target.value })}
                      placeholder="e.g. China, Germany, UAE"
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">Contact Person</label>
                    <input
                      type="text"
                      className="input"
                      value={supplierFormData.contactPerson}
                      onChange={(e) => setSupplierFormData({ ...supplierFormData, contactPerson: e.target.value })}
                      placeholder="Key account manager name"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label className="form-label">Phone / WhatsApp</label>
                    <input
                      type="text"
                      className="input"
                      value={supplierFormData.phone}
                      onChange={(e) => setSupplierFormData({ ...supplierFormData, phone: e.target.value })}
                      placeholder="+86 21 8899 0000"
                    />
                  </div>

                  <div>
                    <label className="form-label">Email Address</label>
                    <input
                      type="email"
                      className="input"
                      value={supplierFormData.email}
                      onChange={(e) => setSupplierFormData({ ...supplierFormData, email: e.target.value })}
                      placeholder="sales@supplier.com"
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Factory / Corporate Address</label>
                  <textarea
                    className="input"
                    rows={2}
                    value={supplierFormData.address}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, address: e.target.value })}
                    placeholder="Industrial Park, City, Province, Port of Export..."
                  />
                </div>

                <div>
                  <label className="form-label">Supplier Status *</label>
                  <select
                    className="input"
                    value={supplierFormData.isActive ? 'ACTIVE' : 'INACTIVE'}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, isActive: e.target.value === 'ACTIVE' })}
                    required
                  >
                    <option value="ACTIVE">Active - available for purchase orders</option>
                    <option value="INACTIVE">Inactive - hidden from active supplier workflow</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowSupplierModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn btn-cyan">
                  {saving ? 'Saving...' : editingSupplier ? 'Update Supplier' : 'Register Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Create/Edit Freight Forwarder (IMP-23) */}
      {showForwarderModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '620px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    padding: '0.6rem',
                    background: 'rgba(99, 102, 241, 0.12)',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--accent-indigo)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ship size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    {editingForwarder ? 'Edit Freight Forwarder' : 'Register Freight Forwarder (IMP-23)'}
                  </h2>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>International freight, booking, and shipping agent master data</span>
                </div>
              </div>
              <button onClick={() => setShowForwarderModal(false)} className="btn btn-secondary" style={{ padding: '0.35rem 0.65rem', borderRadius: '8px' }}>✕</button>
            </div>

            <form onSubmit={handleSaveForwarder}>
              <div className="modal-body">
                <ModalErrorAlert error={forwarderError} onDismiss={() => setForwarderError(null)} />
                <div style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Forwarder Company / Carrier Name *</label>
                  <input
                    type="text"
                    className="input"
                    value={forwarderFormData.name}
                    onChange={(e) => setForwarderFormData({ ...forwarderFormData, name: e.target.value })}
                    placeholder="e.g. Ethiopian Shipping and Logistics Services Enterprise (ESLSE)"
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label className="form-label">Country / Primary Hub *</label>
                    <input
                      type="text"
                      className="input"
                      value={forwarderFormData.country}
                      onChange={(e) => setForwarderFormData({ ...forwarderFormData, country: e.target.value })}
                      placeholder="e.g. Ethiopia, Djibouti, UAE, Global"
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">Contact Person</label>
                    <input
                      type="text"
                      className="input"
                      value={forwarderFormData.contactPerson}
                      onChange={(e) => setForwarderFormData({ ...forwarderFormData, contactPerson: e.target.value })}
                      placeholder="Logistics account manager"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label className="form-label">Phone / Hotline</label>
                    <input
                      type="text"
                      className="input"
                      value={forwarderFormData.phone}
                      onChange={(e) => setForwarderFormData({ ...forwarderFormData, phone: e.target.value })}
                      placeholder="+251 11 551 8280"
                    />
                  </div>

                  <div>
                    <label className="form-label">Email Address</label>
                    <input
                      type="email"
                      className="input"
                      value={forwarderFormData.email}
                      onChange={(e) => setForwarderFormData({ ...forwarderFormData, email: e.target.value })}
                      placeholder="ops@eslse.et"
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Branch / Port Office Address</label>
                  <textarea
                    className="input"
                    rows={2}
                    value={forwarderFormData.address}
                    onChange={(e) => setForwarderFormData({ ...forwarderFormData, address: e.target.value })}
                    placeholder="e.g. Churchill Road, Addis Ababa, Ethiopia"
                  />
                </div>

                <div>
                  <label className="form-label">Forwarder Status *</label>
                  <select
                    className="input"
                    value={forwarderFormData.isActive ? 'ACTIVE' : 'INACTIVE'}
                    onChange={(e) => setForwarderFormData({ ...forwarderFormData, isActive: e.target.value === 'ACTIVE' })}
                    required
                  >
                    <option value="ACTIVE">Active - available for quote comparison & booking</option>
                    <option value="INACTIVE">Inactive - retired</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowForwarderModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn btn-cyan">
                  {saving ? 'Saving...' : editingForwarder ? 'Update Forwarder' : 'Register Forwarder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
