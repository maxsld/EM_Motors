import fs from "node:fs"
import path from "node:path"
import Database from "better-sqlite3"
import { Pool } from "pg"

const SQLITE_DEFAULT_PATH = ".data/auth.db"
const SQLITE_VERCEL_PATH = "/tmp/em-motors.db"
const POSTGRES_URL = process.env.POSTGRES_URL || process.env.DATABASE_URL
const SHOULD_USE_POSTGRES = Boolean(POSTGRES_URL)
const POSTGRES_SSL_MODE = process.env.POSTGRES_SSL_MODE
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
    show_on_home INTEGER NOT NULL DEFAULT 1,
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

const POSTGRES_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    date TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    show_on_home BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,
  "ALTER TABLE events ADD COLUMN IF NOT EXISTS show_on_home BOOLEAN NOT NULL DEFAULT TRUE;",
  `CREATE TABLE IF NOT EXISTS treasury_operations (
    id SERIAL PRIMARY KEY,
    label TEXT NOT NULL,
    amount DOUBLE PRECISION NOT NULL,
    date TEXT NOT NULL,
    kind TEXT NOT NULL,
    status TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,
  `CREATE TABLE IF NOT EXISTS members (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    status TEXT NOT NULL,
    membership_fee DOUBLE PRECISION NOT NULL,
    payment_status TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,
]

let sqliteDb: ReturnType<typeof Database> | null = null
let postgresPool: Pool | null = null
let postgresReady = false
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
  ensureSqliteEventColumns(db)
  sqliteDb = db
  return db
}

const ensureSqliteEventColumns = (db: ReturnType<typeof Database>) => {
  const columns = db.prepare("PRAGMA table_info(events)").all() as {
    name: string
  }[]
  if (!columns.some((column) => column.name === "show_on_home")) {
    db.prepare(
      "ALTER TABLE events ADD COLUMN show_on_home INTEGER NOT NULL DEFAULT 1"
    ).run()
  }
}

const ensurePostgres = async () => {
  if (!postgresPool) {
    if (!POSTGRES_URL) {
      throw new Error("POSTGRES_URL is not configured.")
    }
    const ssl =
      POSTGRES_SSL_MODE === "disable"
        ? false
        : POSTGRES_SSL_MODE === "verify-full"
          ? { rejectUnauthorized: true }
          : { rejectUnauthorized: false }
    const parsedUrl = new URL(POSTGRES_URL)
    if (POSTGRES_SSL_MODE !== "verify-full") {
      parsedUrl.searchParams.delete("sslmode")
      parsedUrl.searchParams.delete("sslrootcert")
      parsedUrl.searchParams.delete("sslcert")
      parsedUrl.searchParams.delete("sslkey")
      parsedUrl.searchParams.delete("sslcrl")
    }
    postgresPool = new Pool({ connectionString: parsedUrl.toString(), ssl })
  }

  if (!postgresReady) {
    for (const statement of POSTGRES_SCHEMA) {
      await postgresPool.query(statement)
    }
    postgresReady = true
  }

  return postgresPool
}

export type DbEvent = {
  id: number
  name: string
  date: string
  description: string | null
  image_url: string | null
  show_on_home: boolean
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
  if (SHOULD_USE_POSTGRES) {
    const pool = await ensurePostgres()
    const result = await pool.query(
      "SELECT id, name, date, description, image_url, show_on_home FROM events ORDER BY date ASC"
    )
    return result.rows.map((row) => ({
      ...row,
      show_on_home: row.show_on_home ?? true,
    })) as DbEvent[]
  }

  const db = ensureSqlite()
  const rows = db
    .prepare(
      "SELECT id, name, date, description, image_url, show_on_home FROM events ORDER BY date ASC"
    )
    .all() as Array<
    Omit<DbEvent, "show_on_home"> & {
      show_on_home: number
    }
  >
  return rows.map((row) => ({
    ...row,
    show_on_home: Boolean(row.show_on_home),
  }))
}

export async function listTreasuryOperations() {
  if (SHOULD_USE_POSTGRES) {
    const pool = await ensurePostgres()
    const result = await pool.query(
      "SELECT id, label, amount, date, kind, status, notes FROM treasury_operations ORDER BY date DESC"
    )
    return result.rows as TreasuryOperation[]
  }

  const db = ensureSqlite()
  return db
    .prepare(
      "SELECT id, label, amount, date, kind, status, notes FROM treasury_operations ORDER BY date DESC"
    )
    .all() as TreasuryOperation[]
}

