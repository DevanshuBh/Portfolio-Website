import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { readCompanies, selectCompanies, nameVariants, companyKey } from '../src/companies.js';
import { slugCandidates } from '../src/discover.js';
import { detectFromUrl, nameMatches } from '../src/ats/index.js';
import { minYearsRequired, titleMatches, locationMatches, preFilter } from '../src/match.js';
import { hasTerm, keywordScore } from '../src/keywords.js';
import { fabricationIn, mergeTailored, checkCoverLetter, resumeHtml } from '../src/resume.js';
import { ruleAnswer, matchOption, coerceText } from '../src/apply/answers.js';
import { htmlToText } from '../src/util.js';
import { localTailor, jdKeywords } from '../src/localTailor.js';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ja-unit-'));

async function sheet(rows, { name = 'All', lead = [] } = {}) {
  const wb = new ExcelJS.Workbook();
  wb.addWorksheet('Notes').addRow(['nothing here']);
  const ws = wb.addWorksheet(name);
  for (const r of lead) ws.addRow(r);
  for (const r of rows) ws.addRow(r);
  const f = path.join(tmp, `c${Math.random()}.xlsx`);
  await wb.xlsx.writeFile(f);
  return f;
}

test('company list: header below a title row, duplicates, blanks, remark brackets, URLs', async () => {
  const f = await sheet([
    ['S.No', 'Company', 'Country', 'Sector', 'Resume Match Score', 'Tier', 'Location Priority', 'Careers URL'],
    [1, 'Paytm (One97 Communications)', 'India', 'Fintech', 5, '⭐ Tier 1', '1 - Primary', ''],
    [2, '  MongoDB   Inc. ', 'USA', 'DB', 9, '⭐ Tier 1', '2 - Remote/Relocate', 'jobs.lever.co/mongodb'],
    [3, null, 'USA', 'x', 1, 'Tier 3', '', ''],
    [4, 'MongoDB (India)', 'India', 'DB', 3, '✅ Tier 2', '1 - Primary', ''],
    [5, 'SAP (already listed)', 'Germany', 'x', 1, '🔵 Tier 3', '', 'not a url'],
    [6, 'GoTo (GoToConnect)', 'USA', 'x', 1, '🔵 Tier 3', '', ''],
    [7, 'GoTo (Gojek / Tokopedia)', 'Indonesia', 'x', 1, '🔵 Tier 3', '', ''],
    [8, 'Ola Cabs', 'India', 'x', -1, '❌ Low Fit', '1 - Primary', ''],
  ], { lead: [['My company list'], []] });
  const { companies, issues, sheet: used } = await readCompanies(f);
  assert.equal(used, 'All');
  assert.deepEqual(companies.map((c) => c.name).sort(), ['GoTo (GoToConnect)', 'GoTo (Gojek / Tokopedia)', 'MongoDB   Inc.'.replace(/\s+/g, ' '), 'Ola Cabs', 'Paytm (One97 Communications)', 'SAP (already listed)'].sort());
  const mongo = companies.find((c) => c.key === 'mongodb');
  assert.equal(mongo.tier, '⭐ Tier 1');
  assert.equal(mongo.priority, '1 - Primary', 'merged row keeps the best location priority');
  assert.equal(mongo.careers_url, 'https://jobs.lever.co/mongodb');
  assert.equal(companies.find((c) => c.key === 'sap').careers_url, '');
  assert.ok(issues.some((i) => /no company name/.test(i)) && issues.some((i) => /duplicates/.test(i)));
  const sel = selectCompanies(companies, { skip_tiers: ['Low Fit'], tiers: [], location_priorities: [], min_match_score: null });
  assert.ok(!sel.some((c) => c.name === 'Ola Cabs'));
  assert.equal(sel[0].tier, '⭐ Tier 1');
  assert.equal(selectCompanies(companies, { skip_tiers: [], tiers: ['tier 1'], location_priorities: [], min_match_score: 6 }).length, 1);
});

