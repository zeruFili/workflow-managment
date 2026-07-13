type CacheEntry<T> = {
  data: T | null;
  loading: boolean;
  promise: Promise<T> | null;
};

const entries = new Map<string, CacheEntry<any>>();
const listeners = new Map<string, Set<(data: any) => void>>();

function key(params: Record<string, unknown>): string {
  return JSON.stringify(params, Object.keys(params).sort());
}

function getEntry<T>(k: string): CacheEntry<T> {
  if (!entries.has(k)) {
    entries.set(k, { data: null, loading: false, promise: null });
  }
  return entries.get(k)!;
}

function notify<T>(k: string, data: T) {
  const fns = listeners.get(k);
  if (fns) fns.forEach((fn) => fn(data));
}

export function createCache<T>(fetcher: (params: Record<string, unknown>) => Promise<T>) {
  return {
    get(params: Record<string, unknown>): T | null {
      return getEntry<T>(key(params)).data;
    },

    isLoading(params: Record<string, unknown>): boolean {
      return getEntry<T>(key(params)).loading;
    },

    subscribe(params: Record<string, unknown>, fn: (data: T) => void): () => void {
      const k = key(params);
      if (!listeners.has(k)) listeners.set(k, new Set());
      listeners.get(k)!.add(fn);
      const entry = getEntry<T>(k);
      if (entry.data) fn(entry.data);
      return () => {
        const fns = listeners.get(k);
        if (fns) {
          fns.delete(fn);
          if (fns.size === 0) listeners.delete(k);
        }
      };
    },

    async fetch(params: Record<string, unknown>): Promise<T> {
      const k = key(params);
      const entry = getEntry<T>(k);

      if (entry.data) {
        console.log('[PAGINATION] apiCache.fetch — cache HIT for key:', k);
        return entry.data;
      }
      if (entry.promise) {
        console.log('[PAGINATION] apiCache.fetch — awaiting existing promise for key:', k);
        return entry.promise;
      }

      console.log('[PAGINATION] apiCache.fetch — cache MISS, executing fetcher for key:', k);
      entry.loading = true;
      entry.promise = fetcher(params)
        .then((data) => {
          console.log('[PAGINATION] apiCache.fetch — fetcher resolved, caching data for key:', k);
          entry.data = data;
          notify(k, data);
          return data;
        })
        .finally(() => {
          entry.loading = false;
          entry.promise = null;
        });

      return entry.promise;
    },

    invalidate(params?: Record<string, unknown>) {
      if (params) {
        const k = key(params);
        entries.delete(k);
        listeners.delete(k);
      } else {
        entries.clear();
        listeners.clear();
      }
    },
  };
}
