import { z } from 'zod';
import { ask } from '../llm.js';
import { norm } from '../util.js';

const DECLINE_RE = /\b(decline|prefer not|rather not|do not wish|don t wish|not to (say|answer|disclose|identify|specify)|choose not|not wish)\b/;
const COUNTRIES = {
  india: ['india'], 'united states': ['united states', 'usa', 'u s', 'us', 'america'], 'united kingdom': ['united kingdom', 'uk', 'u k', 'great britain', 'england'],
  canada: ['canada'], germany: ['germany'], uae: ['uae', 'united arab emirates', 'dubai'], singapore: ['singapore'], australia: ['australia'],
  netherlands: ['netherlands'], ireland: ['ireland'], france: ['france'], japan: ['japan'], europe: ['europe', 'eu', 'european union', 'eea'],
};
const countryIn = (text) => {
  const t = ` ${norm(text)} `;
  for (const [name, forms] of Object.entries(COUNTRIES)) if (forms.some((f) => t.includes(` ${f} `))) return name;
  return null;
};
const sameCountry = (a, b) => { const x = countryIn(a) ?? norm(a); const y = countryIn(b) ?? norm(b); return Boolean(x) && x === y; };

/**
 * Answer a form question from the profile and prepared documents alone.
 * Returns { value, source } to fill, { skip: reason } to deliberately leave it alone, or null when
 * the profile has no answer (the caller then tries the model, and failing that leaves it for the user).
 */
