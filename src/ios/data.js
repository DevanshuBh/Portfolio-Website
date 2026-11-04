// Content for the iOS-style portfolio. Source of truth: Devanshu's current resume,
// plus everything the previous portfolio showed (NEXUS project, LeetCode, certificates).

export const profile = {
  name: 'Devanshu Bhargava',
  firstName: 'Devanshu',
  title: 'Full Stack Software Engineer',
  role: 'Associate Software Engineer',
  company: 'Infinite Computer Solutions',
  location: 'Noida, India',
  email: 'bhargavadevanshu10@gmail.com',
  phoneDisplay: '+91 79995 06057',
  phoneHref: 'tel:+917999506057',
  tagline: 'Ideas → Code → Cloud → Impact',
  avatar: '/ios-assets/devanshu-photo.jpg',
  resumePdf: '/ios-assets/Devanshu_Bhargava_Resume.pdf',
  resumePreview: '/ios-assets/resume-preview.jpg',
  resumeFileName: 'Devanshu_Bhargava_Resume.pdf',
  summary:
    'Full Stack Software Engineer with 2+ years of experience building scalable Java and Spring Boot microservices and event-driven systems on Apache Kafka, Redis and PostgreSQL, engineered for fault tolerance with DLQs, circuit breakers, outbox and idempotency. Pairs strong backend engineering with hands-on Generative AI: hybrid RAG and GraphRAG pipelines, LangGraph multi-agent systems, retrieval evaluation and cost-aware LLM routing on Amazon Bedrock and Ollama. Ships end to end with React/Next.js frontends, Docker and AWS.',
};

export const links = {
  github: { label: 'GitHub', handle: 'DevanshuBh', url: 'https://github.com/DevanshuBh' },
  linkedin: {
    label: 'LinkedIn',
    handle: 'devanshu-bhargava',
    url: 'https://www.linkedin.com/in/devanshu-bhargava-68b594258/',
  },
  kaggle: { label: 'Kaggle', handle: 'devanshubhargava1013', url: 'https://www.kaggle.com/devanshubhargava1013' },
  medium: { label: 'Medium', handle: '@bhargavadevanshu10', url: 'https://medium.com/@bhargavadevanshu10' },
  leetcode: { label: 'LeetCode', handle: 'devanshu101302', url: 'https://leetcode.com/u/devanshu101302/' },
};

// EmailJS settings (same account the previous portfolio's contact form used).
export const emailjsConfig = {
  serviceId: 'service_0vfhxig',
  templateId: 'template_hxrfnyh',
  publicKey: 'kyAphlDF60C_kHheU',
};

// **text** marks bold, exactly as on the resume.
const infinite = {
  company: 'Infinite Computer Solutions',
  role: 'Associate Software Engineer',
  duration: 'Oct 2024 – Present',
  location: 'Noida',
  logo: '/assets/Infinite.svg',
  stats: [
    { value: '50K+', label: 'active drivers' },
    { value: '15K+', label: 'GPS events / sec' },
    { value: '12×', label: 'Postgres write throughput' },
    { value: '80%', label: 'less triage & replay time' },
  ],
  bullets: [
    {
      title: 'High-Throughput Telemetry Platform',
      text: 'Build and maintain **Spring Boot** services for an enterprise real-time **fleet tracking platform** serving **50K+ active drivers**, ingesting **15,000+ GPS events/sec** in a **10+ engineer** team.',
    },
    {
      title: 'Reliable Event Streaming',
      text: 'Engineered **Apache Kafka consumers** with manual offset commits, graceful shutdown hooks and rebalance listeners, ensuring **no GPS event is lost** across crashes and partition rebalances.',
    },
    {
      title: 'Fault Isolation',
      text: 'Built a **batch-bisection recovery** flow and a **Dead Letter Queue (DLQ)** tagged by error class, isolating malformed pings without failing valid rows and cutting triage and replay time by **80%**.',
    },
    {
      title: 'Throughput Optimization',
      text: 'Boosted **PostgreSQL** write throughput **12x** by replacing single-row inserts with 1,000-record Kafka batches and **COPY**-based bulk loads with idempotent upserts, making replays duplicate-safe.',
    },
    {
      title: 'Real-Time Fan-Out',
      text: 'Integrated **Redis Pub/Sub** with Lua-based stale-update guards and bounded-queue **WebSocket** gateways, streaming live vehicle positions to dispatchers across instances without slow-consumer memory growth.',
    },
  ],
};

