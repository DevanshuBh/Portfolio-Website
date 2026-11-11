import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { fillForm, pageSignals, captchaVisible, validationErrors, findSubmit, findFormFrame } from './filler.js';
import { launchApplyContext } from '../browser.js';
import { loadState, saveState, setStatus, alreadyApplied, writeTracker } from '../store.js';
import { hasApiKey } from '../llm.js';
import { norm, sleep, log } from '../util.js';

const rand = ([a, b]) => (a + Math.random() * (b - a)) * 1000;

async function prompt(rl, question, allowed) {
  for (;;) {
    const a = (await rl.question(question)).trim().toLowerCase();
    if (allowed.includes(a)) return a;
  }
}

function printReport(report) {
  const mark = { filled: '+', kept: '=', skipped: '-', unresolved: '!' };
  for (const r of report) {
    const v = r.value ? `  ->  ${String(r.value).replace(/\s+/g, ' ').slice(0, 70)}` : '';
    log.info(`   ${mark[r.status]} ${r.required ? '*' : ' '} ${r.label}${v}   [${r.source}]`);
  }
  log.info('   (+ filled, = already set, - left blank on purpose, ! needs you; * = required)');
}

/** Wait for the site to say what happened after pressing submit. */
async function awaitOutcome(page, frame, cfg, startUrl) {
  const deadline = Date.now() + 30000;
  let captchaDeadline = null;
  while (Date.now() < (captchaDeadline ?? deadline)) {
    await sleep(1000);
    if (page.isClosed()) return { result: 'unconfirmed', note: 'The page was closed before a confirmation appeared.' };
    const sig = await pageSignals(page).catch(() => null);
    if (sig?.success) return { result: 'submitted' };
    if (sig?.duplicate) return { result: 'duplicate' };
    if (await captchaVisible(page)) {
      if (!captchaDeadline) {
        if (cfg.apply.headless) return { result: 'captcha' };
        captchaDeadline = Date.now() + cfg.apply.captcha_wait_seconds * 1000;
        log.info(`   A CAPTCHA appeared. Solve it in the browser window (waiting up to ${cfg.apply.captcha_wait_seconds}s)...`);
      }
      continue;
    }
    const errs = await validationErrors(frame);
    if (errs.length && page.url() === startUrl) return { result: 'invalid', note: errs.join(' | ') };
  }
  if (captchaDeadline) return { result: 'captcha' };
  return { result: 'unconfirmed', note: 'No confirmation message appeared within 30 seconds.' };
}

async function openForm(page, job) {
  const urls = [job.applyUrl, job.altApplyUrl].filter(Boolean);
  let last = { fields: [], frame: page.mainFrame() };
  for (const url of urls) {
    let resp;
    try { resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 }); }
    catch (err) { last.error = `Page did not load: ${String(err.message).split('\n')[0]}`; continue; }
    if (resp && (resp.status() === 404 || resp.status() === 410)) return { closed: true };
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    const sig = await pageSignals(page);
    if (sig.duplicate) return { duplicate: true };
    let found = await findFormFrame(page);
    if (found.fields.length < 3) {
      // Some boards show the description first with an "Apply" button that reveals the form.
      const btn = page.getByRole('link', { name: /^(apply( now| for this job| to this job)?|i'?m interested)$/i }).or(page.getByRole('button', { name: /^(apply( now| for this job| to this job)?|i'?m interested)$/i })).first();
      if (await btn.isVisible().catch(() => false)) {
        await btn.click({ timeout: 5000 }).catch(() => {});
        await page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {});
        await sleep(1500);
        found = await findFormFrame(page);
      }
    }
    if (found.fields.length >= 3) return { ...found, sig };
    if (sig.closed) return { closed: true };
    last = { ...found, sig };
  }
  return { ...last, noForm: true };
}

/**
 * Work through every prepared job. By default each application stops for your decision before it
 * is sent; with auto_submit the tool sends it only when nothing on the form is in doubt.
 */
