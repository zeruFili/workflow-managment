import { createCache } from './apiCache';
import userApi, { UserItem } from '../../api/userApi';

export const userCache = createCache<UserItem[]>(
  async (params) => {
    const res = await userApi.getUsers(params as any);
    return res.success ? res.data : [];
  }
);
