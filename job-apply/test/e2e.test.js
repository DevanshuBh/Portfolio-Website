// End-to-end checks against local stand-ins: a fake job-board API (mocked fetch) and a local
// application form. No real site is contacted and nothing is ever submitted to an employer.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'ja-e2e-'));
process.env.JOB_APPLY_DATA = DATA;
process.env.JOB_APPLY_MIN_GAP_MS = '0';
delete process.env.ANTHROPIC_API_KEY; delete process.env.ANTHROPIC_AUTH_TOKEN;
if (!process.env.JOB_APPLY_CHROMIUM && fs.existsSync('/opt/pw-browsers/chromium')) process.env.JOB_APPLY_CHROMIUM = '/opt/pw-browsers/chromium';

const { discover } = await import('../src/discover.js');
const { search } = await import('../src/pipeline.js');
const { applyAll } = await import('../src/apply/apply.js');
const { loadState, saveState, loadBoards, saveBoards, writeTracker, setStatus } = await import('../src/store.js');
const { renderResumePdf, renderHtmlPdf, coverLetterHtml } = await import('../src/resume.js');
const { launchHeadless } = await import('../src/browser.js');
const { loadConfig, loadProfile } = await import('../src/config.js');
const { nameVariants, companyKey } = await import('../src/companies.js');

const company = (name) => ({ name, key: companyKey(name), variants: nameVariants(name), careers_url: '', tier: 'Tier 1', score: 5, priority: '', row: 2 });
const companies = [company('Globex Inc.'), company('Box'), company('Initech (India)'), company('Hooli')];

const longJd = (years) => `About the role. We need ${years}+ years of experience building backend services in Java and Spring Boot. ` + 'You will design APIs, write tests, and work with product teams to ship payments features. '.repeat(4);
const day = (n) => new Date(Date.now() - n * 86400000).toISOString();
const GH = {
  globex: { name: 'Globex', jobs: [
    { id: 101, title: 'Software Engineer', location: { name: 'Bengaluru, India' }, absolute_url: 'https://job-boards.greenhouse.io/globex/jobs/101', content: `&lt;p&gt;${longJd(2)}&lt;/p&gt;`, first_published: day(3) },
    { id: 102, title: 'Senior Software Engineer', location: { name: 'Bengaluru, India' }, content: longJd(2), first_published: day(3) },
    { id: 103, title: 'Software Engineer, Platform', location: { name: 'Hyderabad, India' }, content: longJd(6), first_published: day(2) },
    { id: 104, title: 'Software Engineer', location: { name: 'Austin, Indiana, USA' }, content: longJd(1), first_published: day(1) },
    { id: 105, title: 'Software Developer', location: { name: 'Remote - India' }, content: longJd(1), first_published: day(400) },
    { id: 106, title: 'Software Developer II', location: { name: 'Pune, India' }, content: 'short', first_published: day(5) },
    { id: 107, title: 'Frontend Developer', location: { name: 'Pune, India' }, content: longJd(1), first_published: day(9) },
  ] },
  umbrellahq: { name: 'Umbrella HQ', jobs: [{ id: 9, title: 'Software Engineer', location: { name: 'India' }, content: longJd(1) }] },
  box: { name: 'Boxed Wholesale', jobs: [{ id: 1, title: 'Software Engineer', location: { name: 'India' }, content: longJd(1) }] },
};
let down = false;
const calls = [];
globalThis.__jobApplyFetch = async (url) => {
  calls.push(url);
  if (down) throw new TypeError('fetch failed');
  const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });
  const u = new URL(url);
  let m = /^\/v1\/boards\/([^/]+)(\/jobs)?$/.exec(u.pathname);
  if (u.host === 'boards-api.greenhouse.io' && m) return GH[m[1]] ? json(m[2] ? { jobs: GH[m[1]].jobs } : { name: GH[m[1]].name }) : json({ status: 404 }, 404);
  if (u.host === 'api.lever.co' && u.pathname === '/v0/postings/hooli') return json([{ id: 'abc-1', text: 'Backend Engineer', categories: { location: 'Mumbai, India', team: 'Core' }, hostedUrl: 'https://jobs.lever.co/hooli/abc-1', descriptionPlain: longJd(1), createdAt: Date.now() - 86400000 }]);
  if (u.host === 'api.smartrecruiters.com') return json({ totalFound: 0, content: [] });
  const html = (body) => new Response(body, { status: 200, headers: { 'content-type': 'text/html' } });
  if (u.host === 'umbrella.com' && u.pathname === '/') return html('<title>Umbrella - Home</title><a href="/about">About</a> <a href="/careers?ref=nav&amp;x=1">Careers</a>');
  if (u.host === 'umbrella.com' && u.pathname === '/careers') return html('<h1>Work at Umbrella</h1><script src="https:\\/\\/boards.greenhouse.io\\/embed\\/job_board\\/js?for=umbrellahq"></script>');
  if (u.host === 'soylent.com' && u.pathname === '/') return html('<h1>Soylent</h1><a href="https://soylent.com/join-us">Join us</a>');
  if (u.host === 'soylent.com' && u.pathname === '/join-us') return html('<h1>Soylent jobs</h1><p>Email your CV to us.</p>');
  if (u.host === 'box.com') return html('<h1>This domain is for sale</h1>');
  return json({ error: 'not found' }, 404);
};

