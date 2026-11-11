import fs from 'node:fs';
import ExcelJS from 'exceljs';
import { norm, squash } from './util.js';

const HEADER_ALIASES = {
  company: ['company', 'company name', 'name', 'organisation', 'organization', 'employer'],
  country: ['country'],
  sector: ['sector', 'industry'],
  score: ['resume match score', 'match score', 'score'],
  tier: ['tier'],
  priority: ['location priority', 'priority'],
  careers_url: ['careers url', 'career url', 'careers page', 'career page', 'careers', 'url', 'website', 'link'],
};

function cellText(cell) {
  const v = cell?.value;
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') {
    if (v.richText) return v.richText.map((r) => r.text).join('').trim();
    if (v.hyperlink) return String(v.hyperlink).trim();
    if (v.result !== undefined) return String(v.result ?? '').trim(); // formula cell
    if (v.error) return '';
    if (v instanceof Date) return v.toISOString();
    if (v.text) return String(v.text).trim();
  }
  return String(v).trim();
}

function findHeader(ws) {
  // The header is not always row 1 (title rows, blank rows): scan the first 15 rows.
  for (let r = 1; r <= Math.min(15, ws.rowCount); r++) {
    const map = {};
    ws.getRow(r).eachCell((cell, col) => {
      const h = norm(cellText(cell));
      for (const [key, names] of Object.entries(HEADER_ALIASES)) {
        if (map[key] === undefined && names.includes(h)) map[key] = col;
      }
    });
    if (map.company !== undefined) return { row: r, map };
  }
  return null;
}

const LEGAL_SUFFIX = /\b(inc|incorporated|ltd|limited|llc|llp|plc|corp|corporation|co|company|gmbh|ag|se|sa|sas|bv|nv|ab|oy|as|pte|pvt|private|holdings?)\b\.?/gi;
const GEO_PAREN = /^(india|usa|us|uk|uae|global|emea|apac|europe|singapore|germany|japan|china|canada)$/i;
// Brackets that are remarks about the row rather than another name for the company.
const NOTE_PAREN = /already|listed|duplicate|see above|same as|n\/a|tbc|\?/i;

const stripLegal = (s) => s.replace(LEGAL_SUFFIX, ' ').replace(/[.,]/g, ' ').replace(/\s+/g, ' ').replace(/(\s|^)(&|and)\s*$/i, '').trim();
const parenParts = (name) => [...String(name).matchAll(/\(([^)]*)\)/g)].flatMap((m) => m[1].split('/')).map((p) => p.trim()).filter((p) => p && !GEO_PAREN.test(p) && !NOTE_PAREN.test(p));

/**
 * Names a company may go by, most recognisable first.
 * "Paytm (One97 Communications)" -> ["Paytm", "One97 Communications"]; "MongoDB Inc." -> ["MongoDB", "MongoDB Inc."].
 * A bracket that only names a region ("BlackRock (India)") or is a remark ("(already listed)") is not a name.
 */
export function nameVariants(name) {
  const out = [];
  const push = (s) => {
    for (const v of [stripLegal(s), s.trim()]) if (v && !out.some((o) => squash(o) === squash(v))) out.push(v);
  };
  const main = String(name).replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  if (main) push(main);
  for (const p of parenParts(name)) push(p);
  return out.length ? out : [String(name).trim()];
}

/** Identity of a company for de-duplication: its main name without brackets or legal suffixes. */
export function companyKey(name) {
  const main = String(name).replace(/\([^)]*\)/g, ' ');
  return squash(stripLegal(main)) || squash(main) || squash(name);
}

/**
 * Read the company list. Returns { companies, issues } - issues are things the user should know about
 * (duplicates merged, rows without a name, bad URLs), never thrown, so one bad row cannot stop the run.
 */
