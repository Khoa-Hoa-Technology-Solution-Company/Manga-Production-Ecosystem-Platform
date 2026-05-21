import { useState } from 'react'
import { Menu } from 'lucide-react'
import { Button } from './components/ui'
import { Shell } from './components/layout/Shell'
import { Sidebar, type SidebarKey } from './components/layout/Sidebar'
import { Header } from './components/layout/Header'
import { Footer } from './components/layout/Footer'
import { DashboardPage } from './components/sections/DashboardPage'
import { StudioPage } from './components/sections/StudioPage'
import { StudioWorkspacePage } from './components/sections/StudioWorkspacePage'
import { AssistantPortalPage } from './components/sections/AssistantPortalPage'
import { ReaderHubPage } from './components/sections/ReaderHubPage'
import { ReadingViewPage } from './components/sections/ReadingViewPage'
import { LoginPage } from './components/sections/LoginPage'
import { useAuth } from './lib/auth'

function App() {
  const { isAuthenticated, loading } = useAuth()
  const [activeTab, setActiveTab] = useState<SidebarKey>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [readingView, setReadingView] = useState(false)

  // Show loading while checking auth
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

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage />
  }

  const handleNavigate = (key: SidebarKey) => {
    setActiveTab(key)
    setSidebarOpen(false)
    setReadingView(false)
  }

  /* ── Render page content based on active tab ───── */
  function renderContent() {
    // Reading view (opened from Discover page)
    if (readingView) {
      return <ReadingViewPage onBack={() => setReadingView(false)} />
    }

    switch (activeTab) {
      case 'home':
        return <StudioPage />
      case 'dashboard':
        return (
          <>
            <Header />
            <DashboardPage />
          </>
        )
      case 'studio':
        return <StudioWorkspacePage />
      case 'tasks':
        return <AssistantPortalPage />
      case 'discover':
        return (
          <ReaderHubPage
            onReadSeries={() => setReadingView(true)}
          />
        )
      case 'settings':
        return (
          <div className="flex flex-1 items-center justify-center p-8">
            <div className="text-center space-y-3">
              <div className="grid size-16 place-items-center rounded-2xl bg-neutral-100 mx-auto">
                <span className="text-2xl">⚙️</span>
              </div>
              <h2 className="text-lg font-semibold">Settings</h2>
              <p className="text-sm text-neutral-500 max-w-sm">
                Account settings, notification preferences, and workspace configuration will be available here.
              </p>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <Shell
      sidebar={
        <Sidebar
          active={readingView ? 'discover' : activeTab}
          onChange={handleNavigate}
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
      footer={!readingView && activeTab !== 'studio' ? <Footer /> : undefined}
    >
      {renderContent()}
    </Shell>
  )
}

export default App
