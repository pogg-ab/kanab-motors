import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Clock,
  User,
  History,
  Check,
  X,
  FileCheck,
} from 'lucide-react';
import {
  api,
  ApprovalRequest,
  ApprovalPolicy,
  WorkflowType,
} from '../../api/client';

export const ApprovalsPage: React.FC = () => {
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [policies, setPolicies] = useState<ApprovalPolicy[]>([]);
  const [workflowTypes, setWorkflowTypes] = useState<WorkflowType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkflowType, setSelectedWorkflowType] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [search, setSearch] = useState('');

  // Decision Modal
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [decisionModalMode, setDecisionModalMode] = useState<'APPROVE' | 'REJECT' | 'AUDIT' | null>(null);
  const [decisionComments, setDecisionComments] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const [allReqs, policiesRes, typesRes] = await Promise.all([
        api.getAllApprovalRequests(),
        api.getApprovalPolicies(),
        api.getWorkflowTypes(),
      ]);
      setRequests(allReqs || []);
      setPolicies(policiesRes || []);
      setWorkflowTypes(typesRes || []);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to load approval workflow data');
    } finally {
      setLoading(false);
    }
  };

  const handleDecisionSubmit = async () => {
    if (!selectedRequest || !decisionModalMode || decisionModalMode === 'AUDIT') return;

    try {
      setActionLoading(true);
      setErrorMsg(null);
      const decision = decisionModalMode === 'APPROVE' ? 'APPROVED' : 'REJECTED';
      const res = await api.recordApprovalDecision(selectedRequest.approvalRequestId, {
        decision,
        comments: decisionComments || undefined,
      });

      setSuccessMsg(res.message || `Request #${selectedRequest.requestNumber} recorded as ${decision}`);
      setSelectedRequest(null);
      setDecisionModalMode(null);
      setDecisionComments('');
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to record approval decision');
    } finally {
      setActionLoading(false);
    }
  };

  // Filter requests
  const filteredRequests = requests.filter((req) => {
    const matchesWorkflow = selectedWorkflowType === 'ALL' || req.workflowTypeCode === selectedWorkflowType;
    const matchesStatus = statusFilter === 'ALL' || req.status === statusFilter;
    const matchesSearch =
      req.requestNumber.toLowerCase().includes(search.toLowerCase()) ||
      req.entityType.toLowerCase().includes(search.toLowerCase()) ||
      String(req.entityId).includes(search);
    return matchesWorkflow && matchesStatus && matchesSearch;
  });

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
  const approvedCount = requests.filter((r) => r.status === 'APPROVED').length;
  const rejectedCount = requests.filter((r) => r.status === 'REJECTED').length;

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
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(0, 210, 211, 0.2))',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f59e0b',
              }}
            >
              <ShieldCheck size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>Approval Workflow & Internal Controls</h1>
              <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.875rem' }}>
                KMSICAMS-6 Sub-module 3: Central Approval Engine, Multi-level Chains, Role Hierarchy & Retrofit Dispatcher (AW1–AW10)
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
          Refresh Queue
        </button>
      </div>

      {/* Notifications */}
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
      {successMsg && (
        <div
          style={{
            padding: '1rem',
            borderRadius: '8px',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#10b981',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <CheckCircle2 size={20} />
          <span>{successMsg}</span>
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
        <div style={{ padding: '1.25rem', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
          <div style={{ color: '#f59e0b', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 600 }}>
            Pending Queue Actions
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '0.5rem', color: '#f59e0b' }}>
            {pendingCount}
          </div>
        </div>

        <div style={{ padding: '1.25rem', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
          <div style={{ color: '#10b981', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 600 }}>
            Authorized & Finalized
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '0.5rem', color: '#10b981' }}>
            {approvedCount}
          </div>
        </div>

        <div style={{ padding: '1.25rem', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
          <div style={{ color: '#ef4444', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 600 }}>
            Rejected Requests
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '0.5rem', color: '#ef4444' }}>
            {rejectedCount}
          </div>
        </div>

        <div style={{ padding: '1.25rem', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <div style={{ color: 'var(--accent-cyan)', fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 600 }}>
            Active Approval Policies
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: '0.5rem', color: 'var(--accent-cyan)' }}>
            {policies.length} Policies
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
              placeholder="Search request #, entity type..."
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
            value={selectedWorkflowType}
            onChange={(e) => setSelectedWorkflowType(e.target.value)}
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
            <option value="ALL">All Workflow Types</option>
            {workflowTypes.map((wt) => (
              <option key={wt.workflowTypeCode} value={wt.workflowTypeCode}>
                {wt.workflowTypeName}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
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
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending Action</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Approval Requests Table */}
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Request #</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Workflow Type</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Entity Target</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center' }}>Level</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Requested By</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Requested At</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center' }}>Status</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    {loading ? 'Loading queue...' : 'No approval requests found matching your filter criteria.'}
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.approvalRequestId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                      {req.requestNumber}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {req.workflowType?.workflowTypeName || req.workflowTypeCode}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Code: {req.workflowTypeCode}
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '0.2rem 0.5rem',
                          background: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '4px',
                          fontFamily: 'monospace',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {req.entityType} #{req.entityId}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <span
                        style={{
                          padding: '0.2rem 0.6rem',
                          borderRadius: '12px',
                          background: 'rgba(0, 210, 211, 0.1)',
                          color: 'var(--accent-cyan)',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                        }}
                      >
                        L{req.currentLevel}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                      {req.requester?.fullName || `User #${req.requestedBy || 1}`}
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {new Date(req.requestedAt).toLocaleString()}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '0.25rem 0.65rem',
                          borderRadius: '20px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background:
                            req.status === 'APPROVED'
                              ? 'rgba(16, 185, 129, 0.15)'
                              : req.status === 'PENDING'
                              ? 'rgba(245, 158, 11, 0.15)'
                              : 'rgba(239, 68, 68, 0.15)',
                          color:
                            req.status === 'APPROVED'
                              ? '#10b981'
                              : req.status === 'PENDING'
                              ? '#f59e0b'
                              : '#ef4444',
                          border: `1px solid ${
                            req.status === 'APPROVED'
                              ? 'rgba(16, 185, 129, 0.3)'
                              : req.status === 'PENDING'
                              ? 'rgba(245, 158, 11, 0.3)'
                              : 'rgba(239, 68, 68, 0.3)'
                          }`,
                        }}
                      >
                        {req.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        {req.status === 'PENDING' ? (
                          <>
                            <button
                              onClick={() => {
                                setSelectedRequest(req);
                                setDecisionModalMode('APPROVE');
                              }}
                              title="Approve Request"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                padding: '0.4rem 0.75rem',
                                borderRadius: '6px',
                                border: '1px solid rgba(16, 185, 129, 0.4)',
                                background: 'rgba(16, 185, 129, 0.15)',
                                color: '#10b981',
                                cursor: 'pointer',
                                fontWeight: 600,
                                fontSize: '0.75rem',
                              }}
                            >
                              <Check size={14} />
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                setSelectedRequest(req);
                                setDecisionModalMode('REJECT');
                              }}
                              title="Reject Request"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                padding: '0.4rem 0.75rem',
                                borderRadius: '6px',
                                border: '1px solid rgba(239, 68, 68, 0.4)',
                                background: 'rgba(239, 68, 68, 0.15)',
                                color: '#ef4444',
                                cursor: 'pointer',
                                fontWeight: 600,
                                fontSize: '0.75rem',
                              }}
                            >
                              <X size={14} />
                              Reject
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedRequest(req);
                              setDecisionModalMode('AUDIT');
                            }}
                            title="View Audit Chain"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              padding: '0.4rem 0.75rem',
                              borderRadius: '6px',
                              border: '1px solid var(--border-color)',
                              background: 'var(--bg-primary)',
                              color: 'var(--text-secondary)',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                            }}
                          >
                            <History size={14} />
                            Audit
                          </button>
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

      {/* DECISION / AUDIT MODAL */}
      {selectedRequest && decisionModalMode && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: '16px',
              border: '1px solid var(--border-color)',
              maxWidth: '560px',
              width: '100%',
              padding: '2rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <ShieldCheck
                  color={
                    decisionModalMode === 'APPROVE'
                      ? '#10b981'
                      : decisionModalMode === 'REJECT'
                      ? '#ef4444'
                      : 'var(--accent-cyan)'
                  }
                  size={24}
                />
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
                  {decisionModalMode === 'APPROVE'
                    ? 'Confirm Approval Decision'
                    : decisionModalMode === 'REJECT'
                    ? 'Confirm Rejection Decision'
                    : `Decision Audit Trail: #${selectedRequest.requestNumber}`}
                </h3>
              </div>
              <button
                onClick={() => {
                  setSelectedRequest(null);
                  setDecisionModalMode(null);
                }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>Request: <strong>{selectedRequest.requestNumber}</strong></div>
                <div>Level: <strong>Level {selectedRequest.currentLevel}</strong></div>
                <div>Workflow: <strong>{selectedRequest.workflowType?.workflowTypeName}</strong></div>
                <div>Target: <strong>{selectedRequest.entityType} #{selectedRequest.entityId}</strong></div>
              </div>
            </div>

            {decisionModalMode === 'AUDIT' ? (
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  Execution Chain History:
                </div>
                {selectedRequest.actions && selectedRequest.actions.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {selectedRequest.actions.map((act) => (
                      <div
                        key={act.approvalActionId}
                        style={{
                          padding: '0.75rem 1rem',
                          background: 'var(--bg-primary)',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          fontSize: '0.85rem',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <span style={{ fontWeight: 700, color: act.decision === 'APPROVED' ? '#10b981' : '#ef4444' }}>
                            Level {act.approvalLevel}: {act.decision}
                          </span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                            {new Date(act.decidedAt).toLocaleString()}
                          </span>
                        </div>
                        <div style={{ color: 'var(--text-secondary)' }}>
                          Reviewer: {act.decider?.fullName || `User #${act.decidedBy || 1}`}
                        </div>
                        {act.comments && (
                          <div style={{ marginTop: '0.25rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            "{act.comments}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No historical action records.</div>
                )}
              </div>
            ) : (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  Decision Audit Comments & Notes
                </label>
                <textarea
                  value={decisionComments}
                  onChange={(e) => setDecisionComments(e.target.value)}
                  placeholder="Enter verification notes, check details or compliance remarks..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem',
                    outline: 'none',
                    resize: 'none',
                  }}
                />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button
                type="button"
                onClick={() => {
                  setSelectedRequest(null);
                  setDecisionModalMode(null);
                }}
                style={{
                  padding: '0.625rem 1.25rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>

              {decisionModalMode !== 'AUDIT' && (
                <button
                  type="button"
                  onClick={handleDecisionSubmit}
                  disabled={actionLoading}
                  style={{
                    padding: '0.625rem 1.5rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: decisionModalMode === 'APPROVE' ? '#10b981' : '#ef4444',
                    color: '#fff',
                    fontWeight: 700,
                    cursor: actionLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {actionLoading
                    ? 'Processing...'
                    : decisionModalMode === 'APPROVE'
                    ? 'Authorize & Dispatch'
                    : 'Confirm Rejection'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ApprovalsPage;
