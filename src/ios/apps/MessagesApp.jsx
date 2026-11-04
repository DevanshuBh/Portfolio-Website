import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { Icon } from '../icons.jsx';
import { profile } from '../data.js';
import { formatClock } from '../useDevice.js';

const GREETING = [
  `Hi, I am ${profile.firstName} 👋`,
  "I'm a Full Stack Software Engineer: Java/Spring Boot microservices and event-driven systems on Kafka, Redis & PostgreSQL, plus hands-on GenAI (RAG, GraphRAG, LangGraph).",
  'Tap a question below for an instant answer, or type your own and my AI assistant will reply ✨',
];

const QUESTIONS = [
  {
    q: 'Why should I hire you?',
    a: [
      'Because I handle failure better than most people handle Mondays: retries, a DLQ and idempotency keys, so nothing gets processed twice.',
      'I also ship end to end: Kafka and Spring Boot at the back, React/Next.js at the front, AWS underneath. And 12x write throughput looks great on your dashboards 😉',
    ],
    action: { label: "Let's talk", app: 'gmail' },
  },
  {
    q: 'What do you do at Infinite?',
    a: [
      "I'm an Associate Software Engineer at Infinite Computer Solutions (Oct 2024 – present), building Spring Boot services for a real-time fleet tracking platform: 50K+ active drivers, 15,000+ GPS events/sec.",
      'Highlights: Kafka consumers that never lose a GPS event, a DLQ + batch-bisection recovery that cut triage & replay time by 80%, and 12x PostgreSQL write throughput with COPY-based bulk loads.',
    ],
    action: { label: 'Open Experience', app: 'experience' },
  },
  {
    q: 'Show me your projects',
    a: [
      'SENTINEL — event-driven fraud detection gateway that cut API latency from 2s+ to 50ms.',
      'CORTEX — multi-tenant GraphRAG research platform with LangGraph agents. NEXUS — real-time fleet tracking platform load-tested on a 50K-vehicle model.',
    ],
    action: { label: 'Open Projects', app: 'projects' },
  },
  {
    q: "What's your tech stack?",
    a: [
      'Java 21, Python, TypeScript · Spring Boot, FastAPI, Kafka, Redis · PostgreSQL, pgvector, Neo4j · LangGraph, Bedrock, Ollama · AWS, Terraform, Docker, Kubernetes · React, Next.js.',
    ],
    action: { label: 'Open Skills', app: 'skills' },
  },
  {
    q: 'Where did you study?',
    a: [
      'B.Tech in Computer Science Engineering at Rajiv Gandhi Proudyogiki Vishwavidyalaya (2020 – 2024), CGPA 7.62.',
      'I also hold the Google Data Analytics and Google Advanced Data Analytics Professional Certificates.',
    ],
    action: { label: 'Open Education', app: 'education' },
  },
  {
    q: 'Can I see your resume?',
    a: ['Of course! Here it is 📄'],
    action: { label: 'Open Resume', app: 'resume' },
  },
  {
    q: 'How can I reach you?',
    a: [`Email me at ${profile.email} or connect on LinkedIn. My inbox is always open!`],
    action: { label: 'Write me an email', app: 'gmail' },
  },
  {
    q: 'Tell me a joke',
    a: [
      'Why did the Kafka consumer go to therapy? Too many unresolved offsets. 🥁',
      "I'd tell you a UDP joke too, but you might not get it.",
    ],
  },
];

let uid = 0;
const msg = (from, text, action) => ({ id: ++uid, from, text, action });

// Conversation survives closing and reopening the app during this visit.
let saved = null;

const AI_TIMEOUT_MS = 30000;

// Ask the AI assistant (/api/ask). Resolves to { ok, reply, action } or { ok: false, reason }.
const askAssistant = async (history) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  try {
    const r = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history }),
      signal: controller.signal,
    });
    const isJson = (r.headers.get('content-type') || '').includes('application/json');
    const body = isJson ? await r.json() : null;
    if (r.ok && typeof body?.reply === 'string' && body.reply) {
      const action =
        body.action && typeof body.action.app === 'string' && typeof body.action.label === 'string'
          ? { app: body.action.app, label: body.action.label.slice(0, 40) }
          : undefined;
      return { ok: true, reply: body.reply, action };
    }
    return { ok: false, reason: body?.error || `http_${r.status}` };
  } catch {
    return { ok: false, reason: 'network' };
  } finally {
    clearTimeout(timer);
  }
};

