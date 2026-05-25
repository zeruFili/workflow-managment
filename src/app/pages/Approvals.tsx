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
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const PAID_STORAGE_KEY = 'paid-customers';

// ---------- Notification system ----------
const viewedPaidCustomerCards = new Set<string>();

function publishApprovalsBadgeCount(count: number) {
  window.dispatchEvent(
    new CustomEvent('approvals-notifications-updated', { detail: count })
  );
}

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
    icon: React.ElementType;
    iconClass: string;
  }
> = {
  pending: {
    label: 'Pending Finance Review',
    badgeClass: 'bg-blue-100 text-blue-700',
    panelClass: 'bg-blue-50 border-blue-200',
    textClass: 'text-blue-700',
    icon: Clock,
    iconClass: 'text-blue-600',
  },
  approved: {
    label: 'Approved',
    badgeClass: 'bg-green-100 text-green-700',
    panelClass: 'bg-green-50 border-green-200',
    textClass: 'text-green-700',
    icon: ThumbsUp,
    iconClass: 'text-green-600',
  },
  verified: {
    label: 'Verified',
    badgeClass: 'bg-green-100 text-green-700',
    panelClass: 'bg-green-50 border-green-200',
    textClass: 'text-green-700',
    icon: ThumbsUp,
    iconClass: 'text-green-600',
  },
  rejected: {
    label: 'Rejected',
    badgeClass: 'bg-red-100 text-red-700',
    panelClass: 'bg-red-50 border-red-200',
    textClass: 'text-red-700',
    icon: ThumbsDown,
    iconClass: 'text-red-600',
  },
  request_clarification: {
    label: 'Request Clarification',
    badgeClass: 'bg-amber-100 text-amber-700',
    panelClass: 'bg-amber-50 border-amber-200',
    textClass: 'text-amber-700',
    icon: AlertCircle,
    iconClass: 'text-amber-600',
  },
};

const FALLBACK_META = {
  label: 'Unknown Status',
  badgeClass: 'bg-gray-100 text-gray-700',
  panelClass: 'bg-gray-50 border-gray-200',
  textClass: 'text-gray-700',
  icon: AlertCircle,
  iconClass: 'text-gray-600',
};

