import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Users, Plus, Edit, Trash2, Search, Phone, Eye, EyeOff, Loader2, X } from 'lucide-react';
import userApi, { UserItem, CreateUserPayload, UpdateUserPayload } from '../../api/userApi';
import { userCache } from '../data/userCache';

type BackendRole = 'ceo' | 'general_manager' | 'marketing' | 'finance' | 'designer' | 'quantity_surveyor' | 'data_collector';

const ROLE_LABELS: Record<BackendRole, string> = {
  ceo: 'CEO',
  general_manager: 'General Manager',
  marketing: 'Marketing',
  finance: 'Finance',
  designer: 'Designer',
  quantity_surveyor: 'Quantity Surveyor',
  data_collector: 'Data Collector',
};

const ROLE_COLORS: Record<BackendRole, string> = {
  ceo: 'bg-red-100 text-red-700',
  general_manager: 'bg-blue-100 text-blue-700',
  marketing: 'bg-purple-100 text-purple-700',
  finance: 'bg-green-100 text-green-700',
  designer: 'bg-cyan-100 text-cyan-700',
  quantity_surveyor: 'bg-orange-100 text-orange-700',
  data_collector: 'bg-yellow-100 text-yellow-700',
};

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\da-zA-Z]).{8,128}$/;

function validateEmail(email: string): string | null {
  if (!email.trim()) return 'Email is required';
  if (!email.includes('@')) return 'Invalid email format';
  return null;
}

function validateFullName(name: string): string | null {
  if (!name.trim()) return 'Full name is required';
  return null;
}

function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!PASSWORD_REGEX.test(password)) {
    return 'Password must include uppercase, lowercase, digit, and special character';
  }
  return null;
}

function getRoleName(role: string): string {
  return ROLE_LABELS[role as BackendRole] || role;
}

function getRoleColor(role: string): string {
  return ROLE_COLORS[role as BackendRole] || 'bg-gray-100 text-gray-700';
}

interface UserFormFieldsProps {
  mode: 'create' | 'edit';
  formName: string;
  setFormName: (v: string) => void;
  formEmail: string;
  setFormEmail: (v: string) => void;
  formPhone: string;
  setFormPhone: (v: string) => void;
  formPassword: string;
  setFormPassword: (v: string) => void;
  formRole: BackendRole;
  setFormRole: (v: BackendRole) => void;
  formIsActive: boolean;
  setFormIsActive: (v: boolean) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean | ((s: boolean) => boolean)) => void;
  isSubmitting: boolean;
  formError: string | null;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

