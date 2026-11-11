import { collectFields } from './fields.js';
import { ruleAnswer, matchOption, coerceText, llmAnswers } from './answers.js';
import { norm, sleep } from '../util.js';

const loc = (frame, id) => frame.locator(`[data-ja-id="${id}"]`);

/** Choose the frame that actually holds the application form (some sites embed it in an iframe). */
export async function findFormFrame(page) {
  let best = null;
  for (const frame of page.frames()) {
    let fields;
    try { fields = await frame.evaluate(collectFields); } catch { continue; }
    const real = fields.filter((f) => !(f.kind === 'text' && /search|keyword/i.test(f.label)));
    if (!best || real.length > best.fields.length) best = { frame, fields: real };
  }
  return best ?? { frame: page.mainFrame(), fields: [] };
}

/** Open each custom dropdown once to learn its options (they are not in the DOM until opened). */
async function readComboOptions(frame, field) {
  const el = loc(frame, field.id);
  try {
    await el.click({ timeout: 3000 });
    await sleep(350);
    const opts = await frame.locator('[role=option]:visible').allInnerTexts();
    await el.press('Escape').catch(() => {});
    return [...new Set(opts.map((o) => o.replace(/\s+/g, ' ').trim()).filter(Boolean))].slice(0, 300).map((label) => ({ label }));
  } catch { return []; }
}

async function fillCombobox(frame, field, value, option) {
  const el = loc(frame, field.id);
  await el.click({ timeout: 5000 });
  const typed = option ? option.label : value;
  // Typing narrows long lists and triggers server-side lookups (city pickers).
  await el.pressSequentially(typed.slice(0, 40), { delay: 25 }).catch(() => {});
  const deadline = Date.now() + 4000;
  while (Date.now() < deadline) {
    const texts = (await frame.locator('[role=option]:visible').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim());
    let idx = -1;
    if (option) idx = texts.findIndex((t) => norm(t) === norm(option.label));
    else {
      // Free lookups: take a result only when it clearly is the value (starts with it).
      const hits = texts.map((t, i) => [t, i]).filter(([t]) => norm(t).startsWith(norm(value.split(',')[0])));
      if (hits.length) idx = hits[0][1];
    }
    if (idx >= 0) { await frame.locator('[role=option]:visible').nth(idx).click({ timeout: 3000 }); return true; }
    await sleep(300);
  }
  await el.press('Escape').catch(() => {});
  await el.fill('').catch(() => {});
  return false;
}

async function applyValue(frame, field, value) {
  switch (field.kind) {
    case 'file': await loc(frame, field.id).setInputFiles(value); return true;
    case 'text': case 'textarea': {
      const v = coerceText(field, value);
      if (v === null) return false;
      await loc(frame, field.id).fill(v, { timeout: 5000 });
      return true;
    }
    case 'select': {
      const o = matchOption(field.options, value);
      if (!o) return false;
      await loc(frame, field.id).selectOption(o.value, { timeout: 5000 });
      return true;
    }
    case 'radio': {
      const o = matchOption(field.options, value);
      if (!o) return false;
      await loc(frame, o.id).check({ timeout: 5000, force: true });
      return true;
    }
    case 'checkbox': {
      if (field.single) {
        const want = value === true || /^(yes|true|y)$/i.test(String(value));
        if (want) await loc(frame, field.options[0].id).check({ timeout: 5000, force: true });
        return true;
      }
      const wanted = String(value).split(/\s*[;|]\s*/).map((v) => matchOption(field.options, v)).filter(Boolean);
      if (!wanted.length) return false;
      for (const o of wanted) await loc(frame, o.id).check({ timeout: 5000, force: true });
      return true;
    }
    case 'combobox': {
      const o = field.options?.length ? matchOption(field.options, value) : null;
      if (field.options?.length && !o) return false;
      return fillCombobox(frame, field, String(value), o);
    }
    default: return false;
  }
}

// A native <select> always has some value (its first option), so it never counts as answered here.
const alreadyFilled = (f) => (f.kind === 'text' || f.kind === 'textarea' || f.kind === 'combobox') ? Boolean(String(f.value ?? '').trim())
  : (f.kind === 'radio' || f.kind === 'checkbox') ? f.options.some((o) => o.checked) : false;

/**
 * Fill the whole form. Returns one report line per question:
 *   status  filled | kept (already had a value) | skipped (deliberately) | unresolved (needs you)
 *   source  where the answer came from
 */
