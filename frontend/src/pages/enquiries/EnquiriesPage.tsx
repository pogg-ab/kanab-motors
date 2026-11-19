import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  Send,
  XCircle,
  FileText,
  Plus,
  Search,
  CheckCircle2,
  ArrowRight,
  User,
  Package,
  DollarSign,
  AlertCircle,
  X,
  Clock,
  Layers,
  Printer,
  RotateCcw,
  Building2,
  Percent,
  ShieldCheck,
  Eye,
  TrendingUp,
  Timer,
  Car,
  FileCheck,
} from 'lucide-react';
import {
  api,
  SalesEnquiry,
  PreAdvanceSlip,
  Customer,
  ProductItem,
  ProductCategory,
  CustomerVehicleInspection,
  CommissionReport,
  FinancingReport,
} from '../../api/client';
import { usePermissions } from '../../authz/usePermissions';
import { useAuth } from '../../context/AuthContext';
import { ModalErrorAlert } from '../../components/ModalErrorAlert';
import { formatApiError } from '../../utils/error';

const normalizeInspection = (raw: any): CustomerVehicleInspection => {
  if (!raw) return raw;
  return {
    ...raw,
    scheduledAt: raw.scheduledAt || raw.inspectionStartTime || raw.createdAt,
    startedAt: raw.startedAt || raw.inspectionStartTime,
    durationMinutes: raw.durationMinutes ?? raw.allowedDurationMinutes ?? 120,
    deadlineAt: raw.deadlineAt || raw.inspectionDeadline,
    completedAt: raw.completedAt || raw.inspectionCompletedAt,
    inspectionStatus: raw.inspectionStatus || raw.status || 'PENDING',
    inspectionOutcome: raw.inspectionOutcome || raw.outcome,
    extendedMinutes: raw.extendedMinutes ?? raw.extensionMinutes ?? 0,
    outcomeReason: raw.outcomeReason || raw.remarks,
  };
};

