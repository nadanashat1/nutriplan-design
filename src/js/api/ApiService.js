
export class ApiService {
  static BASE_URL = 'https://nutriplan-api.vercel.app/api';
  static cache = new Map();
  static pendingRequests = new Map();

  /**
   * @param {string} path   - relative path e.g. '/meals/filter'
   * @param {object} [opts] - fetch options override (signal, useCache, etc.)
   */
  static async get(path, opts = {}) {
    const { useCache = true, signal, ...fetchOpts } = opts;
    const url = `${ApiService.BASE_URL}${path}`;

    if (useCache && ApiService.cache.has(url)) {
      return ApiService.cache.get(url);
    }

    if (ApiService.pendingRequests.has(url)) {
      const promise = ApiService.pendingRequests.get(url);
      if (signal) {
        return new Promise((resolve, reject) => {
          if (signal.aborted) return reject(new DOMException('Aborted', 'AbortError'));
          const onAbort = () => reject(new DOMException('Aborted', 'AbortError'));
          signal.addEventListener('abort', onAbort, { once: true });
          promise.then(
            (res) => { signal.removeEventListener('abort', onAbort); resolve(res); },
            (err) => { signal.removeEventListener('abort', onAbort); reject(err); }
          );
        });
      }
      return promise;
    }

    const requestPromise = (async () => {
      try {
        const res = await fetch(url, fetchOpts);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const err = new Error(body.error || body.message || `HTTP ${res.status}`);
          err.status = res.status;
          throw err;
        }
        const data = await res.json();
        if (useCache) {
          ApiService.cache.set(url, data);
        }
        return data;
      } finally {
        ApiService.pendingRequests.delete(url);
      }
    })();

    ApiService.pendingRequests.set(url, requestPromise);

    if (signal) {
      return new Promise((resolve, reject) => {
        if (signal.aborted) return reject(new DOMException('Aborted', 'AbortError'));
        const onAbort = () => reject(new DOMException('Aborted', 'AbortError'));
        signal.addEventListener('abort', onAbort, { once: true });
        requestPromise.then(
          (res) => { signal.removeEventListener('abort', onAbort); resolve(res); },
          (err) => { signal.removeEventListener('abort', onAbort); reject(err); }
        );
      });
    }

    return requestPromise;
  }

  /**
   * @param {string} path
   * @param {object} body
   * @param {object} [headers]
   * @param {object} [opts]
   */
  static async post(path, body, headers = {}, opts = {}) {
    const url = `${ApiService.BASE_URL}${path}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      ...opts,
    });
    if (!res.ok) {
      const err_body = await res.json().catch(() => ({}));
      const err = new Error(err_body.error || err_body.message || `HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }

  static clearCache() {
    ApiService.cache.clear();
    ApiService.pendingRequests.clear();
  }
}
