import { UserRole } from '../models/User'

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

export const ROLE_PERMISSIONS: Record<UserRole, AppPermission[]> = {
  reader: ['discover:access', 'notifications:access', 'read:access', 'settings:access'],
  mangaka: ['studio:access', 'studio:series:access', 'studio:series:status:access', 'discover:access', 'notifications:access', 'read:access', 'settings:access'],
  assistant: ['dashboard:access', 'studio:access', 'studio:series:access', 'studio:series:status:access', 'tasks:access', 'discover:access', 'notifications:access', 'read:access', 'settings:access'],
  editor: ['dashboard:access', 'dashboard:review', 'discover:access', 'notifications:access', 'read:access', 'settings:access'],
  editorial_board: ['dashboard:access', 'dashboard:review', 'studio:access', 'studio:series:access', 'studio:series:status:access', 'discover:access', 'notifications:access', 'read:access', 'settings:access'],
}

export function getPermissionsForRole(role: UserRole): AppPermission[] {
  return ROLE_PERMISSIONS[role] ?? []
}
