import { AppShell, Cell, Group } from '../ui.jsx';
import { Glyph } from '../icons.jsx';
import { achievements, education } from '../data.js';

const Ring = ({ value, max }) => {
  const r = 42;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, value / max);
  return (
    <svg className="ring" viewBox="0 0 100 100" role="img" aria-label={`CGPA ${value} out of ${max}`}>
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--fill)" strokeWidth="10" />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke="url(#ringGrad)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${c * pct} ${c}`}
        transform="rotate(-90 50 50)"
      />
      <defs>
        <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffb443" />
          <stop offset="1" stopColor="#ff6a00" />
        </linearGradient>
      </defs>
      <text x="50" y="52" textAnchor="middle" className="ring-value">
        {value.toFixed(2)}
      </text>
      <text x="50" y="68" textAnchor="middle" className="ring-label">
        CGPA / {max}
      </text>
    </svg>
  );
};

const EducationApp = ({ goHome, openApp }) => (
  <AppShell title="Education" onBack={goHome}>
    <div className="card edu-card">
      <span className="edu-badge" style={{ background: 'linear-gradient(180deg, #ffb443, #ff7300)' }}>
        {Glyph.cap}
      </span>
      <p className="edu-school">{education.school}</p>
      <p className="edu-degree">{education.degree}</p>
      <p className="edu-meta">
        {education.duration} · {education.location}
      </p>
      <Ring value={education.cgpa} max={10} />
    </div>

    <Group header="Details">
      <Cell title="University" value={education.short} />
      <Cell title="Degree" value="B.Tech" />
      <Cell title="Branch" value="Computer Science Engineering" />
      <Cell title="Duration" value={education.duration} />
      <Cell title="Location" value={education.location} />
      <Cell title="CGPA" value={String(education.cgpa)} />
    </Group>

    <Group header="Certifications" footer="Open Achievements to verify each credential.">
      {achievements.slice(0, 2).map((a) => (
        <Cell key={a.id} title={a.title} subtitle={`${a.issuer} · ${a.date}`} multiline chevron onClick={() => openApp('wallet')} />
      ))}
    </Group>
  </AppShell>
);

export default EducationApp;
