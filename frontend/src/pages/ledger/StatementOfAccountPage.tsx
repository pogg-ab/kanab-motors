import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Calendar,
  FileText,
  Filter,
  PlusCircle,
  AlertCircle,
  CheckCircle2,
  X,
  Printer,
  Download,
  Building2,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
import {
  api,
  Customer,
  StatementOfAccount,
  LedgerTransaction,
} from '../../api/client';

export const StatementOfAccountPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [statement, setStatement] = useState<StatementOfAccount | null>(null);
  const [loading, setLoading] = useState(false);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState('');

  // Manual Adjustment Modal (Story L9)
  const [isAdjOpen, setIsAdjOpen] = useState(false);
  const [adjForm, setAdjForm] = useState({
    type: 'CREDIT' as 'CREDIT' | 'DEBIT',
    amount: '',
    reason: '',
    referenceNumber: '',
  });
  const [adjError, setAdjError] = useState<string | null>(null);
  const [submittingAdj, setSubmittingAdj] = useState(false);

  const fetchCustomers = async () => {
    try {
      const res = await api.getCustomers({ limit: 100 });
      setCustomers(res.items);
      if (res.items.length > 0 && !selectedCustomerId) {
        setSelectedCustomerId(res.items[0].customerId);
      }
    } catch (err) {
      console.error('Failed to load customers:', err);
    }
  };

  const fetchStatement = async () => {
    if (!selectedCustomerId) return;
    setLoading(true);
    try {
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (txTypeFilter) params.transactionType = txTypeFilter;

      const data = await api.getStatement(selectedCustomerId, params);
      setStatement(data);
    } catch (err) {
      console.error('Failed to load statement of account:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    if (selectedCustomerId) {
      fetchStatement();
    }
  }, [selectedCustomerId, startDate, endDate, txTypeFilter]);

  const handlePostAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdjError(null);
    const amt = parseFloat(adjForm.amount);
    if (isNaN(amt) || amt <= 0) {
      setAdjError('Amount must be a valid positive number');
      return;
    }
    if (!adjForm.reason || adjForm.reason.trim().length < 5) {
      setAdjError('A detailed reason (min 5 characters) is required for audit compliance');
      return;
    }

    setSubmittingAdj(true);
    try {
      await api.postAdjustment(selectedCustomerId, {
        type: adjForm.type,
        amount: amt,
        reason: adjForm.reason.trim(),
        referenceNumber: adjForm.referenceNumber.trim() || undefined,
      });
      setIsAdjOpen(false);
      setAdjForm({ type: 'CREDIT', amount: '', reason: '', referenceNumber: '' });
      fetchStatement();
    } catch (err: any) {
      setAdjError(err.response?.data?.message || 'Failed to post adjustment');
    } finally {
      setSubmittingAdj(false);
    }
  };

  const selectedCustomer = customers.find((c) => c.customerId === selectedCustomerId);

  return (
    <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
      {/* ---------------------------------------------------- */}
      {/* PRINT-ONLY CORPORATE LETTERHEAD & CUSTOMER INFO      */}
      {/* ---------------------------------------------------- */}
      <div className="print-only" style={{ marginBottom: '1.5rem', borderBottom: '2px solid #0f172a', paddingBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ background: '#0f172a', color: '#ffffff', fontWeight: 900, padding: '0.35rem 0.65rem', borderRadius: '4px', fontSize: '1.1rem', letterSpacing: '0.05em' }}>
                KM
              </div>
              <div>
                <h1 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                  KANAB MOTORS PLC
                </h1>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#475569', fontWeight: 600 }}>
                  Automotive Assembly, Logistics & Commercial Distribution
                </p>
              </div>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: '0.45rem', lineHeight: 1.4 }}>
              Gotera Distribution Center & Assembly Plant · Debre Zeit Road, Addis Ababa, Ethiopia<br />
              TIN: 0048291048 · VAT Reg: 8291048002 · Tel: +251-11-467-1122 · finance@kanabmotors.et
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.01em', textTransform: 'uppercase' }}>
              Statement of Account
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.2rem' }}>
              Statement Ref: <strong style={{ color: '#0f172a' }}>SOA-{selectedCustomer?.customerCode || 'CUST'}-{new Date().toISOString().slice(0, 10).replace(/-/g, '')}</strong>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Date Issued: <strong style={{ color: '#0f172a' }}>{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</strong>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
              Period: <strong style={{ color: '#0f172a' }}>{startDate || 'All Time'}</strong> to <strong style={{ color: '#0f172a' }}>{endDate || 'Present'}</strong>
            </div>
          </div>
        </div>

        {/* Customer Information Box */}
        <div style={{ marginTop: '1.25rem', padding: '0.85rem 1rem', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '6px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.85rem', fontSize: '0.78rem' }}>
          <div>
            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Customer Name & Account</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', marginTop: '0.15rem' }}>{selectedCustomer?.fullName || 'N/A'}</div>
            <div style={{ color: '#475569' }}>Code: <strong>{selectedCustomer?.customerCode}</strong> ({selectedCustomer?.customerType})</div>
          </div>
          <div>
            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Contact Details</div>
            <div style={{ color: '#0f172a', marginTop: '0.15rem' }}>Mobile: <strong>{selectedCustomer?.mobileNumber || 'N/A'}</strong></div>
            <div style={{ color: '#475569' }}>Town: {selectedCustomer?.addressTown || 'Addis Ababa'}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#64748b', fontWeight: 700 }}>Tax & Regulatory Info</div>
            <div style={{ color: '#0f172a', marginTop: '0.15rem' }}>TIN: <strong>{selectedCustomer?.tinNumber || 'N/A'}</strong></div>
            <div style={{ color: '#475569' }}>Category: {selectedCustomer?.customerType || 'Direct POS'}</div>
          </div>
        </div>
      </div>

      {/* Breadcrumb & Header (Screen Only) */}
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <span style={{ color: 'var(--accent-cyan)' }}>★</span>
        <span>Financial Engine</span>
        <span>/</span>
        <span style={{ color: 'var(--text-secondary)' }}>Ledger & Accounts</span>
        <span>/</span>
        <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>Statement of Account</span>
      </div>

      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 0.35rem 0', letterSpacing: '-0.02em' }}>
            Customer Ledger & Statement of Account
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
            Official immutable double-entry ledger recording customer deposits, vehicle allocations, excess routing, and running balances
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button className="btn btn-secondary" onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Printer size={15} /> Print Statement
          </button>
          <button className="btn btn-cyan" onClick={() => setIsAdjOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PlusCircle size={15} /> Post Ledger Adjustment
          </button>
        </div>
      </div>

      {/* Customer Selector & Filter Bar (Screen Only) */}
      <div className="card no-print" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '320px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Select Customer:
            </label>
            <select
              className="select-field"
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              style={{ background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-color)', height: '38px' }}
            >
              {customers.map((c) => (
                <option key={c.customerId} value={c.customerId}>
                  {c.customerCode} — {c.fullName} ({c.customerType})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>From:</span>
              <input
                type="date"
                className="input-field"
                style={{ padding: '0.4rem 0.65rem', fontSize: '0.8rem', height: '38px', background: 'rgba(15, 23, 42, 0.8)' }}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>To:</span>
              <input
                type="date"
                className="input-field"
                style={{ padding: '0.4rem 0.65rem', fontSize: '0.8rem', height: '38px', background: 'rgba(15, 23, 42, 0.8)' }}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <select
              className="select-field"
              style={{ width: '200px', fontSize: '0.8rem', height: '38px', background: 'rgba(15, 23, 42, 0.8)' }}
              value={txTypeFilter}
              onChange={(e) => setTxTypeFilter(e.target.value)}
            >
              <option value="">All Transaction Types</option>
              <option value="ADVANCE_DEPOSIT">Advance Deposit</option>
              <option value="ADDITIONAL_PAYMENT">Additional Payment</option>
              <option value="CUSTOMER_CREDIT">Customer Credit</option>
              <option value="EXCESS_PAYMENT">Excess Payment</option>
              <option value="REFUND">Refund</option>
              <option value="ADJUSTMENT">Adjustment</option>
              <option value="BOOKING_CANCELLATION">Booking Cancellation</option>
              <option value="BOOKING_TRANSFER">Booking Transfer</option>
            </select>
          </div>
        </div>
      </div>

      {/* Customer Financial Summary Cards (Story L4) */}
      {statement?.summary && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '1rem',
          marginBottom: '1.75rem',
        }}>
          <div className="glass-panel" style={{ padding: '1.15rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Deposits</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.35rem' }}>
              ETB {Number(statement.summary.totalDeposits || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--accent-emerald)', marginTop: '0.2rem' }}>All confirmed BRVs</div>
          </div>

          <div className="glass-panel" style={{ padding: '1.15rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Allocated to Bookings</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--accent-indigo)', marginTop: '0.35rem' }}>
              ETB {Number(statement.summary.allocatedToBookings || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Active order reservations</div>
          </div>

          <div className="glass-panel" style={{ padding: '1.15rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Outstanding Balance</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--accent-rose)', marginTop: '0.35rem' }}>
              ETB {Number(statement.summary.outstandingBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Due upon vehicle delivery</div>
          </div>

          <div className="glass-panel" style={{ padding: '1.15rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Available Credit</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: '0.35rem' }}>
              ETB {Number(statement.summary.availableCredit || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>For future vehicle orders</div>
          </div>

          <div className="glass-panel" style={{ padding: '1.15rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Excess Payments</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--accent-amber)', marginTop: '0.35rem' }}>
              ETB {Number(statement.summary.excessPayments || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Awaiting routing choice</div>
          </div>

          <div className="glass-panel" style={{ padding: '1.15rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Refundable Balance</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--accent-blue)', marginTop: '0.35rem' }}>
              ETB {Number(statement.summary.refundableBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Available for disbursement</div>
          </div>
        </div>
      )}

      {/* Official Statement of Account Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#090D16', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>DATE</th>
                <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>TRANSACTION DESCRIPTION</th>
                <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>REFERENCE NUMBER</th>
                <th style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>DEBIT (ETB)</th>
                <th style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>CREDIT (ETB)</th>
                <th style={{ padding: '0.85rem 1.15rem', textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>RUNNING BALANCE (ETB)</th>
                <th style={{ padding: '0.85rem 1.15rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em' }}>AUDITOR / USER</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    Calculating running balances and loading customer ledger...
                  </td>
                </tr>
              ) : !statement || statement.transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No financial transactions recorded yet for this customer account.
                    <br />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Confirm a payment in Payments (BRV) or post an adjustment to generate ledger entries.
                    </span>
                  </td>
                </tr>
              ) : (
                statement.transactions.map((tx) => (
                  <tr key={tx.transactionId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ whiteSpace: 'nowrap', padding: '0.95rem 1.15rem', fontWeight: 600 }}>
                      {new Date(tx.date).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '0.95rem 1.15rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {tx.description}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                        <span className="badge badge-indigo" style={{ fontSize: '0.65rem' }}>
                          {tx.transactionType}
                        </span>
                        {tx.bookingNumber && ` · Booking: ${tx.bookingNumber}`}
                      </div>
                    </td>
                    <td style={{ padding: '0.95rem 1.15rem' }}>
                      <span className="mono-code" style={{ color: 'var(--accent-cyan)' }}>
                        {tx.reference}
                      </span>
                    </td>
                    <td style={{ padding: '0.95rem 1.15rem', textAlign: 'right', fontWeight: 700, color: tx.debit > 0 ? 'var(--accent-rose)' : 'var(--text-muted)' }}>
                      {tx.debit > 0 ? tx.debit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '–'}
                    </td>
                    <td style={{ padding: '0.95rem 1.15rem', textAlign: 'right', fontWeight: 700, color: tx.credit > 0 ? 'var(--accent-emerald)' : 'var(--text-muted)' }}>
                      {tx.credit > 0 ? tx.credit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '–'}
                    </td>
                    <td style={{ padding: '0.95rem 1.15rem', textAlign: 'right', fontWeight: 800, color: tx.runningBalance >= 0 ? '#ffffff' : 'var(--accent-rose)' }}>
                      {tx.runningBalance < 0
                        ? `(${Math.abs(tx.runningBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })})`
                        : tx.runningBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '0.95rem 1.15rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {tx.processedBy || 'Admin'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* PRINT-ONLY AUDIT ATTESTATION & SIGNATURE BLOCKS      */}
      {/* ---------------------------------------------------- */}
      <div className="print-only" style={{ marginTop: '2rem', pageBreakInside: 'avoid' }}>
        <div style={{ fontSize: '0.72rem', color: '#475569', fontStyle: 'italic', borderTop: '1px solid #cbd5e1', paddingTop: '0.75rem', marginBottom: '1.75rem' }}>
          * Certification Note: This official Statement of Account is generated from Kanab Motors Enterprise SIMS immutable ledger. All deposits, invoice deductions, and credit allocations are verified against bank receipt vouchers (BRV) and commercial invoices.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginTop: '1rem' }}>
          <div style={{ borderTop: '1px solid #0f172a', paddingTop: '0.5rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>Prepared By:</div>
            <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.2rem' }}>Finance & Accounts Department</div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '1.5rem' }}>Sign: _______________________</div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.35rem' }}>Date: _______________________</div>
          </div>

          <div style={{ borderTop: '1px solid #0f172a', paddingTop: '0.5rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>Verified & Approved:</div>
            <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.2rem' }}>Internal Auditor / Chief Financial Officer</div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '1.5rem' }}>Sign: _______________________</div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '0.35rem' }}>Date: _______________________</div>
          </div>

          <div style={{ border: '1px dashed #94a3b8', borderRadius: '6px', padding: '0.75rem', textAlign: 'center', minHeight: '90px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Official Corporate Seal</div>
            <div style={{ fontSize: '0.62rem', color: '#94a3b8', marginTop: '0.25rem' }}>KANAB MOTORS PLC · ADDIS ABABA</div>
          </div>
        </div>
      </div>

      {/* MANUAL ADJUSTMENT MODAL (Story L9) */}
      {isAdjOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Post Manual Ledger Adjustment</h3>
              <button
                onClick={() => setIsAdjOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handlePostAdjustment}>
              <div className="modal-body">
                {adjError && (
                  <div className="alert-banner-danger">
                    {adjError}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Adjustment Direction *</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <button
                      type="button"
                      className={`btn ${adjForm.type === 'CREDIT' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setAdjForm({ ...adjForm, type: 'CREDIT' })}
                    >
                      <ArrowDownLeft size={16} /> Credit (Customer Deposit)
                    </button>
                    <button
                      type="button"
                      className={`btn ${adjForm.type === 'DEBIT' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setAdjForm({ ...adjForm, type: 'DEBIT' })}
                    >
                      <ArrowUpRight size={16} /> Debit (Charge / Deduction)
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Amount (ETB) *</label>
                  <input
                    type="number"
                    step="0.01"
                    className="input-field"
                    placeholder="e.g. 15000.00"
                    required
                    value={adjForm.amount}
                    onChange={(e) => setAdjForm({ ...adjForm, amount: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Reference Number (Optional)</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. ADJ-MEMO-889"
                    value={adjForm.referenceNumber}
                    onChange={(e) => setAdjForm({ ...adjForm, referenceNumber: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Mandatory Audit Reason & Justification *</label>
                  <textarea
                    className="textarea-field"
                    rows={3}
                    placeholder="Provide justification for manual balance adjustment..."
                    required
                    value={adjForm.reason}
                    onChange={(e) => setAdjForm({ ...adjForm, reason: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsAdjOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submittingAdj}>
                  {submittingAdj ? 'Posting...' : 'Post to Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