test('company list: clear errors for unusable files', async () => {
  await assert.rejects(readCompanies(path.join(tmp, 'missing.xlsx')), /not found/);
  const junk = path.join(tmp, 'junk.xlsx'); fs.writeFileSync(junk, 'not a zip');
  await assert.rejects(readCompanies(junk), /Could not read/);
  const noHeader = await sheet([['a', 'b'], ['c', 'd']]);
  await assert.rejects(readCompanies(noHeader), /"Company" column/);
  await assert.rejects(readCompanies(await sheet([['Company'], ['X']]), { sheet: 'Nope' }), /Sheet "Nope" not found/);
});

test('name variants and board ids', () => {
  assert.deepEqual(nameVariants('Paytm (One97 Communications)'), ['Paytm', 'One97 Communications']);
  assert.deepEqual(nameVariants('BlackRock (India)'), ['BlackRock']);
  assert.deepEqual(nameVariants('SAP (already listed)'), ['SAP']);
  assert.equal(companyKey('D. E. Shaw & Co. (India)'), 'deshaw');
  assert.deepEqual(slugCandidates(nameVariants('D. E. Shaw & Co. (India)')).slice(0, 2), ['deshaw', 'd-e-shaw']);
  assert.deepEqual(slugCandidates(['3M']), []);
  assert.equal(nameMatches('Dropbox', ['Box']), false);
  assert.equal(nameMatches('MongoDB, Inc.', ['MongoDB']), true);
  assert.equal(nameMatches('Block', ['Square', 'Block']), true);
  assert.equal(detectFromUrl('https://example.com/careers?for=acme'), null);
  assert.deepEqual(detectFromUrl('https://boards.greenhouse.io/embed/job_app?for=acme&token=1'), { ats: 'greenhouse', board: 'acme' });
  assert.equal(detectFromUrl('not a url'), null);
});

const search = {
  includeRe: [/software (engineer|developer)/i, /\bsde\b/i, /(front[- ]?end|full[- ]?stack) (engineer|developer)/i],
  excludeRe: [/\b(senior|sr\.?|staff|principal|lead|manager)\b/i, /\bintern(ship)?\b/i],
  use_resume_titles: true, locations: ['India', 'Bengaluru', 'Bangalore'], allow_remote: true, keep_unknown_location: false,
  max_years_required: 3, posted_within_days: 30, max_jobs_per_company: 2,
};

test('title, location and freshness filters', () => {
  assert.ok(titleMatches('Software Engineer II, Payments', search).ok);
  assert.ok(titleMatches('SDE-2', search).ok);
  assert.ok(!titleMatches('Senior Software Engineer', search).ok);
  assert.ok(!titleMatches('Sr. Frontend Developer', search).ok);
  assert.ok(!titleMatches('Software Engineer Intern', search).ok);
  assert.ok(!titleMatches('International Software Developer', { ...search, excludeRe: [/\bintern\b/i] }).ok === false);
  assert.ok(!titleMatches('Product Designer', search).ok);
  assert.ok(titleMatches('Java Backend Developer', search, ['Backend Developer']).ok);
  assert.ok(!titleMatches('', search).ok);
  assert.ok(locationMatches({ location: 'Bengaluru, Karnataka', remote: false }, search).ok);
  assert.ok(!locationMatches({ location: 'Indiana, USA', remote: false }, search).ok, '"India" must not match "Indiana"');
  assert.ok(locationMatches({ location: 'Remote - EMEA', remote: true }, search).ok);
  assert.ok(!locationMatches({ location: '', remote: false }, search).ok);
  assert.ok(locationMatches({ location: 'Anywhere', remote: false }, { ...search, locations: [] }).ok);
  const old = new Date(Date.now() - 90 * 86400000).toISOString();
  assert.equal(preFilter({ title: 'Software Engineer', location: 'India', postedAt: old }, search).reason, 'posting too old');
  assert.ok(preFilter({ title: 'Software Engineer', location: 'India', postedAt: null }, search).ok);
});