const cfg = {
  skip_tiers: [], tiers: [], location_priorities: [], min_match_score: null, resume_max_pages: 1,
  search: { includeRe: [/software (engineer|developer)/i, /(front|back)[- ]?end (engineer|developer)/i], excludeRe: [/\b(senior|staff|lead)\b/i], use_resume_titles: true,
    locations: ['India'], allow_remote: true, keep_unknown_location: false, max_years_required: 3, posted_within_days: 45, max_jobs_per_company: 2 },
  cover_letter: true, llm: { provider: 'none', model: 'claude-opus-5-5', effort: 'medium' },
  apply: { auto_submit: true, allow_llm_answers_in_auto: false, max_per_run: 25, delay_seconds: [0, 0], headless: true, captcha_wait_seconds: 2 },
};

let server, base, submissions = [];
before(async () => {
  const form = fs.readFileSync(path.join(here, 'fixtures', 'form.html'), 'utf8');
  server = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    if (req.method === 'POST' && u.pathname === '/submit') {
      const chunks = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => { submissions.push(Buffer.concat(chunks).toString('latin1')); res.writeHead(200, { 'content-type': 'text/html' }); res.end('<h1>Thank you for applying</h1><p>Your application has been received.</p>'); });
      return;
    }
    if (u.pathname === '/quick') { res.writeHead(200, { 'content-type': 'text/html' }); res.end('<h1>Globex - Software Engineer</h1><p>Quick apply</p><form method="post" action="/submit"><label for="e">Email</label><input id="e" name="email" type="email"><button type="submit">Apply</button></form>'); return; }
    if (u.pathname === '/jd') { res.writeHead(200, { 'content-type': 'text/html' }); res.end('<h1>Software Engineer</h1><p>Globex is hiring in Bengaluru.</p><a href="/form">Apply for this job</a>'); return; }
    if (u.pathname === '/gone') { res.writeHead(404, { 'content-type': 'text/html' }); res.end('<h1>Page not found</h1>'); return; }
    if (u.pathname === '/filled') { res.writeHead(200, { 'content-type': 'text/html' }); res.end('<h1>Globex</h1><p>Sorry, this position has been filled.</p>'); return; }
    res.writeHead(200, { 'content-type': 'text/html' }); res.end(form);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server?.close());

