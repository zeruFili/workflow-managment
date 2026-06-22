import marketingApi, { MarketingTaskItem, MarketingTaskListResponse } from '../../api/marketingApi';

type TaskCache = {
  tasks: MarketingTaskItem[] | null;
  loading: boolean;
  promise: Promise<MarketingTaskItem[]> | null;
};

const cache: TaskCache = {
  tasks: null,
  loading: false,
  promise: null,
};

const listeners = new Set<(tasks: MarketingTaskItem[]) => void>();

function notify(tasks: MarketingTaskItem[]) {
  listeners.forEach((fn) => fn(tasks));
}

export function subscribeMarketingTasks(fn: (tasks: MarketingTaskItem[]) => void) {
  listeners.add(fn);
  if (cache.tasks) fn(cache.tasks);
  return () => { listeners.delete(fn); };
}

export function getCachedMarketingTasks(): MarketingTaskItem[] | null {
  return cache.tasks;
}

export function isMarketingTasksLoading(): boolean {
  return cache.loading;
}

export async function fetchMarketingTasks(): Promise<MarketingTaskItem[]> {
  if (cache.tasks) return cache.tasks;

  if (cache.promise) return cache.promise;

  cache.loading = true;
  cache.promise = marketingApi
    .getMarketingTasks({ limit: 100 })
    .then((res: MarketingTaskListResponse) => {
      const tasks = res.success ? res.data : [];
      cache.tasks = tasks;
      notify(tasks);
      return tasks;
    })
    .catch(() => {
      const fallback: MarketingTaskItem[] = [];
      cache.tasks = fallback;
      notify(fallback);
      return fallback;
    })
    .finally(() => {
      cache.loading = false;
      cache.promise = null;
    });

  return cache.promise;
}

export function invalidateMarketingTaskCache() {
  cache.tasks = null;
  cache.loading = false;
  cache.promise = null;
}
