import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../lib/auth'

export function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return <div className="p-8 text-sm text-neutral-500">Loading...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export function ProtectedReaderRoute() {
  const { isAuthenticated, loading, user } = useAuth()

  if (loading) {
    return <div className="p-8 text-sm text-neutral-500">Loading...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (user?.role?.toLowerCase() === 'reader') {
    return <Navigate to="/discover" replace />
  }

  return <Outlet />
}

export function ProtectedMangakaRoute() {
  const { isAuthenticated, loading, user } = useAuth()

  if (loading) {
    return <div className="p-8 text-sm text-neutral-500">Loading...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (user?.role?.toLowerCase() !== 'mangaka') {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

export function ProtectedEditorRoute() {
  const { isAuthenticated, loading, user } = useAuth()

  if (loading) {
    return <div className="p-8 text-sm text-neutral-500">Loading...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  const role = user?.role?.toLowerCase()
  if (role !== 'editor' && role !== 'editorial_board') {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
