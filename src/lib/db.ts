import fs from "node:fs"
import path from "node:path"
import Database from "better-sqlite3"
import mysql, { ResultSetHeader, RowDataPacket } from "mysql2/promise"

const SQLITE_DEFAULT_PATH = ".data/auth.db"
const MYSQL_URL = process.env.MYSQL_URL
const MYSQL_HOST = process.env.MYSQL_HOST
const MYSQL_USER = process.env.MYSQL_USER
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD
const MYSQL_DATABASE = process.env.MYSQL_DATABASE
const MYSQL_PORT = process.env.MYSQL_PORT
const POSTGRES_URL = process.env.POSTGRES_URL || process.env.DATABASE_URL
const SHOULD_USE_MYSQL = Boolean(
  MYSQL_URL || (MYSQL_HOST && MYSQL_USER && MYSQL_DATABASE)
)
const SHOULD_USE_POSTGRES = Boolean(POSTGRES_URL)

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
let mysqlPool: mysql.Pool | null = null
let mysqlReady = false

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

const toMySqlDateTime = (value: string) => {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.valueOf())) {
    return value.replace("T", " ").replace("Z", "").split(".")[0]
  }
  const pad = (num: number) => String(num).padStart(2, "0")
  return `${parsed.getUTCFullYear()}-${pad(parsed.getUTCMonth() + 1)}-${pad(
    parsed.getUTCDate()
  )} ${pad(parsed.getUTCHours())}:${pad(parsed.getUTCMinutes())}:${pad(
    parsed.getUTCSeconds()
  )}`
}

