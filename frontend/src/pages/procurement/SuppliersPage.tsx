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
} from 'lucide-react';
import { api, Supplier } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export const SuppliersPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const canCreateSupplier = hasPermission('SUPPLIERS_CREATE');
  const canEditSupplier = hasPermission('SUPPLIERS_EDIT');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Form state
  const [formData, setFormData] = useState<{
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

  const [saving, setSaving] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  useEffect(() => {
    loadSuppliers();
  }, []);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const data = await api.getSuppliers();
      setSuppliers(data);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplierName.trim()) {
      showToast('error', 'Supplier name is required');
      return;
    }
    setSaving(true);
    try {
      if (editingSupplier) {
        await api.updateSupplier(editingSupplier.supplierId, formData);
        showToast('success', `Supplier '${formData.supplierName}' updated successfully!`);
      } else {
        await api.createSupplier(formData);
        showToast('success', `Supplier '${formData.supplierName}' registered successfully!`);
      }
      setShowCreateModal(false);
      setEditingSupplier(null);
      setFormData({
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
      showToast('error', err.response?.data?.message || err.message || 'Failed to save supplier');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (supplier: Supplier) => {
    try {
      await api.updateSupplier(supplier.supplierId, { isActive: !supplier.isActive });
      showToast('success', `Supplier status updated to ${!supplier.isActive ? 'Active' : 'Inactive'}`);
      loadSuppliers();
    } catch (err: any) {
      showToast('error', err.message || 'Failed to update status');
    }
  };

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
      s.supplierName?.toLowerCase().includes(search.toLowerCase()) ||
      s.country?.toLowerCase().includes(search.toLowerCase()) ||
      s.contactPerson?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === ''
        ? true
        : statusFilter === 'ACTIVE'
        ? s.isActive
        : !s.isActive;
    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Breadcrumb & Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <span style={{ color: 'var(--accent-cyan)' }}>★</span>
        <span>Logistics & Import</span>
        <span>/</span>
        <span style={{ color: 'var(--text-secondary)' }}>Procurement</span>
        <span>/</span>
        <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>Suppliers Master Data</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 0.35rem 0', letterSpacing: '-0.02em' }}>
            International Supplier Master Data
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
            Foreign vehicle manufacturers, OEM distributors, and approved domestic logistics suppliers
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button onClick={loadSuppliers} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            Refresh
          </button>
          {canCreateSupplier && (
            <button
              onClick={() => {
                setEditingSupplier(null);
                setFormData({ supplierName: '', country: '', contactPerson: '', phone: '', email: '', address: '', isActive: true });
                setShowCreateModal(true);
              }}
              className="btn btn-cyan"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Plus size={16} />
              Register Supplier
            </button>
          )}
        </div>
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

      {/* Filter Bar & Search */}
      <div className="card" style={{ padding: '0.85rem 1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.45rem' }}>
          {[
            { id: '', label: `All Suppliers (${suppliers.length})` },
            { id: 'ACTIVE', label: `Active (${activeSuppliers.length})` },
            { id: 'INACTIVE', label: `Inactive (${inactiveSuppliers.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`filter-pill ${statusFilter === tab.id ? 'active' : ''}`}
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
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
              {loading ? (
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
                        Registered: {new Date(s.createdAt).toLocaleDateString()}
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
                                setEditingSupplier(s);
                                setFormData({
                                  supplierName: s.supplierName,
                                  country: s.country || '',
                                  contactPerson: s.contactPerson || '',
                                  phone: s.phone || '',
                                  email: s.email || '',
                                  address: s.address || '',
                                  isActive: s.isActive,
                                });
                                setShowCreateModal(true);
                              }}
                              className="btn btn-secondary"
                              style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                              title="Edit Supplier"
                            >
                              <Edit2 size={13} /> Edit
                            </button>
                            <button
                              onClick={() => handleToggleActive(s)}
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

      {/* Modal: Create/Edit Supplier */}
      {showCreateModal && (
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
              <button onClick={() => setShowCreateModal(false)} className="btn btn-secondary" style={{ padding: '0.35rem 0.65rem', borderRadius: '8px' }}>✕</button>
            </div>

            <form onSubmit={handleSaveSupplier}>
              <div className="modal-body">
                <div style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Supplier / Manufacturer Name *</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.supplierName}
                    onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
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
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      placeholder="e.g. China, Germany, UAE"
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">Contact Person</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.contactPerson}
                      onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
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
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+86 21 8899 0000"
                    />
                  </div>

                  <div>
                    <label className="form-label">Email Address</label>
                    <input
                      type="email"
                      className="input"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="sales@supplier.com"
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Factory / Corporate Address</label>
                  <textarea
                    className="input"
                    rows={2}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Industrial Park, City, Province, Port of Export..."
                  />
                </div>

                <div>
                  <label className="form-label">Supplier Status *</label>
                  <select
                    className="input"
                    value={formData.isActive ? 'ACTIVE' : 'INACTIVE'}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'ACTIVE' })}
                    required
                  >
                    <option value="ACTIVE">Active - available for purchase orders</option>
                    <option value="INACTIVE">Inactive - hidden from active supplier workflow</option>
                  </select>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                    Inactive suppliers stay in history, but should not be used for new procurement work.
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">
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
    </div>
  );
};
