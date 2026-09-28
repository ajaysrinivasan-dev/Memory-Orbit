import { auth } from '../firebase';

/**
 * API Caching & Rate Limiting Utility
 * Prevents duplicate API calls and enforces rate limiting
 */

const cache = new Map();
const requestQueues = new Map();
const endpointQueues = new Map();

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_DELAY = 1000; // 1 second between calls to same endpoint

/**
 * Get cached result if available and not expired
 */
export const getCachedResult = (key) => {
  const cached = cache.get(key);
  if (!cached) return null;
  
  if (Date.now() - cached.timestamp > CACHE_DURATION) {
    cache.delete(key);
    return null;
  }
  
  return cached.data;
};

/**
 * Store result in cache
 */
export const setCachedResult = (key, data) => {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
};

/**
 * Clear cache for a specific key or all
 */
export const clearCache = (key = null) => {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
};

/**
 * Rate-limited fetch wrapper
 * Prevents multiple simultaneous requests to same endpoint
 */
export const rateLimitedFetch = async (endpoint, options = {}) => {
  const cacheKey = `${endpoint}_${JSON.stringify(options.body || {})}`;
  
  // Check cache first
  const cachedResult = getCachedResult(cacheKey);
  if (cachedResult) {
    console.log(`[Cache Hit] ${endpoint}`);
    return cachedResult;
  }

  // Check if request is already in flight
  if (requestQueues.has(cacheKey)) {
    console.log(`[Deduped] ${endpoint} - waiting for in-flight request`);
    return requestQueues.get(cacheKey);
  }

  // Create new request promise
  const requestPromise = (async () => {
    const previousRequest = endpointQueues.get(endpoint) || Promise.resolve();
    let releaseRequest;
    const currentRequest = new Promise((resolve) => { releaseRequest = resolve; });
    endpointQueues.set(endpoint, currentRequest);

    try {
      await previousRequest;
      const lastRequestAt = endpointQueues.get(`${endpoint}:lastRequestAt`) || 0;
      const waitTime = Math.max(0, RATE_LIMIT_DELAY - (Date.now() - lastRequestAt));
      if (waitTime > 0) await new Promise((resolve) => setTimeout(resolve, waitTime));

      const user = auth.currentUser;
      if (!user) throw new Error('User is not authenticated.');
      const token = await user.getIdToken();
      const headers = new Headers(options.headers || {});
      headers.set('Authorization', `Bearer ${token}`);
      endpointQueues.set(`${endpoint}:lastRequestAt`, Date.now());

      const response = await fetch(endpoint, { ...options, headers });
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      const data = await response.json();
      setCachedResult(cacheKey, data);
      return data;
    } finally {
      releaseRequest();
      // Clean up queue after request completes
      setTimeout(() => {
        requestQueues.delete(cacheKey);
      }, RATE_LIMIT_DELAY);
      if (endpointQueues.get(endpoint) === currentRequest) endpointQueues.delete(endpoint);
    }
  })();

  // Store promise in queue
  requestQueues.set(cacheKey, requestPromise);
  return requestPromise;
};

/**
 * Debounce helper for AI reflection/oracle calls
 */
export const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};
