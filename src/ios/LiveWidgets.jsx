import { useMemo } from 'react';

import { Glyph } from './icons.jsx';
import { links } from './data.js';
import { safeUrl, useLive } from './live.js';

const external = { target: '_blank', rel: 'noopener noreferrer' };

const formatDay = (iso) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

// Last `weeks` columns of the contribution calendar, each column Sunday→Saturday.
const buildGrid = (days, weeks) => {
  if (!days?.length) return Array.from({ length: weeks * 7 }, () => null);
  const last = days[days.length - 1];
  const lastWeekday = new Date(`${last.d}T00:00:00Z`).getUTCDay();
  const count = (weeks - 1) * 7 + lastWeekday + 1;
  const slice = days.slice(-count);
  return [...Array.from({ length: count - slice.length }, () => null), ...slice];
};

export const GitHubWidget = ({ tab, desktop }) => {
  const { status, data } = useLive('github');
  const weeks = desktop ? 30 : 22;
  const cells = useMemo(() => buildGrid(data?.days, weeks), [data, weeks]);
  const href = safeUrl(data?.url, links.github.url);

  return (
    <a
      className="widget widget--4x2 widget--github"
      href={href}
      {...external}
      tabIndex={tab}
      aria-label={
        status === 'ready'
          ? `GitHub: ${data.total} contributions in the last year. Open GitHub profile`
          : 'Open GitHub profile'
      }>
      <span className="iw-head">
        <span className="lw-title">
          <i className="lw-logo lw-logo--github">{Glyph.github}</i>
          GitHub
        </span>
        <span className="iw-sub">
          {status === 'ready' ? `${data.total.toLocaleString('en-US')} contributions in the last year` : `@${links.github.handle}`}
        </span>
      </span>
      {status === 'error' ? (
        <span className="lw-empty">Live activity is on a coffee break ☕ Tap to see my GitHub.</span>
      ) : (
        <span className={`gw-grid ${status === 'loading' ? 'is-loading' : ''}`} style={{ '--weeks': weeks }} aria-hidden="true">
          {cells.map((c, i) => (
            <i
              key={c ? c.d : `pad-${i}`}
              className={`gw-cell gw-l${c ? c.l : 0}`}
              title={c ? `${c.c === null ? '' : `${c.c} contribution${c.c === 1 ? '' : 's'} · `}${formatDay(c.d)}` : undefined}
            />
          ))}
        </span>
      )}
    </a>
  );
};

const LC_LEVELS = [
  { key: 'easy', label: 'Easy', color: '#1cbaba' },
  { key: 'medium', label: 'Med', color: '#ffb700' },
  { key: 'hard', label: 'Hard', color: '#f63737' },
];

export const LeetCodeWidget = ({ tab }) => {
  const { status, data } = useLive('leetcode');
  const href = safeUrl(data?.url, links.leetcode.url);

  return (
    <a
      className="widget widget--2x2 widget--leetcode"
      href={href}
      {...external}
      tabIndex={tab}
      aria-label={status === 'ready' ? `LeetCode: ${data.solved.all} problems solved. Open profile` : 'Open LeetCode profile'}>
      <span className="lw-title">
        <i className="lw-logo">{Glyph.leetcode}</i>
        LeetCode
      </span>
      {status === 'error' ? (
        <span className="lw-empty">Stats are on a break. Tap to see my profile.</span>
      ) : (
        <>
          <span className="lc-total">
            <b>{status === 'ready' ? data.solved.all.toLocaleString('en-US') : '—'}</b> solved
          </span>
          <span className="lc-rows">
            {LC_LEVELS.map(({ key, label, color }) => {
              const solved = data?.solved?.[key] ?? 0;
              const total = data?.total?.[key] || 0;
              const pct = total ? Math.max(solved ? 3 : 0, Math.min(100, (solved / total) * 100)) : 0;
              return (
                <span key={key} className="lc-row">
                  <span className="lc-label">{label}</span>
                  <span className="lc-bar">
                    <i style={{ width: `${pct}%`, background: color }} />
                  </span>
                  <span className="lc-num">{status === 'ready' ? solved : ''}</span>
                </span>
              );
            })}
          </span>
        </>
      )}
    </a>
  );
};

const formatPostDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

export const MediumWidget = ({ tab, desktop }) => {
  const { status, data } = useLive('medium');
  const posts = (data?.posts || []).slice(0, desktop ? 3 : 2);
  const profileUrl = safeUrl(data?.url, links.medium.url);

  return (
    <div className="widget widget--4x2 widget--medium">
      <span className="iw-head">
        <a className="lw-title" href={profileUrl} {...external} tabIndex={tab}>
          <i className="lw-logo lw-logo--medium">{Glyph.medium}</i>
          Medium
        </a>
        <span className="iw-sub">Latest writing</span>
      </span>
      {status === 'loading' ? (
        <span className="mw-list is-loading" aria-hidden="true">
          {Array.from({ length: desktop ? 3 : 2 }, (_, i) => (
            <span key={i} className="mw-skeleton" />
          ))}
        </span>
      ) : posts.length ? (
        <span className="mw-list">
          {posts.map((p) => (
            <a key={p.url} className="mw-post" href={safeUrl(p.url, profileUrl)} {...external} tabIndex={tab}>
              <span className="mw-title">{p.title}</span>
              <span className="mw-date">{formatPostDate(p.date)}</span>
            </a>
          ))}
        </span>
      ) : (
        <a className="lw-empty" href={profileUrl} {...external} tabIndex={tab}>
          Read my articles on Medium ↗
        </a>
      )}
    </div>
  );
};
