import { NextResponse } from "next/server"
import path from "node:path"
import { mkdir, writeFile } from "node:fs/promises"

import { insertEvent, listEvents } from "@/lib/db"
import { syncWebsiteEvents } from "@/lib/events-export"

export const runtime = "nodejs"

export async function GET() {
  const events = await listEvents()
  return NextResponse.json(
    { events },
    { headers: { "Cache-Control": "no-store" } }
  )
}

export async function POST(request: Request) {
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

  const id = await insertEvent({
    name,
    date,
    description: description || null,
    image_url: storedImageUrl,
  })

  try {
    await syncWebsiteEvents()
  } catch (error) {
    console.warn("Impossible de synchroniser les événements du site.", error)
  }

  return NextResponse.json({
    event: {
      id,
      name,
      date,
      description: description || null,
      image_url: storedImageUrl,
    },
  })
}
