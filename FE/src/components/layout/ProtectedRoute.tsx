import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { canAccessRoute, getAllowedRouteByPermissions } from '../../lib/access'

function LoadingState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50">
      <div className="flex flex-col items-center gap-3">
        <div className="size-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
        <span className="text-sm text-neutral-500">Loading...</span>
      </div>
    </div>
  )
}

export function ProtectedRoute() {
  const { isAuthenticated, loading, user, logout } = useAuth()
  const location = useLocation()
  const permissions = user?.permissions ?? []
  const fallback = getAllowedRouteByPermissions(permissions)

  useEffect(() => {
    if (!loading && isAuthenticated && permissions.length === 0) {
      logout()
    }
  }, [isAuthenticated, loading, logout, permissions.length])

  if (loading) return <LoadingState />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (permissions.length === 0) return <Navigate to="/login" replace />

  if (!canAccessRoute(permissions, location.pathname)) {
    return <Navigate to={fallback === location.pathname ? '/login' : fallback} replace />
  }

  return <Outlet />
}

export function ProtectedReaderRoute() {
  return <Outlet />
}
