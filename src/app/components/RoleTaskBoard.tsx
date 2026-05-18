import React, { useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Task, TaskStatus } from '../types';
import { Calendar, Edit, Plus, Trash2 } from 'lucide-react';

interface RoleTaskBoardProps {
  title: string;
  description: string;
  storageKey: string;
  seedTasks: Task[];
  createButtonLabel?: string;
  emptyStateText?: string;
}

interface TaskFormState {
  title: string;
  description: string;
  instruction: string;
  deadline: string;
  status: TaskStatus;
}

const emptyForm: TaskFormState = {
  title: '',
  description: '',
  instruction: '',
  deadline: '',
  status: 'pending',
};

function loadTasks(storageKey: string, seedTasks: Task[]): Task[] {
  const savedTasks = localStorage.getItem(storageKey);
  if (!savedTasks) {
    localStorage.setItem(storageKey, JSON.stringify(seedTasks));
    return seedTasks;
  }

  const parsedTasks = JSON.parse(savedTasks) as Task[];
  const mergedTasks = [
    ...parsedTasks.map((task) => {
      const seedTask = seedTasks.find((candidate) => candidate.id === task.id);
      return seedTask ? { ...seedTask, ...task } : task;
    }),
    ...seedTasks.filter((seedTask) => !parsedTasks.some((task) => task.id === seedTask.id)),
  ];

  localStorage.setItem(storageKey, JSON.stringify(mergedTasks));
  return mergedTasks;
}

export function RoleTaskBoard({
  title,
  description,
  storageKey,
  seedTasks,
  createButtonLabel = 'Create Task',
  emptyStateText = 'No tasks found yet.',
}: RoleTaskBoardProps) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>(() => loadTasks(storageKey, seedTasks));
  const [showEditor, setShowEditor] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [form, setForm] = useState<TaskFormState>(emptyForm);

  if (!user) {
    return null;
  }

  const canManage = user.role === 'ceo' || user.role === 'general_manager' || user.role === 'system_administrator';

  const summary = useMemo(() => {
    return {
      total: tasks.length,
      pending: tasks.filter((task) => task.status === 'pending').length,
      inProgress: tasks.filter((task) => task.status === 'in_progress').length,
      completed: tasks.filter((task) => task.status === 'completed').length,
    };
  }, [tasks]);

  const persistTasks = (updatedTasks: Task[]) => {
    setTasks(updatedTasks);
    localStorage.setItem(storageKey, JSON.stringify(updatedTasks));
  };

  const openCreate = () => {
    setEditingTaskId(null);
    setForm(emptyForm);
    setShowEditor(true);
  };

  const openEdit = (task: Task) => {
    setEditingTaskId(task.id);
    setForm({
      title: task.title,
      description: task.description,
      instruction: task.instruction,
      deadline: task.deadline || '',
      status: task.status,
    });
    setShowEditor(true);
  };

  const closeEditor = () => {
    setShowEditor(false);
    setEditingTaskId(null);
    setForm(emptyForm);
  };

  const saveTask = (event: React.FormEvent) => {
    event.preventDefault();

    if (!canManage) {
      closeEditor();
      return;
    }

    if (editingTaskId) {
      persistTasks(
        tasks.map((task) =>
          task.id === editingTaskId
            ? {
                ...task,
                title: form.title.trim(),
                description: form.description.trim(),
                instruction: form.instruction.trim(),
                deadline: form.deadline || undefined,
                status: form.status,
              }
            : task
        )
      );
    } else {
      const nextTask: Task = {
        id: `${storageKey}-${Date.now()}`,
        projectId: storageKey,
        title: form.title.trim(),
        description: form.description.trim(),
        instruction: form.instruction.trim(),
        assignedBy: user.id,
        status: form.status,
        deadline: form.deadline || undefined,
        createdAt: new Date().toISOString(),
      };

      persistTasks([nextTask, ...tasks]);
    }

    closeEditor();
  };

  const deleteTask = (taskId: string) => {
    if (!canManage) {
      return;
    }

    const shouldDelete = window.confirm('Delete this item?');
    if (!shouldDelete) {
      return;
    }

    persistTasks(tasks.filter((task) => task.id !== taskId));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-col md:flex-row">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          <p className="text-gray-600 mt-1">{description}</p>
        </div>
        {canManage && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>{createButtonLabel}</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: summary.total },
          { label: 'Pending', value: summary.pending },
          { label: 'In Progress', value: summary.inProgress },
          { label: 'Completed', value: summary.completed },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {tasks.map((task) => (
          <div key={task.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
            <div className="flex items-start justify-between gap-3 flex-col sm:flex-row">
              <div>
                <h3 className="font-semibold text-lg text-gray-900">{task.title}</h3>
                <p className="text-sm text-gray-500 mt-1">ID: {task.id}</p>
              </div>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  task.status === 'completed'
                    ? 'bg-green-100 text-green-700'
                    : task.status === 'in_progress'
                      ? 'bg-blue-100 text-blue-700'
                      : task.status === 'rejected'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {task.status.replace('_', ' ')}
              </span>
            </div>

            <p className="text-gray-700 mt-4">{task.description}</p>

            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Instruction</p>
              <p className="text-sm text-gray-700 mt-1">{task.instruction}</p>
            </div>

            <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No deadline'}</span>
              </div>
              <span>Created {new Date(task.createdAt).toLocaleDateString()}</span>
            </div>

            {canManage && (
              <div className="mt-5 flex items-center gap-2">
                <button
                  onClick={() => openEdit(task)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {tasks.length === 0 && (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
          <p className="text-gray-500">{emptyStateText}</p>
        </div>
      )}

      {showEditor && canManage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">{editingTaskId ? 'Edit Item' : 'Create Item'}</h3>
            <form className="space-y-4" onSubmit={saveTask}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[100px]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Instruction</label>
                <textarea
                  value={form.instruction}
                  onChange={(event) => setForm((current) => ({ ...current, instruction: event.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[100px]"
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Deadline</label>
                  <input
                    type="date"
                    value={form.deadline}
                    onChange={(event) => setForm((current) => ({ ...current, deadline: event.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={form.status}
                    onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as TaskStatus }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="pending">pending</option>
                    <option value="in_progress">in progress</option>
                    <option value="completed">completed</option>
                    <option value="incomplete">incomplete</option>
                    <option value="rejected">rejected</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeEditor}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