export function ruleAnswer(field, ctx) {
  const { profile: p, job, docs } = ctx;
  const q = ` ${norm(field.label)} `;
  const has = (re) => re.test(q);
  // pv: a profile field. When it is empty, report which one, so the answer you give can be saved there.
  const pv = (key) => (String(p[key] ?? '').trim() ? { value: String(p[key]).trim(), source: 'profile' } : { need: key });
  const val = (v, source = 'profile') => (v !== undefined && v !== null && String(v).trim() !== '' ? { value: String(v).trim(), source } : null);

  if (field.kind === 'file') {
    if (has(/cover letter|covering letter|motivation letter/)) return docs.cover ? { value: docs.cover, source: 'document' } : null;
    if (has(/resume|\bcv\b|curriculum/)) return { value: docs.resume, source: 'document' };
    if (has(/transcript|portfolio|certificate|photo|picture|other|additional|writing sample/)) return { skip: 'optional extra document' };
    return ctx.fileInputCount === 1 || !q.trim() ? { value: docs.resume, source: 'document' } : null;
  }

  for (const a of p.answers) if (a.re.test(field.label)) return { value: a.answer, source: 'your answers' };

  if (field.kind === 'checkbox' && field.single) {
    if (has(/newsletter|marketing|talent (community|network|pool)|future (opportunit|opening|role|position)|sms|text message|whatsapp|job alert|keep me (updated|informed|posted)/)) return { skip: 'optional opt-in left unticked' };
    if (has(/privacy|consent|agree|acknowledg|terms|data (protection|processing)|gdpr|certify|confirm that|accurate|truthful/)) return p.accept_privacy_consent ? { value: true, source: 'consent setting' } : null;
    return null;
  }

  if (field.kind === 'textarea' && has(/cover letter|covering letter|motivation|why (do you want|are you interested|this (role|company|position))/)) {
    return has(/cover letter|covering letter/) && docs.coverText ? { value: docs.coverText, source: 'document' } : null;
  }

  // Voluntary self-identification: use the profile value if given, otherwise decline where the form allows it.
  const eeo = has(/\bgender\b|\bsex\b/) ? 'gender' : has(/race|ethnic|hispanic|latino/) ? 'race_ethnicity' : has(/veteran|military/) ? 'veteran_status'
    : has(/disabilit/) ? 'disability_status' : has(/pronoun/) ? 'pronouns' : null;
  if (eeo) {
    if (String(p[eeo] ?? '').trim()) return val(p[eeo]);
    const decline = (field.options ?? []).find((o) => DECLINE_RE.test(norm(o.label)));
    if (decline) return { value: decline.label, source: 'declined' };
    return field.required ? null : { skip: 'voluntary question left blank' };
  }

  if (has(/sponsor/)) return pv('requires_sponsorship');
  if (has(/authori[sz]ed to work|legally (authori[sz]ed|eligible|permitted|entitled|able)|right to work|eligible to work|work (permit|authori[sz]ation|eligibility)|permitted to work/)) {
    const asked = countryIn(field.label) ?? countryIn(job.location);
    if (asked && p.authorized_countries.length) return { value: p.authorized_countries.some((c) => sameCountry(c, asked)) ? 'Yes' : 'No', source: 'profile' };
    return field.kind === 'text' || field.kind === 'textarea' ? pv('work_authorization') : null;
  }
  if (has(/relocat/)) return pv('willing_to_relocate');
  if (has(/how did you (hear|find|learn)|where did you (hear|find)|source of application|referral source/)) return pv('how_did_you_hear');
  if (has(/notice period|serving notice|notice (required|duration)/)) return pv('notice_period');
  if (has(/(expected|desired|expectation|target|asking).{0,25}(ctc|salary|compensation|pay)|(salary|compensation|pay|ctc).{0,15}(expectation|expected|requirement)/)) return pv('expected_ctc');
  if (has(/(current|present|last drawn).{0,20}(ctc|salary|compensation)/)) return pv('current_ctc');
  if (has(/(start date|when (can|could) you start|earliest.{0,20}(start|join)|available to (start|join)|date of joining|joining date)/)) return pv('earliest_start_date');
  if (has(/years.{0,30}experience|experience.{0,20}(in )?years|total experience|overall experience/) && !has(/ with | in [a-z]+ (development|programming)|using /)) return pv('years_of_experience');

  if (has(/linkedin/)) return pv('linkedin');
  if (has(/github|git hub/)) return pv('github');
  if (has(/portfolio|personal (site|website)|website|other url|blog/)) return pv('portfolio');
  if (has(/twitter|\bx profile\b|facebook|instagram/)) return { skip: 'social profile not provided' };

  if (has(/first name|given name|forename/)) return pv('first_name');
  if (has(/last name|surname|family name/)) return pv('last_name');
  if (has(/preferred (first )?name|nickname|goes by/)) return val(p.preferred_name || p.first_name);
  if (has(/middle name/)) return { skip: 'middle name not provided' };
  if (has(/full name|legal name|your name|^ name $|candidate name|applicant name/) || field.autocomplete === 'name') return val(`${p.first_name} ${p.last_name}`.trim());
  if (has(/e ?mail/) || field.inputType === 'email') return pv('email');
  if (has(/phone|mobile|telephone|contact number|whatsapp number/) || field.inputType === 'tel') return has(/country code|extension/) ? null : pv('phone');

  if (has(/current (company|employer|organi[sz]ation)|present (company|employer)|^ (company|employer|org|organi[sz]ation) $|company name/)) return pv('current_company');
  if (has(/current (title|role|position|designation)|job title|^ (title|designation) $/)) return pv('current_title');
  if (has(/university|college|school|institution|alma mater/)) return pv('university');
  if (has(/graduat.{0,15}(year|date)|year of (graduation|passing)/)) return pv('graduation_year');
  if (has(/degree|highest (level of )?(education|qualification)|education level|qualification/)) return pv('highest_education');

  if (has(/postal|zip|pin ?code|postcode/)) return pv('postal_code');
  if (has(/street|address line|^ address $|mailing address|home address/)) return pv('address');
  if (has(/\bstate\b|province|region/) && !has(/united states/)) return pv('state');
  if (has(/\bcountry\b/) && !has(/country code/)) return pv('country');
  if (has(/\bcity\b|town/)) return pv('city');
  if (has(/current location|your location|^ location $|where are you (based|located)|location city|residence/)) return val([p.city, p.country].filter(Boolean).join(', '));
  return null;
}

const YES = /^(yes|y|true|i do|i am|i have)\b/;
const NO = /^(no|n|false|i do not|i don t|i am not|i have not)\b/;

