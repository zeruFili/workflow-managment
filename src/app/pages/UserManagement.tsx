import React, { useState } from 'react';
import { useAuth, getRoleName } from '../contexts/AuthContext';
import { UserRole } from '../types';
import { Users, Plus, Edit, Trash2, Search } from 'lucide-react';

interface UserData {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  email: string;
  status: 'active' | 'inactive' | 'deleted';
  deletedAt?: string;
}

const mockUsers: UserData[] = [
  { id: '1', username: 'marketing', name: 'Sarah Johnson', role: 'marketing_lead', email: 'sarah@company.com', status: 'active' },
  { id: '2', username: 'gm', name: 'John Smith', role: 'general_manager', email: 'john@company.com', status: 'active' },
  { id: '3', username: 'design_lead', name: 'Emily Chen', role: 'design_team_leader', email: 'emily@company.com', status: 'active' },
  { id: '4', username: 'designer', name: 'Michael Brown', role: 'designer', email: 'michael@company.com', status: 'active' },
  { id: '5', username: 'engineer', name: 'David Wilson', role: 'site_engineer', email: 'david@company.com', status: 'active' },
  { id: '6', username: 'finance', name: 'Lisa Martinez', role: 'finance_officer', email: 'lisa@company.com', status: 'active' },
  { id: '7', username: 'purchasing', name: 'Robert Taylor', role: 'purchasing_team', email: 'robert@company.com', status: 'active' },
  { id: '8', username: 'admin', name: 'Admin User', role: 'system_administrator', email: 'admin@company.com', status: 'active' },
];

export function UserManagement() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserData[]>(mockUsers);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewUser, setShowNewUser] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<'active' | 'inactive'>('active');
  const [selectedRole, setSelectedRole] = useState<UserRole>('marketing_lead');

  const openStatusEditor = (userData: UserData) => {
    if (userData.status === 'deleted') {
      return;
    }

    setEditingUser(userData);
    setSelectedStatus(userData.status);
    setSelectedRole(userData.role);
  };

  const saveUserStatus = () => {
    if (!editingUser) {
      return;
    }

    setUsers((currentUsers) =>
      currentUsers.map((currentUser) =>
        currentUser.id === editingUser.id
          ? { ...currentUser, status: selectedStatus, role: selectedRole }
          : currentUser
      )
    );
    setEditingUser(null);
  };

  const markUserAsDeleted = (userData: UserData) => {
    if (userData.status === 'deleted') {
      return;
    }

    const shouldDelete = window.confirm(`Mark ${userData.name} as deleted?`);
    if (!shouldDelete) {
      return;
    }

    setUsers((currentUsers) =>
      currentUsers.map((currentUser) =>
        currentUser.id === userData.id
          ? {
              ...currentUser,
              status: 'deleted',
              deletedAt: new Date().toISOString(),
            }
          : currentUser
      )
    );
  };

  if (!user || user.role !== 'system_administrator') {
    return (
      <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
        <p className="text-gray-500">Access denied. Administrator privileges required.</p>
      </div>
    );
  }

  let filteredUsers = users;

  if (searchTerm) {
    filteredUsers = filteredUsers.filter(u =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  const roleColors: Record<UserRole, string> = {
    marketing_lead: 'bg-purple-100 text-purple-700',
    general_manager: 'bg-blue-100 text-blue-700',
    design_team_leader: 'bg-indigo-100 text-indigo-700',
    designer: 'bg-cyan-100 text-cyan-700',
    site_engineer: 'bg-orange-100 text-orange-700',
    finance_officer: 'bg-green-100 text-green-700',
    purchasing_team: 'bg-yellow-100 text-yellow-700',
    system_administrator: 'bg-red-100 text-red-700',
  };

  return (
    <div className="space-y-6">
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
                    {userData.name.split(' ').map(n => n[0]).join('')}
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
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  userData.status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : userData.status === 'inactive'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-200 text-gray-700'
                }`}>
                  {userData.status}
                </span>
              </div>

              <div className="border-t border-gray-100 pt-3">
                <p className="text-xs text-gray-500">Email</p>
                <p className="text-sm text-gray-700 break-all">{userData.email}</p>
              </div>

              {userData.status === 'deleted' && userData.deletedAt && (
                <p className="text-xs text-gray-500">Deleted on {new Date(userData.deletedAt).toLocaleDateString()}</p>
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

      {showNewUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <h3 className="text-xl font-semibold mb-4">Add New User</h3>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="marketing_lead">Marketing Lead</option>
                  <option value="general_manager">General Manager</option>
                  <option value="design_team_leader">Design Team Leader</option>
                  <option value="designer">Designer</option>
                  <option value="site_engineer">Site Engineer</option>
                  <option value="finance_officer">Finance Officer</option>
                  <option value="purchasing_team">Purchasing Team</option>
                  <option value="system_administrator">System Administrator</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <input
                  type="password"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewUser(false)}
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

      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
          <div className="bg-white rounded-t-2xl p-5 w-full max-w-sm shadow-2xl border border-gray-200 border-b-0">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-1">Edit User</h3>
            <p className="text-sm text-gray-600 mb-4">Update role and status for {editingUser.name}</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="marketing_lead">Marketing Lead</option>
                  <option value="general_manager">General Manager</option>
                  <option value="design_team_leader">Design Team Leader</option>
                  <option value="designer">Designer</option>
                  <option value="site_engineer">Site Engineer</option>
                  <option value="finance_officer">Finance Officer</option>
                  <option value="purchasing_team">Purchasing Team</option>
                  <option value="system_administrator">System Administrator</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as 'active' | 'inactive')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                </select>
              </div>
            </div>

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
