import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { ask } from './llm.js';
import { hasTerm, keywordScore } from './keywords.js';
import { localTailor } from './localTailor.js';
import { DATA, escapeHtml, readJson, writeJson, squash, ensureDir } from './util.js';

export const RESUME_JSON = () => path.join(DATA, 'resume.json');

const ResumeSchema = z.object({
  name: z.string(),
  contact: z.object({ email: z.string(), phone: z.string(), location: z.string(), links: z.array(z.object({ label: z.string(), url: z.string() })) }),
  summary: z.string(),
  skills: z.array(z.object({ category: z.string(), items: z.array(z.string()) })),
  experience: z.array(z.object({ company: z.string(), title: z.string(), location: z.string(), start: z.string(), end: z.string(), bullets: z.array(z.string()) })),
  projects: z.array(z.object({ name: z.string(), tech: z.array(z.string()), link: z.string(), bullets: z.array(z.string()) })),
  education: z.array(z.object({ institution: z.string(), degree: z.string(), start: z.string(), end: z.string(), details: z.string() })),
  certifications: z.array(z.string()),
  achievements: z.array(z.string()),
  target_titles: z.array(z.string()),
});

const TailorSchema = z.object({
  jd_keywords: z.array(z.string()),
  summary: z.string(),
  skills: z.array(z.object({ category: z.string(), items: z.array(z.string()) })),
  experience: z.array(z.object({ index: z.number().int(), bullets: z.array(z.string()) })),
  project_order: z.array(z.number().int()),
  projects: z.array(z.object({ index: z.number().int(), bullets: z.array(z.string()) })),
  cover_letter_paragraphs: z.array(z.string()),
});

/** Turn the PDF resume into structured data once. The user reviews data/resume.json afterwards. */
export async function parseResume(cfg) {
  if (!fs.existsSync(cfg.resume_file)) throw new Error(`Resume not found at ${cfg.resume_file}. Put your resume PDF there (or change resume_file in config.yaml).`);
  if (!/\.pdf$/i.test(cfg.resume_file)) throw new Error('resume_file must be a PDF.');
  const buf = fs.readFileSync(cfg.resume_file);
  if (buf.length > 20 * 1024 * 1024) throw new Error('Resume PDF is larger than 20 MB; export a smaller one.');
  if (buf.subarray(0, 5).toString() !== '%PDF-') throw new Error(`${cfg.resume_file} is not a PDF file.`);
  const resume = await ask({
    cfg, schema: ResumeSchema,
    system: 'You transcribe resumes into structured data. Copy every fact exactly as written: names, employers, job titles, dates, numbers, technologies, links. Never add, infer, improve or drop anything. Use an empty string or empty list where the resume has nothing for a field. For target_titles, list 4-8 job titles this person is realistically qualified to apply for right now, based only on their experience level and skills.',
    content: [
      { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: buf.toString('base64') } },
      { type: 'text', text: 'Transcribe this resume.' },
    ],
  });
  if (!resume.name.trim() || (!resume.experience.length && !resume.projects.length && !resume.education.length)) {
    throw new Error('Could not read any content from the resume PDF. If it is a scanned image, export a text-based PDF instead.');
  }
  writeJson(RESUME_JSON(), resume);
  return resume;
}

