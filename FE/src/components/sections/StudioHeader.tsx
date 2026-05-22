import { Sparkles } from 'lucide-react'
import { Badge, Avatar, AvatarFallback } from '../ui'
import { useAuth } from '../../lib/auth'

export function StudioHeader() {
  const { user } = useAuth()
  
  const initials = user?.displayName
    ? user.displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '??'

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between gap-4 border-b border-neutral-200 px-4 py-4 sm:px-6 lg:px-8 bg-neutral-50/90 backdrop-blur-md">
      <nav className="hidden items-center gap-6 text-sm sm:flex">
        <a className="font-medium text-neutral-950" href="#features">
          Features
        </a>
        <a className="text-neutral-500 transition hover:text-neutral-950" href="#workflow">
          Workflow
        </a>
        <a className="text-neutral-500 transition hover:text-neutral-950" href="#pricing">
          Pricing
        </a>
        <a className="text-neutral-500 transition hover:text-neutral-950" href="#about">
          About
        </a>
      </nav>

      <div className="ml-auto flex items-center gap-3">
        <Badge variant="default" className="hidden gap-1.5 sm:inline-flex">
          <Sparkles className="size-3" />
          Live Studio
        </Badge>
        
        {/* User is always authenticated here due to App.tsx guard */}
        <Avatar className="size-9 bg-neutral-200 border border-neutral-300">
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium hidden sm:inline-block">
          {user?.displayName}
        </span>
      </div>
    </header>
  )
}