test('years of experience parsing', () => {
  assert.equal(minYearsRequired('5+ years of experience in backend development'), 5);
  assert.equal(minYearsRequired('You have 2-4 years of professional experience'), 2);
  assert.equal(minYearsRequired('Requires 3 to 5 yrs experience building APIs'), 3);
  assert.equal(minYearsRequired('We were founded 20 years ago and serve millions.'), null);
  assert.equal(minYearsRequired('Must be 18 years of age.'), null);
  assert.equal(minYearsRequired('8+ years experience preferred; minimum 2 years of experience with Java'), 2);
  assert.equal(minYearsRequired(''), null);
});

test('keyword matching is whole-term and alias aware', () => {
  assert.ok(!hasTerm('Built services in JavaScript', 'Java'));
  assert.ok(hasTerm('Built services in Java, Spring', 'Java'));
  assert.ok(hasTerm('Deployed on K8s', 'Kubernetes'));
  assert.ok(hasTerm('React.js and Node', 'ReactJS'));
  assert.ok(hasTerm('C++ and C#', 'C++') && !hasTerm('C# only', 'C++'));
  assert.ok(hasTerm('RESTful APIs', 'REST API'));
  assert.ok(!hasTerm('Going to market', 'Go'));
  const s = keywordScore('Java, Spring Boot, AWS', ['Java', 'Kafka', 'Spring Boot', 'java']);
  assert.equal(s.score, 67); assert.deepEqual(s.missing, ['Kafka']);
  assert.equal(keywordScore('x', []).score, null);
});

const base = {
  name: 'Asha Rao', contact: { email: 'asha@example.com', phone: '+91 90000 00000', location: 'Bengaluru', links: [{ label: 'GitHub', url: 'https://github.com/asha' }] },
  summary: 'Software engineer with 2 years of experience building Java services.',
  skills: [{ category: 'Languages', items: ['Java', 'JavaScript', 'SQL'] }, { category: 'Tools', items: ['Spring Boot', 'Docker', 'AWS'] }],
  experience: [{ company: 'Acme Pay', title: 'Software Engineer', location: 'Bengaluru', start: 'Jul 2024', end: 'Present',
    bullets: ['Built payment reconciliation services in Java and Spring Boot handling 40000 transactions a day.', 'Cut API latency by 35% by adding Redis caching.', 'Wrote unit tests with JUnit.'] }],
  projects: [{ name: 'Portfolio', tech: ['React', 'Three.js'], link: '', bullets: ['Built a 3D portfolio site with React.'] }, { name: 'Ledger', tech: ['Java'], link: '', bullets: ['Built a double-entry ledger in Java.'] }],
  education: [{ institution: 'VIT', degree: 'B.Tech CSE', start: '2020', end: '2024', details: '' }],
  certifications: [], achievements: [], target_titles: ['Software Engineer'],
};