export async function readCompanies(file, { sheet } = {}) {
  if (!fs.existsSync(file)) throw new Error(`Company list not found: ${file}`);
  if (/\.xls$/i.test(file)) throw new Error('Old-format .xls is not supported. Open it in Excel and save as .xlsx.');
  const wb = new ExcelJS.Workbook();
  try {
    if (/\.csv$/i.test(file)) await wb.csv.readFile(file);
    else await wb.xlsx.readFile(file);
  } catch (err) {
    throw new Error(`Could not read ${file} (${err.message}). Is it a real .xlsx file, not password-protected, and closed in Excel?`);
  }
  let ws, header;
  if (sheet) {
    ws = wb.worksheets.find((w) => w.name === sheet) ?? wb.worksheets.find((w) => norm(w.name) === norm(sheet));
    if (!ws) throw new Error(`Sheet "${sheet}" not found. Sheets: ${wb.worksheets.map((w) => w.name).join(', ')}`);
    header = findHeader(ws);
  } else {
    for (const w of wb.worksheets) {
      const h = findHeader(w);
      if (h) { ws = w; header = h; break; }
    }
  }
  if (!ws || !header) throw new Error('No sheet with a "Company" column header was found.');

  const issues = [];
  const byKey = new Map();
  const get = (row, key) => (header.map[key] ? cellText(row.getCell(header.map[key])) : '');
  for (let r = header.row + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const name = get(row, 'company').replace(/\s+/g, ' ');
    if (!name) {
      if (row.cellCount && row.values.some((v) => v !== null && v !== undefined && String(v).trim())) issues.push(`Row ${r}: no company name, skipped`);
      continue;
    }
    const scoreRaw = get(row, 'score');
    const score = scoreRaw === '' || Number.isNaN(Number(scoreRaw)) ? null : Number(scoreRaw);
    let url = get(row, 'careers_url');
    if (url && !/^https?:\/\//i.test(url)) url = /^[\w-]+(\.[\w-]+)+/.test(url) ? `https://${url}` : '';
    if (url) {
      try { new URL(url); } catch { issues.push(`Row ${r}: "${url}" is not a valid URL, ignored`); url = ''; }
    }
    const company = {
      name, row: r, country: get(row, 'country'), sector: get(row, 'sector'), score,
      tier: get(row, 'tier'), priority: get(row, 'priority'), careers_url: url, variants: nameVariants(name),
    };
    let key = companyKey(name);
    const aliases = parenParts(name).map(squash);
    company.aliases = aliases;
    // Same main name but different, non-overlapping aliases means two different companies
    // ("GoTo (GoToConnect)" vs "GoTo (Gojek / Tokopedia)"): keep both.
    const clash = byKey.get(key);
    if (clash && aliases.length && clash.aliases.length && !aliases.some((x) => clash.aliases.includes(x))) key = `${key}~${aliases[0]}`;
    company.key = key;
    const prev = byKey.get(key);
    if (prev) {
      issues.push(`Row ${r}: "${name}" duplicates row ${prev.row} ("${prev.name}"), merged`);
      // Keep the better-ranked row but never lose a URL either row carried.
      const rank = (c) => [tierRank(c.tier), -(c.score ?? -Infinity)];
      const [a, b] = [rank(company), rank(prev)];
      const better = a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]) ? company : prev;
      const other = better === company ? prev : company;
      if (other.priority && (!better.priority || other.priority < better.priority)) better.priority = other.priority;
      better.careers_url = better.careers_url || prev.careers_url || company.careers_url;
      for (const v of [...prev.variants, ...company.variants]) if (!better.variants.some((o) => squash(o) === squash(v))) better.variants.push(v);
      byKey.set(key, better);
    } else {
      byKey.set(key, company);
    }
  }
  return { companies: [...byKey.values()], issues, sheet: ws.name };
}

const tierRank = (t) => { const m = /tier\s*(\d)/i.exec(t ?? ''); return m ? Number(m[1]) : 9; };

/** Apply the tier / score / priority filters from config and order best-first. */
export function selectCompanies(companies, cfg) {
  const has = (hay, needles) => needles.some((n) => norm(hay).includes(norm(n)));
  const kept = companies.filter((c) => {
    if (cfg.skip_tiers.length && c.tier && has(c.tier, cfg.skip_tiers)) return false;
    if (cfg.tiers.length && !has(c.tier, cfg.tiers)) return false;
    if (cfg.location_priorities.length && !has(c.priority, cfg.location_priorities)) return false;
    if (cfg.min_match_score !== null && cfg.min_match_score !== undefined && (c.score ?? -Infinity) < cfg.min_match_score) return false;
    return true;
  });
  return kept.sort((a, b) => tierRank(a.tier) - tierRank(b.tier) || String(a.priority).localeCompare(String(b.priority)) || (b.score ?? 0) - (a.score ?? 0) || a.row - b.row);
}