function generateMockPaidCustomers(): PaidCustomer[] {
  const baseCustomer: Omit<PaidCustomer, 'id' | 'paymentVerificationStatus' | 'paymentVerificationMessage' | 'marketingClarificationResponse'> = {
    customerName: '',
    customerPhone: '+251 900 000 000',
    customerEmail: 'customer@example.com',
    category: 'home_design',
    budget: '50,000 ETB',
    serviceDescription: 'Full home interior design package',
    transferredBy: 'user-1',
    transferredByName: 'Abebe Kebede',
    transferredAt: new Date(Date.now() - 86400000 * (Math.floor(Math.random() * 30) + 1)).toISOString(),
    paymentProofs: [],
  };

  const mockData: PaidCustomer[] = [
    {
      ...baseCustomer,
      id: 'paid-1',
      customerName: 'Meron Alemu',
      category: 'home_design',
      budget: '120,000 ETB',
      serviceDescription: 'Complete villa interior finishing – living room, 4 bedrooms, kitchen, and outdoor terrace. Includes custom joinery and lighting plan.',
      paymentVerificationStatus: 'approved',
      paymentVerificationMessage: 'All documents verified, payment approved.',
      paymentVerifiedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      paymentVerifiedBy: 'user-2',
      paymentVerifiedByName: 'Finance Lead',
    },
    {
      ...baseCustomer,
      id: 'paid-2',
      customerName: 'Binyam Tadesse',
      category: 'finishing_work',
      budget: '85,000 ETB',
      serviceDescription: 'Kitchen and bathroom renovation – modern cabinetry, granite countertops, plumbing and electrical upgrades.',
      paymentVerificationStatus: 'rejected',
      paymentVerificationMessage: 'Insufficient documentation provided. Missing final receipt.',
      paymentVerifiedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
      paymentVerifiedBy: 'user-2',
      paymentVerifiedByName: 'Finance Lead',
    },
    {
      ...baseCustomer,
      id: 'paid-3',
      customerName: 'Selamawit Gebre',
      category: 'hair_salon_design',
      budget: '200,000 ETB',
      serviceDescription: 'Luxury women’s salon setup in Bole – 6 styling stations, wash area, nail bar, and reception. Premium finishes and branded equipment.',
      paymentVerificationStatus: 'request_clarification',
      paymentVerificationMessage: 'Please provide additional bank statement for the last three months to verify funding source.',
      paymentVerifiedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      paymentVerifiedBy: 'user-2',
      paymentVerifiedByName: 'Finance Lead',
    },
    {
      ...baseCustomer,
      id: 'paid-4',
      customerName: 'Dawit Hailu',
      category: 'other',
      budget: '30,000 ETB',
      serviceDescription: 'Office space layout redesign – 200 m² open plan with flexible furniture and meeting pods.',
      paymentVerificationStatus: 'request_clarification',
      paymentVerificationMessage: 'Need clarification on the source of funds and timeline.',
      paymentVerifiedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      paymentVerifiedBy: 'user-2',
      paymentVerifiedByName: 'Finance Lead',
      marketingClarificationResponse: {
        description: 'Funds are from a personal savings account (Awash Bank). Attached passbook photo.',
        attachments: [
          {
            name: 'passbook.jpg',
            type: 'image/jpeg',
            size: '124 KB',
            dataUrl: 'data:image/svg+xml;utf8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect width="400" height="300" fill="%23f0f0f0"/%3E%3Ctext x="200" y="150" text-anchor="middle" dominant-baseline="middle" font-family="Arial" font-size="18" fill="%23666"%3EPassbook%20Screenshot%3C/text%3E%3C/svg%3E',
          },
        ],
        respondedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
        respondedBy: 'user-3',
        respondedByName: 'Marketing Lead',
      },
    },
    {
      ...baseCustomer,
      id: 'paid-5',
      customerName: 'Rediet Worku',
      category: 'home_design',
      budget: '95,000 ETB',
      serviceDescription: 'Apartment painting and decor – 3‑bedroom unit with accent walls, new curtains, and lighting upgrade.',
      paymentVerificationStatus: 'approved',
      paymentVerificationMessage: 'Receipt matched, payment confirmed.',
      paymentVerifiedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
      paymentVerifiedBy: 'user-2',
      paymentVerifiedByName: 'Finance Lead',
    },
    {
      ...baseCustomer,
      id: 'paid-6',
      customerName: 'Yonas Bekele',
      category: 'finishing_work',
      budget: '45,000 ETB',
      serviceDescription: 'Bathroom tiling and plumbing – two bathrooms, waterproofing, new fixtures.',
      paymentVerificationStatus: 'rejected',
      paymentVerificationMessage: 'Duplicate payment entry detected. Cross‑check with invoice #INV-204.',
      paymentVerifiedAt: new Date(Date.now() - 86400000 * 12).toISOString(),
      paymentVerifiedBy: 'user-2',
      paymentVerifiedByName: 'Finance Lead',
    },
    {
      ...baseCustomer,
      id: 'paid-7',
      customerName: 'Tigist Haile',
      category: 'hair_salon_design',
      budget: '175,000 ETB',
      serviceDescription: 'Beauty salon full setup – facial room, massage area, nail bar, and product display.',
      paymentVerificationStatus: 'request_clarification',
      paymentVerificationMessage: 'Explain the discrepancy in the invoice total: the final amount is 12% higher than the quoted estimate.',
      paymentVerifiedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
      paymentVerifiedBy: 'user-2',
      paymentVerifiedByName: 'Finance Lead',
    },
    {
      ...baseCustomer,
      id: 'paid-8',
      customerName: 'Henok Tilahun',
      category: 'other',
      budget: '10,000 ETB',
      serviceDescription: 'Small consultation fee – initial design brainstorming session.',
      paymentVerificationStatus: 'pending',
      paymentVerificationMessage: '',
    },
  ];

  return mockData;
}

