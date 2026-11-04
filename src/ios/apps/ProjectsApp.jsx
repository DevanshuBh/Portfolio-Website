import { useState } from 'react';

import { AppShell, Chip, PushStack, Rich } from '../ui.jsx';
import { Icon } from '../icons.jsx';
import { projects } from '../data.js';
import { diagrams } from '../diagrams.js';
import ArchDiagram from '../ArchDiagram.jsx';

const ShieldGlyph = () => (
  <svg viewBox="0 0 64 64" aria-hidden="true">
    <path d="M32 6 52 13v17c0 13.5-8.6 23.4-20 28-11.4-4.6-20-14.5-20-28V13z" fill="#ff6b6b" />
    <path d="M32 6 52 13v17c0 13.5-8.6 23.4-20 28z" fill="#e0313f" />
    <path d="m22 31 7 7 13-14" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ProjectLogo = ({ project, size = 48 }) => (
  <span
    className="proj-logo"
    style={{ width: size, height: size, background: project.id === 'sentinel' ? '#2a0a10' : '#0f1424' }}>
    {project.logo ? <img src={project.logo} alt="" /> : <ShieldGlyph />}
  </span>
);

// Artwork for a project card: its screenshot, or generated art when there is none.
const ProjectArt = ({ project }) =>
  project.image ? (
    <img className="proj-art-img" src={project.image} alt={`${project.name} screenshot`} loading="lazy" />
  ) : (
    <span className="proj-art-gen" style={{ background: project.gradient }}>
      <span className="proj-art-shield">
        <ShieldGlyph />
      </span>
      <span className="proj-art-metric">
        2s+ <span>→</span> 50ms
      </span>
      <span className="proj-art-caption">Kafka · Resilience4j · Redis · FastAPI</span>
    </span>
  );

const ProjectList = ({ onOpen }) => (
  <>
    {projects.map((p, i) => (
      <button key={p.id} type="button" className="today-card" onClick={() => onOpen(p.id)}>
        <span className="today-art">
          <ProjectArt project={p} />
          <span className="today-overlay">
            <span className="today-kicker">{i === 0 ? 'FEATURED PROJECT' : 'PROJECT'}</span>
            <span className="today-name">{p.name}</span>
            <span className="today-sub">{p.subtitle}</span>
          </span>
        </span>
        <span className="today-foot">
          <ProjectLogo project={p} size={40} />
          <span className="today-foot-text">
            <span className="today-foot-title">{p.name}</span>
            <span className="today-foot-sub">{p.headline}</span>
          </span>
          <span className="get-btn">VIEW</span>
        </span>
      </button>
    ))}
    <p className="list-foot">Tap a project for the full story. More are compiling… ☕</p>
  </>
);

const ProjectDetail = ({ project }) => (
  <>
    <div className="pd-head">
      <ProjectLogo project={project} size={96} />
      <div className="pd-head-text">
        <h1 className="pd-name">{project.name}</h1>
        <p className="pd-sub">{project.subtitle}</p>
        <a className="get-btn get-btn--solid" href={project.url} target="_blank" rel="noopener noreferrer">
          View on GitHub
        </a>
      </div>
    </div>

    <div className="pd-metric" style={{ '--accent': project.color }}>
      {project.headline}
    </div>

    <div className="pd-shot">
      <ProjectArt project={project} />
    </div>

    {diagrams[project.id] && (
      <>
        <h2 className="section-title">How it works</h2>
        <ArchDiagram id={project.id} diagram={diagrams[project.id]} />
      </>
    )}

    <h2 className="section-title">Highlights</h2>
    <div className="card pd-highlights">
      {project.highlights.map((h) => (
        <div key={h.title} className="pd-hl">
          <p className="bullet-title" style={{ color: project.color }}>
            {h.title}
          </p>
          <p className="bullet-text">
            <Rich text={h.text} />
          </p>
        </div>
      ))}
    </div>

    {project.patterns?.length > 0 && (
      <>
        <h2 className="section-title">Design patterns</h2>
        <ul className="card pd-patterns">
          {project.patterns.map((pt) => (
            <li key={pt.name} className="pd-pattern">
              <span className="pd-pattern-name" style={{ color: project.color }}>
                {pt.name}
              </span>
              <span className="pd-pattern-where">{pt.where}</span>
            </li>
          ))}
        </ul>
      </>
    )}

    <h2 className="section-title">Built with</h2>
    <div className="chip-row">
      {project.tags.map((t) => (
        <Chip key={t}>{t}</Chip>
      ))}
    </div>

    <a className="big-btn big-btn--link" href={project.url} target="_blank" rel="noopener noreferrer">
      {Icon.external} Open on GitHub
    </a>
  </>
);

const ProjectsApp = ({ goHome, now }) => {
  const [selected, setSelected] = useState(null);
  const project = projects.find((p) => p.id === selected);

  return (
    <PushStack viewKey={selected || 'list'} depth={selected ? 1 : 0}>
      {project ? (
        <AppShell title={project.name} backLabel="Projects" onBack={() => setSelected(null)} largeTitle={false}>
          <ProjectDetail project={project} />
        </AppShell>
      ) : (
        <AppShell
          title="Projects"
          onBack={goHome}
          eyebrow={now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}>
          <ProjectList onOpen={setSelected} />
        </AppShell>
      )}
    </PushStack>
  );
};

export default ProjectsApp;