test('tailoring never lets invented facts through', () => {
  const t = {
    jd_keywords: ['Java', 'Kafka', 'Spring Boot', 'Kubernetes', 'Redis'],
    summary: 'Software engineer with 5 years of experience in Java and Kafka.',
    skills: [{ category: 'Backend', items: ['Java', 'Spring Boot', 'Kafka', 'Redis', 'java'] }, { category: 'Cloud', items: ['AWS', 'Kubernetes'] }],
    experience: [{ index: 0, bullets: [
      'Built Java and Spring Boot payment reconciliation services processing 40000 transactions a day.',
      'Reduced API latency by 60% with Redis caching.',
      'Deployed services to Kubernetes.',
      'Extra bullet that the original does not have.',
    ] }, { index: 7, bullets: ['ghost'] }],
    project_order: [1, 1, 9], projects: [{ index: 1, bullets: ['Built a double-entry ledger in Java with Terraform.'] }],
    cover_letter_paragraphs: [],
  };
  const { resume, notes, score } = mergeTailored(base, t);
  assert.equal(resume.summary, base.summary, 'summary with a new number and a missing keyword is rejected');
  assert.deepEqual(resume.skills, [{ category: 'Backend', items: ['Java', 'Spring Boot', 'Redis'] }, { category: 'Cloud', items: ['AWS'] }], 'Redis is allowed (it is in a bullet), Kafka/Kubernetes are not');
  const b = resume.experience[0].bullets;
  assert.equal(b.length, 3, 'never more bullets than the original');
  assert.equal(b[0], t.experience[0].bullets[0], 'honest rephrasing is kept');
  assert.ok(!b.some((x) => /60%|Kubernetes/.test(x)), 'changed number and invented tool are reverted');
  assert.deepEqual(new Set(b), new Set([t.experience[0].bullets[0], ...base.experience[0].bullets.slice(0, 2)]));
  assert.deepEqual(resume.projects.map((p) => p.name), ['Ledger', 'Portfolio'], 'projects reordered, none lost or duplicated');
  assert.equal(resume.projects[0].bullets[0], base.projects[1].bullets[0], 'Terraform bullet reverted');
  assert.equal(resume.experience[0].company, 'Acme Pay'); assert.equal(resume.experience[0].start, 'Jul 2024');
  assert.deepEqual(resume.education, base.education); assert.deepEqual(resume.contact, base.contact);
  assert.ok(notes.length >= 5);
  assert.equal(score.before, 60); assert.equal(score.after, 60); assert.deepEqual(score.missing, ['Kafka', 'Kubernetes']);
  assert.equal(fabricationIn('Improved latency by 35% using Redis caching.', JSON.stringify(base), ['Redis']), null);
  assert.match(fabricationIn('Led Agile ceremonies for the team.', 'Built things in Java.', []), /Agile/);
  // An empty / useless model reply leaves the resume exactly as it was.
  assert.deepEqual(mergeTailored(base, { jd_keywords: [], summary: '', skills: [], experience: [], project_order: [], projects: [], cover_letter_paragraphs: [] }).resume, base);
});

test('cover letter checks', () => {
  const job = { title: 'Software Engineer', company: 'Globex', description: 'We process 3 million payments. Kafka is used.' };
  const body = Array.from({ length: 3 }, () => 'At Acme Pay I built payment reconciliation services in Java and Spring Boot and reduced API latency with Redis caching, which is the kind of backend work this role at Globex describes, and I would bring the same care for correctness and testing to your payments platform from the first week onward.');
  assert.ok(checkCoverLetter(body, base, job).ok);
  assert.match(checkCoverLetter(['Too short.'], base, job).reason, /length/);
  assert.match(checkCoverLetter([...body, 'Dear [Hiring Manager], I improved revenue.'], base, job).reason, /placeholder/);
  assert.match(checkCoverLetter([...body, 'I grew usage by 900 percent.'], base, job).reason, /900/);
  assert.match(checkCoverLetter([...body, 'I have deep experience with Kafka.'], base, { ...job, jdKeywordsLacking: ['Kafka'] }).reason, /Kafka/);
});

test('resume HTML escapes content and omits empty sections', () => {
  const html = resumeHtml({ ...base, name: 'A <b>& Co', certifications: [], achievements: [] });
  assert.ok(html.includes('A &lt;b&gt;&amp; Co') && !html.includes('Certifications') && html.includes('<h2>Experience</h2>'));
});

const profile = {
  first_name: 'Asha', last_name: 'Rao', email: 'asha@example.com', phone: '+91 90000 00000', city: 'Bengaluru', country: 'India', linkedin: 'https://linkedin.com/in/asha',
  github: '', portfolio: '', years_of_experience: '2', notice_period: '30 days', expected_ctc: '', requires_sponsorship: 'No', willing_to_relocate: 'Yes',
  authorized_countries: ['India'], work_authorization: 'Indian citizen', how_did_you_hear: 'Company careers page', gender: '', accept_privacy_consent: true,
  answers: [{ re: /worked (at|for) .* before/i, answer: 'No' }],
};
const ctx = { profile, job: { location: 'Bengaluru, India' }, docs: { resume: '/r.pdf', cover: '/c.pdf', coverText: 'Dear Hiring Team' }, fileInputCount: 2 };
const f = (label, extra = {}) => ({ kind: 'text', inputType: 'text', label, required: false, ...extra });

