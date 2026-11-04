// Vercel serverless function: live data for the home-screen widgets.
// GitHub contributions, latest Medium posts and LeetCode stats, fetched server-side
// (the browser can't call these sites directly) and cached at the edge for an hour.
// Each source fails independently: a broken source comes back as null and its widget falls back.
import { links } from '../src/ios/data.js';

const GITHUB_USER = links.github.handle;
const LEETCODE_USER = links.leetcode.handle;
const MEDIUM_USER = links.medium.handle; // includes the leading "@"
const TIMEOUT_MS = 6000;
const UA = 'Mozilla/5.0 (compatible; DevanshuPortfolio/1.0)';

const LEVELS = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };

const request = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: { 'User-Agent': UA, ...(options.headers || {}) },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`${url} responded ${response.status}`);
  return response;
};

const decodeEntities = (s) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

// ---------------- GitHub ----------------

// Parses the public contributions calendar HTML (github.com/users/<user>/contributions).
export const parseGithubContributions = (html) => {
  const counts = {};
  for (const m of html.matchAll(/<tool-tip\b[^>]*\bfor="([^"]+)"[^>]*>([^<]*)<\/tool-tip>/g)) {
    const n = m[2].trim().match(/^([\d,]+)\s+contributions?\b/);
    counts[m[1]] = n ? Number(n[1].replace(/,/g, '')) : 0;
  }

  const days = [];
  for (const m of html.matchAll(/<td\b[^>]*\bdata-date="(\d{4}-\d{2}-\d{2})"[^>]*>/g)) {
    const tag = m[0];
    const level = Number(tag.match(/\bdata-level="(\d)"/)?.[1] ?? 0);
    const id = tag.match(/\bid="([^"]+)"/)?.[1];
    days.push({ d: m[1], l: Math.min(4, level), c: id && id in counts ? counts[id] : null });
  }
  if (days.length < 7) return null;
  days.sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0));

  const totalMatch = html.match(/([\d,]+)\s+contributions?\s+in\s+the\s+last\s+year/i);
  const total = totalMatch
    ? Number(totalMatch[1].replace(/,/g, ''))
    : days.reduce((n, day) => n + (day.c || 0), 0);
  return { total, days };
};

const githubFromGraphql = async (token) => {
  const query = `query($login: String!) {
    user(login: $login) {
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks { contributionDays { date contributionCount contributionLevel } }
        }
      }
    }
  }`;
  const response = await request('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { login: GITHUB_USER } }),
  });
  const json = await response.json();
  const calendar = json?.data?.user?.contributionsCollection?.contributionCalendar;
  if (!calendar) throw new Error('GitHub GraphQL returned no calendar');
  const days = calendar.weeks
    .flatMap((w) => w.contributionDays)
    .map((x) => ({ d: x.date, c: x.contributionCount, l: LEVELS[x.contributionLevel] ?? 0 }))
    .sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0));
  return { total: calendar.totalContributions, days };
};

const github = async () => {
  // A token (any GitHub token, no scopes needed) uses the official API; without one, read the public calendar page.
  const data = process.env.GITHUB_TOKEN
    ? await githubFromGraphql(process.env.GITHUB_TOKEN)
    : parseGithubContributions(await (await request(`https://github.com/users/${GITHUB_USER}/contributions`)).text());
  if (!data) throw new Error('Could not read the GitHub contributions calendar');
  return { user: GITHUB_USER, url: links.github.url, total: data.total, days: data.days.slice(-371) };
};

// ---------------- Medium ----------------

const tagText = (xml, tag) => {
  const m = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`));
  if (!m) return '';
  return m[1].replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, '$1').trim();
};

export const parseMediumFeed = (xml) =>
  [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
    .map(([, item]) => {
      const title = decodeEntities(tagText(item, 'title'));
      const rawUrl = decodeEntities(tagText(item, 'link') || tagText(item, 'guid'));
      const date = new Date(tagText(item, 'pubDate'));
      let url = '';
      try {
        const u = new URL(rawUrl);
        if (u.protocol === 'https:') {
          u.search = ''; // drop Medium's ?source=rss tracking
          url = u.toString();
        }
      } catch {
        /* skip items with a bad link */
      }
      return title && url ? { title, url, date: Number.isNaN(date.getTime()) ? null : date.toISOString() } : null;
    })
    .filter(Boolean)
    .slice(0, 3);

const medium = async () => {
  const xml = await (await request(`https://medium.com/feed/${MEDIUM_USER}`)).text();
  return { url: links.medium.url, posts: parseMediumFeed(xml) };
};

// ---------------- LeetCode ----------------

export const parseLeetcode = (json) => {
  const solved = json?.data?.matchedUser?.submitStatsGlobal?.acSubmissionNum;
  const totals = json?.data?.allQuestionsCount;
  if (!Array.isArray(solved) || !Array.isArray(totals)) return null;
  const pick = (list, difficulty) => list.find((x) => x.difficulty === difficulty)?.count ?? 0;
  const shape = (list) => ({
    all: pick(list, 'All'),
    easy: pick(list, 'Easy'),
    medium: pick(list, 'Medium'),
    hard: pick(list, 'Hard'),
  });
  return { solved: shape(solved), total: shape(totals) };
};

const leetcode = async () => {
  const query = `query userStats($username: String!) {
    allQuestionsCount { difficulty count }
    matchedUser(username: $username) { submitStatsGlobal { acSubmissionNum { difficulty count } } }
  }`;
  const response = await request('https://leetcode.com/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Referer: links.leetcode.url },
    body: JSON.stringify({ query, variables: { username: LEETCODE_USER } }),
  });
  const stats = parseLeetcode(await response.json());
  if (!stats) throw new Error('LeetCode returned no stats');
  return { user: LEETCODE_USER, url: links.leetcode.url, ...stats };
};

// ---------------- handler ----------------

const settle = async (name, fn) => {
  try {
    return await fn();
  } catch (error) {
    console.error(`[live] ${name} failed:`, error?.message || error);
    return null;
  }
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const [githubData, mediumData, leetcodeData] = await Promise.all([
    settle('github', github),
    settle('medium', medium),
    settle('leetcode', leetcode),
  ]);

  const anyOk = githubData || mediumData || leetcodeData;
  res.setHeader(
    'Cache-Control',
    anyOk ? 'public, s-maxage=3600, stale-while-revalidate=86400' : 'public, s-maxage=60',
  );
  return res.status(200).json({ github: githubData, medium: mediumData, leetcode: leetcodeData });
}
