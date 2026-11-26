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
  Upload,
  Image as ImageIcon,
} from 'lucide-react';
import { api, CompanyProfile, CompanyBankAccount, CompanyImporter, resolveCompanyAssetUrl } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useBranding } from '../../context/BrandingContext';
import { formatApiError } from '../../utils/error';
import { ModalErrorAlert } from '../../components/ModalErrorAlert';
import { InternationalPhoneInput } from '../../components/InternationalPhoneInput';

type ProfileFieldKey =
  | 'companyName'
  | 'tradeName'
  | 'registrationNo'
  | 'tin'
  | 'vatRegistrationNo'
  | 'address'
  | 'city'
  | 'country'
  | 'phone'
  | 'email'
  | 'website'
  | 'importerIecNo'
  | 'importerAdCode';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_CHARS_REGEX = /^\+?[0-9\s\-()]+$/;
const REGULATORY_CODE_REGEX = /^[A-Za-z0-9\-/]{3,50}$/;

function validateProfileField(field: ProfileFieldKey, rawValue: string): string | undefined {
  const value = (rawValue || '').trim();
  switch (field) {
    case 'companyName':
      if (!value) return 'Registered Company Name is required.';
      if (value.length > 200) return 'Registered Company Name must be 200 characters or fewer.';
      return undefined;
    case 'tradeName':
      if (value.length > 255) return 'Trading Name must be 255 characters or fewer.';
      return undefined;
    case 'registrationNo':
      if (value.length > 100) return 'Company Registration No. must be 100 characters or fewer.';
      return undefined;
    case 'tin':
      if (!value) return 'TIN (Tax Identification No.) is required.';
      if (value.length > 100) return 'TIN must be 100 characters or fewer.';
      return undefined;
    case 'vatRegistrationNo':
      if (value.length > 100) return 'VAT Registration No. must be 100 characters or fewer.';
      return undefined;
    case 'address':
      if (value.length > 1000) return 'Full Registered Address must be 1000 characters or fewer.';
      return undefined;
    case 'city':
      if (value.length > 100) return 'City must be 100 characters or fewer.';
      return undefined;
    case 'country':
      if (value.length > 100) return 'Country must be 100 characters or fewer.';
      return undefined;
    case 'phone': {
      if (!value) return undefined;
      const digits = value.replace(/\D/g, '');
      if (!PHONE_CHARS_REGEX.test(value) || digits.length < 7 || digits.length > 15) {
        return 'Enter a valid phone number with country code (7–15 digits) or leave blank.';
      }
      return undefined;
    }
    case 'email':
      if (!value) return undefined;
      if (!EMAIL_REGEX.test(value)) {
        return 'Enter a valid email address (e.g. import@kanabmotors.com).';
      }
      return undefined;
    case 'website': {
      if (!value) return undefined;
      try {
        const parsed = new URL(value);
        const validProtocol = parsed.protocol === 'http:' || parsed.protocol === 'https:';
        const validHost = parsed.hostname.includes('.') || parsed.hostname === 'localhost';
        if (!validProtocol || !validHost) {
          return 'Enter a valid URL starting with http:// or https:// (e.g. https://www.kanabmotors.com).';
        }
        return undefined;
      } catch {
        return 'Enter a valid URL starting with http:// or https:// (e.g. https://www.kanabmotors.com).';
      }
    }
    case 'importerIecNo':
      if (!value) return undefined;
      if (!REGULATORY_CODE_REGEX.test(value)) {
        return 'Importer IEC No. must be 3–50 characters (letters, numbers, - or /).';
      }
      return undefined;
    case 'importerAdCode':
      if (!value) return undefined;
      if (!REGULATORY_CODE_REGEX.test(value)) {
        return 'Importer AD Code must be 3–50 characters (letters, numbers, - or /).';
      }
      return undefined;
    default:
      return undefined;
  }
}

