import { useCallback, useEffect, useRef, useState } from 'react';

import { Icon } from './icons.jsx';
import { experience, profile, projects, skills } from './data.js';

const PAGES = [
  [{ widget: 'profile' }, 'about', 'experience', 'projects', 'skills', 'education', 'wallet', 'resume', 'timeline', 'github', 'linkedin', 'kaggle', 'medium', { widget: 'impact' }],
  [{ widget: 'stack' }, 'leetcode', 'maps'],
];
const DOCK = ['phone', 'gmail', 'messages', 'safari'];

const STACK_CHIPS = ['Java 21', 'Spring Boot', 'Kafka', 'Redis', 'PostgreSQL', 'LangGraph', 'Bedrock', 'AWS', 'Docker', 'React', 'Next.js'];

const CalendarGlyph = ({ now }) => (
  <span className="cal-glyph" aria-hidden="true">
    <span className="cal-day">{now.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}</span>
    <span className="cal-num">{now.getDate()}</span>
  </span>
);

export const AppIcon = ({ app, now, size }) => (
  <span className="app-icon" style={{ background: app.bg, ...(size ? { width: size, height: size } : {}) }}>
    {app.calendar ? (
      <CalendarGlyph now={now} />
    ) : (
      <span className="app-glyph" style={app.glyphSize ? { width: app.glyphSize, height: app.glyphSize } : undefined}>
        {app.glyph}
      </span>
    )}
  </span>
);

