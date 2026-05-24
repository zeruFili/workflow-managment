import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { PaidCustomer, PaymentProof, PaymentVerificationStatus } from '../types';
import {
  BadgeCheck,
  Ban,
  Bell,
  Calendar,
  CheckCircle2,
  CircleAlert,
  ClipboardList,
  Clock,
  FileText,
  Image,
  LayoutGrid,
  MessageSquare,
  Paperclip,
  RefreshCcw,
  ShieldCheck,
  User,
  Users,
  X,
  XCircle,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
} from 'lucide-react';

const PAID_STORAGE_KEY = 'paid-customers';

// ── Notification system ──
const viewedFinanceRecordCards = new Set<string>();

function publishFinanceBadgeCount(count: number) {
  window.dispatchEvent(
    new CustomEvent('finance-verifications-notifications-updated', { detail: count })
  );
}

type FinanceTab =
  | 'unapproved-request'
  | 'verified-records'
  | 'rejected-records'
  | 'ceo-approved-requests'
  | 'request-clarification-task';

type FinanceAction = 'verify' | 'reject' | 'clarify' | 'edit' | 'ceo-approve';

type FinanceHistoryEntry = {
  id: string;
  action: FinanceAction;
  note: string;
  actorId: string;
  actorName: string;
  timestamp: string;
};

type FinanceRecord = PaidCustomer & {
  evidenceReviewed?: boolean;
  financeHistory?: FinanceHistoryEntry[];
  resubmissionHistory?: FinanceHistoryEntry[];
  financeAttachmentDescription?: string;
  financeAttachments?: PaymentProof[];
};

type ActionModalState =
  | { open: false }
  | {
      open: true;
      recordId: string;
      action: FinanceAction;
      decision: Exclude<PaymentVerificationStatus, 'pending'> | 'verified';
      comment: string;
      description: string;
      files: File[];
      error: string;
    };

const categoryLabel = 'Paid customer verification';

