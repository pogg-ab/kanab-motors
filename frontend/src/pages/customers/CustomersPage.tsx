import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Building2,
  Phone,
  FileText,
  AlertCircle,
  CreditCard,
  Upload,
  Trash2,
  Eye,
  CheckCircle2,
  X,
  Plus,
  DollarSign,
  Briefcase,
  History,
  ShieldAlert,
  Edit3,
  Lock,
  ExternalLink,
} from 'lucide-react';
import {
  api,
  Customer,
  Region,
  CustomerBankAccount,
  CustomerAccountSummary,
  Attachment,
} from '../../api/client';

export const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedRegion, setSelectedRegion] = useState<string>('ALL');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<'profile' | 'account_summary' | 'banking' | 'documents'>('profile');

  // Form State
  const [formData, setFormData] = useState({
    customerType: 'DIRECT_POS' as 'DIRECT_POS' | 'DEALER' | 'GOVERNMENT',
    fullName: '',
    mobileNumber: '',
    tinNumber: '',
    regionId: '' as string | number,
    addressTown: '',
    bankAccounts: [] as Array<{
      bankName: string;
      accountNumber: string;
      accountHolderName: string;
      branch: string;
      isPrimary: boolean;
    }>,
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Edit Customer Form State
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editFormData, setEditFormData] = useState({
    customerType: 'DIRECT_POS' as 'DIRECT_POS' | 'DEALER' | 'GOVERNMENT',
    fullName: '',
    mobileNumber: '',
    tinNumber: '',
    regionId: '' as string | number,
    addressTown: '',
    isActive: true,
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // New Bank Account Form inside Details
  const [newBankForm, setNewBankForm] = useState({
    bankName: '',
    accountNumber: '',
    accountHolderName: '',
    branch: '',
  });

  // Selected file for document upload
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Document Preview Modal State
  const [previewDoc, setPreviewDoc] = useState<Attachment | null>(null);

  const getDocUrl = (filePath?: string) => {
    if (!filePath) return '';
    if (filePath.startsWith('http')) return filePath;
    return `http://localhost:3000${filePath}`;
  };

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (selectedType !== 'ALL') params.customerType = selectedType;
      if (selectedRegion !== 'ALL') params.regionId = Number(selectedRegion);
      if (search.trim()) params.search = search.trim();

      const res = await api.getCustomers(params);
      setCustomers(res.items);
    } catch (err: any) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRegions = async () => {
    try {
      const res = await api.getRegions();
      setRegions(res);
    } catch (err) {
      console.error('Failed to load regions:', err);
    }
  };

  useEffect(() => {
    fetchRegions();
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [selectedType, selectedRegion, search]);

  const handleOpenCreate = () => {
    setFormData({
      customerType: 'DIRECT_POS',
      fullName: '',
      mobileNumber: '',
      tinNumber: '',
      regionId: regions[0]?.regionId || '',
      addressTown: '',
      bankAccounts: [],
    });
    setFormError(null);
    setIsCreateOpen(true);
  };

  const handleAddBankRow = () => {
    setFormData({
      ...formData,
      bankAccounts: [
        ...formData.bankAccounts,
        {
          bankName: '',
          accountNumber: '',
          accountHolderName: formData.fullName || '',
          branch: '',
          isPrimary: formData.bankAccounts.length === 0,
        },
      ],
    });
  };

  const handleBankRowChange = (index: number, field: string, value: any) => {
    const updated = [...formData.bankAccounts];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, bankAccounts: updated });
  };

  const handleRemoveBankRow = (index: number) => {
    const updated = formData.bankAccounts.filter((_, i) => i !== index);
    setFormData({ ...formData, bankAccounts: updated });
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Conditional Validation Rule Check
    if (
      (formData.customerType === 'DEALER' || formData.customerType === 'GOVERNMENT') &&
      (!formData.tinNumber || formData.tinNumber.trim() === '')
    ) {
      setFormError('TIN Number is mandatory for Dealer and Government customers.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        customerType: formData.customerType,
        fullName: formData.fullName,
        mobileNumber: formData.mobileNumber,
        addressTown: formData.addressTown,
      };
      if (formData.tinNumber.trim()) payload.tinNumber = formData.tinNumber.trim();
      if (formData.regionId) payload.regionId = Number(formData.regionId);
      if (formData.bankAccounts.length > 0) {
        payload.bankAccounts = formData.bankAccounts.filter(
          (b) => b.bankName && b.accountNumber,
        );
      }

      await api.createCustomer(payload);
      setIsCreateOpen(false);
      fetchCustomers();
    } catch (err: any) {
      setFormError(
        err.response?.data?.message || 'Failed to create customer. Please check inputs.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewCustomer = async (cust: Customer) => {
    try {
      const full = await api.getCustomer(cust.customerId);
      setSelectedCustomer(full);
      setActiveDetailTab('profile');
    } catch (err) {
      console.error('Error fetching customer details:', err);
    }
  };

  const handleOpenEdit = (cust: Customer) => {
    setEditingCustomer(cust);
    setEditFormData({
      customerType: cust.customerType,
      fullName: cust.fullName,
      mobileNumber: cust.mobileNumber,
      tinNumber: cust.tinNumber || '',
      regionId: cust.regionId || (cust.region?.regionId ? String(cust.region.regionId) : ''),
      addressTown: cust.addressTown || '',
      isActive: cust.isActive !== false,
    });
    setEditError(null);
  };

  const handleUpdateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;
    setEditError(null);

    // Conditional Validation Rule Check
    if (
      (editFormData.customerType === 'DEALER' || editFormData.customerType === 'GOVERNMENT') &&
      (!editFormData.tinNumber || editFormData.tinNumber.trim() === '')
    ) {
      setEditError('TIN Number is mandatory for Dealer and Government customers.');
      return;
    }

    setEditSubmitting(true);
    try {
      const payload: any = {
        customerType: editFormData.customerType,
        fullName: editFormData.fullName,
        mobileNumber: editFormData.mobileNumber,
        addressTown: editFormData.addressTown,
        isActive: editFormData.isActive,
      };
      if (editFormData.tinNumber && editFormData.tinNumber.trim()) {
        payload.tinNumber = editFormData.tinNumber.trim();
      } else {
        payload.tinNumber = null;
      }
      if (editFormData.regionId) {
        payload.regionId = Number(editFormData.regionId);
      }

      const updated = await api.updateCustomer(editingCustomer.customerId, payload);
      setEditingCustomer(null);
      await fetchCustomers();
      if (selectedCustomer && selectedCustomer.customerId === editingCustomer.customerId) {
        setSelectedCustomer(updated);
      }
    } catch (err: any) {
      setEditError(
        err.response?.data?.message || err.message || 'Failed to update customer profile',
      );
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleAddBankToExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    try {
      await api.addBankAccount(selectedCustomer.customerId, newBankForm);
      setNewBankForm({ bankName: '', accountNumber: '', accountHolderName: '', branch: '' });
      const updated = await api.getCustomer(selectedCustomer.customerId);
      setSelectedCustomer(updated);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add bank account');
    }
  };

  const handleDeleteBankAccount = async (bankAccountId: string) => {
    if (!selectedCustomer || !window.confirm('Delete this bank account?')) return;
    try {
      await api.deleteBankAccount(selectedCustomer.customerId, bankAccountId);
      const updated = await api.getCustomer(selectedCustomer.customerId);
      setSelectedCustomer(updated);
    } catch (err: any) {
      alert('Failed to delete bank account');
    }
  };

  const handleUploadDocument = async () => {
    if (!selectedCustomer || !uploadFile) return;
    setUploading(true);
    try {
      await api.uploadCustomerDoc(selectedCustomer.customerId, uploadFile);
      setUploadFile(null);
      const updated = await api.getCustomer(selectedCustomer.customerId);
      setSelectedCustomer(updated);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!selectedCustomer || !window.confirm('Delete this document?')) return;
    try {
      await api.deleteCustomerDoc(selectedCustomer.customerId, docId);
      const updated = await api.getCustomer(selectedCustomer.customerId);
      setSelectedCustomer(updated);
    } catch (err) {
      alert('Failed to delete document');
    }
  };

  // Metrics
  const totalCount = customers.length;
  const dealersCount = customers.filter((c) => c.customerType === 'DEALER').length;
  const directPosCount = customers.filter((c) => c.customerType === 'DIRECT_POS').length;
  const govCount = customers.filter((c) => c.customerType === 'GOVERNMENT').length;

  return (
    <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Breadcrumbs & Top Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-cyan)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>★ Core Masters</span>
          <span style={{ color: 'var(--text-muted)' }}>/</span>
          <span>Customer Directory</span>
          <span style={{ color: 'var(--text-muted)' }}>/</span>
          <span style={{ color: 'var(--text-primary)' }}>Customer Master Data</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '0.4rem' }}>
              <div style={{ padding: '0.6rem', background: 'rgba(6, 182, 212, 0.12)', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: 'var(--radius-md)', color: 'var(--accent-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={24} />
              </div>
              <div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
                  Customer & Dealer Management
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.2rem' }}>
                  <span className="mono-code" style={{ fontSize: '0.65rem', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-indigo)', borderColor: 'rgba(99, 102, 241, 0.3)' }}>
                    Master Directory
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Maintain verified customer master records, conditional TIN validation, and zero-state ledger summaries
                  </span>
                </div>
              </div>
            </div>
          </div>

          <button className="btn btn-cyan" onClick={handleOpenCreate} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UserPlus size={17} /> Register Customer / Dealer
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2rem',
      }}>
        <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--accent-indigo)' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Registered</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-indigo)' }}>
              <Users size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'monospace', letterSpacing: '-0.02em' }}>
            {totalCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Direct, Dealer & Government
          </div>
        </div>

        <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--accent-amber)' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Authorized Dealers</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-amber)' }}>
              <Building2 size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--accent-amber)', fontFamily: 'monospace', letterSpacing: '-0.02em' }}>
            {dealersCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Mandatory TIN enforced
          </div>
        </div>

        <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--accent-cyan)' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Direct / POS Accounts</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(6, 182, 212, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-cyan)' }}>
              <Briefcase size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--accent-cyan)', fontFamily: 'monospace', letterSpacing: '-0.02em' }}>
            {directPosCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Motorcycles & 3-Wheelers
          </div>
        </div>

        <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--accent-emerald)' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Government Clients</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-emerald)' }}>
              <ShieldAlert size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--accent-emerald)', fontFamily: 'monospace', letterSpacing: '-0.02em' }}>
            {govCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            Institutional Accounts
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Filter Pills for Category */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {['ALL', 'DIRECT_POS', 'DEALER', 'GOVERNMENT'].map((type) => (
              <button
                key={type}
                className={`filter-pill ${selectedType === type ? 'active' : ''}`}
                onClick={() => setSelectedType(type)}
                style={{ cursor: 'pointer' }}
              >
                {type === 'ALL'
                  ? 'All Categories'
                  : type === 'DIRECT_POS'
                  ? 'Direct / POS'
                  : type === 'DEALER'
                  ? 'Dealers'
                  : 'Government'}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flex: 1, maxWidth: '520px' }}>
            {/* Region Dropdown */}
            <select
              className="input"
              style={{ width: '180px', height: '38px', fontSize: '0.85rem' }}
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
            >
              <option value="ALL">All Regions</option>
              {regions.map((r) => (
                <option key={r.regionId} value={r.regionId}>
                  {r.regionName}
                </option>
              ))}
            </select>

            {/* Search Input */}
            <div style={{ position: 'relative', flex: 1 }}>
              <Search
                size={16}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                className="input"
                style={{ paddingLeft: '2.4rem', height: '38px', fontSize: '0.85rem' }}
                placeholder="Search name, code, mobile, TIN..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Customer Data Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#090D16', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '0.9rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Customer ID</th>
                <th style={{ padding: '0.9rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Customer Name / Org</th>
                <th style={{ padding: '0.9rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category</th>
                <th style={{ padding: '0.9rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mobile Number</th>
                <th style={{ padding: '0.9rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TIN Number</th>
                <th style={{ padding: '0.9rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Region</th>
                <th style={{ padding: '0.9rem 1.25rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    Loading customer records...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No customer records match your filter criteria.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.customerId} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <span className="mono-code" style={{ color: 'var(--accent-cyan)' }}>
                        {c.customerCode}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.fullName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        {c.addressTown || 'Town not specified'}
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <span
                        className={`badge ${
                          c.customerType === 'DEALER'
                            ? 'badge-amber'
                            : c.customerType === 'GOVERNMENT'
                            ? 'badge-emerald'
                            : 'badge-cyan'
                        }`}
                      >
                        {c.customerType}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
                        <Phone size={13} color="var(--text-muted)" />
                        <span>{c.mobileNumber}</span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.25rem' }}>
                      {c.tinNumber ? (
                        <span className="mono-code">{c.tinNumber}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{c.region?.regionName || '—'}</td>
                    <td style={{ padding: '1rem 1.25rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenEdit(c)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', padding: '0.4rem 0.65rem' }}
                          title="Edit Customer Profile"
                        >
                          <Edit3 size={13} /> Edit
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleViewCustomer(c)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', padding: '0.4rem 0.65rem' }}
                        >
                          <Eye size={13} /> Profile
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

      {/* CREATE CUSTOMER MODAL */}
      {isCreateOpen && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(99, 102, 241, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <UserPlus size={20} color="var(--accent-indigo)" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Register Customer / Dealer</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Add master data record with automated customer code generation
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer}>
              <div className="modal-body">
                {formError && (
                  <div className="alert-banner-danger">
                    <AlertCircle size={18} />
                    <span style={{ fontWeight: 600 }}>{formError}</span>
                  </div>
                )}

                {/* Customer Type Selector */}
                <div className="form-group">
                  <label className="form-label">Customer Category *</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                    {[
                      { type: 'DIRECT_POS', label: 'Direct / POS', desc: 'Retail & cash buyers' },
                      { type: 'DEALER', label: 'Dealer', desc: 'Automotive dealerships' },
                      { type: 'GOVERNMENT', label: 'Government', desc: 'Ministries & agencies' },
                    ].map((opt) => (
                      <div
                        key={opt.type}
                        onClick={() => setFormData({ ...formData, customerType: opt.type as any })}
                        style={{
                          padding: '0.85rem',
                          borderRadius: 'var(--radius-md)',
                          border: formData.customerType === opt.type
                            ? '2px solid var(--accent-indigo)'
                            : '1px solid var(--border-color)',
                          background: formData.customerType === opt.type
                            ? 'rgba(99, 102, 241, 0.12)'
                            : 'var(--bg-tertiary)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{opt.label}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          {opt.desc}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Conditional Notice for Dealers & Government */}
                {(formData.customerType === 'DEALER' || formData.customerType === 'GOVERNMENT') && (
                  <div className="alert-banner-warning">
                    <AlertCircle size={18} />
                    <span>
                      <strong>Tax Compliance:</strong> TIN Number is <u>strictly mandatory</u> for {formData.customerType} accounts.
                    </span>
                  </div>
                )}

                {/* Name and Mobile */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Full Name / Organization Name *</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. Abebe Bikila Logistics"
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Mobile Number *</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. +251911223344"
                      required
                      value={formData.mobileNumber}
                      onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                    />
                  </div>
                </div>

                {/* TIN Number and Region */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">
                      TIN Number {formData.customerType !== 'DIRECT_POS' ? '*' : '(Optional for POS)'}
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. 0012345678"
                      value={formData.tinNumber}
                      onChange={(e) => setFormData({ ...formData, tinNumber: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Region</label>
                    <select
                      className="select-field"
                      value={formData.regionId}
                      onChange={(e) => setFormData({ ...formData, regionId: e.target.value })}
                    >
                      <option value="">Select Ethiopian Region</option>
                      {regions.map((r) => (
                        <option key={r.regionId} value={r.regionId}>
                          {r.regionName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Address Town */}
                <div className="form-group">
                  <label className="form-label">Address / Town</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Bole Subcity, Woreda 03, Addis Ababa"
                    value={formData.addressTown}
                    onChange={(e) => setFormData({ ...formData, addressTown: e.target.value })}
                  />
                </div>

                {/* Bank Accounts Repeater (Story 1.7) */}
                <div style={{
                  marginTop: '1.25rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid var(--border-color)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Bank Account Information
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Banking details used for future refund payouts & settlement verification
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={handleAddBankRow}
                    >
                      <Plus size={14} /> Add Bank Account
                    </button>
                  </div>

                  {formData.bankAccounts.map((b, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '0.85rem',
                        background: 'rgba(0, 0, 0, 0.25)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: '0.75rem',
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 1fr 1fr auto',
                        gap: '0.6rem',
                        alignItems: 'center',
                      }}
                    >
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Bank Name (e.g. CBE)"
                        value={b.bankName}
                        onChange={(e) => handleBankRowChange(idx, 'bankName', e.target.value)}
                      />
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Account Number"
                        value={b.accountNumber}
                        onChange={(e) => handleBankRowChange(idx, 'accountNumber', e.target.value)}
                      />
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Holder Name"
                        value={b.accountHolderName}
                        onChange={(e) => handleBankRowChange(idx, 'accountHolderName', e.target.value)}
                      />
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Branch (optional)"
                        value={b.branch}
                        onChange={(e) => handleBankRowChange(idx, 'branch', e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveBankRow(idx)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--accent-rose)',
                          cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Registering...' : 'Register Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CUSTOMER MODAL */}
      {editingCustomer && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(2, 132, 199, 0.15)',
                  color: 'var(--accent-cyan)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Edit3 size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Edit Customer Profile</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Update master customer data. Changes are recorded in the system audit trail.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingCustomer(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateCustomer}>
              <div className="modal-body">
                {editError && (
                  <div className="alert-banner-danger">
                    <AlertCircle size={18} />
                    <span style={{ fontWeight: 600 }}>{editError}</span>
                  </div>
                )}

                {/* Immutable System Identifier banner */}
                <div style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Lock size={15} color="var(--text-muted)" />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                      Customer Code (Immutable)
                    </span>
                  </div>
                  <span className="mono-code" style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>
                    {editingCustomer.customerCode}
                  </span>
                </div>

                {/* Customer Type Selector */}
                <div className="form-group">
                  <label className="form-label">Customer Category *</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                    {[
                      { type: 'DIRECT_POS', label: 'Direct / POS', desc: 'Retail & cash buyers' },
                      { type: 'DEALER', label: 'Dealer', desc: 'Automotive dealerships' },
                      { type: 'GOVERNMENT', label: 'Government', desc: 'Ministries & agencies' },
                    ].map((opt) => (
                      <div
                        key={opt.type}
                        onClick={() => setEditFormData({ ...editFormData, customerType: opt.type as any })}
                        style={{
                          padding: '0.85rem',
                          borderRadius: 'var(--radius-md)',
                          border: editFormData.customerType === opt.type
                            ? '2px solid var(--accent-indigo)'
                            : '1px solid var(--border-color)',
                          background: editFormData.customerType === opt.type
                            ? 'rgba(99, 102, 241, 0.12)'
                            : 'var(--bg-tertiary)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{opt.label}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          {opt.desc}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Conditional Notice for Dealers & Government */}
                {(editFormData.customerType === 'DEALER' || editFormData.customerType === 'GOVERNMENT') && (
                  <div className="alert-banner-warning">
                    <AlertCircle size={18} />
                    <span>
                      <strong>Tax Compliance:</strong> TIN Number is <u>strictly mandatory</u> for {editFormData.customerType} accounts.
                    </span>
                  </div>
                )}

                {/* Name and Mobile */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Full Name / Organization Name *</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. Abebe Bikila Transport PLC"
                      required
                      value={editFormData.fullName}
                      onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Mobile Number *</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. +251911223344"
                      required
                      value={editFormData.mobileNumber}
                      onChange={(e) => setEditFormData({ ...editFormData, mobileNumber: e.target.value })}
                    />
                  </div>
                </div>

                {/* TIN and Region */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">
                      TIN Number {editFormData.customerType !== 'DIRECT_POS' && '*'}
                    </label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="e.g. 0012345678"
                      value={editFormData.tinNumber}
                      onChange={(e) => setEditFormData({ ...editFormData, tinNumber: e.target.value })}
                      required={editFormData.customerType !== 'DIRECT_POS'}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Region</label>
                    <select
                      className="select-field"
                      value={editFormData.regionId}
                      onChange={(e) => setEditFormData({ ...editFormData, regionId: e.target.value })}
                    >
                      <option value="">Select Region...</option>
                      {regions.map((r) => (
                        <option key={r.regionId} value={r.regionId}>
                          {r.regionName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Address */}
                <div className="form-group">
                  <label className="form-label">Address / Town</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Bole Medhanealem"
                    value={editFormData.addressTown}
                    onChange={(e) => setEditFormData({ ...editFormData, addressTown: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditingCustomer(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={editSubmitting}>
                  {editSubmitting ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOMER DETAIL & ACCOUNT SUMMARY MODAL */}
      {selectedCustomer && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '820px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, var(--accent-indigo), #38bdf8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '1.2rem',
                }}>
                  {selectedCustomer.fullName.charAt(0)}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>
                      {selectedCustomer.fullName}
                    </h3>
                    <span className="mono-code" style={{ color: 'var(--accent-blue)' }}>
                      {selectedCustomer.customerCode}
                    </span>
                    <span className="badge badge-indigo">
                      {selectedCustomer.customerType}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                    {selectedCustomer.mobileNumber} · {selectedCustomer.region?.regionName || 'No Region'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Sub-tabs */}
            <div style={{ padding: '0 1.5rem', marginTop: '1rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <button
                  className={`filter-pill ${activeDetailTab === 'profile' ? 'active' : ''}`}
                  onClick={() => setActiveDetailTab('profile')}
                  style={{ cursor: 'pointer' }}
                >
                  Profile & Contacts
                </button>
                <button
                  className={`filter-pill ${activeDetailTab === 'account_summary' ? 'active' : ''}`}
                  onClick={() => setActiveDetailTab('account_summary')}
                  style={{ cursor: 'pointer' }}
                >
                  <DollarSign size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                  Account Summary
                </button>
                <button
                  className={`filter-pill ${activeDetailTab === 'banking' ? 'active' : ''}`}
                  onClick={() => setActiveDetailTab('banking')}
                  style={{ cursor: 'pointer' }}
                >
                  Banking Details ({selectedCustomer.bankAccounts?.length || 0})
                </button>
                <button
                  className={`filter-pill ${activeDetailTab === 'documents' ? 'active' : ''}`}
                  onClick={() => setActiveDetailTab('documents')}
                  style={{ cursor: 'pointer' }}
                >
                  Supporting Documents ({selectedCustomer.documents?.length || 0})
                </button>
              </div>
            </div>

            <div className="modal-body" style={{ paddingTop: '0.5rem' }}>
              {/* TAB 1: PROFILE */}
              {activeDetailTab === 'profile' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                  <div className="glass-panel" style={{ padding: '1.25rem' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                      Master Identification
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                      <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Human-Facing Customer Code</div>
                        <div className="mono-code" style={{ display: 'inline-block', marginTop: '0.2rem' }}>
                          {selectedCustomer.customerCode}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Customer Classification</div>
                        <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>{selectedCustomer.customerType}</div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Tax Identification Number (TIN)</div>
                        <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>
                          {selectedCustomer.tinNumber || 'None (Direct/POS customer)'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="glass-panel" style={{ padding: '1.25rem' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                      Contact & Location
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                      <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Registered Mobile</div>
                        <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>{selectedCustomer.mobileNumber}</div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Region</div>
                        <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>
                          {selectedCustomer.region?.regionName || '—'}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Town / Physical Address</div>
                        <div style={{ fontWeight: 600, marginTop: '0.2rem' }}>
                          {selectedCustomer.addressTown || 'Not provided'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ACCOUNT SUMMARY SHELL */}
              {activeDetailTab === 'account_summary' && (
                <div>
                  <div className="account-summary-banner">
                    <strong style={{ display: 'block', marginBottom: '0.35rem', fontSize: '0.9rem' }}>
                      Enterprise Customer Account Summary:
                    </strong>
                    <span>
                      This financial status is initialized in real-time for every customer, consolidating advance deposits, allocated bookings, and available balances.
                    </span>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '1rem',
                    marginBottom: '1.5rem',
                  }}>
                    <div className="glass-panel" style={{ padding: '1.15rem' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Deposits</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.35rem' }}>
                        ETB {Number(selectedCustomer.accountSummary?.totalDeposits || 0).toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Advance payments confirmed</div>
                    </div>

                    <div className="glass-panel" style={{ padding: '1.15rem' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Allocated to Bookings</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-indigo)', marginTop: '0.35rem' }}>
                        ETB {Number(selectedCustomer.accountSummary?.allocatedToBookings || 0).toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Reserved vehicles pool</div>
                    </div>

                    <div className="glass-panel" style={{ padding: '1.15rem' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Outstanding Balance</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-rose)', marginTop: '0.35rem' }}>
                        ETB {Number(selectedCustomer.accountSummary?.outstandingBalance || 0).toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Due on invoice settlement</div>
                    </div>

                    <div className="glass-panel" style={{ padding: '1.15rem' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Available Credit</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: '0.35rem' }}>
                        ETB {Number(selectedCustomer.accountSummary?.availableCredit || 0).toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Usable for future orders</div>
                    </div>

                    <div className="glass-panel" style={{ padding: '1.15rem' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Excess Payments</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-amber)', marginTop: '0.35rem' }}>
                        ETB {Number(selectedCustomer.accountSummary?.excessPayments || 0).toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Overpayment balance</div>
                    </div>

                    <div className="glass-panel" style={{ padding: '1.15rem' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Refundable Balance</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-blue)', marginTop: '0.35rem' }}>
                        ETB {Number(selectedCustomer.accountSummary?.refundableBalance || 0).toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Available limit</div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: BANKING DETAILS (Story 1.7) */}
              {activeDetailTab === 'banking' && (
                <div>
                  <div style={{ marginBottom: '1.25rem' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                      Registered Bank Accounts
                    </h4>
                    {selectedCustomer.bankAccounts && selectedCustomer.bankAccounts.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {selectedCustomer.bankAccounts.map((b) => (
                          <div
                            key={b.bankAccountId}
                            style={{
                              padding: '0.85rem 1rem',
                              borderRadius: 'var(--radius-md)',
                              background: 'rgba(15, 23, 42, 0.7)',
                              border: '1px solid var(--border-color)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{b.bankName}</div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                Acc: <span className="mono-code">{b.accountNumber}</span> · Holder: {b.accountHolderName}
                                {b.branch && ` · Branch: ${b.branch}`}
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              {b.isPrimary && <span className="badge badge-emerald">Primary</span>}
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleDeleteBankAccount(b.bankAccountId)}
                              >
                                <Trash2 size={14} color="var(--accent-rose)" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No bank accounts registered yet for this customer.
                      </div>
                    )}
                  </div>

                  {/* Add New Bank Account */}
                  <form onSubmit={handleAddBankToExisting} className="glass-panel" style={{ padding: '1.25rem' }}>
                    <h5 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                      + Add New Bank Account
                    </h5>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '0.6rem' }}>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Bank Name (e.g. Awash Bank)"
                        required
                        value={newBankForm.bankName}
                        onChange={(e) => setNewBankForm({ ...newBankForm, bankName: e.target.value })}
                      />
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Account Number"
                        required
                        value={newBankForm.accountNumber}
                        onChange={(e) => setNewBankForm({ ...newBankForm, accountNumber: e.target.value })}
                      />
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Holder Name"
                        required
                        value={newBankForm.accountHolderName}
                        onChange={(e) => setNewBankForm({ ...newBankForm, accountHolderName: e.target.value })}
                      />
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Branch"
                        value={newBankForm.branch}
                        onChange={(e) => setNewBankForm({ ...newBankForm, branch: e.target.value })}
                      />
                      <button type="submit" className="btn btn-primary btn-sm">
                        Add
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 4: DOCUMENTS (Story 1.8) */}
              {activeDetailTab === 'documents' && (
                <div>
                  <div style={{
                    padding: '1.5rem',
                    border: '2px dashed var(--border-color)',
                    borderRadius: 'var(--radius-lg)',
                    textAlign: 'center',
                    marginBottom: '1.5rem',
                    background: 'rgba(15, 23, 42, 0.4)',
                  }}>
                    <Upload size={32} color="var(--accent-indigo)" style={{ margin: '0 auto 0.5rem' }} />
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Upload Supporting Document</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                      TIN Certificate, Commercial Registration, ID/Passport (PDF, PNG, JPG)
                    </div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem' }}>
                      <input
                        type="file"
                        id="cust-doc-upload"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          if (e.target.files?.[0]) setUploadFile(e.target.files[0]);
                        }}
                      />
                      <label htmlFor="cust-doc-upload" className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                        Browse File
                      </label>
                      {uploadFile && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--accent-emerald)' }}>
                          {uploadFile.name}
                        </span>
                      )}
                      {uploadFile && (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={handleUploadDocument}
                          disabled={uploading}
                        >
                          {uploading ? 'Uploading...' : 'Confirm Upload'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* List of uploaded documents */}
                  <div>
                    <h5 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
                      Attached Files
                    </h5>
                    {selectedCustomer.documents && selectedCustomer.documents.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {selectedCustomer.documents.map((doc) => (
                          <div
                            key={doc.attachmentId}
                            style={{
                              padding: '0.75rem 1rem',
                              borderRadius: 'var(--radius-md)',
                              background: 'var(--bg-tertiary)',
                              border: '1px solid var(--border-color)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <FileText size={18} color="var(--accent-blue)" />
                              <div>
                                <div
                                  onClick={() => setPreviewDoc(doc)}
                                  style={{
                                    fontSize: '0.875rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    color: 'var(--accent-blue)',
                                    textDecoration: 'underline',
                                    textUnderlineOffset: '2px',
                                  }}
                                  title="Click to preview document"
                                >
                                  {doc.fileName}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                  Uploaded: {new Date(doc.uploadedAt).toLocaleString()} · Type: {doc.contentType || 'unknown'}
                                </div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => setPreviewDoc(doc)}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                                title="Preview Document"
                              >
                                <Eye size={13} /> View
                              </button>
                              <a
                                href={getDocUrl(doc.filePath)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-secondary btn-sm"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                                title="Open in New Tab"
                              >
                                <ExternalLink size={13} />
                              </a>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleDeleteDocument(doc.attachmentId)}
                                title="Delete Document"
                              >
                                <Trash2 size={14} color="var(--accent-rose)" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                        No documents attached to this customer record yet.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setSelectedCustomer(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENT PREVIEW MODAL */}
      {previewDoc && (
        <div className="modal-backdrop" style={{ zIndex: 1200 }}>
          <div className="modal-content" style={{ maxWidth: '850px', width: '90%' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(2, 132, 199, 0.15)',
                  color: 'var(--accent-blue)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <FileText size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                    {previewDoc.fileName}
                  </h3>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                    {previewDoc.contentType || 'Document'} · Uploaded: {new Date(previewDoc.uploadedAt).toLocaleString()}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <a
                  href={getDocUrl(previewDoc.filePath)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem' }}
                >
                  <ExternalLink size={13} /> Open Original
                </a>
                <button
                  onClick={() => setPreviewDoc(null)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="modal-body" style={{ textAlign: 'center', padding: '1.5rem', maxHeight: '70vh', overflowY: 'auto' }}>
              {previewDoc.contentType?.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(previewDoc.fileName) ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '250px' }}>
                  <img
                    src={getDocUrl(previewDoc.filePath)}
                    alt={previewDoc.fileName}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '60vh',
                      borderRadius: 'var(--radius-md)',
                      objectFit: 'contain',
                      border: '1px solid var(--border-color)',
                      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                    }}
                  />
                </div>
              ) : previewDoc.contentType?.includes('pdf') || /\.pdf$/i.test(previewDoc.fileName) ? (
                <iframe
                  src={getDocUrl(previewDoc.filePath)}
                  title={previewDoc.fileName}
                  style={{
                    width: '100%',
                    height: '550px',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                  }}
                />
              ) : (
                <div style={{ padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                  <FileText size={52} style={{ margin: '0 auto 1rem', display: 'block', color: 'var(--accent-indigo)' }} />
                  <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                    Document File: {previewDoc.fileName}
                  </p>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                    Direct inline preview not available for this MIME type ({previewDoc.contentType || 'file'}).
                  </p>
                  <a
                    href={getDocUrl(previewDoc.filePath)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <ExternalLink size={14} /> Open or Download File
                  </a>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setPreviewDoc(null)}>
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