const IconButton = ({ id, app, openApp, now, inDock, active }) => {
  const label = inDock ? null : <span className="icon-label">{app.label}</span>;
  const tab = active ? 0 : -1;

  if (app.href) {
    return (
      <a
        className="icon-btn"
        href={app.href}
        {...(app.sameTab ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
        aria-label={app.hint ? `${app.label} — ${app.hint}` : `${app.label} (opens in a new tab)`}
        title={app.hint || app.label}
        tabIndex={tab}
        draggable={false}>
        <AppIcon app={app} now={now} />
        {label}
      </a>
    );
  }

  return (
    <button
      type="button"
      className="icon-btn"
      onClick={(e) => openApp(id, null, e.currentTarget.querySelector('.app-icon'))}
      aria-label={app.label}
      title={app.label}
      tabIndex={tab}>
      <AppIcon app={app} now={now} />
      {label}
    </button>
  );
};

const ProfileWidget = ({ openApp, tab }) => (
  <button
    type="button"
    className="widget widget--2x2 widget--profile"
    onClick={(e) => openApp('about', null, e.currentTarget)}
    tabIndex={tab}
    aria-label="About Devanshu">
    <span className="pw-top">
      <img src={profile.avatar} alt="" className="pw-avatar" draggable={false} />
      <span className="pw-status">
        {Icon.pin} {profile.location.split(',')[0]}
      </span>
    </span>
    <span className="pw-name">{profile.firstName}</span>
    <span className="pw-title">{profile.title}</span>
    <span className="pw-meta">@ {experience.company}</span>
  </button>
);

const ImpactWidget = ({ openApp, tab }) => {
  const sentinel = projects.find((p) => p.id === 'sentinel');
  const stats = [
    { value: '15K+', label: 'GPS events / sec', color: '#ffb340' },
    { value: '12×', label: 'Postgres write throughput', color: '#4ce07a' },
    { value: '80%', label: 'less triage & replay time', color: '#64d2ff' },
    { value: '50ms', label: `${sentinel.name} latency (was 2s+)`, color: '#ff7a95' },
  ];
  return (
    <button
      type="button"
      className="widget widget--4x2 widget--impact"
      onClick={(e) => openApp('experience', null, e.currentTarget)}
      tabIndex={tab}
      aria-label="Impact highlights — open Experience">
      <span className="iw-head">
        <span className="iw-kicker">IMPACT</span>
        <span className="iw-sub">2+ years · Java · Kafka · GenAI</span>
      </span>
      <span className="iw-grid">
        {stats.map((s) => (
          <span key={s.value} className="iw-stat">
            <span className="iw-value" style={{ color: s.color }}>
              {s.value}
            </span>
            <span className="iw-label">{s.label}</span>
          </span>
        ))}
      </span>
    </button>
  );
};

const StackWidget = ({ openApp, tab }) => (
  <button
    type="button"
    className="widget widget--4x2 widget--stack"
    onClick={(e) => openApp('skills', null, e.currentTarget)}
    tabIndex={tab}
    aria-label="Tech stack — open Skills">
    <span className="iw-head">
      <span className="iw-kicker">TECH STACK</span>
      <span className="iw-sub">{skills.reduce((n, g) => n + g.items.length, 0)} skills across {skills.length} areas</span>
    </span>
    <span className="sw-chips">
      {STACK_CHIPS.map((c) => (
        <span key={c} className="sw-chip">
          {c}
        </span>
      ))}
    </span>
  </button>
);

const WIDGETS = { profile: ProfileWidget, impact: ImpactWidget, stack: StackWidget };
const WIDGET_LABELS = { profile: 'Profile', impact: 'Impact', stack: 'Tech Stack' };

const HomeScreen = ({ apps, openApp, now, active }) => {
  const pagesRef = useRef(null);
  const [page, setPage] = useState(0);
  const drag = useRef(null);
  const suppressClick = useRef(false);

  const goToPage = useCallback((i) => {
    const el = pagesRef.current;
    if (!el) return;
    const target = Math.max(0, Math.min(PAGES.length - 1, i));
    el.scrollTo({ left: target * el.clientWidth, behavior: 'smooth' });
  }, []);

  const onScroll = () => {
    const el = pagesRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== page) setPage(i);
  };

  // Arrow keys switch pages while the home screen is showing.
  useEffect(() => {
    if (!active) return undefined;
    const onKey = (e) => {
      if (e.target instanceof HTMLElement && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      if (e.key === 'ArrowRight') goToPage(page + 1);
      if (e.key === 'ArrowLeft') goToPage(page - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, page, goToPage]);

  // Mouse drag to swipe between pages (touch and trackpads scroll natively).
  const onPointerDown = (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    const el = pagesRef.current;
    drag.current = { x: e.clientX, left: el.scrollLeft, moved: false };
  };
  const onPointerMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const el = pagesRef.current;
    const k = el.getBoundingClientRect().width / el.offsetWidth || 1;
    const dx = (e.clientX - d.x) / k;
    if (!d.moved && Math.abs(dx) > 6) {
      d.moved = true;
      el.style.scrollSnapType = 'none';
      el.classList.add('pages--dragging');
    }
    if (d.moved) el.scrollLeft = d.left - dx;
  };
  const endDrag = () => {
    const d = drag.current;
    drag.current = null;
    if (!d?.moved) return;
    const el = pagesRef.current;
    el.classList.remove('pages--dragging');
    suppressClick.current = true;
    const delta = el.scrollLeft - d.left;
    const start = Math.round(d.left / el.clientWidth);
    const next = Math.abs(delta) > el.clientWidth * 0.15 ? start + Math.sign(delta) : start;
    goToPage(next);
    setTimeout(() => {
      el.style.scrollSnapType = '';
    }, 450);
  };
  const onClickCapture = (e) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const tab = active ? 0 : -1;

  return (
    <div className="home">
      <div
        className="pages"
        ref={pagesRef}
        onScroll={onScroll}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onClickCapture={onClickCapture}
        onDragStart={(e) => e.preventDefault()}>
        {PAGES.map((items, pi) => (
          <div className="page" key={pi} aria-label={`Home screen page ${pi + 1}`}>
            <div className="home-grid">
              {items.map((item) => {
                if (typeof item === 'object') {
                  const W = WIDGETS[item.widget];
                  return (
                    <div key={item.widget} className={`widget-slot widget-slot--${item.widget}`}>
                      <W openApp={openApp} tab={pi === page ? tab : -1} />
                      <span className="icon-label widget-label">{WIDGET_LABELS[item.widget]}</span>
                    </div>
                  );
                }
                return (
                  <div key={item} className="icon-slot">
                    <IconButton id={item} app={apps[item]} openApp={openApp} now={now} active={active && pi === page} />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="page-dots" role="tablist" aria-label="Home screen pages">
        {PAGES.map((_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === page}
            aria-label={`Page ${i + 1}`}
            className={`dot ${i === page ? 'dot--on' : ''}`}
            onClick={() => goToPage(i)}
            tabIndex={tab}
          />
        ))}
      </div>

      <nav className="dock" aria-label="Dock">
        {DOCK.map((id) => (
          <IconButton key={id} id={id} app={apps[id]} openApp={openApp} now={now} inDock active={active} />
        ))}
      </nav>
    </div>
  );
};

export default HomeScreen;
