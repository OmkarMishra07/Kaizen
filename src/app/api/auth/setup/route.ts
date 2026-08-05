import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, createToken } from '@/lib/auth'
import { DEFAULT_CHECKLIST, DSA_TOPICS, PLATFORMS, type Platform } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      )
    }

    if (username.length < 2 || password.length < 4) {
      return NextResponse.json(
        { error: 'Username must be at least 2 chars, password at least 4 chars' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existing = await db.user.findUnique({
      where: { username }
    })
    if (existing) {
      return NextResponse.json(
        { error: 'User already exists. Use /api/auth/login to sign in.' },
        { status: 409 }
      )
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Create user
    const user = await db.user.create({
      data: {
        username,
        passwordHash,
        displayName: username,
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

    // Create default topic coverage entries
    await db.topicCoverage.createMany({
      data: DSA_TOPICS.map(topic => ({
        userId: user.id,
        topic,
      })),
    })

    // Create JWT
    const token = await createToken(user.id)

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        createdAt: user.createdAt,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
