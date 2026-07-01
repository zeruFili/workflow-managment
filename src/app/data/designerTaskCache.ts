import { createCache } from './apiCache';
import designerApi, { DesignerTaskItem } from '../../api/designerApi';

export const designerTaskCache = createCache<{ data: DesignerTaskItem[]; total: number }>(
  async (params) => {
    const res = await designerApi.getDesignerTasks(params as any);
    if (res.success) {
      return { data: res.data, total: res.meta.total };
    }
    return { data: [], total: 0 };
  }
);
