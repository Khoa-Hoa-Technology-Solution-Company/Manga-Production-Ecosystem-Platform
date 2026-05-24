import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../lib/auth'

export function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
          <span className="text-sm text-neutral-500">Loading...</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export function ProtectedReaderRoute() {
  const { isAuthenticated, loading, user } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
          <span className="text-sm text-neutral-500">Loading...</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  const isReader = user?.role?.toLowerCase() === 'reader'
  if (isReader) {
    return <Navigate to="/discover" replace />
  }

  return <Outlet />
}