const MessagesApp = ({ goHome, openApp, now }) => {
  const [messages, setMessages] = useState(() => saved?.messages || GREETING.map((t) => msg('them', t)));
  const [asked, setAsked] = useState(() => saved?.asked || []);
  const [typing, setTyping] = useState(false);
  const [draft, setDraft] = useState('');
  const timers = useRef([]);
  const scrollRef = useRef(null);
  const [startTime] = useState(() => formatClock(now));

  useEffect(() => {
    saved = { messages, asked };
  }, [messages, asked]);

  // On close, cancel the typing animation but keep any replies that were still pending.
  const pending = useRef([]);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    const pendingTimers = timers.current; // same array for the component's lifetime
    return () => {
      mounted.current = false;
      pendingTimers.forEach(clearTimeout);
      if (saved && pending.current.length) saved = { ...saved, messages: [...saved.messages, ...pending.current] };
    };
  }, []);

  // Add bubbles now, or straight to the saved conversation if the app was closed meanwhile.
  const deliver = (items) => {
    if (mounted.current) setMessages((m) => [...m, ...items]);
    else if (saved) saved = { ...saved, messages: [...saved.messages, ...items] };
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, typing]);

  // Devanshu "types" each reply bubble in turn.
  const reply = (texts, action) => {
    const items = texts.map((t, i) => msg('them', t, i === texts.length - 1 ? action : undefined));
    pending.current.push(...items);
    setTyping(true);
    let delay = 300;
    items.forEach((item, i) => {
      delay += Math.min(1500, 600 + item.text.length * 6);
      timers.current.push(
        setTimeout(() => {
          pending.current = pending.current.filter((x) => x.id !== item.id);
          if (i === items.length - 1) setTyping(false);
          setMessages((m) => [...m, item]);
        }, delay),
      );
    });
  };

  const ask = (item) => {
    if (typing) return;
    setAsked((a) => [...a, item.q]);
    setMessages((m) => [...m, msg('me', item.q)]);
    reply(item.a, item.action);
  };

  // Typed questions go to the AI assistant; if it's unavailable, offer to send them by email instead.
  const send = async (e) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || typing) return;
    setDraft('');
    const mine = msg('me', text);
    const history = [...messages, mine]
      .filter((m) => !m.local)
      .map((m) => ({ role: m.from === 'me' ? 'user' : 'assistant', content: m.text }))
      .slice(-12);
    setMessages((m) => [...m, mine]);
    setTyping('ai');

    const result = await askAssistant(history);
    if (mounted.current) setTyping(false);
    if (result.ok) {
      deliver([{ ...msg('them', result.reply, result.action), ai: true }]);
      return;
    }
    const busy = result.reason === 'rate_limited';
    deliver([
      {
        ...msg(
          'them',
          busy
            ? "You're asking faster than my AI can think 😅 Give it a few minutes, or send your question straight to my inbox 👇"
            : "My AI assistant is offline right now, but I'd love to read your question. Send it straight to my inbox 👇",
          { label: 'Send it via Gmail', app: 'gmail', payload: { body: text } },
        ),
        local: true,
      },
    ]);
  };

  const remaining = QUESTIONS.filter((x) => !asked.includes(x.q));

  return (
    <div className="app app--messages">
      <header className="msg-nav">
        <button type="button" className="nav-back" onClick={goHome} aria-label="Back to Home">
          {Icon.chevronLeft}
          <span>Home</span>
        </button>
        <button type="button" className="msg-contact" onClick={() => openApp('about')}>
          <img src={profile.avatar} alt="" />
          <span>
            {profile.firstName} <i>{Icon.chevronRight}</i>
          </span>
        </button>
        <span className="msg-nav-spacer" />
      </header>

      <div className="msg-scroll" ref={scrollRef}>
        <p className="msg-stamp">
          <b>iMessage</b>
          <br />
          Today {startTime}
        </p>
        <p className="msg-ai-note">✨ Type any question and my AI assistant answers from my resume.</p>
        <AnimatePresence initial={false}>
          {messages.map((m, i) => {
            const next = messages[i + 1];
            const tail = !next || next.from !== m.from;
            return (
              <motion.div
                key={m.id}
                className={`bubble-row bubble-row--${m.from}`}
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}>
                <div className={`bubble bubble--${m.from} ${tail ? 'bubble--tail' : ''}`}>{m.text}</div>
                {m.action && (
                  <button type="button" className="bubble-action" onClick={() => openApp(m.action.app, m.action.payload)}>
                    {m.action.label} {Icon.chevronRight}
                  </button>
                )}
                {m.ai && <span className="ai-tag">✨ AI assistant · answers from my resume</span>}
              </motion.div>
            );
          })}
          {typing && (
            <motion.div
              key="typing"
              className="bubble-row bubble-row--them"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}>
              <div
                className="bubble bubble--them bubble--tail typing"
                aria-label={typing === 'ai' ? 'AI assistant is thinking' : `${profile.firstName} is typing`}>
                <i />
                <i />
                <i />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {remaining.length > 0 && (
        <div className="quick-replies" role="group" aria-label="Suggested questions">
          {remaining.map((item) => (
            <button key={item.q} type="button" className="quick" onClick={() => ask(item)} disabled={typing}>
              {item.q}
            </button>
          ))}
        </div>
      )}

      <form className="msg-input" onSubmit={send}>
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask anything about my work…"
          aria-label="Ask a question"
          maxLength={800}
        />
        <button type="submit" className="msg-send" disabled={!draft.trim() || typing} aria-label="Send">
          {Icon.arrowUp}
        </button>
      </form>
    </div>
  );
};

export default MessagesApp;
