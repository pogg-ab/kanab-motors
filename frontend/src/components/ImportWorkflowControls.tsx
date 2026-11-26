import React, { useEffect, useState } from 'react';
import {
  FileText,
  Paperclip,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  DollarSign,
  ShieldCheck,
  Calendar,
  Layers,
  Save,
  RefreshCw,
  Eye,
  Check,
  X,
  RotateCcw,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { EntityAttachmentsModal } from './EntityAttachmentsModal';
import { ClientPODocumentModal } from './ClientPODocumentModal';

const methods = ['TELEGRAPHIC_TRANSFER', 'LETTER_OF_CREDIT', 'CASH_AGAINST_DOCUMENTS'];
const checkpoints = ['PO_CONFIRMATION', 'PAYMENT', 'SHIPMENT', 'CUSTOMS'];
const labels: Record<string, string> = {
  TELEGRAPHIC_TRANSFER: 'T/T Bank Wire Transfer',
  LETTER_OF_CREDIT: 'Letter of Credit (L/C)',
  CASH_AGAINST_DOCUMENTS: 'Cash Against Documents (CAD)',
  ISSUANCE_AND_ADVANCE: 'PO Issue & Advance Settlement (whichever is later)',
  ISSUANCE: 'PO Issue Date Only',
  PO_CONFIRMATION: 'Before PO Approval / Confirmation',
  PAYMENT: 'Before Supplier Remittance Payment',
  SHIPMENT: 'Before Origin Port Shipment',
  CUSTOMS: 'Before Customs Clearance',
  hsnSacCode: 'HSN / SAC Code',
  itemDescription: 'Commercial Item Description',
  uom: 'Unit of Measure (UOM)',
  proformaInvoiceNo: 'Proforma Invoice No.',
  proformaInvoiceDate: 'Proforma Invoice Date',
  contractReference: 'Contract / Agreement Ref',
  countryOfOrigin: 'Country of Origin',
  packingRequirements: 'Export Packing Requirements',
  warrantyTerms: 'Warranty Terms & Conditions',
  inspectionRequirements: 'Inspection Instructions & Standards',
  commercialRemarks: 'Commercial Remarks & Special Terms',
};

const readable = (value: string) =>
  labels[value] || value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ');

function Field({ label, value, onChange, type = 'text', options, disabled = false, placeholder, rows, step }: any) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      <label className="form-label" style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
        {readable(label)}
      </label>
      {options ? (
        <select
          className="input w-full text-xs"
          disabled={disabled}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.map((v: string) => (
            <option key={v} value={v}>
              {v ? readable(v) : 'All / Not specified'}
            </option>
          ))}
        </select>
      ) : type === 'textarea' ? (
        <textarea
          className="input w-full text-xs"
          disabled={disabled}
          placeholder={placeholder}
          rows={rows || 2}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          className="input w-full text-xs"
          disabled={disabled}
          type={type}
          step={step}
          placeholder={placeholder}
          value={value ?? ''}
          onChange={(e) => onChange(type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)}
        />
      )}
    </div>
  );
}

