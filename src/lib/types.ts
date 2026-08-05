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
  'OOD_AND_PRINCIPLES',
  'DATABASES',
  'SPRING_BOOT',
  'API_DESIGN',
  'TESTING',
  'BUILD_AND_VCS',
  'SYSTEM_DESIGN_HLD',
  'CICD_DEVOPS',
  'CLOUD_INFRA',
  'OBSERVABILITY',
  'SECURITY',
  'INTERVIEW_PREP'
] as const

export type ChecklistCategory = (typeof CHECKLIST_CATEGORIES)[number]

export const CHECKLIST_CATEGORY_LABELS: Record<ChecklistCategory, string> = {
  CORE_JAVA: '1. Core Java',
  OOD_AND_PRINCIPLES: '2. Object-Oriented Design',
  DATABASES: '3. Databases',
  SPRING_BOOT: '4. Spring & Spring Boot',
  API_DESIGN: '5. API Design',
  TESTING: '6. Testing',
  BUILD_AND_VCS: '7. Build Tools & VCS',
  SYSTEM_DESIGN_HLD: '8. System Design (HLD)',
  CICD_DEVOPS: '9. CI/CD & DevOps',
  CLOUD_INFRA: '10. Cloud & Infra Basics',
  OBSERVABILITY: '11. Observability',
  SECURITY: '12. Security Fundamentals',
  INTERVIEW_PREP: '13. Interview Prep',
}


