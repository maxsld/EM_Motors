import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { deleteSession } from "@/lib/auth"

export const runtime = "nodejs"

export async function POST() {
  const cookieStore = await cookies()
  const token = cookieStore.get("session")?.value
  if (token) {
    deleteSession(token)
  }

  cookieStore.set("session", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  })

  return NextResponse.json({ ok: true })
}
