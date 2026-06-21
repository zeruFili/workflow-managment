import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  CustomerRequest,
  CustomerRequestCategory,
  CustomerRequestStatus,
  PaidCustomer,
  PaymentProof,
} from '../types';
import marketingApi, { MarketingTaskItem } from '../../api/marketingApi';
import {
  Calendar,
  CheckCircle2,
  Mail,
  MapPin,
  Phone,
  Plus,
  User,
  Users,
  X,
  FileText,
  Send,
  Tag,
  DollarSign,
} from 'lucide-react';

const STORAGE_KEY = 'customer-requests';
const PAID_STORAGE_KEY = 'paid-customers';

const categoryLabels: Record<CustomerRequestCategory, string> = {
  home_design: 'Home Design',
  finishing_work: 'Finishing Work',
  hair_salon_design: "Women's Hair Salon Design",
  other: 'Other',
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
    serviceDescription: "Women's hair salon interior design with reception, styling stations, and waiting area.",
    preferredStartDate: '2026-05-05',
    budget: 'AED 95,000',
    notes: 'Needs privacy zoning and premium finishes.',
    status: 'new',
    createdAt: '2026-04-14T13:45:00Z',
    createdBy: '1',
    createdByName: 'Sarah Johnson',
  },
  {
    id: 'cr-3',
    customerName: 'Omar El-Sayed',
    customerPhone: '+971 52 345 6789',
    customerEmail: 'omar.elsayed@example.com',
    customerAddress: 'Jumeirah Beach Residence, Dubai',
    category: 'finishing_work',
    serviceDescription: 'Complete finishing for a 3-bedroom apartment including flooring, painting, and custom cabinetry.',
    preferredStartDate: '2026-05-12',
    budget: 'AED 250,000',
    notes: 'Client prefers marble flooring in living areas and wooden flooring in bedrooms.',
    status: 'new',
    createdAt: '2026-04-20T11:15:00Z',
    createdBy: '1',
    createdByName: 'Sarah Johnson',
  },
  {
    id: 'cr-4',
    customerName: 'Aisha Mahmoud',
    customerPhone: '+971 56 789 0123',
    customerEmail: 'aisha.mahmoud@example.com',
    customerAddress: 'Al Reem Island, Abu Dhabi',
    category: 'home_design',
    serviceDescription: 'Full home design for a 4-bedroom villa with a modern Arabian theme, including landscaping.',
    preferredStartDate: '2026-06-01',
    budget: 'AED 350,000',
    notes: 'Client wants integrated smart home features and a home office setup.',
    status: 'scheduled',
    createdAt: '2026-04-25T09:00:00Z',
    createdBy: '1',
    createdByName: 'Sarah Johnson',
  },
  {
    id: 'cr-5',
    customerName: 'Rashid Al Fahim',
    customerPhone: '+971 54 321 6549',
    customerEmail: '',
    customerAddress: 'Al Ain, Abu Dhabi',
    category: 'other',
    serviceDescription: 'Custom built-in library and reading nook for a private residence.',
    preferredStartDate: '2026-05-20',
    budget: 'AED 45,000',
    notes: 'Woodwork must match existing mahogany furniture. Client will supply reference photos.',
    status: 'closed',
    createdAt: '2026-04-18T14:30:00Z',
    createdBy: '1',
    createdByName: 'Sarah Johnson',
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
  otherCategoryDescription: '',
};

