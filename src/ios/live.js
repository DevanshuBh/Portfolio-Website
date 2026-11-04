import { useEffect, useState } from 'react';

// Live widget data from /api/live, fetched once per visit and shared by all widgets.
let request = null;

const loadLive = () => {
  if (!request) {
    request = fetch('/api/live', { headers: { Accept: 'application/json' } })
      .then((r) => {
        const type = r.headers.get('content-type') || '';
        if (!r.ok || !type.includes('application/json')) throw new Error(`live data unavailable (${r.status})`);
        return r.json();
      })
      .catch(() => null);
  }
  return request;
};

// Returns { status: 'loading' | 'ready' | 'error', data } for one source: 'github' | 'medium' | 'leetcode'.
export const useLive = (source) => {
  const [state, setState] = useState({ status: 'loading', data: null });

  useEffect(() => {
    let alive = true;
    loadLive().then((all) => {
      if (!alive) return;
      const data = all?.[source] ?? null;
      setState(data ? { status: 'ready', data } : { status: 'error', data: null });
    });
    return () => {
      alive = false;
    };
  }, [source]);

  return state;
};

// Only allow http(s) links from live data.
export const safeUrl = (url, fallback) => {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : fallback;
  } catch {
    return fallback;
  }
};
