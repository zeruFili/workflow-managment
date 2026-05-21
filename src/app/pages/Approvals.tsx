import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  CustomerRequestCategory,
  PaidCustomer,
  PaymentProof,
  PaymentVerificationStatus,
} from '../types';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  Send,
  ThumbsDown,
  ThumbsUp,
  X,
} from 'lucide-react';

const PAID_STORAGE_KEY = 'paid-customers';

const categoryLabels: Record<CustomerRequestCategory, string> = {
  home_design: 'Home Design',
  finishing_work: 'Finishing Work',
  hair_salon_design: "Women's Hair Salon Design",
  other: 'Other',
};

const verificationMeta: Record<
  PaymentVerificationStatus,
  {
    label: string;
    badgeClass: string;
    panelClass: string;
    textClass: string;
  }
> = {
  pending: {
    label: 'Pending Finance Review',
    badgeClass: 'bg-blue-100 text-blue-700',
    panelClass: 'bg-blue-50 border-blue-200',
    textClass: 'text-blue-700',
  },
  approved: {
    label: 'Approved',
    badgeClass: 'bg-green-100 text-green-700',
    panelClass: 'bg-green-50 border-green-200',
    textClass: 'text-green-700',
  },
  rejected: {
    label: 'Rejected',
    badgeClass: 'bg-red-100 text-red-700',
    panelClass: 'bg-red-50 border-red-200',
    textClass: 'text-red-700',
  },
  request_clarification: {
    label: 'Request Clarification',
    badgeClass: 'bg-amber-100 text-amber-700',
    panelClass: 'bg-amber-50 border-amber-200',
    textClass: 'text-amber-700',
  },
};

