// Free, offline "instant answers" for typed questions in Messages.
// Matches a question's keywords to replies written from the resume (data.js) — no AI, no API, no cost.
// Questions it can't match are offered to Devanshu by email instead.
import { achievements, education, experience, links, profile, projects, skills } from './data.js';

const project = (id) => projects.find((p) => p.id === id);
const plain = (text) => text.replace(/\*\*/g, '');
const listOf = (items) => (items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}` : items[0]);

// Keywords: single words match whole words; a trailing * matches a prefix ("relocat*");
// phrases with spaces match anywhere in the question. Higher weight wins.
const TOPICS = [
  {
    id: 'personal',
    weight: 5,
    keywords: ['salary', 'ctc', 'compensation', 'pay', 'package', 'notice period', 'notice', 'visa', 'sponsor*', 'joining', 'availab*', 'start date', 'married', 'age'],
    answer: () => [
      "That one's best discussed directly 🙂 Send me an email and I'll get back to you.",
    ],
    action: 'gmail-prefill',
  },
  {
    id: 'hire',
    weight: 4,
    keywords: ['why should', 'why hire', 'hire you', 'hire him', 'good fit', 'strength*', 'stand out'],
    answer: () => [
      'Because I handle failure better than most people handle Mondays: retries, a DLQ and idempotency keys, so nothing gets processed twice.',
      'I also ship end to end: Kafka and Spring Boot at the back, React/Next.js at the front, AWS underneath.',
    ],
    action: { label: "Let's talk", app: 'gmail' },
  },
  {
    id: 'sentinel',
    weight: 4,
    keywords: ['sentinel', 'fraud', 'payment*', 'circuit breaker', 'resilience4j', 'outbox'],
    answer: () => {
      const p = project('sentinel');
      return [`${p.name} is my ${p.subtitle.toLowerCase()}. ${plain(p.highlights[0].text)}`, plain(p.highlights[1].text)];
    },
    action: { label: 'Open Projects', app: 'projects' },
  },
  {
    id: 'cortex',
    weight: 4,
    keywords: ['cortex', 'graphrag', 'langgraph', 'multi-agent', 'multi agent', 'agents', 'agent'],
    answer: () => {
      const p = project('cortex');
      return [`${p.name} is my ${p.subtitle.toLowerCase()}. ${plain(p.highlights[0].text)}`, plain(p.highlights[1].text)];
    },
    action: { label: 'Open Projects', app: 'projects' },
  },
  {
    id: 'nexus',
    weight: 4,
    keywords: ['nexus', 'fleet', 'gps', 'tracking', 'timescale*', 'maplibre', 'map'],
    answer: () => {
      const p = project('nexus');
      return [`${p.name} is my ${p.subtitle.toLowerCase()}. ${plain(p.highlights[0].text)}`];
    },
    action: { label: 'Open Projects', app: 'projects' },
  },
  {
    id: 'joke',
    weight: 3,
    keywords: ['joke', 'funny', 'laugh'],
    answer: () => [
      'Why did the Kafka consumer go to therapy? Too many unresolved offsets. 🥁',
      "I'd tell you a UDP joke too, but you might not get it.",
    ],
  },
  {
    id: 'resume',
    weight: 3,
    keywords: ['resume', 'cv'],
    answer: () => ['Of course! Here it is 📄'],
    action: { label: 'Open Resume', app: 'resume' },
  },
  {
    id: 'patterns',
    weight: 3,
    keywords: ['pattern*', 'design pattern*', 'saga', 'cqrs', 'strangler', 'idempoten*', 'architecture'],
    answer: () => [
      'I use them deliberately: Transactional Outbox, Saga, Circuit Breaker and idempotency keys in SENTINEL; manual offset commits, bisection recovery, CQRS and a write-through cache in NEXUS; a hybrid RAG pipeline, a multi-agent supervisor and model routing in CORTEX.',
      'Every project page lists its patterns, with an architecture diagram.',
    ],
    action: { label: 'Open Projects', app: 'projects' },
  },
  {
    id: 'kafka',
    weight: 2,
    keywords: ['kafka', 'event-driven', 'event driven', 'streaming', 'consumer*', 'offset*', 'dlq', 'dead letter', 'queue*'],
    answer: () => [
      'Kafka is my bread and butter. At Infinite I built Kafka consumers with manual offset commits, graceful shutdown hooks and rebalance listeners, so no GPS event is lost across crashes and rebalances.',
      'I also built a batch-bisection recovery flow and a Dead Letter Queue that cut triage and replay time by 80%.',
    ],
    action: { label: 'Open Experience', app: 'experience' },
  },
  {
    id: 'redis',
    weight: 2,
    keywords: ['redis', 'pub/sub', 'pubsub', 'cache', 'caching', 'rate limit*', 'token bucket', 'websocket*', 'lua'],
    answer: () => [
      'Yes, in production: at Infinite I integrated Redis Pub/Sub with Lua-based stale-update guards and bounded-queue WebSocket gateways to stream live vehicle positions to dispatchers.',
      'In SENTINEL I built a distributed Redis token-bucket rate limiter shared across API instances.',
    ],
    action: { label: 'Open Experience', app: 'experience' },
  },
  {
    id: 'database',
    weight: 2,
    keywords: ['postgres', 'postgresql', 'sql', 'database*', 'db', 'pgvector', 'neo4j', 'throughput', 'copy'],
    answer: () => [
      'Mostly PostgreSQL: at Infinite I boosted write throughput 12x by replacing single-row inserts with 1,000-record Kafka batches and COPY-based bulk loads with idempotent upserts.',
      "I've also used TimescaleDB, pgvector and Neo4j.",
    ],
    action: { label: 'Open Skills', app: 'skills' },
  },
  {
    id: 'genai',
    weight: 2,
    keywords: ['ai', 'genai', 'gen ai', 'llm*', 'rag', 'langchain', 'bedrock', 'ollama', 'ml', 'machine learning', 'scikit-learn', 'mlflow', 'retrieval'],
    answer: () => [
      'On the GenAI side I built CORTEX: hybrid RAG (Postgres full-text + pgvector, Reciprocal Rank Fusion, cross-encoder reranking) plus Neo4j GraphRAG.',
      'A LangGraph supervisor runs Researcher, Analyst and Coder agents with cost-aware Ollama/Bedrock routing. I also use LangChain, scikit-learn and MLflow.',
    ],
    action: { label: 'Open Projects', app: 'projects' },
  },
  {
    id: 'java',
    weight: 2,
    keywords: ['java', 'spring', 'spring boot', 'microservice*', 'backend', 'back end', 'grpc', 'api', 'apis', 'jvm'],
    answer: () => [
      `Java 21 and Spring Boot are my core. At ${experience.company} I build Spring Boot services for a real-time fleet tracking platform serving 50K+ active drivers and 15,000+ GPS events/sec.`,
      'I also work with FastAPI, gRPC and REST microservices.',
    ],
    action: { label: 'Open Experience', app: 'experience' },
  },
  {
    id: 'python',
    weight: 2,
    keywords: ['python', 'fastapi', 'celery', 'pytest'],
    answer: () => [
      'Python is my second language after Java: FastAPI services (like the ML scoring service in SENTINEL), Celery workers and LangGraph agents in CORTEX, and pytest for testing.',
    ],
    action: { label: 'Open Projects', app: 'projects' },
  },
  {
    id: 'cloud',
    weight: 2,
    keywords: ['aws', 'cloud', 'ecs', 'rds', 'elasticache', 's3', 'cognito', 'terraform', 'docker', 'kubernetes', 'k8s', 'devops', 'ci', 'cicd', 'ci/cd', 'github actions', 'deploy*'],
    answer: () => [
      'AWS (ECS, RDS, ElastiCache, S3, Cognito), Terraform, Docker, Kubernetes and GitHub Actions. NEXUS, for example, runs on AWS ECS, deployed with Terraform.',
    ],
    action: { label: 'Open Skills', app: 'skills' },
  },
  {
    id: 'frontend',
    weight: 2,
    keywords: ['react', 'next', 'nextjs', 'next.js', 'frontend', 'front end', 'front-end', 'typescript', 'javascript', 'js', 'ts', 'ui', 'full stack', 'fullstack', 'full-stack'],
    answer: () => [
      'I ship end to end: React and Next.js on the front, with TypeScript and JavaScript. CORTEX streams answers to a Next.js UI with citations, and NEXUS has a Next.js + MapLibre live map.',
    ],
    action: { label: 'Open Projects', app: 'projects' },
  },
  {
    id: 'testing',
    weight: 2,
    keywords: ['test*', 'junit', 'testcontainers', 'k6', 'load test*', 'opentelemetry', 'prometheus', 'grafana', 'monitoring', 'observability', 'chaos'],
    answer: () => [
      'I like proving things work: Testcontainers, JUnit 5, pytest and k6 for tests and load, plus OpenTelemetry, Prometheus and Grafana for observability.',
      'In NEXUS, crashes, replays and DB outages are covered by Testcontainers and Toxiproxy tests.',
    ],
    action: { label: 'Open Skills', app: 'skills' },
  },
  {
    id: 'intro',
    weight: 1,
    keywords: ['yourself', 'about you', 'about him', 'who are you', 'who is', 'introduce', 'introduction', 'summary', 'background'],
    answer: () => [
      `I'm a ${profile.summary.split('. ')[0]}.`,
      'I pair that with hands-on Generative AI: hybrid RAG and GraphRAG pipelines, LangGraph multi-agent systems and cost-aware LLM routing.',
    ],
    action: { label: 'Open About Me', app: 'about' },
  },
  {
    id: 'skills',
    weight: 1,
    keywords: ['skill*', 'stack', 'tech', 'technolog*', 'languages', 'tools', 'know'],
    answer: () => [`${skills.map((g) => g.items.slice(0, 4).join(', ')).join(' · ')}.`],
    action: { label: 'Open Skills', app: 'skills' },
  },
  {
    id: 'experience',
    weight: 1,
    keywords: ['experience', 'job', 'work*', 'company', 'current*', 'role', 'years', 'employer', 'infinite', 'what do you do', 'what does he do'],
    answer: () => [
      `I'm an ${experience.role} at ${experience.company} (${experience.duration}, ${experience.location}), building Spring Boot services for a real-time fleet tracking platform: 50K+ active drivers, 15,000+ GPS events/sec, in a 10+ engineer team.`,
      "That's 2+ years of building event-driven systems.",
    ],
    action: { label: 'Open Experience', app: 'experience' },
  },
  {
    id: 'projects',
    weight: 1,
    keywords: ['project*', 'built', 'build', 'side', 'portfolio', 'github', 'code'],
    answer: () => [
      `I've built ${listOf(projects.map((p) => `${p.name} (${p.subtitle})`))}. Each one has an architecture diagram in the Projects app.`,
    ],
    action: { label: 'Open Projects', app: 'projects' },
  },
  {
    id: 'education',
    weight: 1,
    keywords: ['education', 'degree', 'college', 'university', 'rgpv', 'btech', 'b.tech', 'cgpa', 'gpa', 'study', 'studied', 'graduat*', 'school'],
    answer: () => [
      `${education.degree} at ${education.school} (${education.duration}), CGPA ${education.cgpa}.`,
    ],
    action: { label: 'Open Education', app: 'education' },
  },
  {
    id: 'certificates',
    weight: 1,
    keywords: ['certificat*', 'certified', 'google', 'coursera', 'award*', 'performer', 'achievement*', 'analytics'],
    answer: () => [`My certificates and awards: ${listOf(achievements.map((a) => `${a.title}${a.date ? ` (${a.date})` : ''}`))}.`],
    action: { label: 'Open Achievements', app: 'wallet' },
  },
  {
    id: 'location',
    weight: 2,
    keywords: ['location', 'located', 'based', 'where do you live', 'where are you', 'where is he', 'noida', 'india', 'relocat*', 'remote*', 'onsite', 'hybrid', 'city'],
    answer: () => [`I'm based in ${profile.location}. For relocation or remote work, drop me an email and let's talk.`],
    action: 'gmail-prefill',
  },
  {
    id: 'leetcode',
    weight: 1,
    keywords: ['leetcode', 'dsa', 'algorithm*', 'data structure*', 'competitive', 'problem solving'],
    answer: () => ['I practise on LeetCode. The LeetCode widget on the home screen shows my latest solved count.'],
    action: { label: 'Open my LeetCode', url: links.leetcode.url },
  },
  {
    id: 'contact',
    weight: 1,
    keywords: ['contact', 'email', 'mail', 'reach', 'phone', 'call', 'number', 'linkedin', 'connect', 'talk'],
    answer: () => [`Email me at ${profile.email}, call ${profile.phoneDisplay}, or connect on LinkedIn. My inbox is always open!`],
    action: { label: 'Write me an email', app: 'gmail' },
  },
  {
    id: 'greeting',
    weight: 1,
    keywords: ['hi', 'hello', 'hey', 'hii', 'yo', 'namaste', 'sup'],
    answer: () => ['Hey! 👋 Ask me about my experience, projects, skills, or how to reach me.'],
  },
  {
    id: 'thanks',
    weight: 1,
    keywords: ['thanks', 'thank', 'thx', 'cool', 'awesome', 'great', 'nice'],
    answer: () => ['Thank you! 😊 If you want to talk properly, my inbox is always open.'],
    action: { label: 'Write me an email', app: 'gmail' },
  },
];

