import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTokenFromHeaders, verifyToken } from '@/lib/auth'

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

  const dateSet = new Set(logs.map(l => l.date))
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  // Current streak
  let currentStreak = 0
  let checkDate = new Date(today)

  if (!dateSet.has(todayStr)) {
    checkDate.setDate(checkDate.getDate() - 1)
  }

  for (let i = 0; i < 365; i++) {
    const dateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`
    if (dateSet.has(dateStr)) {
      currentStreak++
      checkDate.setDate(checkDate.getDate() - 1)
    } else {
      break
    }
  }

  // Longest streak
  const sortedDates = logs.map(l => l.date).sort()
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
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30', 10)

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)
    const cutoffStr = `${cutoffDate.getFullYear()}-${String(cutoffDate.getMonth() + 1).padStart(2, '0')}-${String(cutoffDate.getDate()).padStart(2, '0')}`

    const logs = await db.dailyActivityLog.findMany({
      where: {
        userId: uid,
        date: { gte: cutoffStr },
      },
      orderBy: { date: 'desc' },
    })

    // Also get all logs for streak calculation
    const allLogs = await db.dailyActivityLog.findMany({
      where: { userId: uid },
      orderBy: { date: 'desc' },
    })

    const { currentStreak, longestStreak } = calculateStreaks(allLogs)

    // 7-day and 30-day stats
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const sevenDayLogs = allLogs.filter(l => new Date(l.date) >= sevenDaysAgo)
    const thirtyDayLogs = allLogs.filter(l => new Date(l.date) >= thirtyDaysAgo)

    const sevenDayActivePct = Math.round((sevenDayLogs.length / 7) * 100)
    const thirtyDayActivePct = Math.round((thirtyDayLogs.length / 30) * 100)

    // Fetch platform specific streaks
    const platformStreaks: Record<string, { current: number; longest: number }> = {}
    const latestSnapshots = await db.problemSolvedSnapshot.findMany({
      where: { platformAccount: { userId: uid } },
      orderBy: { snapshotDate: 'desc' },
      distinct: ['platformAccountId'],
      include: { platformAccount: true },
    })

    for (const snap of latestSnapshots) {
      if (snap.rawStats) {
        try {
          const raw = JSON.parse(snap.rawStats)
          if (raw.currentStreak !== undefined && raw.longestStreak !== undefined) {
            platformStreaks[snap.platformAccount.platform] = {
              current: raw.currentStreak,
              longest: raw.longestStreak,
            }
          }
        } catch (e) {
          // ignore parsing error
        }
      }
    }

    return NextResponse.json({
      logs,
  	  stats: {
      	    currentStreak,
      	    longestStreak,
      	    sevenDayActivePct,
      	    thirtyDayActivePct,
      	    sevenDayDays: sevenDayLogs.length,
      	    thirtyDayDays: thirtyDayLogs.length,
      	    totalLogs: allLogs.length,
      	  },
      platformStreaks,
    })
  } catch (error) {
    console.error('Activity GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
