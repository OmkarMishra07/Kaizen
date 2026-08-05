import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTokenFromHeaders, verifyToken } from '@/lib/auth'
import { getAdapter, type PlatformAdapter } from '@/lib/platform-adapters'
import { calculateCompositeScore, type ScoringContext } from '@/lib/scoring-engine'
import { DSA_TOPICS, type Platform } from '@/lib/types'

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

function getToday(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export async function POST(request: Request) {
  try {
    const userId = await authenticate(request)
    if (userId instanceof NextResponse) return userId

    const uid = userId as string
    const body = await request.json()
    const { platform: targetPlatform } = body

    // Get accounts to sync
    const whereClause: Record<string, unknown> = { userId: uid, enabled: true }
    if (targetPlatform) {
      whereClause.platform = targetPlatform as string
    }

    const accounts = await db.platformAccount.findMany({
      where: whereClause,
    })

    if (accounts.length === 0) {
      return NextResponse.json(
        { error: targetPlatform ? `No enabled account found for ${targetPlatform}` : 'No enabled platform accounts found' },
        { status: 400 }
      )
    }

    const today = getToday()
    const results: { platform: string; status: string; message: string }[] = []
    let totalProblemsSynced = 0

    for (const account of accounts) {
      const adapter = getAdapter(account.platform as Platform)
      const metadata = account.metadata ? JSON.parse(account.metadata) : undefined

      const syncResult = await adapter.fetchStats(account.handle, metadata)

      // Store sync log
      await db.platformSyncLog.create({
        data: {
          platformAccountId: account.id,
          status: syncResult.status,
          message: syncResult.message,
          rawData: syncResult.data ? JSON.stringify(syncResult.data) : null,
        },
      })

      if (syncResult.status === 'SUCCESS' && syncResult.data) {
        const data = syncResult.data

        // Upsert problem solved snapshot for today
        await db.problemSolvedSnapshot.upsert({
          where: {
            platformAccountId_snapshotDate: {
              platformAccountId: account.id,
              snapshotDate: today,
            },
          },
          create: {
            platformAccountId: account.id,
            snapshotDate: today,
            easySolved: data.easySolved,
            mediumSolved: data.mediumSolved,
            hardSolved: data.hardSolved,
            totalSolved: data.totalSolved,
            rating: data.rating ?? null,
            contestCount: data.contestCount ?? 0,
            topicBreakdown: data.topicBreakdown ? JSON.stringify(data.topicBreakdown) : null,
            rawStats: data.rawStats ? JSON.stringify(data.rawStats) : null,
          },
          update: {
            easySolved: data.easySolved,
            mediumSolved: data.mediumSolved,
            hardSolved: data.hardSolved,
            totalSolved: data.totalSolved,
            rating: data.rating ?? null,
            contestCount: data.contestCount ?? 0,
            topicBreakdown: data.topicBreakdown ? JSON.stringify(data.topicBreakdown) : null,
            rawStats: data.rawStats ? JSON.stringify(data.rawStats) : null,
          },
        })

        // Update topic coverage — merge counts across platforms
        if (data.topicBreakdown) {
          for (const [topic, breakdown] of Object.entries(data.topicBreakdown)) {
            // Only update recognized DSA topics
            if ((DSA_TOPICS as readonly string[]).includes(topic)) {
              await db.topicCoverage.upsert({
                where: {
                  userId_topic: {
                    userId: uid,
                    topic,
                  },
                },
                create: {
                  userId: uid,
                  topic,
                  easySolved: breakdown.easy,
                  mediumSolved: breakdown.medium,
                  hardSolved: breakdown.hard,
                  totalSolved: breakdown.easy + breakdown.medium + breakdown.hard,
                },
                update: {
                  // Recalculate: sum all platform snapshots for this topic
                  easySolved: breakdown.easy,
                  mediumSolved: breakdown.medium,
                  hardSolved: breakdown.hard,
                  totalSolved: breakdown.easy + breakdown.medium + breakdown.hard,
                  lastUpdated: new Date(),
                },
              })
            }
          }
        }

        if (account.platform !== 'GITHUB') {
          totalProblemsSynced += data.totalSolved
        }
      }

      results.push({
        platform: account.platform,
        status: syncResult.status,
        message: syncResult.message,
      })
    }

    // Create or update daily activity log for today
    await db.dailyActivityLog.upsert({
      where: {
        userId_date: {
          userId: uid,
          date: today,
        },
      },
      create: {
        userId: uid,
        date: today,
        syncedProblems: totalProblemsSynced,
        platformActivity: `Synced ${accounts.length} platform(s)`,
      },
      update: {
        syncedProblems: totalProblemsSynced,
        platformActivity: `Synced ${accounts.length} platform(s)`,
      },
    })

    // Recalculate score and store snapshot
    // Build scoring context from DB
    const latestSnapshots = await db.problemSolvedSnapshot.findMany({
      where: { platformAccount: { userId: uid } },
      orderBy: { snapshotDate: 'desc' },
      distinct: ['platformAccountId'],
      include: { platformAccount: true },
    })

    let aggEasy = 0, aggMedium = 0, aggHard = 0, aggTotal = 0
    let bestRating: number | undefined
    let maxContest = 0

    for (const snap of latestSnapshots) {
      if (snap.platformAccount.platform === 'GITHUB') continue
      aggEasy += snap.easySolved
      aggMedium += snap.mediumSolved
      aggHard += snap.hardSolved
      aggTotal += snap.totalSolved
      if (snap.rating && (!bestRating || snap.rating > bestRating)) bestRating = snap.rating
      if (snap.contestCount > maxContest) maxContest = snap.contestCount
    }

    // Merge topic coverage across all platforms
    const topicCoverageRows = await db.topicCoverage.findMany({
      where: { userId: uid },
    })

    // Also aggregate topic breakdown from snapshots per platform
    const topicAgg: Record<string, { easy: number; medium: number; hard: number }> = {}
    for (const snap of latestSnapshots) {
      if (snap.topicBreakdown) {
        const breakdown = JSON.parse(snap.topicBreakdown) as Record<string, { easy: number; medium: number; hard: number }>
        for (const [topic, counts] of Object.entries(breakdown)) {
          if (!topicAgg[topic]) topicAgg[topic] = { easy: 0, medium: 0, hard: 0 }
          topicAgg[topic].easy += counts.easy
          topicAgg[topic].medium += counts.medium
          topicAgg[topic].hard += counts.hard
        }
      }
    }

    // Update topic coverage with aggregated data
    for (const topic of DSA_TOPICS) {
      const agg = topicAgg[topic] || { easy: 0, medium: 0, hard: 0 }
      const total = agg.easy + agg.medium + agg.hard
      await db.topicCoverage.upsert({
        where: { userId_topic: { userId: uid, topic } },
        create: {
          userId: uid,
          topic,
          easySolved: agg.easy,
          mediumSolved: agg.medium,
          hardSolved: agg.hard,
          totalSolved: total,
        },
        update: {
          easySolved: agg.easy,
          mediumSolved: agg.medium,
          hardSolved: agg.hard,
          totalSolved: total,
          lastUpdated: new Date(),
        },
      })
    }

    // Re-read updated topic coverage
    const updatedTopics = await db.topicCoverage.findMany({ where: { userId: uid } })

    // Calculate streaks
    const allLogs = await db.dailyActivityLog.findMany({
      where: { userId: uid },
      orderBy: { date: 'desc' },
    })

    let currentStreak = 0
    let longestStreak = 0
    let tempStreak = 0
    const todayDate = new Date(today)

    for (let i = 0; i < allLogs.length; i++) {
      const logDate = new Date(allLogs[i].date)
      const expectedDate = new Date(todayDate)
      expectedDate.setDate(expectedDate.getDate() - i)

      if (logDate.toDateString() === expectedDate.toDateString()) {
        currentStreak++
      } else if (i === 0) {
        // Today might not have a log yet — check yesterday
        continue
      } else {
        break
      }
    }

    // Calculate longest streak
    const sortedDates = allLogs.map(l => l.date).sort()
    for (let i = 0; i < sortedDates.length; i++) {
      if (i === 0) {
        tempStreak = 1
      } else {
        const prev = new Date(sortedDates[i - 1])
        const curr = new Date(sortedDates[i])
        const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24))
        tempStreak = diffDays === 1 ? tempStreak + 1 : 1
      }
      longestStreak = Math.max(longestStreak, tempStreak)
    }

    // 7-day and 30-day active
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const sevenDayLogs = allLogs.filter(l => new Date(l.date) >= sevenDaysAgo)
    const thirtyDayLogs = allLogs.filter(l => new Date(l.date) >= thirtyDaysAgo)

    // Checklist stats
    const checklistItems = await db.skillChecklistItem.findMany({ where: { userId: uid } })
    const checklistCompleted = checklistItems.filter(i => i.isCompleted).length

    // Project stats
    const projects = await db.project.findMany({ where: { userId: uid } })
    const projectCount = projects.length
    const avgComplexity = projectCount > 0 ? projects.reduce((s, p) => s + p.complexityScore, 0) / projectCount : 0
    const withReadme = projects.filter(p => p.hasReadme).length
    const withTests = projects.filter(p => p.hasTests).length
    const withCI = projects.filter(p => p.hasCI).length
    const avgStars = projectCount > 0 ? projects.reduce((s, p) => s + p.stars, 0) / projectCount : 0

    // Build scoring context
    const ctx: ScoringContext = {
      topics: updatedTopics.map(t => ({
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
        completed: checklistCompleted,
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
        sevenDayActive: sevenDayLogs.length / 7,
        thirtyDayActive: thirtyDayLogs.length / 30,
      },
      interview: {
        mockInterviewCount: 0,
        avgMockScore: 0,
        resumeVersionCount: 0,
        resumeCompleteness: 0,
      },
    }

    const score = calculateCompositeScore(ctx)

    // Store score snapshot
    await db.scoreSnapshot.upsert({
      where: {
        userId_date: {
          userId: uid,
          date: today,
        },
      },
      create: {
        userId: uid,
        date: today,
        compositeScore: score.compositeScore,
        rankLevel: score.rankLevel,
        rankName: score.rankName,
        dsaScore: score.dsa.score,
        backendScore: score.backend.score,
        portfolioScore: score.portfolio.score,
        consistencyScore: score.consistency.score,
        interviewScore: score.interview.score,
        dsaDetails: JSON.stringify(score.dsa.details),
        backendDetails: JSON.stringify(score.backend.details),
        portfolioDetails: JSON.stringify(score.portfolio.details),
        consistencyDetails: JSON.stringify(score.consistency.details),
        interviewDetails: JSON.stringify(score.interview.details),
      },
      update: {
        compositeScore: score.compositeScore,
        rankLevel: score.rankLevel,
        rankName: score.rankName,
        dsaScore: score.dsa.score,
        backendScore: score.backend.score,
        portfolioScore: score.portfolio.score,
        consistencyScore: score.consistency.score,
        interviewScore: score.interview.score,
        dsaDetails: JSON.stringify(score.dsa.details),
        backendDetails: JSON.stringify(score.backend.details),
        portfolioDetails: JSON.stringify(score.portfolio.details),
        consistencyDetails: JSON.stringify(score.consistency.details),
        interviewDetails: JSON.stringify(score.interview.details),
      },
    })

    return NextResponse.json({
      results,
      score: {
        compositeScore: score.compositeScore,
        rankLevel: score.rankLevel,
        rankName: score.rankName,
      },
      syncedAt: today,
    })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