export function CustomerData() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<CustomerRequest[]>([]);
  const [paidCustomers, setPaidCustomers] = useState<PaidCustomer[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<CustomerRequest | null>(null);
  const [paymentNote, setPaymentNote] = useState('');
  const [proofFiles, setProofFiles] = useState<File[]>([]);
  const [proofError, setProofError] = useState('');

  // Marketing tasks state
  const [marketingTasks, setMarketingTasks] = useState<MarketingTaskItem[]>([]);
  const [marketingTasksLoading, setMarketingTasksLoading] = useState(false);
  const [showCreateMarketingTask, setShowCreateMarketingTask] = useState(false);
  const [marketingForm, setMarketingForm] = useState({
    title: '', description: '', customer_name: '', customer_phone: '',
    customer_email: '', customer_address: '', category: 'home_design',
    service_description: '', preferred_start_date: '', budget: '', notes: '',
  });
  const [marketingFormErrors, setMarketingFormErrors] = useState<Record<string, string>>({});
  const [marketingFormError, setMarketingFormError] = useState('');
  const [marketingFormSuccess, setMarketingFormSuccess] = useState('');
  const [isCreatingMarketing, setIsCreatingMarketing] = useState(false);

  // Add Request modal state
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const objectUrlsRef = useRef<string[]>([]);

  // Load requests
  useEffect(() => {
    const savedRequests = localStorage.getItem(STORAGE_KEY);
    if (savedRequests) {
      setRequests(JSON.parse(savedRequests));
      return;
    }
    setRequests(initialRequests);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialRequests));
  }, []);

  // Persist requests
  useEffect(() => {
    if (requests.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
    }
  }, [requests]);

  // Load paid customers (still needed for transfer logic)
  useEffect(() => {
    const savedPaidCustomers = localStorage.getItem(PAID_STORAGE_KEY);
    if (savedPaidCustomers) {
      setPaidCustomers(JSON.parse(savedPaidCustomers));
    }
  }, []);

  // Persist paid customers
  useEffect(() => {
    localStorage.setItem(PAID_STORAGE_KEY, JSON.stringify(paidCustomers));
  }, [paidCustomers]);

  // Fetch marketing tasks (for marketing_lead and ceo)
  const fetchMarketingTasks = useCallback(async () => {
    if (!user || (user.role !== 'marketing_lead' && user.role !== 'ceo')) return;
    setMarketingTasksLoading(true);
    try {
      const response = await marketingApi.getMarketingTasks({ limit: 100 });
      if (response.success) {
        setMarketingTasks(response.data);
      }
    } catch {
      // silent fail
    } finally {
      setMarketingTasksLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMarketingTasks();
  }, [fetchMarketingTasks]);

  // Marketing tasks with no submissions (shown on Customer Requests page)
  const marketingTasksNoSubmissions = marketingTasks.filter(
    (t) => (t.submissionsWithReviews?.submissions || []).length === 0
  );

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  if (!user) {
    return null;
  }

  const currentUser = user;

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
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current = [];
    setProofFiles([]);
    setProofError('');
  };

  const openTransferModal = (request: CustomerRequest) => {
    setSelectedRequest(request);
    setPaymentNote('');
    setProofFiles([]);
    setProofError('');
    objectUrlsRef.current = [];
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProofError('');
    const files = e.target.files;
    if (!files) return;

    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current = [];

    setProofFiles(Array.from(files));
  };

  const removeFile = (index: number) => {
    const updatedFiles = proofFiles.filter((_, i) => i !== index);
    setProofFiles(updatedFiles);

    if (objectUrlsRef.current[index]) {
      URL.revokeObjectURL(objectUrlsRef.current[index]);
      objectUrlsRef.current.splice(index, 1);
    }
  };

  const handleTransferToPaidCustomers = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedRequest) return;

    const proofRequired = user?.role === 'marketing_lead';
    if (proofRequired && proofFiles.length === 0) {
      setProofError('Marketing Lead must attach at least one proof of payment before transfer.');
      return;
    }

    const proofOfPaymentArray: PaymentProof[] = [];
    for (const file of proofFiles) {
      const dataUrl = await readProofAsDataUrl(file);
      proofOfPaymentArray.push({
        name: file.name,
        type: file.type,
        size: `${Math.round(file.size / 1024)} KB`,
        dataUrl,
      });
    }

    const paidCustomer: PaidCustomer = {
      ...selectedRequest,
      sourceRequestId: selectedRequest.id,
      transferredAt: new Date().toISOString(),
      transferredBy: currentUser.id,
      transferredByName: currentUser.full_name,
      paymentNote: paymentNote.trim() || undefined,
      proofOfPayment: proofOfPaymentArray.length > 0 ? proofOfPaymentArray : undefined,
      paymentVerificationStatus: 'pending',
    };

    const updatedRequests = requests.filter((request) => request.id !== selectedRequest.id);
    const updatedPaidCustomers = [paidCustomer, ...paidCustomers];

    setRequests(updatedRequests);
    setPaidCustomers(updatedPaidCustomers);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedRequests));
    localStorage.setItem(PAID_STORAGE_KEY, JSON.stringify(updatedPaidCustomers));
    closeTransferModal();
  };

  const handleAddRequest = (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    const newRequest = {
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
      status: 'new' as CustomerRequestStatus,
      createdAt: new Date().toISOString(),
      createdBy: currentUser.id,
      createdByName: currentUser.full_name,
      otherCategoryDescription:
        formData.category === 'other' ? formData.otherCategoryDescription.trim() : undefined,
    } as CustomerRequest & { otherCategoryDescription?: string };

    setRequests((currentRequests) => [newRequest, ...currentRequests]);
    setFormData(emptyForm);
    setShowForm(false);
    setIsSubmitting(false);
  };

  const handleCreateMarketingTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!marketingForm.title.trim()) errors.title = 'Title is required.';
    if (!marketingForm.description.trim()) errors.description = 'Description is required.';
    if (!marketingForm.customer_name.trim()) errors.customer_name = 'Customer name is required.';
    if (!marketingForm.customer_phone.trim()) errors.customer_phone = 'Customer phone is required.';
    if (!marketingForm.customer_address.trim()) errors.customer_address = 'Customer address is required.';
    if (!marketingForm.service_description.trim()) errors.service_description = 'Service description is required.';
    setMarketingFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsCreatingMarketing(true);
    setMarketingFormError('');
    setMarketingFormSuccess('');

    try {
      const formData = new FormData();
      formData.append('title', marketingForm.title.trim());
      formData.append('description', marketingForm.description.trim());
      formData.append('customer_name', marketingForm.customer_name.trim());
      formData.append('customer_phone', marketingForm.customer_phone.trim());
      if (marketingForm.customer_email.trim()) formData.append('customer_email', marketingForm.customer_email.trim());
      formData.append('customer_address', marketingForm.customer_address.trim());
      formData.append('category', marketingForm.category);
      formData.append('service_description', marketingForm.service_description.trim());
      if (marketingForm.preferred_start_date) formData.append('preferred_start_date', marketingForm.preferred_start_date);
      if (marketingForm.budget) formData.append('budget', String(Number(marketingForm.budget)));
      if (marketingForm.notes.trim()) formData.append('notes', marketingForm.notes.trim());

      const response = await marketingApi.createMarketingTask(formData);
      if (response.success) {
        setMarketingFormSuccess('Marketing task created successfully');
        setMarketingForm({ title: '', description: '', customer_name: '', customer_phone: '', customer_email: '', customer_address: '', category: 'home_design', service_description: '', preferred_start_date: '', budget: '', notes: '' });
        setMarketingFormErrors({});
        setTimeout(() => setShowCreateMarketingTask(false), 800);
        fetchMarketingTasks();
      } else {
        setMarketingFormError(response.message || 'Failed to create marketing task');
      }
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined;
      setMarketingFormError(msg || 'Unable to create task. Please try again.');
    } finally {
      setIsCreatingMarketing(false);
    }
  };

  const canTransferToPaid = currentUser.role === 'marketing_lead' ;

  // Only marketing lead / sys admin may access this page
  if (!canTransferToPaid) {
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
          <h2 className="text-2xl font-bold text-gray-900">Customer Data</h2>
          <p className="text-gray-600 mt-1">View all stored customer service request records and ownership details.</p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Add Request</span>
          </button>
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 shadow-sm min-w-[220px]">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-500">Viewing as</p>
                <p className="font-medium text-gray-900">{currentUser.full_name}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Marketing Tasks Section (no submissions) */}
      {(user?.role === 'marketing_lead' || user?.role === 'ceo') && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg text-gray-900">Marketing Tasks</h3>
              <p className="text-sm text-gray-500">Newly created tasks without submissions yet. Submit to move them to Paid Customers.</p>
              {marketingTasksLoading && <p className="text-xs text-blue-600 mt-1">Loading...</p>}
            </div>
            {user.role === 'marketing_lead' && (
              <button
                onClick={() => { setShowCreateMarketingTask(true); setMarketingFormError(''); setMarketingFormSuccess(''); setMarketingFormErrors({}); }}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                Create Marketing Task
              </button>
            )}
          </div>

          {marketingTasksNoSubmissions.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No marketing tasks pending submission.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {marketingTasksNoSubmissions.map((task) => (
                <div key={task.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-medium text-gray-900">{task.title}</h4>
                      <p className="text-xs text-gray-500 mt-1">
                        Customer: {task.customer_name} · {task.category}
                      </p>
                    </div>
                    {task.budget != null && (
                      <span className="text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full">
                        AED {task.budget.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-2 line-clamp-2">{task.service_description}</p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{task.customer_phone}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(task.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Request list */}
      <div className="grid grid-cols-1 gap-4">
        {requests.map((request) => (
          <div key={request.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
            <div className="flex items-start justify-between gap-4 flex-col sm:flex-row">
              <div>
                <h3 className="font-semibold text-lg text-gray-900">{request.customerName}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {categoryLabels[request.category]}
                  {'otherCategoryDescription' in request && request.otherCategoryDescription
                    ? ` (${request.otherCategoryDescription})`
                    : ''}
                </p>
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

      {/* Transfer to Paid Customers Modal */}
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
                  Proof of Payment {currentUser.role === 'marketing_lead' ? '(required)' : '(optional)'}
                </label>

                <input
                  type="file"
                  id="proof-file-input"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="proof-file-input"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Choose Images
                </label>
                <p className="text-xs text-gray-500 mt-2">
                  Upload one or more images (screenshots, receipts, etc.)
                </p>

                {proofFiles.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {proofFiles.map((file, index) => {
                      const url = URL.createObjectURL(file);
                      if (!objectUrlsRef.current[index]) {
                        objectUrlsRef.current[index] = url;
                      }
                      return (
                        <div key={index} className="relative group border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                          <img
                            src={url}
                            alt={`proof-${index}`}
                            className="w-full h-24 object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="absolute top-1 right-1 p-1 rounded-full bg-white/80 hover:bg-white text-gray-600 hover:text-red-600 transition"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <p className="text-xs text-gray-500 truncate px-2 py-1">{file.name}</p>
                        </div>
                      );
                    })}
                  </div>
                )}

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

      {/* Add Request Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">New Customer Request</h3>
              <button
                onClick={() => {
                  setShowForm(false);
                  setFormData(emptyForm);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleAddRequest}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Customer Name</label>
                  <input
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter customer name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                  <input
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="customer@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Start Date</label>
                  <input
                    type="date"
                    value={formData.preferredStartDate}
                    onChange={(e) => setFormData({ ...formData, preferredStartDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Customer Address</label>
                <input
                  value={formData.customerAddress}
                  onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter customer address"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Request Category</label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value as CustomerRequestCategory })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {formData.category === 'other' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Other Category Description
                  </label>
                  <input
                    value={formData.otherCategoryDescription}
                    onChange={(e) =>
                      setFormData({ ...formData, otherCategoryDescription: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Describe the custom category"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Service Description</label>
                <textarea
                  value={formData.serviceDescription}
                  onChange={(e) =>
                    setFormData({ ...formData, serviceDescription: e.target.value })
                  }
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
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="AED 50,000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Internal Notes</label>
                  <input
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
        </div>
      )}
      {/* Create Marketing Task Modal */}
      {showCreateMarketingTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Create Marketing Task</h3>
              <button onClick={() => { setShowCreateMarketingTask(false); setMarketingFormErrors({}); setMarketingFormError(''); }} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleCreateMarketingTask}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title <span className="text-red-500">*</span></label>
                <input value={marketingForm.title} onChange={(e) => { setMarketingForm({ ...marketingForm, title: e.target.value }); if (marketingFormErrors.title) setMarketingFormErrors((prev) => { const n = { ...prev }; delete n.title; return n; }); }}
                  className={`w-full px-4 py-2 border rounded-lg ${marketingFormErrors.title ? 'border-red-400 bg-red-50' : 'border-gray-300'} focus:ring-2 focus:ring-blue-500`} disabled={isCreatingMarketing} />
                {marketingFormErrors.title && <p className="text-xs text-red-600 mt-1">{marketingFormErrors.title}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description <span className="text-red-500">*</span></label>
                <textarea value={marketingForm.description} onChange={(e) => { setMarketingForm({ ...marketingForm, description: e.target.value }); if (marketingFormErrors.description) setMarketingFormErrors((prev) => { const n = { ...prev }; delete n.description; return n; }); }}
                  rows={3} className={`w-full px-4 py-2 border rounded-lg ${marketingFormErrors.description ? 'border-red-400 bg-red-50' : 'border-gray-300'} focus:ring-2 focus:ring-blue-500`} disabled={isCreatingMarketing} />
                {marketingFormErrors.description && <p className="text-xs text-red-600 mt-1">{marketingFormErrors.description}</p>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Customer Name <span className="text-red-500">*</span></label>
                  <input value={marketingForm.customer_name} onChange={(e) => { setMarketingForm({ ...marketingForm, customer_name: e.target.value }); if (marketingFormErrors.customer_name) setMarketingFormErrors((prev) => { const n = { ...prev }; delete n.customer_name; return n; }); }}
                    className={`w-full px-4 py-2 border rounded-lg ${marketingFormErrors.customer_name ? 'border-red-400 bg-red-50' : 'border-gray-300'}`} disabled={isCreatingMarketing} />
                  {marketingFormErrors.customer_name && <p className="text-xs text-red-600 mt-1">{marketingFormErrors.customer_name}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone <span className="text-red-500">*</span></label>
                  <input value={marketingForm.customer_phone} onChange={(e) => { setMarketingForm({ ...marketingForm, customer_phone: e.target.value }); if (marketingFormErrors.customer_phone) setMarketingFormErrors((prev) => { const n = { ...prev }; delete n.customer_phone; return n; }); }}
                    className={`w-full px-4 py-2 border rounded-lg ${marketingFormErrors.customer_phone ? 'border-red-400 bg-red-50' : 'border-gray-300'}`} disabled={isCreatingMarketing} />
                  {marketingFormErrors.customer_phone && <p className="text-xs text-red-600 mt-1">{marketingFormErrors.customer_phone}</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input type="email" value={marketingForm.customer_email} onChange={(e) => setMarketingForm({ ...marketingForm, customer_email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg" disabled={isCreatingMarketing} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address <span className="text-red-500">*</span></label>
                  <input value={marketingForm.customer_address} onChange={(e) => { setMarketingForm({ ...marketingForm, customer_address: e.target.value }); if (marketingFormErrors.customer_address) setMarketingFormErrors((prev) => { const n = { ...prev }; delete n.customer_address; return n; }); }}
                    className={`w-full px-4 py-2 border rounded-lg ${marketingFormErrors.customer_address ? 'border-red-400 bg-red-50' : 'border-gray-300'}`} disabled={isCreatingMarketing} />
                  {marketingFormErrors.customer_address && <p className="text-xs text-red-600 mt-1">{marketingFormErrors.customer_address}</p>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select value={marketingForm.category} onChange={(e) => setMarketingForm({ ...marketingForm, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg" disabled={isCreatingMarketing}>
                  {Object.entries(categoryLabels).map(([value, label]) => (<option key={value} value={value}>{label}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Service Description <span className="text-red-500">*</span></label>
                <textarea value={marketingForm.service_description} onChange={(e) => { setMarketingForm({ ...marketingForm, service_description: e.target.value }); if (marketingFormErrors.service_description) setMarketingFormErrors((prev) => { const n = { ...prev }; delete n.service_description; return n; }); }}
                  rows={3} className={`w-full px-4 py-2 border rounded-lg ${marketingFormErrors.service_description ? 'border-red-400 bg-red-50' : 'border-gray-300'}`} disabled={isCreatingMarketing} />
                {marketingFormErrors.service_description && <p className="text-xs text-red-600 mt-1">{marketingFormErrors.service_description}</p>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Budget (AED)</label>
                  <input type="number" value={marketingForm.budget} onChange={(e) => setMarketingForm({ ...marketingForm, budget: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg" disabled={isCreatingMarketing} min="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Start Date</label>
                  <input type="date" value={marketingForm.preferred_start_date} onChange={(e) => setMarketingForm({ ...marketingForm, preferred_start_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg" disabled={isCreatingMarketing} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <input value={marketingForm.notes} onChange={(e) => setMarketingForm({ ...marketingForm, notes: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg" disabled={isCreatingMarketing} />
                </div>
              </div>

              {marketingFormError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{marketingFormError}</p>}
              {marketingFormSuccess && <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{marketingFormSuccess}</p>}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowCreateMarketingTask(false); setMarketingFormErrors({}); setMarketingFormError(''); }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50" disabled={isCreatingMarketing}>Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg flex items-center justify-center gap-2" disabled={isCreatingMarketing}>
                  {isCreatingMarketing ? 'Creating...' : <><Send className="w-4 h-4" />Create Task</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}