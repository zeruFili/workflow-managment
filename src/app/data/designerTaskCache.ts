import { createCache } from './apiCache';
import designerApi, { DesignerTaskItem } from '../../api/designerApi';

export const designerTaskCache = createCache<DesignerTaskItem[]>(
  async (params) => {
    const res = await designerApi.getDesignerTasks(params as any);
    return res.success ? res.data : [];
  }
);
