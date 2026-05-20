import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { PaidCustomer, CustomerRequestCategory } from '../types';
import { Calendar, CircleDollarSign, Mail, MapPin, Phone, User, ClipboardList, Plus, X, AlertCircle } from 'lucide-react';

const STORAGE_KEY = 'paid-customers';
const DC_TASKS_KEY = 'data-collector-tasks';
const USERS_KEY = 'users';
const CREATE_TASK_ROLES = new Set(['ceo', 'general_manager', 'system_administrator']);

const categoryLabels: Record<CustomerRequestCategory, string> = {
  home_design: 'Home Design', finishing_work: 'Finishing Work',
  hair_salon_design: "Women's Hair Salon Design", other: 'Other',
};

const MOCK_COLLECTORS = [
  { id: 'dc-1', name: 'Liam Carter',   role: 'data_collector', active: true },
  { id: 'dc-2', name: 'Amira Youssef', role: 'data_collector', active: true },
  { id: 'dc-3', name: 'James Okafor',  role: 'data_collector', active: true },
  { id: 'dc-4', name: 'Sofia Mendez',  role: 'data_collector', active: true },
  { id: 'dc-5', name: 'Chen Wei',      role: 'data_collector', active: true },
];

interface DataCollectorTask {
  id: string; paidCustomerId: string; taskStatement: string;
  assignedTo: string; assignedToName: string; deadline: string;
  status: string; createdAt: string; createdBy: string; createdByName: string;
}
interface DCUser { id: string; name: string; role: string; active?: boolean; }

const initialPaidCustomers: PaidCustomer[] = [
  {
    id: 'paid-1', sourceRequestId: 'cr-1', customerName: 'Nadia Hassan',
    customerPhone: '+971 50 123 4567', customerEmail: 'nadia@example.com',
    customerAddress: 'Dubai Marina, Dubai', category: 'home_design',
    serviceDescription: 'Modern home concept package with living room, kitchen, and bedroom layout planning.',
    preferredStartDate: '2026-04-28', budget: 'AED 180,000', status: 'closed',
    createdAt: '2026-04-10T09:20:00Z', createdBy: '1', createdByName: 'Sarah Johnson',
    transferredAt: '2026-04-16T11:30:00Z', transferredBy: '8', transferredByName: 'Admin User',
  },
  {
    id: 'paid-2', sourceRequestId: 'cr-2', customerName: 'Mona Al Rashid',
    customerPhone: '+971 55 888 1122', customerEmail: 'mona@example.com',
    customerAddress: 'Abu Dhabi Corniche, Abu Dhabi', category: 'hair_salon_design',
    serviceDescription: "Women's hair salon interior design with reception, styling stations, and waiting area.",
    preferredStartDate: '2026-05-05', budget: 'AED 95,000', status: 'closed',
    createdAt: '2026-04-14T13:45:00Z', createdBy: '8', createdByName: 'Admin User',
    transferredAt: '2026-04-18T15:10:00Z', transferredBy: '1', transferredByName: 'Sarah Johnson',
  },
];

const seedTasks: DataCollectorTask[] = [
  {
    id: 'dct-seed-1', paidCustomerId: 'paid-1',
    taskStatement: 'Collect site measurements and client preferences.',
    assignedTo: 'dc-2', assignedToName: 'Amira Youssef', deadline: '2026-05-30',
    status: 'in_progress', createdAt: '2026-04-17T08:00:00Z', createdBy: '8', createdByName: 'Admin User',
  },
];