export async function applyAll(cfg, profile, companies, { only = null, auto = cfg.apply.auto_submit, limit = cfg.apply.max_per_run, dryRun = false } = {}) {
  const state = loadState();
  // A run that died mid-submit leaves a job in "submitting". It may or may not have gone through:
  // never retry it automatically.
  for (const j of Object.values(state.jobs)) {
    if (j.status === 'submitting') setStatus(j, 'unconfirmed', 'The previous run stopped while submitting. Check your email for a confirmation before applying again.');
  }
  saveState(state);

  let queue = Object.values(state.jobs).filter((j) => j.status === 'prepared');
  if (only) queue = queue.filter((j) => j.key === only || norm(j.company).includes(norm(only)));
  queue = queue.slice(0, limit);
  if (!queue.length) { log.info('Nothing to apply to. Run "search" and "prepare" first, or check the tracker.'); return { state, counts: {} }; }
  if (!auto && !dryRun && !process.stdin.isTTY) throw new Error('Review mode needs an interactive terminal. Run it from a normal terminal window, or pass --auto.');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ctxBrowser = await launchApplyContext({ headless: cfg.apply.headless });
  const useLlm = cfg.llm.provider === 'anthropic' && hasApiKey();
  if (!useLlm) log.info('Free mode: questions your profile cannot answer are left for you (add recurring ones to "answers" in profile.yaml).');
  const counts = {};
  const bump = (k) => { counts[k] = (counts[k] ?? 0) + 1; };
  const shotsDir = (job) => job.docs?.dir ?? '.';
  let quit = false;

  try {
    for (let i = 0; i < queue.length && !quit; i++) {
      const job = queue[i];
      // Pause between applications (also after ones that were skipped) so job sites see a human pace.
      if (i > 0 && !dryRun) { const ms = rand(cfg.apply.delay_seconds); log.info(`\n   waiting ${Math.round(ms / 1000)}s...`); await sleep(ms); }
      log.info(`\n[${i + 1}/${queue.length}] ${job.company} - ${job.title} (${job.location || 'location not stated'})\n   ${job.url}`);
      const finish = (status, note) => { setStatus(job, status, note); saveState(state); bump(status); log.info(`   => ${status}${note ? `: ${note}` : ''}`); };

      if (!job.docs?.resume || !fs.existsSync(job.docs.resume)) { finish('failed', 'Tailored resume file is missing. Run "prepare --redo".'); continue; }
      const dup = alreadyApplied(state, job);
      if (dup) { finish('skipped', `Same role already applied to (${dup.key})`); continue; }

      const page = await ctxBrowser.newPage();
      try {
        const opened = await openForm(page, job);
        if (opened.closed) { finish('closed', 'The posting is no longer open.'); continue; }
        if (opened.duplicate) { finish('skipped', 'The site says you have already applied.'); continue; }

        const company = companies.find((c) => c.key === job.companyKey);
        const pageText = norm(opened.sig?.body ?? '');
        const companySeen = (company?.variants ?? [job.company]).some((v) => norm(v).length >= 3 && pageText.includes(norm(v)));
        const manualOnly = job.applyMode === 'manual' || opened.noForm;

        let report = [], frame = opened.frame, unresolved = [], modelAnswers = [];
        if (!manualOnly) {
          const coverText = job.docs.coverTxt && fs.existsSync(job.docs.coverTxt) ? fs.readFileSync(job.docs.coverTxt, 'utf8') : '';
          const ctx = { cfg, profile, job, docs: { resume: job.docs.resume, cover: job.docs.cover && fs.existsSync(job.docs.cover) ? job.docs.cover : null, coverText }, resumeTextValue: job.tailoredText ?? '' };
          ({ report, frame } = await fillForm(page, ctx, { useLlm }));
          if (ctx.llmError) log.warn(`Model could not answer the open questions: ${ctx.llmError}`);
          printReport(report);
          unresolved = report.filter((r) => r.status === 'unresolved');
          modelAnswers = report.filter((r) => r.status === 'filled' && r.source === 'model');
        }
        const submit = manualOnly ? null : await findSubmit(frame);

        // Everything that makes an unattended submit unsafe.
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

        if (dryRun) { await page.screenshot({ path: path.join(shotsDir(job), 'dry-run.png'), fullPage: true }).catch(() => {}); log.info(`   dry run: ${blockers.length ? `would stop (${blockers.join('; ')})` : 'would submit'}`); bump(blockers.length ? 'would_stop' : 'would_submit'); continue; }

        let decision;
        if (auto) {
          if (blockers.length) { finish('needs_manual', blockers.join('; ')); continue; }
          decision = 's';
        } else {
          if (blockers.length) log.info(`   Attention: ${blockers.join('; ')}`);
          log.info(`   Resume: ${job.docs.resume}${job.docs.cover ? `\n   Cover letter: ${job.docs.cover}` : ''}`);
          const canSubmit = submit?.kind === 'submit';
          log.info('   Check the browser window. You can correct or complete anything by hand before choosing.');
          decision = await prompt(rl, `   ${canSubmit ? '[s] submit it now   ' : ''}[d] I submitted it myself   [l] later   [k] skip for good   [q] quit: `, [...(canSubmit ? ['s'] : []), 'd', 'l', 'k', 'q']);
        }

        if (decision === 'q') { quit = true; continue; }
        if (decision === 'l') { finish('needs_manual', blockers.join('; ') || 'Left for later by you'); continue; }
        if (decision === 'k') { finish('skipped', 'Skipped by you'); continue; }
        if (decision === 'd') { finish('submitted', 'Submitted by you in the browser'); continue; }

        // --- submit ---
        // You may have edited the form by hand, so look for the button again rather than trusting the old handle.
        const fresh = await findSubmit((await findFormFrame(page)).frame);
        if (!fresh || fresh.kind !== 'submit') { finish('needs_manual', 'Submit button disappeared'); continue; }
        setStatus(job, 'submitting', ''); saveState(state);
        const startUrl = page.url();
        await fresh.button.scrollIntoViewIfNeeded().catch(() => {});
        await fresh.button.click({ timeout: 10000 });
        const out = await awaitOutcome(page, frame, cfg, startUrl);
        await page.screenshot({ path: path.join(shotsDir(job), `after-submit-${out.result}.png`), fullPage: true }).catch(() => {});
        if (out.result === 'submitted') finish('submitted', 'Confirmed by the site');
        else if (out.result === 'duplicate') finish('skipped', 'The site says you have already applied.');
        else if (out.result === 'invalid') {
          // The site rejected the form, so nothing was sent.
          if (auto) finish('needs_manual', `The form was rejected: ${out.note}`);
          else {
            log.info(`   The site rejected the form: ${out.note}\n   Fix it in the browser and submit there.`);
            const d2 = await prompt(rl, '   [d] I submitted it myself   [l] later   [k] skip for good: ', ['d', 'l', 'k']);
            finish(d2 === 'd' ? 'submitted' : d2 === 'l' ? 'needs_manual' : 'skipped', d2 === 'd' ? 'Submitted by you in the browser' : `The form was rejected: ${out.note}`);
          }
        } else if (out.result === 'captcha') finish('unconfirmed', 'A CAPTCHA was shown after submitting and was not solved in time. Check whether the application went through.');
        else finish('unconfirmed', `${out.note} See the screenshot in ${shotsDir(job)} and check your email before reapplying.`);
      } catch (err) {
        const msg = String(err.message ?? err).split('\n')[0];
        if (/Target (page|closed)|browser has been closed|context.*closed/i.test(msg)) {
          // Closing the browser window is treated as "stop". A job caught mid-submit stays "submitting" -> "unconfirmed" next run.
          if (job.status !== 'submitting') { setStatus(job, 'prepared', 'Browser was closed before this one was handled'); saveState(state); }
          log.warn('The browser window was closed; stopping.'); quit = true;
        } else if (job.status === 'submitting') finish('unconfirmed', `Error right after pressing submit: ${msg}. Check your email before reapplying.`);
        else finish('failed', msg);
      } finally {
        await page.close().catch(() => {});
      }
    }
  } finally {
    rl.close();
    await ctxBrowser.close().catch(() => {});
    saveState(state);
    await writeTracker(state);
  }
  return { state, counts };
}