// Jobs, most recent first. The first entry is the current job; when changing jobs,
// add the new one at the top and set the old one's end date.
export const experiences = [infinite];
export const experience = experiences[0];

export const projects = [
  {
    id: 'sentinel',
    name: 'SENTINEL',
    subtitle: 'Event-Driven Fraud Detection Gateway',
    headline: '2s+ → 50ms API latency',
    color: '#ff453a',
    gradient: 'linear-gradient(135deg, #3a0d12 0%, #7a1020 55%, #e0313f 100%)',
    url: 'https://github.com/DevanshuBh',
    tags: ['Java', 'Spring Boot', 'Kafka', 'Redis', 'Python', 'FastAPI'],
    patterns: [
      { name: "Two-Tier Processing", where: "A fast gRPC pre-screen catches obvious fraud; deep ML analysis runs asynchronously through Kafka." },
      { name: "Transactional Outbox", where: "The payment and its outbox event are saved in one transaction; a publisher then sends the event to Kafka." },
      { name: "Circuit Breaker", where: "Resilience4j (closed, open, half-open) protects calls to the fraud service." },
      { name: "Retry & Bulkhead", where: "Resilience4j retries with limits and isolates resources so one slow dependency can’t starve the rest." },
      { name: "Dead Letter Queue", where: "Events that still fail after retries go to a dead-letter topic." },
      { name: "Idempotency Key", where: "An Idempotency-Key header means a retried request never creates a second payment." },
      { name: "Idempotent Consumer", where: "Consumers record each event ID in the same transaction as their change, so duplicates are skipped." },
      { name: "Token Bucket Rate Limiting", where: "A Redis-backed limiter returns 429 when a client goes over its budget." },
      { name: "Saga", where: "Payment → pre-screen → fraud check → verdict, with each step publishing an event." },
      { name: "Verdict Cache", where: "Verdicts are cached in Redis so a client that reconnects can still fetch its result." },
      { name: "Strangler Fig", where: "The synchronous 2s+ fraud check was replaced by a ~50ms accept plus background processing." },
      { name: "Publisher–Subscriber", where: "Kafka connects the payment API, the Python fraud service and the verdict consumer loosely." },
      { name: "Chain of Responsibility", where: "The pre-screen runs first, then ML analysis; either step can reject a payment." },
      { name: "Decorator", where: "@CircuitBreaker wraps the fraud-service call without changing its signature." },
      { name: "Correlation ID", where: "One ID ties the API response to the WebSocket verdict, end to end." },
      { name: "Repository", where: "PaymentRepository and OutboxRepository keep SQL out of the service layer." },
      { name: "Health Check", where: "Health endpoints report status, including the circuit breaker’s state." },
    ],
    highlights: [
      {
        title: 'Async Payment Processing',
        text: 'Event-driven gateway on **Kafka** that moves fraud analysis off the request path, cutting API latency from **2s+ to 50ms**.',
      },
      {
        title: 'Resilient Delivery',
        text: '**Resilience4j** circuit breaker, **Transactional Outbox** and DLQ for reliable fraud-event delivery, with **idempotency keys** preventing duplicate checks.',
      },
      {
        title: 'Rate Limiting & ML Inference',
        text: 'Distributed **Redis token-bucket** limiter shared across API instances, plus a **FastAPI** ML inference service for scalable fraud scoring.',
      },
    ],
  },
  {
    id: 'cortex',
    name: 'CORTEX',
    subtitle: 'Multi-Tenant GraphRAG Research Platform',
    headline: 'Hybrid RAG + GraphRAG, multi-agent',
    color: '#a78bfa',
    gradient: 'linear-gradient(135deg, #14112e 0%, #2b2470 60%, #635bff 100%)',
    image: '/textures/project/cortex.png',
    logo: '/assets/cortex-logo.svg',
    url: 'https://github.com/DevanshuBh',
    tags: ['Python', 'LangGraph', 'pgvector', 'Neo4j', 'Bedrock'],
    patterns: [
      { name: "Hybrid RAG Pipeline", where: "Postgres full-text search + pgvector, fused with Reciprocal Rank Fusion and reranked by a cross-encoder." },
      { name: "GraphRAG with Query Router", where: "A router sends content questions to retrieval and relationship questions to the Neo4j graph." },
      { name: "Multi-Agent Supervisor", where: "A LangGraph supervisor routes work to Researcher, Analyst and Coder agents." },
      { name: "Loop Guard", where: "A run stops when a step brings no new context, and token budgets cap every request." },
      { name: "Model Routing", where: "Simple tasks go to local Ollama models and harder reasoning to Amazon Bedrock, to control cost." },
      { name: "Async Task Queue", where: "FastAPI queues a Celery task and returns a task_id immediately." },
      { name: "Evaluation & Drift Detection", where: "Recall@k and MRR run nightly on a hand-labelled golden set to catch regressions." },
      { name: "Pipeline", where: "Query → retrieve → fuse → rerank → assemble context → LLM → cited answer." },
      { name: "Bounded Graph Traversal", where: "Bounded Cypher queries walk each tenant’s entity graph." },
      { name: "Observer (Streaming)", where: "Agent progress streams to the browser over Server-Sent Events." },
      { name: "Strategy", where: "Keyword and vector search are interchangeable retrieval strategies." },
      { name: "Template Method", where: "A base agent defines the steps; each agent implements its own part." },
      { name: "Tenant Isolation", where: "PostgreSQL row-level security keeps every tenant’s data separate." },
      { name: "Repository", where: "DocumentRepository and ChunkRepository hide the database details." },
      { name: "Health Check", where: "Health endpoints for the API and Celery workers." },
    ],
    highlights: [
      {
        title: 'Hybrid Retrieval',
        text: 'Postgres full-text + **pgvector** HNSW, Reciprocal Rank Fusion, cross-encoder reranking and **Neo4j GraphRAG**; recall@k and MRR evaluated nightly in CI on a hand-labelled golden set.',
      },
      {
        title: 'Multi-Agent Orchestration',
        text: '**LangGraph** supervisor over Researcher, Analyst and Coder agents with loop guard and token budgets; cost-aware Ollama/Bedrock routing; sandboxed code execution.',
      },
      {
        title: 'Multi-Tenant Platform',
        text: 'Tenant isolation with PostgreSQL **Row-Level Security**; SSE streaming from **Celery** workers to a Next.js UI with citations.',
      },
    ],
  },
  {
    id: 'nexus',
    name: 'NEXUS',
    subtitle: 'Real-Time Fleet Tracking Platform',
    headline: 'Load-tested on a 50K-vehicle model',
    color: '#38bdf8',
    gradient: 'linear-gradient(135deg, #0b1628 0%, #0e2d58 60%, #2f67b6 100%)',
    image: '/textures/project/nexus.png',
    logo: '/assets/nexus-logo.svg',
    url: 'https://github.com/DevanshuBh',
    tags: ['Java 21', 'Kafka', 'TimescaleDB', 'Redis', 'Next.js', 'AWS'],
    patterns: [
      { name: "Publisher–Subscriber", where: "GPS events are published to Kafka; consumers subscribe independently." },
      { name: "Manual Offset Commit", where: "Offsets are committed only after the database commit, so no ping is ever lost." },
      { name: "Partition by Key", where: "Kafka key = vehicle ID, so each truck’s pings stay in order." },
      { name: "Batch Processing", where: "Pings are consumed in batches and bulk-loaded with a single PostgreSQL COPY." },
      { name: "Idempotent Writes", where: "ON CONFLICT DO NOTHING means replayed pings add nothing." },
      { name: "Bisection Recovery", where: "A failed batch is split recursively to isolate the bad row." },
      { name: "Dead Letter Queue", where: "Bad rows are parked on a dead-letter topic with the reason." },
      { name: "Backpressure", where: "Partition pause slows intake when the database struggles." },
      { name: "Write-Through Cache", where: "After the write, each truck’s last position goes to Redis (only if newer)." },
      { name: "Fan-out", where: "Redis Pub/Sub delivers each position to every WebSocket gateway instance." },
      { name: "CQRS", where: "Writes flow through Kafka batches; reads are served by the REST API." },
      { name: "Repository", where: "VehicleRepository keeps SQL out of the service layer." },
      { name: "Builder", where: "GPS events are created with a fluent builder." },
      { name: "Sidecar", where: "A telemetry collector runs alongside each app container." },
      { name: "Health Check", where: "Health endpoints back the liveness and readiness checks." },
    ],
    highlights: [
      {
        title: 'Hand-Built Ingestion Pipeline',
        text: 'Plain **kafka-clients** consumers commit offsets only after the database commit, and GPS events are loaded into **TimescaleDB** via **COPY** with idempotent writes. Load-tested with **k6** on a 50K-vehicle model.',
      },
      {
        title: 'Fault Tolerant by Design',
        text: '**DLQ**, bisection recovery for bad rows and partition-pause backpressure, with crashes, replays and DB outages covered by **Testcontainers** and **Toxiproxy** tests.',
      },
      {
        title: 'Live Map & Deployment',
        text: 'A **Next.js + MapLibre GL** live map (Web Workers) is fed by **Redis Pub/Sub** WebSocket fan-out, deployed on **AWS ECS** via **Terraform** with Grafana lag and freshness alerts.',
      },
    ],
  },
];

