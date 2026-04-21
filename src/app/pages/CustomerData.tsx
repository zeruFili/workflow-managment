import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CustomerRequest, CustomerRequestCategory, CustomerRequestStatus, PaidCustomer, PaymentProof } from '../types';
import { Calendar, CheckCircle2, Mail, MapPin, Phone, User, Users, X } from 'lucide-react';

const STORAGE_KEY = 'customer-requests';
const PAID_STORAGE_KEY = 'paid-customers';

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

export function CustomerData() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<CustomerRequest[]>([]);
  const [paidCustomers, setPaidCustomers] = useState<PaidCustomer[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<CustomerRequest | null>(null);
  const [paymentNote, setPaymentNote] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofError, setProofError] = useState('');

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
    const savedPaidCustomers = localStorage.getItem(PAID_STORAGE_KEY);
    if (savedPaidCustomers) {
      setPaidCustomers(JSON.parse(savedPaidCustomers));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(PAID_STORAGE_KEY, JSON.stringify(paidCustomers));
  }, [paidCustomers]);

  const readProofAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Unable to read proof file'));
      reader.readAsDataURL(file);
    });

  const closeTransferModal = () => {
    setSelectedRequest(null);
    setPaymentNote('');
    setProofFile(null);
    setProofError('');
  };

  const openTransferModal = (request: CustomerRequest) => {
    setSelectedRequest(request);
    setPaymentNote('');
    setProofFile(null);
    setProofError('');
  };

  const handleTransferToPaidCustomers = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedRequest) {
      return;
    }

    const proofRequired = user?.role === 'marketing_lead';
    if (proofRequired && !proofFile) {
      setProofError('Marketing Lead must attach proof of payment before transfer.');
      return;
    }

    let proofOfPayment: PaymentProof | undefined;
    if (proofFile) {
      const dataUrl = await readProofAsDataUrl(proofFile);
      proofOfPayment = {
        name: proofFile.name,
        type: proofFile.type,
        size: `${Math.round(proofFile.size / 1024)} KB`,
        dataUrl,
      };
    }

    const paidCustomer: PaidCustomer = {
      ...selectedRequest,
      sourceRequestId: selectedRequest.id,
      transferredAt: new Date().toISOString(),
      transferredBy: user.id,
      transferredByName: user.name,
      paymentNote: paymentNote.trim() || undefined,
      proofOfPayment,
    };

    const updatedRequests = requests.filter((request) => request.id !== selectedRequest.id);
    const updatedPaidCustomers = [paidCustomer, ...paidCustomers];

    setRequests(updatedRequests);
    setPaidCustomers(updatedPaidCustomers);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedRequests));
    localStorage.setItem(PAID_STORAGE_KEY, JSON.stringify(updatedPaidCustomers));
    closeTransferModal();
  };

  if (!user) {
    return null;
  }

  if (user.role !== 'marketing_lead' && user.role !== 'system_administrator') {
    return (
      <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
        <p className="text-gray-500">Access denied. Marketing Lead or System Administrator access required.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-col lg:flex-row">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Customer Data</h2>
          <p className="text-gray-600 mt-1">View all stored customer service request records and ownership details.</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 shadow-sm min-w-[220px]">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-sm text-gray-500">Viewing as</p>
              <p className="font-medium text-gray-900">{user.name}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
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
              {request.budget && (
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">Budget:</span>
                  <span>{request.budget}</span>
                </div>
              )}
              {request.notes && (
                <div className="md:col-span-2 p-3 bg-gray-50 rounded-lg text-gray-700">
                  {request.notes}
                </div>
              )}
            </div>

            <div className="mt-5 pt-4 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>Created by {request.createdByName}</span>
                <span className="text-gray-300">•</span>
                <span>Owner ID: {request.createdBy}</span>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs uppercase tracking-wide text-gray-400">
                  Preferred start: {request.preferredStartDate ? new Date(request.preferredStartDate).toLocaleDateString() : 'N/A'}
                </span>
                <button
                  onClick={() => openTransferModal(request)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Transfer to Paid Customers
                </button>
              </div>
            </div>
          </div>
        ))}

        {requests.length === 0 && (
          <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
            <p className="text-gray-500">No customer data has been created yet.</p>
          </div>
        )}
      </div>

      {selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl border border-gray-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Transfer to Paid Customers</h3>
                <p className="text-sm text-gray-500">Confirm payment and move this record into the paid table.</p>
              </div>
              <button onClick={closeTransferModal} className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <form onSubmit={handleTransferToPaidCustomers} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">Customer</p>
                  <p className="font-medium text-gray-900">{selectedRequest.customerName}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">Category</p>
                  <p className="font-medium text-gray-900">{categoryLabels[selectedRequest.category]}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Note</label>
                <textarea
                  value={paymentNote}
                  onChange={(event) => setPaymentNote(event.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[100px]"
                  placeholder="Add payment confirmation details, reference number, or remarks"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Proof of Payment {user.role === 'marketing_lead' ? '(required)' : '(optional)'}
                </label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(event) => {
                    setProofError('');
                    setProofFile(event.target.files?.[0] || null);
                  }}
                  className="w-full text-sm"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Upload a screenshot or supporting file. The file is saved with the paid customer record.
                </p>
                {proofError && <p className="text-sm text-red-600 mt-2">{proofError}</p>}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeTransferModal}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Confirm Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}