import { norm } from './util.js';

/** Smallest number of years of experience the description asks for, or null when it does not say. */
export function minYearsRequired(text) {
  if (!text) return null;
  const found = [];
  // "3+ years", "3-5 years", "3 to 5 yrs", "minimum of 3 years", "at least three years" (digits only)
  const re = /(\d{1,2})\s*\+?\s*(?:(?:-|–|—|to)\s*\d{1,2}\s*\+?\s*)?(?:years?|yrs?)\b/gi;
  for (const m of text.matchAll(re)) {
    const n = Number(m[1]);
    if (n > 25) continue; // "20 years in business", "18 years of age" and similar
    const ctx = text.slice(Math.max(0, m.index - 80), m.index + m[0].length + 80).toLowerCase();
    if (/\b(founded|anniversary|years? old|over the (last|past)|for (over|more than) \d+ years,? (we|our)|years of age)\b/.test(ctx)) continue;
    if (/(experience|exp\b|background|hands-on|working|industry|professional|relevant|track record|developing|building|programming|software|engineering)/.test(ctx)) found.push(n);
  }
  return found.length ? Math.min(...found) : null;
}

export function titleMatches(title, search, extraTitles = []) {
  const t = String(title ?? '');
  if (!t.trim()) return { ok: false, reason: 'no title' };
  const ex = search.excludeRe.find((re) => re.test(t));
  if (ex) return { ok: false, reason: `title excluded by ${ex.source}` };
  if (search.includeRe.some((re) => re.test(t))) return { ok: true };
  if (search.use_resume_titles) {
    const nt = ` ${norm(t)} `;
    if (extraTitles.some((x) => norm(x) && nt.includes(` ${norm(x)} `))) return { ok: true };
  }
  return { ok: false, reason: 'title not relevant' };
}

export function locationMatches(job, search) {
  const loc = norm(job.location);
  if (!search.locations.length) return { ok: true };
  if (search.locations.some((l) => norm(l) && ` ${loc} `.includes(` ${norm(l)} `))) return { ok: true };
  if (job.remote && search.allow_remote) return { ok: true, note: 'remote' };
  if (!loc) return search.keep_unknown_location ? { ok: true, note: 'location not stated' } : { ok: false, reason: 'no location listed' };
  return { ok: false, reason: `location "${job.location}" not in your list` };
}

export function isFresh(job, search, now = Date.now()) {
  if (!search.posted_within_days || !job.postedAt) return true;
  return now - new Date(job.postedAt).getTime() <= search.posted_within_days * 86400000;
}

/** Cheap checks that need only what the listing returns (no description fetch). */
export function preFilter(job, search, extraTitles) {
  const t = titleMatches(job.title, search, extraTitles);
  if (!t.ok) return t;
  const l = locationMatches(job, search);
  if (!l.ok) return l;
  if (!isFresh(job, search)) return { ok: false, reason: 'posting too old' };
  return { ok: true, note: l.note };
}

export function experienceOk(description, search) {
  const years = minYearsRequired(description);
  if (search.max_years_required !== null && search.max_years_required !== undefined && years !== null && years > search.max_years_required) {
    return { ok: false, years, reason: `asks for ${years}+ years (your limit is ${search.max_years_required})` };
  }
  return { ok: true, years };
}