export const skills = [
  {
    id: 'languages',
    name: 'Languages',
    color: '#0a84ff',
    icon: 'code',
    items: ['Java 21', 'Python', 'TypeScript', 'JavaScript', 'SQL'],
  },
  {
    id: 'backend',
    name: 'Backend & Distributed Systems',
    color: '#ff9f0a',
    icon: 'server',
    items: ['Spring Boot', 'FastAPI', 'gRPC', 'REST', 'Microservices', 'Kafka', 'Redis', 'Celery', 'Resilience4j', 'Protocol Buffers', 'Pydantic'],
  },
  {
    id: 'databases',
    name: 'Databases',
    color: '#30d158',
    icon: 'database',
    items: ['PostgreSQL', 'TimescaleDB', 'pgvector', 'Neo4j', 'Flyway', 'Alembic'],
  },
  {
    id: 'genai',
    name: 'Generative AI & ML',
    color: '#bf5af2',
    icon: 'sparkles',
    items: ['RAG', 'LangGraph', 'LangChain', 'Amazon Bedrock', 'Ollama', 'scikit-learn', 'MLflow'],
  },
  {
    id: 'cloud',
    name: 'Cloud & DevOps',
    color: '#64d2ff',
    icon: 'cloud',
    items: ['AWS (ECS, RDS, ElastiCache, S3, Cognito)', 'AWS CloudWatch & X-Ray', 'AWS ALB, ECR & Secrets Manager', 'Terraform', 'Docker', 'Docker Compose', 'Kubernetes', 'GitHub Actions'],
  },
  {
    id: 'frontend',
    name: 'Frontend & Testing',
    color: '#ff375f',
    icon: 'checklist',
    items: ['React', 'Next.js', 'Testcontainers', 'JUnit 5', 'pytest', 'k6', 'OpenTelemetry', 'Prometheus', 'Grafana', 'Micrometer', 'Jaeger', 'Playwright', 'Vitest', 'React Testing Library', 'MSW', 'axe-core'],
  },
  {
    id: 'frontend-toolkit',
    name: 'Frontend Toolkit',
    color: '#5e5ce6',
    icon: 'grid',
    items: ['Tailwind CSS', 'shadcn/ui', 'TanStack Query', 'TanStack Table', 'Recharts', 'MapLibre GL JS', 'Cytoscape.js', 'PDF.js', 'Web Workers', 'React Hook Form', 'Zod', 'Storybook'],
  },
  {
    id: 'security',
    name: 'Auth & Security',
    color: '#8e8e93',
    icon: 'lock',
    items: ['OIDC + PKCE', 'Keycloak', 'AWS Cognito', 'PostgreSQL Row-Level Security', 'Secrets management'],
  },
  {
    id: 'patterns',
    name: 'Design Patterns',
    color: '#ac8e68',
    icon: 'layers',
    // Every pattern used across the projects, without duplicates.
    items: [...new Set(projects.flatMap((p) => p.patterns.map((x) => x.name)))],
  },
];

