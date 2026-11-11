import fs from 'node:fs';
import path from 'node:path';
import { ADAPTERS, adapterById, detectFromUrl, nameMatches, greenhouse, lever, ashby, smartrecruiters, workable, recruitee } from './ats/index.js';
import { DATA, norm, squash, mapLimit, writeFileAtomic, log } from './util.js';
import { loadBoards, saveBoards } from './store.js';

const GUESSABLE = [greenhouse, lever, ashby, smartrecruiters, workable, recruitee];
// These report the company's own name, so a guessed slug can be checked against the spreadsheet name.
const REPORTS_NAME = new Set(['greenhouse', 'smartrecruiters', 'workable', 'recruitee']);
const OVERRIDES = () => path.join(DATA, 'careers_urls.csv');

/** Board ids a company might be registered under, most likely first. */
export function slugCandidates(variants) {
  const out = [];
  for (const v of variants) {
    const words = norm(v).split(' ').filter(Boolean);
    for (const s of [words.join(''), words.join('-')]) {
      // Very short ids are too likely to belong to somebody else.
      if (s.length >= 3 && !out.includes(s)) out.push(s);
    }
  }
  return out.slice(0, 6);
}

function parseCsvLine(line) {
  const out = []; let cur = ''; let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}
const csvCell = (s) => (/[",\n]/.test(String(s)) ? `"${String(s).replace(/"/g, '""')}"` : String(s));

/** data/careers_urls.csv: the user's own "company,careers_url" corrections. They win over guessing. */
export function readOverrides() {
  const f = OVERRIDES();
  const map = new Map();
  if (!fs.existsSync(f)) return map;
  const lines = fs.readFileSync(f, 'utf8').replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
  for (const line of lines.slice(1)) {
    const [company, url] = parseCsvLine(line);
    if (company && url) map.set(squash(company), /^https?:\/\//i.test(url) ? url : `https://${url}`);
  }
  return map;
}

function writeOverridesTemplate(companies, boards, overrides) {
  const rows = ['company,careers_url,why'];
  for (const c of companies) {
    const b = boards[c.key];
    const existing = overrides.get(squash(c.name)) ?? '';
    if (existing || !b || b.status !== 'resolved') rows.push([c.name, existing, b?.note ?? ''].map(csvCell).join(','));
  }
  writeFileAtomic(OVERRIDES(), rows.join('\n') + '\n');
}

async function resolveOne(company, overrideUrl) {
  const base = { company: company.name, key: company.key, checkedAt: new Date().toISOString() };
  const url = overrideUrl || company.careers_url;
  if (url) {
    const hit = detectFromUrl(url);
    if (!hit) return { ...base, status: 'unsupported_site', careers_url: url, note: 'Careers page is not on a supported job-board system; apply there by hand.' };
    const res = await adapterById(hit.ats).list(hit.board);
    if (!res) return { ...base, status: 'unresolved', careers_url: url, note: `The link points to ${hit.ats} board "${hit.board}", which returned nothing. Check the link.` };
    return { ...base, status: 'resolved', ats: hit.ats, board: hit.board, boardName: res.name, confidence: 'your link', total: res.jobs.length };
  }
  const rejected = [];
  let errors = 0, attempts = 0;
  for (const slug of slugCandidates(company.variants)) {
    for (const a of GUESSABLE) {
      attempts++;
      let res;
      try { res = await a.list(slug); } catch { errors++; continue; }
      if (!res) continue;
      if (REPORTS_NAME.has(a.id)) {
        if (nameMatches(res.name, company.variants)) {
          return { ...base, status: 'resolved', ats: a.id, board: slug, boardName: res.name, confidence: 'name verified', total: res.jobs.length };
        }
        rejected.push(`${a.id}/${slug} belongs to "${res.name}"`);
      } else if (slug.length >= 4 && res.jobs.length > 0) {
        // Lever and Ashby do not say whose board it is. Accept an exact-name id, but flag it for a human look.
        return { ...base, status: 'resolved', ats: a.id, board: slug, boardName: '', confidence: 'id only - check', total: res.jobs.length, note: 'Matched by board id alone; confirm it is the right company before applying.' };
      }
    }
  }
  if (attempts && errors === attempts) return { ...base, status: 'error', note: 'Every lookup failed (network?). Will retry next run.' };
  return { ...base, status: 'unresolved', note: rejected.length ? `Not found. Ignored look-alikes: ${rejected.join('; ')}` : 'No public job board found under this name. Add its careers URL to data/careers_urls.csv.' };
}

/**
 * Find the job board of every company. Results are cached in data/boards.json, so an interrupted run
 * resumes where it stopped; `refresh` re-checks everything, and failed lookups are always retried.
 */
export async function discover(companies, { refresh = false, limit = Infinity, concurrency = 5 } = {}) {
  const boards = loadBoards();
  const overrides = readOverrides();
  const todo = companies.filter((c) => {
    const b = boards[c.key];
    const override = overrides.get(squash(c.name));
    if (!b || refresh || b.status === 'error') return true;
    // A link the user has added or changed since the last run must be honoured.
    return Boolean(override) && b.sourceUrl !== override;
  }).slice(0, limit);

  log.info(`Looking up job boards for ${todo.length} companies (${companies.length - todo.length} already known)...`);
  let done = 0, consecutiveErrors = 0, aborted = false;
  await mapLimit(todo, concurrency, async (c) => {
    if (aborted) return;
    const override = overrides.get(squash(c.name));
    let rec;
    try { rec = await resolveOne(c, override); } catch (err) { rec = { company: c.name, key: c.key, status: 'error', note: String(err.message ?? err) }; }
    if (override) rec.sourceUrl = override;
    boards[c.key] = rec;
    consecutiveErrors = rec.status === 'error' ? consecutiveErrors + 1 : 0;
    if (consecutiveErrors >= 15) aborted = true;
    if (++done % 20 === 0 || done === todo.length) { saveBoards(boards); log.info(`  ${done}/${todo.length}`); }
  });
  saveBoards(boards);
  writeOverridesTemplate(companies, boards, overrides);
  if (aborted) throw new Error('15 lookups in a row failed. Check your internet connection (or a firewall/VPN blocking job-board sites) and run again; progress so far is saved.');
  const mine = companies.map((c) => boards[c.key]).filter(Boolean);
  const count = (s) => mine.filter((b) => b.status === s).length;
  return { boards, summary: { resolved: count('resolved'), unresolved: count('unresolved'), unsupported: count('unsupported_site'), errors: count('error') } };
}

export { ADAPTERS };
