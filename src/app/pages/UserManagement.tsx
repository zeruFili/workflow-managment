import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Users, Plus, Edit, Trash2, Search, Phone, Eye, EyeOff } from 'lucide-react';

// Updated role type with the new roles
type UserRole =
  | 'ceo'
  | 'marketing_lead'
  | 'general_manager'
  | 'finance'
  | 'data_collector'
  | 'designer'
  | 'quantity_surveyor';

// Role display names
const ROLE_LABELS: Record<UserRole, string> = {
  ceo: 'CEO',
  marketing_lead: 'Marketing Lead',
  general_manager: 'General Manager',
  finance: 'Finance',
  data_collector: 'Data Collector',
  designer: 'Designer',
  quantity_surveyor: 'Quantity Surveyor',
};

// Helper to get display name (replaces getRoleName from AuthContext)
function getRoleName(role: UserRole): string {
  return ROLE_LABELS[role] || role;
}

interface UserData {
  id: string;
  username: string;
  name: string; // Full name
  role: UserRole;
  email: string;
  phone?: string;
  passwordHashed?: string; // stored after hashing
  status: 'active' | 'inactive' | 'deleted';
  deletedAt?: string;
}

// Mock data with new roles
const mockUsers: UserData[] = [
  {
    id: '1',
    username: 'sarah.j',
    name: 'Sarah Johnson',
    role: 'marketing_lead',
    email: 'sarah@company.com',
    phone: '+1 555 1001',
    status: 'active',
  },
  {
    id: '2',
    username: 'john.s',
    name: 'John Smith',
    role: 'general_manager',
    email: 'john@company.com',
    phone: '+1 555 1002',
    status: 'active',
  },
  {
    id: '3',
    username: 'emily.c',
    name: 'Emily Chen',
    role: 'designer',
    email: 'emily@company.com',
    phone: '+1 555 1003',
    status: 'active',
  },
  {
    id: '4',
    username: 'mike.b',
    name: 'Michael Brown',
    role: 'designer',
    email: 'michael@company.com',
    phone: '+1 555 1004',
    status: 'active',
  },
  {
    id: '5',
    username: 'david.w',
    name: 'David Wilson',
    role: 'quantity_surveyor',
    email: 'david@company.com',
    phone: '+1 555 1005',
    status: 'active',
  },
  {
    id: '6',
    username: 'lisa.m',
    name: 'Lisa Martinez',
    role: 'finance',
    email: 'lisa@company.com',
    phone: '+1 555 1006',
    status: 'active',
  },
  {
    id: '7',
    username: 'robert.t',
    name: 'Robert Taylor',
    role: 'data_collector',
    email: 'robert@company.com',
    phone: '+1 555 1007',
    status: 'active',
  },
  {
    id: '8',
    username: 'admin',
    name: 'Admin User',
    role: 'ceo',
    email: 'admin@company.com',
    phone: '+1 555 1000',
    status: 'active',
  },
];

// Simple hash simulation (in real app this would be done server-side)
const hashPassword = (password: string): string => {
  // Simulate a hashed output, e.g., bcrypt style placeholder
  return `$2b$10$${btoa(password)}`;
};

