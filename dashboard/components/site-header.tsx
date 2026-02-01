"use client"

import { usePathname } from "next/navigation"

import { ThemeToggle } from "@/components/theme-toggle"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { stripBasePath } from "@/lib/base-path"

const titles: Record<string, string> = {
  "/dashboard": "Tableau de bord",
  "/evenements": "Événements",
  "/adherents": "Adhérents",
  "/secretariat": "Secrétariat",
  "/tresorerie": "Trésorerie",
  "/communication": "Communication",
}

export function SiteHeader() {
  const pathname = usePathname()
  const title = titles[stripBasePath(pathname)] ?? "Tableau de bord"

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">{title}</h1>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
