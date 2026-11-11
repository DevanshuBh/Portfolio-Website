import { fetchJson, isNotFound } from '../http.js';
import { htmlToText, norm, squash } from '../util.js';

/**
 * One adapter per applicant-tracking system. Each exposes:
 *   fromUrl(url)   -> board id if the URL belongs to this ATS, else null
 *   list(board)    -> { name, jobs[] } or null when the board does not exist
 *   describe(job)  -> full description text (only when list() does not already include it)
 * A job is { id, title, location, remote, url, applyUrl, description, postedAt, department }.
 *
 * `apply` says how far the tool may go on that system:
 *   auto     - single-page form; can be filled and (if you allow it) submitted
 *   assisted - form is filled where possible, but you always press submit yourself
 *   manual   - needs an account / multi-step wizard; the tool opens the page and hands you the documents
 */
const toIso = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};
const REMOTE_RE = /\b(remote|work from home|wfh|anywhere)\b/i;

export const greenhouse = {
  id: 'greenhouse', apply: 'auto',
  fromUrl(u) {
    if (!/^(?:job-boards|boards)(?:\.eu)?\.greenhouse\.io$/.test(u.hostname)) return null;
    const q = u.searchParams.get('for');
    if (q) return q;
    const first = u.pathname.split('/').filter(Boolean)[0];
    return first && first !== 'embed' ? first : null;
  },
  async list(board) {
    let data;
    try {
      data = await fetchJson(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board)}/jobs?content=true`);
    } catch (err) { if (isNotFound(err)) return null; throw err; }
    let name = board;
    try { name = (await fetchJson(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board)}`)).name ?? board; } catch { /* name is only used for verification */ }
    return {
      name,
      jobs: (data.jobs ?? []).map((j) => ({
        id: String(j.id), title: j.title ?? '', location: j.location?.name ?? '',
        remote: REMOTE_RE.test(j.location?.name ?? ''),
        url: j.absolute_url ?? `https://job-boards.greenhouse.io/${board}/jobs/${j.id}`,
        applyUrl: `https://job-boards.greenhouse.io/${board}/jobs/${j.id}`,
        altApplyUrl: `https://boards.greenhouse.io/embed/job_app?for=${board}&token=${j.id}`,
        description: htmlToText(j.content), postedAt: toIso(j.first_published ?? j.updated_at),
        department: (j.departments ?? []).map((d) => d.name).join(', '),
      })),
    };
  },
};

function leverAdapter(id, apiHost, siteHost) {
  return {
    id, apply: 'auto',
    fromUrl(u) { return u.hostname === siteHost ? (/^\/([\w.-]+)/.exec(u.pathname)?.[1] ?? null) : null; },
    async list(board) {
      let data;
      try { data = await fetchJson(`https://${apiHost}/v0/postings/${encodeURIComponent(board)}?mode=json`); }
      catch (err) { if (isNotFound(err)) return null; throw err; }
      if (!Array.isArray(data)) return null;
      return {
        name: board,
        jobs: data.map((j) => {
          const loc = [j.categories?.location, ...(j.categories?.allLocations ?? [])].filter(Boolean);
          const location = [...new Set(loc)].join(' / ');
          const lists = (j.lists ?? []).map((l) => `${l.text}\n${htmlToText(l.content)}`).join('\n\n');
          return {
            id: String(j.id), title: j.text ?? '', location,
            remote: /remote/i.test(j.workplaceType ?? '') || REMOTE_RE.test(location),
            url: j.hostedUrl, applyUrl: j.applyUrl ?? `${j.hostedUrl}/apply`,
            description: [j.descriptionPlain ?? htmlToText(j.description), lists, j.additionalPlain ?? htmlToText(j.additional)].filter(Boolean).join('\n\n'),
            postedAt: toIso(j.createdAt), department: [j.categories?.department, j.categories?.team].filter(Boolean).join(', '),
          };
        }),
      };
    },
  };
}
export const lever = leverAdapter('lever', 'api.lever.co', 'jobs.lever.co');
export const leverEu = leverAdapter('lever-eu', 'api.eu.lever.co', 'jobs.eu.lever.co');

