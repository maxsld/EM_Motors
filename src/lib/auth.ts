import bcrypt from "bcryptjs"
import crypto from "node:crypto"

import {
  createSessionRow,
  createUser,
  deleteSessionByToken,
  getSessionByToken,
  getUserByEmail as fetchUserByEmail,
  updateUserPassword,
} from "@/lib/db"

const SESSION_DURATION_MS = 2 * 60 * 60 * 1000
const ADMIN_EMAIL_ENV = "DASHBOARD_ADMIN_EMAIL"
const ADMIN_PASSWORD_ENV = "DASHBOARD_ADMIN_PASSWORD"

type UserRow = {
  id: number
  email: string
  password_hash: string
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash)
}

export async function getUserByEmail(email: string) {
  return (await fetchUserByEmail(email)) as UserRow | undefined
}

function getAdminCredentials() {
  const rawEmail = process.env[ADMIN_EMAIL_ENV]
  const rawPassword = process.env[ADMIN_PASSWORD_ENV]
  if (!rawEmail || !rawPassword) {
    return null
  }
  const email = rawEmail.trim().toLowerCase()
  const password = String(rawPassword)
  if (!email || !password) {
    return null
  }
  return { email, password }
}

export async function ensureAdminUser() {
  const credentials = getAdminCredentials()
  if (!credentials) {
    return null
  }

  const existing = (await fetchUserByEmail(credentials.email)) as
    | UserRow
    | undefined

  if (!existing) {
    const passwordHash = await hashPassword(credentials.password)
    const id = await createUser(credentials.email, passwordHash)
    return { id, email: credentials.email }
  }

  const matches = await verifyPassword(
    credentials.password,
    existing.password_hash
  )
  if (!matches) {
    const passwordHash = await hashPassword(credentials.password)
    await updateUserPassword(existing.id, passwordHash)
  }

  return { id: existing.id, email: existing.email }
}

export async function createSession(userId: number) {
  const token = crypto.randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString()
  await createSessionRow(userId, token, expiresAt)
  return { token, expiresAt }
}

export async function deleteSession(token: string) {
  await deleteSessionByToken(token)
}

export async function getSession(token: string) {
  return (await getSessionByToken(token)) as
    | { id: number; user_id: number; token: string; expires_at: string; email: string }
    | undefined
}