export const CompanyProfilePage: React.FC = () => {
  const { hasPermission } = useAuth();
  const { applyBranding, refreshBranding } = useBranding();
  const canEdit =
    hasPermission('COMPANY_PROFILE_EDIT') ||
    hasPermission('USERS_EDIT');

  const [activeTab, setActiveTab] = useState<'profile' | 'importers' | 'bank_accounts'>('profile');
  const [loading, setLoading] = useState<boolean>(true);
  const [savingProfile, setSavingProfile] = useState<boolean>(false);
  const [uploadingLogo, setUploadingLogo] = useState<boolean>(false);
  const [logoPreviewError, setLogoPreviewError] = useState<boolean>(false);
  const logoInputRef = React.useRef<HTMLInputElement>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<ProfileFieldKey, string>>>({});

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

  useEffect(() => {
    setLogoPreviewError(false);
  }, [profileForm.logo]);

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

  // Importers state
  const [importers, setImporters] = useState<CompanyImporter[]>([]);
  const [showImporterModal, setShowImporterModal] = useState<boolean>(false);
  const [editingImporter, setEditingImporter] = useState<CompanyImporter | null>(null);
  const [importerModalError, setImporterModalError] = useState<string | null>(null);
  const [savingImporter, setSavingImporter] = useState<boolean>(false);

  const [importerForm, setImporterForm] = useState<{
    importerName: string;
    iecNo: string;
    adCode: string;
    description: string;
    isDefault: boolean;
    isActive: boolean;
  }>({
    importerName: '',
    iecNo: '',
    adCode: '',
    description: '',
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
    setProfileError(null);
    setFieldErrors({});
    try {
      const [data, banks, imps] = await Promise.all([
        api.getCompanyProfile(),
        api.getCompanyBankAccounts(),
        api.getCompanyImporters(),
      ]);
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

      setBankAccounts(banks);
      setImporters(imps);
    } catch (err: any) {
      showToast('error', formatApiError(err, 'Failed to load company profile settings'));
    } finally {
      setLoading(false);
    }
  };

  const updateProfileField = (field: ProfileFieldKey, value: string) => {
    setProfileForm((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      const nextErr = validateProfileField(field, value);
      setFieldErrors((prev) => {
        const updated = { ...prev };
        if (nextErr) updated[field] = nextErr;
        else delete updated[field];
        return updated;
      });
    }
  };

  const handleFieldBlur = (field: ProfileFieldKey) => {
    const err = validateProfileField(field, profileForm[field]);
    setFieldErrors((prev) => {
      const updated = { ...prev };
      if (err) updated[field] = err;
      else delete updated[field];
      return updated;
    });
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setProfileError(null);

    const fieldsToValidate: ProfileFieldKey[] = [
      'companyName',
      'tradeName',
      'registrationNo',
      'tin',
      'vatRegistrationNo',
      'address',
      'city',
      'country',
      'phone',
      'email',
      'website',
      'importerIecNo',
      'importerAdCode',
    ];
    const nextErrors: Partial<Record<ProfileFieldKey, string>> = {};
    for (const key of fieldsToValidate) {
      const err = validateProfileField(key, profileForm[key]);
      if (err) nextErrors[key] = err;
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      const summary = Object.values(nextErrors).join(' ');
      setProfileError(summary);
      showToast('error', summary);
      return;
    }
    setFieldErrors({});

    setSavingProfile(true);
    try {
      const updated = await api.updateCompanyProfile(profile.profileId, profileForm);
      setProfile(updated);
      setLogoPreviewError(false);
      applyBranding({
        companyName: updated.companyName,
        tradeName: updated.tradeName || '',
        logo: updated.logo || '',
        country: updated.country,
      });
      await refreshBranding();
      showToast('success', 'Company Profile & Importer settings saved successfully!');
    } catch (err: any) {
      const msg = formatApiError(err, 'Failed to save company profile');
      setProfileError(msg);
      showToast('error', msg);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !profile || !canEdit) return;
    setProfileError(null);

    if (file.size > 5 * 1024 * 1024) {
      const msg = 'Logo image must be 5 MB or smaller.';
      setProfileError(msg);
      showToast('error', msg);
      return;
    }

    setUploadingLogo(true);
    try {
      const res = await api.uploadCompanyLogo(profile.profileId, file);
      setProfile(res.profile);
      setProfileForm((prev) => ({ ...prev, logo: res.logoUrl }));
      setLogoPreviewError(false);
      applyBranding({
        companyName: res.profile.companyName,
        tradeName: res.profile.tradeName || '',
        logo: res.logoUrl,
        country: res.profile.country,
      });
      await refreshBranding();
      showToast('success', 'Company logo uploaded and applied across workspace!');
    } catch (err: any) {
      const msg = formatApiError(err, 'Failed to upload company logo');
      setProfileError(msg);
      showToast('error', msg);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!profile || !canEdit) return;
    setProfileError(null);
    setUploadingLogo(true);
    try {
      const updated = await api.updateCompanyProfile(profile.profileId, { logo: '' });
      setProfile(updated);
      setProfileForm((prev) => ({ ...prev, logo: '' }));
      setLogoPreviewError(false);
      applyBranding({
        companyName: updated.companyName,
        tradeName: updated.tradeName || '',
        logo: '',
        country: updated.country,
      });
      await refreshBranding();
      showToast('success', 'Company logo removed; default branding restored.');
    } catch (err: any) {
      const msg = formatApiError(err, 'Failed to remove company logo');
      setProfileError(msg);
      showToast('error', msg);
    } finally {
      setUploadingLogo(false);
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

  const handleOpenAddImporter = () => {
    setEditingImporter(null);
    setImporterModalError(null);
    setImporterForm({
      importerName: '',
      iecNo: '',
      adCode: '',
      description: '',
      isDefault: importers.length === 0,
      isActive: true,
    });
    setShowImporterModal(true);
  };

  const handleOpenEditImporter = (imp: CompanyImporter) => {
    setEditingImporter(imp);
    setImporterModalError(null);
    setImporterForm({
      importerName: imp.importerName,
      iecNo: imp.iecNo || '',
      adCode: imp.adCode || '',
      description: imp.description || '',
      isDefault: imp.isDefault,
      isActive: imp.isActive,
    });
    setShowImporterModal(true);
  };

  const handleSaveImporter = async (e: React.FormEvent) => {
    e.preventDefault();
    setImporterModalError(null);

    const name = importerForm.importerName.trim();
    const iec = importerForm.iecNo.trim();
    const ad = importerForm.adCode.trim();

    if (!name) {
      setImporterModalError('Importer / Division Name is required.');
      return;
    }
    if (iec && !REGULATORY_CODE_REGEX.test(iec)) {
      setImporterModalError('Importer IEC No. must be 3–50 characters (letters, numbers, - or /).');
      return;
    }
    if (ad && !REGULATORY_CODE_REGEX.test(ad)) {
      setImporterModalError('Importer AD Code must be 3–50 characters (letters, numbers, - or /).');
      return;
    }

    setSavingImporter(true);
    try {
      if (editingImporter) {
        await api.updateCompanyImporter(editingImporter.importerId, {
          importerName: name,
          iecNo: iec || undefined,
          adCode: ad || undefined,
          description: importerForm.description.trim() || undefined,
          isDefault: importerForm.isDefault,
          isActive: importerForm.isActive,
        });
        showToast('success', `Importer license '${name}' updated successfully!`);
      } else {
        await api.createCompanyImporter({
          importerName: name,
          iecNo: iec || undefined,
          adCode: ad || undefined,
          description: importerForm.description.trim() || undefined,
          isDefault: importerForm.isDefault,
          isActive: importerForm.isActive,
        });
        showToast('success', `Importer license '${name}' added successfully!`);
      }
      setShowImporterModal(false);
      setEditingImporter(null);
      await loadData();
    } catch (err: any) {
      setImporterModalError(formatApiError(err, 'Failed to save importer details'));
    } finally {
      setSavingImporter(false);
    }
  };

  const handleSetDefaultImporter = async (imp: CompanyImporter) => {
    try {
      await api.setDefaultCompanyImporter(imp.importerId);
      showToast('success', `'${imp.importerName}' designated as primary default importer license`);
      await loadData();
    } catch (err: any) {
      showToast('error', formatApiError(err, 'Failed to set default importer'));
    }
  };

  const handleToggleActiveImporter = async (imp: CompanyImporter) => {
    try {
      await api.toggleActiveCompanyImporter(imp.importerId);
      showToast('success', `Importer '${imp.importerName}' is now ${!imp.isActive ? 'active' : 'inactive'}`);
      await loadData();
    } catch (err: any) {
      showToast('error', formatApiError(err, 'Failed to update importer status'));
    }
  };

  const handleDeleteImporter = async (imp: CompanyImporter) => {
    if (!confirm(`Are you sure you want to delete importer license '${imp.importerName}'?`)) {
      return;
    }
    try {
      await api.deleteCompanyImporter(imp.importerId);
      showToast('success', `Importer license '${imp.importerName}' removed successfully`);
      await loadData();
    } catch (err: any) {
      showToast('error', formatApiError(err, 'Could not delete importer license. It may be referenced by existing purchase orders. Deactivate it instead.'));
    }
  };

  const defaultAccount = bankAccounts.find((b) => b.isDefault && b.isActive);
  const activeForexAccounts = bankAccounts.filter((b) => b.isActive && b.currency !== 'ETB');
  const defaultImporter = importers.find((i) => i.isDefault && i.isActive) || importers.find((i) => i.isDefault) || importers[0];
  const activeImportersCount = importers.filter((i) => i.isActive).length;

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
          {activeTab === 'importers' && canEdit && (
            <button
              onClick={handleOpenAddImporter}
              className="btn btn-cyan"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}
            >
              <Plus size={16} /> Add Importer License
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
          <Building2 size={16} /> Company Legal Profile
        </button>
        <button
          onClick={() => setActiveTab('importers')}
          style={{
            padding: '0.75rem 1.25rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'importers' ? '3px solid var(--accent-cyan)' : '3px solid transparent',
            color: activeTab === 'importers' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <ShieldCheck size={16} /> Importer Licenses ({importers.length})
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
        <form onSubmit={handleSaveProfile} noValidate>
          <ModalErrorAlert error={profileError} onDismiss={() => setProfileError(null)} />
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
                      style={fieldErrors.companyName ? { borderColor: 'var(--accent-rose)' } : undefined}
                      value={profileForm.companyName}
                      onChange={(e) => updateProfileField('companyName', e.target.value)}
                      onBlur={() => handleFieldBlur('companyName')}
                      required
                      placeholder="e.g. KANAB Motors PLC"
                      disabled={!canEdit}
                    />
                    {fieldErrors.companyName && (
                      <div style={{ color: 'var(--accent-rose)', fontSize: '0.74rem', marginTop: '0.25rem' }}>
                        {fieldErrors.companyName}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="form-label">Trading Name / Brand Name</label>
                    <input
                      type="text"
                      className="input"
                      style={fieldErrors.tradeName ? { borderColor: 'var(--accent-rose)' } : undefined}
                      value={profileForm.tradeName}
                      onChange={(e) => updateProfileField('tradeName', e.target.value)}
                      onBlur={() => handleFieldBlur('tradeName')}
                      placeholder="e.g. KANAB Motors Ethiopia"
                      disabled={!canEdit}
                    />
                    {fieldErrors.tradeName && (
                      <div style={{ color: 'var(--accent-rose)', fontSize: '0.74rem', marginTop: '0.25rem' }}>
                        {fieldErrors.tradeName}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label className="form-label">Company Registration No.</label>
                    <input
                      type="text"
                      className="input"
                      style={fieldErrors.registrationNo ? { borderColor: 'var(--accent-rose)' } : undefined}
                      value={profileForm.registrationNo}
                      onChange={(e) => updateProfileField('registrationNo', e.target.value)}
                      onBlur={() => handleFieldBlur('registrationNo')}
                      placeholder="e.g. MOT/AA/01/2020/00491"
                      disabled={!canEdit}
                    />
                    {fieldErrors.registrationNo && (
                      <div style={{ color: 'var(--accent-rose)', fontSize: '0.74rem', marginTop: '0.25rem' }}>
                        {fieldErrors.registrationNo}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="form-label">TIN (Tax Identification No.) *</label>
                    <input
                      type="text"
                      className="input"
                      style={fieldErrors.tin ? { borderColor: 'var(--accent-rose)' } : undefined}
                      value={profileForm.tin}
                      onChange={(e) => updateProfileField('tin', e.target.value)}
                      onBlur={() => handleFieldBlur('tin')}
                      placeholder="e.g. TIN-0092837461"
                      disabled={!canEdit}
                    />
                    {fieldErrors.tin && (
                      <div style={{ color: 'var(--accent-rose)', fontSize: '0.74rem', marginTop: '0.25rem' }}>
                        {fieldErrors.tin}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="form-label">VAT Registration No.</label>
                    <input
                      type="text"
                      className="input"
                      style={fieldErrors.vatRegistrationNo ? { borderColor: 'var(--accent-rose)' } : undefined}
                      value={profileForm.vatRegistrationNo}
                      onChange={(e) => updateProfileField('vatRegistrationNo', e.target.value)}
                      onBlur={() => handleFieldBlur('vatRegistrationNo')}
                      placeholder="e.g. VAT-ET-99018274"
                      disabled={!canEdit}
                    />
                    {fieldErrors.vatRegistrationNo && (
                      <div style={{ color: 'var(--accent-rose)', fontSize: '0.74rem', marginTop: '0.25rem' }}>
                        {fieldErrors.vatRegistrationNo}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="form-label">Company Logo</label>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '0.85rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-secondary)',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div
                      style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '10px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        flexShrink: 0,
                        padding: '4px',
                      }}
                    >
                      {resolveCompanyAssetUrl(profileForm.logo) && !logoPreviewError ? (
                        <img
                          src={resolveCompanyAssetUrl(profileForm.logo)}
                          alt={profileForm.companyName || 'Company Logo'}
                          onError={() => setLogoPreviewError(true)}
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                      ) : (
                        <ImageIcon size={24} color="#94a3b8" />
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        {canEdit && (
                          <>
                            <input
                              ref={logoInputRef}
                              type="file"
                              accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/x-icon,.png,.jpg,.jpeg,.webp,.svg,.ico"
                              onChange={handleUploadLogo}
                              style={{ display: 'none' }}
                            />
                            <button
                              type="button"
                              onClick={() => logoInputRef.current?.click()}
                              disabled={uploadingLogo || loading}
                              className="btn btn-cyan"
                              style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                            >
                              <Upload size={14} />
                              {uploadingLogo ? 'Uploading...' : 'Upload Logo Image'}
                            </button>
                            {profileForm.logo && (
                              <button
                                type="button"
                                onClick={handleRemoveLogo}
                                disabled={uploadingLogo || loading}
                                className="btn btn-secondary"
                                style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', color: 'var(--accent-rose)' }}
                              >
                                <Trash2 size={13} /> Remove Logo
                              </button>
                            )}
                          </>
                        )}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                        PNG, JPG, WEBP, SVG or ICO (max 5 MB). Automatically updates Sidebar, Login Page, Browser Tab & Icon, and PO documents.
                      </div>
                    </div>
                  </div>
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
                    style={fieldErrors.address ? { borderColor: 'var(--accent-rose)' } : undefined}
                    rows={2}
                    value={profileForm.address}
                    onChange={(e) => updateProfileField('address', e.target.value)}
                    onBlur={() => handleFieldBlur('address')}
                    placeholder="Bole Sub-City, Kebele 03, House No. 492, Addis Ababa, Ethiopia"
                    disabled={!canEdit}
                  />
                  {fieldErrors.address && (
                    <div style={{ color: 'var(--accent-rose)', fontSize: '0.74rem', marginTop: '0.25rem' }}>
                      {fieldErrors.address}
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label className="form-label">City</label>
                    <input
                      type="text"
                      className="input"
                      style={fieldErrors.city ? { borderColor: 'var(--accent-rose)' } : undefined}
                      value={profileForm.city}
                      onChange={(e) => updateProfileField('city', e.target.value)}
                      onBlur={() => handleFieldBlur('city')}
                      disabled={!canEdit}
                    />
                    {fieldErrors.city && (
                      <div style={{ color: 'var(--accent-rose)', fontSize: '0.74rem', marginTop: '0.25rem' }}>
                        {fieldErrors.city}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="form-label">Country</label>
                    <input
                      type="text"
                      className="input"
                      style={fieldErrors.country ? { borderColor: 'var(--accent-rose)' } : undefined}
                      value={profileForm.country}
                      onChange={(e) => updateProfileField('country', e.target.value)}
                      onBlur={() => handleFieldBlur('country')}
                      disabled={!canEdit}
                    />
                    {fieldErrors.country && (
                      <div style={{ color: 'var(--accent-rose)', fontSize: '0.74rem', marginTop: '0.25rem' }}>
                        {fieldErrors.country}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Official Phone</label>
                  <InternationalPhoneInput
                    value={profileForm.phone}
                    onChange={(val) => updateProfileField('phone', val)}
                    disabled={!canEdit}
                  />
                  {fieldErrors.phone && (
                    <div style={{ color: 'var(--accent-rose)', fontSize: '0.74rem', marginTop: '0.25rem' }}>
                      {fieldErrors.phone}
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="form-label">Official Email</label>
                    <input
                      type="email"
                      className="input"
                      style={fieldErrors.email ? { borderColor: 'var(--accent-rose)' } : undefined}
                      value={profileForm.email}
                      onChange={(e) => updateProfileField('email', e.target.value)}
                      onBlur={() => handleFieldBlur('email')}
                      placeholder="import@kanabmotors.com"
                      disabled={!canEdit}
                    />
                    {fieldErrors.email && (
                      <div style={{ color: 'var(--accent-rose)', fontSize: '0.74rem', marginTop: '0.25rem' }}>
                        {fieldErrors.email}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="form-label">Website</label>
                    <input
                      type="url"
                      className="input"
                      style={fieldErrors.website ? { borderColor: 'var(--accent-rose)' } : undefined}
                      value={profileForm.website}
                      onChange={(e) => updateProfileField('website', e.target.value)}
                      onBlur={() => handleFieldBlur('website')}
                      placeholder="https://www.kanabmotors.com"
                      disabled={!canEdit}
                    />
                    {fieldErrors.website && (
                      <div style={{ color: 'var(--accent-rose)', fontSize: '0.74rem', marginTop: '0.25rem' }}>
                        {fieldErrors.website}
                      </div>
                    )}
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
                  <label className="form-label">Importer IEC No. (Importer Exporter Code)</label>
                  <input
                    type="text"
                    className="input"
                    style={fieldErrors.importerIecNo ? { borderColor: 'var(--accent-rose)' } : undefined}
                    value={profileForm.importerIecNo}
                    onChange={(e) => updateProfileField('importerIecNo', e.target.value)}
                    onBlur={() => handleFieldBlur('importerIecNo')}
                    placeholder="e.g. ETH-IEC-994821"
                    disabled={!canEdit}
                  />
                  {fieldErrors.importerIecNo && (
                    <div style={{ color: 'var(--accent-rose)', fontSize: '0.74rem', marginTop: '0.25rem' }}>
                      {fieldErrors.importerIecNo}
                    </div>
                  )}
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                    Automatically populates Box 1 (Importer) on Purchase Orders and Bill of Lading manifests.
                  </span>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Importer AD Code (Authorized Dealer Code)</label>
                  <input
                    type="text"
                    className="input"
                    style={fieldErrors.importerAdCode ? { borderColor: 'var(--accent-rose)' } : undefined}
                    value={profileForm.importerAdCode}
                    onChange={(e) => updateProfileField('importerAdCode', e.target.value)}
                    onBlur={() => handleFieldBlur('importerAdCode')}
                    placeholder="e.g. AD-CBE-0019284"
                    disabled={!canEdit}
                  />
                  {fieldErrors.importerAdCode && (
                    <div style={{ color: 'var(--accent-rose)', fontSize: '0.74rem', marginTop: '0.25rem' }}>
                      {fieldErrors.importerAdCode}
                    </div>
                  )}
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                    Bank branch code registered with NBE for foreign currency remittances & letters of credit.
                  </span>
                </div>

                <div style={{ padding: '0.85rem', backgroundColor: 'rgba(0, 210, 211, 0.08)', border: '1px solid rgba(0, 210, 211, 0.25)', borderRadius: '6px', fontSize: '0.78rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Multiple Importer Licenses</span>
                    <span className="badge badge-cyan">{importers.length} Configured</span>
                  </div>
                  <div style={{ color: 'var(--text-secondary)', marginBottom: '0.75rem', fontSize: '0.74rem' }}>
                    KANAB maintains multiple dynamic importer regulatory licenses for different divisions and commodity classifications.
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('importers')}
                    className="btn btn-secondary btn-sm"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.78rem' }}
                  >
                    Manage Importer Licenses ({importers.length}) →
                  </button>
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
                    <span style={{ color: 'var(--text-muted)' }}>Importer Licenses:</span>
                    <span style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>{importers.length} registered</span>
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

      {/* TAB 2: IMPORTERS & REGULATORY LICENSES */}
      {activeTab === 'importers' && (
        <div>
          {/* Summary KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: 'rgba(6,182,212,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={22} color="var(--accent-cyan)" />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL IMPORTER LICENSES</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>{importers.length}</div>
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Star size={22} color="var(--accent-emerald)" />
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>PRIMARY DEFAULT IMPORTER</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {defaultImporter ? defaultImporter.importerName : 'None Configured'}
                </div>
                {defaultImporter?.iecNo && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--accent-emerald)', fontFamily: 'monospace' }}>
                    IEC: {defaultImporter.iecNo}
                  </div>
                )}
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: 'rgba(168,85,247,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Building2 size={22} color="var(--accent-purple)" />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>ACTIVE REGULATORY LICENSES</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>{activeImportersCount}</div>
              </div>
            </div>
          </div>

          {/* Importers Table */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>
                  <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>IMPORTER LICENSE / DIVISION</th>
                  <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>IEC NUMBER</th>
                  <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>AD CODE</th>
                  <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>OPERATIONAL SCOPE</th>
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
                      <div>Loading Importer Licenses...</div>
                    </td>
                  </tr>
                ) : importers.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No importer licenses configured yet. Click "Add Importer License" to create one.
                    </td>
                  </tr>
                ) : (
                  importers.map((imp) => (
                    <tr key={imp.importerId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <td style={{ padding: '1rem 1.15rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                          {imp.importerName}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          License ID: #{imp.importerId} · Company: KANAB Motors PLC
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.15rem' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                          {imp.iecNo || '–'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.15rem' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {imp.adCode || '–'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.15rem', fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: '280px' }}>
                        {imp.description || 'General commercial imports'}
                      </td>
                      <td style={{ padding: '1rem 1.15rem', textAlign: 'center' }}>
                        {imp.isDefault && imp.isActive ? (
                          <span className="badge badge-emerald" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: 700 }}>
                            <Star size={11} /> PRIMARY DEFAULT
                          </span>
                        ) : (
                          canEdit && imp.isActive && (
                            <button
                              onClick={() => handleSetDefaultImporter(imp)}
                              className="btn btn-secondary"
                              style={{ padding: '0.25rem 0.55rem', fontSize: '0.72rem' }}
                              title="Designate as primary default importer license"
                            >
                              Make Default
                            </button>
                          )
                        )}
                      </td>
                      <td style={{ padding: '1rem 1.15rem', textAlign: 'center' }}>
                        <span className={`badge ${imp.isActive ? 'badge-emerald' : 'badge-rose'}`}>
                          {imp.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 1.15rem', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                          {canEdit && (
                            <>
                              <button
                                onClick={() => handleOpenEditImporter(imp)}
                                className="btn btn-secondary"
                                style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                                title="Edit Importer License"
                              >
                                <Edit2 size={13} /> Edit
                              </button>
                              <button
                                onClick={() => handleToggleActiveImporter(imp)}
                                className="btn btn-secondary"
                                style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                                title={imp.isActive ? 'Deactivate License' : 'Activate License'}
                              >
                                {imp.isActive ? <ToggleRight size={14} color="var(--accent-emerald)" /> : <ToggleLeft size={14} color="var(--text-muted)" />}
                              </button>
                              <button
                                onClick={() => handleDeleteImporter(imp)}
                                className="btn btn-secondary"
                                style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', color: 'var(--accent-rose)' }}
                                title="Delete License (blocked if referenced by Purchase Orders)"
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

      {/* TAB 3: IMPORTER BANK ACCOUNTS */}
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
                        {b.isDefault && b.isActive ? (
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

      {/* ADD / EDIT IMPORTER MODAL */}
      {showImporterModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '580px', width: '90%' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={20} color="var(--accent-cyan)" />
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {editingImporter ? 'Edit Importer License' : 'Add New Importer License'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowImporterModal(false)}
                className="btn btn-secondary btn-sm"
                style={{ padding: '0.25rem 0.55rem' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveImporter}>
              <div className="modal-body" style={{ padding: '1.5rem' }}>
                <ModalErrorAlert error={importerModalError} onDismiss={() => setImporterModalError(null)} />

                <div style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Importer / License Division Name *</label>
                  <input
                    type="text"
                    className="input"
                    value={importerForm.importerName}
                    onChange={(e) => setImporterForm({ ...importerForm, importerName: e.target.value })}
                    placeholder="e.g. KANAB Motors PLC (Commercial & Heavy Duty Division)"
                    required
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                    Distinguishes the legal division or customs license under KANAB Motors PLC.
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label className="form-label">Importer IEC No. *</label>
                    <input
                      type="text"
                      className="input"
                      value={importerForm.iecNo}
                      onChange={(e) => setImporterForm({ ...importerForm, iecNo: e.target.value })}
                      placeholder="e.g. ETH-IEC-994821"
                      required
                    />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                      Importer Exporter Code
                    </span>
                  </div>
                  <div>
                    <label className="form-label">Importer AD Code *</label>
                    <input
                      type="text"
                      className="input"
                      value={importerForm.adCode}
                      onChange={(e) => setImporterForm({ ...importerForm, adCode: e.target.value })}
                      placeholder="e.g. AD-CBE-0019284"
                      required
                    />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                      Authorized Dealer Code
                    </span>
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Operational Scope / Description</label>
                  <textarea
                    className="input"
                    rows={2}
                    value={importerForm.description}
                    onChange={(e) => setImporterForm({ ...importerForm, description: e.target.value })}
                    placeholder="e.g. Used for commercial cargo trucks, specialized trailers, and heavy plant equipment."
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '1rem', padding: '0.85rem', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={importerForm.isDefault}
                      onChange={(e) => setImporterForm({ ...importerForm, isDefault: e.target.checked })}
                    />
                    Designate as Primary Default Importer License (auto-selected in POs)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                    <input
                      type="checkbox"
                      checked={importerForm.isActive}
                      onChange={(e) => setImporterForm({ ...importerForm, isActive: e.target.checked })}
                    />
                    License Active (available for selection in Purchase Orders)
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowImporterModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={savingImporter} className="btn btn-cyan">
                  {savingImporter ? 'Saving...' : editingImporter ? 'Update License' : 'Add License'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

