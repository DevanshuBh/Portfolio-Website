import { useMemo, useState } from 'react';

import { AppShell, Cell, Group, PushStack, Toggle } from '../ui.jsx';
import { Icon } from '../icons.jsx';
import { profile, skills } from '../data.js';

const total = skills.reduce((n, g) => n + g.items.length, 0);

const SkillsApp = ({ goHome, openApp }) => {
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState('');
  const group = skills.find((g) => g.id === selected);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return skills.flatMap((g) =>
      g.items.filter((s) => s.toLowerCase().includes(q) || g.name.toLowerCase().includes(q)).map((s) => ({ s, g })),
    );
  }, [query]);

  return (
    <PushStack viewKey={selected || 'root'} depth={selected ? 1 : 0}>
      {group ? (
        <AppShell title={group.name} backLabel="Skills" onBack={() => setSelected(null)} largeTitle={false}>
          <div className="skill-hero">
            <span className="cell-icon cell-icon--lg" style={{ background: group.color }}>
              {Icon[group.icon]}
            </span>
            <h1>{group.name}</h1>
            <p>{group.items.length} skills from my resume</p>
          </div>
          <Group>
            {group.items.map((s) => (
              <Cell key={s} title={s} accessory={<Toggle label={s} />} />
            ))}
          </Group>
        </AppShell>
      ) : (
        <AppShell title="Skills" onBack={goHome}>
          <label className="search">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2.2" />
              <path d="m15.5 15.5 5 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              placeholder="Search skills (e.g. Kafka)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search skills"
            />
          </label>

          {query.trim() ? (
            <Group header={`${results.length} result${results.length === 1 ? '' : 's'}`}>
              {results.length ? (
                results.map(({ s, g }) => (
                  <Cell
                    key={`${g.id}-${s}`}
                    icon={Icon[g.icon]}
                    iconBg={g.color}
                    title={s}
                    subtitle={g.name}
                    chevron
                    onClick={() => setSelected(g.id)}
                  />
                ))
              ) : (
                <Cell title="No matching skill" subtitle="Try Java, RAG, AWS or React" />
              )}
            </Group>
          ) : (
            <>
              <Group>
                <button type="button" className="cell cell--tap cell--profile" onClick={() => openApp('about')}>
                  <img src={profile.avatar} alt="" className="cell-avatar" />
                  <span className="cell-main">
                    <span className="cell-title cell-title--lg">{profile.name}</span>
                    <span className="cell-subtitle">{profile.title} · 2+ years</span>
                  </span>
                  <span className="cell-chevron">{Icon.chevronRight}</span>
                </button>
              </Group>
              <Group footer={`${total} skills across ${skills.length} areas.`}>
                {skills.map((g) => (
                  <Cell
                    key={g.id}
                    icon={Icon[g.icon]}
                    iconBg={g.color}
                    title={g.name}
                    value={String(g.items.length)}
                    chevron
                    onClick={() => setSelected(g.id)}
                  />
                ))}
              </Group>
            </>
          )}
        </AppShell>
      )}
    </PushStack>
  );
};

export default SkillsApp;
