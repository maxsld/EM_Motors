import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import {
  createSession,
  ensureAdminUser,
  getUserByEmail,
  verifyPassword,
} from "@/lib/auth"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const { email, password } = await request.json().catch(() => ({}))

  if (!email || !password) {
    return NextResponse.json({ error: "Email et mot de passe requis." }, { status: 400 })
  }

  await ensureAdminUser()

  const user = await getUserByEmail(String(email).toLowerCase())
  if (!user) {
    return NextResponse.json({ error: "Identifiants invalides." }, { status: 401 })
  }

  const isValid = await verifyPassword(String(password), user.password_hash)
  if (!isValid) {
    return NextResponse.json({ error: "Identifiants invalides." }, { status: 401 })
  }

  const session = await createSession(user.id)
  const cookieStore = await cookies()
  cookieStore.set("session", session.token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(session.expiresAt),
  })

  return NextResponse.json({ ok: true })
}
