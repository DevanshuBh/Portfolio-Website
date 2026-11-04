import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import emailjs from '@emailjs/browser';

import { Glyph, Icon } from '../icons.jsx';
import { emailjsConfig, profile } from '../data.js';

const EMPTY = { name: '', email: '', subject: '', message: '' };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DEFAULT_SUBJECT = 'Hello from your portfolio 👋';

// The draft survives closing and reopening the app during this visit.
let savedDraft = EMPTY;

const gmailComposeUrl = ({ subject, message }) =>
  `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(profile.email)}&su=${encodeURIComponent(
    subject || DEFAULT_SUBJECT,
  )}&body=${encodeURIComponent(message)}`;

const GmailApp = ({ goHome, payload }) => {
  const [form, setForm] = useState(() => ({
    ...savedDraft,
    ...(payload?.body ? { message: payload.body } : {}),
    ...(payload?.subject ? { subject: payload.subject } : {}),
  }));
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const [toast, setToast] = useState(null);
  const [touched, setTouched] = useState(false);
  const toastTimer = useRef(null);
  const nameRef = useRef(null);

  useEffect(() => {
    savedDraft = status === 'sent' ? EMPTY : form;
  }, [form, status]);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const showToast = (text, kind = 'info', persist = false) => {
    clearTimeout(toastTimer.current);
    setToast({ text, kind });
    if (!persist) toastTimer.current = setTimeout(() => setToast(null), 3200);
  };

  const errors = {
    name: !form.name.trim(),
    email: !EMAIL_RE.test(form.email.trim()),
    message: !form.message.trim(),
  };
  const valid = !errors.name && !errors.email && !errors.message;

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const send = async (e) => {
    e?.preventDefault();
    if (status === 'sending') return;
    setTouched(true);
    if (!valid) {
      if (errors.name) showToast('Add your name so I know who wrote 🙂', 'error');
      else if (errors.email) showToast('Add a valid email so I can reply', 'error');
      else showToast('Write a message first', 'error');
      return;
    }

    const name = form.name.trim();
    const email = form.email.trim();
    const subject = form.subject.trim() || DEFAULT_SUBJECT;
    const message = form.message.trim();

    setStatus('sending');
    showToast('Sending…', 'info', true);
    try {
      await emailjs.send(
        emailjsConfig.serviceId,
        emailjsConfig.templateId,
        {
          from_name: name,
          to_name: profile.name,
          from_email: email,
          to_email: profile.email,
          reply_to: email,
          subject,
          message: `Subject: ${subject}\n\nMessage:\n${message}`,
          sender_name: name,
          sender_email: email,
          user_message: message,
        },
        emailjsConfig.publicKey,
      );
      setStatus('sent');
      showToast('Message sent', 'success');
    } catch (err) {
      console.error(err);
      setStatus('error');
      showToast("Couldn't send. Try again, or use Gmail instead.", 'error', true);
    }
  };

  const reset = () => {
    setForm(EMPTY);
    setTouched(false);
    setStatus('idle');
    setToast(null);
    setTimeout(() => nameRef.current?.focus(), 50);
  };

  const invalid = (key) => touched && errors[key];

  return (
    <div className="app app--gmail">
      <header className="gm-bar">
        <button type="button" className="gm-icon-btn" onClick={goHome} aria-label="Back to Home">
          {Icon.chevronLeft}
        </button>
        <span className="gm-title">{status === 'sent' ? 'Sent' : 'Compose'}</span>
        {status !== 'sent' && (
          <button
            type="button"
            className="gm-icon-btn gm-send"
            onClick={send}
            disabled={status === 'sending'}
            aria-label="Send email">
            {Icon.send}
          </button>
        )}
      </header>

      {status === 'sending' && <div className="gm-progress" aria-hidden="true" />}

      {status === 'sent' ? (
        <motion.div
          className="gm-sent"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 26 }}>
          <span className="gm-sent-icon">{Icon.check}</span>
          <h1>Message sent!</h1>
          <p>
            Thanks{form.name.trim() ? `, ${form.name.trim().split(/\s+/)[0]}` : ''}! Your email is in my inbox. I&apos;ll get back
            to you at <b>{form.email.trim()}</b>.
          </p>
          <button type="button" className="big-btn" onClick={reset}>
            Write another email
          </button>
          <button type="button" className="big-btn big-btn--plain" onClick={goHome}>
            Back to Home
          </button>
        </motion.div>
      ) : (
        <form className="gm-form" onSubmit={send} noValidate>
          <div className="gm-row">
            <span className="gm-label">To</span>
            <span className="gm-chip">
              <img src={profile.avatar} alt="" />
              <span>
                {profile.name} <small>&lt;{profile.email}&gt;</small>
              </span>
            </span>
          </div>
          <div className={`gm-row ${invalid('name') ? 'gm-row--error' : ''}`}>
            <label htmlFor="gm-name" className="gm-label">
              Name
            </label>
            <input
              ref={nameRef}
              id="gm-name"
              name="name"
              value={form.name}
              onChange={onChange}
              placeholder="Your name"
              autoComplete="name"
              maxLength={100}
              required
            />
          </div>
          <div className={`gm-row ${invalid('email') ? 'gm-row--error' : ''}`}>
            <label htmlFor="gm-email" className="gm-label">
              From
            </label>
            <input
              id="gm-email"
              name="email"
              type="email"
              value={form.email}
              onChange={onChange}
              placeholder="you@example.com"
              autoComplete="email"
              inputMode="email"
              maxLength={150}
              required
            />
          </div>
          <div className="gm-row">
            <input
              id="gm-subject"
              name="subject"
              value={form.subject}
              onChange={onChange}
              placeholder="Subject"
              aria-label="Subject"
              maxLength={150}
              className="gm-subject"
            />
          </div>
          <textarea
            name="message"
            value={form.message}
            onChange={onChange}
            placeholder="Compose email — want to hire me, collaborate, or just say hi? My inbox is always open."
            aria-label="Message"
            className={`gm-body ${invalid('message') ? 'gm-body--error' : ''}`}
            maxLength={5000}
            required
          />
          <div className="gm-foot">
            <button type="submit" className="gm-fab" disabled={status === 'sending'}>
              {Icon.send}
              <span>{status === 'sending' ? 'Sending…' : 'Send'}</span>
            </button>
            <a className="gm-alt" href={gmailComposeUrl(form)} target="_blank" rel="noopener noreferrer">
              <span className="gm-alt-icon">{Glyph.gmail}</span>
              Open in Gmail instead
            </a>
          </div>
        </form>
      )}

      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.text}
            className={`snackbar snackbar--${toast.kind}`}
            role="status"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}>
            <span>{toast.text}</span>
            {status === 'error' && (
              <a href={gmailComposeUrl(form)} target="_blank" rel="noopener noreferrer">
                Use Gmail
              </a>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GmailApp;