function CreateTaskModal({ customer, dataCollectors, currentUser, onClose, onSave }:
  { customer: PaidCustomer; dataCollectors: DCUser[]; currentUser: { id: string; name: string }; onClose: () => void; onSave: (t: DataCollectorTask) => void }) {
  const [taskStatement, setTaskStatement] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [deadline, setDeadline] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const today = new Date().toISOString().split('T')[0];

  function handleSubmit() {
    const e: Record<string, string> = {};
    if (!taskStatement.trim()) e.taskStatement = 'Task statement cannot be empty.';
    if (!assignedTo) e.assignedTo = 'Please select a Data Collector.';
    if (!deadline) e.deadline = 'Deadline is required.';
    if (Object.keys(e).length) { setErrors(e); return; }
    const collector = dataCollectors.find((dc) => dc.id === assignedTo)!;
    onSave({ id: `dct-${Date.now()}`, paidCustomerId: customer.id, taskStatement: taskStatement.trim(),
      assignedTo: collector.id, assignedToName: collector.name, deadline, status: 'pending',
      createdAt: new Date().toISOString(), createdBy: currentUser.id, createdByName: currentUser.name });
  }

  const err = (key: string) => errors[key] && (
    <p className="mt-1 text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors[key]}</p>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div><h3 className="text-lg font-semibold text-gray-900">Create Data Collector Task</h3>
            <p className="text-sm text-gray-500 mt-0.5">For: {customer.customerName}</p></div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Task Statement <span className="text-red-500">*</span></label>
            <textarea rows={3} value={taskStatement} onChange={(e) => { setTaskStatement(e.target.value); setErrors(p => ({ ...p, taskStatement: '' })); }}
              placeholder="Describe what the data collector needs to do..."
              className={`w-full px-3 py-2.5 rounded-lg border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.taskStatement ? 'border-red-400 bg-red-50' : 'border-gray-300'}`} />
            {err('taskStatement')}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Assign to Data Collector <span className="text-red-500">*</span></label>
            <select value={assignedTo} onChange={(e) => { setAssignedTo(e.target.value); setErrors(p => ({ ...p, assignedTo: '' })); }}
              className={`w-full px-3 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${errors.assignedTo ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}>
              <option value="">Select a data collector...</option>
              {dataCollectors.map((dc) => <option key={dc.id} value={dc.id}>{dc.name}</option>)}
            </select>
            {err('assignedTo')}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Deadline <span className="text-red-500">*</span></label>
            <input type="date" min={today} value={deadline} onChange={(e) => { setDeadline(e.target.value); setErrors(p => ({ ...p, deadline: '' })); }}
              className={`w-full px-3 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.deadline ? 'border-red-400 bg-red-50' : 'border-gray-300'}`} />
            {err('deadline')}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200">Cancel</button>
          <button onClick={handleSubmit} className="px-5 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-2">
            <Plus className="w-4 h-4" />Create Task
          </button>
        </div>
      </div>
    </div>
  );
}

export function PaidCustomers() {
  const { user } = useAuth();
  const [paidCustomers, setPaidCustomers] = useState<PaidCustomer[]>([]);
  const [dcTasks, setDcTasks] = useState<DataCollectorTask[]>([]);
  const [dataCollectors, setDataCollectors] = useState<DCUser[]>([]);
  const [modalCustomer, setModalCustomer] = useState<PaidCustomer | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    let parsed: PaidCustomer[] | null = null;
    try { const r = JSON.parse(saved || ''); if (Array.isArray(r)) parsed = r; } catch {}
    if (parsed?.length) {
      const ids = new Set(parsed.map((c) => c.id));
      const merged = [...initialPaidCustomers.filter((c) => !ids.has(c.id)), ...parsed];
      setPaidCustomers(merged); localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } else {
      setPaidCustomers(initialPaidCustomers); localStorage.setItem(STORAGE_KEY, JSON.stringify(initialPaidCustomers));
    }

    let tasks: DataCollectorTask[] = [];
    try { const r = JSON.parse(localStorage.getItem(DC_TASKS_KEY) || ''); if (Array.isArray(r) && r.length) tasks = r; } catch {}
    if (!tasks.length) { tasks = seedTasks; localStorage.setItem(DC_TASKS_KEY, JSON.stringify(tasks)); }
    setDcTasks(tasks);

    let savedDCs: DCUser[] = [];
    try { const r: DCUser[] = JSON.parse(localStorage.getItem(USERS_KEY) || '');
      if (Array.isArray(r)) savedDCs = r.filter((u) => u.role === 'data_collector' && u.active !== false);
    } catch {}
    const allIds = new Set(savedDCs.map((u) => u.id));
    setDataCollectors([...MOCK_COLLECTORS.filter((m) => !allIds.has(m.id)), ...savedDCs]);
  }, []);

  function handleCreateTask(task: DataCollectorTask) {
    const updated = [...dcTasks, task];
    setDcTasks(updated); localStorage.setItem(DC_TASKS_KEY, JSON.stringify(updated)); setModalCustomer(null);
  }

  if (!user) return null;
  if (!['general_manager', 'marketing_lead', 'system_administrator', 'ceo'].includes(user.role))
    return <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center"><p className="text-gray-500">Access denied.</p></div>;

  const canCreateTask = CREATE_TASK_ROLES.has(user.role);
  const isMarketing = user.role === 'marketing_lead'; // Hide all task-related UI for Marketing Lead

  return (
    <>
      {canCreateTask && modalCustomer && <CreateTaskModal customer={modalCustomer} dataCollectors={dataCollectors}
        currentUser={{ id: user.id, name: user.name }} onClose={() => setModalCustomer(null)} onSave={handleCreateTask} />}
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-col lg:flex-row">
          <div><h2 className="text-2xl font-bold text-gray-900">Paid Customers</h2>
            <p className="text-gray-600 mt-1">Customer requests transferred after payment confirmation.</p></div>
          <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 shadow-sm min-w-[220px]">
            <div className="flex items-center gap-3"><CircleDollarSign className="w-5 h-5 text-green-600" />
              <div><p className="text-sm text-gray-500">Viewing as</p><p className="font-medium text-gray-900">{user.name}</p></div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {paidCustomers.map((customer) => {
            const linkedTask = dcTasks.find((t) => t.paidCustomerId === customer.id);
            return (
              <div key={customer.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
                <div className="flex items-start justify-between gap-4 flex-col sm:flex-row">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-lg text-gray-900">{customer.customerName}</h3>
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Paid</span>
                      {/* Hide task badge for Marketing Lead */}
                      {!isMarketing && linkedTask && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 flex items-center gap-1">
                          <ClipboardList className="w-3 h-3" />Task Assigned
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{categoryLabels[customer.category] ?? customer.category}</p>
                  </div>
                  <div className="text-sm text-gray-500 flex items-center gap-2"><Calendar className="w-4 h-4" />
                    {new Date(customer.transferredAt ?? customer.createdAt).toLocaleString()}
                  </div>
                </div>
                <p className="text-gray-700 mt-4">{customer.serviceDescription}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5 text-sm text-gray-600">
                  <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" /><span>{customer.customerPhone || '—'}</span></div>
                  {customer.customerEmail && <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-gray-400" /><span>{customer.customerEmail}</span></div>}
                  <div className="flex items-center gap-2 md:col-span-2"><MapPin className="w-4 h-4 text-gray-400" /><span>{customer.customerAddress || '—'}</span></div>
                  {customer.preferredStartDate && <div className="flex items-center gap-2"><span className="font-medium text-gray-900">Preferred Start:</span><span>{new Date(customer.preferredStartDate).toLocaleDateString()}</span></div>}
                  {customer.budget && <div className="flex items-center gap-2"><span className="font-medium text-gray-900">Budget:</span><span>{customer.budget}</span></div>}
                </div>
                <div className="mt-5 pt-4 border-t border-gray-200 text-sm text-gray-500 flex items-center gap-2">
                  <User className="w-4 h-4" /><span>Transferred by <span className="font-medium text-gray-700">{customer.transferredByName || '—'}</span></span>
                </div>

                {/* Entire task section hidden for Marketing Lead */}
                {!isMarketing && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    {linkedTask ? (
                      <div className="flex items-center gap-3 p-4 bg-purple-50 border border-purple-200 rounded-xl">
                        <ClipboardList className="w-5 h-5 text-purple-600 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-purple-900">Assigned Data Collector</p>
                          <p className="text-sm font-medium text-purple-800">{linkedTask.assignedToName}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3 p-3 bg-gray-50 border border-dashed border-gray-300 rounded-xl">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <ClipboardList className="w-4 h-4 text-gray-400" />
                          <span>No data collector task assigned yet.</span>
                        </div>
                        {canCreateTask ? (
                          <button onClick={() => setModalCustomer(customer)} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm whitespace-nowrap">
                            <Plus className="w-4 h-4" />Create Task
                          </button>
                        ) : (
                          <span className="text-xs font-medium text-gray-400 whitespace-nowrap">Create task disabled for your role</span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {paidCustomers.length === 0 && (
            <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
              <p className="text-gray-500">No paid customers have been recorded yet.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}