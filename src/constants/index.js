export const navLinks = [
  {
    id: 1,
    name: 'Home',
    href: '#home',
  },
  {
    id: 2,
    name: 'About',
    href: '#about',
  },
  {
    id: 3,
    name: 'Work',
    href: '#work',
  },
  {
    id: 4,
    name: 'Contact',
    href: '#contact',
  },
];

export const clientReviews = [
  {
    id: 1,
    name: 'Emily Johnson',
    position: 'Marketing Director at GreenLeaf',
    img: 'assets/review1.png',
    review:
      'Working with Adrian was a fantastic experience. He transformed our outdated website into a modern, user-friendly platform. His attention to detail and commitment to quality are unmatched. Highly recommend him for any web dev projects.',
  },
  {
    id: 2,
    name: 'Mark Rogers',
    position: 'Founder of TechGear Shop',
    img: 'assets/review2.png',
    review:
      'Adrian’s expertise in web development is truly impressive. He delivered a robust and scalable solution for our e-commerce site, and our online sales have significantly increased since the launch. He’s a true professional! Fantastic work.',
  },
  {
    id: 3,
    name: 'John Dohsas',
    position: 'Project Manager at UrbanTech ',
    img: 'assets/review3.png',
    review:
      'I can’t say enough good things about Adrian. He was able to take our complex project requirements and turn them into a seamless, functional website. His problem-solving abilities are outstanding.',
  },
  {
    id: 4,
    name: 'Ether Smith',
    position: 'CEO of BrightStar Enterprises',
    img: 'assets/review4.png',
    review:
      'Adrian was a pleasure to work with. He understood our requirements perfectly and delivered a website that exceeded our expectations. His skills in both frontend backend dev are top-notch.',
  },
];

export const myProjects = [
  {
    title: 'NEXUS - Real-Time Fleet Tracking Platform',
    desc: 'A real-time fleet tracking platform with a hand-built ingestion pipeline: plain kafka-clients consumers commit offsets only after the database commit, and GPS events are loaded into TimescaleDB via COPY with idempotent writes. Load-tested with k6 on a 50K-vehicle model.',
    subdesc:
      'Fault tolerant by design: DLQ, bisection recovery for bad rows and partition-pause backpressure, with crashes, replays and DB outages covered by Testcontainers and Toxiproxy tests. A Next.js + MapLibre GL live map (Web Workers) is fed by Redis Pub/Sub WebSocket fan-out, deployed on AWS ECS via Terraform with Grafana lag and freshness alerts.',
    href: 'https://github.com/DevanshuBh',
    texture: '/textures/project/nexus.png',
    logo: '/assets/nexus-logo.svg',
    logoStyle: {
      backgroundColor: '#0E1F38',
      border: '0.2px solid #0E2D58',
      boxShadow: '0px 0px 60px 0px #2F67B64D',
    },
    spotlight: '/assets/spotlight4.png',
    tags: [
      { id: 1, name: 'Java 21' },
      { id: 2, name: 'Kafka' },
      { id: 3, name: 'TimescaleDB' },
      { id: 4, name: 'Redis' },
      { id: 5, name: 'Next.js' },
      { id: 6, name: 'AWS' },
    ],
  },
  {
    title: 'CORTEX - Multi-Tenant GraphRAG Research Platform',
    desc: 'A multi-tenant research platform with hybrid retrieval: Postgres full-text + pgvector HNSW, Reciprocal Rank Fusion, cross-encoder reranking and Neo4j GraphRAG. Recall@k and MRR are evaluated nightly in CI on a hand-labelled golden set.',
    subdesc:
      'A LangGraph supervisor orchestrates Researcher, Analyst and Coder agents with a loop guard and token budgets, cost-aware Ollama/Bedrock routing and sandboxed code execution. Tenants are isolated with PostgreSQL Row-Level Security, and answers stream over SSE from Celery workers to a Next.js UI with citation drill-down.',
    href: 'https://github.com/DevanshuBh',
    texture: '/textures/project/cortex.png',
    logo: '/assets/cortex-logo.svg',
    logoStyle: {
      backgroundColor: '#1C1A43',
      border: '0.2px solid #252262',
      boxShadow: '0px 0px 60px 0px #635BFF4D',
    },
    spotlight: '/assets/spotlight5.png',
    tags: [
      { id: 1, name: 'Python' },
      { id: 2, name: 'LangGraph' },
      { id: 3, name: 'pgvector' },
      { id: 4, name: 'Neo4j' },
      { id: 5, name: 'Bedrock' },
    ],
  },
];

export const calculateSizes = (isSmall, isMobile, isTablet) => {
  return {
    deskScale: isSmall ? 0.05 : isMobile ? 0.06 : 0.065,
    deskPosition: isMobile ? [0.5, -4.5, 0] : [0.25, -5.5, 0],
    cubePosition: isSmall ? [4, -5, 0] : isMobile ? [5, -5, 0] : isTablet ? [5, -5, 0] : [9, -5.5, 0],
    reactLogoPosition: isSmall ? [3, 4, 0] : isMobile ? [5, 4, 0] : isTablet ? [5, 4, 0] : [12, 3, 0],
    ringPosition: isSmall ? [-5, 7, 0] : isMobile ? [-10, 10, 0] : isTablet ? [-12, 10, 0] : [-24, 10, 0],
    targetPosition: isSmall ? [-5, -10, -10] : isMobile ? [-9, -10, -10] : isTablet ? [-11, -7, -10] : [-13, -13, -10],
  };
};

export const certificates = [
  {
    id: 1,
    title: 'Google Data Analytics Professional Certificate',
    issuer: 'Google',
    date: '2023',
    image: '/assets/google1.png',
    credentialUrl: 'https://coursera.org/share/90caef1c0941f9cfa8eee7cb90a0e69b',
  },
  {
    id: 2,
    title: 'Google Advanced Data Analytics Professional Certificate',
    issuer: 'Google',
    date: '2024',
    image: '/assets/google2.png',
    credentialUrl: 'https://coursera.org/share/cfea4ce4f7aba4d0a5e0a1109822cd28',
  },
  {
    id: 3,
    title: 'Performer of the Month among 200+ employees',
    issuer: 'Infinite Computer Solutions',
    image: '/assets/Infinite.svg',
    imageFit: 'contain',
    credentialUrl: 'https://drive.google.com/file/d/1bQg3gGqZfvCLeZkRKfXUr5uACjX1tnw1/view?usp=sharing',
  },
];

export const workExperiences = [
  {
    id: 1,
    name: 'Infinite Computer Solutions',
    pos: 'Associate Software Engineer',
    duration: 'Oct 2024 - Present',
    title: `
<ul>
<li>• <strong>Backend Development:</strong> Contribute to backend services of an enterprise <strong>fraud detection platform</strong> processing high-volume payment transactions in a <strong>10+ member</strong> team supporting real-time risk analysis.</li>
<li>• <strong>Event Streaming Pipeline:</strong> Implemented and maintained <strong>Apache Kafka consumers</strong> ingesting high-frequency payment events, with manual offset handling and retry logic.</li>
<li>• <strong>Failure Handling &amp; DLQ:</strong> Added a <strong>Dead Letter Queue (DLQ)</strong> for fraud events failing after retry thresholds, improving fault tolerance and debugging of malformed messages.</li>
<li>• <strong>Database Performance:</strong> Helped resolve a persistence bottleneck with <strong>Kafka consumer batch processing</strong> and <strong>PostgreSQL</strong> bulk inserts, significantly improving write throughput.</li>
</ul>
    `,
    icon: '/assets/Infinite.svg',
    animation: 'clapping',
  },
];
