import { useEffect, useLayoutEffect, useState } from 'react';

const read = () => ({
  // Wide screens get an iPad-style layout (one big home page); phones and narrow windows get the iPhone layout.
  desktop: window.innerWidth >= 900 && window.innerHeight >= 560,
});

export const useDevice = () => {
  const [state, setState] = useState(read);

  useLayoutEffect(() => {
    const onResize = () => {
      const next = read();
      setState((prev) => (prev.desktop === next.desktop ? prev : next));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return state;
};

// Current time, refreshed at the top of every minute.
export const useNow = () => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timer;
    const tick = () => {
      const d = new Date();
      setNow(d);
      timer = setTimeout(tick, 60000 - d.getSeconds() * 1000 - d.getMilliseconds() + 20);
    };
    tick();
    return () => clearTimeout(timer);
  }, []);

  return now;
};

export const formatClock = (d) => {
  const h = d.getHours() % 12 || 12;
  return `${h}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export const formatShortDate = (d) =>
  d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

export const formatLongDate = (d) =>
  d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

export const storage = {
  get(key) {
    try {
      return window.sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      window.sessionStorage.setItem(key, value);
    } catch {
      /* storage unavailable (private mode) — ignore */
    }
  },
};
