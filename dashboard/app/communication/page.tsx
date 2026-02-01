import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"

const DRIVE_BASE_URL = "https://drive.google.com"

const internalDocs = [
  { label: "Compte rendu réunion", url: DRIVE_BASE_URL },
  { label: "Planning interne", url: DRIVE_BASE_URL },
  { label: "Dossiers équipe", url: DRIVE_BASE_URL },
  { label: "Suivi projets", url: DRIVE_BASE_URL },
  {
    label: "Templates de communication (emailing, affiches, stories)",
    url: DRIVE_BASE_URL,
  },
]

const externalDocs = [
  { label: "Charte graphique", url: DRIVE_BASE_URL },
  { label: "Logo (formats)", url: DRIVE_BASE_URL },
  { label: "Instagram", url: DRIVE_BASE_URL },
  { label: "LinkedIn", url: DRIVE_BASE_URL },
]

function DocCard({
  title,
  items,
}: {
  title: string
  items: { label: string; url: string }[]
}) {
  return (
    <div className="border border-border bg-card p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-4 grid gap-3 text-sm">
        {items.map((item) => (
          <a
            key={item.label}
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between border border-border bg-background px-4 py-3 transition hover:bg-primary hover:text-primary-foreground"
          >
            <span>{item.label}</span>
            <span className="text-xs">Ouvrir</span>
          </a>
        ))}
      </div>
    </div>
  )
}

export default function Page() {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                <div className="grid gap-4 lg:grid-cols-2">
                  <DocCard title="Communication interne" items={internalDocs} />
                  <DocCard title="Communication externe" items={externalDocs} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
