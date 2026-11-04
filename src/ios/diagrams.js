// Architecture diagrams for the Projects app. Coordinates use a 340-wide viewBox.
// kind: client | service | store | queue | ext | fail  (sets the colour)
// Edge kind: flow (animated) | async (dashed, monitoring) | fail (to a DLQ)
// shiftX moves an edge sideways (for two arrows between the same boxes); side puts its label left/right.
// Every note is taken from the resume / project descriptions in data.js.

const H = 40; // node height

export const diagrams = {
  sentinel: {
    height: 336,
    summary:
      'SENTINEL architecture: the payment API saves each payment with an outbox event, Kafka carries it to a fraud worker that calls an ML scoring service, and failures go to a dead letter queue.',
    nodes: [
      { id: 'client', x: 8, y: 12, w: 84, h: H, label: 'Client', sub: '~50ms reply', kind: 'client', note: 'Payment requests get a reply in about 50ms (down from 2s+), because fraud analysis no longer runs on the request path.' },
      { id: 'api', x: 116, y: 12, w: 116, h: H, label: 'Payment API', sub: 'Spring Boot', kind: 'service', note: 'The gateway accepts the payment, checks the rate limit and records the event. Fraud analysis happens asynchronously.' },
      { id: 'redis', x: 256, y: 12, w: 76, h: H, label: 'Redis', sub: 'token bucket', kind: 'store', note: 'A distributed Redis token-bucket rate limiter, shared across all API instances.' },
      { id: 'outbox', x: 116, y: 100, w: 116, h: H, label: 'Outbox', sub: 'same DB transaction', kind: 'store', note: 'Transactional Outbox: the payment and its event are saved together, so an event is never lost or sent without its payment.' },
      { id: 'kafka', x: 116, y: 196, w: 116, h: H, label: 'Kafka', sub: 'payment events', kind: 'queue', note: 'Kafka carries payment events to the fraud workers, off the request path.' },
      { id: 'worker', x: 116, y: 284, w: 116, h: H, label: 'Fraud worker', sub: 'idempotency keys', kind: 'service', note: 'Consumes events and runs the fraud checks. Idempotency keys stop the same payment from being checked twice.' },
      { id: 'ml', x: 256, y: 284, w: 76, h: H, label: 'ML scoring', sub: 'FastAPI', kind: 'ext', note: 'A FastAPI ML inference service for fraud scoring, called through a Resilience4j circuit breaker so a slow model can’t stall the pipeline.' },
      { id: 'dlq', x: 8, y: 284, w: 84, h: H, label: 'DLQ', sub: 'failed events', kind: 'fail', note: 'Events that keep failing go to a Dead Letter Queue to be inspected and replayed, instead of blocking everything else.' },
    ],
    edges: [
      { from: 'client', to: 'api' },
      { from: 'api', to: 'redis' },
      { from: 'api', to: 'outbox', label: 'save' },
      { from: 'outbox', to: 'kafka', label: 'relay' },
      { from: 'kafka', to: 'worker', label: 'consume' },
      { from: 'worker', to: 'ml' },
      { from: 'worker', to: 'dlq', kind: 'fail' },
    ],
    dividers: [{ y: 170, label: 'async · off the request path' }],
  },

  cortex: {
    height: 432,
    summary:
      'CORTEX architecture: the Next.js UI sends questions to Celery workers, a LangGraph supervisor coordinates Researcher, Analyst and Coder agents, and research uses hybrid retrieval plus a Neo4j knowledge graph.',
    nodes: [
      { id: 'ui', x: 112, y: 12, w: 116, h: H, label: 'Next.js UI', sub: 'answers + citations', kind: 'client', note: 'The front end. Answers stream in live, with citations you can drill into.' },
      { id: 'celery', x: 112, y: 96, w: 116, h: H, label: 'Celery workers', sub: 'background jobs', kind: 'service', note: 'Celery workers run each research job in the background and stream progress back to the UI over Server-Sent Events.' },
      { id: 'supervisor', x: 8, y: 180, w: 170, h: H, label: 'LangGraph supervisor', sub: 'loop guard · token budgets', kind: 'service', note: 'A LangGraph supervisor delegates work to specialist agents, with a loop guard and token budgets so runs can’t spiral.' },
      { id: 'router', x: 206, y: 180, w: 126, h: H, label: 'LLM router', sub: 'Ollama / Bedrock', kind: 'ext', note: 'Cost-aware routing between local Ollama models and Amazon Bedrock.' },
      { id: 'researcher', x: 8, y: 266, w: 100, h: H, label: 'Researcher', sub: 'agent', kind: 'service', note: 'The Researcher agent gathers evidence using hybrid retrieval and the knowledge graph.' },
      { id: 'analyst', x: 120, y: 266, w: 100, h: H, label: 'Analyst', sub: 'agent', kind: 'service', note: 'The Analyst agent, one of three specialists the supervisor coordinates.' },
      { id: 'coder', x: 232, y: 266, w: 100, h: H, label: 'Coder', sub: 'sandboxed', kind: 'service', note: 'The Coder agent runs code in a sandbox, so generated code can’t touch the host.' },
      { id: 'retrieval', x: 8, y: 354, w: 196, h: H, label: 'Hybrid retrieval', sub: 'FTS + pgvector → RRF → rerank', kind: 'store', note: 'Postgres full-text search and pgvector HNSW, merged with Reciprocal Rank Fusion and re-ranked by a cross-encoder. Recall@k and MRR are checked nightly in CI on a hand-labelled golden set.' },
      { id: 'neo4j', x: 222, y: 354, w: 110, h: H, label: 'Neo4j', sub: 'GraphRAG', kind: 'store', note: 'A Neo4j knowledge graph for GraphRAG: it follows relationships between facts, not just similar text.' },
    ],
    edges: [
      { from: 'ui', to: 'celery', shiftX: -16, label: 'ask', side: 'left' },
      { from: 'celery', to: 'ui', shiftX: 16, label: 'SSE stream', side: 'right' },
      { from: 'celery', to: 'supervisor', label: 'run' },
      { from: 'supervisor', to: 'router' },
      { from: 'supervisor', to: 'researcher' },
      { from: 'supervisor', to: 'analyst' },
      { from: 'supervisor', to: 'coder' },
      { from: 'researcher', to: 'retrieval' },
      { from: 'researcher', to: 'neo4j' },
    ],
    footnote: 'Each tenant is isolated with PostgreSQL row-level security',
  },

  nexus: {
    height: 436,
    summary:
      'NEXUS architecture: vehicles publish GPS events to Kafka; consumers bulk-load them into TimescaleDB, send bad rows to a dead letter queue, and publish live positions through Redis and WebSocket gateways to a live map.',
    nodes: [
      { id: 'vehicles', x: 112, y: 12, w: 116, h: H, label: 'Vehicles', sub: 'GPS pings', kind: 'client', note: 'Load-tested with k6 on a model of 50K vehicles sending GPS events.' },
      { id: 'kafka', x: 112, y: 96, w: 116, h: H, label: 'Kafka', sub: 'GPS events', kind: 'queue', note: 'Every GPS event lands on Kafka first.' },
      { id: 'grafana', x: 252, y: 96, w: 80, h: H, label: 'Grafana', sub: 'lag alerts', kind: 'ext', note: 'Grafana alerts on consumer lag and data freshness. The stack runs on AWS ECS, deployed with Terraform.' },
      { id: 'consumer', x: 112, y: 180, w: 116, h: H, label: 'Consumers', sub: 'kafka-clients', kind: 'service', note: 'Plain kafka-clients consumers commit offsets only after the database commit, so a crash never loses a ping. Partition-pause backpressure slows intake when the database struggles.' },
      { id: 'dlq', x: 252, y: 180, w: 80, h: H, label: 'DLQ', sub: 'bad rows', kind: 'fail', note: 'Bisection recovery isolates bad rows and sends them to a DLQ without failing the valid ones.' },
      { id: 'tsdb', x: 8, y: 270, w: 120, h: H, label: 'TimescaleDB', sub: 'COPY · idempotent', kind: 'store', note: 'Events are bulk-loaded with COPY and idempotent writes, so replays are duplicate-safe.' },
      { id: 'redis', x: 212, y: 270, w: 120, h: H, label: 'Redis Pub/Sub', sub: 'live positions', kind: 'store', note: 'Redis Pub/Sub fans live positions out to every gateway instance.' },
      { id: 'map', x: 8, y: 360, w: 120, h: H, label: 'Live map', sub: 'Next.js + MapLibre', kind: 'client', note: 'A Next.js + MapLibre GL live map that uses Web Workers to stay smooth.' },
      { id: 'ws', x: 212, y: 360, w: 120, h: H, label: 'WebSocket', sub: 'gateways', kind: 'service', note: 'WebSocket gateways push the live positions to browsers.' },
    ],
    edges: [
      { from: 'vehicles', to: 'kafka', label: 'publish' },
      { from: 'kafka', to: 'consumer', label: 'poll' },
      { from: 'kafka', to: 'grafana', kind: 'async' },
      { from: 'consumer', to: 'dlq', kind: 'fail' },
      { from: 'consumer', to: 'tsdb' },
      { from: 'consumer', to: 'redis' },
      { from: 'redis', to: 'ws', label: 'fan-out' },
      { from: 'ws', to: 'map', label: 'push' },
    ],
    footnote: 'Crashes, replays and DB outages are tested with Testcontainers + Toxiproxy',
  },
};
