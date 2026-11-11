import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { fillForm, pageSignals, captchaVisible, validationErrors, findSubmit, findFormFrame } from './filler.js';
import { askUnknowns, printSnapshot, clip } from './ask.js';
import { launchApplyContext, launchHeadless } from '../browser.js';
import { loadState, saveState, loadBoards, setStatus, alreadyApplied, writeTracker } from '../store.js';
import { makeDocs, docsReady } from '../pipeline.js';
import { hasApiKey } from '../llm.js';
import { norm, sleep, log } from '../util.js';

const rand = ([a, b]) => (a + Math.random() * (b - a)) * 1000;
const closedBrowser = (err) => /Target (page|closed)|browser has been closed|context.*closed|Target crashed/i.test(String(err?.message ?? err));

function terminalIO() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return {
    ask: async (q) => { try { return await rl.question(q); } catch { return 'q'; } }, // Ctrl+D / closed input = quit
    print: (s) => console.log(s),
    close: () => rl.close(),
  };
}

const activePage = (context) => context.pages().filter((p) => !p.isClosed()).at(-1) ?? null;

/** Open a clean tab for the next job and close the tabs left from the previous one. */
async function freshPage(context) {
  const page = await context.newPage();
  for (const p of context.pages()) if (p !== page && !p.isClosed()) await p.close().catch(() => {});
  return page;
}

async function pageText(page) {
  let text = '';
  for (const frame of page.frames()) { try { text += '\n' + await frame.evaluate(() => document.body?.innerText ?? ''); } catch { /* cross-origin */ } }
  return text.trim();
}

/** Wait for the site to say what happened after pressing submit. */
async function awaitOutcome(page, frame, cfg, startUrl, say = (s) => log.info(s)) {
  const deadline = Date.now() + 30000;
  let captchaDeadline = null;
  while (Date.now() < (captchaDeadline ?? deadline)) {
    await sleep(1000);
    if (page.isClosed()) return { result: 'unconfirmed', note: 'The page was closed before a confirmation appeared.' };
    const sig = await pageSignals(page).catch(() => null);
    if (sig?.success) return { result: 'submitted', url: page.url(), said: sig.successText };
    if (sig?.duplicate) return { result: 'duplicate' };
    if (await captchaVisible(page)) {
      if (!captchaDeadline) {
        if (cfg.apply.headless) return { result: 'captcha', note: 'A CAPTCHA appeared after submitting.' };
        captchaDeadline = Date.now() + cfg.apply.captcha_wait_seconds * 1000;
        say(`   A CAPTCHA appeared. Solve it in the browser window (waiting up to ${cfg.apply.captcha_wait_seconds}s)...`);
      }
      continue;
    }
    const errs = await validationErrors(frame);
    if (errs.length && page.url() === startUrl) return { result: 'invalid', note: errs.join(' | ') };
  }
  if (captchaDeadline) return { result: 'captcha', note: 'The CAPTCHA was not solved in time.' };
  return { result: 'unconfirmed', note: 'No confirmation message appeared within 30 seconds.' };
}

async function openForm(page, job) {
  const urls = [job.applyUrl, job.altApplyUrl].filter(Boolean);
  let last = { fields: [], frame: page.mainFrame() };
  let clickedApply = false;
  for (const url of urls) {
    let resp;
    try { resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }); }
    catch (err) { if (closedBrowser(err)) throw err; last.error = `Page did not load: ${String(err.message).split('\n')[0]}`; continue; }
    if (resp && (resp.status() === 404 || resp.status() === 410)) return { closed: true };
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    const sig = await pageSignals(page);
    if (sig.duplicate) return { duplicate: true };
    let found = await findFormFrame(page);
    if (found.fields.length < 3) {
      // Some boards show the description first with an "Apply" button that reveals the form.
      const btn = page.getByRole('link', { name: /^(apply( now| for this job| to this job)?|i'?m interested)$/i }).or(page.getByRole('button', { name: /^(apply( now| for this job| to this job)?|i'?m interested)$/i })).first();
      // Only press it when it cannot send anything: a link, or a button that is not a form's submit button.
      const safe = await btn.evaluate((el) => el.tagName === 'A' || (el.getAttribute('type') ?? '').toLowerCase() === 'button' || !el.closest('form')).catch(() => false);
      if (safe && await btn.isVisible().catch(() => false)) {
        clickedApply = true;
        await btn.click({ timeout: 5000 }).catch(() => {});
        await page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {});
        await sleep(1500);
        found = await findFormFrame(page);
      }
    }
    if (found.fields.length >= 3) return { ...found, sig, clickedApply };
    if (sig.closed) return { closed: true };
    last = { ...found, sig };
  }
  return { ...last, noForm: true, clickedApply };
}

