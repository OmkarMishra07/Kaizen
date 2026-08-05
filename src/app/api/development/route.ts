import { NextResponse } from 'next/server'
import { getTokenFromHeaders, verifyToken } from '@/lib/auth'
import { db } from '@/lib/db'

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

export async function GET(req: Request) {
  try {
    const userId = await authenticate(req)
    if (userId instanceof NextResponse) return userId
    const uid = userId as string

    const githubAccount = await db.platformAccount.findFirst({
      where: { userId: uid, platform: 'GITHUB' },
    })

    if (!githubAccount) {
      return NextResponse.json({ connected: false })
    }

    const snapshot = await db.problemSolvedSnapshot.findFirst({
      where: { platformAccountId: githubAccount.id },
      orderBy: { snapshotDate: 'desc' },
    })

    if (!snapshot || !snapshot.rawStats) {
      return NextResponse.json({ connected: true, stats: null })
    }

    const rawStats = JSON.parse(snapshot.rawStats)
    
    return NextResponse.json({
      connected: true,
      handle: githubAccount.handle,
      stats: rawStats,
      lastSynced: snapshot.snapshotDate,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
