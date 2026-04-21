import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { PaidCustomer, CustomerRequestCategory, CustomerRequestStatus } from '../types';
import { Calendar, CircleDollarSign, FileText, Mail, MapPin, Phone, User, Users } from 'lucide-react';

const STORAGE_KEY = 'paid-customers';

const categoryLabels: Record<CustomerRequestCategory, string> = {
  home_design: 'Home Design',
  finishing_work: 'Finishing Work',
  hair_salon_design: 'Women\'s Hair Salon Design',
  other: 'Other',
};

const statusStyles: Record<CustomerRequestStatus, string> = {
  new: 'bg-blue-100 text-blue-700',
  in_review: 'bg-amber-100 text-amber-700',
  scheduled: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-gray-100 text-gray-700',
};

const initialPaidCustomers: PaidCustomer[] = [
  {
    id: 'paid-1',
    sourceRequestId: 'cr-1',
    customerName: 'Nadia Hassan',
    customerPhone: '+971 50 123 4567',
    customerEmail: 'nadia@example.com',
    customerAddress: 'Dubai Marina, Dubai',
    category: 'home_design',
    serviceDescription: 'Modern home concept package with living room, kitchen, and bedroom layout planning.',
    preferredStartDate: '2026-04-28',
    budget: 'AED 180,000',
    notes: 'Payment confirmed for the first design phase.',
    status: 'closed',
    createdAt: '2026-04-10T09:20:00Z',
    createdBy: '1',
    createdByName: 'Sarah Johnson',
    transferredAt: '2026-04-16T11:30:00Z',
    transferredBy: '8',
    transferredByName: 'Admin User',
    paymentNote: 'Bank transfer received and verified by finance.',
  },
  {
    id: 'paid-2',
    sourceRequestId: 'cr-2',
    customerName: 'Mona Al Rashid',
    customerPhone: '+971 55 888 1122',
    customerEmail: 'mona@example.com',
    customerAddress: 'Abu Dhabi Corniche, Abu Dhabi',
    category: 'hair_salon_design',
    serviceDescription: 'Women\'s hair salon interior design with reception, styling stations, and waiting area.',
    preferredStartDate: '2026-05-05',
    budget: 'AED 95,000',
    notes: 'Client paid deposit and shared screenshot proof.',
    status: 'closed',
    createdAt: '2026-04-14T13:45:00Z',
    createdBy: '8',
    createdByName: 'Admin User',
    transferredAt: '2026-04-18T15:10:00Z',
    transferredBy: '1',
    transferredByName: 'Sarah Johnson',
    paymentNote: 'Deposit confirmed after screenshot review.',
    proofOfPayment: {
      name: 'payment-proof-sample.png',
      type: 'image/png',
      size: '128 KB',
      dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7qQn0AAAAASUVORK5CYII=',
    },
  },
];

export function PaidCustomers() {
  const { user } = useAuth();
  const [paidCustomers, setPaidCustomers] = useState<PaidCustomer[]>([]);

  useEffect(() => {
    const savedPaidCustomers = localStorage.getItem(STORAGE_KEY);
    if (savedPaidCustomers) {
      setPaidCustomers(JSON.parse(savedPaidCustomers));
      return;
    }

    setPaidCustomers(initialPaidCustomers);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialPaidCustomers));
  }, []);

  if (!user) {
    return null;
  }

  if (user.role !== 'general_manager' && user.role !== 'marketing_lead' && user.role !== 'system_administrator') {
    return (
      <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
        <p className="text-gray-500">Access denied. General Manager, Marketing Lead, or System Administrator access required.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-col lg:flex-row">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Paid Customers</h2>
          <p className="text-gray-600 mt-1">Customer requests transferred after payment confirmation.</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 shadow-sm min-w-[220px]">
          <div className="flex items-center gap-3">
            <CircleDollarSign className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-sm text-gray-500">Viewing as</p>
              <p className="font-medium text-gray-900">{user.name}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {paidCustomers.map((customer) => (
          <div key={customer.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
            <div className="flex items-start justify-between gap-4 flex-col sm:flex-row">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-lg text-gray-900">{customer.customerName}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[customer.status]}`}>
                    Paid
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">{categoryLabels[customer.category]}</p>
              </div>
              <div className="text-sm text-gray-500 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {new Date(customer.transferredAt).toLocaleString()}
              </div>
            </div>

            <p className="text-gray-700 mt-4">{customer.serviceDescription}</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <span>{customer.customerPhone}</span>
              </div>
              {customer.customerEmail && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span>{customer.customerEmail}</span>
                </div>
              )}
              <div className="flex items-center gap-2 md:col-span-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span>{customer.customerAddress}</span>
              </div>
              {customer.budget && (
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">Budget:</span>
                  <span>{customer.budget}</span>
                </div>
              )}
              {customer.paymentNote && (
                <div className="md:col-span-2 p-3 bg-gray-50 rounded-lg text-gray-700">
                  {customer.paymentNote}
                </div>
              )}
            </div>

            <div className="mt-5 pt-4 border-t border-gray-200 grid grid-cols-1 lg:grid-cols-3 gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>Transferred by {customer.transferredByName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>Source request owner: {customer.createdByName}</span>
              </div>
              <div className="flex items-center gap-2">
                <CircleDollarSign className="w-4 h-4" />
                <span>Transfer ID: {customer.sourceRequestId}</span>
              </div>
            </div>

            {customer.proofOfPayment && (
              <div className="mt-4 p-4 border border-dashed border-green-300 rounded-lg bg-green-50">
                <div className="flex items-center gap-2 text-green-700 font-medium">
                  <FileText className="w-4 h-4" />
                  Proof of payment attached
                </div>
                <p className="text-sm text-green-800 mt-1">{customer.proofOfPayment.name} ({customer.proofOfPayment.size})</p>
                {customer.proofOfPayment.type.startsWith('image/') && (
                  <img
                    src={customer.proofOfPayment.dataUrl}
                    alt={customer.proofOfPayment.name}
                    className="mt-3 max-h-56 rounded-lg border border-green-200 object-contain bg-white"
                  />
                )}
                {!customer.proofOfPayment.type.startsWith('image/') && (
                  <a
                    href={customer.proofOfPayment.dataUrl}
                    download={customer.proofOfPayment.name}
                    className="inline-flex mt-3 text-sm text-green-700 underline"
                  >
                    Download proof file
                  </a>
                )}
              </div>
            )}
          </div>
        ))}

        {paidCustomers.length === 0 && (
          <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
            <p className="text-gray-500">No paid customers have been recorded yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}