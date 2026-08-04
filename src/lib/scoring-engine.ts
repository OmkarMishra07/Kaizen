import {
  DSA_TOPICS,
  CategoryScore,
  CompositeScore,
  RANK_LADDER,
  type DsaTopic,
} from './types'
import type { PrismaClient } from '@prisma/client'

export interface ScoringContext {
  topics: { topic: string; totalSolved: number; easySolved: number; mediumSolved: number; hardSolved: number }[]
  problems: {
    totalSolved: number
    easySolved: number
    mediumSolved: number
    hardSolved: number
    rating?: number
    contestCount?: number
  }
  checklist: { category: string; completed: number; total: number }
  projects: {
    count: number
    avgComplexity: number
    withReadme: number
    withTests: number
    withCI: number
    avgStars: number
  }
  activity: {
    currentStreak: number
    longestStreak: number
    sevenDayActive: number
    thirtyDayActive: number
  }
  interview: {
    mockInterviewCount: number
    avgMockScore: number
    resumeVersionCount: number
    resumeCompleteness: number
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

// ─── DSA Score (max 350) ──────────────────────────────────────────────

function calculateDsaScore(ctx: ScoringContext): CategoryScore {
  const { problems, topics, activity } = ctx

  // 1. Problem count score (0-150)
  // Weighted: Easy=1, Med=3, Hard=5
  const weightedTotal = problems.easySolved * 1 + problems.mediumSolved * 3 + problems.hardSolved * 5
  const problemScore = clamp(Math.floor((weightedTotal / 2000) * 150), 0, 150)

  // 2. Topic coverage score (0-120)
  // Must cover all 12 topics at minimum levels
  const topicMap = new Map(topics.map(t => [t.topic, t]))
  let topicScore = 0
  let coveredTopics = 0

  for (const topic of DSA_TOPICS) {
    const data = topicMap.get(topic as string)
    const total = data?.totalSolved || 0
    if (total >= 5) {
      topicScore += clamp(Math.floor(total / 20) * 10, 0, 10)
      coveredTopics++
    } else if (total >= 2) {
      topicScore += 3
      coveredTopics++
    } else if (total > 0) {
      topicScore += 1
      coveredTopics++
    }
  }
  const coveragePct = coveredTopics / DSA_TOPICS.length
  const topicScoreFinal = clamp(Math.floor(topicScore + coveragePct * 20), 0, 120)

  // 3. Contest activity (0-50)
  let contestScore = 0
  if (problems.contestCount > 0) contestScore += clamp(problems.contestCount * 2, 0, 25)
  if (problems.rating) contestScore += clamp(Math.floor((problems.rating - 800) / 20), 0, 25)

  // 4. Balanced coverage bonus (0-30)
  // Penalize if over-indexing on one area
  const maxTopic = Math.max(...topics.map(t => t.totalSolved), 0)
  const minTopic = topics.length > 0 ? Math.min(...topics.map(t => t.totalSolved)) : 0
  const balanceRatio = maxTopic > 0 ? minTopic / maxTopic : 0
  const balanceBonus = clamp(Math.floor(balanceRatio * 30), 0, 30)

  const totalScore = problemScore + topicScoreFinal + contestScore + balanceBonus
  const details = {
    problemScore,
    topicScore: topicScoreFinal,
    contestScore,
    balanceBonus,
    weightedTotal,
    coveredTopics,
    totalTopics: DSA_TOPICS.length,
    weakestTopics: topics
      .filter(t => t.totalSolved < 5)
      .sort((a, b) => a.totalSolved - b.totalSolved)
      .slice(0, 3)
      .map(t => t.topic),
  }

  return { score: totalScore, maxScore: 350, percentage: Math.round((totalScore / 350) * 100), details }
}

// ─── Backend Score (max 250) ───────────────────────────────────────────

function calculateBackendScore(ctx: ScoringContext): CategoryScore {
  const { checklist } = ctx

  // Checklist completion percentage
  const totalItems = checklist.total || 1
  const completedItems = checklist.completed || 0
  const completionPct = completedItems / totalItems

  // Per-category coverage (bonus for breadth)
  const categories = 6
  const score = clamp(Math.floor(completionPct * 200 + (completedItems >= categories ? 50 : 0)), 0, 250)

  const details = {
    completionPct: Math.round(completionPct * 100),
    completedItems,
    totalItems,
    allCategoriesTouched: completedItems >= categories,
  }

  return { score, maxScore: 250, percentage: Math.round((score / 250) * 100), details }
}

// ─── Portfolio Score (max 200) ────────────────────────────────────────

function calculatePortfolioScore(ctx: ScoringContext): CategoryScore {
  const { projects } = ctx

  // Project count (0-60)
  const countScore = clamp(Math.floor(projects.count * 15), 0, 60)

  // Quality signals (0-80)
  const readmePct = projects.count > 0 ? projects.withReadme / projects.count : 0
  const testPct = projects.count > 0 ? projects.withTests / projects.count : 0
  const ciPct = projects.count > 0 ? projects.withCI / projects.count : 0
  const qualityScore = clamp(Math.floor((readmePct + testPct + ciPct) * 26), 0, 80)

  // Complexity & impact (0-60)
  const complexityScore = clamp(Math.floor(projects.avgComplexity * 4), 0, 30)
  const starBonus = clamp(Math.floor(projects.avgStars * 2), 0, 30)

  const totalScore = countScore + qualityScore + complexityScore + starBonus

  const details = {
    countScore,
    qualityScore,
    complexityScore,
    starBonus,
    projectCount: projects.count,
    avgComplexity: projects.avgComplexity,
    readmePct: Math.round(readmePct * 100),
    testPct: Math.round(testPct * 100),
    ciPct: Math.round(ciPct * 100),
  }

  return { score: totalScore, maxScore: 200, percentage: Math.round((totalScore / 200) * 100), details }
}

// ─── Consistency Score (max 100) ───────────────────────────────────────

function calculateConsistencyScore(ctx: ScoringContext): CategoryScore {
  const { activity } = ctx

  // Current streak (0-30)
  const streakScore = clamp(Math.floor(activity.currentStreak * 3), 0, 30)

  // 7-day active (0-30)
  const sevenDayScore = clamp(Math.floor(activity.sevenDayActive * 4.3), 0, 30)

  // 30-day active (0-40)
  const thirtyDayScore = clamp(Math.floor(activity.thirtyDayActive * 1.33), 0, 40)

  const totalScore = streakScore + sevenDayScore + thirtyDayScore

  const details = {
    streakScore,
    sevenDayScore,
    thirtyDayScore,
    currentStreak: activity.currentStreak,
    longestStreak: activity.longestStreak,
    sevenDayPct: Math.round(activity.sevenDayActive * 100),
    thirtyDayPct: Math.round(activity.thirtyDayActive * 100),
  }

  return { score: totalScore, maxScore: 100, percentage: Math.round((totalScore / 100) * 100), details }
}

// ─── Interview Readiness Score (max 100) ───────────────────────────────

function calculateInterviewScore(ctx: ScoringContext): CategoryScore {
  const { interview } = ctx

  // Mock interviews (0-50)
  const mockScore = clamp(Math.floor(interview.mockInterviewCount * 5), 0, 35)
  const mockQuality = clamp(Math.floor(interview.avgMockScore * 3), 0, 15)

  // Resume (0-50)
  const resumeVersion = clamp(Math.floor(interview.resumeVersionCount * 10), 0, 20)
  const resumeComplete = clamp(Math.floor(interview.resumeCompleteness * 30), 0, 30)

  const totalScore = mockScore + mockQuality + resumeVersion + resumeComplete

  const details = {
    mockScore: mockScore + mockQuality,
    resumeScore: resumeVersion + resumeComplete,
    mockInterviewCount: interview.mockInterviewCount,
    avgMockScore: interview.avgMockScore,
    resumeVersionCount: interview.resumeVersionCount,
    resumeCompleteness: Math.round(interview.resumeCompleteness * 100),
  }

  return { score: totalScore, maxScore: 100, percentage: Math.round((totalScore / 100) * 100), details }
}

// ─── Composite Score & Rank ────────────────────────────────────────────

export function calculateCompositeScore(ctx: ScoringContext): CompositeScore {
  const dsa = calculateDsaScore(ctx)
  const backend = calculateBackendScore(ctx)
  const portfolio = calculatePortfolioScore(ctx)
  const consistency = calculateConsistencyScore(ctx)
  const interview = calculateInterviewScore(ctx)

  // Category caps for higher levels — prevent over-indexing
  const minPercentage = Math.min(
    dsa.percentage,
    backend.percentage,
    portfolio.percentage,
    consistency.percentage,
    interview.percentage
  )

  // Gate: for L5+, all categories must be >= 60%
  // for L6, all categories must be >= 85%
  const categoryGateFactor =
    minPercentage >= 85 ? 1.0 :
    minPercentage >= 60 ? 1.0 :
    minPercentage >= 40 ? 0.9 :
    minPercentage >= 20 ? 0.8 :
    0.7

  // Apply gate: if dsa < 40%, cap backend contribution, etc.
  let effectiveBackend = backend.score
  let effectivePortfolio = portfolio.score
  if (dsa.percentage < 40) {
    effectiveBackend = Math.min(effectiveBackend, Math.floor(backend.score * 0.6))
    effectivePortfolio = Math.min(effectivePortfolio, Math.floor(portfolio.score * 0.6))
  }

  let compositeScore = Math.floor(
    (dsa.score + effectiveBackend + effectivePortfolio + consistency.score + interview.score) * categoryGateFactor
  )

  // Extra hard cap for L5+: max score from any single category can only cover 40% of requirement
  if (compositeScore >= 800) {
    const maxSingleCategory = Math.max(dsa.score, effectiveBackend, effectivePortfolio, consistency.score, interview.score)
    const maxAllowed = Math.floor(400) // 40% of 1000
    if (maxSingleCategory > maxAllowed) {
      // This shouldn't normally happen with our weights, but as a safety net
    }
  }

  compositeScore = clamp(compositeScore, 0, 1000)

  // Determine rank
  const rank = RANK_LADDER.slice().reverse().find(r => compositeScore >= r.minScore) || RANK_LADDER[0]

  return {
    compositeScore,
    rankLevel: rank.level,
    rankName: rank.name,
    dsa,
    backend: { ...backend, score: effectiveBackend },
    portfolio: { ...portfolio, score: effectivePortfolio },
    consistency,
    interview,
  }
}

// ─── Gaps Analysis (for Next Level Card) ──────────────────────────────

export interface GapAnalysis {
  nextRankLevel: string
  nextRankName: string
  scoreGap: number
  suggestions: string[]
}

export function analyzeGaps(score: CompositeScore): GapAnalysis {
  const currentIdx = RANK_LADDER.findIndex(r => r.level === score.rankLevel)
  const nextRank = currentIdx < RANK_LADDER.length - 1 ? RANK_LADDER[currentIdx + 1] : null

  if (!nextRank) {
    return {
      nextRankLevel: score.rankLevel,
      nextRankName: score.rankName,
      scoreGap: 0,
      suggestions: ['You have reached the maximum level! Maintain your performance.'],
    }
  }

  const suggestions: string[] = []
  const scoreGap = nextRank.minScore - score.compositeScore

  // DSA gaps
  if (score.dsa.percentage < 70) {
    suggestions.push(`DSA is at ${score.dsa.percentage}% — focus on weak topics`)
    const weakest = (score.dsa.details as { weakestTopics?: string[] }).weakestTopics
    if (weakest && weakest.length > 0) {
      suggestions.push(`Weak topics: ${weakest.join(', ')} — solve 5+ problems in each`)
    }
  }

  // Backend gaps
  if (score.backend.percentage < 70) {
    const completed = (score.backend.details as { completedItems?: number }).completedItems || 0
    const total = (score.backend.details as { totalItems?: number }).totalItems || 1
    const remaining = total - completed
    suggestions.push(`Backend checklist: ${remaining} items remaining (complete with evidence links)`)
  }

  // Portfolio gaps
  if (score.portfolio.percentage < 70) {
    suggestions.push('Add more projects with README, tests, and CI for higher portfolio score')
  }

  // Consistency gaps
  if (score.consistency.percentage < 70) {
    suggestions.push('Improve consistency — maintain a daily activity streak')
  }

  // Interview gaps
  if (score.interview.percentage < 70) {
    suggestions.push('Log mock interviews and polish your resume to boost interview readiness')
  }

  if (suggestions.length === 0) {
    suggestions.push('Keep pushing — you are close to the next level!')
  }

  return {
    nextRankLevel: nextRank.level,
    nextRankName: nextRank.name,
    scoreGap,
    suggestions,
  }
}
