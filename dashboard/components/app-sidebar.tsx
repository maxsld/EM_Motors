"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  IconLink,
  IconLogout,
  IconSpeakerphone,
  IconTicket,
  IconUsers,
  IconWallet,
} from "@tabler/icons-react"

import logo from "@/assets/logo.png"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const navItems = [
  {
    title: "Événements",
    url: "/evenements",
    icon: IconTicket,
  },
  {
    title: "Adhérents",
    url: "/adherents",
    icon: IconUsers,
  },
  {
    title: "Secrétariat",
    url: "/secretariat",
    icon: IconLink,
  },
  {
    title: "Trésorerie",
    url: "/tresorerie",
    icon: IconWallet,
  },
  {
    title: "Communication",
    url: "/communication",
    icon: IconSpeakerphone,
  },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST" })
    } finally {
      router.replace("/login")
    }
  }

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu className="mb-4">
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="hover:bg-transparent active:bg-transparent">
              <div className="flex h-10 items-center gap-3 cursor-default">
                <Image
                  src={logo}
                  alt="EM Motors"
                  className="h-24 w-24 object-contain invert dark:invert-0"
                  priority
                />
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu className="mt-2">
            {navItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  className={[
                    "focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
                    "hover:bg-primary hover:text-primary-foreground",
                    "cursor-pointer",
                    pathname === item.url || pathname.startsWith(`${item.url}/`)
                      ? "bg-primary text-primary-foreground"
                      : "",
                  ].join(" ")}
                >
                  <Link href={item.url}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              className="cursor-pointer text-red-400 hover:bg-transparent hover:text-red-400 active:bg-transparent"
            >
              <IconLogout />
              <span>Déconnexion</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <NavUser
          user={{
            name: "EM Motors",
            email: "em.motors2025@gmail.com",
            avatar: "/avatars/shadcn.jpg",
          }}
        />
      </SidebarFooter>
    </Sidebar>
  )
}
