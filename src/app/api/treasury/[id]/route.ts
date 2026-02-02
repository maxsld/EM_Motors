import { NextResponse } from "next/server"

import { deleteTreasuryOperation, updateTreasuryOperation } from "@/lib/db"

export const runtime = "nodejs"

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const operationId = Number(id)
  if (!Number.isFinite(operationId)) {
    return NextResponse.json({ error: "ID invalide." }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  const label = String(body.label ?? "").trim()
  const date = String(body.date ?? "").trim()
  const amount = Number(body.amount)
  const kind = body.kind === "income" ? "income" : "expense"
  const status = body.status === "planned" ? "planned" : "real"
  const notes = String(body.notes ?? "").trim()

  if (!label || !date || !Number.isFinite(amount)) {
    return NextResponse.json(
      { error: "Label, date et montant requis." },
      { status: 400 }
    )
  }

  const updated = updateTreasuryOperation(operationId, {
    label,
    date,
    amount,
    kind,
    status,
    notes: notes || null,
  })

  if (!updated) {
    return NextResponse.json({ error: "Opération introuvable." }, { status: 404 })
  }

  return NextResponse.json({
    operation: {
      id: operationId,
      label,
      date,
      amount,
      kind,
      status,
      notes: notes || null,
    },
  })
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const operationId = Number(id)
  if (!Number.isFinite(operationId)) {
    return NextResponse.json({ error: "ID invalide." }, { status: 400 })
  }

  const deleted = deleteTreasuryOperation(operationId)
  if (!deleted) {
    return NextResponse.json({ error: "Opération introuvable." }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}