export function Approvals() {
  const { user } = useAuth();
  const [paidCustomers, setPaidCustomers] = useState<PaidCustomer[]>([]);

  // Finance review modal state
  const [financeReviewTarget, setFinanceReviewTarget] = useState<PaidCustomer | null>(null);
  const [financeDecision, setFinanceDecision] =
    useState<Exclude<PaymentVerificationStatus, 'pending'>>('approved');
  const [financeMessage, setFinanceMessage] = useState('');

  // Clarification modal state
  const [clarificationTarget, setClarificationTarget] = useState<PaidCustomer | null>(null);
  const [clarificationDescription, setClarificationDescription] = useState('');
  const [clarificationFiles, setClarificationFiles] = useState<File[]>([]);
  const [clarificationError, setClarificationError] = useState('');
  const clarificationObjectUrlsRef = useRef<string[]>([]);

  // Load paid customers
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

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      clarificationObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const readProofAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Unable to read proof file'));
      reader.readAsDataURL(file);
    });

  const closeFinanceReviewModal = () => {
    setFinanceReviewTarget(null);
    setFinanceDecision('approved');
    setFinanceMessage('');
  };

  const openFinanceReviewModal = (customer: PaidCustomer) => {
    setFinanceReviewTarget(customer);
    setFinanceDecision(
      customer.paymentVerificationStatus && customer.paymentVerificationStatus !== 'pending'
        ? customer.paymentVerificationStatus
        : 'approved'
    );
    setFinanceMessage(customer.paymentVerificationMessage ?? '');
  };

  const closeClarificationModal = () => {
    setClarificationTarget(null);
    setClarificationDescription('');
    clarificationObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    clarificationObjectUrlsRef.current = [];
    setClarificationFiles([]);
    setClarificationError('');
  };

  const openClarificationModal = (customer: PaidCustomer) => {
    setClarificationTarget(customer);
    setClarificationDescription(customer.marketingClarificationResponse?.description ?? '');
    clarificationObjectUrlsRef.current = [];
    setClarificationFiles([]);
    setClarificationError('');
  };

  const handleClarificationFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setClarificationError('');
    const files = event.target.files;
    if (!files) return;

    clarificationObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    clarificationObjectUrlsRef.current = [];
    setClarificationFiles(Array.from(files));
  };

  const removeClarificationFile = (index: number) => {
    const updatedFiles = clarificationFiles.filter((_, i) => i !== index);
    setClarificationFiles(updatedFiles);

    if (clarificationObjectUrlsRef.current[index]) {
      URL.revokeObjectURL(clarificationObjectUrlsRef.current[index]);
      clarificationObjectUrlsRef.current.splice(index, 1);
    }
  };

  const handleFinanceDecisionSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!financeReviewTarget) return;

    const message = financeMessage.trim();
    if (!message) return;

    const updatedPaidCustomers = paidCustomers.map((customer) => {
      if (customer.id !== financeReviewTarget.id) return customer;
      return {
        ...customer,
        paymentVerificationStatus: financeDecision,
        paymentVerificationMessage: message,
        paymentVerifiedAt: new Date().toISOString(),
        paymentVerifiedBy: user.id,
        paymentVerifiedByName: user.name,
      };
    });

    setPaidCustomers(updatedPaidCustomers);
    closeFinanceReviewModal();
  };

  const handleClarificationSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!clarificationTarget) return;

    const description = clarificationDescription.trim();
    if (!description) {
      setClarificationError('Please provide a clarification description.');
      return;
    }

    if (clarificationFiles.length === 0) {
      setClarificationError('Please attach at least one image for clarification.');
      return;
    }

    const clarificationAttachments: PaymentProof[] = [];
    for (const file of clarificationFiles) {
      const dataUrl = await readProofAsDataUrl(file);
      clarificationAttachments.push({
        name: file.name,
        type: file.type,
        size: `${Math.round(file.size / 1024)} KB`,
        dataUrl,
      });
    }

    const updatedPaidCustomers = paidCustomers.map((customer) => {
      if (customer.id !== clarificationTarget.id) return customer;
      return {
        ...customer,
        marketingClarificationResponse: {
          description,
          attachments: clarificationAttachments,
          respondedAt: new Date().toISOString(),
          respondedBy: user.id,
          respondedByName: user.name,
        },
      };
    });

    setPaidCustomers(updatedPaidCustomers);
    closeClarificationModal();
  };

  if (!user) {
    return null;
  }

  const canFinanceReview = user.role === 'finance_officer' || user.role === 'system_administrator';
  const canOpenClarification = user.role === 'marketing_lead' || user.role === 'system_administrator';

  if (!canFinanceReview && !canOpenClarification) {
    return (
      <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
        <p className="text-gray-500">Access denied. Finance Officer, Marketing Lead, or System Administrator access required.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Payment Verification Feedback Loop</h2>
        <p className="text-gray-600 mt-1">
          Finance provides the final decision as Approved, Rejected, or Request Clarification.
        </p>
      </div>

      {paidCustomers.length === 0 ? (
        <div className="bg-white rounded-xl p-10 shadow-sm border border-gray-200 text-center">
          <p className="text-gray-500">No paid‑customer records are available yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {paidCustomers.map((customer) => {
            const status = customer.paymentVerificationStatus ?? 'pending';
            const meta = verificationMeta[status];
            const financeNote = customer.paymentVerificationMessage?.trim();
            const clarificationResponse = customer.marketingClarificationResponse;

            return (
              <div
                key={customer.id}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3 gap-3">
                  <div>
                    <h4 className="font-semibold text-lg text-gray-900">{customer.customerName}</h4>
                    <p className="text-xs text-gray-500 mt-1">
                      Category: {categoryLabels[customer.category]}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${meta.badgeClass}`}>
                    {meta.label}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium">
                    Budget: {customer.budget ?? 'N/A'}
                  </span>
                  <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
                    Transferred by {customer.transferredByName}
                  </span>
                </div>

                <p className="text-sm text-gray-600 mb-3">{customer.serviceDescription}</p>

                <div className={`mb-4 p-3 rounded-lg border ${meta.panelClass}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {status === 'approved' ? (
                      <ThumbsUp className="w-4 h-4 text-green-600" />
                    ) : status === 'rejected' ? (
                      <ThumbsDown className="w-4 h-4 text-red-600" />
                    ) : status === 'request_clarification' ? (
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                    ) : (
                      <Clock className="w-4 h-4 text-blue-600" />
                    )}
                    <p className={`text-sm font-medium ${meta.textClass}`}>
                      {status === 'request_clarification'
                        ? 'Finance requested clarification from Marketing'
                        : status === 'pending'
                        ? 'Awaiting Finance feedback'
                        : `Finance decision: ${meta.label}`}
                    </p>
                  </div>

                  {financeNote ? (
                    <p className="text-sm text-gray-700 italic">"{financeNote}"</p>
                  ) : (
                    <p className="text-sm text-gray-500">No finance message yet.</p>
                  )}
                </div>

                {clarificationResponse && (
                  <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-blue-700">
                      Marketing Clarification Submitted
                    </p>
                    <p className="text-sm text-gray-700 mt-1">{clarificationResponse.description}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {clarificationResponse.respondedByName} • {new Date(clarificationResponse.respondedAt).toLocaleString()}
                    </p>
                  </div>
                )}

                <div className="space-y-2 text-sm mb-4">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Phone className="w-4 h-4" />
                    <span>{customer.customerPhone}</span>
                  </div>
                  {customer.customerEmail && (
                    <div className="flex items-center gap-2 text-gray-500">
                      <Mail className="w-4 h-4" />
                      <span>{customer.customerEmail}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-500">
                    <Calendar className="w-4 h-4" />
                    <span>Transferred: {new Date(customer.transferredAt).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {canFinanceReview && (
                    <button
                      onClick={() => openFinanceReviewModal(customer)}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Review Decision
                    </button>
                  )}

                  {status === 'request_clarification' && canOpenClarification && (
                    <button
                      onClick={() => openClarificationModal(customer)}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm"
                    >
                      <Send className="w-4 h-4" />
                      Open Submission Detail
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Finance Review Modal */}
      {financeReviewTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl border border-gray-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Finance Verification Decision</h3>
                <p className="text-sm text-gray-500">
                  Decide if this payment is approved, rejected, or needs clarification.
                </p>
              </div>
              <button onClick={closeFinanceReviewModal} className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <form onSubmit={handleFinanceDecisionSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">Customer</p>
                  <p className="font-medium text-gray-900">{financeReviewTarget.customerName}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">Transferred by</p>
                  <p className="font-medium text-gray-900">{financeReviewTarget.transferredByName}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Decision</label>
                <select
                  value={financeDecision}
                  onChange={(event) =>
                    setFinanceDecision(event.target.value as Exclude<PaymentVerificationStatus, 'pending'>)
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="request_clarification">Request Clarification</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Message to Marketing</label>
                <textarea
                  value={financeMessage}
                  onChange={(event) => setFinanceMessage(event.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[110px]"
                  placeholder="Provide the reason or instruction for the selected decision"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeFinanceReviewModal}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Save Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clarification Modal */}
      {clarificationTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl border border-gray-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Open Submission Detail</h3>
                <p className="text-sm text-gray-500">
                  Submit clarification with an image and explanation to Finance.
                </p>
              </div>
              <button onClick={closeClarificationModal} className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <form onSubmit={handleClarificationSubmit} className="p-6 space-y-4">
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-sm text-amber-800">
                Clarification requested for <strong>{clarificationTarget.customerName}</strong>. This detail flow is only available for clarification cases.
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Clarification Description</label>
                <textarea
                  value={clarificationDescription}
                  onChange={(event) => setClarificationDescription(event.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[110px]"
                  placeholder="Describe your clarification response"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Attach Clarification Images</label>

                <input
                  type="file"
                  id="clarification-file-input"
                  accept="image/*"
                  multiple
                  onChange={handleClarificationFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="clarification-file-input"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg cursor-pointer transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Choose Images
                </label>

                {clarificationFiles.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {clarificationFiles.map((file, index) => {
                      const url = URL.createObjectURL(file);
                      if (!clarificationObjectUrlsRef.current[index]) {
                        clarificationObjectUrlsRef.current[index] = url;
                      }
                      return (
                        <div key={index} className="relative group border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                          <img
                            src={url}
                            alt={`clarification-${index}`}
                            className="w-full h-24 object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeClarificationFile(index)}
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
              </div>

              {clarificationError && <p className="text-sm text-red-600">{clarificationError}</p>}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeClarificationModal}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white"
                >
                  <Send className="w-4 h-4" />
                  Submit Clarification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}