const normalise = (text) =>
  ` ${text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9.+/#\-\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()} `;

const keywordHits = (q, words, keyword) => {
  if (keyword.includes(' ')) return q.includes(` ${keyword} `) ? 1 : 0;
  if (keyword.endsWith('*')) {
    const stem = keyword.slice(0, -1);
    return words.some((w) => w.startsWith(stem)) ? 1 : 0;
  }
  return words.includes(keyword) ? 1 : 0;
};

// Returns the best-matching topics for a question, strongest first.
export const matchTopics = (question) => {
  const words = normalise(question)
    .trim()
    .split(' ')
    .map((w) => w.replace(/^[.\-/]+|[.\-/]+$/g, ''))
    .filter(Boolean);
  const q = ` ${words.join(' ')} `;
  return TOPICS.map((topic) => {
    const hits = topic.keywords.reduce((n, k) => n + keywordHits(q, words, k), 0);
    return { topic, score: hits ? hits + topic.weight * 2 : 0 };
  })
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score);
};

// Any skill or design pattern listed on the site, so specific questions get specific answers.
const stripParens = (name) => name.replace(/\s*\(.*?\)\s*/g, ' ').trim();
const MENTIONS = [
  ...skills
    .filter((g) => g.id !== 'patterns')
    .flatMap((g) => g.items.map((item) => ({ kind: 'skill', name: stripParens(item), group: g.name }))),
  ...projects.flatMap((p) =>
    p.patterns.map((pt) => ({ kind: 'pattern', name: stripParens(pt.name), project: p.name, where: pt.where })),
  ),
];

