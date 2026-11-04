import { useState } from 'react';
import { LayoutGroup, motion } from 'framer-motion';

import { AppShell } from '../ui.jsx';
import { Icon } from '../icons.jsx';
import { achievements } from '../data.js';

const Pass = ({ a, expanded, onToggle }) => (
  <motion.div
    layout
    transition={{ type: 'spring', stiffness: 320, damping: 34 }}
    className={`pass ${expanded ? 'pass--open' : ''}`}
    style={{ background: a.background }}>
    <button
      type="button"
      className="pass-toggle"
      onClick={onToggle}
      aria-expanded={expanded}
      aria-label={`${a.title}${expanded ? ', collapse' : ', show details'}`}>
      <span className="pass-head">
        <span className="pass-logo" style={{ background: a.logoBg }}>
          <img src={a.image} alt="" />
        </span>
        <span className="pass-issuer">{a.issuer}</span>
        {a.date && (
          <span className="pass-field pass-field--right">
            <span className="pass-label">ISSUED</span>
            <span className="pass-val">{a.date}</span>
          </span>
        )}
      </span>
      <span className="pass-title">{a.title}</span>
    </button>
    {expanded && (
      <motion.div
        className="pass-body"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.12 }}>
        <div className="pass-fields">
          <span className="pass-field">
            <span className="pass-label">ISSUER</span>
            <span className="pass-val">{a.issuer}</span>
          </span>
          <span className="pass-field">
            <span className="pass-label">TYPE</span>
            <span className="pass-val">{a.id === 'potm' ? 'Award' : 'Professional Certificate'}</span>
          </span>
        </div>
        <div className="pass-badge" style={{ background: a.logoBg }}>
          <img src={a.image} alt={`${a.title} badge`} />
        </div>
        <a className="pass-verify" href={a.url} target="_blank" rel="noopener noreferrer">
          {Icon.check} Verify credential
        </a>
      </motion.div>
    )}
  </motion.div>
);

const AchievementsApp = ({ goHome }) => {
  const [open, setOpen] = useState(achievements[0].id);

  return (
    <AppShell title="Achievements" onBack={goHome} className="app--wallet" eyebrow="WALLET">
      <p className="wallet-hint">Tap a pass to see the details and verify it.</p>
      <LayoutGroup>
        <div className="pass-stack">
          {achievements.map((a) => (
            <Pass key={a.id} a={a} expanded={open === a.id} onToggle={() => setOpen(open === a.id ? null : a.id)} />
          ))}
        </div>
      </LayoutGroup>
    </AppShell>
  );
};

export default AchievementsApp;
