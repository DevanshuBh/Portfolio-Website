import { useEffect, useLayoutEffect, useState } from 'react';

export const SCREEN_W = 390;
export const SCREEN_H = 844;
export const BEZEL = 14;
const PANEL_MIN_WIDTH = 1100;

const read = () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const framed = w > 500;
  const panel = framed && w >= PANEL_MIN_WIDTH;
  const deviceW = SCREEN_W + BEZEL * 2;
  const deviceH = SCREEN_H + BEZEL * 2;
  const availW = w - 32 - (panel ? 420 : 0);
  const availH = h - 40;
  const scale = Math.max(0.3, Math.min(1, availW / deviceW, availH / deviceH));
  return { framed, panel, scale };
};

// Decides between the framed desktop phone and the full-screen mobile layout.
export const useDevice = () => {
  const [state, setState] = useState(read);

  useLayoutEffect(() => {
    const onResize = () => setState(read());
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
