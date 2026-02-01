const DASHBOARD_BASE_PATH = "/dashboard"

const isExternal = (path: string) =>
  path.startsWith("http://") || path.startsWith("https://")

export const withBasePath = (path: string) => {
  if (!path) return DASHBOARD_BASE_PATH
  if (isExternal(path)) return path
  if (path.startsWith(DASHBOARD_BASE_PATH)) return path
  if (path.startsWith("/")) return `${DASHBOARD_BASE_PATH}${path}`
  return `${DASHBOARD_BASE_PATH}/${path}`
}

export const stripBasePath = (pathname: string) => {
  if (pathname.startsWith(DASHBOARD_BASE_PATH)) {
    const stripped = pathname.slice(DASHBOARD_BASE_PATH.length)
    return stripped.length > 0 ? stripped : "/"
  }
  return pathname
}

export { DASHBOARD_BASE_PATH }
