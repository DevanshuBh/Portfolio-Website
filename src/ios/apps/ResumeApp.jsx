import { useState } from 'react';

import { AppShell, copyText } from '../ui.jsx';
import { Icon } from '../icons.jsx';
import { profile } from '../data.js';

const ResumeApp = ({ goHome }) => {
  const [note, setNote] = useState('');
  const absoluteUrl = () => new URL(profile.resumePdf, window.location.href).href;

  const share = async () => {
    const url = absoluteUrl();
    if (navigator.share) {
      try {
        await navigator.share({ title: `${profile.name} — Resume`, url });
        return;
      } catch (err) {
        if (err?.name === 'AbortError') return;
      }
    }
    const ok = await copyText(url);
    setNote(ok ? 'Link copied' : 'Could not copy the link');
    setTimeout(() => setNote(''), 1800);
  };

  return (
    <AppShell
      title={profile.resumeFileName}
      onBack={goHome}
      largeTitle={false}
      className="app--resume"
      right={
        <button type="button" className="nav-icon-btn" onClick={share} aria-label="Share resume">
          {Icon.share}
        </button>
      }
      footer={
        <div className="toolbar">
          <a className="toolbar-btn toolbar-btn--primary" href={profile.resumePdf} download={profile.resumeFileName}>
            {Icon.download}
            <span>Download PDF</span>
          </a>
          <a className="toolbar-btn" href={profile.resumePdf} target="_blank" rel="noopener noreferrer">
            {Icon.external}
            <span>Open</span>
          </a>
        </div>
      }>
      <div className="file-meta">
        <span className="file-meta-icon">{Icon.doc}</span>
        <span>
          <b>PDF Document</b> · 1 page · 121 KB · 0 typos (hopefully)
        </span>
      </div>
      <a className="paper" href={profile.resumePdf} target="_blank" rel="noopener noreferrer" aria-label="Open resume PDF">
        <img src={profile.resumePreview} alt={`${profile.name} resume, page 1`} />
      </a>
      {note && <div className="toast">{note}</div>}
    </AppShell>
  );
};

export default ResumeApp;