test('shipped example files are valid and incomplete profiles are refused', () => {
  const c = loadConfig(path.join(here, '..', 'config.example.yaml'));
  assert.ok(c.search.includeRe.length >= 4 && c.search.excludeRe[0].test('Sr. Engineer') && c.apply.auto_submit === false);
  assert.ok(c.search.includeRe.some((re) => re.test('SDE II')) && c.search.includeRe.some((re) => re.test('Frontend Developer')));
  assert.throws(() => loadProfile(path.join(here, '..', 'profile.example.yaml')), /first_name is empty[\s\S]*email is empty/);
  assert.throws(() => loadConfig(path.join(DATA, 'nope.yaml')), /Config not found.*Copy .*\.example\.yaml/);
  const bad = path.join(DATA, 'bad.yaml'); fs.writeFileSync(bad, 'search:\n  include_titles: ["(unclosed"]\n');
  assert.throws(() => loadConfig(bad), /invalid regular expression/);
});

test('discover: verifies the board really belongs to the company, survives outages, resumes', async () => {
  down = true;
  const r0 = await discover(companies.slice(0, 2), {});
  assert.equal(r0.summary.errors, 2, 'an outage is recorded as an error, not as "company has no board"');
  down = false;
  const { summary } = await discover(companies, {});
  const b = loadBoards();
  assert.deepEqual([summary.resolved, summary.unresolved, summary.errors], [2, 2, 0]);
  assert.deepEqual([b.globex.ats, b.globex.board, b.globex.confidence], ['greenhouse', 'globex', 'name verified']);
  assert.equal(b.box.status, 'unresolved'); assert.match(b.box.note, /Boxed Wholesale/);
  assert.match(b.hooli.confidence, /check/, 'a board that cannot name its owner is flagged');
  const n = calls.length; await discover(companies, {});
  assert.equal(calls.length, n, 'second run makes no requests: results are cached');
  const csv = fs.readFileSync(path.join(DATA, 'careers_urls.csv'), 'utf8');
  assert.ok(/^Box,,/m.test(csv) && /^Initech \(India\),,/m.test(csv) && !/Globex/.test(csv));
  // The user supplies a link for a company that guessing could not find.
  fs.writeFileSync(path.join(DATA, 'careers_urls.csv'), 'company,careers_url,why\nBox,https://www.box.com/careers,\n"Initech (India)",boards.greenhouse.io/globex,\n');
  await discover(companies, {});
  const b2 = loadBoards();
  assert.equal(b2.box.status, 'unsupported_site');
  assert.deepEqual([b2.initech.status, b2.initech.confidence], ['resolved', 'your link']);
  fs.writeFileSync(path.join(DATA, 'careers_urls.csv'), 'company,careers_url,why\n');
  await discover([companies[2]], { refresh: true });
  assert.equal(loadBoards().initech.status, 'unresolved');
});

test('discover: falls back to the company website and follows its careers page for free', async () => {
  const extra = [company('Umbrella Corp'), company('Soylent')];
  await discover(extra, {});
  const b = loadBoards();
  assert.deepEqual([b.umbrella.status, b.umbrella.ats, b.umbrella.board, b.umbrella.confidence], ['resolved', 'greenhouse', 'umbrellahq', 'linked from careers page']);
  assert.match(b.umbrella.careers_url, /umbrella\.com\/careers/);
  assert.deepEqual([b.soylent.status, b.soylent.careers_url], ['unsupported_site', 'https://soylent.com/join-us']);
  assert.equal(b.box.status, 'unsupported_site', 'set earlier by the user link; a for-sale domain alone would not count');
  await discover([company('Box')], { refresh: true });
  assert.equal(loadBoards().box.status, 'unresolved', 'a site that never names the company is ignored');
});