export const EnquiriesPage: React.FC = () => {
  const { user } = useAuth();
  const { can } = usePermissions();
  const canCreateEnquiry = can('ENQUIRIES_CREATE');
  const canApproveEnquiry = can('ENQUIRIES_APPROVE');
  const canRejectEnquiry = can('ENQUIRIES_REJECT');
  const canCreateBooking = can('BOOKINGS_CREATE');

  // Navigation Tabs: Pipeline, Inspections, Pre-Advance Slips, Intelligence
  const [activeTab, setActiveTab] = useState<'pipeline' | 'inspections' | 'slips' | 'intelligence'>('pipeline');

  const [enquiries, setEnquiries] = useState<SalesEnquiry[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Tab data states
  const [inspections, setInspections] = useState<CustomerVehicleInspection[]>([]);
  const [loadingInspections, setLoadingInspections] = useState(false);
  const [slips, setSlips] = useState<PreAdvanceSlip[]>([]);
  const [loadingSlips, setLoadingSlips] = useState(false);
  const [commissionReport, setCommissionReport] = useState<CommissionReport | null>(null);
  const [financingReport, setFinancingReport] = useState<FinancingReport | null>(null);
  const [loadingReports, setLoadingReports] = useState(false);

  // Real-time ticker for live countdowns
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatCountdown = (deadlineIso?: string) => {
    if (!deadlineIso) return 'N/A';
    const diff = new Date(deadlineIso).getTime() - now;
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);
    if (hours > 0) {
      return `${hours}h ${mins}m ${secs}s`;
    }
    return `${mins}m ${secs}s`;
  };

  // Filters
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingEnquiry, setEditingEnquiry] = useState<SalesEnquiry | null>(null);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [requirements, setRequirements] = useState({
    leadSource: 'WALK_IN',
    branchShowroom: '',
    vehicleCategoryId: '',
    preferredColor: '',
    requiredDeliveryDate: '',
    registrationHomologationNeeded: false,
    chargerTypeIncluded: false,
    targetBudget: '',
    currency: 'ETB',
    financingRequired: false,
    expectedDeposit: '',
    expectedPaymentTimeline: '',
    financeProvider: '',
    tradeInVehicle: false,
    customerRequirementsNotes: '',
    // Story 1: Commission Agent Tracking & Automatic Calculation
    commissionAgentName: '',
    commissionAgentPhone: '',
    commissionPercentage: '',
    commissionNotes: '',
    // Story 3: Financing Institution Tracking & Calculation
    financingOption: 'CASH' as 'CASH' | 'BANK_FINANCING' | 'MICROFINANCE_FINANCING',
    financingType: 'BANK' as 'BANK' | 'MICROFINANCE',
    financingInstitutionName: '',
    financingContactPerson: '',
    financingContactPhone: '',
    financingPercentage: '70',
    financingNotes: '',
  });
  const [formData, setFormData] = useState({
    customerId: '',
    itemId: '',
    quantity: 1,
    unitPrice: '',
    salespersonName: user?.fullName || '',
    paymentMode: 'BANK_DEPOSIT',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Inspection Modal State (Story 2: Customer Vehicle Inspection)
  const [inspectionModal, setInspectionModal] = useState<{
    open: boolean;
    enquiry: SalesEnquiry | null;
    inspection: CustomerVehicleInspection | null;
    mode: 'INITIATE' | 'COMPLETE' | 'EXTEND' | 'CANCEL' | 'VIEW';
  }>({
    open: false,
    enquiry: null,
    inspection: null,
    mode: 'VIEW',
  });
  const [inspectionForm, setInspectionForm] = useState({
    vinChassisNumber: '',
    engineNumber: '',
    inspectorName: user?.fullName || 'Senior Technical Inspector',
    durationMinutes: 120,
    notes: '',
    outcome: 'ACCEPTED' as 'ACCEPTED' | 'REJECTED' | 'PENDING_DECISION',
    outcomeReason: '',
    customerSignatureAck: true,
    extensionMinutes: 30,
    extensionReason: '',
    cancellationReason: '',
  });
  const [submittingInspection, setSubmittingInspection] = useState(false);
  const [inspectionError, setInspectionError] = useState<string | null>(null);

  // Financing Status Modal State (Story 3)
  const [financingModal, setFinancingModal] = useState<{
    open: boolean;
    enquiry: SalesEnquiry | null;
  }>({ open: false, enquiry: null });
  const [financingForm, setFinancingForm] = useState({
    financingStatus: 'SUBMITTED' as 'NOT_SUBMITTED' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'DISBURSED',
    financingApplicationNumber: '',
    financingApprovedAmount: '',
    financingDisbursedAmount: '',
    financingNotes: '',
  });
  const [submittingFinancing, setSubmittingFinancing] = useState(false);
  const [financingError, setFinancingError] = useState<string | null>(null);

  // Convert to Booking Modal State (Replaces browser alert/confirm)
  const [convertTarget, setConvertTarget] = useState<SalesEnquiry | null>(null);
  const [converting, setConverting] = useState(false);
  const [convertError, setConvertError] = useState<string | null>(null);
  const [conversionSuccess, setConversionSuccess] = useState<{
    bookingNumber: string;
    enquiryNumber: string;
  } | null>(null);

  // Rejection Modal State
  const [rejectTarget, setRejectTarget] = useState<SalesEnquiry | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  // Two-stage approval state (KMSI-14-15)
  const [approvalModal, setApprovalModal] = useState<{
    enquiry: SalesEnquiry | null;
    stage: 'SALES_REP' | 'SALES_MANAGER' | null;
    decision: 'APPROVE' | 'REJECT';
    notes: string;
  }>({ enquiry: null, stage: null, decision: 'APPROVE', notes: '' });
  const [approvalSubmitting, setApprovalSubmitting] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);


  // Printable Proforma Quotation Modal
  const [selectedQuote, setSelectedQuote] = useState<SalesEnquiry | null>(null);

  // Pre-Advance Slip Modal State (Story E16, E17, E18)
  const [selectedSlip, setSelectedSlip] = useState<PreAdvanceSlip | null>(null);
  const [loadingSlip, setLoadingSlip] = useState(false);

  const handleOpenSlip = async (enq: SalesEnquiry) => {
    setLoadingSlip(true);
    try {
      const slip = await api.getPreAdvanceSlipByEnquiryId(enq.enquiryId);
      if (slip) {
        setSelectedSlip(slip);
      } else {
        alert('Pre-advance slip is generated automatically when an enquiry is approved.');
      }
    } catch (err) {
      console.error('Failed to load pre-advance slip:', err);
    } finally {
      setLoadingSlip(false);
    }
  };

  // Print Isolation Effect (Proforma Quotation and Pre-Advance Slip)
  useEffect(() => {
    if (selectedQuote || selectedSlip) {
      document.body.classList.add('printing-proforma');
    } else {
      document.body.classList.remove('printing-proforma');
    }
    return () => {
      document.body.classList.remove('printing-proforma');
    };
  }, [selectedQuote, selectedSlip]);

  const getVehicleLabel = (item?: any) => {
    if (!item) return 'Vehicle Item';
    const brandStr = typeof item.brand === 'object' ? (item.brand?.brandName || '') : (item.brand || item.brandName || item.make || '');
    const brand = typeof brandStr === 'string' ? brandStr : '';
    const modelStr = item.model || item.itemName || 'Vehicle';
    const model = typeof modelStr === 'string' ? modelStr : 'Vehicle';
    const year = item.modelYear ? ` ${item.modelYear}` : '';
    const condition = item.newOrUsed ? ` (${item.newOrUsed})` : item.isNewVehicle === false ? ' (Used)' : item.isNewVehicle === true ? ' (New)' : '';
    if (brand && model && !model.toLowerCase().includes(brand.toLowerCase())) {
      return `${brand} ${model}${year}${condition}`.trim();
    }
    return `${model}${year}${condition}`.trim();
  };

  const fetchDependencies = async () => {
    try {
      const [custRes, itemRes, catRes] = await Promise.all([
        api.getCustomers({ limit: 100 }),
        api.getItems({ limit: 100 }),
        api.getCategories().catch(() => []),
      ]);
      setCustomers(custRes.items);
      setItems(itemRes.items);
      setCategories(catRes || []);
    } catch (err) {
      console.error('Failed to load dependencies:', err);
    }
  };

  const fetchEnquiries = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (selectedStatus !== 'ALL') params.status = selectedStatus;
      if (search.trim()) params.search = search.trim();

      const res = await api.getEnquiries(params);
      setEnquiries(res.items);
    } catch (err) {
      console.error('Failed to load enquiries:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInspections = async () => {
    setLoadingInspections(true);
    try {
      const data = await api.getInspections();
      setInspections((data || []).map(normalizeInspection));
    } catch (err) {
      console.error('Failed to load vehicle inspections:', err);
    } finally {
      setLoadingInspections(false);
    }
  };

  const getActiveInspectionForEnquiry = (enq: SalesEnquiry) => {
    if (enq.inspections && enq.inspections.length > 0) {
      return normalizeInspection(enq.inspections[0]);
    }
    const found = inspections.find((i) => String(i.enquiryId) === String(enq.enquiryId));
    return found ? normalizeInspection(found) : null;
  };

  const fetchSlips = async () => {
    setLoadingSlips(true);
    try {
      const data = await api.getPreAdvanceSlips();
      setSlips(data);
    } catch (err) {
      console.error('Failed to load pre-advance slips:', err);
    } finally {
      setLoadingSlips(false);
    }
  };

  const fetchReports = async () => {
    setLoadingReports(true);
    try {
      const [comm, fin] = await Promise.all([
        api.getCommissionReport(),
        api.getFinancingReport(),
      ]);
      setCommissionReport(comm);
      setFinancingReport(fin);
    } catch (err) {
      console.error('Failed to load intelligence reports:', err);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    fetchDependencies();
    fetchInspections();
  }, []);

  useEffect(() => {
    if (activeTab === 'pipeline') {
      fetchEnquiries();
      fetchInspections();
    } else if (activeTab === 'inspections') fetchInspections();
    else if (activeTab === 'slips') fetchSlips();
    else if (activeTab === 'intelligence') fetchReports();
  }, [activeTab, selectedStatus, search]);

  const handleOpenCreate = () => {
    if (!canCreateEnquiry) return;
    setEditingEnquiry(null);
    const defaultItem = items[0];
    setFormData({
      customerId: customers[0]?.customerId || '',
      itemId: defaultItem?.itemId || '',
      quantity: 1,
      unitPrice: defaultItem ? defaultItem.sellingPrice.toString() : '',
      salespersonName: user?.fullName || '',
      paymentMode: 'BANK_DEPOSIT',
    });
    setRequirements({
      leadSource: 'WALK_IN',
      branchShowroom: '',
      vehicleCategoryId: '',
      preferredColor: '',
      requiredDeliveryDate: '',
      registrationHomologationNeeded: false,
      chargerTypeIncluded: false,
      targetBudget: '',
      currency: 'ETB',
      financingRequired: false,
      expectedDeposit: '',
      expectedPaymentTimeline: '',
      financeProvider: '',
      tradeInVehicle: false,
      customerRequirementsNotes: '',
      commissionAgentName: '',
      commissionAgentPhone: '',
      commissionPercentage: '',
      commissionNotes: '',
      financingOption: 'CASH',
      financingType: 'BANK',
      financingInstitutionName: '',
      financingContactPerson: '',
      financingContactPhone: '',
      financingPercentage: '70',
      financingNotes: '',
    });
    setFormError(null);
    setIsCreateOpen(true);
  };

  const handleStartEdit = (enq: SalesEnquiry) => {
    setEditingEnquiry(enq);
    setFormData({
      customerId: enq.customerId,
      itemId: enq.itemId,
      quantity: enq.quantity,
      unitPrice: enq.unitPrice ? enq.unitPrice.toString() : '',
      salespersonName: enq.salespersonName || user?.fullName || '',
      paymentMode: enq.paymentMode || 'BANK_DEPOSIT',
    });
    setRequirements({
      leadSource: enq.leadSource || 'WALK_IN',
      branchShowroom: enq.branchShowroom || '',
      vehicleCategoryId: enq.vehicleCategoryId ? enq.vehicleCategoryId.toString() : '',
      preferredColor: enq.preferredColor || '',
      requiredDeliveryDate: enq.requiredDeliveryDate || '',
      registrationHomologationNeeded: !!enq.registrationHomologationNeeded,
      chargerTypeIncluded: !!enq.chargerTypeIncluded,
      targetBudget: enq.targetBudget !== undefined && enq.targetBudget !== null ? enq.targetBudget.toString() : '',
      currency: enq.currency || 'ETB',
      financingRequired: !!enq.financingRequired,
      expectedDeposit: enq.expectedDeposit !== undefined && enq.expectedDeposit !== null ? enq.expectedDeposit.toString() : '',
      expectedPaymentTimeline: enq.expectedPaymentTimeline || '',
      financeProvider: enq.financeProvider || '',
      tradeInVehicle: !!enq.tradeInVehicle,
      customerRequirementsNotes: enq.customerRequirementsNotes || '',
      commissionAgentName: enq.commissionAgentName || '',
      commissionAgentPhone: (enq as any).commissionAgentPhone || '',
      commissionPercentage: enq.commissionPercentage !== undefined && enq.commissionPercentage !== null ? enq.commissionPercentage.toString() : '',
      commissionNotes: (enq as any).commissionNotes || '',
      financingOption: enq.financingOption || (enq.financingRequired ? 'BANK_FINANCING' : 'CASH'),
      financingType: enq.financingType || 'BANK',
      financingInstitutionName: enq.financingInstitutionName || enq.financeProvider || '',
      financingContactPerson: (enq as any).financingContactPerson || '',
      financingContactPhone: (enq as any).financingContactPhone || '',
      financingPercentage: enq.financingPercentage !== undefined && enq.financingPercentage !== null ? enq.financingPercentage.toString() : '70',
      financingNotes: (enq as any).financingNotes || '',
    });
    setFormError(null);
    setIsCreateOpen(true);
  };

  const handleItemSelect = (itemId: string) => {
    const selected = items.find((i) => i.itemId === itemId);
    setFormData({
      ...formData,
      itemId,
      unitPrice: selected ? selected.sellingPrice.toString() : formData.unitPrice,
    });
  };

  // Live VAT & Total computation
  const selectedItemObj = items.find((i) => i.itemId === formData.itemId);
  const currentPrice = parseFloat(formData.unitPrice) || 0;
  const currentQty = formData.quantity || 1;
  const subtotal = currentPrice * currentQty;
  const taxPct = selectedItemObj?.taxConfig ? Number(selectedItemObj.taxConfig.taxRatePct) : 15.0;
  const vatAmount = (subtotal * taxPct) / 100;
  const totalValue = subtotal + vatAmount;

  const handleCreateEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreateEnquiry) return;
    setFormError(null);
    if (!formData.customerId || !formData.itemId) {
      setFormError('Please select both a Customer and a Product Model');
      return;
    }

    const trimmedSp = (formData.salespersonName || '').trim();
    if (!trimmedSp || trimmedSp.length < 2) {
      setFormError("Salesperson full name is mandatory. Please enter the salesperson's actual name.");
      return;
    }
    const genericPlaceholders = [
      'sales person',
      'salesperson',
      'sales',
      'sales specialist',
      'rep',
      'representative',
      'demo salesperson',
      'sales rep',
      'n/a',
      'na',
      'none',
      'test',
      'unknown',
      'admin',
      'user',
    ];
    if (genericPlaceholders.includes(trimmedSp.toLowerCase())) {
      setFormError('Generic names like "Sales Person" or "Salesperson" are not allowed. Please enter the actual salesperson\'s full name.');
      return;
    }

    // Story 1: Commission Agent Validation
    if (requirements.leadSource === 'COMMISSION_AGENT') {
      if (!requirements.commissionAgentName.trim()) {
        setFormError('Commission Agent Name is mandatory when lead source is Commission Agent.');
        return;
      }
      const commPct = parseFloat(requirements.commissionPercentage);
      if (isNaN(commPct) || commPct <= 0 || commPct > 100) {
        setFormError('Commission Percentage must be between 0.01% and 100%.');
        return;
      }
    }

    // Story 3: Financing Validation
    if (requirements.financingOption !== 'CASH') {
      if (!requirements.financingInstitutionName.trim()) {
        setFormError('Financing Institution Name is required when Bank or Microfinance financing is selected.');
        return;
      }
      const finPct = parseFloat(requirements.financingPercentage);
      if (isNaN(finPct) || finPct <= 0 || finPct > 100) {
        setFormError('Financing Percentage must be between 0.01% and 100%.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload: any = {
        ...requirements,
        vehicleCategoryId: requirements.vehicleCategoryId ? Number(requirements.vehicleCategoryId) : undefined,
        targetBudget: requirements.targetBudget === '' ? undefined : Number(requirements.targetBudget),
        expectedDeposit: requirements.expectedDeposit === '' ? undefined : Number(requirements.expectedDeposit),
        requiredDeliveryDate: requirements.requiredDeliveryDate || undefined,
        customerId: formData.customerId,
        itemId: formData.itemId,
        quantity: formData.quantity,
        unitPrice: currentPrice,
        salespersonName: trimmedSp,
        paymentMode: formData.paymentMode,
        // Commission Agent (Story 1)
        commissionAgentName: requirements.leadSource === 'COMMISSION_AGENT' ? requirements.commissionAgentName.trim() : undefined,
        commissionAgentPhone: requirements.leadSource === 'COMMISSION_AGENT' ? requirements.commissionAgentPhone.trim() : undefined,
        commissionPercentage: requirements.leadSource === 'COMMISSION_AGENT' && requirements.commissionPercentage ? Number(requirements.commissionPercentage) : undefined,
        commissionNotes: requirements.leadSource === 'COMMISSION_AGENT' ? requirements.commissionNotes : undefined,
        // Financing (Story 3)
        financingOption: requirements.financingOption,
        financingType: requirements.financingOption === 'MICROFINANCE_FINANCING' ? 'MICROFINANCE' : (requirements.financingType || 'BANK'),
        financingInstitutionName: requirements.financingOption !== 'CASH' ? requirements.financingInstitutionName.trim() : undefined,
        financingContactPerson: requirements.financingOption !== 'CASH' ? requirements.financingContactPerson.trim() : undefined,
        financingContactPhone: requirements.financingOption !== 'CASH' ? requirements.financingContactPhone.trim() : undefined,
        financingPercentage: requirements.financingOption !== 'CASH' && requirements.financingPercentage ? Number(requirements.financingPercentage) : undefined,
        financingNotes: requirements.financingOption !== 'CASH' ? requirements.financingNotes : undefined,
        financingRequired: requirements.financingOption !== 'CASH',
      };

      if (editingEnquiry) {
        await api.updateEnquiry(editingEnquiry.enquiryId, {
          ...payload,
          isDraft: false,
        });
      } else {
        await api.createEnquiry(payload);
      }
      setIsCreateOpen(false);
      setEditingEnquiry(null);
      fetchEnquiries();
      fetchInspections();
    } catch (err: any) {
      setFormError(formatApiError(err, editingEnquiry ? 'Failed to resubmit enquiry' : 'Failed to create enquiry'));
    } finally {
      setSubmitting(false);
    }
  };

  // Handlers for Story 2: Customer Vehicle Inspection
  const handleOpenInspectionModal = (enquiry: SalesEnquiry, mode: 'INITIATE' | 'COMPLETE' | 'EXTEND' | 'CANCEL' | 'VIEW' = 'INITIATE', existingInsp?: CustomerVehicleInspection) => {
    const insp = existingInsp || (enquiry.inspections && enquiry.inspections.length > 0 ? enquiry.inspections[0] : null);
    setInspectionModal({
      open: true,
      enquiry,
      inspection: insp,
      mode: insp ? (mode === 'INITIATE' ? 'VIEW' : mode) : 'INITIATE',
    });
    setInspectionForm({
      vinChassisNumber: insp?.vinChassisNumber || '',
      engineNumber: insp?.engineNumber || '',
      inspectorName: insp?.inspectorName || user?.fullName || 'Senior Technical Inspector',
      durationMinutes: insp?.durationMinutes || 120,
      notes: insp?.notes || '',
      outcome: (insp?.inspectionOutcome as any) || 'ACCEPTED',
      outcomeReason: insp?.outcomeReason || '',
      customerSignatureAck: true,
      extensionMinutes: 30,
      extensionReason: '',
      cancellationReason: '',
    });
    setInspectionError(null);
  };

  const handleSubmitInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inspectionModal.enquiry) return;
    setSubmittingInspection(true);
    setInspectionError(null);
    try {
      if (inspectionModal.mode === 'INITIATE') {
        await api.initiateInspection(inspectionModal.enquiry.enquiryId, {
          vinChassisNumber: inspectionForm.vinChassisNumber || undefined,
          engineNumber: inspectionForm.engineNumber || undefined,
          inspectorName: inspectionForm.inspectorName || undefined,
          allowedDurationMinutes: Number(inspectionForm.durationMinutes) || 120,
          durationMinutes: Number(inspectionForm.durationMinutes) || 120,
          remarks: inspectionForm.notes || undefined,
          notes: inspectionForm.notes || undefined,
        });
      } else if (inspectionModal.mode === 'COMPLETE') {
        if (!inspectionModal.inspection) return;
        await api.completeInspection(inspectionModal.inspection.inspectionId, {
          outcome: inspectionForm.outcome,
          outcomeReason: inspectionForm.outcomeReason || undefined,
          customerSignatureAck: inspectionForm.customerSignatureAck,
          remarks: inspectionForm.notes || inspectionForm.outcomeReason || undefined,
          notes: inspectionForm.notes || undefined,
        });
      } else if (inspectionModal.mode === 'EXTEND') {
        if (!inspectionModal.inspection) return;
        if (!inspectionForm.extensionReason.trim()) {
          setInspectionError('Extension reason is mandatory.');
          setSubmittingInspection(false);
          return;
        }
        await api.extendInspection(inspectionModal.inspection.inspectionId, {
          extensionMinutes: Number(inspectionForm.extensionMinutes) || 30,
          additionalMinutes: Number(inspectionForm.extensionMinutes) || 30,
          extensionReason: inspectionForm.extensionReason.trim(),
          reason: inspectionForm.extensionReason.trim(),
        });
      } else if (inspectionModal.mode === 'CANCEL') {
        if (!inspectionModal.inspection) return;
        if (!inspectionForm.cancellationReason.trim()) {
          setInspectionError('Cancellation reason is mandatory.');
          setSubmittingInspection(false);
          return;
        }
        await api.cancelInspection(inspectionModal.inspection.inspectionId, inspectionForm.cancellationReason.trim());
      }
      setInspectionModal({ open: false, enquiry: null, inspection: null, mode: 'VIEW' });
      fetchEnquiries();
      fetchInspections();
    } catch (err: any) {
      setInspectionError(formatApiError(err, 'Failed to update inspection'));
    } finally {
      setSubmittingInspection(false);
    }
  };

  // Handlers for Story 3: Financing Status Updates
  const handleOpenFinancingModal = (enquiry: SalesEnquiry) => {
    setFinancingModal({ open: true, enquiry });
    setFinancingForm({
      financingStatus: enquiry.financingStatus || 'SUBMITTED',
      financingApplicationNumber: enquiry.financingApplicationNumber || '',
      financingApprovedAmount: enquiry.financingApprovedAmount ? enquiry.financingApprovedAmount.toString() : (enquiry.financingAmount ? enquiry.financingAmount.toString() : ''),
      financingDisbursedAmount: enquiry.financingDisbursedAmount ? enquiry.financingDisbursedAmount.toString() : '',
      financingNotes: enquiry.financingNotes || '',
    });
    setFinancingError(null);
  };

  const handleSubmitFinancingStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!financingModal.enquiry) return;
    setSubmittingFinancing(true);
    setFinancingError(null);
    try {
      await api.updateFinancingStatus(financingModal.enquiry.enquiryId, {
        financingStatus: financingForm.financingStatus,
        financingApplicationNumber: financingForm.financingApplicationNumber || undefined,
        financingApprovedAmount: financingForm.financingApprovedAmount ? Number(financingForm.financingApprovedAmount) : undefined,
        approvedAmount: financingForm.financingApprovedAmount ? Number(financingForm.financingApprovedAmount) : undefined,
        financingDisbursedAmount: financingForm.financingDisbursedAmount ? Number(financingForm.financingDisbursedAmount) : undefined,
        disbursedAmount: financingForm.financingDisbursedAmount ? Number(financingForm.financingDisbursedAmount) : undefined,
        financingNotes: financingForm.financingNotes || undefined,
        notes: financingForm.financingNotes || undefined,
      });
      setFinancingModal({ open: false, enquiry: null });
      fetchEnquiries();
      fetchReports();
    } catch (err: any) {
      setFinancingError(formatApiError(err, 'Failed to update financing status'));
    } finally {
      setSubmittingFinancing(false);
    }
  };


  const handleOpenTwoStageApproval = (enquiry: SalesEnquiry, stage: 'SALES_REP' | 'SALES_MANAGER', decision: 'APPROVE' | 'REJECT' = 'APPROVE') => {
    setApprovalModal({
      enquiry,
      stage,
      decision,
      notes: '',
    });
    setApprovalError(null);
  };

  const handleConfirmTwoStageApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvalModal.enquiry || !approvalModal.stage) return;
    if (approvalModal.decision === 'REJECT' && (!approvalModal.notes || approvalModal.notes.trim().length < 5)) {
      setApprovalError('Rejection requires at least 5 characters of justification comments.');
      return;
    }

    setApprovalSubmitting(true);
    setApprovalError(null);
    try {
      if (approvalModal.stage === 'SALES_REP') {
        await api.salesRepApproveEnquiry(approvalModal.enquiry.enquiryId, {
          decision: approvalModal.decision,
          notes: approvalModal.notes.trim() || undefined,
        });
      } else {
        await api.salesManagerApproveEnquiry(approvalModal.enquiry.enquiryId, {
          decision: approvalModal.decision,
          notes: approvalModal.notes.trim() || undefined,
        });
      }
      setApprovalModal({ enquiry: null, stage: null, decision: 'APPROVE', notes: '' });
      fetchEnquiries();
    } catch (err: any) {
      setApprovalError(formatApiError(err, 'Failed to record approval decision'));
    } finally {
      setApprovalSubmitting(false);
    }
  };

  const handleSubmitDraftEnquiry = async (enquiryId: string) => {
    try {
      await api.submitEnquiryForApproval(enquiryId);
      fetchEnquiries();
    } catch (err: any) {
      alert(formatApiError(err, 'Failed to submit enquiry'));
    }
  };

  const handleApprove = async (enquiryId: string) => {
    if (!canApproveEnquiry) return;
    try {
      await api.updateEnquiryStatus(enquiryId, 'APPROVED');
      fetchEnquiries();
    } catch (err: any) {
      console.error('Failed to approve enquiry:', err);
    }
  };

  const handleConfirmConvert = async () => {
    if (!canCreateBooking) return;
    if (!convertTarget) return;

    const trimmedSp = (convertTarget.salespersonName || '').trim();
    const genericPlaceholders = [
      'sales person',
      'salesperson',
      'sales',
      'sales specialist',
      'rep',
      'representative',
      'demo salesperson',
      'sales rep',
      'n/a',
      'na',
      'none',
      'test',
      'unknown',
      'admin',
      'user',
    ];
    if (!trimmedSp || trimmedSp.length < 2 || genericPlaceholders.includes(trimmedSp.toLowerCase())) {
      setConvertError("Salesperson full name is mandatory on the enquiry before converting to booking. Please ensure an actual salesperson name is assigned.");
      return;
    }

    setConverting(true);
    setConvertError(null);
    try {
      const bkg = await api.convertEnquiryToBooking(convertTarget.enquiryId);
      setConversionSuccess({
        bookingNumber: bkg.bookingNumber,
        enquiryNumber: convertTarget.enquiryNumber,
      });
      setConvertTarget(null);
      fetchEnquiries();
    } catch (err: any) {
      setConvertError(formatApiError(err, 'Failed to convert enquiry to booking'));
    } finally {
      setConverting(false);
    }
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canRejectEnquiry) return;
    if (!rejectTarget) return;
    if (!rejectReason.trim() || rejectReason.trim().length < 5) {
      setRejectError('Please enter a detailed rejection reason (minimum 5 characters)');
      return;
    }
    setRejecting(true);
    setRejectError(null);
    try {
      await api.updateEnquiryStatus(rejectTarget.enquiryId, 'REJECTED', rejectReason.trim());
      setRejectTarget(null);
      setRejectReason('');
      fetchEnquiries();
    } catch (err: any) {
      setRejectError(formatApiError(err, 'Failed to reject enquiry'));
    } finally {
      setRejecting(false);
    }
  };

  // Metrics
  const total = enquiries.length;
  const pending = enquiries.filter((e) => e.status === 'SUBMITTED').length;
  const approved = enquiries.filter((e) => e.status === 'APPROVED').length;
  const converted = enquiries.filter((e) => e.status === 'CONVERTED').length;

  return (
    <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Dashboard View (Hidden during quote printing) */}
      <div className="enquiries-dashboard">
        {/* Breadcrumb & Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <span style={{ color: 'var(--accent-cyan)' }}>★</span>
        <span>Financial Engine</span>
        <span>/</span>
        <span style={{ color: 'var(--text-secondary)' }}>Commercial Sales</span>
        <span>/</span>
        <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>Sales Enquiry Pipeline</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 0.35rem 0', letterSpacing: '-0.02em' }}>
            Sales Enquiry & Quotation Pipeline
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
            Customer vehicle interests, automated 15% VAT calculation, manager approval, and 1-click booking conversion
          </p>
        </div>

        {canCreateEnquiry && (
          <button className="btn btn-cyan" onClick={handleOpenCreate} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={16} /> New Sales Enquiry
          </button>
        )}
      </div>

      {/* RBAC Role Indicator Banner */}
      <div
        style={{
          marginBottom: '1.5rem',
          padding: '0.65rem 1rem',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          background:
            user?.role?.roleName === 'SALESPERSON'
              ? 'rgba(59, 130, 246, 0.08)'
              : user?.role?.roleName === 'SALES_MANAGER'
              ? 'rgba(245, 158, 11, 0.08)'
              : 'rgba(168, 85, 247, 0.08)',
          border: `1px solid ${
            user?.role?.roleName === 'SALESPERSON'
              ? 'rgba(59, 130, 246, 0.25)'
              : user?.role?.roleName === 'SALES_MANAGER'
              ? 'rgba(245, 158, 11, 0.25)'
              : 'rgba(168, 85, 247, 0.25)'
          }`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              padding: '0.2rem 0.55rem',
              borderRadius: '4px',
              textTransform: 'uppercase',
              background:
                user?.role?.roleName === 'SALESPERSON'
                  ? 'var(--accent-blue, #3b82f6)'
                  : user?.role?.roleName === 'SALES_MANAGER'
                  ? 'var(--accent-amber, #f59e0b)'
                  : 'var(--accent-purple, #a855f7)',
              color: '#fff',
            }}
          >
            {user?.role?.displayName || user?.role?.roleName || 'User'}
          </span>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            {user?.role?.roleName === 'SALESPERSON'
              ? 'Sales Representative: Authorized for quotation submissions. Manager approval is required before Pre-Advance Slips can be issued.'
              : user?.role?.roleName === 'SALES_MANAGER'
              ? 'Sales Director / Manager: Full authority to approve or reject enquiries and authorize Pre-Advance Slips.'
              : 'System Administrator: Full master access across operations and approval workflows.'}
          </span>
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Active User: <strong style={{ color: 'var(--text-primary)' }}>{user?.fullName || user?.username}</strong>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.65rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.85rem', flexWrap: 'wrap' }}>
        <button
          className={`filter-pill ${activeTab === 'pipeline' ? 'active' : ''}`}
          onClick={() => setActiveTab('pipeline')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.55rem 1.15rem', fontSize: '0.85rem' }}
        >
          <FileText size={15} /> Sales Enquiry Pipeline
          <span className="badge badge-subtle" style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem' }}>{enquiries.length}</span>
        </button>
        <button
          className={`filter-pill ${activeTab === 'inspections' ? 'active' : ''}`}
          onClick={() => setActiveTab('inspections')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.55rem 1.15rem', fontSize: '0.85rem' }}
        >
          <Car size={15} /> Vehicle Inspections & Expirations
          <span className="badge badge-cyan" style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem' }}>
            {inspections.filter(i => i.inspectionStatus === 'IN_PROGRESS' || i.inspectionStatus === 'PENDING').length} Active
          </span>
        </button>
        <button
          className={`filter-pill ${activeTab === 'slips' ? 'active' : ''}`}
          onClick={() => setActiveTab('slips')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.55rem 1.15rem', fontSize: '0.85rem' }}
        >
          <FileCheck size={15} /> Pre-Advance Slips (3-Day Validity)
          <span className="badge badge-subtle" style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem' }}>{slips.length}</span>
        </button>
        <button
          className={`filter-pill ${activeTab === 'intelligence' ? 'active' : ''}`}
          onClick={() => setActiveTab('intelligence')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.55rem 1.15rem', fontSize: '0.85rem' }}
        >
          <TrendingUp size={15} /> Commissions & Financing Intelligence
        </button>
      </div>

      {/* METRICS CARDS BY TAB */}
      {activeTab === 'pipeline' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
          marginBottom: '1.75rem',
        }}>
          <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TOTAL ENQUIRIES</span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={17} color="var(--accent-indigo)" />
              </div>
            </div>
            <div style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1 }}>
              {total}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.65rem' }}>Active commercial pipeline</div>
          </div>

          <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>PENDING APPROVAL</span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Clock size={17} color="var(--accent-amber)" />
              </div>
            </div>
            <div style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--accent-amber)', letterSpacing: '-0.02em', lineHeight: 1 }}>
              {pending}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.65rem' }}>Awaiting manager sign-off</div>
          </div>

          <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>APPROVED ENQUIRIES</span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(0, 210, 211, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={17} color="var(--accent-cyan)" />
              </div>
            </div>
            <div style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--accent-cyan)', letterSpacing: '-0.02em', lineHeight: 1 }}>
              {approved}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.65rem' }}>Ready to convert to booking</div>
          </div>

          <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CONVERTED ORDERS</span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Layers size={17} color="var(--accent-emerald)" />
              </div>
            </div>
            <div style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--accent-emerald)', letterSpacing: '-0.02em', lineHeight: 1 }}>
              {converted}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.65rem' }}>Active vehicle reservations</div>
          </div>
        </div>
      )}

      {activeTab === 'inspections' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
          marginBottom: '1.75rem',
        }}>
          <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TOTAL INSPECTIONS</span>
              <Car size={18} color="var(--accent-cyan)" />
            </div>
            <div style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{inspections.length}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.65rem' }}>Scheduled & completed pre-sales tests</div>
          </div>
          <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>IN PROGRESS (COUNTDOWN)</span>
              <Timer size={18} color="var(--accent-amber)" />
            </div>
            <div style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--accent-amber)', lineHeight: 1 }}>
              {inspections.filter(i => i.inspectionStatus === 'IN_PROGRESS' || i.inspectionStatus === 'PENDING').length}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.65rem' }}>2-hour strict expiration limit</div>
          </div>
          <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ACCEPTED INSPECTIONS</span>
              <CheckCircle2 size={18} color="var(--accent-emerald)" />
            </div>
            <div style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--accent-emerald)', lineHeight: 1 }}>
              {inspections.filter(i => i.inspectionOutcome === 'ACCEPTED').length}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.65rem' }}>Verified & cleared for booking</div>
          </div>
          <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>EXPIRED / CANCELLED</span>
              <XCircle size={18} color="var(--accent-rose)" />
            </div>
            <div style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--accent-rose)', lineHeight: 1 }}>
              {inspections.filter(i => i.inspectionStatus === 'EXPIRED' || i.inspectionStatus === 'CANCELLED' || i.inspectionOutcome === 'REJECTED').length}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.65rem' }}>Auto-cancelled sales enquiries</div>
          </div>
        </div>
      )}

      {activeTab === 'slips' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
          marginBottom: '1.75rem',
        }}>
          <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TOTAL SLIPS ISSUED</span>
              <FileCheck size={18} color="var(--accent-cyan)" />
            </div>
            <div style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{slips.length}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.65rem' }}>Official pre-advance mandates</div>
          </div>
          <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ACTIVE (3-DAY VALIDITY)</span>
              <Clock size={18} color="var(--accent-amber)" />
            </div>
            <div style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--accent-amber)', lineHeight: 1 }}>
              {slips.filter(s => s.status === 'ACTIVE').length}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.65rem' }}>Awaiting 100% advance deposit</div>
          </div>
          <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CONVERTED SLIPS</span>
              <CheckCircle2 size={18} color="var(--accent-emerald)" />
            </div>
            <div style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--accent-emerald)', lineHeight: 1 }}>
              {slips.filter(s => s.status === 'CONVERTED').length}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.65rem' }}>Successfully booked vehicles</div>
          </div>
        </div>
      )}

      {activeTab === 'intelligence' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem',
          marginBottom: '1.75rem',
        }}>
          <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AGENT COMMISSIONS</span>
              <Percent size={18} color="var(--accent-purple, #a855f7)" />
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--accent-purple, #a855f7)', lineHeight: 1 }}>
              ETB {Number(commissionReport?.totalCommissionAmount || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.65rem' }}>
              Across {commissionReport?.totalEnquiries || 0} agent deals
            </div>
          </div>
          <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TOTAL FINANCED VOLUME</span>
              <Building2 size={18} color="var(--accent-cyan)" />
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--accent-cyan)', lineHeight: 1 }}>
              ETB {Number(financingReport?.summary?.totalRequestedFinancing || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.65rem' }}>
              Bank & MFI loan requests
            </div>
          </div>
          <div className="card" style={{ padding: '1.35rem', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CUSTOMER EQUITY CONTRIBUTION</span>
              <DollarSign size={18} color="var(--accent-emerald)" />
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--accent-emerald)', lineHeight: 1 }}>
              ETB {Number(financingReport?.summary?.totalCustomerContribution || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.65rem' }}>Customer mandatory equity share</div>
          </div>
        </div>
      )}

      {/* TAB 1: SALES ENQUIRIES PIPELINE */}
      {activeTab === 'pipeline' && (
        <>
          {/* Filter and Search Bar */}
          <div className="card" style={{ padding: '0.85rem 1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
              {['ALL', 'SUBMITTED', 'APPROVED', 'CONVERTED', 'REJECTED'].map((st) => (
                <button
                  key={st}
                  className={`filter-pill ${selectedStatus === st ? 'active' : ''}`}
                  onClick={() => setSelectedStatus(st)}
                >
                  {st.replace(/_/g, ' ')}
                </button>
              ))}
            </div>

            <div style={{ position: 'relative', width: '340px', minWidth: '260px' }}>
              <Search
                size={15}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                className="input"
                style={{ paddingLeft: '36px', height: '38px', fontSize: '0.825rem' }}
                placeholder="Search enquiry number, customer, model..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Enquiries Table */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em', whiteSpace: 'nowrap', minWidth: '135px' }}>ENQUIRY #</th>
                    <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em', minWidth: '170px' }}>CUSTOMER</th>
                    <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em', minWidth: '170px' }}>VEHICLE MODEL</th>
                    <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em', textAlign: 'center', minWidth: '60px' }}>QTY</th>
                    <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em', textAlign: 'right', whiteSpace: 'nowrap', minWidth: '160px' }}>ESTIMATED VALUE (15% VAT)</th>
                    <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em', minWidth: '140px' }}>SALESPERSON & FINANCING</th>
                    <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em', textAlign: 'center', minWidth: '110px' }}>STATUS</th>
                    <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em', textAlign: 'center', whiteSpace: 'nowrap', minWidth: '220px' }}>ACTIONS & INSPECTION</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        Loading sales enquiries...
                      </td>
                    </tr>
                  ) : enquiries.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        No sales enquiries found. Click "+ New Sales Enquiry" to begin.
                      </td>
                    </tr>
                  ) : (
                    enquiries.map((enq) => (
                      <tr key={enq.enquiryId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.95rem 1.15rem', whiteSpace: 'nowrap', minWidth: '135px' }}>
                          <span className="mono-code" style={{ color: 'var(--accent-cyan)', fontWeight: 700, whiteSpace: 'nowrap', display: 'inline-block' }}>
                            {enq.enquiryNumber}
                          </span>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem', whiteSpace: 'nowrap' }}>
                            {new Date(enq.createdAt).toLocaleDateString()}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: 'var(--accent-cyan)', marginTop: '0.15rem', whiteSpace: 'nowrap', fontWeight: 600 }}>
                            {enq.leadSource || 'WALK_IN'} {enq.branchShowroom ? `· ${enq.branchShowroom}` : ''}
                          </div>
                          <div style={{ marginTop: '0.2rem' }}>
                            {(() => {
                              const daysRemaining = 30 - Math.floor((Date.now() - new Date(enq.createdAt).getTime()) / (1000 * 60 * 60 * 24));
                              return (
                                <span
                                  className={`badge ${daysRemaining > 7 ? 'badge-subtle' : daysRemaining > 0 ? 'badge-amber' : 'badge-rose'}`}
                                  style={{ fontSize: '0.62rem', padding: '0.1rem 0.4rem', whiteSpace: 'nowrap', display: 'inline-block' }}
                                  title={`Quotation validity window: 30 days (${daysRemaining} days remaining)`}
                                >
                                  ⏳ {daysRemaining > 0 ? `${daysRemaining}d valid` : 'Expired'}
                                </span>
                              );
                            })()}
                          </div>
                        </td>
                        <td style={{ padding: '0.95rem 1.15rem' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{enq.customer?.fullName}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                            {enq.customer?.mobileNumber}
                          </div>
                        </td>
                        <td style={{ padding: '0.95rem 1.15rem' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{getVehicleLabel(enq.item)}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem', display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            <span>Code: {enq.item?.itemCode}</span>
                            {enq.preferredColor && (
                              <span className="badge badge-subtle" style={{ fontSize: '0.62rem', padding: '0.1rem 0.35rem' }}>
                                {enq.preferredColor}
                              </span>
                            )}
                            {enq.chargerTypeIncluded && (
                              <span className="badge badge-subtle" style={{ fontSize: '0.62rem', padding: '0.1rem 0.35rem', color: 'var(--accent-emerald)' }}>
                                ⚡ Charger
                              </span>
                            )}
                          </div>
                          {/* Story 1: Commission Agent Badge */}
                          {enq.leadSource === 'COMMISSION_AGENT' && enq.commissionAgentName && (
                            <div style={{ marginTop: '0.35rem' }}>
                              <span className="badge" style={{ fontSize: '0.65rem', padding: '0.15rem 0.45rem', background: 'rgba(168, 85, 247, 0.15)', color: 'var(--accent-purple, #a855f7)', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
                                🤝 Agent: {enq.commissionAgentName} ({enq.commissionPercentage}% · ETB {Number(enq.commissionAmount).toLocaleString()})
                              </span>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '0.95rem 1.15rem', textAlign: 'center' }}>
                          <span className="mono-code">{enq.quantity}</span>
                        </td>
                        <td style={{ padding: '0.95rem 1.15rem', textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, color: 'var(--accent-emerald)' }}>
                            ETB {Number(enq.estimatedSalesValue).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            VAT (15%): ETB {Number(enq.vatAmount).toLocaleString()}
                          </div>
                          {enq.targetBudget ? (
                            <div style={{ fontSize: '0.68rem', color: 'var(--accent-cyan)', marginTop: '0.2rem' }}>
                              Target: {enq.currency || 'ETB'} {Number(enq.targetBudget).toLocaleString()}
                            </div>
                          ) : null}
                          {enq.customerRequirementsNotes ? (
                            <div
                              style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '0.2rem', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                              title={enq.customerRequirementsNotes}
                            >
                              📝 {enq.customerRequirementsNotes}
                            </div>
                          ) : null}
                        </td>
                        <td style={{ padding: '0.95rem 1.15rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}>
                            <User size={13} color="var(--text-muted)" />
                            <span>{enq.salespersonName}</span>
                          </div>
                          {enq.paymentMode && (
                            <div style={{ fontSize: '0.68rem', color: 'var(--accent-cyan)', marginTop: '0.2rem', fontWeight: 600 }}>
                              {enq.paymentMode.replace(/_/g, ' ')}
                            </div>
                          )}
                          {/* Story 3: Financing Badge */}
                          {enq.financingOption && enq.financingOption !== 'CASH' && (
                            <div style={{ marginTop: '0.35rem' }}>
                              <span className="badge" style={{ fontSize: '0.65rem', padding: '0.15rem 0.45rem', background: 'rgba(6, 182, 212, 0.15)', color: 'var(--accent-cyan)', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
                                🏦 {enq.financingInstitutionName || enq.financingOption} ({enq.financingPercentage || 70}% · ETB {Number(enq.financingAmount).toLocaleString()})
                              </span>
                              {enq.financingStatus && (
                                <div style={{ fontSize: '0.65rem', color: 'var(--accent-indigo)', fontWeight: 700, marginTop: '0.15rem' }}>
                                  Status: {enq.financingStatus}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '0.95rem 1.15rem', textAlign: 'center' }}>
                          <span
                            className={`badge ${
                              enq.status === 'CONVERTED'
                                ? 'badge-emerald'
                                : enq.status === 'APPROVED'
                                ? 'badge-cyan'
                                : enq.status === 'SUBMITTED'
                                ? 'badge-amber'
                                : 'badge-rose'
                            }`}
                          >
                            {enq.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.95rem 1.15rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                            {/* Story 2: Inspection Quick Action / Status Button */}
                            {(() => {
                              const activeInsp = getActiveInspectionForEnquiry(enq);
                              if (!activeInsp) {
                                return (
                                  <button
                                    className="btn btn-secondary btn-sm"
                                    style={{ padding: '0.35rem 0.6rem', color: 'var(--accent-cyan)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                                    title="Schedule Customer Vehicle Inspection"
                                    onClick={() => handleOpenInspectionModal(enq, 'INITIATE')}
                                  >
                                    <Car size={13} /> Inspect
                                  </button>
                                );
                              }
                              const isRunning = activeInsp.inspectionStatus === 'IN_PROGRESS' || activeInsp.inspectionStatus === 'PENDING';
                              const isAccepted = activeInsp.inspectionOutcome === 'ACCEPTED';
                              const isExpired = activeInsp.inspectionStatus === 'EXPIRED';
                              const isRejected = activeInsp.inspectionOutcome === 'REJECTED';
                              return (
                                <button
                                  className={`btn btn-sm ${isRunning ? 'btn-amber' : isAccepted ? 'btn-emerald' : 'btn-secondary'}`}
                                  style={{ padding: '0.35rem 0.6rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                                  title="View or Manage Vehicle Inspection"
                                  onClick={() => handleOpenInspectionModal(enq, 'VIEW', activeInsp)}
                                >
                                  <Timer size={13} />
                                  {isRunning ? formatCountdown(activeInsp.deadlineAt) : isAccepted ? '✓ Accepted' : isExpired ? '✕ Expired' : isRejected ? '✕ Rejected' : activeInsp.inspectionStatus}
                                </button>
                              );
                            })()}

                            {/* Story 3: Financing Lifecycle Action */}
                            {enq.financingOption && enq.financingOption !== 'CASH' && (
                              <button
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '0.35rem 0.6rem', color: 'var(--accent-indigo)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                                title="Update Bank / MFI Financing Lifecycle Status"
                                onClick={() => handleOpenFinancingModal(enq)}
                              >
                                <Building2 size={13} /> Financing
                              </button>
                            )}

                            {enq.status === 'SUBMITTED' && (canApproveEnquiry || canRejectEnquiry) && (
                              <>
                                {canApproveEnquiry && (
                                  <button
                                    className="btn btn-secondary btn-sm"
                                    style={{ color: 'var(--accent-emerald)', borderColor: 'rgba(16, 185, 129, 0.4)' }}
                                    onClick={() => handleApprove(enq.enquiryId)}
                                  >
                                    <CheckCircle2 size={13} /> Approve
                                  </button>
                                )}
                                {canRejectEnquiry && (
                                  <button
                                    className="btn btn-secondary btn-sm"
                                    style={{ color: 'var(--accent-rose)', borderColor: 'rgba(244, 63, 94, 0.4)' }}
                                    onClick={() => {
                                      setRejectTarget(enq);
                                      setRejectReason('');
                                      setRejectError(null);
                                    }}
                                  >
                                    <XCircle size={13} /> Reject
                                  </button>
                                )}
                              </>
                            )}
                            {enq.status === 'APPROVED' && canCreateBooking && (
                              <button
                                className="btn btn-cyan btn-sm"
                                onClick={() => {
                                  setConvertError(null);
                                  setConvertTarget(enq);
                                }}
                              >
                                Convert to Booking <ArrowRight size={13} />
                              </button>
                            )}
                            {enq.status === 'CONVERTED' && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', fontWeight: 600 }}>
                                ✓ Active Booking
                              </span>
                            )}
                            {enq.status === 'REJECTED' && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.72rem', color: 'var(--accent-rose)', fontStyle: 'italic' }} title={enq.rejectionReason}>
                                  {enq.rejectionReason ? `Reason: ${enq.rejectionReason.slice(0, 24)}...` : 'Rejected'}
                                </span>
                                {canCreateEnquiry && (
                                  <button
                                    className="btn btn-sm"
                                    style={{
                                      fontSize: '0.72rem',
                                      padding: '0.2rem 0.55rem',
                                      background: 'rgba(245, 158, 11, 0.15)',
                                      color: 'var(--accent-amber)',
                                      border: '1px solid rgba(245, 158, 11, 0.4)',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.25rem',
                                    }}
                                    onClick={() => handleStartEdit(enq)}
                                    title="Correct and resubmit this rejected enquiry for dual approval"
                                  >
                                    <RotateCcw size={12} /> Correct & Resubmit
                                  </button>
                                )}
                              </div>
                            )}
                            {(enq.status === 'APPROVED' || enq.status === 'CONVERTED') && (
                              <button
                                className="btn btn-primary btn-sm"
                                style={{
                                  padding: '0.35rem 0.65rem',
                                  background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                                  border: 'none',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem',
                                }}
                                title="View & Print Official Pre-Advance Slip"
                                onClick={() => handleOpenSlip(enq)}
                                disabled={loadingSlip}
                              >
                                <FileText size={13} /> Pre-Advance Slip
                              </button>
                            )}
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '0.35rem 0.6rem' }}
                              title="View & Print Official Quotation / Proforma Invoice"
                              onClick={() => setSelectedQuote(enq)}
                            >
                              <Printer size={13} /> Quote
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

      {/* TAB 2: VEHICLE INSPECTIONS & EXPIRATIONS (Story 2) */}
      {activeTab === 'inspections' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Physical Vehicle Inspections & Auto-Expiration Governance
              </h3>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Enforces mandatory pre-purchase technical inspections. Inspections carry a strict countdown (default 2h) before auto-expiring and cancelling the sales enquiry.
              </p>
            </div>
            <button
              className="btn btn-cyan btn-sm"
              onClick={() => {
                if (enquiries.length > 0) {
                  handleOpenInspectionModal(enquiries[0], 'INITIATE');
                } else {
                  alert('Please create a sales enquiry first.');
                }
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Plus size={14} /> Schedule Vehicle Inspection
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>INSPECTION #</th>
                  <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>ENQUIRY REF</th>
                  <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>CUSTOMER</th>
                  <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>VEHICLE & CHASSIS #</th>
                  <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>INSPECTOR</th>
                  <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textAlign: 'center' }}>DURATION</th>
                  <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textAlign: 'center' }}>DEADLINE / COUNTDOWN</th>
                  <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textAlign: 'center' }}>STATUS</th>
                  <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textAlign: 'center' }}>OUTCOME</th>
                  <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textAlign: 'center' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loadingInspections ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      Loading vehicle inspections...
                    </td>
                  </tr>
                ) : inspections.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      No vehicle inspections recorded. Click "Schedule Vehicle Inspection" or click "Inspect" from any enquiry row.
                    </td>
                  </tr>
                ) : (
                  inspections.map((rawInsp) => {
                    const insp = normalizeInspection(rawInsp);
                    const isRunning = insp.inspectionStatus === 'IN_PROGRESS' || insp.inspectionStatus === 'PENDING';
                    const diff = new Date(insp.deadlineAt).getTime() - now;
                    const isExpired = diff <= 0 || insp.inspectionStatus === 'EXPIRED';

                    return (
                      <tr key={insp.inspectionId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.95rem 1.15rem', whiteSpace: 'nowrap' }}>
                          <span className="mono-code" style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>
                            {insp.inspectionNumber}
                          </span>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                            {new Date(insp.scheduledAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td style={{ padding: '0.95rem 1.15rem', whiteSpace: 'nowrap' }}>
                          <span className="mono-code" style={{ color: 'var(--accent-indigo)' }}>
                            {insp.enquiry?.enquiryNumber || 'N/A'}
                          </span>
                        </td>
                        <td style={{ padding: '0.95rem 1.15rem' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{insp.customer?.fullName || insp.enquiry?.customer?.fullName || 'N/A'}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{insp.customer?.mobileNumber || insp.enquiry?.customer?.mobileNumber}</div>
                        </td>
                        <td style={{ padding: '0.95rem 1.15rem' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{getVehicleLabel(insp.item || insp.enquiry?.item)}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', gap: '0.4rem', marginTop: '0.2rem' }}>
                            <span>VIN: <strong style={{ color: 'var(--text-secondary)' }}>{insp.vinChassisNumber || 'Pending'}</strong></span>
                            {insp.engineNumber && <span>· Eng: {insp.engineNumber}</span>}
                          </div>
                        </td>
                        <td style={{ padding: '0.95rem 1.15rem' }}>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{insp.inspectorName || 'Senior Inspector'}</div>
                        </td>
                        <td style={{ padding: '0.95rem 1.15rem', textAlign: 'center' }}>
                          <span className="mono-code">{insp.durationMinutes} min</span>
                          {insp.extendedMinutes && (
                            <div style={{ fontSize: '0.68rem', color: 'var(--accent-amber)' }}>+{insp.extendedMinutes}m ext</div>
                          )}
                        </td>
                        <td style={{ padding: '0.95rem 1.15rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          {isRunning ? (
                            <span
                              className={`badge ${diff > 30 * 60 * 1000 ? 'badge-cyan' : diff > 0 ? 'badge-amber' : 'badge-rose'}`}
                              style={{ fontWeight: 800, fontSize: '0.75rem', padding: '0.25rem 0.65rem' }}
                            >
                              ⏳ {formatCountdown(insp.deadlineAt)}
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              Ended {new Date(insp.deadlineAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '0.95rem 1.15rem', textAlign: 'center' }}>
                          <span
                            className={`badge ${
                              insp.inspectionStatus === 'COMPLETED'
                                ? 'badge-emerald'
                                : insp.inspectionStatus === 'IN_PROGRESS'
                                ? 'badge-cyan'
                                : insp.inspectionStatus === 'PENDING'
                                ? 'badge-amber'
                                : 'badge-rose'
                            }`}
                          >
                            {insp.inspectionStatus}
                          </span>
                        </td>
                        <td style={{ padding: '0.95rem 1.15rem', textAlign: 'center' }}>
                          {insp.inspectionOutcome ? (
                            <span
                              className={`badge ${
                                insp.inspectionOutcome === 'ACCEPTED'
                                  ? 'badge-emerald'
                                  : insp.inspectionOutcome === 'REJECTED'
                                  ? 'badge-rose'
                                  : 'badge-amber'
                              }`}
                            >
                              {insp.inspectionOutcome}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '0.95rem 1.15rem', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                            {isRunning && (
                              <>
                                <button
                                  className="btn btn-secondary btn-sm"
                                  style={{ color: 'var(--accent-emerald)', borderColor: 'rgba(16, 185, 129, 0.4)', padding: '0.3rem 0.55rem' }}
                                  title="Record Decision & Complete Inspection"
                                  onClick={() => handleOpenInspectionModal(insp.enquiry || (enquiries.find(e => e.enquiryId === insp.enquiryId) as any), 'COMPLETE', insp)}
                                >
                                  Complete
                                </button>
                                <button
                                  className="btn btn-secondary btn-sm"
                                  style={{ color: 'var(--accent-amber)', borderColor: 'rgba(245, 158, 11, 0.4)', padding: '0.3rem 0.55rem' }}
                                  title="Extend Duration (+30m or custom)"
                                  onClick={() => handleOpenInspectionModal(insp.enquiry || (enquiries.find(e => e.enquiryId === insp.enquiryId) as any), 'EXTEND', insp)}
                                >
                                  Extend
                                </button>
                                <button
                                  className="btn btn-secondary btn-sm"
                                  style={{ color: 'var(--accent-rose)', borderColor: 'rgba(244, 63, 94, 0.4)', padding: '0.3rem 0.55rem' }}
                                  title="Cancel Inspection with Justification"
                                  onClick={() => handleOpenInspectionModal(insp.enquiry || (enquiries.find(e => e.enquiryId === insp.enquiryId) as any), 'CANCEL', insp)}
                                >
                                  Cancel
                                </button>
                              </>
                            )}
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '0.3rem 0.55rem' }}
                              title="View Full Inspection Details"
                              onClick={() => handleOpenInspectionModal(insp.enquiry || (enquiries.find(e => e.enquiryId === insp.enquiryId) as any), 'VIEW', insp)}
                            >
                              <Eye size={12} />
                            </button>
                          </div>
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

      {/* TAB 3: PRE-ADVANCE SLIPS (Story E16-E18) */}
      {activeTab === 'slips' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Official Pre-Advance Slips (100% Price Advance & 3-Day Validity)
            </h3>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Auto-generated upon Sales Manager endorsement. Carries official banking deposit instructions and requires 100% full advance payment within 3 calendar days.
            </p>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>SLIP NUMBER</th>
                  <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>ENQUIRY REF</th>
                  <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>CUSTOMER</th>
                  <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>VEHICLE ITEM</th>
                  <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textAlign: 'right' }}>TOTAL AMOUNT</th>
                  <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textAlign: 'right' }}>100% ADVANCE REQUIRED</th>
                  <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textAlign: 'center' }}>3-DAY VALIDITY</th>
                  <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textAlign: 'center' }}>STATUS</th>
                  <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textAlign: 'center' }}>PRINT & ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loadingSlips ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      Loading pre-advance slips...
                    </td>
                  </tr>
                ) : slips.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      No pre-advance slips found. Slips are automatically created when an enquiry is approved by the Sales Manager.
                    </td>
                  </tr>
                ) : (
                  slips.map((slip) => {
                    const daysLeft = Math.ceil((new Date(slip.expiresAt).getTime() - now) / (1000 * 60 * 60 * 24));
                    const isSlipExpired = daysLeft <= 0;

                    return (
                      <tr key={slip.slipId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.95rem 1.15rem', whiteSpace: 'nowrap' }}>
                          <span className="mono-code" style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>
                            {slip.slipNumber}
                          </span>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                            Issued: {new Date(slip.issuedAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td style={{ padding: '0.95rem 1.15rem', whiteSpace: 'nowrap' }}>
                          <span className="mono-code" style={{ color: 'var(--accent-indigo)' }}>
                            {slip.enquiry?.enquiryNumber || 'N/A'}
                          </span>
                        </td>
                        <td style={{ padding: '0.95rem 1.15rem' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{slip.customer?.fullName}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{slip.customer?.mobileNumber}</div>
                        </td>
                        <td style={{ padding: '0.95rem 1.15rem' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{slip.item?.itemName}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Qty: {slip.quantity}</div>
                        </td>
                        <td style={{ padding: '0.95rem 1.15rem', textAlign: 'right' }}>
                          <div style={{ fontWeight: 700 }}>ETB {Number(slip.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        </td>
                        <td style={{ padding: '0.95rem 1.15rem', textAlign: 'right' }}>
                          <div style={{ fontWeight: 800, color: 'var(--accent-emerald)' }}>
                            ETB {Number(slip.requiredAdvanceAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--accent-cyan)', fontWeight: 700 }}>100% Price Lock</div>
                        </td>
                        <td style={{ padding: '0.95rem 1.15rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <span
                            className={`badge ${daysLeft > 1 ? 'badge-cyan' : daysLeft > 0 ? 'badge-amber' : 'badge-rose'}`}
                            style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem' }}
                          >
                            ⏳ {daysLeft > 0 ? `${daysLeft}d left` : 'Expired'}
                          </span>
                        </td>
                        <td style={{ padding: '0.95rem 1.15rem', textAlign: 'center' }}>
                          <span
                            className={`badge ${
                              slip.status === 'ACTIVE'
                                ? 'badge-amber'
                                : slip.status === 'CONVERTED'
                                ? 'badge-emerald'
                                : 'badge-rose'
                            }`}
                          >
                            {slip.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.95rem 1.15rem', textAlign: 'center' }}>
                          <button
                            className="btn btn-primary btn-sm"
                            style={{
                              padding: '0.35rem 0.75rem',
                              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                              border: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                            }}
                            onClick={() => setSelectedSlip(slip)}
                          >
                            <Printer size={13} /> Print Slip
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

      {/* TAB 4: COMMISSIONS & FINANCING INTELLIGENCE (Story 1 & Story 3) */}
      {activeTab === 'intelligence' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {/* Story 1: Commission Agent Tracking & Calculation */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(168, 85, 247, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Percent size={18} color="var(--accent-purple, #a855f7)" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Commission Agent Tracking
                </h3>
                <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Automated sales commissions by agent & deal volume
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem', marginBottom: '1.25rem' }}>
              <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Agents</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                  {commissionReport?.agentBreakdown?.length || 0}
                </div>
              </div>
              <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Agent Deals</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-cyan)', marginTop: '0.2rem' }}>
                  {commissionReport?.totalEnquiries || 0}
                </div>
              </div>
              <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Accrued Commission</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-purple, #a855f7)', marginTop: '0.2rem' }}>
                  ETB {Number(commissionReport?.totalCommissionAmount || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '0.65rem 0.85rem', textAlign: 'left', color: 'var(--text-muted)' }}>AGENT NAME</th>
                    <th style={{ padding: '0.65rem 0.85rem', textAlign: 'left', color: 'var(--text-muted)' }}>PHONE</th>
                    <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center', color: 'var(--text-muted)' }}>DEALS</th>
                    <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right', color: 'var(--text-muted)' }}>SALES VOLUME</th>
                    <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right', color: 'var(--text-muted)' }}>COMMISSION</th>
                  </tr>
                </thead>
                <tbody>
                  {(!commissionReport?.agentBreakdown || commissionReport.agentBreakdown.length === 0) ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        No commission deals recorded yet.
                      </td>
                    </tr>
                  ) : (
                    commissionReport.agentBreakdown.map((ag, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.75rem 0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{ag.agentName}</td>
                        <td style={{ padding: '0.75rem 0.85rem', color: 'var(--text-muted)' }}>{ag.agentPhone}</td>
                        <td style={{ padding: '0.75rem 0.85rem', textAlign: 'center' }}>
                          <span className="mono-code">{ag.enquiryCount}</span>
                        </td>
                        <td style={{ padding: '0.75rem 0.85rem', textAlign: 'right' }}>
                          ETB {Number(ag.totalSalesAmount).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                        <td style={{ padding: '0.75rem 0.85rem', textAlign: 'right', fontWeight: 800, color: 'var(--accent-purple, #a855f7)' }}>
                          ETB {Number(ag.totalCommissionAmount).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Story 3: Financing Institution Performance & Tracking */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(6, 182, 212, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Building2 size={18} color="var(--accent-cyan)" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Financing Institution Performance
                </h3>
                <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Commercial Banks & Microfinance Institutions (MFI) distribution
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem', marginBottom: '1.25rem' }}>
              <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Financed Deals</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                  {financingReport?.summary?.totalFinancedEnquiries || 0}
                </div>
              </div>
              <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Loan Requested</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-cyan)', marginTop: '0.2rem' }}>
                  ETB {Number(financingReport?.summary?.totalRequestedFinancing || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
              </div>
              <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Customer Equity</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: '0.2rem' }}>
                  ETB {Number(financingReport?.summary?.totalCustomerContribution || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-table-header)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ padding: '0.65rem 0.85rem', textAlign: 'left', color: 'var(--text-muted)' }}>INSTITUTION</th>
                    <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center', color: 'var(--text-muted)' }}>TYPE</th>
                    <th style={{ padding: '0.65rem 0.85rem', textAlign: 'center', color: 'var(--text-muted)' }}>DEALS</th>
                    <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right', color: 'var(--text-muted)' }}>FINANCED ETB</th>
                    <th style={{ padding: '0.65rem 0.85rem', textAlign: 'right', color: 'var(--text-muted)' }}>CUSTOMER EQUITY</th>
                  </tr>
                </thead>
                <tbody>
                  {(!financingReport?.institutionBreakdown || financingReport.institutionBreakdown.length === 0) ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        No bank or microfinance deals recorded yet.
                      </td>
                    </tr>
                  ) : (
                    financingReport.institutionBreakdown.map((inst, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '0.75rem 0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{inst.institutionName}</td>
                        <td style={{ padding: '0.75rem 0.85rem', textAlign: 'center' }}>
                          <span className={`badge ${inst.financingType === 'MICROFINANCE' ? 'badge-amber' : 'badge-cyan'}`} style={{ fontSize: '0.65rem' }}>
                            {inst.financingType}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem 0.85rem', textAlign: 'center' }}>
                          <span className="mono-code">{inst.enquiryCount}</span>
                        </td>
                        <td style={{ padding: '0.75rem 0.85rem', textAlign: 'right', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                          ETB {Number(inst.totalRequestedFinancing).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </td>
                        <td style={{ padding: '0.75rem 0.85rem', textAlign: 'right', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                          ETB {Number(inst.totalCustomerContribution).toLocaleString(undefined, { maximumFractionDigits: 0 })}
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
      </div>

      {/* CREATE ENQUIRY MODAL */}
      {isCreateOpen && (
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
                  <FileText size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    {editingEnquiry ? `Correct & Resubmit Enquiry — ${editingEnquiry.enquiryNumber}` : 'Create Sales Enquiry'}
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {editingEnquiry
                      ? 'Update rejected enquiry requirements and resubmit for two-stage approval'
                      : 'Capture customer vehicle interest with real-time VAT calculation'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsCreateOpen(false);
                  setEditingEnquiry(null);
                }}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.65rem', borderRadius: '8px' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateEnquiry}>
              <div className="modal-body">
                <ModalErrorAlert error={formError} onDismiss={() => setFormError(null)} />

                {editingEnquiry && editingEnquiry.rejectionReason && (
                  <div style={{ padding: '0.85rem', background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
                    <div style={{ fontWeight: 700, color: 'var(--accent-rose)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <AlertCircle size={15} /> Previous Rejection Reason to Correct:
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      {editingEnquiry.rejectionReason}
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Customer *</label>
                  <select
                    className="select-field"
                    required
                    value={formData.customerId}
                    onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                  >
                    {customers.map((c) => (
                      <option key={c.customerId} value={c.customerId}>
                        {c.customerCode} — {c.fullName} ({c.customerType})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Vehicle Model *</label>
                    <select
                      className="select-field"
                      required
                      value={formData.itemId}
                      onChange={(e) => handleItemSelect(e.target.value)}
                    >
                      {items.map((i) => (
                        <option key={i.itemId} value={i.itemId}>
                          {getVehicleLabel(i)} — {i.itemCode}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Quantity *</label>
                    <input
                      type="number"
                      min="1"
                      className="input-field"
                      required
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Unit Price (ETB)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input-field"
                      value={formData.unitPrice}
                      onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Salesperson Full Name *</label>
                    <input
                      type="text"
                      className="input-field"
                      required
                      placeholder="e.g. Yared Tadesse"
                      value={formData.salespersonName}
                      onChange={(e) => setFormData({ ...formData, salespersonName: e.target.value })}
                    />
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem', display: 'block' }}>
                      Enter actual salesperson name (generic terms like "salesperson" are blocked).
                    </span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Intended Payment Mode *</label>
                  <select
                    className="select-field"
                    required
                    value={formData.paymentMode}
                    onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                  >
                    <option value="BANK_DEPOSIT">Bank Deposit Voucher (BRV)</option>
                    <option value="BANK_TRANSFER">Direct Electronic Bank Transfer</option>
                    <option value="LETTER_OF_CREDIT">Letter of Credit (LC)</option>
                    <option value="CHEQUE">CPO / Bank Certified Cheque</option>
                    <option value="CASH">Cash Payment</option>
                  </select>
                </div>

                {/* Live Value Calculation Preview Box */}
                <fieldset style={{ border: '1px solid var(--border-color)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                  <legend style={{ padding: '0 0.5rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                    Vehicle Requirements, Budget & Client Preferences
                  </legend>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Lead Source</label>
                      <select
                        className="select-field"
                        value={requirements.leadSource}
                        onChange={(e) => setRequirements({ ...requirements, leadSource: e.target.value })}
                      >
                        {['WALK_IN', 'COMMISSION_AGENT', 'REFERRAL', 'WEBSITE', 'SOCIAL_MEDIA', 'PHONE', 'CAMPAIGN', 'OTHER'].map((v) => (
                          <option key={v} value={v}>
                            {v.replace(/_/g, ' ')}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Branch / Showroom</label>
                      <input
                        className="input-field"
                        type="text"
                        placeholder="e.g. Bole Flagship Showroom"
                        value={requirements.branchShowroom}
                        onChange={(e) => setRequirements({ ...requirements, branchShowroom: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Story 1: Commission Agent Tracking & Automatic Calculation */}
                  {requirements.leadSource === 'COMMISSION_AGENT' && (
                    <div style={{
                      background: 'rgba(168, 85, 247, 0.08)',
                      border: '1px solid rgba(168, 85, 247, 0.3)',
                      borderRadius: 'var(--radius-md)',
                      padding: '1rem',
                      marginTop: '0.75rem',
                      marginBottom: '0.75rem',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <Percent size={16} color="var(--accent-purple, #a855f7)" />
                        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent-purple, #a855f7)' }}>
                          Commission Agent Details & Auto-Calculation
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                        <div className="form-group">
                          <label className="form-label">Commission Agent Name *</label>
                          <input
                            type="text"
                            className="input-field"
                            required
                            placeholder="e.g. Alazar Mengistu"
                            value={requirements.commissionAgentName}
                            onChange={(e) => setRequirements({ ...requirements, commissionAgentName: e.target.value })}
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Agent Contact Phone *</label>
                          <input
                            type="text"
                            className="input-field"
                            required
                            placeholder="e.g. +251 911 234567"
                            value={requirements.commissionAgentPhone}
                            onChange={(e) => setRequirements({ ...requirements, commissionAgentPhone: e.target.value })}
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Commission Rate % (0.01% - 100%) *</label>
                          <input
                            type="number"
                            min="0.01"
                            max="100"
                            step="0.01"
                            className="input-field"
                            required
                            placeholder="e.g. 2.5"
                            value={requirements.commissionPercentage}
                            onChange={(e) => setRequirements({ ...requirements, commissionPercentage: e.target.value })}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '0.5rem 0.75rem', borderRadius: '4px', marginTop: '0.5rem' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Auto-Calculated Commission:</span>
                        <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--accent-purple, #a855f7)' }}>
                          ETB {((totalValue * (parseFloat(requirements.commissionPercentage) || 0)) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="form-group" style={{ marginTop: '0.5rem' }}>
                        <label className="form-label">Commission Agreement Notes</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="Payment schedule, contract reference..."
                          value={requirements.commissionNotes}
                          onChange={(e) => setRequirements({ ...requirements, commissionNotes: e.target.value })}
                        />
                      </div>
                    </div>
                  )}

                  {/* Story 3: Financing Institution Tracking & Calculation */}
                  <div style={{
                    background: 'rgba(6, 182, 212, 0.08)',
                    border: '1px solid rgba(6, 182, 212, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem',
                    marginTop: '0.75rem',
                    marginBottom: '0.75rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <Building2 size={16} color="var(--accent-cyan)" />
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent-cyan)' }}>
                        Commercial Financing Option (Bank & Microfinance)
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div className="form-group">
                        <label className="form-label">Financing Structure</label>
                        <select
                          className="select-field"
                          value={requirements.financingOption}
                          onChange={(e) => setRequirements({
                            ...requirements,
                            financingOption: e.target.value as any,
                            financingRequired: e.target.value !== 'CASH',
                            financingType: e.target.value === 'MICROFINANCE_FINANCING' ? 'MICROFINANCE' : 'BANK',
                          })}
                        >
                          <option value="CASH">100% Cash / Customer Direct Equity</option>
                          <option value="BANK_FINANCING">Bank Financing (Commercial Bank)</option>
                          <option value="MICROFINANCE_FINANCING">Microfinance Institution (MFI) Financing</option>
                        </select>
                      </div>
                      {requirements.financingOption !== 'CASH' && (
                        <div className="form-group">
                          <label className="form-label">Financing % (Default 70%) *</label>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            step="0.1"
                            className="input-field"
                            required
                            value={requirements.financingPercentage}
                            onChange={(e) => setRequirements({ ...requirements, financingPercentage: e.target.value })}
                          />
                        </div>
                      )}
                    </div>

                    {requirements.financingOption !== 'CASH' && (
                      <>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
                          <div className="form-group">
                            <label className="form-label">{requirements.financingOption === 'MICROFINANCE_FINANCING' ? 'MFI Institution Name *' : 'Bank Institution Name *'}</label>
                            <input
                              type="text"
                              className="input-field"
                              required
                              placeholder={requirements.financingOption === 'MICROFINANCE_FINANCING' ? 'e.g. Sinquee MFI, Rays MFI, Oromia MFI' : 'e.g. Commercial Bank of Ethiopia, Dashen Bank, Awash Bank'}
                              value={requirements.financingInstitutionName}
                              onChange={(e) => setRequirements({ ...requirements, financingInstitutionName: e.target.value })}
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Loan Officer / Contact Person</label>
                            <input
                              type="text"
                              className="input-field"
                              placeholder="e.g. Aster Bekele (Credit Officer)"
                              value={requirements.financingContactPerson}
                              onChange={(e) => setRequirements({ ...requirements, financingContactPerson: e.target.value })}
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Officer Phone Number</label>
                            <input
                              type="text"
                              className="input-field"
                              placeholder="e.g. +251 922 345678"
                              value={requirements.financingContactPhone}
                              onChange={(e) => setRequirements({ ...requirements, financingContactPhone: e.target.value })}
                            />
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', background: 'rgba(0,0,0,0.2)', padding: '0.65rem 0.85rem', borderRadius: '4px', marginTop: '0.5rem' }}>
                          <div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Auto-Calculated Financed Amount ({requirements.financingPercentage}%):</div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                              ETB {((totalValue * (parseFloat(requirements.financingPercentage) || 0)) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Customer Contribution Required ({Math.max(0, 100 - (parseFloat(requirements.financingPercentage) || 0))}%):</div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--accent-amber)' }}>
                              ETB {Math.max(0, totalValue - ((totalValue * (parseFloat(requirements.financingPercentage) || 0)) / 100)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Vehicle Category</label>
                      <select
                        className="select-field"
                        value={requirements.vehicleCategoryId}
                        onChange={(e) => setRequirements({ ...requirements, vehicleCategoryId: e.target.value })}
                      >
                        <option value="">Select Category...</option>
                        {categories.map((c) => (
                          <option key={c.categoryId} value={c.categoryId}>
                            {c.categoryName}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Preferred Colour</label>
                      <input
                        className="input-field"
                        type="text"
                        placeholder="e.g. Pearl White, Midnight Black"
                        value={requirements.preferredColor}
                        onChange={(e) => setRequirements({ ...requirements, preferredColor: e.target.value })}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Required Delivery Date</label>
                      <input
                        className="input-field"
                        type="date"
                        value={requirements.requiredDeliveryDate}
                        onChange={(e) => setRequirements({ ...requirements, requiredDeliveryDate: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Budget Currency</label>
                      <select
                        className="select-field"
                        value={requirements.currency}
                        onChange={(e) => setRequirements({ ...requirements, currency: e.target.value })}
                      >
                        <option value="ETB">ETB — Ethiopian Birr</option>
                        <option value="USD">USD — US Dollar</option>
                        <option value="EUR">EUR — Euro</option>
                        <option value="GBP">GBP — British Pound</option>
                        <option value="CNY">CNY — Chinese Yuan</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                      <label className="form-label">Target Budget</label>
                      <input
                        className="input-field"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Customer budget expectation"
                        value={requirements.targetBudget}
                        onChange={(e) => setRequirements({ ...requirements, targetBudget: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Expected Deposit (Target, not receipt)</label>
                      <input
                        className="input-field"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Expected initial deposit amount"
                        value={requirements.expectedDeposit}
                        onChange={(e) => setRequirements({ ...requirements, expectedDeposit: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Expected Payment Timeline</label>
                    <input
                      className="input-field"
                      type="text"
                      placeholder="e.g. 50% upon allocation, balance before delivery"
                      value={requirements.expectedPaymentTimeline}
                      onChange={(e) => setRequirements({ ...requirements, expectedPaymentTimeline: e.target.value })}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', margin: '0.5rem 0' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                      <input
                        type="checkbox"
                        checked={requirements.registrationHomologationNeeded}
                        onChange={(e) => setRequirements({ ...requirements, registrationHomologationNeeded: e.target.checked })}
                      />
                      Registration / Homologation Needed
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                      <input
                        type="checkbox"
                        checked={requirements.chargerTypeIncluded}
                        onChange={(e) => setRequirements({ ...requirements, chargerTypeIncluded: e.target.checked })}
                      />
                      Home / Fast Charger Included
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                      <input
                        type="checkbox"
                        checked={requirements.tradeInVehicle}
                        onChange={(e) => setRequirements({ ...requirements, tradeInVehicle: e.target.checked })}
                      />
                      Customer Has Trade-In Vehicle
                    </label>
                  </div>

                  <div className="form-group" style={{ marginTop: '0.75rem' }}>
                    <label className="form-label">Customer Requirements & Special Notes</label>
                    <textarea
                      className="input-field"
                      rows={3}
                      placeholder="Special customer requests, accessories, specific battery preferences, or delivery instructions..."
                      value={requirements.customerRequirementsNotes}
                      onChange={(e) => setRequirements({ ...requirements, customerRequirementsNotes: e.target.value })}
                    />
                  </div>
                </fieldset>
                <div style={{
                  padding: '1.25rem',
                  background: 'rgba(15, 23, 42, 0.8)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  marginTop: '1rem',
                }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    Calculation Summary:
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Subtotal ({currentQty} unit @ ETB {currentPrice.toLocaleString()}):</span>
                    <span>ETB {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>VAT ({taxPct}%):</span>
                    <span style={{ color: 'var(--accent-blue)' }}>ETB {vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 800, marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
                    <span>Estimated Sales Value:</span>
                    <span style={{ color: 'var(--accent-emerald)' }}>ETB {totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  {requirements.leadSource === 'COMMISSION_AGENT' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginTop: '0.35rem', color: 'var(--accent-purple, #a855f7)' }}>
                      <span>Agent Commission ({requirements.commissionPercentage || 0}%):</span>
                      <span style={{ fontWeight: 700 }}>ETB {((totalValue * (parseFloat(requirements.commissionPercentage) || 0)) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {requirements.financingOption !== 'CASH' && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginTop: '0.35rem', color: 'var(--accent-cyan)' }}>
                      <span>Financed by {requirements.financingInstitutionName || 'Bank'} ({requirements.financingPercentage}%):</span>
                      <span style={{ fontWeight: 700 }}>ETB {((totalValue * (parseFloat(requirements.financingPercentage) || 0)) / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setIsCreateOpen(false);
                    setEditingEnquiry(null);
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Submitting...' : editingEnquiry ? 'Correct & Resubmit for Approval' : 'Submit Enquiry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BEAUTIFUL CONVERT TO BOOKING CONFIRMATION MODAL */}
      {convertTarget && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(0, 210, 211, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ArrowRight size={20} color="var(--accent-cyan)" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Convert to Vehicle Booking</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Generate an official booking for {convertTarget.enquiryNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setConvertTarget(null)}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.65rem', borderRadius: '8px' }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              <ModalErrorAlert error={convertError} onDismiss={() => setConvertError(null)} />

              <div style={{ background: 'rgba(15, 23, 42, 0.7)', borderRadius: 'var(--radius-md)', padding: '1.15rem', border: '1px solid var(--border-color)', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.65rem', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Customer:</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{convertTarget.customer?.fullName || 'Selected Customer'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.65rem', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Vehicle Model:</span>
                  <span style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>{convertTarget.item?.itemName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.65rem', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Assigned Salesperson:</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    {convertTarget.salespersonName || <span style={{ color: 'var(--accent-rose)' }}>Missing (Mandatory)</span>}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.65rem', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Order Quantity:</span>
                  <span style={{ fontWeight: 700 }}>{convertTarget.quantity} units</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.65rem', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Gross Quotation Total:</span>
                  <span style={{ fontWeight: 800, color: 'var(--accent-emerald)' }}>
                    ETB {Number(convertTarget.estimatedSalesValue).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.65rem', borderTop: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Required 25% Advance:</span>
                  <span style={{ fontWeight: 800, color: 'var(--accent-amber)' }}>
                    ETB {(Number(convertTarget.estimatedSalesValue) * 0.25).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5, background: 'rgba(99, 102, 241, 0.08)', padding: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                ℹ Converting this quotation will generate an immutable reservation order in <strong>Advance Bookings</strong>, lock vehicle pricing, and enable receipt of advance bank deposits (BRV).
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setConvertTarget(null)}
                disabled={converting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-cyan"
                onClick={handleConfirmConvert}
                disabled={converting}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                {converting ? 'Generating Booking...' : <>Confirm & Convert <ArrowRight size={15} /></>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONVERSION SUCCESS MODAL */}
      {conversionSuccess && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '460px', textAlign: 'center' }}>
            <div style={{ padding: '2rem 1.5rem 1.5rem' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                <CheckCircle2 size={32} color="var(--accent-emerald)" />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                Booking Successfully Created!
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                Enquiry <strong style={{ color: 'var(--text-primary)' }}>{conversionSuccess.enquiryNumber}</strong> has been converted into official Booking:
              </p>
              <div style={{ background: 'rgba(0, 210, 211, 0.1)', border: '1px solid rgba(0, 210, 211, 0.3)', borderRadius: 'var(--radius-md)', padding: '0.85rem', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--accent-cyan)', letterSpacing: '0.05em' }}>
                  {conversionSuccess.bookingNumber}
                </span>
              </div>
              <button
                className="btn btn-cyan"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => setConversionSuccess(null)}
              >
                Continue to Pipeline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECTION MODAL */}
      
      {/* KMSICAMS-14: Two-Stage Approval Modal */}
      {approvalModal.enquiry && approvalModal.stage && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">
                  {approvalModal.stage === 'SALES_REP' ? 'Stage 1: Sales Rep Review' : 'Stage 2: Sales Manager Approval'}
                </h3>
                <p className="modal-subtitle">
                  Enquiry #{approvalModal.enquiry.enquiryNumber} · {approvalModal.enquiry.customer?.fullName}
                </p>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setApprovalModal({ enquiry: null, stage: null, decision: 'APPROVE', notes: '' })}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleConfirmTwoStageApproval}>
              <div className="modal-body">
                {approvalError && <ModalErrorAlert error={approvalError} onDismiss={() => setApprovalError(null)} />}
                <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    className={`btn ${approvalModal.decision === 'APPROVE' ? 'btn-emerald' : 'btn-secondary'}`}
                    style={{ flex: 1 }}
                    onClick={() => setApprovalModal({ ...approvalModal, decision: 'APPROVE' })}
                  >
                    <CheckCircle size={14} /> Approve / Endorse
                  </button>
                  <button
                    type="button"
                    className={`btn ${approvalModal.decision === 'REJECT' ? 'btn-rose' : 'btn-secondary'}`}
                    style={{ flex: 1 }}
                    onClick={() => setApprovalModal({ ...approvalModal, decision: 'REJECT' })}
                  >
                    <XCircle size={14} /> Reject / Return
                  </button>
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Audit Notes & Comments {approvalModal.decision === 'REJECT' ? '*' : '(Optional)'}
                  </label>
                  <textarea
                    className="input-field"
                    rows={3}
                    placeholder={approvalModal.decision === 'REJECT' ? 'Enter required rejection reason...' : 'Enter review comments, terms or delivery notes...'}
                    value={approvalModal.notes}
                    onChange={(e) => setApprovalModal({ ...approvalModal, notes: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={approvalSubmitting}
                  onClick={() => setApprovalModal({ enquiry: null, stage: null, decision: 'APPROVE', notes: '' })}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`btn ${approvalModal.decision === 'APPROVE' ? 'btn-emerald' : 'btn-rose'}`}
                  disabled={approvalSubmitting}
                >
                  {approvalSubmitting ? 'Recording...' : `Confirm ${approvalModal.decision === 'APPROVE' ? 'Approval' : 'Rejection'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {rejectTarget && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'rgba(244, 63, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <XCircle size={20} color="var(--accent-rose)" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Reject Sales Enquiry</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Provide mandatory audit justification for {rejectTarget.enquiryNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRejectTarget(null)}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.65rem', borderRadius: '8px' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleConfirmReject}>
              <div className="modal-body">
                <ModalErrorAlert error={rejectError} onDismiss={() => setRejectError(null)} />

                <div style={{ background: 'rgba(15, 23, 42, 0.6)', borderRadius: 'var(--radius-md)', padding: '0.85rem 1rem', border: '1px solid var(--border-color)', marginBottom: '1rem', fontSize: '0.82rem' }}>
                  <div>Customer: <strong style={{ color: 'var(--text-primary)' }}>{rejectTarget.customer?.fullName}</strong></div>
                  <div style={{ marginTop: '0.25rem' }}>Model: <span style={{ color: 'var(--accent-cyan)' }}>{rejectTarget.item?.itemName}</span></div>
                </div>

                <div className="form-group">
                  <label className="form-label">Mandatory Rejection Reason *</label>
                  <textarea
                    className="textarea-field"
                    rows={3}
                    placeholder="e.g. Customer chose alternative leasing terms"
                    required
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                    * Required for internal sales audit and compliance (minimum 5 characters).
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setRejectTarget(null)}
                  disabled={rejecting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ background: 'var(--accent-rose)', borderColor: 'var(--accent-rose)' }}
                  disabled={rejecting}
                >
                  {rejecting ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINTABLE PROFORMA INVOICE / QUOTATION MODAL */}
      {selectedQuote && (
        <div className="modal-backdrop proforma-modal-backdrop">
          <div className="modal-content proforma-modal-content" style={{ maxWidth: '720px', padding: '0', background: '#0b1120', overflow: 'hidden', border: '1px solid #1e293b', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)' }}>
            {/* Modal Header Controls (Screen Only) */}
            <div className="no-print" style={{ padding: '0.9rem 1.4rem', background: '#0f172a', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <FileText size={18} color="#38bdf8" />
                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f8fafc' }}>
                  Proforma Quotation — <span style={{ color: '#38bdf8', fontFamily: 'monospace', fontWeight: 800 }}>{selectedQuote.enquiryNumber}</span>
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <button
                  type="button"
                  className="btn btn-cyan btn-sm"
                  onClick={() => window.print()}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontWeight: 600, padding: '0.45rem 0.95rem' }}
                >
                  <Printer size={15} /> Print Quotation (PDF)
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedQuote(null)}
                  style={{ background: 'rgba(255, 255, 255, 0.1)', border: 'none', borderRadius: '6px', color: '#ffffff', cursor: 'pointer', padding: '0.35rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                  title="Close modal"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Official Printable Proforma Document */}
            <div className="proforma-document" style={{ padding: '2.25rem', background: '#ffffff', color: '#0f172a' }}>
              {/* Header Letterhead */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0f172a', paddingBottom: '1.15rem', marginBottom: '1.25rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ background: '#0f172a', color: '#ffffff', fontWeight: 900, width: '42px', height: '42px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.15rem', letterSpacing: '0.05em' }}>
                      KM
                    </div>
                    <div>
                      <h2 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.03em', lineHeight: 1.15 }}>
                        KANAB MOTORS PLC
                      </h2>
                      <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: '#475569', fontWeight: 600 }}>
                        Automotive Assembly & Commercial Distribution
                      </p>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#475569', marginTop: '0.5rem', lineHeight: 1.45 }}>
                    Gotera Distribution Center · Debre Zeit Road, Addis Ababa, Ethiopia<br />
                    TIN: 0048291048 · VAT: 8291048002 · Tel: +251-11-467-1122
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    PROFORMA INVOICE
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.35rem' }}>
                    Quote Ref: <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>{selectedQuote.enquiryNumber}</strong>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.15rem' }}>
                    Date: <strong style={{ color: '#0f172a' }}>{new Date(selectedQuote.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</strong>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#b45309', fontWeight: 800, marginTop: '0.2rem' }}>
                    Validity: 30 Calendar Days
                  </div>
                </div>
              </div>

              {/* Customer Box */}
              <div style={{ padding: '0.75rem 1rem', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', marginBottom: '1.25rem', display: 'grid', gridTemplateColumns: '1.6fr 1.4fr', gap: '0.85rem', fontSize: '0.78rem' }}>
                <div>
                  <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Customer Information</div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0f172a', marginTop: '0.15rem' }}>{selectedQuote.customer?.fullName}</div>
                  <div style={{ color: '#475569' }}>Code: <strong>{selectedQuote.customer?.customerCode}</strong> | Type: {selectedQuote.customer?.customerType}</div>
                  <div style={{ color: '#475569' }}>Phone: {selectedQuote.customer?.mobileNumber}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Sales Attribution & Channel</div>
                  <div style={{ color: '#0f172a', marginTop: '0.15rem' }}>Salesperson: <strong>{selectedQuote.salespersonName}</strong></div>
                  <div style={{ color: '#475569' }}>Channel: <strong>{selectedQuote.leadSource || 'WALK_IN'}</strong> {selectedQuote.branchShowroom ? `· ${selectedQuote.branchShowroom}` : ''}</div>
                  <div style={{ color: '#475569' }}>Payment Mode: {selectedQuote.paymentMode?.replace(/_/g, ' ') || 'Bank Deposit'}</div>
                </div>
              </div>

              {/* Itemized Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8pt', marginBottom: '1.25rem' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #0f172a' }}>
                    <th style={{ padding: '6px 8px', textAlign: 'left', color: '#0f172a', fontWeight: 700 }}>ITEM DESCRIPTION / MODEL</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center', color: '#0f172a', fontWeight: 700 }}>QTY</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right', color: '#0f172a', fontWeight: 700 }}>UNIT PRICE (ETB)</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right', color: '#0f172a', fontWeight: 700 }}>SUBTOTAL (ETB)</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right', color: '#0f172a', fontWeight: 700 }}>VAT 15% (ETB)</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right', color: '#0f172a', fontWeight: 700 }}>TOTAL (ETB)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px', color: '#0f172a' }}>
                      <strong style={{ color: '#0f172a' }}>{getVehicleLabel(selectedQuote.item)}</strong>
                      <div style={{ fontSize: '7pt', color: '#64748b' }}>Code: {selectedQuote.item?.itemCode}</div>
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center', color: '#0f172a', fontWeight: 700 }}>
                      {selectedQuote.quantity}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', color: '#0f172a' }}>
                      {Number(selectedQuote.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', color: '#0f172a' }}>
                      {(Number(selectedQuote.unitPrice) * selectedQuote.quantity).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', color: '#0f172a' }}>
                      {Number(selectedQuote.vatAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                      {Number(selectedQuote.estimatedSalesValue).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Client Specifications & Retained Preferences */}
              {(selectedQuote.preferredColor || selectedQuote.targetBudget || selectedQuote.customerRequirementsNotes || selectedQuote.chargerTypeIncluded) && (
                <div style={{ padding: '0.65rem 0.85rem', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '4px', marginBottom: '1.25rem', fontSize: '0.72rem', color: '#334155' }}>
                  <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.35rem', textTransform: 'uppercase', fontSize: '0.65rem' }}>Client Specifications & Retained Preferences:</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '0.35rem' }}>
                    {selectedQuote.preferredColor && <div>Colour: <strong>{selectedQuote.preferredColor}</strong></div>}
                    {selectedQuote.targetBudget && <div>Target Budget: <strong>{selectedQuote.currency || 'ETB'} {Number(selectedQuote.targetBudget).toLocaleString()}</strong></div>}
                    {selectedQuote.expectedDeposit && <div>Expected Deposit: <strong>{selectedQuote.currency || 'ETB'} {Number(selectedQuote.expectedDeposit).toLocaleString()}</strong></div>}
                    {selectedQuote.financeProvider && <div>Financing: <strong>{selectedQuote.financeProvider}</strong></div>}
                    {selectedQuote.chargerTypeIncluded && <div>Charger: <strong>Included</strong></div>}
                    {selectedQuote.registrationHomologationNeeded && <div>Homologation: <strong>Required</strong></div>}
                  </div>
                  {selectedQuote.customerRequirementsNotes && (
                    <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '0.35rem', marginTop: '0.35rem' }}>
                      Notes: <em>{selectedQuote.customerRequirementsNotes}</em>
                    </div>
                  )}
                </div>
              )}

              {/* Financial Summary & Terms */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.68rem', color: '#475569', lineHeight: 1.5, background: '#f8fafc', padding: '0.75rem', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.35rem' }}>Commercial Terms & Conditions:</div>
                  1. Advance Deposit: 25% minimum required upon formal booking confirmation.<br />
                  2. Balance: 75% due upon physical vehicle readiness and chassis inspection.<br />
                  3. Validity: Prices guaranteed for 30 calendar days from issuance.<br />
                  4. Bank Account: Commercial Bank of Ethiopia (CBE) · A/C: 1000-4829-1048-002
                </div>

                <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.35rem', color: '#475569' }}>
                    <span>Subtotal:</span>
                    <span>ETB {(Number(selectedQuote.unitPrice) * selectedQuote.quantity).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.35rem', color: '#475569' }}>
                    <span>VAT (15%):</span>
                    <span>ETB {Number(selectedQuote.vatAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.92rem', fontWeight: 900, color: '#0f172a', paddingTop: '0.45rem', borderTop: '2px solid #0f172a' }}>
                    <span>Grand Total:</span>
                    <span>ETB {Number(selectedQuote.estimatedSalesValue).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#b45309', fontWeight: 700, marginTop: '0.35rem' }}>
                    <span>Req. Advance (25%):</span>
                    <span>ETB {(Number(selectedQuote.estimatedSalesValue) * 0.25).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Sign-off & Stamp Section */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', borderTop: '1px solid #cbd5e1', paddingTop: '1rem', fontSize: '0.7rem' }}>
                <div>
                  <div style={{ fontWeight: 800, color: '#0f172a' }}>Prepared By:</div>
                  <div style={{ color: '#475569', marginTop: '0.2rem' }}>{selectedQuote.salespersonName}</div>
                  <div style={{ color: '#64748b', marginTop: '1.25rem' }}>Sign: __________________</div>
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: '#0f172a' }}>Approved By:</div>
                  <div style={{ color: '#475569', marginTop: '0.2rem' }}>Sales Operations Manager</div>
                  <div style={{ color: '#64748b', marginTop: '1.25rem' }}>Sign: __________________</div>
                </div>
                <div style={{ border: '1px dashed #94a3b8', borderRadius: '4px', textAlign: 'center', padding: '0.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#64748b' }}>OFFICIAL STAMP</span>
                  <span style={{ fontSize: '0.58rem', color: '#94a3b8' }}>KANAB MOTORS PLC</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRE-ADVANCE SLIP MODAL (Story E16, E17, E18) */}
      {selectedSlip && (
        <div className="modal-backdrop proforma-modal-backdrop print-clean-backdrop" style={{ zIndex: 1200 }}>
          <div
            className="modal-content proforma-modal-content print-clean-sheet"
            style={{
              maxWidth: '820px',
              width: '95%',
              background: '#ffffff',
              color: '#0f172a',
              borderRadius: '12px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
              maxHeight: '92vh',
              overflowY: 'auto',
              padding: 0,
            }}
          >
            {/* Top Toolbar (Hidden during print) */}
            <div
              className="no-print"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem 1.5rem',
                background: '#0f172a',
                color: '#f8fafc',
                borderTopLeftRadius: '12px',
                borderTopRightRadius: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                <FileText size={16} color="#38bdf8" />
                <span style={{ fontWeight: 700 }}>
                  Pre-Advance Slip — <span style={{ color: '#38bdf8', fontFamily: 'monospace' }}>{selectedSlip.slipNumber}</span>
                </span>
                <span
                  style={{
                    fontSize: '0.7rem',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '999px',
                    fontWeight: 700,
                    background:
                      selectedSlip.status === 'ACTIVE'
                        ? 'rgba(16, 185, 129, 0.2)'
                        : selectedSlip.status === 'EXPIRED'
                        ? 'rgba(239, 68, 68, 0.2)'
                        : 'rgba(99, 102, 241, 0.2)',
                    color:
                      selectedSlip.status === 'ACTIVE'
                        ? '#10b981'
                        : selectedSlip.status === 'EXPIRED'
                        ? '#ef4444'
                        : '#818cf8',
                  }}
                >
                  {selectedSlip.status}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem' }}
                  onClick={() => window.print()}
                >
                  <Printer size={13} /> Print Slip
                </button>
                <button
                  onClick={() => setSelectedSlip(null)}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.2rem' }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Printable Slip Paper */}
            <div className="proforma-document print-clean-paper" style={{ padding: '2rem 2.25rem', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
              {/* Header with Letterhead */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0f172a', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <h1 style={{ fontSize: '1.4rem', fontWeight: 900, margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>
                    KANAB MOTORS PLC
                  </h1>
                  <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: '0.2rem', lineHeight: 1.4 }}>
                    Automotive Assembly, Commercial Fleet & Spare Parts Division<br />
                    Bole Subcity · Addis Ababa, Ethiopia · Tel: +251 11 661 2233
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#4f46e5', letterSpacing: '0.04em' }}>
                    OFFICIAL PRE-ADVANCE SLIP
                  </div>
                  <div style={{ fontSize: '0.8rem', fontFamily: 'monospace', fontWeight: 700, color: '#0f172a', marginTop: '0.2rem' }}>
                    Slip Ref: {selectedSlip.slipNumber}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: '0.2rem' }}>
                    Enquiry Ref: <strong style={{ color: '#0f172a' }}>{selectedSlip.enquiry?.enquiryNumber || 'N/A'}</strong>
                  </div>
                </div>
              </div>

              {/* 3-Day Expiry Notice Card (Story E18) */}
              <div
                style={{
                  background: 'rgba(99, 102, 241, 0.06)',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1.25rem',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#4338ca' }}>
                    ⏳ Reservation Validity: 3 Calendar Days (Configurable Policy)
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.1rem' }}>
                    Issued: {new Date(selectedSlip.issuedAt).toLocaleDateString()} · Expiration Date: <strong>{new Date(selectedSlip.expiresAt).toLocaleDateString()} (23:59 EAT)</strong>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '0.25rem 0.6rem',
                    borderRadius: '6px',
                    background: selectedSlip.status === 'ACTIVE' ? '#dcfce7' : '#fee2e2',
                    color: selectedSlip.status === 'ACTIVE' ? '#15803d' : '#b91c1c',
                  }}
                >
                  {selectedSlip.status === 'ACTIVE' ? '✓ Valid for Deposit' : selectedSlip.status}
                </span>
              </div>

              {/* Customer and Commercial Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', marginBottom: '1.25rem', fontSize: '0.75rem' }}>
                <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Customer Particulars</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginTop: '0.25rem' }}>{selectedSlip.customer?.fullName}</div>
                  <div style={{ color: '#475569', marginTop: '0.2rem' }}>Code: <strong>{selectedSlip.customer?.customerCode}</strong> · TIN: <strong>{selectedSlip.customer?.tinNumber || 'N/A'}</strong></div>
                  <div style={{ color: '#475569', marginTop: '0.1rem' }}>Mobile: {selectedSlip.customer?.mobileNumber}</div>
                </div>

                <div style={{ background: '#f8fafc', padding: '0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Commercial Terms</div>
                  <div style={{ color: '#0f172a', marginTop: '0.25rem' }}>Full Price Advance Rule: <strong>100% Required</strong></div>
                  <div style={{ color: '#475569', marginTop: '0.2rem' }}>Payment Mode: Bank Deposit / Wire Transfer</div>
                  <div style={{ color: '#475569', marginTop: '0.1rem' }}>Next Step: Bank Receipt Voucher (BRV) Intake</div>
                </div>
              </div>

              {/* Vehicle Particulars Table */}
              <div style={{ marginBottom: '1.25rem' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                  <thead>
                    <tr style={{ background: '#0f172a', color: '#ffffff' }}>
                      <th style={{ padding: '0.5rem 0.75rem', textAlign: 'left' }}>Item / Model Description</th>
                      <th style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>Specifications</th>
                      <th style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>Qty</th>
                      <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>Unit Price (ETB)</th>
                      <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>VAT (15%)</th>
                      <th style={{ padding: '0.5rem 0.75rem', textAlign: 'right' }}>Total (ETB)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a' }}>{selectedSlip.item?.itemName}</div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Code: {selectedSlip.item?.itemCode} · Brand: {selectedSlip.item?.brand?.brandName}</div>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        {selectedSlip.item?.colour && <div>🎨 {selectedSlip.item.colour}</div>}
                        {selectedSlip.item?.engineCapacityCc && <div>⚡ {selectedSlip.item.engineCapacityCc}</div>}
                        {selectedSlip.item?.batteryPowerKwh && <div>🔋 {selectedSlip.item.batteryPowerKwh} kWh</div>}
                        {!selectedSlip.item?.colour && !selectedSlip.item?.engineCapacityCc && !selectedSlip.item?.batteryPowerKwh && <div>Standard</div>}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 700 }}>{selectedSlip.quantity}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>{Number(selectedSlip.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>{Number(selectedSlip.vatAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 800 }}>{Number(selectedSlip.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Total & Advance Payment Required Banner (Story B4) */}
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.08) 0%, rgba(124, 58, 237, 0.08) 100%)',
                  border: '2px solid #4f46e5',
                  borderRadius: '8px',
                  padding: '1rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1.25rem',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4338ca', textTransform: 'uppercase' }}>
                    Required Advance Amount
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.15rem' }}>
                    Advance is 100% of full current price (ETB {Number(selectedSlip.totalAmount).toLocaleString()})
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#4f46e5' }}>
                    ETB {Number(selectedSlip.requiredAdvanceAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#16a34a', fontWeight: 700 }}>
                    100% Full Payment Mandate
                  </div>
                </div>
              </div>

              {/* Authorized Bank Account Information */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.85rem', marginBottom: '1.25rem', fontSize: '0.72rem' }}>
                <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.35rem' }}>
                  Authorized KANAB Motors PLC Bank Deposit Accounts:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', color: '#334155' }}>
                  <div><strong>CBE (Commercial Bank):</strong><br />1000123456789</div>
                  <div><strong>Awash Bank:</strong><br />01320876543200</div>
                  <div><strong>Dashen Bank:</strong><br />5041009876543</div>
                </div>
                <div style={{ marginTop: '0.5rem', color: '#64748b', fontStyle: 'italic', fontSize: '0.68rem' }}>
                  * Please mention Slip Number <strong>{selectedSlip.slipNumber}</strong> on bank deposit slip or transfer description.
                </div>
              </div>

              {/* Signatures */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', borderTop: '1px solid #cbd5e1', paddingTop: '1rem', fontSize: '0.7rem' }}>
                <div>
                  <div style={{ fontWeight: 800, color: '#0f172a' }}>Issued By:</div>
                  <div style={{ color: '#475569', marginTop: '0.2rem' }}>Sales Operations Desk</div>
                  <div style={{ color: '#64748b', marginTop: '1.25rem' }}>Sign: __________________</div>
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: '#0f172a' }}>Customer Acceptance:</div>
                  <div style={{ color: '#475569', marginTop: '0.2rem' }}>{selectedSlip.customer?.fullName}</div>
                  <div style={{ color: '#64748b', marginTop: '1.25rem' }}>Sign: __________________</div>
                </div>
                <div style={{ border: '1px dashed #94a3b8', borderRadius: '4px', textAlign: 'center', padding: '0.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#64748b' }}>OFFICIAL STAMP</span>
                  <span style={{ fontSize: '0.58rem', color: '#94a3b8' }}>KANAB MOTORS PLC</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STORY 2: VEHICLE INSPECTION MODAL */}
      {inspectionModal.open && inspectionModal.enquiry && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '580px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(0, 210, 211, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Car size={20} color="var(--accent-cyan)" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    {inspectionModal.mode === 'INITIATE' && 'Schedule Vehicle Inspection'}
                    {inspectionModal.mode === 'COMPLETE' && 'Complete Inspection Decision'}
                    {inspectionModal.mode === 'EXTEND' && 'Extend Inspection Duration'}
                    {inspectionModal.mode === 'CANCEL' && 'Cancel Vehicle Inspection'}
                    {inspectionModal.mode === 'VIEW' && `Inspection — ${inspectionModal.inspection?.inspectionNumber || 'Details'}`}
                  </h3>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Enquiry {inspectionModal.enquiry.enquiryNumber} · {inspectionModal.enquiry.customer?.fullName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectionModal({ open: false, enquiry: null, inspection: null, mode: 'VIEW' })}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.65rem', borderRadius: '8px' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitInspection}>
              <div className="modal-body">
                <ModalErrorAlert error={inspectionError} onDismiss={() => setInspectionError(null)} />

                {/* Inspection Info Summary */}
                <div style={{ background: 'rgba(15, 23, 42, 0.7)', borderRadius: 'var(--radius-md)', padding: '1rem', border: '1px solid var(--border-color)', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Vehicle Model:</span>
                    <span style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>{getVehicleLabel(inspectionModal.enquiry.item)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Customer:</span>
                    <span style={{ fontWeight: 600 }}>{inspectionModal.enquiry.customer?.fullName}</span>
                  </div>
                  {inspectionModal.inspection && (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Inspection Number:</span>
                        <span className="mono-code" style={{ color: 'var(--accent-cyan)' }}>{inspectionModal.inspection.inspectionNumber}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Chassis / VIN:</span>
                        <span className="mono-code">{inspectionModal.inspection.vinChassisNumber || 'Not specified'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.4rem' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Assigned Inspector:</span>
                        <span style={{ fontWeight: 600 }}>{inspectionModal.inspection.inspectorName || 'Senior Technical Inspector'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', paddingTop: '0.4rem', borderTop: '1px solid var(--border-color)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Deadline Status:</span>
                        <span style={{ fontWeight: 800 }}>
                          {inspectionModal.inspection.inspectionStatus === 'IN_PROGRESS' || inspectionModal.inspection.inspectionStatus === 'PENDING' ? (
                            <span style={{ color: 'var(--accent-amber)' }}>⏳ {formatCountdown(inspectionModal.inspection.deadlineAt)} remaining</span>
                          ) : (
                            <span>{inspectionModal.inspection.inspectionStatus}</span>
                          )}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* INITIATE FORM */}
                {inspectionModal.mode === 'INITIATE' && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                      <div className="form-group">
                        <label className="form-label">VIN / Chassis Number</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="e.g. WBA33AY08PFS12891"
                          value={inspectionForm.vinChassisNumber}
                          onChange={(e) => setInspectionForm({ ...inspectionForm, vinChassisNumber: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Engine Number</label>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="e.g. ENG-882941-ET"
                          value={inspectionForm.engineNumber}
                          onChange={(e) => setInspectionForm({ ...inspectionForm, engineNumber: e.target.value })}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.5rem' }}>
                      <div className="form-group">
                        <label className="form-label">Technical Inspector Name</label>
                        <input
                          type="text"
                          className="input-field"
                          required
                          value={inspectionForm.inspectorName}
                          onChange={(e) => setInspectionForm({ ...inspectionForm, inspectorName: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Allowed Duration (Default 120 min)</label>
                        <input
                          type="number"
                          min="15"
                          max="480"
                          step="15"
                          className="input-field"
                          required
                          value={inspectionForm.durationMinutes}
                          onChange={(e) => setInspectionForm({ ...inspectionForm, durationMinutes: Number(e.target.value) || 120 })}
                        />
                      </div>
                    </div>
                    <div className="form-group" style={{ marginTop: '0.5rem' }}>
                      <label className="form-label">Inspection Pre-Check Notes</label>
                      <textarea
                        className="input-field"
                        rows={2}
                        placeholder="Body inspection, paint depth meter, battery state of health, odometer..."
                        value={inspectionForm.notes}
                        onChange={(e) => setInspectionForm({ ...inspectionForm, notes: e.target.value })}
                      />
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'rgba(245, 158, 11, 0.08)', padding: '0.65rem', borderRadius: '4px', border: '1px solid rgba(245, 158, 11, 0.25)', marginTop: '0.5rem' }}>
                      ⚠️ <strong>Automated Expiration Rule:</strong> The inspection must be completed before the deadline passes. If the countdown reaches zero without an extension or completion, the inspection will expire and the sales enquiry will be cancelled automatically.
                    </div>
                  </>
                )}

                {/* COMPLETE FORM */}
                {inspectionModal.mode === 'COMPLETE' && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Customer Technical Inspection Outcome *</label>
                      <select
                        className="select-field"
                        value={inspectionForm.outcome}
                        onChange={(e) => setInspectionForm({ ...inspectionForm, outcome: e.target.value as any })}
                      >
                        <option value="ACCEPTED">ACCEPTED — Vehicle passed technical checks & accepted by customer</option>
                        <option value="REJECTED">REJECTED — Vehicle rejected due to defects / customer dissatisfaction</option>
                        <option value="PENDING_DECISION">PENDING DECISION — Customer requested 24 hours to decide</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ marginTop: '0.75rem' }}>
                      <label className="form-label">Outcome Assessment & Justification Notes</label>
                      <textarea
                        className="input-field"
                        rows={3}
                        required={inspectionForm.outcome === 'REJECTED'}
                        placeholder={inspectionForm.outcome === 'REJECTED' ? 'Mandatory explanation for vehicle rejection...' : 'Technical inspection findings, paint finish, battery diagnostic score, tyre condition...'}
                        value={inspectionForm.outcomeReason}
                        onChange={(e) => setInspectionForm({ ...inspectionForm, outcomeReason: e.target.value })}
                      />
                    </div>
                    <div style={{ marginTop: '0.75rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                        <input
                          type="checkbox"
                          checked={inspectionForm.customerSignatureAck}
                          onChange={(e) => setInspectionForm({ ...inspectionForm, customerSignatureAck: e.target.checked })}
                        />
                        Customer Signed Physical Vehicle Inspection Acknowledgment Slip
                      </label>
                    </div>
                  </>
                )}

                {/* EXTEND FORM */}
                {inspectionModal.mode === 'EXTEND' && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Additional Extension Time</label>
                      <select
                        className="select-field"
                        value={inspectionForm.extensionMinutes}
                        onChange={(e) => setInspectionForm({ ...inspectionForm, extensionMinutes: Number(e.target.value) })}
                      >
                        <option value={30}>+30 Minutes</option>
                        <option value={60}>+60 Minutes (1 Hour)</option>
                        <option value={120}>+120 Minutes (2 Hours)</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ marginTop: '0.75rem' }}>
                      <label className="form-label">Mandatory Extension Reason *</label>
                      <textarea
                        className="input-field"
                        rows={3}
                        required
                        placeholder="e.g. Diagnostic scan required extended road test or workshop lift inspection"
                        value={inspectionForm.extensionReason}
                        onChange={(e) => setInspectionForm({ ...inspectionForm, extensionReason: e.target.value })}
                      />
                    </div>
                  </>
                )}

                {/* CANCEL FORM */}
                {inspectionModal.mode === 'CANCEL' && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Mandatory Cancellation Reason *</label>
                      <textarea
                        className="input-field"
                        rows={3}
                        required
                        placeholder="e.g. Customer cancelled inspection appointment or chose another vehicle"
                        value={inspectionForm.cancellationReason}
                        onChange={(e) => setInspectionForm({ ...inspectionForm, cancellationReason: e.target.value })}
                      />
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--accent-rose)', marginTop: '0.5rem' }}>
                      * Cancelling an inspection will mark the inspection as CANCELLED and will reject the associated sales enquiry.
                    </div>
                  </>
                )}

                {/* VIEW MODE */}
                {inspectionModal.mode === 'VIEW' && inspectionModal.inspection && (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.82rem', marginBottom: '1rem' }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Outcome:</span>
                        <div style={{ fontWeight: 800, marginTop: '0.15rem', color: inspectionModal.inspection.inspectionOutcome === 'ACCEPTED' ? 'var(--accent-emerald)' : 'var(--text-primary)' }}>
                          {inspectionModal.inspection.inspectionOutcome || 'Pending Decision'}
                        </div>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Customer Ack Slip:</span>
                        <div style={{ fontWeight: 700, marginTop: '0.15rem' }}>
                          {inspectionModal.inspection.customerSignatureAck ? '✓ Signed on File' : 'Not Signed'}
                        </div>
                      </div>
                    </div>
                    {inspectionModal.inspection.outcomeReason && (
                      <div style={{ background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '4px', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.2rem' }}>Findings / Reason:</div>
                        <div>{inspectionModal.inspection.outcomeReason}</div>
                      </div>
                    )}
                    {inspectionModal.inspection.notes && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                        Notes: {inspectionModal.inspection.notes}
                      </div>
                    )}
                    {(inspectionModal.inspection.inspectionStatus === 'IN_PROGRESS' || inspectionModal.inspection.inspectionStatus === 'PENDING') && (
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                        <button
                          type="button"
                          className="btn btn-emerald btn-sm"
                          style={{ flex: 1 }}
                          onClick={() => setInspectionModal({ ...inspectionModal, mode: 'COMPLETE' })}
                        >
                          Complete Inspection
                        </button>
                        <button
                          type="button"
                          className="btn btn-amber btn-sm"
                          style={{ flex: 1 }}
                          onClick={() => setInspectionModal({ ...inspectionModal, mode: 'EXTEND' })}
                        >
                          Extend Duration
                        </button>
                        <button
                          type="button"
                          className="btn btn-rose btn-sm"
                          style={{ flex: 1 }}
                          onClick={() => setInspectionModal({ ...inspectionModal, mode: 'CANCEL' })}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {inspectionModal.mode !== 'VIEW' && (
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setInspectionModal({ open: false, enquiry: null, inspection: null, mode: 'VIEW' })}
                    disabled={submittingInspection}
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className={`btn ${inspectionModal.mode === 'CANCEL' ? 'btn-rose' : inspectionModal.mode === 'COMPLETE' ? 'btn-emerald' : 'btn-cyan'}`}
                    disabled={submittingInspection}
                  >
                    {submittingInspection ? 'Saving...' : inspectionModal.mode === 'INITIATE' ? 'Start Inspection & Timer' : inspectionModal.mode === 'COMPLETE' ? 'Confirm Completion' : inspectionModal.mode === 'EXTEND' ? 'Confirm Extension' : 'Confirm Cancellation'}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* STORY 3: FINANCING LIFECYCLE TRACKING MODAL */}
      {financingModal.open && financingModal.enquiry && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={20} color="var(--accent-cyan)" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    Commercial Financing Lifecycle Tracking
                  </h3>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {financingModal.enquiry.financingInstitutionName || financingModal.enquiry.financingOption} · Enquiry {financingModal.enquiry.enquiryNumber}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFinancingModal({ open: false, enquiry: null })}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.65rem', borderRadius: '8px' }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitFinancingStatus}>
              <div className="modal-body">
                <ModalErrorAlert error={financingError} onDismiss={() => setFinancingError(null)} />

                <div style={{ background: 'rgba(15, 23, 42, 0.7)', borderRadius: 'var(--radius-md)', padding: '1rem', border: '1px solid var(--border-color)', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Institution:</span>
                    <span style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>{financingModal.enquiry.financingInstitutionName || 'Partner Institution'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Institution Type:</span>
                    <span className="badge badge-subtle">{financingModal.enquiry.financingType || 'BANK'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Loan Amount Requested:</span>
                    <span style={{ fontWeight: 700, color: 'var(--accent-cyan)' }}>
                      ETB {Number(financingModal.enquiry.financingAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })} ({financingModal.enquiry.financingPercentage}%)
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', paddingTop: '0.35rem', borderTop: '1px solid var(--border-color)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Customer Required Equity:</span>
                    <span style={{ fontWeight: 800, color: 'var(--accent-amber)' }}>
                      ETB {Number(financingModal.enquiry.customerContributionAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Financing Lifecycle Status *</label>
                  <select
                    className="select-field"
                    required
                    value={financingForm.financingStatus}
                    onChange={(e) => setFinancingForm({ ...financingForm, financingStatus: e.target.value as any })}
                  >
                    <option value="NOT_SUBMITTED">NOT SUBMITTED — Awaiting documentation preparation</option>
                    <option value="SUBMITTED">SUBMITTED — Loan file filed with credit department</option>
                    <option value="UNDER_REVIEW">UNDER REVIEW — Loan committee evaluation</option>
                    <option value="APPROVED">APPROVED — Formal bank credit commitment letter issued</option>
                    <option value="REJECTED">REJECTED — Application declined by credit risk</option>
                    <option value="DISBURSED">DISBURSED — Loan disbursed to KANAB Motors PLC</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginTop: '0.75rem' }}>
                  <label className="form-label">Bank / MFI Application Reference Number</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. CBE-CR-2026-90412"
                    value={financingForm.financingApplicationNumber}
                    onChange={(e) => setFinancingForm({ ...financingForm, financingApplicationNumber: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label">Approved Loan Amount (ETB)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input-field"
                      placeholder="e.g. 700000"
                      value={financingForm.financingApprovedAmount}
                      onChange={(e) => setFinancingForm({ ...financingForm, financingApprovedAmount: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Disbursed Amount (ETB)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="input-field"
                      placeholder="e.g. 700000"
                      value={financingForm.financingDisbursedAmount}
                      onChange={(e) => setFinancingForm({ ...financingForm, financingDisbursedAmount: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '0.75rem' }}>
                  <label className="form-label">Credit Evaluation Notes & Follow-up</label>
                  <textarea
                    className="input-field"
                    rows={3}
                    placeholder="Credit officer feedback, repayment schedule, collateral registration notes..."
                    value={financingForm.financingNotes}
                    onChange={(e) => setFinancingForm({ ...financingForm, financingNotes: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setFinancingModal({ open: false, enquiry: null })}
                  disabled={submittingFinancing}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-cyan"
                  disabled={submittingFinancing}
                >
                  {submittingFinancing ? 'Updating...' : 'Update Financing Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