const initialFinanceRecords: FinanceRecord[] = [
  // (all the seed data you provided – unchanged)
  {
    id: 'pc-fin-1',
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
    transferredBy: '1',
    transferredByName: 'Sarah Johnson',
    paymentNote: 'Receipt and transfer reference attached.',
    proofOfPayment: [
      {
        name: 'bank-transfer.svg',
        type: 'image/svg+xml',
        size: '4 KB',
        dataUrl:
          'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="100%25" height="100%25" rx="24" fill="%23e2e8f0"/><text x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle" font-family="Arial" font-size="26" fill="%230f172a">Payment%20Evidence</text></svg>',
      },
    ],
    paymentVerificationStatus: 'pending',
    financeHistory: [],
    resubmissionHistory: [],
  },
  {
    id: 'pc-fin-2',
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
    transferredBy: '0',
    transferredByName: 'CEO',
    paymentNote: 'CEO transferred for urgent verification.',
    proofOfPayment: [],
    paymentVerificationStatus: 'pending',
    financeHistory: [],
    resubmissionHistory: [],
    financeAttachmentDescription: 'CEO note attached for direct finance approval.',
  },
  {
    id: 'pc-fin-3',
    customerName: 'Omar El-Sayed',
    customerPhone: '+971 52 345 6789',
    customerEmail: 'omar.elsayed@example.com',
    customerAddress: 'Jumeirah Beach Residence, Dubai',
    category: 'finishing_work',
    serviceDescription: 'Complete finishing for a 3-bedroom apartment including flooring, painting, and custom cabinetry.',
    preferredStartDate: '2026-05-12',
    budget: 'AED 250,000',
    notes: 'Client prefers marble flooring in living areas and wooden flooring in bedrooms.',
    status: 'scheduled',
    createdAt: '2026-04-20T11:15:00Z',
    createdBy: '1',
    createdByName: 'Sarah Johnson',
    sourceRequestId: 'cr-3',
    transferredAt: '2026-05-05T10:15:00Z',
    transferredBy: '1',
    transferredByName: 'Sarah Johnson',
    paymentNote: 'Awaiting finance verification.',
    proofOfPayment: [],
    paymentVerificationStatus: 'rejected',
    paymentVerificationMessage: 'Duplicate payment entry detected. Cross-check with invoice #INV-204.',
    paymentVerifiedAt: '2026-05-05T13:15:00Z',
    paymentVerifiedBy: '6',
    paymentVerifiedByName: 'Lisa Martinez',
    financeHistory: [
      {
        id: 'hist-1',
        action: 'reject',
        note: 'Duplicate payment entry detected. Cross-check with invoice #INV-204.',
        actorId: '6',
        actorName: 'Lisa Martinez',
        timestamp: '2026-05-05T13:15:00Z',
      },
    ],
    resubmissionHistory: [],
  },
  {
    id: 'pc-fin-4',
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
    createdBy: '8',
    createdByName: 'Admin User',
    sourceRequestId: 'cr-4',
    transferredAt: '2026-05-06T08:45:00Z',
    transferredBy: '0',
    transferredByName: 'CEO',
    paymentNote: 'Transferred by CEO without finance verification.',
    proofOfPayment: [],
    paymentVerificationStatus: 'pending',
    financeHistory: [],
    resubmissionHistory: [],
  },
  {
    id: 'pc-fin-5',
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
    transferredBy: '1',
    transferredByName: 'Sarah Johnson',
    paymentNote: 'Approved and moved to paid customer records.',
    proofOfPayment: [],
    paymentVerificationStatus: 'verified',
    paymentVerifiedAt: '2026-05-02T10:10:00Z',
    paymentVerifiedBy: '6',
    paymentVerifiedByName: 'Lisa Martinez',
    financeHistory: [
      {
        id: 'hist-2',
        action: 'verify',
        note: 'Payment matched and approved for paid customer transfer.',
        actorId: '6',
        actorName: 'Lisa Martinez',
        timestamp: '2026-05-02T10:10:00Z',
      },
    ],
    resubmissionHistory: [],
  },
  {
    id: 'pc-fin-6',
    customerName: 'Khalid Al Muhairi',
    customerPhone: '+971 50 987 6543',
    customerEmail: 'khalid@business.ae',
    customerAddress: 'Al Barsha, Dubai',
    category: 'office_design',
    serviceDescription: 'Open-plan office design for 30 workstations with meeting rooms and pantry.',
    preferredStartDate: '2026-06-10',
    budget: 'AED 280,000',
    notes: 'Ergonomic furniture and soundproof pods required.',
    status: 'scheduled',
    createdAt: '2026-05-01T07:15:00Z',
    createdBy: '1',
    createdByName: 'Sarah Johnson',
    sourceRequestId: 'cr-6',
    transferredAt: '2026-05-10T09:00:00Z',
    transferredBy: '8',
    transferredByName: 'Admin User',
    paymentNote: 'Invoice #INV-456 attached.',
    proofOfPayment: [],
    paymentVerificationStatus: 'pending',
    financeHistory: [],
    resubmissionHistory: [],
  },
  {
    id: 'pc-fin-7',
    customerName: 'Layla Noor',
    customerPhone: '+971 55 123 9876',
    customerEmail: 'layla.noor@example.com',
    customerAddress: 'Khalifa City, Abu Dhabi',
    category: 'finishing_work',
    serviceDescription: 'High-end finishing for penthouse including smart lighting and custom wardrobes.',
    preferredStartDate: '2026-05-25',
    budget: 'AED 420,000',
    notes: 'Client supplied premium materials for flooring.',
    status: 'in_progress',
    createdAt: '2026-04-22T13:00:00Z',
    createdBy: '8',
    createdByName: 'Admin User',
    sourceRequestId: 'cr-7',
    transferredAt: '2026-05-12T07:30:00Z',
    transferredBy: '8',
    transferredByName: 'Admin User',
    paymentNote: 'Partial payment with balance on completion.',
    proofOfPayment: [],
    paymentVerificationStatus: 'pending',
    financeHistory: [],
    resubmissionHistory: [],
  },
  {
    id: 'pc-fin-8',
    customerName: 'Tariq Al Zaabi',
    customerPhone: '+971 56 543 2109',
    customerEmail: 'tariq@example.org',
    customerAddress: 'Al Fujairah',
    category: 'home_design',
    serviceDescription: 'Coastal villa interior with natural stone accents and panoramic windows.',
    preferredStartDate: '2026-07-01',
    budget: 'AED 550,000',
    notes: 'Approval from municipality pending for structural changes.',
    status: 'scheduled',
    createdAt: '2026-05-05T08:45:00Z',
    createdBy: '1',
    createdByName: 'Sarah Johnson',
    sourceRequestId: 'cr-8',
    transferredAt: '2026-05-15T14:10:00Z',
    transferredBy: '0',
    transferredByName: 'CEO',
    paymentNote: 'CEO fast-track transfer.',
    proofOfPayment: [],
    paymentVerificationStatus: 'request_clarification',
    paymentVerificationMessage: 'Clarify source of funds before we can approve.',
    paymentVerifiedAt: '2026-05-16T09:20:00Z',
    paymentVerifiedBy: '6',
    paymentVerifiedByName: 'Lisa Martinez',
    financeHistory: [
      {
        id: 'hist-3',
        action: 'clarify',
        note: 'Clarify source of funds before we can approve.',
        actorId: '6',
        actorName: 'Lisa Martinez',
        timestamp: '2026-05-16T09:20:00Z',
      },
    ],
    resubmissionHistory: [],
  },
  {
    id: 'pc-fin-9',
    customerName: 'Hind Al Mazrouei',
    customerPhone: '+971 52 111 2233',
    customerEmail: 'hind.m@example.com',
    customerAddress: 'Sharjah, Al Nahda',
    category: 'hair_salon_design',
    serviceDescription: 'Luxury salon with separate VIP section and spa facilities.',
    preferredStartDate: '2026-06-15',
    budget: 'AED 320,000',
    notes: 'Needs to comply with Sharjah municipality regulations.',
    status: 'scheduled',
    createdAt: '2026-05-08T10:30:00Z',
    createdBy: '8',
    createdByName: 'Admin User',
    sourceRequestId: 'cr-9',
    transferredAt: '2026-05-18T11:00:00Z',
    transferredBy: '1',
    transferredByName: 'Sarah Johnson',
    paymentNote: 'First instalment receipt attached.',
    proofOfPayment: [],
    paymentVerificationStatus: 'request_clarification',
    paymentVerificationMessage: 'Missing second receipt; please resubmit.',
    paymentVerifiedAt: '2026-05-19T14:05:00Z',
    paymentVerifiedBy: '6',
    paymentVerifiedByName: 'Lisa Martinez',
    financeHistory: [
      {
        id: 'hist-4',
        action: 'clarify',
        note: 'Missing second receipt; please resubmit.',
        actorId: '6',
        actorName: 'Lisa Martinez',
        timestamp: '2026-05-19T14:05:00Z',
      },
    ],
    resubmissionHistory: [],
  },
];

