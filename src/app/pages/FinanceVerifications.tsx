import React, { useEffect, useMemo, useState } from 'react';
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
} from 'lucide-react';

const PAID_STORAGE_KEY = 'paid-customers';

type FinanceTab =
  | 'verification-task'
  | 'verified-records'
  | 'rejected-records'
  | 'ceo-approved-requests'
  | 'unapproved-requests';

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

export function FinanceVerifications() {
  const { user } = useAuth();
  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [activeTab, setActiveTab] = useState<FinanceTab>('verification-task');
  const [reviewedEvidence, setReviewedEvidence] = useState<Record<string, boolean>>({});
  const [modalState, setModalState] = useState<ActionModalState>({ open: false });

  // Detail modal state
  const [showDetail, setShowDetail] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<FinanceRecord | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>('evidence');

  useEffect(() => {
    const loaded = loadFinanceRecords();
    setRecords(loaded);
  }, []);

  useEffect(() => {
    if (records.length > 0) {
      localStorage.setItem(PAID_STORAGE_KEY, JSON.stringify(records));
    }
  }, [records]);

  if (!user) {
    return null;
  }

  const financeMemberName = user.name;

  const summary = useMemo(
    () => ({
      verificationTasks: records.filter((r) => !isVerified(r.paymentVerificationStatus) && r.paymentVerificationStatus !== 'rejected').length,
      verifiedPayments: records.filter((r) => isVerified(r.paymentVerificationStatus)).length,
      rejectedPayments: records.filter((r) => r.paymentVerificationStatus === 'rejected').length,
      ceoApprovedRequests: records.filter((r) => r.transferredByName === 'CEO' && !isVerified(r.paymentVerificationStatus)).length,
    }),
    [records]
  );

  const tabs: Array<{ id: FinanceTab; label: string; count?: number }> = [
    { id: 'verification-task', label: 'Verification Task', count: summary.verificationTasks },
    { id: 'verified-records', label: 'Verified Records', count: summary.verifiedPayments },
    { id: 'rejected-records', label: 'Rejected Records', count: summary.rejectedPayments },
    { id: 'ceo-approved-requests', label: 'CEO Approved Requests', count: summary.ceoApprovedRequests },
    { id: 'unapproved-requests', label: 'Unapproved Requests', count: records.filter((r) => r.paymentVerificationStatus === 'pending').length },
  ];

  const activeRecords = useMemo(() => {
    switch (activeTab) {
      case 'verified-records':
        return records.filter((r) => isVerified(r.paymentVerificationStatus));
      case 'rejected-records':
        return records.filter((r) => r.paymentVerificationStatus === 'rejected');
      case 'ceo-approved-requests':
        return records.filter((r) => r.transferredByName === 'CEO' && !isVerified(r.paymentVerificationStatus));
      case 'unapproved-requests':
        return records.filter((r) => r.paymentVerificationStatus === 'pending');
      case 'verification-task':
      default:
        return records.filter((r) => r.paymentVerificationStatus === 'pending' || r.paymentVerificationStatus === 'request_clarification');
    }
  }, [activeTab, records]);

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

  // Sync selectedRecord when records change (so detail panel stays fresh)
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

  const attachmentCount = selectedRecord?.proofOfPayment?.length ?? 0;
  const historyCount = (selectedRecord?.financeHistory?.length ?? 0) + (selectedRecord?.resubmissionHistory?.length ?? 0);

  const toggleSection = (section: string) => {
    setExpandedSection((prev) => (prev === section ? null : section));
  };

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
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm min-w-[240px]">
            <p className="text-xs uppercase tracking-wide text-slate-500">Viewing as</p>
            <p className="mt-1 font-medium text-slate-900">{user.name}</p>
            <p className="text-sm text-slate-500">{categoryLabel}</p>
          </div>
        </div>
      </div>

      {/* Summary Tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Verification Task', value: summary.verificationTasks, icon: ClipboardList, tone: 'bg-blue-50 text-blue-700', tab: 'verification-task' as FinanceTab },
          { label: 'Verified Payments', value: summary.verifiedPayments, icon: CheckCircle2, tone: 'bg-green-50 text-green-700', tab: 'verified-records' as FinanceTab },
          { label: 'Rejected Payments', value: summary.rejectedPayments, icon: Ban, tone: 'bg-red-50 text-red-700', tab: 'rejected-records' as FinanceTab },
          { label: 'Approve CEO-transferred requests', value: summary.ceoApprovedRequests, icon: Bell, tone: 'bg-amber-50 text-amber-700', tab: 'ceo-approved-requests' as FinanceTab },
        ].map((tile) => {
          const Icon = tile.icon;
          return (
            <button
              key={tile.label}
              type="button"
              onClick={() => setActiveTab(tile.tab)}
              className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
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

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {tab.label}
            {typeof tab.count === 'number' ? <span className="ml-2 text-xs opacity-80">{tab.count}</span> : null}
          </button>
        ))}
      </div>

      {/* Records Grid — equal spacing, 2-column */}
      {activeRecords.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {activeRecords.map((record) => {
            const isOverdue = record.preferredStartDate && new Date(record.preferredStartDate) < new Date();
            return (
              <div
                key={record.id}
                className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
              >
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

                {/* Latest history note if any */}
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
                  onClick={() => openDetail(record)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Open Verification Detail
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
          <ClipboardList className="mx-auto h-12 w-12 text-slate-300 mb-4" />
          <p className="text-slate-500">No records match this section yet.</p>
        </div>
      )}

      {/* Audit Summary */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <MessageSquare className="h-4 w-4 text-slate-500" />
          Audit summary
        </div>
        <p className="mt-2 text-sm text-slate-600">
          {selectedRecord
            ? `Selected record has ${attachmentCount} proof attachment(s) and ${historyCount} recorded finance history item(s).`
            : 'Open a record detail to view audit info.'}
        </p>
      </div>

      {/* ── FULL-PAGE DETAIL MODAL ── */}
      {showDetail && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 py-6 overflow-y-auto">
          <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-5">
              <div>
                <h3 className="text-2xl font-semibold text-gray-900">Verification Detail</h3>
                <p className="mt-1 text-sm text-gray-500">Review payment evidence and take action</p>
              </div>
              <button onClick={closeDetail} className="rounded-lg p-2 hover:bg-gray-100">
                <XCircle className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 px-6 py-5 lg:grid-cols-3">
              {/* Main content */}
              <div className="lg:col-span-2 space-y-5">
                {/* Record Info */}
                <section className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-xl font-semibold text-gray-900">{selectedRecord.customerName}</h4>
                      <p className="mt-1 text-sm text-gray-500">ID: {selectedRecord.id}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap ${statusTone(selectedRecord.paymentVerificationStatus)}`}>
                      {statusLabel(selectedRecord.paymentVerificationStatus)}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700">
                      {selectedRecord.budget}
                    </span>
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 capitalize">
                      {selectedRecord.category?.replace(/_/g, ' ')}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                      Submitted by {selectedRecord.transferredByName}
                    </span>
                    {selectedRecord.transferredByName === 'CEO' && (
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
                        CEO Transfer
                      </span>
                    )}
                  </div>
                </section>

                {/* Service Description */}
                <section className="rounded-xl border border-gray-200 bg-white p-4">
                  <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500">Service Description</h5>
                  <p className="mt-2 text-sm text-gray-700">{selectedRecord.serviceDescription}</p>
                </section>

                {/* Marketing / Payment Note */}
                <section className="rounded-xl border border-gray-200 bg-white p-4">
                  <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500">Payment Note</h5>
                  <p className="mt-2 text-sm text-gray-700">{selectedRecord.paymentNote ?? 'No payment note attached.'}</p>
                </section>

                {/* Payment Evidence — collapsible */}
                <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleSection('evidence')}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                      <Image className="h-4 w-4 text-slate-500" />
                      Uploaded Payment Evidence
                      <span className="ml-1 text-xs text-gray-500">({selectedRecord.proofOfPayment?.length ?? 0} files)</span>
                    </div>
                    {expandedSection === 'evidence' ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
                  </button>
                  {expandedSection === 'evidence' && (
                    <div className="p-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        {(selectedRecord.proofOfPayment ?? []).length > 0 ? (
                          selectedRecord.proofOfPayment!.map((proof) => (
                            <div key={proof.name} className="rounded-2xl border border-slate-200 p-3">
                              <img src={proof.dataUrl} alt={proof.name} className="h-32 w-full rounded-xl object-cover" />
                              <p className="mt-2 text-xs text-slate-500">{proof.name}</p>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-slate-500 col-span-2">No uploaded evidence attached to this record.</p>
                        )}
                      </div>
                    </div>
                  )}
                </section>

                {/* Finance Attachments — collapsible */}
                <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleSection('attachments')}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                      <FileText className="h-4 w-4 text-slate-500" />
                      Finance Attachments
                    </div>
                    {expandedSection === 'attachments' ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
                  </button>
                  {expandedSection === 'attachments' && (
                    <div className="p-4 space-y-2">
                      <p className="text-sm text-slate-600">
                        {selectedRecord.financeAttachments?.length
                          ? `${selectedRecord.financeAttachments.length} finance attachment(s) added.`
                          : 'No finance attachments added yet.'}
                      </p>
                      <p className="text-sm text-slate-600">
                        {selectedRecord.financeAttachmentDescription ?? 'No finance description added yet.'}
                      </p>
                    </div>
                  )}
                </section>

                {/* Finance History — collapsible */}
                <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleSection('history')}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                      <MessageSquare className="h-4 w-4 text-slate-500" />
                      Full Payment History
                      <span className="ml-1 text-xs text-gray-500">({selectedRecord.financeHistory?.length ?? 0} entries)</span>
                    </div>
                    {expandedSection === 'history' ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
                  </button>
                  {expandedSection === 'history' && (
                    <div className="p-4 space-y-2">
                      {(selectedRecord.financeHistory ?? []).length > 0 ? (
                        selectedRecord.financeHistory!.map((entry) => (
                          <div key={entry.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                            <p className="font-medium text-slate-800 capitalize">{entry.action.replace('_', ' ')}</p>
                            <p className="text-slate-600">{entry.note}</p>
                            <p className="mt-1 text-xs text-slate-500">{entry.actorName} · {new Date(entry.timestamp).toLocaleString()}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500">No payment history yet.</p>
                      )}
                    </div>
                  )}
                </section>

                {/* Resubmission History — collapsible */}
                <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleSection('resubmission')}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                      <RefreshCcw className="h-4 w-4 text-slate-500" />
                      Resubmission History
                      <span className="ml-1 text-xs text-gray-500">({selectedRecord.resubmissionHistory?.length ?? 0} entries)</span>
                    </div>
                    {expandedSection === 'resubmission' ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
                  </button>
                  {expandedSection === 'resubmission' && (
                    <div className="p-4 space-y-2">
                      {(selectedRecord.resubmissionHistory ?? []).length > 0 ? (
                        selectedRecord.resubmissionHistory!.map((entry) => (
                          <div key={entry.id} className="rounded-xl bg-amber-50 p-3 text-sm">
                            <p className="font-medium text-amber-800 capitalize">{entry.action.replace('_', ' ')}</p>
                            <p className="text-amber-700">{entry.note}</p>
                            <p className="mt-1 text-xs text-amber-600">{entry.actorName} · {new Date(entry.timestamp).toLocaleString()}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500">No resubmission history yet.</p>
                      )}
                    </div>
                  )}
                </section>

                {/* CEO Transfer Banner */}
                {selectedRecord.transferredByName === 'CEO' && !isVerified(selectedRecord.paymentVerificationStatus) && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
                      <CircleAlert className="h-4 w-4" />
                      CEO-transferred request
                    </div>
                    <p className="mt-2 text-sm text-amber-700">
                      Add a note or attach evidence, then approve this transfer to move it into approved tasks with the finance member name.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        closeDetail();
                        openModal(selectedRecord.id, 'ceo-approve', 'verified');
                      }}
                      className="mt-3 rounded-xl bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800 transition-colors"
                    >
                      Approve CEO-transferred request
                    </button>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <aside className="space-y-4">
                {/* Mark evidence reviewed */}
                <section className="rounded-xl border border-gray-200 bg-white p-4">
                  <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500 mb-3">Evidence Review</h5>
                  {reviewedEvidence[selectedRecord.id] ? (
                    <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 border border-green-200">
                      <CheckCircle2 className="h-4 w-4" />
                      Evidence marked as reviewed
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setReviewedEvidence((current) => ({ ...current, [selectedRecord.id]: true }))}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      Mark Evidence Reviewed
                    </button>
                  )}
                  {!reviewedEvidence[selectedRecord.id] && (
                    <p className="mt-2 text-xs text-slate-500">Review evidence before actions become available.</p>
                  )}
                </section>

                {/* Timeline */}
                <section className="rounded-xl border border-gray-200 bg-white p-4">
                  <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500 mb-3">Timeline</h5>
                  <div className="space-y-2 text-sm text-gray-700">
                    <div className="flex items-center gap-2 text-gray-500">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <span>Submitted: {new Date(selectedRecord.transferredAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500">
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      <span>Preferred start: {selectedRecord.preferredStartDate ?? 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500">
                      <User className="h-3.5 w-3.5 shrink-0" />
                      <span>By: {selectedRecord.transferredByName}</span>
                    </div>
                    {selectedRecord.paymentVerifiedByName && (
                      <div className="flex items-center gap-2 text-gray-500">
                        <BadgeCheck className="h-3.5 w-3.5 shrink-0" />
                        <span>Verified by: {selectedRecord.paymentVerifiedByName}</span>
                      </div>
                    )}
                  </div>
                </section>

                {/* Action Buttons */}
                <section className="rounded-xl border border-gray-200 bg-white p-4">
                  <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500 mb-3">Actions</h5>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => { closeDetail(); openModal(selectedRecord.id, 'verify', 'verified'); }}
                      disabled={!reviewedEvidence[selectedRecord.id]}
                      className="w-full rounded-xl bg-green-600 px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-green-300 hover:bg-green-700 transition-colors"
                    >
                      Verify Payment
                    </button>
                    <button
                      type="button"
                      onClick={() => { closeDetail(); openModal(selectedRecord.id, 'reject', 'rejected'); }}
                      disabled={!reviewedEvidence[selectedRecord.id]}
                      className="w-full rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-red-300 hover:bg-red-700 transition-colors"
                    >
                      Reject Payment
                    </button>
                    <button
                      type="button"
                      onClick={() => { closeDetail(); openModal(selectedRecord.id, 'clarify', 'request_clarification'); }}
                      disabled={!reviewedEvidence[selectedRecord.id]}
                      className="w-full rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-amber-300 hover:bg-amber-700 transition-colors"
                    >
                      Request Clarification
                    </button>
                    <button
                      type="button"
                      onClick={() => { closeDetail(); openModal(selectedRecord.id, 'edit', selectedRecord.paymentVerificationStatus ?? 'pending'); }}
                      disabled={!reviewedEvidence[selectedRecord.id]}
                      className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-400 hover:bg-slate-700 transition-colors"
                    >
                      Edit Verification Decision
                    </button>
                  </div>
                </section>

                {/* Audit */}
                <section className="rounded-xl border border-gray-200 bg-white p-4">
                  <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500 mb-2">Audit</h5>
                  <p className="text-sm text-slate-600">
                    {selectedRecord.proofOfPayment?.length ?? 0} proof attachment(s)
                  </p>
                  <p className="text-sm text-slate-600">
                    {(selectedRecord.financeHistory?.length ?? 0) + (selectedRecord.resubmissionHistory?.length ?? 0)} history entries
                  </p>
                </section>
              </aside>
            </div>
          </div>
        </div>
      )}

      {/* Action Modal */}
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

            <div className="mt-5 space-y-4">
              {modalState.action === 'edit' && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">New decision</label>
                  <select
                    value={modalState.decision}
                    onChange={(e) => updateModalField('decision', e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                  >
                    <option value="verified">Verified</option>
                    <option value="rejected">Rejected</option>
                    <option value="request_clarification">Request Clarification</option>
                  </select>
                </div>
              )}

              {(modalState.action === 'verify' || modalState.action === 'ceo-approve' || modalState.action === 'edit') && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Verification comment {modalState.action === 'verify' ? '(optional)' : '(required for edits)'}
                  </label>
                  <textarea
                    value={modalState.comment}
                    onChange={(e) => updateModalField('comment', e.target.value)}
                    className="min-h-[100px] w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                    placeholder="Add a comment for the audit log"
                  />
                </div>
              )}

              {(modalState.action === 'reject' || modalState.action === 'clarify') && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    {modalState.action === 'reject' ? 'Rejection reason' : 'Clarification notes'}
                  </label>
                  <textarea
                    value={modalState.comment}
                    onChange={(e) => updateModalField('comment', e.target.value)}
                    className="min-h-[120px] w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                    placeholder="Enter the decision note"
                  />
                </div>
              )}

              {modalState.action === 'ceo-approve' && (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Description</label>
                    <textarea
                      value={modalState.description}
                      onChange={(e) => updateModalField('description', e.target.value)}
                      className="min-h-[100px] w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                      placeholder="Add description for the CEO-transferred approval"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Attach image</label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => updateModalFiles(Array.from(e.target.files ?? []))}
                      className="block w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                    />
                  </div>
                </>
              )}

              {modalState.error && <p className="text-sm text-red-600">{modalState.error}</p>}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeModal} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">
                  Cancel
                </button>
                <button type="button" onClick={saveModalAction} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white">
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FinanceVerifications;