export function ImportPolicyControls() {
  const { hasPermission } = useAuth();
  const [policy, setPolicy] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiClient
      .get('/purchase-orders/import-policy')
      .then((r) => setPolicy(r.data))
      .catch(() => setMessage('Could not load import policy'));
  }, []);

  if (!policy) return <p>{message}</p>;
  const canEdit = hasPermission('COMPANY_PROFILE_EDIT');
  const change = (key: string, value: any) => setPolicy({ ...policy, [key]: value });

  const save = async () => {
    setBusy(true);
    try {
      await apiClient.put('/purchase-orders/import-policy', policy);
      setMessage('Import policy saved. Previously issued documents retain their approved terms.');
    } catch (e: any) {
      setMessage(e.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <details className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
      <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: '0.95rem', color: 'var(--accent-cyan)' }}>
        Import policy, standard terms and deadline responsibilities
      </summary>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
        Configure confirmed business rules here. Empty destination or shipment mode applies to all transactions. A checkpoint blocks progression until its configured evidence is approved.
      </p>
      {message && (
        <div style={{ padding: '0.65rem 0.85rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10B981', borderRadius: '6px', color: '#10B981', fontSize: '0.8rem', margin: '0.75rem 0' }}>
          {message}
        </div>
      )}
      <fieldset disabled={!canEdit || busy} style={{ border: 0, padding: 0, marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
          <Field label="System timezone" value={policy.timezone} onChange={(v: string) => change('timezone', v)} />
          <Field label="Escalate after overdue days" type="number" value={policy.escalationDays} onChange={(v: number) => change('escalationDays', v)} />
          <Field label="Escalation role" value={policy.escalationRole} onChange={(v: string) => change('escalationRole', v)} />
          {Object.entries(policy.recipients).map(([key, value]) => (
            <Field key={key} label={`${key} responsible role`} value={value} onChange={(v: string) => change('recipients', { ...policy.recipients, [key]: v })} />
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: '0.75rem' }}>
          <div>
            <label className="form-label" style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Non-working holidays (one YYYY-MM-DD date per line)
            </label>
            <textarea
              className="input w-full text-xs"
              rows={4}
              value={policy.holidays.join('\n')}
              onChange={(e) => change('holidays', e.target.value.split('\n').filter(Boolean))}
            />
          </div>
          <div>
            <label className="form-label" style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Standard PO terms (one per line; placeholders: {'{days}, {dayType}, {trigger}'})
            </label>
            <textarea
              className="input w-full text-xs"
              rows={4}
              value={policy.standardTerms.join('\n')}
              onChange={(e) => change('standardTerms', e.target.value.split('\n'))}
            />
          </div>
        </div>

        <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.5rem 0 0' }}>
          Required permits and registrations
        </h4>
        {policy.requirements.map((r: any, i: number) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.65rem', padding: '0.75rem', background: 'var(--bg-secondary)', borderRadius: '6px', alignItems: 'center' }}>
            {['destination', 'type', 'authority'].map((k) => (
              <Field key={k} label={k} value={r[k]} onChange={(v: string) => change('requirements', policy.requirements.map((x: any, j: number) => (i === j ? { ...x, [k]: v } : x)))} />
            ))}
            <Field label="Shipment mode" options={['', 'SEA', 'AIR', 'ROAD', 'RAIL']} value={r.mode} onChange={(v: string) => change('requirements', policy.requirements.map((x: any, j: number) => (i === j ? { ...x, mode: v } : x)))} />
            <Field label="Checkpoint" options={checkpoints} value={r.checkpoint} onChange={(v: string) => change('requirements', policy.requirements.map((x: any, j: number) => (i === j ? { ...x, checkpoint: v } : x)))} />
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={r.evidenceRequired} onChange={(e) => change('requirements', policy.requirements.map((x: any, j: number) => (i === j ? { ...x, evidenceRequired: e.target.checked } : x)))} /> Attachment required
            </label>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => change('requirements', policy.requirements.filter((_: any, j: number) => j !== i))}>
              Remove
            </button>
          </div>
        ))}

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => change('requirements', [...policy.requirements, { destination: '', mode: '', type: 'IMPORT_PERMIT', authority: '', checkpoint: 'PO_CONFIRMATION', evidenceRequired: true }])}
          >
            <Plus size={14} /> Add permit rule
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={save}>
            Save import policy
          </button>
        </div>
      </fieldset>
    </details>
  );
}

