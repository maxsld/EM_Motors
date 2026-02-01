import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { DASHBOARD_BASE_PATH } from "@/lib/base-path"

const PROTECTED_PATHS = [
  "/adherents",
  "/evenements",
  "/secretariat",
  "/tresorerie",
  "/communication",
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get("session")?.value
  const basePath = request.nextUrl.basePath || DASHBOARD_BASE_PATH
  const relativePath =
    basePath && pathname.startsWith(basePath)
      ? pathname.slice(basePath.length) || "/"
      : pathname

  if (relativePath === "/login" && token) {
    const url = request.nextUrl.clone()
    url.pathname = `${basePath}/evenements`
    return NextResponse.redirect(url)
  }

  if (
    PROTECTED_PATHS.some((path) => relativePath.startsWith(path)) &&
    !token
  ) {
    const url = request.nextUrl.clone()
    url.pathname = `${basePath}/login`
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*"],
}
