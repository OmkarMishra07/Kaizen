import crypto from 'crypto'
import { SignJWT, jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'sde-tracker-secret-key-change-in-production'
)

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, hash] = storedHash.split(':')
  const computedHash = crypto.scryptSync(password, salt, 64).toString('hex')
  return hash === computedHash
}

export async function createToken(userId: string): Promise<string> {
  return new SignJWT({ userId, sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload.userId ? { userId: payload.userId as string } : null
  } catch {
    return null
  }
}

export function getTokenFromHeaders(headers: Headers): string | null {
  const auth = headers.get('authorization')
  if (auth?.startsWith('Bearer ')) return auth.slice(7)
  return null
}
