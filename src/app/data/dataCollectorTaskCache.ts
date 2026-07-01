import { createCache } from './apiCache';
import dataCollectorApi, { DataCollectorTaskItem } from '../../api/dataCollectorApi';

const STORAGE_KEY = 'data-collector-tasks-v3';

function loadLocalTasks(): DataCollectorTaskItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as DataCollectorTaskItem[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  return [];
}

function persistLocalTasks(tasksToSave: DataCollectorTaskItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasksToSave));
  } catch { /* ignore */ }
}

export const dataCollectorTaskCache = createCache<{ data: DataCollectorTaskItem[]; total: number }>(
  async (params) => {
    try {
      const response = await dataCollectorApi.getDataCollectorTasks(params as any);
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
