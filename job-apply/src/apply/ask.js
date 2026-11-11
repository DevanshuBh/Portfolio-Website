import fs from 'node:fs';
import path from 'node:path';
import { applyValue, readForm } from './filler.js';
import { coerceText, matchOption } from './answers.js';
import { saveProfileValue, saveProfileAnswer } from '../profileStore.js';
import { norm } from '../util.js';

export const clip = (s, n = 90) => { const t = String(s ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t; };

function formatHint(field) {
  if (field.inputType === 'number') return 'a number';
  if (field.inputType === 'url') return 'a full link starting with https://';
  if (field.inputType === 'email') return 'an email address';
  if (field.inputType === 'date') return 'a date such as 2026-12-01';
  if (field.maxLength) return `at most ${field.maxLength} characters`;
  return 'text';
}

async function remember(io, profile, field, need, value) {
  if (need) {
    saveProfileValue(profile, need, value);
    io.print(`     Saved to profile.yaml as ${need}; it will be filled in automatically from now on.`);
    return;
  }
  const a = norm(await io.ask('     Use this answer automatically when the same question appears on other applications? [y/N]: '));
  if (/^y/.test(a) && saveProfileAnswer(profile, field.label, value)) io.print('     Saved to profile.yaml.');
}

/** Ask you for one field, then type your answer into the form. Returns true when it was filled. */
async function askOne(io, frame, field, need, ctx) {
  io.print(`\n   ? ${clip(field.label || `(unlabelled ${field.kind})`, 200)}${field.required ? '   (required)' : ''}`);
  const single = field.kind === 'checkbox' && field.single;
  const opts = !single && field.options?.length ? field.options : null;
  for (let attempt = 0; attempt < 3; attempt++) {
    let value;
    if (field.kind === 'file') {
      const a = (await io.ask('     Full path of the file to upload (Enter = attach it yourself in the browser): ')).trim().replace(/^["']|["']$/g, '');
      if (!a) return false;
      if (!fs.existsSync(a) || !fs.statSync(a).isFile()) { io.print(`     There is no file at ${a}.`); continue; }
      value = path.resolve(a);
    } else if (single) {
      const a = norm(await io.ask('     Tick this box? [y] yes  [n] no  (Enter = leave it to you): '));
      if (!a) return false;
      if (!/^(y|yes|n|no)$/.test(a)) { io.print('     Please answer y or n.'); continue; }
      value = a.startsWith('y') ? 'Yes' : 'No';
    } else if (opts) {
      opts.slice(0, 60).forEach((o, i) => io.print(`     ${String(i + 1).padStart(2)}) ${clip(o.label, 90)}`));
      if (opts.length > 60) io.print(`     ... and ${opts.length - 60} more: type the option's text to pick one of those`);
      const multi = field.kind === 'checkbox';
      const a = (await io.ask(`     ${multi ? 'Number(s), separated by commas,' : 'Number'} or the option's text (Enter = leave it to you): `)).trim();
      if (!a) return false;
      const picks = [];
      let bad = null;
      for (const part of multi ? a.split(',') : [a]) {
        const p = part.trim();
        const n = /^\d+$/.test(p) ? Number(p) : NaN;
        const o = n >= 1 && n <= opts.length ? opts[n - 1] : matchOption(opts, p);
        if (!o) { bad = p; break; }
        picks.push(o.label);
      }
      if (bad !== null || !picks.length) { io.print(`     "${bad ?? a}" is not one of the options.`); continue; }
      value = picks.join('; ');
    } else {
      const a = (await io.ask(`     Your answer (${formatHint(field)}; Enter = leave it to you): `)).trim();
      if (!a) return false;
      if (coerceText(field, a) === null) { io.print(`     That does not fit this field: it needs ${formatHint(field)}.`); continue; }
      value = a;
    }
    let ok = false;
    try { ok = await applyValue(frame, field, value); } catch (err) { io.print(`     Could not enter it: ${String(err.message).split('\n')[0]}`); }
    if (!ok) { io.print('     The form did not accept that. Try again, or press Enter and fill it in the browser.'); continue; }
    if (field.kind !== 'file') await remember(io, ctx.profile, field, need, value);
    return true;
  }
  io.print('     Leaving this one for you to fill in the browser.');
  return false;
}

/** Ask you every question the profile could not answer: required ones always, optional ones if you want. */
export async function askUnknowns(io, frame, report, ctx) {
  ctx.declined ??= new Set();
  const open = report.filter((r) => r.askable && r.field);
  const required = open.filter((r) => r.required);
  const optional = open.filter((r) => !r.required && !ctx.declined.has(r.label));
  if (required.length) io.print(`\n   ${required.length} required question(s) I don't have an answer for:`);
  for (const r of required) await askOne(io, frame, r.field, r.need, ctx);
  if (optional.length) {
    io.print(`\n   ${optional.length} optional question(s) are empty: ${optional.slice(0, 4).map((r) => `"${clip(r.label, 50)}"`).join(', ')}${optional.length > 4 ? ', ...' : ''}`);
    if (/^y/.test(norm(await io.ask('   Answer them now? [y/N]: ')))) {
      for (const r of optional) await askOne(io, frame, r.field, r.need, ctx);
    } else for (const r of optional) ctx.declined.add(r.label);
  }
}

function shown(f) {
  switch (f.kind) {
    case 'file': return (f.files ?? []).join(', ');
    case 'select': return f.value ? f.selectedText : '';
    case 'radio': return f.options.find((o) => o.checked)?.label ?? '';
    case 'checkbox': return f.single ? (f.options[0].checked ? 'ticked' : '') : f.options.filter((o) => o.checked).map((o) => o.label).join('; ');
    default: return f.value ?? '';
  }
}

/** Print everything the form contains right now, so you can check it before it is sent. */
export async function printSnapshot(io, frame) {
  const fields = await readForm(frame);
  let missing = 0;
  io.print('\n   Here is everything on the form now:');
  for (const f of fields) {
    const v = String(shown(f)).trim();
    const empty = !v;
    if (f.required && empty) missing++;
    const label = clip(f.label || `(unlabelled ${f.kind})`, 50).padEnd(50);
    const value = empty ? (f.kind === 'checkbox' && f.single ? 'not ticked' : '(empty)') : clip(v, 80);
    io.print(`   ${f.required && empty ? '!' : ' '} ${label}  ${value}`);
  }
  if (missing) io.print(`   ! = required and still empty (${missing})`);
  return { missing, count: fields.length };
}
