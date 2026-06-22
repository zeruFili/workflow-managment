import { createCache } from './apiCache';
import quantitySurveyorApi, { QuantitySurveyorTaskItem } from '../../api/quantitySurveyorApi';

export const quantitySurveyorTaskCache = createCache<QuantitySurveyorTaskItem[]>(
  async (params) => {
    const res = await quantitySurveyorApi.getTasks(params as any);
    return res.success ? res.data : [];
  }
);