test('search: keeps only relevant, reachable, fresh jobs and is safe to repeat', async () => {
  const { added } = await search(companies, cfg, ['Backend Engineer']);
  const jobs = loadState().jobs;
  const st = (id) => jobs[`greenhouse:globex:${id}`]?.status;
  assert.equal(st(101), 'new'); assert.equal(jobs['greenhouse:globex:101'].minYears, 2);
  assert.ok(jobs['greenhouse:globex:101'].description.startsWith('About the role'), 'escaped HTML is decoded');
  assert.equal(st(102), undefined, 'senior title filtered');
  assert.equal(st(103), 'skipped'); assert.match(jobs['greenhouse:globex:103'].reason, /6\+ years/);
  assert.equal(st(104), undefined, 'Indiana is not India');
  assert.equal(st(105), undefined, 'stale posting filtered');
  assert.equal(st(106), 'needs_manual', 'unreadable description is never tailored blind');
  assert.equal(st(107), undefined, 'per-company cap reached');
  assert.equal(jobs['lever:hooli:abc-1'].status, 'new', 'matched through a resume-derived title');
  assert.equal(added, 3);
  const again = await search(companies, cfg, ['Backend Engineer']);
  assert.equal(again.added, 0); assert.equal(Object.keys(loadState().jobs).length, Object.keys(jobs).length);
  // Posting removed from the board -> closed; but an unreadable board must not close anything.
  const saved = GH.globex.jobs; GH.globex.jobs = saved.filter((j) => j.id !== 106);
  down = true; await search(companies, cfg, []); down = false;
  assert.equal(loadState().jobs['greenhouse:globex:106'].status, 'needs_manual');
  await search(companies, cfg, ['Backend Engineer']);
  assert.equal(loadState().jobs['greenhouse:globex:106'].status, 'closed');
  assert.equal(loadState().jobs['greenhouse:globex:101'].status, 'new');
  GH.globex.jobs = saved;
});

const resume = {
  name: 'Asha Rao', contact: { email: 'asha@example.com', phone: '+91 90000 00000', location: 'Bengaluru', links: [{ label: 'GitHub', url: 'https://github.com/asha' }] },
  summary: 'Software engineer with 2 years of experience.', skills: [{ category: 'Languages', items: ['Java', 'SQL'] }],
  experience: [{ company: 'Acme Pay', title: 'Software Engineer', location: 'Bengaluru', start: 'Jul 2024', end: 'Present', bullets: ['Built payment services in Java & Spring Boot.', 'Cut latency by 35%.'] }],
  projects: [{ name: 'Ledger', tech: ['Java'], link: '', bullets: ['Built a ledger.'] }],
  education: [{ institution: 'VIT', degree: 'B.Tech CSE', start: '2020', end: '2024', details: '' }], certifications: [], achievements: [], target_titles: [],
};
const docsDir = path.join(DATA, 'out', 'globex');
const resumePdf = path.join(docsDir, 'Asha_Rao_Resume.pdf');
const coverPdf = path.join(docsDir, 'Asha_Rao_Cover_Letter.pdf');

test('documents: PDF has selectable text, fits the page limit, shrinks when too long', async () => {
  const browser = await launchHeadless();
  try {
    const fit = await renderResumePdf(browser, resume, resumePdf, 1);
    assert.deepEqual([fit.pages, fit.fits, fit.fontPt], [1, true, 10.5]);
    await renderHtmlPdf(browser, coverLetterHtml(resume, { company: 'Globex', title: 'Software Engineer' }, ['I build payment services.']), coverPdf);
    const long = structuredClone(resume);
    long.experience[0].bullets = Array.from({ length: 48 }, (_, i) => `Delivered feature number ${i} for the payments platform with thorough tests and documentation.`);
    const f2 = await renderResumePdf(browser, long, path.join(docsDir, 'long.pdf'), 1);
    assert.ok(f2.fontPt < 10.5, 'type is reduced before giving up');
    const f3 = await renderResumePdf(browser, { ...long, experience: Array.from({ length: 4 }, () => long.experience[0]) }, path.join(docsDir, 'longer.pdf'), 1);
    assert.equal(f3.fits, false, 'an overflow is reported, not hidden');
  } finally { await browser.close(); }
  let text;
  try { text = execFileSync('pdftotext', ['-layout', resumePdf, '-'], { encoding: 'utf8' }); } catch { return; } // pdftotext not installed: skip the text check
  for (const s of ['Asha Rao', 'asha@example.com', 'EXPERIENCE', 'Software Engineer, Acme Pay', 'Java & Spring Boot', 'EDUCATION', 'B.Tech CSE']) assert.ok(text.includes(s), `PDF text contains "${s}"`);
});

