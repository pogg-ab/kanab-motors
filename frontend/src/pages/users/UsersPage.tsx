import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  Key,
  UserPlus,
  Search,
  CheckCircle2,
  AlertCircle,
  Lock,
  Mail,
  RefreshCw,
  X,
  Eye,
  EyeOff,
  ArrowLeft,
  RotateCcw,
  Save,
  Check,
  ShieldCheck,
  Edit3,
} from 'lucide-react';
import { api, AppUser, Role, SystemPermission } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<SystemPermission[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // In-page editing state (when non-null, renders the in-page edit view)
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);

  // Modal state for register
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

  // Create form state
  const [createForm, setCreateForm] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    roleId: 1,
    permissions: [] as string[],
  });
  const [showCreatePassword, setShowCreatePassword] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    fullName: '',
    email: '',
    roleId: 1,
    isActive: true,
    permissions: [] as string[],
    password: '',
  });
  const [showEditPassword, setShowEditPassword] = useState(false);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4500);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [uData, rData, pData] = await Promise.all([
        api.getUsers(),
        api.getRoles(),
        api.getPermissions(),
      ]);
      setUsers(uData);
      setRoles(rData);
      setPermissions(pData);
      if (rData.length > 0 && createForm.roleId === 1) {
        setCreateForm((prev) => ({
          ...prev,
          roleId: rData[0].roleId,
          permissions: rData[0].permissions || [],
        }));
      }
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Failed to fetch user directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleStatus = async (user: AppUser) => {
    if (user.userId === currentUser?.userId) {
      showNotification('error', 'You cannot deactivate your own account.');
      return;
    }
    try {
      const updated = await api.toggleUserStatus(user.userId);
      setUsers((prev) => prev.map((u) => (u.userId === updated.userId ? updated : u)));
      showNotification('success', `User ${user.fullName} is now ${updated.isActive ? 'Active' : 'Suspended'}`);
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Failed to toggle user status');
    }
  };

  // Open in-page editing for a user
  const handleStartEdit = (user: AppUser) => {
    setEditingUser(user);
    const userRole = roles.find((r) => r.roleId === user.roleId || r.roleName === user.role?.roleName);
    const initialPerms = user.permissions && user.permissions.length > 0
      ? user.permissions
      : userRole?.permissions || user.role?.permissions || [];

    setEditForm({
      fullName: user.fullName,
      email: user.email || '',
      roleId: userRole?.roleId || user.role?.roleId || user.roleId || 1,
      isActive: user.isActive,
      permissions: [...initialPerms],
      password: '',
    });
    // Scroll smoothly to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRoleChangeInEdit = (newRoleId: number) => {
    const selectedRole = roles.find((r) => r.roleId === newRoleId);
    setEditForm((prev) => ({
      ...prev,
      roleId: newRoleId,
      permissions: selectedRole?.permissions ? [...selectedRole.permissions] : prev.permissions,
    }));
  };

  const handleResetToRoleDefault = () => {
    const selectedRole = roles.find((r) => r.roleId === editForm.roleId);
    if (selectedRole?.permissions) {
      setEditForm((prev) => ({
        ...prev,
        permissions: [...(selectedRole.permissions || [])],
      }));
      showNotification('success', `Privileges reset to default for ${selectedRole.roleName}`);
    }
  };

  const handleTogglePermissionEdit = (key: string) => {
    setEditForm((prev) => {
      const exists = prev.permissions.includes(key);
      const newPerms = exists ? prev.permissions.filter((p) => p !== key) : [...prev.permissions, key];
      return { ...prev, permissions: newPerms };
    });
  };

  const handleSelectAllPermissionsEdit = () => {
    setEditForm((prev) => ({
      ...prev,
      permissions: permissions.map((p) => p.key),
    }));
  };

  const handleClearAllPermissionsEdit = () => {
    setEditForm((prev) => ({
      ...prev,
      permissions: [],
    }));
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setSaving(true);
    try {
      const payload: any = {
        fullName: editForm.fullName,
        email: editForm.email,
        roleId: editForm.roleId,
        isActive: editForm.isActive,
        permissions: editForm.permissions,
      };
      if (editForm.password.trim()) {
        payload.password = editForm.password.trim();
      }

      const updated = await api.updateUser(editingUser.userId, payload);
      setUsers((prev) => prev.map((u) => (u.userId === updated.userId ? updated : u)));
      setEditingUser(null);
      showNotification('success', `Privileges and details for ${updated.fullName} saved successfully!`);
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Failed to update user privileges');
    } finally {
      setSaving(false);
    }
  };

  // Create form handlers
  const handleRoleChangeInCreate = (newRoleId: number) => {
    const selectedRole = roles.find((r) => r.roleId === newRoleId);
    setCreateForm((prev) => ({
      ...prev,
      roleId: newRoleId,
      permissions: selectedRole?.permissions ? [...selectedRole.permissions] : [],
    }));
  };

  const handleTogglePermissionCreate = (key: string) => {
    setCreateForm((prev) => {
      const exists = prev.permissions.includes(key);
      const newPerms = exists ? prev.permissions.filter((p) => p !== key) : [...prev.permissions, key];
      return { ...prev, permissions: newPerms };
    });
  };

  const handleSelectAllPermissionsCreate = () => {
    setCreateForm((prev) => ({
      ...prev,
      permissions: permissions.map((p) => p.key),
    }));
  };

  const handleClearAllPermissionsCreate = () => {
    setCreateForm((prev) => ({
      ...prev,
      permissions: [],
    }));
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.fullName || !createForm.username || !createForm.email || !createForm.password) {
      showNotification('error', 'Please fill in all mandatory fields.');
      return;
    }

    try {
      const newUser = await api.createUser(createForm);
      setUsers((prev) => [newUser, ...prev]);
      setShowCreateModal(false);
      setCreateForm({
        fullName: '',
        username: '',
        email: '',
        password: '',
        roleId: roles[0]?.roleId || 1,
        permissions: roles[0]?.permissions || [],
      });
      showNotification('success', `User ${newUser.fullName} registered successfully!`);
    } catch (err: any) {
      showNotification('error', err.response?.data?.message || 'Failed to register user');
    }
  };

  // Group permissions by category
  const permissionCategories: { [cat: string]: SystemPermission[] } = permissions.reduce(
    (acc, p) => {
      const cat = p.category || 'General';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(p);
      return acc;
    },
    {} as { [cat: string]: SystemPermission[] },
  );

  // Filter users
  const filteredUsers = users.filter((u) => {
    const matchSearch =
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchRole =
      roleFilter === 'ALL' ||
      u.role?.roleName === roleFilter ||
      (u as any).roleName === roleFilter;

    const matchStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && u.isActive) ||
      (statusFilter === 'SUSPENDED' && !u.isActive);

    return matchSearch && matchRole && matchStatus;
  });

  const getRoleBadgeClass = (roleName?: string) => {
    switch (roleName) {
      case 'ADMIN':
        return 'badge-cyan';
      case 'FINANCE_MANAGER':
        return 'badge-emerald';
      case 'PROCUREMENT_SPECIALIST':
        return 'badge-amber';
      case 'WAREHOUSE_MANAGER':
        return 'badge-indigo';
      case 'SALES_MANAGER':
        return 'badge-subtle';
      default:
        return 'badge-subtle';
    }
  };

  // ==========================================
  // RENDER: IN-PAGE EDIT USER PRIVILEGES VIEW
  // ==========================================
  if (editingUser) {
    const currentRole = roles.find((r) => r.roleId === editForm.roleId);
    const userInitials = editingUser.fullName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    return (
      <div style={{ padding: '1.75rem', maxWidth: '1440px', margin: '0 auto' }}>
        {/* Toast Notification */}
        {notification && (
          <div
            style={{
              position: 'fixed',
              bottom: '24px',
              right: '24px',
              zIndex: 9999,
              padding: '0.85rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              background:
                notification.type === 'success'
                  ? 'rgba(16, 185, 129, 0.95)'
                  : 'rgba(239, 68, 68, 0.95)',
              color: '#ffffff',
              boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              fontSize: '0.85rem',
              fontWeight: 600,
              backdropFilter: 'blur(8px)',
            }}
          >
            {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{notification.message}</span>
          </div>
        )}

        {/* Top Navigation Bar with Back Button */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: 'var(--accent-cyan)',
                fontSize: '0.78rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '0.35rem',
              }}
            >
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--accent-cyan)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  padding: 0,
                }}
              >
                <ArrowLeft size={14} />
                <span>Back to Directory</span>
              </button>
              <span style={{ color: 'var(--text-muted)' }}>/</span>
              <span>Edit User Privileges</span>
            </div>
            <h1
              style={{
                fontSize: '1.65rem',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: 'var(--text-primary)',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              <span>{editingUser.fullName}</span>
              <span className={`badge ${getRoleBadgeClass(currentRole?.roleName)}`} style={{ fontSize: '0.72rem', verticalAlign: 'middle' }}>
                {currentRole?.roleName || 'ROLE'}
              </span>
            </h1>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
              Configure corporate identity, primary system role, active login state, and granular permission overrides on this page.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => setEditingUser(null)}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', height: '40px' }}
            >
              <ArrowLeft size={15} />
              <span>Back to Directory</span>
            </button>
            <button
              type="submit"
              form="inpage-edit-user-form"
              disabled={saving}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '40px' }}
            >
              <Save size={16} />
              <span>{saving ? 'Saving Changes...' : 'Save Privileges'}</span>
            </button>
          </div>
        </div>

        {/* User Quick Info Banner */}
        <div
          className="card"
          style={{
            padding: '1.25rem 1.5rem',
            marginBottom: '1.5rem',
            background: 'var(--bg-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-indigo))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
                fontWeight: 800,
                color: '#031726',
                boxShadow: 'var(--glow-cyan)',
              }}
            >
              {userInitials}
            </div>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {editingUser.fullName}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                <Mail size={13} />
                <span>{editingUser.email || `${editingUser.username}@kanabmotors.com`}</span>
                <span>•</span>
                <span>@{editingUser.username}</span>
                <span>•</span>
                <span>User ID: #{editingUser.userId}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                Granted Privileges
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent-cyan)' }}>
                {editForm.permissions.length} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>of {permissions.length} total</span>
              </div>
            </div>
            <div
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: 'var(--radius-full)',
                background: editForm.isActive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                border: editForm.isActive ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                color: editForm.isActive ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                fontWeight: 700,
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
            >
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: editForm.isActive ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                }}
              />
              <span>{editForm.isActive ? 'Account Active' : 'Account Suspended'}</span>
            </div>
          </div>
        </div>

        {/* Main Edit Form on this page */}
        <form id="inpage-edit-user-form" onSubmit={handleSaveEditUser}>
          <div className="inpage-edit-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 380px) 1fr', gap: '1.5rem', alignItems: 'start' }}>
            {/* Left Column: Account Details & Role Selection */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Profile Card */}
              <div className="card" style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                  <Edit3 size={18} color="var(--accent-cyan)" />
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    Profile & Credentials
                  </h3>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.fullName}
                    onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-input)',
                      color: 'var(--text-primary)',
                      fontSize: '0.82rem',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                    Corporate Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-input)',
                      color: 'var(--text-primary)',
                      fontSize: '0.82rem',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                    Primary Enterprise Role *
                  </label>
                  <select
                    value={editForm.roleId}
                    onChange={(e) => handleRoleChangeInEdit(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-input)',
                      color: 'var(--text-primary)',
                      fontSize: '0.82rem',
                      outline: 'none',
                    }}
                  >
                    {roles.map((r) => (
                      <option key={r.roleId} value={r.roleId}>
                        {r.roleName}
                      </option>
                    ))}
                  </select>
                  {currentRole?.description && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.35rem', lineHeight: 1.35 }}>
                      {currentRole.description}
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                    Reset Password <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(leave blank to keep unchanged)</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showEditPassword ? 'text' : 'password'}
                      placeholder="Enter new password..."
                      value={editForm.password}
                      onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.6rem 2.25rem 0.6rem 0.75rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-input)',
                        color: 'var(--text-primary)',
                        fontSize: '0.82rem',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPassword(!showEditPassword)}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                      }}
                    >
                      {showEditPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* Account Status Switch */}
                <div
                  style={{
                    padding: '0.85rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                  }}
                >
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={editForm.isActive}
                      onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                      style={{ accentColor: 'var(--accent-emerald)', width: '18px', height: '18px' }}
                    />
                    <span>Account Active & Permitted to Login</span>
                  </label>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.35rem', marginLeft: '1.75rem' }}>
                    Uncheck to temporarily suspend user access without deleting their historical records or audit trail.
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Spacious Granular Privileges Matrix */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '1.25rem',
                  borderBottom: '1px solid var(--border-color)',
                  paddingBottom: '0.75rem',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldCheck size={18} color="var(--accent-cyan)" />
                  <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                      Granular Privileges & Authorization Matrix
                    </h3>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      Explicit permissions assigned to this account across all modules
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <button
                    type="button"
                    onClick={handleResetToRoleDefault}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.72rem', padding: '0.35rem 0.65rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                    title="Revert customized permissions to match default role template"
                  >
                    <RotateCcw size={12} />
                    <span>Reset to Role Defaults</span>
                  </button>
                  <span style={{ color: 'var(--border-color)' }}>|</span>
                  <button
                    type="button"
                    onClick={handleSelectAllPermissionsEdit}
                    style={{
                      fontSize: '0.72rem',
                      color: 'var(--accent-cyan)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 700,
                    }}
                  >
                    Select All
                  </button>
                  <span style={{ color: 'var(--border-color)' }}>|</span>
                  <button
                    type="button"
                    onClick={handleClearAllPermissionsEdit}
                    style={{
                      fontSize: '0.72rem',
                      color: 'var(--text-muted)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    Clear All
                  </button>
                </div>
              </div>

              {/* Categorized Permissions Grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {Object.entries(permissionCategories).map(([category, perms]) => {
                  const activeCountInCategory = perms.filter((p) => editForm.permissions.includes(p.key)).length;
                  return (
                    <div
                      key={category}
                      style={{
                        padding: '1rem',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-color)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '0.75rem',
                          borderBottom: '1px solid var(--border-color)',
                          paddingBottom: '0.4rem',
                        }}
                      >
                        <div style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {category}
                        </div>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                          {activeCountInCategory} of {perms.length} enabled
                        </span>
                      </div>

                      <div
                        className="permissions-category-grid"
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                          gap: '0.65rem',
                        }}
                      >
                        {perms.map((p) => {
                          const checked = editForm.permissions.includes(p.key);
                          return (
                            <label
                              key={p.key}
                              style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '0.65rem',
                                padding: '0.65rem 0.75rem',
                                borderRadius: 'var(--radius-sm)',
                                background: checked ? 'rgba(0, 210, 211, 0.08)' : 'var(--bg-secondary)',
                                border: checked ? '1px solid rgba(0, 210, 211, 0.35)' : '1px solid var(--border-color)',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => handleTogglePermissionEdit(p.key)}
                                style={{
                                  accentColor: 'var(--accent-cyan)',
                                  width: '16px',
                                  height: '16px',
                                  marginTop: '2px',
                                  flexShrink: 0,
                                }}
                              />
                              <div style={{ flex: 1 }}>
                                <div
                                  style={{
                                    fontSize: '0.78rem',
                                    fontWeight: checked ? 700 : 600,
                                    color: checked ? 'var(--text-primary)' : 'var(--text-secondary)',
                                  }}
                                >
                                  {p.label}
                                </div>
                                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.15rem', lineHeight: 1.25 }}>
                                  {p.description}
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Sticky Action Bar */}
              <div
                style={{
                  marginTop: '1.75rem',
                  paddingTop: '1.25rem',
                  borderTop: '1px solid var(--border-color)',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  alignItems: 'center',
                  gap: '0.85rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="btn btn-secondary"
                  style={{ padding: '0.6rem 1.25rem', fontSize: '0.82rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary"
                  style={{
                    padding: '0.6rem 1.75rem',
                    fontSize: '0.82rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <Save size={16} />
                  <span>{saving ? 'Saving Changes...' : 'Save Privileges'}</span>
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    );
  }

  // ==========================================
  // RENDER: USER DIRECTORY LIST VIEW (DEFAULT)
  // ==========================================
  return (
    <div style={{ padding: '1.75rem', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Toast Notification */}
      {notification && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            padding: '0.85rem 1.25rem',
            borderRadius: 'var(--radius-md)',
            background:
              notification.type === 'success'
                ? 'rgba(16, 185, 129, 0.95)'
                : 'rgba(239, 68, 68, 0.95)',
            color: '#ffffff',
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            fontSize: '0.85rem',
            fontWeight: 600,
            backdropFilter: 'blur(8px)',
          }}
        >
          {notification.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header & Title */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--accent-cyan)',
              fontSize: '0.78rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '0.35rem',
            }}
          >
            <Shield size={16} />
            <span>Identity & Access Management (IAM)</span>
          </div>
          <h1
            style={{
              fontSize: '1.65rem',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: 'var(--text-primary)',
              margin: 0,
            }}
          >
            User Directory & Access Control
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>
            Enterprise Role-Based Access Control (RBAC) with granular privileges and session tokens.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={fetchData}
            className="btn btn-secondary"
            title="Refresh Directory"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', height: '40px' }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '40px' }}
          >
            <UserPlus size={16} />
            <span>Register New User</span>
          </button>
        </div>
      </div>

      {/* 4 Metric KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Total Accounts
              </div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.3rem' }}>
                {users.length}
              </div>
            </div>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(0, 210, 211, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-cyan)',
              }}
            >
              <Users size={20} />
            </div>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            {users.filter((u) => u.isActive).length} active, {users.filter((u) => !u.isActive).length} suspended
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Configured Roles
              </div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '0.3rem' }}>
                {roles.length}
              </div>
            </div>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(99, 102, 241, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-indigo)',
              }}
            >
              <Shield size={20} />
            </div>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--accent-indigo)', marginTop: '0.5rem', fontWeight: 600 }}>
            ADMIN, FINANCE, PROC, WH, SALES
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Granular Permissions
              </div>
              <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--accent-emerald)', marginTop: '0.3rem' }}>
                {permissions.length}
              </div>
            </div>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(16, 185, 129, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-emerald)',
              }}
            >
              <Key size={20} />
            </div>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Categorized by module security scope
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Security Enforcement
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-cyan)', marginTop: '0.45rem' }}>
                Bcrypt + JWT
              </div>
            </div>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(245, 158, 11, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-amber)',
              }}
            >
              <Lock size={20} />
            </div>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Audit log tracks user mutations
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div
        className="card"
        style={{
          padding: '0.85rem 1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
        }}
      >
        {/* Search */}
        <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
          <Search
            size={16}
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
          />
          <input
            type="text"
            placeholder="Search by name, email, or username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.55rem 0.75rem 0.55rem 2.25rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-input)',
              color: 'var(--text-primary)',
              fontSize: '0.82rem',
              outline: 'none',
            }}
          />
        </div>

        {/* Role Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Role:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{
              padding: '0.5rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-input)',
              color: 'var(--text-primary)',
              fontSize: '0.8rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">All Roles</option>
            {roles.map((r) => (
              <option key={r.roleId} value={r.roleName}>
                {r.roleName}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '0.5rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-input)',
              color: 'var(--text-primary)',
              fontSize: '0.8rem',
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Only</option>
            <option value="SUSPENDED">Suspended Only</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '0.85rem 1.25rem', fontWeight: 700, color: 'var(--text-muted)' }}>USER PROFILE</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-muted)' }}>ROLE & DESCRIPTION</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-muted)' }}>PERMISSIONS OVERVIEW</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--text-muted)' }}>STATUS</th>
                <th style={{ padding: '0.85rem 1.25rem', fontWeight: 700, color: 'var(--text-muted)', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem auto' }} />
                    <div>Loading system user directory...</div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No users matching criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const roleName = u.role?.roleName || (u as any).roleName || 'USER';
                  const initials = u.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);
                  const isCurrent = u.userId === currentUser?.userId;
                  const perms = u.permissions || u.role?.permissions || [];

                  return (
                    <tr
                      key={u.userId}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        transition: 'background 0.15s ease',
                      }}
                      className="table-row-hover"
                    >
                      {/* Profile */}
                      <td style={{ padding: '0.85rem 1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-indigo))',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.85rem',
                              fontWeight: 800,
                              color: '#031726',
                              flexShrink: 0,
                            }}
                          >
                            {initials}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span>{u.fullName}</span>
                              {isCurrent && (
                                <span className="badge badge-cyan" style={{ fontSize: '0.62rem', padding: '0.1rem 0.4rem' }}>
                                  You
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.15rem' }}>
                              <Mail size={12} />
                              <span>{u.email || `${u.username}@kanabmotors.com`}</span>
                              <span>•</span>
                              <span>@{u.username}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span className={`badge ${getRoleBadgeClass(roleName)}`} style={{ fontWeight: 700 }}>
                          {roleName}
                        </span>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                          {u.role?.description || 'Enterprise role'}
                        </div>
                      </td>

                      {/* Permissions overview */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {roleName === 'ADMIN' ? (
                          <span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>
                            Full Superuser Access (All Modules)
                          </span>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <span
                              style={{
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                color: 'var(--text-primary)',
                                background: 'var(--bg-secondary)',
                                padding: '0.2rem 0.5rem',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--border-color)',
                              }}
                            >
                              {perms.length} Granular Privileges
                            </span>
                            {perms.slice(0, 2).map((p) => (
                              <span
                                key={p}
                                style={{
                                  fontSize: '0.65rem',
                                  color: 'var(--text-muted)',
                                  background: 'var(--bg-tertiary)',
                                  padding: '0.15rem 0.4rem',
                                  borderRadius: 'var(--radius-sm)',
                                }}
                              >
                                {p.replace(/_/g, ' ')}
                              </span>
                            ))}
                            {perms.length > 2 && (
                              <span style={{ fontSize: '0.65rem', color: 'var(--accent-cyan)' }}>
                                +{perms.length - 2} more
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <button
                          onClick={() => handleToggleStatus(u)}
                          disabled={isCurrent}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.25rem 0.65rem',
                            borderRadius: 'var(--radius-full)',
                            border: u.isActive
                              ? '1px solid rgba(16, 185, 129, 0.3)'
                              : '1px solid rgba(239, 68, 68, 0.3)',
                            background: u.isActive
                              ? 'rgba(16, 185, 129, 0.1)'
                              : 'rgba(239, 68, 68, 0.1)',
                            color: u.isActive ? 'var(--accent-emerald)' : 'var(--accent-rose)',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: isCurrent ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                          title={isCurrent ? 'Cannot deactivate self' : 'Click to toggle active status'}
                        >
                          {u.isActive ? (
                            <>
                              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-emerald)' }} />
                              <span>Active</span>
                            </>
                          ) : (
                            <>
                              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-rose)' }} />
                              <span>Suspended</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>
                        <button
                          onClick={() => handleStartEdit(u)}
                          className="btn btn-secondary"
                          style={{
                            padding: '0.4rem 0.85rem',
                            fontSize: '0.75rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            fontWeight: 600,
                          }}
                        >
                          <Edit3 size={13} />
                          <span>Edit Privileges</span>
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

      {/* CREATE USER MODAL */}
      {showCreateModal && (
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
            className="card"
            style={{
              width: '100%',
              maxWidth: '680px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              padding: 0,
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--bg-secondary)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(0, 210, 211, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent-cyan)',
                  }}
                >
                  <UserPlus size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    Register Enterprise User
                  </h3>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Create account credentials and configure RBAC authorization
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
              <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dawit Tadesse"
                      value={createForm.fullName}
                      onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-input)',
                        color: 'var(--text-primary)',
                        fontSize: '0.82rem',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                      Username *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. dawit_t"
                      value={createForm.username}
                      onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-input)',
                        color: 'var(--text-primary)',
                        fontSize: '0.82rem',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                      Corporate Email *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="dawit@kanabmotors.com"
                      value={createForm.email}
                      onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-input)',
                        color: 'var(--text-primary)',
                        fontSize: '0.82rem',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                      Initial Password *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showCreatePassword ? 'text' : 'password'}
                        required
                        placeholder="••••••••"
                        value={createForm.password}
                        onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '0.55rem 2.25rem 0.55rem 0.75rem',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-input)',
                          color: 'var(--text-primary)',
                          fontSize: '0.82rem',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowCreatePassword(!showCreatePassword)}
                        style={{
                          position: 'absolute',
                          right: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                        }}
                      >
                        {showCreatePassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Role Selection */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                    Assigned Primary Role *
                  </label>
                  <select
                    value={createForm.roleId}
                    onChange={(e) => handleRoleChangeInCreate(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-input)',
                      color: 'var(--text-primary)',
                      fontSize: '0.82rem',
                      outline: 'none',
                    }}
                  >
                    {roles.map((r) => (
                      <option key={r.roleId} value={r.roleId}>
                        {r.roleName} — {r.description || 'System Role'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Granular Permissions Matrix */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                      Granular Privileges ({createForm.permissions.length} selected)
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={handleSelectAllPermissionsCreate}
                        style={{ fontSize: '0.68rem', color: 'var(--accent-cyan)', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                      >
                        Select All
                      </button>
                      <span style={{ color: 'var(--border-color)' }}>|</span>
                      <button
                        type="button"
                        onClick={handleClearAllPermissionsCreate}
                        style={{ fontSize: '0.68rem', color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      maxHeight: '220px',
                      overflowY: 'auto',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.75rem',
                      background: 'var(--bg-tertiary)',
                    }}
                  >
                    {Object.entries(permissionCategories).map(([category, perms]) => (
                      <div key={category} style={{ marginBottom: '0.85rem' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-cyan)', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                          {category}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                          {perms.map((p) => {
                            const checked = createForm.permissions.includes(p.key);
                            return (
                              <label
                                key={p.key}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  fontSize: '0.73rem',
                                  color: checked ? 'var(--text-primary)' : 'var(--text-muted)',
                                  background: checked ? 'rgba(0, 210, 211, 0.08)' : 'var(--bg-secondary)',
                                  padding: '0.35rem 0.5rem',
                                  borderRadius: 'var(--radius-sm)',
                                  border: checked ? '1px solid rgba(0, 210, 211, 0.3)' : '1px solid var(--border-color)',
                                  cursor: 'pointer',
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => handleTogglePermissionCreate(p.key)}
                                  style={{ accentColor: 'var(--accent-cyan)' }}
                                />
                                <span>{p.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div
                style={{
                  padding: '1rem 1.5rem',
                  borderTop: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.75rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary"
                  style={{ padding: '0.5rem 1rem', fontSize: '0.82rem' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '0.5rem 1.25rem', fontSize: '0.82rem' }}
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
