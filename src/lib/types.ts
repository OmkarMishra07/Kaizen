export const PLATFORMS = {
  CODEFORCES: 'CODEFORCES',
  GITHUB: 'GITHUB',
  LEETCODE: 'LEETCODE',
  GFG: 'GFG',
  HACKERRANK: 'HACKERRANK',
} as const

export type Platform = (typeof PLATFORMS)[keyof typeof PLATFORMS]

export const PLATFORM_LABELS: Record<Platform, string> = {
  CODEFORCES: 'Codeforces',
  GITHUB: 'GitHub',
  LEETCODE: 'LeetCode',
  GFG: 'GeeksforGeeks',
  HACKERRANK: 'HackerRank',
}

export const PLATFORM_COLORS: Record<Platform, string> = {
  CODEFORCES: '#1A1A2E',
  GITHUB: '#24292e',
  LEETCODE: '#FFA116',
  GFG: '#2F8D46',
  HACKERRANK: '#1BA94C',
}

export interface SyncResult {
  platform: Platform
  status: 'SUCCESS' | 'FAILED' | 'PARTIAL'
  message: string
  data?: ProblemStats
}

export interface ProblemStats {
  easySolved: number
  mediumSolved: number
  hardSolved: number
  totalSolved: number
  rating?: number
  contestCount?: number
  topicBreakdown?: Record<string, { easy: number; medium: number; hard: number }>
  rawStats?: Record<string, unknown>
}

export interface CategoryScore {
  score: number
  maxScore: number
  percentage: number
  details: Record<string, unknown>
}

export interface CompositeScore {
  compositeScore: number
  rankLevel: string
  rankName: string
  dsa: CategoryScore
  backend: CategoryScore
  portfolio: CategoryScore
  consistency: CategoryScore
  interview: CategoryScore
}

export const DSA_TOPICS = [
  'Arrays',
  'Strings',
  'Trees',
  'Graphs',
  'Dynamic Programming',
  'Heaps / Priority Queues',
  'Tries',
  'Backtracking',
  'Greedy',
  'Binary Search',
  'Two Pointers',
  'Sliding Window',
] as const

export type DsaTopic = (typeof DSA_TOPICS)[number]

export const CHECKLIST_CATEGORIES = [
  'CORE_JAVA',
  'SPRING_BOOT',
  'SQL_DATABASE',
  'SYSTEM_DESIGN',
  'API_DESIGN',
  'TESTING',
] as const

export type ChecklistCategory = (typeof CHECKLIST_CATEGORIES)[number]

export const CHECKLIST_CATEGORY_LABELS: Record<ChecklistCategory, string> = {
  CORE_JAVA: 'Core Java',
  SPRING_BOOT: 'Spring Boot',
  SQL_DATABASE: 'SQL & Database Design',
  SYSTEM_DESIGN: 'System Design',
  API_DESIGN: 'API Design',
  TESTING: 'Testing (JUnit/Mockito)',
}

