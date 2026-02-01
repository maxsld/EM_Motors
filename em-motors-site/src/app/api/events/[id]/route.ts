import { NextResponse } from "next/server"
import path from "node:path"
import { mkdir, writeFile } from "node:fs/promises"

import { deleteEvent, updateEvent } from "@/lib/db"
import { syncWebsiteEvents } from "@/lib/events-export"

export const runtime = "nodejs"

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const eventId = Number(id)
  if (!Number.isFinite(eventId)) {
    return NextResponse.json({ error: "ID invalide." }, { status: 400 })
  }

  const formData = await request.formData()
  const name = String(formData.get("name") ?? "").trim()
  const date = String(formData.get("date") ?? "").trim()
  const description = String(formData.get("description") ?? "").trim()
  const imageUrlField = String(formData.get("imageUrl") ?? "").trim()
  const imageFile = formData.get("imageFile")

  if (!name || !date) {
    return NextResponse.json(
      { error: "Nom et date requis." },
      { status: 400 }
    )
  }

  let storedImageUrl = imageUrlField || null

  if (imageFile instanceof File && imageFile.size > 0) {
    const uploadsDir = path.join(process.cwd(), "public", "uploads")
    await mkdir(uploadsDir, { recursive: true })
    const fileName = `${Date.now()}-${imageFile.name}`.replace(/\s+/g, "-")
    const filePath = path.join(uploadsDir, fileName)
    const arrayBuffer = await imageFile.arrayBuffer()
    await writeFile(filePath, Buffer.from(arrayBuffer))
    storedImageUrl = `/uploads/${fileName}`
  }

  const updated = updateEvent(eventId, {
    name,
    date,
    description: description || null,
    image_url: storedImageUrl,
  })

  if (!updated) {
    return NextResponse.json({ error: "Événement introuvable." }, { status: 404 })
  }

  try {
    await syncWebsiteEvents()
  } catch (error) {
    console.warn("Impossible de synchroniser les événements du site.", error)
  }

  return NextResponse.json({
    event: {
      id: eventId,
      name,
      date,
      description: description || null,
      image_url: storedImageUrl,
    },
  })
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const eventId = Number(id)
  if (!Number.isFinite(eventId)) {
    return NextResponse.json({ error: "ID invalide." }, { status: 400 })
  }

  const deleted = deleteEvent(eventId)
  if (!deleted) {
    return NextResponse.json({ error: "Événement introuvable." }, { status: 404 })
  }

  try {
    await syncWebsiteEvents()
  } catch (error) {
    console.warn("Impossible de synchroniser les événements du site.", error)
  }

  return NextResponse.json({ ok: true })
}