const AMBIGUOUS = new Set(['builder', 'strategy', 'pipeline', 'repository', 'decorator', 'sidecar', 'observer', 'fan-out', 'health check', 'backpressure']);

const findMention = (question) => {
  const q = ` ${normalise(question).trim().split(' ').map((w) => w.replace(/^[.\-/]+|[.\-/]+$/g, '')).join(' ')} `;
  const asksPattern = /\bpatterns?\b/.test(q);
  const hits = MENTIONS.filter((m) => {
    const name = normalise(m.name).trim();
    if (!name || !q.includes(` ${name} `)) return false;
    // Pattern names that are everyday words only count when the question is about patterns.
    return m.kind === 'skill' || asksPattern || !AMBIGUOUS.has(name);
  });
  return hits.sort((a, b) => b.name.length - a.name.length)[0] || null;
};

const mentionAnswer = (m) =>
  m.kind === 'pattern'
    ? { texts: [`Yes, I use ${m.name} in ${m.project}: ${m.where}`], action: { label: 'Open Projects', app: 'projects' } }
    : { texts: [`Yes, ${m.name} is part of my toolkit (${m.group}).`], action: { label: 'Open Skills', app: 'skills' } };

const toAction = (action, question) => {
  if (!action) return undefined;
  if (action === 'gmail-prefill') return { label: 'Send it via Gmail', app: 'gmail', payload: { body: question } };
  return action;
};

