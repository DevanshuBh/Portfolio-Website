import fs from 'node:fs';
import YAML from 'yaml';
import { writeFileAtomic, escapeRegExp } from './util.js';

/** Edit profile.yaml in place, keeping your comments and layout. */
function persist(profile, mutate) {
  const file = profile.__file;
  if (!file || !fs.existsSync(file)) return false;
  const doc = YAML.parseDocument(fs.readFileSync(file, 'utf8'));
  mutate(doc);
  writeFileAtomic(file, doc.toString());
  return true;
}

/** Fill in one of the standard fields (notice_period, expected_ctc, ...). */
export function saveProfileValue(profile, key, value) {
  profile[key] = String(value);
  persist(profile, (doc) => doc.set(key, String(value)));
}

/** The pattern a remembered answer uses to recognise the same question on other forms. */
export function answerPattern(label) {
  const core = String(label).replace(/\*|\((required|optional)\)/gi, ' ').replace(/\s+/g, ' ').trim();
  return core.length >= 3 ? escapeRegExp(core).replace(/ /g, '\\s+') : null;
}

/** Remember the answer to a free-form question. Newest answers take priority. */
export function saveProfileAnswer(profile, label, answer) {
  const match = answerPattern(label);
  if (!match) return false;
  profile.answers.unshift({ re: new RegExp(match, 'i'), answer: String(answer) });
  persist(profile, (doc) => {
    let seq = doc.get('answers');
    if (!YAML.isSeq(seq)) { seq = doc.createNode([]); doc.set('answers', seq); }
    seq.items.unshift(doc.createNode({ match, answer: String(answer) }));
  });
  return true;
}
