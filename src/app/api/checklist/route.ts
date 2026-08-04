import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTokenFromHeaders, verifyToken } from '@/lib/auth'
import { CHECKLIST_CATEGORY_LABELS, type ChecklistCategory } from '@/lib/types'

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
    const category = searchParams.get('category')

    const where: Record<string, unknown> = { userId: userId as string }
    if (category) where.category = category

    const items = await db.skillChecklistItem.findMany({
      where,
      orderBy: [{ category: 'asc' }, { createdAt: 'asc' }],
    })

    return NextResponse.json({ items })
  } catch (error) {
    console.error('Checklist GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const userId = await authenticate(request)
    if (userId instanceof NextResponse) return userId

    const body = await request.json()
    const { category, skill, description } = body

    if (!category || !skill) {
      return NextResponse.json(
        { error: 'Category and skill are required' },
        { status: 400 }
      )
    }

    const item = await db.skillChecklistItem.create({
      data: {
        userId: userId as string,
        category,
        skill,
        description: description || null,
      },
    })

    return NextResponse.json({ item }, { status: 201 })
  } catch (error) {
    console.error('Checklist POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const userId = await authenticate(request)
    if (userId instanceof NextResponse) return userId

    const uid = userId as string
    const body = await request.json()
    const { id, isCompleted, evidenceUrl, evidenceNote, skill, description } = body

    if (!id) {
      return NextResponse.json({ error: 'Item id is required' }, { status: 400 })
    }

    // Verify ownership
    const existing = await db.skillChecklistItem.findFirst({
      where: { id, userId: uid },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Checklist item not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    }

    if (isCompleted !== undefined) {
      updateData.isCompleted = isCompleted
      updateData.completedAt = isCompleted ? new Date() : null
    }
    if (evidenceUrl !== undefined) updateData.evidenceUrl = evidenceUrl || null
    if (evidenceNote !== undefined) updateData.evidenceNote = evidenceNote || null
    if (skill !== undefined) updateData.skill = skill
    if (description !== undefined) updateData.description = description || null

    const updated = await db.skillChecklistItem.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ item: updated })
  } catch (error) {
    console.error('Checklist PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