export const education = {
  school: 'Rajiv Gandhi Proudyogiki Vishwavidyalaya',
  short: 'RGPV',
  degree: 'B.Tech, Computer Science Engineering',
  cgpa: 7.62,
  duration: 'June 2020 – June 2024',
  location: 'Madhya Pradesh',
};

export const achievements = [
  {
    id: 'gda',
    title: 'Google Data Analytics Professional Certificate',
    issuer: 'Google',
    date: '2023',
    image: '/assets/google1.png',
    url: 'https://coursera.org/share/90caef1c0941f9cfa8eee7cb90a0e69b',
    background: 'linear-gradient(135deg, #1a73e8 0%, #4c8df6 100%)',
    logoBg: '#ffffff',
  },
  {
    id: 'gada',
    title: 'Google Advanced Data Analytics Professional Certificate',
    issuer: 'Google',
    date: '2024',
    image: '/assets/google2.png',
    url: 'https://coursera.org/share/cfea4ce4f7aba4d0a5e0a1109822cd28',
    background: 'linear-gradient(135deg, #0b8043 0%, #34a853 100%)',
    logoBg: '#ffffff',
  },
  {
    id: 'potm',
    title: 'Performer of the Month among 200+ employees',
    issuer: 'Infinite Computer Solutions',
    date: '',
    image: '/assets/Infinite.svg',
    url: 'https://drive.google.com/file/d/1bQg3gGqZfvCLeZkRKfXUr5uACjX1tnw1/view?usp=sharing',
    background: 'linear-gradient(135deg, #0e1f38 0%, #24467a 100%)',
    logoBg: 'rgba(255, 255, 255, 0.1)',
  },
];