const ensureMysql = async () => {
  if (!mysqlPool) {
    if (MYSQL_URL) {
      const parsed = new URL(MYSQL_URL)
      mysqlPool = mysql.createPool({
        host: parsed.hostname,
        user: decodeURIComponent(parsed.username),
        password: decodeURIComponent(parsed.password),
        database: parsed.pathname ? parsed.pathname.slice(1) : undefined,
        port: parsed.port ? Number(parsed.port) : undefined,
        waitForConnections: true,
        connectionLimit: 10,
        dateStrings: true,
        timezone: "Z",
      })
    } else if (MYSQL_HOST && MYSQL_USER && MYSQL_DATABASE) {
      mysqlPool = mysql.createPool({
        host: MYSQL_HOST,
        user: MYSQL_USER,
        password: MYSQL_PASSWORD,
        database: MYSQL_DATABASE,
        port: MYSQL_PORT ? Number(MYSQL_PORT) : undefined,
        waitForConnections: true,
        connectionLimit: 10,
        dateStrings: true,
        timezone: "Z",
      })
    } else {
      throw new Error(
        "MySQL is not configured. Provide MYSQL_URL or MYSQL_HOST/MYSQL_USER/MYSQL_DATABASE."
      )
    }
  }

  if (!mysqlReady) {
    await mysqlPool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `)
    await mysqlPool.execute(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token VARCHAR(255) NOT NULL UNIQUE,
        expires_at DATETIME NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT sessions_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `)
    await mysqlPool.execute(`
      CREATE TABLE IF NOT EXISTS events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        date DATE NOT NULL,
        description TEXT,
        image_url TEXT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `)
    await mysqlPool.execute(`
      CREATE TABLE IF NOT EXISTS treasury_operations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        label VARCHAR(255) NOT NULL,
        amount DOUBLE NOT NULL,
        date DATE NOT NULL,
        kind VARCHAR(20) NOT NULL,
        status VARCHAR(20) NOT NULL,
        notes TEXT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `)
    await mysqlPool.execute(`
      CREATE TABLE IF NOT EXISTS members (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        status VARCHAR(20) NOT NULL,
        membership_fee DOUBLE NOT NULL,
        payment_status VARCHAR(20) NOT NULL,
        notes TEXT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `)
    mysqlReady = true
  }

  return mysqlPool
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
  if (SHOULD_USE_MYSQL) {
    const pool = await ensureMysql()
    const [rows] = await pool.execute<RowDataPacket[]>(
      "SELECT id, name, date, description, image_url FROM events ORDER BY date ASC"
    )
    return rows as DbEvent[]
  }
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
  if (SHOULD_USE_MYSQL) {
    const pool = await ensureMysql()
    const [rows] = await pool.execute<RowDataPacket[]>(
      "SELECT id, label, amount, date, kind, status, notes FROM treasury_operations ORDER BY date DESC"
    )
    return rows as TreasuryOperation[]
  }
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
  if (SHOULD_USE_MYSQL) {
    const pool = await ensureMysql()
    const [rows] = await pool.execute<RowDataPacket[]>(
      "SELECT id, name, email, status, membership_fee, payment_status, notes FROM members ORDER BY name ASC"
    )
    return rows as Member[]
  }
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
  if (SHOULD_USE_MYSQL) {
    const pool = await ensureMysql()
    const [result] = await pool.execute<ResultSetHeader>(
      "INSERT INTO members (name, email, status, membership_fee, payment_status, notes) VALUES (?, ?, ?, ?, ?, ?)",
      [
        member.name,
        member.email ?? null,
        member.status,
        member.membership_fee,
        member.payment_status,
        member.notes ?? null,
      ]
    )
    return Number(result.insertId ?? 0)
  }
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
  if (SHOULD_USE_MYSQL) {
    const pool = await ensureMysql()
    const [result] = await pool.execute<ResultSetHeader>(
      "UPDATE members SET name = ?, email = ?, status = ?, membership_fee = ?, payment_status = ?, notes = ? WHERE id = ?",
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
    return result.affectedRows > 0
  }
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
  if (SHOULD_USE_MYSQL) {
    const pool = await ensureMysql()
    const [result] = await pool.execute<ResultSetHeader>(
      "DELETE FROM members WHERE id = ?",
      [id]
    )
    return result.affectedRows > 0
  }
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
  if (SHOULD_USE_MYSQL) {
    const pool = await ensureMysql()
    const [result] = await pool.execute<ResultSetHeader>(
      "INSERT INTO treasury_operations (label, amount, date, kind, status, notes) VALUES (?, ?, ?, ?, ?, ?)",
      [
        operation.label,
        operation.amount,
        operation.date,
        operation.kind,
        operation.status,
        operation.notes ?? null,
      ]
    )
    return Number(result.insertId ?? 0)
  }
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
  if (SHOULD_USE_MYSQL) {
    const pool = await ensureMysql()
    const [result] = await pool.execute<ResultSetHeader>(
      "UPDATE treasury_operations SET label = ?, amount = ?, date = ?, kind = ?, status = ?, notes = ? WHERE id = ?",
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
    return result.affectedRows > 0
  }
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
  if (SHOULD_USE_MYSQL) {
    const pool = await ensureMysql()
    const [result] = await pool.execute<ResultSetHeader>(
      "DELETE FROM treasury_operations WHERE id = ?",
      [id]
    )
    return result.affectedRows > 0
  }
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
  if (SHOULD_USE_MYSQL) {
    const pool = await ensureMysql()
    const [result] = await pool.execute<ResultSetHeader>(
      "INSERT INTO events (name, date, description, image_url) VALUES (?, ?, ?, ?)",
      [event.name, event.date, event.description ?? null, event.image_url ?? null]
    )
    return Number(result.insertId ?? 0)
  }
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
  if (SHOULD_USE_MYSQL) {
    const pool = await ensureMysql()
    const [result] = await pool.execute<ResultSetHeader>(
      "UPDATE events SET name = ?, date = ?, description = ?, image_url = ? WHERE id = ?",
      [
        event.name,
        event.date,
        event.description ?? null,
        event.image_url ?? null,
        id,
      ]
    )
    return result.affectedRows > 0
  }
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
  if (SHOULD_USE_MYSQL) {
    const pool = await ensureMysql()
    const [result] = await pool.execute<ResultSetHeader>(
      "DELETE FROM events WHERE id = ?",
      [id]
    )
    return result.affectedRows > 0
  }
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
  if (SHOULD_USE_MYSQL) {
    const pool = await ensureMysql()
    const [rows] = await pool.execute<RowDataPacket[]>(
      "SELECT id, email, password_hash FROM users WHERE email = ?",
      [email]
    )
    return rows[0] as UserRow | undefined
  }
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
  if (SHOULD_USE_MYSQL) {
    const pool = await ensureMysql()
    const [result] = await pool.execute<ResultSetHeader>(
      "INSERT INTO users (email, password_hash) VALUES (?, ?)",
      [email, passwordHash]
    )
    return Number(result.insertId ?? 0)
  }
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
  if (SHOULD_USE_MYSQL) {
    const pool = await ensureMysql()
    const [result] = await pool.execute<ResultSetHeader>(
      "UPDATE users SET password_hash = ? WHERE id = ?",
      [passwordHash, id]
    )
    return result.affectedRows > 0
  }
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
  if (SHOULD_USE_MYSQL) {
    const pool = await ensureMysql()
    await pool.execute(
      "INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)",
      [userId, token, toMySqlDateTime(expiresAt)]
    )
    return
  }
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
  if (SHOULD_USE_MYSQL) {
    const pool = await ensureMysql()
    await pool.execute("DELETE FROM sessions WHERE token = ?", [token])
    return
  }
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
  if (SHOULD_USE_MYSQL) {
    const pool = await ensureMysql()
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT sessions.id, sessions.user_id, sessions.token, sessions.expires_at, users.email
       FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE token = ? AND expires_at > UTC_TIMESTAMP()`,
      [token]
    )
    return rows[0] as SessionRow | undefined
  }
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
