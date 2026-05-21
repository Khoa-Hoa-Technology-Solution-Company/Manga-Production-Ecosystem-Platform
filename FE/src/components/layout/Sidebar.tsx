import { BookMarked, Briefcase, Compass, Home, LayoutDashboard, PenTool, Settings, X } from 'lucide-react'
import { Avatar, AvatarFallback, Button } from '../ui'

type SidebarKey = 'home' | 'dashboard' | 'studio' | 'tasks' | 'discover' | 'settings'

type SidebarProps = {
  active?: SidebarKey
  onChange?: (key: SidebarKey) => void
  mobileOpen?: boolean
  onMobileClose?: () => void
}

const navigation: Array<{
  key: SidebarKey
  label: string
  icon: typeof LayoutDashboard
  section?: string
}> = [
  { key: 'home', label: 'Home', icon: Home, section: 'main' },
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'main' },
  { key: 'studio', label: 'Studio', icon: PenTool, section: 'create' },
  { key: 'tasks', label: 'Assistant', icon: Briefcase, section: 'create' },
  { key: 'discover', label: 'Discover', icon: Compass, section: 'explore' },
  { key: 'settings', label: 'Settings', icon: Settings, section: 'other' },
]

const sections = [
  { key: 'main', label: '' },
  { key: 'create', label: 'CREATE' },
  { key: 'explore', label: 'EXPLORE' },
  { key: 'other', label: '' },
]

export function Sidebar({ active = 'home', onChange, mobileOpen = false, onMobileClose }: SidebarProps) {
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
          fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-neutral-50 shadow-xl transition-transform duration-300 ease-in-out lg:static lg:z-auto lg:w-55 lg:translate-x-0 lg:shadow-none lg:border-r lg:border-neutral-200
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
            const sectionItems = navigation.filter((n) => n.section === section.key)
            if (sectionItems.length === 0) return null

            return (
              <div key={section.key} className="mb-1">
                {section.label && (
                  <p className="mb-1 mt-4 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
                    {section.label}
                  </p>
                )}
                {sectionItems.map(({ key, label, icon: Icon }) => {
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
                      onClick={() => onChange?.(key)}
                    >
                      <Icon className="size-4" />
                      {label}
                    </Button>
                  )
                })}
              </div>
            )
          })}
        </nav>

        <div className="mx-3 mb-3 flex items-center gap-2 rounded-xl bg-neutral-100 p-2.5">
          <Avatar className="size-8 bg-neutral-200">
            <AvatarFallback className="text-xs leading-4">HK</AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-medium leading-4 truncate">Hiro Kazuo</span>
            <span className="text-[10px] text-neutral-500">Pro Plan</span>
          </div>
        </div>
      </aside>
    </>
  )
}

export type { SidebarKey }
