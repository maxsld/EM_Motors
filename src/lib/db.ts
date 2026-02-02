import fs from "node:fs"
import path from "node:path"
import Database from "better-sqlite3"

<<<<<<< ours
const SQLITE_DEFAULT_PATH = ".data/auth.db"
const POSTGRES_URL = process.env.POSTGRES_URL || process.env.DATABASE_URL
const SHOULD_USE_POSTGRES = Boolean(POSTGRES_URL)
=======
const DEFAULT_DB_PATH = ".data/auth.db"
const dbPath = path.resolve(process.cwd(), process.env.SQLITE_PATH ?? DEFAULT_DB_PATH)
const dir = path.dirname(dbPath)

if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true })
}

const db = new Database(dbPath)
db.pragma("journal_mode = WAL")
>>>>>>> theirs

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
let postgresSql:
  | ((strings: TemplateStringsArray, ...values: any[]) => Promise<{ rows: any[] }>)
  | null = null
let postgresReady = false

const ensureSqlite = () => {
  const isVercel = Boolean(process.env.VERCEL)
  const isVercelProd = process.env.VERCEL_ENV === "production"
  const allowSqliteOnVercel = process.env.SQLITE_ALLOW_ON_VERCEL === "1"
  if (isVercel && isVercelProd && !allowSqliteOnVercel) {
    throw new Error(
      "SQLite storage is not supported on Vercel production. Configure POSTGRES_URL or set SQLITE_ALLOW_ON_VERCEL=1."
    )
  }
  if (sqliteDb) return sqliteDb

  const rawDbPath = process.env.SQLITE_PATH ?? SQLITE_DEFAULT_PATH
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

const ensurePostgres = async () => {
  if (!postgresSql) {
    const mod = await import("@vercel/postgres")
    postgresSql = mod.sql
  }
  if (!postgresReady) {
    await postgresSql!`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `
    await postgresSql!`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `
    await postgresSql!`
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        date TEXT NOT NULL,
        description TEXT,
        image_url TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `
    await postgresSql!`
      CREATE TABLE IF NOT EXISTS treasury_operations (
        id SERIAL PRIMARY KEY,
        label TEXT NOT NULL,
        amount DOUBLE PRECISION NOT NULL,
        date TEXT NOT NULL,
        kind TEXT NOT NULL,
        status TEXT NOT NULL,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `
    await postgresSql!`
      CREATE TABLE IF NOT EXISTS members (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        status TEXT NOT NULL,
        membership_fee DOUBLE PRECISION NOT NULL,
        payment_status TEXT NOT NULL,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `
    postgresReady = true
  }
  return postgresSql
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
  if (SHOULD_USE_POSTGRES) {
    const sql = await ensurePostgres()
    const result = await sql`
      SELECT id, name, date, description, image_url
      FROM events
      ORDER BY date ASC
    `
    return result.rows as DbEvent[]
  }

  const db = ensureSqlite()
  return db
    .prepare(
      "SELECT id, name, date, description, image_url FROM events ORDER BY date ASC"
    )
    .all() as DbEvent[]
}

export async function listTreasuryOperations() {
  if (SHOULD_USE_POSTGRES) {
    const sql = await ensurePostgres()
    const result = await sql`
      SELECT id, label, amount, date, kind, status, notes
      FROM treasury_operations
      ORDER BY date DESC
    `
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
    const sql = await ensurePostgres()
    const result = await sql`
      SELECT id, name, email, status, membership_fee, payment_status, notes
      FROM members
      ORDER BY name ASC
    `
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
    const sql = await ensurePostgres()
    const result = await sql`
      INSERT INTO members (name, email, status, membership_fee, payment_status, notes)
      VALUES (
        ${member.name},
        ${member.email ?? null},
        ${member.status},
        ${member.membership_fee},
        ${member.payment_status},
        ${member.notes ?? null}
      )
      RETURNING id
    `
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
    const sql = await ensurePostgres()
    const result = await sql`
      UPDATE members
      SET name = ${member.name},
          email = ${member.email ?? null},
          status = ${member.status},
          membership_fee = ${member.membership_fee},
          payment_status = ${member.payment_status},
          notes = ${member.notes ?? null}
      WHERE id = ${id}
      RETURNING id
    `
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
    const sql = await ensurePostgres()
    const result = await sql`
      DELETE FROM members
      WHERE id = ${id}
      RETURNING id
    `
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
    const sql = await ensurePostgres()
    const result = await sql`
      INSERT INTO treasury_operations (label, amount, date, kind, status, notes)
      VALUES (
        ${operation.label},
        ${operation.amount},
        ${operation.date},
        ${operation.kind},
        ${operation.status},
        ${operation.notes ?? null}
      )
      RETURNING id
    `
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
    const sql = await ensurePostgres()
    const result = await sql`
      UPDATE treasury_operations
      SET label = ${operation.label},
          amount = ${operation.amount},
          date = ${operation.date},
          kind = ${operation.kind},
          status = ${operation.status},
          notes = ${operation.notes ?? null}
      WHERE id = ${id}
      RETURNING id
    `
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
    const sql = await ensurePostgres()
    const result = await sql`
      DELETE FROM treasury_operations
      WHERE id = ${id}
      RETURNING id
    `
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
}) {
  if (SHOULD_USE_POSTGRES) {
    const sql = await ensurePostgres()
    const result = await sql`
      INSERT INTO events (name, date, description, image_url)
      VALUES (
        ${event.name},
        ${event.date},
        ${event.description ?? null},
        ${event.image_url ?? null}
      )
      RETURNING id
    `
    return Number(result.rows[0]?.id ?? 0)
  }

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
  if (SHOULD_USE_POSTGRES) {
    const sql = await ensurePostgres()
    const result = await sql`
      UPDATE events
      SET name = ${event.name},
          date = ${event.date},
          description = ${event.description ?? null},
          image_url = ${event.image_url ?? null}
      WHERE id = ${id}
      RETURNING id
    `
    return result.rows.length > 0
  }

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
  if (SHOULD_USE_POSTGRES) {
    const sql = await ensurePostgres()
    const result = await sql`
      DELETE FROM events
      WHERE id = ${id}
      RETURNING id
    `
    return result.rows.length > 0
  }

  const db = ensureSqlite()
  const stmt = db.prepare("DELETE FROM events WHERE id = ?")
  const result = stmt.run(id)
  return result.changes > 0
}

export async function getUserByEmail(email: string) {
  if (SHOULD_USE_POSTGRES) {
    const sql = await ensurePostgres()
    const result = await sql`
      SELECT id, email, password_hash
      FROM users
      WHERE email = ${email}
    `
    return result.rows[0] as UserRow | undefined
  }

  const db = ensureSqlite()
  return db.prepare("SELECT id, email, password_hash FROM users WHERE email = ?").get(email) as
    | UserRow
    | undefined
}

export async function createUser(email: string, passwordHash: string) {
  if (SHOULD_USE_POSTGRES) {
    const sql = await ensurePostgres()
    const result = await sql`
      INSERT INTO users (email, password_hash)
      VALUES (${email}, ${passwordHash})
      RETURNING id
    `
    return Number(result.rows[0]?.id ?? 0)
  }

  const db = ensureSqlite()
  const result = db
    .prepare("INSERT INTO users (email, password_hash) VALUES (?, ?)")
    .run(email, passwordHash)
  return result.lastInsertRowid as number
}

export async function updateUserPassword(id: number, passwordHash: string) {
  if (SHOULD_USE_POSTGRES) {
    const sql = await ensurePostgres()
    const result = await sql`
      UPDATE users
      SET password_hash = ${passwordHash}
      WHERE id = ${id}
      RETURNING id
    `
    return result.rows.length > 0
  }

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
  if (SHOULD_USE_POSTGRES) {
    const sql = await ensurePostgres()
    await sql`
      INSERT INTO sessions (user_id, token, expires_at)
      VALUES (${userId}, ${token}, ${expiresAt})
    `
    return
  }

  const db = ensureSqlite()
  db.prepare("INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)").run(
    userId,
    token,
    expiresAt
  )
}

export async function deleteSessionByToken(token: string) {
  if (SHOULD_USE_POSTGRES) {
    const sql = await ensurePostgres()
    await sql`
      DELETE FROM sessions
      WHERE token = ${token}
    `
    return
  }

  const db = ensureSqlite()
  db.prepare("DELETE FROM sessions WHERE token = ?").run(token)
}

export async function getSessionByToken(token: string) {
  if (SHOULD_USE_POSTGRES) {
    const sql = await ensurePostgres()
    const result = await sql`
      SELECT sessions.id, sessions.user_id, sessions.token, sessions.expires_at, users.email
      FROM sessions
      JOIN users ON users.id = sessions.user_id
      WHERE token = ${token} AND expires_at > NOW()
    `
    return result.rows[0] as SessionRow | undefined
  }

  const db = ensureSqlite()
  return db
    .prepare(
      "SELECT sessions.*, users.email FROM sessions JOIN users ON users.id = sessions.user_id WHERE token = ? AND expires_at > datetime('now')"
    )
    .get(token) as SessionRow | undefined
}
