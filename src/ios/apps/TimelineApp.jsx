import { AppShell } from '../ui.jsx';
import { timeline } from '../data.js';

const TimelineApp = ({ goHome, now }) => (
  <AppShell
    title="Timeline"
    onBack={goHome}
    eyebrow={now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()}>
    <div className="tl">
      {timeline.map((y) => (
        <section key={y.year} className="tl-year">
          <h2 className={`tl-year-title ${y.year === 'Now' ? 'tl-year-title--now' : ''}`}>{y.year}</h2>
          {y.events.map((e) => (
            <div key={e.title} className="tl-event">
              <span className="tl-when">{e.when}</span>
              <span className="tl-bar" style={{ background: e.color }} />
              <span className="tl-body" style={{ '--tint': e.color }}>
                <span className="tl-title">{e.title}</span>
                <span className="tl-detail">{e.detail}</span>
              </span>
            </div>
          ))}
        </section>
      ))}
    </div>
  </AppShell>
);

export default TimelineApp;
