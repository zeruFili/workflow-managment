import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { PaidCustomer, CustomerRequestCategory } from '../types';
import {
  Calendar,
  Mail,
  MapPin,
  Phone,
  User,
  Users,
  FileText,
} from 'lucide-react';

const PAID_STORAGE_KEY = 'paid-customers-v2';

// In-memory "viewed" set – resets on page refresh (perfect for demo)
const viewedPaidCustomerCards = new Set<string>();

const categoryLabels: Record<CustomerRequestCategory, string> = {
  home_design: 'Home Design',
  finishing_work: 'Finishing Work',
  hair_salon_design: "Women's Hair Salon Design",
  other: 'Other',
};

// These three IDs are "new" until the user scrolls them into view AND navigates away
const HIGHLIGHTED_IDS = ['pc-1', 'pc-2', 'pc-3'];

const initialPaidCustomers: PaidCustomer[] = [
  {
    id: 'pc-1',
    customerName: 'Nadia Hassan',
    customerPhone: '+971 50 123 4567',
    customerEmail: 'nadia@example.com',
    customerAddress: 'Dubai Marina, Dubai',
    category: 'home_design',
    serviceDescription:
      'Modern home concept – living room, kitchen, bedroom layout planning.',
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
    serviceDescription:
      "Women's salon interior with reception, styling stations, waiting area.",
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
    serviceDescription:
      'Complete finishing for 3-bedroom apartment – flooring, painting, custom cabinetry.',
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
    serviceDescription:
      'Custom built-in library and reading nook for a private residence.',
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
    serviceDescription:
      'Luxury salon with VIP rooms, bridal suite, and retail display.',
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

function publishBadgeCount(count: number) {
  window.dispatchEvent(
    new CustomEvent('paid-customers-notifications-updated', { detail: count })
  );
}

export function getUnseenPaidCustomerHighlightedIds() {
  return new Set(
    HIGHLIGHTED_IDS.filter((id) => !viewedPaidCustomerCards.has(id))
  );
}

export function getUnseenPaidCustomerCount() {
  return getUnseenPaidCustomerHighlightedIds().size;
}

export function PaidCustomers() {
  const { user } = useAuth();
  const [paidCustomers, setPaidCustomers] = useState<PaidCustomer[]>([]);
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());
  
  // Track which highlighted cards have been scrolled into view this session
  const seenThisSession = useRef<Set<string>>(new Set());
  
  // Track which elements are currently being observed to avoid duplicates
  const observedElements = useRef<Set<string>>(new Set());
  
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Seed customer data from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(PAID_STORAGE_KEY);
    if (saved) {
      setPaidCustomers(JSON.parse(saved));
    } else {
      setPaidCustomers(initialPaidCustomers);
      localStorage.setItem(PAID_STORAGE_KEY, JSON.stringify(initialPaidCustomers));
    }
  }, []);

  // Initialize highlighted IDs on mount (resets on refresh = demo behavior)
  useEffect(() => {
    const unseen = new Set(
      HIGHLIGHTED_IDS.filter((id) => !viewedPaidCustomerCards.has(id))
    );
    setHighlightedIds(unseen);
    publishBadgeCount(unseen.size);
  }, []);

  // IntersectionObserver: track which highlighted cards have been scrolled into view
  useEffect(() => {
    // Clean up previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
      observedElements.current.clear();
    }

    // Nothing to observe
    if (highlightedIds.size === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = (entry.target as HTMLElement).dataset.highlightedId;
          if (!id || !highlightedIds.has(id)) return;

          // Only process if >=70% visible and not already recorded
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

    // Observe only currently highlighted elements
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

  // Cleanup: runs when component unmounts (user navigates away)
  // This is where we "mark as read" and update the badge
  useEffect(() => {
    return () => {
      const idsSeen = Array.from(seenThisSession.current);
      if (idsSeen.length > 0) {
        // Persist to in-memory set (resets on refresh)
        idsSeen.forEach((id) => viewedPaidCustomerCards.add(id));
        
        // Calculate remaining unseen highlighted IDs
        const remaining = new Set(
          HIGHLIGHTED_IDS.filter((id) => !viewedPaidCustomerCards.has(id))
        );
        
        // Update badge count for next visit
        publishBadgeCount(remaining.size);
        
        // Optional: update local state if component is still mounted
        // (not strictly necessary since we're navigating away)
        setHighlightedIds(remaining);
      }
    };
  }, []);

  // Persist customer data changes to localStorage
  useEffect(() => {
    if (paidCustomers.length > 0) {
      localStorage.setItem(PAID_STORAGE_KEY, JSON.stringify(paidCustomers));
    }
  }, [paidCustomers]);

  if (!user) return null;

  const canAccess =
    user.role === 'marketing_lead' ||
    user.role === 'ceo' ||
    user.role === 'general_manager' ||
    user.role === 'system_administrator';

  if (!canAccess) {
    return (
      <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
        <p className="text-gray-500">
          Access denied. Marketing Lead or System Administrator access required.
        </p>
      </div>
    );
  }

  // Stable sort: highlighted first, then by createdAt descending
  const sortedCustomers = [...paidCustomers].sort((a, b) => {
    const aHL = highlightedIds.has(a.id) ? 1 : 0;
    const bHL = highlightedIds.has(b.id) ? 1 : 0;
    if (bHL !== aHL) return bHL - aHL;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-col lg:flex-row">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Paid Customers</h2>
          <p className="text-gray-600 mt-1">
            All customer records that have been transferred after payment confirmation.
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

      <div className="grid grid-cols-1 gap-4">
        {sortedCustomers.map((customer) => {
          const isHighlighted = highlightedIds.has(customer.id);

          return (
            <div
              key={customer.id}
              data-highlighted-id={isHighlighted ? customer.id : undefined}
              className={[
                'bg-white rounded-xl p-5 shadow-sm transition-all duration-300',
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

              <div className="flex items-start justify-between gap-4 flex-col sm:flex-row">
                <div>
                  <h3 className="font-semibold text-lg text-gray-900">
                    {customer.customerName}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {categoryLabels[customer.category]}
                    {'otherCategoryDescription' in customer &&
                    customer.otherCategoryDescription
                      ? ` (${customer.otherCategoryDescription})`
                      : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="text-sm text-gray-500 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Transferred:{' '}
                    {new Date(customer.transferredAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                <p className="text-xs font-medium text-blue-700 uppercase tracking-wide mb-1">
                  Task Description
                </p>
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
                <span className="text-xs uppercase tracking-wide text-gray-400">
                  Preferred start:{' '}
                  {customer.preferredStartDate
                    ? new Date(customer.preferredStartDate).toLocaleDateString()
                    : 'N/A'}
                </span>
              </div>
            </div>
          );
        })}

        {paidCustomers.length === 0 && (
          <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
            <p className="text-gray-500">No paid customer records yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}