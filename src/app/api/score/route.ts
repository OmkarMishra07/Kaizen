import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTokenFromHeaders, verifyToken } from '@/lib/auth'
import { calculateCompositeScore, analyzeGaps, type ScoringContext } from '@/lib/scoring-engine'

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

function calculateStreaks(logs: { date: string }[]): { currentStreak: number; longestStreak: number } {
  if (logs.length === 0) return { currentStreak: 0, longestStreak: 0 }

  const sortedDates = logs.map(l => l.date).sort()
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  // Current streak: count consecutive days ending at today (or yesterday)
  let currentStreak = 0
  let checkDate = new Date(today)

  // If no log for today, start checking from yesterday
  if (!sortedDates.includes(todayStr)) {
    checkDate.setDate(checkDate.getDate() - 1)
  }

  for (let i = 0; i < 365; i++) {
    const dateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`
    if (sortedDates.includes(dateStr)) {
      currentStreak++
      checkDate.setDate(checkDate.getDate() - 1)
    } else {
      break
    }
  }

  // Longest streak
  let longestStreak = 0
  let tempStreak = 1
  for (let i = 1; i < sortedDates.length; i++) {
    const prev = new Date(sortedDates[i - 1])
    const curr = new Date(sortedDates[i])
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays === 1) {
      tempStreak++
    } else {
      longestStreak = Math.max(longestStreak, tempStreak)
      tempStreak = 1
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak, currentStreak)

  return { currentStreak, longestStreak }
}

export async function GET(request: Request) {
  try {
    const userId = await authenticate(request)
    if (userId instanceof NextResponse) return userId

    const uid = userId as string

    // 1. Aggregate problems from latest snapshot per platform
    const accounts = await db.platformAccount.findMany({
      where: { userId: uid },
      select: { id: true },
    })

    let aggEasy = 0, aggMedium = 0, aggHard = 0, aggTotal = 0
    let bestRating: number | undefined
    let maxContest = 0

    if (accounts.length > 0) {
      const accountIds = accounts.map(a => a.id)
      const snapshots = await db.problemSolvedSnapshot.findMany({
        where: { platformAccountId: { in: accountIds } },
        orderBy: { snapshotDate: 'desc' },
      })

      // Get only the latest per platform
      const seenPlatforms = new Set<string>()
      for (const snap of snapshots) {
        if (seenPlatforms.has(snap.platformAccountId)) continue
        seenPlatforms.add(snap.platformAccountId)
        aggEasy += snap.easySolved
        aggMedium += snap.mediumSolved
        aggHard += snap.hardSolved
        aggTotal += snap.totalSolved
        if (snap.rating && (!bestRating || snap.rating > bestRating)) bestRating = snap.rating
        if (snap.contestCount > maxContest) maxContest = snap.contestCount
      }
    }

    // 2. Topic coverage
    const topicCoverage = await db.topicCoverage.findMany({ where: { userId: uid } })

    // 3. Checklist stats per category
    const checklistItems = await db.skillChecklistItem.findMany({ where: { userId: uid } })
    const categoryMap = new Map<string, { completed: number; total: number }>()
    let totalCompleted = 0

    for (const item of checklistItems) {
      const entry = categoryMap.get(item.category) || { completed: 0, total: 0 }
      entry.total++
      if (item.isCompleted) {
        entry.completed++
        totalCompleted++
      }
      categoryMap.set(item.category, entry)
    }

    // 4. Projects
    const projects = await db.project.findMany({ where: { userId: uid } })
    const projectCount = projects.length
    const avgComplexity = projectCount > 0
      ? projects.reduce((s, p) => s + p.complexityScore, 0) / projectCount
      : 0
    const withReadme = projects.filter(p => p.hasReadme).length
    const withTests = projects.filter(p => p.hasTests).length
    const withCI = projects.filter(p => p.hasCI).length
    const avgStars = projectCount > 0
      ? projects.reduce((s, p) => s + p.stars, 0) / projectCount
      : 0

    // 5. Activity / streaks
    const allLogs = await db.dailyActivityLog.findMany({
      where: { userId: uid },
      orderBy: { date: 'desc' },
    })

    const { currentStreak, longestStreak } = calculateStreaks(allLogs)

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const sevenDayActive = allLogs.filter(l => new Date(l.date) >= sevenDaysAgo).length / 7
    const thirtyDayActive = allLogs.filter(l => new Date(l.date) >= thirtyDaysAgo).length / 30

    // 6. Interview readiness (derived from checklist — look for INTERVIEW_READINESS category or count mock interview items)
    // Since no INTERVIEW_READINESS category exists in default, use checklist items with mock/resume keywords
    const interviewItems = checklistItems.filter(
      item => item.skill.toLowerCase().includes('mock') || item.skill.toLowerCase().includes('resume')
    )
    const mockInterviewItems = interviewItems.filter(i => i.skill.toLowerCase().includes('mock'))
    const resumeItems = interviewItems.filter(i => i.skill.toLowerCase().includes('resume'))

    // Build scoring context
    const ctx: ScoringContext = {
      topics: topicCoverage.map(t => ({
        topic: t.topic,
        totalSolved: t.totalSolved,
        easySolved: t.easySolved,
        mediumSolved: t.mediumSolved,
        hardSolved: t.hardSolved,
      })),
      problems: {
        totalSolved: aggTotal,
        easySolved: aggEasy,
        mediumSolved: aggMedium,
        hardSolved: aggHard,
        rating: bestRating,
        contestCount: maxContest,
      },
      checklist: {
        category: 'all',
        completed: totalCompleted,
        total: checklistItems.length,
      },
      projects: {
        count: projectCount,
        avgComplexity,
        withReadme,
        withTests,
        withCI,
        avgStars,
      },
      activity: {
        currentStreak,
        longestStreak,
        sevenDayActive,
        thirtyDayActive,
      },
      interview: {
        mockInterviewCount: mockInterviewItems.filter(i => i.isCompleted).length,
        avgMockScore: mockInterviewItems.length > 0
          ? mockInterviewItems.filter(i => i.isCompleted).length / mockInterviewItems.length * 5
          : 0,
        resumeVersionCount: resumeItems.filter(i => i.isCompleted).length,
        resumeCompleteness: resumeItems.length > 0
          ? resumeItems.filter(i => i.isCompleted).length / resumeItems.length
          : 0,
      },
    }

    const compositeScore = calculateCompositeScore(ctx)
    const gapAnalysis = analyzeGaps(compositeScore)

    return NextResponse.json({
      score: compositeScore,
      gaps: gapAnalysis,
      context: {
        totalProblems: aggTotal,
        topicsCovered: topicCoverage.filter(t => t.totalSolved > 0).length,
        totalTopics: topicCoverage.length,
        checklistCompleted: totalCompleted,
        checklistTotal: checklistItems.length,
        projectCount,
        currentStreak,
        longestStreak,
      },
    })
  } catch (error) {
    console.error('Score GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