export function loadResume() {
  const r = readJson(RESUME_JSON(), null);
  if (!r) throw new Error('data/resume.json not found. Run "node src/cli.js init" first.');
  const parsed = ResumeSchema.safeParse(r);
  if (!parsed.success) throw new Error(`data/resume.json is malformed: ${parsed.error.issues.slice(0, 3).map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
  if (/^your name$/i.test(parsed.data.name.trim())) throw new Error('data/resume.json is still the template. Replace its contents with your own resume first.');
  return parsed.data;
}

export function resumeText(r) {
  return [
    r.name, r.summary,
    ...r.skills.flatMap((s) => [s.category, s.items.join(', ')]),
    ...r.experience.flatMap((e) => [`${e.title} ${e.company} ${e.location} ${e.start} ${e.end}`, ...e.bullets]),
    ...r.projects.flatMap((p) => [`${p.name} ${p.tech.join(', ')}`, ...p.bullets]),
    ...r.education.map((e) => `${e.degree} ${e.institution} ${e.start} ${e.end} ${e.details}`),
    ...r.certifications, ...r.achievements,
  ].filter(Boolean).join('\n');
}

const numbersIn = (s) => (String(s).match(/\d+(?:[.,]\d+)*/g) ?? []).map((n) => n.replace(/,/g, ''));

/**
 * The anti-fabrication check. A rewritten line is accepted only if it introduces
 *  - no number that is not in the original resume,
 *  - no job-description keyword that the original resume lacks, and
 *  - no proper noun / technology name (a capitalised or mixed-case word mid-sentence) that the original lacks.
 * Returns null when the text is fine, otherwise the reason.
 */
export function fabricationIn(text, baseText, jdKeywords = []) {
  const baseNums = new Set(numbersIn(baseText));
  const badNum = numbersIn(text).find((n) => !baseNums.has(n));
  if (badNum) return `number "${badNum}" is not in your resume`;
  const badKw = jdKeywords.find((k) => hasTerm(text, k) && !hasTerm(baseText, k));
  if (badKw) return `"${badKw}" is in the job description but not in your resume`;
  const baseLower = baseText.toLowerCase();
  const words = text.split(/\s+/);
  for (let i = 0; i < words.length; i++) {
    const w = words[i].replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9+#]+$/g, '');
    if (w.length < 2) continue;
    const sentenceStart = i === 0 || /[.!?:;]$/.test(words[i - 1]);
    const looksLikeName = /[a-z][A-Z]|[A-Z]{2}|\d|[.+#]/.test(w) || (/^[A-Z]/.test(w) && !sentenceStart);
    if (!looksLikeName) continue;
    const parts = w.split(/[/]/).filter((p) => p.length >= 2);
    const bad = parts.find((p) => !baseLower.includes(p.toLowerCase()) && !baseLower.includes(p.toLowerCase().replace(/s$/, '')));
    if (bad) return `"${bad}" does not appear in your resume`;
  }
  return null;
}

/**
 * Combine the model's rewrite with the original. Everything factual (employers, titles, dates, education,
 * contact details, project names) is copied from the original untouched; rewritten text that fails the
 * fabrication check falls back to the original wording.
 */
export function mergeTailored(base, t) {
  const baseText = resumeText(base);
  const kws = t.jd_keywords ?? [];
  const notes = [];
  const out = structuredClone(base);
  const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();

  const summary = clean(t.summary);
  if (summary && base.summary) {
    const bad = fabricationIn(summary, baseText, kws) ?? (summary.length > Math.max(600, base.summary.length * 2) ? 'too long' : null);
    if (bad) notes.push(`Summary kept as original (${bad})`); else out.summary = summary;
  }

  const known = new Set(base.skills.flatMap((s) => s.items.map(squash)));
  const seen = new Set();
  const skills = [];
  for (const cat of t.skills ?? []) {
    const items = [];
    for (const raw of cat.items ?? []) {
      const item = clean(raw);
      const k = squash(item);
      if (!k || seen.has(k)) continue;
      if (known.has(k) || hasTerm(baseText, item)) { items.push(item); seen.add(k); } else notes.push(`Skill "${item}" dropped (not in your resume)`);
    }
    if (items.length) skills.push({ category: clean(cat.category) || 'Skills', items });
  }
  if (skills.length) out.skills = skills;

  const rewrite = (baseBullets, proposed, where) => {
    if (!Array.isArray(proposed) || !proposed.length) return baseBullets;
    const result = [];
    const used = new Set();
    for (const raw of proposed.slice(0, baseBullets.length)) {
      const b = clean(raw);
      const bad = !b ? 'empty' : b.length > 400 ? 'too long' : fabricationIn(b, baseText, kws);
      if (!bad) { result.push(b); continue; }
      const idx = baseBullets.findIndex((_, i) => !used.has(i) && !result.includes(baseBullets[i]));
      if (idx >= 0) { used.add(idx); result.push(baseBullets[idx]); }
      notes.push(`${where}: one line kept as original (${bad})`);
    }
    const uniq = [...new Set(result)];
    return uniq.length ? uniq : baseBullets;
  };

  for (const e of t.experience ?? []) {
    if (Number.isInteger(e.index) && out.experience[e.index]) out.experience[e.index].bullets = rewrite(base.experience[e.index].bullets, e.bullets, base.experience[e.index].company);
  }
  for (const p of t.projects ?? []) {
    if (Number.isInteger(p.index) && out.projects[p.index]) out.projects[p.index].bullets = rewrite(base.projects[p.index].bullets, p.bullets, base.projects[p.index].name);
  }
  // Projects may be re-ordered (most relevant first) but never dropped or duplicated.
  const order = [...new Set((t.project_order ?? []).filter((i) => Number.isInteger(i) && i >= 0 && i < out.projects.length))];
  for (let i = 0; i < out.projects.length; i++) if (!order.includes(i)) order.push(i);
  out.projects = order.map((i) => out.projects[i]);

  const before = keywordScore(baseText, kws);
  const after = keywordScore(resumeText(out), kws);
  return { resume: out, notes, score: { before: before.score, after: after.score, missing: after.missing } };
}

const PLACEHOLDER_RE = /\[[^\]]{0,40}\]|\{\{|\bXXX+\b|\b(your name|company name|hiring manager's name|insert)\b/i;

/** Cover-letter sanity check: no template leftovers, no numbers invented, sensible length. */
export function checkCoverLetter(paragraphs, base, job, minWords = 120) {
  const paras = (paragraphs ?? []).map((p) => String(p).replace(/\s+/g, ' ').trim()).filter(Boolean);
  const text = paras.join('\n\n');
  const words = text.split(/\s+/).filter(Boolean).length;
  if (!words) return { ok: false, reason: 'too little overlap between the job and your resume to write one' };
  if (words < minWords || words > 450) return { ok: false, reason: `length ${words} words is outside ${minWords}-450` };
  if (PLACEHOLDER_RE.test(text)) return { ok: false, reason: 'contains a placeholder' };
  const allowed = new Set([...numbersIn(resumeText(base)), ...numbersIn(`${job.title} ${job.company} ${job.description}`)]);
  const badNum = numbersIn(text).find((n) => !allowed.has(n));
  if (badNum) return { ok: false, reason: `number "${badNum}" is in neither your resume nor the job description` };
  const missingKw = (job.jdKeywordsLacking ?? []).find((k) => new RegExp(`\\b(experience|experienced|proficient|skilled|expert|expertise|worked|built|background)\\b[^.]{0,60}${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i').test(text));
  if (missingKw) return { ok: false, reason: `claims experience with "${missingKw}", which is not in your resume` };
  return { ok: true, paragraphs: paras };
}

const SYSTEM = `You tailor a candidate's resume and write a cover letter for one specific job.

Hard rules - these override everything else:
- Use only facts present in the candidate's resume. Never add a skill, tool, technology, employer, title, date, number, metric, certification, or responsibility that is not already there. If the job asks for something the candidate lacks, leave it out; do not imply it.
- You may reorder, select, and rephrase. Rephrase a bullet so that it uses the job description's own wording for something the candidate genuinely did, lead with the most relevant work, and put the most relevant skills first.
- Keep every number exactly as written in the resume.
- Return the same number of bullets or fewer for each role and project, each a single line starting with a strong past-tense verb, with no first-person pronouns.

Output:
- jd_keywords: the 12-25 concrete skills, tools, technologies, and methods the job description asks for, each spelled exactly as in the job description, most important first. No soft skills, no generic words.
- summary: 2-3 lines aimed at this role (empty string if the resume has no summary).
- skills: the candidate's existing skills regrouped/reordered so the ones this job asks for come first.
- experience / projects: for each entry, by its index in the resume, the rewritten bullets.
- project_order: project indexes, most relevant to this job first.
- cover_letter_paragraphs: 3-4 body paragraphs only (no greeting, date, address, or sign-off), 220-320 words in total. Specific to this company and role: say what the role needs, then show two or three pieces of the candidate's real work that match it. Plain, direct, confident; no flattery, no cliches such as "I am writing to express my interest" or "I am excited/thrilled/passionate", no placeholders.`;

export async function tailor(cfg, base, job) {
  const free = cfg.llm.provider !== 'anthropic';
  const t = free ? localTailor(base, job) : await ask({
    cfg, schema: TailorSchema, system: SYSTEM,
    cached: [{ type: 'text', text: `CANDIDATE RESUME (JSON; "index" refers to positions in the experience and projects arrays):\n${JSON.stringify(base)}` }],
    content: `JOB\nCompany: ${job.company}\nTitle: ${job.title}\nLocation: ${job.location}\n\nJOB DESCRIPTION\n${job.description.slice(0, 24000)}`,
  });
  const merged = mergeTailored(base, t);
  const cover = cfg.cover_letter === false ? { ok: false, reason: 'cover letters are turned off' }
    : checkCoverLetter(t.cover_letter_paragraphs, base, { ...job, jdKeywordsLacking: merged.score.missing }, free ? 70 : 120);
  return { ...merged, cover };
}

/* ---------- rendering ---------- */

const CSS = (pt) => `
*{box-sizing:border-box} html,body{margin:0;padding:0}
body{font-family:Arial,Helvetica,sans-serif;font-size:${pt}pt;line-height:1.32;color:#000}
h1{font-size:${pt + 8}pt;margin:0 0 2px;text-align:center}
.contact{text-align:center;margin-bottom:6px} .contact a{color:#000;text-decoration:none}
h2{font-size:${pt + 1}pt;text-transform:uppercase;letter-spacing:.4px;border-bottom:1px solid #000;margin:9px 0 4px;padding-bottom:1px}
.row{display:flex;justify-content:space-between;gap:12px} .row .l{font-weight:bold} .row .r{white-space:nowrap}
.sub{font-style:italic} ul{margin:2px 0 5px;padding-left:16px} li{margin:0 0 1.5px} p{margin:0 0 4px}
.entry{break-inside:avoid;margin-bottom:3px}`;

const e = escapeHtml;
const section = (title, body) => (body ? `<h2>${e(title)}</h2>${body}` : '');
const bullets = (list) => (list?.length ? `<ul>${list.map((b) => `<li>${e(b)}</li>`).join('')}</ul>` : '');
const dates = (a, b) => [a, b].filter(Boolean).join(' - ');

/** Single column, real text, standard section names: the layout resume parsers read most reliably. */
export function resumeHtml(r, pt = 10.5) {
  const contact = [r.contact.email, r.contact.phone, r.contact.location, ...r.contact.links.map((l) => l.url || l.label)].filter(Boolean);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${e(r.name)} - Resume</title><style>${CSS(pt)}</style></head><body>
<h1>${e(r.name)}</h1><div class="contact">${contact.map(e).join(' | ')}</div>
${section('Summary', r.summary ? `<p>${e(r.summary)}</p>` : '')}
${section('Skills', r.skills.map((s) => `<p><b>${e(s.category)}:</b> ${e(s.items.join(', '))}</p>`).join(''))}
${section('Experience', r.experience.map((x) => `<div class="entry"><div class="row"><span class="l">${e(x.title)}${x.company ? `, ${e(x.company)}` : ''}</span><span class="r">${e(dates(x.start, x.end))}</span></div>${x.location ? `<div class="sub">${e(x.location)}</div>` : ''}${bullets(x.bullets)}</div>`).join(''))}
${section('Projects', r.projects.map((p) => `<div class="entry"><div class="row"><span class="l">${e(p.name)}</span><span class="r">${e(p.link)}</span></div>${p.tech.length ? `<div class="sub">${e(p.tech.join(', '))}</div>` : ''}${bullets(p.bullets)}</div>`).join(''))}
${section('Education', r.education.map((x) => `<div class="entry"><div class="row"><span class="l">${e(x.degree)}${x.institution ? `, ${e(x.institution)}` : ''}</span><span class="r">${e(dates(x.start, x.end))}</span></div>${x.details ? `<p>${e(x.details)}</p>` : ''}</div>`).join(''))}
${section('Certifications', bullets(r.certifications))}
${section('Achievements', bullets(r.achievements))}
</body></html>`;
}

export function coverLetterHtml(r, job, paragraphs) {
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const contact = [r.contact.email, r.contact.phone, r.contact.location].filter(Boolean);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${e(r.name)} - Cover Letter</title><style>
body{font-family:Arial,Helvetica,sans-serif;font-size:11pt;line-height:1.45;color:#000;margin:0} p{margin:0 0 11px} .h{font-weight:bold;font-size:14pt}</style></head><body>
<p><span class="h">${e(r.name)}</span><br>${contact.map(e).join(' | ')}</p><p>${e(today)}</p>
<p>${e(job.company)}<br>Re: ${e(job.title)}</p><p>Dear Hiring Team,</p>
${paragraphs.map((p) => `<p>${e(p)}</p>`).join('')}
<p>Sincerely,<br>${e(r.name)}</p></body></html>`;
}

export const coverLetterText = (r, paragraphs) => `Dear Hiring Team,\n\n${paragraphs.join('\n\n')}\n\nSincerely,\n${r.name}\n`;

const PDF_OPTS = { format: 'A4', margin: { top: '0.5in', bottom: '0.5in', left: '0.6in', right: '0.6in' }, printBackground: false };
const pageCount = (buf) => (buf.toString('latin1').match(/\/Type\s*\/Page(?![a-zA-Z])/g) ?? []).length;

/** Render the resume, shrinking the type a little if needed to stay within maxPages. */
export async function renderResumePdf(browser, resume, file, maxPages = 1) {
  ensureDir(path.dirname(file));
  const page = await browser.newPage();
  try {
    let buf, pages, used;
    for (const pt of [10.5, 10, 9.5, 9]) {
      await page.setContent(resumeHtml(resume, pt), { waitUntil: 'load' });
      buf = await page.pdf(PDF_OPTS);
      pages = pageCount(buf); used = pt;
      if (pages <= maxPages) break;
    }
    fs.writeFileSync(file, buf);
    return { pages, fontPt: used, fits: pages <= maxPages };
  } finally { await page.close(); }
}

export async function renderHtmlPdf(browser, html, file) {
  ensureDir(path.dirname(file));
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'load' });
    fs.writeFileSync(file, await page.pdf({ ...PDF_OPTS, margin: { top: '1in', bottom: '1in', left: '1in', right: '1in' } }));
  } finally { await page.close(); }
}
