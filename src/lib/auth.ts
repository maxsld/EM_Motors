import bcrypt from "bcryptjs"
import crypto from "node:crypto"

import { getDb } from "@/lib/db"

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

export function getUserByEmail(email: string) {
  const db = getDb()
  return db.prepare("SELECT * FROM users WHERE email = ?").get(email) as
    | UserRow
    | undefined
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

  const db = getDb()
  const existing = db
    .prepare("SELECT id, email, password_hash FROM users WHERE email = ?")
    .get(credentials.email) as UserRow | undefined

  if (!existing) {
    const passwordHash = await hashPassword(credentials.password)
    const result = db
      .prepare("INSERT INTO users (email, password_hash) VALUES (?, ?)")
      .run(credentials.email, passwordHash)
    return { id: Number(result.lastInsertRowid), email: credentials.email }
  }

  const matches = await verifyPassword(
    credentials.password,
    existing.password_hash
  )
  if (!matches) {
    const passwordHash = await hashPassword(credentials.password)
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(
      passwordHash,
      existing.id
    )
  }

  return { id: existing.id, email: existing.email }
}

export function createSession(userId: number) {
  const db = getDb()
  const token = crypto.randomBytes(32).toString("hex")
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString()
  db.prepare("INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)").run(
    userId,
    token,
    expiresAt
  )
  return { token, expiresAt }
}

export function deleteSession(token: string) {
  const db = getDb()
  db.prepare("DELETE FROM sessions WHERE token = ?").run(token)
}

export function getSession(token: string) {
  const db = getDb()
  return db
    .prepare(
      "SELECT sessions.*, users.email FROM sessions JOIN users ON users.id = sessions.user_id WHERE token = ? AND expires_at > datetime('now')"
    )
    .get(token) as
    | { id: number; user_id: number; token: string; expires_at: string; email: string }
    | undefined
}
