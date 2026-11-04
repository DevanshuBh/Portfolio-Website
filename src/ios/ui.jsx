import { useRef, useState, Fragment } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { Icon } from './icons.jsx';

// Renders text where **segments** are bold.
export const Rich = ({ text }) => (
  <>
    {text.split('**').map((part, i) =>
      i % 2 === 1 ? <strong key={i}>{part}</strong> : <Fragment key={i}>{part}</Fragment>,
    )}
  </>
);

// iOS navigation bar + scroll area. Large title collapses into the bar on scroll.
export const AppShell = ({
  title,
  backLabel = 'Home',
  onBack,
  right,
  largeTitle = true,
  className = '',
  eyebrow,
  children,
  footer,
}) => {
  const [scrolled, setScrolled] = useState(false);
  const onScroll = (e) => {
    const next = e.currentTarget.scrollTop > (largeTitle ? 38 : 4);
    if (next !== scrolled) setScrolled(next);
  };

  return (
    <div className={`app ${className}`}>
      <header className={`nav ${scrolled ? 'nav--scrolled' : ''}`}>
        <button type="button" className="nav-back" onClick={onBack} aria-label={`Back to ${backLabel}`}>
          {Icon.chevronLeft}
          <span>{backLabel}</span>
        </button>
        <div className="nav-title" style={{ opacity: !largeTitle || scrolled ? 1 : 0 }}>
          {title}
        </div>
        <div className="nav-right">{right}</div>
      </header>
      <div className="app-scroll" onScroll={onScroll}>
        {largeTitle && eyebrow && <p className="large-eyebrow">{eyebrow}</p>}
        {largeTitle && <h1 className="large-title">{title}</h1>}
        {children}
        <div className="app-bottom-space" />
      </div>
      {footer}
    </div>
  );
};

// Push/pop navigation inside an app. `depth` decides the slide direction.
const pushVariants = {
  enter: (dir) => ({ x: dir > 0 ? '100%' : '-28%', opacity: dir > 0 ? 1 : 0.6 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir > 0 ? '-28%' : '100%', opacity: dir > 0 ? 0.6 : 1 }),
};

export const PushStack = ({ viewKey, depth, children }) => {
  const prev = useRef(depth);
  const dir = depth >= prev.current ? 1 : -1;
  prev.current = depth;

  return (
    <div className="push-stack">
      <AnimatePresence initial={false} custom={dir}>
        <motion.div
          key={viewKey}
          className="push-view"
          custom={dir}
          variants={pushVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: 'tween', ease: [0.32, 0.72, 0, 1], duration: 0.38 }}>
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export const Group = ({ header, footer, children, inset = true }) => (
  <section className={`group ${inset ? 'group--inset' : ''}`}>
    {header && <h2 className="group-header">{header}</h2>}
    <div className="group-body">{children}</div>
    {footer && <p className="group-footer">{footer}</p>}
  </section>
);

// A list row. Renders as <a>, <button> or <div> depending on props.
export const Cell = ({ icon, iconBg, title, subtitle, value, chevron, href, onClick, external, accessory, multiline }) => {
  const content = (
    <>
      {icon && (
        <span className="cell-icon" style={{ background: iconBg }}>
          {icon}
        </span>
      )}
      <span className={`cell-main ${multiline ? 'cell-main--multi' : ''}`}>
        <span className="cell-title">{title}</span>
        {subtitle && <span className="cell-subtitle">{subtitle}</span>}
      </span>
      {value && <span className="cell-value">{value}</span>}
      {accessory}
      {external && <span className="cell-chevron">{Icon.external}</span>}
      {chevron && <span className="cell-chevron">{Icon.chevronRight}</span>}
    </>
  );

  if (href) {
    const ext = external || /^https?:/.test(href);
    return (
      <a className="cell cell--tap" href={href} {...(ext ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
        {content}
      </a>
    );
  }
  if (onClick) {
    return (
      <button type="button" className="cell cell--tap" onClick={onClick}>
        {content}
      </button>
    );
  }
  return <div className="cell">{content}</div>;
};

export const Toggle = ({ on = true, label }) => (
  <span className={`toggle ${on ? 'toggle--on' : ''}`} role="img" aria-label={label ? `${label}: on` : 'on'}>
    <span className="toggle-knob" />
  </span>
);

export const Chip = ({ children, color }) => (
  <span className="chip" style={color ? { color, background: `${color}22` } : undefined}>
    {children}
  </span>
);

// Copy text to the clipboard; resolves true on success.
export const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
};
