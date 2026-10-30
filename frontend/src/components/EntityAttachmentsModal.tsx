import React, { useState, useEffect } from 'react';
import { api, Attachment } from '../api/client';
import { Paperclip, Upload, Trash2, Download, X, FileText, CheckCircle, AlertCircle } from 'lucide-react';

interface EntityAttachmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: 'booking' | 'payment' | 'refund' | 'spare_parts_sale';
  entityId: string;
  title: string;
  subtitle?: string;
  allowedDocTypes?: string[];
}

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
      setError(err?.response?.data?.message || 'Failed to load attachments');
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
      setSuccess('Attachment uploaded successfully');
      setSelectedFile(null);
      await fetchAttachments();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to upload attachment');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (attachmentId: string) => {
    if (!window.confirm('Are you sure you want to delete this attachment?')) return;
    try {
      await api.deleteEntityAttachment(attachmentId);
      setSuccess('Attachment deleted');
      await fetchAttachments();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to delete attachment');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
              <Paperclip className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-white">{title}</h3>
              {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-lg text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Upload Form */}
          <form onSubmit={handleUpload} className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-xl space-y-3">
            <div className="font-medium text-sm text-slate-200 flex items-center gap-2">
              <Upload className="w-4 h-4 text-indigo-400" />
              <span>Upload New Attachment</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Document Type / Label</label>
                {allowedDocTypes && allowedDocTypes.length > 0 ? (
                  <select
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
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
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                    value={documentType}
                    placeholder="e.g. Deposit Slip, Authorization"
                    onChange={(e) => setDocumentType(e.target.value)}
                  />
                )}
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Choose File</label>
                <input
                  type="file"
                  className="w-full text-xs text-slate-300 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={!selectedFile || uploading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition flex items-center gap-2 shadow"
              >
                {uploading ? (
                  <>Uploading...</>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    Upload File
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Attachments List */}
          <div>
            <h4 className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-3">
              Attached Documents ({attachments.length})
            </h4>
            {loading ? (
              <div className="py-8 text-center text-slate-400 text-sm">Loading attachments...</div>
            ) : attachments.length === 0 ? (
              <div className="py-8 border border-dashed border-slate-800 rounded-xl text-center text-slate-500 text-sm">
                No attachments uploaded yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-xl overflow-hidden bg-slate-950/30">
                {attachments.map((att) => (
                  <div key={att.attachmentId} className="p-3.5 flex items-center justify-between hover:bg-slate-800/40 transition">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 bg-slate-800 text-slate-300 rounded-lg shrink-0">
                        <FileText className="w-4 h-4 text-indigo-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-200 truncate">{att.fileName}</p>
                        <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                          {att.documentType && (
                            <span className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 rounded text-[11px] font-medium">
                              {att.documentType}
                            </span>
                          )}
                          <span>{formatFileSize(att.fileSizeBytes)}</span>
                          <span>•</span>
                          <span>{new Date(att.uploadedAt).toLocaleDateString()}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={att.filePath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition"
                        title="Download / View"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => handleDelete(att.attachmentId)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
