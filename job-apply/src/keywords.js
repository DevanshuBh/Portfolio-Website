import { escapeRegExp } from './util.js';

const canon = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');

// Spellings that mean the same thing to a reader and to keyword screens.
const ALIASES = [
  ['javascript', 'js'], ['typescript', 'ts'], ['node.js', 'nodejs', 'node js', 'node'], ['react', 'react.js', 'reactjs'],
  ['next.js', 'nextjs'], ['vue', 'vue.js', 'vuejs'], ['angular', 'angularjs'], ['postgresql', 'postgres'], ['mongodb', 'mongo'],
  ['kubernetes', 'k8s'], ['amazon web services', 'aws'], ['google cloud platform', 'google cloud', 'gcp'], ['ci/cd', 'cicd', 'ci cd', 'continuous integration'],
  ['rest', 'restful', 'rest api', 'rest apis', 'restful apis'], ['spring boot', 'springboot'], ['c++', 'cpp'], ['c#', 'csharp'],
  ['machine learning', 'ml'], ['object-oriented programming', 'object oriented programming', 'oop', 'oops'], ['data structures and algorithms', 'dsa'],
  ['html', 'html5'], ['css', 'css3'], ['tailwind', 'tailwind css', 'tailwindcss'], ['three.js', 'threejs'], ['microservices', 'microservice'], ['payments', 'payment'], ['algorithms', 'algorithm'], ['data pipelines', 'data pipeline'],
];

function forms(term) {
  const t = canon(term).trim();
  const group = ALIASES.find((g) => g.includes(t));
  return group ?? [t];
}

/** Is `term` present in `text` as a whole word/phrase (so "Java" does not match "JavaScript")? */
export function hasTerm(text, term) {
  const hay = canon(text);
  return forms(term).some((f) => {
    if (!f) return false;
    const body = escapeRegExp(f).replace(/\\ /g, ' ').replace(/ +/g, '[\\s\\-/]*');
    return new RegExp(`(^|[^a-z0-9+#])${body}(?![a-z0-9+#])`, 'i').test(hay);
  });
}

/**
 * Share of the job's keywords that the resume text contains. This mirrors what keyword-based
 * screening does; it is an estimate, not a score any employer's system reports.
 */
export function keywordScore(resumeText, keywords) {
  const seen = new Set();
  const list = (keywords ?? []).map((k) => String(k).trim()).filter((k) => k && !seen.has(canon(k)) && seen.add(canon(k)));
  if (!list.length) return { score: null, present: [], missing: [] };
  const present = list.filter((k) => hasTerm(resumeText, k));
  const missing = list.filter((k) => !present.includes(k));
  return { score: Math.round((present.length / list.length) * 100), present, missing };
}
