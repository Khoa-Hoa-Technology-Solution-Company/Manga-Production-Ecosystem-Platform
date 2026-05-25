import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { Button } from './components/ui'
import { Shell } from './components/layout/Shell'
import { Sidebar } from './components/layout/Sidebar'
import { Footer } from './components/layout/Footer'
import { DashboardPage } from './components/sections/DashboardPage'
import { StudioPage } from './components/sections/StudioPage'
import { StudioWorkspacePage } from './components/sections/StudioWorkspacePage'
import { MangakaSeriesManagerPage } from './components/sections/MangakaSeriesManagerPage'
import { AssistantPortalPage } from './components/sections/AssistantPortalPage'
import { ReaderHubPage } from './components/sections/ReaderHubPage'
import { ReadingViewPage } from './components/sections/ReadingViewPage'
import { LoginPage } from './components/sections/LoginPage'
import { ProtectedRoute, ProtectedReaderRoute, ProtectedMangakaRoute } from './components/layout/ProtectedRoute'
import { useAuth } from './lib/auth'
import { socketService } from './lib/socket'

function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  
  const hideFooter = location.pathname.startsWith('/read') || location.pathname === '/studio'

  return (
    <Shell
      sidebar={
        <Sidebar
          mobileOpen={sidebarOpen}
          onMobileClose={() => setSidebarOpen(false)}
        />
      }
      header={
        <div className="flex items-center gap-2 border-b border-neutral-200 px-4 py-2 lg:hidden">
          <Button
            variant="ghost"
            size="sm"
            className="size-9 p-0 rounded-lg"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation menu"
          >
            <Menu className="size-5" />
          </Button>
          <span className="text-sm font-semibold">MangaFlow</span>
        </div>
      }
      footer={!hideFooter ? <Footer /> : undefined}
    >
      <Outlet />
    </Shell>
  )
}

function App() {
  const { isAuthenticated } = useAuth()

  useEffect(() => {
    if (isAuthenticated) socketService.connect()
    else socketService.disconnect()
  }, [isAuthenticated])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<StudioPage />} />
            <Route path="/discover" element={<ReaderHubPage />} />
            <Route path="/read/:chapterId" element={<ReadingViewPage />} />
            <Route path="/settings" element={<div className="p-8">Settings Page (WIP)</div>} />

            <Route element={<ProtectedReaderRoute />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/studio" element={<StudioWorkspacePage />} />
              <Route path="/tasks" element={<AssistantPortalPage />} />
            </Route>

            <Route element={<ProtectedMangakaRoute />}>
              <Route path="/studio/manage" element={<MangakaSeriesManagerPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
