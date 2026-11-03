/**
 * In-memory limiter for failed login attempts, per client IP.
 * Daymark runs as a single process, so memory is enough; counters reset on restart.
 */

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;

// Survives dev hot reload, like the scheduler guard
const failures = globalThis.__daymarkLoginFailures ??= new Map();

/**
 * Client IP as seen by the reverse proxy, or 'direct' without one.
 *
 * @param {Request} req
 * @returns {string}
 */
export function getClientIp(req) {
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  // The last entry is the one added by the closest proxy, earlier ones can be forged
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',').pop().trim();

  return 'direct';
}

/**
 * Seconds until the key may try again, or 0 if it is not blocked.
 *
 * @param {string} key
 * @returns {number}
 */
export function getLoginRetryAfter(key) {
  const entry = failures.get(key);
  if (!entry) return 0;

  const remainingMs = entry.windowStart + WINDOW_MS - Date.now();
  if (remainingMs <= 0) {
    failures.delete(key);
    return 0;
  }

  return entry.count >= MAX_FAILURES ? Math.ceil(remainingMs / 1000) : 0;
}

/**
 * @param {string} key
 */
export function recordLoginFailure(key) {
  const now = Date.now();

  // Drop expired entries so the map cannot grow without bound
  for (const [k, entry] of failures) {
    if (entry.windowStart + WINDOW_MS <= now) failures.delete(k);
  }

  const entry = failures.get(key);
  if (entry) {
    entry.count += 1;
  } else {
    failures.set(key, { count: 1, windowStart: now });
  }
}

/**
 * @param {string} key
 */
export function clearLoginFailures(key) {
  failures.delete(key);
}
