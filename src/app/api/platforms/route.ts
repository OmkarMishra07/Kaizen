import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTokenFromHeaders, verifyToken } from '@/lib/auth'
import { PLATFORMS, type Platform } from '@/lib/types'

export const dynamic = 'force-dynamic'

// Helper: authenticate and return userId or 401
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

    const accounts = await db.platformAccount.findMany({
      where: { userId: userId as string },
      orderBy: { createdAt: 'asc' },
    })

    // For each account, fetch latest sync log and snapshot
    const enriched = await Promise.all(accounts.map(async (acc) => {
      const lastSync = await db.platformSyncLog.findFirst({
        where: { platformAccountId: acc.id },
        orderBy: { syncedAt: 'desc' },
      })

      const latestSnapshot = await db.problemSolvedSnapshot.findFirst({
        where: { platformAccountId: acc.id },
        orderBy: { snapshotDate: 'desc' },
      })

      return {
        ...acc,
        metadata: acc.metadata ? JSON.parse(acc.metadata) : null,
        lastSync: lastSync ? {
          status: lastSync.status,
          message: lastSync.message,
          createdAt: lastSync.syncedAt.toISOString(),
        } : null,
        latestSnapshot: latestSnapshot ? {
          easySolved: latestSnapshot.easySolved,
          mediumSolved: latestSnapshot.mediumSolved,
          hardSolved: latestSnapshot.hardSolved,
          totalSolved: latestSnapshot.totalSolved,
          rating: latestSnapshot.rating,
          contestCount: latestSnapshot.contestCount,
          rawStats: latestSnapshot.rawStats ? JSON.parse(latestSnapshot.rawStats) : null,
        } : null,
      }
    }))

    return NextResponse.json({ accounts: enriched })
  } catch (error) {
    console.error('Platforms GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const userId = await authenticate(request)
    if (userId instanceof NextResponse) return userId

    const body = await request.json()
    const { platform, handle, metadata } = body

    if (!platform || !handle) {
      return NextResponse.json(
        { error: 'Platform and handle are required' },
        { status: 400 }
      )
    }

    // Validate platform value
    const validPlatforms = Object.values(PLATFORMS)
    if (!validPlatforms.includes(platform as Platform)) {
      return NextResponse.json(
        { error: `Invalid platform. Must be one of: ${validPlatforms.join(', ')}` },
        { status: 400 }
      )
    }

    // Check if account already exists for this platform
    const existing = await db.platformAccount.findFirst({
      where: { userId: userId as string, platform: platform as string },
    })

    if (existing) {
      return NextResponse.json(
        { error: `Platform account for ${platform} already exists. Use PUT to update.` },
        { status: 409 }
      )
    }

    const account = await db.platformAccount.create({
      data: {
        userId: userId as string,
        platform: platform as string,
        handle,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    })

    return NextResponse.json({
      ...account,
      metadata: account.metadata ? JSON.parse(account.metadata) : null,
    }, { status: 201 })
  } catch (error) {
    console.error('Platforms POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const userId = await authenticate(request)
    if (userId instanceof NextResponse) return userId

    const body = await request.json()
    const { id, handle, metadata, enabled } = body

    if (!id) {
      return NextResponse.json({ error: 'Account id is required' }, { status: 400 })
    }

    // Verify ownership
    const existing = await db.platformAccount.findFirst({
      where: { id, userId: userId as string },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (handle !== undefined) updateData.handle = handle
    if (metadata !== undefined) updateData.metadata = metadata ? JSON.stringify(metadata) : null
    if (enabled !== undefined) updateData.enabled = enabled

    const updated = await db.platformAccount.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({
      ...updated,
      metadata: updated.metadata ? JSON.parse(updated.metadata) : null,
    })
  } catch (error) {
    console.error('Platforms PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