const profile = () => ({
  first_name: 'Asha', last_name: 'Rao', email: 'asha@example.com', phone: '+91 90000 00000', city: 'Bengaluru', country: 'India',
  linkedin: 'https://www.linkedin.com/in/asha', github: '', portfolio: '', years_of_experience: '2', requires_sponsorship: 'No',
  authorized_countries: ['India'], gender: '', accept_privacy_consent: true, answers: [],
});
function queue(id, urlPath, extra = {}) {
  const state = loadState();
  const job = { key: `greenhouse:globex:${id}`, company: 'Globex Inc.', companyKey: 'globex', ats: 'greenhouse', board: 'globex', id: String(id), title: `Software Engineer ${id}`,
    location: 'Bengaluru, India', url: base + urlPath, applyUrl: base + urlPath, altApplyUrl: null, description: longJd(2), applyMode: 'auto', boardConfidence: 'name verified',
    docs: { dir: docsDir, resume: resumePdf, cover: coverPdf, coverTxt: null }, tailoredText: 'Java', history: [], ...extra };
  setStatus(job, extra.status ?? 'prepared', '');
  state.jobs[job.key] = job; saveState(state);
  return job.key;
}
const only = (key) => { const s = loadState(); for (const j of Object.values(s.jobs)) if (j.key !== key && j.status === 'prepared') setStatus(j, 'skipped', 'test'); saveState(s); };
const run = async (key, p = profile(), opts = {}) => { only(key); await applyAll(cfg, p, companies, { auto: true, ...opts }); return loadState().jobs[key]; };

test('apply: an unanswered required question stops the application', async () => {
  const j = await run(queue(201, '/form'));
  assert.equal(j.status, 'needs_manual'); assert.match(j.reason, /1 required question\(s\) unanswered/);
  assert.equal(submissions.length, 0, 'nothing was sent');
});

test('apply: a fully answered form is filled correctly and submitted once', async () => {
  const p = profile(); p.answers = [{ re: /why do you want to work/i, answer: 'Your payments platform matches the reconciliation work I do today.' }];
  const key = queue(202, '/form');
  const j = await run(key, p);
  assert.equal(j.status, 'submitted'); assert.equal(submissions.length, 1);
  const body = submissions[0];
  const field = (name) => new RegExp(`name="${name}"\\r\\n\\r\\n([^\\r]*)`).exec(body)?.[1];
  assert.deepEqual([field('first_name'), field('last_name'), field('email'), field('phone')], ['Asha', 'Rao', 'asha@example.com', '+91 90000 00000']);
  assert.equal(field('linkedin'), 'https://www.linkedin.com/in/asha');
  assert.equal(field('github'), '', 'a URL you did not provide stays empty');
  assert.equal(field('yoe'), '2'); assert.equal(field('auth'), '1'); assert.equal(field('sponsorship'), 'No');
  assert.equal(field('gender'), 'd', 'voluntary question declined');
  assert.equal(field('consent'), 'yes'); assert.equal(field('marketing'), undefined, 'marketing opt-in left unticked');
  assert.match(field('why'), /reconciliation/);
  assert.match(body, /name="resume"; filename="Asha_Rao_Resume\.pdf"/); assert.match(body, /name="cover_letter"; filename="Asha_Rao_Cover_Letter\.pdf"/);
  assert.ok(body.includes('%PDF-'), 'the real PDF bytes were uploaded');
  // Running again must not send a second application.
  await applyAll(cfg, p, companies, { auto: true });
  assert.equal(submissions.length, 1);
  // The same role re-posted under a new id is recognised.
  const s = loadState(); s.jobs[key].title = 'Software Engineer 203'; saveState(s);
  const dup = await run(queue(203, '/form'), p);
  assert.equal(dup.status, 'skipped'); assert.match(dup.reason, /already applied/); assert.equal(submissions.length, 1);
});

