import fs from "node:fs"
import path from "node:path"
import Database from "better-sqlite3"

const SQLITE_DEFAULT_PATH = ".data/auth.db"
const SQLITE_VERCEL_PATH = "/tmp/em-motors.db"
const SQLITE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    date TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS treasury_operations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label TEXT NOT NULL,
    amount REAL NOT NULL,
    date TEXT NOT NULL,
    kind TEXT NOT NULL,
    status TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    status TEXT NOT NULL,
    membership_fee REAL NOT NULL,
    payment_status TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`

let sqliteDb: ReturnType<typeof Database> | null = null
const ensureSqlite = () => {
  if (sqliteDb) return sqliteDb

  const rawDbPath =
    process.env.SQLITE_PATH ??
    (process.env.VERCEL ? SQLITE_VERCEL_PATH : SQLITE_DEFAULT_PATH)
  const dbPath = path.isAbsolute(rawDbPath)
    ? rawDbPath
    : path.resolve(process.cwd(), rawDbPath)
  const dir = path.dirname(dbPath)

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  const db = new Database(dbPath)
  db.pragma("journal_mode = WAL")
  db.exec(SQLITE_SCHEMA)
  sqliteDb = db
  return db
}

export type DbEvent = {
  id: number
  name: string
  date: string
  description: string | null
  image_url: string | null
}

export type TreasuryOperation = {
  id: number
  label: string
  amount: number
  date: string
  kind: "income" | "expense"
  status: "real" | "planned"
  notes: string | null
}

export type Member = {
  id: number
  name: string
  email: string | null
  status: "active" | "inactive"
  membership_fee: number
  payment_status: "paid" | "due"
  notes: string | null
}

export type UserRow = {
  id: number
  email: string
  password_hash: string
}

export type SessionRow = {
  id: number
  user_id: number
  token: string
  expires_at: string
  email?: string
}

export async function listEvents() {
  const db = ensureSqlite()
  return db
    .prepare(
      "SELECT id, name, date, description, image_url FROM events ORDER BY date ASC"
    )
    .all() as DbEvent[]
}

export async function listTreasuryOperations() {
  const db = ensureSqlite()
  return db
    .prepare(
      "SELECT id, label, amount, date, kind, status, notes FROM treasury_operations ORDER BY date DESC"
    )
    .all() as TreasuryOperation[]
}

export async function listMembers() {
  const db = ensureSqlite()
  return db
    .prepare(
      "SELECT id, name, email, status, membership_fee, payment_status, notes FROM members ORDER BY name ASC"
    )
    .all() as Member[]
}

export async function insertMember(member: {
  name: string
  email?: string | null
  status: "active" | "inactive"
  membership_fee: number
  payment_status: "paid" | "due"
  notes?: string | null
}) {
  const db = ensureSqlite()
  const stmt = db.prepare(
    "INSERT INTO members (name, email, status, membership_fee, payment_status, notes) VALUES (?, ?, ?, ?, ?, ?)"
  )
  const result = stmt.run(
    member.name,
    member.email ?? null,
    member.status,
    member.membership_fee,
    member.payment_status,
    member.notes ?? null
  )
  return result.lastInsertRowid as number
}

export async function updateMember(
  id: number,
  member: {
    name: string
    email?: string | null
    status: "active" | "inactive"
    membership_fee: number
    payment_status: "paid" | "due"
    notes?: string | null
  }
) {
  const db = ensureSqlite()
  const stmt = db.prepare(
    "UPDATE members SET name = ?, email = ?, status = ?, membership_fee = ?, payment_status = ?, notes = ? WHERE id = ?"
  )
  const result = stmt.run(
    member.name,
    member.email ?? null,
    member.status,
    member.membership_fee,
    member.payment_status,
    member.notes ?? null,
    id
  )
  return result.changes > 0
}

export async function deleteMember(id: number) {
  const db = ensureSqlite()
  const stmt = db.prepare("DELETE FROM members WHERE id = ?")
  const result = stmt.run(id)
  return result.changes > 0
}

export async function insertTreasuryOperation(operation: {
  label: string
  amount: number
  date: string
  kind: "income" | "expense"
  status: "real" | "planned"
  notes?: string | null
}) {
  const db = ensureSqlite()
  const stmt = db.prepare(
    "INSERT INTO treasury_operations (label, amount, date, kind, status, notes) VALUES (?, ?, ?, ?, ?, ?)"
  )
  const result = stmt.run(
    operation.label,
    operation.amount,
    operation.date,
    operation.kind,
    operation.status,
    operation.notes ?? null
  )
  return result.lastInsertRowid as number
}

export async function updateTreasuryOperation(
  id: number,
  operation: {
    label: string
    amount: number
    date: string
    kind: "income" | "expense"
    status: "real" | "planned"
    notes?: string | null
  }
) {
  const db = ensureSqlite()
  const stmt = db.prepare(
    "UPDATE treasury_operations SET label = ?, amount = ?, date = ?, kind = ?, status = ?, notes = ? WHERE id = ?"
  )
  const result = stmt.run(
    operation.label,
    operation.amount,
    operation.date,
    operation.kind,
    operation.status,
    operation.notes ?? null,
    id
  )
  return result.changes > 0
}

export async function deleteTreasuryOperation(id: number) {
  const db = ensureSqlite()
  const stmt = db.prepare("DELETE FROM treasury_operations WHERE id = ?")
  const result = stmt.run(id)
  return result.changes > 0
}

export async function insertEvent(event: {
  name: string
  date: string
  description?: string | null
  image_url?: string | null
}) {
  const db = ensureSqlite()
  const stmt = db.prepare(
    "INSERT INTO events (name, date, description, image_url) VALUES (?, ?, ?, ?)"
  )
  const result = stmt.run(
    event.name,
    event.date,
    event.description ?? null,
    event.image_url ?? null
  )
  return result.lastInsertRowid as number
}

export async function updateEvent(
  id: number,
  event: {
    name: string
    date: string
    description?: string | null
    image_url?: string | null
  }
) {
  const db = ensureSqlite()
  const stmt = db.prepare(
    "UPDATE events SET name = ?, date = ?, description = ?, image_url = ? WHERE id = ?"
  )
  const result = stmt.run(
    event.name,
    event.date,
    event.description ?? null,
    event.image_url ?? null,
    id
  )
  return result.changes > 0
}

export async function deleteEvent(id: number) {
  const db = ensureSqlite()
  const stmt = db.prepare("DELETE FROM events WHERE id = ?")
  const result = stmt.run(id)
  return result.changes > 0
}

export async function getUserByEmail(email: string) {
  const db = ensureSqlite()
  return db.prepare("SELECT id, email, password_hash FROM users WHERE email = ?").get(email) as
    | UserRow
    | undefined
}

export async function createUser(email: string, passwordHash: string) {
  const db = ensureSqlite()
  const result = db
    .prepare("INSERT INTO users (email, password_hash) VALUES (?, ?)")
    .run(email, passwordHash)
  return result.lastInsertRowid as number
}

export async function updateUserPassword(id: number, passwordHash: string) {
  const db = ensureSqlite()
  const result = db
    .prepare("UPDATE users SET password_hash = ? WHERE id = ?")
    .run(passwordHash, id)
  return result.changes > 0
}

export async function createSessionRow(
  userId: number,
  token: string,
  expiresAt: string
) {
  const db = ensureSqlite()
  db.prepare("INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)").run(
    userId,
    token,
    expiresAt
  )
}

export async function deleteSessionByToken(token: string) {
  const db = ensureSqlite()
  db.prepare("DELETE FROM sessions WHERE token = ?").run(token)
}

export async function getSessionByToken(token: string) {
  const db = ensureSqlite()
  return db
    .prepare(
      "SELECT sessions.*, users.email FROM sessions JOIN users ON users.id = sessions.user_id WHERE token = ? AND expires_at > datetime('now')"
    )
    .get(token) as SessionRow | undefined
}
