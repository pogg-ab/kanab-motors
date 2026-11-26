import React, { useState, useEffect } from 'react';
import { api, Attachment, resolveDocumentUrl } from '../api/client';
import { Paperclip, Upload, Trash2, Download, ExternalLink, X, FileText, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';

interface EntityAttachmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: 'shipment_freight_quotation' | 'shipment_insurance' | 'shipment_container' | 'shipment_cargo_tracking' | 'booking' | 'booking_draft' | 'payment' | 'refund' | 'spare_parts_sale' | 'invoice' | 'purchase_order' | 'import_compliance' | 'po_payment_transaction';
  entityId: string;
  title: string;
  subtitle?: string;
  allowedDocTypes?: string[];
}

const decodeUtf8Safe = (name: string): string => {
  if (!name) return '';
  try {
    const bytes = new Uint8Array([...name].map((c) => c.charCodeAt(0) & 0xff));
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return decoded && !decoded.includes('\ufffd') ? decoded : name;
  } catch {
    return name;
  }
};

export const EntityAttachmentsModal: React.FC<EntityAttachmentsModalProps> = ({
  isOpen,
  onClose,
  entityType,
  entityId,
  title,
  subtitle,
  allowedDocTypes,
}) => {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<string>(allowedDocTypes?.[0] || 'Supporting Document');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchAttachments = async () => {
    if (!entityId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getEntityAttachments(entityType, entityId);
      setAttachments(data || []);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load attachments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && entityId) {
      fetchAttachments();
      setSelectedFile(null);
      setError(null);
      setSuccess(null);
    }
  }, [isOpen, entityId, entityType]);

  if (!isOpen) return null;

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    setError(null);
    setSuccess(null);
    try {
      await api.uploadEntityAttachment(entityType, entityId, selectedFile, documentType);
      setSuccess('Attachment uploaded successfully!');
      setSelectedFile(null);
      await fetchAttachments();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to upload attachment');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (attachmentId: string) => {
    if (!window.confirm('Are you sure you want to delete this attachment?')) return;
    try {
      await api.deleteEntityAttachment(attachmentId);
      setSuccess('Attachment deleted successfully');
      await fetchAttachments();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to delete attachment');
    }
  };

  const formatFileSize = (bytes?: number | string) => {
    const numBytes = Number(bytes || 0);
    if (!bytes) return 'N/A';
    if (numBytes < 1024) return `${numBytes} B`;
    if (numBytes < 1024 * 1024) return `${(numBytes / 1024).toFixed(1)} KB`;
    return `${(numBytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="modal-backdrop" style={{ zIndex: 1200, overflowY: 'auto', padding: '1.5rem 0' }}>
      <div className="modal-content" style={{ maxWidth: '680px', width: '95%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', margin: 'auto' }}>
        {/* Header */}
        <div className="modal-header" style={{ flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                background: 'rgba(0, 210, 211, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-cyan)',
              }}
            >
              <Paperclip size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                {title}
              </h3>
              {subtitle && (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '0.35rem 0.65rem' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', flex: 1 }}>
          {error && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid var(--accent-rose)',
                color: 'var(--accent-rose)',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid var(--accent-emerald)',
                color: 'var(--accent-emerald)',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <CheckCircle2 size={16} />
              <span>{success}</span>
            </div>
          )}

          {/* Upload Form */}
          <form
            onSubmit={handleUpload}
            style={{
              padding: '1rem',
              background: 'var(--bg-secondary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <Upload size={15} color="var(--accent-cyan)" />
              <span>Upload New Supporting Document</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '0.85rem' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Document Type / Label</label>
                {allowedDocTypes && allowedDocTypes.length > 0 ? (
                  <select
                    className="select-field"
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                  >
                    {allowedDocTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    className="input-field"
                    value={documentType}
                    placeholder="e.g. Deposit Slip, ID Copy, PO"
                    onChange={(e) => setDocumentType(e.target.value)}
                  />
                )}
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.75rem' }}>Choose File (PDF, Image, Doc)</label>
                <input
                  type="file"
                  className="input-field"
                  style={{ padding: '0.4rem', fontSize: '0.75rem' }}
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                disabled={!selectedFile || uploading}
                className="btn btn-cyan"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', padding: '0.45rem 0.9rem' }}
              >
                {uploading ? (
                  <>
                    <Loader2 size={14} className="spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload size={14} />
                    <span>Upload Attachment</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Attachments List */}
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.65rem' }}>
              Attached Documents ({attachments.length})
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <Loader2 size={20} className="spin" style={{ margin: '0 auto 0.5rem auto', display: 'block' }} />
                Loading attachments...
              </div>
            ) : attachments.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '2rem',
                  border: '1px dashed var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-muted)',
                  fontSize: '0.82rem',
                }}
              >
                No documents uploaded yet for this record.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {attachments.map((att) => (
                  <div
                    key={att.attachmentId}
                    style={{
                      padding: '0.75rem 1rem',
                      background: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.75rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '6px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--accent-cyan)',
                          flexShrink: 0,
                        }}
                      >
                        <FileText size={16} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {decodeUtf8Safe(att.fileName)}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                          {att.documentType && (
                            <span className="badge badge-subtle" style={{ fontSize: '0.62rem' }}>
                              {att.documentType}
                            </span>
                          )}
                          <span>{formatFileSize(att.fileSizeBytes)}</span>
                          <span>•</span>
                          <span>{new Date(att.uploadedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                      <a
                        href={resolveDocumentUrl(att.filePath)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', padding: '0.3rem 0.55rem' }}
                        title="Open file in new tab"
                      >
                        <ExternalLink size={13} />
                        <span>View</span>
                      </a>
                      <a
                        href={resolveDocumentUrl(att.filePath)}
                        download={decodeUtf8Safe(att.fileName)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', padding: '0.3rem 0.55rem' }}
                        title={`Download ${decodeUtf8Safe(att.fileName)}`}
                      >
                        <Download size={13} />
                        <span>Download</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDelete(att.attachmentId)}
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', padding: '0.3rem 0.55rem', color: 'var(--accent-rose)' }}
                        title="Delete file"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', padding: '0.85rem 1.25rem', flexShrink: 0 }}>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