export function Approvals() {
  const { user } = useAuth();
  const [paidCustomers, setPaidCustomers] = useState<PaidCustomer[]>([]);

  const [financeForms, setFinanceForms] = useState<
    Record<string, { expanded: boolean; decision: Exclude<PaymentVerificationStatus, 'pending'>; message: string }>
  >({});

  const [clarificationForms, setClarificationForms] = useState<
    Record<string, { expanded: boolean; description: string; files: File[]; error: string }>
  >({});
  const clarificationObjectUrlsRef = useRef<string[]>([]);

  // ── Highlight / Notification system ──
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());
  const seenThisSession = useRef<Set<string>>(new Set());
  const observedElements = useRef<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const customersRef = useRef(paidCustomers);
  useEffect(() => { customersRef.current = paidCustomers; }, [paidCustomers]);

  const ensureViewedSetInitialized = (customers: PaidCustomer[]) => {
    if (viewedPaidCustomerCards.size === 0) {
      const pending = customers
        .filter(c => c.paymentVerificationStatus === 'pending')
        .sort((a, b) => new Date(b.transferredAt).getTime() - new Date(a.transferredAt).getTime());
      // Mark all except the first 3 as already viewed
      pending.slice(3).forEach(c => viewedPaidCustomerCards.add(c.id));
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem(PAID_STORAGE_KEY);
    let initial: PaidCustomer[];
    if (saved) {
      const parsed = JSON.parse(saved);
      initial = Array.isArray(parsed) && parsed.length > 0 ? parsed : generateMockPaidCustomers();
    } else {
      initial = generateMockPaidCustomers();
    }
    setPaidCustomers(initial);
    ensureViewedSetInitialized(initial);
  }, []);

  useEffect(() => {
    if (paidCustomers.length === 0) return;
    const pendingIds = paidCustomers
      .filter(c => c.paymentVerificationStatus === 'pending')
      .map(c => c.id);
    const unseen = pendingIds.filter(id => !viewedPaidCustomerCards.has(id));
    setHighlightedIds(new Set(unseen));
    publishApprovalsBadgeCount(unseen.length);
  }, [paidCustomers]);

  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observedElements.current.clear();
    }
    if (highlightedIds.size === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = (entry.target as HTMLElement).dataset.highlightedId;
          if (!id || !highlightedIds.has(id)) return;
          if (entry.isIntersecting && entry.intersectionRatio >= 0.7) {
            if (!observedElements.current.has(id)) {
              observedElements.current.add(id);
              seenThisSession.current.add(id);
            }
          }
        });
      },
      { threshold: [0.7] }
    );

    observerRef.current = observer;

    highlightedIds.forEach((id) => {
      const el = document.querySelector(`[data-highlighted-id="${id}"]`);
      if (el && !observedElements.current.has(id)) {
        observer.observe(el);
      }
    });

    return () => {
      observer.disconnect();
      observedElements.current.clear();
    };
  }, [highlightedIds]);

  const commitSeenSession = () => {
    if (seenThisSession.current.size === 0) return;
    seenThisSession.current.forEach((id) => viewedPaidCustomerCards.add(id));
    seenThisSession.current.clear();
    observedElements.current.clear();

    const currentCustomers = customersRef.current;
    const pendingIds = currentCustomers
      .filter(c => c.paymentVerificationStatus === 'pending')
      .map(c => c.id);
    const remainingUnseen = pendingIds.filter(id => !viewedPaidCustomerCards.has(id));
    setHighlightedIds(new Set(remainingUnseen));
    publishApprovalsBadgeCount(remainingUnseen.length);
  };

  useEffect(() => {
    return () => {
      commitSeenSession();
    };
  }, []);

  useEffect(() => {
    if (paidCustomers.length > 0) {
      localStorage.setItem(PAID_STORAGE_KEY, JSON.stringify(paidCustomers));
    }
  }, [paidCustomers]);

  useEffect(() => {
    return () => {
      clarificationObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const readProofAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Unable to read file'));
      reader.readAsDataURL(file);
    });

  // ---- Finance Review Handlers ----
  const toggleFinanceForm = (customerId: string) => {
    setFinanceForms((prev) => {
      const existing = prev[customerId];
      if (existing?.expanded) {
        return { ...prev, [customerId]: { ...existing, expanded: false } };
      }
      const customer = paidCustomers.find((c) => c.id === customerId);
      const currentStatus = customer?.paymentVerificationStatus ?? 'pending';
      const decision = currentStatus === 'pending' ? 'approved' : currentStatus;
      const message = customer?.paymentVerificationMessage ?? '';
      return {
        ...prev,
        [customerId]: { expanded: true, decision: decision as Exclude<PaymentVerificationStatus, 'pending'>, message },
      };
    });
  };

  const updateFinanceForm = (customerId: string, field: 'decision' | 'message', value: string) => {
    setFinanceForms((prev) => ({
      ...prev,
      [customerId]: { ...prev[customerId], [field]: value },
    }));
  };

  const submitFinanceDecision = (customerId: string) => {
    const form = financeForms[customerId];
    if (!form || !form.message.trim()) return;

    const updatedCustomers = paidCustomers.map((customer) => {
      if (customer.id !== customerId) return customer;
      return {
        ...customer,
        paymentVerificationStatus: form.decision,
        paymentVerificationMessage: form.message.trim(),
        paymentVerifiedAt: new Date().toISOString(),
        paymentVerifiedBy: user.id,
        paymentVerifiedByName: user.name,
      };
    });

    setPaidCustomers(updatedCustomers);
    setFinanceForms((prev) => ({
      ...prev,
      [customerId]: { ...prev[customerId], expanded: false },
    }));
  };

  // ---- Clarification Handlers ----
  const toggleClarificationForm = (customerId: string) => {
    setClarificationForms((prev) => {
      const existing = prev[customerId];
      if (existing?.expanded) {
        clarificationObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
        clarificationObjectUrlsRef.current = [];
        return { ...prev, [customerId]: { ...existing, expanded: false, files: [], error: '' } };
      }
      const customer = paidCustomers.find((c) => c.id === customerId);
      const description = customer?.marketingClarificationResponse?.description ?? '';
      return {
        ...prev,
        [customerId]: { expanded: true, description, files: [], error: '' },
      };
    });
  };

  const updateClarificationDescription = (customerId: string, value: string) => {
    setClarificationForms((prev) => ({
      ...prev,
      [customerId]: { ...prev[customerId], description: value },
    }));
  };

  const handleClarificationFileChange = (customerId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    clarificationObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    clarificationObjectUrlsRef.current = [];
    setClarificationForms((prev) => ({
      ...prev,
      [customerId]: {
        ...prev[customerId],
        files: Array.from(files),
        error: '',
      },
    }));
  };

  const removeClarificationFile = (customerId: string, index: number) => {
    setClarificationForms((prev) => {
      const current = prev[customerId];
      if (!current) return prev;
      const updatedFiles = current.files.filter((_, i) => i !== index);
      return { ...prev, [customerId]: { ...current, files: updatedFiles } };
    });
  };

  const submitClarification = async (customerId: string) => {
    const form = clarificationForms[customerId];
    if (!form) return;

    const description = form.description.trim();
    if (!description) {
      setClarificationForms((prev) => ({
        ...prev,
        [customerId]: { ...prev[customerId], error: 'Please provide a description.' },
      }));
      return;
    }
    if (form.files.length === 0) {
      setClarificationForms((prev) => ({
        ...prev,
        [customerId]: { ...prev[customerId], error: 'Please attach at least one image.' },
      }));
      return;
    }

    const attachments: PaymentProof[] = [];
    for (const file of form.files) {
      const dataUrl = await readProofAsDataUrl(file);
      attachments.push({
        name: file.name,
        type: file.type,
        size: `${Math.round(file.size / 1024)} KB`,
        dataUrl,
      });
    }

    const updatedCustomers = paidCustomers.map((customer) => {
      if (customer.id !== customerId) return customer;
      return {
        ...customer,
        marketingClarificationResponse: {
          description,
          attachments,
          respondedAt: new Date().toISOString(),
          respondedBy: user.id,
          respondedByName: user.name,
        },
      };
    });

    setPaidCustomers(updatedCustomers);
    clarificationObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    clarificationObjectUrlsRef.current = [];
    setClarificationForms((prev) => ({
      ...prev,
      [customerId]: { ...prev[customerId], expanded: false, files: [], error: '' },
    }));
  };

  if (!user) return null;

  const canFinanceReview = user.role === 'finance_officer' || user.role === 'system_administrator';
  const canMarketingClarify = user.role === 'marketing_lead' || user.role === 'system_administrator';

  if (!canFinanceReview && !canMarketingClarify) {
    return (
      <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
        <p className="text-gray-500">Access denied. Finance Officer, Marketing Lead, or System Administrator access required.</p>
      </div>
    );
  }

  // ✅ Sort: highlighted first, then by transferredAt descending (newest first)
  const sortedCustomers = [...paidCustomers].sort((a, b) => {
    const aHL = highlightedIds.has(a.id) ? 1 : 0;
    const bHL = highlightedIds.has(b.id) ? 1 : 0;
    if (bHL !== aHL) return bHL - aHL; // highlighted on top
    return new Date(b.transferredAt).getTime() - new Date(a.transferredAt).getTime();
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Payment Verification Feedback Loop</h2>
        <p className="text-gray-600 mt-1">
          Finance provides the final decision as Approved, Rejected, or Request Clarification. Marketing can respond to clarification requests directly on this page.
        </p>
        {highlightedIds.size > 0 && (
          <p className="text-sm text-blue-600 mt-2 flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-semibold">
              {highlightedIds.size}
            </span>
            new {highlightedIds.size === 1 ? 'record' : 'records'} since your last visit
          </p>
        )}
      </div>

      {paidCustomers.length === 0 ? (
        <div className="bg-white rounded-xl p-10 shadow-sm border border-gray-200 text-center">
          <p className="text-gray-500">No paid‑customer records are available yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sortedCustomers.map((customer) => {
            const status = customer.paymentVerificationStatus ?? 'pending';
            const meta = verificationMeta[status] || FALLBACK_META;
            const StatusIcon = meta.icon;
            const financeMessage = customer.paymentVerificationMessage?.trim();
            const clarificationResponse = customer.marketingClarificationResponse;
            const isHighlighted = highlightedIds.has(customer.id);

            const financeForm = financeForms[customer.id] ?? { expanded: false, decision: 'approved', message: '' };
            const clarificationForm = clarificationForms[customer.id] ?? { expanded: false, description: '', files: [], error: '' };

            return (
              <div
                key={customer.id}
                data-highlighted-id={isHighlighted ? customer.id : undefined}
                className={[
                  'bg-white rounded-xl p-6 shadow-sm border transition-all duration-300',
                  isHighlighted
                    ? 'border-2 border-blue-400 ring-4 ring-blue-100 shadow-blue-100'
                    : 'border-gray-200 hover:shadow-md',
                ].join(' ')}
              >
                {isHighlighted && (
                  <div className="mb-3">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-100 px-2.5 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                      New
                    </span>
                  </div>
                )}

                <div className="flex items-start justify-between mb-3 gap-3">
                  <div>
                    <h4 className="font-semibold text-lg text-gray-900">{customer.customerName}</h4>
                    <p className="text-xs text-gray-500 mt-1">
                      Category: {categoryLabels[customer.category]}
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${meta.badgeClass}`}>
                    <StatusIcon className="w-3.5 h-3.5" />
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

                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">
                    Service Description
                  </p>
                  <p className="text-sm text-gray-700 mt-1">{customer.serviceDescription}</p>
                </div>

                <div className={`mb-4 p-4 rounded-lg border ${meta.panelClass}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <StatusIcon className={`w-4 h-4 ${meta.iconClass}`} />
                    <p className={`text-sm font-medium ${meta.textClass}`}>
                      {status === 'pending'
                        ? 'Awaiting Finance Feedback'
                        : `Finance Decision: ${meta.label}`}
                    </p>
                  </div>
                  {financeMessage ? (
                    <p className="text-sm text-gray-700 italic">“{financeMessage}”</p>
                  ) : (
                    <p className="text-sm text-gray-500">No message provided.</p>
                  )}
                </div>

                {/* Finance Inline Review Form (unchanged) */}
                {canFinanceReview && (
                  <div className="mb-4">
                    {!financeForm.expanded ? (
                      <button
                        onClick={() => toggleFinanceForm(customer.id)}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm transition-colors"
                      >
                        <MessageSquare className="w-4 h-4" />
                        {status === 'pending' ? 'Review & Decide' : 'Update Decision'}
                      </button>
                    ) : (
                      <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 space-y-3">
                        <div className="flex items-center justify-between">
                          <h5 className="text-sm font-medium text-gray-700">Finance Review Form</h5>
                          <button onClick={() => toggleFinanceForm(customer.id)} className="text-gray-400 hover:text-gray-600">
                            <ChevronUp className="w-4 h-4" />
                          </button>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Decision</label>
                          <select
                            value={financeForm.decision}
                            onChange={(e) => updateFinanceForm(customer.id, 'decision', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          >
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                            <option value="request_clarification">Request Clarification</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Message</label>
                          <textarea
                            value={financeForm.message}
                            onChange={(e) => updateFinanceForm(customer.id, 'message', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm min-h-[80px]"
                            placeholder="Provide reason or instruction..."
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => submitFinanceDecision(customer.id)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 text-white hover:bg-slate-800"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Save Decision
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Clarification Request Actions (unchanged) */}
                {status === 'request_clarification' && canMarketingClarify && (
                  <div className="mb-4">
                    {!clarificationForm.expanded ? (
                      <button
                        onClick={() => toggleClarificationForm(customer.id)}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm transition-colors"
                      >
                        <Send className="w-4 h-4" />
                        {clarificationResponse ? 'Edit Clarification' : 'Submit Clarification'}
                      </button>
                    ) : (
                      <div className="p-4 border border-amber-200 rounded-lg bg-amber-50 space-y-3">
                        <div className="flex items-center justify-between">
                          <h5 className="text-sm font-medium text-amber-800">Marketing Clarification</h5>
                          <button onClick={() => toggleClarificationForm(customer.id)} className="text-amber-600 hover:text-amber-800">
                            <ChevronUp className="w-4 h-4" />
                          </button>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                          <textarea
                            value={clarificationForm.description}
                            onChange={(e) => updateClarificationDescription(customer.id, e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm min-h-[90px]"
                            placeholder="Explain the clarification..."
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Attach Image</label>
                          <input
                            type="file"
                            id={`clarification-file-${customer.id}`}
                            accept="image/*"
                            multiple
                            onChange={(e) => handleClarificationFileChange(customer.id, e)}
                            className="hidden"
                          />
                          <label
                            htmlFor={`clarification-file-${customer.id}`}
                            className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                          >
                            <Plus className="w-4 h-4" />
                            Choose Images
                          </label>
                          {clarificationForm.files.length > 0 && (
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              {clarificationForm.files.map((file, idx) => {
                                const url = URL.createObjectURL(file);
                                if (!clarificationObjectUrlsRef.current[idx]) {
                                  clarificationObjectUrlsRef.current.push(url);
                                }
                                return (
                                  <div key={idx} className="relative border rounded overflow-hidden bg-gray-100">
                                    <img src={url} alt={file.name} className="w-full h-20 object-cover" />
                                    <button
                                      type="button"
                                      onClick={() => removeClarificationFile(customer.id, idx)}
                                      className="absolute top-0.5 right-0.5 p-0.5 bg-white/80 rounded-full text-red-500 hover:text-red-700"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                    <p className="text-xs truncate p-1">{file.name}</p>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        {clarificationForm.error && (
                          <p className="text-sm text-red-600">{clarificationForm.error}</p>
                        )}
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => submitClarification(customer.id)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-600 text-white hover:bg-amber-700"
                          >
                            <Send className="w-3.5 h-3.5" />
                            Submit
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Marketing Clarification Response (unchanged) */}
                {clarificationResponse && (
                  <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-blue-700">
                      Marketing Clarification Submitted
                    </p>
                    <p className="text-sm text-gray-700 mt-1">{clarificationResponse.description}</p>
                    {clarificationResponse.attachments?.length > 0 && (
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {clarificationResponse.attachments.map((att, idx) => (
                          <img
                            key={idx}
                            src={att.dataUrl}
                            alt={att.name}
                            className="w-full h-24 object-cover rounded border"
                          />
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      {clarificationResponse.respondedByName} • {new Date(clarificationResponse.respondedAt).toLocaleString()}
                    </p>
                  </div>
                )}

                {/* Contact Details */}
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}