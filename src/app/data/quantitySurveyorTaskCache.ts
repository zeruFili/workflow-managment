import { createCache } from './apiCache';
import quantitySurveyorApi, { QuantitySurveyorTaskItem } from '../../api/quantitySurveyorApi';

const STORAGE_KEY = 'quantity-surveyor-tasks-v3';

function loadLocalTasks(): QuantitySurveyorTaskItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as QuantitySurveyorTaskItem[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  return [];
}

function persistLocalTasks(tasksToSave: QuantitySurveyorTaskItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasksToSave));
  } catch { /* ignore */ }
}

export const quantitySurveyorTaskCache = createCache<{ data: QuantitySurveyorTaskItem[]; total: number }>(
  async (params) => {
    try {
      const response = await quantitySurveyorApi.getTasks(params as any);
      if (response.success) {
        persistLocalTasks(response.data);
        return { data: response.data, total: response.meta.total };
      }
    } catch { /* fall through */ }
    const local = loadLocalTasks();
    const page = (params.page as number) || 1;
    const limit = (params.limit as number) || 10;
    const start = (page - 1) * limit;
    return { data: local.slice(start, start + limit), total: local.length };
  }
);