// Reply bubbles for a typed question: { texts, action, matched }.
export const answerQuestion = (question) => {
  const [best, second] = matchTopics(question);
  const mention = findMention(question);
  const generic = !best || ['skills', 'patterns', 'experience', 'projects', 'intro'].includes(best.topic.id);
  if (mention && generic) {
    return { matched: true, topic: `mention:${mention.kind}`, ...mentionAnswer(mention) };
  }
  if (!best) {
    return {
      matched: false,
      texts: ["I don't have a ready answer for that one, but I'd love to read it. Send it straight to my inbox 👇"],
      action: toAction('gmail-prefill', question),
    };
  }
  const texts = [...best.topic.answer()];
  // A question about two different skills ("Kafka and Redis?") gets both answers.
  const both =
    second &&
    second.score >= best.score - 1 &&
    !['personal', 'greeting', 'thanks', 'hire', 'joke', 'resume', 'intro'].includes(best.topic.id) &&
    !['greeting', 'thanks', 'experience', 'projects', 'skills', 'intro', 'contact'].includes(second.topic.id);
  if (both) texts.push(...second.topic.answer().slice(0, 1));
  // The question named a specific skill or pattern the answer doesn't cover: add a line about it.
  if (mention && !texts.join(' ').toLowerCase().includes(mention.name.toLowerCase())) {
    texts.push(mentionAnswer(mention).texts[0]);
  }
  return { matched: true, topic: best.topic.id, texts, action: toAction(best.topic.action, question) };
};
