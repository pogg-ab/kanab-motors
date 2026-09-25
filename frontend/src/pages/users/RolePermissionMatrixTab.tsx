import React, { useState, useEffect } from 'react';
import {
  Shield,
  Check,
  RotateCcw,
  Save,
  CheckCircle2,
  AlertCircle,
  Lock,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';
import { api, Role, SystemModule, SystemAction, RolePermissionMatrixResponse } from '../../api/client';

interface Props {
  roles: Role[];
  onNotification: (type: 'success' | 'error', message: string) => void;
}

export const RolePermissionMatrixTab: React.FC<Props> = ({ roles, onNotification }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [modules, setModules] = useState<SystemModule[]>([]);
  const [actions, setActions] = useState<SystemAction[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number>(roles[0]?.roleId || 1);
  const [matrix, setMatrix] = useState<Record<number, Record<string, Record<string, boolean>>>>({});
  const [originalMatrix, setOriginalMatrix] = useState<Record<number, Record<string, Record<string, boolean>>>>({});

  const fetchMatrix = async () => {
    setLoading(true);
    try {
      const data: RolePermissionMatrixResponse = await api.getPermissionMatrix();
      setModules(data.modules || []);
      setActions(data.actions || []);
      setMatrix(data.matrix || {});
      setOriginalMatrix(JSON.parse(JSON.stringify(data.matrix || {})));
      if (data.roles?.length > 0 && !roles.some((r) => r.roleId === selectedRoleId)) {
        setSelectedRoleId(data.roles[0].roleId);
      }
    } catch (err: any) {
      onNotification('error', err.response?.data?.message || 'Failed to fetch permission matrix');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatrix();
  }, []);

  const selectedRole = roles.find((r) => r.roleId === selectedRoleId) || roles[0];
  const isSuperAdminRole = selectedRole?.roleName === 'ADMIN' || selectedRole?.displayName === 'System Administrator';

  const handleToggleCell = (moduleCode: string, actionCode: string) => {
    if (isSuperAdminRole) return; // Super admin has locked master rights
    setMatrix((prev) => {
      const copy = { ...prev };
      if (!copy[selectedRoleId]) copy[selectedRoleId] = {};
      if (!copy[selectedRoleId][moduleCode]) copy[selectedRoleId][moduleCode] = {};
      copy[selectedRoleId][moduleCode][actionCode] = !copy[selectedRoleId][moduleCode][actionCode];
      return copy;
    });
  };

  const handleToggleRow = (moduleCode: string) => {
    if (isSuperAdminRole) return;
    setMatrix((prev) => {
      const copy = { ...prev };
      if (!copy[selectedRoleId]) copy[selectedRoleId] = {};
      if (!copy[selectedRoleId][moduleCode]) copy[selectedRoleId][moduleCode] = {};

      // Check if all actions in this row are granted
      const allGranted = actions.every((a) => copy[selectedRoleId][moduleCode][a.actionCode]);
      const targetState = !allGranted;

      actions.forEach((a) => {
        copy[selectedRoleId][moduleCode][a.actionCode] = targetState;
      });

      return copy;
    });
  };

  const handleToggleColumn = (actionCode: string) => {
    if (isSuperAdminRole) return;
    setMatrix((prev) => {
      const copy = { ...prev };
      if (!copy[selectedRoleId]) copy[selectedRoleId] = {};

      const allGranted = modules.every(
        (m) => copy[selectedRoleId]?.[m.moduleCode]?.[actionCode],
      );
      const targetState = !allGranted;

      modules.forEach((m) => {
        if (!copy[selectedRoleId][m.moduleCode]) copy[selectedRoleId][m.moduleCode] = {};
        copy[selectedRoleId][m.moduleCode][actionCode] = targetState;
      });

      return copy;
    });
  };

  const handleGrantAllForRole = () => {
    if (isSuperAdminRole) return;
    setMatrix((prev) => {
      const copy = { ...prev };
      if (!copy[selectedRoleId]) copy[selectedRoleId] = {};
      modules.forEach((m) => {
        if (!copy[selectedRoleId][m.moduleCode]) copy[selectedRoleId][m.moduleCode] = {};
        actions.forEach((a) => {
          copy[selectedRoleId][m.moduleCode][a.actionCode] = true;
        });
      });
      return copy;
    });
  };

  const handleClearAllForRole = () => {
    if (isSuperAdminRole) return;
    setMatrix((prev) => {
      const copy = { ...prev };
      if (!copy[selectedRoleId]) copy[selectedRoleId] = {};
      modules.forEach((m) => {
        if (!copy[selectedRoleId][m.moduleCode]) copy[selectedRoleId][m.moduleCode] = {};
        actions.forEach((a) => {
          copy[selectedRoleId][m.moduleCode][a.actionCode] = false;
        });
      });
      return copy;
    });
  };

  const handleResetToSaved = () => {
    setMatrix(JSON.parse(JSON.stringify(originalMatrix)));
    onNotification('success', 'Permissions reverted to last saved state');
  };

  const handleSaveMatrix = async () => {
    if (!selectedRole) return;
    setSaving(true);
    try {
      const roleState = matrix[selectedRoleId] || {};
      const updates: { moduleCode: string; actionCode: string; granted: boolean }[] = [];

      modules.forEach((m) => {
        actions.forEach((a) => {
          const granted = !!roleState[m.moduleCode]?.[a.actionCode];
          updates.push({
            moduleCode: m.moduleCode,
            actionCode: a.actionCode,
            granted,
          });
        });
      });

      await api.updateRolePermissions(selectedRoleId, updates);
      setOriginalMatrix(JSON.parse(JSON.stringify(matrix)));
      onNotification(
        'success',
        `Role permission matrix updated successfully for ${selectedRole.displayName || selectedRole.roleName}!`,
      );
    } catch (err: any) {
      onNotification('error', err.response?.data?.message || 'Failed to save permission matrix');
    } finally {
      setSaving(false);
    }
  };

  // Calculate count of granted permissions for the active role
  const totalGranted = modules.reduce((acc, m) => {
    const row = matrix[selectedRoleId]?.[m.moduleCode] || {};
    return acc + actions.filter((a) => (isSuperAdminRole ? true : !!row[a.actionCode])).length;
  }, 0);

  const totalPossible = modules.length * actions.length;

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div className="spinner" style={{ margin: '0 auto 1rem' }} />
        <p>Loading enterprise role-permission matrix...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Role Picker Toolbar */}
      <div
        className="card"
        style={{
          padding: '1.25rem 1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.85))',
          border: '1px solid var(--border-color)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.72rem',
                fontWeight: 700,
                color: 'var(--accent-cyan)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '0.35rem',
              }}
            >
              Select Corporate Role
            </label>
            <select
              value={selectedRoleId}
              onChange={(e) => setSelectedRoleId(Number(e.target.value))}
              className="form-control"
              style={{
                minWidth: '240px',
                fontSize: '0.88rem',
                fontWeight: 600,
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                borderColor: 'var(--border-color)',
              }}
            >
              {roles.map((r) => (
                <option key={r.roleId} value={r.roleId}>
                  {r.displayName || r.roleName} {r.isSystemRole ? '(Built-in)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div style={{ borderLeft: '1px solid var(--border-color)', paddingLeft: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {selectedRole?.displayName || selectedRole?.roleName}
              </span>
              {selectedRole?.isSystemRole && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    fontSize: '0.68rem',
                    padding: '0.15rem 0.5rem',
                    borderRadius: '999px',
                    background: 'rgba(56, 189, 248, 0.15)',
                    color: 'var(--accent-cyan)',
                    fontWeight: 600,
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                  }}
                >
                  <Lock size={10} /> Protected System Role
                </span>
              )}
            </div>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {selectedRole?.description || 'Standard automotive enterprise role profile'}
            </p>
          </div>
        </div>

        {/* Status & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div
            style={{
              padding: '0.4rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
            }}
          >
            Granted Privileges:{' '}
            <strong style={{ color: 'var(--accent-cyan)' }}>
              {isSuperAdminRole ? totalPossible : totalGranted}
            </strong>{' '}
            / {totalPossible}
          </div>

          {!isSuperAdminRole && (
            <>
              <button
                type="button"
                onClick={handleGrantAllForRole}
                className="btn btn-secondary"
                style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem' }}
                title="Grant all 18 modules x 9 actions for this role"
              >
                Grant All
              </button>
              <button
                type="button"
                onClick={handleClearAllForRole}
                className="btn btn-secondary"
                style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem' }}
                title="Revoke all actions for this role"
              >
                Clear All
              </button>
              <button
                type="button"
                onClick={handleResetToSaved}
                className="btn btn-secondary"
                style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                title="Discard unsaved edits"
              >
                <RotateCcw size={13} />
                <span>Revert</span>
              </button>
              <button
                type="button"
                onClick={handleSaveMatrix}
                disabled={saving}
                className="btn btn-primary"
                style={{
                  padding: '0.45rem 1.15rem',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                }}
              >
                <Save size={15} />
                <span>{saving ? 'Saving...' : 'Save Matrix'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Admin Notice */}
      {isSuperAdminRole && (
        <div
          style={{
            padding: '0.85rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(56, 189, 248, 0.08)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            color: 'var(--text-primary)',
            fontSize: '0.82rem',
          }}
        >
          <Info size={18} style={{ color: 'var(--accent-cyan)', flexShrink: 0 }} />
          <span>
            <strong>System Administrator Bypass:</strong> This role has unrestricted master privileges across all 18 functional modules and 9 system actions by kernel design. Permissions cannot be removed from System Administrator.
          </span>
        </div>
      )}

      {/* Matrix Table */}
      <div
        className="card"
        style={{
          padding: 0,
          overflowX: 'auto',
          border: '1px solid var(--border-color)',
          background: 'var(--bg-secondary)',
        }}
      >
        <table
          className="table"
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.82rem',
          }}
        >
          <thead>
            <tr
              style={{
                background: 'var(--bg-tertiary)',
                borderBottom: '2px solid var(--border-color)',
              }}
            >
              <th
                style={{
                  padding: '0.85rem 1rem',
                  textAlign: 'left',
                  width: '260px',
                  position: 'sticky',
                  left: 0,
                  background: 'var(--bg-tertiary)',
                  zIndex: 2,
                  borderRight: '1px solid var(--border-color)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-primary)' }}>
                  <Layers size={15} style={{ color: 'var(--accent-cyan)' }} />
                  <span>Functional Module (18)</span>
                </div>
              </th>

              {actions.map((act) => (
                <th
                  key={act.actionCode}
                  style={{
                    padding: '0.75rem 0.6rem',
                    textAlign: 'center',
                    minWidth: '100px',
                    color: 'var(--text-primary)',
                    fontWeight: 600,
                    userSelect: 'none',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
                    <span>{act.actionName}</span>
                    {!isSuperAdminRole && (
                      <button
                        type="button"
                        onClick={() => handleToggleColumn(act.actionCode)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--accent-cyan)',
                          fontSize: '0.65rem',
                          cursor: 'pointer',
                          padding: '0.1rem 0.3rem',
                          borderRadius: '3px',
                          textDecoration: 'underline',
                        }}
                        title={`Toggle all ${act.actionName} permissions`}
                      >
                        all
                      </button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {modules.map((mod, idx) => {
              const rowData = matrix[selectedRoleId]?.[mod.moduleCode] || {};
              const rowAllGranted = actions.every((a) => (isSuperAdminRole ? true : !!rowData[a.actionCode]));

              return (
                <tr
                  key={mod.moduleCode}
                  style={{
                    background: idx % 2 === 0 ? 'var(--bg-secondary)' : 'rgba(255, 255, 255, 0.015)',
                    borderBottom: '1px solid var(--border-color)',
                    transition: 'background 0.15s ease',
                  }}
                >
                  {/* Module Name Column */}
                  <td
                    style={{
                      padding: '0.85rem 1rem',
                      position: 'sticky',
                      left: 0,
                      background: idx % 2 === 0 ? 'var(--bg-secondary)' : 'var(--bg-tertiary)',
                      zIndex: 1,
                      borderRight: '1px solid var(--border-color)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.84rem' }}>
                          {mod.moduleName}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                          {mod.description}
                        </div>
                      </div>
                      {!isSuperAdminRole && (
                        <button
                          type="button"
                          onClick={() => handleToggleRow(mod.moduleCode)}
                          style={{
                            background: rowAllGranted ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid var(--border-color)',
                            color: rowAllGranted ? 'var(--accent-emerald)' : 'var(--text-muted)',
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            padding: '0.2rem 0.4rem',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer',
                            marginLeft: '0.5rem',
                            flexShrink: 0,
                          }}
                          title="Toggle entire row"
                        >
                          {rowAllGranted ? 'Revoke' : 'Grant'}
                        </button>
                      )}
                    </div>
                  </td>

                  {/* 9 Action Cells */}
                  {actions.map((act) => {
                    const isGranted = isSuperAdminRole ? true : !!rowData[act.actionCode];
                    return (
                      <td
                        key={act.actionCode}
                        onClick={() => handleToggleCell(mod.moduleCode, act.actionCode)}
                        style={{
                          padding: '0.75rem 0.5rem',
                          textAlign: 'center',
                          cursor: isSuperAdminRole ? 'default' : 'pointer',
                          background: isGranted ? 'rgba(16, 185, 129, 0.06)' : 'transparent',
                          transition: 'background 0.15s ease',
                        }}
                      >
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '24px',
                            height: '24px',
                            borderRadius: '6px',
                            background: isGranted ? 'rgba(16, 185, 129, 0.2)' : 'var(--bg-tertiary)',
                            border: isGranted ? '1.5px solid #10b981' : '1px solid var(--border-color)',
                            color: isGranted ? '#10b981' : 'transparent',
                            transition: 'all 0.15s ease',
                            margin: '0 auto',
                          }}
                        >
                          {isGranted && <Check size={14} strokeWidth={3} />}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
