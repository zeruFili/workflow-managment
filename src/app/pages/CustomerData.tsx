import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import marketingApi, {
  MarketingTaskItem,
  MarketingSubmissionWrapper,
  MarketingSubmissionRaw,
  MarketingReviewRaw,
} from '../../api/marketingApi';
import { fetchMarketingTasks, getCachedMarketingTasks, invalidateMarketingTaskCache } from '../data/marketingTaskCache';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Edit,
  Mail,
  MapPin,
  Phone,
  Plus,
  Trash2,
  Users,
  X,
  Send,
  Upload,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Paperclip,
  FileText,
  Clock,
  DollarSign,
  User,
  Tag,
} from 'lucide-react';
import AttachmentViewer from '../components/AttachmentViewer';

export function CustomerData() {
  const { user } = useAuth();

  const [marketingTasks, setMarketingTasks] = useState<MarketingTaskItem[]>(() => getCachedMarketingTasks() ?? []);
  const [marketingTasksLoading, setMarketingTasksLoading] = useState(() => !getCachedMarketingTasks());

  // ── Create Marketing Task modal ──
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

  // ── Submission modal ──
  const [submittingTaskId, setSubmittingTaskId] = useState<string | null>(null);
  const [submissionDescription, setSubmissionDescription] = useState('');
  const [submissionFiles, setSubmissionFiles] = useState<File[]>([]);
  const [submissionPreviewUrl, setSubmissionPreviewUrl] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState('');
  const [submissionSuccess, setSubmissionSuccess] = useState('');
  const [submissionFieldError, setSubmissionFieldError] = useState('');
  const [isSubmittingToTask, setIsSubmittingToTask] = useState(false);
  const submissionObjUrlsRef = useRef<string[]>([]);

  // ── Edit / Delete state ──
  const [editingTask, setEditingTask] = useState<MarketingTaskItem | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    title: '', description: '', customer_name: '', customer_phone: '',
    customer_email: '', customer_address: '', category: 'home_design',
    service_description: '', preferred_start_date: '', budget: '', notes: '',
  });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Submission detail modal ──
  const [selectedTask, setSelectedTask] = useState<MarketingTaskItem | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [expandedSubmissionId, setExpandedSubmissionId] = useState<string | null>(null);
  const [editingSubmissionId, setEditingSubmissionId] = useState<string | null>(null);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [reviewDraft, setReviewDraft] = useState<Record<string, string>>({});
  const [detailDraftNote, setDetailDraftNote] = useState<Record<string, string>>({});
  const [detailDraftScreenshots, setDetailDraftScreenshots] = useState<Record<string, string | null>>({});
  const detailDraftFilesRef = useRef<Record<string, File[]>>({});
  const [submissionDraftLoading, setSubmissionDraftLoading] = useState<Record<string, boolean>>({});
  const [submissionDetailError, setSubmissionDetailError] = useState<Record<string, string>>({});
  const [reviewDetailError, setReviewDetailError] = useState<Record<string, string>>({});

  function getSubmissionWrappers(task: MarketingTaskItem): MarketingSubmissionWrapper[] {
    return (task.submissionsWithReviews?.submissions || []).filter((w: any) => w.submission != null);
  }

  function statusColor(status: string | null): string {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-700';
      case 'rejected': return 'bg-red-100 text-red-700';
      case 'feedback': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  function statusDisplay(status: string | null): string {
    if (!status) return 'Pending';
    return status.replace('_', ' ');
  }

  useEffect(() => {
    if (!user || (user.role !== 'marketing_lead' && user.role !== 'ceo')) return;
    const cached = getCachedMarketingTasks();
    if (cached) {
      setMarketingTasks(cached);
      setMarketingTasksLoading(false);
      return;
    }
    setMarketingTasksLoading(true);
    fetchMarketingTasks().then((tasks) => {
      setMarketingTasks(tasks);
      setMarketingTasksLoading(false);
    });
  }, [user]);

  const refreshTasks = useCallback(async () => {
    invalidateMarketingTaskCache();
    try {
      const tasks = await fetchMarketingTasks();
      setMarketingTasks(tasks);
    } catch {
      // fetchMarketingTasks already resolves with a fallback; nothing to do here.
    }
  }, []);

  const marketingTasksNoSubmissions = marketingTasks.filter(
    (t) => (t.submissionsWithReviews?.submissions || []).length === 0
  );

  if (!user) return null;

  const canAccess = user.role === 'marketing_lead' || user.role === 'ceo';
  const canManage = user.role === 'marketing_lead' || user.role === 'ceo';
  const canReview = user?.role === 'ceo' || user?.role === 'finance_officer';

  const openDetail = (task: MarketingTaskItem) => {
    setSelectedTask(task);
    setDetailDraftNote((prev) => ({ ...prev, [task.id]: '' }));
    setDetailDraftScreenshots((prev) => ({ ...prev, [task.id]: null }));
    detailDraftFilesRef.current = { ...detailDraftFilesRef.current, [task.id]: [] };
    setExpandedSubmissionId(null);
    setEditingSubmissionId(null);
    setEditingReviewId(null);
    setShowDetail(true);
    setSubmissionDetailError((prev) => ({ ...prev, [task.id]: '' }));
    setReviewDetailError((prev) => ({ ...prev, [task.id]: '' }));
  };

  const closeDetail = () => {
    const taskId = selectedTask?.id;
    if (taskId && detailDraftScreenshots[taskId]) {
      const url = detailDraftScreenshots[taskId];
      if (url) URL.revokeObjectURL(url);
    }
    setSelectedTask(null);
    setShowDetail(false);
    setExpandedSubmissionId(null);
    setEditingSubmissionId(null);
    setEditingReviewId(null);
  };

  const openEdit = (task: MarketingTaskItem) => {
    setEditingTask(task);
    setEditFormData({
      title: task.title,
      description: task.description,
      customer_name: task.customer_name,
      customer_phone: task.customer_phone,
      customer_email: task.customer_email || '',
      customer_address: task.customer_address,
      category: task.category,
      service_description: task.service_description,
      preferred_start_date: task.preferred_start_date || '',
      budget: task.budget != null ? String(task.budget) : '',
      notes: task.notes || '',
    });
    setEditErrors({});
    setEditError('');
    setEditSuccess('');
    setShowEditModal(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    const errors: Record<string, string> = {};
    if (!editFormData.title.trim()) errors.title = 'Title is required.';
    if (!editFormData.customer_name.trim()) errors.customer_name = 'Customer name is required.';
    if (!editFormData.customer_phone.trim()) errors.customer_phone = 'Customer phone is required.';
    if (!editFormData.customer_address.trim()) errors.customer_address = 'Customer address is required.';
    setEditErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsUpdating(true);
    setEditError('');
    setEditSuccess('');
    try {
      const fd = new FormData();
      fd.append('title', editFormData.title.trim());
      if (editFormData.description.trim()) fd.append('description', editFormData.description.trim());
      fd.append('customer_name', editFormData.customer_name.trim());
      fd.append('customer_phone', editFormData.customer_phone.trim());
      if (editFormData.customer_email.trim()) fd.append('customer_email', editFormData.customer_email.trim());
      fd.append('customer_address', editFormData.customer_address.trim());
      fd.append('category', editFormData.category);
      if (editFormData.service_description.trim()) fd.append('service_description', editFormData.service_description.trim());
      if (editFormData.preferred_start_date) fd.append('preferred_start_date', editFormData.preferred_start_date);
      if (editFormData.budget) fd.append('budget', String(Number(editFormData.budget)));
      if (editFormData.notes.trim()) fd.append('notes', editFormData.notes.trim());

      const response = await marketingApi.updateMarketingTask(editingTask.id, fd);
      if (response.success) {
        setEditSuccess('Task updated successfully.');
        setTimeout(() => { setShowEditModal(false); setEditingTask(null); refreshTasks(); }, 800);
      } else {
        setEditError(response.message || 'Failed to update task.');
      }
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined;
      setEditError(msg || 'Unable to update.');
    } finally { setIsUpdating(false); }
  };

  const confirmDelete = (taskId: string) => {
    setDeletingTaskId(taskId);
    setDeleteError('');
  };

  const handleDelete = async () => {
    if (!deletingTaskId) return;
    setIsDeleting(true);
    setDeleteError('');
    try {
      const response = await marketingApi.deleteMarketingTask(deletingTaskId);
      if (response.success) {
        setDeletingTaskId(null);
        refreshTasks();
      } else {
        setDeleteError(response.message || 'Failed to delete.');
      }
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined;
      setDeleteError(msg || 'Unable to delete.');
    } finally { setIsDeleting(false); }
  };

  const handleDetailFilesChange = (taskId: string, fileList: FileList | null) => {
    const oldUrl = detailDraftScreenshots[taskId] ?? null;
    if (oldUrl) URL.revokeObjectURL(oldUrl);
    if (!fileList || fileList.length === 0) {
      setDetailDraftScreenshots((prev) => ({ ...prev, [taskId]: null }));
      detailDraftFilesRef.current = { ...detailDraftFilesRef.current, [taskId]: [] };
      return;
    }
    const files = Array.from(fileList);
    detailDraftFilesRef.current = { ...detailDraftFilesRef.current, [taskId]: files };
    const objectUrl = URL.createObjectURL(files[0]);
    setDetailDraftScreenshots((prev) => ({ ...prev, [taskId]: objectUrl }));
  };

  const handleEditSubmission = (taskId: string, subId: string) => {
    if (!selectedTask) return;
    const wrapper = getSubmissionWrappers(selectedTask).find((w) => w.submission.id === subId);
    if (!wrapper) return;
    const sub = wrapper.submission;
    setEditingSubmissionId(subId);
    setDetailDraftNote((prev) => ({ ...prev, [taskId]: sub.description || '' }));
    setDetailDraftScreenshots((prev) => ({ ...prev, [taskId]: sub.attachment_urls?.[0] || null }));
    detailDraftFilesRef.current = { ...detailDraftFilesRef.current, [taskId]: [] };
    setExpandedSubmissionId(subId);
    setSubmissionDetailError((prev) => ({ ...prev, [taskId]: '' }));
  };

  const handleSubmitSubmission = async (taskId: string) => {
    const note = (detailDraftNote[taskId] ?? '').trim();
    if (!note) {
      setSubmissionDetailError((prev) => ({ ...prev, [taskId]: 'Submission description is required.' }));
      return;
    }
    const files = detailDraftFilesRef.current[taskId] ?? [];
    setSubmissionDraftLoading((prev) => ({ ...prev, [taskId]: true }));
    setSubmissionDetailError((prev) => ({ ...prev, [taskId]: '' }));
    const isEditing = editingSubmissionId !== null;
    try {
      const formData = new FormData();
      formData.append('description', note);
      for (const file of files) {
        formData.append('attachmentFiles', file);
      }
      const response = isEditing
        ? await marketingApi.updateSubmission(editingSubmissionId!, formData)
        : await marketingApi.createSubmission(taskId, formData);
      if (response.success && response.data) {
        setEditingSubmissionId(null);
        const oldUrl = detailDraftScreenshots[taskId] ?? null;
        if (oldUrl && oldUrl.startsWith('blob:')) URL.revokeObjectURL(oldUrl);
        setDetailDraftScreenshots((prev) => ({ ...prev, [taskId]: null }));
        setDetailDraftNote((prev) => ({ ...prev, [taskId]: '' }));
        detailDraftFilesRef.current = { ...detailDraftFilesRef.current, [taskId]: [] };

        const now = new Date().toISOString();
        if (isEditing) {
          const updatedSub = {
            ...response.data,
            reviews: (response.data as any).reviews || [],
          } as MarketingSubmissionRaw;
          const updatedTasks = marketingTasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  updated_at: now,
                  submissionsWithReviews: {
                    ...t.submissionsWithReviews,
                    submissions: (t.submissionsWithReviews?.submissions || []).map((w) =>
                      w.submission?.id === editingSubmissionId
                        ? { ...w, submission: updatedSub }
                        : w
                    ),
                    latestActivityTs: Date.now(),
                  },
                }
              : t
          );
          setMarketingTasks(updatedTasks);
          const updatedSelected = updatedTasks.find((t) => t.id === taskId);
          if (updatedSelected) setSelectedTask(updatedSelected);
        } else {
          const newSub = {
            ...response.data,
            reviews: (response.data as any).reviews || [],
          } as MarketingSubmissionRaw;
          const newWrapper: MarketingSubmissionWrapper = {
            submissionId: newSub.id,
            hasNotification: false,
            notificationId: null,
            submission: newSub,
          };
          const updatedTasks = marketingTasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  updated_at: now,
                  submissionsWithReviews: {
                    ...t.submissionsWithReviews,
                    submissions: [...(t.submissionsWithReviews?.submissions || []), newWrapper],
                    latestActivityTs: Date.now(),
                  },
                }
              : t
          );
          setMarketingTasks(updatedTasks);
          const updatedSelected = updatedTasks.find((t) => t.id === taskId);
          if (updatedSelected) setSelectedTask(updatedSelected);
        }
      } else {
        const msg = response.message || 'Submission failed.';
        setSubmissionDetailError((prev) => ({ ...prev, [taskId]: msg }));
      }
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined;
      setSubmissionDetailError((prev) => ({ ...prev, [taskId]: msg || 'Unable to submit.' }));
    } finally {
      setSubmissionDraftLoading((prev) => ({ ...prev, [taskId]: false }));
    }
  };

  const handleReviewSubmission = async (taskId: string, subId: string, outcome: string) => {
    const note = reviewDraft[taskId] ?? '';
    setReviewDetailError((prev) => ({ ...prev, [taskId]: '' }));
    let errorMsg: string | null = null;
    let responseData: MarketingReviewRaw | undefined;

    let effectiveReviewId = editingReviewId;
    if (effectiveReviewId && selectedTask) {
      const wrappers = getSubmissionWrappers(selectedTask);
      const targetWrapper = wrappers.find((w) => w.submission?.id === subId);
      const belongsToCurrentSubmission = (targetWrapper?.submission?.reviews || []).some((r) => r.id === effectiveReviewId);
      if (!belongsToCurrentSubmission) {
        effectiveReviewId = null;
        setEditingReviewId(null);
      }
    }

    try {
      const payload = {
        description: note.trim() || 'Review: ' + outcome,
        review_outcome: outcome,
      };
      if (effectiveReviewId) {
        const res = await marketingApi.updateReview(effectiveReviewId, payload);
        if (res.success) responseData = res.data;
        else errorMsg = res.message || 'Unable to update review. Please try again.';
      } else {
        const res = await marketingApi.createReview(subId, payload);
        if (res.success) responseData = res.data;
        else errorMsg = res.message || 'Unable to submit review. Please try again.';
      }
    } catch (err: unknown) {
      errorMsg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined;
    }
    if (errorMsg) {
      setReviewDetailError((prev) => ({ ...prev, [taskId]: errorMsg! }));
    } else if (responseData) {
      setEditingReviewId(null);
      setReviewDraft((prev) => ({ ...prev, [taskId]: '' }));

      const now = new Date().toISOString();
      if (effectiveReviewId) {
        const updatedTasks = marketingTasks.map((t) =>
          t.id === taskId
            ? {
                ...t,
                updated_at: now,
                submissionsWithReviews: {
                  ...t.submissionsWithReviews,
                  submissions: (t.submissionsWithReviews?.submissions || []).map((w) => {
                    const reviews = (w.submission?.reviews || []).map((r) =>
                      r.id === effectiveReviewId ? responseData! : r
                    );
                    return { ...w, submission: { ...w.submission, reviews } };
                  }),
                  latestActivityTs: Date.now(),
                },
              }
            : t
        );
        setMarketingTasks(updatedTasks);
        const updatedSelected = updatedTasks.find((t) => t.id === taskId);
        if (updatedSelected) setSelectedTask(updatedSelected);
      } else {
        const updatedTasks = marketingTasks.map((t) =>
          t.id === taskId
            ? {
                ...t,
                updated_at: now,
                submissionsWithReviews: {
                  ...t.submissionsWithReviews,
                  submissions: (t.submissionsWithReviews?.submissions || []).map((w) =>
                    w.submission?.id === subId
                      ? {
                          ...w,
                          submission: {
                            ...w.submission,
                            reviews: [...(w.submission?.reviews || []), responseData!],
                          },
                        }
                      : w
                  ),
                  latestActivityTs: Date.now(),
                },
              }
            : t
        );
        setMarketingTasks(updatedTasks);
        const updatedSelected = updatedTasks.find((t) => t.id === taskId);
        if (updatedSelected) setSelectedTask(updatedSelected);
      }
    }
  };

  if (!canAccess) {
    return (
      <div className="card-safe overflow-hidden min-w-0 bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
        <p className="text-gray-500">Access denied. Marketing Lead or CEO access required.</p>
      </div>
    );
  }

  const categoryLabels: Record<string, string> = {
    home_design: 'Home Design',
    finishing_work: 'Finishing Work',
    hair_salon_design: "Women's Hair Salon Design",
    other: 'Other',
  };

  const handleCreateMarketingTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!marketingForm.title.trim()) errors.title = 'Title is required.';
    if (!marketingForm.customer_name.trim()) errors.customer_name = 'Customer name is required.';
    if (!marketingForm.customer_phone.trim()) errors.customer_phone = 'Customer phone is required.';
    if (!marketingForm.customer_address.trim()) errors.customer_address = 'Customer address is required.';
    if (!marketingForm.description.trim() && !marketingForm.service_description.trim()) {
      errors.description = 'At least one of Description or Service Description is required.';
      errors.service_description = 'At least one of Description or Service Description is required.';
    }
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
        refreshTasks();
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

  const openSubmissionModal = (taskId: string) => {
    setSubmittingTaskId(taskId);
    setSubmissionDescription('');
    setSubmissionFiles([]);
    setSubmissionPreviewUrl(null);
    setSubmissionError('');
    setSubmissionSuccess('');
    setSubmissionFieldError('');
    submissionObjUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    submissionObjUrlsRef.current = [];
  };

  const closeSubmissionModal = () => {
    submissionObjUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    submissionObjUrlsRef.current = [];
    setSubmittingTaskId(null);
    setSubmissionDescription('');
    setSubmissionFiles([]);
    setSubmissionPreviewUrl(null);
    setSubmissionError('');
    setSubmissionSuccess('');
    setSubmissionFieldError('');
  };

  const handleSubmissionFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    submissionObjUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    submissionObjUrlsRef.current = [];
    const files = e.target.files;
    if (!files || files.length === 0) {
      setSubmissionFiles([]);
      setSubmissionPreviewUrl(null);
      return;
    }
    const fileList = Array.from(files);
    setSubmissionFiles(fileList);
    const previewUrl = URL.createObjectURL(fileList[0]);
    submissionObjUrlsRef.current = [previewUrl];
    setSubmissionPreviewUrl(previewUrl);
  };

  const handleSubmitToMarketingTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittingTaskId) return;

    const desc = submissionDescription.trim();
    if (!desc) {
      setSubmissionFieldError('Submission description is required.');
      return;
    }
    setSubmissionFieldError('');

    setIsSubmittingToTask(true);
    setSubmissionError('');
    setSubmissionSuccess('');

    try {
      const formData = new FormData();
      formData.append('description', desc);
      for (const file of submissionFiles) {
        formData.append('attachmentFiles', file);
      }

      const response = await marketingApi.createSubmission(submittingTaskId, formData);

      if (response.success) {
        setSubmissionSuccess('Customer payment request has been submitted successfully. The task has now been moved to the Paid Customers page.');
        setTimeout(() => {
          closeSubmissionModal();
          refreshTasks();
        }, 1500);
      } else {
        setSubmissionError(response.message || 'Failed to create submission. Please try again.');
      }
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined;
      setSubmissionError(msg || 'Unable to connect to server. Please try again.');
    } finally {
      setIsSubmittingToTask(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-col lg:flex-row">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Customer Requests</h2>
          <p className="text-gray-600 mt-1">Marketing tasks without submissions. Submit to move them to Paid Customers.</p>
        </div>
        <div className="flex items-center gap-4">
          {(user.role === 'marketing_lead' || user.role === 'ceo') && (
            <button
              onClick={() => { setShowCreateMarketingTask(true); setMarketingFormError(''); setMarketingFormSuccess(''); setMarketingFormErrors({}); }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Create Marketing Task</span>
            </button>
          )}
          <div className="card-safe overflow-hidden min-w-0 flex-1 bg-white rounded-xl border border-gray-200 px-4 py-3 shadow-sm min-w-0 sm:min-w-[220px]">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-500">Viewing as</p>
                <p className="font-medium text-gray-900">{user.full_name}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Marketing Tasks (no submissions) */}
      <div className="card-safe overflow-hidden min-w-0 bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        {marketingTasksLoading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        )}

        {!marketingTasksLoading && marketingTasksNoSubmissions.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-gray-500">No customer requests pending submission.</p>
            <p className="text-sm text-gray-400 mt-1">Create a Marketing Task to get started.</p>
          </div>
        )}

        {!marketingTasksLoading && marketingTasksNoSubmissions.length > 0 && (
          <div className="grid grid-cols-1 gap-4">
            {marketingTasksNoSubmissions.map((task) => (
              <div key={task.id} className="border border-gray-200 rounded-lg p-5 hover:border-blue-300 transition-colors">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900">{task.title}</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Customer: {task.customer_name} · {categoryLabels[task.category] || task.category}
                    </p>
                  </div>
                  {task.budget != null && (
                    <span className="text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full whitespace-nowrap">
                      AED {task.budget.toLocaleString()}
                    </span>
                  )}
                </div>

                <p className="text-sm text-gray-700 mb-4">{task.service_description}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" /><span>{task.customer_phone}</span></div>
                  {task.customer_email && (
                    <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-gray-400" /><span>{task.customer_email}</span></div>
                  )}
                  <div className="flex items-center gap-2 md:col-span-2"><MapPin className="w-4 h-4 text-gray-400" /><span>{task.customer_address}</span></div>
                </div>

                {task.notes && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-700">{task.notes}</div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{new Date(task.created_at).toLocaleDateString()}</span>
                    {task.preferred_start_date && (
                      <span className="flex items-center gap-1">Preferred: {new Date(task.preferred_start_date).toLocaleDateString()}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {canManage && task.marketing_user_id === user.id && (
                      <>
                        <button
                          onClick={() => openEdit(task)}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => confirmDelete(task.id)}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-red-200 text-sm text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => openDetail(task)}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-blue-300 text-sm text-blue-700 hover:bg-blue-50"
                    >
                      Open Submission Detail
                    </button>
                    <button
                      onClick={() => openSubmissionModal(task.id)}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Submit &amp; Move to Paid
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
                <textarea value={marketingForm.description} onChange={(e) => { setMarketingForm({ ...marketingForm, description: e.target.value }); if (marketingFormErrors.description) setMarketingFormErrors((prev) => { const n = { ...prev }; delete n.description; delete n.service_description; return n; }); }}
                  rows={3} className={`w-full px-4 py-2 border rounded-lg ${marketingFormErrors.description ? 'border-red-400 bg-red-50' : 'border-gray-300'} focus:ring-2 focus:ring-blue-500`} disabled={isCreatingMarketing}
                  placeholder="One of Description or Service Description is required" />
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
                <textarea value={marketingForm.service_description} onChange={(e) => { setMarketingForm({ ...marketingForm, service_description: e.target.value }); if (marketingFormErrors.service_description) setMarketingFormErrors((prev) => { const n = { ...prev }; delete n.service_description; delete n.description; return n; }); }}
                  rows={3} className={`w-full px-4 py-2 border rounded-lg ${marketingFormErrors.service_description ? 'border-red-400 bg-red-50' : 'border-gray-300'} focus:ring-2 focus:ring-blue-500`} disabled={isCreatingMarketing}
                  placeholder="One of Description or Service Description is required" />
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

      {/* Submission Modal */}
      {submittingTaskId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="card-safe overflow-hidden min-w-0 bg-white rounded-2xl w-full max-w-2xl shadow-xl border border-gray-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Submit &amp; Move to Paid Customers</h3>
                <p className="text-sm text-gray-500">Create a submission for this marketing task. The task will automatically move to the Paid Customers page.</p>
              </div>
              <button onClick={closeSubmissionModal} className="p-2 rounded-lg hover:bg-gray-100" disabled={isSubmittingToTask}>
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <form onSubmit={handleSubmitToMarketingTask} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Submission Description <span className="text-red-500">*</span></label>
                <textarea value={submissionDescription} onChange={(e) => { setSubmissionDescription(e.target.value); if (submissionFieldError) setSubmissionFieldError(''); }}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[100px] ${submissionFieldError ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                  placeholder="Describe the submission (e.g., payment confirmation details, reference number, or remarks)" disabled={isSubmittingToTask} />
                {submissionFieldError && <p className="text-xs text-red-600 mt-1">{submissionFieldError}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  File Attachments <span className="text-gray-400 text-xs ml-1">(optional - receipts, screenshots, etc.)</span>
                </label>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-sm text-gray-700">
                    <Upload className="w-4 h-4" />
                    {submissionFiles.length ? `${submissionFiles.length} file(s) selected` : 'Choose Files'}
                    <input type="file" multiple accept="image/*" onChange={handleSubmissionFilesChange} className="hidden" disabled={isSubmittingToTask} />
                  </label>
                  {submissionFiles.length > 0 && (
                    <button type="button" onClick={() => { submissionObjUrlsRef.current.forEach((url) => URL.revokeObjectURL(url)); submissionObjUrlsRef.current = []; setSubmissionFiles([]); setSubmissionPreviewUrl(null); }}
                      className="text-sm text-red-600 hover:underline" disabled={isSubmittingToTask}>Remove All</button>
                  )}
                </div>
                {submissionPreviewUrl && (
                  <img src={submissionPreviewUrl} alt="preview" className="mt-3 max-h-48 rounded-lg border object-contain" />
                )}
              </div>
              {submissionError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{submissionError}</p>}
              {submissionSuccess && <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{submissionSuccess}</p>}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={closeSubmissionModal} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50" disabled={isSubmittingToTask}>Cancel</button>
                <button type="submit" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white disabled:bg-green-400" disabled={isSubmittingToTask}>
                  {isSubmittingToTask ? 'Submitting...' : <><CheckCircle2 className="w-4 h-4" />Confirm Submission</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {showEditModal && editingTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Edit Marketing Task</h3>
              <button onClick={() => { setShowEditModal(false); setEditingTask(null); }} className="p-2 hover:bg-gray-100 rounded-lg" disabled={isUpdating}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form className="space-y-4" onSubmit={handleEdit}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title <span className="text-red-500">*</span></label>
                <input value={editFormData.title} onChange={(e) => { setEditFormData({ ...editFormData, title: e.target.value }); if (editErrors.title) setEditErrors((prev) => { const n = { ...prev }; delete n.title; return n; }); }}
                  className={`w-full px-4 py-2 border rounded-lg ${editErrors.title ? 'border-red-400 bg-red-50' : 'border-gray-300'}`} disabled={isUpdating} />
                {editErrors.title && <p className="text-xs text-red-600 mt-1">{editErrors.title}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea value={editFormData.description} onChange={(e) => { setEditFormData({ ...editFormData, description: e.target.value }); if (editErrors.description) setEditErrors((prev) => { const n = { ...prev }; delete n.description; delete n.service_description; return n; }); }}
                  rows={3} className={`w-full px-4 py-2 border rounded-lg ${editErrors.description ? 'border-red-400 bg-red-50' : 'border-gray-300'}`} disabled={isUpdating} placeholder="At least one of Description or Service Description is required" />
                {editErrors.description && <p className="text-xs text-red-600 mt-1">{editErrors.description}</p>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Customer Name <span className="text-red-500">*</span></label>
                  <input value={editFormData.customer_name} onChange={(e) => { setEditFormData({ ...editFormData, customer_name: e.target.value }); if (editErrors.customer_name) setEditErrors((prev) => { const n = { ...prev }; delete n.customer_name; return n; }); }}
                    className={`w-full px-4 py-2 border rounded-lg ${editErrors.customer_name ? 'border-red-400 bg-red-50' : 'border-gray-300'}`} disabled={isUpdating} />
                  {editErrors.customer_name && <p className="text-xs text-red-600 mt-1">{editErrors.customer_name}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone <span className="text-red-500">*</span></label>
                  <input value={editFormData.customer_phone} onChange={(e) => { setEditFormData({ ...editFormData, customer_phone: e.target.value }); if (editErrors.customer_phone) setEditErrors((prev) => { const n = { ...prev }; delete n.customer_phone; return n; }); }}
                    className={`w-full px-4 py-2 border rounded-lg ${editErrors.customer_phone ? 'border-red-400 bg-red-50' : 'border-gray-300'}`} disabled={isUpdating} />
                  {editErrors.customer_phone && <p className="text-xs text-red-600 mt-1">{editErrors.customer_phone}</p>}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input type="email" value={editFormData.customer_email} onChange={(e) => setEditFormData({ ...editFormData, customer_email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg" disabled={isUpdating} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address <span className="text-red-500">*</span></label>
                  <input value={editFormData.customer_address} onChange={(e) => { setEditFormData({ ...editFormData, customer_address: e.target.value }); if (editErrors.customer_address) setEditErrors((prev) => { const n = { ...prev }; delete n.customer_address; return n; }); }}
                    className={`w-full px-4 py-2 border rounded-lg ${editErrors.customer_address ? 'border-red-400 bg-red-50' : 'border-gray-300'}`} disabled={isUpdating} />
                  {editErrors.customer_address && <p className="text-xs text-red-600 mt-1">{editErrors.customer_address}</p>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select value={editFormData.category} onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg" disabled={isUpdating}>
                  {Object.entries(categoryLabels).map(([value, label]) => (<option key={value} value={value}>{label}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Service Description</label>
                <textarea value={editFormData.service_description} onChange={(e) => { setEditFormData({ ...editFormData, service_description: e.target.value }); if (editErrors.service_description) setEditErrors((prev) => { const n = { ...prev }; delete n.service_description; delete n.description; return n; }); }}
                  rows={3} className={`w-full px-4 py-2 border rounded-lg ${editErrors.service_description ? 'border-red-400 bg-red-50' : 'border-gray-300'}`} disabled={isUpdating} placeholder="At least one of Description or Service Description is required" />
                {editErrors.service_description && <p className="text-xs text-red-600 mt-1">{editErrors.service_description}</p>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Budget (AED)</label>
                  <input type="number" value={editFormData.budget} onChange={(e) => setEditFormData({ ...editFormData, budget: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" disabled={isUpdating} min="0" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Preferred Start</label>
                  <input type="date" value={editFormData.preferred_start_date} onChange={(e) => setEditFormData({ ...editFormData, preferred_start_date: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" disabled={isUpdating} /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <input value={editFormData.notes} onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg" disabled={isUpdating} /></div>
              </div>
              {editError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{editError}</p>}
              {editSuccess && <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{editSuccess}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowEditModal(false); setEditingTask(null); }} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50" disabled={isUpdating}>Cancel</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg flex items-center justify-center gap-2" disabled={isUpdating}>
                  {isUpdating ? 'Updating...' : 'Update Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deletingTaskId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-3">Delete Marketing Task</h3>
            <p className="text-sm text-gray-600 mb-4">Are you sure you want to delete this task? This action cannot be undone.</p>
            {deleteError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">{deleteError}</p>}
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeletingTaskId(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm" disabled={isDeleting}>Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg text-sm" disabled={isDeleting}>
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
      {showDetail && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 py-6 overflow-y-auto">
          <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-5">
              <div>
                <h3 className="text-2xl font-semibold text-gray-900">Submission Detail</h3>
                <p className="mt-1 text-sm text-gray-500">View submissions and review feedback</p>
              </div>
              <button onClick={closeDetail} className="rounded-lg p-2 hover:bg-gray-100">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-6 px-6 py-5 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-5">
                <section className="card-safe overflow-hidden min-w-0 rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-xl font-semibold text-gray-900">{selectedTask.title}</h4>
                      <p className="mt-1 text-sm text-gray-500">ID: {selectedTask.id}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${statusColor(selectedTask.status)}`}>
                      {statusDisplay(selectedTask.status)}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                      By {selectedTask.marketing_user?.full_name || 'Unknown'}
                    </span>
                    <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                      {categoryLabels[selectedTask.category] || selectedTask.category}
                    </span>
                    {selectedTask.budget != null && (
                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                        AED {selectedTask.budget.toLocaleString()}
                      </span>
                    )}
                  </div>
                </section>

                <section className="card-safe overflow-hidden min-w-0 rounded-xl border border-gray-200 bg-white p-4">
                  <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500 mb-3">Customer Details</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2"><User className="w-4 h-4 text-gray-400" /><span className="font-medium">{selectedTask.customer_name}</span></div>
                    <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" />{selectedTask.customer_phone}</div>
                    {selectedTask.customer_email && <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-gray-400" />{selectedTask.customer_email}</div>}
                    <div className="sm:col-span-2 flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-400" />{selectedTask.customer_address}</div>
                  </div>
                </section>

                {selectedTask.description && (
                  <section className="card-safe overflow-hidden min-w-0 rounded-xl border border-gray-200 bg-white p-4">
                    <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500 mb-2">Description</h5>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedTask.description}</p>
                  </section>
                )}

                {selectedTask.service_description && (
                  <section className="card-safe overflow-hidden min-w-0 rounded-xl border border-gray-200 bg-white p-4">
                    <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500 mb-2">Service Description</h5>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedTask.service_description}</p>
                  </section>
                )}

                {selectedTask.notes && (
                  <section className="card-safe overflow-hidden min-w-0 rounded-xl border border-gray-200 bg-white p-4">
                    <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500 mb-2">Notes</h5>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedTask.notes}</p>
                  </section>
                )}

                {selectedTask.attachment_urls && selectedTask.attachment_urls.length > 0 && (
                  <section className="card-safe overflow-hidden min-w-0 rounded-xl border border-gray-200 bg-white p-4">
                    <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500 mb-3 flex items-center gap-2"><Paperclip className="w-4 h-4" />Task Attachments</h5>
                    <AttachmentViewer attachments={selectedTask.attachment_urls} />
                  </section>
                )}

                <section className="card-safe overflow-hidden min-w-0 rounded-xl border border-gray-200 bg-white p-4">
                  <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500 mb-4">Submissions &amp; Review Feedback</h5>
                  {getSubmissionWrappers(selectedTask).length === 0 ? (
                    <p className="text-sm text-gray-500">No submissions yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {(() => {
                        const wrappers = getSubmissionWrappers(selectedTask);
                        const latestSubmissionId = wrappers.length > 0 ? wrappers[wrappers.length - 1].submission?.id : null;
                        const editableWrappers = wrappers.filter((w) => (w.submission?.reviews || []).length === 0);
                        const latestEditable = editableWrappers.length > 0 ? editableWrappers[editableWrappers.length - 1] : null;
                        const taskActive = selectedTask.task_state === 'active';
                        const taskRejected = selectedTask.status === 'rejected';
                        const isMarketingOwner = user?.role === 'marketing_lead' && selectedTask.marketing_user_id === user.id;
                        const canEditSubmission = latestEditable && taskActive && !taskRejected && isMarketingOwner;
                        const latestEditableId = canEditSubmission ? latestEditable!.submission?.id : null;
                        const isEditingThis = editingSubmissionId !== null;

                        return wrappers.map((wrapper, idx) => {
                          const sub = wrapper.submission;
                          const subHasNotification = wrapper.hasNotification || (sub.reviews || []).some((r) => r.hasNotification);
                          const isSubExpanded = expandedSubmissionId === sub.id;
                          const isThisLatestEditable = sub.id === latestEditableId;
                          const isLatestSubmission = sub.id === latestSubmissionId;
                          const editingBelongsToThisSub = editingReviewId !== null && (sub.reviews || []).some((r) => r.id === editingReviewId);

                          return (
                            <div key={sub.id} className={`border rounded-lg overflow-hidden ${subHasNotification ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200'}`}>
                              <button type="button" onClick={() => setExpandedSubmissionId(isSubExpanded ? null : sub.id)}
                                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left">
                                <div className="flex items-center gap-3">
                                  {subHasNotification && <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
                                  <div>
                                    <span className="font-medium text-gray-800">Submission {idx + 1}</span>
                                    <span className="ml-2 text-xs text-gray-500">{new Date(sub.created_at).toLocaleString()}</span>
                                  </div>
                                  {(sub.reviews || []).length > 0 && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                                      {sub.reviews.length} review{sub.reviews.length !== 1 ? 's' : ''}
                                    </span>
                                  )}
                                </div>
                                {isSubExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                              </button>

                              {isSubExpanded && (
                                <div className="p-4 bg-white space-y-4">
                                  {sub.description && (
                                    <div>
                                      <h6 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Submission Description</h6>
                                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{sub.description}</p>
                                    </div>
                                  )}
                                  {sub.attachment_urls && sub.attachment_urls.length > 0 && (
                                    <div>
                                      <h6 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Attachments</h6>
                                      <AttachmentViewer attachments={sub.attachment_urls} />
                                    </div>
                                  )}
                                  {isThisLatestEditable && (
                                    <div className="pt-2">
                                      {isEditingThis && editingSubmissionId === sub.id ? (
                                        <button type="button" onClick={() => {
                                          setEditingSubmissionId(null);
                                          setDetailDraftNote((prev) => ({ ...prev, [selectedTask.id]: '' }));
                                          setDetailDraftScreenshots((prev) => ({ ...prev, [selectedTask.id]: null }));
                                          detailDraftFilesRef.current = { ...detailDraftFilesRef.current, [selectedTask.id]: [] };
                                        }} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 font-medium">
                                          <X className="w-3.5 h-3.5" />Cancel Edit
                                        </button>
                                      ) : (
                                        <button type="button" onClick={() => handleEditSubmission(selectedTask.id, sub.id)}
                                          className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                                          Edit Submission
                                        </button>
                                      )}
                                    </div>
                                  )}

                                  {(sub.reviews || []).length > 0 && (
                                    <div className="border-t border-gray-100 pt-4">
                                      <h6 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Reviews</h6>
                                      <div className="space-y-2">
                                        {sub.reviews.map((review) => {
                                          const isApproved = review.review_outcome === 'approved';
                                          const isRejected = review.review_outcome === 'rejected';
                                          const isFeedback = review.review_outcome === 'feedback';
                                          const ReviewIcon = isApproved ? ThumbsUp : isRejected ? ThumbsDown : MessageSquare;
                                          const entryColor = isApproved ? 'bg-green-100 text-green-700' : isRejected ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700';
                                          const statusLabel = isApproved ? 'Approved' : isRejected ? 'Rejected' : 'Feedback Given';
                                          const reviewTs = new Date(review.created_at).getTime();
                                          const hasNewerReview = wrappers.some((w) => (w.submission?.reviews || []).some((r) => new Date(r.created_at).getTime() > reviewTs));
                                          const hasNewerSubmission = wrappers.some((w) => new Date(w.submission.created_at).getTime() > reviewTs);
                                          const canEditReview = review.reviewer_user_id === user?.id && selectedTask.task_state === 'active' && !hasNewerReview && !hasNewerSubmission;

                                          return (
                                            <div key={review.id} className={`border rounded-lg overflow-hidden ${review.hasNotification ? 'border-blue-400 ring-1 ring-blue-100' : 'border-gray-200'}`}>
                                              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50">
                                                {review.hasNotification && <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${entryColor}`}>
                                                  <ReviewIcon className="w-3 h-3" />{statusLabel}
                                                </span>
                                                <span className="text-xs text-gray-500">{new Date(review.created_at).toLocaleString()}</span>
                                                <span className="text-xs text-gray-400">by {review.reviewer_user?.full_name || 'User ' + review.reviewer_user_id.slice(0, 8)}</span>
                                                {canEditReview && (
                                                  <button type="button" onClick={() => {
                                                    setEditingReviewId(review.id);
                                                    setReviewDraft((prev) => ({ ...prev, [selectedTask.id]: review.description || '' }));
                                                  }} className="ml-auto flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                                                    <Edit className="w-3 h-3" /> Edit
                                                  </button>
                                                )}
                                              </div>
                                              {review.description && (
                                                <div className="px-3 py-2"><p className="text-sm text-gray-800 whitespace-pre-wrap">{review.description}</p></div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  {canReview && isLatestSubmission && selectedTask.task_state === 'active' && (
                                    <div className="border-t border-gray-100 pt-3">
                                      <h6 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                                        {editingBelongsToThisSub ? 'Update Review' : 'Review &amp; Decision'}
                                      </h6>
                                      <textarea rows={2} value={reviewDraft[selectedTask.id] ?? ''}
                                        onChange={(e) => setReviewDraft((prev) => ({ ...prev, [selectedTask.id]: e.target.value }))}
                                        placeholder="Your feedback or reason..."
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm mb-2" />
                                      {editingBelongsToThisSub && (
                                        <div className="mb-2">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setEditingReviewId(null);
                                              setReviewDraft((prev) => ({ ...prev, [selectedTask.id]: '' }));
                                            }}
                                            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 font-medium"
                                          >
                                            <X className="w-3.5 h-3.5" /> Cancel Edit
                                          </button>
                                        </div>
                                      )}
                                      <div className="flex flex-wrap gap-2">
                                        <button type="button" onClick={() => handleReviewSubmission(selectedTask.id, sub.id, 'approved')}
                                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-50 text-green-700 border border-green-300 hover:bg-green-100 transition-colors">
                                          <ThumbsUp className="w-3.5 h-3.5" />Approve
                                        </button>
                                        <button type="button" onClick={() => handleReviewSubmission(selectedTask.id, sub.id, 'rejected')}
                                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-700 border border-red-300 hover:bg-red-100 transition-colors">
                                          <ThumbsDown className="w-3.5 h-3.5" />Reject
                                        </button>
                                        <button type="button" onClick={() => handleReviewSubmission(selectedTask.id, sub.id, 'feedback')}
                                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-700 border border-blue-300 hover:bg-blue-100 transition-colors">
                                          <Send className="w-3.5 h-3.5" />{editingBelongsToThisSub ? 'Update Feedback' : 'Feedback'}
                                        </button>
                                      </div>
                                      {reviewDetailError[selectedTask.id] && (
                                        <p className="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{reviewDetailError[selectedTask.id]}</p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                </section>

                {user?.role === 'marketing_lead' && selectedTask.marketing_user_id === user.id && selectedTask.status !== 'rejected' && selectedTask.task_state === 'active' && (
                  <section className="card-safe overflow-hidden min-w-0 rounded-xl border border-dashed border-gray-300 bg-blue-50/50 p-4">
                    <h6 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      {editingSubmissionId ? 'Update' : 'Submit'} to this Task
                    </h6>
                    <div className="space-y-3">
                      <div>
                        <textarea rows={3} value={detailDraftNote[selectedTask.id] ?? ''}
                          onChange={(e) => setDetailDraftNote((prev) => ({ ...prev, [selectedTask.id]: e.target.value }))}
                          placeholder="Describe your submission..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">File Attachments <span className="text-gray-400 font-normal">(optional)</span></label>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-sm text-gray-700">
                            <Upload className="w-4 h-4" />
                            {detailDraftFilesRef.current[selectedTask.id]?.length
                              ? detailDraftFilesRef.current[selectedTask.id].length + ' file(s) selected'
                              : detailDraftScreenshots[selectedTask.id] ? 'Change Files' : 'Choose Files'}
                            <input type="file" multiple accept="image/*,.pdf,.doc,.docx" onChange={(e) => handleDetailFilesChange(selectedTask.id, e.target.files)} className="hidden" />
                          </label>
                          {(detailDraftScreenshots[selectedTask.id] || detailDraftFilesRef.current[selectedTask.id]?.length) ? (
                            <button type="button" onClick={() => {
                              const oldUrl = detailDraftScreenshots[selectedTask.id] ?? null;
                              if (oldUrl && oldUrl.startsWith('blob:')) URL.revokeObjectURL(oldUrl);
                              setDetailDraftScreenshots((prev) => ({ ...prev, [selectedTask.id]: null }));
                              detailDraftFilesRef.current = { ...detailDraftFilesRef.current, [selectedTask.id]: [] };
                            }} className="text-sm text-red-600 hover:underline">Remove All</button>
                          ) : null}
                        </div>
                        {detailDraftScreenshots[selectedTask.id] && (
                          <img src={detailDraftScreenshots[selectedTask.id]!} alt="preview" className="mt-2 w-full max-h-40 rounded-lg border object-contain" />
                        )}
                      </div>
                      <button type="button" onClick={() => handleSubmitSubmission(selectedTask.id)}
                        disabled={submissionDraftLoading[selectedTask.id]}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-medium transition-colors">
                        {submissionDraftLoading[selectedTask.id]
                          ? (editingSubmissionId ? 'Updating...' : 'Submitting...')
                          : (editingSubmissionId ? 'Update' : 'Submit')}
                      </button>
                      {submissionDetailError[selectedTask.id] && (
                        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{submissionDetailError[selectedTask.id]}</p>
                      )}
                    </div>
                  </section>
                )}
              </div>

              <aside className="space-y-4">
                <section className="card-safe overflow-hidden min-w-0 rounded-xl border border-gray-200 bg-white p-4">
                  <h5 className="text-sm font-medium uppercase tracking-wide text-gray-500 mb-3">Timeline</h5>
                  <div className="mt-2 space-y-2 text-sm text-gray-700">
                    <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-gray-400" />Created: {new Date(selectedTask.created_at).toLocaleDateString()}</div>
                    {selectedTask.due_date && <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-gray-400" />Deadline: {new Date(selectedTask.due_date).toLocaleDateString()}</div>}
                    {selectedTask.preferred_start_date && <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-gray-400" />Preferred Start: {new Date(selectedTask.preferred_start_date).toLocaleDateString()}</div>}
                    {selectedTask.budget != null && <div className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-gray-400" />Budget: AED {selectedTask.budget.toLocaleString()}</div>}
                  </div>
                </section>
              </aside>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerData;