export async function fillForm(page, ctx, { useLlm = true } = {}) {
  const { frame, fields } = await findFormFrame(page);
  const report = [];
  if (!fields.length) return { frame, report, fields };
  for (const f of fields) if (f.kind === 'combobox') f.options = await readComboOptions(frame, f);
  ctx.fileInputCount = fields.filter((f) => f.kind === 'file').length;

  const pending = [];
  const plan = new Map();
  for (const f of fields) {
    if (alreadyFilled(f) && f.kind !== 'file') { report.push({ ...brief(f), status: 'kept', source: 'already on the form' }); continue; }
    const a = ruleAnswer(f, ctx);
    if (a?.skip) { report.push({ ...brief(f), status: f.required ? 'unresolved' : 'skipped', source: a.skip }); continue; }
    if (a) { plan.set(f.id, a); continue; }
    if (f.kind === 'file' || !f.label.trim()) { report.push(noAnswer(f, 'no answer in profile')); continue; }
    pending.push(f);
  }

  if (pending.length && useLlm) {
    try {
      const got = await llmAnswers(ctx.cfg, pending, ctx);
      for (const f of pending) if (got.has(f.id)) plan.set(f.id, { value: got.get(f.id), source: 'model' });
    } catch (err) { ctx.llmError = String(err.message ?? err); }
  }
  for (const f of pending) if (!plan.has(f.id)) report.push(noAnswer(f, 'no answer available'));

  for (const f of fields) {
    const a = plan.get(f.id);
    if (!a) continue;
    let ok = false, error = '';
    try { ok = await applyValue(frame, f, a.value); } catch (err) { error = String(err.message ?? err).split('\n')[0]; }
    const shown = f.kind === 'file' ? String(a.value).split(/[\\/]/).pop() : a.value === true ? 'ticked' : String(a.value);
    if (ok) report.push({ ...brief(f), status: 'filled', source: a.source, value: shown });
    else report.push({ ...brief(f), status: f.required ? 'unresolved' : 'skipped', source: error || `"${shown}" does not fit this field's options/format`, value: shown });
  }
  return { frame, report, fields };
}

// A dropdown that already shows a real choice is left as the site set it rather than reported as a gap.
const noAnswer = (f, why) => (f.kind === 'select' && String(f.value ?? '').trim()
  ? { ...brief(f), status: 'kept', source: 'left at the form default' }
  : { ...brief(f), status: f.required ? 'unresolved' : 'skipped', source: why });

const brief = (f) => ({ label: f.label.replace(/\s+/g, ' ').slice(0, 110) || `(unlabelled ${f.kind})`, kind: f.kind, required: f.required });

/* ---------- page state ---------- */

const SUCCESS_RE = /(thank you for (applying|your application|your interest)|application (has been |was )?(received|submitted|sent)|we(?:'ve| have) received your application|successfully (applied|submitted)|your application is on its way|thanks for applying)/i;
const CLOSED_RE = /(no longer (available|accepting|open)|position has been filled|job (posting )?(is |has been )?(closed|removed|expired)|this job is not available|page not found|404 not found|job not found|posting does not exist)/i;
const DUP_RE = /(already (applied|submitted an application)|you have applied (for|to) this)/i;

export async function pageSignals(page) {
  let body = '';
  for (const frame of page.frames()) { try { body += ' ' + await frame.evaluate(() => document.body?.innerText ?? ''); } catch { /* cross-origin or gone */ } }
  return { success: SUCCESS_RE.test(body) || /(confirmation|thank[-_]?you|thanks|application[-_]submitted)/i.test(new URL(page.url()).pathname), closed: CLOSED_RE.test(body), duplicate: DUP_RE.test(body), body };
}

/** A CAPTCHA the person has to solve (not the invisible badge most forms carry). */
export async function captchaVisible(page) {
  for (const frame of page.frames()) {
    const u = frame.url();
    if (/recaptcha\/(api2|enterprise)\/bframe|hcaptcha\.com\/.*challenge|challenges\.cloudflare\.com|arkoselabs|funcaptcha/i.test(u)) {
      try {
        const el = await frame.frameElement();
        const box = await el.boundingBox();
        if (box && box.width > 100 && box.height > 100 && await el.isVisible()) return true;
      } catch { /* frame went away */ }
    }
  }
  return false;
}

export async function validationErrors(frame) {
  try {
    return await frame.evaluate(() => {
      const out = new Set();
      const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
      for (const el of document.querySelectorAll('[aria-invalid="true"]')) if (vis(el)) out.add((el.getAttribute('aria-label') || el.getAttribute('name') || el.id || 'a field') + ' is invalid');
      for (const el of document.querySelectorAll('[role=alert], [class*="error" i], [class*="invalid" i], [id*="error" i]')) {
        const t = (el.innerText ?? '').replace(/\s+/g, ' ').trim();
        if (vis(el) && t && t.length < 200 && /(required|please|invalid|must|enter|select|missing|too (long|short|large)|not valid)/i.test(t)) out.add(t);
      }
      return [...out].slice(0, 8);
    });
  } catch { return []; }
}

export async function findSubmit(frame) {
  const candidates = frame.locator('button, input[type=submit], [role=button]');
  const n = Math.min(await candidates.count(), 80);
  let next = null;
  for (let i = n - 1; i >= 0; i--) { // the real submit button sits at the end of the form
    const el = candidates.nth(i);
    if (!(await el.isVisible().catch(() => false))) continue;
    const t = norm((await el.innerText().catch(() => '')) || (await el.getAttribute('value').catch(() => '')) || (await el.getAttribute('aria-label').catch(() => '')) || '');
    if (/^(submit( my)?( application)?|send( my)? application|apply( now)?|submit and apply|complete application|finish( application)?)$/.test(t)) return { button: el, kind: 'submit', text: t };
    if (!next && /^(next|continue|save and continue|next step|proceed)$/.test(t)) next = { button: el, kind: 'next', text: t };
  }
  return next;
}
