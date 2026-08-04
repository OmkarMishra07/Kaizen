import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTokenFromHeaders, verifyToken } from '@/lib/auth'
import { calculateCompositeScore, analyzeGaps, type ScoringContext } from '@/lib/scoring-engine'
import { DSA_TOPICS, CHECKLIST_CATEGORIES, CHECKLIST_CATEGORY_LABELS } from '@/lib/types'

export const dynamic = 'force-dynamic'

async function authenticate(request: Request): Promise<string | NextResponse> {
  const token = getTokenFromHeaders(request.headers)
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const payload = await verifyToken(token)
  if (!payload) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
  }
  return payload.userId
}

export async function GET(request: Request) {
  try {
    const userId = await authenticate(request)
    if (userId instanceof NextResponse) return userId

    const uid = userId as string

    // 1. Get topic coverage to find weakest DSA topics
    const topicCoverage = await db.topicCoverage.findMany({ where: { userId: uid } })
    const weakTopics = topicCoverage
      .filter(t => t.totalSolved < 5)
      .sort((a, b) => a.totalSolved - b.totalSolved)
      .slice(0, 5)
      .map(t => ({
        topic: t.topic,
        totalSolved: t.totalSolved,
        target: 10,
        gap: Math.max(0, 10 - t.totalSolved),
      }))

    // 2. Get incomplete checklist categories
    const checklistItems = await db.skillChecklistItem.findMany({ where: { userId: uid } })
    const categoryStats = new Map<string, { completed: number; total: number; label: string }>()

    for (const cat of CHECKLIST_CATEGORIES) {
      const items = checklistItems.filter(i => i.category === cat)
      const completed = items.filter(i => i.isCompleted).length
      categoryStats.set(cat, {
        completed,
        total: items.length,
        label: CHECKLIST_CATEGORY_LABELS[cat],
      })
    }

    const weakCategories = [...categoryStats.entries()]
      .filter(([, stats]) => stats.total > 0 && stats.completed / stats.total < 0.7)
      .sort(([, a], [, b]) => (a.completed / a.total) - (b.completed / b.total))
      .slice(0, 3)
      .map(([cat, stats]) => ({
        category: cat,
        label: stats.label,
        completed: stats.completed,
        total: stats.total,
        percentage: Math.round((stats.completed / stats.total) * 100),
        remaining: stats.total - stats.completed,
      }))

    // 3. Check project count
    const projects = await db.project.findMany({ where: { userId: uid } })
    const projectCount = projects.length
    const projectSuggestion = projectCount < 3
      ? `Add ${3 - projectCount} more project(s) with README, tests, and CI for stronger portfolio`
      : null

    // 4. Check activity/streak
    const allLogs = await db.dailyActivityLog.findMany({
      where: { userId: uid },
      orderBy: { date: 'desc' },
    })

    const today = new Date()
    let currentStreak = 0
    let checkDate = new Date(today)
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const dateSet = new Set(allLogs.map(l => l.date))

    if (!dateSet.has(todayStr)) {
      checkDate.setDate(checkDate.getDate() - 1)
    }
    for (let i = 0; i < 365; i++) {
      const dStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`
      if (dateSet.has(dStr)) {
        currentStreak++
        checkDate.setDate(checkDate.getDate() - 1)
      } else {
        break
      }
    }

    const streakSuggestion = currentStreak < 7
      ? `Build a daily activity streak — you're at ${currentStreak} days, aim for 7+`
      : null

    // 5. Calculate current score for context
    const accounts = await db.platformAccount.findMany({ where: { userId: uid }, select: { id: true } })
    let aggEasy = 0, aggMedium = 0, aggHard = 0, aggTotal = 0
    let bestRating: number | undefined
    let maxContest = 0

    if (accounts.length > 0) {
      const snapshots = await db.problemSolvedSnapshot.findMany({
        where: { platformAccountId: { in: accounts.map(a => a.id) } },
        orderBy: { snapshotDate: 'desc' },
      })
      const seen = new Set<string>()
      for (const snap of snapshots) {
        if (seen.has(snap.platformAccountId)) continue
        seen.add(snap.platformAccountId)
        aggEasy += snap.easySolved
        aggMedium += snap.mediumSolved
        aggHard += snap.hardSolved
        aggTotal += snap.totalSolved
        if (snap.rating && (!bestRating || snap.rating > bestRating)) bestRating = snap.rating
        if (snap.contestCount > maxContest) maxContest = snap.contestCount
      }
    }

    const ctx: ScoringContext = {
      topics: topicCoverage.map(t => ({
        topic: t.topic, totalSolved: t.totalSolved,
        easySolved: t.easySolved, mediumSolved: t.mediumSolved, hardSolved: t.hardSolved,
      })),
      problems: { totalSolved: aggTotal, easySolved: aggEasy, mediumSolved: aggMedium, hardSolved: aggHard, rating: bestRating, contestCount: maxContest },
      checklist: { category: 'all', completed: checklistItems.filter(i => i.isCompleted).length, total: checklistItems.length },
      projects: {
        count: projectCount,
        avgComplexity: projectCount > 0 ? projects.reduce((s, p) => s + p.complexityScore, 0) / projectCount : 0,
        withReadme: projects.filter(p => p.hasReadme).length,
        withTests: projects.filter(p => p.hasTests).length,
        withCI: projects.filter(p => p.hasCI).length,
        avgStars: projectCount > 0 ? projects.reduce((s, p) => s + p.stars, 0) / projectCount : 0,
      },
      activity: {
        currentStreak,
        longestStreak: 0,
        sevenDayActive: allLogs.filter(l => {
          const d = new Date(l.date)
          const ago = new Date(); ago.setDate(ago.getDate() - 7)
          return d >= ago
        }).length / 7,
        thirtyDayActive: allLogs.filter(l => {
          const d = new Date(l.date)
          const ago = new Date(); ago.setDate(ago.getDate() - 30)
          return d >= ago
        }).length / 30,
      },
      interview: { mockInterviewCount: 0, avgMockScore: 0, resumeVersionCount: 0, resumeCompleteness: 0 },
    }

    const score = calculateCompositeScore(ctx)
    const gaps = analyzeGaps(score)

    // 6. Build weekly focus plan
    const weeklyPlan: { day: string; focus: string; action: string }[] = []
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

    if (weakTopics.length > 0) {
      weeklyPlan.push(
        { day: days[0], focus: 'DSA', action: `Solve 5 ${weakTopics[0].topic} problems (2 easy, 2 medium, 1 hard)` },
        { day: days[1], focus: 'DSA', action: `Solve 5 ${weakTopics[0].topic} problems + practice ${weakTopics[1]?.topic || 'Arrays'}` },
      )
    }

    if (weakCategories.length > 0) {
      weeklyPlan.push(
        { day: days[2], focus: 'Backend', action: `Complete 1-2 ${weakCategories[0].label} checklist items with evidence` },
        { day: days[3], focus: 'Backend', action: `Study and complete items from ${weakCategories[1]?.label || weakCategories[0].label}` },
      )
    }

    if (projectSuggestion) {
      weeklyPlan.push(
        { day: days[4], focus: 'Project', action: 'Work on building or improving a portfolio project' },
      )
    }

    weeklyPlan.push(
      { day: days[5], focus: 'Review', action: 'Review weak topics, revise notes, solve a timed mock' },
      { day: days[6], focus: 'Rest/Light', action: 'Light practice or system design reading. Stay consistent!' },
    )

    return NextResponse.json({
      currentScore: score.compositeScore,
      rankLevel: score.rankLevel,
      rankName: score.rankName,
      gaps,
      weakTopics,
      weakCategories,
      projectSuggestion,
      streakSuggestion,
      weeklyPlan,
      priorities: [
        ...(weakTopics.length > 0 ? [{ type: 'DSA' as const, message: `Focus on weakest topic: ${weakTopics[0].topic} (only ${weakTopics[0].totalSolved} solved)` }] : []),
        ...(weakCategories.length > 0 ? [{ type: 'CHECKLIST' as const, message: `${weakCategories[0].label}: ${weakCategories[0].remaining} items remaining` }] : []),
        ...(projectSuggestion ? [{ type: 'PROJECT' as const, message: projectSuggestion }] : []),
        ...(streakSuggestion ? [{ type: 'CONSISTENCY' as const, message: streakSuggestion }] : []),
      ],
    })
  } catch (error) {
    console.error('Goals GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
