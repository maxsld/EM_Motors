import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

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

  if (pathname === "/login" && token) {
    const url = request.nextUrl.clone()
    url.pathname = "/evenements"
    return NextResponse.redirect(url)
  }

  if (PROTECTED_PATHS.some((path) => pathname.startsWith(path)) && !token) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/login",
    "/adherents/:path*",
    "/evenements/:path*",
    "/secretariat/:path*",
    "/tresorerie/:path*",
    "/communication/:path*",
  ],
}