// Timeline for the Calendar app (newest first). Only dates stated on the resume / portfolio.
export const timeline = [
  {
    year: 'Now',
    events: [
      {
        when: 'Present',
        title: 'Building real-time telemetry at Infinite',
        detail: 'Kafka, Spring Boot, PostgreSQL and Redis for a fleet tracking platform.',
        color: '#ff9f0a',
      },
    ],
  },
  {
    year: '2024',
    events: [
      {
        when: 'Oct',
        title: 'Joined Infinite Computer Solutions',
        detail: 'Associate Software Engineer · Noida',
        color: '#0a84ff',
      },
      {
        when: 'Jun',
        title: 'Graduated — B.Tech, Computer Science Engineering',
        detail: 'RGPV · CGPA 7.62',
        color: '#30d158',
      },
      {
        when: '2024',
        title: 'Google Advanced Data Analytics Professional Certificate',
        detail: 'Google · Coursera',
        color: '#bf5af2',
      },
    ],
  },
  {
    year: '2023',
    events: [
      {
        when: '2023',
        title: 'Google Data Analytics Professional Certificate',
        detail: 'Google · Coursera',
        color: '#bf5af2',
      },
    ],
  },
  {
    year: '2020',
    events: [
      {
        when: 'Jun',
        title: 'Started B.Tech at RGPV',
        detail: 'Computer Science Engineering · Madhya Pradesh',
        color: '#30d158',
      },
    ],
  },
];
