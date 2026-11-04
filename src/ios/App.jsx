import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { Glyph, StatusIcons } from './icons.jsx';
import { links } from './data.js';
import { formatClock, formatShortDate, storage, useDevice, useNow } from './useDevice.js';
import LockScreen from './LockScreen.jsx';
import HomeScreen from './HomeScreen.jsx';
import AboutApp from './apps/AboutApp.jsx';
import ExperienceApp from './apps/ExperienceApp.jsx';
import ProjectsApp from './apps/ProjectsApp.jsx';
import SkillsApp from './apps/SkillsApp.jsx';
import EducationApp from './apps/EducationApp.jsx';
import AchievementsApp from './apps/AchievementsApp.jsx';
import ResumeApp from './apps/ResumeApp.jsx';
import TimelineApp from './apps/TimelineApp.jsx';
import MapsApp from './apps/MapsApp.jsx';
import MessagesApp from './apps/MessagesApp.jsx';
import GmailApp from './apps/GmailApp.jsx';
import PhoneApp from './apps/PhoneApp.jsx';

// Every icon on the home screen. Internal apps have a Component; link apps have an href.
export const APPS = {
  about: {
    label: 'About Me',
    bg: 'linear-gradient(180deg, #eceef2 0%, #b8bcc6 100%)',
    glyph: Glyph.person,
    Component: AboutApp,
  },
  experience: {
    label: 'Experience',
    bg: 'linear-gradient(180deg, #5aa2ff 0%, #1b5ddf 100%)',
    glyph: Glyph.briefcase,
    Component: ExperienceApp,
  },
  projects: {
    label: 'Projects',
    bg: 'linear-gradient(180deg, #2bd0ff 0%, #1767e5 100%)',
    glyph: Glyph.code,
    Component: ProjectsApp,
  },
  skills: {
    label: 'Skills',
    bg: 'linear-gradient(180deg, #a7acb4 0%, #5d626a 100%)',
    glyph: Glyph.gear,
    Component: SkillsApp,
  },
  education: {
    label: 'Education',
    bg: 'linear-gradient(180deg, #ffb443 0%, #ff7300 100%)',
    glyph: Glyph.cap,
    Component: EducationApp,
  },
  wallet: {
    label: 'Achievements',
    bg: '#0b0b0d',
    glyph: Glyph.wallet,
    darkUI: true,
    Component: AchievementsApp,
  },
  resume: {
    label: 'Resume',
    bg: 'linear-gradient(180deg, #ffffff 0%, #e6e9ee 100%)',
    glyph: Glyph.doc,
    Component: ResumeApp,
  },
  timeline: {
    label: 'Timeline',
    bg: '#ffffff',
    calendar: true,
    Component: TimelineApp,
  },
  maps: {
    label: 'Maps',
    bg: '#e9f0dc',
    glyph: Glyph.map,
    Component: MapsApp,
  },
  messages: {
    label: 'Messages',
    bg: 'linear-gradient(180deg, #6af282 0%, #0dbd3c 100%)',
    glyph: Glyph.bubble,
    Component: MessagesApp,
  },
  gmail: {
    label: 'Gmail',
    bg: '#ffffff',
    glyph: Glyph.gmail,
    Component: GmailApp,
  },
  phone: {
    label: 'Phone',
    bg: 'linear-gradient(180deg, #6af282 0%, #0dbd3c 100%)',
    glyph: Glyph.phone,
    glyphSize: '64%',
    darkUI: true,
    Component: PhoneApp,
  },
  github: { label: 'GitHub', bg: '#181717', glyph: Glyph.github, glyphSize: '66%', href: links.github.url },
  linkedin: { label: 'LinkedIn', bg: '#0a66c2', glyph: Glyph.linkedin, glyphSize: '100%', href: links.linkedin.url },
  kaggle: { label: 'Kaggle', bg: '#20beff', glyph: Glyph.kaggle, glyphSize: '54%', href: links.kaggle.url },
  medium: { label: 'Medium', bg: '#000000', glyph: Glyph.medium, glyphSize: '70%', href: links.medium.url },
  leetcode: { label: 'LeetCode', bg: '#1b1b1d', glyph: Glyph.leetcode, glyphSize: '56%', href: links.leetcode.url },
};

