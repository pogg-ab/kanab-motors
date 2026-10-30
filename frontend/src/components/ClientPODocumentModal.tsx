import React, { useRef } from 'react';
import { Printer, Download, X, Building2, CheckCircle2 } from 'lucide-react';

interface ClientPODocumentModalProps {
  data: any;
  onClose: () => void;
}

export const ClientPODocumentModal: React.FC<ClientPODocumentModalProps> = ({ data, onClose }) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  if (!data) return null;

  return (
    <div className="modal-backdrop">
      <div
        className="modal-content"
        style={{
          maxWidth: '950px',
          width: '95%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          background: '#ffffff',
          color: '#1e293b',
        }}
      >
        {/* Modal Action Bar (Hidden on print) */}
        <div
          className="no-print"
          style={{
            padding: '0.75rem 1.25rem',
            background: '#0f172a',
            color: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTopLeftRadius: '8px',
            borderTopRightRadius: '8px',
          }}
        >
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-cyan-400">Client-Format Official Document</span>
            <span className="text-xs text-gray-400">· PO Ref: {data.poNumber}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="btn btn-sm"
              style={{ background: '#0284c7', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Printer size={14} />
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={onClose}
              className="btn btn-sm"
              style={{ background: '#334155', color: '#fff' }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Printable Document Container */}
        <div
          ref={printRef}
          className="printable-area"
          style={{
            padding: '2.5rem',
            overflowY: 'auto',
            fontFamily: 'Arial, Helvetica, sans-serif',
            fontSize: '11px',
            lineHeight: 1.4,
            color: '#0f172a',
            background: '#ffffff',
          }}
        >
          {/* Header Title & Ref */}
          <div style={{ borderBottom: '2px solid #0284c7', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h1 style={{ fontSize: '22px', fontWeight: 'bold', color: '#0f172a', margin: 0, letterSpacing: '0.05em' }}>
                  PURCHASE ORDER
                </h1>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
                  International Import Commercial Order & Specification Document
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#0284c7', fontFamily: 'monospace' }}>
                  {data.poNumber}
                </div>
                <div style={{ fontSize: '11px', color: '#334155', marginTop: '2px' }}>
                  Date: <strong>{data.poDate}</strong>
                </div>
                <div style={{ fontSize: '10px', color: '#64748b' }}>
                  Status: <strong>{data.status}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Importer and Exporter 2-Column Block */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1.5rem',
              marginBottom: '1.25rem',
              padding: '0.85rem',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
            }}
          >
            {/* Importer Details */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#0284c7', textTransform: 'uppercase', marginBottom: '4px' }}>
                Importer / Buyer Information
              </div>
              <div style={{ fontWeight: 'bold', fontSize: '12px' }}>{data.importer.companyName}</div>
              <div>{data.importer.address}</div>
              <div>{data.importer.city}, {data.importer.country}</div>
              <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px dashed #cbd5e1' }}>
                <div>Importer IEC No: <strong>{data.importer.iecNo}</strong></div>
                <div>Importer AD Code: <strong>{data.importer.adCode}</strong></div>
                <div>TIN / Tax ID: <strong>{data.importer.taxId}</strong></div>
                <div>Contact: {data.importer.phone} · {data.importer.email}</div>
              </div>
            </div>

            {/* Exporter Details */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#0284c7', textTransform: 'uppercase', marginBottom: '4px' }}>
                Exporter / Supplier Information
              </div>
              <div style={{ fontWeight: 'bold', fontSize: '12px' }}>{data.supplier.supplierName}</div>
              <div>{data.supplier.address}</div>
              <div>Country: <strong>{data.supplier.country}</strong></div>
              <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px dashed #cbd5e1' }}>
                <div>Exporter IEC No: <strong>{data.supplier.exporterIecNo || 'N/A'}</strong></div>
                <div>Exporter AD Code: <strong>{data.supplier.exporterAdCode || 'N/A'}</strong></div>
                <div>Attn: {data.supplier.contactPerson}</div>
                <div>Email / Phone: {data.supplier.email} · {data.supplier.phone}</div>
              </div>
            </div>
          </div>

          {/* Commercial & Shipping Conditions Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '0.65rem',
              marginBottom: '1.25rem',
              padding: '0.75rem',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              fontSize: '10.5px',
            }}
          >
            <div>
              <span style={{ color: '#64748b' }}>Incoterms:</span>
              <div style={{ fontWeight: 'bold' }}>{data.commercialTerms.incoterms}</div>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Mode of Shipment:</span>
              <div style={{ fontWeight: 'bold' }}>{data.commercialTerms.modeOfShipment}</div>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Port of Loading:</span>
              <div style={{ fontWeight: 'bold' }}>{data.commercialTerms.portOfLoading}</div>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Port of Discharge:</span>
              <div style={{ fontWeight: 'bold' }}>{data.commercialTerms.portOfDischarge}</div>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Country of Origin:</span>
              <div style={{ fontWeight: 'bold' }}>{data.commercialTerms.countryOfOrigin}</div>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Delivery Lead Time:</span>
              <div style={{ fontWeight: 'bold' }}>{data.commercialTerms.deliveryLeadTimeDays} Days</div>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Lead Time Trigger:</span>
              <div style={{ fontWeight: 'bold' }}>{data.commercialTerms.leadTimeTrigger}</div>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Expected Delivery Date:</span>
              <div style={{ fontWeight: 'bold' }}>{data.commercialTerms.expectedDeliveryDate}</div>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <span style={{ color: '#64748b' }}>Agreed Payment Terms:</span>
              <div style={{ fontWeight: 'bold' }}>{data.commercialTerms.paymentTerms}</div>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <span style={{ color: '#64748b' }}>Packing Requirements:</span>
              <div style={{ fontWeight: 'bold' }}>{data.commercialTerms.packing}</div>
            </div>
          </div>

          {/* Line Items Table */}
          <div style={{ marginBottom: '1.25rem' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '10.5px',
                border: '1px solid #cbd5e1',
              }}
            >
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', textAlign: 'left' }}>
                  <th style={{ padding: '6px 8px', width: '5%' }}>Sl.</th>
                  <th style={{ padding: '6px 8px', width: '15%' }}>Item Code</th>
                  <th style={{ padding: '6px 8px', width: '35%' }}>Description of Goods</th>
                  <th style={{ padding: '6px 8px', width: '10%' }}>HSN/SAC</th>
                  <th style={{ padding: '6px 8px', width: '8%', textAlign: 'right' }}>Qty</th>
                  <th style={{ padding: '6px 8px', width: '7%' }}>UOM</th>
                  <th style={{ padding: '6px 8px', width: '10%', textAlign: 'right' }}>Unit Rate</th>
                  <th style={{ padding: '6px 8px', width: '10%', textAlign: 'right' }}>Amount ({data.currency})</th>
                </tr>
              </thead>
              <tbody>
                {data.lineItems?.map((line: any) => (
                  <tr key={line.slNo} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '6px 8px' }}>{line.slNo}</td>
                    <td style={{ padding: '6px 8px', fontFamily: 'monospace', fontWeight: 'bold' }}>{line.itemCode}</td>
                    <td style={{ padding: '6px 8px' }}>{line.description}</td>
                    <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>{line.hsnSacCode}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 'bold' }}>{line.quantity}</td>
                    <td style={{ padding: '6px 8px' }}>{line.uom}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace' }}>
                      {Number(line.unitRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>
                      {Number(line.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f8fafc', fontWeight: 'bold', borderTop: '2px solid #0284c7' }}>
                  <td colSpan={4} style={{ padding: '8px' }}>
                    Total Units: {data.lineItems?.reduce((s: number, l: any) => s + l.quantity, 0)}
                  </td>
                  <td colSpan={3} style={{ padding: '8px', textAlign: 'right' }}>
                    Grand Total ({data.currency}):
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'monospace', fontSize: '13px', color: '#0284c7' }}>
                    {data.currency} {Number(data.grandTotal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Amount in Words (POX-06) */}
          <div
            style={{
              padding: '0.65rem 0.85rem',
              background: '#f0f9ff',
              border: '1px solid #bae6fd',
              borderRadius: '6px',
              marginBottom: '1.25rem',
              fontSize: '11px',
            }}
          >
            <span style={{ color: '#0369a1', fontWeight: 'bold' }}>Amount in Words: </span>
            <span style={{ fontWeight: 'bold', color: '#0f172a' }}>{data.amountInWords}</span>
          </div>

          {/* Importer Bank Details (POX-03) */}
          {data.bankDetails && (
            <div
              style={{
                padding: '0.75rem',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                marginBottom: '1.25rem',
                fontSize: '10.5px',
                background: '#fafafa',
              }}
            >
              <div style={{ fontWeight: 'bold', color: '#0284c7', textTransform: 'uppercase', marginBottom: '4px' }}>
                Designated Importer Bank Details for Forex / Remittance
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                <div>Bank Name: <strong>{data.bankDetails.bankName}</strong></div>
                <div>Account Name: <strong>{data.bankDetails.accountName}</strong></div>
                <div>Account Number: <strong style={{ fontFamily: 'monospace' }}>{data.bankDetails.accountNumber}</strong></div>
                <div>Branch: {data.bankDetails.bankBranch || 'N/A'}</div>
                <div>IFSC Code: <strong style={{ fontFamily: 'monospace' }}>{data.bankDetails.ifscCode || 'N/A'}</strong></div>
                <div>SWIFT / BIC Code: <strong style={{ fontFamily: 'monospace' }}>{data.bankDetails.swiftCode || 'N/A'}</strong></div>
              </div>
            </div>
          )}

          {/* Standard Contractual Conditions (POX-07) */}
          <div style={{ marginBottom: '1.75rem', fontSize: '10px', color: '#334155' }}>
            <div style={{ fontWeight: 'bold', color: '#0f172a', textTransform: 'uppercase', marginBottom: '3px' }}>
              Standard Remarks & Contractual Conditions
            </div>
            <ol style={{ paddingLeft: '1.25rem', margin: 0 }}>
              {data.standardRemarks?.map((remark: string, idx: number) => (
                <li key={idx} style={{ marginBottom: '2px' }}>{remark}</li>
              ))}
            </ol>
            {data.inspectionRequirements && (
              <div style={{ marginTop: '4px' }}>
                <strong>Inspection Requirement:</strong> {data.inspectionRequirements}
              </div>
            )}
            {data.warrantyTerms && (
              <div style={{ marginTop: '2px' }}>
                <strong>Warranty Terms:</strong> {data.warrantyTerms}
              </div>
            )}
          </div>

          {/* Signature and Stamp Blocks */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '2rem',
              paddingTop: '1.5rem',
              borderTop: '1px solid #cbd5e1',
            }}
          >
            <div>
              <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '2.5rem' }}>
                For {data.importer.companyName} (Authorized Signatory)
              </div>
              <div style={{ borderTop: '1px dashed #64748b', width: '80%', paddingTop: '4px', fontSize: '10px', color: '#64748b' }}>
                Authorized Signature & Official Seal
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '2.5rem' }}>
                Accepted & Confirmed by {data.supplier.supplierName}
              </div>
              <div
                style={{
                  borderTop: '1px dashed #64748b',
                  width: '80%',
                  marginLeft: 'auto',
                  paddingTop: '4px',
                  fontSize: '10px',
                  color: '#64748b',
                }}
              >
                Exporter Signature & Stamp
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

