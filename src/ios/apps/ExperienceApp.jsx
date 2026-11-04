import { AppShell, Rich } from '../ui.jsx';
import { experience } from '../data.js';

const ExperienceApp = ({ goHome, openApp }) => (
  <AppShell title="Experience" onBack={goHome} eyebrow="WORK">
    <div className="card exp-card">
      <span className="exp-logo">
        <img src={experience.logo} alt="" />
      </span>
      <div className="exp-head">
        <p className="exp-company">{experience.company}</p>
        <p className="exp-role">{experience.role}</p>
        <p className="exp-meta">
          {experience.duration} · {experience.location}
        </p>
      </div>
      <span className="pill pill--green">Current</span>
    </div>

    <div className="stat-grid">
      {experience.stats.map((s) => (
        <div key={s.label} className="stat-tile">
          <span className="stat-value">{s.value}</span>
          <span className="stat-label">{s.label}</span>
        </div>
      ))}
    </div>

    <h2 className="section-title">What I build</h2>
    <ol className="bullet-list">
      {experience.bullets.map((b, i) => (
        <li key={b.title} className="card bullet-card">
          <span className="bullet-num">{i + 1}</span>
          <div>
            <p className="bullet-title">{b.title}</p>
            <p className="bullet-text">
              <Rich text={b.text} />
            </p>
          </div>
        </li>
      ))}
    </ol>

    <button type="button" className="big-btn" onClick={() => openApp('projects')}>
      See my projects
    </button>
  </AppShell>
);

export default ExperienceApp;
