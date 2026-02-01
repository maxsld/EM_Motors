import bcrypt from "bcryptjs"
import crypto from "node:crypto"

import { getDb } from "@/lib/db"

const SESSION_DURATION_MS = 2 * 60 * 60 * 1000

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash)
}

export function getUserByEmail(email: string) {
  const db = getDb()
  return db.prepare("SELECT * FROM users WHERE email = ?").get(email) as
    | { id: number; email: string; password_hash: string }
    | undefined
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