/**
 * The review loop for one application, on whatever page is open in the browser:
 * fill what is known -> ask you what is not -> show you the whole form -> wait for your decision.
 * Nothing is submitted unless you choose [s]. Returns { status, note } or { quit: true }.
 */
async function reviewLoop(io, context, cfg, ctx, job, save) {
  const before = job.status;
  for (;;) {
    const page = activePage(context) ?? await context.newPage();
    let fields = [], frame = page.mainFrame(), report = [], snap = { missing: 0, count: 0 };
    try {
      ({ frame, report, fields } = await fillForm(page, ctx, { useLlm: ctx.useLlm }));
    } catch (err) {
      if (closedBrowser(err)) throw err;
      io.print(`   Could not read the page (${String(err.message).split('\n')[0]}).`);
    }
    if (!fields.length) {
      io.print("\n   There is no application form on the current page yet. In the browser, open this job's application form");
      io.print('   (click Apply, and log in or register if the site asks).');
    } else {
      io.print(`\n   Filled ${report.filter((r) => r.status === 'filled').length} field(s) from your profile and documents.`);
      if (ctx.llmError) { io.print(`   (The model could not help: ${ctx.llmError})`); ctx.llmError = null; }
      await askUnknowns(io, frame, report, ctx);
      snap = await printSnapshot(io, frame);
      if (report.some((r) => r.status === 'filled' && r.source === 'model')) io.print('   Some answers above were written by the model - read them carefully.');
    }
    if (await captchaVisible(page).catch(() => false)) io.print('   There is a CAPTCHA on the page: solve it in the browser before submitting.');
    const submit = fields.length ? await findSubmit(frame).catch(() => null) : null;

    io.print(`\n   ${fields.length ? 'Are all the details correct?' : 'What next?'}`);
    if (submit?.kind === 'next') io.print('   This page has a Next/Continue button: check it, click Next in the browser, then press Enter here.');
    io.print(`   ${submit?.kind === 'submit' ? '[s] Yes, submit it   ' : ''}[Enter] Check the page again (after you change something, log in, or go to the next step)`);
    io.print('   [d] I submitted it myself   [l] Later   [k] Skip this job   [q] Quit');
    const choice = norm(await io.ask('   > '));

    if (choice === '') continue;
    if (choice === 'q') return { quit: true };
    if (choice === 'l') return { status: 'needs_manual', note: 'Left for later by you' };
    if (choice === 'k') return { status: 'skipped', note: 'Skipped by you' };
    if (choice === 'd') return { status: 'submitted', note: 'Submitted by you in the browser' };
    if (choice !== 's') { io.print('   Please choose one of the options.'); continue; }

    if (submit?.kind !== 'submit') { io.print('   There is no Submit button on this page.'); continue; }
    if (snap.missing && !/^y/.test(norm(await io.ask(`   ${snap.missing} required field(s) are still empty. Submit anyway? [y/N]: `)))) continue;
    // You may have changed the page meanwhile, so look for the button again.
    const now = await findFormFrame(page);
    const fresh = await findSubmit(now.frame);
    if (fresh?.kind !== 'submit') { io.print('   The Submit button is no longer there. Check the page and choose again.'); continue; }
    save('submitting', '');
    const startUrl = page.url();
    await fresh.button.scrollIntoViewIfNeeded().catch(() => {});
    await fresh.button.click({ timeout: 10000 });
    const out = await awaitOutcome(page, now.frame, cfg, startUrl, io.print);
    if (job.docs?.dir) await page.screenshot({ path: path.join(job.docs.dir, `after-submit-${out.result}.png`), fullPage: true }).catch(() => {});
    if (out.result === 'submitted') {
      io.print(`\n   The site confirmed it${out.said ? `: "${out.said}"` : ''}\n   at ${out.url}\n   A real application normally also brings a confirmation email from the company or its job-board system.`);
      return { status: 'submitted', note: `Confirmed by the site at ${out.url}${out.said ? ` ("${out.said}")` : ''}` };
    }
    if (out.result === 'duplicate') return { status: 'skipped', note: 'The site says you have already applied' };
    if (out.result === 'invalid') {
      save(before, `The site rejected the form: ${out.note}`);
      io.print(`\n   The site did not accept the form: ${out.note}\n   Nothing was sent. Fix it (or answer below) and choose again.`);
      continue;
    }
    io.print(`\n   ${out.note}`);
    for (;;) {
      const a = norm(await io.ask('   Did the application go through? [y] Yes  [n] No, let me fix it  [u] Not sure: '));
      if (a === 'y') return { status: 'submitted', note: 'Submitted (you confirmed it went through)' };
      if (a === 'u') return { status: 'unconfirmed', note: `${out.note} Check your email before applying again.` };
      if (a === 'n') { save(before, 'Submit did not go through'); break; }
    }
  }
}

