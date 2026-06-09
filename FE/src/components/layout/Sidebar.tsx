import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bell, BookMarked, Briefcase, Compass, Gavel, Globe, Home, LayoutDashboard, LogOut, PenTool, Settings, X } from 'lucide-react'
import { Avatar, AvatarFallback, Button } from '../ui'
import { useAuth } from '../../lib/auth'
import { notificationsAPI } from '../../lib/api'
import { socketService } from '../../lib/socket'
import { useNavigate, useLocation } from 'react-router-dom'
import { NotificationsModal } from './NotificationsModal'

type SidebarKey = 'home' | 'dashboard' | 'studio' | 'series-manager' | 'tasks' | 'editor-portal' | 'editorial-board' | 'discover' | 'settings'

type SidebarProps = {
  mobileOpen?: boolean
  onMobileClose?: () => void
}

const navigation: Array<{
  key: SidebarKey
  labelKey: string
  icon: typeof LayoutDashboard
  section: string
  roles?: string[] // restrict to these roles; undefined = all non-reader
}> = [
  { key: 'home', labelKey: 'sidebar.home', icon: Home, section: 'main' },
  { key: 'dashboard', labelKey: 'sidebar.dashboard', icon: LayoutDashboard, section: 'main' },
  { key: 'studio', labelKey: 'sidebar.studio', icon: PenTool, section: 'create', roles: ['mangaka'] },
  { key: 'series-manager', labelKey: 'sidebar.seriesManager', icon: BookMarked, section: 'create', roles: ['mangaka'] },
  { key: 'tasks', labelKey: 'sidebar.assistant', icon: Briefcase, section: 'create', roles: ['mangaka', 'assistant'] },
  { key: 'editor-portal', labelKey: 'sidebar.editorPortal', icon: LayoutDashboard, section: 'manage', roles: ['editor'] },
  { key: 'editorial-board', labelKey: 'sidebar.editorialBoard', icon: Gavel, section: 'manage', roles: ['editorial_board'] },
  { key: 'discover', labelKey: 'sidebar.discover', icon: Compass, section: 'explore' },
  { key: 'settings', labelKey: 'sidebar.settings', icon: Settings, section: 'other' },
]

const sections = [
  { key: 'main', labelKey: '' },
  { key: 'create', labelKey: 'sidebar.create' },
  { key: 'manage', labelKey: 'sidebar.manage' },
  { key: 'explore', labelKey: 'sidebar.explore' },
  { key: 'other', labelKey: '' },
]

const routeMap: Record<SidebarKey, string> = {
  home: '/',
  dashboard: '/dashboard',
  studio: '/studio',
  'series-manager': '/studio/manage',
  tasks: '/tasks',
  'editor-portal': '/editor',
  'editorial-board': '/editorial-board',
  discover: '/discover',
  settings: '/settings',
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const { t, i18n } = useTranslation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  
  const active = location.pathname === '/' ? 'home' : location.pathname.split('/')[1] || 'home'

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'vi' : 'en')
  }

  const initials = user?.displayName
    ? user.displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '??'

  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifications, setShowNotifications] = useState(false)

  useEffect(() => {
    if (!user) return

    // Initial fetch
    notificationsAPI.getAll({ unreadOnly: true }).then((res) => {
      setUnreadCount(res.data.unread || 0)
    }).catch(console.error)

    // Listen for real-time notifications
    const handleNewNotification = () => {
      setUnreadCount((prev) => prev + 1)
      // Optional: Add a toast notification here
    }

    socketService.on('notification:new', handleNewNotification)

    return () => {
      socketService.off('notification:new', handleNewNotification)
    }
  }, [user])

  return (
    <>
      {/* Backdrop overlay for mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity lg:hidden"
          onClick={onMobileClose}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-neutral-50 shadow-xl transition-transform duration-300 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:z-auto lg:w-55 lg:translate-x-0 lg:shadow-none lg:border-r lg:border-neutral-200
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-2.5">
            <div className="grid size-8 place-items-center rounded-lg bg-neutral-900 text-white">
              <BookMarked className="size-4" />
            </div>
            <span className="text-base font-semibold leading-6 text-neutral-950">MangaFlow</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="size-8 p-0 rounded-lg lg:hidden"
            onClick={onMobileClose}
            aria-label="Close navigation menu"
          >
            <X className="size-4" />
          </Button>
        </div>

        <nav className="flex-1 flex flex-col gap-0.5 px-3 overflow-y-auto">
          {sections.map((section) => {
            const userRole = user?.role?.toLowerCase() || 'reader'
            const isReader = userRole === 'reader'
            const restrictedForReader = ['dashboard', 'studio', 'series-manager', 'tasks', 'editor-portal', 'editorial-board']
            
            const sectionItems = navigation.filter((n) => {
              if (n.section !== section.key) return false
              if (isReader && restrictedForReader.includes(n.key)) return false
              // Role-specific items: only show if user has matching role
              if (n.roles && !n.roles.includes(userRole)) return false
              return true
            })
            if (sectionItems.length === 0) return null

            return (
              <div key={section.key} className="mb-1">
                {section.labelKey && (
                  <p className="mb-1 mt-4 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
                    {t(section.labelKey)}
                  </p>
                )}
                {sectionItems.map(({ key, labelKey, icon: Icon }) => {
                  const isActive = key === active
                  return (
                    <Button
                      key={key}
                      variant={isActive ? 'secondary' : 'ghost'}
                      className={
                        isActive
                          ? 'h-9 w-full shrink-0 justify-start gap-2.5 rounded-xl px-3 font-medium'
                          : 'h-9 w-full shrink-0 justify-start gap-2.5 rounded-xl px-3 text-neutral-500 font-normal'
                      }
                      onClick={() => {
                        navigate(routeMap[key])
                        onMobileClose?.()
                      }}
                    >
                      <Icon className="size-4" />
                      {t(labelKey)}
                    </Button>
                  )
                })}
              </div>
            )
          })}
        </nav>

        {/* Bottom section: Language + User */}
        <div className="px-3 pb-3 space-y-2">
          {/* Language toggle */}
          <button
            type="button"
            onClick={toggleLang}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs text-neutral-500 hover:bg-neutral-100 transition-colors"
          >
            <Globe className="size-4" />
            {i18n.language === 'en' ? '🇺🇸 English' : '🇻🇳 Tiếng Việt'}
          </button>

          {/* Notifications */}
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs text-neutral-500 hover:bg-neutral-100 transition-colors"
            onClick={() => setShowNotifications(true)}
          >
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <Bell className="size-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex size-3 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              Notifications
            </div>
          </button>

          {/* User card */}
          <div className="flex items-center gap-2 rounded-xl bg-neutral-100 p-2.5">
            <Avatar className="size-8 bg-neutral-200">
              <AvatarFallback className="text-xs leading-4">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-medium leading-4 truncate">{user?.displayName}</span>
              <span className="text-[10px] text-neutral-500 capitalize">{user?.role?.replace('_', ' ')}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="size-8 p-0 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50/50"
              onClick={logout}
              aria-label="Log out"
            >
              <LogOut className="size-[18px]" />
            </Button>
          </div>
        </div>
      </aside>

      <NotificationsModal
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        onMarkReadComplete={() => setUnreadCount(0)}
      />
    </>
  )
}

export type { SidebarKey }
