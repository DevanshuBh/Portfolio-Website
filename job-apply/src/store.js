import fs from 'node:fs';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { DATA, readJson, writeJson, norm, log } from './util.js';

const STATE_FILE = () => path.join(DATA, 'state.json');
const BOARDS_FILE = () => path.join(DATA, 'boards.json');

/** Statuses that mean "an application may already have reached the employer" - never apply again. */
export const SENT = new Set(['submitted', 'submitting', 'unconfirmed']);

export function loadState() {
  const s = readJson(STATE_FILE(), { version: 1, jobs: {} });
  if (!s.jobs || typeof s.jobs !== 'object') throw new Error(`${STATE_FILE()} has no "jobs" object; restore it from state.json.bak.`);
  return s;
}

export function saveState(state) {
  const f = STATE_FILE();
  if (fs.existsSync(f)) fs.copyFileSync(f, `${f}.bak`);
  writeJson(f, state);
}

export const loadBoards = () => readJson(BOARDS_FILE(), {});
export const saveBoards = (b) => writeJson(BOARDS_FILE(), b);

export const jobKey = (ats, board, id) => `${ats}:${board}:${id}`;
export const jobSignature = (job) => `${job.companyKey}|${norm(job.title)}|${norm(job.location)}`;

export function setStatus(job, status, note = '') {
  job.status = status;
  job.reason = note;
  (job.history ??= []).push({ at: new Date().toISOString(), status, note });
}

/** Has this role (same company, title and location) already been applied to under another posting id? */
export function alreadyApplied(state, job) {
  const sig = jobSignature(job);
  return Object.values(state.jobs).find((j) => j.key !== job.key && SENT.has(j.status) && jobSignature(j) === sig) ?? null;
}

const STATUS_ORDER = ['needs_manual', 'unconfirmed', 'submitting', 'failed', 'prepared', 'new', 'submitted', 'skipped', 'closed'];

/** Rebuild data/tracker.xlsx from the state file. The tracker is a report: edits to it are not read back. */
export async function writeTracker(state, boards = loadBoards()) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Jobs', { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = [
    { header: 'Status', key: 'status', width: 14 }, { header: 'Company', key: 'company', width: 28 },
    { header: 'Title', key: 'title', width: 40 }, { header: 'Location', key: 'location', width: 26 },
    { header: 'Posted', key: 'posted', width: 12 }, { header: 'Min years asked', key: 'minYears', width: 10 },
    { header: 'Keyword match before %', key: 'before', width: 12 }, { header: 'Keyword match after %', key: 'after', width: 12 },
    { header: 'JD keywords you lack', key: 'missing', width: 36 }, { header: 'Note', key: 'reason', width: 50 },
    { header: 'Job link', key: 'url', width: 50 }, { header: 'Resume file', key: 'resume', width: 40 },
    { header: 'Cover letter file', key: 'cover', width: 40 }, { header: 'System', key: 'ats', width: 14 },
    { header: 'How it is applied', key: 'mode', width: 12 }, { header: 'Last update', key: 'updated', width: 20 },
  ];
  const jobs = Object.values(state.jobs).sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || a.company.localeCompare(b.company));
  for (const j of jobs) {
    const row = ws.addRow({
      status: j.status, company: j.company, title: j.title, location: j.location, posted: j.postedAt?.slice(0, 10) ?? '',
      minYears: j.minYears ?? '', before: j.score?.before ?? '', after: j.score?.after ?? '', missing: (j.score?.missing ?? []).join(', '),
      reason: j.reason ?? '', url: j.url, resume: j.docs?.resume ?? '', cover: j.docs?.cover ?? '', ats: j.ats, mode: j.applyMode,
      updated: j.history?.at(-1)?.at?.replace('T', ' ').slice(0, 16) ?? '',
    });
    if (j.url) row.getCell('url').value = { text: j.url, hyperlink: j.url };
  }
  ws.getRow(1).font = { bold: true };
  ws.autoFilter = { from: 'A1', to: { row: 1, column: ws.columns.length } };

  const wc = wb.addWorksheet('Companies', { views: [{ state: 'frozen', ySplit: 1 }] });
  wc.columns = [
    { header: 'Company', key: 'company', width: 34 }, { header: 'Result', key: 'status', width: 18 },
    { header: 'System', key: 'ats', width: 16 }, { header: 'Board', key: 'board', width: 30 },
    { header: 'Board calls itself', key: 'boardName', width: 30 }, { header: 'Confidence', key: 'confidence', width: 16 },
    { header: 'Careers page', key: 'careers_url', width: 44 }, { header: 'Open jobs', key: 'total', width: 10 }, { header: 'Relevant', key: 'matched', width: 10 },
    { header: 'Note', key: 'note', width: 60 },
  ];
  for (const b of Object.values(boards).sort((a, c) => String(a.company).localeCompare(String(c.company)))) wc.addRow(b);
  wc.getRow(1).font = { bold: true };

  const file = path.join(DATA, 'tracker.xlsx');
  try {
    await wb.xlsx.writeFile(file);
    return file;
  } catch (err) {
    // Excel locks an open workbook on Windows; do not lose the report because of that.
    const alt = path.join(DATA, `tracker-${Date.now()}.xlsx`);
    await wb.xlsx.writeFile(alt);
    log.warn(`Could not overwrite tracker.xlsx (${err.code ?? err.message}) - is it open in Excel? Wrote ${alt} instead.`);
    return alt;
  }
}
