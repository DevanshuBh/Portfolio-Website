import { useState } from 'react';

import { Icon } from '../icons.jsx';
import { profile } from '../data.js';
import { copyText } from '../ui.jsx';

const PhoneApp = ({ goHome, openApp }) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (await copyText(profile.phoneDisplay)) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  return (
    <div className="app app--phone">
      <header className="phone-nav">
        <button type="button" className="nav-back" onClick={goHome} aria-label="Back to Home">
          {Icon.chevronLeft}
          <span>Home</span>
        </button>
      </header>

      <div className="phone-card">
        <img className="phone-avatar" src={profile.avatar} alt={profile.name} />
        <h1>{profile.name}</h1>
        <p className="phone-number">{profile.phoneDisplay}</p>
        <p className="phone-sub">mobile · {profile.location}</p>

        <div className="phone-actions">
          <button type="button" onClick={() => openApp('messages')}>
            <span>{Icon.message}</span>
            message
          </button>
          <button type="button" onClick={() => openApp('gmail')}>
            <span>{Icon.mail}</span>
            mail
          </button>
          <button type="button" onClick={copy}>
            <span>{copied ? Icon.check : Icon.copy}</span>
            {copied ? 'copied' : 'copy'}
          </button>
        </div>
      </div>

      <div className="phone-call">
        <a className="call-btn" href={profile.phoneHref} aria-label={`Call ${profile.name}`}>
          {Icon.call}
        </a>
        <span>Call</span>
      </div>
    </div>
  );
};

export default PhoneApp;
