import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle2, MessageSquare, ShieldCheck, Users } from 'lucide-react';

const verificationLogs = [
  {
    id: 'fv-1',
    customerName: 'Nadia Hassan',
    verifiedBy: 'Lisa Martinez',
    communicatedWith: 'Sarah Johnson',
    status: 'Verified',
    note: 'Finance confirmed the transfer and notified marketing after matching the amount with the payment reference.',
    time: '2026-05-16T11:30:00Z',
  },
  {
    id: 'fv-2',
    customerName: 'Mona Al Rashid',
    verifiedBy: 'Lisa Martinez',
    communicatedWith: 'Sarah Johnson',
    status: 'Pending follow-up',
    note: 'Finance requested a clearer receipt image before closing the verification.',
    time: '2026-05-17T14:20:00Z',
  },
  {
    id: 'fv-3',
    customerName: 'Aisha Khalid',
    verifiedBy: 'Admin User',
    communicatedWith: 'Marketing Lead',
    status: 'Verified',
    note: 'Supporting proof and transfer note were attached and approved for paid customer transfer.',
    time: '2026-05-18T08:45:00Z',
  },
];

export function FinanceVerifications() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  if (user.role !== 'ceo' && user.role !== 'system_administrator') {
    return (
      <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
        <p className="text-gray-500">Access denied. CEO or System Administrator access required.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-col lg:flex-row">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Finance Verifications</h2>
          <p className="text-gray-600 mt-1">Read-only view of finance verification activity and communication with marketing.</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 shadow-sm min-w-[220px]">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm text-gray-500">Viewing as</p>
              <p className="font-medium text-gray-900">{user.name}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total checks', value: verificationLogs.length },
          { label: 'Verified', value: verificationLogs.filter((log) => log.status === 'Verified').length },
          { label: 'Needs follow-up', value: verificationLogs.filter((log) => log.status !== 'Verified').length },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {verificationLogs.map((log) => (
          <div key={log.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
            <div className="flex items-start justify-between gap-4 flex-col sm:flex-row">
              <div>
                <h3 className="font-semibold text-lg text-gray-900">{log.customerName}</h3>
                <p className="text-sm text-gray-500 mt-1">Verified by {log.verifiedBy} • Communicated with {log.communicatedWith}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${log.status === 'Verified' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                {log.status}
              </span>
            </div>

            <p className="text-gray-700 mt-4">{log.note}</p>

            <div className="mt-4 flex items-center gap-4 text-sm text-gray-500 flex-wrap">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>Verification log</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                <span>{new Date(log.time).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>Marketing communication recorded</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FinanceVerifications;
