import { sleep } from './util.js';

export class HttpError extends Error {
  constructor(status, url, body) {
    super(`HTTP ${status} for ${url}`);
    this.status = status;
    this.url = url;
    this.body = body;
  }
}

const lastHit = new Map();
const MIN_GAP_MS = Number(process.env.JOB_APPLY_MIN_GAP_MS ?? 400);

/** Space out requests to the same host so the tool stays a polite client. */
async function throttle(host) {
  const now = Date.now();
  const at = Math.max(now, (lastHit.get(host) ?? 0) + MIN_GAP_MS);
  lastHit.set(host, at);
  if (at > now) await sleep(at - now);
}

/**
 * GET/POST JSON with a timeout and bounded retries.
 * 404 (and other 4xx except 408/429) are returned to the caller as HttpError immediately:
 * they mean "no such board", not "try again".
 */
export async function fetchJson(url, { method = 'GET', body, headers = {}, timeoutMs = 20000, retries = 3, fetchImpl } = {}) {
  const doFetch = fetchImpl ?? globalThis.__jobApplyFetch ?? fetch;
  const host = new URL(url).host;
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    await throttle(host);
    try {
      const res = await doFetch(url, {
        method,
        headers: { accept: 'application/json', 'user-agent': 'job-apply-cli/1.0', ...(body ? { 'content-type': 'application/json' } : {}), ...headers },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(timeoutMs),
        redirect: 'follow',
      });
      if (res.ok) {
        const text = await res.text();
        try {
          return JSON.parse(text);
        } catch {
          throw new HttpError(res.status, url, 'response was not JSON');
        }
      }
      const retryable = res.status === 408 || res.status === 429 || res.status >= 500;
      if (!retryable) throw new HttpError(res.status, url, await res.text().catch(() => ''));
      const ra = Number(res.headers.get('retry-after'));
      lastErr = new HttpError(res.status, url, '');
      if (attempt < retries) await sleep(Number.isFinite(ra) && ra > 0 ? Math.min(ra, 60) * 1000 : 1000 * 2 ** attempt);
    } catch (err) {
      if (err instanceof HttpError && !(err.status === 408 || err.status === 429 || err.status >= 500)) throw err;
      lastErr = err;
      if (attempt < retries) await sleep(1000 * 2 ** attempt);
    }
  }
  throw lastErr;
}

export const isNotFound = (err) => err instanceof HttpError && (err.status === 404 || err.status === 400 || err.status === 410 || err.status === 422);
