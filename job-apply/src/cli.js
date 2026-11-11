#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig, loadProfile } from './config.js';
import { readCompanies, selectCompanies } from './companies.js';
import { discover } from './discover.js';
import { search, prepare } from './pipeline.js';
import { applyAll } from './apply/apply.js';
import { parseResume, loadResume, RESUME_JSON } from './resume.js';
import { loadState, loadBoards, writeTracker } from './store.js';
import { hasApiKey } from './llm.js';
import { launchHeadless } from './browser.js';
import { DATA, ROOT, ensureDir, log } from './util.js';

const HELP = `job-apply - find matching openings, tailor your resume and cover letter, fill in the applications

Usage: node src/cli.js <command> [options]

  doctor              Check that everything is set up before the first run
  init                Create data/resume.json for your resume (run once; check it against your resume)
  discover            Find each company's public job board      [--refresh] [--limit N]
  search              Fetch openings and keep the relevant ones
  prepare             Write a tailored resume + cover letter per job   [--limit N] [--redo]
  apply               Go through the jobs one by one with you, then the other companies' careers sites
                                                                 [--limit N] [--only <company>] [--no-sites] [--dry-run]
  status              Show counts and rebuild data/tracker.xlsx
  run                 discover + search + prepare + apply, in order

For every application it fills in what it knows, asks you in this terminal for anything it does not know,
shows you everything on the form, and submits only after you confirm. --dry-run fills forms and takes a
screenshot without asking or submitting anything.`;

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const opts = {};
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (!a.startsWith('--')) throw new Error(`Unexpected argument "${a}". Run with --help.`);
    const key = a.slice(2);
    if (['refresh', 'redo', 'no-sites', 'dry-run', 'help'].includes(key)) opts[key] = true;
    else if (['limit', 'only'].includes(key)) {
      const v = rest[++i];
      if (v === undefined || v.startsWith('--')) throw new Error(`--${key} needs a value`);
      opts[key] = v;
    } else throw new Error(`Unknown option "${a}". Run with --help.`);
  }
  if (opts.limit !== undefined) {
    const n = Number(opts.limit);
    if (!Number.isInteger(n) || n < 1) throw new Error('--limit must be a whole number of 1 or more');
    opts.limit = n;
  }
  return { command, opts };
}

async function getCompanies(cfg) {
  const { companies, issues, sheet } = await readCompanies(cfg.companies_file, { sheet: cfg.sheet });
  const selected = selectCompanies(companies, cfg);
  log.info(`Company list: sheet "${sheet}", ${companies.length} unique companies, ${selected.length} selected by your tier/score settings.`);
  if (issues.length) {
    fs.writeFileSync(path.join(ensureDir(DATA), 'company_list_issues.txt'), issues.join('\n') + '\n');
    log.info(`  ${issues.length} rows needed attention (duplicates merged, blanks skipped) - see data/company_list_issues.txt`);
  }
  if (!selected.length) throw new Error('No companies left after filtering. Loosen tiers / skip_tiers / min_match_score in config.yaml.');
  return selected;
}

const resumeTitles = () => { try { return loadResume().target_titles; } catch { return []; } };

function printStatus(state) {
  const counts = {};
  for (const j of Object.values(state.jobs)) counts[j.status] = (counts[j.status] ?? 0) + 1;
  const boards = Object.values(loadBoards());
  const b = (s) => boards.filter((x) => x.status === s).length;
  log.info(`\nCompanies: ${b('resolved')} with a job board found, ${b('unresolved')} not found, ${b('unsupported_site')} on unsupported sites, ${b('error')} lookup errors`);
  log.info(`Jobs:      ${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', ') || 'none yet'}`);
}

async function doctor() {
  let ok = true;
  const check = (label, fn) => { try { const r = fn(); log.info(`  ok   ${label}${r ? ` - ${r}` : ''}`); } catch (err) { ok = false; log.info(`  FAIL ${label}\n       ${String(err.message).replace(/\n/g, '\n       ')}`); } };
  const major = Number(process.versions.node.split('.')[0]);
  check('Node.js version', () => { if (major < 20) throw new Error(`Node ${process.versions.node} is too old; install Node 20 or newer.`); return process.versions.node; });
  let cfg;
  check('config.yaml', () => { cfg = loadConfig(); });
  check('profile.yaml', () => { loadProfile(); });
  if (cfg) {
    if (cfg.llm.provider === 'anthropic') check('resume PDF', () => { if (!fs.existsSync(cfg.resume_file)) throw new Error(`Not found: ${cfg.resume_file}`); return path.relative(ROOT, cfg.resume_file); });
    try { const c = await getCompanies(cfg); log.info(`  ok   company list - ${c.length} companies`); } catch (err) { ok = false; log.info(`  FAIL company list\n       ${err.message}`); }
  }
  if (cfg?.llm.provider === 'anthropic') check('Anthropic API key', () => { if (!hasApiKey()) throw new Error('ANTHROPIC_API_KEY is not set (needed because llm.provider is "anthropic").'); });
  else log.info('  ok   free mode - no paid service is used');
  check('data/resume.json', () => { if (!fs.existsSync(RESUME_JSON())) throw new Error('Not created yet - run "init".'); const r = loadResume(); if (/^Your Name$/i.test(r.name.trim())) throw new Error('Still the template. Replace it with your own resume.'); return r.name; });
  try { const b = await launchHeadless(); await b.close(); log.info('  ok   browser'); } catch (err) { ok = false; log.info(`  FAIL browser\n       ${err.message}`); }
  try { const r = await fetch('https://boards-api.greenhouse.io/v1/boards/greenhouse', { signal: AbortSignal.timeout(15000) }); log.info(`  ok   job boards reachable (HTTP ${r.status})`); }
  catch (err) { ok = false; log.info(`  FAIL job boards reachable\n       ${err.cause?.code ?? err.message}. Check your connection / VPN / firewall.`); }
  log.info(ok ? '\nAll good.' : '\nFix the items marked FAIL, then run doctor again.');
  return ok;
}