export function UserManagement() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserData[]>(mockUsers);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewUser, setShowNewUser] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<'active' | 'inactive'>('active');
  const [selectedRole, setSelectedRole] = useState<UserRole>('marketing_lead');

  // Form state for adding a new user
  const [newUser, setNewUser] = useState({
    name: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    role: 'marketing_lead' as UserRole,
  });

  const [showPassword, setShowPassword] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Reset form
  const resetNewUserForm = () => {
    setNewUser({
      name: '',
      username: '',
      email: '',
      phone: '',
      password: '',
      role: 'marketing_lead',
    });
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();

    const hashedPwd = hashPassword(newUser.password);

    const newUserData: UserData = {
      id: Date.now().toString(), // simple unique ID
      username: newUser.username,
      name: newUser.name,
      role: newUser.role,
      email: newUser.email,
      phone: newUser.phone,
      passwordHashed: hashedPwd,
      status: 'active',
    };

    setUsers((prev) => [...prev, newUserData]);
    setShowNewUser(false);
    resetNewUserForm();
  };

  const openStatusEditor = (userData: UserData) => {
    if (userData.status === 'deleted') return;
    setEditingUser(userData);
    setSelectedStatus(userData.status);
    setSelectedRole(userData.role);
    setEditName(userData.name);
    setEditEmail(userData.email);
    setEditPhone(userData.phone || '');
    setEditPassword('');
    setShowEditPassword(false);
  };

  const saveUserStatus = () => {
    if (!editingUser) return;

    let newHashed = editingUser.passwordHashed;
    if (editPassword) {
      try {
        newHashed = hashPassword(editPassword);
      } catch (err) {
        console.error('hash error', err);
      }
    }

    setUsers((currentUsers) =>
      currentUsers.map((u) =>
        u.id === editingUser.id
          ? {
              ...u,
              name: editName,
              email: editEmail,
              phone: editPhone,
              role: selectedRole,
              status: selectedStatus,
              passwordHashed: newHashed,
            }
          : u
      )
    );
    setEditingUser(null);
  };

  const markUserAsDeleted = (userData: UserData) => {
    if (userData.status === 'deleted') return;
    const shouldDelete = window.confirm(`Mark ${userData.name} as deleted?`);
    if (!shouldDelete) return;
    setUsers((currentUsers) =>
      currentUsers.map((u) =>
        u.id === userData.id
          ? { ...u, status: 'deleted', deletedAt: new Date().toISOString() }
          : u
      )
    );
  };

  if (!user || (user.role !== 'system_administrator' && user.role !== 'ceo')) {
    return (
      <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
        <p className="text-gray-500">Access denied. CEO or Administrator privileges required.</p>
      </div>
    );
  }

  let filteredUsers = users;
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filteredUsers = filteredUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(term) ||
        u.username.toLowerCase().includes(term) ||
        u.email.toLowerCase().includes(term) ||
        (u.phone && u.phone.includes(term))
    );
  }

  // Updated color map with new roles
  const roleColors: Record<UserRole, string> = {
    ceo: 'bg-red-100 text-red-700',
    marketing_lead: 'bg-purple-100 text-purple-700',
    general_manager: 'bg-blue-100 text-blue-700',
    finance: 'bg-green-100 text-green-700',
    data_collector: 'bg-yellow-100 text-yellow-700',
    designer: 'bg-cyan-100 text-cyan-700',
    quantity_surveyor: 'bg-orange-100 text-orange-700',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
          <p className="text-gray-600 mt-1">Manage system users and their roles</p>
        </div>
        <button
          onClick={() => setShowNewUser(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Add User</span>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* User cards */}
      <div className="grid grid-cols-1 gap-4">
        {filteredUsers.map((userData) => (
          <div
            key={userData.id}
            className={`bg-white rounded-xl p-4 shadow-sm border border-gray-200 ${
              userData.status === 'deleted' ? 'opacity-80' : ''
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 font-medium text-sm">
                    {userData.name.split(' ').map((n) => n[0]).join('')}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{userData.name}</p>
                  <p className="text-xs text-gray-500 truncate">@{userData.username}</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => openStatusEditor(userData)}
                  disabled={userData.status === 'deleted'}
                  className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg disabled:text-gray-400 disabled:cursor-not-allowed"
                  title={userData.status === 'deleted' ? 'Deleted users cannot be edited' : 'Edit status and role'}
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => markUserAsDeleted(userData)}
                  disabled={userData.status === 'deleted'}
                  className="p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-lg disabled:text-gray-400 disabled:cursor-not-allowed"
                  title={userData.status === 'deleted' ? 'User already deleted' : 'Delete user'}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Role</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${roleColors[userData.role]}`}>
                  {getRoleName(userData.role)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</span>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    userData.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : userData.status === 'inactive'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {userData.status}
                </span>
              </div>

              <div className="border-t border-gray-100 pt-3 space-y-1">
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm text-gray-700 break-all">{userData.email}</p>
                </div>
                {userData.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-gray-400" />
                    <p className="text-xs text-gray-600">{userData.phone}</p>
                  </div>
                )}
              </div>

              {userData.status === 'deleted' && userData.deletedAt && (
                <p className="text-xs text-gray-500">
                  Deleted on {new Date(userData.deletedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No users found</p>
        </div>
      )}

      {/* Add User Modal */}
      {showNewUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <h3 className="text-xl font-semibold mb-4">Add New User</h3>
            <form onSubmit={handleAddUser} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={newUser.phone}
                  onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="+1 555 1234"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) =>
                    setNewUser({ ...newUser, role: e.target.value as UserRole })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full pr-10 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    placeholder="Will be hashed on save"
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
                  Password is hashed before storage.
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewUser(false);
                    resetNewUserForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Add User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-white rounded-t-2xl p-5 w-full max-w-sm shadow-2xl border border-gray-200 border-b-0">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-1">Edit User</h3>
            <p className="text-sm text-gray-600 mb-4">
              Update role and status for {editingUser.name}
            </p>

            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                saveUserStatus();
              }}
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full pr-10 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Leave blank to keep current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700"
                    aria-label={showEditPassword ? 'Hide password' : 'Show password'}
                  >
                    {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">Provide a new password to change it.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Account Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as 'active' | 'inactive')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                </select>
              </div>
            </form>

            <div className="grid grid-cols-2 gap-3 pt-5">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveUserStatus}
                className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}