import { createCache } from './apiCache';
import dataCollectorApi, { DataCollectorTaskItem } from '../../api/dataCollectorApi';

export const dataCollectorTaskCache = createCache<DataCollectorTaskItem[]>(
  async (params) => {
    const res = await dataCollectorApi.getDataCollectorTasks(params as any);
    return res.success ? res.data : [];
  }
);
