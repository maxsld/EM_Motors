import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"

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
                <div className="border border-border bg-card p-6">
                  <h2 className="text-lg font-semibold">Dossiers clés</h2>
                  <div className="mt-4 grid gap-3 text-sm">
                    {[
                      {
                        label: "Statuts & règlement",
                        url: "https://docs.google.com/document/d/12iTZqBfMuZXUjkCRHNuqu_cO8S1pbpy3ZkRrYC5TIEY/edit?tab=t.0",
                      },
                      {
                        label: "PV réunions",
                        url: "https://docs.google.com/document/d/1Mj6AiaVUOrkvFY5PRz_WYX4sZyWojRYORn9Fpt6TRTg/edit?tab=t.0#heading=h.r55gry5nr60s",
                      },
                      {
                        label: "Annexe 1 (Evaluation parcours asso)",
                        url: "/annexe/Evaluation%20Parcours%20Associatif%20Asso%202025-2026%20-%20S2.docx",
                      },
                      { label: "Partenariats", url: "#" },
                    ].map((item) => (
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
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
