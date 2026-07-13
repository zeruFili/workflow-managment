import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import ceoTransferApi, { CeoTransferItem, CeoTransferListMeta } from '../../api/ceoTransferApi';
import userApi, { UserItem } from '../../api/userApi';
import {
  ArrowLeft, Calendar, Clock, Edit, Plus, Send, Trash2, Upload, User, X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AttachmentViewer from '../components/AttachmentViewer';
import { PaginationWithNumbers } from '../components/ui/PaginationWithNumbers';

const ROWS_PER_PAGE = 10;
let cachedTransfers: CeoTransferItem[] | null = null;
let cachedMeta: CeoTransferListMeta | null = null;

export function CeoTransfers() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [transfers, setTransfers] = useState<CeoTransferItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [meta, setMeta] = useState<CeoTransferListMeta | null>(null);
  const [page, setPage] = useState(1);

  const [selectedTransfer, setSelectedTransfer] = useState<CeoTransferItem | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ ceo_user_id: '', description: '', amount: '' });
  const [formFiles, setFormFiles] = useState<File[]>([]);
  const [formPreviewUrl, setFormPreviewUrl] = useState<string | null>(null);
  const formObjUrlsRef = useRef<string[]>([]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ceoUsers, setCeoUsers] = useState<UserItem[]>([]);
  const [ceoUsersError, setCeoUsersError] = useState('');

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const canManage = user?.role === 'ceo' || user?.role === 'finance_officer';

  const fetchTransfers = useCallback(async (p: number) => {
    if (!user) return;
    setIsLoading(true);
    try {
      const response = await ceoTransferApi.getCeoTransfers({ page: p, limit: ROWS_PER_PAGE });
      if (response.success) {
        setTransfers(response.data);
        setMeta(response.meta);
        cachedTransfers = response.data;
        cachedMeta = response.meta;
      }
    } catch { /* silent */ }
    finally { setIsLoading(false); }
  }, [user]);

  useEffect(() => { fetchTransfers(page); }, [page, fetchTransfers]);

  const fetchCeoUsers = async () => {
    setCeoUsersError('');
    try {
      const res = await userApi.getUsers({ role: 'ceo', is_active: true, limit: 100 });
      if (res.success) setCeoUsers(res.data);
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { status?: number; data?: { message?: string } } }).response?.data?.message
        : undefined;
      setCeoUsersError(msg || 'Unable to load CEO users. Check your connection.');
    }
  };

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await ceoTransferApi.getCeoTransferById(id);
      if (res.success) { setSelectedTransfer(res.data); setShowDetail(true); }
    } catch { /* silent */ }
    finally { setDetailLoading(false); }
  };

  const closeDetail = () => { setSelectedTransfer(null); setShowDetail(false); };

  const openCreate = () => {
    fetchCeoUsers();
    setEditingId(null);
    setFormData({ ceo_user_id: '', description: '', amount: '' });
    setFormFiles([]);
    setFormPreviewUrl(null);
    formObjUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    formObjUrlsRef.current = [];
    setFormErrors({});
    setFormError('');
    setFormSuccess('');
    setCeoUsersError('');
    setShowForm(true);
  };

  const openEdit = (t: CeoTransferItem) => {
    fetchCeoUsers();
    setEditingId(t.id);
    setFormData({ ceo_user_id: t.ceo_user_id, description: t.description, amount: String(t.amount) });
    setFormFiles([]);
    setFormPreviewUrl(null);
    formObjUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    formObjUrlsRef.current = [];
    setFormErrors({});
    setFormError('');
    setFormSuccess('');
    setCeoUsersError('');
    setShowForm(true);
  };

  const closeForm = () => {
    formObjUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    formObjUrlsRef.current = [];
    setShowForm(false);
    setEditingId(null);
    setFormErrors({});
    setCeoUsersError('');
  };

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    formObjUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    formObjUrlsRef.current = [];
    const fl = e.target.files;
    if (!fl || fl.length === 0) { setFormFiles([]); setFormPreviewUrl(null); return; }
    const list = Array.from(fl);
    setFormFiles(list);
    const preview = URL.createObjectURL(list[0]);
    formObjUrlsRef.current = [preview];
    setFormPreviewUrl(preview);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ceo = formData.ceo_user_id.trim();
    const desc = formData.description.trim();
    const amt = formData.amount.trim();
    const errs: Record<string, string> = {};
    if (!ceo) errs.ceo_user_id = 'CEO user is required.';
    if (!desc) errs.description = 'Description is required.';
    if (!amt) errs.amount = 'Amount is required.';
    else if (isNaN(Number(amt)) || Number(amt) <= 0) errs.amount = 'Amount must be a positive number.';
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setIsSubmitting(true);
    setFormError('');
    setFormSuccess('');
    try {
      const fd = new FormData();
      fd.append('ceo_user_id', ceo);
      fd.append('description', desc);
      fd.append('amount', amt);
      if (!editingId) fd.append('finance_user_id', user?.id || '');
      for (const f of formFiles) fd.append('attachmentFiles', f);

      const response = editingId
        ? await ceoTransferApi.updateCeoTransfer(editingId, fd)
        : await ceoTransferApi.createCeoTransfer(fd);

      if (response.success) {
        setFormSuccess(editingId ? 'CEO transfer updated.' : 'CEO transfer created.');
        cachedTransfers = null; cachedMeta = null;
        setTimeout(() => { closeForm(); fetchTransfers(page); }, 1200);
      } else setFormError(response.message || 'Failed.');
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message : undefined;
      setFormError(msg || 'Unable to connect.');
    } finally { setIsSubmitting(false); }
  };

  const openDeleteConfirm = (id: string) => {
    setDeletingId(id);
    setDeleteError('');
    setShowDeleteConfirm(true);
  };

  const closeDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    setDeletingId(null);
    setDeleteError('');
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    setDeleteError('');
    try {
      const response = await ceoTransferApi.deleteCeoTransfer(deletingId);
      if (response.success) {
        cachedTransfers = null; cachedMeta = null;
        setShowDeleteConfirm(false);
        setDeletingId(null);
        if (selectedTransfer && selectedTransfer.id === deletingId) {
          setSelectedTransfer(null);
          setShowDetail(false);
        }
        fetchTransfers(page);
      } else setDeleteError(response.message || 'Failed to delete.');
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message : undefined;
      setDeleteError(msg || 'Unable to connect.');
    } finally { setIsDeleting(false); }
  };

  if (!user) return null;
  if (!canManage) return <div className="bg-white rounded-xl p-12 shadow-sm border text-center"><p className="text-gray-500">Access denied.</p></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-col md:flex-row">
        <div>
          <button onClick={() => navigate('/dashboard')} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-2">
            <ArrowLeft className="h-4 w-4" />Back to Dashboard
          </button>
          <h2 className="text-2xl font-bold text-gray-900">CEO Transfers</h2>
          <p className="text-gray-600 mt-1">Manage CEO transfer records.</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 shrink-0">
          <Plus className="h-4 w-4" />Add Transfer
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>
      ) : transfers.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border text-center">
          <p className="text-gray-500">No CEO transfers yet.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {transfers.map((t) => (
              <div key={t.id} onClick={() => openDetail(t.id)} className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all">
                <div className="flex items-start justify-between mb-3 gap-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{t.description.length > 50 ? t.description.slice(0, 50) + '...' : t.description}</h3>
                    <p className="text-xs text-gray-500 mt-1">CEO: {t.ceo_user?.full_name || 'Unknown'}</p>
                  </div>
                  <span className="text-lg font-bold text-emerald-700 whitespace-nowrap">${Number(t.amount).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{new Date(t.created_at).toLocaleDateString()}</span>
                  <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" />By {t.finance_user?.full_name || 'Unknown'}</span>
                </div>
              </div>
            ))}
          </div>
          <PaginationWithNumbers
            currentPage={page}
            totalPages={meta.totalPages}
            totalItems={meta.total}
            onPageChange={(p) => {
              cachedTransfers = null;
              cachedMeta = null;
              setPage(p);
            }}
          />
        </>
      )}

      {showDetail && selectedTransfer && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 py-6 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 border-b px-6 py-5">
              <div><h3 className="text-xl font-semibold">CEO Transfer Detail</h3><p className="mt-1 text-sm text-gray-500">ID: {selectedTransfer.id}</p></div>
              <button onClick={closeDetail} className="rounded-lg p-2 hover:bg-gray-100"><X className="h-5 w-5 text-gray-500" /></button>
            </div>
            <div className="px-6 py-5 space-y-5">
              <section className="rounded-xl border p-4"><h5 className="text-sm font-medium uppercase text-gray-500 mb-3">Description</h5><p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedTransfer.description}</p></section>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <section className="rounded-xl border p-4"><h5 className="text-sm font-medium uppercase text-gray-500 mb-2">Amount</h5><p className="text-2xl font-bold text-emerald-700">${Number(selectedTransfer.amount).toLocaleString()}</p></section>
                <section className="rounded-xl border p-4"><h5 className="text-sm font-medium uppercase text-gray-500 mb-2">Timeline</h5><p className="text-sm text-gray-700 flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-gray-400" />{new Date(selectedTransfer.created_at).toLocaleString()}</p>{selectedTransfer.updated_at && <p className="text-sm text-gray-700 flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-gray-400" />{new Date(selectedTransfer.updated_at).toLocaleString()}</p>}</section>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <section className="rounded-xl border p-4"><h5 className="text-sm font-medium uppercase text-gray-500 mb-2">CEO</h5><p className="text-sm font-medium">{selectedTransfer.ceo_user?.full_name || 'Unknown'}</p></section>
                <section className="rounded-xl border p-4"><h5 className="text-sm font-medium uppercase text-gray-500 mb-2">Created By</h5><p className="text-sm font-medium">{selectedTransfer.finance_user?.full_name || 'Unknown'}</p></section>
              </div>
              {selectedTransfer.attachment_urls && selectedTransfer.attachment_urls.length > 0 && (
                <section className="rounded-xl border p-4"><h5 className="text-sm font-medium uppercase text-gray-500 mb-3">Attachments</h5><AttachmentViewer attachments={selectedTransfer.attachment_urls} /></section>
              )}
              {selectedTransfer.finance_user_id === user?.id && (
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => openDeleteConfirm(selectedTransfer.id)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm"><Trash2 className="h-4 w-4" />Delete</button>
                <button onClick={() => { closeDetail(); openEdit(selectedTransfer); }} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm"><Edit className="h-4 w-4" />Edit</button>
              </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">{editingId ? 'Edit' : 'Create'} CEO Transfer</h3>
              <button onClick={closeForm} disabled={isSubmitting} className="p-2 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">CEO User <span className="text-red-500">*</span></label>
                <select value={formData.ceo_user_id} onChange={(e) => { setFormData({ ...formData, ceo_user_id: e.target.value }); if (formErrors.ceo_user_id) setFormErrors(p => { const n = { ...p }; delete n.ceo_user_id; return n; }); }} className={`w-full rounded-xl border px-4 py-2.5 text-sm ${formErrors.ceo_user_id ? 'border-red-400 bg-red-50' : 'border-slate-300'}`} disabled={isSubmitting}>
                  <option value="">Select a CEO...</option>
                  {ceoUsers.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                </select>
                {formErrors.ceo_user_id && <p className="text-xs text-red-600 mt-1">{formErrors.ceo_user_id}</p>}
                {ceoUsersError && <p className="text-xs text-red-600 mt-1">{ceoUsersError}</p>}
                {!ceoUsersError && ceoUsers.length === 0 && !isSubmitting && <p className="text-xs text-amber-600 mt-1">No CEO users found. Make sure the backend is running.</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Description <span className="text-red-500">*</span></label>
                <textarea rows={3} value={formData.description} onChange={(e) => { setFormData({ ...formData, description: e.target.value }); if (formErrors.description) setFormErrors(p => { const n = { ...p }; delete n.description; return n; }); }} className={`w-full rounded-xl border px-4 py-2.5 text-sm ${formErrors.description ? 'border-red-400 bg-red-50' : 'border-slate-300'}`} disabled={isSubmitting} />
                {formErrors.description && <p className="text-xs text-red-600 mt-1">{formErrors.description}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Amount ($) <span className="text-red-500">*</span></label>
                <input type="number" value={formData.amount} onChange={(e) => { setFormData({ ...formData, amount: e.target.value }); if (formErrors.amount) setFormErrors(p => { const n = { ...p }; delete n.amount; return n; }); }} className={`w-full rounded-xl border px-4 py-2.5 text-sm ${formErrors.amount ? 'border-red-400 bg-red-50' : 'border-slate-300'}`} disabled={isSubmitting} min="0" step="0.01" />
                {formErrors.amount && <p className="text-xs text-red-600 mt-1">{formErrors.amount}</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Attachments <span className="text-gray-400 text-xs ml-1">(optional)</span></label>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg cursor-pointer hover:bg-gray-50 text-sm">
                    <Upload className="w-4 h-4" />{formFiles.length ? `${formFiles.length} file(s)` : 'Choose Files'}
                    <input type="file" multiple accept="image/*,.pdf,.doc,.docx" onChange={handleFilesChange} className="hidden" disabled={isSubmitting} />
                  </label>
                  {(formFiles.length > 0 || formPreviewUrl) && <button type="button" onClick={() => { formObjUrlsRef.current.forEach(u => URL.revokeObjectURL(u)); formObjUrlsRef.current = []; setFormFiles([]); setFormPreviewUrl(null); }} className="text-sm text-red-600 hover:underline" disabled={isSubmitting}>Remove</button>}
                </div>
                {formPreviewUrl && <img src={formPreviewUrl} alt="preview" className="mt-3 max-h-48 rounded-lg border object-contain" />}
              </div>
              {formError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>}
              {formSuccess && <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{formSuccess}</p>}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closeForm} disabled={isSubmitting} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-blue-300">
                  {isSubmitting ? 'Saving...' : <><Send className="h-4 w-4" />{editingId ? 'Update' : 'Create'}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-5">
              <h3 className="text-lg font-semibold text-gray-900">Delete CEO Transfer</h3>
              <p className="mt-2 text-sm text-gray-600">Are you sure you want to delete this transfer? This action cannot be undone.</p>
              {deleteError && <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{deleteError}</p>}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t">
              <button onClick={closeDeleteConfirm} disabled={isDeleting} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200">Cancel</button>
              <button onClick={handleDelete} disabled={isDeleting} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:bg-red-300">
                {isDeleting ? 'Deleting...' : <><Trash2 className="h-4 w-4" />Delete</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CeoTransfers;
