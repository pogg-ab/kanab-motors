import React, { useState, useEffect } from 'react';
import {
  FolderOpen,
  Search,
  Filter,
  FileText,
  FileCheck,
  Building,
  Car,
  User,
  RefreshCw,
  Download,
  AlertCircle,
  Tag,
} from 'lucide-react';
import {
  api,
  UnifiedDocumentItem,
  DocumentTypeRef,
} from '../../api/client';

export const DocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<UnifiedDocumentItem[]>([]);
  const [docTypes, setDocTypes] = useState<DocumentTypeRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const [docsRes, typesRes] = await Promise.all([
        api.getAllDocuments(),
        api.getDocumentTypes(),
      ]);
      setDocuments(docsRes || []);
      setDocTypes(typesRes || []);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to load document center');
    } finally {
      setLoading(false);
    }
  };

  const filteredDocs = documents.filter((doc) => {
    const matchesEntity = entityFilter === 'ALL' || doc.entityType === entityFilter;
    const matchesType = typeFilter === 'ALL' || doc.documentTypeCode === typeFilter;
    const matchesSearch =
      (doc.fileName && doc.fileName.toLowerCase().includes(search.toLowerCase())) ||
      (doc.documentTypeName && doc.documentTypeName.toLowerCase().includes(search.toLowerCase())) ||
      String(doc.entityId).includes(search);
    return matchesEntity && matchesType && matchesSearch;
  });

  return (
    <div style={{ padding: '2rem', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(0, 210, 211, 0.2))',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#3b82f6',
              }}
            >
              <FolderOpen size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>Unified Document Center</h1>
              <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.875rem' }}>
                KMSICAMS-6 Sub-module 4: Document Reference Types & Cross-Entity Document Registry (DA1–DA6)
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={loadData}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.625rem 1rem',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
          Refresh
        </button>
      </div>

      {errorMsg && (
        <div
          style={{
            padding: '1rem',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <AlertCircle size={20} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem',
        }}
      >
        <div style={{ padding: '1.25rem', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 600 }}>
            Total Registered Documents
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '0.5rem', color: 'var(--text-primary)' }}>
            {documents.length} Files
          </div>
        </div>

        <div style={{ padding: '1.25rem', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div style={{ color: '#3b82f6', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 600 }}>
            Formal Document Types
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '0.5rem', color: '#3b82f6' }}>
            {docTypes.length} Types (DA1)
          </div>
        </div>

        <div style={{ padding: '1.25rem', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div style={{ color: '#10b981', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 600 }}>
            Entity Scope Coverage
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '0.5rem', color: '#10b981' }}>
            4 Modules
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', gap: '0.75rem', flex: 1, minWidth: '300px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '0.5rem 0.75rem',
              flex: 1,
            }}
          >
            <Search size={16} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search file name, type, entity ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                outline: 'none',
                width: '100%',
                fontSize: '0.875rem',
              }}
            />
          </div>

          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              borderRadius: '8px',
              padding: '0.5rem 1rem',
              outline: 'none',
              fontSize: '0.875rem',
            }}
          >
            <option value="ALL">All Entity Types</option>
            <option value="customer">Customer KYC</option>
            <option value="shipment">Shipment / Import</option>
            <option value="delivery">Delivery Handover</option>
            <option value="vehicle_unit">Vehicle Units</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              borderRadius: '8px',
              padding: '0.5rem 1rem',
              outline: 'none',
              fontSize: '0.875rem',
            }}
          >
            <option value="ALL">All Document Types</option>
            {docTypes.map((dt) => (
              <option key={dt.documentTypeCode} value={dt.documentTypeCode}>
                {dt.documentTypeName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Documents Table */}
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          overflow: 'hidden',
          marginBottom: '2rem',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>File Name</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Document Type (DA1)</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Entity Scope</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Uploaded By</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Date Added</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    {loading ? 'Loading document registry...' : 'No attachments found matching criteria.'}
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => (
                  <tr key={doc.attachmentId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileText size={16} color="var(--accent-cyan)" />
                        <span>{doc.fileName}</span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '12px',
                          background: 'rgba(59, 130, 246, 0.1)',
                          color: '#3b82f6',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                        }}
                      >
                        {doc.documentTypeName || doc.documentTypeCode || 'General Document'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '0.8rem',
                          padding: '0.2rem 0.5rem',
                          background: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '4px',
                        }}
                      >
                        {doc.entityType} #{doc.entityId}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                      {doc.uploadedByName || 'System Staff'}
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {new Date(doc.uploadedAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <a
                        href={doc.filePath}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: '0.4rem 0.75rem',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-primary)',
                          color: 'var(--accent-cyan)',
                          textDecoration: 'none',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                        }}
                      >
                        <Download size={13} />
                        View / Download
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Formal Document Type Reference Cards */}
      <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.05rem', fontWeight: 700 }}>
          Formal Document Types Reference (DA1 & Validation Rules)
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
          {docTypes.map((dt) => (
            <div
              key={dt.documentTypeCode}
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{dt.documentTypeName}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{dt.documentTypeCode}</div>
              </div>
              <span
                style={{
                  fontSize: '0.7rem',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '10px',
                  background: dt.restrictedToEntityType ? 'rgba(0, 210, 211, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                  color: dt.restrictedToEntityType ? 'var(--accent-cyan)' : 'var(--text-muted)',
                }}
              >
                {dt.restrictedToEntityType ? `Only: ${dt.restrictedToEntityType}` : 'Universal'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
export default DocumentsPage;