export async function listMembers() {
  if (SHOULD_USE_POSTGRES) {
    const pool = await ensurePostgres()
    const result = await pool.query(
      "SELECT id, name, email, status, membership_fee, payment_status, notes FROM members ORDER BY name ASC"
    )
    return result.rows as Member[]
  }

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
  if (SHOULD_USE_POSTGRES) {
    const pool = await ensurePostgres()
    const result = await pool.query(
      "INSERT INTO members (name, email, status, membership_fee, payment_status, notes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
      [
        member.name,
        member.email ?? null,
        member.status,
        member.membership_fee,
        member.payment_status,
        member.notes ?? null,
      ]
    )
    return Number(result.rows[0]?.id ?? 0)
  }

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
  if (SHOULD_USE_POSTGRES) {
    const pool = await ensurePostgres()
    const result = await pool.query(
      "UPDATE members SET name = $1, email = $2, status = $3, membership_fee = $4, payment_status = $5, notes = $6 WHERE id = $7 RETURNING id",
      [
        member.name,
        member.email ?? null,
        member.status,
        member.membership_fee,
        member.payment_status,
        member.notes ?? null,
        id,
      ]
    )
    return result.rows.length > 0
  }

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
  if (SHOULD_USE_POSTGRES) {
    const pool = await ensurePostgres()
    const result = await pool.query(
      "DELETE FROM members WHERE id = $1 RETURNING id",
      [id]
    )
    return result.rows.length > 0
  }

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
  if (SHOULD_USE_POSTGRES) {
    const pool = await ensurePostgres()
    const result = await pool.query(
      "INSERT INTO treasury_operations (label, amount, date, kind, status, notes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
      [
        operation.label,
        operation.amount,
        operation.date,
        operation.kind,
        operation.status,
        operation.notes ?? null,
      ]
    )
    return Number(result.rows[0]?.id ?? 0)
  }

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
  if (SHOULD_USE_POSTGRES) {
    const pool = await ensurePostgres()
    const result = await pool.query(
      "UPDATE treasury_operations SET label = $1, amount = $2, date = $3, kind = $4, status = $5, notes = $6 WHERE id = $7 RETURNING id",
      [
        operation.label,
        operation.amount,
        operation.date,
        operation.kind,
        operation.status,
        operation.notes ?? null,
        id,
      ]
    )
    return result.rows.length > 0
  }

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
  if (SHOULD_USE_POSTGRES) {
    const pool = await ensurePostgres()
    const result = await pool.query(
      "DELETE FROM treasury_operations WHERE id = $1 RETURNING id",
      [id]
    )
    return result.rows.length > 0
  }

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
  show_on_home?: boolean
}) {
  const showOnHome = event.show_on_home ?? true
  if (SHOULD_USE_POSTGRES) {
    const pool = await ensurePostgres()
    const result = await pool.query(
      "INSERT INTO events (name, date, description, image_url, show_on_home) VALUES ($1, $2, $3, $4, $5) RETURNING id",
      [
        event.name,
        event.date,
        event.description ?? null,
        event.image_url ?? null,
        showOnHome,
      ]
    )
    return Number(result.rows[0]?.id ?? 0)
  }

  const db = ensureSqlite()
  const stmt = db.prepare(
    "INSERT INTO events (name, date, description, image_url, show_on_home) VALUES (?, ?, ?, ?, ?)"
  )
  const result = stmt.run(
    event.name,
    event.date,
    event.description ?? null,
    event.image_url ?? null,
    showOnHome ? 1 : 0
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
    show_on_home?: boolean
  }
) {
  const showOnHome = event.show_on_home ?? true
  if (SHOULD_USE_POSTGRES) {
    const pool = await ensurePostgres()
    const result = await pool.query(
      "UPDATE events SET name = $1, date = $2, description = $3, image_url = $4, show_on_home = $5 WHERE id = $6 RETURNING id",
      [
        event.name,
        event.date,
        event.description ?? null,
        event.image_url ?? null,
        showOnHome,
        id,
      ]
    )
    return result.rows.length > 0
  }

  const db = ensureSqlite()
  const stmt = db.prepare(
    "UPDATE events SET name = ?, date = ?, description = ?, image_url = ?, show_on_home = ? WHERE id = ?"
  )
  const result = stmt.run(
    event.name,
    event.date,
    event.description ?? null,
    event.image_url ?? null,
    showOnHome ? 1 : 0,
    id
  )
  return result.changes > 0
}

export async function deleteEvent(id: number) {
  if (SHOULD_USE_POSTGRES) {
    const pool = await ensurePostgres()
    const result = await pool.query(
      "DELETE FROM events WHERE id = $1 RETURNING id",
      [id]
    )
    return result.rows.length > 0
  }

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