/** Interactive mode: every application is reviewed and approved by you. */
async function runInteractive(cfg, profile, companies, { only, limit, io, base, sites }) {
  const state = loadState();
  for (const j of Object.values(state.jobs)) {
    if (j.status === 'submitting') setStatus(j, 'unconfirmed', 'The previous run stopped while submitting. Check your email before applying again.');
  }
  state.sites ??= {};
  saveState(state);

  const matchOnly = (name) => !only || norm(name).includes(norm(only));
  const queue = Object.values(state.jobs)
    .filter((j) => ['prepared', 'new', 'needs_manual', 'failed'].includes(j.status) && (j.description ?? '').length > 0 && (!only || j.key === only || matchOnly(j.company)))
    .slice(0, limit);
  const useLlm = cfg.llm.provider === 'anthropic' && hasApiKey();
  let renderer = null;
  const getRenderer = async () => (renderer ??= await launchHeadless());
  const counts = {};
  const finish = (job, status, note) => {
    setStatus(job, status, note); state.jobs[job.key] = job; saveState(state);
    counts[status] = (counts[status] ?? 0) + 1;
    io.print(`   => ${status}${note ? `: ${note}` : ''}`);
  };
  const ensureDocs = async (job) => {
    if (docsReady(job)) return true;
    if (!base) { finish(job, 'failed', 'No documents for this job. Run "prepare" first.'); return false; }
    io.print('   Writing your tailored resume for this job...');
    const notes = await makeDocs(cfg, base, job, await getRenderer());
    if (notes.length) io.print(`   Note: ${notes.join('; ')}`);
    return true;
  };
  const showDocs = (job) => io.print(`   Resume: ${job.docs.resume}${job.docs.cover ? `\n   Cover letter: ${job.docs.cover}` : ''}`);
  const ctxFor = (job) => {
    const coverText = job.docs.coverTxt && fs.existsSync(job.docs.coverTxt) ? fs.readFileSync(job.docs.coverTxt, 'utf8') : '';
    return { cfg, profile, job, useLlm, docs: { resume: job.docs.resume, cover: job.docs.cover && fs.existsSync(job.docs.cover) ? job.docs.cover : null, coverText }, resumeTextValue: job.tailoredText ?? '' };
  };

  const context = await launchApplyContext({ headless: cfg.apply.headless });
  let quit = false;
  try {
    // 1) Jobs found on the companies' job boards.
    if (queue.length) io.print(`\n${queue.length} job(s) to go through. Nothing is submitted until you say so.`);
    for (let i = 0; i < queue.length && !quit; i++) {
      const job = queue[i];
      io.print(`\n[${i + 1}/${queue.length}] ${job.company} - ${job.title} (${job.location || 'location not stated'})\n   ${job.url}`);
      const dup = alreadyApplied(state, job);
      if (dup) { finish(job, 'skipped', `You already applied to this role (${dup.title})`); continue; }
      try {
        if (!(await ensureDocs(job))) continue;
        showDocs(job);
        const page = await freshPage(context);
        const opened = await openForm(page, job);
        if (opened.closed) { finish(job, 'closed', 'The posting is no longer open'); continue; }
        if (opened.duplicate) { finish(job, 'skipped', 'The site says you have already applied'); continue; }
        io.print(`   Opened in the browser: ${page.url()}${opened.clickedApply ? "  (pressed the site's Apply button to show the form)" : ''}`);
        const company = companies.find((c) => c.key === job.companyKey);
        const text = norm(opened.sig?.body ?? '');
        if (!(company?.variants ?? [job.company]).some((v) => norm(v).length >= 3 && text.includes(norm(v)))) io.print(`   Warning: this page does not mention "${job.company}". Make sure it is the right company.`);
        if (/check/.test(job.boardConfidence ?? '')) io.print('   Warning: this job board was matched by name only. Make sure it belongs to this company.');
        const res = await reviewLoop(io, context, cfg, ctxFor(job), job, (s, n) => { setStatus(job, s, n); saveState(state); });
        if (res.quit) { quit = true; break; }
        finish(job, res.status, res.note);
      } catch (err) {
        if (closedBrowser(err)) { quit = true; io.print('   The browser was closed; stopping.'); if (job.status === 'submitting') finish(job, 'unconfirmed', 'Browser closed right after submitting. Check your email.'); break; }
        finish(job, job.status === 'submitting' ? 'unconfirmed' : 'failed', String(err.message ?? err).split('\n')[0]);
      }
    }

    // 2) Companies whose careers site the tool cannot search by itself: you pick the job, it fills the form with you.
    if (!quit && sites) {
      const boards = loadBoards();
      const todo = companies.filter((c) => matchOnly(c.name) && boards[c.key]?.status !== 'resolved' && (!state.sites[c.key] || state.sites[c.key].status === 'later'));
      if (todo.length) {
        io.print(`\nNext: ${todo.length} companies whose careers sites have to be browsed by hand. For each one the tool opens the`);
        io.print('careers page (or a web search when none is known); you open a job based in India and it fills the application with you.');
        if (/^n/.test(norm(await io.ask('Start? [Y/n]: ')))) quit = true;
      }
      for (let k = 0; k < todo.length && !quit; k++) {
        const c = todo[k];
        const known = boards[c.key]?.careers_url;
        const url = known || `https://www.google.com/search?q=${encodeURIComponent(`${c.variants[0]} careers India jobs`)}`;
        io.print(`\n[company ${k + 1}/${todo.length}] ${c.name}${c.country ? ` (${c.country})` : ''}`);
        io.print(known ? `   Careers page: ${url}` : '   No careers page is known for this company, so a web search for it is open.');
        try {
          const page = await freshPage(context);
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch((err) => { if (closedBrowser(err)) throw err; io.print(`   The page did not load (${String(err.message).split('\n')[0]}). Open the site yourself in the browser.`); });
          io.print('   Find a job based in India that suits you and open it in the browser, then press Enter.');
          const first = norm(await io.ask('   [Enter] I have opened a job   [n] No suitable job here, next company   [l] Later   [q] Quit\n   > '));
          if (first === 'q') { quit = true; break; }
          if (first === 'l' || first === 'n') { state.sites[c.key] = { status: first === 'l' ? 'later' : 'no_job', at: new Date().toISOString() }; saveState(state); continue; }
          for (let n = 0; ; n++) {
            const p = activePage(context);
            const detected = clip(await p.evaluate(() => (document.querySelector('h1')?.innerText || document.title || '').trim()).catch(() => '') || 'Job', 100);
            const title = (await io.ask(`   Job title [${detected}]: `)).trim() || detected;
            const job = {
              key: `site:${c.key}:${Date.now()}`, company: c.name, companyKey: c.key, ats: 'site', board: new URL(p.url()).host, id: String(Date.now()),
              title, location: '', remote: false, url: p.url(), applyUrl: p.url(), altApplyUrl: null, description: await pageText(p), postedAt: null,
              applyMode: 'guided', foundAt: new Date().toISOString(), history: [],
            };
            const dup = alreadyApplied(state, job);
            if (dup && !/^y/.test(norm(await io.ask(`   You already applied to "${dup.title}" at ${c.name}. Apply again anyway? [y/N]: `)))) {
              setStatus(job, 'skipped', 'Already applied to this role');
            } else {
              setStatus(job, 'prepared', '');
              state.jobs[job.key] = job; saveState(state);
              await ensureDocs(job);
              showDocs(job);
              const res = await reviewLoop(io, context, cfg, ctxFor(job), job, (s, nt) => { setStatus(job, s, nt); saveState(state); });
              if (res.quit) { quit = true; break; }
              finish(job, res.status, res.note);
            }
            if (!/^y/.test(norm(await io.ask(`   Apply to another job at ${c.name}? [y/N]: `)))) break;
            await io.ask('   Open that job in the browser, then press Enter: ');
          }
          if (!quit) { state.sites[c.key] = { status: 'done', at: new Date().toISOString() }; saveState(state); }
        } catch (err) {
          if (closedBrowser(err)) { quit = true; io.print('   The browser was closed; stopping.'); break; }
          io.print(`   Something went wrong on this site: ${String(err.message ?? err).split('\n')[0]}. Moving on; it will be offered again next time.`);
        }
      }
    }
    if (!quit) io.print('\nAll done for now. Run "search" again later to pick up new openings.');
  } finally {
    await context.close().catch(() => {});
    if (renderer) await renderer.close().catch(() => {});
    saveState(state);
    await writeTracker(state);
  }
  return { state, counts };
}