function normalizeRecord(record: FinanceRecord): FinanceRecord {
  return {
    ...record,
    paymentVerificationStatus: record.paymentVerificationStatus ?? 'pending',
    paymentVerificationMessage: record.paymentVerificationMessage ?? '',
    proofOfPayment: record.proofOfPayment ?? [],
    financeHistory: record.financeHistory ?? [],
    resubmissionHistory: record.resubmissionHistory ?? [],
  };
}

function loadFinanceRecords(): FinanceRecord[] {
  const saved = localStorage.getItem(PAID_STORAGE_KEY);
  if (!saved) {
    localStorage.setItem(PAID_STORAGE_KEY, JSON.stringify(initialFinanceRecords));
    return initialFinanceRecords;
  }

  const parsed = JSON.parse(saved) as FinanceRecord[];
  const merged = [
    ...parsed.map((record) => normalizeRecord(record)),
    ...initialFinanceRecords.filter((seed) => !parsed.some((record) => record.id === seed.id)),
  ].map(normalizeRecord);

  localStorage.setItem(PAID_STORAGE_KEY, JSON.stringify(merged));
  return merged;
}

function isVerified(status?: PaymentVerificationStatus) {
  return status === 'verified' || status === 'approved';
}

function statusTone(status?: PaymentVerificationStatus) {
  if (isVerified(status)) return 'bg-green-100 text-green-700';
  if (status === 'rejected') return 'bg-red-100 text-red-700';
  if (status === 'request_clarification') return 'bg-amber-100 text-amber-700';
  return 'bg-blue-100 text-blue-700';
}

