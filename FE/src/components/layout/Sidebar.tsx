import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Bell,
  BookMarked,
  Briefcase,
  ClipboardCheck,
  Compass,
  Globe,
  Home,
  LayoutDashboard,
  Library,
  ListChecks,
  LogOut,
  PenTool,
  Settings,
  X,
} from 'lucide-react'
import { Avatar, AvatarFallback, Button } from '../ui'
import { useAuth } from '../../lib/auth'
import { canSeeNavItem, type SidebarKey, type AppPermission } from '../../lib/access'
import { notificationsAPI } from '../../lib/api'
import { socketService } from '../../lib/socket'
import { useLocation, useNavigate } from 'react-router-dom'

type SidebarProps = {
  mobileOpen?: boolean
  onMobileClose?: () => void
}

const navigation: Array<{
  key: SidebarKey
  labelKey: string
  icon: typeof LayoutDashboard
  section: 'main' | 'create' | 'explore' | 'other'
}> = [
  { key: 'home', labelKey: 'sidebar.home', icon: Home, section: 'main' },
  { key: 'dashboard', labelKey: 'sidebar.dashboard', icon: LayoutDashboard, section: 'main' },
  { key: 'studio', labelKey: 'sidebar.studio', icon: PenTool, section: 'create' },
  { key: 'series', labelKey: 'sidebar.seriesManager', icon: Library, section: 'create' },
  { key: 'status', labelKey: 'sidebar.submissionStatus', icon: ListChecks, section: 'create' },
  { key: 'review', labelKey: 'sidebar.editorReview', icon: ClipboardCheck, section: 'create' },
  { key: 'tasks', labelKey: 'sidebar.assistant', icon: Briefcase, section: 'create' },
  { key: 'discover', labelKey: 'sidebar.discover', icon: Compass, section: 'explore' },
  { key: 'notifications', labelKey: 'sidebar.notifications', icon: Bell, section: 'explore' },
  { key: 'settings', labelKey: 'sidebar.settings', icon: Settings, section: 'other' },
]

const sections = [
  { key: 'main', labelKey: '' },
  { key: 'create', labelKey: 'sidebar.create' },
  { key: 'explore', labelKey: 'sidebar.explore' },
  { key: 'other', labelKey: '' },
] as const

const ROUTES: Partial<Record<SidebarKey, string>> = {
  home: '/',
  series: '/studio/series',
  review: '/dashboard/review',
  status: '/studio/series/status',
  notifications: '/notifications',
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const { t, i18n } = useTranslation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [unreadCount, setUnreadCount] = useState(0)

  const permissions = user?.permissions as AppPermission[] | undefined
  const active = location.pathname === '/' ? 'home' : location.pathname.split('/')[1] || 'home'

  const initials = useMemo(() => {
    if (!user?.displayName) return '??'
    return user.displayName
      .split(' ')
      .map((word) => word[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  }, [user?.displayName])

  useEffect(() => {
    if (!user) {
      setUnreadCount(0)
      return
    }

    let mounted = true
    notificationsAPI
      .getAll({ unreadOnly: true })
      .then((res) => {
        if (mounted) setUnreadCount(res.data.unread || 0)
      })
      .catch(console.error)

    const handleNewNotification = () => setUnreadCount((prev) => prev + 1)
    socketService.on('notification:new', handleNewNotification)

    return () => {
      mounted = false
      socketService.off('notification:new', handleNewNotification)
    }
  }, [user])

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language === 'en' ? 'vi' : 'en')
  }

  const navigateTo = async (key: SidebarKey) => {
    const route = ROUTES[key] ?? `/${key}`
    navigate(route)
    onMobileClose?.()
  }

  const markAllNotificationsRead = async () => {
    setUnreadCount(0)
    await notificationsAPI.markAllRead()
    navigate('/notifications')
    onMobileClose?.()
  }

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity lg:hidden" onClick={onMobileClose} />}

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
          <Button variant="ghost" size="sm" className="size-8 rounded-lg p-0 lg:hidden" onClick={onMobileClose} aria-label="Close navigation menu">
            <X className="size-4" />
          </Button>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3">
          {sections.map((section) => {
            const sectionItems = navigation.filter((item) => item.section === section.key && canSeeNavItem(permissions, item.key))
            if (sectionItems.length === 0) return null

            return (
              <div key={section.key} className="mb-1">
                {section.labelKey && <p className="mb-1 mt-4 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">{t(section.labelKey)}</p>}
                {sectionItems.map(({ key, labelKey, icon: Icon }) => {
                  const isActive = key === active
                  return (
                    <Button
                      key={key}
                      variant={isActive ? 'secondary' : 'ghost'}
                      className={isActive ? 'h-9 w-full shrink-0 justify-start gap-2.5 rounded-xl px-3 font-medium' : 'h-9 w-full shrink-0 justify-start gap-2.5 rounded-xl px-3 font-normal text-neutral-500'}
                      onClick={() => navigateTo(key)}
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

        <div className="space-y-2 px-3 pb-3">
          <button type="button" onClick={toggleLang} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs text-neutral-500 transition-colors hover:bg-neutral-100">
            <Globe className="size-4" />
            {i18n.language === 'en' ? '🇺🇸 English' : '🇻🇳 Tiếng Việt'}
          </button>

          <button type="button" className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs text-neutral-500 transition-colors hover:bg-neutral-100" onClick={markAllNotificationsRead}>
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <Bell className="size-4" />
                {unreadCount > 0 && <span className="absolute -right-1 -top-1 flex size-3 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}
              </div>
              {t('sidebar.notifications')}
            </div>
          </button>

          <div className="flex items-center gap-2 rounded-xl bg-neutral-100 p-2.5">
            <Avatar className="size-8 bg-neutral-200">
              <AvatarFallback className="text-xs leading-4">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-xs font-medium leading-4">{user?.displayName}</span>
              <span className="text-[10px] capitalize text-neutral-500">{user?.role?.replace('_', ' ')}</span>
            </div>
            <Button variant="ghost" size="sm" className="size-7 rounded-lg p-0 text-neutral-400 hover:text-red-500" onClick={logout} aria-label="Log out">
              <LogOut className="size-3.5" />
            </Button>
          </div>
        </div>
      </aside>
    </>
  )
}

export type { SidebarKey }
