import { NextResponse } from "next/server"

import { deleteMember, updateMember } from "@/lib/db"

export const runtime = "nodejs"

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const memberId = Number(id)
  if (!Number.isFinite(memberId)) {
    return NextResponse.json({ error: "ID invalide." }, { status: 400 })
  }

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

  const updated = await updateMember(memberId, {
    name,
    email: email || null,
    status,
    payment_status: paymentStatus,
    membership_fee: membershipFee,
    notes: notes || null,
  })

  if (!updated) {
    return NextResponse.json({ error: "Membre introuvable." }, { status: 404 })
  }

  return NextResponse.json({
    member: {
      id: memberId,
      name,
      email: email || null,
      status,
      payment_status: paymentStatus,
      membership_fee: membershipFee,
      notes: notes || null,
    },
  })
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const memberId = Number(id)
  if (!Number.isFinite(memberId)) {
    return NextResponse.json({ error: "ID invalide." }, { status: 400 })
  }

  const deleted = await deleteMember(memberId)
  if (!deleted) {
    return NextResponse.json({ error: "Membre introuvable." }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
