import Database from "better-sqlite3"
import bcrypt from "bcryptjs"
import fs from "node:fs"
import path from "node:path"

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
`)

const email = (process.env.ADMIN_EMAIL ?? "em.motors2025@gmail.com").toLowerCase()
const password = process.env.ADMIN_PASSWORD ?? "emmotors"

const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email)
if (existing) {
  console.log(`User already exists: ${email}`)
  process.exit(0)
}

const passwordHash = await bcrypt.hash(password, 12)
db.prepare("INSERT INTO users (email, password_hash) VALUES (?, ?)").run(email, passwordHash)
console.log(`User created: ${email}`)
