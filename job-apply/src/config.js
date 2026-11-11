import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { ROOT } from './util.js';

const DEFAULTS = {
  companies_file: 'data/companies.xlsx',
  sheet: null,
  resume_file: 'data/resume.pdf',
  tiers: [],
  skip_tiers: ['Low Fit'],
  min_match_score: null,
  location_priorities: [],
  search: {
    include_titles: [],
    use_resume_titles: true,
    exclude_titles: [],
    locations: [],
    allow_remote: false,
    keep_unknown_location: false,
    max_years_required: null,
    posted_within_days: null,
    max_jobs_per_company: 2,
  },
  cover_letter: true,
  llm: { provider: 'none', model: 'claude-opus-5-5', effort: 'medium' },
  apply: {
    auto_submit: false,
    allow_llm_answers_in_auto: false,
    max_per_run: 25,
    delay_seconds: [25, 60],
    headless: false,
    captcha_wait_seconds: 180,
  },
};

function loadYaml(file, what) {
  if (!fs.existsSync(file)) {
    throw new Error(`${what} not found at ${file}. Copy ${path.basename(file).replace('.yaml', '.example.yaml')} to ${path.basename(file)} and fill it in.`);
  }
  try {
    return YAML.parse(fs.readFileSync(file, 'utf8')) ?? {};
  } catch (err) {
    throw new Error(`${file} is not valid YAML: ${err.message}`);
  }
}

function compilePatterns(list, name) {
  if (!Array.isArray(list)) throw new Error(`config: ${name} must be a list`);
  return list.map((p) => {
    try {
      return new RegExp(String(p), 'i');
    } catch (err) {
      throw new Error(`config: ${name} contains an invalid regular expression "${p}": ${err.message}`);
    }
  });
}

export function loadConfig(file = path.join(ROOT, 'config.yaml')) {
  const raw = loadYaml(file, 'Config');
  const cfg = {
    ...DEFAULTS,
    ...raw,
    search: { ...DEFAULTS.search, ...(raw.search ?? {}) },
    llm: { ...DEFAULTS.llm, ...(raw.llm ?? {}) },
    apply: { ...DEFAULTS.apply, ...(raw.apply ?? {}) },
  };
  cfg.companies_file = path.resolve(ROOT, cfg.companies_file);
  cfg.resume_file = path.resolve(ROOT, cfg.resume_file);
  cfg.search.includeRe = compilePatterns(cfg.search.include_titles ?? [], 'search.include_titles');
  cfg.search.excludeRe = compilePatterns(cfg.search.exclude_titles ?? [], 'search.exclude_titles');
  const d = cfg.apply.delay_seconds;
  if (!Array.isArray(d) || d.length !== 2 || !(d[0] >= 0) || !(d[1] >= d[0])) {
    throw new Error('config: apply.delay_seconds must be [min, max] with 0 <= min <= max');
  }
  if (!['none', 'anthropic'].includes(cfg.llm.provider)) throw new Error('config: llm.provider must be "none" (free) or "anthropic" (paid)');
  for (const k of ['tiers', 'skip_tiers', 'location_priorities']) {
    if (!Array.isArray(cfg[k])) throw new Error(`config: ${k} must be a list`);
  }
  if (!Array.isArray(cfg.search.locations)) throw new Error('config: search.locations must be a list');
  return cfg;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function loadProfile(file = path.join(ROOT, 'profile.yaml')) {
  const p = loadYaml(file, 'Profile');
  const problems = [];
  for (const k of ['first_name', 'last_name', 'email', 'phone']) {
    if (!String(p[k] ?? '').trim()) problems.push(`${k} is empty`);
  }
  if (p.email && !EMAIL_RE.test(String(p.email).trim())) problems.push(`email "${p.email}" does not look valid`);
  if (p.phone && String(p.phone).replace(/\D/g, '').length < 8) problems.push(`phone "${p.phone}" looks too short`);
  for (const k of ['linkedin', 'github', 'portfolio']) {
    if (p[k] && !/^https?:\/\//i.test(String(p[k]))) problems.push(`${k} must be a full URL starting with https://`);
  }
  p.answers = Array.isArray(p.answers) ? p.answers : [];
  p.answers = p.answers.map((a, i) => {
    if (!a || !a.match || a.answer === undefined || a.answer === null) {
      problems.push(`answers[${i}] needs both "match" and "answer"`);
      return null;
    }
    try {
      return { re: new RegExp(String(a.match), 'i'), answer: String(a.answer) };
    } catch (err) {
      problems.push(`answers[${i}].match is not a valid regular expression: ${err.message}`);
      return null;
    }
  }).filter(Boolean);
  if (problems.length) throw new Error(`profile.yaml has problems:\n  - ${problems.join('\n  - ')}`);
  for (const [k, v] of Object.entries(p)) if (typeof v === 'number' || typeof v === 'boolean') if (k !== 'accept_privacy_consent') p[k] = String(v);
  p.authorized_countries = Array.isArray(p.authorized_countries) ? p.authorized_countries.map(String) : [];
  // Remember where the profile lives so answers you give while applying can be saved back to it.
  Object.defineProperty(p, '__file', { value: file, enumerable: false });
  return p;
}