async function main() {
  const { command, opts } = parseArgs(process.argv.slice(2));
  if (!command || command === 'help' || command === '--help' || opts.help) { log.info(HELP); return; }
  ensureDir(DATA);
  if (command === 'doctor') { process.exitCode = (await doctor()) ? 0 : 1; return; }

  const cfg = loadConfig();
  switch (command) {
    case 'init': {
      if (fs.existsSync(RESUME_JSON()) && !opts.redo) throw new Error('data/resume.json already exists. Pass --redo to replace it (your edits to it will be overwritten).');
      if (cfg.llm.provider !== 'anthropic') {
        // Free mode cannot read a PDF into structured data reliably, so the user fills in a template once.
        fs.copyFileSync(path.join(ROOT, 'resume.example.json'), RESUME_JSON());
        log.info('Free mode: created data/resume.json from the template.\nReplace its contents with your own resume (same structure), then run "doctor".');
        return;
      }
      const r = await parseResume(cfg);
      log.info(`Read resume for ${r.name}: ${r.experience.length} roles, ${r.projects.length} projects, ${r.skills.reduce((n, s) => n + s.items.length, 0)} skills.`);
      log.info(`Target titles derived from it: ${r.target_titles.join(', ')}`);
      log.info('\nOpen data/resume.json and check every line against your resume. This file is the only source the tool tailors from.');
      return;
    }
    case 'discover': {
      const companies = await getCompanies(cfg);
      const { summary } = await discover(companies, { refresh: opts.refresh, limit: opts.limit });
      log.info(`Done: ${summary.resolved} found, ${summary.unresolved} not found, ${summary.unsupported} unsupported sites, ${summary.errors} errors.`);
      log.info('Companies without a board are listed in data/careers_urls.csv - paste their careers URL there and run discover again.');
      await writeTracker(loadState());
      return;
    }
    case 'search': {
      const companies = await getCompanies(cfg);
      const { state, added, failed } = await search(companies, cfg, resumeTitles());
      log.info(`Done: ${added} new relevant jobs.${failed ? ` ${failed} boards could not be read this time.` : ''}`);
      printStatus(state); log.info(`Tracker: ${await writeTracker(state)}`);
      return;
    }
    case 'prepare': {
      const { state, prepared, failed } = await prepare(cfg, loadResume(), { limit: opts.limit, redo: opts.redo });
      log.info(`Done: ${prepared} prepared, ${failed} failed.`);
      printStatus(state); log.info(`Tracker: ${await writeTracker(state)}`);
      return;
    }
    case 'apply': {
      const profile = loadProfile();
      const companies = await getCompanies(cfg);
      const base = (() => { try { return loadResume(); } catch { return null; } })();
      const { state } = await applyAll(cfg, profile, companies, { only: opts.only, limit: opts.limit, dryRun: opts['dry-run'], base, sites: !opts['no-sites'] });
      printStatus(state);
      return;
    }
    case 'status': {
      const state = loadState();
      printStatus(state); log.info(`Tracker: ${await writeTracker(state)}`);
      return;
    }
    case 'run': {
      const profile = loadProfile(); // fail early, before any slow step
      const base = loadResume();
      const companies = await getCompanies(cfg);
      await discover(companies, {});
      await search(companies, cfg, base.target_titles);
      await prepare(cfg, base, { limit: opts.limit });
      const { state } = await applyAll(cfg, profile, companies, { limit: opts.limit, dryRun: opts['dry-run'], base, sites: !opts['no-sites'] });
      printStatus(state);
      return;
    }
    default: throw new Error(`Unknown command "${command}". Run with --help.`);
  }
}

main().catch((err) => {
  log.error(err.message ?? String(err));
  if (process.env.JOB_APPLY_DEBUG) console.error(err);
  process.exitCode = 1;
});
