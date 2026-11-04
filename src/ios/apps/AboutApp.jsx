import { useState } from 'react';

import { AppShell, Cell, Group, copyText } from '../ui.jsx';
import { Glyph, Icon } from '../icons.jsx';
import { experience, links, profile } from '../data.js';

const socialRows = [
  { key: 'linkedin', bg: '#0a66c2', glyph: Glyph.linkedin, size: '100%' },
  { key: 'github', bg: '#181717', glyph: Glyph.github, size: '72%' },
  { key: 'kaggle', bg: '#20beff', glyph: Glyph.kaggle, size: '58%' },
  { key: 'medium', bg: '#000', glyph: Glyph.medium, size: '76%' },
  { key: 'leetcode', bg: '#1b1b1d', glyph: Glyph.leetcode, size: '60%' },
];

const MiniIcon = ({ bg, glyph, size }) => (
  <span className="mini-icon" style={{ background: bg }}>
    <span style={{ width: size, height: size, display: 'flex' }}>{glyph}</span>
  </span>
);

const AboutApp = ({ goHome, openApp }) => {
  const [copied, setCopied] = useState(false);

  const copyEmail = async () => {
    if (await copyText(profile.email)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <AppShell title="About Me" onBack={goHome} largeTitle={false} className="app--about">
      <div className="contact-hero">
        <img className="contact-avatar" src={profile.avatar} alt={profile.name} />
        <h1 className="contact-name">{profile.name}</h1>
        <p className="contact-title">{profile.title}</p>
        <p className="contact-sub">
          {experience.role} · {experience.company}
        </p>
        <div className="contact-actions">
          <button type="button" onClick={() => openApp('messages')}>
            {Icon.message}
            <span>message</span>
          </button>
          <a href={profile.phoneHref}>
            {Icon.call}
            <span>call</span>
          </a>
          <button type="button" onClick={() => openApp('gmail')}>
            {Icon.mail}
            <span>mail</span>
          </button>
          <button type="button" onClick={() => openApp('resume')}>
            {Icon.doc}
            <span>resume</span>
          </button>
        </div>
      </div>

      <Group header="Hi, I'm Devanshu 👋">
        <div className="note-text">{profile.summary}</div>
      </Group>

      <Group>
        <a className="contact-row" href={profile.phoneHref}>
          <span className="contact-label">mobile</span>
          <span className="contact-value">{profile.phoneDisplay}</span>
        </a>
        <div className="contact-row contact-row--split">
          <button type="button" className="contact-row-main" onClick={() => openApp('gmail')}>
            <span className="contact-label">email</span>
            <span className="contact-value">{profile.email}</span>
          </button>
          <button type="button" className="copy-btn" onClick={copyEmail} aria-label="Copy email address">
            {copied ? Icon.check : Icon.copy}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
        <button type="button" className="contact-row" onClick={() => openApp('maps')}>
          <span className="contact-label">location</span>
          <span className="contact-value contact-value--plain">{profile.location}</span>
        </button>
      </Group>

      <Group header="Find me on">
        {socialRows.map(({ key, bg, glyph, size }) => (
          <Cell
            key={key}
            icon={<MiniIcon bg={bg} glyph={glyph} size={size} />}
            iconBg="transparent"
            title={links[key].label}
            subtitle={links[key].handle}
            href={links[key].url}
            external
          />
        ))}
      </Group>

      <Group header="Explore">
        <Cell title="Experience" value="Infinite" chevron onClick={() => openApp('experience')} />
        <Cell title="Projects" value="3" chevron onClick={() => openApp('projects')} />
        <Cell title="Skills" value="6 areas" chevron onClick={() => openApp('skills')} />
        <Cell title="Education" value="B.Tech" chevron onClick={() => openApp('education')} />
        <Cell title="Achievements" value="3" chevron onClick={() => openApp('wallet')} />
      </Group>

      <p className="motto">{profile.tagline}</p>
    </AppShell>
  );
};

export default AboutApp;