export const ashby = {
  id: 'ashby', apply: 'auto',
  fromUrl(u) { return u.hostname === 'jobs.ashbyhq.com' ? (/^\/([^/]+)/.exec(u.pathname)?.[1] ? decodeURIComponent(/^\/([^/]+)/.exec(u.pathname)[1]) : null) : null; },
  async list(board) {
    let data;
    try { data = await fetchJson(`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(board)}`); }
    catch (err) { if (isNotFound(err)) return null; throw err; }
    if (!Array.isArray(data?.jobs)) return null;
    return {
      name: board,
      jobs: data.jobs.filter((j) => j.isListed !== false).map((j) => {
        const location = [j.location, ...(j.secondaryLocations ?? []).map((s) => s.location)].filter(Boolean).join(' / ');
        return {
          id: String(j.id), title: j.title ?? '', location, remote: j.isRemote === true || REMOTE_RE.test(location),
          url: j.jobUrl, applyUrl: j.applyUrl ?? `${j.jobUrl}/application`,
          description: j.descriptionPlain ?? htmlToText(j.descriptionHtml), postedAt: toIso(j.publishedAt),
          department: [j.department, j.team].filter(Boolean).join(', '),
        };
      }),
    };
  },
};

export const smartrecruiters = {
  id: 'smartrecruiters', apply: 'assisted',
  fromUrl(u) { return /^(jobs|careers)\.smartrecruiters\.com$/.test(u.hostname) ? (/^\/([^/]+)/.exec(u.pathname)?.[1] ?? null) : null; },
  async list(board) {
    const jobs = [];
    for (let offset = 0; offset < 2000; offset += 100) {
      let page;
      try { page = await fetchJson(`https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(board)}/postings?limit=100&offset=${offset}`); }
      catch (err) { if (isNotFound(err)) return null; throw err; }
      const content = page.content ?? [];
      for (const j of content) {
        const l = j.location ?? {};
        const location = l.fullLocation ?? [l.city, l.region, l.country?.toUpperCase?.()].filter(Boolean).join(', ');
        jobs.push({
          id: String(j.id), title: j.name ?? '', location, remote: l.remote === true || REMOTE_RE.test(location),
          url: `https://jobs.smartrecruiters.com/${board}/${j.id}`, applyUrl: `https://jobs.smartrecruiters.com/${board}/${j.id}`,
          description: '', detailUrl: `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(board)}/postings/${j.id}`,
          postedAt: toIso(j.releasedDate), department: j.department?.label ?? '', companyName: j.company?.name,
        });
      }
      if (content.length < 100 || jobs.length >= (page.totalFound ?? 0)) break;
    }
    // This API answers 200 with zero postings for ids that do not exist, so "empty" means "not found".
    if (!jobs.length) return null;
    return { name: jobs[0].companyName ?? board, jobs };
  },
  async describe(job) {
    const d = await fetchJson(job.detailUrl);
    const s = d.jobAd?.sections ?? {};
    return ['companyDescription', 'jobDescription', 'qualifications', 'additionalInformation']
      .map((k) => (s[k]?.text ? `${s[k].title ?? ''}\n${htmlToText(s[k].text)}` : '')).filter(Boolean).join('\n\n');
  },
};

export const workable = {
  id: 'workable', apply: 'assisted',
  fromUrl(u) { return u.hostname === 'apply.workable.com' ? (/^\/([^/]+)/.exec(u.pathname)?.[1] ?? null) : null; },
  async list(board) {
    let data;
    try { data = await fetchJson(`https://apply.workable.com/api/v1/widget/accounts/${encodeURIComponent(board)}?details=true`); }
    catch (err) { if (isNotFound(err)) return null; throw err; }
    if (!Array.isArray(data?.jobs)) return null;
    return {
      name: data.name ?? board,
      jobs: data.jobs.map((j) => {
        const location = [j.city, j.state, j.country].filter(Boolean).join(', ');
        return {
          id: String(j.shortcode ?? j.id), title: j.title ?? '', location, remote: j.telecommuting === true || REMOTE_RE.test(location),
          url: j.url ?? j.shortlink, applyUrl: j.application_url ?? j.url,
          description: htmlToText(j.description), postedAt: toIso(j.published_on ?? j.created_at), department: j.department ?? '',
        };
      }),
    };
  },
};

