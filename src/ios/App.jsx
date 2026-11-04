import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { Glyph, Icon, StatusIcons } from './icons.jsx';
import { links, profile } from './data.js';
import { SCREEN_H, SCREEN_W, formatClock, storage, useDevice, useNow } from './useDevice.js';
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
  safari: {
    label: 'Safari',
    bg: '#ffffff',
    glyph: Glyph.compass,
    href: links.classic.url,
    sameTab: true,
    hint: 'Classic portfolio',
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
  const { framed, panel, scale } = useDevice();
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
    const screen = screenRef.current;
    if (fromEl && screen) {
      const s = screen.getBoundingClientRect();
      const r = fromEl.getBoundingClientRect();
      const k = s.width / screen.offsetWidth || 1;
      origin = { x: (r.left + r.width / 2 - s.left) / k, y: (r.top + r.height / 2 - s.top) / k };
    }
    setOpen((prev) => ({ id, payload, origin, n: (prev?.n || 0) + 1 }));
  }, []);

  const goHome = useCallback(() => setOpen(null), []);

  // Keep the URL hash in sync so a specific app can be linked to (e.g. /ios/#gmail).
  useEffect(() => {
    const target = open ? `#${open.id}` : ' ';
    if ((window.location.hash || ' ') !== target) {
      window.history.replaceState(null, '', target === ' ' ? window.location.pathname + window.location.search : target);
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
  const origin = open?.origin || { x: SCREEN_W / 2, y: SCREEN_H * 0.85 };
  // White status bar / home bar over the wallpaper and over always-dark apps.
  const darkChrome = !open || locked || !!current?.darkUI;

  // Home-bar swipe-up gesture.
  const swipe = useRef(null);
  const onBarPointerDown = (e) => {
    swipe.current = e.clientY;
  };
  const onBarPointerUp = (e) => {
    if (swipe.current !== null && swipe.current - e.clientY > 24) goHome();
    swipe.current = null;
  };

  const screen = (
    <div
      ref={screenRef}
      className={`screen ${framed ? 'screen--framed' : 'screen--full'}`}
      style={framed ? { width: SCREEN_W, height: SCREEN_H } : undefined}>
      <div className="wallpaper" aria-hidden="true" />

      {framed && (
        <div className={`statusbar ${darkChrome ? 'statusbar--light' : ''}`}>
          <span className="sb-time">{formatClock(now)}</span>
          <span className="island" aria-hidden="true" />
          <StatusIcons />
        </div>
      )}

      <motion.div
        className="home-layer"
        animate={{ scale: open ? 0.92 : 1, opacity: open ? 0.4 : 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
        aria-hidden={!!open || locked}>
        <HomeScreen apps={APPS} openApp={openApp} now={now} active={!open && !locked} />
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
        {locked && <LockScreen key="lock" now={now} onUnlock={unlock} openApp={openApp} framed={framed} />}
      </AnimatePresence>

      {!locked && (
        <button
          type="button"
          className={`home-bar ${darkChrome ? 'home-bar--light' : ''} ${open ? 'home-bar--active' : ''}`}
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

  if (!framed) return <div className="stage stage--full">{screen}</div>;

  return (
    <div className="stage stage--framed">
      {panel && (
        <aside className="side-panel">
          <img className="side-avatar" src={profile.avatar} alt="" />
          <h1>{profile.name}</h1>
          <p className="side-title">{profile.title}</p>
          <p className="side-tag">{profile.tagline}</p>
          <ul className="side-tips">
            <li>
              <b>Tap an app</b> to open it — each one is a part of my portfolio.
            </li>
            <li>
              <b>Swipe, drag or use ← →</b> to switch home screen pages.
            </li>
            <li>
              <b>Click the bar</b> at the bottom of the phone or press <kbd>Esc</kbd> to go home.
            </li>
            <li>
              <b>Gmail</b> sends an email straight to my inbox.
            </li>
          </ul>
          <div className="side-actions">
            <a className="side-btn side-btn--primary" href={profile.resumePdf} download={profile.resumeFileName}>
              {Icon.download} Download resume
            </a>
            <a className="side-btn" href={links.classic.url}>
              {Icon.globe} Classic portfolio
            </a>
          </div>
        </aside>
      )}
      <div
        className="device-slot"
        style={{ width: (SCREEN_W + 28) * scale, height: (SCREEN_H + 28) * scale }}>
        <div className="device" style={{ transform: `scale(${scale})` }}>
          <span className="device-btn device-btn--action" aria-hidden="true" />
          <span className="device-btn device-btn--vol-up" aria-hidden="true" />
          <span className="device-btn device-btn--vol-down" aria-hidden="true" />
          <span className="device-btn device-btn--power" aria-hidden="true" />
          {screen}
        </div>
      </div>
    </div>
  );
};

export default App;
