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

export async function GET(request: Request) {
  try {
    const userId = await authenticate(request)
    if (userId instanceof NextResponse) return userId

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '90', 10)

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)
    const cutoffStr = `${cutoffDate.getFullYear()}-${String(cutoffDate.getMonth() + 1).padStart(2, '0')}-${String(cutoffDate.getDate()).padStart(2, '0')}`

    const snapshots = await db.scoreSnapshot.findMany({
      where: {
        userId: userId as string,
        date: { gte: cutoffStr },
      },
      orderBy: { date: 'asc' },
    })

    const history = snapshots.map(snap => ({
      date: snap.date,
      compositeScore: snap.compositeScore,
      rankLevel: snap.rankLevel,
      rankName: snap.rankName,
      dsaScore: snap.dsaScore,
      backendScore: snap.backendScore,
      portfolioScore: snap.portfolioScore,
      consistencyScore: snap.consistencyScore,
      interviewScore: snap.interviewScore,
      dsaDetails: snap.dsaDetails ? JSON.parse(snap.dsaDetails) : null,
      backendDetails: snap.backendDetails ? JSON.parse(snap.backendDetails) : null,
      portfolioDetails: snap.portfolioDetails ? JSON.parse(snap.portfolioDetails) : null,
      consistencyDetails: snap.consistencyDetails ? JSON.parse(snap.consistencyDetails) : null,
      interviewDetails: snap.interviewDetails ? JSON.parse(snap.interviewDetails) : null,
    }))

    return NextResponse.json({ history, days })
  } catch (error) {
    console.error('Score history error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