export const DEFAULT_CHECKLIST: { category: ChecklistCategory; skill: string; description: string }[] = [
  // 1. Core Java (Foundation)
  { category: 'CORE_JAVA', skill: 'Syntax & Flow', description: 'Syntax, data types, operators, control flow' },
  { category: 'CORE_JAVA', skill: 'OOP Fundamentals', description: 'Encapsulation, inheritance, polymorphism, abstraction (with why, not just definitions)' },
  { category: 'CORE_JAVA', skill: 'Abstract vs Interface', description: 'abstract class vs interface (default/static methods, functional interfaces)' },
  { category: 'CORE_JAVA', skill: 'Collections Framework', description: 'ArrayList vs LinkedList, HashMap internals, HashSet, TreeMap, LinkedHashMap' },
  { category: 'CORE_JAVA', skill: 'equals() & hashCode()', description: 'equals() & hashCode() contract' },
  { category: 'CORE_JAVA', skill: 'Exception Handling', description: 'Checked vs unchecked, custom exceptions, try-with-resources' },
  { category: 'CORE_JAVA', skill: 'String Handling', description: 'String pool, immutability, StringBuilder vs StringBuffer' },
  { category: 'CORE_JAVA', skill: 'Generics', description: 'Generics + wildcards (? extends, ? super)' },
  { category: 'CORE_JAVA', skill: 'Java 8+ Features', description: 'Streams API, lambdas, Optional, method references' },
  { category: 'CORE_JAVA', skill: 'Multithreading & Concurrency', description: 'Thread, Runnable, synchronized, volatile, ExecutorService, CompletableFuture, ConcurrentHashMap, deadlocks/race conditions' },
  { category: 'CORE_JAVA', skill: 'JVM Internals', description: 'Memory model (heap/stack), garbage collection basics, class loading' },

  // 2. Object-Oriented Design
  { category: 'OOD_AND_PRINCIPLES', skill: 'SOLID Principles', description: 'SOLID principles with real code examples' },
  { category: 'OOD_AND_PRINCIPLES', skill: 'Design Patterns', description: 'Singleton, Factory, Builder, Strategy, Observer, Decorator' },
  { category: 'OOD_AND_PRINCIPLES', skill: 'Low-Level Design (LLD)', description: 'Design a parking lot, elevator, rate limiter, BookMyShow, splitwise-type problems' },
  { category: 'OOD_AND_PRINCIPLES', skill: 'UML Basics', description: 'Class diagrams — enough to communicate design' },

  // 3. Databases
  { category: 'DATABASES', skill: 'SQL Fundamentals', description: 'Joins, subqueries, window functions, indexes' },
  { category: 'DATABASES', skill: 'Normalization', description: 'Normalization/denormalization tradeoffs' },
  { category: 'DATABASES', skill: 'Transactions', description: 'ACID, isolation levels, locking' },
  { category: 'DATABASES', skill: 'Indexing Internals', description: 'B-Trees, when indexes hurt writes' },
  { category: 'DATABASES', skill: 'Query Optimization', description: 'Query optimization / reading an EXPLAIN plan' },
  { category: 'DATABASES', skill: 'NoSQL vs Relational', description: 'When to use Mongo/Firestore vs relational' },
  { category: 'DATABASES', skill: 'Connection Pooling', description: 'Connection pooling (HikariCP)' },
  { category: 'DATABASES', skill: 'Database Migrations', description: 'Database migrations (Flyway/Liquibase)' },

  // 4. Spring & Spring Boot
  { category: 'SPRING_BOOT', skill: 'IoC & DI', description: 'IoC & Dependency Injection — how the container actually works' },
  { category: 'SPRING_BOOT', skill: 'Bean Lifecycle & Scopes', description: 'Bean lifecycle, scopes (@Component, @Service, @Repository, @Bean)' },
  { category: 'SPRING_BOOT', skill: 'Autoconfiguration', description: 'Spring Boot autoconfiguration — what it hides from you' },
  { category: 'SPRING_BOOT', skill: 'Spring MVC', description: '@RestController, request/response lifecycle, @ControllerAdvice for global exception handling' },
  { category: 'SPRING_BOOT', skill: 'Spring Data JPA', description: 'Repositories, entity relationships, lazy vs eager loading, N+1 query problem' },
  { category: 'SPRING_BOOT', skill: 'Validation', description: '@Valid, custom validators' },
  { category: 'SPRING_BOOT', skill: 'Spring Security Basics', description: 'Authentication vs authorization, JWT, OAuth2 flow' },
  { category: 'SPRING_BOOT', skill: 'Profiles & Config', description: 'Profiles & externalized config (application.yml, @ConfigurationProperties)' },
  { category: 'SPRING_BOOT', skill: 'Actuator', description: 'Actuator for health checks/metrics' },

  // 5. API Design
  { category: 'API_DESIGN', skill: 'REST Principles', description: 'Statelessness, resource naming, proper HTTP verbs/status codes' },
  { category: 'API_DESIGN', skill: 'Pagination & Sorting', description: 'Pagination, filtering, sorting patterns' },
  { category: 'API_DESIGN', skill: 'API Versioning', description: 'API versioning strategies' },
  { category: 'API_DESIGN', skill: 'Idempotency', description: 'Idempotency (critical for payments/order systems)' },
  { category: 'API_DESIGN', skill: 'Documentation', description: 'OpenAPI/Swagger documentation' },
  { category: 'API_DESIGN', skill: 'Rate Limiting', description: 'Rate limiting basics' },
  { category: 'API_DESIGN', skill: 'gRPC / GraphQL', description: 'Awareness level understanding of gRPC and GraphQL' },

  // 6. Testing
  { category: 'TESTING', skill: 'Unit Testing & Mocking', description: 'JUnit 5, Mockito, test doubles (mock/stub/spy)' },
  { category: 'TESTING', skill: 'Integration Testing', description: '@SpringBootTest, Testcontainers' },
  { category: 'TESTING', skill: 'Test Coverage', description: 'JaCoCo — understand what coverage % actually tells you' },
  { category: 'TESTING', skill: 'TDD Mindset', description: 'Even if you don’t practice it strictly, know how to talk about it' },

  // 7. Build Tools & VCS
  { category: 'BUILD_AND_VCS', skill: 'Build Tools (Maven/Gradle)', description: 'Dependency management, build lifecycle, multi-module projects' },
  { category: 'BUILD_AND_VCS', skill: 'Git & Branching', description: 'Branching strategies (Gitflow), rebase vs merge, conflicts, git bisect' },
  { category: 'BUILD_AND_VCS', skill: 'Code Review Etiquette', description: 'Both giving and receiving constructive code reviews' },

  // 8. System Design (HLD)
  { category: 'SYSTEM_DESIGN_HLD', skill: 'Scalability Basics', description: 'Vertical vs horizontal scaling, load balancing' },
  { category: 'SYSTEM_DESIGN_HLD', skill: 'Caching Strategies', description: 'Redis, cache invalidation strategies, write-through vs write-back' },
  { category: 'SYSTEM_DESIGN_HLD', skill: 'Message Queues', description: 'Kafka/RabbitMQ — pub-sub vs point-to-point, when to decouple' },
  { category: 'SYSTEM_DESIGN_HLD', skill: 'Database Scaling', description: 'Sharding, replication, read replicas' },
  { category: 'SYSTEM_DESIGN_HLD', skill: 'CAP Theorem', description: 'CAP theorem — practically, not just the triangle diagram' },
  { category: 'SYSTEM_DESIGN_HLD', skill: 'Consistent Hashing', description: 'Consistent hashing' },
  { category: 'SYSTEM_DESIGN_HLD', skill: 'Rate Limiters & Circuit Breakers', description: 'Rate limiters, circuit breakers (Resilience4j)' },
  { category: 'SYSTEM_DESIGN_HLD', skill: 'Classic Design Problems', description: 'URL shortener, chat system, notification system, ride-sharing, live comments' },

  // 9. CI/CD & DevOps
  { category: 'CICD_DEVOPS', skill: 'Docker Basics', description: 'Images, containers, Dockerfile basics, multi-stage builds' },
  { category: 'CICD_DEVOPS', skill: 'Docker Compose', description: 'Docker Compose for local multi-service setups' },
  { category: 'CICD_DEVOPS', skill: 'CI/CD Pipelines', description: 'GitHub Actions or Jenkins — build/test/deploy stages' },
  { category: 'CICD_DEVOPS', skill: 'Kubernetes Basics', description: 'Basics of K8s (pods, deployments, services)' },
  { category: 'CICD_DEVOPS', skill: 'Environment Configs', description: 'Dev/staging/prod separation, secrets management' },

  // 10. Cloud & Infra
  { category: 'CLOUD_INFRA', skill: 'Cloud Provider (AWS/GCP)', description: 'EC2, S3, RDS, Lambda basics' },
  { category: 'CLOUD_INFRA', skill: 'Deployment Experience', description: 'Render, Railway, AWS, GCP deployments' },
  { category: 'CLOUD_INFRA', skill: 'Load Balancers & CDNs', description: 'Conceptual understanding of LBs and CDNs' },

  // 11. Observability
  { category: 'OBSERVABILITY', skill: 'Logging Best Practices', description: 'Structured logging, log levels' },
  { category: 'OBSERVABILITY', skill: 'Monitoring', description: 'Monitoring basics: Prometheus/Grafana concepts' },
  { category: 'OBSERVABILITY', skill: 'Distributed Tracing', description: 'Awareness of distributed tracing and what problem it solves' },

  // 12. Security
  { category: 'SECURITY', skill: 'Common Vulnerabilities', description: 'SQL injection, XSS, CSRF — and how Spring mitigates them' },
  { category: 'SECURITY', skill: 'Password Hashing', description: 'Password hashing (bcrypt), never storing plaintext' },
  { category: 'SECURITY', skill: 'HTTPS & TLS', description: 'HTTPS/TLS basics' },
  { category: 'SECURITY', skill: 'Secure API Design', description: 'Input validation, principle of least privilege' },

  // 13. Interview Prep
  { category: 'INTERVIEW_PREP', skill: 'LLD Mock Interviews', description: 'Design 2-3 systems end-to-end with code' },
  { category: 'INTERVIEW_PREP', skill: 'HLD Mock Interviews', description: 'Practice explaining tradeoffs out loud, not just naming components' },
  { category: 'INTERVIEW_PREP', skill: 'Behavioral Prep', description: 'STAR-format stories from your actual projects' },
  { category: 'INTERVIEW_PREP', skill: 'Resume Walkthrough', description: 'Be ready to justify every metric you write on your resume' },
  { category: 'INTERVIEW_PREP', skill: 'Mock Interviews', description: 'Peer or platform-based mocks in the last 2 weeks before real interviews' },
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