test('apply: every doubtful situation ends without a submission', async () => {
  const p = profile(); p.answers = [{ re: /why do you want to work/i, answer: 'Because of the payments work.' }];
  const n = submissions.length;
  let j = await run(queue(301, '/form?mode=invalid'), p);
  assert.equal(j.status, 'needs_manual'); assert.match(j.reason, /valid phone number/);
  j = await run(queue(302, '/form?mode=multistep'), p);
  assert.equal(j.status, 'needs_manual'); assert.match(j.reason, /multi-step/);
  j = await run(queue(303, '/gone'), p); assert.equal(j.status, 'closed');
  j = await run(queue(304, '/filled'), p); assert.equal(j.status, 'closed');
  j = await run(queue(305, '/form', { applyMode: 'assisted', ats: 'workable' }), p);
  assert.equal(j.status, 'needs_manual'); assert.match(j.reason, /always sent by you/);
  j = await run(queue(306, '/form', { boardConfidence: 'id only - check' }), p);
  assert.equal(j.status, 'needs_manual'); assert.match(j.reason, /matched by id only/);
  j = await run(queue(307, '/form', { company: 'Initech (India)', companyKey: 'initech' }), p);
  assert.equal(j.status, 'needs_manual'); assert.match(j.reason, /does not mention "Initech/);
  j = await run(queue(308, '/form', { docs: { dir: docsDir, resume: path.join(docsDir, 'missing.pdf') } }), p);
  assert.equal(j.status, 'failed'); assert.match(j.reason, /resume file is missing/);
  const noYears = { ...p, years_of_experience: 'two' };
  j = await run(queue(309, '/form'), noYears);
  assert.equal(j.status, 'needs_manual', 'an answer that does not fit a number field is not forced in');
  j = await run(queue(310, '/form'), p, { dryRun: true });
  assert.equal(j.status, 'prepared', 'dry run changes nothing'); assert.ok(fs.existsSync(path.join(docsDir, 'dry-run.png')));
  assert.equal(submissions.length, n, 'none of the above reached the employer');
});

test('apply: no confirmation and interrupted submits are never retried', async () => {
  const p = profile(); p.answers = [{ re: /why do you want to work/i, answer: 'Because of the payments work.' }];
  const n = submissions.length;
  const stuck = queue(401, '/form', { status: 'submitting' });
  const key = queue(402, '/form?mode=silent');
  const j = await run(key, p);
  assert.equal(j.status, 'unconfirmed'); assert.match(j.reason, /check your email/i);
  assert.equal(loadState().jobs[stuck].status, 'unconfirmed');
  await applyAll(cfg, p, companies, { auto: true });
  assert.equal(loadState().jobs[key].status, 'unconfirmed'); assert.equal(submissions.length, n);
});

/** Plays the part of the person at the terminal. Unexpected questions are recorded and answered with "q". */
function person(answers) {
  const io = { asked: [], printed: [], unexpected: [] };
  io.ask = async (q) => { io.asked.push(q); if (!answers.length) { io.unexpected.push(q); return 'q'; } return answers.shift(); };
  io.print = (s) => io.printed.push(s);
  return io;
}
const profileFile = path.join(DATA, 'profile.yaml');
fs.writeFileSync(profileFile, `# my profile - comments must survive
first_name: "Asha"
last_name: "Rao"
email: "asha@example.com"
phone: "+91 90000 00000"
linkedin: "https://www.linkedin.com/in/asha"
years_of_experience: ""   # left empty on purpose
requires_sponsorship: "No"
authorized_countries: ["India"]
accept_privacy_consent: true
answers:
`);

test('interactive: asks for what it does not know, shows the form, submits only after you confirm', async () => {
  const p = loadProfile(profileFile);
  const key = queue(501, '/form');
  const n = submissions.length;
  const io = person(['2', 'I like the payments work at Globex.', 'y', 'n', 's']);
  await applyAll(cfg, p, companies, { only: key, io, sites: false });
  assert.deepEqual(io.unexpected, []);
  assert.match(io.asked[0], /a number/, 'years of experience asked as a number');
  assert.match(io.printed.join('\n'), /\? Years of experience \*\s+\(required\)/);
  assert.match(io.printed.join('\n'), /\? Why do you want to work at Globex\? \*/);
  assert.match(io.printed.join('\n'), /1 optional question\(s\) are empty: "GitHub URL"/); assert.match(io.asked[3], /Answer them now/);
  const snapshot = io.printed.join('\n');
  assert.match(snapshot, /Here is everything on the form now/);
  assert.match(snapshot, /First Name \*\s+Asha/); assert.match(snapshot, /Resume\/CV \*\s+Asha_Rao_Resume\.pdf/);
  assert.match(snapshot, /Years of experience \*\s+2/); assert.match(snapshot, /GitHub URL\s+\(empty\)/);
  assert.match(snapshot, /Are all the details correct\?/);
  assert.equal(submissions.length, n + 1, 'submitted exactly once, after "s"');
  assert.match(submissions.at(-1), /name="yoe"\r\n\r\n2\r\n/); assert.match(submissions.at(-1), /I like the payments work at Globex\./);
  assert.equal(loadState().jobs[key].status, 'submitted');
  assert.match(loadState().jobs[key].reason, /Confirmed by the site at http:\/\/127\.0\.0\.1:\d+\/submit \("Thank you for applying/);
  assert.match(io.printed.join('\n'), /The site confirmed it: "Thank you for applying/);
  const saved = fs.readFileSync(profileFile, 'utf8');
  assert.match(saved, /# my profile - comments must survive/);
  assert.match(saved, /years_of_experience: "?2"?/, 'a standard field is saved back to profile.yaml');
  assert.match(saved, /match: .*Why\\s\+do\\s\+you.*\n\s+answer: I like the payments work at Globex\./, 'a free-form answer is remembered when you say so');
});

test('interactive: a rejected form is not submitted; remembered answers are reused; you can skip', async () => {
  const p = loadProfile(profileFile);
  assert.equal(p.years_of_experience, '2');
  const key = queue(502, '/form?mode=invalid');
  const n = submissions.length;
  const io = person(['n', 's', 'k']);
  await applyAll(cfg, p, companies, { only: key, io, sites: false });
  assert.deepEqual(io.unexpected, []);
  assert.ok(!io.asked.some((q) => /Your answer/.test(q)), 'nothing had to be asked again');
  assert.match(io.printed.join('\n'), /did not accept the form: Please enter a valid phone number/);
  assert.equal(io.asked.filter((q) => /Answer them now/.test(q)).length, 1, 'declined optional questions are not asked again for the same job');
  assert.equal(loadState().jobs[key].status, 'skipped');
  assert.equal(submissions.length, n);
});

test('interactive: you can quit, choose later, or say you submitted it yourself', async () => {
  const p = loadProfile(profileFile);
  const k1 = queue(503, '/form');
  await applyAll(cfg, p, companies, { only: k1, io: person(['n', 'q']), sites: false });
  assert.equal(loadState().jobs[k1].status, 'prepared', 'quitting leaves the job to be offered again');
  await applyAll(cfg, p, companies, { only: k1, io: person(['n', 'l']), sites: false });
  assert.equal(loadState().jobs[k1].status, 'needs_manual');
  await applyAll(cfg, p, companies, { only: k1, io: person(['n', 'd']), sites: false });
  assert.equal(loadState().jobs[k1].status, 'submitted');
  assert.match(loadState().jobs[k1].reason, /by you/);
});

test("interactive: the site's own Apply button is pressed only when it cannot send a form", async () => {
  const p = loadProfile(profileFile);
  const n = submissions.length;
  const k1 = queue(601, '/quick');
  const io1 = person(['k']);
  await applyAll(cfg, p, companies, { only: k1, io: io1, sites: false });
  assert.equal(submissions.length, n, 'an "Apply" button that submits a form is never pressed on its own');
  assert.ok(!io1.printed.join('\n').includes("pressed the site's Apply button"));
  const k2 = queue(602, '/jd');
  const io2 = person(['n', 'k']);
  await applyAll(cfg, p, companies, { only: k2, io: io2, sites: false });
  assert.deepEqual(io2.unexpected, []);
  const out = io2.printed.join('\n');
  assert.match(out, new RegExp(`Opened in the browser: ${base.replace(/[.]/g, '\\.')}/form  \\(pressed the site's Apply button`), 'a link that only opens the form is followed, and you are told');
  assert.equal(submissions.length, n);
});

test("interactive: companies without a searchable board - their careers site is opened and you pick the job", async () => {
  const p = loadProfile(profileFile);
  const sitesCompanies = [company('Initech (India)'), company('Vandelay Industries')];
  const boards = loadBoards();
  boards.initech = { company: 'Initech (India)', key: 'initech', status: 'unsupported_site', careers_url: `${base}/form` };
  boards.vandelayindustries = { company: 'Vandelay Industries', key: 'vandelayindustries', status: 'unsupported_site', careers_url: `${base}/filled` };
  saveBoards(boards);
  // Clear jobs left over from earlier tests: open jobs are always offered before the careers sites.
  const s0 = loadState(); for (const j of Object.values(s0.jobs)) if (['new', 'prepared', 'needs_manual', 'failed'].includes(j.status)) setStatus(j, 'skipped', 'test'); saveState(s0);
  const n = submissions.length;
  const io = person(['', '', '', 'n', 's', 'n', 'n']);
  await applyAll(cfg, p, sitesCompanies, { io, base: resume });
  assert.deepEqual(io.unexpected, []);
  assert.match(io.asked[2], /Job title \[Software Engineer\]/, 'title read from the page');
  assert.match(io.printed.join('\n'), new RegExp(`Careers page: ${base.replace(/[.]/g, '\\.')}/form`));
  const state = loadState();
  const job = Object.values(state.jobs).find((j) => j.key.startsWith('site:initech:'));
  assert.equal(job.status, 'submitted');
  assert.ok(fs.existsSync(job.docs.resume), 'a resume was prepared for the job you picked');
  assert.equal(submissions.length, n + 1);
  assert.match(submissions.at(-1), /filename="Asha_Rao_Resume\.pdf"/);
  assert.deepEqual([state.sites.initech.status, state.sites.vandelayindustries.status], ['done', 'no_job']);
  // Next run: handled companies are not offered again.
  const io2 = person([]);
  await applyAll(cfg, p, sitesCompanies, { io: io2, base: resume });
  assert.deepEqual(io2.asked, []);
});

test('tracker and state: report is written, corrupt state is refused rather than reset', async () => {
  const file = await writeTracker(loadState());
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook(); await wb.xlsx.readFile(file);
  const rows = []; wb.getWorksheet('Jobs').eachRow((r) => rows.push(r.getCell(1).value));
  assert.ok(rows.includes('submitted') && rows.includes('skipped') && rows.includes('unconfirmed'));
  assert.ok(wb.getWorksheet('Companies').rowCount >= 4);
  assert.ok(fs.existsSync(path.join(DATA, 'state.json.bak')));
  fs.writeFileSync(path.join(DATA, 'state.json'), '{"jobs": {');
  assert.throws(() => loadState(), /not valid JSON/);
});
