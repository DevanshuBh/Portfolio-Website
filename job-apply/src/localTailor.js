import { hasTerm } from './keywords.js';

// Concrete skills and tools that job descriptions name. Used to pull keywords out of a posting
// without any paid service; the candidate's own skills are added to this list at run time.
const TECH_TERMS = `Java, Python, JavaScript, TypeScript, Go, Golang, C++, C#, Rust, Kotlin, Scala, Ruby, PHP, Swift, SQL, NoSQL, Bash, Shell scripting,
Spring Boot, Spring, Hibernate, JPA, Node.js, Express, NestJS, Django, Flask, FastAPI, Rails, .NET, ASP.NET, Micronaut, Quarkus,
React, Next.js, Angular, Vue, Redux, HTML, CSS, Tailwind, Webpack, React Native, Flutter, Android, iOS,
Kafka, RabbitMQ, ActiveMQ, SQS, SNS, Kinesis, Pub/Sub, gRPC, REST, GraphQL, WebSocket, Microservices, Event-driven, Distributed systems, System design,
PostgreSQL, MySQL, Oracle, SQL Server, MongoDB, Cassandra, DynamoDB, Redis, Elasticsearch, OpenSearch, Neo4j, Snowflake, BigQuery, Redshift, ClickHouse, TimescaleDB, Memcached,
AWS, Azure, GCP, EC2, ECS, EKS, Lambda, S3, RDS, CloudFormation, Terraform, Ansible, Docker, Kubernetes, Helm, Jenkins, GitHub Actions, GitLab CI, CI/CD, ArgoCD, Linux, Nginx,
Spark, Hadoop, Flink, Airflow, dbt, ETL, Data pipelines, Databricks, Hive, Presto,
Machine learning, Deep learning, LLM, RAG, LangChain, LangGraph, PyTorch, TensorFlow, scikit-learn, NLP, Generative AI, MLflow, Bedrock,
JUnit, Mockito, pytest, Selenium, Cypress, Jest, Playwright, Testcontainers, TDD, Unit testing, Integration testing, Load testing,
Prometheus, Grafana, Datadog, OpenTelemetry, Splunk, ELK, New Relic, Observability,
OAuth, JWT, SSO, Git, Agile, Scrum, Jira, Data structures, Algorithms, Object-oriented programming, Design patterns, Multithreading, Concurrency, Caching, Low latency, High availability, Scalability,
Payments, Fintech, Fraud detection`.split(',').map((s) => s.trim()).filter(Boolean);

const VERBISH = /^(built|build|designed|design|developed|develop|implemented|implement|contribute|contributed|led|lead|created|create|added|add|helped|help|improved|improve|reduced|reduce|migrated|migrate|maintained|maintain|wrote|write|owned|own|optimi[sz]ed|optimi[sz]e|automated|automate|deployed|deploy|delivered|deliver|integrated|integrate|refactored|refactor|shipped|ship|launched|launch|managed|manage|worked|work|resolved|resolve|tested|test|architected|engineered|introduced|scaled|cut|drove|set up)\b/i;

