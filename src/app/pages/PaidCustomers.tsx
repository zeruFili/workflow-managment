import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { PaidCustomer, CustomerRequestCategory } from '../types';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Mail,
  MapPin,
  Phone,
  User,
  Users,
  FileText,
  AlertCircle,
} from 'lucide-react';

const PAID_STORAGE_KEY = 'paid-customers';

const categoryLabels: Record<CustomerRequestCategory, string> = {
  home_design: 'Home Design',
  finishing_work: 'Finishing Work',
  hair_salon_design: "Women's Hair Salon Design",
  other: 'Other',
};

// Initial mock paid customers (used when localStorage is empty)
const initialPaidCustomers: PaidCustomer[] = [
  {
    id: 'pc-1',
    customerName: 'Nadia Hassan',
    customerPhone: '+971 50 123 4567',
    customerEmail: 'nadia@example.com',
    customerAddress: 'Dubai Marina, Dubai',
    category: 'home_design',
    serviceDescription: 'Modern home concept – living room, kitchen, bedroom layout planning.',
    preferredStartDate: '2026-04-28',
    budget: 'AED 180,000',
    notes: 'Warm minimal style with natural materials.',
    status: 'scheduled',
    createdAt: '2026-04-10T09:20:00Z',
    createdBy: '1',
    createdByName: 'Sarah Johnson',
    sourceRequestId: 'cr-1',
    transferredAt: '2026-05-01T14:00:00Z',
    transferredBy: '8',
    transferredByName: 'Admin User',
    paymentNote: '50% upfront received, reference INV-2026-042',
    proofOfPayment: [],
    paymentVerificationStatus: 'verified',
  },
  {
    id: 'pc-2',
    customerName: 'Mona Al Rashid',
    customerPhone: '+971 55 888 1122',
    customerEmail: 'mona@example.com',
    customerAddress: 'Abu Dhabi Corniche, Abu Dhabi',
    category: 'hair_salon_design',
    serviceDescription: "Women's salon interior with reception, styling stations, waiting area.",
    preferredStartDate: '2026-05-05',
    budget: 'AED 95,000',
    notes: 'Privacy zoning and premium finishes.',
    status: 'in_progress',
    createdAt: '2026-04-14T13:45:00Z',
    createdBy: '8',
    createdByName: 'Admin User',
    sourceRequestId: 'cr-2',
    transferredAt: '2026-05-03T09:30:00Z',
    transferredBy: '8',
    transferredByName: 'Admin User',
    paymentNote: 'Full payment cleared.',
    proofOfPayment: [],
    paymentVerificationStatus: 'verified',
  },
  {
    id: 'pc-3',
    customerName: 'Omar El-Sayed',
    customerPhone: '+971 52 345 6789',
    customerEmail: 'omar.elsayed@example.com',
    customerAddress: 'Jumeirah Beach Residence, Dubai',
    category: 'finishing_work',
    serviceDescription: 'Complete finishing for 3-bedroom apartment – flooring, painting, custom cabinetry.',
    preferredStartDate: '2026-05-12',
    budget: 'AED 250,000',
    notes: 'Marble flooring in living areas, wooden flooring in bedrooms.',
    status: 'scheduled',
    createdAt: '2026-04-20T11:15:00Z',
    createdBy: '1',
    createdByName: 'Sarah Johnson',
    sourceRequestId: 'cr-3',
    transferredAt: '2026-05-05T10:15:00Z',
    transferredBy: '8',
    transferredByName: 'Admin User',
    paymentNote: 'Deposit paid, balance upon completion.',
    proofOfPayment: [],
    paymentVerificationStatus: 'verified',
  },
  {
    id: 'pc-4',
    customerName: 'Rashid Al Fahim',
    customerPhone: '+971 54 321 6549',
    customerEmail: '',
    customerAddress: 'Al Ain, Abu Dhabi',
    category: 'other',
    serviceDescription: 'Custom built-in library and reading nook for a private residence.',
    preferredStartDate: '2026-05-20',
    budget: 'AED 45,000',
    notes: 'Woodwork must match existing mahogany furniture.',
    status: 'completed',
    createdAt: '2026-04-18T14:30:00Z',
    createdBy: '1',
    createdByName: 'Sarah Johnson',
    sourceRequestId: 'cr-5',
    transferredAt: '2026-05-02T08:45:00Z',
    transferredBy: '8',
    transferredByName: 'Admin User',
    paymentNote: 'Paid in full, job closed.',
    proofOfPayment: [],
    paymentVerificationStatus: 'verified',
    otherCategoryDescription: 'Custom Furniture & Joinery',
  },
  {
    id: 'pc-5',
    customerName: 'Layla Haddad',
    customerPhone: '+971 50 987 6543',
    customerEmail: 'layla.h@example.com',
    customerAddress: 'Dubai Hills Estate, Dubai',
    category: 'hair_salon_design',
    serviceDescription: 'Luxury salon with VIP rooms, bridal suite, and retail display.',
    preferredStartDate: '2026-05-25',
    budget: 'AED 180,000',
    notes: 'Rose gold and marble branding, custom product shelves.',
    status: 'in_progress',
    createdAt: '2026-05-05T16:45:00Z',
    createdBy: '8',
    createdByName: 'Admin User',
    sourceRequestId: 'cr-8',
    transferredAt: '2026-05-10T12:00:00Z',
    transferredBy: '8',
    transferredByName: 'Admin User',
    paymentNote: 'Initial payment received.',
    proofOfPayment: [],
    paymentVerificationStatus: 'pending',
  },
];

