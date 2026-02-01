import { NextResponse } from "next/server"

import { insertMember, listMembers } from "@/lib/db"

export const runtime = "nodejs"

export async function GET() {
  const members = await listMembers()
  return NextResponse.json({ members })
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => ({}))
  const name = String(payload.name ?? "").trim()
  const email = String(payload.email ?? "").trim()
  const status = payload.status === "inactive" ? "inactive" : "active"
  const paymentStatus = payload.payment_status === "due" ? "due" : "paid"
  const membershipFee = Number(payload.membership_fee ?? 0)
  const notes = String(payload.notes ?? "").trim()

  if (!name || !Number.isFinite(membershipFee)) {
    return NextResponse.json(
      { error: "Nom et cotisation requis." },
      { status: 400 }
    )
  }

  const id = await insertMember({
    name,
    email: email || null,
    status,
    payment_status: paymentStatus,
    membership_fee: membershipFee,
    notes: notes || null,
  })

  return NextResponse.json({
    member: {
      id,
      name,
      email: email || null,
      status,
      payment_status: paymentStatus,
      membership_fee: membershipFee,
      notes: notes || null,
    },
  })
}