function UserFormFields({
  mode,
  formName, setFormName,
  formEmail, setFormEmail,
  formPhone, setFormPhone,
  formPassword, setFormPassword,
  formRole, setFormRole,
  formIsActive, setFormIsActive,
  showPassword, setShowPassword,
  isSubmitting,
  formError,
  onSubmit,
  onCancel,
}: UserFormFieldsProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Full Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
          disabled={isSubmitting}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Email Address <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          value={formEmail}
          onChange={(e) => setFormEmail(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
          disabled={isSubmitting}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Phone Number
        </label>
        <input
          type="tel"
          value={formPhone}
          onChange={(e) => setFormPhone(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder={mode === 'create' ? '+1234567890' : undefined}
          disabled={isSubmitting}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Role {mode === 'create' && <span className="text-red-500">*</span>}
        </label>
        <select
          value={formRole}
          onChange={(e) => setFormRole(e.target.value as BackendRole)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required={mode === 'create'}
          disabled={isSubmitting}
        >
          {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Password {mode === 'create' && <span className="text-red-500">*</span>}
        </label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={formPassword}
            onChange={(e) => setFormPassword(e.target.value)}
            className="w-full pr-10 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required={mode === 'create'}
            disabled={isSubmitting}
            placeholder={
              mode === 'create'
                ? 'Min 8 chars, upper+lower+digit+special'
                : 'Leave blank to keep current password'
            }
          />
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          {mode === 'create'
            ? 'Must include uppercase, lowercase, digit, and special character.'
            : 'Provide a new password only to change it.'}
        </p>
      </div>

      {mode === 'edit' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Account Status</label>
          <select
            value={formIsActive ? 'active' : 'inactive'}
            onChange={(e) => setFormIsActive(e.target.value === 'active')}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isSubmitting}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      )}

      {formError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{formError}</p>
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {isSubmitting
            ? mode === 'create'
              ? 'Creating...'
              : 'Saving...'
            : mode === 'create'
              ? 'Add User'
              : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}

export function UserManagement() {
  const { user } = useAuth();

  const [users, setUsers] = useState<UserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserItem | null>(null);

  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<BackendRole>('designer');
  const [formIsActive, setFormIsActive] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchUsers = useCallback(async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      setLoadError(null);
      if (forceRefresh) {
        userCache.invalidate({ limit: 100 });
      }
      const data = await userCache.fetch({ limit: 100 });
      setUsers(data);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setLoadError(err?.response?.data?.message || 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const resetCreateForm = () => {
    setFormName('');
    setFormEmail('');
    setFormPhone('');
    setFormPassword('');
    setFormRole('designer');
    setShowPassword(false);
    setFormError(null);
  };

  const openCreateModal = () => {
    resetCreateForm();
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    resetCreateForm();
  };

  const openEditModal = (u: UserItem) => {
    setEditingUser(u);
    setFormName(u.full_name);
    setFormEmail(u.email);
    setFormPhone(u.phone || '');
    setFormPassword('');
    setFormRole(u.role as BackendRole);
    setFormIsActive(u.is_active);
    setShowPassword(false);
    setFormError(null);
  };

  const closeEditModal = () => {
    setEditingUser(null);
    setFormError(null);
  };

  const openDeleteModal = (u: UserItem) => {
    setDeletingUser(u);
    setDeleteError(null);
  };

  const closeDeleteModal = () => {
    setDeletingUser(null);
    setDeleteError(null);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const nameError = validateFullName(formName);
    if (nameError) { setFormError(nameError); return; }

    const emailError = validateEmail(formEmail);
    if (emailError) { setFormError(emailError); return; }

    const passwordError = validatePassword(formPassword);
    if (passwordError) { setFormError(passwordError); return; }

    const payload: CreateUserPayload = {
      full_name: formName.trim(),
      email: formEmail.trim(),
      password: formPassword,
      role: formRole,
    };
    if (formPhone.trim()) {
      payload.phone = formPhone.trim();
    }

    try {
      setIsSubmitting(true);
      const response = await userApi.createUser(payload);
      if (response.success) {
        closeCreateModal();
        await fetchUsers(true);
        setSuccessMessage('User created successfully');
      } else {
        setFormError(response.message || 'Failed to create user');
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setFormError(err?.response?.data?.message || 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setFormError(null);

    const nameError = validateFullName(formName);
    if (nameError) { setFormError(nameError); return; }

    const emailError = validateEmail(formEmail);
    if (emailError) { setFormError(emailError); return; }

    if (formPassword && formPassword.length > 0) {
      const passwordError = validatePassword(formPassword);
      if (passwordError) { setFormError(passwordError); return; }
    }

    const payload: UpdateUserPayload = {};

    if (formName.trim() !== editingUser.full_name) {
      payload.full_name = formName.trim();
    }
    if (formEmail.trim() !== editingUser.email) {
      payload.email = formEmail.trim();
    }
    if (formRole !== editingUser.role) {
      payload.role = formRole;
    }
    const originalPhone = editingUser.phone || '';
    const currentPhone = formPhone.trim();
    if (currentPhone !== originalPhone) {
      payload.phone = currentPhone || undefined;
    }
    if (formPassword) {
      payload.password = formPassword;
    }
    if (formIsActive !== editingUser.is_active) {
      payload.is_active = formIsActive;
    }

    if (Object.keys(payload).length === 0) {
      closeEditModal();
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await userApi.updateUser(editingUser.id, payload);
      if (response.success) {
        closeEditModal();
        await fetchUsers(true);
        setSuccessMessage('User updated successfully');
      } else {
        setFormError(response.message || 'Failed to update user');
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setFormError(err?.response?.data?.message || 'Failed to update user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    setDeleteError(null);

    try {
      setIsDeleting(true);
      const response = await userApi.deleteUser(deletingUser.id);
      if (response.success) {
        closeDeleteModal();
        await fetchUsers(true);
        setSuccessMessage('User deleted successfully');
      } else {
        setDeleteError(response.message || 'Failed to delete user');
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      setDeleteError(err?.response?.data?.message || 'Failed to delete user');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!user || user.role !== 'ceo') {
    return (
      <div className="card-safe overflow-hidden min-w-0 bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
        <p className="text-gray-500">Access denied. CEO privileges required.</p>
      </div>
    );
  }

  let filteredUsers = users;
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filteredUsers = users.filter(
      (u) =>
        u.full_name.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        (u.phone && u.phone.includes(term)) ||
        getRoleName(u.role).toLowerCase().includes(term)
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
          <p className="text-gray-600 mt-1">Manage system users and their roles</p>
        </div>
        <button
          onClick={openCreateModal}
          disabled={isLoading}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Add User</span>
        </button>
      </div>

      {/* Success message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
          <p className="text-sm text-green-700">{successMessage}</p>
          <button
            onClick={() => setSuccessMessage(null)}
            className="p-1 text-green-500 hover:text-green-700 rounded"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search */}
      <div className="card-safe overflow-hidden min-w-0 bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search users by name, email, phone, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="card-safe overflow-hidden min-w-0 bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
          <p className="text-gray-500">Loading users...</p>
        </div>
      )}

      {/* Error state */}
      {!isLoading && loadError && (
        <div className="card-safe overflow-hidden min-w-0 bg-white rounded-xl p-6 shadow-sm border border-red-200 text-center">
          <p className="text-red-600 mb-3">{loadError}</p>
          <button
            onClick={fetchUsers}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* User cards */}
      {!isLoading && !loadError && (
        <div className="grid grid-cols-1 gap-4">
          {filteredUsers.map((u) => (
            <div
              key={u.id}
              className={`card-safe overflow-hidden min-w-0 bg-white rounded-xl p-4 shadow-sm border border-gray-200 ${
                !u.is_active ? 'opacity-80' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 font-medium text-sm">
                      {u.full_name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{u.full_name}</p>
                    <p className="text-xs text-gray-500 truncate">{u.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(u)}
                    className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit user"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openDeleteModal(u)}
                    className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete user"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Role</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleColor(u.role)}`}>
                    {getRoleName(u.role)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      u.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="border-t border-gray-100 pt-3 space-y-1">
                  {u.phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-gray-400" />
                      <p className="text-xs text-gray-600">{u.phone}</p>
                    </div>
                  )}
                  {u.last_login_at && (
                    <p className="text-xs text-gray-400">
                      Last login: {new Date(u.last_login_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !loadError && filteredUsers.length === 0 && (
        <div className="card-safe overflow-hidden min-w-0 bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">
            {searchTerm ? 'No users match your search' : 'No users found'}
          </p>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="card-safe overflow-hidden min-w-0 bg-white rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between p-6 pb-2">
              <div>
                <h3 className="text-xl font-semibold mb-1">Add New User</h3>
                <p className="text-sm text-gray-600">Create a new system user account</p>
              </div>
              <button
                type="button"
                onClick={closeCreateModal}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto px-6 pb-6 pt-4">
              <UserFormFields
                mode="create"
                formName={formName}
                setFormName={setFormName}
                formEmail={formEmail}
                setFormEmail={setFormEmail}
                formPhone={formPhone}
                setFormPhone={setFormPhone}
                formPassword={formPassword}
                setFormPassword={setFormPassword}
                formRole={formRole}
                setFormRole={setFormRole}
                formIsActive={formIsActive}
                setFormIsActive={setFormIsActive}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                isSubmitting={isSubmitting}
                formError={formError}
                onSubmit={handleCreateUser}
                onCancel={closeCreateModal}
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="card-safe overflow-hidden min-w-0 bg-white rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between p-6 pb-2">
              <div>
                <h3 className="text-xl font-semibold mb-1">Edit User</h3>
                <p className="text-sm text-gray-600">
                  Editing {editingUser.full_name}
                </p>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto px-6 pb-6 pt-4">
              <UserFormFields
                mode="edit"
                formName={formName}
                setFormName={setFormName}
                formEmail={formEmail}
                setFormEmail={setFormEmail}
                formPhone={formPhone}
                setFormPhone={setFormPhone}
                formPassword={formPassword}
                setFormPassword={setFormPassword}
                formRole={formRole}
                setFormRole={setFormRole}
                formIsActive={formIsActive}
                setFormIsActive={setFormIsActive}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                isSubmitting={isSubmitting}
                formError={formError}
                onSubmit={handleUpdateUser}
                onCancel={closeEditModal}
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="card-safe overflow-hidden min-w-0 bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-2">Delete User</h3>
            <p className="text-gray-600 mb-1">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-gray-900">{deletingUser.full_name}</span>?
            </p>
            <p className="text-sm text-gray-500 mb-4">
              The account will be deactivated. This action can be reversed by re-activating the user.
            </p>

            {deleteError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                <p className="text-sm text-red-700">{deleteError}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