function statusLabel(status?: PaymentVerificationStatus) {
  if (status === 'verified' || status === 'approved') return 'Verified';
  if (status === 'rejected') return 'Rejected';
  if (status === 'request_clarification') return 'Clarification Requested';
  return 'Pending';
}

function createAttachmentPreview(file: File): Promise<PaymentProof> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        name: file.name,
        type: file.type,
        size: `${Math.round(file.size / 1024)} KB`,
        dataUrl: String(reader.result),
      });
    };
    reader.onerror = () => reject(new Error('Unable to read attachment'));
    reader.readAsDataURL(file);
  });
}

// ── Shared record list (used in both mobile & desktop) ──
function RecordList({
  records,
  highlightedIds,
  onOpenDetail,
}: {
  records: FinanceRecord[];
  highlightedIds: Set<string>;
  onOpenDetail: (record: FinanceRecord) => void;
}) {
  if (records.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
        <ClipboardList className="mx-auto h-12 w-12 text-slate-300 mb-4" />
        <p className="text-slate-500">No records in this category.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {records.map((record) => {
        const isHighlighted = highlightedIds.has(record.id);

        return (
          <div
            key={record.id}
            data-highlighted-id={isHighlighted ? record.id : undefined}
            className={[
              'rounded-xl bg-white p-5 shadow-sm transition-all duration-300',
              isHighlighted
                ? 'border-2 border-blue-400 ring-4 ring-blue-100 shadow-blue-100'
                : 'border border-gray-200',
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
                <p className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                  <ClipboardList className="h-3.5 w-3.5" />
                  {record.id}
                </p>
                <h3 className="mt-3 text-lg font-semibold text-gray-900">{record.customerName}</h3>
                <p className="mt-1 text-sm text-gray-500">Submitted by {record.transferredByName}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap ${statusTone(record.paymentVerificationStatus)}`}>
                {statusLabel(record.paymentVerificationStatus)}
              </span>
            </div>

            <p className="text-sm text-gray-600 mb-4 line-clamp-2">{record.serviceDescription}</p>

            <div className="flex flex-wrap gap-2 mb-4">
              <span className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium">
                {record.budget}
              </span>
              <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium capitalize">
                {record.category?.replace(/_/g, ' ')}
              </span>
              {record.transferredByName === 'CEO' && (
                <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                  CEO Transfer
                </span>
              )}
            </div>

            <div className="space-y-2 text-sm mb-4">
              <div className="flex items-center gap-2 text-gray-500">
                <Calendar className="h-3.5 w-3.5" />
                <span>Submission: {new Date(record.transferredAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                <User className="h-3.5 w-3.5" />
                <span>Status: {statusLabel(record.paymentVerificationStatus)}</span>
              </div>
            </div>

            {(record.financeHistory ?? []).length > 0 && (() => {
              const latest = record.financeHistory![record.financeHistory!.length - 1];
              const isRej = latest.action === 'reject';
              const isVerif = latest.action === 'verify' || latest.action === 'ceo-approve';
              return (
                <div className={`mb-4 p-3 rounded-lg border text-sm ${isRej ? 'bg-red-50 border-red-200' : isVerif ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                  <p className={`font-medium ${isRej ? 'text-red-700' : isVerif ? 'text-green-700' : 'text-yellow-700'}`}>
                    {latest.action.replace('_', ' ')}
                  </p>
                  <p className={`italic mt-0.5 ${isRej ? 'text-red-600' : isVerif ? 'text-green-600' : 'text-yellow-600'}`}>
                    "{latest.note}"
                  </p>
                </div>
              );
            })()}

            <button
              type="button"
              onClick={() => onOpenDetail(record)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Open Verification Detail
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function FinanceVerifications() {
  const { user } = useAuth();
  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [currentView, setCurrentView] = useState<FinanceTab | null>(null);
  const [reviewedEvidence, setReviewedEvidence] = useState<Record<string, boolean>>({});
  const [modalState, setModalState] = useState<ActionModalState>({ open: false });
  const [showDetail, setShowDetail] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<FinanceRecord | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>('evidence');

  // ── Highlight / notification system ──
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());
  const seenThisSession = useRef<Set<string>>(new Set());
  const observedElements = useRef<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const recordsRef = useRef(records);

  useEffect(() => {
    recordsRef.current = records;
  }, [records]);

  // ── Pre‑load the global “viewed” set so that only the 3 newest pending records are highlighted ──
  const ensureViewedSetInitialized = (recs: FinanceRecord[]) => {
    if (viewedFinanceRecordCards.size === 0) {
      const pendingRecords = recs
        .filter(r => r.paymentVerificationStatus === 'pending')
        .sort((a, b) => new Date(b.transferredAt).getTime() - new Date(a.transferredAt).getTime());
      // Mark all except the first 3 as already viewed
      pendingRecords.slice(3).forEach(r => viewedFinanceRecordCards.add(r.id));
    }
  };

  // Load records
  useEffect(() => {
    const loaded = loadFinanceRecords();
    setRecords(loaded);
    ensureViewedSetInitialized(loaded); // first call
  }, []);

  // Compute highlighted IDs (pending & not yet globally viewed)
  useEffect(() => {
    if (records.length === 0) return;
    const pendingIds = records
      .filter((r) => r.paymentVerificationStatus === 'pending')
      .map((r) => r.id);
    const unseen = pendingIds.filter((id) => !viewedFinanceRecordCards.has(id));
    setHighlightedIds(new Set(unseen));
    publishFinanceBadgeCount(unseen.length);
  }, [records]);

  // IntersectionObserver for highlighted cards (marks as “seen this session”)
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

  // Commit seen session when navigating between tabs (or leaving the page)
  const commitSeenSession = () => {
    if (seenThisSession.current.size === 0) return;
    seenThisSession.current.forEach((id) => viewedFinanceRecordCards.add(id));
    seenThisSession.current.clear();
    observedElements.current.clear();

    // Recalculate highlights and update badge
    const currentRecords = recordsRef.current;
    const pendingIds = currentRecords
      .filter((r) => r.paymentVerificationStatus === 'pending')
      .map((r) => r.id);
    const remainingUnseen = pendingIds.filter((id) => !viewedFinanceRecordCards.has(id));
    setHighlightedIds(new Set(remainingUnseen));
    publishFinanceBadgeCount(remainingUnseen.length);
  };

  // Trigger commit whenever the user switches tabs
  useEffect(() => {
    commitSeenSession();
  }, [currentView]);

  // Safety net: commit on unmount (when navigating to a completely different route)
  useEffect(() => {
    return () => {
      commitSeenSession();
    };
  }, []);

  // Persist records to localStorage
  useEffect(() => {
    if (records.length > 0) {
      localStorage.setItem(PAID_STORAGE_KEY, JSON.stringify(records));
    }
  }, [records]);

  if (!user) return null;

  const financeMemberName = user.name;

  const summary = useMemo(
    () => ({
      unapprovedTasks: records.filter((r) => r.paymentVerificationStatus === 'pending').length,
      clarificationTasks: records.filter((r) => r.paymentVerificationStatus === 'request_clarification').length,
      verifiedPayments: records.filter((r) => isVerified(r.paymentVerificationStatus)).length,
      rejectedPayments: records.filter((r) => r.paymentVerificationStatus === 'rejected').length,
      ceoApprovedRequests: records.filter((r) => r.transferredByName === 'CEO' && !isVerified(r.paymentVerificationStatus)).length,
    }),
    [records]
  );

  const activeDesktopTab: FinanceTab = currentView ?? 'unapproved-request';

  const filteredRecords = useMemo(() => {
    const tab = currentView ?? 'unapproved-request';
    const base = (() => {
      switch (tab) {
        case 'unapproved-request':
          return records.filter((r) => r.paymentVerificationStatus === 'pending');
        case 'request-clarification-task':
          return records.filter((r) => r.paymentVerificationStatus === 'request_clarification');
        case 'verified-records':
          return records.filter((r) => isVerified(r.paymentVerificationStatus));
        case 'rejected-records':
          return records.filter((r) => r.paymentVerificationStatus === 'rejected');
        case 'ceo-approved-requests':
          return records.filter((r) => r.transferredByName === 'CEO' && !isVerified(r.paymentVerificationStatus));
        default:
          return [];
      }
    })();

    return [...base].sort((a, b) => {
      const aHL = highlightedIds.has(a.id) ? 1 : 0;
      const bHL = highlightedIds.has(b.id) ? 1 : 0;
      if (bHL !== aHL) return bHL - aHL;
      return new Date(b.transferredAt).getTime() - new Date(a.transferredAt).getTime();
    });
  }, [currentView, records, highlightedIds]);

  const viewLabel = useMemo(() => {
    const tab = currentView ?? 'unapproved-request';
    switch (tab) {
      case 'unapproved-request': return 'Unapproved Requests';
      case 'request-clarification-task': return 'Request Clarification Tasks';
      case 'verified-records': return 'Verified Records';
      case 'rejected-records': return 'Rejected Records';
      case 'ceo-approved-requests': return 'CEO Approved Requests';
      default: return '';
    }
  }, [currentView]);

  const persistRecords = (nextRecords: FinanceRecord[]) => {
    setRecords(nextRecords.map(normalizeRecord));
  };

  const openDetail = (record: FinanceRecord) => {
    setSelectedRecord(record);
    setExpandedSection('evidence');
    setShowDetail(true);
  };

  const closeDetail = () => {
    setShowDetail(false);
    setSelectedRecord(null);
  };

  useEffect(() => {
    if (selectedRecord) {
      const updated = records.find((r) => r.id === selectedRecord.id);
      if (updated) setSelectedRecord(updated);
    }
  }, [records]);

  const openModal = (
    recordId: string,
    action: FinanceAction,
    decision: Exclude<PaymentVerificationStatus, 'pending'> | 'verified'
  ) => {
    const current = records.find((r) => r.id === recordId);
    setModalState({
      open: true,
      recordId,
      action,
      decision,
      comment: current?.paymentVerificationMessage ?? '',
      description: current?.financeAttachmentDescription ?? '',
      files: [],
      error: '',
    });
  };

  const closeModal = () => setModalState({ open: false });

  const updateModalField = (field: 'comment' | 'description' | 'decision', value: string) => {
    if (!modalState.open) return;
    setModalState({ ...modalState, [field]: value } as ActionModalState);
  };

  const updateModalFiles = (files: File[]) => {
    if (!modalState.open) return;
    setModalState({ ...modalState, files, error: '' });
  };

  const saveModalAction = async () => {
    if (!modalState.open) return;

    const record = records.find((item) => item.id === modalState.recordId);
    if (!record) return;

    const note = modalState.comment.trim();
    const description = modalState.description.trim();

    if ((modalState.action === 'reject' || modalState.action === 'clarify' || modalState.action === 'edit') && !note) {
      setModalState({ ...modalState, error: 'A comment is required for this action.' });
      return;
    }

    if (modalState.action === 'ceo-approve' && modalState.files.length === 0 && !description) {
      setModalState({ ...modalState, error: 'Attach an image or add a description before approving.' });
      return;
    }

    const attachments: PaymentProof[] = [];
    for (const file of modalState.files) {
      attachments.push(await createAttachmentPreview(file));
    }

    const timestamp = new Date().toISOString();
    const historyEntry: FinanceHistoryEntry = {
      id: `fh-${Date.now()}`,
      action: modalState.action,
      note: note || description || 'Updated finance decision.',
      actorId: user.id,
      actorName: financeMemberName,
      timestamp,
    };

    const nextRecords = records.map((item) => {
      if (item.id !== modalState.recordId) return item;

      const baseUpdate: FinanceRecord = {
        ...item,
        financeHistory: [...(item.financeHistory ?? []), historyEntry],
      };

      if (modalState.action === 'verify' || modalState.action === 'ceo-approve') {
        return {
          ...baseUpdate,
          paymentVerificationStatus: 'verified',
          paymentVerificationMessage: note || description || 'Payment verified.',
          paymentVerifiedAt: timestamp,
          paymentVerifiedBy: user.id,
          paymentVerifiedByName: financeMemberName,
          financeAttachmentDescription: description || item.financeAttachmentDescription,
          financeAttachments: attachments.length > 0 ? attachments : item.financeAttachments,
          evidenceReviewed: true,
        };
      }

      if (modalState.action === 'reject') {
        return {
          ...baseUpdate,
          paymentVerificationStatus: 'rejected',
          paymentVerificationMessage: note,
          paymentVerifiedAt: timestamp,
          paymentVerifiedBy: user.id,
          paymentVerifiedByName: financeMemberName,
          evidenceReviewed: true,
          resubmissionHistory: [
            ...(item.resubmissionHistory ?? []),
            { id: `rh-${Date.now()}`, action: 'reject', note, actorId: user.id, actorName: financeMemberName, timestamp },
          ],
        };
      }

      if (modalState.action === 'clarify') {
        return {
          ...baseUpdate,
          paymentVerificationStatus: 'request_clarification',
          paymentVerificationMessage: note,
          paymentVerifiedAt: timestamp,
          paymentVerifiedBy: user.id,
          paymentVerifiedByName: financeMemberName,
          evidenceReviewed: true,
          resubmissionHistory: [
            ...(item.resubmissionHistory ?? []),
            { id: `rh-${Date.now()}`, action: 'clarify', note, actorId: user.id, actorName: financeMemberName, timestamp },
          ],
        };
      }

      if (modalState.action === 'edit') {
        return {
          ...baseUpdate,
          paymentVerificationStatus: modalState.decision,
          paymentVerificationMessage: note,
          paymentVerifiedAt: timestamp,
          paymentVerifiedBy: user.id,
          paymentVerifiedByName: financeMemberName,
          evidenceReviewed: true,
          resubmissionHistory: [
            ...(item.resubmissionHistory ?? []),
            { id: `rh-${Date.now()}`, action: 'edit', note, actorId: user.id, actorName: financeMemberName, timestamp },
          ],
        };
      }

      return baseUpdate;
    });

    persistRecords(nextRecords);
    setReviewedEvidence((current) => ({ ...current, [record.id]: true }));
    closeModal();
  };

  if (user.role !== 'finance_officer' && user.role !== 'system_administrator' && user.role !== 'ceo' && user.role !== 'general_manager') {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
        <p className="text-gray-500">Access denied. Finance Officer access required.</p>
      </div>
    );
  }

  const isProcessed = selectedRecord
    ? isVerified(selectedRecord.paymentVerificationStatus) ||
      selectedRecord.paymentVerificationStatus === 'rejected' ||
      selectedRecord.paymentVerificationStatus === 'request_clarification'
    : false;

  const tiles = [
    { label: 'Unapproved Request', value: summary.unapprovedTasks, icon: ClipboardList, tone: 'bg-blue-50 text-blue-700', activeTone: 'ring-2 ring-blue-400', tab: 'unapproved-request' as FinanceTab },
    { label: 'Request Clarification', value: summary.clarificationTasks, icon: CircleAlert, tone: 'bg-amber-50 text-amber-700', activeTone: 'ring-2 ring-amber-400', tab: 'request-clarification-task' as FinanceTab },
    { label: 'Verified Payments', value: summary.verifiedPayments, icon: CheckCircle2, tone: 'bg-green-50 text-green-700', activeTone: 'ring-2 ring-green-400', tab: 'verified-records' as FinanceTab },
    { label: 'Rejected Payments', value: summary.rejectedPayments, icon: Ban, tone: 'bg-red-50 text-red-700', activeTone: 'ring-2 ring-red-400', tab: 'rejected-records' as FinanceTab },
    { label: 'Approve CEO-transferred', value: summary.ceoApprovedRequests, icon: Bell, tone: 'bg-amber-50 text-amber-700', activeTone: 'ring-2 ring-amber-400', tab: 'ceo-approved-requests' as FinanceTab },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              <ShieldCheck className="h-4 w-4" />
              Finance Role
            </div>
            <h2 className="mt-3 text-2xl font-bold text-slate-900">Payment Verification Center</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Verifies payment evidence before paid customer requests proceed to the verified Paid Customer page.
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
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm min-w-[240px]">
            <p className="text-xs uppercase tracking-wide text-slate-500">Viewing as</p>
            <p className="mt-1 font-medium text-slate-900">{user.name}</p>
            <p className="text-sm text-slate-500">{categoryLabel}</p>
          </div>
        </div>
      </div>

      {/* ── MOBILE VIEW ── */}
      <div className="block lg:hidden">
        {currentView === null ? (
          <div className="flex flex-col gap-3">
            {tiles.map((tile) => {
              const Icon = tile.icon;
              return (
                <button
                  key={tile.label}
                  type="button"
                  onClick={() => setCurrentView(tile.tab)}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition active:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <div className={`inline-flex rounded-xl p-2 ${tile.tone}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-medium text-slate-700">{tile.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-bold text-slate-900">{tile.value}</span>
                    <ChevronDown className="h-4 w-4 -rotate-90 text-slate-400" />
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-6">
            <button
              type="button"
              onClick={() => setCurrentView(null)}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </button>
            <h3 className="text-xl font-semibold text-slate-900">{viewLabel}</h3>
            <RecordList records={filteredRecords} highlightedIds={highlightedIds} onOpenDetail={openDetail} />
          </div>
        )}
      </div>

      {/* ── DESKTOP VIEW ── */}
      <div className="hidden lg:block space-y-6">
        <div className="grid grid-cols-5 gap-4">
          {tiles.map((tile) => {
            const Icon = tile.icon;
            const isActive = activeDesktopTab === tile.tab;
            return (
              <button
                key={tile.label}
                type="button"
                onClick={() => setCurrentView(tile.tab)}
                className={`rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                  isActive ? `border-slate-400 ${tile.activeTone}` : 'border-slate-200'
                }`}
              >
                <div className={`inline-flex rounded-xl p-2 ${tile.tone}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="mt-4 text-sm text-slate-500">{tile.label}</p>
                <p className="mt-1 text-3xl font-bold text-slate-900">{tile.value}</p>
              </button>
            );
          })}
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-slate-900">{viewLabel}</h3>
          <RecordList records={filteredRecords} highlightedIds={highlightedIds} onOpenDetail={openDetail} />
        </div>
      </div>

      {/* ── DETAIL MODAL (unchanged) ── */}
      {showDetail && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 py-6 overflow-y-auto">
          <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-5">
              <div>
                <h3 className="text-2xl font-semibold text-gray-900">Verification Detail</h3>
                <p className="mt-1 text-sm text-gray-500">Review payment evidence and take action</p>
              </div>
              <button onClick={closeDetail} className="rounded-lg p-2 hover:bg-gray-100">
                <XCircle className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            {/* ... detail modal content (identical to original) ... */}
          </div>
        </div>
      )}

      {/* ── ACTION MODAL (unchanged) ── */}
      {modalState.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Finance action</p>
                <h3 className="mt-1 text-xl font-bold text-slate-900 capitalize">{modalState.action.replace('_', ' ')}</h3>
              </div>
              <button type="button" onClick={closeModal} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            {/* ... action modal content (identical to original) ... */}
          </div>
        </div>
      )}
    </div>
  );
}

export default FinanceVerifications;