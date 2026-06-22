import { createCache } from './apiCache';
import ceoTransferApi, { CeoTransferItem } from '../../api/ceoTransferApi';

export const ceoTransferCache = createCache<CeoTransferItem[]>(
  async (params) => {
    const res = await ceoTransferApi.getCeoTransfers(params as any);
    return res.success ? res.data : [];
  }
);
