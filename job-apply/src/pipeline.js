import fs from 'node:fs';
import path from 'node:path';
import { adapterById } from './ats/index.js';
import { preFilter, experienceOk } from './match.js';
import { loadState, saveState, loadBoards, saveBoards, jobKey, setStatus, alreadyApplied, SENT } from './store.js';
import { tailor, renderResumePdf, renderHtmlPdf, coverLetterHtml, coverLetterText, resumeText } from './resume.js';
import { launchHeadless } from './browser.js';
import { LlmError } from './llm.js';
import { DATA, mapLimit, safeFileName, log, writeFileAtomic } from './util.js';

/** Pull current openings from every resolved board and record the relevant ones. */
export async function search(companies, cfg, extraTitles = []) {
  const boards = loadBoards();
  const state = loadState();
  const targets = companies.filter((c) => boards[c.key]?.status === 'resolved');
  log.info(`Searching ${targets.length} job boards...`);
  let added = 0, done = 0;
  const seenNow = new Set();
  const failedBoards = new Set();

  await mapLimit(targets, 5, async (c) => {
    const b = boards[c.key];
    const adapter = adapterById(b.ats);
    let res;
    try { res = await adapter.list(b.board); }
    catch (err) { b.note = `Search failed: ${err.message}`; failedBoards.add(c.key); return; }
    finally { if (++done % 25 === 0) log.info(`  ${done}/${targets.length}`); }
    if (!res) { b.note = 'Board no longer exists.'; b.total = 0; b.matched = 0; return; }
    b.total = res.jobs.length;

    const candidates = [];
    for (const j of res.jobs) {
      if (!j.id || !j.applyUrl) continue;
      const pf = preFilter(j, cfg.search, extraTitles);
      if (pf.ok) candidates.push(j);
    }
    // Newest first; undated postings last.
    candidates.sort((x, y) => String(y.postedAt ?? '').localeCompare(String(x.postedAt ?? '')));

    let kept = 0;
    for (const j of candidates) {
      const key = jobKey(b.ats, b.board, j.id);
      seenNow.add(key);
      const existing = state.jobs[key];
      if (existing) { if (existing.status !== 'skipped' && existing.status !== 'closed') kept++; continue; }
      if (kept >= cfg.search.max_jobs_per_company) continue;
      let description = j.description;
      if (!description && adapter.describe) {
        try { description = await adapter.describe(j); } catch { description = ''; }
      }
      const exp = experienceOk(description, cfg.search);
      const job = {
        key, company: c.name, companyKey: c.key, ats: b.ats, board: b.board, id: j.id, title: j.title.trim(), location: j.location,
        remote: j.remote, url: j.url || j.applyUrl, applyUrl: j.applyUrl, altApplyUrl: j.altApplyUrl ?? null, description: description ?? '',
        postedAt: j.postedAt, department: j.department, applyMode: adapter.apply, minYears: exp.years, boardConfidence: b.confidence,
        foundAt: new Date().toISOString(), history: [],
      };
      if (!exp.ok) { setStatus(job, 'skipped', exp.reason); state.jobs[key] = job; continue; }
      const dup = alreadyApplied(state, job);
      if (dup) { setStatus(job, 'skipped', `Same role already applied to (${dup.key})`); state.jobs[key] = job; continue; }
      if (!job.description || job.description.length < 200) setStatus(job, 'needs_manual', 'Job description could not be read, so nothing can be tailored. Apply by hand.');
      else setStatus(job, 'new', '');
      state.jobs[key] = job;
      kept++; added++;
    }
    b.matched = kept;
  });

  // A posting that has vanished from its board is closed - but only if that board was actually read this run.
  for (const j of Object.values(state.jobs)) {
    if (['new', 'prepared', 'needs_manual', 'failed'].includes(j.status) && !seenNow.has(j.key) && !failedBoards.has(j.companyKey) && targets.some((c) => c.key === j.companyKey)) {
      setStatus(j, 'closed', 'No longer listed on the job board');
    }
  }
  saveBoards(boards);
  saveState(state);
  return { state, added, failed: failedBoards.size };
}

const outDir = (job) => path.join(DATA, 'out', `${safeFileName(job.company, 30)}__${safeFileName(job.title, 40)}__${safeFileName(job.id, 12)}`);

/** Write a tailored resume and cover letter for every job still waiting for one. */
export async function prepare(cfg, base, { limit = Infinity, redo = false } = {}) {
  const state = loadState();
  const todo = Object.values(state.jobs).filter((j) => j.status === 'new' || (redo && j.status === 'prepared')).slice(0, limit);
  if (!todo.length) return { state, prepared: 0, failed: 0 };
  log.info(`Preparing documents for ${todo.length} jobs...`);
  const browser = await launchHeadless();
  const person = safeFileName(base.name, 40);
  let prepared = 0, failed = 0, fatal = null;
  try {
    for (const job of todo) {
      if (fatal) break;
      try {
        const t = await tailor(cfg, base, job);
        const dir = outDir(job);
        const resumeFile = path.join(dir, `${person}_Resume.pdf`);
        const fit = await renderResumePdf(browser, t.resume, resumeFile, cfg.resume_max_pages ?? 1);
        job.docs = { dir, resume: resumeFile, cover: null, coverTxt: null };
        writeFileAtomic(path.join(dir, 'resume.json'), JSON.stringify(t.resume, null, 2));
        writeFileAtomic(path.join(dir, 'job.txt'), `${job.company}\n${job.title}\n${job.location}\n${job.url}\n\n${job.description}\n`);
        const notes = [...t.notes];
        if (!fit.fits) notes.push(`Resume is ${fit.pages} pages even at ${fit.fontPt}pt`);
        if (t.cover.ok) {
          job.docs.cover = path.join(dir, `${person}_Cover_Letter.pdf`);
          job.docs.coverTxt = path.join(dir, 'cover_letter.txt');
          await renderHtmlPdf(browser, coverLetterHtml(t.resume, job, t.cover.paragraphs), job.docs.cover);
          fs.writeFileSync(job.docs.coverTxt, coverLetterText(t.resume, t.cover.paragraphs));
        } else notes.push(`No cover letter (${t.cover.reason})`);
        job.score = t.score;
        job.tailoredText = resumeText(t.resume);
        setStatus(job, 'prepared', notes.join('; '));
        prepared++;
        log.info(`  ok  ${job.company} - ${job.title}  (keyword match ${t.score.before ?? '?'}% -> ${t.score.after ?? '?'}%)`);
      } catch (err) {
        failed++;
        // Bad key / no network will fail every job the same way: stop instead of burning through the list.
        if (err instanceof LlmError && /API key|Could not reach|Model ".*" was not found/.test(err.message)) fatal = err;
        else { job.prepareError = String(err.message ?? err); log.warn(`${job.company} - ${job.title}: ${job.prepareError}`); }
      }
      saveState(state);
    }
  } finally { await browser.close(); }
  if (fatal) throw fatal;
  return { state, prepared, failed };
}

export { SENT };
