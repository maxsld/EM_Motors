import fs from "node:fs"
import path from "node:path"
import Database from "better-sqlite3"

const DEFAULT_DB_PATH = ".data/auth.db"
const dbPath = path.resolve(process.cwd(), process.env.SQLITE_PATH ?? DEFAULT_DB_PATH)
const dir = path.dirname(dbPath)

if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true })
}

const db = new Database(dbPath)
db.pragma("journal_mode = WAL")

db.exec(`
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
`)

export type DbEvent = {
  id: number
  name: string
  date: string
  description: string | null
  image_url: string | null
}

export function getDb() {
  return db
}

export function listEvents() {
  return db
    .prepare(
      "SELECT id, name, date, description, image_url FROM events ORDER BY date ASC"
    )
    .all() as DbEvent[]
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

export function listTreasuryOperations() {
  return db
    .prepare(
      "SELECT id, label, amount, date, kind, status, notes FROM treasury_operations ORDER BY date DESC"
    )
    .all() as TreasuryOperation[]
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

export function listMembers() {
  return db
    .prepare(
      "SELECT id, name, email, status, membership_fee, payment_status, notes FROM members ORDER BY name ASC"
    )
    .all() as Member[]
}

export function insertMember(member: {
  name: string
  email?: string | null
  status: "active" | "inactive"
  membership_fee: number
  payment_status: "paid" | "due"
  notes?: string | null
}) {
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

export function updateMember(
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

export function deleteMember(id: number) {
  const stmt = db.prepare("DELETE FROM members WHERE id = ?")
  const result = stmt.run(id)
  return result.changes > 0
}

export function insertTreasuryOperation(operation: {
  label: string
  amount: number
  date: string
  kind: "income" | "expense"
  status: "real" | "planned"
  notes?: string | null
}) {
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

export function updateTreasuryOperation(
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

export function deleteTreasuryOperation(id: number) {
  const stmt = db.prepare("DELETE FROM treasury_operations WHERE id = ?")
  const result = stmt.run(id)
  return result.changes > 0
}

export function insertEvent(event: {
  name: string
  date: string
  description?: string | null
  image_url?: string | null
}) {
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

export function updateEvent(
  id: number,
  event: {
    name: string
    date: string
    description?: string | null
    image_url?: string | null
  }
) {
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

export function deleteEvent(id: number) {
  const stmt = db.prepare("DELETE FROM events WHERE id = ?")
  const result = stmt.run(id)
  return result.changes > 0
}
