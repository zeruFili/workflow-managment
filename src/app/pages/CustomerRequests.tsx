import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CustomerRequest, CustomerRequestCategory, CustomerRequestStatus } from '../types';
import { Calendar, Building2, Mail, MapPin, Phone, Plus, User, Users } from 'lucide-react';

const STORAGE_KEY = 'customer-requests';

const categoryLabels: Record<CustomerRequestCategory, string> = {
  home_design: 'Home Design',
  finishing_work: 'Finishing Work',
  hair_salon_design: 'Women\'s Hair Salon Design',
  other: 'Other',
};

const categoryDescriptions: Record<CustomerRequestCategory, string> = {
  home_design: 'Planning, interior concepts, and residential design support.',
  finishing_work: 'Final-fit work, detailing, and completion services.',
  hair_salon_design: 'Salon layout, customer flow, and design execution.',
  other: 'Any other customer service request or special project.',
};

const statusStyles: Record<CustomerRequestStatus, string> = {
  new: 'bg-blue-100 text-blue-700',
  in_review: 'bg-amber-100 text-amber-700',
  scheduled: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-gray-100 text-gray-700',
};

const initialRequests: CustomerRequest[] = [
  {
    id: 'cr-1',
    customerName: 'Nadia Hassan',
    customerPhone: '+971 50 123 4567',
    customerEmail: 'nadia@example.com',
    customerAddress: 'Dubai Marina, Dubai',
    category: 'home_design',
    serviceDescription: 'Request for a modern home concept with living room, kitchen, and bedroom layout planning.',
    preferredStartDate: '2026-04-28',
    budget: 'AED 180,000',
    notes: 'Prefers a warm minimal style with natural materials.',
    status: 'in_review',
    createdAt: '2026-04-10T09:20:00Z',
    createdBy: '1',
    createdByName: 'Sarah Johnson',
  },
  {
    id: 'cr-2',
    customerName: 'Mona Al Rashid',
    customerPhone: '+971 55 888 1122',
    customerEmail: 'mona@example.com',
    customerAddress: 'Abu Dhabi Corniche, Abu Dhabi',
    category: 'hair_salon_design',
    serviceDescription: 'Women\'s hair salon interior design with reception, styling stations, and waiting area.',
    preferredStartDate: '2026-05-05',
    budget: 'AED 95,000',
    notes: 'Needs privacy zoning and premium finishes.',
    status: 'new',
    createdAt: '2026-04-14T13:45:00Z',
    createdBy: '8',
    createdByName: 'Admin User',
  },
];

const emptyForm = {
  customerName: '',
  customerPhone: '',
  customerEmail: '',
  customerAddress: '',
  category: 'home_design' as CustomerRequestCategory,
  serviceDescription: '',
  preferredStartDate: '',
  budget: '',
  notes: '',
};

export function CustomerRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<CustomerRequest[]>([]);
  const [formData, setFormData] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const savedRequests = localStorage.getItem(STORAGE_KEY);
    if (savedRequests) {
      setRequests(JSON.parse(savedRequests));
      return;
    }

    setRequests(initialRequests);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialRequests));
  }, []);

  useEffect(() => {
    if (requests.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
    }
  }, [requests]);

  if (!user) {
    return null;
  }

  if (user.role !== 'marketing_lead') {
    return (
      <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
        <p className="text-gray-500">Access denied. Marketing Lead access required.</p>
      </div>
    );
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    const newRequest: CustomerRequest = {
      id: `cr-${Date.now()}`,
      customerName: formData.customerName.trim(),
      customerPhone: formData.customerPhone.trim(),
      customerEmail: formData.customerEmail.trim() || undefined,
      customerAddress: formData.customerAddress.trim(),
      category: formData.category,
      serviceDescription: formData.serviceDescription.trim(),
      preferredStartDate: formData.preferredStartDate || undefined,
      budget: formData.budget.trim() || undefined,
      notes: formData.notes.trim() || undefined,
      status: 'new',
      createdAt: new Date().toISOString(),
      createdBy: user.id,
      createdByName: user.name,
    };

    setRequests((currentRequests) => [newRequest, ...currentRequests]);
    setFormData(emptyForm);
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-col lg:flex-row">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Customer Requests</h2>
          <p className="text-gray-600 mt-1">
            Capture customer service requests and track the user who created each record.
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 shadow-sm min-w-[220px]">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm text-gray-500">Logged in as</p>
              <p className="font-medium text-gray-900">{user.name}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Plus className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-gray-900">New Request</h3>
              <p className="text-sm text-gray-500">Create a service request record</p>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Customer Name</label>
                <input
                  value={formData.customerName}
                  onChange={(event) => setFormData({ ...formData, customerName: event.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter customer name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                <input
                  value={formData.customerPhone}
                  onChange={(event) => setFormData({ ...formData, customerPhone: event.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter phone number"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.customerEmail}
                  onChange={(event) => setFormData({ ...formData, customerEmail: event.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="customer@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Start Date</label>
                <input
                  type="date"
                  value={formData.preferredStartDate}
                  onChange={(event) => setFormData({ ...formData, preferredStartDate: event.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Customer Address</label>
              <input
                value={formData.customerAddress}
                onChange={(event) => setFormData({ ...formData, customerAddress: event.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter customer address"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Request Category</label>
              <select
                value={formData.category}
                onChange={(event) => setFormData({ ...formData, category: event.target.value as CustomerRequestCategory })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Service Description</label>
              <textarea
                value={formData.serviceDescription}
                onChange={(event) => setFormData({ ...formData, serviceDescription: event.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[120px]"
                placeholder="Describe the customer request in detail"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Budget</label>
                <input
                  value={formData.budget}
                  onChange={(event) => setFormData({ ...formData, budget: event.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="AED 50,000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Internal Notes</label>
                <input
                  value={formData.notes}
                  onChange={(event) => setFormData({ ...formData, notes: event.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Optional notes"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-3 rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Request
            </button>
          </form>
        </div>

        <div className="xl:col-span-3 space-y-4">
          {requests.map((request) => (
            <div key={request.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
              <div className="flex items-start justify-between gap-4 flex-col sm:flex-row">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-lg text-gray-900">{request.customerName}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[request.status]}`}>
                      {request.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{categoryLabels[request.category]}</p>
                </div>
                <div className="text-sm text-gray-500 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {new Date(request.createdAt).toLocaleString()}
                </div>
              </div>

              <p className="text-gray-700 mt-4">{request.serviceDescription}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span>{request.customerPhone}</span>
                </div>
                {request.customerEmail && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span>{request.customerEmail}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 md:col-span-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span>{request.customerAddress}</span>
                </div>
                {request.preferredStartDate && (
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span>Preferred start: {new Date(request.preferredStartDate).toLocaleDateString()}</span>
                  </div>
                )}
                {request.budget && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">Budget:</span>
                    <span>{request.budget}</span>
                  </div>
                )}
              </div>

              {request.notes && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg text-sm text-gray-700">
                  {request.notes}
                </div>
              )}

              <div className="mt-5 pt-4 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  <span>Created by {request.createdByName}</span>
                  <span className="text-gray-300">•</span>
                  <span>Owner ID: {request.createdBy}</span>
                </div>
                <span className="text-xs uppercase tracking-wide text-gray-400">
                  {categoryDescriptions[request.category]}
                </span>
              </div>
            </div>
          ))}

          {requests.length === 0 && (
            <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
              <p className="text-gray-500">No customer requests have been created yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}