export const recruitee = {
  id: 'recruitee', apply: 'assisted',
  fromUrl(u) { return /^([\w-]+)\.recruitee\.com$/.exec(u.hostname)?.[1] ?? null; },
  async list(board) {
    let data;
    try { data = await fetchJson(`https://${encodeURIComponent(board)}.recruitee.com/api/offers/`); }
    catch (err) { if (isNotFound(err)) return null; throw err; }
    if (!Array.isArray(data?.offers)) return null;
    return {
      name: data.offers[0]?.company_name ?? board,
      jobs: data.offers.map((j) => ({
        id: String(j.id), title: j.title ?? '', location: j.location ?? [j.city, j.country].filter(Boolean).join(', '),
        remote: j.remote === true || REMOTE_RE.test(j.location ?? ''),
        url: j.careers_url, applyUrl: j.careers_apply_url ?? j.careers_url,
        description: [htmlToText(j.description), htmlToText(j.requirements)].filter(Boolean).join('\n\n'),
        postedAt: toIso(j.published_at ?? j.created_at), department: j.department ?? '',
      })),
    };
  },
};

export const workday = {
  id: 'workday', apply: 'manual',
  // board id is "host|tenant|site", e.g. "acme.wd5.myworkdayjobs.com|acme|External"
  fromUrl(u) {
    const m = /^([\w-]+)\.(wd\d+)\.myworkdayjobs\.com$/.exec(u.hostname);
    if (!m) return null;
    const parts = u.pathname.split('/').filter(Boolean).filter((p) => !/^[a-z]{2}-[A-Z]{2}$/.test(p));
    return parts[0] ? `${u.hostname}|${m[1]}|${parts[0]}` : null;
  },
  async list(board) {
    const [host, tenant, site] = board.split('|');
    const jobs = [];
    for (let offset = 0; offset < 400; offset += 20) {
      let page;
      try {
        page = await fetchJson(`https://${host}/wday/cxs/${tenant}/${site}/jobs`, { method: 'POST', body: { appliedFacets: {}, limit: 20, offset, searchText: '' } });
      } catch (err) { if (isNotFound(err)) return null; throw err; }
      const posts = page.jobPostings ?? [];
      for (const j of posts) {
        if (!j.externalPath) continue;
        jobs.push({
          id: j.bulletFields?.[0] ?? j.externalPath, title: j.title ?? '', location: j.locationsText ?? '',
          remote: REMOTE_RE.test(`${j.locationsText ?? ''} ${j.remoteType ?? ''}`),
          url: `https://${host}/${site}${j.externalPath}`, applyUrl: `https://${host}/${site}${j.externalPath}`,
          description: '', detailUrl: `https://${host}/wday/cxs/${tenant}/${site}${j.externalPath}`,
          postedAt: null, postedText: j.postedOn ?? '', department: '',
        });
      }
      if (posts.length < 20 || jobs.length >= (page.total ?? 0)) break;
    }
    return { name: tenant, jobs };
  },
  async describe(job) {
    const d = await fetchJson(job.detailUrl);
    return htmlToText(d.jobPostingInfo?.jobDescription);
  },
};

export const ADAPTERS = [greenhouse, lever, leverEu, ashby, smartrecruiters, workable, recruitee, workday];
export const adapterById = (id) => ADAPTERS.find((a) => a.id === id);

/** Work out which ATS (if any) a careers URL belongs to. */
export function detectFromUrl(url) {
  let u;
  try { u = new URL(url); } catch { return null; }
  for (const a of ADAPTERS) {
    const board = a.fromUrl(u);
    if (board) return { ats: a.id, board };
  }
  return null;
}

/** Does the name the board reports for itself plausibly belong to this company? */
export function nameMatches(boardName, variants) {
  const b = squash(boardName);
  if (!b) return false;
  return variants.some((v) => {
    const s = squash(v);
    if (!s) return false;
    if (s === b) return true;
    // Allow "MongoDB" vs "MongoDB, Inc." style containment, but only on whole words and for names long
    // enough that a coincidence is unlikely ("Box" must not match "Dropbox").
    const bw = ` ${norm(boardName)} `, vw = ` ${norm(v)} `;
    return Math.min(s.length, b.length) >= 5 && (bw.includes(vw) || vw.includes(bw));
  });
}
