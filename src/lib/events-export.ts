import path from "node:path"
import { mkdir, writeFile } from "node:fs/promises"

import { listEvents } from "@/lib/db"

type WebsiteEvent = {
  date: string
  title: string
  description: string
  image: string
  alt: string
  cta: {
    text: string
    href: string
  }
}

const DEFAULT_CTA = { text: "Réserver", href: "#contact" }

function getWebsiteEventsPath() {
  const envPath = process.env.WEBSITE_EVENTS_JSON_PATH
  if (envPath && envPath.trim().length > 0) {
    return path.resolve(process.cwd(), envPath)
  }
  return path.resolve(process.cwd(), "public", "events.json")
}

function toWebsiteEvents() {
  const events = listEvents()
  return events.map((event) => ({
    date: event.date,
    title: event.name,
    description: event.description ?? "",
    image: event.image_url ?? "",
    alt: event.name,
    cta: DEFAULT_CTA,
  })) satisfies WebsiteEvent[]
}

export async function syncWebsiteEvents() {
  const targetPath = getWebsiteEventsPath()
  const dir = path.dirname(targetPath)
  const data = JSON.stringify(toWebsiteEvents(), null, 2)
  await mkdir(dir, { recursive: true })
  await writeFile(targetPath, `${data}\n`, "utf8")
  return targetPath
}
