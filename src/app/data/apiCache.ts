type CacheEntry<T> = {
  data: T | null;
  loading: boolean;
  promise: Promise<T> | null;
};

const entries = new Map<string, CacheEntry<any>>();
const listeners = new Map<string, Set<(data: any) => void>>();

let cacheNamespaceCounter = 0;

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

export function createCache<T>(
  fetcher: (params: Record<string, unknown>) => Promise<T>,
  namespace?: string
) {
  // Each cache instance gets its own namespace so that identical query
  // params (e.g. `{ page: 1, limit: 10 }`) on different resources never
  // collide. Without this, all caches shared a single in-memory store and
  // data from one page would leak onto another.
  const ns = namespace || `cache-${++cacheNamespaceCounter}`;

  const cacheKey = (params: Record<string, unknown>): string =>
    `${ns}:${key(params)}`;

  return {
    get(params: Record<string, unknown>): T | null {
      return getEntry<T>(cacheKey(params)).data;
    },

    isLoading(params: Record<string, unknown>): boolean {
      return getEntry<T>(cacheKey(params)).loading;
    },

    subscribe(params: Record<string, unknown>, fn: (data: T) => void): () => void {
      const k = cacheKey(params);
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
      const k = cacheKey(params);
      const entry = getEntry<T>(k);

      if (entry.data) {
        return entry.data;
      }
      if (entry.promise) {
        return entry.promise;
      }

      entry.loading = true;
      entry.promise = fetcher(params)
        .then((data) => {
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
        const k = cacheKey(params);
        entries.delete(k);
        listeners.delete(k);
      } else {
        // Only clear this cache's own namespace, not other caches.
        const prefix = `${ns}:`;
        for (const k of [...entries.keys()]) {
          if (k.startsWith(prefix)) entries.delete(k);
        }
        for (const k of [...listeners.keys()]) {
          if (k.startsWith(prefix)) listeners.delete(k);
        }
      }
    },
  };
}