/** Pick the option that means `value`. Returns the option, or null when nothing is a confident match. */
export function matchOption(options, value) {
  const v = norm(value);
  if (!v || !options?.length) return null;
  const exact = options.find((o) => norm(o.label) === v || (o.value !== undefined && norm(o.value) === v));
  if (exact) return exact;
  if (YES.test(v) || NO.test(v)) {
    const want = YES.test(v) ? YES : NO;
    const hits = options.filter((o) => want.test(norm(o.label)));
    return hits.length === 1 ? hits[0] : null; // "Yes, with sponsorship" vs "Yes" - do not guess between them
  }
  const c = countryIn(value);
  if (c) { const hit = options.filter((o) => countryIn(o.label) === c); if (hit.length === 1) return hit[0]; }
  const num = /^\d+(\.\d+)?$/.test(v.replace(/ (years?|yrs?)$/, '')) ? Number(v.replace(/ (years?|yrs?)$/, '')) : null;
  if (num !== null) { // "2" against ranges such as "1-3 years", "5+ years"
    const hit = options.filter((o) => {
      const l = norm(o.label);
      const r = /(\d+(?:\.\d+)?)\s*(?:to|-)?\s*(\d+(?:\.\d+)?)/.exec(o.label.replace(/[–—]/g, '-'));
      if (r) return num >= Number(r[1]) && num <= Number(r[2]);
      const plus = /(\d+)\s*\+|(?:more than|over|above)\s*(\d+)/.exec(o.label);
      if (plus) return plus[1] ? num >= Number(plus[1]) : num > Number(plus[2]);
      const less = /(?:less than|under|below)\s*(\d+)/.exec(l);
      if (less) return num < Number(less[1]);
      return /^\d+$/.test(l.split(' ')[0]) && Number(l.split(' ')[0]) === num;
    });
    if (hit.length === 1) return hit[0];
    return null;
  }
  if (v.length >= 4) {
    const contains = options.filter((o) => { const l = norm(o.label); return l.length >= 4 && (` ${l} `.includes(` ${v} `) || ` ${v} `.includes(` ${l} `)); });
    if (contains.length === 1) return contains[0];
  }
  return null;
}

/** Make a text answer fit the input's type; null when it cannot be done safely. */
export function coerceText(field, value) {
  let v = String(value);
  if (field.inputType === 'number') { const m = /\d+(\.\d+)?/.exec(v.replace(/,/g, '')); return m ? m[0] : null; }
  if (field.inputType === 'date') { const d = new Date(v); return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10); }
  if (field.inputType === 'url' && !/^https?:\/\//i.test(v)) return null;
  if (field.inputType === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return null;
  if (field.maxLength && v.length > field.maxLength) {
    if (field.kind !== 'textarea') return null;
    v = v.slice(0, field.maxLength).replace(/\s+\S*$/, ''); // cut at a word boundary
  }
  return v;
}

const AnswerSchema = z.object({ answers: z.array(z.object({ id: z.string(), answer: z.string(), certain: z.boolean() })) });

/**
 * Ask the model for the questions the profile could not answer. It is told to answer only from the
 * supplied facts; anything it marks uncertain, and any choice that is not one of the offered options,
 * is discarded and left for the user.
 */
export async function llmAnswers(cfg, fields, ctx) {
  if (!fields.length) return new Map();
  const { profile, job, resumeTextValue } = ctx;
  const facts = Object.fromEntries(Object.entries(profile).filter(([k, v]) => k !== 'answers' && v !== '' && v !== null && !(Array.isArray(v) && !v.length)));
  const res = await ask({
    cfg, schema: AnswerSchema, maxTokens: 8000,
    system: `You fill in job application questions on behalf of a candidate, using only the facts given (their profile, their resume, and the job posting).
Rules:
- If the facts do not contain the answer, return answer "" and certain false. Never guess personal facts, legal status, dates, salary, demographics, or yes/no questions about the candidate's history.
- For a question with options, the answer must be exactly one of the listed options, copied character for character.
- For open questions about motivation or experience, write 2-5 plain sentences in first person, drawing only on the resume and job posting. No placeholders, no invented numbers or technologies.
- Set certain true only when the answer follows directly from the facts.`,
    cached: [{ type: 'text', text: `CANDIDATE PROFILE\n${JSON.stringify(facts)}\n\nCANDIDATE RESUME\n${resumeTextValue}` }],
    content: `JOB: ${job.title} at ${job.company} (${job.location})\n${job.description.slice(0, 8000)}\n\nQUESTIONS\n${JSON.stringify(fields.map((f) => ({ id: f.id, question: f.label, type: f.kind, required: f.required, options: f.options?.map((o) => o.label), max_length: f.maxLength ?? undefined })))}`,
  });
  const out = new Map();
  for (const a of res.answers) {
    const f = fields.find((x) => x.id === a.id);
    if (!f || !a.certain || !a.answer.trim()) continue;
    if (/\[[^\]]{0,40}\]|\{\{|\bXXX+\b/.test(a.answer)) continue;
    out.set(f.id, a.answer.trim());
  }
  return out;
}
