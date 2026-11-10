import React, { useState, useEffect } from 'react';
import {
  Building2,
  Landmark,
  ShieldCheck,
  Save,
  RefreshCw,
  Plus,
  CheckCircle2,
  AlertCircle,
  Globe,
  Mail,
  Phone,
  MapPin,
  FileText,
  Star,
  Trash2,
  Edit2,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
  CreditCard,
} from 'lucide-react';
import { api, CompanyProfile, CompanyBankAccount } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { formatApiError } from '../../utils/error';
import { ModalErrorAlert } from '../../components/ModalErrorAlert';

export const CompanyProfilePage: React.FC = () => {
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('USERS_EDIT') || hasPermission('PURCHASE_ORDERS_CONFIRM');

  const [activeTab, setActiveTab] = useState<'profile' | 'bank_accounts'>('profile');
  const [loading, setLoading] = useState<boolean>(true);
  const [savingProfile, setSavingProfile] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Company Profile state
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [profileForm, setProfileForm] = useState<{
    companyName: string;
    tradeName: string;
    logo: string;
    registrationNo: string;
    tin: string;
    vatRegistrationNo: string;
    address: string;
    city: string;
    country: string;
    phone: string;
    email: string;
    website: string;
    importerIecNo: string;
    importerAdCode: string;
  }>({
    companyName: '',
    tradeName: '',
    logo: '',
    registrationNo: '',
    tin: '',
    vatRegistrationNo: '',
    address: '',
    city: 'Addis Ababa',
    country: 'Ethiopia',
    phone: '',
    email: '',
    website: '',
    importerIecNo: '',
    importerAdCode: '',
  });

  // Bank Accounts state
  const [bankAccounts, setBankAccounts] = useState<CompanyBankAccount[]>([]);
  const [showBankModal, setShowBankModal] = useState<boolean>(false);
  const [editingBank, setEditingBank] = useState<CompanyBankAccount | null>(null);
  const [bankModalError, setBankModalError] = useState<string | null>(null);
  const [savingBank, setSavingBank] = useState<boolean>(false);

  const [bankForm, setBankForm] = useState<{
    accountName: string;
    bankName: string;
    accountNumber: string;
    bankBranch: string;
    ifscCode: string;
    swiftCode: string;
    currency: string;
    isDefault: boolean;
    isActive: boolean;
  }>({
    accountName: '',
    bankName: '',
    accountNumber: '',
    bankBranch: '',
    ifscCode: '',
    swiftCode: '',
    currency: 'USD',
    isDefault: false,
    isActive: true,
  });

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
      const data = await api.getCompanyProfile();
      setProfile(data);
      setProfileForm({
        companyName: data.companyName || '',
        tradeName: data.tradeName || '',
        logo: data.logo || '',
        registrationNo: data.registrationNo || '',
        tin: data.tin || data.taxId || '',
        vatRegistrationNo: data.vatRegistrationNo || '',
        address: data.address || '',
        city: data.city || 'Addis Ababa',
        country: data.country || 'Ethiopia',
        phone: data.phone || '',
        email: data.email || '',
        website: data.website || '',
        importerIecNo: data.importerIecNo || data.iecNo || '',
        importerAdCode: data.importerAdCode || data.adCode || '',
      });

      const banks = await api.getCompanyBankAccounts();
      setBankAccounts(banks);
    } catch (err: any) {
      showToast('error', formatApiError(err, 'Failed to load company profile settings'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!profileForm.companyName.trim()) {
      showToast('error', 'Company name is required');
      return;
    }

    setSavingProfile(true);
    try {
      const updated = await api.updateCompanyProfile(profile.profileId, profileForm);
      setProfile(updated);
      showToast('success', 'Company Profile & Importer settings saved successfully!');
    } catch (err: any) {
      showToast('error', formatApiError(err, 'Failed to save company profile'));
    } finally {
      setSavingProfile(false);
    }
  };

  // Bank Account Handlers
  const handleOpenAddBank = () => {
    setEditingBank(null);
    setBankModalError(null);
    setBankForm({
      accountName: profileForm.companyName ? `${profileForm.companyName} - FOREX` : '',
      bankName: '',
      accountNumber: '',
      bankBranch: '',
      ifscCode: '',
      swiftCode: '',
      currency: 'USD',
      isDefault: bankAccounts.length === 0,
      isActive: true,
    });
    setShowBankModal(true);
  };

  const handleOpenEditBank = (bank: CompanyBankAccount) => {
    setEditingBank(bank);
    setBankModalError(null);
    setBankForm({
      accountName: bank.accountName,
      bankName: bank.bankName,
      accountNumber: bank.accountNumber,
      bankBranch: bank.bankBranch || '',
      ifscCode: bank.ifscCode || '',
      swiftCode: bank.swiftCode || '',
      currency: bank.currency || 'USD',
      isDefault: bank.isDefault,
      isActive: bank.isActive,
    });
    setShowBankModal(true);
  };

  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setBankModalError(null);

    if (!bankForm.accountName.trim() || !bankForm.bankName.trim() || !bankForm.accountNumber.trim()) {
      setBankModalError('Account Name, Bank Name, and Account Number are required');
      return;
    }

    setSavingBank(true);
    try {
      if (editingBank) {
        await api.updateCompanyBankAccount(editingBank.bankAccountId, bankForm);
        showToast('success', `Bank account '${bankForm.accountName}' updated successfully!`);
      } else {
        await api.createCompanyBankAccount(bankForm);
        showToast('success', `Bank account '${bankForm.accountName}' added successfully!`);
      }
      setShowBankModal(false);
      setEditingBank(null);
      const updatedBanks = await api.getCompanyBankAccounts();
      setBankAccounts(updatedBanks);
    } catch (err: any) {
      setBankModalError(formatApiError(err, 'Failed to save bank account'));
    } finally {
      setSavingBank(false);
    }
  };

  const handleSetDefaultBank = async (bank: CompanyBankAccount) => {
    try {
      await api.updateCompanyBankAccount(bank.bankAccountId, { isDefault: true });
      showToast('success', `${bank.bankName} (${bank.currency}) set as primary default account`);
      const updatedBanks = await api.getCompanyBankAccounts();
      setBankAccounts(updatedBanks);
    } catch (err: any) {
      showToast('error', formatApiError(err, 'Failed to set default account'));
    }
  };

  const handleToggleActiveBank = async (bank: CompanyBankAccount) => {
    try {
      await api.updateCompanyBankAccount(bank.bankAccountId, { isActive: !bank.isActive });
      showToast('success', `Account ${!bank.isActive ? 'activated' : 'deactivated'}`);
      const updatedBanks = await api.getCompanyBankAccounts();
      setBankAccounts(updatedBanks);
    } catch (err: any) {
      showToast('error', formatApiError(err, 'Failed to update account status'));
    }
  };

  const handleDeleteBank = async (bank: CompanyBankAccount) => {
    if (!confirm(`Are you sure you want to delete account '${bank.accountName}' (${bank.accountNumber})?`)) {
      return;
    }
    try {
      await api.deleteCompanyBankAccount(bank.bankAccountId);
      showToast('success', 'Bank account deleted successfully');
      const updatedBanks = await api.getCompanyBankAccounts();
      setBankAccounts(updatedBanks);
    } catch (err: any) {
      showToast('error', formatApiError(err, 'Could not delete bank account. Please deactivate it instead.'));
    }
  };

  const defaultAccount = bankAccounts.find((b) => b.isDefault);
  const activeForexAccounts = bankAccounts.filter((b) => b.isActive && b.currency !== 'ETB');

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1300px', margin: '0 auto' }}>
      {/* Toast Notification */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            top: '1.5rem',
            right: '1.5rem',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.9rem 1.4rem',
            borderRadius: '8px',
            backgroundColor: notification.type === 'success' ? '#064e3b' : '#881337',
            color: '#fff',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            fontSize: '0.9rem',
            fontWeight: 600,
          }}
        >
          {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{notification.msg}</span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Building2 size={24} color="var(--accent-cyan)" />
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Settings: Company Profile & Importer Information
            </h1>
          </div>
          <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Central legal company records, importer regulatory codes (IEC & AD Code), and foreign remittance bank accounts.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button onClick={loadData} disabled={loading} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <RefreshCw size={15} className={loading ? 'spin' : ''} /> Refresh
          </button>
          {activeTab === 'profile' && canEdit && (
            <button
              onClick={handleSaveProfile}
              disabled={savingProfile || loading}
              className="btn btn-cyan"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}
            >
              <Save size={16} /> {savingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
            </button>
          )}
          {activeTab === 'bank_accounts' && canEdit && (
            <button
              onClick={handleOpenAddBank}
              className="btn btn-cyan"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}
            >
              <Plus size={16} /> Add Bank Account
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.75rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.75rem' }}>
        <button
          onClick={() => setActiveTab('profile')}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'profile' ? '3px solid var(--accent-cyan)' : '3px solid transparent',
            color: activeTab === 'profile' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <Building2 size={16} /> Company & Importer Profile
        </button>
        <button
          onClick={() => setActiveTab('bank_accounts')}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'bank_accounts' ? '3px solid var(--accent-cyan)' : '3px solid transparent',
            color: activeTab === 'bank_accounts' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <Landmark size={16} /> Importer Bank Accounts ({bankAccounts.length})
        </button>
      </div>

      {/* TAB 1: COMPANY PROFILE */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSaveProfile}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
            {/* Left Column: Legal & General Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* General Information Card */}
              <div className="card" style={{ padding: '1.5rem' }}>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Building2 size={18} color="var(--accent-cyan)" /> General Legal Entity Information
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                  Maintained centrally for corporate PO printouts, commercial invoices, and tax filings.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label className="form-label">Registered Company Name *</label>
                    <input
                      type="text"
                      className="input"
                      value={profileForm.companyName}
                      onChange={(e) => setProfileForm({ ...profileForm, companyName: e.target.value })}
                      required
                      placeholder="e.g. KANAB Motors PLC"
                      disabled={!canEdit}
                    />
                  </div>
                  <div>
                    <label className="form-label">Trading Name / Brand Name</label>
                    <input
                      type="text"
                      className="input"
                      value={profileForm.tradeName}
                      onChange={(e) => setProfileForm({ ...profileForm, tradeName: e.target.value })}
                      placeholder="e.g. KANAB Motors Ethiopia"
                      disabled={!canEdit}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label className="form-label">Company Registration No.</label>
                    <input
                      type="text"
                      className="input"
                      value={profileForm.registrationNo}
                      onChange={(e) => setProfileForm({ ...profileForm, registrationNo: e.target.value })}
                      placeholder="e.g. MOT/AA/01/2020/00491"
                      disabled={!canEdit}
                    />
                  </div>
                  <div>
                    <label className="form-label">TIN (Tax Identification No.) *</label>
                    <input
                      type="text"
                      className="input"
                      value={profileForm.tin}
                      onChange={(e) => setProfileForm({ ...profileForm, tin: e.target.value })}
                      placeholder="e.g. TIN-0092837461"
                      disabled={!canEdit}
                    />
                  </div>
                  <div>
                    <label className="form-label">VAT Registration No.</label>
                    <input
                      type="text"
                      className="input"
                      value={profileForm.vatRegistrationNo}
                      onChange={(e) => setProfileForm({ ...profileForm, vatRegistrationNo: e.target.value })}
                      placeholder="e.g. VAT-ET-99018274"
                      disabled={!canEdit}
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Company Logo URL / Asset Path</label>
                  <input
                    type="text"
                    className="input"
                    value={profileForm.logo}
                    onChange={(e) => setProfileForm({ ...profileForm, logo: e.target.value })}
                    placeholder="/assets/logo.png or https://example.com/logo.png"
                    disabled={!canEdit}
                  />
                </div>
              </div>

              {/* Registered Address & Communication */}
              <div className="card" style={{ padding: '1.5rem' }}>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MapPin size={18} color="var(--accent-purple)" /> Registered Headquarters & Communication
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                  Official business address and official contact points.
                </p>

                <div style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Full Registered Address</label>
                  <textarea
                    className="input"
                    rows={2}
                    value={profileForm.address}
                    onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                    placeholder="Bole Sub-City, Kebele 03, House No. 492, Addis Ababa, Ethiopia"
                    disabled={!canEdit}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label className="form-label">City</label>
                    <input
                      type="text"
                      className="input"
                      value={profileForm.city}
                      onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                      disabled={!canEdit}
                    />
                  </div>
                  <div>
                    <label className="form-label">Country</label>
                    <input
                      type="text"
                      className="input"
                      value={profileForm.country}
                      onChange={(e) => setProfileForm({ ...profileForm, country: e.target.value })}
                      disabled={!canEdit}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="form-label">Official Phone</label>
                    <input
                      type="text"
                      className="input"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      placeholder="+251 11 662 4890"
                      disabled={!canEdit}
                    />
                  </div>
                  <div>
                    <label className="form-label">Official Email</label>
                    <input
                      type="email"
                      className="input"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      placeholder="import@kanabmotors.com"
                      disabled={!canEdit}
                    />
                  </div>
                  <div>
                    <label className="form-label">Website</label>
                    <input
                      type="text"
                      className="input"
                      value={profileForm.website}
                      onChange={(e) => setProfileForm({ ...profileForm, website: e.target.value })}
                      placeholder="https://www.kanabmotors.com"
                      disabled={!canEdit}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Importer Regulatory & Snapshot */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Importer Regulatory Information */}
              <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--accent-cyan)' }}>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldCheck size={18} color="var(--accent-cyan)" /> Importer Regulatory Credentials
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                  Required for import licensing, Central Bank of Ethiopia (NBE) forex permits, and Customs clearance.
                </p>

                <div style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Importer IEC No. (Importer Exporter Code) *</label>
                  <input
                    type="text"
                    className="input"
                    value={profileForm.importerIecNo}
                    onChange={(e) => setProfileForm({ ...profileForm, importerIecNo: e.target.value })}
                    placeholder="e.g. ETH-IEC-994821"
                    disabled={!canEdit}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                    Automatically populates Box 1 (Importer) on Purchase Orders and Bill of Lading manifests.
                  </span>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Importer AD Code (Authorized Dealer Code) *</label>
                  <input
                    type="text"
                    className="input"
                    value={profileForm.importerAdCode}
                    onChange={(e) => setProfileForm({ ...profileForm, importerAdCode: e.target.value })}
                    placeholder="e.g. AD-CBE-0019284"
                    disabled={!canEdit}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                    Bank branch code registered with NBE for foreign currency remittances & letters of credit.
                  </span>
                </div>

                <div style={{ padding: '0.85rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px', fontSize: '0.78rem' }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                    Downstream Integration Status
                  </div>
                  <div style={{ color: 'var(--text-secondary)' }}>
                    • Linked to Purchase Order PDF Engine<br />
                    • Auto-attached to Landed Cost Freight Manifests<br />
                    • Cross-referenced against Bank Receipts
                  </div>
                </div>
              </div>

              {/* Profile Overview Card */}
              <div className="card" style={{ padding: '1.5rem' }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                  Company Profile Snapshot
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.82rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Status:</span>
                    <span className="badge badge-emerald">ACTIVE ENTITY</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Default Profile:</span>
                    <span style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>Yes (Primary Entity)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Bank Accounts Linked:</span>
                    <span style={{ fontWeight: 600 }}>{bankAccounts.length} accounts</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.4rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Last Updated:</span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {profile?.updatedAt ? new Date(profile.updatedAt).toLocaleString() : 'Recent'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* TAB 2: IMPORTER BANK ACCOUNTS */}
      {activeTab === 'bank_accounts' && (
        <div>
          {/* Summary KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: 'rgba(6,182,212,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Landmark size={22} color="var(--accent-cyan)" />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL BANK ACCOUNTS</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>{bankAccounts.length}</div>
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Star size={22} color="var(--accent-emerald)" />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>DEFAULT SETTLEMENT ACCOUNT</div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {defaultAccount ? `${defaultAccount.bankName} (${defaultAccount.currency})` : 'None Configured'}
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: 'rgba(168,85,247,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Globe size={22} color="var(--accent-purple)" />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>ACTIVE FOREX ACCOUNTS</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>{activeForexAccounts.length}</div>
              </div>
            </div>
          </div>

          {/* Accounts Table */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                  <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>ACCOUNT DETAILS</th>
                  <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>BANK & BRANCH</th>
                  <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>CURRENCY</th>
                  <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>SWIFT / IFSC CODE</th>
                  <th style={{ padding: '0.85rem 1.15rem', textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>DEFAULT</th>
                  <th style={{ padding: '0.85rem 1.15rem', textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>STATUS</th>
                  <th style={{ padding: '0.85rem 1.15rem', textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <RefreshCw size={20} className="spin" style={{ display: 'inline-block', marginBottom: '0.5rem' }} />
                      <div>Loading Importer Bank Accounts...</div>
                    </td>
                  </tr>
                ) : bankAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No importer bank accounts recorded yet. Click "Add Bank Account" to configure.
                    </td>
                  </tr>
                ) : (
                  bankAccounts.map((b) => (
                    <tr key={b.bankAccountId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '1rem 1.15rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                          {b.accountName}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontFamily: 'monospace', marginTop: '0.2rem' }}>
                          A/C: {b.accountNumber}
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.15rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{b.bankName}</div>
                        {b.bankBranch && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                            {b.bankBranch}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '1rem 1.15rem' }}>
                        <span className={`badge ${b.currency === 'USD' ? 'badge-emerald' : b.currency === 'EUR' ? 'badge-purple' : 'badge-cyan'}`} style={{ fontWeight: 700 }}>
                          {b.currency}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.15rem', fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                        <div>SWIFT: {b.swiftCode || '–'}</div>
                        {b.ifscCode && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>IFSC: {b.ifscCode}</div>}
                      </td>
                      <td style={{ padding: '1rem 1.15rem', textAlign: 'center' }}>
                        {b.isDefault ? (
                          <span className="badge badge-emerald" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 700 }}>
                            <Star size={11} /> PRIMARY DEFAULT
                          </span>
                        ) : (
                          canEdit && b.isActive && (
                            <button
                              onClick={() => handleSetDefaultBank(b)}
                              className="btn btn-secondary"
                              style={{ padding: '0.25rem 0.55rem', fontSize: '0.72rem' }}
                              title="Set as Default Account"
                            >
                              Make Default
                            </button>
                          )
                        )}
                      </td>
                      <td style={{ padding: '1rem 1.15rem', textAlign: 'center' }}>
                        <span className={`badge ${b.isActive ? 'badge-emerald' : 'badge-rose'}`}>
                          {b.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.15rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                          {canEdit && (
                            <>
                              <button
                                onClick={() => handleOpenEditBank(b)}
                                className="btn btn-secondary"
                                style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                                title="Edit Bank Details"
                              >
                                <Edit2 size={13} /> Edit
                              </button>
                              <button
                                onClick={() => handleToggleActiveBank(b)}
                                className="btn btn-secondary"
                                style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                                title={b.isActive ? 'Deactivate Account' : 'Activate Account'}
                              >
                                {b.isActive ? <ToggleRight size={14} color="var(--accent-emerald)" /> : <ToggleLeft size={14} color="var(--text-muted)" />}
                              </button>
                              <button
                                onClick={() => handleDeleteBank(b)}
                                className="btn btn-secondary"
                                style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', color: 'var(--accent-rose)' }}
                                title="Delete Account"
                              >
                                <Trash2 size={13} />
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
      )}

      {/* Modal: Add / Edit Bank Account */}
      {showBankModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '580px', width: '95%' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Landmark size={20} color="var(--accent-cyan)" />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                  {editingBank ? 'Edit Importer Bank Account' : 'Register Importer Bank Account'}
                </h3>
              </div>
              <button onClick={() => setShowBankModal(false)} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem' }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBank}>
              <div className="modal-body" style={{ padding: '1.25rem' }}>
                <ModalErrorAlert error={bankModalError} />

                <div style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Account Holder Name *</label>
                  <input
                    type="text"
                    className="input"
                    value={bankForm.accountName}
                    onChange={(e) => setBankForm({ ...bankForm, accountName: e.target.value })}
                    required
                    placeholder="e.g. KANAB MOTORS PLC - USD FOREX"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label className="form-label">Bank Name *</label>
                    <input
                      type="text"
                      className="input"
                      value={bankForm.bankName}
                      onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                      required
                      placeholder="e.g. Commercial Bank of Ethiopia"
                    />
                  </div>
                  <div>
                    <label className="form-label">Currency *</label>
                    <select
                      className="input"
                      value={bankForm.currency}
                      onChange={(e) => setBankForm({ ...bankForm, currency: e.target.value })}
                      required
                    >
                      <option value="USD">USD (US Dollar)</option>
                      <option value="EUR">EUR (Euro)</option>
                      <option value="ETB">ETB (Ethiopian Birr)</option>
                      <option value="GBP">GBP (British Pound)</option>
                      <option value="CNY">CNY (Chinese Yuan)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label className="form-label">Account Number *</label>
                    <input
                      type="text"
                      className="input"
                      value={bankForm.accountNumber}
                      onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                      required
                      placeholder="e.g. 100029384756"
                    />
                  </div>
                  <div>
                    <label className="form-label">Branch Name</label>
                    <input
                      type="text"
                      className="input"
                      value={bankForm.bankBranch}
                      onChange={(e) => setBankForm({ ...bankForm, bankBranch: e.target.value })}
                      placeholder="e.g. Finfinne Main Branch"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label className="form-label">SWIFT Code</label>
                    <input
                      type="text"
                      className="input"
                      value={bankForm.swiftCode}
                      onChange={(e) => setBankForm({ ...bankForm, swiftCode: e.target.value })}
                      placeholder="e.g. CBETETAA"
                    />
                  </div>
                  <div>
                    <label className="form-label">IFSC Code (Optional)</label>
                    <input
                      type="text"
                      className="input"
                      value={bankForm.ifscCode}
                      onChange={(e) => setBankForm({ ...bankForm, ifscCode: e.target.value })}
                      placeholder="e.g. CBET000192"
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '1rem', padding: '0.85rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={bankForm.isDefault}
                      onChange={(e) => setBankForm({ ...bankForm, isDefault: e.target.checked })}
                    />
                    Designate as Primary Default Account for Import POs
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={bankForm.isActive}
                      onChange={(e) => setBankForm({ ...bankForm, isActive: e.target.checked })}
                    />
                    Account Active (available for selection in transactions)
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowBankModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={savingBank} className="btn btn-cyan">
                  {savingBank ? 'Saving...' : editingBank ? 'Update Account' : 'Add Bank Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

