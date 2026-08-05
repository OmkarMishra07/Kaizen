import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTokenFromHeaders, verifyToken } from '@/lib/auth'
import { DSA_TOPICS } from '@/lib/types'

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

    // Get topic coverage from DB
    const topicCoverage = await db.topicCoverage.findMany({
      where: { userId: uid },
    })

    const topicMap = new Map(topicCoverage.map(t => [t.topic, t]))

    // Ensure all DSA topics are present, even if no coverage yet
    const topics = DSA_TOPICS.map(topic => {
      const coverage = topicMap.get(topic)
      return {
        topic,
        easySolved: coverage?.easySolved || 0,
        mediumSolved: coverage?.mediumSolved || 0,
        hardSolved: coverage?.hardSolved || 0,
        totalSolved: coverage?.totalSolved || 0,
        lastUpdated: coverage?.lastUpdated || null,
      }
    })

    const accounts = await db.platformAccount.findMany({ where: { userId: uid, enabled: true } })
    const accountIds = accounts.map(a => a.id)
    
    let aggEasy = 0, aggMedium = 0, aggHard = 0, aggTotal = 0

    if (accountIds.length > 0) {
      const accountMap = new Map(accounts.map(a => [a.id, a.platform]))
      const snapshots = await db.problemSolvedSnapshot.findMany({
        where: { platformAccountId: { in: Array.from(accountMap.keys()) } },
        orderBy: { snapshotDate: 'desc' },
      })
      const seenPlatforms = new Set<string>()
      for (const snap of snapshots) {
        if (seenPlatforms.has(snap.platformAccountId)) continue
        seenPlatforms.add(snap.platformAccountId)
        
        const platform = accountMap.get(snap.platformAccountId)
        if (platform === 'GITHUB') continue
        
        aggEasy += snap.easySolved
        aggMedium += snap.mediumSolved
        aggHard += snap.hardSolved
        aggTotal += snap.totalSolved
      }
    }

    const totals = {
      easySolved: aggEasy,
      mediumSolved: aggMedium,
      hardSolved: aggHard,
      totalSolved: aggTotal,
    }

    return NextResponse.json({ topics, totals })
  } catch (error) {
    console.error('Topics GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
