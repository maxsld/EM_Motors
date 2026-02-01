import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const LOGIN_PATH = "/dashboard/login"
const DASHBOARD_HOME = "/dashboard/evenements"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get("session")?.value

  if (pathname === LOGIN_PATH && token) {
    const url = request.nextUrl.clone()
    url.pathname = DASHBOARD_HOME
    const response = NextResponse.redirect(url)
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
    response.headers.set("Pragma", "no-cache")
    response.headers.set("Expires", "0")
    return response
  }

  if (pathname.startsWith("/dashboard") && pathname !== LOGIN_PATH && !token) {
    const url = request.nextUrl.clone()
    url.pathname = LOGIN_PATH
    const response = NextResponse.redirect(url)
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
    response.headers.set("Pragma", "no-cache")
    response.headers.set("Expires", "0")
    return response
  }

  const response = NextResponse.next()
  if (pathname.startsWith("/dashboard")) {
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate")
    response.headers.set("Pragma", "no-cache")
    response.headers.set("Expires", "0")
  }
  return response
}

export const config = {
  matcher: ["/dashboard/:path*"],
}