test('form questions are answered from the profile, and unknowns are left alone', () => {
  assert.equal(ruleAnswer(f('First Name *'), ctx).value, 'Asha');
  assert.equal(ruleAnswer(f('Legal name'), ctx).value, 'Asha Rao');
  assert.equal(ruleAnswer(f('Email Address'), ctx).value, 'asha@example.com');
  assert.equal(ruleAnswer(f('LinkedIn Profile'), ctx).value, 'https://linkedin.com/in/asha');
  assert.deepEqual(ruleAnswer(f('GitHub URL'), ctx), { need: 'github' }, 'empty profile value is never invented; it is asked for');
  assert.equal(ruleAnswer(f('Resume/CV', { kind: 'file' }), ctx).value, '/r.pdf');
  assert.equal(ruleAnswer(f('Cover Letter', { kind: 'file' }), ctx).value, '/c.pdf');
  assert.equal(ruleAnswer(f('Cover Letter', { kind: 'file' }), { ...ctx, docs: { ...ctx.docs, cover: null } }), null);
  assert.ok(ruleAnswer(f('Transcript', { kind: 'file' }), ctx).skip);
  assert.equal(ruleAnswer(f('Are you legally authorized to work in India?'), ctx).value, 'Yes');
  assert.equal(ruleAnswer(f('Are you authorized to work in the United States?'), ctx).value, 'No');
  assert.equal(ruleAnswer(f('Will you now or in the future require visa sponsorship?'), ctx).value, 'No');
  assert.equal(ruleAnswer(f('What is your notice period?'), ctx).value, '30 days');
  assert.equal(ruleAnswer(f('I acknowledge the privacy notice'), ctx), null, '"privacy notice" on a text field is not the notice period');
  assert.deepEqual(ruleAnswer(f('Expected CTC'), ctx), { need: 'expected_ctc' });
  assert.equal(ruleAnswer(f('Years of experience'), ctx).value, '2');
  assert.equal(ruleAnswer(f('How many years of experience do you have with Kafka?'), ctx), null, 'skill-specific years are not the total');
  assert.equal(ruleAnswer(f('Have you worked at Globex before?'), ctx).value, 'No');
  assert.equal(ruleAnswer(f('Gender', { kind: 'select', options: [{ label: 'Male' }, { label: 'Female' }, { label: 'Decline To Self Identify' }] }), ctx).value, 'Decline To Self Identify');
  assert.ok(ruleAnswer(f('Gender', { kind: 'select', options: [{ label: 'Male' }, { label: 'Female' }] }), ctx).skip);
  assert.equal(ruleAnswer(f('Gender', { kind: 'select', required: true, options: [{ label: 'Male' }, { label: 'Female' }] }), ctx), null);
  assert.equal(ruleAnswer(f('I agree to the Privacy Policy', { kind: 'checkbox', single: true }), ctx).value, true);
  assert.ok(ruleAnswer(f('Send me job alerts and marketing emails', { kind: 'checkbox', single: true }), ctx).skip);
  assert.equal(ruleAnswer(f('I agree to the Privacy Policy', { kind: 'checkbox', single: true }), { ...ctx, profile: { ...profile, accept_privacy_consent: false } }), null);
  assert.equal(ruleAnswer(f('Why do you want to work here?', { kind: 'textarea' }), ctx), null);
  assert.equal(ruleAnswer(f('Cover letter', { kind: 'textarea' }), ctx).value, 'Dear Hiring Team');
  assert.equal(ruleAnswer(f('What is your favourite colour?'), ctx), null);
});