export const DEFAULT_CHECKLIST: { category: ChecklistCategory; skill: string; description: string }[] = [
  { category: 'CORE_JAVA', skill: 'Collections Framework', description: 'Lists, Sets, Maps, Queues — when to use which' },
  { category: 'CORE_JAVA', skill: 'Concurrency', description: 'Threads, ExecutorService, CompletableFuture, synchronized, volatile' },
  { category: 'CORE_JAVA', skill: 'Streams API', description: 'Intermediate operations, collectors, parallel streams' },
  { category: 'CORE_JAVA', skill: 'Generics & Type Safety', description: 'Bounded types, wildcards, type erasure' },
  { category: 'CORE_JAVA', skill: 'Exception Handling', description: 'Custom exceptions, try-with-resources, checked vs unchecked' },
  { category: 'CORE_JAVA', skill: 'I/O & NIO', description: 'File handling, BufferedReader, BufferedWriter, Path API' },
  { category: 'SPRING_BOOT', skill: 'REST API Development', description: 'Controllers, DTOs, validation, error handling' },
  { category: 'SPRING_BOOT', skill: 'Spring Data JPA', description: 'Entities, repositories, JPQL, pagination' },
  { category: 'SPRING_BOOT', skill: 'Spring Security', description: 'Authentication, authorization, JWT filters' },
  { category: 'SPRING_BOOT', skill: 'Dependency Injection', description: 'Beans, autowiring, profiles, configuration' },
  { category: 'SPRING_BOOT', skill: 'Application Properties', description: 'Multi-profile config, environment variables' },
  { category: 'SQL_DATABASE', skill: 'SQL Fundamentals', description: 'Joins, subqueries, window functions, CTEs' },
  { category: 'SQL_DATABASE', skill: 'Database Design', description: 'Normalization, indexing, foreign keys, constraints' },
  { category: 'SQL_DATABASE', skill: 'Query Optimization', description: 'EXPLAIN, indexing strategies, N+1 problem' },
  { category: 'SYSTEM_DESIGN', skill: 'Caching', description: 'Redis, cache invalidation strategies, TTL' },
  { category: 'SYSTEM_DESIGN', skill: 'Load Balancing', description: 'Round-robin, least connections, health checks' },
  { category: 'SYSTEM_DESIGN', skill: 'Message Queues', description: 'Kafka/RabbitMQ basics, pub/sub, event-driven' },
  { category: 'SYSTEM_DESIGN', skill: 'Microservices', description: 'Service discovery, API gateway, inter-service comm' },
  { category: 'SYSTEM_DESIGN', skill: 'Sharding & Partitioning', description: 'Horizontal scaling, consistent hashing' },
  { category: 'API_DESIGN', skill: 'RESTful API Design', description: 'Resource naming, HTTP methods, status codes' },
  { category: 'API_DESIGN', skill: 'API Versioning', description: 'URL versioning, header versioning' },
  { category: 'API_DESIGN', skill: 'API Documentation', description: 'Swagger/OpenAPI, API contracts' },
  { category: 'TESTING', skill: 'JUnit 5', description: 'Annotations, assertions, test lifecycle' },
  { category: 'TESTING', skill: 'Mockito', description: 'Mocking, stubbing, argument matchers' },
  { category: 'TESTING', skill: 'Integration Testing', description: 'TestContainers, @SpringBootTest' },
]

export interface RankLevel {
  level: string
  name: string
  minScore: number
  maxScore: number
  gateCondition: string
  color: string
}

export const RANK_LADDER: RankLevel[] = [
  {
    level: 'L0',
    name: 'Trainee',
    minScore: 0,
    maxScore: 99,
    gateCondition: 'Just started tracking',
    color: '#9CA3AF',
  },
  {
    level: 'L1',
    name: 'Associate Engineer',
    minScore: 100,
    maxScore: 249,
    gateCondition: 'Basic DSA coverage, first deployed project',
    color: '#60A5FA',
  },
  {
    level: 'L2',
    name: 'SDE-1 Track',
    minScore: 250,
    maxScore: 449,
    gateCondition: '150+ DSA problems, all topic minimums hit at "aware" level',
    color: '#34D399',
  },
  {
    level: 'L3',
    name: 'SDE-1 Ready',
    minScore: 450,
    maxScore: 649,
    gateCondition: 'Backend checklist 70%+, 2+ solid projects, 300+ DSA',
    color: '#A78BFA',
  },
  {
    level: 'L4',
    name: 'SDE-2 Track',
    minScore: 650,
    maxScore: 799,
    gateCondition: 'System design basics done, contest rating trend positive',
    color: '#FBBF24',
  },
  {
    level: 'L5',
    name: 'SDE-2 Ready',
    minScore: 800,
    maxScore: 899,
    gateCondition: 'All topic minimums at "strong" level, 500+ DSA, 3+ production-grade projects',
    color: '#F97316',
  },
  {
    level: 'L6',
    name: 'Product-Co Ready',
    minScore: 900,
    maxScore: 1000,
    gateCondition: 'Every category >=85%, no topic gap, verified evidence on every checklist item',
    color: '#EF4444',
  },
]