const hits = (text, kws) => kws.filter((k) => hasTerm(text, k)).length;
const stableSortDesc = (arr, score) => arr.map((v, i) => [v, i, score(v)]).sort((a, b) => b[2] - a[2] || a[1] - b[1]).map(([v]) => v);
const list = (items) => (items.length <= 1 ? items.join('') : items.length === 2 ? items.join(' and ') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`);

/** Keywords of a job description: known tech terms plus the candidate's own skills that the posting names. */
export function jdKeywords(description, base) {
  const own = base.skills.flatMap((s) => s.items);
  const seen = new Set();
  const out = [];
  for (const t of [...own, ...TECH_TERMS]) {
    const k = t.toLowerCase();
    if (seen.has(k) || !hasTerm(description, t)) continue;
    // "Go"/"Golang" style pairs: skip a term whose alias is already listed.
    if (out.some((o) => hasTerm(o, t) || hasTerm(t, o))) continue;
    seen.add(k); out.push(t);
  }
  return out.slice(0, 30);
}

/**
 * Free tailoring: no model, no network. It only re-orders what is already in the resume so the
 * parts this job asks for come first, and assembles a cover letter from the candidate's own lines.
 * Returns the same shape the model-based tailoring returns.
 */
export function localTailor(base, job) {
  const kws = jdKeywords(job.description, base);
  const skills = stableSortDesc(base.skills.map((c) => ({ category: c.category, items: stableSortDesc(c.items, (i) => (hasTerm(job.description, i) ? 1 : 0)) })), (c) => hits(c.items.join(', '), kws));
  const experience = base.experience.map((e, index) => ({ index, bullets: stableSortDesc(e.bullets, (b) => hits(b, kws)) }));
  const projText = (p) => `${p.name} ${p.tech.join(', ')} ${p.bullets.join(' ')}`;
  const project_order = stableSortDesc(base.projects.map((_, i) => i), (i) => hits(projText(base.projects[i]), kws));
  const projects = base.projects.map((p, index) => ({ index, bullets: stableSortDesc(p.bullets, (b) => hits(b, kws)) }));
  return { jd_keywords: kws, summary: '', skills, experience, project_order, projects, cover_letter_paragraphs: coverParagraphs(base, job, kws, project_order) };
}

function firstPerson(bullet) {
  const body = bullet.replace(/^[A-Z][\w &/-]{2,40}:\s+/, '').trim(); // drop a leading "Label: "
  if (!VERBISH.test(body)) return null;
  return `I ${body[0].toLowerCase()}${body.slice(1)}`.replace(/[.;]?$/, '.');
}

function coverParagraphs(base, job, kws, projectOrder) {
  const own = base.skills.flatMap((s) => s.items);
  const matched = own.filter((s) => kws.some((k) => hasTerm(s, k) || hasTerm(k, s)));
  if (matched.length < 2) return []; // too little overlap to write an honest, specific letter
  const role = base.experience[0];
  const paras = [];
  paras.push(`I am applying for the ${job.title} position at ${job.company}.${role ? ` I currently work as ${/^[aeiou]/i.test(role.title) ? 'an' : 'a'} ${role.title} at ${role.company}, and the posting asks for skills that are on my resume: ${list(matched.slice(0, 5))}.` : ` The posting's requirements line up with my skills in ${list(matched.slice(0, 5))}.`}`);

  const lines = [];
  for (const e of base.experience) {
    for (const b of [...e.bullets].sort((a, c) => hits(c, kws) - hits(a, kws))) {
      const s = firstPerson(b);
      if (s && lines.length < 3) lines.push(s);
    }
  }
  if (lines.length) paras.push(`${role ? `At ${role.company}, ` : ''}${lines.join(' ')}`);

  const p = base.projects[projectOrder[0]];
  if (p) {
    const tech = p.tech.filter((t) => kws.some((k) => hasTerm(t, k) || hasTerm(k, t)));
    const shown = (tech.length ? tech : p.tech).slice(0, 5);
    const second = base.projects[projectOrder[1]];
    paras.push(`Outside of work I built ${p.name}${shown.length ? `, using ${list(shown)}` : ''}.${second ? ` I also built ${second.name}${second.tech.length ? ` with ${list(second.tech.slice(0, 4))}` : ''}.` : ''} Both are described in my resume, and I am glad to walk through the design decisions and trade-offs behind them.`);
  }
  const rest = matched.slice(5, 11);
  paras.push(`${rest.length ? `I also work with ${list(rest)}. ` : ''}I would welcome the chance to discuss how this experience fits the ${job.title} role${base.contact.location ? `; I am based in ${base.contact.location}` : ''}. Thank you for your time and consideration.`);
  return paras;
}
