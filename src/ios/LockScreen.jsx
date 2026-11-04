import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

import { Glyph, Icon } from './icons.jsx';
import { profile } from './data.js';
import { formatClock, formatLongDate } from './useDevice.js';

const notifications = [
  {
    app: 'messages',
    appName: 'MESSAGES',
    bg: 'linear-gradient(180deg, #6af282 0%, #0dbd3c 100%)',
    glyph: Glyph.bubble,
    title: profile.name,
    time: 'now',
    text: `Hi, I am ${profile.firstName} 👋 ${profile.title} — Java, Kafka & GenAI. Swipe up to explore my portfolio.`,
  },
  {
    app: 'gmail',
    appName: 'GMAIL',
    bg: '#ffffff',
    glyph: Glyph.gmail,
    title: 'My inbox is always open',
    time: '1m ago',
    text: 'Want to hire me or just say hi? Tap here to write me an email.',
  },
];

const LockScreen = ({ now, onUnlock, openApp, desktop }) => {
  const dragged = useRef(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const quip = (e, text) => {
    e.stopPropagation();
    clearTimeout(toastTimer.current);
    setToast(text);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (['Enter', ' ', 'ArrowUp', 'Escape'].includes(e.key)) {
        e.preventDefault();
        onUnlock();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onUnlock]);

  const onClick = () => {
    if (!dragged.current) onUnlock();
  };

  return (
    <motion.div
      className="lock"
      initial={false}
      exit={{ y: '-100%', opacity: 0.4 }}
      transition={{ type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.5 }}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.7, bottom: 0.05 }}
      onDragStart={() => {
        dragged.current = true;
      }}
      onDragEnd={(_, info) => {
        if (info.offset.y < -70 || info.velocity.y < -500) onUnlock();
      }}
      onPointerDown={() => {
        dragged.current = false;
      }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label="Lock screen. Press Enter, click or swipe up to unlock">
      <div className="lock-wallpaper" aria-hidden="true" />

      <div className="lock-top">
        <span className="lock-icon">{Icon.lock}</span>
        <p className="lock-date">{formatLongDate(now)}</p>
        <p className="lock-time">{formatClock(now)}</p>
        <p className="lock-tagline">{profile.tagline}</p>
      </div>

      <div className="lock-notifs">
        {notifications.map((n, i) => (
          <motion.button
            type="button"
            key={n.app}
            className="notif"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.35 + i * 0.15, type: 'spring', stiffness: 260, damping: 24 }}
            onClick={(e) => {
              e.stopPropagation();
              if (dragged.current) return;
              onUnlock();
              openApp(n.app);
            }}>
            <span className="notif-icon" style={{ background: n.bg }}>
              {n.glyph}
            </span>
            <span className="notif-body">
              <span className="notif-head">
                <span className="notif-title">{n.title}</span>
                <span className="notif-time">{n.time}</span>
              </span>
              <span className="notif-text">{n.text}</span>
            </span>
          </motion.button>
        ))}
      </div>

      <div className="lock-bottom">
        <button
          type="button"
          className="lock-round"
          aria-label="Flashlight"
          onClick={(e) => quip(e, '🔦 Looking for bugs… 0 found. Swipe up to see why.')}>
          {Icon.flashlight}
        </button>
        <motion.span
          className="lock-hint"
          animate={{ y: [0, -5, 0], opacity: [0.65, 1, 0.65] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}>
          {desktop ? 'Click or swipe up to open' : 'Swipe up to open'}
        </motion.span>
        <button
          type="button"
          className="lock-round"
          aria-label="Camera"
          onClick={(e) => quip(e, "📸 Say cheese! (Kidding. No camera needed, just a quick look at my work.)")}>
          {Icon.camera}
        </button>
      </div>
      {toast && (
        <motion.div
          key={toast}
          className="lock-toast"
          role="status"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}>
          {toast}
        </motion.div>
      )}
      <span className="lock-bar" aria-hidden="true" />
    </motion.div>
  );
};

export default LockScreen;
