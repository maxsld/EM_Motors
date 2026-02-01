import { NextResponse } from "next/server"

import { insertTreasuryOperation, listTreasuryOperations } from "@/lib/db"

export const runtime = "nodejs"

export async function GET() {
  const operations = listTreasuryOperations()
  return NextResponse.json({ operations })
}

export async function POST(request: Request) {
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

  const id = insertTreasuryOperation({
    label,
    date,
    amount,
    kind,
    status,
    notes: notes || null,
  })

  return NextResponse.json({
    operation: {
      id,
      label,
      date,
      amount,
      kind,
      status,
      notes: notes || null,
    },
  })
}