export function ImportOrderControls({ po, onReload }: { po: any; onReload: () => void }) {
  const { hasPermission } = useAuth();
  const [form, setForm] = useState<any>({});
  const [milestones, setMilestones] = useState<any[]>([]);
  const [checklist, setChecklist] = useState<any[]>([]);
  const [revisions, setRevisions] = useState<any[]>([]);
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [attachment, setAttachment] = useState<any>(null);
  const [document, setDocument] = useState<any>(null);
  const [uomOptions, setUomOptions] = useState<string[]>([
    'UNIT',
    'PCS',
    'PIECE',
    'SET',
    'BOX',
    'KG',
    'MTR',
    'LTR',
    'PKT',
    'BAG',
  ]);
  const [permit, setPermit] = useState<any>({
    requirementType: 'IMPORT_PERMIT',
    issuingAuthority: '',
    status: 'PENDING',
  });

  const draft = po.status === 'DRAFT';
  const canEdit = hasPermission('PURCHASE_ORDERS_EDIT');
  const canFinance = hasPermission('PAYMENTS_RECORD');
  const canDecide = hasPermission('PAYMENTS_CONFIRM');

  useEffect(() => {
    setForm({ ...po, lines: (po.lines || []).map((l: any) => ({ ...l })) });
    setMilestones(
      (po.paymentSchedules || [])
        .filter((s: any) => s.status !== 'CANCELLED')
        .map((s: any) => ({
          milestoneName: s.milestoneName,
          paymentMethod: s.paymentMethod,
          paymentPercentage: Number(s.paymentPercentage || 0),
          dueDate: s.dueDate || '',
          isAdvance: s.isAdvance || false,
        })),
    );
    Promise.all([
      apiClient.get(`/purchase-orders/${po.poId}/checklist`),
      apiClient.get(`/purchase-orders/${po.poId}/revisions`),
      apiClient.get('/products/uoms').catch(() => ({ data: [] })),
    ])
      .then(([c, r, u]: any) => {
        setChecklist(c.data);
        setRevisions(r.data);
        if (Array.isArray(u?.data) && u.data.length > 0) {
          const list = u.data.map((x: any) => x.uomName?.toUpperCase()).filter(Boolean);
          setUomOptions(Array.from(new Set([...list, 'UNIT', 'PCS', 'PIECE', 'SET', 'BOX', 'KG', 'MTR', 'LTR', 'PKT', 'BAG'])));
        }
      })
      .catch((e) => setMessage(e.response?.data?.message || e.message));
  }, [po]);

  const run = async (action: () => Promise<any>) => {
    setBusy(true);
    setMessage('');
    try {
      await action();
      setMessage('Saved successfully');
      onReload();
    } catch (e: any) {
      setMessage(e.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
  };

  const total = ((form.lines && form.lines.length > 0) ? form.lines : (po.lines || [])).reduce(
    (sum: number, l: any) => sum + Number(l.quantityOrdered || 0) * Number(l.unitPrice || 0),
    0,
  );

  const totalPercentage = milestones.reduce((sum, m) => sum + Number(m.paymentPercentage || 0), 0);

  const saveTerms = () =>
    run(() =>
      apiClient.put(`/purchase-orders/${po.poId}`, {
        incotermsNamedPlace: form.incotermsNamedPlace || '',
        destinationCountry: form.destinationCountry || '',
        countryOfOrigin: form.countryOfOrigin || '',
        paymentMethod: form.paymentMethod || 'TELEGRAPHIC_TRANSFER',
        inspectionRequired: !!form.inspectionRequired,
        inspectionRequirements: form.inspectionRequirements || '',
        warrantyTerms: form.warrantyTerms || '',
        packingRequirements: form.packingRequirements || '',
        commercialRemarks: form.commercialRemarks || '',
        proformaInvoiceNo: form.proformaInvoiceNo || '',
        proformaInvoiceDate: form.proformaInvoiceDate ? form.proformaInvoiceDate.slice(0, 10) : null,
        contractReference: form.contractReference || '',
        leadTimeDayType: form.leadTimeDayType || 'CALENDAR',
        leadTimeTrigger: form.leadTimeTrigger === 'ISSUANCE' ? 'ISSUANCE' : 'ISSUANCE_AND_ADVANCE',
        deliveryLeadTimeDays: Number(form.deliveryLeadTimeDays ?? 30),
        lines: form.lines.map((l: any) => ({
          itemId: l.itemId,
          quantityOrdered: Number(l.quantityOrdered),
          unitPrice: Number(l.unitPrice),
          hsnSacCode: l.hsnSacCode || '',
          uom: l.uom || l.item?.uom?.uomName || 'UNIT',
          itemDescription: l.itemDescription || l.item?.itemName || '',
        })),
      }),
    );

  return (
    <details
      className="card"
      style={{
        padding: '1.25rem',
        margin: '0.75rem 0 1.25rem',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
      }}
    >
      <summary
        style={{
          cursor: 'pointer',
          fontWeight: 700,
          fontSize: '0.92rem',
          color: 'var(--accent-cyan)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <span>Import Terms, Extended Commercial Controls & Payment Schedules</span>
      </summary>

      {message && (
        <div
          style={{
            padding: '0.65rem 0.85rem',
            background: message === 'Saved successfully' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            border: message === 'Saved successfully' ? '1px solid #10B981' : '1px solid #EF4444',
            borderRadius: '6px',
            color: message === 'Saved successfully' ? '#10B981' : '#EF4444',
            fontSize: '0.8rem',
            margin: '0.85rem 0 0.5rem',
            fontWeight: 600,
          }}
        >
          {message}
        </div>
      )}

      {/* Top action bar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '0.85rem 0' }}>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem' }}
          onClick={() =>
            setAttachment({
              entityType: 'purchase_order',
              entityId: po.poId,
              title: 'Proforma Invoices and Commercial Agreements',
              subtitle: `PO Ref: ${po.poNumber || po.poId} · Supplier: ${po.supplier?.supplierName || 'UAT Exporter'}`,
              allowedDocTypes: [
                'Proforma Invoice',
                'Commercial Contract',
                'Technical Specification',
                'Quality Agreement',
                'Inspection Certificate',
                'Supporting Document',
              ],
            })
          }
        >
          <Paperclip size={14} />
          <span>PO Agreements & Proforma Attachments</span>
        </button>
      </div>

      <fieldset disabled={!draft || !canEdit || busy} style={{ border: 0, padding: 0 }}>
        {/* SECTION 1: Delivery and Commercial Rules */}
        <div
          style={{
            padding: '1rem',
            background: 'rgba(15, 23, 42, 0.5)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1rem',
          }}
        >
          <h4
            style={{
              fontSize: '0.875rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: '0 0 0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <Layers size={16} color="var(--accent-cyan)" />
            <span>Delivery and Commercial Rules</span>
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
            <Field
              label="Named delivery place"
              placeholder="e.g. Nhava Sheva (JNPT) Terminal 4"
              value={form.incotermsNamedPlace}
              onChange={(v: string) => setForm({ ...form, incotermsNamedPlace: v })}
            />
            <Field
              label="Destination country"
              placeholder="e.g. Ethiopia"
              value={form.destinationCountry}
              onChange={(v: string) => setForm({ ...form, destinationCountry: v })}
            />
            <Field
              label="Country of origin"
              placeholder="e.g. India"
              value={form.countryOfOrigin}
              onChange={(v: string) => setForm({ ...form, countryOfOrigin: v })}
            />
            <Field
              label="Payment method"
              options={methods}
              value={form.paymentMethod || methods[0]}
              onChange={(v: string) => setForm({ ...form, paymentMethod: v })}
            />
            <Field
              label="Delivery lead time (Days)"
              type="number"
              placeholder="e.g. 30"
              value={form.deliveryLeadTimeDays}
              onChange={(v: number) => setForm({ ...form, deliveryLeadTimeDays: v })}
            />
            <Field
              label="Day calculation"
              options={['CALENDAR', 'WORKING']}
              value={form.leadTimeDayType}
              onChange={(v: string) => setForm({ ...form, leadTimeDayType: v })}
            />
            <Field
              label="Delivery trigger"
              options={['ISSUANCE_AND_ADVANCE', 'ISSUANCE']}
              value={form.leadTimeTrigger === 'ISSUANCE' ? 'ISSUANCE' : 'ISSUANCE_AND_ADVANCE'}
              onChange={(v: string) => setForm({ ...form, leadTimeTrigger: v })}
            />
          </div>

          {/* Sub-section: Proforma Invoice & Contractual Reference (TC-12) */}
          <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '0.65rem' }}>
              Proforma Invoice & Contractual Reference
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
              <Field
                label="Proforma Invoice Number"
                placeholder="e.g. PI-EXP-2026-889"
                value={form.proformaInvoiceNo}
                onChange={(v: string) => setForm({ ...form, proformaInvoiceNo: v })}
              />
              <Field
                label="Proforma Invoice Date"
                type="date"
                value={form.proformaInvoiceDate ? form.proformaInvoiceDate.slice(0, 10) : ''}
                onChange={(v: string) => setForm({ ...form, proformaInvoiceDate: v })}
              />
              <Field
                label="Contract / Agreement Ref"
                placeholder="e.g. KANAB-EXP-AGR-001"
                value={form.contractReference}
                onChange={(v: string) => setForm({ ...form, contractReference: v })}
              />
            </div>
          </div>

          {/* Sub-section: Quality, Warranty, Packing & Remarks (TC-13, TC-16) */}
          <div style={{ marginTop: '1rem', paddingTop: '0.85rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '0.65rem' }}>
              Inspection, Warranty & Packaging Specifications
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem', marginBottom: '0.85rem' }}>
              <Field
                label="Export Packing Requirements"
                placeholder="e.g. Standard export seaworthy packing in heavy-duty 40ft High Cube containers"
                value={form.packingRequirements}
                onChange={(v: string) => setForm({ ...form, packingRequirements: v })}
              />
              <Field
                label="Warranty Terms & Conditions"
                placeholder="e.g. 12 months or 20,000 km standard manufacturer warranty"
                value={form.warrantyTerms}
                onChange={(v: string) => setForm({ ...form, warrantyTerms: v })}
              />
              <Field
                label="Commercial Remarks & Special Terms"
                placeholder="e.g. All customs clearance at destination borne by importer"
                value={form.commercialRemarks}
                onChange={(v: string) => setForm({ ...form, commercialRemarks: v })}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={!!form.inspectionRequired}
                  onChange={(e) => setForm({ ...form, inspectionRequired: e.target.checked })}
                />
                <span>Pre-Shipment Inspection Required (Certificate required prior to clearance)</span>
              </label>

              {form.inspectionRequired && (
                <Field
                  label="Inspection Instructions & Standards"
                  placeholder="e.g. Pre-shipment inspection by Bureau Veritas / SGS at loading port"
                  value={form.inspectionRequirements}
                  onChange={(v: string) => setForm({ ...form, inspectionRequirements: v })}
                />
              )}
            </div>
          </div>
        </div>

        {/* SECTION 2: Line Descriptions and Customs Classification */}
        <div
          style={{
            padding: '1rem',
            background: 'rgba(15, 23, 42, 0.5)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1rem',
          }}
        >
          <h4
            style={{
              fontSize: '0.875rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: '0 0 0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            <FileText size={16} color="var(--accent-cyan)" />
            <span>Line Descriptions and Customs Classification (HSN/SAC & UOM)</span>
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {(form.lines || []).map((l: any, i: number) => {
              const lineSubtotal = (Number(l.quantityOrdered || 0) * Number(l.unitPrice || 0));
              return (
                <div
                  key={l.poLineId || i}
                  style={{
                    padding: '0.75rem',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                      Line #{i + 1}: {l.item?.itemCode || l.itemId} · {l.item?.itemName}
                    </div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-emerald)' }}>
                      Line Subtotal: USD {lineSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 170px), 1fr))', gap: '0.65rem' }}>
                    <Field
                      label="Commercial Item Description"
                      placeholder="Customs product description..."
                      value={l.itemDescription || l.item?.itemName || ''}
                      onChange={(v: string) =>
                        setForm({
                          ...form,
                          lines: form.lines.map((x: any, j: number) => (i === j ? { ...x, itemDescription: v } : x)),
                        })
                      }
                    />
                    <Field
                      label="HSN / SAC Code"
                      placeholder="e.g. 8711.20"
                      value={l.hsnSacCode || ''}
                      onChange={(v: string) =>
                        setForm({
                          ...form,
                          lines: form.lines.map((x: any, j: number) => (i === j ? { ...x, hsnSacCode: v } : x)),
                        })
                      }
                    />
                    <Field
                      label="Unit of Measure (UOM)"
                      options={uomOptions}
                      value={l.uom || l.item?.uom?.uomName || 'UNIT'}
                      onChange={(v: string) =>
                        setForm({
                          ...form,
                          lines: form.lines.map((x: any, j: number) => (i === j ? { ...x, uom: v } : x)),
                        })
                      }
                    />
                    <Field
                      label="Quantity Ordered"
                      type="number"
                      step="1"
                      placeholder="e.g. 10"
                      value={l.quantityOrdered}
                      onChange={(v: number) =>
                        setForm({
                          ...form,
                          lines: form.lines.map((x: any, j: number) => (i === j ? { ...x, quantityOrdered: v } : x)),
                        })
                      }
                    />
                    <Field
                      label="Contract Unit Rate (USD)"
                      type="number"
                      step="any"
                      placeholder="e.g. 100000"
                      value={l.unitPrice}
                      onChange={(v: number) =>
                        setForm({
                          ...form,
                          lines: form.lines.map((x: any, j: number) => (i === j ? { ...x, unitPrice: v } : x)),
                        })
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Contractual Total:{' '}
              <span style={{ color: 'var(--accent-cyan)' }}>
                USD {(form.lines || []).reduce((sum: number, x: any) => sum + (Number(x.quantityOrdered || 0) * Number(x.unitPrice || 0)), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
              </span>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              onClick={saveTerms}
            >
              <Save size={14} />
              <span>Save Commercial Rules & Lines</span>
            </button>
          </div>
        </div>
      </fieldset>

      {/* SECTION 3: Contractual Payment Schedules (Percentage-Based) */}
      <div
        style={{
          padding: '1rem',
          background: 'rgba(15, 23, 42, 0.5)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.85rem' }}>
          <div>
            <h4
              style={{
                fontSize: '0.875rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <DollarSign size={16} color="var(--accent-cyan)" />
              <span>Contractual Payment Schedule (100% Milestone Allocation)</span>
            </h4>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Contract Total: <strong className="font-mono text-cyan-400">{po.currency} {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            </div>
          </div>
          <span
            className="badge"
            style={{
              fontSize: '0.75rem',
              padding: '0.25rem 0.6rem',
              borderRadius: '9999px',
              fontWeight: 700,
              background: totalPercentage === 100 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              color: totalPercentage === 100 ? '#10B981' : '#F59E0B',
              border: totalPercentage === 100 ? '1px solid #10B981' : '1px solid #F59E0B',
            }}
          >
            Allocated: {totalPercentage}% / 100%
          </span>
        </div>

        <fieldset disabled={!draft || !canFinance || busy} style={{ border: 0, padding: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {milestones.map((m, i) => {
              const amount = (total * Number(m.paymentPercentage || 0)) / 100;
              return (
                <div
                  key={i}
                  style={{
                    padding: '0.75rem 0.85rem',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 170px), 1fr))',
                    gap: '0.65rem',
                    alignItems: 'center',
                  }}
                >
                  <Field
                    label="Milestone Name"
                    placeholder="e.g. Advance Wire"
                    value={m.milestoneName}
                    onChange={(v: string) =>
                      setMilestones(milestones.map((x, j) => (i === j ? { ...x, milestoneName: v } : x)))
                    }
                  />
                  <Field
                    label="Percentage (%)"
                    type="number"
                    placeholder="e.g. 30"
                    value={m.paymentPercentage}
                    onChange={(v: number) =>
                      setMilestones(milestones.map((x, j) => (i === j ? { ...x, paymentPercentage: v } : x)))
                    }
                  />
                  <Field
                    label="Method"
                    options={methods}
                    value={m.paymentMethod}
                    onChange={(v: string) =>
                      setMilestones(milestones.map((x, j) => (i === j ? { ...x, paymentMethod: v } : x)))
                    }
                  />
                  <Field
                    label="Due Date"
                    type="date"
                    value={m.dueDate}
                    onChange={(v: string) =>
                      setMilestones(milestones.map((x, j) => (i === j ? { ...x, dueDate: v } : x)))
                    }
                  />
                  <div>
                    <label className="form-label" style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      Calculated Amount
                    </label>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent-cyan)' }} className="font-mono">
                      {po.currency} {amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', cursor: 'pointer', marginTop: '0.2rem' }}>
                      <input
                        type="checkbox"
                        checked={m.isAdvance}
                        onChange={(e) =>
                          setMilestones(milestones.map((x, j) => (i === j ? { ...x, isAdvance: e.target.checked } : x)))
                        }
                      />
                      <span>Advance</span>
                    </label>
                  </div>
                  <div>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm p-1.5"
                      title="Remove milestone"
                      style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', border: '1px solid #EF4444' }}
                      onClick={() => setMilestones(milestones.filter((_, j) => j !== i))}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.85rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() =>
                setMilestones([
                  ...milestones,
                  {
                    milestoneName: '',
                    paymentMethod: methods[0],
                    paymentPercentage: 0,
                    dueDate: '',
                    isAdvance: false,
                  },
                ])
              }
            >
              <Plus size={14} /> Add Milestone
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={totalPercentage !== 100 || busy}
              onClick={() =>
                run(() =>
                  apiClient.put(`/purchase-orders/${po.poId}/payment-schedules`, { milestones }),
                )
              }
            >
              <Save size={14} /> Save Complete Schedule ({totalPercentage}%)
            </button>
          </div>
        </fieldset>
      </div>

      {/* SECTION 4: Payment Decisions and Evidence */}
      <div
        style={{
          padding: '1rem',
          background: 'rgba(15, 23, 42, 0.5)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1rem',
        }}
      >
        <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.85rem' }}>
          Payment Decisions & Supporting Evidence
        </h4>
        <div style={{ marginBottom: '0.75rem', maxWidth: '400px' }}>
          <Field
            label="Reason for Payment Decision / PO Amendment"
            placeholder="e.g. Advance wire settled via CBE ref #998231"
            value={reason}
            onChange={setReason}
          />
        </div>
        {(po.paymentSchedules || []).flatMap((s: any) =>
          (s.transactions || []).map((t: any) => (
            <div
              key={t.paymentTransactionId}
              style={{
                padding: '0.65rem 0.85rem',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.8rem',
                marginBottom: '0.5rem',
              }}
            >
              <div>
                <strong>{s.milestoneName}</strong> · Ref: <span className="font-mono text-cyan-400">{t.paymentReference}</span> ·{' '}
                <strong className="text-emerald-400">{t.currency} {Number(t.amountPaid).toLocaleString()}</strong> ·{' '}
                <span className="badge badge-info">{t.status}</span>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() =>
                    setAttachment({
                      entityType: 'po_payment_transaction',
                      entityId: t.paymentTransactionId,
                      title: 'Payment Evidence',
                    })
                  }
                >
                  <Paperclip size={12} /> Evidence
                </button>
                {(t.status === 'INITIATED' ? ['CONFIRMED', 'REJECTED'] : t.status === 'CONFIRMED' ? ['REVERSED'] : []).map(
                  (status) => (
                    <button
                      key={status}
                      disabled={!canDecide || busy || !reason.trim()}
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() =>
                        run(() =>
                          apiClient.patch(`/purchase-orders/payments/transactions/${t.paymentTransactionId}/status`, {
                            status,
                            reason,
                          }),
                        )
                      }
                    >
                      {status}
                    </button>
                  ),
                )}
              </div>
            </div>
          )),
        )}
      </div>

      {/* SECTION 5: Applicable Compliance Checklist & Permits */}
      <div
        style={{
          padding: '1rem',
          background: 'rgba(15, 23, 42, 0.5)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1rem',
        }}
      >
        <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.85rem' }}>
          Applicable Regulatory Checklist & Import Permits
        </h4>
        {checklist.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.85rem' }}>
            {checklist.map((c, i) => (
              <div key={i} style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={14} color="var(--accent-cyan)" />
                <strong>{c.type}</strong> — {c.checkpoint} — <span className="badge badge-outline">{c.status}</span>
                {c.evidenceRequired && <span className="text-gray-400 text-xs">(Attachment required)</span>}
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            No blocking requirements configured for this destination and mode.
          </p>
        )}

        {(po.complianceRecords || []).map((r: any) => (
          <div
            key={r.complianceRecordId}
            style={{
              padding: '0.65rem 0.85rem',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.8rem',
              marginBottom: '0.5rem',
            }}
          >
            <div>
              <strong>{r.requirementType}</strong> — <span className="badge badge-info">{r.status}</span> — Expires:{' '}
              {r.expiryDate ? new Date(r.expiryDate).toLocaleDateString() : 'Not specified'}
            </div>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() =>
                  setAttachment({
                    entityType: 'import_compliance',
                    entityId: r.complianceRecordId,
                    title: 'Permit / Registration Evidence',
                  })
                }
              >
                <Paperclip size={12} /> Evidence
              </button>
              {['PENDING', 'APPLIED', 'SUBMITTED'].includes(r.status) && (
                <button type="button" disabled={!canEdit || busy} className="btn btn-secondary btn-sm" onClick={() => setPermit({ ...r })}>
                  Edit
                </button>
              )}
              <button
                type="button"
                disabled={!canEdit}
                className="btn btn-secondary btn-sm"
                onClick={() =>
                  setPermit({
                    requirementType: r.requirementType,
                    issuingAuthority: r.issuingAuthority,
                    renewalOfId: r.complianceRecordId,
                    status: 'PENDING',
                  })
                }
              >
                Renew
              </button>
              {['SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED'].map((status) => (
                <button
                  type="button"
                  key={status}
                  className="btn btn-secondary btn-sm"
                  disabled={!hasPermission('PURCHASE_ORDERS_CONFIRM') || busy}
                  onClick={() =>
                    run(() =>
                      apiClient.patch(`/purchase-orders/compliance/${r.complianceRecordId}/status`, {
                        status,
                        notes: reason,
                      }),
                    )
                  }
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Register / Edit Permit Form */}
        <fieldset disabled={!canEdit || busy} style={{ border: 0, padding: 0, marginTop: '0.85rem' }}>
          <h5 style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-cyan)', marginBottom: '0.5rem' }}>
            {permit.complianceRecordId ? 'Edit Permit Record' : permit.renewalOfId ? 'Renew Permit Record' : 'Register Permit Record'}
          </h5>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.65rem' }}>
            {(permit.complianceRecordId
              ? ['applicationReference', 'documentReference']
              : ['requirementType', 'issuingAuthority', 'applicationReference', 'documentReference']
            ).map((k) => (
              <Field key={k} label={k} value={permit[k]} onChange={(v: string) => setPermit({ ...permit, [k]: v })} />
            ))}
            {['applicationDate', 'submissionDate', 'issueDate', 'expiryDate'].map((k) => (
              <Field key={k} label={k} type="date" value={permit[k]} onChange={(v: string) => setPermit({ ...permit, [k]: v })} />
            ))}
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            style={{ marginTop: '0.65rem' }}
            onClick={() =>
              run(async () => {
                if (permit.complianceRecordId) {
                  const fields = [
                    'applicationReference',
                    'documentReference',
                    'applicationDate',
                    'submissionDate',
                    'issueDate',
                    'expiryDate',
                    'notes',
                  ];
                  await apiClient.patch(
                    `/purchase-orders/compliance/${permit.complianceRecordId}`,
                    Object.fromEntries(fields.filter((k) => permit[k] != null && permit[k] !== '').map((k) => [k, permit[k]])),
                  );
                } else {
                  await apiClient.post(
                    `/purchase-orders/${po.poId}/compliance`,
                    Object.fromEntries(Object.entries(permit).filter(([, v]) => v !== '')),
                  );
                }
                setPermit({ requirementType: 'IMPORT_PERMIT', issuingAuthority: '', status: 'PENDING' });
              })
            }
          >
            Save Permit Record
          </button>
        </fieldset>
      </div>

      {/* SECTION 6: Contract Amendments */}
      <div
        style={{
          padding: '1rem',
          background: 'rgba(15, 23, 42, 0.5)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
        }}
      >
        <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.5rem' }}>
          Contract Amendment History
        </h4>
        {po.status === 'CONFIRMED' && canEdit && (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', marginBottom: '0.85rem' }}>
            <div style={{ flex: 1, maxWidth: '450px' }}>
              <Field
                label="Reason for Contract Amendment"
                placeholder="e.g. Supplier requested delivery lead time extension"
                value={reason}
                onChange={setReason}
              />
            </div>
            <button
              type="button"
              className="btn btn-warning btn-sm"
              style={{ background: '#f59e0b', color: '#fff', height: '36px', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              disabled={busy || !reason.trim()}
              onClick={() => run(() => apiClient.post(`/purchase-orders/${po.poId}/amendment`, { reason }))}
            >
              Reopen for Amendment and Reapproval
            </button>
          </div>
        )}
        {revisions.length ? (
          revisions.map((r) => (
            <div key={r.revision_id} style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <span>{r.created_at} — {r.reason}</span>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setDocument(r.document)}>
                View Previous Issued PO
              </button>
            </div>
          ))
        ) : (
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
            No formal amendments recorded. Initial contract issuance.
          </p>
        )}
      </div>

      {attachment && <EntityAttachmentsModal isOpen onClose={() => setAttachment(null)} {...attachment} />}
      {document && <ClientPODocumentModal data={document} onClose={() => setDocument(null)} />}
    </details>
  );
}