const readHashApp = () => {
  const id = window.location.hash.replace(/^#\/?/, '');
  return APPS[id]?.Component ? id : null;
};

const App = () => {
  const { desktop } = useDevice();
  const now = useNow();
  const screenRef = useRef(null);

  const [open, setOpen] = useState(() => {
    const id = readHashApp();
    return id ? { id, payload: null, origin: null, n: 0 } : null;
  });
  const [locked, setLocked] = useState(() => !readHashApp() && storage.get('dbios-unlocked') !== '1');

  const unlock = useCallback(() => {
    setLocked(false);
    storage.set('dbios-unlocked', '1');
  }, []);

  // Open an internal app. `fromEl` (an icon) makes the window grow out of it.
  const openApp = useCallback((id, payload = null, fromEl = null) => {
    if (!APPS[id]?.Component) return;
    let origin = null;
    if (fromEl) {
      const r = fromEl.getBoundingClientRect();
      origin = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
    setOpen((prev) => ({ id, payload, origin, n: (prev?.n || 0) + 1 }));
  }, []);

  const goHome = useCallback(() => setOpen(null), []);

  // Keep the URL hash in sync so a specific app can be linked to (e.g. /#gmail).
  useEffect(() => {
    const target = open ? `#${open.id}` : '';
    if (window.location.hash !== target) {
      window.history.replaceState(null, '', target || window.location.pathname + window.location.search);
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && open) goHome();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, goHome]);

  const current = open ? APPS[open.id] : null;
  const AppComponent = current?.Component;
  const origin = open?.origin || { x: window.innerWidth / 2, y: window.innerHeight * 0.85 };
  // White status bar / home bar over the wallpaper and over always-dark apps.
  const lightChrome = !open || locked || !!current?.darkUI;

  // Home-bar swipe-up gesture.
  const swipe = useRef(null);
  const onBarPointerDown = (e) => {
    swipe.current = e.clientY;
  };
  const onBarPointerUp = (e) => {
    if (swipe.current !== null && swipe.current - e.clientY > 24) goHome();
    swipe.current = null;
  };

  return (
    <div ref={screenRef} className={`screen ${desktop ? 'screen--desktop' : 'screen--phone'}`}>
      <div className="wallpaper" aria-hidden="true" />

      {desktop && (
        <div className={`statusbar ${lightChrome ? 'statusbar--light' : ''}`}>
          <span className="sb-time">
            {formatClock(now)}
            <span className="sb-date">{formatShortDate(now)}</span>
          </span>
          <StatusIcons />
        </div>
      )}

      <motion.div
        className="home-layer"
        animate={{ scale: open ? 0.94 : 1, opacity: open ? 0.4 : 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
        aria-hidden={!!open || locked}>
        <HomeScreen apps={APPS} openApp={openApp} now={now} active={!open && !locked} desktop={desktop} />
      </motion.div>

      <AnimatePresence>
        {open && AppComponent && (
          <motion.div
            key={`${open.id}-${open.n}`}
            className="app-window"
            role="dialog"
            aria-label={current.label}
            style={{ transformOrigin: `${origin.x}px ${origin.y}px` }}
            initial={{ scale: 0.14, opacity: 0, borderRadius: 40 }}
            animate={{ scale: 1, opacity: 1, borderRadius: 0 }}
            exit={{ scale: 0.14, opacity: 0, borderRadius: 40 }}
            transition={{ type: 'spring', stiffness: 300, damping: 32, mass: 0.9 }}>
            <AppComponent openApp={openApp} goHome={goHome} payload={open.payload} now={now} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {locked && <LockScreen key="lock" now={now} onUnlock={unlock} openApp={openApp} desktop={desktop} />}
      </AnimatePresence>

      {!locked && (
        <button
          type="button"
          className={`home-bar ${lightChrome ? 'home-bar--light' : ''} ${open ? 'home-bar--active' : ''}`}
          onClick={open ? goHome : undefined}
          onPointerDown={onBarPointerDown}
          onPointerUp={onBarPointerUp}
          tabIndex={open ? 0 : -1}
          aria-label="Go to home screen"
          title={open ? 'Home (Esc)' : undefined}>
          <span />
        </button>
      )}
    </div>
  );
};

export default App;