export function PaidCustomers() {
  const { user } = useAuth();
  const [paidCustomers, setPaidCustomers] = useState<PaidCustomer[]>([]);

  // Load from localStorage or use mock data
  useEffect(() => {
    const saved = localStorage.getItem(PAID_STORAGE_KEY);
    if (saved) {
      setPaidCustomers(JSON.parse(saved));
    } else {
      setPaidCustomers(initialPaidCustomers);
      localStorage.setItem(PAID_STORAGE_KEY, JSON.stringify(initialPaidCustomers));
    }
  }, []);

  // Persist changes
  useEffect(() => {
    if (paidCustomers.length > 0) {
      localStorage.setItem(PAID_STORAGE_KEY, JSON.stringify(paidCustomers));
    }
  }, [paidCustomers]);

  if (!user) return null;

  const canAccess = user.role === 'marketing_lead' || user.role === 'system_administrator';
  if (!canAccess) {
    return (
      <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
        <p className="text-gray-500">Access denied. Marketing Lead or System Administrator access required.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-col lg:flex-row">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Paid Customers</h2>
          <p className="text-gray-600 mt-1">All customer records that have been transferred after payment confirmation.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 shadow-sm min-w-[220px]">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-500">Viewing as</p>
                <p className="font-medium text-gray-900">{user.name}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Paid customer list */}
      <div className="grid grid-cols-1 gap-4">
        {paidCustomers.map((customer) => (
          <div key={customer.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
            <div className="flex items-start justify-between gap-4 flex-col sm:flex-row">
              <div>
                <h3 className="font-semibold text-lg text-gray-900">{customer.customerName}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {categoryLabels[customer.category]}
                  {'otherCategoryDescription' in customer && customer.otherCategoryDescription
                    ? ` (${customer.otherCategoryDescription})`
                    : ''}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
               
                <div className="text-sm text-gray-500 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Transferred: {new Date(customer.transferredAt).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Task Description Card (matching CustomerData style) */}
            <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <p className="text-xs font-medium text-blue-700 uppercase tracking-wide mb-1">Task Description</p>
              <p className="text-gray-700">{customer.serviceDescription}</p>
            </div>

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
                <div className="flex items-center gap-2 md:col-span-2">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">{customer.paymentNote}</span>
                </div>
              )}
              {customer.notes && (
                <div className="md:col-span-2 p-3 bg-gray-50 rounded-lg text-gray-700">
                  {customer.notes}
                </div>
              )}
            </div>

            <div className="mt-5 pt-4 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>Transferred by {customer.transferredByName}</span>
                <span className="text-gray-300">•</span>
                <span>Owner ID: {customer.transferredBy}</span>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs uppercase tracking-wide text-gray-400">
                  Preferred start: {customer.preferredStartDate ? new Date(customer.preferredStartDate).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        ))}

        {paidCustomers.length === 0 && (
          <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
            <p className="text-gray-500">No paid customer records yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}