/**
 * Unattended mode, kept for the automated tests and for dry runs: an application is sent only when
 * nothing on it is in doubt; anything else is marked needs_manual.
 */
async function runAuto(cfg, profile, companies, { only, limit, dryRun }) {
  const state = loadState();
  for (const j of Object.values(state.jobs)) {
    if (j.status === 'submitting') setStatus(j, 'unconfirmed', 'The previous run stopped while submitting. Check your email for a confirmation before applying again.');
  }
  saveState(state);
  let queue = Object.values(state.jobs).filter((j) => j.status === 'prepared');
  if (only) queue = queue.filter((j) => j.key === only || norm(j.company).includes(norm(only)));
  queue = queue.slice(0, limit);
  if (!queue.length) { log.info('Nothing to apply to. Run "search" and "prepare" first, or check the tracker.'); return { state, counts: {} }; }

  const ctxBrowser = await launchApplyContext({ headless: cfg.apply.headless });
  const useLlm = cfg.llm.provider === 'anthropic' && hasApiKey();
  const counts = {};
  const bump = (k) => { counts[k] = (counts[k] ?? 0) + 1; };
  const shotsDir = (job) => job.docs?.dir ?? '.';
  let quit = false;
  try {
    for (let i = 0; i < queue.length && !quit; i++) {
      const job = queue[i];
      if (i > 0 && !dryRun) await sleep(rand(cfg.apply.delay_seconds));
      log.info(`\n[${i + 1}/${queue.length}] ${job.company} - ${job.title} (${job.location || 'location not stated'})\n   ${job.url}`);
      const finish = (status, note) => { setStatus(job, status, note); saveState(state); bump(status); log.info(`   => ${status}${note ? `: ${note}` : ''}`); };
      if (!docsReady(job)) { finish('failed', 'Tailored resume file is missing. Run "prepare --redo".'); continue; }
      const dup = alreadyApplied(state, job);
      if (dup) { finish('skipped', `Same role already applied to (${dup.key})`); continue; }
      const page = await ctxBrowser.newPage();
      try {
        const opened = await openForm(page, job);
        if (opened.closed) { finish('closed', 'The posting is no longer open.'); continue; }
        if (opened.duplicate) { finish('skipped', 'The site says you have already applied.'); continue; }
        const company = companies.find((c) => c.key === job.companyKey);
        const pageTextNorm = norm(opened.sig?.body ?? '');
        const companySeen = (company?.variants ?? [job.company]).some((v) => norm(v).length >= 3 && pageTextNorm.includes(norm(v)));
        const manualOnly = job.applyMode === 'manual' || opened.noForm;
        let report = [], frame = opened.frame;
        if (!manualOnly) {
          const coverText = job.docs.coverTxt && fs.existsSync(job.docs.coverTxt) ? fs.readFileSync(job.docs.coverTxt, 'utf8') : '';
          const ctx = { cfg, profile, job, docs: { resume: job.docs.resume, cover: job.docs.cover && fs.existsSync(job.docs.cover) ? job.docs.cover : null, coverText }, resumeTextValue: job.tailoredText ?? '' };
          ({ report, frame } = await fillForm(page, ctx, { useLlm }));
        }
        const unresolved = report.filter((r) => r.status === 'unresolved');
        const modelAnswers = report.filter((r) => r.status === 'filled' && r.source === 'model');
        const submit = manualOnly ? null : await findSubmit(frame);
        const blockers = [];
        if (manualOnly) blockers.push(opened.noForm ? (opened.error ?? 'no application form was found on the page') : `${job.ats} needs an account / multi-step form`);
        if (job.applyMode === 'assisted') blockers.push(`${job.ats} forms are filled but always sent by you`);
        if (unresolved.length) blockers.push(`${unresolved.length} required question(s) unanswered`);
        if (modelAnswers.length && !cfg.apply.allow_llm_answers_in_auto) blockers.push(`${modelAnswers.length} answer(s) written by the model need your eyes`);
        if (!companySeen) blockers.push(`the page does not mention "${job.company}"`);
        if (/check/.test(job.boardConfidence ?? '')) blockers.push('the job board was matched by id only');
        if (!manualOnly && !submit) blockers.push('no submit button found');
        if (submit?.kind === 'next') blockers.push('multi-step form');
        if (!manualOnly && !report.some((r) => r.kind === 'file' && r.status === 'filled')) blockers.push('resume could not be attached');
        if (await captchaVisible(page)) blockers.push('CAPTCHA on the page');

        if (dryRun) {
          await page.screenshot({ path: path.join(shotsDir(job), 'dry-run.png'), fullPage: true }).catch(() => {});
          log.info(`   dry run: ${unresolved.length} question(s) would be asked; nothing submitted. Screenshot: ${path.join(shotsDir(job), 'dry-run.png')}`);
          bump('dry_run');
          continue;
        }
        if (blockers.length) { finish('needs_manual', blockers.join('; ')); continue; }
        setStatus(job, 'submitting', ''); saveState(state);
        const startUrl = page.url();
        await submit.button.scrollIntoViewIfNeeded().catch(() => {});
        await submit.button.click({ timeout: 10000 });
        const out = await awaitOutcome(page, frame, cfg, startUrl);
        await page.screenshot({ path: path.join(shotsDir(job), `after-submit-${out.result}.png`), fullPage: true }).catch(() => {});
        if (out.result === 'submitted') finish('submitted', 'Confirmed by the site');
        else if (out.result === 'duplicate') finish('skipped', 'The site says you have already applied.');
        else if (out.result === 'invalid') finish('needs_manual', `The form was rejected: ${out.note}`);
        else if (out.result === 'captcha') finish('unconfirmed', 'A CAPTCHA was shown after submitting and was not solved in time. Check whether the application went through.');
        else finish('unconfirmed', `${out.note} See the screenshot in ${shotsDir(job)} and check your email before reapplying.`);
      } catch (err) {
        const msg = String(err.message ?? err).split('\n')[0];
        if (closedBrowser(err)) {
          if (job.status !== 'submitting') { setStatus(job, 'prepared', 'Browser was closed before this one was handled'); saveState(state); }
          log.warn('The browser window was closed; stopping.'); quit = true;
        } else if (job.status === 'submitting') finish('unconfirmed', `Error right after pressing submit: ${msg}. Check your email before reapplying.`);
        else finish('failed', msg);
      } finally {
        await page.close().catch(() => {});
      }
    }
  } finally {
    await ctxBrowser.close().catch(() => {});
    saveState(state);
    await writeTracker(state);
  }
  return { state, counts };
}

/**
 * Apply to the jobs that were found. By default this is interactive: for each job it fills the form,
 * asks you what it does not know, shows you the whole form, and submits only when you say so.
 */
export async function applyAll(cfg, profile, companies, { only = null, auto = false, limit = Infinity, dryRun = false, io = null, base = null, sites = true } = {}) {
  if (auto || dryRun) return runAuto(cfg, profile, companies, { only, limit, dryRun });
  const own = !io;
  const terminal = io ?? terminalIO();
  try {
    return await runInteractive(cfg, profile, companies, { only, limit, io: terminal, base, sites });
  } finally {
    if (own) terminal.close();
  }
}
