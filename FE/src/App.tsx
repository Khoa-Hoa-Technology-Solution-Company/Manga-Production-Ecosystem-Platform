import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom'
import { Menu, Server, Loader2 } from 'lucide-react'
import { Button } from './components/ui'
import { Shell } from './components/layout/Shell'
import { Sidebar } from './components/layout/Sidebar'
import { Footer } from './components/layout/Footer'
import { DashboardPage } from './components/sections/DashboardPage'
import { StudioPage } from './components/sections/StudioPage'
import { StudioWorkspacePage } from './components/sections/StudioWorkspacePage'
import { MangakaSeriesManagerPage } from './components/sections/MangakaSeriesManagerPage'
import { AssistantPortalPage } from './components/sections/AssistantPortalPage'
import { EditorialBoardPortalPage } from './components/sections/EditorialBoardPortalPage'
import { ReaderHubPage } from './components/sections/ReaderHubPage'
import { ReadingViewPage } from './components/sections/ReadingViewPage'
import { LoginPage } from './components/sections/LoginPage'
import { EditorPortalPage } from './components/sections/EditorPortalPage'
import { ManuscriptReviewPage } from './components/sections/ManuscriptReviewPage'
import { SettingsPage } from './components/sections/SettingsPage'
import { ProtectedRoute, ProtectedReaderRoute, ProtectedMangakaRoute, ProtectedEditorRoute, ProtectedEditorialBoardRoute } from './components/layout/ProtectedRoute'
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
  const [isServerUp, setIsServerUp] = useState<boolean>(true)

  useEffect(() => {
    if (isAuthenticated) socketService.connect()
    else socketService.disconnect()
  }, [isAuthenticated])

  useEffect(() => {
    let active = true
    const checkHealth = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/health`)
        if (res.ok) {
          const data = await res.json()
          if (data.status === 'ok') {
            if (active) setIsServerUp(true)
            return true
          }
        }
      } catch {
        // failed
      }
      if (active) setIsServerUp(false)
      return false
    }

    checkHealth()

    const interval = setInterval(async () => {
      const isUp = await checkHealth()
      if (isUp) {
        clearInterval(interval)
      }
    }, 3000)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [])

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route path="/" element={<StudioPage />} />
              <Route path="/discover" element={<ReaderHubPage />} />
              <Route path="/read/:chapterId" element={<ReadingViewPage />} />
              <Route path="/settings" element={<SettingsPage />} />

              <Route element={<ProtectedReaderRoute />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/studio" element={<StudioWorkspacePage />} />
                <Route path="/tasks" element={<AssistantPortalPage />} />
              </Route>

              <Route element={<ProtectedMangakaRoute />}>
                <Route path="/studio/manage" element={<MangakaSeriesManagerPage />} />
              </Route>

              <Route element={<ProtectedEditorRoute />}>
                <Route path="/editor" element={<EditorPortalPage />} />
                <Route path="/editor/review/:chapterId" element={<ManuscriptReviewPage />} />
              </Route>

              <Route element={<ProtectedEditorialBoardRoute />}>
                <Route path="/editorial-board" element={<EditorialBoardPortalPage />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>

      {!isServerUp && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-neutral-950/85 backdrop-blur-md select-none p-4 transition-all duration-500">
          <div className="flex w-full max-w-sm flex-col items-center gap-6 p-6 text-center rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl animate-in fade-in zoom-in duration-300">
            {/* Pulsing server icon */}
            <div className="relative">
              <div className="absolute inset-0 -m-3 animate-pulse rounded-full bg-indigo-500/20 blur-xl" />
              <div className="relative grid size-16 place-items-center rounded-2xl bg-neutral-950 border border-neutral-800 text-indigo-400">
                <Server className="size-8 animate-bounce" />
              </div>
            </div>

            {/* Bilingual messages */}
            <div className="space-y-4 w-full">
              {/* Vietnamese */}
              <div className="space-y-1">
                <h2 className="text-base font-bold tracking-tight text-white flex items-center justify-center gap-2">
                  <Loader2 className="size-4 animate-spin text-indigo-500" />
                  Đang kết nối tới máy chủ...
                </h2>
                <p className="text-xs text-neutral-400 leading-relaxed px-2">
                  Hệ thống đang kết nối lại với máy chủ trên Render. Quá trình này có thể mất từ 1-2 phút do máy chủ cần thời gian khởi động từ trạng thái nghỉ (idle sleep).
                </p>
              </div>

              {/* Separator line */}
              <div className="border-t border-neutral-800" />

              {/* English */}
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-neutral-300">
                  Connecting to backend...
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed px-2">
                  The backend server is spinning up on Render. This usually takes 1-2 minutes as services wake up from sleep. Thank you for your patience!
                </p>
              </div>
            </div>

            {/* Progress/status bar */}
            <div className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-neutral-950 border border-neutral-800 py-1 text-[10px] text-neutral-500">
              <div className="size-1.5 rounded-full bg-amber-500 animate-ping" />
              <span>Checking connection status...</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default App
