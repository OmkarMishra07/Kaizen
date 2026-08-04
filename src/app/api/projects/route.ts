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

    const projects = await db.project.findMany({
      where: { userId: userId as string },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ projects })
  } catch (error) {
    console.error('Projects GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const userId = await authenticate(request)
    if (userId instanceof NextResponse) return userId

    const body = await request.json()
    const {
      name, description, repoUrl, techStack,
      complexityScore, hasReadme, hasTests, hasCI,
      interviewerNote, stars,
    } = body

    if (!name) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 })
    }

    const project = await db.project.create({
      data: {
        userId: userId as string,
        name,
        description: description || null,
        repoUrl: repoUrl || null,
        techStack: techStack || null,
        complexityScore: complexityScore || 0,
        hasReadme: hasReadme || false,
        hasTests: hasTests || false,
        hasCI: hasCI || false,
        interviewerNote: interviewerNote || null,
        stars: stars || 0,
      },
    })

    return NextResponse.json({ project }, { status: 201 })
  } catch (error) {
    console.error('Projects POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const userId = await authenticate(request)
    if (userId instanceof NextResponse) return userId

    const uid = userId as string
    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: 'Project id is required' }, { status: 400 })
    }

    const existing = await db.project.findFirst({
      where: { id, userId: uid },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const {
      name, description, repoUrl, techStack,
      complexityScore, hasReadme, hasTests, hasCI,
      interviewerNote, stars,
    } = body

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description || null
    if (repoUrl !== undefined) updateData.repoUrl = repoUrl || null
    if (techStack !== undefined) updateData.techStack = techStack || null
    if (complexityScore !== undefined) updateData.complexityScore = complexityScore
    if (hasReadme !== undefined) updateData.hasReadme = hasReadme
    if (hasTests !== undefined) updateData.hasTests = hasTests
    if (hasCI !== undefined) updateData.hasCI = hasCI
    if (interviewerNote !== undefined) updateData.interviewerNote = interviewerNote || null
    if (stars !== undefined) updateData.stars = stars

    const updated = await db.project.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ project: updated })
  } catch (error) {
    console.error('Projects PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const userId = await authenticate(request)
    if (userId instanceof NextResponse) return userId

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Project id is required' }, { status: 400 })
    }

    const existing = await db.project.findFirst({
      where: { id, userId: userId as string },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    await db.project.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Projects DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
