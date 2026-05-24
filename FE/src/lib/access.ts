export type AppRole = 'reader' | 'mangaka' | 'assistant' | 'editor' | 'editorial_board' | 'admin'
export type AppPermission =
  | 'dashboard:access'
  | 'dashboard:review'
  | 'studio:access'
  | 'studio:series:access'
  | 'studio:series:status:access'
  | 'tasks:access'
  | 'discover:access'
  | 'notifications:access'
  | 'read:access'
  | 'settings:access'

export type SidebarKey =
  | 'home'
  | 'dashboard'
  | 'studio'
  | 'series'
  | 'status'
  | 'review'
  | 'tasks'
  | 'discover'
  | 'notifications'
  | 'settings'

export const ROUTE_PERMISSIONS: Record<string, AppPermission[]> = {
  '/': ['studio:access'],
  '/discover': ['discover:access'],
  '/notifications': ['notifications:access'],
  '/read': ['read:access'],
  '/dashboard': ['dashboard:access'],
  '/dashboard/review': ['dashboard:review'],
  '/studio': ['studio:access'],
  '/studio/series': ['studio:series:access'],
  '/studio/series/status': ['studio:series:status:access'],
  '/tasks': ['tasks:access'],
  '/settings': ['settings:access'],
}

export const NAV_PERMISSIONS: Record<SidebarKey, AppPermission> = {
  home: 'studio:access',
  dashboard: 'dashboard:access',
  studio: 'studio:access',
  series: 'studio:series:access',
  status: 'studio:series:status:access',
  review: 'dashboard:review',
  tasks: 'tasks:access',
  discover: 'discover:access',
  notifications: 'notifications:access',
  settings: 'settings:access',
}

const ROUTE_PREFIXES = Object.keys(ROUTE_PERMISSIONS).sort((a, b) => b.length - a.length)

function hasPermission(userPermissions: string[] | undefined, permission: AppPermission) {
  return userPermissions?.includes(permission) ?? false
}

export function canAccessRoute(userPermissions: string[] | undefined, pathname: string) {
  const permission = ROUTE_PREFIXES.find((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  if (!permission) return true

  return ROUTE_PERMISSIONS[permission].some((requiredPermission) => hasPermission(userPermissions, requiredPermission))
}

export function getAllowedRouteByPermissions(userPermissions: string[] | undefined) {
  if (!userPermissions?.length) return '/login'

  if (hasPermission(userPermissions, 'studio:access')) return '/'
  if (hasPermission(userPermissions, 'dashboard:access')) return '/dashboard'
  if (hasPermission(userPermissions, 'discover:access')) return '/discover'
  if (hasPermission(userPermissions, 'notifications:access')) return '/notifications'
  if (hasPermission(userPermissions, 'settings:access')) return '/settings'

  return '/login'
}

export function canSeeNavItem(userPermissions: string[] | undefined, key: SidebarKey) {
  return hasPermission(userPermissions, NAV_PERMISSIONS[key])
}
