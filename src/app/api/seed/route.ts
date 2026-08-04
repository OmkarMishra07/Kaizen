import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, createToken } from '@/lib/auth'
import { DEFAULT_CHECKLIST, DSA_TOPICS } from '@/lib/types'
import { calculateCompositeScore, type ScoringContext } from '@/lib/scoring-engine'

export const dynamic = 'force-dynamic'

function getDateStr(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export async function POST() {
  try {
    // Check if user already exists
    const existing = await db.user.findFirst()
    if (existing) {
      return NextResponse.json({ error: 'Database already has a user. Seed only works on fresh databases.' }, { status: 409 })
    }

    // Create demo user
    const passwordHash = await hashPassword('demo')
    const user = await db.user.create({
      data: {
        username: 'demo',
        passwordHash,
        displayName: 'Demo User',
      },
    })

    // Create default checklist items
    await db.skillChecklistItem.createMany({
      data: DEFAULT_CHECKLIST.map(item => ({
        userId: user.id,
        category: item.category,
        skill: item.skill,
        description: item.description,
      })),
    })

    // Mark some checklist items as completed
    const checklistItems = await db.skillChecklistItem.findMany({ where: { userId: user.id } })
    const itemsToComplete = checklistItems.slice(0, 8) // Complete first 8
    for (const item of itemsToComplete) {
      await db.skillChecklistItem.update({
        where: { id: item.id },
        data: { isCompleted: true, completedAt: new Date(), evidenceNote: 'Completed during study' },
      })
    }

    // Create default topic coverage
    await db.topicCoverage.createMany({
      data: DSA_TOPICS.map(topic => ({
        userId: user.id,
        topic,
      })),
    })

    // Add some topic coverage data
    const topicData: Record<string, { easy: number; medium: number; hard: number }> = {
      'Arrays': { easy: 25, medium: 15, hard: 5 },
      'Strings': { easy: 20, medium: 12, hard: 3 },
      'Trees': { easy: 15, medium: 8, hard: 2 },
      'Graphs': { easy: 10, medium: 5, hard: 1 },
      'Dynamic Programming': { easy: 12, medium: 6, hard: 2 },
      'Heaps / Priority Queues': { easy: 8, medium: 4, hard: 1 },
      'Tries': { easy: 5, medium: 3, hard: 0 },
      'Backtracking': { easy: 6, medium: 4, hard: 1 },
      'Greedy': { easy: 10, medium: 5, hard: 1 },
      'Binary Search': { easy: 12, medium: 8, hard: 2 },
      'Two Pointers': { easy: 15, medium: 10, hard: 3 },
      'Sliding Window': { easy: 8, medium: 6, hard: 1 },
    }

    for (const [topic, counts] of Object.entries(topicData)) {
      await db.topicCoverage.update({
        where: { userId_topic: { userId: user.id, topic } },
        data: {
          easySolved: counts.easy,
          mediumSolved: counts.medium,
          hardSolved: counts.hard,
          totalSolved: counts.easy + counts.medium + counts.hard,
        },
      })
    }

    // Add platform accounts
    const leetcodeAccount = await db.platformAccount.create({
      data: { userId: user.id, platform: 'LEETCODE', handle: 'demo_user', enabled: true },
    })

    const codeforcesAccount = await db.platformAccount.create({
      data: { userId: user.id, platform: 'CODEFORCES', handle: 'demo_cf', enabled: true },
    })

    const githubAccount = await db.platformAccount.create({
      data: {
        userId: user.id,
        platform: 'GITHUB',
        handle: 'demodev',
        enabled: true,
        metadata: JSON.stringify({ token: '' }),
      },
    })

    // Add problem solved snapshots for the past 30 days (simulated data)
    const today = getDateStr(0)

    await db.problemSolvedSnapshot.create({
      data: {
        platformAccountId: leetcodeAccount.id,
        snapshotDate: today,
        easySolved: 85,
        mediumSolved: 55,
        hardSolved: 15,
        totalSolved: 155,
        rating: 1650,
        contestCount: 12,
      },
    })

    await db.problemSolvedSnapshot.create({
      data: {
        platformAccountId: codeforcesAccount.id,
        snapshotDate: today,
        easySolved: 60,
        mediumSolved: 35,
        hardSolved: 10,
        totalSolved: 105,
        rating: 1350,
        contestCount: 20,
      },
    })

    // GitHub snapshot
    await db.problemSolvedSnapshot.create({
      data: {
        platformAccountId: githubAccount.id,
        snapshotDate: today,
        easySolved: 8,
        mediumSolved: 45,
        hardSolved: 12,
        totalSolved: 65,
        rawStats: JSON.stringify({
          repos: 8,
          recentCommits: 45,
          stars: 12,
          languages: { TypeScript: 3, Java: 2, Python: 2, 'C++': 1 },
        }),
      },
    })

    // Add sample projects
    await db.project.createMany({
      data: [
        {
          userId: user.id,
          name: 'URL Shortener Service',
          description: 'A scalable URL shortener built with Spring Boot, Redis caching, and MySQL.',
          repoUrl: 'https://github.com/demodev/url-shortener',
          techStack: 'Java, Spring Boot, Redis, MySQL, Docker',
          complexityScore: 6,
          hasReadme: true,
          hasTests: true,
          hasCI: true,
          stars: 5,
          interviewerNote: 'Good system design, handles 10K rps with caching layer',
        },
        {
          userId: user.id,
          name: 'Real-time Chat Application',
          description: 'WebSocket-based chat with rooms, typing indicators, and message persistence.',
          repoUrl: 'https://github.com/demodev/chat-app',
          techStack: 'Java, Spring Boot, WebSocket, PostgreSQL, React',
          complexityScore: 5,
          hasReadme: true,
          hasTests: true,
          hasCI: false,
          stars: 3,
        },
        {
          userId: user.id,
          name: 'E-Commerce API',
          description: 'RESTful API with JWT auth, payment integration, order management.',
          repoUrl: 'https://github.com/demodev/ecommerce-api',
          techStack: 'Java, Spring Boot, PostgreSQL, Stripe, Docker',
          complexityScore: 7,
          hasReadme: true,
          hasTests: false,
          hasCI: true,
          stars: 8,
          interviewerNote: 'Complex business logic, good API design patterns',
        },
      ],
    })

    // Add daily activity logs for the past 30 days
    const activityNotes = [
      'Solved 5 LeetCode problems (2 easy, 2 medium, 1 hard)',
      'Solved 3 Codeforces problems + reviewed graph theory',
      'Worked on URL shortener project, added Redis caching',
      'Solved DP problems from LeetCode contest',
      'Studied Spring Security, added JWT auth to chat app',
      'Rest day — reviewed notes',
      'Solved 4 medium problems on Trees and BST',
    ]

    for (let daysAgo = 0; daysAgo < 30; daysAgo++) {
      // Skip a few days to make it realistic
      if ([3, 10, 18, 25].includes(daysAgo)) continue

      const date = getDateStr(daysAgo)
      await db.dailyActivityLog.create({
        data: {
          userId: user.id,
          date,
          notes: activityNotes[daysAgo % activityNotes.length],
          syncedProblems: daysAgo < 5 ? Math.floor(Math.random() * 8) + 2 : 0,
          commitsMade: daysAgo % 3 === 0 ? Math.floor(Math.random() * 5) + 1 : 0,
          platformActivity: 'LeetCode, Codeforces, GitHub',
        },
      })
    }

    // Calculate and store a score snapshot
    const topicCoverage = await db.topicCoverage.findMany({ where: { userId: user.id } })
    const allChecklist = await db.skillChecklistItem.findMany({ where: { userId: user.id } })
    const allProjects = await db.project.findMany({ where: { userId: user.id } })
    const allLogs = await db.dailyActivityLog.findMany({ where: { userId: user.id } })

    const projectCount = allProjects.length
    const avgComplexity = projectCount > 0 ? allProjects.reduce((s, p) => s + p.complexityScore, 0) / projectCount : 0

    // Calculate streak
    const dateSet = new Set(allLogs.map(l => l.date))
    let currentStreak = 0
    let checkDate = new Date()
    const todayStr = getDateStr(0)
    if (!dateSet.has(todayStr)) {
      checkDate.setDate(checkDate.getDate() - 1)
    }
    for (let i = 0; i < 365; i++) {
      const dStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`
      if (dateSet.has(dStr)) {
        currentStreak++
        checkDate.setDate(checkDate.getDate() - 1)
      } else break
    }

    const ctx: ScoringContext = {
      topics: topicCoverage.map(t => ({
        topic: t.topic, totalSolved: t.totalSolved,
        easySolved: t.easySolved, mediumSolved: t.mediumSolved, hardSolved: t.hardSolved,
      })),
      problems: { totalSolved: 260, easySolved: 145, mediumSolved: 90, hardSolved: 25, rating: 1650, contestCount: 20 },
      checklist: { category: 'all', completed: 8, total: allChecklist.length },
      projects: {
        count: projectCount,
        avgComplexity,
        withReadme: allProjects.filter(p => p.hasReadme).length,
        withTests: allProjects.filter(p => p.hasTests).length,
        withCI: allProjects.filter(p => p.hasCI).length,
        avgStars: projectCount > 0 ? allProjects.reduce((s, p) => s + p.stars, 0) / projectCount : 0,
      },
      activity: { currentStreak, longestStreak: 12, sevenDayActive: 6 / 7, thirtyDayActive: 26 / 30 },
      interview: { mockInterviewCount: 0, avgMockScore: 0, resumeVersionCount: 0, resumeCompleteness: 0 },
    }

    const score = calculateCompositeScore(ctx)

    await db.scoreSnapshot.create({
      data: {
        userId: user.id,
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
    })

    // Generate JWT token
    const token = await createToken(user.id)

    return NextResponse.json({
      message: 'Database seeded successfully',
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
      },
      seeded: {
        checklistItems: allChecklist.length,
        topics: topicCoverage.length,
        platforms: 3,
        projects: projectCount,
        activityDays: allLogs.length,
        scoreSnapshot: score.compositeScore,
        rank: score.rankName,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