test('option matching refuses to guess', () => {
  const yn = [{ label: 'Yes' }, { label: 'No' }];
  assert.equal(matchOption(yn, 'yes').label, 'Yes');
  assert.equal(matchOption([{ label: 'Yes, I am authorized' }, { label: 'No, I am not' }], 'No').label, 'No, I am not');
  assert.equal(matchOption([{ label: 'Yes' }, { label: 'Yes, with sponsorship' }, { label: 'No' }], 'Yes').label, 'Yes', 'exact label wins');
  assert.equal(matchOption([{ label: 'Yes, citizen' }, { label: 'Yes, with sponsorship' }], 'Yes'), null, 'ambiguous -> no guess');
  assert.equal(matchOption([{ label: 'India (+91)' }, { label: 'Indonesia' }], 'India').label, 'India (+91)');
  assert.equal(matchOption([{ label: '0-1 years' }, { label: '1-3 years' }, { label: '3+ years' }], '2').label, '1-3 years');
  assert.equal(matchOption([{ label: 'Less than 1' }, { label: '5+' }], '2'), null);
  assert.equal(matchOption([{ label: 'Male' }, { label: 'Female' }], 'Decline'), null);
  assert.equal(matchOption([], 'x'), null);
});

test('text answers are fitted to the input type or refused', () => {
  assert.equal(coerceText({ inputType: 'number' }, '2 years'), '2');
  assert.equal(coerceText({ inputType: 'number' }, 'two'), null);
  assert.equal(coerceText({ inputType: 'url' }, 'linkedin.com/in/x'), null);
  assert.equal(coerceText({ inputType: 'date' }, '2026-12-01'), '2026-12-01');
  assert.equal(coerceText({ inputType: 'date' }, 'Immediately'), null);
  assert.equal(coerceText({ inputType: 'text', kind: 'text', maxLength: 5 }, 'too long value'), null);
  assert.equal(coerceText({ kind: 'textarea', maxLength: 12 }, 'hello wonderful world'), 'hello');
});

test('html to text handles escaped and plain HTML', () => {
  assert.equal(htmlToText('&lt;p&gt;Hello &amp;amp; welcome&lt;/p&gt;&lt;ul&gt;&lt;li&gt;Java&lt;/li&gt;&lt;/ul&gt;'), 'Hello & welcome\n- Java');
  assert.equal(htmlToText('<div>A<br>B</div><script>x()</script>'), 'A\nB');
  assert.equal(htmlToText(null), '');
});

test('free tailoring only re-orders the resume and builds the letter from its own lines', () => {
  const job = { title: 'Backend Engineer', company: 'Globex', location: 'Pune', description: 'You will build services with Spring Boot, Docker and AWS. Kafka and Kubernetes are a plus. JavaScript not required. Payments domain.' };
  assert.deepEqual(jdKeywords(job.description, base).slice(0, 4), ['JavaScript', 'Spring Boot', 'Docker', 'AWS']);
  const t = localTailor(base, job);
  const { resume, notes, score } = mergeTailored(base, t);
  assert.deepEqual(notes, [], 'nothing needed reverting: no new content exists');
  assert.equal(resume.skills[0].category, 'Tools', 'most relevant skill group first');
  const flat = (r) => [...r.skills.flatMap((s) => s.items), ...r.experience.flatMap((e) => e.bullets), ...r.projects.flatMap((p) => p.bullets)].sort();
  assert.deepEqual(flat(resume), flat(base), 'same content, different order');
  assert.equal(resume.experience[0].bullets[0], base.experience[0].bullets[0]);
  assert.equal(score.before, score.after);
  assert.ok(score.missing.includes('Kafka') && score.missing.includes('Kubernetes'));
  const cover = checkCoverLetter(t.cover_letter_paragraphs, base, { ...job, jdKeywordsLacking: score.missing }, 70);
  assert.ok(cover.ok, cover.reason);
  const text = cover.paragraphs.join(' ');
  assert.match(text, /Backend Engineer position at Globex/); assert.match(text, /I built payment reconciliation services/);
  assert.ok(!/Kafka|Kubernetes/.test(text), 'the letter never mentions skills you lack');
  // No overlap at all -> no letter rather than a generic one.
  const none = localTailor(base, { ...job, description: 'Looking for a pastry chef with croissant experience.' });
  assert.deepEqual(none.cover_letter_paragraphs, []);
  assert.match(checkCoverLetter([], base, job, 70).reason, /too little overlap/);
});
