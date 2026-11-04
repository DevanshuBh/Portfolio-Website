import { AppShell, Rich } from '../ui.jsx';
import { experiences } from '../data.js';

const initials = (name) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

const Job = ({ job, current }) => (
  <section className="job">
    <div className="card exp-card">
      <span className="exp-logo">
        {job.logo ? <img src={job.logo} alt="" /> : <span className="exp-initials">{initials(job.company)}</span>}
      </span>
      <div className="exp-head">
        <p className="exp-company">{job.company}</p>
        <p className="exp-role">{job.role}</p>
        <p className="exp-meta">
          {job.duration} · {job.location}
        </p>
      </div>
      {current && <span className="pill pill--green">Current</span>}
    </div>

    {job.stats?.length > 0 && (
      <div className="stat-grid">
        {job.stats.map((s) => (
          <div key={s.label} className="stat-tile">
            <span className="stat-value">{s.value}</span>
            <span className="stat-label">{s.label}</span>
          </div>
        ))}
      </div>
    )}

    <h2 className="section-title">{current ? 'What I build' : 'What I built'}</h2>
    <ol className="bullet-list">
      {job.bullets.map((b, i) => (
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
  </section>
);

const ExperienceApp = ({ goHome, openApp }) => (
  <AppShell title="Experience" onBack={goHome} eyebrow="WORK">
    {experiences.map((job, i) => (
      <div key={`${job.company}-${job.duration}`}>
        {i === 1 && <h2 className="section-title section-title--prev">Previously</h2>}
        <Job job={job} current={i === 0 && /present/i.test(job.duration)} />
      </div>
    ))}

    <button type="button" className="big-btn" onClick={() => openApp('projects')}>
      See my projects
    </button>
  </AppShell>
);

export default ExperienceApp;
